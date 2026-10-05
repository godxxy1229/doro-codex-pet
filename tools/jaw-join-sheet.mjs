// Enlarged, anonymous left hair/chin joins for independent visual review.
import fs from 'node:fs';
import sharp from 'sharp';
import { CELL, PIVOTS, framePose } from '../src/poses.mjs';

const parts = [], labels = [];
const width = 256, height = 176, columns = 7;
let index = 0;
function transform(point, id, pose) {
  const p = pose.parts[id] ?? {}, [cx, cy] = PIVOTS[id] ?? [0, 0];
  const a = +(p.r ?? 0).toFixed(2) * Math.PI / 180;
  const x = (point[0] - cx) * +(p.sx ?? 1).toFixed(2);
  const y = (point[1] - cy) * +(p.sy ?? 1).toFixed(2);
  return [cx + x * Math.cos(a) - y * Math.sin(a) + +(p.tx ?? 0).toFixed(2),
    cy + x * Math.sin(a) + y * Math.cos(a) + +(p.ty ?? 0).toFixed(2)];
}
for (const [state, count] of [['idle',6],['waving',4],['jumping',5],['waiting',6],['running',6],['look',16]]) {
  for (let frame = 0; frame < count; frame++) {
    const pose = framePose(state, frame);
    const point = transform(transform([100,267], 'head', pose), 'doro', pose);
    const cx = CELL.ox + point[0] * CELL.scale, cy = CELL.oy + point[1] * CELL.scale;
    const crop = { left: Math.round(cx - 25), top: Math.round(cy - 22), width: 64, height: 38 };
    const input = await sharp(`frames/${state}/${String(frame).padStart(2,'0')}.png`)
      .extract(crop).flatten({background:'#f4f4f6'}).resize(width,152,{kernel:'nearest'}).png().toBuffer();
    const x = index % columns * width, y = Math.floor(index / columns) * height;
    parts.push({ input, left: x, top: y + 24 });
    labels.push(`<text x="${x+8}" y="${y+18}">Join ${index+1}</text>`);
    index++;
  }
}
const fullHeight = Math.ceil(index/columns)*height;
parts.push({input:Buffer.from(`<svg width="${columns*width}" height="${fullHeight}"><g font-family="sans-serif" font-size="15" fill="#333">${labels.join('')}</g></svg>`),left:0,top:0});
fs.mkdirSync('qa',{recursive:true});
await sharp({create:{width:columns*width,height:fullHeight,channels:3,background:'#f4f4f6'}}).composite(parts).png().toFile('qa/jaw-joins-20261006.png');
