import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ContentModerationStatus } from '../generated/prisma/enums';
import { ModerateContentDto } from './dto/moderate-content.dto';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async getQueue(status: ContentModerationStatus) {
    const [hotelReviews, videoComments] = await this.prisma.$transaction([
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
            },
          },
        },
      }),
    ]);

    return {
      data: {
        hotelReviews: hotelReviews.map(serializeHotelReview),
        videoComments: videoComments.map(serializeVideoComment),
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
    const comment = await this.prisma.videoComment.update({
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
    return { data: serializeModerationResult(comment) };
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
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  mobile: string;
}) {
  return {
    username: user.username,
    displayName:
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username ||
      'کاربر هتل‌یاب',
    mobile: user.mobile,
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
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    mobile: string;
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
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    mobile: string;
  };
}) {
  return {
    ...comment,
    user: userLabel(comment.user),
    createdAt: comment.createdAt.toISOString(),
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
