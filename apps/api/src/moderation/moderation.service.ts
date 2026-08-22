import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CommentReportReason,
  ContentModerationStatus,
  UserRole,
  UserStatus,
} from '../generated/prisma/enums';
import { ModerateContentDto } from './dto/moderate-content.dto';
import { UpdateManagedUserDto } from './dto/update-managed-user.dto';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async getQueue(status: ContentModerationStatus) {
    const [hotelReviews, videoComments, reportedComments] =
      await this.prisma.$transaction([
        this.prisma.hotelReview.findMany({
          where: { status },
          orderBy: { createdAt: 'asc' },
          take: 100,
          select: {
            id: true,
            rating: true,
            body: true,
            status: true,
            moderationNote: true,
            createdAt: true,
            hotel: { select: { slug: true, name: true } },
            user: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
                mobile: true,
                id: true,
                status: true,
              },
            },
          },
        }),
        this.prisma.videoComment.findMany({
          where: { status },
          orderBy: { createdAt: 'asc' },
          take: 100,
          select: {
            id: true,
            videoId: true,
            parentId: true,
            body: true,
            status: true,
            moderationNote: true,
            createdAt: true,
            user: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
                mobile: true,
                id: true,
                status: true,
              },
            },
            _count: {
              select: { reports: { where: { resolvedAt: null } } },
            },
          },
        }),
        this.prisma.videoComment.findMany({
          where: { reports: { some: { resolvedAt: null } } },
          orderBy: { createdAt: 'asc' },
          take: 100,
          select: {
            id: true,
            videoId: true,
            parentId: true,
            body: true,
            status: true,
            moderationNote: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                mobile: true,
                status: true,
              },
            },
            reports: {
              where: { resolvedAt: null },
              orderBy: { createdAt: 'asc' },
              select: {
                reason: true,
                details: true,
                createdAt: true,
              },
            },
            _count: {
              select: { reports: { where: { resolvedAt: null } } },
            },
          },
        }),
      ]);

    return {
      data: {
        hotelReviews: hotelReviews.map(serializeHotelReview),
        videoComments: videoComments.map(serializeVideoComment),
        reportedComments: reportedComments
          .map(serializeVideoComment)
          .sort((left, right) => right.reportCount - left.reportCount),
      },
    };
  }

  async moderateHotelReview(
    id: string,
    moderatorId: string,
    dto: ModerateContentDto,
  ) {
    const existing = await this.prisma.hotelReview.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing)
      throw new NotFoundException('The hotel review was not found');
    const review = await this.prisma.hotelReview.update({
      where: { id },
      data: moderationData(dto, moderatorId),
      select: {
        id: true,
        status: true,
        moderationNote: true,
        moderatedAt: true,
        publishedAt: true,
      },
    });
    return { data: serializeModerationResult(review) };
  }

  async moderateVideoComment(
    id: string,
    moderatorId: string,
    dto: ModerateContentDto,
  ) {
    const existing = await this.prisma.videoComment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing)
      throw new NotFoundException('The video comment was not found');
    const comment = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.videoComment.update({
        where: { id },
        data: moderationData(dto, moderatorId),
        select: {
          id: true,
          status: true,
          moderationNote: true,
          moderatedAt: true,
          publishedAt: true,
        },
      });
      if (dto.status !== ContentModerationStatus.PENDING) {
        await transaction.videoCommentReport.updateMany({
          where: { commentId: id, resolvedAt: null },
          data: { resolvedAt: new Date(), resolvedById: moderatorId },
        });
      }
      return updated;
    });
    return { data: serializeModerationResult(comment) };
  }

  async deleteHotelReview(id: string) {
    const result = await this.prisma.hotelReview.deleteMany({ where: { id } });
    if (result.count === 0) {
      throw new NotFoundException('The hotel review was not found');
    }
    return { data: { success: true } };
  }

  async deleteVideoComment(id: string) {
    const result = await this.prisma.videoComment.deleteMany({ where: { id } });
    if (result.count === 0) {
      throw new NotFoundException('The video comment was not found');
    }
    return { data: { success: true } };
  }

  async listManagedUsers(
    actorId: string,
    actorRole: UserRole,
    query?: string,
    administratorsOnly = false,
  ) {
    if (administratorsOnly && actorRole !== UserRole.MODERATOR) {
      throw new ForbiddenException('بررسی مدیران فقط برای ناظر محتوا مجاز است');
    }
    const search = query?.trim().slice(0, 100);
    const searchTerms = search?.split(/\s+/).filter(Boolean) ?? [];
    const searchWhere = searchTerms.map(
      (term) =>
        ({
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { username: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            {
              instagramHandle: {
                contains: term.replace(/^@/, ''),
                mode: 'insensitive',
              },
            },
            { mobile: { contains: term.replace(/\s/g, '') } },
          ],
        }) satisfies Prisma.UserWhereInput,
    );
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: actorId },
        role: administratorsOnly ? UserRole.ADMIN : { not: UserRole.ADMIN },
        ...(searchWhere.length > 0 ? { AND: searchWhere } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        mobile: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        instagramHandle: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { hotelReviews: true, videoComments: true } },
      },
    });
    return {
      data: users.map(({ _count, ...user }) => ({
        ...user,
        displayName:
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.username ||
          'کاربر هتل‌یاب',
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        reviewCount: _count.hotelReviews,
        commentCount: _count.videoComments,
      })),
    };
  }

  async updateManagedUser(
    id: string,
    actorId: string,
    actorRole: UserRole,
    dto: UpdateManagedUserDto,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    });
    if (!target) throw new NotFoundException('کاربر پیدا نشد');
    this.assertCanManageUser(actorId, actorRole, target);

    if (actorRole === UserRole.MODERATOR && dto.role !== undefined) {
      throw new ForbiddenException(
        'ناظر محتوا نمی‌تواند نقش مدیر را تغییر دهد',
      );
    }
    if (actorRole === UserRole.ADMIN && dto.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'ایجاد یا تغییر نقش مدیر از این پنل مجاز نیست',
      );
    }
    if (dto.status === UserStatus.BLOCKED && target.role === UserRole.ADMIN) {
      const otherActiveAdmins = await this.prisma.user.count({
        where: {
          id: { not: id },
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });
      if (otherActiveAdmins === 0) {
        throw new BadRequestException('آخرین مدیر فعال را نمی‌توان مسدود کرد');
      }
    }

    try {
      const updated = await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.update({
          where: { id },
          data: {
            ...(dto.username !== undefined ? { username: dto.username } : {}),
            ...(dto.firstName !== undefined
              ? { firstName: dto.firstName }
              : {}),
            ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
            ...(dto.email !== undefined ? { email: dto.email } : {}),
            ...(dto.instagramHandle !== undefined
              ? { instagramHandle: dto.instagramHandle }
              : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.role !== undefined ? { role: dto.role } : {}),
          },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            instagramHandle: true,
            role: true,
            status: true,
          },
        });
        if (dto.status === UserStatus.BLOCKED) {
          await transaction.userSession.deleteMany({ where: { userId: id } });
        }
        return user;
      });
      return { data: updated };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'نام‌کاربری، ایمیل یا آیدی اینستاگرام قبلاً استفاده شده است',
        );
      }
      throw error;
    }
  }

  async updateUserStatus(
    id: string,
    adminId: string,
    actorRole: UserRole,
    status: UserStatus,
  ) {
    if (id === adminId && status === UserStatus.BLOCKED) {
      throw new BadRequestException('You cannot block your own account');
    }
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    });
    if (!existing) throw new NotFoundException('The user was not found');
    this.assertCanManageUser(adminId, actorRole, existing);

    const user = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id },
        data: { status },
        select: { id: true, status: true },
      });
      if (status === UserStatus.BLOCKED) {
        await transaction.userSession.deleteMany({ where: { userId: id } });
      }
      return updated;
    });
    return { data: user };
  }

  private assertCanManageUser(
    actorId: string,
    actorRole: UserRole,
    target: { id: string; role: UserRole },
  ) {
    if (actorId === target.id) {
      throw new ForbiddenException(
        'نمی‌توانید حساب خودتان را از این پنل تغییر دهید',
      );
    }
    if (actorRole === UserRole.ADMIN && target.role === UserRole.ADMIN) {
      throw new ForbiddenException('مدیر نمی‌تواند مدیر دیگری را تغییر دهد');
    }
  }
}

