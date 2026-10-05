// doro.svg(원본 800×800) → src/doro-rig.svg (펫 크기 기준 경량 리그, 400×400 격자)
// 1) 원본 문자열 전처리: 400 격자로 축소, 노드 재맞춤, 구조 단순화(홍조·눈·그라디언트·선 두께)
// 2) svgo: 좌표 정수화, 경로 압축
// 3) 같은 스타일의 선 경로 병합
// 4) tools/rig-parts.mjs의 보강 면·표정·도구 파츠 삽입
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';
import { PARTS, DEFS } from './rig-parts.mjs';
import { simplifyPath } from './simplify.mjs';

// 좌표를 절반(400 격자)으로 줄인 뒤 정수로 반올림한다. 셀 배율(약 0.54)에서 오차는 0.27px 이하.
const GRID = 0.5;
// 노드 재맞춤 허용 오차(400 격자 단위)
const TOL = Number(process.env.TOL ?? 0.6);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'source/doro.svg');
const OUT = path.join(root, 'src/doro-rig.svg');

let s = fs.readFileSync(SOURCE, 'utf8');

// --- 1. 전처리 -------------------------------------------------------------
s = s.replace(/<title>[^<]*<\/title>/, '').replace(/ data-pivot="[^"]*"/g, '');
// 왼쪽 앞다리 주름은 다리를 크게 들 때(waving) 숨길 수 있게 따로 id를 단다.
s = s.replace(/(<g id="leg-creases"[^>]*>\s*<path)/, '$1 id="crease-fl"');

// 셀에서 0.1px 남짓 차이인 두께는 하나로 맞춰 병합되게 한다.
s = s.replace(/stroke-width="(5\.4|5\.8|6\.0|6\.2|7\.2)"/g, 'stroke-width="6"');

// 400 격자로 축소: 경로·도형 좌표, 선 두께, 회전 중심만 바꾼다(그라디언트 0~1 좌표는 그대로).
const sc = (v) => v.replace(/-?\d*\.?\d+/g, (n) => String(+(n * GRID).toFixed(3)));
s = s.replace(/ (d|cx|cy|rx|ry|x|y|width|height|stroke-width)="([^"]+)"/g, (_, a, v) => ` ${a}="${sc(v)}"`);
s = s.replace(/rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)/g, (_, a, x, y) => `rotate(${a} ${sc(x)} ${sc(y)})`);
s = s.replace('viewBox="0 0 800 800"', `viewBox="0 0 ${800 * GRID} ${800 * GRID}"`);

// 다리: 외곽선 양 끝을 몸통 안쪽으로 16 단위 연장하고, 면은 그 외곽선 안쪽만 채운다.
// 다리를 크게 돌려도 흰 면이 몸통 선 밖으로 삐져나오거나 선이 끊기지 않는다(평소엔 몸통 면에 가려짐).
const EXT = 16;
for (const id of ['leg-back', 'leg-front-right', 'leg-front-left']) {
  s = s.replace(new RegExp(`(<g id="${id}">)[\\s\\S]*?<path d="([^"]+)" fill="none"([^>]*)/>`), (_, open, d, rest) => {
    const n = d.match(/-?\d*\.?\d+/g).map(Number);
    const unit = (x, y) => { const l = Math.hypot(x, y); return [x / l, y / l]; };
    const [x0, y0, cx, cy] = n, [qx, qy, xn, yn] = n.slice(-4);
    const t0 = unit(cx - x0, cy - y0), t1 = unit(xn - qx, yn - qy);
    const e0 = [x0 - t0[0] * EXT, y0 - t0[1] * EXT].map((v) => v.toFixed(1));
    const e1 = [xn + t1[0] * EXT, yn + t1[1] * EXT].map((v) => v.toFixed(1));
    const line = `M${e0}L${d.slice(1)}L${e1}`;
    return `${open}<path d="${line}Z" fill="#fff"/><path d="${line}" fill="none"${rest}/>`;
  });
}

if (TOL > 0) s = s.replace(/ d="([^"]+)"/g, (_, d) => ` d="${simplifyPath(d, TOL)}"`);

// 두 홍채 그라디언트는 거의 같으므로 하나로 합친다(가운데에서 진한색→연한색으로 끊김).
s = s.replace(/<linearGradient id="gIrisL"[\s\S]*?<\/radialGradient>/,
  `<linearGradient id="gIris" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset=".485" stop-color="#8C71AE"/><stop offset=".513" stop-color="#AE95C6"/>` +
  `<stop offset=".545" stop-color="#CDB7D9"/><stop offset="1" stop-color="#D2BCDA"/></linearGradient>` +
  `<radialGradient id="gHL"><stop offset=".55" stop-color="#FCD3E3" stop-opacity=".85"/>` +
  `<stop offset="1" stop-color="#FCD3E3" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="gBlL"><stop offset=".55" stop-color="#F7A8A6" stop-opacity=".42"/>` +
  `<stop offset="1" stop-color="#F7A8A6" stop-opacity=".1"/></radialGradient>` +
  `<radialGradient id="gBlR"><stop offset=".45" stop-color="#F6AABF" stop-opacity=".42"/>` +
  `<stop offset="1" stop-color="#F6AABF" stop-opacity=".1"/></radialGradient>`);
