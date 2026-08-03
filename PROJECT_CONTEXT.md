# Hotel-Yab — Project Context and Handoff

> این فایل مرجع اصلی تحویل پروژه بین چت‌ها و توسعه‌دهنده‌هاست. در شروع هر
> گفت‌وگوی جدید، کل این فایل را در اختیار دستیار قرار بده. بعد از هر تغییر
> مهم در معماری، داده، workflow، API یا UI باید این فایل به‌روزرسانی شود.

آخرین به‌روزرسانی محتوایی: ۲۰۲۶-۰۸-۰۳

## 1. شیوهٔ همکاری با صاحب پروژه

- زبان توضیحات ترجیحاً فارسی است؛ نام کدها و اصطلاحات فنی انگلیسی باقی بمانند.
- سیستم‌عامل macOS است و همهٔ فرمان‌ها باید برای macOS نوشته شوند.
- ترتیب هر کار باید این باشد:
  1. Learning: مفهوم و دلیل را توضیح بده.
  2. Design: طراحی، trade-off و انتخاب پروژه را توضیح بده.
  3. Implementation: تغییر را پیاده‌سازی کن.
  4. Testing: روش تست و نتیجه را گزارش کن.
  5. Documentation: اگر ساختار یا workflow تغییر کرد، مستندات را به‌روز کن.
- قبل از افزودن library، framework یا مفهوم جدید توضیح بده:
  - چیست؛
  - چرا لازم است؛
  - چگونه کار می‌کند؛
  - جایگزین‌ها چیست؛
  - چرا Hotel-Yab آن را انتخاب می‌کند.
- تغییر معماری بزرگ بدون هماهنگی انجام نشود.
- کد خوانا و ساده بر abstraction یا optimization زودهنگام اولویت دارد.
- از معماری microservice، GraphQL، Redis و Docker تا زمانی که نیاز واقعی
  نداریم استفاده نشود.
- هر commit فقط یک تغییر منطقی داشته باشد.
- بدون درخواست صریح کاربر push انجام نشود.
- داده‌ها یا تغییرات موجود کاربر حذف یا overwrite نشوند.

## 2. هدف محصول

Hotel-Yab پلتفرمی برای کشف هتل‌ها از مسیر افراد شناخته‌شده است؛ مانند
بازیگران، ورزشکاران، خوانندگان، اینفلوئنسرها و سایر چهره‌های عمومی.

ارزش اصلی محصول یک graph قابل پیگیری میان هتل، شخص و مدرک است، نه رزرو اتاق.
نمونهٔ ادعاها:

- یک ورزشکار در هتل مشخصی اقامت داشته است؛
- یک بازیگر در رویدادی در یک هتل حضور داشته است؛
- یک اینفلوئنسر با هتل همکاری کرده است.

هر رابطه وضعیت بررسی دارد. رابطه‌های اولیه می‌توانند با برچسب واضح
`PENDING` برای preview نمایش داده شوند، اما فقط رابطه‌ای که منبع بازبینی‌شده
و تاریخ بررسی دارد می‌تواند `VERIFIED` و دارای نشان سبز باشد.

## 3. وضعیت محصول در یک نگاه

پروژه تمام نشده است، اما یک prototype عمومی و قابل‌نمایش داریم.

موارد موجود:

- monorepo با pnpm workspaces؛
- REST API نسخه‌بندی‌شده با NestJS؛
- PostgreSQL و Prisma؛
- مدل هتل، شخص، رابطه، مدرک و منبع؛
- import تراکنشی و idempotent برای دیتای curated؛
- API سلامت، هتل‌ها و چهره‌ها؛
- جست‌وجوی هتل با کلمات مستقل از ترتیب؛
- رابط Next.js فارسی و RTL؛
- صفحهٔ اصلی، فهرست و جزئیات هتل‌ها و چهره‌ها؛
- نمایش جداگانهٔ رابطه‌های pending و verified؛
- placeholder برای عکس، ویدئو یا لینک هنوز تکمیل‌نشده؛
- فونت B Nazanin و تم بنفش/سفید؛
- دادهٔ اولیه و تست‌های واحد/E2E.