function moderationData(dto: ModerateContentDto, moderatorId: string) {
  const now = new Date();
  return {
    status: dto.status,
    moderationNote: dto.moderationNote?.trim() || null,
    moderatedAt: now,
    moderatedById: moderatorId,
    publishedAt: dto.status === ContentModerationStatus.PUBLISHED ? now : null,
  };
}

function userLabel(user: {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  mobile: string;
  status: UserStatus;
}) {
  return {
    id: user.id,
    username: user.username,
    displayName:
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username ||
      'کاربر هتل‌یاب',
    mobile: user.mobile,
    status: user.status,
  };
}

function serializeHotelReview(
  review: Parameters<typeof serializeHotelReviewRaw>[0],
) {
  return serializeHotelReviewRaw(review);
}

function serializeHotelReviewRaw(review: {
  id: string;
  rating: number;
  body: string;
  status: ContentModerationStatus;
  moderationNote: string | null;
  createdAt: Date;
  hotel: { slug: string; name: string };
  user: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    mobile: string;
    status: UserStatus;
  };
}) {
  return {
    ...review,
    user: userLabel(review.user),
    createdAt: review.createdAt.toISOString(),
  };
}

function serializeVideoComment(comment: {
  id: string;
  videoId: string;
  parentId: string | null;
  body: string;
  status: ContentModerationStatus;
  moderationNote: string | null;
  createdAt: Date;
  user: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    mobile: string;
    status: UserStatus;
  };
  _count?: { reports: number };
  reports?: Array<{
    reason: CommentReportReason;
    details: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    id: comment.id,
    videoId: comment.videoId,
    parentId: comment.parentId,
    body: comment.body,
    status: comment.status,
    moderationNote: comment.moderationNote,
    user: userLabel(comment.user),
    createdAt: comment.createdAt.toISOString(),
    reportCount: comment._count?.reports ?? 0,
    reports: (comment.reports ?? []).map((report) => ({
      ...report,
      createdAt: report.createdAt.toISOString(),
    })),
  };
}

function serializeModerationResult(value: {
  id: string;
  status: ContentModerationStatus;
  moderationNote: string | null;
  moderatedAt: Date | null;
  publishedAt: Date | null;
}) {
  return {
    ...value,
    moderatedAt: value.moderatedAt?.toISOString() ?? null,
    publishedAt: value.publishedAt?.toISOString() ?? null,
  };
}
