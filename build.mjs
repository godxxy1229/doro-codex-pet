// doro-rig.svg + src/poses.mjs → 프레임 PNG → v2 아틀라스(1536×2288) PNG/WebP
//   node build.mjs              전체 빌드
//   node build.mjs idle waving  지정한 상태만 렌더(frames/, qa/strips/)
//   --dump-svg                  프레임 SVG를 build/svg/에 저장
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CELL, PIVOTS, ROWS, LOOK, framePose } from './src/poses.mjs';
import { ORIGINAL_JAW } from './tools/rig-parts.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const rig = fs.readFileSync(path.join(root, 'src/doro-rig.svg'), 'utf8');
const args = process.argv.slice(2);
const dumpSvg = args.includes('--dump-svg');
const only = args.filter((a) => !a.startsWith('--'));
const W = CELL.w, H = CELL.h;

const f2 = (v) => +v.toFixed(2);

// 부위 하나의 포즈 → SVG transform 문자열 (기준점 기준 회전·확대 + 이동)
function partTransform(id, p) {
  const [px, py] = PIVOTS[id] ?? [0, 0];
  const t = [];
  if (p.tx || p.ty) t.push(`translate(${f2(p.tx ?? 0)} ${f2(p.ty ?? 0)})`);
  if (p.r) t.push(`rotate(${f2(p.r)} ${px} ${py})`);
  if ((p.sx ?? 1) !== 1 || (p.sy ?? 1) !== 1) {
    t.push(`translate(${px} ${py}) scale(${f2(p.sx ?? 1)} ${f2(p.sy ?? 1)}) translate(${-px} ${-py})`);
  }
  return t.join(' ');
}