تعریف فعلی: «prototype قابل ارائه»، نه «MVP production-ready» و نه محصول کامل.

## 3.1. تاریخچهٔ milestoneهای انجام‌شده

1. repository اولیه با `apps/`, `packages/`, pnpm workspace و README آماده شد.
2. NestJS backend داخل `apps/api` ایجاد و با root scriptها یکپارچه شد.
3. environment validation، CORS، URI versioning و global DTO validation اضافه شد.
4. PostgreSQL و Prisma 7 متصل شدند و migrationهای graph اصلی ساخته شدند.
5. health endpoint و Swagger/OpenAPI اضافه و تست شدند.
6. مدل رابطهٔ قابل‌ردیابی Hotel–Person–Evidence–Source پیاده شد.
7. importer خصوصی، تراکنشی و idempotent با reference validation ساخته شد.
8. endpointهای public هتل و شخص، pagination، فیلتر و جزئیات منبع ساخته شدند.
9. تست‌های واحد و E2E برای سلامت، import، CORS، query validation و سیاست انتشار
   اضافه شدند.
10. Excel و PDF پژوهشی اولیه بررسی و قواعد conversion مستند شدند.
11. Next.js frontend داخل `apps/web` ایجاد و به REST API متصل شد.
12. رابط فارسی RTL با تم بنفش/سفید، landing، list و detail pageها ساخته شد.
13. B Nazanin به‌صورت فایل font داخلی اضافه شد.
14. جست‌وجوی هتل از exact phrase به token-based contains ارتقا پیدا کرد.
15. نمایش همهٔ هتل‌های PUBLISHED حتی بدون verified relationship فعال شد.
16. ۱۵ هتل، ۱۵۷ شخص، ۱۵۲ رابطهٔ اولیه و ۳ source وارد دیتابیس محلی شدند.
17. pending preview با badge جدا و placeholder رسانه پیاده شد.
18. workbook چهار-sheet استاندارد از دادهٔ فعلی ساخته و راهنمای آن نوشته شد.
19. این فایل handoff جامع برای ادامهٔ کار میان چت‌ها ساخته شد.
20. نمایش عکس واقعی هتل‌ها و چهره‌ها از حالت برش‌خوردهٔ `cover` به فیت دقیق در
    کادر تغییر کرد؛ در نتیجه کل عکس دیده می‌شود، هرچند ممکن است نسبت تصویر کمی
    کشیده یا فشرده شود.
21. شناسه‌های لاتین چهره‌ها با فونت لاتین و جهت مستقل `ltr` نمایش داده می‌شوند
    تا رقم‌های لاتین در فونت B Nazanin به‌شکل رقم فارسی دیده نشوند.
22. قاب رسانهٔ چهره‌ها در کارت‌ها، صفحهٔ جزئیات و فهرست ارتباط‌ها دایره‌ای شد؛
    قاب رسانهٔ هتل‌ها همچنان مستطیلی باقی ماند.
23. تعداد دنبال‌کننده داخل توضیح چهره با فونت لاتین نمایش داده می‌شود تا مقادیری
    مانند `361K` بر اثر گلیف‌های B Nazanin به‌شکل `۳۶۱K` دیده نشوند.
24. صفحهٔ فهرست چهره‌ها کنترل صفحه‌بندی دارد و با دکمه‌های «صفحه بعد» و
    «صفحه قبل» امکان حرکت میان تمام نتایج را با حفظ فیلترها فراهم می‌کند.
25. اندازهٔ تیتر اصلی landing برای خوانایی بهتر کاهش یافت: در دسکتاپ
    `clamp(2.3rem, 4.5vw, 4rem)`، زیر ۷۶۰ پیکسل `2.2rem` و زیر ۴۸۰ پیکسل
    `1.9rem` استفاده می‌شود.
26. `instagramHandle` به‌صورت اختیاری و مستقل از slug و نام واقعی به مدل چهره
    اضافه شد؛ کارت‌ها و صفحه‌های جزئیات آن را به‌شکل `@handle` کنار اطلاعات
    غیرتکراری حرفه/دنبال‌کننده نمایش می‌دهند و جست‌وجوی چهره آیدی را هم پوشش
    می‌دهد.

