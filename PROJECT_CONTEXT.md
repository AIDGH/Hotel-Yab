# Hotel-Yab — Project Context

> این فایل مرجع اصلی وضعیت فعلی پروژه و handoff بین چت‌ها و توسعه‌دهنده‌هاست.
> جزئیات تخصصی در فایل‌های `docs/` نگهداری می‌شوند و این فایل باید خلاصه، به‌روز و قابل اتکا باقی بماند.

آخرین به‌روزرسانی محتوایی: ۲۰۲۶-۰۹-۰۵

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

پروژه در وضعیت **production prototype قابل استفاده** قرار دارد.

نسخه فعلی روی VPS واقعی بالا آمده و از طریق IP عمومی در دسترس است. هسته
discovery، PostgreSQL، API، Next.js، رسانه‌های provisionشده و backup روزانه
روی سرور فعال‌اند. دامنه/HTTPS، SMS واقعی، monitoring و چند باگ production
از جمله پایداری session بعد از refresh هنوز باید تکمیل شوند؛ بنابراین محصول
هنوز برای انتشار عمومی گسترده نهایی نشده است.

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
- Search، Filter و Sort
- Pagination برای هتل‌ها و چهره‌ها
- مدل Hotel
- مدل NotablePerson
- مدل Association
- مدل Source و Evidence
- نمایش associationهای `PENDING` و `VERIFIED`
- importer تراکنشی و idempotent
- داده اولیه هتل‌ها و افراد
- تصاویر محلی هتل و شخص
- لوگوی اختیاری هتل در کارت و صفحه جزئیات
- نمایش درجه رسمی هتل جدا از امتیاز کاربران در کارت و صفحه جزئیات
- Instagram Handle و Follower Count چهره‌ها
- به‌روزرسانی گروهی followerهای Instagram با Playwright، همراه
  `followersUpdatedAt` و تاریخچه روزانه `FollowerSnapshot`
- Occupation و Biography
- Unit Test و E2E Test
- Swagger / OpenAPI
- Destination Discovery برای شهرها و استان‌ها
- صفحه فهرست مقصدها با Search یکپارچهٔ شهر و استان، تغییر نوع و فیلتر استان
- Destination Card و صفحه جزئیات مشترک برای شهر و استان
- محتوای سفر چندمقصدی در سه قالب تک‌ویدیو، پست چندآیتمی و استوری/هایلایت چندآیتمی با امکان ترکیب عکس و ویدیو در صفحه مقصد و پروفایل چهره
- نمایش محتوای منتشرشدهٔ متصل به هتل در بخش مستقل صفحه هتل با همان گرید کاور و viewer یکپارچهٔ `/explore` در دسکتاپ و موبایل
- صفحه `/explore` برای کشف همه محتوای سفر با جست‌وجو و فیلتر نوع/خود مقصد و نمایش یکپارچه شبیه Highlight
- جابه‌جایی آیتم‌های داخل پست/استوری با فلش و کلیک در لپ‌تاپ و با لمس یا سوایپ افقی دنبال‌کنندهٔ انگشت در موبایل، مستقل از پیمایش عمودی بین محتواها؛ نوار آیتم فعال با زمان رسانه پر می‌شود، نگه‌داشتن مرکز زمان را متوقف می‌کند و نگه‌داشتن گوشه‌های ویدیو پخش را موقتاً ۲× می‌کند
- جست‌وجوی یکپارچه `/search` با نتایج گروه‌بندی‌شده هتل، چهره، شهر و استان
- اتصال سازنده ویدیو به پروفایل واقعی با `instagramUsername`
- نمایش مقصدهای منتخب در صفحه اصلی قبل از هتل‌ها و چهره‌ها
- فونت Vazirmatn با فرمت WOFF2
- ورود اختیاری با شماره/نام‌کاربری و رمز عبور یا OTP
- ارسال OTP واقعی production از طریق قالب تأییدشده نجوا؛ کلید، سرشماره، hostname و وایت‌لیست IP فعال‌اند و دریافت اولین پیامک واقعی روی گوشی تأیید شده است
- ثبت‌نام حداقلی فقط با شماره `09…`، نام‌کاربری یکتا و رمز قوی hash‌شده؛ اطلاعات شخصی بعداً در حساب تکمیل می‌شوند
- پروفایل کاربر با نام، نام خانوادگی، نام‌کاربری، ایمیل و Instagram اختیاری و یکتا، همراه عکس پروفایل قابل آپلود
- Session امن مبتنی بر Cookie از نوع HttpOnly
- امتیاز و نظر هتل با صف بررسی محتوا
- کامنت ویدیو با نمایش بسته به‌صورت پیش‌فرض و moderation هیبریدی مبتنی بر اعتماد و ریسک
- گزارش کامنت، مخفی‌سازی خودکار پس از ۳ گزارش مستقل و محدودیت ۵ کامنت در دقیقه
- پنل محافظت‌شده مدیر/ناظر برای انتشار، رد، پنهان‌کردن و بازگرداندن Review و Comment؛ همراه رسیدگی به گزارش‌ها و مسدودسازی کاربر توسط مدیر
- پنل مدیریتی `/admin/catalog` برای `ADMIN` و `MODERATOR` جهت افزودن مقصد، هتل، چهره و محتوای تک‌ویدیو/پست/استوری، مرتب‌سازی آیتم‌های رسانه، اتصال چندمقصدی/چندهتلی و دریافت خروجی JSON سازگار با Import
- صف مدیریتی `/admin/crawl-reviews` برای بارگذاری مستقیم JSON کرالر، بررسی ردیف‌ها بدون ساخت Excel، انتخاب مقصدهای canonical، ثبت هتل اختیاری، خروجی JSON سازگار با downloader/importer و اجرای مستقیم پس‌زمینه فقط توسط `MODERATOR`
- API و فرم ویرایش مقصد/هتل/چهره/محتوا، شامل روابط مقصد و هتل و آیتم‌های مرتب رسانه؛ همراه حذف رکوردهای Catalog و endpoint آپلود رسانه
- pipeline پژوهشی Instagram برای crawl → checkpoint → candidate detection →
  بررسی داخل پنل یا Excel قدیمی → دانلود خودکار رسانه‌های approved → ساخت مسیرهای نهایی
  `travel-videos`/`hotel-videos` → dry-run/apply؛ شامل پست و استوری چندآیتمی

  Excel generation includes initial Persian review suggestions:
- title
- final place name
- caption summary
- place type  
---
- نمایش خلاصه امتیاز کاربران و تعداد نظر در hero صفحه هتل، مستقل از ستاره رسمی
- اجرای نسخه production روی VPS Ubuntu 24.04 با Nginx، systemd و PostgreSQL 17
- فعال‌بودن خودکار Web/API/Nginx پس از reboot کامل سرور
- UFW با دسترسی عمومی محدود به SSH/HTTP/HTTPS
- backup روزانه PostgreSQL با systemd timer
- provision رسانه‌های محتوایی production خارج از Git
- تکمیل `import_approved.py --apply` و ورود موفق اولین batch شامل ۳۲ ویدیوی approved سفر/هتل به PostgreSQL

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
├── tools/
│   ├── instagram-travel-finder/
│   └── instagram-follower-tracker/
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
- پراکسی same-origin برای درخواست‌های مرورگر به `/api/v1` تا ورود، نظرها و
  کامنت‌ها روی localhost و IP شبکه یکسان کار کنند

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

### Production Runtime فعلی

```text
Browser
  ↓
Nginx :80
  ├── /api/* → NestJS :4000
  └── سایر routeها → Next.js :3000
                         │
                         └── Server Components → NestJS :4000

NestJS → Prisma → PostgreSQL 17 :5432
```

`hotel-yab-api.service` و `hotel-yab-web.service` با systemd اجرا می‌شوند و
پس از reboot خودکار برمی‌گردند. Browser API روی `/api/v1` same-origin است؛
در production این مسیر را Nginx مستقیم به NestJS می‌فرستد.

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

User ──< UserSession
  ├──< HotelReview >── Hotel
  ├──< VideoComment >── Video
  ├──< VideoCommentReport >── VideoComment
  ├──< CrawlReviewBatch ──< CrawlReviewItem (دادهٔ staging داخلی)
  └── NotablePerson (اتصال اختیاری و تأییدشده توسط ادمین)

Destination ──< VideoDestination >── Video ──< VideoHotel >── Hotel

NotablePerson ──< FollowerSnapshot
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
- logoUrl
- starRating (درجه رسمی اختیاری از ۱ تا ۵)
- publicationStatus

### NotablePerson

اطلاعاتی مانند:

- slug
- displayName
- instagramHandle
- primaryCategory
- occupation
- followerCount
- followersUpdatedAt
- followerSnapshots (تاریخچه روزانه)
- biography
- country
- imageUrl
- publicationStatus

`instagramHandle` بدون `@` ذخیره می‌شود و نباید از slug حدس زده شود.

`followerCount` آخرین مقدار موفق است و `followersUpdatedAt` زمان آخرین refresh
موفق را نگه می‌دارد. `FollowerSnapshot` برای هر شخص در هر روز UTC حداکثر یک
رکورد تاریخی دارد؛ اجرای دوباره در همان روز snapshot را upsert می‌کند. failure
در Instagram مقدار قبلی را پاک نمی‌کند.

