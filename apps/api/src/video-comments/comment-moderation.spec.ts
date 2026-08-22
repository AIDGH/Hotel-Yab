import { UserRole } from '../generated/prisma/enums';
import { decideCommentModeration } from './comment-moderation';

describe('decideCommentModeration', () => {
  it('publishes a clean comment without a prior-comment threshold', () => {
    expect(
      decideCommentModeration({
        body: 'این ویدیو اطلاعات خوبی داشت.',
        role: UserRole.USER,
        repeated: false,
      }),
    ).toEqual({ publishImmediately: true, reasons: [] });
  });

  it('queues links and repeated content even for trusted users', () => {
    expect(
      decideCommentModeration({
        body: 'دوباره ببینید https://example.com',
        role: UserRole.USER,
        repeated: true,
      }),
    ).toMatchObject({
      publishImmediately: false,
      reasons: ['دارای لینک', 'متن تکراری'],
    });
  });

  it('publishes staff comments without automated moderation', () => {
    expect(
      decideCommentModeration({
        body: 'https://example.com',
        role: UserRole.MODERATOR,
        repeated: true,
      }),
    ).toEqual({ publishImmediately: true, reasons: [] });
  });
});