## 4. تکنولوژی و معماری

### Repository

- Monorepo: pnpm workspaces
- معماری backend: Modular Monolith
- زبان اصلی: TypeScript

### Backend

- NestJS 11
- REST API
- مسیر پایه: `/api/v1`
- Swagger/OpenAPI در development
- Prisma 7 با PostgreSQL adapter
- PostgreSQL
- Joi برای validation فایل import و environment
- class-validator برای query DTOهای API
- Jest و Supertest برای تست

### Frontend

- Next.js 16 با App Router
- React 19
- TypeScript
- React Server Components
- CSS معمولی، بدون UI framework
- رابط فارسی، `dir="rtl"`
- فونت bundled B Nazanin

### تصمیم‌های مهم

- فعلاً microservice نداریم؛ دامنه هنوز نیاز به جداسازی deployment ندارد.
- GraphQL نداریم؛ REST ساده و کافی است.
- Redis نداریم؛ caching و queue هنوز مسئلهٔ واقعی نیست.
- Docker نداریم؛ محیط محلی macOS فعلاً مستقیم و ساده‌تر است.
- write API عمومی نداریم؛ دادهٔ پژوهشی از import محلی وارد می‌شود.
- فایل‌های دادهٔ خام و `import.json` خصوصی‌اند و در Git قرار نمی‌گیرند.

## 5. مدل داده

مدل اصلی:

```text
Hotel ──< HotelAssociation >── NotablePerson
                    │
                    v
          AssociationEvidence
                    │
                    v
                  Source
```

### Hotel

اطلاعات پایهٔ هتل شامل slug، نام، شهر، کشور، توضیح، مختصات، وب‌سایت، تصویر
و وضعیت انتشار.

### NotablePerson

پروفایل شخص شامل slug، نام نمایشی، آیدی اختیاری اینستاگرام، دسته‌بندی، حرفه،
بیوگرافی، کشور، تصویر و وضعیت انتشار. `instagramHandle` بدون علامت `@` ذخیره
می‌شود و نباید از روی slug حدس زده شود.

### HotelAssociation

رابطهٔ میان هتل و شخص. شامل:

- `referenceKey`: شناسهٔ پایدار و یکتا؛
- `type`: نوع رابطه؛
- `summary`: توضیح ادعا؛
- `verificationStatus`: `PENDING`, `VERIFIED`, `REJECTED`؛
- `verifiedAt`: زمان بررسی نهایی؛
- `verificationNotes`: یادداشت داخلی که در API عمومی نمایش داده نمی‌شود.

### Source و AssociationEvidence

`Source` اطلاعات URL و نوع منبع را نگه می‌دارد. `AssociationEvidence` یک
رابطه را به یک یا چند منبع متصل می‌کند و مشخص می‌کند کدام منبع اصلی است.

انواع منبع شامل خبر، وب‌سایت رسمی، پست شبکه اجتماعی، مصاحبه، ویدئو، عکس و
سایر است.

## 6. سیاست انتشار و اعتماد

- Hotel و NotablePerson فقط با `publicationStatus=PUBLISHED` در discovery
  عمومی دیده می‌شوند.
- رابطهٔ `PENDING` می‌تواند برای preview نمایش داده شود، اما UI آن را واضح
  «در حال تکمیل» می‌نامد.
- رابطهٔ `VERIFIED` فقط وقتی نمایش داده می‌شود که حداقل یک evidence داشته
  باشد.
- رابطهٔ `REJECTED` نمایش داده نمی‌شود.
- رابطه‌ای که اشتباهاً VERIFIED شده ولی evidence ندارد نمایش داده نمی‌شود.
- URL یا مدرک جعلی برای پرکردن جای خالی ساخته نمی‌شود.
- تا زمانی که مدرک نوع دقیق رابطه را ثابت نکرده، `type=OTHER` باقی می‌ماند.

## 7. وضعیت فعلی داده

فایل خصوصی runtime:

```text
apps/api/prisma/data/import.json
```

این فایل در `.gitignore` است.

آخرین شمارش شناخته‌شده:

- ۱۵ هتل PUBLISHED؛
- ۱۵۷ شخص PUBLISHED؛
- ۱۵۲ رابطه PENDING؛
- ۳ منبع Instagram؛
- ۱۴۹ رابطه بدون evidence؛
- ۱۶ شخص که فعلاً رابطهٔ هتل مشخصی ندارند.

منابع اولیه از این فایل‌های خصوصی استخراج شدند:

```text
data/Influencer_Hotel_Tracker.xlsx
data/Influencer_Hotel_Tracker.pdf
```

Excel ساختاریافتهٔ جدید:

```text
data/Hotel-Yab_Data_Workbook.xlsx
```

این workbook چهار sheet دارد:

- `Hotels`
- `People`
- `Associations`
- `Sources`

رابطه‌ها دیگر نباید با رنگ سلول تعریف شوند؛ هر رابطه یک ردیف مستقل دارد.
راهنمای کامل در `docs/data-workbook-guide.md` است.

محدودیت فعلی: workbook هنوز مستقیماً به JSON/PostgreSQL sync نمی‌شود.
ساخت فرمان `pnpm data:sync` مهم‌ترین قدم بعدی pipeline داده است.

## 8. تصاویر و رسانه‌ها

### تصاویر bundled داخل پروژه

تصاویر محلی frontend باید زیر `apps/web/public` قرار بگیرند:

```text
apps/web/public/images/hotels/
apps/web/public/images/people/
```

در وضعیت فعلی importer، `imageUrl` باید URL کامل `http` یا `https` باشد. برای
فایل محلی در development می‌توان از آدرس localhost استفاده کرد:

```json
"imageUrl": "http://localhost:3000/images/hotels/example.png"
```

در production باید localhost با دامنه یا storage پایدار جایگزین شود. استفاده
از `https://example.com/...` فقط نمونه است و فایل محلی را نمایش نمی‌دهد.

تصویر نمونهٔ فعلی:

```text
apps/web/public/images/hotels/parsian-esteghlal1.png
```

برای رسانهٔ رابطه، عکس/ویدئو/پست به‌عنوان `Source` و evidence ثبت می‌شود؛
`imageUrl` شخص یا هتل جای evidence رابطه را نمی‌گیرد.

## 9. API عمومی

| Method | Path | توضیح |
| --- | --- | --- |
| GET | `/api/v1/health` | سلامت API و اتصال دیتابیس |
| GET | `/api/v1/hotels` | فهرست هتل‌های عمومی |
| GET | `/api/v1/hotels/:slug` | جزئیات هتل و رابطه‌ها |
| GET | `/api/v1/notable-people` | فهرست چهره‌های عمومی |
| GET | `/api/v1/notable-people/:slug` | جزئیات شخص و هتل‌ها |

Swagger در development:

```text
http://localhost:4000/api/docs
http://localhost:4000/api/docs-json
```

### فیلترهای هتل

- `page`
- `pageSize`، حداکثر ۱۰۰
- `query`
- `city`
- `countryCode`

جست‌وجوی هتل:

- متن را به tokenهای جدا تقسیم می‌کند؛
- ترتیب کلمات مهم نیست؛
- هر token می‌تواند بخشی از نام یا شهر باشد؛
- `ی/ي/ى` و `ک/ك` نرمال می‌شوند؛
- نیم‌فاصله به فاصله تبدیل می‌شود؛
- query با Prisma پارامتری اجرا می‌شود و raw regex ندارد.

مثال: `استقلال پارسیان`، هتل «هتل پارسیان استقلال» را پیدا می‌کند.

### فیلترهای چهره

- `page`
- `pageSize`
- `query`
- `category`
- `countryCode`

### countها

- `associationCount`: تعداد رابطه‌های قابل نمایش شامل pending و verified؛
- `verifiedAssociationCount`: تعداد رابطه‌های واقعاً verified و evidence-backed.

## 10. مسیرهای frontend

| Path | توضیح |
| --- | --- |
| `/` | landing page و discovery اولیه |
| `/hotels` | فهرست، جست‌وجو و فیلتر هتل‌ها |
| `/hotels/:slug` | جزئیات هتل، افراد و منابع |
| `/notable-people` | فهرست و فیلتر چهره‌ها |
| `/notable-people/:slug` | پروفایل شخص، هتل‌ها و منابع |

