-- Add missing canonical Iranian destinations without rewriting existing catalog data.
WITH candidates AS (
  SELECT
    item.value ->> 'slug' AS slug,
    item.value ->> 'name' AS name,
    item.desired_order::INTEGER
  FROM jsonb_array_elements($json$
  [
    {"slug":"tehran","name":"تهران"},
    {"slug":"isfahan","name":"اصفهان"},
    {"slug":"razavi-khorasan","name":"خراسان رضوی"},
    {"slug":"fars","name":"فارس"},
    {"slug":"mazandaran","name":"مازندران"},
    {"slug":"gilan","name":"گیلان"},
    {"slug":"yazd","name":"یزد"},
    {"slug":"hormozgan","name":"هرمزگان"},
    {"slug":"kerman","name":"کرمان"},
    {"slug":"east-azerbaijan","name":"آذربایجان شرقی"},
    {"slug":"kermanshah","name":"کرمانشاه"},
    {"slug":"ardabil","name":"اردبیل"},
    {"slug":"qom","name":"قم"},
    {"slug":"golestan","name":"گلستان"},
    {"slug":"qazvin","name":"قزوین"},
    {"slug":"khuzestan","name":"خوزستان"},
    {"slug":"kurdistan","name":"کردستان"},
    {"slug":"hamadan","name":"همدان"},
    {"slug":"bushehr","name":"بوشهر"},
    {"slug":"west-azerbaijan","name":"آذربایجان غربی"},
    {"slug":"lorestan","name":"لرستان"},
    {"slug":"sistan-and-baluchestan","name":"سیستان و بلوچستان"},
    {"slug":"south-khorasan","name":"خراسان جنوبی"},
    {"slug":"north-khorasan","name":"خراسان شمالی"},
    {"slug":"chaharmahal-and-bakhtiari","name":"چهارمحال و بختیاری"},
    {"slug":"kohgiluyeh-and-boyer-ahmad","name":"کهگیلویه و بویراحمد"},
    {"slug":"semnan","name":"سمنان"},
    {"slug":"zanjan","name":"زنجان"},
    {"slug":"alborz","name":"البرز"},
    {"slug":"markazi","name":"مرکزی"},
    {"slug":"ilam","name":"ایلام"}
  ]
  $json$::jsonb) WITH ORDINALITY AS item(value, desired_order)
), missing AS (
  SELECT candidates.*, ROW_NUMBER() OVER (ORDER BY desired_order) AS missing_order
  FROM candidates
  WHERE NOT EXISTS (
    SELECT 1 FROM "Destination"
    WHERE "type" = 'PROVINCE'::"DestinationType"
      AND "slug" = candidates.slug
  )
), order_boundary AS (
  SELECT COALESCE(MAX("displayOrder"), 0) AS last_order
  FROM "Destination"
  WHERE "type" = 'PROVINCE'::"DestinationType"
)
INSERT INTO "Destination" (
  "id", "type", "slug", "name", "description", "imageUrl",
  "parentProvinceId", "isFeatured", "displayOrder", "primarySourceUrl",
  "sourceType", "notes", "publicationStatus", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), 'PROVINCE'::"DestinationType", missing.slug, missing.name,
  'استان ' || missing.name || ' مجموعه‌ای از شهرهای مهم، جاذبه‌های فرهنگی و چشم‌اندازهای طبیعی ایران را در بر می‌گیرد.',
  NULL, NULL, false, order_boundary.last_order + missing.missing_order,
  NULL, NULL, NULL, 'PUBLISHED'::"PublicationStatus",
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM missing CROSS JOIN order_boundary
ON CONFLICT ("type", "slug") DO NOTHING;

