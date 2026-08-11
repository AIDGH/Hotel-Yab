import { UserRole } from '../generated/prisma/enums';
import { decideCommentModeration } from './comment-moderation';

describe('decideCommentModeration', () => {
  it('publishes a clean comment from a trusted user', () => {
    expect(
      decideCommentModeration({
        body: 'این ویدیو اطلاعات خوبی داشت.',
        role: UserRole.USER,
        publishedCommentCount: 3,
        repeated: false,
      }),
    ).toEqual({ publishImmediately: true, reasons: [] });
  });

  it('queues the first comments of a new user', () => {
    expect(
      decideCommentModeration({
        body: 'این ویدیو اطلاعات خوبی داشت.',
        role: UserRole.USER,
        publishedCommentCount: 2,
        repeated: false,
      }),
    ).toMatchObject({
      publishImmediately: false,
      reasons: ['کمتر از سه دیدگاه تأییدشده'],
    });
  });

  it('queues links and repeated content even for trusted users', () => {
    expect(
      decideCommentModeration({
        body: 'دوباره ببینید https://example.com',
        role: UserRole.USER,
        publishedCommentCount: 3,
        repeated: true,
      }),
    ).toMatchObject({
      publishImmediately: false,
      reasons: ['دارای لینک', 'متن تکراری'],
    });
  });
});
