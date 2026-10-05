// doro 포즈 정의 (좌표: doro-rig.svg의 400×400 격자)
// 프레임 포즈 = { parts: { 부위id: { tx, ty, r, sx, sy } }, show: [켤 파츠], hide: [끌 부위] }
// r·sx·sy는 PIVOTS의 기준점을 중심으로 적용된다. 동작은 프레임 수가 적은 것을 감안해 크게 준다.
// doro는 눈을 감지 않는다(깜빡임·감은 눈 없음). 울 때도 눈을 뜬 채 눈물만 흘린다.

// 셀 배치: 기본 자세 몸 중심(x 166)을 셀 가운데에, 발바닥(y 362.5)을 셀 y 197에 둔다.
const SCALE = 0.54;
export const CELL = { w: 192, h: 208, scale: SCALE, ox: +(96 - 166 * SCALE).toFixed(2), oy: +(197 - 362.5 * SCALE).toFixed(2) };

export const PIVOTS = {
  doro: [196, 360], // 발 아래 중앙: squash·점프·기울기
  'body-group': [192, 349],
  'leg-front-left': [89, 299],
  'leg-front-right': [171, 324],
  'leg-back': [271, 306],
  head: [169, 271], // 턱 아래
  bangs: [143, 114],
  'fringe-contour-underlay': [0, 180],
  'hair-side-left': [100, 118],
  'hair-side-right': [171, 114],
  'ribbon-tails': [267, 185],
  'eye-left': [94, 217],
  'eye-right': [165, 231],
  'lash-left': [95, 200],
  'lash-right': [167, 209],
  // review: 둥근 앞발·돋보기는 앞발 중심 근처를 기준으로 함께, 렌즈 속 영상은 반대로 돈다.
  'paw-hold': [86, 290],
  magnifier: [86, 290],
  'lens-view': [86, 290],
};

const ms = (n, each, last) => [...Array(n - 1).fill(each), last];
export const ROWS = [
  { state: 'idle', row: 0, frames: 6, durations: [280, 110, 110, 140, 140, 320] },
  { state: 'running-right', row: 1, frames: 8, durations: ms(8, 120, 220), mirrorOf: 'running-left' },
  { state: 'running-left', row: 2, frames: 8, durations: ms(8, 120, 220) },
  { state: 'waving', row: 3, frames: 4, durations: ms(4, 140, 280) },
  { state: 'jumping', row: 4, frames: 5, durations: ms(5, 140, 280) },
  { state: 'failed', row: 5, frames: 8, durations: ms(8, 140, 240) },
  { state: 'waiting', row: 6, frames: 6, durations: ms(6, 150, 260) },
  { state: 'running', row: 7, frames: 6, durations: ms(6, 120, 220) },
  { state: 'review', row: 8, frames: 6, durations: ms(6, 150, 280) },
  { state: 'look', row: 9, frames: 16 }, // 9·10행: 000 → 337.5 시계 방향
];
export const LOOK = {
  state: 'look',
  labels: ['000', '022.5', '045', '067.5', '090', '112.5', '135', '157.5', '180', '202.5', '225', '247.5', '270', '292.5', '315', '337.5'],
};

// 키 중심(키보드 자체 좌표): 같은 값으로 불빛과 앞발 접점을 만든다.
export const TYPING_KEYS = [
  { id: 'key-1', hand: 'left', x: 102, y: 336, row: 'upper' },
  { id: 'key-4', hand: 'right', x: 175, y: 343, row: 'middle' },
  { id: 'key-2', hand: 'left', x: 91, y: 350, row: 'lower' },
  { id: 'key-5', hand: 'right', x: 183, y: 336, row: 'upper' },
  { id: 'key-3', hand: 'left', x: 80, y: 343, row: 'middle' },
  { id: 'key-6', hand: 'right', x: 175, y: 350, row: 'lower' },
];

