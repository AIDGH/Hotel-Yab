# Hotel-Yab — Project Context

> این فایل مرجع اصلی وضعیت فعلی پروژه و handoff بین چت‌ها و توسعه‌دهنده‌هاست.
> جزئیات تخصصی در فایل‌های `docs/` نگهداری می‌شوند و این فایل باید خلاصه، به‌روز و قابل اتکا باقی بماند.

آخرین به‌روزرسانی محتوایی: ۲۰۲۶-۰۸-۱۱

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
- Occupation و Biography
- Unit Test و E2E Test
- Swagger / OpenAPI
- Destination Discovery برای شهرها و استان‌ها
- صفحه فهرست مقصدها با Search، تغییر نوع و فیلتر استان
- Destination Card و صفحه جزئیات مشترک برای شهر و استان
- ویدیوهای سفر چندمقصدی در صفحه مقصد و پروفایل چهره
- نمایش ویدیوی منتشرشدهٔ متصل به هتل داخل کارت ارتباط همان چهره در صفحه هتل
- صفحه `/explore` برای کشف همه ویدیوهای سفر با جست‌وجو و فیلتر نوع/خود مقصد
- جست‌وجوی یکپارچه `/search` با نتایج گروه‌بندی‌شده هتل، چهره، شهر و استان
- اتصال سازنده ویدیو به پروفایل واقعی با `instagramUsername`
- نمایش مقصدهای منتخب در صفحه اصلی قبل از هتل‌ها و چهره‌ها
- فونت Vazirmatn با فرمت WOFF2
- ورود اختیاری با شماره/نام‌کاربری و رمز عبور یا OTP
- ثبت‌نام حداقلی فقط با شماره `09…`، نام‌کاربری یکتا و رمز قوی hash‌شده؛ اطلاعات شخصی بعداً در حساب تکمیل می‌شوند
- پروفایل کاربر با نام، نام خانوادگی، نام‌کاربری، ایمیل و Instagram اختیاری و یکتا، همراه عکس پروفایل قابل آپلود
- Session امن مبتنی بر Cookie از نوع HttpOnly
- امتیاز و نظر هتل با صف بررسی محتوا
- کامنت ویدیو با نمایش بسته به‌صورت پیش‌فرض و moderation هیبریدی مبتنی بر اعتماد و ریسک
- گزارش کامنت، مخفی‌سازی خودکار پس از ۳ گزارش مستقل و محدودیت ۵ کامنت در دقیقه
- پنل محافظت‌شده مدیر/ناظر برای انتشار، رد، پنهان‌کردن و بازگرداندن Review و Comment؛ همراه رسیدگی به گزارش‌ها و مسدودسازی کاربر توسط مدیر
- پنل فقط-ادمین `/admin/catalog` برای افزودن مقصد، هتل، چهره و ویدیو، اتصال چندمقصدی/چندهتلی و دریافت خروجی JSON سازگار با Import
- نمایش خلاصه امتیاز کاربران و تعداد نظر در hero صفحه هتل، مستقل از ستاره رسمی

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
  └── NotablePerson (اتصال اختیاری و تأییدشده توسط ادمین)

Destination ──< VideoDestination >── Video ──< VideoHotel >── Hotel
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
- biography
- country
- imageUrl
- publicationStatus

`instagramHandle` بدون `@` ذخیره می‌شود و نباید از slug حدس زده شود.

### Destination و Video