Frontend داده را در Server Componentها از API می‌گیرد و از `cache: no-store`
استفاده می‌کند تا دادهٔ محلی تازه نمایش داده شود.

## 11. اجرای پروژه روی macOS

### پیش‌نیاز

- Node.js
- pnpm 11.18.0 از طریق Corepack یا نصب سازگار
- PostgreSQL محلی

یادداشت محیط محلی: `pnpm --version` قبلاً `11.18.0` بوده و کار می‌کند. پوشهٔ
cache مربوط به Corepack در گذشته با مالکیت root دیده شده بود؛ اگر بعداً خطای
permission در دانلود package manager رخ داد، مالکیت همان cache باید بررسی شود،
نه اینکه commandهای پروژه با `sudo` اجرا شوند.

### نصب dependencyها

```bash
pnpm install --frozen-lockfile
```

### environment بک‌اند

```bash
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
```

مقادیر مهم:

```env
DATABASE_URL="postgresql://YOUR_MACOS_USERNAME@localhost:5432/hotel_yab"
CORS_ORIGIN="http://localhost:3000"
PORT=4000
SWAGGER_ENABLED=true
```

### migration و import

```bash
pnpm api:prisma:migrate:deploy
pnpm api:data:import
```

Importer کل فایل را قبل از write اعتبارسنجی می‌کند، داخل یک transaction اجرا
می‌شود و با slug/referenceKey/URL به‌صورت idempotent upsert می‌کند.

### اجرای development

ترمینال اول:

```bash
pnpm api:dev
```

ترمینال دوم:

```bash
pnpm web:dev
```

آدرس‌ها:

```text
Frontend: http://localhost:3000
API:      http://localhost:4000/api/v1
Health:   http://localhost:4000/api/v1/health
```

## 12. فرمان‌های تست و بررسی

### Backend

```bash
pnpm api:format:check
pnpm api:lint
pnpm api:typecheck
pnpm api:test
pnpm api:test:e2e
pnpm api:build
```

آخرین نتیجهٔ ثبت‌شده پیش از این handoff:

- ۲ test suite واحد موفق؛
- ۶ تست واحد؛
- ۱۳ تست E2E موفق؛
- format، lint، typecheck و build موفق.

### Frontend

```bash
pnpm web:lint
pnpm web:typecheck
pnpm web:build
```

آخرین نتیجهٔ ثبت‌شده: هر سه موفق.

## 13. نقشهٔ فایل‌ها

فایل‌های generated، dependencyها و build outputها در این نقشه نیامده‌اند.

### Root

- `package.json`: scriptهای مشترک monorepo برای API، web، Prisma و تست‌ها.
- `pnpm-workspace.yaml`: workspaceهای `apps/*` و `packages/*` و اجازهٔ build
  dependencyهای native.
- `pnpm-lock.yaml`: نسخه‌های دقیق dependencyها برای نصب قابل تکرار.
- `.gitignore`: env، build، dependency، data و فایل import خصوصی را حذف می‌کند.
- `README.md`: راهنمای setup و معرفی سطح بالا.
- `PROJECT_CONTEXT.md`: همین سند جامع handoff و وضعیت پروژه.

### Backend config

- `apps/api/package.json`: dependencyها و commandهای NestJS/Prisma/Jest.
- `apps/api/nest-cli.json`: تنظیم build و source root برای Nest CLI.
- `apps/api/tsconfig.json`: تنظیم TypeScript بک‌اند.
- `apps/api/tsconfig.build.json`: فایل‌های لازم برای build production.
- `apps/api/eslint.config.mjs`: قوانین lint TypeScript/NestJS.
- `apps/api/.prettierrc`: style formatter بک‌اند.
- `apps/api/.env.example`: نمونهٔ environment development.
- `apps/api/.env.test.example`: نمونهٔ environment دیتابیس تست.
- `apps/api/prisma.config.ts`: مسیر schema/migration و DATABASE_URL برای Prisma 7.

### Prisma و import

