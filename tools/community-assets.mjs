// Build all community upload images from the final public atlas.
// Usage: node tools/community-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import crypto from 'node:crypto';
import { ROWS } from '../src/poses.mjs';
const out = 'build/community';
fs.mkdirSync(out, { recursive: true });
const composites = [];
let index = 0;
for (const state of ROWS) for (let i = 0; i < state.frames; i++) {
  const row = state.row + Math.floor(i / 8);
  const input = await sharp('package/spritesheet.webp')
    .extract({ left: (i % 8) * 192, top: row * 208, width: 192, height: 208 })
    .resize(96, 104, { kernel: 'nearest' }).png().toBuffer();
  composites.push({ input, left: index++ * 96, top: 0 });
}
if (index !== 73) throw new Error('Expected 73 preview frames.');
await sharp({ create: { width: 7008, height: 104, channels: 4, background: '#0000' } })
  .composite(composites).webp({ lossless: true, effort: 6, exact: true })
  .toFile(`${out}/preview.webp`);
const poster = await sharp('package/spritesheet.webp')
  .extract({ left: 0, top: 0, width: 192, height: 208 }).png().toBuffer();
await sharp(poster).webp({ lossless: true, exact: true }).toFile(`${out}/poster.webp`);
const share = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630">
<defs><filter id="shadow" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="15" stdDeviation="12" flood-opacity=".25"/></filter></defs>
<rect width="1200" height="630" fill="#e6dfc2"/>
<g font-family="Segoe UI, sans-serif" fill="#111"><text x="72" y="96" font-size="36" font-weight="600">Codex Pets</text>
<text x="72" y="214" font-size="84" font-weight="800">Doro</text>
<g font-size="30" fill="#646054"><text x="72" y="391">An unofficial Doro companion for</text><text x="72" y="434">Codex.</text></g>
<rect x="72" y="498" width="253" height="65" fill="#d5ef59" stroke="#111" stroke-width="3"/><text x="96" y="540" font-size="28" font-weight="700">codex-pets</text></g>
<image x="690" y="100" width="384" height="416" filter="url(#shadow)" xlink:href="data:image/png;base64,${poster.toString('base64')}"/></svg>`;
fs.writeFileSync(`${out}/share.svg`, share);
await sharp(Buffer.from(share)).png().toFile(`${out}/share.png`);
const assets = {};
for (const [name, width, height] of [['share.png', 1200, 630], ['poster.webp', 192, 208], ['preview.webp', 7008, 104]]) {
  const file = path.join(out, name), meta = await sharp(file).metadata();
  if (meta.width !== width || meta.height !== height) throw new Error(`Invalid ${name} dimensions.`);
  assets[name] = { width, height, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') };
}
fs.writeFileSync('qa/community-assets.json', JSON.stringify({ ok: true, frames: 73,
  all_artwork_from_current_atlas: true, assets }, null, 2) + '\n');
console.log('Community upload assets ready: 73 frames, validated dimensions.');
