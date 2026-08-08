# Hotel-Yab — Project Context

> این فایل مرجع اصلی وضعیت فعلی پروژه و handoff بین چت‌ها و توسعه‌دهنده‌هاست.
> جزئیات تخصصی در فایل‌های `docs/` نگهداری می‌شوند و این فایل باید خلاصه، به‌روز و قابل اتکا باقی بماند.

آخرین به‌روزرسانی محتوایی: ۲۰۲۶-۰۸-۰۸

---

## 1. شیوه همکاری

- زبان توضیحات ترجیحاً فارسی است؛ نام کدها و اصطلاحات فنی انگلیسی باقی بمانند.
- سیستم‌عامل توسعه macOS است.
- قبل از استفاده از library، framework، pattern یا مفهوم جدید توضیح داده شود:
  - چیست؛
  - چرا لازم است؛
  - چگونه کار می‌کند؛
  - جایگزین‌ها چیست؛
  - چرا برای Hotel-Yab مناسب است.
- ترتیب کار ترجیحاً:
  1. Learning
  2. Design
  3. Implementation
  4. Testing
  5. Documentation
- تغییر معماری بزرگ بدون هماهنگی انجام نشود.
- سادگی و خوانایی کد بر abstraction یا optimization زودهنگام اولویت دارد.
- فعلاً بدون نیاز واقعی از Microservice، GraphQL، Redis و Docker استفاده نشود.
- هر commit فقط یک تغییر منطقی داشته باشد.
- بدون درخواست صریح کاربر `push` انجام نشود.
- داده یا تغییرات موجود کاربر حذف یا overwrite نشوند.
- بعد از هر تغییر پروژه مشخص شود کدام فایل‌های مستندات باید به‌روزرسانی شوند.

---

## 2. هدف محصول

Hotel-Yab پلتفرمی برای کشف هتل‌ها از مسیر ارتباط آن‌ها با افراد شناخته‌شده است؛ مانند:

- بازیگران؛
- ورزشکاران؛
- خوانندگان؛
- اینفلوئنسرها؛
- سایر چهره‌های عمومی.

ارزش اصلی محصول صرفاً نمایش هتل نیست، بلکه ایجاد یک graph قابل پیگیری میان:

```text
Hotel
  ↕
Association
  ↕
Notable Person
  ↕
Evidence / Source
```

نمونه یک association:

- یک بازیگر در هتلی حضور داشته؛
- یک ورزشکار در هتلی اقامت داشته؛
- یک اینفلوئنسر با هتل همکاری کرده؛
- یک فرد شناخته‌شده در رویدادی در هتل حضور داشته است.

Hotel-Yab در حال حاضر سرویس رزرو هتل نیست.

---

## 3. وضعیت فعلی محصول

پروژه در وضعیت **prototype قابل ارائه** قرار دارد.

هنوز production-ready نیست، اما بخش اصلی discovery کار می‌کند.

### موارد پیاده‌سازی‌شده

- Monorepo با pnpm workspaces
- Backend با NestJS و TypeScript
- REST API نسخه‌بندی‌شده
- PostgreSQL
- Prisma ORM
- Next.js frontend
- رابط فارسی و RTL
- صفحه اصلی
- فهرست هتل‌ها
- صفحه جزئیات هتل
- فهرست چهره‌ها
- صفحه جزئیات چهره
- Search و Filter
- Pagination برای هتل‌ها و چهره‌ها
- مدل Hotel
- مدل NotablePerson
- مدل Association
- مدل Source و Evidence
- نمایش associationهای `PENDING` و `VERIFIED`
- importer تراکنشی و idempotent
- داده اولیه هتل‌ها و افراد
- تصاویر محلی هتل و شخص
- Instagram Handle چهره‌ها
- Occupation و Biography
- Unit Test و E2E Test
- Swagger / OpenAPI

---

## 4. معماری فنی

معماری فعلی:

```text
User / Browser
      ↓
Next.js Frontend
      ↓
NestJS REST API
      ↓
Prisma ORM
      ↓
PostgreSQL
```

### Repository

```text
Hotel-Yab/
├── apps/
│   ├── web/
│   └── api/
├── docs/
├── packages/
├── PROJECT_CONTEXT.md
└── package.json
```

