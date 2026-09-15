import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const webRoot = new URL("../apps/web/", import.meta.url);
const webRequire = createRequire(new URL("package.json", webRoot));
const nextRequire = createRequire(webRequire.resolve("next/package.json"));
const sharp = nextRequire("sharp");
const brandRoot = new URL("public/brand/", webRoot);
const source = await readFile(new URL("hotelyab.svg", brandRoot), "utf8");

// Mobile platforms apply their own masks to a full-bleed background.
const fullBleed = source.replace('rx="16"', 'rx="0"');
const rasterize = (svg, size) =>
  sharp(Buffer.from(svg), { density: 1152 })
    .resize(size, size)
    .png()
    .toBuffer();

for (const size of [96, 192, 512]) {
  await writeFile(
    new URL(`icon-${size}.png`, brandRoot),
    await rasterize(source, size),
  );
}

// The entire white symbol fits within the central 80% maskable safe circle.
for (const [name, size] of [
  ["icon-maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
  ["icon-1024.png", 1024],
]) {
  await writeFile(new URL(name, brandRoot), await rasterize(fullBleed, size));
}

// ICO directory entries embed PNGs, preserving crisp edges at each native size.
const sizes = [16, 32, 48, 64, 256];
const images = await Promise.all(sizes.map((size) => rasterize(source, size)));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index] === 256 ? 0 : sizes[index];
  header[entry + 1] = header[entry];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(
  new URL("src/app/favicon.ico", webRoot),
  Buffer.concat([header, ...images]),
);
console.log(`Brand icons generated from ${fileURLToPath(new URL("hotelyab.svg", brandRoot))}`);
