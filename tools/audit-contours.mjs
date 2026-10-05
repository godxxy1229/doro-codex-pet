// Ensure the chin line connects to both moving side locks in all revised poses.
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { frameSvg } from '../build.mjs';
import { framePose, PIVOTS, CELL } from '../src/poses.mjs';
const round = (x) => +x.toFixed(2);
function part(point, id, pose) {
  const p = pose.parts[id] ?? {}, [cx, cy] = PIVOTS[id] ?? [0, 0];
  let x = (point[0] - cx) * round(p.sx ?? 1), y = (point[1] - cy) * round(p.sy ?? 1);
  const a = round(p.r ?? 0) * Math.PI / 180;
  return [cx + x * Math.cos(a) - y * Math.sin(a) + round(p.tx ?? 0),
    cy + x * Math.sin(a) + y * Math.cos(a) + round(p.ty ?? 0)];
}
function pixel(point, pose, lock) {
  if (lock) point = part(point, lock, pose);
  point = part(part(point, 'head', pose), 'doro', pose);
  return [(CELL.ox + point[0] * CELL.scale) * 4, (CELL.oy + point[1] * CELL.scale) * 4];
}
function inverse(point, id, pose) {
  const p = pose.parts[id] ?? {}, [cx, cy] = PIVOTS[id] ?? [0, 0];
  const x = point[0] - round(p.tx ?? 0) - cx, y = point[1] - round(p.ty ?? 0) - cy;
  const a = -round(p.r ?? 0) * Math.PI / 180;
  return [cx + (x * Math.cos(a) - y * Math.sin(a)) / round(p.sx ?? 1),
    cy + (x * Math.sin(a) + y * Math.cos(a)) / round(p.sy ?? 1)];
}
const checks = [];
for (const [state, count] of [['idle', 6], ['waving', 4], ['jumping', 5], ['waiting', 6], ['running', 6], ['look', 16]]) {
  for (let i = 0; i < count; i++) {
    const pose = framePose(state, i), solo = structuredClone(pose);
    solo.hide.push('body-group', 'keyboard', 'eyes', 'lashes', 'mouth', 'tears', 'magnifier', 'paw-hold');
    const { data, info } = await sharp(Buffer.from(frameSvg(solo)), { density: 288 })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const mask = new Uint8Array(info.width * info.height);
    for (let k = 0; k < mask.length; k++) {
      const xy = [(k % info.width / 4 - CELL.ox) / CELL.scale,
        (Math.floor(k / info.width) / 4 - CELL.oy) / CELL.scale];
      const local = inverse(inverse(xy, 'doro', pose), 'head', pose);
      mask[k] = local[1] >= 242 && local[1] <= 281 && data[k * 4] < 80 && data[k * 4 + 1] < 80 && data[k * 4 + 2] < 80 && data[k * 4 + 3] > 100;
    }
    function nearest(point) {
      let best = -1, distance = Infinity;
      for (let y = Math.round(point[1]) - 6; y <= point[1] + 6; y++) for (let x = Math.round(point[0]) - 6; x <= point[0] + 6; x++) {
        if (x < 0 || x >= info.width || y < 0 || y >= info.height || !mask[y * info.width + x]) continue;
        const d = Math.hypot(x - point[0], y - point[1]);
        if (d < distance) { distance = d; best = y * info.width + x; }
      }
      if (best < 0) throw new Error(`${state} ${i + 1}: contour anchor missing.`);
      return best;
    }
    const seed = nearest(pixel([123, 274], pose));
    const targets = [nearest(pixel([80, 267], pose, 'hair-side-left')), nearest(pixel([162, 272], pose, 'hair-side-right'))];
    const seen = new Uint8Array(mask.length), queue = [seed]; seen[seed] = 1;
    for (let n = 0; n < queue.length; n++) {
      const q = queue[n], x = q % info.width, y = Math.floor(q / info.width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, t = yy * info.width + xx;
        if (xx >= 0 && xx < info.width && yy >= 0 && yy < info.height && mask[t] && !seen[t]) { seen[t] = 1; queue.push(t); }
      }
    }
    if (targets.some((t) => !seen[t])) throw new Error(`${state} ${i + 1}: jaw and side lock are disconnected.`);
    const isolated = structuredClone(solo);
    isolated.hide.push('face', 'face-details', 'bangs', 'hair-side-left', 'hair-side-right', 'hair-back', 'ribbon-tails', 'rose', 'bow');
    const svg = frameSvg(isolated);
    const [border, skin] = await Promise.all([svg, svg.replace('filter="url(#jaw-outline-filter)"', '').replace('mask="url(#jaw-curve-mask)"', '')]
      .map((s) => sharp(Buffer.from(s), { density: 288 }).ensureAlpha().raw().toBuffer()));
    let interior = 0, beyondLeft = 0, beyondRight = 0;
    const left = part([80, 267], 'hair-side-left', pose);
    const right = part([162, 272], 'hair-side-right', pose);
    // The mask ends at the hair's inner contour. Unlike a round cap, its flat
    // ends cannot extend the chin curve past either lock into the hair tip.
    const outsideEnd = (point, anchor, direction) =>
      ((point[0] - anchor[0]) * direction[0] + (point[1] - anchor[1]) * direction[1]) / Math.hypot(...direction) > 0.8;
    for (let j = 3; j < border.length; j += 4) {
      if (border[j] > 32 && skin[j] > 250) interior++;
      if (border[j] <= 200) continue;
      const k = (j - 3) / 4;
      const xy = [(k % info.width / 4 - CELL.ox) / CELL.scale,
        (Math.floor(k / info.width) / 4 - CELL.oy) / CELL.scale];
      const local = inverse(inverse(xy, 'doro', pose), 'head', pose);
      if (local[0] < left[0] + 12 && outsideEnd(local, left, [-14, -7])) beyondLeft++;
      if (local[0] > right[0] - 12 && outsideEnd(local, right, [12, -3])) beyondRight++;
    }
    if (interior) throw new Error(`${state} ${i + 1}: ${interior} border pixels inside solid cheek.`);
    if (beyondLeft || beyondRight) throw new Error(`${state} ${i + 1}: chin extends beyond a hair anchor (${beyondLeft}/${beyondRight}).`);
    checks.push({ state, frame: i + 1, left_connected: true, right_connected: true, border_pixels_inside_solid_face: interior,
      chin_pixels_past_left_hair_anchor: beyondLeft, chin_pixels_past_right_hair_anchor: beyondRight });
  }
}
fs.writeFileSync('qa/contour-audit.json', JSON.stringify({ ok: true,
  atlas_sha256: crypto.createHash('sha256').update(fs.readFileSync('final/spritesheet.webp')).digest('hex'),
  method: '4x SVG render; lower-face ink connects both moving locks; exterior-only skin border is limited to the chin arc with flat ends; zero ink inside opaque cheeks or beyond either hair anchor (0.8 grid raster tolerance)',
  checks }, null, 2) + '\n');
console.log(`Jaw contours connected in ${checks.length} poses.`);