### Frontend

- Next.js 16
- React 19
- TypeScript
- App Router
- React Server Components
- CSS معمولی بدون UI Framework
- RTL Persian UI

مسیر:

```text
apps/web/
```

### Backend

- Node.js
- TypeScript
- NestJS 11
- REST API
- Prisma 7
- PostgreSQL
- Joi
- class-validator
- Jest
- Supertest

مسیر:

```text
apps/api/
```

### معماری Backend

فعلاً:

```text
Modular Monolith
```

Microservice در وضعیت فعلی نیاز پروژه نیست.

جزئیات:

- معماری سیستم: `docs/ARCHITECTURE.md`
- تصمیم‌های معماری و دلایل آن‌ها: `docs/DECISIONS.md`

---

## 5. مدل داده

مدل اصلی:

```text
Hotel ──< HotelAssociation >── NotablePerson
                    │
                    ↓
          AssociationEvidence
                    │
                    ↓
                  Source
```

### Hotel

اطلاعاتی مانند:

- slug
- name
- city
- country
- description
- coordinates
- website
- imageUrl
- publicationStatus

### NotablePerson

اطلاعاتی مانند:

- slug
- displayName
- instagramHandle
- primaryCategory
- occupation
- biography
- country
- imageUrl
- publicationStatus

`instagramHandle` بدون `@` ذخیره می‌شود و نباید از slug حدس زده شود.

### دسته‌بندی فعلی افراد

```text
ACTOR
ATHLETE
INFLUENCER
MUSICIAN
OTHER
```

دسته‌بندی‌های قبلی زیر حذف شده‌اند:

```text
CREATOR
ENTREPRENEUR
POLITICIAN
PUBLIC_FIGURE
```

اطلاعات حرفه‌ای دقیق‌تر در `occupation` قرار می‌گیرد.

### HotelAssociation

رابطه میان هتل و فرد.

اطلاعات مهم:

- `referenceKey`
- `type`
- `summary`
- `verificationStatus`
- `verifiedAt`
- `verificationNotes`

وضعیت‌های verification:

```text
PENDING
VERIFIED
REJECTED
```

### Source و Evidence

`Source` اطلاعات منبع را نگهداری می‌کند.

`AssociationEvidence` یک association را به یک یا چند source متصل می‌کند.

جزئیات کامل مدل داده:

`docs/DATABASE.md`

---

## 6. سیاست انتشار و اعتماد

اصل اصلی:

> وجود یک record در دیتابیس به معنی قابل انتشار بودن آن نیست.

Flow کلی:

```text
Collected Data
      ↓
Structured Data
      ↓
Verification
      ↓
Publication Rules
      ↓
Public Website
```

قواعد فعلی:

- Hotel فقط در صورت `PUBLISHED` بودن در discovery دیده می‌شود.
- NotablePerson فقط در صورت `PUBLISHED` بودن دیده می‌شود.
- Association با وضعیت `PENDING` می‌تواند با برچسب واضح نمایش داده شود.
- Association با وضعیت `VERIFIED` باید evidence معتبر داشته باشد.
- Association با وضعیت `REJECTED` نمایش داده نمی‌شود.
- URL یا evidence جعلی برای پرکردن جای خالی ساخته نمی‌شود.
- اطلاعات نامطمئن باید خالی بماند و حدس زده نشود.
- تا زمانی که نوع دقیق رابطه مشخص نشده، `type=OTHER` قابل استفاده است.

جزئیات کامل:

`docs/DATA_POLICY.md`

---

## 7. وضعیت فعلی داده

آخرین شمارش شناخته‌شده:

- ۱۵ هتل `PUBLISHED`
- ۱۵۷ شخص `PUBLISHED`
- ۱۵۲ association با وضعیت `PENDING`
- ۳ source اولیه Instagram
- ۱۴۹ association بدون evidence
- ۱۶ شخص بدون رابطه مشخص با هتل

دیتای runtime خصوصی:

```text
apps/api/prisma/data/import.json
```

این فایل در Git قرار نمی‌گیرد.

دیتای پژوهشی اولیه:

```text
data/Influencer_Hotel_Tracker.xlsx
data/Influencer_Hotel_Tracker.pdf
```