### Destination و Video

- `Destination` رکورد canonical شهر/استان را با `type + slug` یکتا، استان والد اختیاری، ترتیب نمایش مستقل برای هر نوع، منبع و وضعیت انتشار نگه می‌دارد.
- `Video` برای سازگاری شناسه‌ها و کامنت‌های فعلی aggregate اصلی محتوا باقی مانده است؛ علاوه بر دستهٔ ارتباط `TRAVEL | HOTEL`، قالب مستقل `contentKind = VIDEO | POST | STORY`، اطلاعات سازنده، منبع اصلی، عنوان، وضعیت بررسی و انتشار را نگه می‌دارد.
- `VideoMediaItem` آیتم‌های مرتب هر محتوا را با `displayOrder`، نوع `IMAGE | VIDEO`، مسیر رسانه و کاور اختیاری نگه می‌دارد. `VIDEO` دقیقاً یک آیتم ویدیویی دارد؛ `POST` و `STORY` یک یا چند آیتم دارند و هر دو می‌توانند ترکیبی از عکس و ویدیو باشند.
- `VideoDestination` اتصال چندبه‌چند ویدیو به شهرها/استان‌ها و `VideoHotel` اتصال اختیاری ویدیو به هتل‌ها را نگه می‌دارند.
- رسانهٔ سفر با الگوی `/travel-videos/<person-slug>/<content-stem>` و رسانهٔ هتل با الگوی `/hotel-videos/<person-slug>/<hotel-slug|multi-hotel>-<sequence>` نگهداری می‌شود؛ آیتم‌های مجموعه با پسوندهای مرتب `-01`, `-02`, ... ذخیره می‌شوند و تصمیم نمایش براساس `videoCategory` و `contentKind` است، نه حدس از مسیر فایل.

### صف بررسی داده‌های کرالر

- `CrawlReviewBatch` یک فایل JSON بارگذاری‌شده را با حساب مدیر سازنده، hash فایل و وضعیت `REVIEWING | READY | COMPLETED` نگه می‌دارد.
- وضعیت اجرای پس‌زمینه batch با `IDLE | RUNNING | SUCCEEDED | FAILED`، زمان شروع/پایان، لاگ محدود و شناسه Moderator اجراکننده ثبت می‌شود.
- `CrawlReviewItem` تصمیم `PENDING | APPROVED | REJECTED`، لینک اصلی، عنوان نهایی، هتل اختیاری، شناسه‌های canonical شهر/استان و payload خام همان candidate را نگه می‌دارد.
- این دو مدل staging داخلی‌اند و تا اجرای downloader/importer هیچ `Video` عمومی ایجاد نمی‌کنند. حذف batch نیز محتوای canonical قبلاً importشده را حذف نمی‌کند.

### دسته‌بندی فعلی افراد

```text
ACTOR
ATHLETE
INFLUENCER
MUSICIAN
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

### User، Review و Video Comment

- ثبت‌نام جدید `User` فقط به شماره موبایل داخلی تأییدشده، نام‌کاربری یکتا و رمز قوی نیاز دارد؛ نام، نام خانوادگی، ایمیل، Instagram و عکس بعداً از صفحه حساب افزوده می‌شوند.
- `UserAvatar` تصویر اختیاری حساب را جدا از رکورد اصلی User نگه می‌دارد؛ تصاویر رایج تا ۱۵ مگابایت پس از چرخش/بهینه‌سازی به WebP با ابعاد محدود تبدیل می‌شوند.
- پسندیدن و ذخیره‌کردن دو وضعیت مستقل‌اند و با چهار رابطه صریح `UserHotelLike`، `UserSavedHotel`، `UserNotablePersonLike` و `UserSavedNotablePerson` نگهداری می‌شوند؛ کلید مرکب هر رابطه از ثبت تکراری جلوگیری می‌کند.
- رمز جدید حداقل ۸ کاراکتر و شامل حرف کوچک و بزرگ لاتین، عدد و یک نماد است؛ این قانون روی ورود رمزهای موجود اعمال نمی‌شود.
- حساب‌های OTP قدیمی تا زمان تکمیل نام‌کاربری و رمز می‌توانند با OTP وارد شوند.
- رمز عبور خام ذخیره نمی‌شود؛ فقط hash مبتنی بر `scrypt` همراه salt نگهداری می‌شود.
- `UserSession` فقط hash توکن opaque را نگه می‌دارد و توکن خام در Cookie امن مرورگر است؛ اعتبار هر نشست حداکثر ۲۴ ساعت از زمان ایجاد است و نشست‌های قدیمی‌تر حتی با تاریخ انقضای legacy طولانی‌تر پذیرفته نمی‌شوند.
- `OtpChallenge` کد OTP را به‌صورت HMAC hash و با زمان انقضا/محدودیت تلاش نگه می‌دارد.
- درخواست مجدد OTP در API و UI دارای cooldown پیش‌فرض ۶۰ ثانیه است.
- هر کاربر برای هر هتل یک `HotelReview` فعال با امتیاز ۱ تا ۵ دارد.
- `Video` رکورد کامل ویدیو را نگه می‌دارد و `VideoComment` با همان شناسه canonical به آن وصل می‌شود.
- Review کاربر عادی با وضعیت `PENDING` ثبت می‌شود؛ Review ادمین/Moderator مستقیم `PUBLISHED` است. Comment سالم بدون حدنصاب قبلی منتشر می‌شود و فقط لینک، تکرار یا عبارت پرریسک وارد صف می‌شود؛ محتوای ادمین/Moderator نیاز به پیش‌بررسی ندارد.
- هر حساب حداکثر ۵ کامنت در ۶۰ ثانیه می‌تواند ثبت کند.
- نام و نام خانوادگی برای ثبت کامنت اجباری نیست؛ حسابی که هنوز نامش را کامل نکرده با عنوان عمومی «کاربر هتل‌یاب» نمایش داده می‌شود.
- هر کاربر می‌تواند هر کامنت منتشرشده دیگران را یک‌بار گزارش کند؛ ۳ گزارش مستقلِ حل‌نشده کامنت را خودکار `HIDDEN` می‌کند.
- تصمیم moderation همراه شناسه مدیر/ناظر، زمان و یادداشت داخلی ثبت می‌شود.
- ادمین می‌تواند محتوا را از نمای عمومی حذف کند؛ در پنل Moderation هر دو نقش
  `ADMIN` و `MODERATOR` می‌توانند نظر هتل یا دیدگاه/پاسخ ویدیو را پس از تأیید
  دومرحله‌ای برای همیشه حذف کنند.

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
- Association با وضعیت `PENDING` می‌تواند بدون نشان وضعیت در فهرست ارتباط‌های هتل نمایش داده شود.
- Association با وضعیت `VERIFIED` باید evidence معتبر داشته باشد.
- Association با وضعیت `REJECTED` نمایش داده نمی‌شود.
- URL یا evidence جعلی برای پرکردن جای خالی ساخته نمی‌شود.
- اطلاعات نامطمئن باید خالی بماند و حدس زده نشود.
- تا زمانی که نوع دقیق رابطه مشخص نشده، `type=OTHER` قابل استفاده است.

جزئیات کامل:

`docs/DATA_POLICY.md`

---

## 7. وضعیت فعلی داده

شمارش‌ها باید با مرحله‌شان تفسیر شوند. preview تاریخی اولیه همچنان برای تاریخچه
منبع معتبر است، اما snapshot production بعد از deploy و batch ویدیو چنین بود:

- ۱۸ Hotel در production
- ۱۵۷ NotablePerson در production
- ۳۵ Destination در production
- ۳۸ Video در production
- ۳۲ ویدیوی approved سفر/هتل در اولین reviewed batch جدید وارد شدند

شمارش ۱۵۷-person preview و اجرای ۱۴۹-person follower refresh مربوط به مراحل
متفاوت dataset هستند و نباید با snapshot production یکی فرض شوند. شمارش
association/source فقط وقتی از خود production دوباره query شود باید به‌عنوان
عدد جاری نوشته شود.

در dataset محلی، ۱۰ مهمان بین‌المللی هتل عباسی با استناد مستقیم به صفحه رسمی
دست‌نوشته مهمانان هتل، به‌صورت `VERIFIED` و همراه Source/Evidence ثبت شده‌اند؛
این افزوده تا زمان deploy و import در شمارش production بالا منظور نمی‌شود.

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

### وضعیت فعلی Pipeline

برای Travel/Instagram یک pipeline پژوهشی قابل استفاده ساخته شده است:

```text
Instagram public timeline
        ↓
GraphQL crawler + checkpoint/resume
        ↓
High-recall detector + HOTEL priority
        ↓
JSON
        ↓
Admin crawl-review queue (مسیر اصلی) یا Excel review (سازگاری قدیمی)
        ↓
انتخاب شهر/استان canonical + هتل اختیاری + تصمیم ردیف
        ↓
خروجی `<username>.reviewed.json` از پنل
        ↓
download_approved.py --dry-run / --download
        ↓
download raw IMAGE/VIDEO items + local media manifest
        ↓
import_approved.py --prepare-media
        ↓
approved-row dry-run importer
        ↓
explicit --apply
        ↓