const TAU = Math.PI * 2;
const { sin, cos, max } = Math;
const px = (v) => v / SCALE; // 셀 픽셀 → 격자 단위

function pose() { return { parts: {}, show: [], hide: [] }; }
function add(p, id, t) {
  const q = (p.parts[id] ??= {});
  for (const k of ['tx', 'ty', 'r']) if (t[k]) q[k] = (q[k] ?? 0) + t[k];
  for (const k of ['sx', 'sy']) if (t[k] != null) q[k] = (q[k] ?? 1) * t[k];
  return p;
}
// 시선: 눈·속눈썹·입·눈물을 함께 옮기고 홍조는 조금 덜 옮긴다(머리를 돌리는 느낌).
function gaze(p, dx, dy, { fixedBlush = false } = {}) {
  for (const id of ['eyes', 'lashes', 'tears', 'mouth']) add(p, id, { tx: dx, ty: dy });
  if (!fixedBlush) for (const id of ['blush-left', 'blush-right']) add(p, id, { tx: dx * 0.6, ty: dy * 0.6 });
  return p;
}

function faceDetails(p) {
  p.show.push('face-details');
  p.lashesBehindHair = true;
  fixJaw(p);
  if (p.fringeYScale != null) add(p, 'fringe-contour-underlay', { sy: p.fringeYScale });
  return p;
}
function fixJaw(p) { p.show.push('jaw-contour', 'jaw-skin-fill'); p.fixedJaw = true; return p; }

function typingContact(p, key) {
  const id = `leg-front-${key.hand}`;
  const contact = key.hand === 'left' ? [96, 337] : [185, 361];
  const a = 12 * Math.PI / 180;
  // 발끝은 같은 키의 뒤쪽 절반을 누른다. 앞쪽에 남은 불빛으로 눌린 키가 읽힌다.
  const contactY = key.y - 3;
  const target = [128 + (key.x - 128) * cos(a) - (contactY - 342) * sin(a),
    342 + (key.x - 128) * sin(a) + (contactY - 342) * cos(a)];
  add(p, id, { tx: target[0] - contact[0], ty: target[1] - contact[1] });
}
// 옆머리: 양쪽이 바깥(+)/안쪽(−)으로 함께 흔들림
function hair(p, outward) {
  add(p, 'hair-side-left', { r: outward });
  add(p, 'hair-side-right', { r: -outward });
  return p;
}

