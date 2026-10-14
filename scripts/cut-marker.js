// 공룡 머리 두 장(왼쪽: 입 다문 얼굴, 오른쪽: 입 벌린 얼굴)이 흰 바탕에 나란히 있는 그림을
// 반으로 나눠 바탕을 투명하게 걷어내고 assets/art/v2/head-closed.png, head-open.png 로 저장한다.
// 두 장을 같은 크기 캔버스에 같은 기준(머리 아래 중앙)으로 맞춰야 번갈아 보일 때 머리가 흔들리지 않는다.
// 사용: node scripts/cut-marker.js <원본 이미지 경로>
const path = require('path');
const sharp = require('C:/ClaudeCode_Project/studyplan/node_modules/sharp');

const SRC = process.argv[2];
const OUT = path.join(__dirname, '..', 'assets', 'art', 'v2');
const LOW = 6;
const HIGH = 34;
const OUT_W = 320;

async function cutHalf(left, width) {
  const { data, info } = await sharp(SRC)
    .flatten({ background: '#ffffff' })
    .extract({ left, top: 0, width, height: 1024 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bg = [255, 255, 255];
  const diff = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(data[p * 3 + c] - bg[c]));
    diff[p] = d;
  }
  // 가장자리에서 번져 나가며 바탕만 지운다(볼·입 안쪽처럼 둘러싸인 밝은 부분은 남는다)
  const inBg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const push = (p) => {
    if (inBg[p] || diff[p] >= HIGH) return;
    inBg[p] = 1;
    queue[tail++] = p;
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }

  const rgba = Buffer.alloc(w * h * 4);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let p = 0; p < w * h; p++) {
    let a = 1;
    if (inBg[p]) {
      const t = Math.max(0, Math.min(1, (diff[p] - LOW) / (HIGH - LOW)));
      a = t * t * (3 - 2 * t);
    }
    for (let c = 0; c < 3; c++) {
      const v = data[p * 3 + c];
      rgba[p * 4 + c] = a > 0 && a < 1 ? Math.max(0, Math.min(255, Math.round((v - bg[c] * (1 - a)) / a))) : v;
    }
    rgba[p * 4 + 3] = Math.round(a * 255);
    if (a > 0.5) {
      const x = p % w;
      const y = (p / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { rgba, w, h, box: { minX, minY, maxX, maxY } };
}

(async () => {
  const halves = [await cutHalf(0, 768), await cutHalf(768, 768)];
  // 두 머리를 다 담는 공통 크기
  const bw = Math.max(...halves.map((s) => s.box.maxX - s.box.minX)) + 24;
  const bh = Math.max(...halves.map((s) => s.box.maxY - s.box.minY)) + 24;
  const names = ['head-closed', 'head-open'];
  for (let i = 0; i < 2; i++) {
    const s = halves[i];
    const cx = Math.round((s.box.minX + s.box.maxX) / 2);
    const left = Math.max(0, cx - Math.round(bw / 2));
    const top = Math.max(0, s.box.maxY + 12 - bh); // 아래쪽(턱 밑) 기준 정렬
    const piece = await sharp(s.rgba, { raw: { width: s.w, height: s.h, channels: 4 } })
      .extract({ left, top, width: Math.min(bw, s.w - left), height: Math.min(bh, s.h - top) })
      .resize(OUT_W, Math.round((OUT_W * bh) / bw), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(OUT, `${names[i]}.png`));
    console.log(names[i], piece.width, piece.height, JSON.stringify(s.box));
  }
})();