s = s.replace(/url\(#gIris[LR]\)/g, 'url(#gIris)');

// 13% 4겹 홍조 → 가장 큰 윤곽 1개 + 방사형 그라디언트
for (const [id, grad] of [['blush-left', 'gBlL'], ['blush-right', 'gBlR']]) {
  s = s.replace(new RegExp(`<g id="${id}"[^>]*>\\s*<path d="([^"]+)"[\\s\\S]*?</g>`),
    (_, d) => `<path id="${id}" d="${d}" fill="url(#${grad})"/>`);
}

// 홍채 채움 ellipse + 테두리 ellipse → 한 요소
s = s.replace(/<ellipse (cx="[^"]+" cy="[^"]+" rx="[^"]+" ry="[^"]+") (fill="url\(#gIris\)")\/>\s*<ellipse \1 fill="none" (stroke="[^"]+" stroke-width="[^"]+")\/>/g,
  '<ellipse $1 $2 $3/>');

// 리그에 쓰지 않는 id 제거(병합을 막지 않도록)
for (const id of ['belly-left', 'belly-right', 'body-back', 'body-lines', 'leg-creases', 'rose-core', 'bangs-strands', 'rose-band']) {
  s = s.replace(` id="${id}"`, '');
}

// --- 2. svgo ---------------------------------------------------------------
const svgo = (input) => optimize(input, {
  multipass: true,
  plugins: [{
    name: 'preset-default',
    params: {
      overrides: {
        cleanupIds: false,
        convertPathData: { floatPrecision: 0 },
        mergePaths: { floatPrecision: 0 },
        cleanupNumericValues: { floatPrecision: 2 },
        convertTransform: { floatPrecision: 2 },
      },
    },
  }],
}).data;
s = svgo(s);

// --- 3. 선 경로 병합 ---------------------------------------------------------
// fill이 none으로 상속되는 그룹 안에서, d 외 속성이 같은 인접 <path>를 한 경로로 합친다.
// (채움 경로는 겹칠 때 구멍이 날 수 있으므로 건드리지 않음)
function mergeStrokes(svg) {
  const tokens = svg.split(/(<[^>]+>)/).filter(Boolean);
  const stack = [{ fill: 'black' }];
  const out = [];
  let prev = null; // {index, attrs, d}
  const parseAttrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  for (const t of tokens) {
    if (t.startsWith('</')) { stack.pop(); prev = null; out.push(t); continue; }
    if (!t.startsWith('<')) { out.push(t); continue; }
    const name = t.match(/^<([\w:-]+)/)[1];
    const attrs = parseAttrs(t);
    const selfClosing = t.endsWith('/>');
    const fill = attrs.fill ?? stack.at(-1).fill;
    if (name === 'path' && selfClosing && fill === 'none' && !attrs.id && attrs.d?.startsWith('M')) {
      const key = JSON.stringify(Object.entries(attrs).filter(([k]) => k !== 'd'));
      if (prev && prev.key === key) {
        prev.d += attrs.d;
        out[prev.index] = t.replace(/ d="[^"]*"/, ` d="${prev.d}"`);
        continue;
      }
      prev = { index: out.length, key, d: attrs.d };
      out.push(t);
      continue;
    }
    prev = null;
    out.push(t);
    if (!selfClosing) stack.push({ fill });
  }
  return out.join('');
}
s = mergeStrokes(s);

// 옆머리 면에 id를 달아 뒷머리 레이어에서 <use>로 다시 깔 수 있게 한다(옆머리 흔들림 보강).
s = s.replace(/(<g id="hair-side-left"[^>]*><path)/, '$1 id="hsl-fill"')
  .replace(/(<g id="hair-side-right"[^>]*><path)/, '$1 id="hsr-fill"');

// --- 4. 리그 보강 면·표정·도구 파츠 삽입 -------------------------------------
// 파츠는 400 격자로 손으로 그린 조각. 숨김(display=none) 요소가 지워지지 않게 따로 압축하고,
// 앞발·엄지 같은 작은 모양이 뭉개지지 않게 경로 좌표는 소수 첫째 자리까지 남긴다.
const svgoPart = (frag) => optimize(`<svg xmlns="http://www.w3.org/2000/svg">${frag}</svg>`, {
  plugins: [{
    name: 'preset-default',
    params: { overrides: { cleanupIds: false, removeHiddenElems: false, collapseGroups: false, convertPathData: { floatPrecision: 1 }, cleanupNumericValues: { floatPrecision: 1 } } },
  }],
}).data.replace(/^<svg[^>]*>|<\/svg>$/g, '');
for (const part of PARTS) {
  part.svg = svgoPart(part.svg);
  const anchor = new RegExp(`<(g|path|ellipse)\\b[^>]*? id="${part.anchor}"[^>]*?(/?)>`);
  const m = s.match(anchor);
  if (!m) throw new Error(`anchor not found: ${part.anchor}`);
  if (part.where === 'before') {
    s = s.slice(0, m.index) + part.svg + s.slice(m.index);
  } else if (part.where === 'prepend') { // 그룹 안 맨 앞(가장 아래 레이어)
    if (m[2]) throw new Error(`prepend needs a group: ${part.anchor}`);
    const at = m.index + m[0].length;
    s = s.slice(0, at) + part.svg + s.slice(at);
  } else if (part.where === 'after') {
    // 앵커 요소가 끝나는 위치 찾기
    let end;
    if (m[2]) end = m.index + m[0].length;
    else {
      const re = /<(\/?)g\b[^>]*?(\/?)>/g; re.lastIndex = m.index; let depth = 0, x;
      while ((x = re.exec(s))) {
        if (x[2]) continue;
        depth += x[1] ? -1 : 1;
        if (depth === 0) { end = x.index + x[0].length; break; }
      }
    }
    s = s.slice(0, end) + part.svg + s.slice(end);
  } else throw new Error(`bad where: ${part.where}`);
}
// 파츠 전용 그라디언트(svgo가 미사용으로 지우지 않도록 마지막에 넣음)
s = s.replace('</defs>', DEFS + '</defs>');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, s);
console.log(`wrote ${path.relative(root, OUT)} (${Buffer.byteLength(s)} bytes; source ${fs.statSync(SOURCE).size} bytes)`);