Admin API / PostgreSQL
```

صف `/admin/crawl-reviews` خود JSON خروجی crawler را می‌پذیرد و batch و ردیف‌های
آن را در PostgreSQL نگه می‌دارد. ردیف `approved` باید عنوان نهایی و حداقل یک
استان داشته باشد؛ شهر و استان از مقصدهای موجود انتخاب می‌شوند و هتل می‌تواند
خالی، از Catalog انتخاب‌شده یا به‌صورت نام حل‌نشده برای تکمیل بعدی باشد. پس از
تعیین تکلیف همه ردیف‌ها، خروجی JSON پنل همان headerهای مورد انتظار importer
قدیمی را تولید می‌کند و مستقیماً به `download_approved.py` و
`import_approved.py` داده می‌شود؛ مرحلهٔ ساخت XLSX دیگر اجباری نیست.

دانلود رسانه هم به‌صورت دستی از خروجی JSON قابل انجام است و هم `MODERATOR`
می‌تواند آن را از پنل به شکل job پس‌زمینه سرور اجرا کند. حالت سرور به runtime
پایتون و نشست ازقبل‌ذخیره‌شده Instaloader نیاز دارد، هم‌زمان فقط یک batch را
اجرا می‌کند و به‌ترتیب `download_approved.py --prepare-media`، dry-run و apply
را پیش می‌برد. درخواست مرورگر منتظر فرایند طولانی نمی‌ماند و وضعیت/لاگ در
PostgreSQL ثبت و با polling نمایش داده می‌شود. فایل‌های نهایی همچنان زیر
`apps/web/public` و خارج از Git قرار می‌گیرند. اگر API وسط پردازش restart شود،
batch باقی‌مانده در حالت `RUNNING` هنگام startup به `FAILED` و قابل‌تلاش‌مجدد
تبدیل می‌شود.

لینک‌های مستقیم Highlight خارج از workbook با
`tools/instagram-travel-finder/download_highlights.py` دریافت می‌شوند. هر
Highlight یک محتوای `STORY` است و تمام عکس/ویدیوهای آن به‌ترتیب در مسیر پایدار
`/travel-videos/<person-slug>/<content-index>-<item-index>` یا
`/hotel-videos/<person-slug>/<hotel-slug>-<content-index>-<item-index>` قرار
می‌گیرند؛ تصاویر به WebP تبدیل می‌شوند و برای ویدیوها کاور WebP نیز نگهداری
می‌شود. manifest قابل‌ادامه آن در خروجی محلی ابزار باقی می‌ماند.
پس از دانلود، `tools/instagram-travel-finder/import_highlight.py` همان manifest
را اعتبارسنجی می‌کند و با عنوان نهایی صریح، هر Highlight را به‌صورت یک محتوای
چندرسانه‌ای مرتب از مسیر Admin Catalog API وارد PostgreSQL می‌کند. اجرای
`--dry-run` پیش‌نیاز بررسی است و فقط `--apply` داده را می‌نویسد.
در مرحله بازبینی محلی می‌توان آیتم‌های نامناسب یک Highlight را با حذف فایل
اصلی‌شان کنار گذاشت؛ importer مسیرهای باقی‌مانده را بدون نیاز به شماره‌گذاری
مجدد می‌پذیرد و ترتیب نمایشی پیوسته را هنگام ثبت در دیتابیس می‌سازد.

فایل‌های اصلی:

```text
tools/instagram-travel-finder/graphql_client.py
tools/instagram-travel-finder/crawl_graphql.py
tools/instagram-travel-finder/detector.py
tools/instagram-travel-finder/json_to_excel.py
tools/instagram-travel-finder/download_approved.py
tools/instagram-travel-finder/download_highlights.py
tools/instagram-travel-finder/import_highlight.py
tools/instagram-travel-finder/import_approved.py
```

خروجی‌ها، browser/session state و captureهای محلی در Git قرار نمی‌گیرند.

برای followerها pipeline write کامل شده است:

```text
GET /admin/catalog/bootstrap
        ↓
Playwright persistent Instagram session
        ↓
track_all.py
        ↓
POST /admin/catalog/followers (--apply)
        ↓
