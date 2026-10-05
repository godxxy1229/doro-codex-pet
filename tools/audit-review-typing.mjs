// Verify the magnified iris has no pink hair paint and typing has no stale crease.
// Usage: node tools/audit-review-typing.mjs <previous project directory>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { frameSvg } from '../build.mjs';
import { framePose, PIVOTS, CELL } from '../src/poses.mjs';
const previous = path.resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Provide the backed-up project directory.');
const old = await import(pathToFileURL(path.join(previous, 'build.mjs')));
const oldPose = await import(pathToFileURL(path.join(previous, 'src/poses.mjs')));
async function pinkInIris(renderer, pose) {
  const ref = structuredClone(pose); ref.hide.push('bangs');
  const mark = renderer(ref).replaceAll('fill="url(#gIris)"', 'fill="#00ff00"');
  const [mask, actual] = await Promise.all([mark, renderer(pose)].map(svg =>
    sharp(Buffer.from(svg), {density:288}).ensureAlpha().raw().toBuffer()));
  let samples = 0, pink = 0;
  function transform(point, id) {
    const t=pose.parts[id] ?? {}, [cx,cy]=PIVOTS[id], a=+(t.r??0).toFixed(2)*Math.PI/180;
    const x=(point[0]-cx)*+(t.sx??1).toFixed(2), y=(point[1]-cy)*+(t.sy??1).toFixed(2);
    return [cx+x*Math.cos(a)-y*Math.sin(a)+(t.tx??0), cy+x*Math.sin(a)+y*Math.cos(a)+(t.ty??0)];
  }
  const center=transform(transform([94,217],'magnifier'),'doro');
  const lens=[(CELL.ox+center[0]*CELL.scale)*4,(CELL.oy+center[1]*CELL.scale)*4];
  for (let k = 0; k < mask.length; k += 4) {
    const pix=k/4;
    if (Math.hypot(pix%(192*4)-lens[0],Math.floor(pix/(192*4))-lens[1])>38*CELL.scale*4) continue;
    if (!(mask[k] < 75 && mask[k+1] > 210 && mask[k+2] < 75 && mask[k+3] > 220)) continue;
    samples++;
    // The iris is purple. Pink hair has a much higher red component than green.
    if (actual[k] > 155 && actual[k] > actual[k+1]*1.14 && actual[k+2] > 120 && actual[k+1] < 210) pink++;
  }
  if (!samples) throw new Error('Iris reference mask is empty.');
  return {samples, pink};
}
const review = [], typing = [];
for (let i = 0; i < 6; i++) {
  const [before, after] = await Promise.all([
    pinkInIris(old.frameSvg, oldPose.framePose('review', i)),
    pinkInIris(frameSvg, framePose('review', i)),
  ]);
  if (after.pink) throw new Error(`Review ${i+1}: ${after.pink} pink pixels within exposed iris.`);
  review.push({frame:i+1,before_pink_pixels:before.pink,after_pink_pixels:after.pink,iris_reference_pixels:after.samples});
  const pose = framePose('running', i);
  const svg = frameSvg(pose);
  if (!/<path\b[^>]*id="crease-fl"[^>]*display="none"/.test(svg)) throw new Error(`Typing ${i+1}: stationary shoulder crease still visible.`);
  const keyHand = i % 2 === 0 ? 'left' : 'right';
  if ((pose.parts[`leg-front-${keyHand}`].r ?? 0) !== (i === 0 ? -20 : 0)) throw new Error('Typing rotation differs from the approved first-frame repair.');
  typing.push({frame:i+1,stationary_shoulder_crease_hidden:true,pressing_paw_rotation:i===0?-20:0});
}
fs.writeFileSync('qa/review-typing-artifact-audit.json', JSON.stringify({ok:true,
  atlas_sha256:crypto.createHash('sha256').update(fs.readFileSync('final/spritesheet.webp')).digest('hex'),
  method:'4x SVG renders: count pink paint within the unobstructed iris fill mask inside the transformed lens circle. Verify the stationary crease is hidden on all six typing poses; native-size and enlarged forepaw shape is independently reviewed.',
  review, typing},null,2)+'\n');
console.log(JSON.stringify({ok:true,review,typing_frames:typing.length}));
