// Verify the restored original hair contour against the previous atlas/renderer.
// Usage: node tools/audit-hair-underside.mjs <backed-up project directory>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { frameSvg } from '../build.mjs';
import { framePose, ROWS } from '../src/poses.mjs';
import { RIGHT_HAIR_UNDERSIDE } from './rig-parts.mjs';

if (!process.argv[2]) throw new Error('Provide the backed-up project directory.');
const previous = path.resolve(process.argv[2]);
const old = await import(pathToFileURL(path.join(previous, 'build.mjs')));
const oldPose = await import(pathToFileURL(path.join(previous, 'src/poses.mjs')));
assert.deepEqual(ROWS, oldPose.ROWS, 'Frame counts and durations must remain unchanged.');
const beforePath = path.join(previous, 'final/spritesheet.webp');
const afterPath = 'final/spritesheet.webp';
const [before, after] = await Promise.all([beforePath, afterPath].map(p => sharp(p).ensureAlpha().raw().toBuffer()));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function render(svg, mirror) {
  let img = sharp(Buffer.from(svg)).ensureAlpha();
  if (mirror) img = img.flop();
  const raw = await img.raw().toBuffer();
  for (let k = 0; k < raw.length; k += 4) if (!raw[k + 3]) raw[k] = raw[k + 1] = raw[k + 2] = 0;
  return raw;
}
const cells = [];
let changedPixels = 0, revised = 0, preserved = 0, lensFrames = 0;
for (const row of ROWS) for (let i = 0; i < row.frames; i++) {
  const state = row.mirrorOf ?? row.state, pose = framePose(state, i);
  const basePose = oldPose.framePose(state, i), hairPose = structuredClone(pose);
  if (state === 'running') hairPose.hide = hairPose.hide.filter(id => id !== 'crease-fl');
  if (state === 'running' && i === 0) hairPose.parts['leg-front-left'] = structuredClone(basePose.parts['leg-front-left']);
  if (state === 'review') delete hairPose.fringeYScale;
  assert.deepEqual(hairPose, basePose, `Unapproved pose change: ${row.state} ${i + 1}`);
  const svg = frameSvg(pose), hairSvg = frameSvg(hairPose), oldSvg = old.frameSvg(basePose);
  const restored = !!pose.fixedJaw;
  const removed = restored ? hairSvg.replace(RIGHT_HAIR_UNDERSIDE, '') : hairSvg;
  if (removed !== oldSvg) throw new Error(`${row.state} ${i + 1}: unrelated SVG change.`);
  const [baseline, current] = await Promise.all([render(oldSvg, !!row.mirrorOf), render(svg, !!row.mirrorOf)]);
  const col = row.state === 'look' ? i % 8 : i;
  const r = row.row + (row.state === 'look' ? Math.floor(i / 8) : 0);
  let changed = 0;
  for (let y = 0; y < 208; y++) for (let x = 0; x < 192; x++) {
    const local = (y * 192 + x) * 4, atlas = ((r * 208 + y) * 1536 + col * 192 + x) * 4;
    if (!baseline.subarray(local, local + 4).equals(before.subarray(atlas, atlas + 4))) throw new Error(`Backup atlas mismatch: ${row.state} ${i + 1}`);
    if (!current.subarray(local, local + 4).equals(after.subarray(atlas, atlas + 4))) throw new Error(`Final atlas mismatch: ${row.state} ${i + 1}`);
    if (!before.subarray(atlas, atlas + 4).equals(after.subarray(atlas, atlas + 4))) changed++;
  }
  if (!restored && state !== 'review' && changed) throw new Error(`Unapproved cell changed: ${row.state} ${i + 1}`);
  if (restored && !changed) throw new Error(`Hair contour not restored: ${row.state} ${i + 1}`);
  if (restored) revised++;
  else if (state === 'review') lensFrames++;
  else preserved++;
  changedPixels += changed;
  cells.push({ state: row.state, frame: i + 1, restored_original_hair_underside: restored, changed_pixels: changed });
}
if (revised !== 43 || preserved !== 24 || lensFrames !== 6) throw new Error(`Unexpected affected scope: ${revised}/${preserved}/${lensFrames}`);
fs.writeFileSync('qa/hair-underside-audit.json', JSON.stringify({
  ok: true, before_sha256: sha(beforePath), atlas_sha256: sha(afterPath),
  method: 'Remove the restored original cubic and the explicitly requested pose changes (hide the typing shoulder crease; rotate the first typing paw -20 degrees around its shoulder with the key contact preserved; shorten the review lower fringe to 0.9). Compare the resulting SVG and pose exactly with the backed-up renderer, then compare every rendered cell with both decoded RGBA atlases, including mirrored cells.',
  restored_path: RIGHT_HAIR_UNDERSIDE, restored_cells: revised, preserved_cells: preserved, review_fringe_cells: lensFrames,
  changed_pixels: changedPixels, unrelated_svg_or_pose_changes: 0,
  movement_and_failed_rgba_preserved: true, other_poses_and_all_timings_preserved: true, cells,
}, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, restored_cells: revised, preserved_cells: preserved, changed_pixels: changedPixels }));
