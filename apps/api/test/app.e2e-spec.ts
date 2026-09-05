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
  VideoCategory,
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
const reporterFixtureMobile = '+989120000002';
const fixtureVideoId = 'e2e-travel-video';
const fixtureCatalogVideoId = 'e2e-catalog-hotel-video';
const importFixture: ImportDataset = {
  videos: [],
  destinations: [],
  hotels: [
    {
      slug: 'e2e-import-hotel',
      name: 'E2E Import Hotel',
      countryCode: 'US',
      city: 'Import City',
      starRating: 4,
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
    await prisma.user.deleteMany({
      where: { mobile: { in: [fixtureMobile, reporterFixtureMobile] } },
    });
    await prisma.otpChallenge.deleteMany({
      where: { mobile: { in: [fixtureMobile, reporterFixtureMobile] } },
    });
    await prisma.video.deleteMany({
      where: { id: { in: [fixtureVideoId, fixtureCatalogVideoId] } },
    });
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
        starRating: 5,
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
    await prisma.video.update({
      where: { id: fixtureVideoId },
      data: {
        instagramUsername: visiblePerson.instagramHandle,
        platform: 'INSTAGRAM',
        contentType: 'POST',
        sourceUrl: `${fixtureSourceUrlPrefix}travel-video`,
        title: 'E2E hotel travel video',
        placeName: 'Test Hotel',
        placeType: 'HOTEL',
        evidenceType: 'ORIGINAL_POST',
        verificationStatus: VerificationStatus.VERIFIED,
        mediaUrl: '/travel-videos/e2e/001.mp4',
        thumbnailUrl: '/travel-videos/e2e/001-thumbnail.webp',
        publicationStatus: PublicationStatus.PUBLISHED,
        mediaItems: {
          create: {
            displayOrder: 1,
            mediaType: 'VIDEO',
            mediaUrl: '/travel-videos/e2e/001.mp4',
            thumbnailUrl: '/travel-videos/e2e/001-thumbnail.webp',
          },
        },
        hotels: { create: { hotelId: visibleHotel.id } },
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
      destinations: 0,
      videos: 0,
      videoDestinations: 0,
      videoHotels: 0,
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
            starRating: 5,
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
              starRating: null,
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
              starRating: null,
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
          starRating: 5,
          ratingSummary: {
            averageRating: null,
            reviewCount: 0,
          },
          videos: [
            {
              id: fixtureVideoId,
              videoCategory: 'TRAVEL',
              contentKind: 'VIDEO',
              instagramUsername: 'e2e_visible_athlete',
              platform: 'INSTAGRAM',
              personCategory: null,
              contentType: 'POST',
              sourceUrl: `${fixtureSourceUrlPrefix}travel-video`,
              title: 'E2E hotel travel video',
              placeName: 'Test Hotel',
              placeType: 'HOTEL',
              publishedDate: null,
              captionSummary: null,
              evidenceType: 'ORIGINAL_POST',
              verificationStatus: 'VERIFIED',
              notes: null,
              mediaUrl: '/travel-videos/e2e/001.mp4',
              thumbnailUrl: '/travel-videos/e2e/001-thumbnail.webp',
              mediaItems: [
                {
                  displayOrder: 1,
                  mediaType: 'VIDEO',
                  mediaUrl: '/travel-videos/e2e/001.mp4',
                  thumbnailUrl: '/travel-videos/e2e/001-thumbnail.webp',
                },
              ],
              publicationStatus: 'PUBLISHED',
            },
          ],
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
      .expect((response) => {
        expect(response.body).toMatchObject({
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
            videos: [
              {
                id: fixtureVideoId,
                videoCategory: 'TRAVEL',
                instagramUsername: 'e2e_visible_athlete',
                hotels: [
                  {
                    id: visibleHotelId,
                    slug: 'e2e-visible-hotel',
                    name: 'E2E Visible Hotel',
                  },
                ],
              },
            ],
          },
        });
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
          starRating: null,
          ratingSummary: {
            averageRating: null,
            reviewCount: 0,
          },
          videos: [],
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
    const registration = {
      mobile: '09120000001',
      username: 'e2e.user',
      password: 'E2e-password-123',
      email: 'e2e-user@example.com',
      instagramHandle: '@e2e.user',
    };

    await request(app.getHttpServer())
      .post('/api/v1/auth/register/otp/request')
      .send({ ...registration, password: 'weak-password' })
      .expect(400);

    const otpResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register/otp/request')
      .send(registration)
      .expect(201);

    const otpBody = otpResponse.body as {
      data: { developmentCode: string; resendAfterSeconds: number };
    };
    const code = otpBody.data.developmentCode;
    expect(code).toMatch(/^\d{6}$/);
    expect(otpBody.data.resendAfterSeconds).toBe(60);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register/otp/request')
      .send(registration)
      .expect(429);

    const verifyResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        ...registration,
        code,
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

    expect(verifyResponse.body).toMatchObject({
      data: {
        firstName: null,
        lastName: null,
        displayName: null,
        avatarUrl: null,
        profileComplete: true,
      },
    });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me/avatar')
      .set('Cookie', sessionCookie)
      .expect(404);

    const avatarBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    await request(app.getHttpServer())
      .post('/api/v1/auth/me/avatar')
      .set('Cookie', sessionCookie)
      .attach('avatar', avatarBytes, {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as { data: { avatarUrl: string } };
        expect(body.data.avatarUrl).toContain('/auth/me/avatar?v=');
      });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me/avatar')
      .set('Cookie', sessionCookie)
      .expect('Content-Type', /image\/webp/)
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/v1/auth/me/profile')
      .set('Cookie', sessionCookie)
      .send({ firstName: 'E2E', lastName: 'User' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: { displayName: 'E2E User' },
        });
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/register/otp/request')
      .send({
        ...registration,
        mobile: '09120000002',
        username: 'e2e.second_user',
        instagramHandle: 'e2e.second_user',
      })
      .expect(409)
      .expect((response) => {
        expect(response.body).toMatchObject({
          message: 'This email is already in use',
        });
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login/password')
      .send({ identifier: 'e2e.user', password: 'E2e-password-123' })
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

    await request(app.getHttpServer())
      .get('/api/v1/account/library')
      .expect(401);

    for (const path of [
      '/api/v1/account/library/hotels/e2e-visible-hotel/like',
      '/api/v1/account/library/hotels/e2e-visible-hotel/save',
      '/api/v1/account/library/notable-people/e2e-visible-athlete/like',
      '/api/v1/account/library/notable-people/e2e-visible-athlete/save',
    ]) {
      await request(app.getHttpServer())
        .put(path)
        .set('Cookie', sessionCookie)
        .expect(200)
        .expect({ data: { active: true } });
    }

    await request(app.getHttpServer())
      .put('/api/v1/account/library/hotels/e2e-visible-hotel/like')
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect({ data: { active: true } });

    await request(app.getHttpServer())
      .get('/api/v1/account/library')
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          data: {
            likedHotels: Array<{ slug: string }>;
            savedHotels: Array<{ slug: string }>;
            likedNotablePeople: Array<{ slug: string }>;
            savedNotablePeople: Array<{ slug: string }>;
          };
        };
        expect(body.data.likedHotels).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ slug: 'e2e-visible-hotel' }),
          ]),
        );
        expect(body.data.savedHotels).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ slug: 'e2e-visible-hotel' }),
          ]),
        );
        expect(body.data.likedNotablePeople).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ slug: 'e2e-visible-athlete' }),
          ]),
        );
        expect(body.data.savedNotablePeople).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ slug: 'e2e-visible-athlete' }),
          ]),
        );
      });

    for (const path of [
      '/api/v1/account/library/hotels/e2e-visible-hotel/like',
      '/api/v1/account/library/hotels/e2e-visible-hotel/save',
      '/api/v1/account/library/notable-people/e2e-visible-athlete/like',
      '/api/v1/account/library/notable-people/e2e-visible-athlete/save',
    ]) {
      await request(app.getHttpServer())
        .delete(path)
        .set('Cookie', sessionCookie)
        .expect(200)
        .expect({ data: { active: false } });
    }

    await request(app.getHttpServer())
      .put('/api/v1/hotels/e2e-visible-hotel/reviews/me')
      .set('Cookie', sessionCookie)
      .send({ rating: 5, body: 'ab' })
      .expect(400);

    const reviewResponse = await request(app.getHttpServer())
      .put('/api/v1/hotels/e2e-visible-hotel/reviews/me')
      .set('Cookie', sessionCookie)
      .send({ rating: 5, body: 'خوب' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { data: unknown };
        expect(body.data).toMatchObject({
          rating: 5,
          body: 'خوب',
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
          status: 'PUBLISHED',
          authorName: 'E2E User',
        });
      });
    const commentId = (commentResponse.body as { data: { id: string } }).data
      .id;

    await request(app.getHttpServer())
      .get('/api/v1/account/activity')
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/v1/account/activity')
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: {
            hotelReviews: [
              {
                id: reviewId,
                rating: 5,
                status: 'PENDING',
                hotel: {
                  slug: 'e2e-visible-hotel',
                  name: 'E2E Visible Hotel',
                  city: 'Test City',
                },
              },
            ],
            videoComments: [
              {
                id: commentId,
                videoId: fixtureVideoId,
                body: 'A useful test comment.',
                status: 'PUBLISHED',
                replyCount: 0,
              },
            ],
          },
        });
      });

    await request(app.getHttpServer())
      .get('/api/v1/admin/moderation/queue')
      .set('Cookie', sessionCookie)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/moderation/video-comments/${commentId}`)
      .set('Cookie', sessionCookie)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/moderation/hotel-reviews/${reviewId}`)
      .set('Cookie', sessionCookie)
      .expect(403);

    await prisma.user.update({
      where: { mobile: fixtureMobile },
      data: { role: UserRole.ADMIN },
    });

    await request(app.getHttpServer())
      .post('/api/v1/admin/catalog/videos')
      .set('Cookie', sessionCookie)
      .send({
        id: fixtureCatalogVideoId,
        videoCategory: VideoCategory.HOTEL,
        instagramUsername: 'e2e_visible_athlete',
        platform: 'INSTAGRAM',
        personCategory: 'ATHLETE',
        contentType: 'POST',
        sourceUrl: `${fixtureSourceUrlPrefix}catalog-hotel-video`,
        title: 'E2E catalog hotel video',
        placeName: 'E2E Hidden Pending Hotel',
        placeType: 'HOTEL',
        evidenceType: 'ORIGINAL_POST',
        verificationStatus: VerificationStatus.VERIFIED,
        mediaUrl:
          '/hotel-videos/e2e-visible-athlete/e2e-hidden-pending-hotel-001.mp4',
        thumbnailUrl:
          '/hotel-videos/e2e-visible-athlete/e2e-hidden-pending-hotel-001-thumbnail.webp',
        publicationStatus: PublicationStatus.PUBLISHED,
        destinationIds: [],
        hotelIds: [hiddenPendingHotelId],
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: {
            id: fixtureCatalogVideoId,
            videoCategory: 'HOTEL',
            hotels: [{ id: hiddenPendingHotelId }],
          },
        });
      });

    await expect(
      prisma.hotelAssociation.findFirst({
        where: {
          hotelId: hiddenPendingHotelId,
          notablePersonId: visiblePersonId,
        },
        select: { verificationStatus: true },
      }),
    ).resolves.toEqual({ verificationStatus: VerificationStatus.PENDING });

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
        expect(body.data.videoComments).not.toEqual(
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
      .post(`/api/v1/videos/${fixtureVideoId}/comments`)
      .set('Cookie', sessionCookie)
      .send({ body: 'A clean comment from an administrator.' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: { status: 'PUBLISHED' },
        });
      });

    await request(app.getHttpServer())
      .post(`/api/v1/videos/${fixtureVideoId}/comments`)
      .set('Cookie', sessionCookie)
      .send({ body: 'A risky link https://example.com' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: { status: 'PUBLISHED' },
        });
      });

    const reporterRegistration = {
      mobile: '09120000002',
      username: 'e2e.reporter',
      password: 'E2e-password-456',
      email: 'e2e-reporter@example.com',
    };
    const reporterOtpResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register/otp/request')
      .send(reporterRegistration)
      .expect(201);
    const reporterCode = (
      reporterOtpResponse.body as { data: { developmentCode: string } }
    ).data.developmentCode;
    const reporterResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...reporterRegistration, code: reporterCode })
      .expect(201);
    const reporterHeaders = reporterResponse.headers as unknown as {
      'set-cookie'?: string | string[];
    };
    const reporterCookieHeader = Array.isArray(reporterHeaders['set-cookie'])
      ? reporterHeaders['set-cookie'][0]
      : reporterHeaders['set-cookie'];
    if (!reporterCookieHeader)
      throw new Error('Reporter session cookie was not returned');
    const reporterCookie = reporterCookieHeader.split(';')[0];
    const reporterId = (reporterResponse.body as { data: { id: string } }).data
      .id;

    const namelessCommentResponse = await request(app.getHttpServer())
      .post(`/api/v1/videos/${fixtureVideoId}/comments`)
      .set('Cookie', reporterCookie)
      .send({ body: 'A comment from a profile without names.' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: {
            authorName: 'کاربر هتل‌یاب',
            status: 'PUBLISHED',
          },
        });
      });
    const namelessCommentId = (
      namelessCommentResponse.body as { data: { id: string } }
    ).data.id;

    const reporterReviewResponse = await request(app.getHttpServer())
      .put('/api/v1/hotels/e2e-visible-hotel/reviews/me')
      .set('Cookie', reporterCookie)
      .send({ rating: 4, body: 'خوب' })
      .expect(200);
    const reporterReviewId = (
      reporterReviewResponse.body as { data: { id: string } }
    ).data.id;

    await request(app.getHttpServer())
      .post(`/api/v1/videos/${fixtureVideoId}/comments/${commentId}/reports`)
      .set('Cookie', reporterCookie)
      .send({ reason: 'SPAM', details: 'E2E report' })
      .expect(201)
      .expect({ data: { reportCount: 1, commentHidden: false } });

    await request(app.getHttpServer())
      .get('/api/v1/admin/moderation/queue?status=PENDING')
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          data: {
            reportedComments: Array<{
              id: string;
              reportCount: number;
            }>;
          };
        };
        expect(body.data.reportedComments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: commentId, reportCount: 1 }),
          ]),
        );
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/moderation/users/${reporterId}/status`)
      .set('Cookie', sessionCookie)
      .send({ status: 'BLOCKED' })
      .expect(200)
      .expect({ data: { id: reporterId, status: 'BLOCKED' } });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', reporterCookie)
      .expect(401);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/moderation/video-comments/${namelessCommentId}`)
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect({ data: { success: true } });

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/moderation/hotel-reviews/${reporterReviewId}`)
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect({ data: { success: true } });

    await expect(
      prisma.videoComment.findUnique({ where: { id: namelessCommentId } }),
    ).resolves.toBeNull();
    await expect(
      prisma.hotelReview.findUnique({ where: { id: reporterReviewId } }),
    ).resolves.toBeNull();

    await request(app.getHttpServer())
      .patch('/api/v1/auth/me/profile')
      .set('Cookie', sessionCookie)
      .send({ email: registration.email })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: { email: registration.email },
        });
      });

    await request(app.getHttpServer())
      .delete('/api/v1/auth/me/avatar')
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({ data: { avatarUrl: null } });
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

    await request(app.getHttpServer())
      .delete(`/api/v1/account/activity/video-comments/${commentId}`)
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect({ data: { success: true } });

    await request(app.getHttpServer())
      .delete('/api/v1/hotels/e2e-visible-hotel/reviews/me')
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect({ data: { success: true } });

    await request(app.getHttpServer())
      .get('/api/v1/account/activity')
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          data: {
            hotelReviews: Array<{ id: string }>;
            videoComments: Array<{ id: string }>;
          };
        };
        expect(body.data.hotelReviews).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ id: reviewId })]),
        );
        expect(body.data.videoComments).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ id: commentId })]),
        );
      });
  });

  afterAll(async () => {
    await removeFixtures();
    await app.close();
  });
});