- `Destination` رکورد canonical شهر/استان را با `type + slug` یکتا، استان والد اختیاری، ترتیب نمایش مستقل برای هر نوع، منبع و وضعیت انتشار نگه می‌دارد.
- `Video` علاوه بر شناسه canonical، دستهٔ صریح `TRAVEL | HOTEL`، اطلاعات سازنده، منبع اصلی، عنوان، رسانه، کاور، وضعیت بررسی و انتشار را در PostgreSQL نگه می‌دارد.
- `VideoDestination` اتصال چندبه‌چند ویدیو به شهرها/استان‌ها و `VideoHotel` اتصال اختیاری ویدیو به هتل‌ها را نگه می‌دارند.
- رسانهٔ سفر با الگوی `/travel-videos/<person-slug>/<sequence>` و رسانهٔ هتل با الگوی `/hotel-videos/<person-slug>/<hotel-slug|multi-hotel>-<sequence>` نگهداری می‌شود؛ تصمیم نمایش براساس `videoCategory` است، نه حدس از مسیر فایل.

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
- `UserAvatar` تصویر اختیاری حساب را جدا از رکورد اصلی User نگه می‌دارد تا باینری تصویر در درخواست‌های عادی ورود/پروفایل خوانده نشود؛ فرمت‌های مجاز JPEG/PNG/WebP و سقف حجم ۱ مگابایت است.
- پسندیدن و ذخیره‌کردن دو وضعیت مستقل‌اند و با چهار رابطه صریح `UserHotelLike`، `UserSavedHotel`، `UserNotablePersonLike` و `UserSavedNotablePerson` نگهداری می‌شوند؛ کلید مرکب هر رابطه از ثبت تکراری جلوگیری می‌کند.
- رمز جدید حداقل ۸ کاراکتر و شامل حرف کوچک و بزرگ لاتین، عدد و یک نماد است؛ این قانون روی ورود رمزهای موجود اعمال نمی‌شود.
- حساب‌های OTP قدیمی تا زمان تکمیل نام‌کاربری و رمز می‌توانند با OTP وارد شوند.
- رمز عبور خام ذخیره نمی‌شود؛ فقط hash مبتنی بر `scrypt` همراه salt نگهداری می‌شود.
- `UserSession` فقط hash توکن opaque را نگه می‌دارد و توکن خام در Cookie امن مرورگر است.
- `OtpChallenge` کد OTP را به‌صورت HMAC hash و با زمان انقضا/محدودیت تلاش نگه می‌دارد.
- درخواست مجدد OTP در API و UI دارای cooldown پیش‌فرض ۶۰ ثانیه است.
- هر کاربر برای هر هتل یک `HotelReview` فعال با امتیاز ۱ تا ۵ دارد.
- `Video` رکورد کامل ویدیو را نگه می‌دارد و `VideoComment` با همان شناسه canonical به آن وصل می‌شود.
- Review جدید همیشه با وضعیت `PENDING` ثبت می‌شود. Comment و پاسخ کاربر تازه‌وارد، تکراری یا پرریسک نیز `PENDING` است؛ کامنت سالم کاربر قابل‌اعتماد می‌تواند مستقیم `PUBLISHED` شود.
- کاربر پس از ۲ کامنت منتشرشده قابل‌اعتماد محسوب می‌شود. هر حساب حداکثر ۵ کامنت در ۶۰ ثانیه می‌تواند ثبت کند.
- نام و نام خانوادگی برای ثبت کامنت اجباری نیست؛ حسابی که هنوز نامش را کامل نکرده با عنوان عمومی «کاربر هتل‌یاب» نمایش داده می‌شود.
- هر کاربر می‌تواند هر کامنت منتشرشده دیگران را یک‌بار گزارش کند؛ ۳ گزارش مستقلِ حل‌نشده کامنت را خودکار `HIDDEN` می‌کند.
- تصمیم moderation همراه شناسه مدیر/ناظر، زمان و یادداشت داخلی ثبت می‌شود.
- ادمین می‌تواند نظر هتل یا دیدگاه/پاسخ ویدیو را از همان نمای عمومی و پس از تأیید دومرحله‌ای برای همیشه حذف کند.

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

### داده مقصدها

