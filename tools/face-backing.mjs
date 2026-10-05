// Diagnostic only: reveal the face/hair behind eyes without changing any animation.
import sharp from 'sharp';
import { frameSvg } from '../build.mjs';
import { framePose } from '../src/poses.mjs';
const layers = [];
for (const [column, frame] of [0, 4, 8, 12].entries()) {
  const pose = framePose('look', frame);
  for (const row of [0, 1]) {
    if (row) pose.hide.push('eyes', 'lashes');
    layers.push({ input: await sharp(Buffer.from(frameSvg(pose)))
      .flatten({ background: '#fff' }).resize(384, 416).png().toBuffer(),
      left: column * 384, top: row * 440 + 24 });
  }
}
const labels = Buffer.from('<svg width="1536" height="880"><g font-family="sans-serif" font-size="18" fill="#333"><text x="12" y="20">Actual animation poses</text><text x="12" y="460">Diagnostic: eyes and lashes hidden to reveal continuous hair contours</text></g></svg>');
layers.push({ input: labels, left: 0, top: 0 });
await sharp({ create: { width: 1536, height: 880, channels: 3, background: '#fff' } })
  .composite(layers).png().toFile('qa/face-backing.png');