NotablePerson latest count + FollowerSnapshot
```

Workbook اصلی Hotel/Person/Association هنوز sync عمومی و کامل خودکار ندارد.
مسیر Instagram review اکنون رسانه‌های ردیف‌های approved را نیز با
`download_approved.py` دریافت می‌کند. URLهای ذخیره‌شده crawler ابتدا استفاده
می‌شوند و برای مجموعه‌های ناقص یا URL منقضی، metadata تازه با Instaloader گرفته
می‌شود. برای دورزدن login/checkpoint ترمینالی، downloader با
`--load-cookies chrome` نشست فعال `instagram.com` را از Chrome وارد و به‌صورت
session محلی Instaloader ذخیره می‌کند؛ رمز اینستاگرام وارد اسکریپت نمی‌شود. هر
محتوا manifest محلی مرتب دارد؛ `import_approved.py --prepare-media`
عکس‌ها را به WebP و ویدیو/کاورها را به مسیر نهایی مناسب `TRAVEL` یا `HOTEL`
می‌برد و `--apply` payload شامل `contentKind` و `mediaItems` را از طریق Admin API
می‌نویسد. عنوان نهایی محتوا نیز در برابر عنوان‌های موجود و همان batch بررسی
می‌شود و در صورت تکرار، بدون overwrite با پسوند عددی `2`، `3` و ... یکتا
می‌شود. خطای یک پست حذف‌شده، خصوصی یا region-restricted بقیه دانلودها را
متوقف نمی‌کند و در `<profile>.download-failures.json` ثبت می‌شود؛ ولی تا رفع یا
خارج‌کردن آن ردیف از `approved`، آماده‌سازی نهایی batch اجرا نمی‌شود. اولین batch
قدیمی شامل ۳۲ ویدیوی approved با موفقیت اعمال شده است.

### داده مقصدها

- منبع runtime مقصدها، محتواها، آیتم‌های رسانه و رابطه‌های آن‌ها PostgreSQL و API است.
- فایل‌های `apps/web/src/data/destinations.json` و `apps/web/src/data/travel-videos.json` فعلاً به‌عنوان ورودی مهاجرت/بکاپ دوره انتقال باقی مانده‌اند و صفحه‌های عمومی مستقیماً آن‌ها را import نمی‌کنند.
- workbook خصوصی `../Data/HotelYab_Destinations_Data.xlsx` منبع کاری مقصدها، ویدیوها و رابطه‌های ویدیو–مقصد است؛ دادهٔ آن پیش از ورود به JSON نرمال و اعتبارسنجی می‌شود.
- `displayOrder` شهر و استان دو فضای شماره‌گذاری مستقل دارد و نباید میان دو نوع مقصد یکتا فرض شود.
- مسیر تصویر مقصد از نوع و slug مشتق می‌شود: `/images/provinces/<slug>.webp` یا `/images/cities/<slug>.webp` و داخل workbook تکرار نمی‌شود.
- `instagramUsername` ویدیو به رکورد منتشرشده شخص در API وصل می‌شود؛ اطلاعات شخص داخل ویدیو تکرار نمی‌شود.
- هتل‌های صفحه شهر با فیلتر دقیق `Hotel.city = City.name` از API گرفته می‌شوند. هتل‌های صفحه استان از تجمیع بدون تکرار هتل‌های شهرهایی به‌دست می‌آیند که `parentProvinceSlug` آن‌ها برابر slug استان است؛ اطلاعات هتل داخل داده مقصد کپی نمی‌شود.
- رکورد کامل محتوا در مدل `Video` و اسلایدهای مرتب آن در `VideoMediaItem` نگهداری می‌شود تا نمایش عمومی و کامنت‌ها همچنان از یک شناسه canonical مشترک استفاده کنند.
- تصاویر شهرها و استان‌ها به‌ترتیب در `apps/web/public/images/cities/` و `apps/web/public/images/provinces/` قرار دارند و نام فایل تصویر با slug مقصد یکسان است.
- رکورد مقصد، مشخصات ویدیو و رابطه‌های `VideoDestination`/`VideoHotel` وارد Prisma شده‌اند؛ خود باینری رسانه فعلاً در `apps/web/public` باقی مانده و دیتابیس فقط مسیر آن را نگه می‌دارد.
- جزئیات عمومی هتل، محتواهای `PUBLISHED` متصل از طریق `VideoHotel` را نیز برمی‌گرداند؛ frontend آن‌ها را با همان `ExploreVideoList`، گرید کاور و viewer تمام‌صفحهٔ `/explore` نمایش می‌دهد و اطلاعات سازنده را با `instagramUsername` از API چهره‌ها resolve می‌کند. ارتباط‌های بدون محتوای متناظر جداگانه در گرید فشرده مهمان‌های شناخته‌شده قرار می‌گیرند.
- جزئیات هر چهره همه ویدیوهای منتشرشده `TRAVEL` و `HOTEL` او را مستقیماً از API و با تطبیق نرمال‌شدهٔ `instagramHandle`/`instagramUsername` دریافت می‌کند؛ ویدیوهای `HOTEL` داخل کارت ارتباط همان هتل و ویدیوهای `TRAVEL` در بخش مستقل سفرها و مقصدها نمایش داده می‌شوند.
- دستور `pnpm --filter @hotel-yab/api data:import-travel` داده‌های JSON انتقالی را idempotent به PostgreSQL وارد می‌کند.
- داده ویدیو دیگر به نمونه اولیه یک سازنده محدود نیست؛ snapshot production فعلی ۳۸ Video دارد و batch جدید reviewed نیز وارد PostgreSQL شده است.

---

## 8. تصاویر و رسانه

تصاویر محلی frontend:

```text
apps/web/public/images/hotels/
apps/web/public/images/people/
```

`imageUrl` در داده فعلی به URL رسانه اشاره می‌کند.

`logoUrl` لوگوی اختیاری هتل را نگهداری می‌کند. فایل محلی لوگو با الگوی
`<hotel-slug>-logo.webp` در پوشه هتل‌ها قرار می‌گیرد.
لوگو با `cover` تمام قاب خود را پر می‌کند و همان قاب، گوشه‌های تصویر را گرد
می‌کند؛ حاشیه و فاصله سفید جداگانه‌ای دور فایل دیده نمی‌شود.

در development ممکن است URL محلی استفاده شود. در production فعلی، رسانه‌های
محتوایی خارج از Git روی filesystem خود VPS provision شده‌اند و database تا حد
ممکن مسیر relative پایدار نگه می‌دارد. Object Storage/CDN هنوز مرحله بعدی است.

رسانه مرتبط با Association باید به عنوان `Source` و `Evidence` مدل شود.

تصویر پروفایل Hotel یا Person جای evidence رابطه را نمی‌گیرد.

منبع و مجوز رسانه‌های محلی در `docs/MEDIA_ATTRIBUTIONS.md` ثبت می‌شود.

هر محتوای سفر `sourceUrl` محتوای اصلی Instagram را نگه می‌دارد و با
`contentKind` مشخص می‌کند محتوا تک‌ویدیو، پست یا استوری/هایلایت است؛ نوع هر اسلاید مستقل و از `IMAGE | VIDEO` انتخاب می‌شود.
`sourceUrl` مرجع اصلی است، نه شناسه یکتای محتوا؛ چند رکورد محتوا می‌توانند
عمداً به یک پست/ریل اصلی اشاره کنند، درحالی‌که `Video.id` همچنان یکتا می‌ماند.
وضعیت قطع/وصل صدا در viewer مشترک است؛ انتخاب کاربر هنگام رفتن به محتوای بعدی
در همان viewer حفظ می‌شود و هر اسلاید از نو روی حالت بی‌صدا برنمی‌گردد.
مسیرهای واقعی به‌ترتیب داخل `VideoMediaItem` قرار می‌گیرند. یک محتوا می‌تواند
از طریق `VideoDestination` به چند شهر/استان و از طریق `VideoHotel` به چند هتل
متصل باشد. پنل کاتالوگ مسیرهای MP4/WebP و thumbnail را از دسته ارتباط، person
slug، شناسه محتوا و هتل‌های انتخاب‌شده پیشنهاد می‌دهد؛ ترتیب و همه مسیرها پیش
از ثبت قابل تغییرند.

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

| Method          | Path                                                                       | توضیح                                          |
| --------------- | -------------------------------------------------------------------------- | ---------------------------------------------- |
| GET             | `/api/v1/health`                                                           | سلامت API و دیتابیس                            |
| GET             | `/api/v1/hotels`                                                           | فهرست هتل‌ها                                   |
| GET             | `/api/v1/hotels/:slug`                                                     | جزئیات هتل، ارتباط‌ها و محتوای متصل منتشرشده   |
| GET             | `/api/v1/notable-people`                                                   | فهرست چهره‌ها                                  |
| GET             | `/api/v1/notable-people/:slug`                                             | جزئیات چهره                                    |
| GET             | `/api/v1/destinations[/:type/:slug]`                                       | فهرست یا جزئیات مقصدهای منتشرشده               |
| GET             | `/api/v1/travel-videos`                                                    | فهرست محتوای سفر با قالب و آیتم‌های مرتب رسانه |
| POST            | `/api/v1/auth/login/password`                                              | ورود با شماره/نام‌کاربری و رمز                 |
| POST            | `/api/v1/auth/login/otp/request`                                           | درخواست OTP برای حساب موجود                    |
| POST            | `/api/v1/auth/login/otp/verify`                                            | ورود حساب موجود با OTP                         |
| POST            | `/api/v1/auth/register/otp/request`                                        | اعتبارسنجی کامل فرم و سپس درخواست کد           |
| POST            | `/api/v1/auth/register`                                                    | ساخت حساب پس از تأیید شماره                    |
| GET/PATCH       | `/api/v1/auth/me[/profile]`                                                | دریافت یا ویرایش پروفایل                       |
| GET/POST/DELETE | `/api/v1/auth/me/avatar`                                                   | دریافت، آپلود یا حذف عکس پروفایل               |
| POST            | `/api/v1/auth/logout`                                                      | خروج و ابطال session                           |
| GET             | `/api/v1/hotels/:slug/reviews`                                             | امتیاز و نظرهای منتشرشده هتل                   |
| GET/PUT/DELETE  | `/api/v1/hotels/:slug/reviews/me`                                          | مدیریت نظر کاربر جاری                          |
| GET             | `/api/v1/account/activity`                                                 | فعالیت‌های نظر و دیدگاه کاربر جاری             |
| DELETE          | `/api/v1/account/activity/video-comments/:id`                              | حذف دیدگاه بدون پاسخِ کاربر جاری               |
| GET             | `/api/v1/account/library`                                                  | پسندیده‌ها و ذخیره‌های کاربر جاری              |
| PUT/DELETE      | `/api/v1/account/library/{hotels\|notable-people}/:slug/{like\|save}`      | افزودن یا حذف پسند/ذخیره                       |
| GET             | `/api/v1/videos/:videoId/comments[/count]`                                 | کامنت‌های منتشرشده یا شمارش آن‌ها              |
| POST            | `/api/v1/videos/:videoId/comments`                                         | ثبت کامنت یا پاسخ کاربر                        |
| POST            | `/api/v1/videos/:videoId/comments/:commentId/reports`                      | گزارش یک کامنت منتشرشده                        |
| GET             | `/api/v1/admin/moderation/queue`                                           | صف Review، Comment و گزارش‌ها                  |
| PATCH           | `/api/v1/admin/moderation/{hotel-reviews\|video-comments}/:id`             | ثبت تصمیم moderation                           |
| DELETE          | `/api/v1/admin/moderation/{hotel-reviews\|video-comments}/:id`             | حذف دائمی محتوا توسط مدیر یا ناظر              |
| PATCH           | `/api/v1/admin/moderation/users/:id/status`                                | مسدود/فعال‌کردن کاربر توسط مدیر                |
| GET/PATCH       | `/api/v1/admin/moderation/users[/:id]`                                     | جست‌وجو و ویرایش role-aware کاربران            |
| GET             | `/api/v1/admin/moderation/administrators`                                  | فهرست جداگانه مدیران برای Moderator            |
| GET             | `/api/v1/admin/catalog/bootstrap`                                          | داده‌های لازم پنل کاتالوگ                      |
| POST            | `/api/v1/admin/catalog/{destinations\|hotels\|notable-people\|videos}`     | افزودن رکورد canonical یا محتوای چندآیتمی      |
| PATCH           | `/api/v1/admin/catalog/{destinations\|hotels\|notable-people\|videos}/:id`  | ویرایش رکورد، روابط و رسانه‌های موجود           |
| DELETE          | `/api/v1/admin/catalog/{destinations\|hotels\|notable-people\|videos}/:id` | حذف رکورد Catalog توسط مدیر یا ناظر            |
| POST            | `/api/v1/admin/catalog/media`                                              | آپلود رسانه Catalog                            |
| POST            | `/api/v1/admin/catalog/followers`                                          | ثبت followerهای موفق و snapshot روزانه         |
| GET             | `/api/v1/admin/catalog/export`                                             | خروجی JSON قابل ورود مجدد                      |
| GET             | `/api/v1/admin/crawl-reviews/bootstrap`                                    | مقصدها، هتل‌ها و batchهای صف بررسی کرالر       |
| POST            | `/api/v1/admin/crawl-reviews/upload`                                       | ساخت batch از فایل JSON کرالر                  |
| GET             | `/api/v1/admin/crawl-reviews/:id`                                          | دریافت صفحه‌بندی‌شده ردیف‌های batch            |
| PATCH           | `/api/v1/admin/crawl-reviews/items/:id`                                    | ذخیره تصمیم و داده‌های نهایی یک ردیف           |
| POST            | `/api/v1/admin/crawl-reviews/:id/finish-review`                            | پایان بررسی پس از تعیین تکلیف همه ردیف‌ها      |
| GET             | `/api/v1/admin/crawl-reviews/:id/export`                                   | دریافت JSON سازگار با ابزار دانلود و import    |
| POST            | `/api/v1/admin/crawl-reviews/:id/process`                                  | شروع job مستقیم دانلود و import فقط برای Moderator |
| POST            | `/api/v1/admin/crawl-reviews/:id/complete`                                 | علامت‌گذاری batch پس از پردازش نهایی            |
| DELETE          | `/api/v1/admin/crawl-reviews/:id`                                          | حذف batch داخلی صف بررسی                       |

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
sort = NAME_ASC | CITY_ASC
```