Workbook ساختاریافته فعلی:

```text
data/Hotel-Yab_Data_Workbook.xlsx
```

Sheetها:

```text
Hotels
People
Associations
Sources
```

راهنما:

```text
docs/data-workbook-guide.md
```

### محدودیت فعلی Pipeline

Workbook هنوز مستقیماً با دیتابیس sync نمی‌شود.

Flow هدف:

```text
Research Spreadsheet
        ↓
Clean Dataset
        ↓
Sync Script
        ↓
PostgreSQL
        ↓
Website
```

ساخت یک sync process امن با validation، duplicate detection و dry-run از مراحل آینده پروژه است.

---

## 8. تصاویر و رسانه

تصاویر محلی frontend:

```text
apps/web/public/images/hotels/
apps/web/public/images/people/
```

`imageUrl` در داده فعلی به URL رسانه اشاره می‌کند.

در development ممکن است URL به localhost اشاره کند، اما در production باید storage یا URL پایدار استفاده شود.

رسانه مرتبط با Association باید به عنوان `Source` و `Evidence` مدل شود.

تصویر پروفایل Hotel یا Person جای evidence رابطه را نمی‌گیرد.

### کارهای محتوایی آینده

- تکمیل عکس هتل‌ها
- تکمیل عکس افراد
- پیدا کردن Instagramهای ناقص
- پیدا کردن ویدئوهای مرتبط
- ثبت لینک Source
- تکمیل Biography
- تکمیل Occupation
- افزایش Evidence associationها

---

## 9. API عمومی

Base path:

```text
/api/v1
```

Endpointهای فعلی:

| Method | Path | توضیح |
| --- | --- | --- |
| GET | `/api/v1/health` | سلامت API و دیتابیس |
| GET | `/api/v1/hotels` | فهرست هتل‌ها |
| GET | `/api/v1/hotels/:slug` | جزئیات هتل |
| GET | `/api/v1/notable-people` | فهرست چهره‌ها |
| GET | `/api/v1/notable-people/:slug` | جزئیات چهره |

Swagger در development:

```text
http://localhost:4000/api/docs
http://localhost:4000/api/docs-json
```

### فیلتر هتل‌ها

```text
page
pageSize
query
city
countryCode
```

### فیلتر چهره‌ها

```text
page
pageSize
query
category
countryCode
```

جزئیات قرارداد API:

`docs/API.md`

---

## 10. Frontend

Routeهای اصلی:

```text
/
```

Landing Page

```text
/hotels
```

فهرست و جست‌وجوی هتل‌ها

```text
/hotels/:slug
```

صفحه جزئیات هتل

```text
/notable-people
```

فهرست و فیلتر چهره‌ها

```text
/notable-people/:slug
```

صفحه جزئیات فرد

### قابلیت‌های فعلی UI

- RTL
- Search
- Filter
- Pagination
- Hotel Card
- Person Card
- Instagram Handle
- Occupation
- Biography
- Association Count
- Verified Association Count
- Media Placeholder
- Empty State
- API Unavailable State
- صفحات Detail
- اعمال خودکار فیلتر دسته‌بندی چهره‌ها بعد از انتخاب category

Pagination فیلترهای فعال را هنگام رفتن به صفحه قبل یا بعد حفظ می‌کند.

---

## 11. اجرای پروژه روی macOS

### پیش‌نیازها

- Node.js
- pnpm
- PostgreSQL

نسخه pnpm شناخته‌شده:

```text
11.18.0
```

### نصب dependency

```bash
pnpm install --frozen-lockfile
```

### Environment بک‌اند

```bash
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
```

مقادیر اصلی:

```env
DATABASE_URL="postgresql://YOUR_MACOS_USERNAME@localhost:5432/hotel_yab"
CORS_ORIGIN="http://localhost:3000"
PORT=4000
SWAGGER_ENABLED=true
```

### Migration

```bash
pnpm api:prisma:migrate:deploy
```

### Import Data

```bash
pnpm api:data:import
```

### اجرای Backend

```bash
pnpm api:dev
```

### اجرای Frontend

در ترمینال جدا:

```bash
pnpm web:dev
```

آدرس‌ها:

```text
Frontend: http://localhost:3000
API:      http://localhost:4000/api/v1
Health:   http://localhost:4000/api/v1/health
```

---

## 12. تست و بررسی

### Backend

```bash
pnpm api:format:check
pnpm api:lint
pnpm api:typecheck
pnpm api:test
pnpm api:test:e2e
pnpm api:build
```

آخرین وضعیت ثبت‌شده:

- Unit tests موفق
- E2E tests موفق
- format موفق
- lint موفق
- typecheck موفق
- build موفق

### Frontend

```bash
pnpm web:lint
pnpm web:typecheck
pnpm web:build
```

آخرین وضعیت ثبت‌شده:

هر سه command موفق بوده‌اند.

---

## 13. فایل‌های مهم پروژه

### Root

```text
PROJECT_CONTEXT.md
README.md
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
.gitignore
```

### Backend

```text
apps/api/src/
apps/api/prisma/schema.prisma
apps/api/prisma/migrations/
apps/api/prisma/import-data.ts
apps/api/prisma/data/import.example.json
```

### Frontend

```text
apps/web/src/app/
apps/web/src/components/
apps/web/src/lib/
apps/web/public/images/
```

### Data

```text
data/Hotel-Yab_Data_Workbook.xlsx
data/Influencer_Hotel_Tracker.xlsx
data/Influencer_Hotel_Tracker.pdf
```

---

## 14. Documentation

مستندات تخصصی پروژه:

### Architecture

```text
docs/ARCHITECTURE.md
```

ساختار سیستم و ارتباط اجزا.

### Decisions

```text
docs/DECISIONS.md
```

دلایل تصمیم‌های فنی و محصولی مهم.

### API

```text
docs/API.md
```

Endpointها، Query Parameterها و قرارداد API.

### Database

```text
docs/DATABASE.md
```

مدل‌ها، رابطه‌ها و ساختار دیتابیس.

### Data Policy

```text
docs/DATA_POLICY.md
```

قواعد جمع‌آوری، verification و publication داده.

### Changelog

```text
docs/CHANGELOG.md
```

تاریخچه تغییرات مهم پروژه.

### TODO

```text
docs/TODO.md
```

کارهای باز و roadmap اجرایی پروژه.

### سایر مستندات Data

```text
docs/source-dataset-notes.md
docs/data-workbook-guide.md
```

`PROJECT_CONTEXT.md` باید خلاصه وضعیت جاری پروژه باقی بماند و جزئیات تخصصی را به این فایل‌ها ارجاع دهد.

---

## 15. Product Roadmap

ترتیب فعلی توسعه:

```text
1. Core Website
      ↓
2. Images & Content Enrichment
      ↓
3. Videos & Sources
      ↓
4. Continue Data Collection
      ↓
5. Clean Dataset / Second Spreadsheet
      ↓
6. Data Sync Pipeline
      ↓
7. User Accounts
      ↓
8. Admin & Scale
```

### Phase 1 — Core Website

تمرکز فعلی:

- تقویت صفحات موجود
- بهبود Detail Pageها
- بهبود Search
- Responsive
- UI polish
- بهبود نمایش associationها
- Loading / Error / Empty states

### Phase 2 — Content

- عکس هتل‌ها
- عکس افراد
- Instagram
- Biography
- Occupation
- ویدئو
- لینک Source

### Phase 3 — Data

- ادامه جمع‌آوری دیتا
- تکمیل Workbook
- Clean Dataset
- Second Spreadsheet
- Sync Script
- Validation
- Duplicate Detection
- Dry Run

### Phase 4 — User System

بعد از پایدار شدن Core Product و Data Pipeline:

- Account
- Login
- Favorites
- Saved Hotels
- Personalization
- User Contribution

### Phase 5 — Scale

- Admin Panel
- Moderation
- Production Hosting
- Media Storage
- Analytics
- Monitoring
- SEO
- CI/CD

جزئیات اجرایی و وضعیت checkboxها در:

```text
docs/TODO.md
```

---

## 16. محدودیت‌های مهم فعلی

### Data

- بیشتر associationها هنوز `PENDING` هستند.
- بیشتر associationها evidence ندارند.
- داده اولیه هنوز نیاز به enrichment دارد.
- follower count ممکن است قدیمی شود و evidence محسوب نمی‌شود.
- بسیاری از associationها تا بررسی source همچنان `OTHER` هستند.
- دیتابیس فعلی local است.

