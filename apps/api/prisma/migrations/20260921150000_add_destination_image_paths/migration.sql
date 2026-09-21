-- Fill image paths for the newly illustrated destinations without replacing
-- an image that an administrator has already configured.
UPDATE "Destination" AS destination
SET
  "imageUrl" = image.path,
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  VALUES
    ('PROVINCE', 'east-azerbaijan', '/images/provinces/east-azerbaijan.webp'),
    ('PROVINCE', 'kermanshah', '/images/provinces/kermanshah.webp'),
    ('PROVINCE', 'qom', '/images/provinces/qom.webp'),
    ('PROVINCE', 'golestan', '/images/provinces/golestan.webp'),
    ('PROVINCE', 'hamadan', '/images/provinces/hamadan.webp'),
    ('PROVINCE', 'chaharmahal-and-bakhtiari', '/images/provinces/chaharmahal-and-bakhtiari.webp'),
    ('PROVINCE', 'kohgiluyeh-and-boyer-ahmad', '/images/provinces/kohgiluyeh-and-boyer-ahmad.webp'),
    ('PROVINCE', 'alborz', '/images/provinces/alborz.webp'),
    ('PROVINCE', 'markazi', '/images/provinces/markazi.webp'),
    ('PROVINCE', 'ilam', '/images/provinces/ilam.webp'),
    ('CITY', 'yazd', '/images/cities/yazd.webp'),
    ('CITY', 'tabriz', '/images/cities/tabriz.webp'),
    ('CITY', 'kerman', '/images/cities/kerman.webp'),
    ('CITY', 'bandar-abbas', '/images/cities/bandar-abbas.webp'),
    ('CITY', 'ramsar', '/images/cities/ramsar.webp'),
    ('CITY', 'chalous', '/images/cities/chalous.webp'),
    ('CITY', 'hamadan', '/images/cities/hamadan.webp'),
    ('CITY', 'kermanshah', '/images/cities/kermanshah.webp'),
    ('CITY', 'sanandaj', '/images/cities/sanandaj.webp')
) AS image(type, slug, path)
WHERE destination."type" = image.type::"DestinationType"
  AND destination."slug" = image.slug
  AND NULLIF(BTRIM(destination."imageUrl"), '') IS NULL;