- منبع runtime مقصدها، ویدیوها و رابطه‌های آن‌ها PostgreSQL و API است.
- فایل‌های `apps/web/src/data/destinations.json` و `apps/web/src/data/travel-videos.json` فعلاً به‌عنوان ورودی مهاجرت/بکاپ دوره انتقال باقی مانده‌اند و صفحه‌های عمومی مستقیماً آن‌ها را import نمی‌کنند.
- workbook خصوصی `../Data/HotelYab_Destinations_Data.xlsx` منبع کاری مقصدها، ویدیوها و رابطه‌های ویدیو–مقصد است؛ دادهٔ آن پیش از ورود به JSON نرمال و اعتبارسنجی می‌شود.
- `displayOrder` شهر و استان دو فضای شماره‌گذاری مستقل دارد و نباید میان دو نوع مقصد یکتا فرض شود.
- مسیر تصویر مقصد از نوع و slug مشتق می‌شود: `/images/provinces/<slug>.webp` یا `/images/cities/<slug>.webp` و داخل workbook تکرار نمی‌شود.
- `instagramUsername` ویدیو به رکورد منتشرشده شخص در API وصل می‌شود؛ اطلاعات شخص داخل ویدیو تکرار نمی‌شود.
- هتل‌های صفحه شهر با فیلتر دقیق `Hotel.city = City.name` از API گرفته می‌شوند. هتل‌های صفحه استان از تجمیع بدون تکرار هتل‌های شهرهایی به‌دست می‌آیند که `parentProvinceSlug` آن‌ها برابر slug استان است؛ اطلاعات هتل داخل داده مقصد کپی نمی‌شود.
- رکورد کامل ویدیوها در مدل `Video` دیتابیس نگهداری می‌شود تا نمایش عمومی و کامنت‌ها از یک شناسه canonical استفاده کنند.
- تصاویر شهرها و استان‌ها به‌ترتیب در `apps/web/public/images/cities/` و `apps/web/public/images/provinces/` قرار دارند و نام فایل تصویر با slug مقصد یکسان است.
- رکورد مقصد، مشخصات ویدیو و رابطه‌های `VideoDestination`/`VideoHotel` وارد Prisma شده‌اند؛ خود باینری رسانه فعلاً در `apps/web/public` باقی مانده و دیتابیس فقط مسیر آن را نگه می‌دارد.
- جزئیات عمومی هتل، ویدیوهای `PUBLISHED` متصل از طریق `VideoHotel` را نیز برمی‌گرداند؛ frontend با تطبیق نرمال‌شدهٔ `Video.instagramUsername` و `NotablePerson.instagramHandle` آن‌ها را زیر ارتباط همان چهره نمایش می‌دهد و دیگر placeholder منبع را به‌جای ویدیوی موجود نشان نمی‌دهد.
- دستور `pnpm --filter @hotel-yab/api data:import-travel` داده‌های JSON انتقالی را idempotent به PostgreSQL وارد می‌کند.
- دادهٔ فعلی مرتضی کوثری شامل ۵ ویدیو و ۹ اتصال مقصدی است؛ رسانه‌های ۰۰۱ تا ۰۰۴ موجودند و فایل MP4/thumbnail ویدیوی ۰۰۵ هنوز باید اضافه شود.

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
لوگو داخل قاب سفید با فاصله داخلی و `contain` نمایش داده می‌شود تا گوشه‌ها یا
بخش‌های تصویر بریده نشوند.

در development ممکن است URL به localhost اشاره کند، اما در production باید storage یا URL پایدار استفاده شود.

رسانه مرتبط با Association باید به عنوان `Source` و `Evidence` مدل شود.

تصویر پروفایل Hotel یا Person جای evidence رابطه را نمی‌گیرد.

منبع و مجوز رسانه‌های محلی در `docs/MEDIA_ATTRIBUTIONS.md` ثبت می‌شود.

هر Travel Video مسیر رسانه محلی و `sourceUrl` پست اصلی Instagram را نگه
می‌دارد. یک ویدیو می‌تواند از طریق `VideoDestination` به چند شهر یا استان و
از طریق `VideoHotel` به چند هتل متصل باشد.
پنل کاتالوگ مسیر MP4 و thumbnail را از نوع ویدیو، person slug، شناسه ویدیو و
هتل‌های انتخاب‌شده پیشنهاد می‌دهد؛ هر دو مسیر قبل از ثبت قابل ویرایش‌اند.

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