- `apps/api/prisma/schema.prisma`: enumها و مدل‌های Hotel، NotablePerson،
  HotelAssociation، Source و AssociationEvidence.
- `apps/api/prisma/migrations/20260802145722_init_core_graph/migration.sql`:
  migration اولیهٔ graph.
- `apps/api/prisma/migrations/20260802182848_add_association_reference_key/migration.sql`:
  افزودن referenceKey یکتا برای import idempotent.
- `apps/api/prisma/migrations/migration_lock.toml`: provider قفل‌شدهٔ migration.
- `apps/api/prisma/import-data.ts`: CLI خواندن JSON، validation و اجرای importer.
- `apps/api/prisma/data/import.example.json`: نمونهٔ format فایل import.
- `apps/api/prisma/data/import.json`: دیتای خصوصی runtime؛ در Git نیست.

### Backend bootstrap و shared infrastructure

- `apps/api/src/main.ts`: ساخت Nest app، اعمال config، Swagger و listen.
- `apps/api/src/app.module.ts`: composition root و ثبت moduleها.
- `apps/api/src/app.config.ts`: prefix، URI versioning، validation pipe و CORS.
- `apps/api/src/config/environment.ts`: type و Joi schema برای env.
- `apps/api/src/docs/swagger.ts`: ساخت Swagger و JSON OpenAPI.
- `apps/api/src/database/prisma.module.ts`: PrismaService به‌صورت global module.
- `apps/api/src/database/prisma.service.ts`: اتصال Prisma به PostgreSQL با
  `PrismaPg` و lifecycle connect/disconnect.

### Backend common و health

- `apps/api/src/common/dto/pagination-query.dto.ts`: validation page/pageSize.
- `apps/api/src/common/dto/slug-param.dto.ts`: validation slug مسیر.
- `apps/api/src/common/pagination.ts`: ساخت metadata استاندارد pagination.
- `apps/api/src/health/health.module.ts`: module سلامت.
- `apps/api/src/health/health.controller.ts`: `SELECT 1` برای readiness دیتابیس.
- `apps/api/src/health/health.controller.spec.ts`: تست واحد health.

### Backend hotel discovery

- `apps/api/src/hotels/hotels.module.ts`: module دامنهٔ هتل.
- `apps/api/src/hotels/hotels.controller.ts`: endpointهای list/detail هتل.
- `apps/api/src/hotels/hotels.service.ts`: query Prisma، جست‌وجوی token-based،
  سیاست visible/verified و mapping response.
- `apps/api/src/hotels/dto/hotel-query.dto.ts`: validation فیلترهای هتل.

### Backend notable-person discovery

- `apps/api/src/notable-people/notable-people.module.ts`: module چهره‌ها.
- `apps/api/src/notable-people/notable-people.controller.ts`: endpointهای
  list/detail شخص.
- `apps/api/src/notable-people/notable-people.service.ts`: query شخص، رابطه‌های
  pending/verified و منبع‌ها.
- `apps/api/src/notable-people/dto/notable-person-query.dto.ts`: validation
  فیلترهای شخص.

### Backend data import

- `apps/api/src/data-import/dataset.ts`: type و Joi validation دیتاست، reference
  integrity، evidence و image URL.
- `apps/api/src/data-import/import-dataset.ts`: upsert تراکنشی هتل، شخص، منبع،
  رابطه و evidence.
- `apps/api/src/data-import/dataset.spec.ts`: تست قواعد dataset.

### Backend tests

- `apps/api/test/app.e2e-spec.ts`: تست E2E سلامت، Swagger، CORS، import، search،
  privacy یادداشت‌ها، pending/verified و 404/400.
- `apps/api/test/jest-e2e.json`: تنظیم Jest برای تست E2E.

### Frontend config و public assets

- `apps/web/package.json`: Next/React و commandهای build/lint/typecheck.
- `apps/web/tsconfig.json`: TypeScript و alias `@/*`.
- `apps/web/eslint.config.mjs`: lint مخصوص Next.js.
- `apps/web/next.config.ts`: محل config آیندهٔ Next.js؛ فعلاً minimal.
- `apps/web/.env.example`: `API_BASE_URL` برای server-side fetch.
- `apps/web/public/fonts/B-NAZANIN.TTF`: فونت فارسی bundled.
- `apps/web/public/images/hotels/`: تصاویر محلی هتل‌ها.
- `apps/web/public/images/people/`: محل پیشنهادی تصاویر چهره‌ها.