// 포즈 객체 → 프레임 SVG 문자열
export function frameSvg(pose) {
  let s = rig;
  if (pose.lashesBehindHair) {
    const open = s.match(/<g id="lashes"[^>]*>/), groups = /<(\/?)g\b[^>]*?(\/?)>/g;
    groups.lastIndex = open.index;
    let depth = 0, token, end;
    while ((token = groups.exec(s))) {
      if (token[2]) continue;
      depth += token[1] ? -1 : 1;
      if (depth === 0) { end = token.index + token[0].length; break; }
    }
    const lashes = s.slice(open.index, end);
    s = s.slice(0, open.index) + s.slice(end);
    s = s.replace('<g id="bangs"', `${lashes}<g id="bangs"`);
  }
  if (pose.fixedJaw) {
    // Remove only the original moving subpath, not its fixed replacement.
    const pattern = `q5-9 7-21${ORIGINAL_JAW}`;
    if (!s.includes(pattern)) throw new Error('Original moving jaw contour not found.');
    s = s.replace(pattern, 'q5-9 7-21');
    const lockPoint = (id, x, y) => {
      const [cx, cy] = PIVOTS[id], a = (pose.parts?.[id]?.r ?? 0) * Math.PI / 180;
      return [f2(cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a)),
        f2(cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a))];
    };
    const left = lockPoint('hair-side-left', 80, 267), right = lockPoint('hair-side-right', 162, 272);
    // Smooth lower skin boundary; the side endpoints meet their hair locks.
    const bottom = `L${right}C${f2(right[0] - 12)},${f2(right[1] + 3)} 144,275 124,275C106,275 ${f2(left[0] + 14)},${f2(left[1] + 7)} ${left}`;
    // Keep only the actual chin arc. The union's vertical side edges must not
    // extend under or beyond the moving left hair tip.
    s = s.replace(/(<path\b[^>]*id="jaw-curve-band"[^>]* d=")[^"]*/,
      `$1M${bottom.slice(1)}`);
    s = s.replace(/(<path\b[^>]*id="jaw-skin-boundary"[^>]* d=")[^"]*/,
      `$1M0,0H400V242${bottom}L0,242Z`);
    s = s.replace(/(<path\b[^>]*id="jaw-skin-fill"[^>]* d=")[^"]*/,
      `$1M${left[0]},240H${right[0]}V242${bottom}L${left[0]},242Z`);
    s = s.replace('<g id="face">', '<g id="face" clip-path="url(#jaw-skin-clip)">');
  }
  // 정수리는 고정하고 앞머리 아래쪽만 짧게 당긴다. 전체 이동으로 생기는 정수리 이음새를 피한다.
  if (pose.fringeYScale != null) {
    const open = s.match(/<g id="bangs"[^>]*>/);
    const groups = /<(\/?)g\b[^>]*?(\/?)>/g;
    groups.lastIndex = open.index;
    let depth = 0, token, end;
    while ((token = groups.exec(s))) {
      if (token[2]) continue;
      depth += token[1] ? -1 : 1;
      if (depth === 0) { end = token.index + token[0].length; break; }
    }
    const content = s.slice(open.index + open[0].length, end - 4);
    const yScale = f2(pose.fringeYScale);
    const corrected = `${open[0]}<g clip-path="url(#fringe-upper)">${content}</g>`
      + `<g transform="translate(0 180) scale(1 ${yScale}) translate(0 -180)"><g clip-path="url(#fringe-lower)">${content}</g></g></g>`;
    s = s.slice(0, open.index) + corrected + s.slice(end);
  }
  for (const [id, p] of Object.entries(pose.parts ?? {})) {
    const tr = partTransform(id, p);
    if (!tr) continue;
    const re = new RegExp(`<[a-z]+\\b[^>]*? id="${id}"[^>]*>`);
    const m = s.match(re);
    if (!m) throw new Error(`part not found: ${id}`);
    const tag = /transform="/.test(m[0])
      ? m[0].replace(/ transform="([^"]*)"/, (_, old) => ` transform="${tr} ${old}"`)
      : m[0].replace(` id="${id}"`, ` id="${id}" transform="${tr}"`);
    s = s.slice(0, m.index) + tag + s.slice(m.index + m[0].length);
  }
  // 옆머리 밑면(머리카락·피부): 해당 옆머리가 바깥으로 돌 때만 켠다(안쪽으로 돌면 외곽선 밖으로 드러나므로 끔).
  const rot = (id) => pose.parts?.[id]?.r ?? 0;
  const show = [...(pose.show ?? [])];
  if (rot('hair-side-left') > 0.3) show.push('hsl-under', 'fsl-under');
  if (rot('hair-side-right') < -0.3) show.push('hsr-under', 'fsr-under');
  if (pose.fixedJaw && rot('hair-side-left') > 0.3) show.push('jaw-left-extension');
  if (pose.fixedJaw && rot('hair-side-right') < -0.3) show.push('jaw-right-extension');
  for (const id of show) {
    const m = s.match(new RegExp(`<[a-z]+\\b[^>]*? id="${id}"[^>]*>`));
    if (!m || !m[0].includes(' display="none"')) throw new Error(`hidden part not found: ${id}`);
    s = s.slice(0, m.index) + m[0].replace(' display="none"', '') + s.slice(m.index + m[0].length);
  }
  for (const id of pose.hide ?? []) {
    const re = new RegExp(`<[a-z]+\\b[^>]*? id="${id}"[^>]*>`);
    const match = s.match(re);
    if (!match) throw new Error(`part not found: ${id}`);
    if (!match[0].includes(' display="none"')) s = s.replace(re, match[0].replace(` id="${id}"`, ` id="${id}" display="none"`));
  }
  // 셀 배치: 400 격자 → 192×208
  const { scale, ox, oy } = CELL;
  s = s.replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g transform="translate(${ox} ${oy}) scale(${scale})">`);
  return s.replace(/<\/svg>\s*$/, '</g></svg>');
}

// 알파가 0인 픽셀의 RGB 잔여값 제거
function clearHidden(buf) {
  for (let i = 0; i < buf.length; i += 4) if (buf[i + 3] === 0) buf[i] = buf[i + 1] = buf[i + 2] = 0;
  return buf;
}

async function renderPose(pose, { flop = false } = {}) {
  let img = sharp(Buffer.from(frameSvg(pose))).ensureAlpha();
  if (flop) img = img.flop();
  return clearHidden(await img.raw().toBuffer());
}

const toPng = (raw) => sharp(raw, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();

// 상태별 프레임 렌더 → frames/<state>/NN.png
async function renderState(state) {
  const row = ROWS.find((r) => r.state === state);
  const dir = path.join(root, 'frames', state);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cells = [];
  for (let i = 0; i < row.frames; i++) {
    // running-right는 running-left 프레임을 하나씩 좌우 반전(프레임 순서 유지)
    const src = row.mirrorOf ?? state;
    const pose = framePose(src, i);
    if (dumpSvg) {
      fs.mkdirSync(path.join(root, 'build/svg', src), { recursive: true });
      fs.writeFileSync(path.join(root, 'build/svg', src, `${String(i).padStart(2, '0')}.svg`), frameSvg(pose));
    }
    const raw = await renderPose(pose, { flop: !!row.mirrorOf });
    fs.writeFileSync(path.join(dir, `${String(i).padStart(2, '0')}.png`), await toPng(raw));
    cells.push(raw);
  }
  return cells;
}

// 검수용 줄 이미지: 밝은/어두운 배경 2배
async function strip(state, cells) {
  const k = 2, gap = 6;
  const out = [];
  for (const bg of ['#f2f2f2', '#1d2129']) {
    const comps = await Promise.all(cells.map(async (raw, i) => ({
      input: await sharp(await toPng(raw)).resize(W * k, H * k, { kernel: 'nearest' }).png().toBuffer(),
      left: gap + i * (W * k + gap), top: gap,
    })));
    out.push(await sharp({ create: { width: gap + cells.length * (W * k + gap), height: H * k + gap * 2, channels: 3, background: bg } })
      .composite(comps).png().toBuffer());
  }
  const meta = await sharp(out[0]).metadata();
  fs.mkdirSync(path.join(root, 'qa/strips'), { recursive: true });
  await sharp({ create: { width: meta.width, height: meta.height * 2, channels: 3, background: '#000' } })
    .composite([{ input: out[0], top: 0, left: 0 }, { input: out[1], top: meta.height, left: 0 }])
    .png().toFile(path.join(root, 'qa/strips', `${state}.png`));
}

async function main() {
  const states = only.length ? only : ROWS.map((r) => r.state);
  const rendered = {};
  for (const state of states) {
    rendered[state] = await renderState(state);
    await strip(state, rendered[state]);
    console.log(`${state}: ${rendered[state].length} frames`);
  }
  if (only.length) return;

  // v2 아틀라스: 0~8행 표준 상태, 9~10행 16방향 시선
  const atlas = Buffer.alloc(1536 * 2288 * 4);
  const paste = (raw, col, rowIdx) => {
    for (let y = 0; y < H; y++) raw.copy(atlas, ((rowIdx * H + y) * 1536 + col * W) * 4, y * W * 4, (y + 1) * W * 4);
  };
  for (const row of ROWS) {
    if (row.state === LOOK.state) rendered[row.state].forEach((raw, i) => paste(raw, i % 8, row.row + Math.floor(i / 8)));
    else rendered[row.state].forEach((raw, i) => paste(raw, i, row.row));
  }
  clearHidden(atlas);
  fs.mkdirSync(path.join(root, 'final'), { recursive: true });
  const rawOpt = { raw: { width: 1536, height: 2288, channels: 4 } };
  await sharp(atlas, rawOpt).png({ compressionLevel: 9 }).toFile(path.join(root, 'final/spritesheet.png'));
  await sharp(atlas, rawOpt).webp({ lossless: true, effort: 6, exact: true }).toFile(path.join(root, 'final/spritesheet.webp'));
  console.log('wrote final/spritesheet.png, final/spritesheet.webp');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exitCode = 1; });
}