| Method         | Path                                                           | توضیح                                |
| -------------- | -------------------------------------------------------------- | ------------------------------------ |
| GET            | `/api/v1/health`                                               | سلامت API و دیتابیس                  |
| GET            | `/api/v1/hotels`                                               | فهرست هتل‌ها                         |
| GET            | `/api/v1/hotels/:slug`                                         | جزئیات هتل، ارتباط‌ها و ویدیوهای متصل منتشرشده |
| GET            | `/api/v1/notable-people`                                       | فهرست چهره‌ها                        |
| GET            | `/api/v1/notable-people/:slug`                                 | جزئیات چهره                          |
| GET            | `/api/v1/destinations[/:type/:slug]`                           | فهرست یا جزئیات مقصدهای منتشرشده    |
| GET            | `/api/v1/travel-videos`                                       | فهرست ویدیوهای سفر منتشرشده         |
| POST           | `/api/v1/auth/login/password`                                  | ورود با شماره/نام‌کاربری و رمز       |
| POST           | `/api/v1/auth/login/otp/request`                               | درخواست OTP برای حساب موجود          |
| POST           | `/api/v1/auth/login/otp/verify`                                | ورود حساب موجود با OTP               |
| POST           | `/api/v1/auth/register/otp/request`                            | اعتبارسنجی کامل فرم و سپس درخواست کد |
| POST           | `/api/v1/auth/register`                                        | ساخت حساب پس از تأیید شماره          |
| GET/PATCH      | `/api/v1/auth/me[/profile]`                                    | دریافت یا ویرایش پروفایل             |
| GET/POST/DELETE | `/api/v1/auth/me/avatar`                                      | دریافت، آپلود یا حذف عکس پروفایل     |
| POST           | `/api/v1/auth/logout`                                          | خروج و ابطال session                 |
| GET            | `/api/v1/hotels/:slug/reviews`                                 | امتیاز و نظرهای منتشرشده هتل         |
| GET/PUT/DELETE | `/api/v1/hotels/:slug/reviews/me`                              | مدیریت نظر کاربر جاری                |
| GET            | `/api/v1/account/activity`                                    | فعالیت‌های نظر و دیدگاه کاربر جاری   |
| DELETE         | `/api/v1/account/activity/video-comments/:id`                  | حذف دیدگاه بدون پاسخِ کاربر جاری     |
| GET            | `/api/v1/account/library`                                     | پسندیده‌ها و ذخیره‌های کاربر جاری    |
| PUT/DELETE     | `/api/v1/account/library/{hotels\|notable-people}/:slug/{like\|save}` | افزودن یا حذف پسند/ذخیره      |
| GET            | `/api/v1/videos/:videoId/comments[/count]`                     | کامنت‌های منتشرشده یا شمارش آن‌ها    |
| POST           | `/api/v1/videos/:videoId/comments`                             | ثبت کامنت یا پاسخ کاربر              |
| POST           | `/api/v1/videos/:videoId/comments/:commentId/reports`          | گزارش یک کامنت منتشرشده              |
| GET            | `/api/v1/admin/moderation/queue`                               | صف Review، Comment و گزارش‌ها        |
| PATCH          | `/api/v1/admin/moderation/{hotel-reviews\|video-comments}/:id` | ثبت تصمیم moderation                 |
| DELETE         | `/api/v1/admin/moderation/{hotel-reviews\|video-comments}/:id` | حذف دائمی محتوا فقط توسط ادمین       |
| PATCH          | `/api/v1/admin/moderation/users/:id/status`                    | مسدود/فعال‌کردن کاربر توسط مدیر      |
| GET            | `/api/v1/admin/catalog/bootstrap`                              | داده‌های لازم پنل کاتالوگ            |
| POST           | `/api/v1/admin/catalog/{destinations\|hotels\|notable-people\|videos}` | افزودن رکورد canonical توسط ادمین |
| GET            | `/api/v1/admin/catalog/export`                                 | خروجی JSON قابل ورود مجدد            |

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

صفحه جزئیات هتل؛ ویدیوهای منتشرشدهٔ متصل به هتل زیر کارت چهرهٔ سازنده نمایش داده می‌شوند

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

اکسپلور ویدیوهای سفر با جست‌وجوی عنوان، سازنده یا مقصد و فیلتر خودکار شهر/استان و مقصد

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

صف محافظت‌شده بررسی نظر هتل، کامنت ویدیوی در انتظار و کامنت‌های گزارش‌شده برای نقش‌های `ADMIN` و `MODERATOR`؛ مسدودسازی کاربر فقط برای `ADMIN`

```text
/admin/catalog
```