### فیلتر چهره‌ها

```text
page
pageSize
query
category
countryCode
sort = FOLLOWERS_DESC | NAME_ASC | HOTEL_COUNT_DESC
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

صفحه جزئیات هتل؛ محتواهای منتشرشدهٔ متصل فقط در صورت وجود با همان گرید و viewer صفحه `/explore` نمایش داده می‌شوند و مهمان‌های مرتبط بدون محتوای متناظر در گرید جدا قرار می‌گیرند

```text
/notable-people
```

فهرست و فیلتر چهره‌ها

```text
/notable-people/:slug
```

صفحه جزئیات فرد

```text
/destinations
```

فهرست و جست‌وجوی مقصدها با امکان جابه‌جایی بین شهرها و استان‌ها

```text
/destinations/[type]/[slug]
```

صفحه جزئیات مقصد؛ `type` فعلاً `cities` یا `provinces` است و هتل‌های مرتبط پس از ویدیوهای مقصد نمایش داده می‌شوند

```text
/explore
```

صفحه «محتواها» برای محتوای سفر با جست‌وجوی عنوان، سازنده یا مقصد و فیلتر شهر/استان و مقصد؛ کاورها در گرید و همه قالب‌ها در viewer یکپارچه نمایش داده می‌شوند

```text
/search
```

جست‌وجوی یکپارچه میان هتل، چهره، شهر و استان؛ فرم Hero صفحه اصلی نیز به این مسیر وصل است

```text
/account
```

ویرایش اطلاعات پروفایل و راه‌های ارتباطی کاربر

```text
/account/activity
```

بخش مستقل «فعالیت‌های من» برای مدیریت یکپارچه نظرهای هتل و دیدگاه‌های ویدیوی کاربر

```text
/account/library
```

کتابخانه خصوصی کاربر با دو بخش مستقل برای موارد پسندیده و ذخیره‌شده

```text
/admin/moderation
```

صف محافظت‌شده بررسی نظر هتل، کامنت ویدیوی در انتظار و کامنت‌های گزارش‌شده برای نقش‌های `ADMIN` و `MODERATOR`؛ هر دو نقش می‌توانند محتوای انتخابی را با تأیید دومرحله‌ای برای همیشه حذف کنند

```text
/admin/users
```

پنل جست‌وجو و ویرایش کاربران و ناظرها برای `ADMIN` و `MODERATOR`.

```text
/admin/administrators
```

صفحه مستقل «بررسی مدیران» فقط برای `MODERATOR`. self-edit، تغییر ادمین توسط
ادمین و مسدودکردن آخرین ادمین فعال ممنوع است.

```text
/admin/catalog
```

پنل `ADMIN` و `MODERATOR` برای افزودن مقصد، هتل، چهره و محتوای `VIDEO | POST | STORY`، ویرایش مقصد/هتل/چهره،
حذف رکوردهای Catalog، آپلود رسانه، پیشنهاد مسیر رسانه، پیشنهادهای قابل‌تایپ
و در ابتدا خالی برای نوع محتوا/نوع مکان/دسته سازنده، جست‌وجو و انتخاب
تک‌گزینه‌ای سازنده، ویرایش ترتیب آیتم‌های تصویر/ویدیو، جست‌وجو و انتخاب کلیکی چند مقصد/هتل و Export داده؛ اتصال
ویدیوی منتشرشده و ردنشده به هتل در صورت نبود رابطه قبلی، یک
`HotelAssociation` در حال تکمیل نیز می‌سازد. برای دوره موقت پاک‌سازی داده،
فهرست ویرایش چهره‌ها بر اساس الفبای فارسی مرتب است. پس از ذخیره موفق تغییرات
هتل یا چهره، فرم بسته و انتخاب فعلی پاک می‌شود تا مدیر دوباره رکورد موردنظر را
از فهرست انتخاب کند. در حالت افزودن محتوای جدید، پس از ثبت موفق دسته ارتباط،
عنوان، نام مکان، نوع مکان، مقصدها و هتل‌های مرتبط موقتاً در فرم حفظ می‌شوند؛
سایر فیلدها پاک یا به مقدار پیش‌فرض خود بازمی‌گردند تا ورود محتوای مشابه سریع‌تر شود

```text
/admin/crawl-reviews
```

صف داخلی `ADMIN` و `MODERATOR` برای تبدیل خروجی خام crawler به دادهٔ بررسی‌شده.
JSON هر حساب مستقیم بارگذاری می‌شود؛ batchهای در حال بررسی و آماده/تکمیل‌شده
جدا دیده می‌شوند و هر صفحه ۱۲ ردیف دارد. مدیر وضعیت ردیف، هتل اختیاری، شهرها،
استان‌ها و عنوان نهایی را ذخیره می‌کند. پس از پایان review، فایل JSON خروجی برای
اجرای دستی downloader/importer قابل دانلود است. فقط `MODERATOR` دکمهٔ «دانلود
و ورود مستقیم به سایت» را می‌بیند؛ این دکمه job پس‌زمینه را شروع می‌کند و نتیجه
و جزئیات خطا را در همان پنل نشان می‌دهد.

### قابلیت‌های فعلی UI

- RTL
- Search
- Filter
- Sort هتل‌ها بر اساس الفبا یا شهر، با اعمال خودکار بعد از انتخاب
- Sort چهره‌ها بر اساس follower، الفبا یا تعداد هتل، با اعمال خودکار بعد از انتخاب
- Pagination
- Hotel Card
- کارت هتل بدون badge وضعیت ارتباط نمایش داده می‌شود؛ تعداد چهره‌های مرتبط فقط در متادیتای پایین کارت باقی می‌ماند
- Hotel Logo روی کارت و صفحه جزئیات در صورت وجود
- Person Card
- Instagram Handle
- Occupation
- Follower Count کوتاه و لاتین (`2M`/`234K`) در همان خط Occupation و با جداکننده `·`
- Biography
- Association Count
- Verified Association Count
- Media Placeholder
- Empty State
- API Unavailable State
- صفحات Detail
- نمایش هدر فشرده پروفایل سازنده بالای هر ویدیوی صفحه مقصد، آماده برای چیدمان گریدی آینده
- نمایش کارت‌های هتل مرتبط زیر ویدیوهای هر مقصد با عنوان متناسب «هتل‌های شهر/استان …» و Empty/API State مستقل
- نمایش همه محتوای سفر در صفحه «محتواها» با اطلاعات سازنده، لینک مقصدهای چندگانه و viewer یکپارچه؛ فلش‌های افقی ابتدا آیتم‌های عکس/ویدیوی همان پست یا استوری را عوض می‌کنند و پیمایش عمودی به محتوای بعدی می‌رود
- فیلتر خودکار Explore بر اساس نوع مقصد و مقصد، همراه پاک‌شدن انتخاب ناسازگار هنگام تغییر نوع
- نمایش اولیه حداکثر ۶ محتوا در مقصد و هر بخش محتوایی صفحه چهره؛ Explore و بخش محتوای صفحه هتل در دسکتاپ هر بار ۱۲ کاور و در موبایل هر بار ۹ کاور نمایش می‌دهند و batch بعدی بدون refresh اضافه می‌شود
- ترتیب ناوبری بخش کشف در Header و Footer به‌صورت «مقصدها، هتل‌ها، چهره‌ها، محتواها»
- نتایج گروه‌بندی‌شده Global Search با شمارش، لینک «مشاهده همه»، حالت بی‌نتیجه و تحمل خطای مستقل API
- جست‌وجوی Hero، جست‌وجوی یکپارچه و فیلترهای متنی فهرست‌ها فقط با Submit/Enter اجرا می‌شوند تا navigation حین تایپ باعث refresh و نتایج ناپایدار نشود؛ جست‌وجوی صفحه مقصدها بدون محدودشدن به انتخاب نوع، شهرها و استان‌های منطبق را کنار هم برمی‌گرداند و نرمال‌سازی فارسی تفاوت‌های رایج `آ/ا`، `ی/ي`، `ک/ك` و نیم‌فاصله را تحمل می‌کند
- نمایش ویدیوها و مقصدهای مرتبط به‌صورت فوتر فشرده زیر هر ویدیو، پایین associationهای صفحه شخص
- کنترل سرعت پخش `1×/2×` و نوار قابل‌کشیدن زمان روی Travel Video
- توقف خودکار ویدیوی قبلی هنگام پخش ویدیوی دیگر، همراه بازگشت کاور و حفظ زمان برای ادامه پخش از همان نقطه
- ورود پیش‌فرض با شماره/نام‌کاربری و رمز، مسیر جایگزین OTP با مرحله مستقل ورود شماره و ثبت‌نام جداگانه از Header؛ شماره تماس و کد OTP با ارقام فارسی، عربی یا انگلیسی در UI و API به ارقام استاندارد نرمال می‌شوند
- فرم ثبت‌نام سه‌فیلدی و فشرده شامل شماره، نام‌کاربری و رمز؛ نام، نام خانوادگی، ایمیل، Instagram و عکس از صفحه حساب تکمیل می‌شوند
- فیلدهای رمز ورود، ثبت‌نام، تکمیل حساب و تغییر رمز دارای کنترل چشم در سمت راست برای نمایش/پنهان‌سازی امن و بدون تغییر چیدمان‌اند؛ فیلد شماره/نام‌کاربری ورود نیز LTR است
- فیلد تغییر رمز با `autocomplete="new-password"` از Autofill ناخواسته رمز فعلی هنگام ویرایش ایمیل/پروفایل جلوگیری می‌کند
- راهنمای شماره، نام‌کاربری و رمز زیر عنوان هر فیلد و بالای کادر نمایش داده می‌شود؛ نام‌کاربری ۳ تا ۳۰ کاراکتر و دارای حداقل یک حرف لاتین است
- ورود OTP با شش جایگاه خطی و ورودی عددی واحد انجام می‌شود؛ با تکمیل شش رقم خودکار تأیید می‌شود و ارسال مجدد پس از شمارش معکوس ۶۰ ثانیه فعال است
- خطاهای حساب، ورود، نظر هتل، کامنت و گزارش با پیام مشخص و ظاهر قرمز نمایش داده می‌شوند؛ پیام‌های موفقیت سبزند
- خطای فرمت رمز در ورود، ثبت‌نام، تکمیل حساب قدیمی و صفحه حساب با اعتبارسنجی داخلی فارسی و قرمز نمایش داده می‌شود و به پیام native انگلیسی مرورگر واگذار نمی‌شود
- جداسازی جهت LTR شماره موبایل داخل متن فارسی برای نمایش صحیح `+98`
- Header واکنش‌گرا با آیکون‌های SVG مشترک، منوی حساب انیمیشنی و فلش چرخان؛ کلیک بیرون، انتخاب لینک یا Escape منو را می‌بندد
- منوی اصلی و حساب در موبایل دو کشوی تمام‌قد و متقابلاً انحصاری از سمت چپ‌اند؛ backdrop صفحه را تیره می‌کند و لمس بیرون یا خود کنترل فعال کشو را می‌بندد
- صفحه حساب دو‌بخشی و عریض در لپ‌تاپ با ستون کناری پروفایل/ناوبری و فرم اصلی دو‌ستونه؛ در موبایل به چیدمان یک‌ستونه تبدیل می‌شود
- آپلود، نمایش در Header/Sidebar و حذف عکس پروفایل با خطای قرمز و محدودیت فرمت/حجم
- مسیر مستقل `/account/activity` و گزینه جداگانه «فعالیت‌های من» پس از «پسندیده‌ها و ذخیره‌ها» در منوی حساب برای مشاهده وضعیت همه نظرهای هتل و دیدگاه‌های ویدیوی خود کاربر، رفتن به محتوای مرتبط و حذف امن
- منوهای موبایل با عرض فشرده‌تر، سربرگ هم‌تراز حساب و انیمیشن ورود و خروج نمایش داده می‌شوند؛ فوتر عمومی نیز در مسیرهای حساب کاربری پنهان است
- صفحه محتواها و بخش محتوای هر هتل در موبایل ابتدا گرید سه‌ستونه و فشردهٔ کاورها و در دسکتاپ گرید چهارتایی هم‌عرض با Container را نشان می‌دهند. در `/explore` عنوان و شمارش نتایج با Filter Bar هم‌راستا هستند. کاورهای دسکتاپ عنوان محتوا و مقصدهای متصل را روی گرادیان پایین Thumbnail نمایش می‌دهند، اما گرید موبایل برای تراکم بیشتر بدون این متن باقی می‌ماند. انتخاب هر کاور viewer تمام‌صفحه شبیه Highlight/Reels را باز می‌کند: تک‌ویدیو مستقیم پخش می‌شود و `POST` و `STORY` هر دو می‌توانند اسلایدهای مرتب عکس و ویدیو را با هم داشته باشند؛ فلش‌های لب قاب و کلیدهای چپ/راست در دسکتاپ و لمس/سوایپ دنبال‌کنندهٔ انگشت در موبایل داخل همان محتوا حرکت می‌کنند، فلش موبایل نمایش داده نمی‌شود و پیمایش عمودی محتوای بعدی را باز می‌کند. نوار آیتم فعال با زمان ویدیو یا بازه پنج‌ثانیه‌ای عکس پر و سپس آیتم بعدی فعال می‌شود؛ نگه‌داشتن مرکز محتوا نوار/پخش را متوقف و کنترل‌ها را پنهان می‌کند و نگه‌داشتن گوشه‌های ویدیو همان پخش موقت ۲× را انجام می‌دهد. بازگشت مرورگر و پنل دیدگاه از پایین حفظ شده‌اند. در دسکتاپ عرض viewer با نسبت عمودی محدود می‌شود تا اطلاعات سازنده، مقصدها و کنترل‌ها کاملاً داخل قاب بمانند؛ دسته‌های بعدی در موبایل ۹تایی و در دسکتاپ ۱۲تایی بدون refresh بارگذاری می‌شوند و نسخه دسکتاپ Escape و کلیدهای جهت‌دار را نیز پشتیبانی می‌کند
- صفحه جزئیات هتل در موبایل داخل عرض واقعی viewport و Container محدود می‌شود و Media/Heading نمی‌توانند Header یا صفحه را به اسکرول و زوم افقی وادار کنند
- Hero صفحه هتل مانند Hero چهره سلسله‌مراتب تایپوگرافی متعادل دارد؛ شهر دارای آیکون مکان است و اگر `address` ثبت شده باشد، Hover یا Focus روی آن آدرس کامل را نشان می‌دهد
- صفحه هتل وضعیت تأیید یا منابع association را روی کارت مهمان نشان نمی‌دهد؛ بخش محتوای معرفی نیز فقط با وجود حداقل یک محتوای منتشرشده ساخته می‌شود و نمایش آن عیناً از renderer مشترک Explore استفاده می‌کند
- کارت مهمان هتل در نبود follower count هیچ متن جایگزینی نمایش نمی‌دهد
- Hero صفحه چهره در دسکتاپ سلسله‌مراتب تایپوگرافی متعادل دارد؛ عنوان فعالیت خواناتر، نام چهره کنترل‌شده‌تر و آیدی Instagram یک خط بالاتر از تعداد دنبال‌کننده نمایش داده می‌شود. لینک‌های بازگشت صفحه‌های جزئیات نیز در لبه چپ قرار دارند
- اکشن‌های صفحه جزئیات هتل در موبایل دو ردیف‌اند: پسندیدن/ذخیره در ردیف اول و صفحه رسمی/تعداد چهره‌های مرتبط در ردیف دوم
- عبارت‌ها و نشان‌های عمومی «در حال تکمیل» از کارت‌ها، صفحه چهره و Empty Stateهای مقصد حذف شده‌اند؛ ارتباط تأییدنشده بدون برچسب تکمیل نمایش داده می‌شود و حالت خالی مستقیماً نبود داده را توضیح می‌دهد. عنوان فعالیت چهره حتی وقتی با برچسب دسته‌بندی یکسان است همچنان نمایش داده می‌شود
- در نمایش عمومی چهره‌ها، حرفهٔ واقعی جای برچسب دستهٔ کلی را بالای نام می‌گیرد و خط متادیتای پایین فقط تعداد دنبال‌کننده و آیدی Instagram را نشان می‌دهد؛ دستهٔ داخلی همچنان برای فیلتر و مدیریت داده حفظ می‌شود
- کارت چهره‌ها حتی در نبود Instagram یا تعداد دنبال‌کننده، فضای ثابت متادیتا را حفظ می‌کنند تا ردیف «هتل مرتبط» در تمام کارت‌های گرید هم‌راستا بماند
- تأیید حذف و جایگزینی فایل با Dialog داخلی و واکنش‌گرای سایت انجام می‌شود، به `window.confirm` مرورگر وابسته نیست و در جریان آپلود تصویر همیشه بالاتر از پنجره انتخاب/پیش‌نمایش نمایش داده می‌شود
- دکمه‌های مستقل پسندیدن و ذخیره‌کردن روی کارت و صفحه جزئیات هتل/چهره؛ برای مهمان پنجره ورود باز می‌شود و وضعیت کاربر واردشده بدون درخواست جداگانه برای هر کارت از Provider مشترک خوانده می‌شود
- مسیر مستقل `/account/library` برای نمایش جداگانه هتل‌ها و چهره‌های پسندیده یا ذخیره‌شده، همراه دسترسی از Header و ستون کناری حساب
- فرم امتیاز و نظر هتل پایین ارتباط‌های چهره‌ها
- متن اختیاری نظر هتل در صورت وجود حداقل ۳ کاراکتر است و خطای اعتبارسنجی به‌صورت فارسی و قرمز داخل فرم نمایش داده می‌شود
- خلاصه امتیاز و تعداد نظر منتشرشده در بالای صفحه هتل، در صورت وجود حداقل یک نظر
- کامنت‌های ویدیو به‌صورت بسته و فقط پس از درخواست کاربر نمایش داده می‌شوند
- کامنت‌های منتشرشده قابل گزارش‌اند؛ کامنت سالم کاربران قابل‌اعتماد فوری منتشر می‌شود و موارد تازه‌وارد/پرریسک به صف بررسی می‌روند
- تکمیل نام و نام خانوادگی شرط ثبت کامنت نیست و نام عمومی جایگزین برای پروفایل ناقص استفاده می‌شود
- نمایش کنترل تأییدشونده «حذف توسط ادمین» کنار دیدگاه‌های ویدیو، پاسخ‌ها و نظرهای منتشرشده هتل فقط برای نقش `ADMIN`
- خطای گزارش تکراری یا گزارش دیدگاه خود کاربر داخل همان فرم گزارش و بدون نیاز به بستن فرم نمایش داده می‌شود
- صفحات جزئیات هتل، چهره و مقصد پس‌زمینه لایه‌ای روشن دارند؛ هدر اطلاعات هتل/چهره به‌صورت سطح شیشه‌ای ملایم و Hero مقصد با عمق بصری نمایش داده می‌شود
- اعمال خودکار فیلتر دسته‌بندی چهره‌ها بعد از انتخاب category
- صفحه جزئیات شهر دارای image hero با تصویر خود شهر، نام استان، نام شهر و توضیح کوتاه است.
- نام استان روی hero به‌صورت badge با کنتراست بالا نمایش داده می‌شود تا روی تصاویر مختلف خوانا بماند.
- بخش Navbar/Footer/Homepage از «شهرها» به «مقصدها» تغییر کرده؛ کارت مشترک DestinationCard داریم؛ توضیح کارت‌ها دوخطی clamp می‌شود.
- انتخاب‌های Sort، دسته‌بندی، نوع مقصد و استان با navigation کامل بلافاصله نتایج را refresh می‌کنند.
- association بدون ویدیو و منبع در صفحه چهره، متن‌های پژوهشی/درحال‌تکمیل و placeholder رسانه را نمایش نمی‌دهد؛ بخش ویدیوهای سفر خالی نیز پنهان می‌ماند
- Footer به‌جای بخش شفافیت، شماره تماس و Instagram هتل‌یاب را نمایش می‌دهد؛ بخش‌های «چرا هتل‌یاب؟» و فراخوان تکمیل داده فعلاً از Home پنهان‌اند
- در filter bar مقصدها، جست‌وجو همواره `۳/۷` فضای فیلدها را دارد. در حالت استان، نوع مقصد `۴/۷` است و در حالت شهر همان فضا میان نوع مقصد و استان به دو بخش `۲/۷` تقسیم می‌شود.

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
AUTH_OTP_SECRET="حداقل-۳۲-کاراکتر-تصادفی"
AUTH_OTP_TTL_MINUTES=5
AUTH_OTP_RESEND_SECONDS=60
AUTH_SESSION_DAYS=1
SMS_PROVIDER=development
NAJVA_API_BASE_URL="https://sms.najva.com"
NAJVA_API_KEY=""
NAJVA_SENDER=""
NAJVA_OTP_TEMPLATE="HotelYabOTPTemplate"
SMS_OTP_ORIGIN_HOST=""
```