### Frontend App Router

- `apps/web/src/app/layout.tsx`: metadata، RTL، header/footer و CSS global.
- `apps/web/src/app/globals.css`: design tokens، layout، responsive rules،
  B Nazanin، cardها، badgeها و placeholder رسانه.
- `apps/web/src/app/page.tsx`: landing page، hero، search و preview داده.
- `apps/web/src/app/hotels/page.tsx`: list/filter هتل‌ها.
- `apps/web/src/app/hotels/[slug]/page.tsx`: جزئیات هتل و کارت رابطه‌ها.
- `apps/web/src/app/notable-people/page.tsx`: list/filter چهره‌ها.
- `apps/web/src/app/notable-people/[slug]/page.tsx`: پروفایل شخص و هتل‌ها.
- `apps/web/src/app/not-found.tsx`: صفحهٔ 404 فارسی.
- `apps/web/src/app/favicon.ico`: favicon.

### Frontend components

- `apps/web/src/components/brand-mark.tsx`: نشان متنی/گرافیکی برند.
- `apps/web/src/components/site-header.tsx`: header و navigation.
- `apps/web/src/components/site-footer.tsx`: footer و لینک‌های محصول.
- `apps/web/src/components/section-heading.tsx`: عنوان مشترک sectionها.
- `apps/web/src/components/hotel-card.tsx`: کارت هتل و وضعیت رابطه‌ها.
- `apps/web/src/components/person-card.tsx`: کارت شخص و count هتل‌ها.
- `apps/web/src/components/media-tile.tsx`: نمایش background image یا fallback
  بنفش/حرف اول.
- `apps/web/src/components/source-list.tsx`: لینک sourceهای واقعی یا placeholder
  عکس/ویدئو/لینک.
- `apps/web/src/components/empty-state.tsx`: حالت خالی و API unavailable.

### Frontend data layer

- `apps/web/src/lib/api.ts`: fetch تایپ‌شدهٔ server-side به NestJS و ساخت query.
- `apps/web/src/lib/types.ts`: قرارداد responseهای API در frontend.
- `apps/web/src/lib/labels.ts`: ترجمهٔ enumها و format تاریخ فارسی.

### Documentation و data

- `docs/source-dataset-notes.md`: ساختار Excel/PDF اولیه، قواعد conversion و
  محدودیت داده.
- `docs/data-workbook-guide.md`: راهنمای workbook چهار-sheet جدید.
- `data/Hotel-Yab_Data_Workbook.xlsx`: فایل کاری ساختاریافته و خصوصی.
- `data/Influencer_Hotel_Tracker.xlsx`: فایل پژوهشی اولیه و رنگ‌محور.
- `data/Influencer_Hotel_Tracker.pdf`: نسخهٔ دیداری فایل اولیه.

## 14. موارد ناتمام و مشکلات شناخته‌شده

### P0 — قدم بعدی پیشنهادی

- ساخت converter پایدار `Hotel-Yab_Data_Workbook.xlsx` به import JSON.
- افزودن command مانند `pnpm data:sync` با dry-run و گزارش خطا.
- تست referenceها، duplicateها و VERIFIED بدون evidence قبل از write.

### P1 — لازم برای MVP قابل مدیریت

- پنل admin برای CRUD هتل، شخص، رابطه و source؛
- login و authorization ادمین؛
- workflow بررسی و تغییر PENDING به VERIFIED/REJECTED؛
- upload و storage پایدار عکس/ویدئو؛
- تکمیل نام واقعی، دسته‌بندی، عکس و biography افراد؛
- تکمیل evidence بیشتر رابطه‌ها؛
- pagination controls در frontend؛
- امکان گزارش اطلاعات اشتباه؛
- تست component/UI فرانت‌اند.

### P2 — production readiness