const STATES = {
  // 숨쉬기 squash + 머리 bob + 고개·머리카락 흔들림. 깜빡임 없음.
  idle(i) {
    const k = [0, 0.3, 0.65, 1, 0.65, 0.3][i];
    const p = pose();
    add(p, 'doro', { sy: 1 - 0.04 * k, sx: 1 + 0.02 * k });
    add(p, 'head', { ty: 4 * k, r: 2 * k });
    hair(p, 2.5 * k);
    add(p, 'ribbon-tails', { r: 6 * k });
    return fixJaw(p);
  },

  // 왼쪽으로 종종걸음: 다리 교대 ±17°, 한 주기 두 번 튐, 앞으로 기울기, 머리카락·리본 지연
  'running-left'(i) {
    const ph = (i / 8) * TAU;
    const p = pose();
    const A = 17;
    add(p, 'leg-front-left', { r: A * sin(ph), ty: -8 * max(0, cos(ph)) });
    add(p, 'leg-back', { r: A * sin(ph), ty: -8 * max(0, cos(ph)) });
    add(p, 'leg-front-right', { r: -A * sin(ph), ty: -8 * max(0, -cos(ph)) });
    const up = (1 + cos(2 * ph)) / 2; // 다리가 모일 때 1
    add(p, 'doro', { ty: -px(5) * up, r: -3, sy: 1 - 0.03 * (1 - up), sx: 1 + 0.015 * (1 - up), tx: -px(1.5) * sin(2 * ph) });
    const lag = (1 + cos(2 * ph - 1.3)) / 2;
    add(p, 'head', { ty: 5 * (1 - lag), r: 2.5 * sin(ph) });
    hair(p, 4 * (lag - 0.5));
    add(p, 'ribbon-tails', { r: 10 * sin(2 * ph - 1.4) });
    return p;
  },

  // 짧은 왼쪽 앞다리를 앞으로 살짝 들어 까딱까딱 흔들기: 들기 시작 → 위로 → 아래로 까딱 → 내리기
  // 실제 앞다리를 돌리므로 doro의 짧고 뭉툭한 비율이 그대로이고, 뿌리는 몸통·머리에 가려진다.
  // 65°·90°는 발 아랫선이 몸통 밑선과 매끄럽게 이어지는 각도. 다리를 들면 앞왼쪽 주름(crease-fl)은 숨긴다.
  waving(i) {
    const p = pose();
    p.hide.push('crease-fl');
    add(p, 'doro', { r: [2, 3.5, 4, 2][i] });
    add(p, 'head', { r: [2, 5, 6, 3][i] });
    add(p, 'leg-front-left', { r: [35, 90, 65, 20][i] });
    hair(p, [1, 3, 4, 2][i]);
    add(p, 'ribbon-tails', { r: [3, 8, 10, 5][i] });
    return fixJaw(p);
  },

  // 웅크림 → 상승 → 정점 → 하강 → 착지(같은 기준선)
  jumping(i) {
    const p = pose();
    const lift = [0, 32, 46, 28, 0][i];
    add(p, 'doro', { ty: -px(lift), sy: [0.9, 1.07, 1.02, 1.04, 0.94][i], sx: [1.06, 0.96, 0.99, 0.98, 1.04][i] });
    add(p, 'head', { ty: [4, -2, 0, -1, 3][i], r: [0, -2, -3, -1, 1][i] });
    add(p, 'leg-front-left', { r: [-6, 12, -8, -12, -3][i] });
    add(p, 'leg-front-right', { r: [6, -10, 8, 10, 3][i] });
    add(p, 'leg-back', { r: [-6, 10, -8, -10, -3][i] });
    hair(p, [-1, -3, 4, 6, -2][i]);
    add(p, 'ribbon-tails', { r: [-3, -7, 10, 13, -4][i] });
    return fixJaw(p);
  },

  // 눈을 뜬 채 우는 슬픔 루프: 눈물·처진 속눈썹, 머리를 떨군 채 두 번 흐느낌. 입은 평소 :3 그대로.
  failed(i) {
    const ph = (i / 8) * TAU;
    const sob = sin(2 * ph);
    const p = pose();
    p.show.push('tears');
    add(p, 'lash-left', { r: -10 });
    add(p, 'lash-right', { r: 10 });
    add(p, 'doro', { sy: 0.93 + 0.03 * sob, sx: 1.04 - 0.015 * sob });
    add(p, 'head', { ty: 14 - 6 * sob, r: -3 + 4 * sin(ph) });
    hair(p, -3 - 2 * sob);
    add(p, 'ribbon-tails', { r: -5 - 4 * sob });
    gaze(p, -2, 6);
    return p;
  },

  // 고개를 갸웃하고 사용자 쪽을 올려다보며 앞발로 바닥을 톡톡 두 번 (눈을 살짝 크게, 입은 평소 :3)
  // 톡톡은 앞다리를 회전만 해서 든다(위로 끌어올리면 발 아랫선이 꺾여 보임). 들 때는 앞왼쪽 주름을 숨긴다.
  waiting(i) {
    const p = pose();
    const tap = [0, 1, 0, 1, 0, 0][i];
    if (tap) p.hide.push('crease-fl');
    add(p, 'head', { r: [5, 7, 8, 8, 7, 6][i], ty: -3 * tap });
    add(p, 'leg-front-left', { r: 45 * tap });
    add(p, 'doro', { ty: -px(4) * tap, sy: tap ? 1.02 : 0.98, sx: tap ? 0.99 : 1.01 });
    add(p, 'eye-left', { sx: 1.04, sy: 1.04 });
    add(p, 'eye-right', { sx: 1.04, sy: 1.04 });
    gaze(p, 4, -1, { fixedBlush: true });
    p.fringeYScale = tap ? 0.82 : 0.86;
    faceDetails(p);
    hair(p, [1, 3.5, 1.5, 4, 1.5, 1][i]);
    add(p, 'ribbon-tails', { r: [2, 7, 3, 8, 3, 2][i] });
    return p;
  },

  // 키보드 타이핑: 앞발 두 개가 번갈아 누르고 누른 키가 밝아짐. 머리를 숙여 키보드를 봄.
  running(i) {
    const p = pose();
    const key = TYPING_KEYS[i];
    p.show.push('keyboard', key.id);
    const leftDown = key.hand === 'left';
    typingContact(p, key);
    add(p, leftDown ? 'leg-front-right' : 'leg-front-left', { r: leftDown ? 8 : 10, ty: leftDown ? -13 : -12 });
    add(p, 'doro', { r: -2, sy: 0.99 });
    add(p, 'head', { ty: 9 + (leftDown ? 3 : 0), r: leftDown ? -4 : -2 });
    gaze(p, -6, 9, { fixedBlush: true });
    faceDetails(p);
    hair(p, leftDown ? -1.5 : 1);
    add(p, 'ribbon-tails', { r: leftDown ? -3 : 2 });
    return p;
  },

  // 돋보기로 살펴보기: 둥근 앞발(paw-hold)이 손잡이를 감싸 쥐고, 렌즈 속에서 1.4배로 확대된 눈이 훑는다.
  // 앞발과 돋보기를 앞발 중심 근처 기준으로 ±2.5° 함께 돌려 렌즈를 움직이고, 렌즈 속 영상(lens-view)은 반대로 돌려 제자리에 둔다.
  review(i) {
    const p = pose();
    p.show.push('paw-hold', 'body-edge-fl', 'magnifier');
    p.hide.push('leg-front-left', 'crease-fl');
    const sweep = [-1, -0.5, 0.3, 1, 0.6, -0.3][i];
    add(p, 'paw-hold', { r: 2.5 * sweep });
    add(p, 'magnifier', { r: 2.5 * sweep });
    add(p, 'lens-view', { r: -2.5 * sweep });
    gaze(p, 5 * sweep, -1);
    add(p, 'head', { r: [-2, -1, 0.5, 2.5, 2, 0][i] });
    add(p, 'doro', { r: -1.5 });
    hair(p, 1.5 * sweep);
    add(p, 'ribbon-tails', { r: 3 * sweep });
    return p;
  },

  // 16방향 시선: 몸·다리는 고정, 이목구비 이동 + 머리 살짝 이동·회전, 옆머리·리본은 반대로 따라옴
  look(i) {
    const th = (i * 22.5 * Math.PI) / 180;
    // 위쪽은 앞머리에 눈이 가려지므로 조금 덜 올린다.
    const dx = 12 * sin(th), dy = -(cos(th) > 0 ? 5 : 10) * cos(th);
    const p = pose();
    gaze(p, dx, dy, { fixedBlush: true });
    add(p, 'head', { tx: 0.85 * dx, ty: 0.85 * dy, r: 4 * sin(th) });
    p.fringeYScale = 0.86 - 0.08 * max(0, cos(th));
    hair(p, 4 * Math.abs(sin(th)));
    faceDetails(p);
    add(p, 'ribbon-tails', { r: -5 * sin(th) });
    return p;
  },
};

export function framePose(state, i) {
  const fn = STATES[state];
  if (!fn) throw new Error(`no pose for ${state}`);
  return fn(i);
}
