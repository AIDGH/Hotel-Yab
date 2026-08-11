import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ContentModerationStatus } from '../generated/prisma/enums';
import {
  AUTO_HIDE_REPORT_COUNT,
  COMMENT_RATE_LIMIT,
  COMMENT_RATE_WINDOW_MS,
  decideCommentModeration,
  normalizeCommentBody,
} from './comment-moderation';
import { CreateVideoCommentDto } from './dto/create-video-comment.dto';
import { ReportVideoCommentDto } from './dto/report-video-comment.dto';

@Injectable()
export class VideoCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(videoId: string) {
    await this.requireVideo(videoId);
    const comments = await this.prisma.videoComment.findMany({
      where: {
        videoId,
        parentId: null,
        status: ContentModerationStatus.PUBLISHED,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
        replies: {
          where: { status: ContentModerationStatus.PUBLISHED },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            body: true,
            createdAt: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return { data: comments.map(serializeComment) };
  }

  async count(videoId: string) {
    await this.requireVideo(videoId);
    const count = await this.prisma.videoComment.count({
      where: { videoId, status: ContentModerationStatus.PUBLISHED },
    });
    return { data: { count } };
  }

  async create(videoId: string, userId: string, dto: CreateVideoCommentDto) {
    await this.requireVideo(videoId);
    const body = dto.body.trim();
    const now = new Date();
    const rateWindowStart = new Date(now.getTime() - COMMENT_RATE_WINDOW_MS);
    const repeatedSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [user, recentCommentCount, publishedCommentCount, repeatedComment] =
      await this.prisma.$transaction([
        this.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { firstName: true, lastName: true, role: true },
        }),
        this.prisma.videoComment.count({
          where: { userId, createdAt: { gte: rateWindowStart } },
        }),
        this.prisma.videoComment.count({
          where: {
            userId,
            status: ContentModerationStatus.PUBLISHED,
          },
        }),
        this.prisma.videoComment.findFirst({
          where: {
            userId,
            createdAt: { gte: repeatedSince },
            body: { equals: body, mode: 'insensitive' },
          },
          select: { id: true },
        }),
      ]);

    if (recentCommentCount >= COMMENT_RATE_LIMIT) {
      throw new HttpException(
        'Too many comments. Try again in one minute',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (dto.parentId) {
      const parent = await this.prisma.videoComment.findFirst({
        where: {
          id: dto.parentId,
          videoId,
          parentId: null,
          status: ContentModerationStatus.PUBLISHED,
        },
        select: { id: true },
      });
      if (!parent)
        throw new BadRequestException('The parent comment is invalid');
    }

    const moderation = decideCommentModeration({
      body: normalizeCommentBody(body),
      role: user.role,
      publishedCommentCount,
      repeated: Boolean(repeatedComment),
    });
    const status = moderation.publishImmediately
      ? ContentModerationStatus.PUBLISHED
      : ContentModerationStatus.PENDING;

    const comment = await this.prisma.videoComment.create({
      data: {
        videoId,
        userId,
        parentId: dto.parentId,
        body,
        status,
        publishedAt: moderation.publishImmediately ? now : null,
        moderationNote: moderation.reasons.length
          ? `بررسی خودکار: ${moderation.reasons.join('، ')}`
          : null,
      },
      select: {
        id: true,
        body: true,
        status: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    return {
      data: {
        id: comment.id,
        body: comment.body,
        status: comment.status,
        authorName: publicUserName(comment.user),
        createdAt: comment.createdAt.toISOString(),
        replies: [],
      },
    };
  }

  async report(
    videoId: string,
    commentId: string,
    reporterId: string,
    dto: ReportVideoCommentDto,
  ) {
    await this.requireVideo(videoId);

    return this.prisma.$transaction(async (transaction) => {
      const comment = await transaction.videoComment.findFirst({
        where: {
          id: commentId,
          videoId,
          status: ContentModerationStatus.PUBLISHED,
        },
        select: { id: true, userId: true },
      });
      if (!comment)
        throw new NotFoundException('The published comment was not found');
      if (comment.userId === reporterId) {
        throw new ForbiddenException('You cannot report your own comment');
      }

      const existing = await transaction.videoCommentReport.findUnique({
        where: { commentId_reporterId: { commentId, reporterId } },
        select: { id: true },
      });
      if (existing)
        throw new ConflictException('You have already reported this comment');

      await transaction.videoCommentReport.create({
        data: {
          commentId,
          reporterId,
          reason: dto.reason,
          details: dto.details?.trim() || null,
        },
      });

      const reportCount = await transaction.videoCommentReport.count({
        where: { commentId, resolvedAt: null },
      });
      const commentHidden = reportCount >= AUTO_HIDE_REPORT_COUNT;

      if (commentHidden) {
        await transaction.videoComment.update({
          where: { id: commentId },
          data: {
            status: ContentModerationStatus.HIDDEN,
            publishedAt: null,
            moderationNote: `پنهان‌سازی خودکار پس از ${AUTO_HIDE_REPORT_COUNT.toLocaleString('fa-IR')} گزارش یکتا`,
          },
        });
      }

      return { data: { reportCount, commentHidden } };
    });
  }

  private async requireVideo(videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true },
    });
    if (!video) throw new NotFoundException('The video was not found');
  }
}

function serializeComment(comment: {
  id: string;
  body: string;
  createdAt: Date;
  user: { firstName: string | null; lastName: string | null };
  replies: Array<{
    id: string;
    body: string;
    createdAt: Date;
    user: { firstName: string | null; lastName: string | null };
  }>;
}) {
  return {
    id: comment.id,
    body: comment.body,
    authorName: publicUserName(comment.user),
    createdAt: comment.createdAt.toISOString(),
    replies: comment.replies.map((reply) => ({
      id: reply.id,
      body: reply.body,
      authorName: publicUserName(reply.user),
      createdAt: reply.createdAt.toISOString(),
    })),
  };
}

function publicUserName(user: {
  firstName: string | null;
  lastName: string | null;
}): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') || 'کاربر هتل‌یاب'
  );
}