برای browser معمولاً `NEXT_PUBLIC_API_BASE_URL` لازم نیست و fallback
`/api/v1` ترجیح داده می‌شود. Server Components به `API_BASE_URL` کامل مثل
`http://localhost:4000/api/v1` نیاز دارند. در development کد OTP داخل پاسخ/UI
قابل نمایش است. برای ارسال واقعی، `SMS_PROVIDER=najva`، کلید API، سرشماره نجوا
و hostname واقعی سایت فقط در environment سرور تنظیم می‌شوند؛ با فعال‌شدن نجوا،
کد دیگر در پاسخ API نمایش داده نمی‌شود. قالب تاییدشده
`HotelYabOTPTemplate` از `%token` برای کد، `%token2` برای ساعت تهران و `%token3`
برای hostname خط WebOTP استفاده می‌کند. اعتبارسنجی environment در production
providerهای `preview`، `disabled` و `najva` را می‌پذیرد. حالت موقت `preview`
کد را در پاسخ/UI نشان می‌دهد و هیچ پیامکی نمی‌فرستد؛ فقط تا زمان دریافت
credential نجوا برای تست نسخهٔ محدود سرور استفاده می‌شود. حالت `disabled` API
را بالا نگه می‌دارد و درخواست OTP را بدون نمایش کد آزمایشی با `503` رد می‌کند.

