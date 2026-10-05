// 원본 doro.svg와 경량 리그(파츠 숨김)를 펫 배율(1×)·2×로 렌더해 비교한다.
// 출력: qa/base-compare.png (원본 | 리그 | 차이×4, 흰/어두운 배경), qa/base-compare.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CELL } from '../src/poses.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'source/doro.svg');
const RIG = path.join(root, 'src/doro-rig.svg');

const sized = (svg, px) => svg.replace(/ width="\d+" height="\d+"/, '').replace('<svg ', `<svg width="${px}" height="${px}" `);

async function render(svg, px, bg) {
  const fg = await sharp(Buffer.from(sized(svg, px))).ensureAlpha().png().toBuffer();
  return sharp({ create: { width: px, height: px, channels: 4, background: bg } })
    .composite([{ input: fg }]).removeAlpha().raw().toBuffer();
}

const orig = fs.readFileSync(SOURCE, 'utf8');
const rig = fs.readFileSync(RIG, 'utf8');
const report = { rig_bytes: Buffer.byteLength(rig), source_bytes: Buffer.byteLength(orig), scale: CELL.scale, results: [] };
const tiles = [];
for (const mult of [1, 2]) {
  const px = Math.round(400 * CELL.scale * mult);
  for (const [bgName, bg] of [['white', '#ffffff'], ['dark', '#20242c']]) {
    const a = await render(orig, px, bg);
    const b = await render(rig, px, bg);
    const diff = Buffer.alloc(a.length);
    let sum = 0, over16 = 0, over48 = 0, max = 0;
    for (let i = 0; i < a.length; i += 3) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      sum += d; max = Math.max(max, d);
      if (d > 16) over16++;
      if (d > 48) over48++;
      diff[i] = diff[i + 1] = diff[i + 2] = Math.min(255, d * 4);
    }
    const n = a.length / 3;
    report.results.push({ size_px: px, multiplier: mult, background: bgName,
      mean_abs_diff: +(sum / n).toFixed(3), max_diff: max,
      pct_pixels_diff_gt16: +(100 * over16 / n).toFixed(3), pct_pixels_diff_gt48: +(100 * over48 / n).toFixed(3) });
    const raw = { raw: { width: px, height: px, channels: 3 } };
    tiles.push({ px, row: tiles.length, imgs: [await sharp(a, raw).png().toBuffer(), await sharp(b, raw).png().toBuffer(), await sharp(diff, raw).png().toBuffer()] });
  }
}
// 시트 조립
const W = Math.max(...tiles.map((t) => t.px)) * 3 + 40, H = tiles.reduce((h, t) => h + t.px + 10, 10);
let y = 10; const comps = [];
for (const t of tiles) { t.imgs.forEach((input, i) => comps.push({ input, left: 10 + i * (t.px + 10), top: y })); y += t.px + 10; }
fs.mkdirSync(path.join(root, 'qa'), { recursive: true });
await sharp({ create: { width: W, height: H, channels: 3, background: '#808080' } }).composite(comps).png().toFile(path.join(root, 'qa/base-compare.png'));
fs.writeFileSync(path.join(root, 'qa/base-compare.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