پنل فقط-ادمین برای افزودن مقصد، هتل، چهره و ویدیو، پیشنهاد مسیر رسانه، جست‌وجو و انتخاب کلیکی چند مقصد/هتل و Export داده؛ اتصال ویدیوی منتشرشده و ردنشده به هتل در صورت نبود رابطه قبلی، یک `HotelAssociation` در حال تکمیل نیز می‌سازد

### قابلیت‌های فعلی UI

- RTL
- Search
- Filter
- Sort هتل‌ها بر اساس الفبا یا شهر، با اعمال خودکار بعد از انتخاب
- Sort چهره‌ها بر اساس follower، الفبا یا تعداد هتل، با اعمال خودکار بعد از انتخاب
- Pagination
- Hotel Card
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
- نمایش همه ویدیوهای سفر در Explore با اطلاعات سازنده بالا، کارت ویدیو در میانه و لینک مقصدهای چندگانه پایین
- فیلتر خودکار Explore بر اساس نوع مقصد و مقصد، همراه پاک‌شدن انتخاب ناسازگار هنگام تغییر نوع
- نمایش اولیه ۶ ویدیو در Explore و آشکارسازی ۶تایی ویدیوهای بعدی با دکمه «نمایش ویدیوهای بیشتر» و بدون refresh صفحه
- ترتیب ناوبری بخش کشف در Header و Footer به‌صورت «مقصدها، هتل‌ها، چهره‌ها، ویدیوها»
- نتایج گروه‌بندی‌شده Global Search با شمارش، لینک «مشاهده همه»، حالت بی‌نتیجه و تحمل خطای مستقل API
- نمایش ویدیوها و مقصدهای مرتبط به‌صورت فوتر فشرده زیر هر ویدیو، پایین associationهای صفحه شخص
- کنترل سرعت پخش `1×/2×` و نوار قابل‌کشیدن زمان روی Travel Video
- ورود پیش‌فرض با شماره/نام‌کاربری و رمز، مسیر جایگزین OTP و ثبت‌نام جداگانه از Header
- فرم ثبت‌نام سه‌فیلدی و فشرده شامل شماره، نام‌کاربری و رمز؛ نام، نام خانوادگی، ایمیل، Instagram و عکس از صفحه حساب تکمیل می‌شوند
- فیلدهای رمز ورود، ثبت‌نام، تکمیل حساب و تغییر رمز دارای کنترل چشم برای نمایش/پنهان‌سازی امن و بدون تغییر چیدمان‌اند
- فیلد تغییر رمز با `autocomplete="new-password"` از Autofill ناخواسته رمز فعلی هنگام ویرایش ایمیل/پروفایل جلوگیری می‌کند
- راهنمای شماره، نام‌کاربری و رمز زیر عنوان هر فیلد و بالای کادر نمایش داده می‌شود؛ نام‌کاربری ۳ تا ۳۰ کاراکتر و دارای حداقل یک حرف لاتین است
- ورود OTP با شش جایگاه خطی و ورودی عددی واحد انجام می‌شود؛ با تکمیل شش رقم خودکار تأیید می‌شود و ارسال مجدد پس از شمارش معکوس ۶۰ ثانیه فعال است
- خطاهای حساب، ورود، نظر هتل، کامنت و گزارش با پیام مشخص و ظاهر قرمز نمایش داده می‌شوند؛ پیام‌های موفقیت سبزند
- خطای فرمت رمز در ورود، ثبت‌نام، تکمیل حساب قدیمی و صفحه حساب با اعتبارسنجی داخلی فارسی و قرمز نمایش داده می‌شود و به پیام native انگلیسی مرورگر واگذار نمی‌شود
- جداسازی جهت LTR شماره موبایل داخل متن فارسی برای نمایش صحیح `+98`
- Header واکنش‌گرا با منوی حساب و خروج
- صفحه حساب دو‌بخشی در لپ‌تاپ با ستون کناری پروفایل/ناوبری و فرم اصلی جمع‌وجور و تک‌ستونه؛ در موبایل به چیدمان یک‌ستونه تبدیل می‌شود
- آپلود، نمایش در Header/Sidebar و حذف عکس پروفایل با خطای قرمز و محدودیت فرمت/حجم
- مسیر مستقل `/account/activity` و گزینه جداگانه «فعالیت‌های من» در منوی حساب برای مشاهده وضعیت همه نظرهای هتل و دیدگاه‌های ویدیوی خود کاربر، رفتن به محتوای مرتبط و حذف امن
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
AUTH_SESSION_DAYS=30
```

Frontend نیز به `NEXT_PUBLIC_API_BASE_URL` نیاز دارد. در development کد OTP داخل پاسخ و UI نمایش داده می‌شود؛ production به اتصال سرویس‌دهنده واقعی SMS نیاز دارد.

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
apps/api/prisma/import-travel-data.ts
apps/api/prisma/data/import.example.json
apps/api/src/catalog/
```

