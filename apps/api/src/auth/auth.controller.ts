import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';
import { LoginWithPasswordDto } from './dto/login-with-password.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestLoginOtpDto } from './dto/request-login-otp.dto';
import { RequestRegistrationOtpDto } from './dto/request-registration-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';
import { SessionAuthGuard } from './session-auth.guard';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/password')
  @ApiOperation({ summary: 'Log in with mobile/username and password' })
  async loginWithPassword(
    @Body() dto: LoginWithPasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.loginWithPassword(
      dto,
      metadata(request),
    );
    this.authService.setSessionCookie(response, result.token, result.expiresAt);
    return { data: result.data };
  }

  @Post('login/otp/request')
  @ApiOperation({ summary: 'Request a login OTP for an existing account' })
  requestLoginOtp(@Body() dto: RequestLoginOtpDto) {
    return this.authService.requestLoginOtp(dto.identifier);
  }

  @Post('login/otp/verify')
  @ApiOperation({ summary: 'Log in to an existing account with an OTP' })
  async verifyLoginOtp(
    @Body() dto: VerifyLoginOtpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyLoginOtp(
      dto.identifier,
      dto.code,
      metadata(request),
    );
    this.authService.setSessionCookie(response, result.token, result.expiresAt);
    return { data: result.data };
  }

  @Post('register/otp/request')
  @ApiOperation({
    summary: 'Request a mobile verification OTP for registration',
  })
  requestRegistrationOtp(@Body() dto: RequestRegistrationOtpDto) {
    return this.authService.requestRegistrationOtp(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Create an account after mobile OTP verification' })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(dto, metadata(request));
    this.authService.setSessionCookie(response, result.token, result.expiresAt);
    return { data: result.data };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getCurrentUser(request.user.id);
  }

  @Patch('me/profile')
  @UseGuards(SessionAuthGuard)
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(request.user.id, dto);
  }

  @Get('me/avatar')
  @UseGuards(SessionAuthGuard)
  async getAvatar(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const avatar = await this.authService.getAvatar(request.user.id);
    response.setHeader('Content-Type', avatar.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.send(avatar.data);
  }

  @Post('me/avatar')
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', { limits: { fileSize: 1_000_000 } }),
  )
  updateAvatar(
    @Req() request: AuthenticatedRequest,
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
  ) {
    return this.authService.updateAvatar(request.user.id, file);
  }

  @Delete('me/avatar')
  @UseGuards(SessionAuthGuard)
  removeAvatar(@Req() request: AuthenticatedRequest) {
    return this.authService.removeAvatar(request.user.id);
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(this.authService.readSessionToken(request));
    this.authService.clearSessionCookie(response);
    return { data: { success: true } };
  }
}

function metadata(request: Request) {
  return {
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  };
}
