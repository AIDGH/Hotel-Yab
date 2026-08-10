import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './../src/app.config';
import { AppModule } from './../src/app.module';
import { ImportDataset } from './../src/data-import/dataset';
import {
  importDataset,
  ImportSummary,
} from './../src/data-import/import-dataset';
import { PrismaService } from './../src/database/prisma.service';
import { configureSwagger } from './../src/docs/swagger';
import {
  AssociationType,
  NotablePersonCategory,
  PublicationStatus,
  SourceType,
  UserRole,
  VerificationStatus,
} from './../src/generated/prisma/enums';

const fixtureSlugs = [
  'e2e-visible-hotel',
  'e2e-hidden-pending-hotel',
  'e2e-hidden-unsupported-hotel',
  'e2e-visible-athlete',
  'e2e-hidden-pending-person',
  'e2e-hidden-unsupported-person',
  'e2e-import-hotel',
  'e2e-import-person',
];
const fixtureSourceUrlPrefix = 'https://example.com/hotel-yab-e2e/';
const fixtureMobile = '+989120000001';
const fixtureVideoId = 'e2e-travel-video';
const importFixture: ImportDataset = {
  videos: [],
  hotels: [
    {
      slug: 'e2e-import-hotel',
      name: 'E2E Import Hotel',
      countryCode: 'US',
      city: 'Import City',
      publicationStatus: PublicationStatus.DRAFT,
    },
  ],
  notablePeople: [
    {
      slug: 'e2e-import-person',
      displayName: 'E2E Import Person',
      primaryCategory: NotablePersonCategory.PUBLIC_FIGURE,
      publicationStatus: PublicationStatus.DRAFT,
    },
  ],
  sources: [
    {
      url: `${fixtureSourceUrlPrefix}import-source`,
      type: SourceType.OFFICIAL_WEBSITE,
      title: 'E2E import source',
    },
  ],
  associations: [
    {
      referenceKey: 'e2e-import-person-hotel-visit',
      hotelSlug: 'e2e-import-hotel',
      notablePersonSlug: 'e2e-import-person',
      type: AssociationType.VISITED,
      summary: 'A test-only pending association imported twice.',
      verificationStatus: VerificationStatus.PENDING,
      evidence: [
        {
          sourceUrl: `${fixtureSourceUrlPrefix}import-source`,
          isPrimary: true,
        },
      ],
    },
  ],
};

