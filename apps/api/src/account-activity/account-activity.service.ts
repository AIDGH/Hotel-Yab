import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AccountActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string) {
    const [hotelReviews, videoComments] = await this.prisma.$transaction([
      this.prisma.hotelReview.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          rating: true,
          body: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          hotel: { select: { slug: true, name: true, city: true } },
        },
      }),
      this.prisma.videoComment.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          videoId: true,
          parentId: true,
          body: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { replies: true } },
        },
      }),
    ]);

    return {
      data: {
        hotelReviews: hotelReviews.map((review) => ({
          ...review,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        })),
        videoComments: videoComments.map(({ _count, ...comment }) => ({
          ...comment,
          replyCount: _count.replies,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
        })),
      },
    };
  }

  async removeVideoComment(id: string, userId: string) {
    const comment = await this.prisma.videoComment.findFirst({
      where: { id, userId },
      select: { id: true, _count: { select: { replies: true } } },
    });
    if (!comment) {
      throw new NotFoundException('The video comment was not found');
    }
    if (comment._count.replies > 0) {
      throw new ConflictException('A comment with replies cannot be deleted');
    }

    await this.prisma.videoComment.delete({ where: { id } });
    return { data: { success: true } };
  }
}
