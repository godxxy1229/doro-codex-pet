// 원본에 없는 리그 조각 (400×400 격자, tools/optimize.mjs가 삽입)
// - 보강: 큰 동작에서 이음새가 보이지 않게 하는 숨은 면·선 (기본 자세에서는 가려짐)
// - 표정·도구: display="none"으로 넣고 build.mjs가 프레임마다 켠다
import { TYPING_KEYS } from '../src/poses.mjs';
const INK = '#1f1519';
// Original jaw subpath lives in the right hair group; revised faces keep it on the head.
export const ORIGINAL_JAW = 'M187 266c-8 1-14 7-21 8l-14-1-29 1q-22-2-42-7';

// 밑면 클립
// hc: 머리카락 밑면 — 정수리·관자놀이 이음새(y<215)만. 피부 밑면이 그 위에 그려지므로 얼굴이 있는 곳은 피부가 덮고,
//     얼굴 윤곽 밖(관자놀이 모서리)만 분홍으로 남는다. 그 아래 볼 옆은 피부 밑면만 맡는다.
// fcl·fcr: 피부 밑면 — 왼쪽·오른쪽 볼 옆 구간만. 아래는 턱선 위까지(몸통 위로 새지 않게).
export const DEFS = '<clipPath id="hc"><path d="M44 0H205V215H44z"/></clipPath>'
  + '<clipPath id="fcl"><path d="M30 180h70v84H30z"/></clipPath><clipPath id="fcr"><path d="M150 180h65v90h-65z"/></clipPath>'
  + '<clipPath id="face-detail-clip"><use href="#face-skin"/></clipPath>'
  + '<clipPath id="fringe-upper"><path d="M0 0H400V180.5H0Z"/></clipPath>'
  + '<clipPath id="fringe-lower"><path d="M0 179.5H400V400H0Z"/></clipPath>'
  + '<clipPath id="jaw-lower"><path d="M0 242H400V280H0Z"/></clipPath>'
  + '<clipPath id="jaw-skin-clip"><path id="jaw-skin-boundary" d="M0 0H400V400H0Z"/></clipPath>'
  + '<mask id="jaw-curve-mask" maskUnits="userSpaceOnUse" x="20" y="220" width="210" height="90"><path id="jaw-curve-band" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="butt" d="M162 272C150 275 144 275 124 275C106 275 94 274 80 267"/></mask>'
  + `<filter id="jaw-outline-filter" filterUnits="userSpaceOnUse" x="20" y="160" width="210" height="130"><feMorphology in="SourceAlpha" operator="dilate" radius="2.5" result="expanded"/><feComposite in="expanded" in2="SourceAlpha" operator="out" result="border"/><feFlood flood-color="${INK}" result="ink"/><feComposite in="ink" in2="border" operator="in"/></filter>`
  + '<radialGradient id="face-tint"><stop stop-color="#f2b4c3" stop-opacity=".28"/><stop offset="1" stop-color="#f2b4c3" stop-opacity="0"/></radialGradient>'
  // lens: 돋보기 렌즈 안쪽(렌즈 중심 = 왼쪽 눈 중심 94,217, 테 안쪽 반지름 38.5)
  + '<clipPath id="lens"><circle cx="94" cy="217" r="38.5"/></clipPath>';