- انتخاب hosting برای Next.js، NestJS و PostgreSQL؛
- object storage/CDN برای media؛
- domain و HTTPS؛
- secret management؛
- backup و restore دیتابیس؛
- logging، error tracking و monitoring؛
- rate limiting و security review؛
- CI برای lint/typecheck/test/build؛
- SEO، OpenGraph، sitemap و metadata کامل؛
- accessibility و performance audit.

### P3 — قابلیت‌های محصول آینده

- حساب کاربر؛
- favorites؛
- review؛
- moderation؛
- mobile app با React Native و Expo؛
- recommendation و discovery پیشرفته.

### محدودیت‌های دادهٔ فعلی

- همهٔ ۱۵۲ رابطه هنوز PENDING هستند.
- بیشتر رابطه‌ها evidence ندارند.
- بسیاری از displayNameها در واقع Instagram handle هستند.
- بیشتر categoryها موقتاً `PUBLIC_FIGURE` هستند.
- follower countها ممکن است قدیمی شوند و evidence محسوب نمی‌شوند.
- نوع بیشتر رابطه‌ها `OTHER` است تا زمانی که منبع دقیق بررسی شود.
- دیتابیس فعلی local است و با Git به سیستم دیگری منتقل نمی‌شود.

### محدودیت‌های UI فعلی

- فهرست چهره‌ها در هر صفحه ۲۴ مورد نشان می‌دهد و کنترل رفتن به صفحهٔ قبل و بعد دارد.
- media upload UI وجود ندارد.
- عکس‌های واقعی با CSS background و اندازهٔ `100% 100%` دقیقاً داخل کادر فیت
  می‌شوند؛ این انتخاب از برش جلوگیری می‌کند، اما ممکن است نسبت تصویر را تغییر دهد.
- placeholderهای بنفش بدون عکس همچنان با `cover` نمایش داده می‌شوند.
- fallback بنفش هنگام نبودن یا خراب بودن URL عمداً نمایش داده می‌شود.

## 15. Definition of Done برای MVP اولیه

MVP زمانی قابل قبول است که:

- کاربر بتواند هتل و شخص را جست‌وجو و صفحه‌بندی کند؛
- هر صفحه تصویر و اطلاعات پایهٔ مناسب داشته باشد؛
- pending و verified کاملاً از هم قابل تشخیص باشند؛
- هر verified relationship حداقل یک منبع قابل بازبینی داشته باشد؛
- ادمین بتواند بدون ویرایش مستقیم JSON داده را مدیریت و تأیید کند؛
- کاربر بتواند اطلاعات اشتباه را گزارش کند؛
- برنامه روی production با دیتابیس، backup و media storage پایدار اجرا شود؛
- تست‌ها و CI مسیر اصلی را پوشش دهند.

## 16. Git و ایمنی تغییرات

- branch فعلی معمولاً `main` است؛ قبل از کار `git status --short --branch`
  اجرا شود.
- ممکن است branch محلی از `origin/main` جلوتر باشد؛ بدون درخواست کاربر push
  نکن.
- `data/`, envها و `apps/api/prisma/data/import.json` عمداً ignored هستند.
- assetهای عمومی زیر `apps/web/public` باید در Git قرار بگیرند.
- از `git add .` استفاده نشود؛ فایل‌ها به‌صورت دقیق stage شوند تا دادهٔ خصوصی
  یا تغییر کاربر وارد commit نشود.

## 17. Checklist به‌روزرسانی این سند

پس از هر کار مهم، این موارد بررسی و اصلاح شوند:

- وضعیت محصول در بخش ۳؛
- شمارش و وضعیت داده در بخش ۷؛
- endpointها و رفتار API در بخش ۹؛
- commandها و نتیجهٔ تست در بخش ۱۲؛
- نقشهٔ فایل‌ها در بخش ۱۳؛
- roadmap و محدودیت‌ها در بخش ۱۴؛
- اگر تصمیم معماری جدیدی گرفته شد، دلیل و alternatives در بخش ۴؛
- تاریخ بالای فایل.

در تحویل به چت بعدی، علاوه بر این فایل بهتر است خروجی این فرمان نیز ارسال شود:

```bash
git status --short --branch
```
