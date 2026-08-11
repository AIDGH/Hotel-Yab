import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CommentReportReason,
  ContentModerationStatus,
  UserStatus,
} from '../generated/prisma/enums';
import { ModerateContentDto } from './dto/moderate-content.dto';

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

  async updateUserStatus(id: string, adminId: string, status: UserStatus) {
    if (id === adminId && status === UserStatus.BLOCKED) {
      throw new BadRequestException('You cannot block your own account');
    }
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('The user was not found');

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
