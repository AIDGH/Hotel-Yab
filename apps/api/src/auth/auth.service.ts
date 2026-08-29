import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { Request, Response } from 'express';
import sharp from 'sharp';
import { EnvironmentVariables } from '../config/environment';
import { PrismaService } from '../database/prisma.service';
import { UserStatus } from '../generated/prisma/enums';
import { SmsService } from '../sms/sms.service';
import { normalizeDigits, normalizeIranianMobile } from './auth-normalization';
import { LoginWithPasswordDto } from './dto/login-with-password.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestRegistrationOtpDto } from './dto/request-registration-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const SESSION_COOKIE = 'hotel_yab_session';
const MAX_OTP_ATTEMPTS = 5;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const MAX_AVATAR_INPUT_BYTES = 15_000_000;

type RequestMetadata = { userAgent?: string; ipAddress?: string };
type AvatarUpload = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly sms: SmsService,
  ) {}

  async requestLoginOtp(identifier: string) {
    const user = await this.findUserByIdentifier(identifier);
    if (!user) throw new UnauthorizedException('The account was not found');
    this.assertActive(user.status);
    return this.createOtpChallenge(user.mobile);
  }

  async requestRegistrationOtp(dto: RequestRegistrationOtpDto) {
    const values = {
      mobile: normalizeIranianMobile(dto.mobile),
      username: normalizeUsername(dto.username),
      email: dto.email?.trim().toLowerCase() ?? null,
      instagramHandle: normalizeInstagramHandle(dto.instagramHandle),
    };
    await this.assertRegistrationValuesAvailable(values);
    return this.createOtpChallenge(values.mobile);
  }

  async loginWithPassword(
    dto: LoginWithPasswordDto,
    metadata: RequestMetadata,
  ) {
    const user = await this.findUserByIdentifier(dto.identifier);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('The login credentials are invalid');
    }
    this.assertActive(user.status);
    if (!(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('The login credentials are invalid');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.createSession(user, metadata);
  }

  async verifyLoginOtp(
    identifier: string,
    code: string,
    metadata: RequestMetadata,
  ) {
    const user = await this.findUserByIdentifier(identifier);
    if (!user) throw new UnauthorizedException('The account was not found');
    this.assertActive(user.status);
    await this.consumeOtpChallenge(user.mobile, code);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.createSession(user, metadata);
  }

  async register(dto: RegisterDto, metadata: RequestMetadata) {
    const mobile = normalizeIranianMobile(dto.mobile);
    const username = normalizeUsername(dto.username);
    const email = dto.email?.trim().toLowerCase() ?? null;
    const instagramHandle = normalizeInstagramHandle(dto.instagramHandle);

    await this.assertRegistrationValuesAvailable({
      mobile,
      username,
      email,
      instagramHandle,
    });
    const challenge = await this.getValidOtpChallenge(mobile, dto.code);
    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (transaction) => {
      await transaction.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      return transaction.user.create({
        data: {
          mobile,
          username,
          passwordHash,
          email,
          instagramHandle,
          lastLoginAt: new Date(),
        },
        include: {
          notablePerson: true,
          avatar: { select: { updatedAt: true } },
        },
      });
    });

    return this.createSession(user, metadata);
  }

  async authenticateSession(token: string) {
    const session = await this.prisma.userSession.findFirst({
      where: {
        tokenHash: hashSessionToken(token),
        expiresAt: { gt: new Date() },
        user: { status: UserStatus.ACTIVE },
      },
      select: { user: { select: { id: true, role: true } } },
    });

    if (!session) {
      throw new UnauthorizedException('The session is invalid or expired');
    }

    return session.user;
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        notablePerson: true,
        avatar: { select: { updatedAt: true } },
      },
    });
    return { data: toPublicUser(user) };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const username =
      dto.username === undefined ? undefined : normalizeUsername(dto.username);
    const email =
      dto.email === undefined
        ? undefined
        : dto.email?.trim().toLowerCase() || null;
    const instagramHandle =
      dto.instagramHandle === undefined
        ? undefined
        : normalizeInstagramHandle(dto.instagramHandle);

    await this.assertProfileValuesAvailable(userId, {
      username,
      email,
      instagramHandle,
    });

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
        ...(username !== undefined ? { username } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(instagramHandle !== undefined ? { instagramHandle } : {}),
        ...(dto.password !== undefined
          ? { passwordHash: await hashPassword(dto.password) }
          : {}),
      },
      include: {
        notablePerson: true,
        avatar: { select: { updatedAt: true } },
      },
    });
    return { data: toPublicUser(user) };
  }

  async getAvatar(userId: string) {
    const avatar = await this.prisma.userAvatar.findUnique({
      where: { userId },
      select: { data: true, mimeType: true },
    });
    if (!avatar) throw new NotFoundException('The avatar was not found');
    return { data: Buffer.from(avatar.data), mimeType: avatar.mimeType };
  }

  async updateAvatar(userId: string, file: AvatarUpload | undefined) {
    if (!file) throw new BadRequestException('یک تصویر انتخاب کنید');
    if (file.size > MAX_AVATAR_INPUT_BYTES) {
      throw new BadRequestException('حجم تصویر نباید بیشتر از ۱۵ مگابایت باشد');
    }

    let avatarBuffer: Buffer;
    try {
      avatarBuffer = await sharp(file.buffer, {
        failOn: 'error',
        limitInputPixels: 80_000_000,
      })
        .rotate()
        .resize({
          width: 1024,
          height: 1024,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 86, effort: 4 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'این تصویر قابل پردازش نیست؛ یک فایل تصویری سالم انتخاب کنید',
      );
    }

    await this.prisma.userAvatar.upsert({
      where: { userId },
      create: {
        userId,
        data: Uint8Array.from(avatarBuffer),
        mimeType: 'image/webp',
      },
      update: {
        data: Uint8Array.from(avatarBuffer),
        mimeType: 'image/webp',
      },
    });
    return this.getCurrentUser(userId);
  }

  async removeAvatar(userId: string) {
    await this.prisma.userAvatar.deleteMany({ where: { userId } });
    return this.getCurrentUser(userId);
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.userSession.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  readSessionToken(request: Request): string | undefined {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return undefined;

    return cookieHeader
      .split(';')
      .map((part) => part.trim().split('='))
      .find(([name]) => name === SESSION_COOKIE)?.[1];
  }

  setSessionCookie(response: Response, token: string, expiresAt: Date): void {
    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
  }

  clearSessionCookie(response: Response): void {
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  private async createOtpChallenge(mobile: string) {
    const resendSeconds = this.config.get('AUTH_OTP_RESEND_SECONDS', {
      infer: true,
    });
    const latestChallenge = await this.prisma.otpChallenge.findFirst({
      where: { mobile, consumedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (
      latestChallenge &&
      Date.now() - latestChallenge.createdAt.getTime() < resendSeconds * 1000
    ) {
      throw new HttpException(
        'Please wait before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const challengeId = randomUUID();
    const code = randomInt(100000, 1000000).toString();
    const ttlMinutes = this.config.get('AUTH_OTP_TTL_MINUTES', { infer: true });
    await this.prisma.otpChallenge.create({
      data: {
        id: challengeId,
        mobile,
        codeHash: this.hashOtp(challengeId, code),
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });

    try {
      await this.sms.sendOtp(mobile, code);
    } catch (error) {
      await this.prisma.otpChallenge
        .deleteMany({
          where: { id: challengeId, consumedAt: null },
        })
        .catch(() => undefined);
      throw error;
    }

    return {
      data: {
        mobile,
        expiresInSeconds: ttlMinutes * 60,
        resendAfterSeconds: resendSeconds,
        delivery: 'SMS' as const,
        ...(this.sms.usesDevelopmentDelivery()
          ? { developmentCode: code }
          : {}),
      },
    };
  }

  private async getValidOtpChallenge(mobile: string, code: string) {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { mobile, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge || challenge.attempts >= MAX_OTP_ATTEMPTS) {
      throw new UnauthorizedException('The verification code is invalid');
    }

    const expectedHash = Buffer.from(challenge.codeHash, 'hex');
    const suppliedHash = Buffer.from(this.hashOtp(challenge.id, code), 'hex');
    if (!timingSafeEqual(expectedHash, suppliedHash)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('The verification code is invalid');
    }
    return challenge;
  }

  private async consumeOtpChallenge(mobile: string, code: string) {
    const challenge = await this.getValidOtpChallenge(mobile, code);
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
  }

  private async findUserByIdentifier(identifier: string) {
    const trimmed = normalizeDigits(identifier.trim());
    const mobilePattern = /^(?:(?:\+|00)?98|0)?9\d{9}$/;
    return this.prisma.user.findFirst({
      where: mobilePattern.test(trimmed)
        ? { mobile: normalizeIranianMobile(trimmed) }
        : { username: normalizeUsername(trimmed) },
      include: {
        notablePerson: true,
        avatar: { select: { updatedAt: true } },
      },
    });
  }

  private async createSession(
    user: Parameters<typeof toPublicUser>[0],
    metadata: RequestMetadata,
  ) {
    const sessionToken = randomBytes(32).toString('base64url');
    const sessionDays = this.config.get('AUTH_SESSION_DAYS', { infer: true });
    const expiresAt = new Date(Date.now() + sessionDays * 86_400_000);
    await this.prisma.$transaction([
      this.prisma.userSession.deleteMany({
        where: { userId: user.id, expiresAt: { lte: new Date() } },
      }),
      this.prisma.userSession.create({
        data: {
          userId: user.id,
          tokenHash: hashSessionToken(sessionToken),
          expiresAt,
          userAgent: metadata.userAgent?.slice(0, 500),
          ipAddress: metadata.ipAddress?.slice(0, 64),
        },
      }),
    ]);
    return { token: sessionToken, expiresAt, data: toPublicUser(user) };
  }

  private assertActive(status: UserStatus): void {
    if (status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('This account is blocked');
    }
  }

  private async assertRegistrationValuesAvailable(values: {
    mobile: string;
    username: string;
    email: string | null;
    instagramHandle: string | null;
  }) {
    const conflicts = await this.prisma.user.findMany({
      where: {
        OR: [
          { mobile: values.mobile },
          { username: values.username },
          ...(values.email ? [{ email: values.email }] : []),
          ...(values.instagramHandle
            ? [{ instagramHandle: values.instagramHandle }]
            : []),
        ],
      },
      select: {
        mobile: true,
        username: true,
        email: true,
        instagramHandle: true,
      },
    });
    for (const conflict of conflicts) {
      if (conflict.mobile === values.mobile)
        throw new ConflictException('This mobile is already in use');
      if (conflict.username === values.username)
        throw new ConflictException('This username is already in use');
      if (values.email && conflict.email === values.email)
        throw new ConflictException('This email is already in use');
      if (
        values.instagramHandle &&
        conflict.instagramHandle === values.instagramHandle
      )
        throw new ConflictException(
          'This Instagram username is already in use',
        );
    }
  }

  private async assertProfileValuesAvailable(
    userId: string,
    values: {
      username?: string;
      email?: string | null;
      instagramHandle?: string | null;
    },
  ) {
    const candidates = [
      ...(values.username ? [{ username: values.username }] : []),
      ...(values.email ? [{ email: values.email }] : []),
      ...(values.instagramHandle
        ? [{ instagramHandle: values.instagramHandle }]
        : []),
    ];
    if (candidates.length === 0) return;
    const existing = await this.prisma.user.findFirst({
      where: { id: { not: userId }, OR: candidates },
      select: { username: true, email: true, instagramHandle: true },
    });
    if (!existing) return;
    if (values.username && existing.username === values.username)
      throw new ConflictException('This username is already in use');
    if (values.email && existing.email === values.email)
      throw new ConflictException('This email is already in use');
    throw new ConflictException('This Instagram username is already in use');
  }

  private hashOtp(challengeId: string, code: string): string {
    return createHmac(
      'sha256',
      this.config.get('AUTH_OTP_SECRET', { infer: true }),
    )
      .update(`${challengeId}:${code}`)
      .digest('hex');
  }
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase();
}

function normalizeInstagramHandle(value: string | null | undefined) {
  return value ? value.trim().replace(/^@/, '').toLowerCase() : null;
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const derived = await scryptPassword(password, salt);
  return `scrypt$${SCRYPT_COST}$${salt}$${derived.toString('base64url')}`;
}

async function verifyPassword(password: string, stored: string) {
  const [algorithm, cost, salt, encodedHash] = stored.split('$');
  if (
    algorithm !== 'scrypt' ||
    Number(cost) !== SCRYPT_COST ||
    !salt ||
    !encodedHash
  )
    return false;
  const expected = Buffer.from(encodedHash, 'base64url');
  const supplied = await scryptPassword(password, salt);
  return (
    expected.length === supplied.length && timingSafeEqual(expected, supplied)
  );
}

function scryptPassword(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      { N: SCRYPT_COST, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

function toPublicUser(user: {
  id: string;
  mobile: string;
  username: string | null;
  passwordHash: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  instagramHandle: string | null;
  role: string;
  avatar: { updatedAt: Date } | null;
  notablePerson: { slug: string; displayName: string } | null;
}) {
  return {
    id: user.id,
    mobile: user.mobile,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName:
      [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
    email: user.email,
    instagramHandle: user.instagramHandle,
    avatarUrl: user.avatar
      ? `/api/v1/auth/me/avatar?v=${user.avatar.updatedAt.getTime()}`
      : null,
    role: user.role,
    hasPassword: Boolean(user.passwordHash),
    profileComplete: Boolean(user.username && user.passwordHash),
    notablePerson: user.notablePerson
      ? {
          slug: user.notablePerson.slug,
          displayName: user.notablePerson.displayName,
        }
      : null,
  };
}
