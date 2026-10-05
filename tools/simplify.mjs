// 절대 좌표 경로(M/C/L/Z)를 다시 맞춰 노드 수를 줄인다.
// 원래 노드에서 방향이 꺾이는 곳(모서리)은 유지하고, 그 사이 구간만 큐빅 베지어로 다시 맞춘다.
import fitCurve from 'fit-curve';
import { svgPathProperties } from 'svg-path-properties';

const CORNER_DEG = 35;
const STEP = 1.5; // 샘플 간격(800 좌표 단위)

const angle = (a, b) => {
  const d = Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)) * 180 / Math.PI;
  return d;
};
const r = (v) => Math.round(v * 10) / 10;

function simplifySubpath(sub, tol) {
  const closed = /z\s*$/i.test(sub);
  const parts = new svgPathProperties(sub).getParts().filter((p) => p.length > 0.01);
  if (parts.length < 4) return sub;
  const runs = [[]];
  parts.forEach((p, i) => {
    const n = Math.max(2, Math.ceil(p.length / STEP));
    const run = runs.at(-1);
    for (let k = run.length ? 1 : 0; k <= n; k++) {
      const q = p.getPointAtLength((p.length * k) / n);
      run.push([q.x, q.y]);
    }
    const next = parts[i + 1];
    if (next && angle(p.getTangentAtLength(p.length), next.getTangentAtLength(0)) > CORNER_DEG) {
      runs.push([run.at(-1)]);
    }
  });
  let d = `M${r(runs[0][0][0])},${r(runs[0][0][1])}`;
  for (const run of runs) {
    const pts = run.filter((q, i) => i === 0 || Math.hypot(q[0] - run[i - 1][0], q[1] - run[i - 1][1]) > 1e-3);
    if (pts.length < 2) continue;
    if (pts.length === 2) { d += `L${r(pts[1][0])},${r(pts[1][1])}`; continue; }
    for (const [, c1, c2, p3] of fitCurve(pts, tol)) {
      d += `C${r(c1[0])},${r(c1[1])} ${r(c2[0])},${r(c2[1])} ${r(p3[0])},${r(p3[1])}`;
    }
  }
  if (closed) d += 'Z';
  // 다시 맞춘 결과가 원래보다 노드가 많으면 원래 경로를 쓴다.
  const count = (x) => (x.match(/[CLSQ]/gi) || []).length;
  return count(d) < count(sub) ? d : sub;
}

export function simplifyPath(d, tol) {
  return d.split(/(?=M)/).map((sub) => simplifySubpath(sub.trim(), tol)).join('');
}
