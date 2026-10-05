// Verify that this repair changes only the old chin border / fringe remnant.
// Usage: node tools/audit-artwork-scope.mjs <backed-up project directory>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { ROWS } from '../src/poses.mjs';

const previous = path.resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Provide the backed-up project directory.');
const { frameSvg } = await import(pathToFileURL(path.join(previous, 'build.mjs')));
const { framePose } = await import(pathToFileURL(path.join(previous, 'src/poses.mjs')));
const before = await sharp(path.join(previous,'final/spritesheet.webp')).ensureAlpha().raw().toBuffer();
const after = await sharp('final/spritesheet.webp').ensureAlpha().raw().toBuffer();
const remnant = /<path\b[^>]* d="M148 207q-5 0-7 3h7q3-2 0-3"[^>]*\/>/g;
async function render(svg, mirror) {
  let img = sharp(Buffer.from(svg)).ensureAlpha();
  if (mirror) img = img.flop();
  const raw = await img.raw().toBuffer();
  for (let j=0;j<raw.length;j+=4) if (!raw[j+3]) raw[j]=raw[j+1]=raw[j+2]=0;
  return raw;
}
const cells = [];
let total = 0;
for (const row of ROWS) {
  for (let frame=0;frame<row.frames;frame++) {
    const pose=framePose(row.mirrorOf ?? row.state,frame);
    const original=frameSvg(pose);
    pose.hide.push('jaw-contour');
    const withoutTargets=frameSvg(pose).replace(remnant,'');
    const [source, scope]=await Promise.all([render(original,!!row.mirrorOf),render(withoutTargets,!!row.mirrorOf)]);
    const col=row.state==='look'?frame%8:frame;
    const atlasRow=row.row+(row.state==='look'?Math.floor(frame/8):0);
    let changed=0;
    for (let y=0;y<208;y++) for(let x=0;x<192;x++) {
      const local=(y*192+x)*4, atlas=((atlasRow*208+y)*1536+col*192+x)*4;
      if (!source.subarray(local,local+4).equals(before.subarray(atlas,atlas+4))) throw new Error(`Backup rendering mismatch: ${row.state} ${frame+1}`);
      if (before.subarray(atlas,atlas+4).equals(after.subarray(atlas,atlas+4))) continue;
      changed++;
      if (source.subarray(local,local+4).equals(scope.subarray(local,local+4))) throw new Error(`Unrelated pixel changed: ${row.state} ${frame+1} (${x},${y})`);
    }
    cells.push({state:row.state,frame:frame+1,changed_pixels:changed,outside_target_pixels:0});
    total+=changed;
  }
}
const report={ok:true,atlas_sha256:crypto.createHash('sha256').update(fs.readFileSync('final/spritesheet.webp')).digest('hex'),
  method:'Compare each final RGBA cell with the backed-up renderer and atlas; affected scope is only pixels painted by the previous chin border or embedded fringe upper-eye remnant, including mirrored cells and the review lens.',
  changed_pixels:total,outside_target_pixels:0,all_other_body_face_eye_hair_pixels_preserved:true,cells};
fs.writeFileSync('qa/artwork-scope.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ok:true,changed_pixels:total,outside_target_pixels:0}));