export const PARTS = [
  {
    anchor: 'face', where: 'before',
    // Dilate the union of all face fills and subtract its interior before colouring the border.
    // This also closes the clipped underlay edges without drawing a line inside the cheek.
    svg: `<g id="jaw-contour" display="none" clip-path="url(#jaw-lower)"><g mask="url(#jaw-curve-mask)"><g filter="url(#jaw-outline-filter)"><g clip-path="url(#jaw-skin-clip)">
      <use href="#face-skin"/>
      <use href="#jaw-skin-fill"/>
      <g id="jaw-left-extension" display="none" clip-path="url(#fcl)"><use href="#face-skin" x="-14"/></g>
      <g id="jaw-right-extension" display="none" clip-path="url(#fcr)"><use href="#face-skin" x="14"/></g>
    </g></g></g></g>`,
  },
  {
    anchor: 'face', where: 'prepend',
    svg: '<path id="jaw-skin-fill" display="none" fill="#fef7f4" d="M40 240H210V276H40Z"/>',
  },
  // 눈 뒤의 얼굴 바탕. 원본 앞머리 윤곽에서 눈에 가려져 생략된 구간을 같은 검은 선으로 잇는다.
  // 원본 앞머리·눈 레이어 순서를 보존하고 해당 세 상태에서만 켠다.
  {
    anchor: 'eyes', where: 'before',
    svg: `<g id="face-details" display="none" clip-path="url(#face-detail-clip)">
      <ellipse cx="93" cy="224" rx="25" ry="22" fill="url(#face-tint)"/>
      <ellipse cx="164" cy="238" rx="24" ry="23" fill="url(#face-tint)"/>
      <g id="fringe-contour-underlay" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M80,204C82,201 83,197.5 84,195M99,199C102,204 107.5,210 113,214M149,210C150.5,208.5 152.5,207 154,206M175,208C178,211 184,212 188.4,211.6"/>
      </g>
    </g>`,
  },
  // 다리 윗부분의 몸통 경계선. 다리 아래 레이어라 평소엔 다리에 가려지고,
  // 다리를 크게 돌리거나 숨기면(앞발 들기) 몸통 밑선이 끊기지 않게 드러난다.
  {
    anchor: 'body-group', where: 'prepend',
    svg: `<path id="under-lines" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"
      d="M70,290C76,302 82,312 89,316C96,315 103,311 111,311M141,318C152,322 162,327 172,327C183,325 193,322 204,320M244,302C252,300 262,312 271,316C278,315 285,311 291,309"/>`,
  },
  // 옆머리가 바깥으로 젖혀질 때 생기는 빈틈을 막는 밑면 두 종류. 해당 옆머리가 바깥으로 돌 때만 build.mjs가 켠다
  // (안쪽으로 돌 때 켜면 사본이 외곽선 밖으로 드러나므로).
  // - 머리카락 밑면(hs*-under): 움직이지 않는 옆머리 면 사본. 정수리·관자놀이 이음새만 메운다(피부 밑면보다 아래 레이어).
  {
    anchor: 'hair-back', where: 'prepend',
    svg: ['l', 'r'].map((k) => `<g id="hs${k}-under" display="none" clip-path="url(#hc)"><use href="#hs${k}-fill"/></g>`).join(''),
  },
  // - 피부 밑면(fs*-under): 얼굴 피부를 바깥쪽으로 14 옮긴 사본. 옆머리 아래 가려졌던 볼이 피부색으로 이어져 드러난다.
  {
    anchor: 'face', where: 'prepend',
    svg: [['l', -14], ['r', 14]].map(([k, dx]) => `<g id="fs${k}-under" display="none" clip-path="url(#fc${k})"><use href="#face-skin" x="${dx}"/></g>`).join(''),
  },
  // 돋보기(review): 렌즈(반지름 43, 원래의 1.65배)의 중심을 왼쪽 눈 중심(94,217)에 두고, 렌즈 안에는 head를
  // 같은 점 기준 1.4배로 확대한 영상을 클립해 넣는다. 그래서 렌즈 속 큰 눈이 렌즈 한가운데에 보인다.
  // (눈 바로 아래의 :3 입은 왼쪽 일부가 렌즈 아래로 들어간다.)
  // 렌즈를 움직일 때(magnifier 회전) 확대 영상은 lens-view가 반대로 돌아 제자리에 남고, 렌즈 창만 눈 위를 미끄러진다.
  // 순서: 손잡이 → 불투명 유리 바탕 → 확대 영상 → 옅은 유리 색조·테 → 반짝임.
  // 앞발(paw-hold): 몸통과 분리된 둥근 앞발(벙어리장갑). 손바닥 오른쪽 위로 엄지가 튀어나온 하나의 외곽선에, 엄지 주름은
  // 가는 선으로 따로 그린다. 손잡이는 렌즈 아래에서 앞발 뒤를 지나 앞발 아래(몸통 밑선 근처)까지 나오고, 엄지가 그 오른쪽을 감싼다.
  // 순서: 손잡이 → 렌즈 → 앞발(손바닥 → 엄지). 앞발과 돋보기는 같은 기준점으로 함께 돈다.
  {
    anchor: 'head', where: 'after',
    svg: `<g id="magnifier" display="none">
      <path stroke="#6b4f3a" stroke-width="9" stroke-linecap="round" d="M94,256L89.5,325"/>
      <circle cx="94" cy="217" r="43" fill="#eef7ff"/>
      <g clip-path="url(#lens)"><g id="lens-view"><use href="#head" transform="translate(94 217) scale(1.4) translate(-94 -217)"/></g></g>
      <circle cx="94" cy="217" r="43" fill="#cfe9fb" fill-opacity=".18" stroke="#56606e" stroke-width="8"/>
      <path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" d="M69.2,200.5C72.5,187.2 82.4,180.6 94,179"/>
    </g>
    <g id="paw-hold" display="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round" transform="rotate(-8 86 290)">
      <path fill="#fff" stroke-width="6" d="M85,272.5C88,272.5 90.2,273.2 92,274.5C95.5,270 104,271 104.5,278C105,283 103,287 100.4,288.5C100,301 93.5,309.5 85,309.5C76.4,309.5 69.5,301.2 69.5,291C69.5,280.8 76.4,272.5 85,272.5Z"/>
      <path fill="none" stroke-width="3.5" d="M92.5,275.5C94.5,278.5 95.5,281.5 96,284.5"/>
    </g>`,
  },
  // 몸통 왼쪽 윤곽선(review): 숨긴 왼쪽 앞다리가 원래 그려 주던 몸통 왼쪽 가장자리 선을 대신한다(body-fill 왼쪽 경계).
  // 몸통 그룹 안(머리 아래 레이어)이라 평소엔 옆머리 끝이 덮고, 고개가 기울어 옆머리 끝이 올라가면 그 아래로 이어져 보인다.
  // 그 아래(70,290 → 89,316)는 under-lines가 잇는다.
  {
    anchor: 'body', where: 'after',
    svg: `<path id="body-edge-fl" display="none" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"
      d="M61.8,266.3C62.1,268.9 63.6,272.7 64.4,274.8C66.3,280.1 68.4,285.6 70.9,290.6"/>`,
  },
  // 눈을 뜬 채 흘리는 눈물: 홍채 아래쪽에 고인 눈물 + 눈 아래에서 볼을 타고 내려오는 짧은 줄기(위는 가늘고 끝은 방울).
  // failed의 시선 이동(+6)을 더해도 방울 끝이 턱선보다 5 이상 위에 머물도록 짧게 그린다.
  {
    anchor: 'eyes', where: 'after',
    svg: `<g id="tears" display="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round">
      <path fill="#bfe7fb" fill-opacity=".9" stroke="none" d="M79,224Q94,240 109,224Q94,231 79,224ZM151,240Q165,258 179,240Q165,247 151,240Z"/>
      <path fill="#8fd3f4" d="M82,230C81,237 79,243 79,248C79,254 87,254 87,248C87,244 86,238 87,230ZM155,246C155,251 153,255 153,258C153,264 161,264 161,258C161,255 160,251 160,246Z"/>
      <path fill="#fff" stroke="none" d="M101,222a3,3 0 1,0 .1,0ZM172,238a3,3 0 1,0 .1,0Z"/>
    </g>`,
  },
  // 키보드: 바닥에 놓여 앞발이 위에 올라감 (몸통보다 아래 레이어)
  {
    anchor: 'body-group', where: 'before',
    svg: `<g id="keyboard" display="none" transform="rotate(12 128 342)" stroke="${INK}" stroke-width="3">
      <rect x="53" y="334" width="150" height="26" rx="5" fill="#3d4450"/>
      <rect x="53" y="329" width="150" height="26" rx="5" fill="#5b6472"/>
      <path fill="none" stroke="#a9b3bf" stroke-width="4.5" stroke-dasharray="8 3" d="M61,336H195M61,343H195M67,350H189"/>
      <g fill="#fff2a6" stroke="none">
        ${TYPING_KEYS.map((key) => `<rect id="${key.id}" display="none" x="${key.x - 4}" y="${key.y - 3}" width="8" height="6"/>`).join('')}
      </g>
    </g>`,
  },
];