### Migration

```bash
pnpm api:prisma:migrate:deploy
```

### Import Data

```bash
pnpm api:data:import
pnpm --filter @hotel-yab/api data:import-travel
```

دستور اول dataset خصوصی Hotel/Person/Association و دستور دوم JSONهای انتقالی
Destination/TravelVideo را idempotent وارد PostgreSQL می‌کند.

### Instagram Follower Tracker

بار اول برای ذخیره session اکانت تستی:

```bash
python3 tools/instagram-follower-tracker/fetch_profile_browser.py --login
```

اسکن read-only:

```bash
python3 tools/instagram-follower-tracker/track_all.py --delay 5
```

اسکن و ثبت نتایج موفق در PostgreSQL از مسیر Admin API:

```bash
python3 tools/instagram-follower-tracker/track_all.py --delay 5 --apply
```

`HOTELYAB_ADMIN_COOKIE` برای write لازم است. browser profile و outputهای محلی
نباید commit شوند. collector در اجرای کامل ۲۰۲۶-۰۸-۱۶ هر ۱۴۹ شخص runtime را
با موفقیت refresh کرد.

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

## 11B. اجرای Production و Update سرور

### وضعیت سرور فعلی

- VPS: ArvanCloud / Ubuntu 24.04
- Public IP فعلی: `87.247.170.136`
- Node.js: `v24.19.0`
- pnpm: `11.18.0`
- PostgreSQL: 17 روی پورت 5432
- Web داخلی: `127.0.0.1:3000`
- API داخلی: `127.0.0.1:4000`
- Nginx ورودی عمومی HTTP
- `hotel-yab-api.service` و `hotel-yab-web.service` فعال و enabled
- backup دیتابیس روزانه 03:00 UTC

دامنه و HTTPS فعال‌اند و origin فعلی `https://hotelyab.jaryan.net` است.

### Workflow عادی Update کد

توسعه و تست روی Mac انجام می‌شود؛ production محل کدنویسی روزمره نیست.

```bash
# Mac
git status --short --branch
# test, commit, then push to main; the VPS timer deploys production

# VPS — مسیر دستی جایگزین
ssh jaryan@87.247.170.136
cd ~/Hotel-Yab
bash scripts/deploy-production.sh
```

اگر Prisma migration جدید وجود دارد:

```bash
pnpm api:prisma:generate
pnpm api:prisma:migrate:deploy
```

timer خودکار `hotel-yab-deploy.timer` هر یک دقیقه `origin/main` را بررسی می‌کند
و فقط در صورت وجود کامیت تازه، اسکریپت قفل‌شده
`scripts/check-and-deploy-production.sh` را اجرا می‌کند. این مسیر از دسترسی
GitHub موجود خود VPS استفاده می‌کند و private key ورود به سرور را در GitHub
نگه نمی‌دارد. اسکریپت اصلی فقط fast-forward را می‌پذیرد،
migration/build/restart را انجام می‌دهد و در پایان health check retryدار می‌زند.
این service/timer اکنون روی VPS نصب و enabled است.

برای فعال‌کردن یک‌باره پردازش مستقیم crawler روی VPS، ابتدا
`scripts/bootstrap-crawl-processing.sh` محیط `.venv-instagram` را می‌سازد، سپس
session ذخیره‌شده Instaloader باید برای user سرویس در
`~/.config/instaloader/` قرار گیرد و متغیرهای `CRAWL_PROCESSING_ENABLED`,
`CRAWL_PROCESSING_REPO_ROOT`, `CRAWL_PROCESSING_PYTHON`,
`CRAWL_PROCESSING_INSTAGRAM_LOGIN` و `CRAWL_PROCESSING_API_BASE` تنظیم شوند.

Health check:

```bash
curl -fsS http://127.0.0.1:4000/api/v1/health
curl -I http://87.247.170.136/
```

رسانه‌های `apps/web/public/images/`، `hotel-videos/` و `travel-videos/` در Git
نیستند و در صورت تغییر باید جداگانه با روش کنترل‌شده به سرور sync شوند.

### انتقال Catalog و رسانه خارج از Git

ابتدا روی Mac دیتای Catalog فعلی PostgreSQL به قالب import سازگار خروجی گرفته
می‌شود. این خروجی فقط هتل، چهره، مقصد، منبع، ارتباط و ویدیو را شامل می‌شود و
نباید جای backup کامل production را بگیرد:

فیلدهای رسانه در این round-trip می‌توانند URL کامل `http(s)` یا مسیر پایدار
root-relative مانند `/images/people/slug.webp` باشند؛ لینک منبع و مدرک همچنان
باید URL کامل `http(s)` باشد.

```bash
pnpm api:data:export
scp apps/api/prisma/data/import.json jaryan@87.247.170.136:/tmp/hotel-yab-import.json
```

قبل از import روی VPS backup گرفته و سپس داده‌ها upsert می‌شوند؛ User، Session،
Review و Comment موجود حذف یا جایگزین نمی‌شوند:

```bash
ssh jaryan@87.247.170.136
sudo systemctl start hotel-yab-db-backup.service
cd ~/Hotel-Yab
pnpm --filter @hotel-yab/api exec tsx prisma/import-data.ts /tmp/hotel-yab-import.json
```

رسانه‌ها از Mac بدون `--delete` همگام می‌شوند تا فایل‌های اختصاصی موجود روی VPS
ناخواسته حذف نشوند:

```bash
rsync -az --progress apps/web/public/images/ jaryan@87.247.170.136:~/Hotel-Yab/apps/web/public/images/
rsync -az --progress apps/web/public/travel-videos/ jaryan@87.247.170.136:~/Hotel-Yab/apps/web/public/travel-videos/
rsync -az --progress apps/web/public/hotel-videos/ jaryan@87.247.170.136:~/Hotel-Yab/apps/web/public/hotel-videos/
```

### Backup

Backup دیتابیس با `hotel-yab-db-backup.timer` اجرا می‌شود و فایل‌های custom dump
در `/var/backups/hotel-yab` نگهداری می‌شوند. این backup روی همان VPS است؛
نسخه off-server هنوز TODO است.

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
apps/api/prisma/import-travel-data.ts
apps/api/prisma/data/import.example.json
apps/api/src/catalog/
apps/api/src/crawl-reviews/
```

### Frontend

```text
apps/web/src/app/
apps/web/src/components/
apps/web/src/lib/
apps/web/src/app/admin/catalog/
apps/web/src/app/admin/crawl-reviews/
apps/web/public/images/
```

### Data

```text
data/Hotel-Yab_Data_Workbook.xlsx
data/Influencer_Hotel_Tracker.xlsx
data/Influencer_Hotel_Tracker.pdf
```

### Tooling

```text
tools/instagram-travel-finder/
tools/instagram-follower-tracker/
```

Travel finder output, captured query files, and the follower browser profile are
local-only and excluded from Git.

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

فازهای اصلی discovery و User Features پایه پیاده‌سازی شده‌اند. roadmap نزدیک دیگر
بر مبنای ساخت featureهای پایه نیست و روی پایدارسازی production، افزایش داده و
بهبود Admin/Product متمرکز است. جمع‌آوری داده به‌صورت موازی ادامه دارد.

### Phase 1 — Destination Detail v2

- پیاده‌سازی شده: نمایش هتل‌های مرتبط با هر شهر یا استان زیر ویدیوهای همان مقصد
- پیاده‌سازی شده: استفاده مجدد از داده و کارت هتل بدون کپی‌کردن اطلاعات داخل داده مقصد
- پیاده‌سازی شده: عنوان متناسب با نوع مقصد، مانند «هتل‌های شهر تهران»

### Phase 2 — Content Explore

- پیاده‌سازی شده: فید/گرید واکنش‌گرای محتوای سفر در قالب `VIDEO | POST | STORY`
- پیاده‌سازی شده: استفاده مجدد از aggregate سازگار `Video`، آیتم‌های `VideoMediaItem` و رابطه‌های شخص و مقصد
- پیاده‌سازی شده: جست‌وجو، فیلتر مقصد و Empty State مناسب برای کشف محتوا
- پیاده‌سازی شده: لود مرحله‌ای ۹تایی موبایل و ۱۲تایی دسکتاپ بدون refresh صفحه

### Phase 3 — Global Search

- پیاده‌سازی شده: جست‌وجوی یکپارچه میان هتل، چهره، شهر و استان
- پیاده‌سازی شده: گروه‌بندی نتایج، شمارش و مسیر مستقیم به صفحه جزئیات/فهرست کامل

### Phase 4 — User Features

هسته فعلی:

- Account و Login با Password/OTP
- ثبت‌نام با تأیید شماره و نام‌کاربری یکتا
- ارسال خودکار کد تأیید به‌محض تکمیل شش رقم، بدون نیاز به Enter یا دکمه
- User Profile
- Profile Avatar
- Hotel Review و Rating
- Video Comment
- مدیریت یکپارچه فعالیت‌های کاربر با نمایش وضعیت moderation و حذف امن
- پسندیدن و ذخیره‌کردن مستقل هتل‌ها و چهره‌ها
- کتابخانه خصوصی `/account/library`

ادامه این فاز:

- Personalization (فعلاً زود است و به بعد موکول شده)

### مسیرهای موازی — Data, Content & Scale

مسیر Instagram review تا write کامل شده و اولین batch ۳۲تایی روی production
اعمال شده است. اولویت نزدیک پروژه اکنون:

```text
Production session bug
        ↓
Server update runbook
        ↓
Domain + HTTPS
        ↓
Production SMS
        ↓
Crawler automation + more reviewed data
        ↓
Hotel/Person data completion + visible bugs
        ↓
Product/Admin improvements
```

هفته ۴ روی یادگیری update سرور، دامنه، SMS، crawler، تکمیل دیتا و باگ‌ها تمرکز
دارد. هفته ۵ روی جداکردن presentation ویدیو/association در صفحه هتل، بهبود UI،
لیست کاربران ادمین و قواعد role-to-role تمرکز می‌کند. Monitoring، CI/CD،
Object Storage و personalization بعد از پایدارشدن این حلقه می‌آیند.

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
- دیتابیس runtime production روی PostgreSQL 17 VPS فعال است؛ local فقط محیط development است.

### Media

- Catalog endpoint آپلود رسانه وجود دارد، اما storage نهایی/object storage هنوز طراحی نشده است.
- production فعلی از filesystem VPS برای رسانه استفاده می‌کند؛ Object Storage/CDN هنوز انتخاب نشده است.
- فایل‌های عکس، کاور و ویدیو فعلاً فقط داخل `apps/web/public/{images,travel-videos,hotel-videos}` به‌صورت محلی نگهداری و از Git خارج می‌شوند؛ PostgreSQL مسیر و ترتیب آن‌ها را در `VideoMediaItem` نگه می‌دارد.
- برخی تصاویر هنوز missing یا placeholder هستند.
- Catalog برای مقصد/هتل/چهره/محتوا update و برای رکوردهای اصلی delete API دارد؛
  aggregate محتوای موجود با حفظ شناسهٔ canonical قابل ویرایش است و عنوان، متادیتا، سازنده، وضعیت انتشار، روابط مقصد/هتل و آیتم‌های مرتب رسانه در یک تراکنش جایگزین می‌شوند.
- مقصد، aggregate محتوای `Video` و `VideoMediaItem` در runtime از PostgreSQL/API می‌آیند؛ transition JSON فقط
  migration/recovery input است.

### Product

- پنل Moderation برای Review/Comment/Report، پنل Users برای مدیریت role-aware حساب‌ها و پنل Catalog برای مقصد/هتل/چهره/ویدیو وجود دارند؛ review association/source هنوز اضافه نشده است.
- نقش USER/MODERATOR از پنل Users قابل مدیریت است؛ نقش هر حساب `ADMIN` در پنل برای همه staffها تغییرناپذیر است و bootstrap نقش ADMIN همچنان با `pnpm --filter @hotel-yab/api user:set-role -- <mobile-or-username> ADMIN` انجام می‌شود.
- اتصال فنی OTP به endpoint قالبی v1 نجوا با قالب تأییدشده
  `HotelYabOTPTemplate` فعال است؛ `NAJVA_API_KEY`، `NAJVA_SENDER` و
  `SMS_OTP_ORIGIN_HOST` روی VPS تنظیم شده‌اند و IP سرور whitelist شده است.
- نمایش `developmentCode` با `SMS_PROVIDER=development` در لوکال و با حالت صریح
  و موقت `SMS_PROVIDER=preview` روی نسخهٔ محدود سرور فعال است.
- production با `SMS_PROVIDER=najva`، سرشماره `90008136`، قالب
  `HotelYabOTPTemplate` و hostname `hotelyab.jaryan.net` اجرا می‌شود. درخواست
  واقعی OTP از API production با پاسخ موفق provider پذیرفته و دریافت آن روی
  گوشی تأیید شده است. حالت `preview` دیگر تنظیم فعال production نیست.
- account activity و library پیاده‌سازی شده‌اند؛ باگ production session بعد refresh هنوز باز است.
- Follower refresh به‌صورت command + Admin API عملیاتی است، اما scheduler
  production هنوز ساخته نشده است.
- Travel review queue داخل پنل و خروجی JSON سازگار با downloader/importer پیاده‌سازی شده است؛ reviewed-XLSX نیز برای سازگاری قدیمی باقی مانده و اولین batch production آن قبلاً اعمال شده است.
- Production infrastructure پایه و تحویل واقعی OTP نجوا فعال‌اند؛ تست مسیرهای
  failure/resend، off-server backup و monitoring هنوز نهایی نشده‌اند.

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
- `tools/instagram-follower-tracker/.browser-profile/` و outputهای follower local-only هستند.
- `tools/instagram-travel-finder/output/`، `query.json` و `query.rtf` local-only هستند.
- Cookie، sessionid، CSRF/LSD/fb_dtsg و سایر request tokenهای Instagram نباید در Git یا مستندات ذخیره شوند.
- فونت‌ها و assetهای کدی رابط می‌توانند در Git باشند، اما عکس‌ها، کاورها و ویدیوهای محتوایی `apps/web/public` نباید Track یا Commit شوند.
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