### Frontend

```text
apps/web/src/app/
apps/web/src/components/
apps/web/src/lib/
apps/web/src/app/admin/catalog/
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

ترتیب فعلی توسعه محصول (جمع‌آوری داده به‌صورت موازی و دستی ادامه دارد):

```text
1. Destination Detail v2: hotels related to each city/province (implemented)
      ↓
2. Video Explore (implemented)
      ↓
3. Global Search (implemented)
      ↓
4. User Features (در حال اجرا)
```

سه مرحله discovery شامل هتل‌های مقصد، `Video Explore` و `Global Search` تکمیل شده‌اند. مدیریت یکپارچه فعالیت‌های کاربر و پسند/ذخیره مستقل هتل‌ها و چهره‌ها نیز پیاده‌سازی شده‌اند. شخصی‌سازی عمداً تا زمان شکل‌گرفتن داده و رفتار کاربری کافی عقب افتاده و تکمیل محتوای صفحه هتل نیز تا آماده‌شدن داده‌های لازم متوقف می‌ماند.

### Phase 1 — Destination Detail v2

- پیاده‌سازی شده: نمایش هتل‌های مرتبط با هر شهر یا استان زیر ویدیوهای همان مقصد
- پیاده‌سازی شده: استفاده مجدد از داده و کارت هتل بدون کپی‌کردن اطلاعات داخل داده مقصد
- پیاده‌سازی شده: عنوان متناسب با نوع مقصد، مانند «هتل‌های شهر تهران»

### Phase 2 — Video Explore

- پیاده‌سازی شده: فید/گرید واکنش‌گرای ویدیوهای سفر
- پیاده‌سازی شده: استفاده مجدد از TravelVideo و رابطه‌های شخص و مقصد
- پیاده‌سازی شده: جست‌وجو، فیلتر مقصد و Empty State مناسب برای کشف محتوا
- پیاده‌سازی شده: لود مرحله‌ای ۶تایی با دکمه و بدون refresh صفحه

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

- ادامه جمع‌آوری دستی داده توسط صاحب پروژه
- تکمیل عکس، Instagram، Biography، Occupation، ویدیو و Source
- تکمیل Import گروهی با Dry Run و گزارش Duplicate؛ Import JSON و Export پنل اکنون موجود است
- تکمیل صفحه هتل پس از آماده‌شدن داده‌های موردنیاز
- تکمیل Admin Panel با ویرایش رکوردها، مدیریت association/source و آپلود واقعی رسانه؛ افزودن مقصد، هتل، چهره و ویدیو اکنون موجود است
- گسترش Moderation و گزارش‌های مدیریتی
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
- پنل Catalog فعلاً create-only است؛ ویرایش/آرشیو رکوردهای موجود هنوز UI ندارد.
- داده ویدیو/مقصد هنوز فایل‌محور است؛ فقط اطلاعات شخص از API اصلی resolve می‌شود.

### Product

- پنل فعلی فقط Review و Comment را پوشش می‌دهد؛ مدیریت هتل/چهره/association/source هنوز وجود ندارد.
- مدیریت نقش‌ها UI ندارد؛ برای bootstrap می‌توان از `pnpm --filter @hotel-yab/api user:set-role -- <mobile-or-username> ADMIN` استفاده کرد.
- سرویس ارسال SMS واقعی متصل نشده و نمایش development OTP فقط برای محیط غیر-production است.
- بازیابی/مدیریت همه فعالیت‌های کاربر در صفحه حساب هنوز تکمیل نشده است.
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
