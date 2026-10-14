// 받은 그림들(크림색 바탕이 깔린 평평한 PNG)에서 바탕만 투명하게 걷어내 assets/art/v2 에 저장한다.
// 가장자리에서부터 바탕색과 비슷한 픽셀만 번져 나가며(flood fill) 지우므로, 그림 안쪽의
// 크림색(컵 몸통, 책장 등)은 바깥과 이어지지 않는 한 그대로 남는다.
// 지운 영역의 경계는 바탕색과의 차이에 비례해 반투명으로 남겨 부드러운 그림자와 안티앨리어싱을 살린다.
// 사용: node scripts/cutout-art.js <원본폴더>
const fs = require('fs');
const path = require('path');
const sharp = require('C:/ClaudeCode_Project/studyplan/node_modules/sharp');

const SRC_DIR = process.argv[2];
const OUT = path.join(__dirname, '..', 'assets', 'art', 'v2');
const FILES = {
  study: '9.png',
  books: '10.png',
  cup: '11.png',
  checklist: '12.png',
  headphones: '13.png',
  sleep: '14.png',
  hourglass: '15.png',
  pencils: '16.png',
  book: '17.png',
  dinoback: '18.png',
  clock: '19.png',
};
const LOW = 5; // 이 차이 이하는 완전히 투명
const HIGH = 30; // 이 차이 이상은 완전히 불투명(번짐도 여기서 멈춤)
const MAX_SIDE = 560;

async function cut(name, file) {
  const { data, info } = await sharp(path.join(SRC_DIR, file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  // 테두리 픽셀의 중앙값을 바탕색으로
  const border = [[], [], []];
  const take = (x, y) => {
    const i = (y * w + x) * 3;
    for (let c = 0; c < 3; c++) border[c].push(data[i + c]);
  };
  for (let x = 0; x < w; x++) { take(x, 0); take(x, h - 1); }
  for (let y = 0; y < h; y++) { take(0, y); take(w - 1, y); }
  const bg = border.map((arr) => arr.sort((a, b) => a - b)[arr.length >> 1]);

  const diff = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(data[p * 3 + c] - bg[c]));
    diff[p] = d;
  }

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
  for (let p = 0; p < w * h; p++) {
    let a = 1;
    if (inBg[p]) {
      const t = Math.max(0, Math.min(1, (diff[p] - LOW) / (HIGH - LOW)));
      a = t * t * (3 - 2 * t);
    }
    for (let c = 0; c < 3; c++) {
      const v = data[p * 3 + c];
      // 반투명 픽셀은 바탕색을 뺀 원래 색으로 되돌린다(어두운 바탕 위에서도 테두리가 뿌옇지 않게)
      rgba[p * 4 + c] = a > 0 && a < 1 ? Math.max(0, Math.min(255, Math.round((v - bg[c] * (1 - a)) / a))) : v;
    }
    rgba[p * 4 + 3] = Math.round(a * 255);
  }

  const outFile = path.join(OUT, `${name}.png`);
  const trimmed = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
  const meta = await sharp(trimmed)
    .trim({ threshold: 1 })
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toFile(outFile);
  return { name, bg: bg.join(','), size: `${meta.width}x${meta.height}` };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, file] of Object.entries(FILES)) console.log(JSON.stringify(await cut(name, file)));
})();