### Media

- media upload UI وجود ندارد.
- storage production هنوز انتخاب نشده است.
- برخی تصاویر هنوز missing یا placeholder هستند.

### Product

- User Account وجود ندارد.
- Admin Panel وجود ندارد.
- Moderation UI وجود ندارد.
- Data Sync اتوماتیک هنوز ساخته نشده است.
- Production infrastructure هنوز نهایی نشده است.

---

## 17. Definition of Done برای MVP

MVP اولیه زمانی قابل قبول است که:

- کاربر بتواند هتل و شخص را جست‌وجو کند؛
- لیست‌ها pagination داشته باشند؛
- Detail Pageها اطلاعات قابل استفاده داشته باشند؛
- عکس و اطلاعات پایه برای بخش اصلی داده‌ها تکمیل شده باشد؛
- `PENDING` و `VERIFIED` کاملاً قابل تشخیص باشند؛
- هر رابطه `VERIFIED` حداقل یک evidence معتبر داشته باشد؛
- pipeline داده بدون ویرایش دستی JSON قابل استفاده باشد؛
- داده‌ها duplicate یا ناسازگار وارد نشوند؛
- مدیریت داده برای ادمین قابل انجام باشد؛
- برنامه روی production infrastructure پایدار اجرا شود؛
- media storage پایدار وجود داشته باشد؛
- مسیرهای اصلی با test و CI پوشش داده شوند.

---

## 18. Git و ایمنی

قبل از تغییر:

```bash
git status --short --branch
```

قواعد:

- branch معمولاً `main` است.
- بدون درخواست کاربر push انجام نشود.
- از `git add .` استفاده نشود.
- فایل‌ها به‌صورت دقیق stage شوند.
- `data/` خصوصی است.
- envها private هستند.
- `apps/api/prisma/data/import.json` private است.
- assetهای عمومی داخل `apps/web/public` باید در Git قرار بگیرند.
- داده یا تغییر موجود کاربر بدون هماهنگی حذف نشود.

---

## 19. قواعد به‌روزرسانی مستندات

بعد از هر تغییر مهم پروژه بررسی شود که کدام مستند باید تغییر کند.

### `PROJECT_CONTEXT.md`

وقتی تغییر مهمی در یکی از این موارد رخ داد:

- وضعیت کلی محصول
- معماری اصلی
- تکنولوژی‌ها
- وضعیت داده
- roadmap
- workflow
- نحوه اجرای پروژه

### `docs/ARCHITECTURE.md`

وقتی ساختار سیستم یا مسئولیت لایه‌ها تغییر کرد.

### `docs/DECISIONS.md`

وقتی تصمیم فنی یا محصولی مهم جدید گرفته شد.

### `docs/API.md`

وقتی:

- endpoint اضافه/حذف شد؛
- query parameter تغییر کرد؛
- response contract تغییر کرد.

### `docs/DATABASE.md`

وقتی:

- Prisma model تغییر کرد؛
- field اضافه/حذف شد؛
- enum تغییر کرد؛
- relation تغییر کرد.

### `docs/DATA_POLICY.md`

وقتی قواعد:

- source
- verification
- publication
- data collection

تغییر کردند.

### `docs/CHANGELOG.md`

بعد از هر تغییر مهم و تکمیل‌شده پروژه.

### `docs/TODO.md`

وقتی:

- task جدید اضافه شد؛
- task انجام شد؛
- اولویت‌ها تغییر کردند.

---

## 20. Handoff به گفت‌وگوی بعدی

برای ادامه پروژه در چت جدید، حداقل این فایل ارائه شود:

```text
PROJECT_CONTEXT.md
```

و در صورت نیاز فایل تخصصی مرتبط نیز ارسال شود.

مثلاً برای کار روی دیتابیس:

```text
PROJECT_CONTEXT.md
docs/DATABASE.md
```

برای API:

```text
PROJECT_CONTEXT.md
docs/API.md
```

برای معماری:

```text
PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/DECISIONS.md
```

همچنین بهتر است وضعیت Git ارسال شود:

```bash
git status --short --branch
```