describe('Hotel-Yab API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let visibleHotelId: string;
  let visiblePersonId: string;
  let visibleAssociationId: string;
  let visibleSourceId: string;
  let hiddenPendingHotelId: string;
  let hiddenPendingPersonId: string;
  let hiddenPendingAssociationId: string;
  let hiddenUnsupportedHotelId: string;
  let repeatedImportSummary: ImportSummary;

  const occurredAt = new Date('2025-01-10T00:00:00.000Z');
  const verifiedAt = new Date('2026-01-12T00:00:00.000Z');
  const publishedAt = new Date('2025-01-11T00:00:00.000Z');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    configureSwagger(app);
    await app.init();

    prisma = app.get(PrismaService);
    await removeFixtures();
    await createFixtures();
    await importDataset(prisma, importFixture);
    repeatedImportSummary = await importDataset(prisma, importFixture);
  });

  async function removeFixtures(): Promise<void> {
    await prisma.user.deleteMany({ where: { mobile: fixtureMobile } });
    await prisma.otpChallenge.deleteMany({ where: { mobile: fixtureMobile } });
    await prisma.video.deleteMany({ where: { id: fixtureVideoId } });
    await prisma.hotel.deleteMany({
      where: { slug: { in: fixtureSlugs } },
    });
    await prisma.notablePerson.deleteMany({
      where: { slug: { in: fixtureSlugs } },
    });
    await prisma.source.deleteMany({
      where: { url: { startsWith: fixtureSourceUrlPrefix } },
    });
  }

  async function createFixtures(): Promise<void> {
    await prisma.video.create({ data: { id: fixtureVideoId } });
    const visibleHotel = await prisma.hotel.create({
      data: {
        slug: 'e2e-visible-hotel',
        name: 'E2E Visible Hotel',
        description: 'A test-only published hotel.',
        countryCode: 'US',
        city: 'Test City',
        logoUrl: 'https://example.com/hotel-yab-e2e/logo.webp',
        publicationStatus: PublicationStatus.PUBLISHED,
      },
    });
    const visiblePerson = await prisma.notablePerson.create({
      data: {
        slug: 'e2e-visible-athlete',
        displayName: 'E2E Visible Athlete',
        instagramHandle: 'e2e_visible_athlete',
        primaryCategory: NotablePersonCategory.ATHLETE,
        occupation: 'Test athlete',
        followerCount: 12345,
        countryCode: 'US',
        publicationStatus: PublicationStatus.PUBLISHED,
      },
    });
    const visibleSource = await prisma.source.create({
      data: {
        url: `${fixtureSourceUrlPrefix}verified-source`,
        type: SourceType.OFFICIAL_WEBSITE,
        title: 'E2E verified source',
        publisher: 'Example Publisher',
        publishedAt,
      },
    });
    const visibleAssociation = await prisma.hotelAssociation.create({
      data: {
        referenceKey: 'e2e-visible-hotel-stay',
        hotelId: visibleHotel.id,
        notablePersonId: visiblePerson.id,
        type: AssociationType.STAYED,
        summary: 'A test-only verified hotel stay.',
        occurredAt,
        verificationStatus: VerificationStatus.VERIFIED,
        verificationNotes: 'Internal e2e note that must never be public.',
        verifiedAt,
        evidence: {
          create: {
            sourceId: visibleSource.id,
            isPrimary: true,
            note: 'Test-only evidence link.',
          },
        },
      },
    });

    visibleHotelId = visibleHotel.id;
    visiblePersonId = visiblePerson.id;
    visibleSourceId = visibleSource.id;
    visibleAssociationId = visibleAssociation.id;

    await createHiddenPendingFixture();
    await createHiddenUnsupportedFixture();
  }

  async function createHiddenPendingFixture(): Promise<void> {
    const hotel = await prisma.hotel.create({
      data: {
        slug: 'e2e-hidden-pending-hotel',
        name: 'E2E Hidden Pending Hotel',
        countryCode: 'US',
        city: 'Test City',
        publicationStatus: PublicationStatus.PUBLISHED,
      },
    });
    const person = await prisma.notablePerson.create({
      data: {
        slug: 'e2e-hidden-pending-person',
        displayName: 'E2E Hidden Pending Person',
        primaryCategory: NotablePersonCategory.ACTOR,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
    });
    const association = await prisma.hotelAssociation.create({
      data: {
        referenceKey: 'e2e-hidden-pending-visit',
        hotelId: hotel.id,
        notablePersonId: person.id,
        type: AssociationType.VISITED,
        summary: 'A test-only pending claim.',
        verificationStatus: VerificationStatus.PENDING,
      },
    });

    hiddenPendingHotelId = hotel.id;
    hiddenPendingPersonId = person.id;
    hiddenPendingAssociationId = association.id;
  }

  async function createHiddenUnsupportedFixture(): Promise<void> {
    const hotel = await prisma.hotel.create({
      data: {
        slug: 'e2e-hidden-unsupported-hotel',
        name: 'E2E Hidden Unsupported Hotel',
        countryCode: 'US',
        city: 'Test City',
        publicationStatus: PublicationStatus.PUBLISHED,
      },
    });
    const person = await prisma.notablePerson.create({
      data: {
        slug: 'e2e-hidden-unsupported-person',
        displayName: 'E2E Hidden Unsupported Person',
        primaryCategory: NotablePersonCategory.MUSICIAN,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
    });

    await prisma.hotelAssociation.create({
      data: {
        referenceKey: 'e2e-hidden-unsupported-stay',
        hotelId: hotel.id,
        notablePersonId: person.id,
        type: AssociationType.STAYED,
        summary: 'A test-only claim without evidence.',
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedAt,
      },
    });

    hiddenUnsupportedHotelId = hotel.id;
  }

  it('GET /api/v1/health checks the database', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('serves interactive and machine-readable API documentation', async () => {
    await request(app.getHttpServer())
      .get('/api/docs')
      .expect('content-type', /html/)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect('content-type', /json/)
      .expect(200);
  });

  it('allows requests from the configured frontend origin', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:3000')
      .expect('access-control-allow-origin', 'http://localhost:3000')
      .expect(200);
  });

  it('imports the same dataset idempotently in one transaction', async () => {
    expect(repeatedImportSummary).toEqual({
      hotels: 1,
      notablePeople: 1,
      sources: 1,
      associations: 1,
      videos: 0,
    });

    const [hotels, people, sources, associations, evidence] =
      await prisma.$transaction([
        prisma.hotel.count({ where: { slug: 'e2e-import-hotel' } }),
        prisma.notablePerson.count({ where: { slug: 'e2e-import-person' } }),
        prisma.source.count({
          where: { url: `${fixtureSourceUrlPrefix}import-source` },
        }),
        prisma.hotelAssociation.count({
          where: { referenceKey: 'e2e-import-person-hotel-visit' },
        }),
        prisma.associationEvidence.count({
          where: {
            association: {
              referenceKey: 'e2e-import-person-hotel-visit',
            },
          },
        }),
      ]);

    expect({ hotels, people, sources, associations, evidence }).toEqual({
      hotels: 1,
      people: 1,
      sources: 1,
      associations: 1,
      evidence: 1,
    });
  });

  it('GET /api/v1/hotels lists public hotels with order-independent search', () => {
    return request(app.getHttpServer())
      .get('/api/v1/hotels?query=Visible%20E2E')
      .expect(200)
      .expect({
        data: [
          {
            id: visibleHotelId,
            slug: 'e2e-visible-hotel',
            name: 'E2E Visible Hotel',
            description: 'A test-only published hotel.',
            countryCode: 'US',
            city: 'Test City',
            imageUrl: null,
            logoUrl: 'https://example.com/hotel-yab-e2e/logo.webp',
            associationCount: 1,
            verifiedAssociationCount: 1,
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });
  });

  it('counts pending relationships without treating them as verified', () => {
    return request(app.getHttpServer())
      .get('/api/v1/hotels?query=E2E%20Hidden')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          data: [
            {
              id: hiddenPendingHotelId,
              slug: 'e2e-hidden-pending-hotel',
              name: 'E2E Hidden Pending Hotel',
              description: null,
              countryCode: 'US',
              city: 'Test City',
              imageUrl: null,
              logoUrl: null,
              associationCount: 1,
              verifiedAssociationCount: 0,
            },
            {
              id: hiddenUnsupportedHotelId,
              slug: 'e2e-hidden-unsupported-hotel',
              name: 'E2E Hidden Unsupported Hotel',
              description: null,
              countryCode: 'US',
              city: 'Test City',
              imageUrl: null,
              logoUrl: null,
              associationCount: 0,
              verifiedAssociationCount: 0,
            },
          ],
          meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
        });
      });
  });

  it('GET /api/v1/hotels/:slug returns traceable evidence', () => {
    return request(app.getHttpServer())
      .get('/api/v1/hotels/e2e-visible-hotel')
      .expect(200)
      .expect({
        data: {
          id: visibleHotelId,
          slug: 'e2e-visible-hotel',
          name: 'E2E Visible Hotel',
          description: 'A test-only published hotel.',
          countryCode: 'US',
          city: 'Test City',
          address: null,
          latitude: null,
          longitude: null,
          websiteUrl: null,
          imageUrl: null,
          logoUrl: 'https://example.com/hotel-yab-e2e/logo.webp',
          ratingSummary: {
            averageRating: null,
            reviewCount: 0,
          },
          associations: [
            {
              id: visibleAssociationId,
              type: 'STAYED',
              summary: 'A test-only verified hotel stay.',
              occurredAt: occurredAt.toISOString(),
              verificationStatus: 'VERIFIED',
              verifiedAt: verifiedAt.toISOString(),
              notablePerson: {
                id: visiblePersonId,
                slug: 'e2e-visible-athlete',
                displayName: 'E2E Visible Athlete',
                instagramHandle: 'e2e_visible_athlete',
                primaryCategory: 'ATHLETE',
                occupation: 'Test athlete',
                followerCount: 12345,
                imageUrl: null,
              },
              sources: [
                {
                  id: visibleSourceId,
                  url: `${fixtureSourceUrlPrefix}verified-source`,
                  type: 'OFFICIAL_WEBSITE',
                  title: 'E2E verified source',
                  publisher: 'Example Publisher',
                  author: null,
                  publishedAt: publishedAt.toISOString(),
                  archivedUrl: null,
                  isPrimary: true,
                  note: 'Test-only evidence link.',
                },
              ],
            },
          ],
        },
      });
  });

  it('GET /api/v1/notable-people lists only verified public people', () => {
    return request(app.getHttpServer())
      .get('/api/v1/notable-people?query=E2E%20Visible&category=ATHLETE')
      .expect(200)
      .expect({
        data: [
          {
            id: visiblePersonId,
            slug: 'e2e-visible-athlete',
            displayName: 'E2E Visible Athlete',
            instagramHandle: 'e2e_visible_athlete',
            primaryCategory: 'ATHLETE',
            occupation: 'Test athlete',
            followerCount: 12345,
            countryCode: 'US',
            imageUrl: null,
            associationCount: 1,
            verifiedAssociationCount: 1,
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });
  });

  it('GET /api/v1/notable-people searches by Instagram handle', () => {
    return request(app.getHttpServer())
      .get('/api/v1/notable-people?query=e2e_visible_athlete')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: [
            {
              id: visiblePersonId,
              instagramHandle: 'e2e_visible_athlete',
            },
          ],
          meta: { total: 1 },
        });
      });
  });

  it('GET /api/v1/notable-people/:slug returns hotels and sources', () => {
    return request(app.getHttpServer())
      .get('/api/v1/notable-people/e2e-visible-athlete')
      .expect(200)
      .expect({
        data: {
          id: visiblePersonId,
          slug: 'e2e-visible-athlete',
          displayName: 'E2E Visible Athlete',
          instagramHandle: 'e2e_visible_athlete',
          primaryCategory: 'ATHLETE',
          occupation: 'Test athlete',
          followerCount: 12345,
          biography: null,
          countryCode: 'US',
          imageUrl: null,
          associations: [
            {
              id: visibleAssociationId,
              type: 'STAYED',
              summary: 'A test-only verified hotel stay.',
              occurredAt: occurredAt.toISOString(),
              verificationStatus: 'VERIFIED',
              verifiedAt: verifiedAt.toISOString(),
              hotel: {
                id: visibleHotelId,
                slug: 'e2e-visible-hotel',
                name: 'E2E Visible Hotel',
                countryCode: 'US',
                city: 'Test City',
                imageUrl: null,
                logoUrl: 'https://example.com/hotel-yab-e2e/logo.webp',
              },
              sources: [
                {
                  id: visibleSourceId,
                  url: `${fixtureSourceUrlPrefix}verified-source`,
                  type: 'OFFICIAL_WEBSITE',
                  title: 'E2E verified source',
                  publisher: 'Example Publisher',
                  author: null,
                  publishedAt: publishedAt.toISOString(),
                  archivedUrl: null,
                  isPrimary: true,
                  note: 'Test-only evidence link.',
                },
              ],
            },
          ],
        },
      });
  });

  it('rejects invalid pagination and unknown query parameters', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/hotels?pageSize=101')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/hotels?verificationStatus=REJECTED')
      .expect(400);
  });

  it('returns a clearly pending relationship without fake evidence', () => {
    return request(app.getHttpServer())
      .get('/api/v1/hotels/e2e-hidden-pending-hotel')
      .expect(200)
      .expect({
        data: {
          id: hiddenPendingHotelId,
          slug: 'e2e-hidden-pending-hotel',
          name: 'E2E Hidden Pending Hotel',
          description: null,
          countryCode: 'US',
          city: 'Test City',
          address: null,
          latitude: null,
          longitude: null,
          websiteUrl: null,
          imageUrl: null,
          logoUrl: null,
          ratingSummary: {
            averageRating: null,
            reviewCount: 0,
          },
          associations: [
            {
              id: hiddenPendingAssociationId,
              type: 'VISITED',
              summary: 'A test-only pending claim.',
              occurredAt: null,
              verificationStatus: 'PENDING',
              verifiedAt: null,
              notablePerson: {
                id: hiddenPendingPersonId,
                slug: 'e2e-hidden-pending-person',
                displayName: 'E2E Hidden Pending Person',
                instagramHandle: null,
                primaryCategory: 'ACTOR',
                occupation: null,
                followerCount: null,
                imageUrl: null,
              },
              sources: [],
            },
          ],
        },
      });
  });

  it('publishes a pending person profile with an explicit pending hotel', () => {
    return request(app.getHttpServer())
      .get('/api/v1/notable-people/e2e-hidden-pending-person')
      .expect(200)
      .expect((response) => {
        const body = response.body as { data: unknown };

        expect(body.data).toMatchObject({
          id: hiddenPendingPersonId,
          slug: 'e2e-hidden-pending-person',
          associations: [
            {
              id: hiddenPendingAssociationId,
              verificationStatus: 'PENDING',
              sources: [],
              hotel: { id: hiddenPendingHotelId },
            },
          ],
        });
      });
  });

  it('returns 404 for a draft hotel slug', () => {
    return request(app.getHttpServer())
      .get('/api/v1/hotels/e2e-import-hotel')
      .expect(404);
  });

  it('supports verified registration, password/OTP login, moderation, reviews, and comments', async () => {
    const otpResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register/otp/request')
      .send({ mobile: '09120000001' })
      .expect(201);

    const otpBody = otpResponse.body as {
      data: { developmentCode: string };
    };
    const code = otpBody.data.developmentCode;
    expect(code).toMatch(/^\d{6}$/);

    const verifyResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        mobile: '09120000001',
        code,
        username: 'e2e.user',
        password: 'e2e-password-123',
        firstName: 'E2E',
        lastName: 'User',
        email: 'e2e-user@example.com',
        instagramHandle: '@e2e.user',
      })
      .expect(201);
    const headers = verifyResponse.headers as unknown as {
      'set-cookie'?: string | string[];
    };
    const setCookieHeader = headers['set-cookie'];
    const cookieValue = Array.isArray(setCookieHeader)
      ? setCookieHeader[0]
      : setCookieHeader;
    if (!cookieValue) throw new Error('Session cookie was not returned');
    const sessionCookie: string = cookieValue.split(';')[0];

    await request(app.getHttpServer())
      .post('/api/v1/auth/login/password')
      .send({ identifier: 'e2e.user', password: 'e2e-password-123' })
      .expect(201)
      .expect((response) => {
        const body = response.body as { data: unknown };
        expect(body.data).toMatchObject({
          mobile: fixtureMobile,
          username: 'e2e.user',
          displayName: 'E2E User',
          email: 'e2e-user@example.com',
          instagramHandle: 'e2e.user',
          hasPassword: true,
          profileComplete: true,
        });
      });

    const loginOtpResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login/otp/request')
      .send({ identifier: 'e2e.user' })
      .expect(201);
    const loginOtpCode = (
      loginOtpResponse.body as { data: { developmentCode: string } }
    ).data.developmentCode;
    await request(app.getHttpServer())
      .post('/api/v1/auth/login/otp/verify')
      .send({ identifier: fixtureMobile, code: loginOtpCode })
      .expect(201);

    const reviewResponse = await request(app.getHttpServer())
      .put('/api/v1/hotels/e2e-visible-hotel/reviews/me')
      .set('Cookie', sessionCookie)
      .send({ rating: 5 })
      .expect(200)
      .expect((response) => {
        const body = response.body as { data: unknown };
        expect(body.data).toMatchObject({
          rating: 5,
          body: '',
          status: 'PENDING',
        });
      });
    const reviewId = (reviewResponse.body as { data: { id: string } }).data.id;

    const commentResponse = await request(app.getHttpServer())
      .post(`/api/v1/videos/${fixtureVideoId}/comments`)
      .set('Cookie', sessionCookie)
      .send({ body: 'A useful test comment.' })
      .expect(201)
      .expect((response) => {
        const body = response.body as { data: unknown };
        expect(body.data).toMatchObject({
          body: 'A useful test comment.',
          status: 'PENDING',
          authorName: 'E2E User',
        });
      });
    const commentId = (commentResponse.body as { data: { id: string } }).data
      .id;

    await request(app.getHttpServer())
      .get('/api/v1/admin/moderation/queue')
      .set('Cookie', sessionCookie)
      .expect(403);

    await prisma.user.update({
      where: { mobile: fixtureMobile },
      data: { role: UserRole.ADMIN },
    });

    await request(app.getHttpServer())
      .get('/api/v1/admin/moderation/queue?status=PENDING')
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          data: {
            hotelReviews: Array<{ id: string }>;
            videoComments: Array<{ id: string }>;
          };
        };
        expect(body.data.hotelReviews).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: reviewId })]),
        );
        expect(body.data.videoComments).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: commentId })]),
        );
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/moderation/hotel-reviews/${reviewId}`)
      .set('Cookie', sessionCookie)
      .send({ status: 'PUBLISHED', moderationNote: 'E2E approved' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: {
            id: reviewId,
            status: 'PUBLISHED',
            moderationNote: 'E2E approved',
          },
        });
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/moderation/video-comments/${commentId}`)
      .set('Cookie', sessionCookie)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/hotels/e2e-visible-hotel/reviews')
      .expect(200)
      .expect((response) => {
        const body = response.body as { summary: unknown };
        expect(body.summary).toEqual({
          averageRating: 5,
          reviewCount: 1,
        });
      });

    await request(app.getHttpServer())
      .get(`/api/v1/videos/${fixtureVideoId}/comments/count`)
      .expect(200)
      .expect({ data: { count: 1 } });

    await request(app.getHttpServer())
      .get('/api/v1/hotels/e2e-visible-hotel')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: { ratingSummary: { averageRating: 5, reviewCount: 1 } },
        });
      });

    await request(app.getHttpServer())
      .patch('/api/v1/auth/me/profile')
      .set('Cookie', sessionCookie)
      .send({ email: '', instagramHandle: '' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { data: unknown };
        expect(body.data).toMatchObject({
          email: null,
          instagramHandle: null,
        });
      });
  });

  afterAll(async () => {
    await removeFixtures();
    await app.close();
  });
});