WITH candidates AS (
  SELECT
    item.value ->> 'slug' AS slug,
    item.value ->> 'name' AS name,
    item.value ->> 'province_slug' AS province_slug,
    item.desired_order::INTEGER
  FROM jsonb_array_elements($json$
  [
    {"slug":"tehran","name":"تهران","province_slug":"tehran"},
    {"slug":"isfahan","name":"اصفهان","province_slug":"isfahan"},
    {"slug":"mashhad","name":"مشهد","province_slug":"razavi-khorasan"},
    {"slug":"shiraz","name":"شیراز","province_slug":"fars"},
    {"slug":"kish","name":"کیش","province_slug":"hormozgan"},
    {"slug":"qeshm","name":"قشم","province_slug":"hormozgan"},
    {"slug":"rasht","name":"رشت","province_slug":"gilan"},
    {"slug":"yazd","name":"یزد","province_slug":"yazd"},
    {"slug":"tabriz","name":"تبریز","province_slug":"east-azerbaijan"},
    {"slug":"kerman","name":"کرمان","province_slug":"kerman"},
    {"slug":"bandar-abbas","name":"بندرعباس","province_slug":"hormozgan"},
    {"slug":"ramsar","name":"رامسر","province_slug":"mazandaran"},
    {"slug":"chalous","name":"چالوس","province_slug":"mazandaran"},
    {"slug":"kashan","name":"کاشان","province_slug":"isfahan"},
    {"slug":"sari","name":"ساری","province_slug":"mazandaran"},
    {"slug":"hamadan","name":"همدان","province_slug":"hamadan"},
    {"slug":"kermanshah","name":"کرمانشاه","province_slug":"kermanshah"},
    {"slug":"ardabil","name":"اردبیل","province_slug":"ardabil"},
    {"slug":"bushehr","name":"بوشهر","province_slug":"bushehr"},
    {"slug":"sanandaj","name":"سنندج","province_slug":"kurdistan"},
    {"slug":"gorgan","name":"گرگان","province_slug":"golestan"},
    {"slug":"chabahar","name":"چابهار","province_slug":"sistan-and-baluchestan"},
    {"slug":"bandar-anzali","name":"بندر انزلی","province_slug":"gilan"},
    {"slug":"lahijan","name":"لاهیجان","province_slug":"gilan"},
    {"slug":"marivan","name":"مریوان","province_slug":"kurdistan"},
    {"slug":"khorramabad","name":"خرم‌آباد","province_slug":"lorestan"},
    {"slug":"qazvin","name":"قزوین","province_slug":"qazvin"},
    {"slug":"shushtar","name":"شوشتر","province_slug":"khuzestan"},
    {"slug":"dezful","name":"دزفول","province_slug":"khuzestan"},
    {"slug":"bam","name":"بم","province_slug":"kerman"},
    {"slug":"mahan","name":"ماهان","province_slug":"kerman"},
    {"slug":"jolfa","name":"جلفا","province_slug":"east-azerbaijan"},
    {"slug":"sareyn","name":"سرعین","province_slug":"ardabil"},
    {"slug":"masal","name":"ماسال","province_slug":"gilan"},
    {"slug":"fuman","name":"فومن","province_slug":"gilan"},
    {"slug":"kalat","name":"کلات","province_slug":"razavi-khorasan"},
    {"slug":"neyshabur","name":"نیشابور","province_slug":"razavi-khorasan"},
    {"slug":"marvdasht","name":"مرودشت","province_slug":"fars"},
    {"slug":"firuzabad","name":"فیروزآباد","province_slug":"fars"},
    {"slug":"rudbar","name":"رودبار","province_slug":"gilan"},
    {"slug":"urmia","name":"ارومیه","province_slug":"west-azerbaijan"},
    {"slug":"ahvaz","name":"اهواز","province_slug":"khuzestan"},
    {"slug":"qom","name":"قم","province_slug":"qom"},
    {"slug":"karaj","name":"کرج","province_slug":"alborz"},
    {"slug":"shahrekord","name":"شهرکرد","province_slug":"chaharmahal-and-bakhtiari"},
    {"slug":"yasuj","name":"یاسوج","province_slug":"kohgiluyeh-and-boyer-ahmad"},
    {"slug":"arak","name":"اراک","province_slug":"markazi"},
    {"slug":"ilam","name":"ایلام","province_slug":"ilam"},
    {"slug":"birjand","name":"بیرجند","province_slug":"south-khorasan"},
    {"slug":"bojnord","name":"بجنورد","province_slug":"north-khorasan"},
    {"slug":"semnan","name":"سمنان","province_slug":"semnan"},
    {"slug":"zanjan","name":"زنجان","province_slug":"zanjan"},
    {"slug":"zahedan","name":"زاهدان","province_slug":"sistan-and-baluchestan"},
    {"slug":"susa","name":"شوش","province_slug":"khuzestan"},
    {"slug":"abadan","name":"آبادان","province_slug":"khuzestan"},
    {"slug":"khorramshahr","name":"خرمشهر","province_slug":"khuzestan"},
    {"slug":"izeh","name":"ایذه","province_slug":"khuzestan"},
    {"slug":"uraman-takht","name":"اورامان تخت","province_slug":"kurdistan"},
    {"slug":"baneh","name":"بانه","province_slug":"kurdistan"},
    {"slug":"saqqez","name":"سقز","province_slug":"kurdistan"},
    {"slug":"kamiyaran","name":"کامیاران","province_slug":"kurdistan"},
    {"slug":"takab","name":"تکاب","province_slug":"west-azerbaijan"},
    {"slug":"khoy","name":"خوی","province_slug":"west-azerbaijan"},
    {"slug":"mahabad","name":"مهاباد","province_slug":"west-azerbaijan"},
    {"slug":"maku","name":"ماکو","province_slug":"west-azerbaijan"},
    {"slug":"sardasht","name":"سردشت","province_slug":"west-azerbaijan"},
    {"slug":"meshgin-shahr","name":"مشگین‌شهر","province_slug":"ardabil"},
    {"slug":"khalkhal","name":"خلخال","province_slug":"ardabil"},
    {"slug":"germi","name":"گرمی","province_slug":"ardabil"},
    {"slug":"borujerd","name":"بروجرد","province_slug":"lorestan"},
    {"slug":"dorud","name":"دورود","province_slug":"lorestan"},
    {"slug":"aligudarz","name":"الیگودرز","province_slug":"lorestan"},
    {"slug":"pol-dokhtar","name":"پلدختر","province_slug":"lorestan"},
    {"slug":"soltaniyeh","name":"سلطانیه","province_slug":"zanjan"},
    {"slug":"abhar","name":"ابهر","province_slug":"zanjan"},
    {"slug":"mahneshan","name":"ماهنشان","province_slug":"zanjan"},
    {"slug":"shahrud","name":"شاهرود","province_slug":"semnan"},
    {"slug":"damghan","name":"دامغان","province_slug":"semnan"},
    {"slug":"garmsar","name":"گرمسار","province_slug":"semnan"},
    {"slug":"bandar-torkaman","name":"بندر ترکمن","province_slug":"golestan"},
    {"slug":"gonbad-e-kavus","name":"گنبدکاووس","province_slug":"golestan"},
    {"slug":"kordkuy","name":"کردکوی","province_slug":"golestan"},
    {"slug":"minudasht","name":"مینودشت","province_slug":"golestan"},
    {"slug":"lalejin","name":"لالجین","province_slug":"hamadan"},
    {"slug":"malayer","name":"ملایر","province_slug":"hamadan"},
    {"slug":"tuyserkan","name":"تویسرکان","province_slug":"hamadan"},
    {"slug":"nahavand","name":"نهاوند","province_slug":"hamadan"},
    {"slug":"paveh","name":"پاوه","province_slug":"kermanshah"},
    {"slug":"javanrud","name":"جوانرود","province_slug":"kermanshah"},
    {"slug":"qasr-e-shirin","name":"قصر شیرین","province_slug":"kermanshah"},
    {"slug":"kangavar","name":"کنگاور","province_slug":"kermanshah"},
    {"slug":"harsin","name":"هرسین","province_slug":"kermanshah"},
    {"slug":"borazjan","name":"برازجان","province_slug":"bushehr"},
    {"slug":"ganaveh","name":"گناوه","province_slug":"bushehr"},
    {"slug":"kangan","name":"کنگان","province_slug":"bushehr"},
    {"slug":"assaluyeh","name":"عسلویه","province_slug":"bushehr"},
    {"slug":"khormoj","name":"خورموج","province_slug":"bushehr"},
    {"slug":"meybod","name":"میبد","province_slug":"yazd"},
    {"slug":"ardakan","name":"اردکان","province_slug":"yazd"},
    {"slug":"taft","name":"تفت","province_slug":"yazd"},
    {"slug":"mehriz","name":"مهریز","province_slug":"yazd"},
    {"slug":"bandar-lengeh","name":"بندر لنگه","province_slug":"hormozgan"},
    {"slug":"minab","name":"میناب","province_slug":"hormozgan"},
    {"slug":"hormoz","name":"هرمز","province_slug":"hormozgan"},
    {"slug":"hengam","name":"هنگام","province_slug":"hormozgan"},
    {"slug":"rafsanjan","name":"رفسنجان","province_slug":"kerman"},
    {"slug":"sirjan","name":"سیرجان","province_slug":"kerman"},
    {"slug":"jiroft","name":"جیرفت","province_slug":"kerman"},
    {"slug":"shahdad","name":"شهداد","province_slug":"kerman"},
    {"slug":"kelardasht","name":"کلاردشت","province_slug":"mazandaran"},
    {"slug":"amol","name":"آمل","province_slug":"mazandaran"},
    {"slug":"nowshahr","name":"نوشهر","province_slug":"mazandaran"},
    {"slug":"babol","name":"بابل","province_slug":"mazandaran"},
    {"slug":"babolsar","name":"بابلسر","province_slug":"mazandaran"},
    {"slug":"behshahr","name":"بهشهر","province_slug":"mazandaran"},
    {"slug":"astara","name":"آستارا","province_slug":"gilan"},
    {"slug":"rudsar","name":"رودسر","province_slug":"gilan"},
    {"slug":"kiashahr","name":"بندر کیاشهر","province_slug":"gilan"},
    {"slug":"kazerun","name":"کازرون","province_slug":"fars"},
    {"slug":"sepidan","name":"سپیدان","province_slug":"fars"},
    {"slug":"lar","name":"لار","province_slug":"fars"},
    {"slug":"jahrom","name":"جهرم","province_slug":"fars"},
    {"slug":"eqlid","name":"اقلید","province_slug":"fars"},
    {"slug":"sabzevar","name":"سبزوار","province_slug":"razavi-khorasan"},
    {"slug":"torbat-e-heydariyeh","name":"تربت حیدریه","province_slug":"razavi-khorasan"},
    {"slug":"gonabad","name":"گناباد","province_slug":"razavi-khorasan"},
    {"slug":"khaf","name":"خواف","province_slug":"razavi-khorasan"},
    {"slug":"rey","name":"ری","province_slug":"tehran"},
    {"slug":"damavand","name":"دماوند","province_slug":"tehran"},
    {"slug":"lavasan","name":"لواسان","province_slug":"tehran"},
    {"slug":"firuzkuh","name":"فیروزکوه","province_slug":"tehran"},
    {"slug":"shemshak","name":"شمشک","province_slug":"tehran"},
    {"slug":"kilan","name":"کیلان","province_slug":"tehran"},
    {"slug":"natanz","name":"نطنز","province_slug":"isfahan"},
    {"slug":"nain","name":"نائین","province_slug":"isfahan"},
    {"slug":"khansar","name":"خوانسار","province_slug":"isfahan"},
    {"slug":"golpayegan","name":"گلپایگان","province_slug":"isfahan"},
    {"slug":"semirom","name":"سمیرم","province_slug":"isfahan"},
    {"slug":"varzaneh","name":"ورزنه","province_slug":"isfahan"},
    {"slug":"aran-va-bidgol","name":"آران و بیدگل","province_slug":"isfahan"},
    {"slug":"abuzeydabad","name":"ابوزیدآباد","province_slug":"isfahan"},
    {"slug":"takestan","name":"تاکستان","province_slug":"qazvin"},
    {"slug":"moallem-kalayeh","name":"معلم‌کلایه","province_slug":"qazvin"},
    {"slug":"avaj","name":"آوج","province_slug":"qazvin"},
    {"slug":"shirvan","name":"شیروان","province_slug":"north-khorasan"},
    {"slug":"esfarayen","name":"اسفراین","province_slug":"north-khorasan"},
    {"slug":"jajarm","name":"جاجرم","province_slug":"north-khorasan"},
    {"slug":"tabas","name":"طبس","province_slug":"south-khorasan"},
    {"slug":"ferdows","name":"فردوس","province_slug":"south-khorasan"},
    {"slug":"qayen","name":"قائن","province_slug":"south-khorasan"},
    {"slug":"nehbandan","name":"نهبندان","province_slug":"south-khorasan"},
    {"slug":"sarbisheh","name":"سربیشه","province_slug":"south-khorasan"},
    {"slug":"zabol","name":"زابل","province_slug":"sistan-and-baluchestan"},
    {"slug":"iranshahr","name":"ایرانشهر","province_slug":"sistan-and-baluchestan"},
    {"slug":"khash","name":"خاش","province_slug":"sistan-and-baluchestan"},
    {"slug":"saravan","name":"سراوان","province_slug":"sistan-and-baluchestan"},
    {"slug":"bandar-gavater","name":"بندر گواتر","province_slug":"sistan-and-baluchestan"},
    {"slug":"maragheh","name":"مراغه","province_slug":"east-azerbaijan"},
    {"slug":"marand","name":"مرند","province_slug":"east-azerbaijan"},
    {"slug":"ahar","name":"اهر","province_slug":"east-azerbaijan"},
    {"slug":"kaleybar","name":"کلیبر","province_slug":"east-azerbaijan"},
    {"slug":"kandovan","name":"کندوان","province_slug":"east-azerbaijan"},
    {"slug":"taleqan","name":"طالقان","province_slug":"alborz"},
    {"slug":"asara","name":"آسارا","province_slug":"alborz"},
    {"slug":"borujen","name":"بروجن","province_slug":"chaharmahal-and-bakhtiari"},
    {"slug":"chelgerd","name":"چلگرد","province_slug":"chaharmahal-and-bakhtiari"},
    {"slug":"saman","name":"سامان","province_slug":"chaharmahal-and-bakhtiari"},
    {"slug":"mehran","name":"مهران","province_slug":"ilam"},
    {"slug":"dehloran","name":"دهلران","province_slug":"ilam"},
    {"slug":"darreh-shahr","name":"دره‌شهر","province_slug":"ilam"},
    {"slug":"gachsaran","name":"گچساران","province_slug":"kohgiluyeh-and-boyer-ahmad"},
    {"slug":"sisakht","name":"سی‌سخت","province_slug":"kohgiluyeh-and-boyer-ahmad"},
    {"slug":"dehdasht","name":"دهدشت","province_slug":"kohgiluyeh-and-boyer-ahmad"},
    {"slug":"mahallat","name":"محلات","province_slug":"markazi"},
    {"slug":"khomein","name":"خمین","province_slug":"markazi"},
    {"slug":"saveh","name":"ساوه","province_slug":"markazi"},
    {"slug":"tafresh","name":"تفرش","province_slug":"markazi"},
    {"slug":"kahak","name":"کهک","province_slug":"qom"}
  ]
  $json$::jsonb) WITH ORDINALITY AS item(value, desired_order)
), missing AS (
  SELECT candidates.*, ROW_NUMBER() OVER (ORDER BY desired_order) AS missing_order
  FROM candidates
  WHERE NOT EXISTS (
    SELECT 1 FROM "Destination"
    WHERE "type" = 'CITY'::"DestinationType"
      AND "slug" = candidates.slug
  )
), order_boundary AS (
  SELECT COALESCE(MAX("displayOrder"), 0) AS last_order
  FROM "Destination"
  WHERE "type" = 'CITY'::"DestinationType"
)
INSERT INTO "Destination" (
  "id", "type", "slug", "name", "description", "imageUrl",
  "parentProvinceId", "isFeatured", "displayOrder", "primarySourceUrl",
  "sourceType", "notes", "publicationStatus", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), 'CITY'::"DestinationType", missing.slug, missing.name,
  missing.name || ' از شهرهای مهم استان ' || province."name" || ' است و جاذبه‌های شهری، فرهنگی یا طبیعی آن می‌تواند بخشی از برنامه سفر به این منطقه باشد.',
  NULL, province."id", false, order_boundary.last_order + missing.missing_order,
  NULL, NULL, NULL, 'PUBLISHED'::"PublicationStatus",
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM missing
CROSS JOIN order_boundary
JOIN "Destination" province
  ON province."type" = 'PROVINCE'::"DestinationType"
 AND province."slug" = missing.province_slug
ON CONFLICT ("type", "slug") DO NOTHING;
