// Pixel preservation and visible-iris/contact checks for the face + typing revision.
// Usage: node tools/audit-face-typing.mjs <previous atlas>
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { frameSvg } from '../build.mjs';
import { framePose, ROWS, TYPING_KEYS, PIVOTS } from '../src/poses.mjs';

const beforePath = process.argv[2];
if (!beforePath) throw new Error('Provide the previous encoded atlas.');
const afterPath = 'final/spritesheet.webp';
const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const [before, after] = await Promise.all([beforePath, afterPath].map((p) => sharp(p).ensureAlpha().raw().toBuffer()));
// The right hair's underside is restored only where the fixed chin is used.
// audit-hair-underside.mjs proves that no other part changes within those cells.
const allowedRows = new Set([0, 3, 4, 6, 7, 8, 9, 10]);
let outside = 0, changedPixels = 0;
const changedCells = new Set();
for (let k = 0; k < after.length; k += 4) {
  if (after.subarray(k, k + 4).equals(before.subarray(k, k + 4))) continue;
  const pixel = k / 4, row = Math.floor(Math.floor(pixel / 1536) / 208), col = Math.floor((pixel % 1536) / 192);
  changedPixels++;
  changedCells.add(`${row}:${col}`);
  if (!allowedRows.has(row)) outside++;
}
if (outside) throw new Error(`Changed ${outside} pixels outside the approved rows.`);

const hideOthers = ['keyboard', 'body-group', 'ribbon-tails', 'hair-back', 'face', 'face-details',
  'tears', 'mouth', 'bangs', 'lashes', 'hair-side-left', 'hair-side-right', 'rose', 'bow', 'magnifier', 'paw-hold'];
function markEye(svg, id) {
  return svg.replace(new RegExp(`(<g id="${id}"[^>]*>)([\\s\\S]*?)(</g>)`), (_, a, b, c) =>
    a + b.replace(/fill="(?:url\(#gIris\)|#fff)"/g, 'fill="#00ff00"') + c);
}
async function greenPixels(svg) {
  const rgba = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  let count = 0;
  for (let j = 0; j < rgba.length; j += 4) {
    if (rgba[j] < 35 && rgba[j + 1] > 220 && rgba[j + 2] < 35 && rgba[j + 3] > 220) count++;
  }
  return count;
}
const visibility = [];
for (const [state, frames] of [['waiting', 6], ['running', 6], ['look', 16]]) {
  for (let i = 0; i < frames; i++) {
    const p = framePose(state, i);
    const eyes = {};
    for (const side of ['left', 'right']) {
      const id = `eye-${side}`;
      const solo = structuredClone(p);
      solo.hide.push(...hideOthers, `eye-${side === 'left' ? 'right' : 'left'}`);
      const [visible, area] = await Promise.all([
        greenPixels(markEye(frameSvg(p), id)), greenPixels(markEye(frameSvg(solo), id)),
      ]);
      eyes[side] = { visible_pixels: visible, reference_pixels: area, ratio: +(visible / area).toFixed(4) };
      if (!area || visible / area < 0.85) throw new Error(`${state} ${i} ${side} iris visibility below 85%: ${visible}/${area}`);
    }
    visibility.push({ state, frame: i + 1, eyes });
  }
}
const contacts = TYPING_KEYS.map((key, i) => {
  const p = framePose('running', i).parts[`leg-front-${key.hand}`];
  const contact = key.hand === 'left' ? [96, 337] : [185, 361];
  const a = 12 * Math.PI / 180, y = key.y - 3;
  const expected = [128 + (key.x - 128) * Math.cos(a) - (y - 342) * Math.sin(a),
    342 + (key.x - 128) * Math.sin(a) + (y - 342) * Math.cos(a)];
  const [cx,cy] = PIVOTS[`leg-front-${key.hand}`], angle=(p.r??0)*Math.PI/180;
  const actual = [cx+(contact[0]-cx)*Math.cos(angle)-(contact[1]-cy)*Math.sin(angle)+(p.tx??0),
    cy+(contact[0]-cx)*Math.sin(angle)+(contact[1]-cy)*Math.cos(angle)+(p.ty??0)];
  const error = Math.hypot(actual[0] - expected[0], actual[1] - expected[1]);
  if (error > 0.02 || !framePose('running', i).show.includes(key.id)) throw new Error('Paw and lit key do not align.');
  return { frame: i + 1, key: key.id, hand: key.hand, row: key.row, key_center: [key.x, key.y], contact_error: error };
});
for (const side of ['left', 'right']) {
  if (new Set(TYPING_KEYS.filter((k) => k.hand === side).map((k) => k.row)).size !== 3) throw new Error('Each hand must use all three key rows.');
}
if (TYPING_KEYS.some((k, i) => i && k.hand === TYPING_KEYS[i - 1].hand)) throw new Error('Hands must alternate.');
const report = {
  ok: true, before_sha256: hash(beforePath), atlas_sha256: hash(afterPath),
  allowed_rows: [...allowedRows], changed_cells: [...changedCells], changed_pixels: changedPixels,
  pixels_changed_outside_allowed_rows: outside, minimum_iris_visibility: Math.min(...visibility.flatMap((v) => Object.values(v.eyes).map((e) => e.ratio))),
  iris_visibility: visibility, typing_contacts: contacts,
  durations: Object.fromEntries(ROWS.filter((r) => ['waiting', 'running'].includes(r.state)).map((r) => [r.state, r.durations])),
};
fs.writeFileSync('qa/face-typing-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, changed_cells: report.changed_cells.length, outside, minimum_iris_visibility: report.minimum_iris_visibility }));
