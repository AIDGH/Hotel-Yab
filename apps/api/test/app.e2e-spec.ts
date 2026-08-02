import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './../src/app.config';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import {
  AssociationType,
  NotablePersonCategory,
  PublicationStatus,
  SourceType,
  VerificationStatus,
} from './../src/generated/prisma/enums';

const fixtureSlugs = [
  'e2e-visible-hotel',
  'e2e-hidden-pending-hotel',
  'e2e-hidden-unsupported-hotel',
  'e2e-visible-athlete',
  'e2e-hidden-pending-person',
  'e2e-hidden-unsupported-person',
];
const fixtureSourceUrlPrefix = 'https://example.com/hotel-yab-e2e/';

describe('Hotel-Yab API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let visibleHotelId: string;
  let visiblePersonId: string;
  let visibleAssociationId: string;
  let visibleSourceId: string;

  const occurredAt = new Date('2025-01-10T00:00:00.000Z');
  const verifiedAt = new Date('2026-01-12T00:00:00.000Z');
  const publishedAt = new Date('2025-01-11T00:00:00.000Z');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await removeFixtures();
    await createFixtures();
  });

  async function removeFixtures(): Promise<void> {
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
    const visibleHotel = await prisma.hotel.create({
      data: {
        slug: 'e2e-visible-hotel',
        name: 'E2E Visible Hotel',
        description: 'A test-only published hotel.',
        countryCode: 'US',
        city: 'Test City',
        publicationStatus: PublicationStatus.PUBLISHED,
      },
    });
    const visiblePerson = await prisma.notablePerson.create({
      data: {
        slug: 'e2e-visible-athlete',
        displayName: 'E2E Visible Athlete',
        primaryCategory: NotablePersonCategory.ATHLETE,
        occupation: 'Test athlete',
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
    const source = await prisma.source.create({
      data: {
        url: `${fixtureSourceUrlPrefix}pending-source`,
        type: SourceType.NEWS_ARTICLE,
        title: 'E2E pending source',
      },
    });

    await prisma.hotelAssociation.create({
      data: {
        hotelId: hotel.id,
        notablePersonId: person.id,
        type: AssociationType.VISITED,
        summary: 'A test-only pending claim.',
        verificationStatus: VerificationStatus.PENDING,
        evidence: {
          create: { sourceId: source.id },
        },
      },
    });
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
        hotelId: hotel.id,
        notablePersonId: person.id,
        type: AssociationType.STAYED,
        summary: 'A test-only claim without evidence.',
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedAt,
      },
    });
  }

  it('GET /api/v1/health checks the database', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('GET /api/v1/hotels lists only evidence-backed verified hotels', () => {
    return request(app.getHttpServer())
      .get('/api/v1/hotels?query=E2E%20Visible')
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
            associationCount: 1,
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });
  });

  it('does not expose pending or unsupported hotel associations', () => {
    return request(app.getHttpServer())
      .get('/api/v1/hotels?query=E2E%20Hidden')
      .expect(200)
      .expect({
        data: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
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
                primaryCategory: 'ATHLETE',
                occupation: 'Test athlete',
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
            primaryCategory: 'ATHLETE',
            occupation: 'Test athlete',
            countryCode: 'US',
            imageUrl: null,
            associationCount: 1,
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
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
          primaryCategory: 'ATHLETE',
          occupation: 'Test athlete',
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

  it('returns 404 for a non-public hotel slug', () => {
    return request(app.getHttpServer())
      .get('/api/v1/hotels/e2e-hidden-pending-hotel')
      .expect(404);
  });

  afterAll(async () => {
    await removeFixtures();
    await app.close();
  });
});
