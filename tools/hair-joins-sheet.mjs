// Native before/after and anonymous 4x right-hair joins for visual inspection.
import fs from 'node:fs';
import sharp from 'sharp';
import { CELL, PIVOTS, framePose } from '../src/poses.mjs';

const previous = process.argv[2];
if (!previous) throw new Error('Provide the previous project directory.');
function transform(point, id, pose) {
  const p = pose.parts[id] ?? {}, [cx, cy] = PIVOTS[id] ?? [0, 0];
  const a = +(p.r ?? 0).toFixed(2) * Math.PI / 180;
  const x = (point[0] - cx) * +(p.sx ?? 1).toFixed(2), y = (point[1] - cy) * +(p.sy ?? 1).toFixed(2);
  return [cx + x * Math.cos(a) - y * Math.sin(a) + +(p.tx ?? 0).toFixed(2),
    cy + x * Math.sin(a) + y * Math.cos(a) + +(p.ty ?? 0).toFixed(2)];
}
const parts = [], labels = [], width = 192, height = 176, columns = 7;
let index = 0;
for (const [state, count] of [['idle',6],['waving',4],['jumping',5],['waiting',6],['running',6],['look',16]]) {
  for (let frame = 0; frame < count; frame++) {
    const pose = framePose(state, frame);
    const point = transform(transform(transform([175,272], 'hair-side-right', pose), 'head', pose), 'doro', pose);
    const cx = CELL.ox + point[0] * CELL.scale, cy = CELL.oy + point[1] * CELL.scale;
    const crop = {left:Math.round(cx-24),top:Math.round(cy-16),width:48,height:38};
    const input = await sharp(`frames/${state}/${String(frame).padStart(2,'0')}.png`).extract(crop)
      .flatten({background:'#f4f4f6'}).resize(width,152,{kernel:'nearest'}).png().toBuffer();
    const x = index % columns * width, y = Math.floor(index / columns) * height;
    parts.push({input,left:x,top:y+24}); labels.push(`<text x="${x+8}" y="${y+18}">Join ${index+1}</text>`);
    index++;
  }
}
const h = Math.ceil(index/columns)*height;
parts.push({input:Buffer.from(`<svg width="${columns*width}" height="${h}"><g font-family="sans-serif" font-size="15" fill="#333">${labels.join('')}</g></svg>`),left:0,top:0});
await sharp({create:{width:columns*width,height:h,channels:3,background:'#f4f4f6'}}).composite(parts).png().toFile('qa/right-hair-joins-20261006.png');
fs.mkdirSync('build/blind-hair',{recursive:true});
for (let i=0;i<3;i++) {
  const top=i*352, sliceHeight=i===2?h-top:352;
  await sharp('qa/right-hair-joins-20261006.png').extract({left:0,top,width:columns*width,height:sliceHeight})
    .png().toFile(`build/blind-hair/joins-${i+1}.png`);
}
const cmp = [], text = [];
for (const [i,[state,frame]] of [['idle',0],['waiting',1],['look',6],['look',12]].entries()) {
  for (let side=0;side<2;side++) {
    const root=side?'':`${previous}/`;
    const input=await sharp(`${root}frames/${state}/${String(frame).padStart(2,'0')}.png`).extract({left:25,top:50,width:128,height:104})
      .flatten({background:'#f4f4f6'}).resize(384,312,{kernel:'nearest'}).png().toBuffer();
    cmp.push({input,left:side*384,top:i*336+24});
    text.push(`<text x="${side*384+8}" y="${i*336+18}">${side?'After':'Before'} · ${state} ${frame+1}</text>`);
  }
}
cmp.push({input:Buffer.from(`<svg width="768" height="1344"><g font-family="sans-serif" font-size="15" fill="#333">${text.join('')}</g></svg>`),left:0,top:0});
await sharp({create:{width:768,height:1344,channels:3,background:'#f4f4f6'}}).composite(cmp).png().toFile('qa/right-hair-before-after-20261006.png');
