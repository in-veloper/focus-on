import sharp from 'sharp';
import path from 'node:path';

// 일러스트의 흰 배경을 지운다.
// 단순히 "밝으면 지운다" 로 하면 머그컵·양말·책장 같은 안쪽 흰색까지 뚫린다.
// 그래서 테두리에서 시작해 이어진 배경만 따라가며 지운다.
const SRC = process.argv[2];
const OUT = process.argv[3];
const MAX_WIDTH = 1000;
const NEAR_WHITE = 226;

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: W, height: H } = info;
const pixels = Buffer.from(data);

const isBackground = (i) => {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  return Math.min(r, g, b) >= NEAR_WHITE;
};

const visited = new Uint8Array(W * H);
const queue = [];

const push = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const p = y * W + x;
  if (visited[p]) return;
  if (!isBackground(p * 4)) return;
  visited[p] = 1;
  queue.push(p);
};

for (let x = 0; x < W; x += 1) {
  push(x, 0);
  push(x, H - 1);
}
for (let y = 0; y < H; y += 1) {
  push(0, y);
  push(W - 1, y);
}

while (queue.length) {
  const p = queue.pop();
  const x = p % W;
  const y = (p - x) / W;

  pixels[p * 4 + 3] = 0;

  push(x + 1, y);
  push(x - 1, y);
  push(x, y + 1);
  push(x, y - 1);
}

// 벤치 다리 사이처럼 사방이 막혀 테두리에서 닿지 않는 배경 구역이 남는다.
// 그림 속 흰 물건(머그컵·양초·양말)은 모두 따뜻한 색이라 채도로 구분할 수 있다.
const ENCLOSED_MIN_AREA = 400;

for (let start = 0; start < W * H; start += 1) {
  if (visited[start]) continue;

  const i = start * 4;
  const max = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
  const min = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
  if (min < 246 || max - min > 6) continue;

  const region = [];
  const stack = [start];
  visited[start] = 1;

  while (stack.length) {
    const p = stack.pop();
    region.push(p);

    const x = p % W;
    const y = (p - x) / W;

    const step = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
      const q = ny * W + nx;
      if (visited[q]) return;

      const j = q * 4;
      const hi = Math.max(pixels[j], pixels[j + 1], pixels[j + 2]);
      const lo = Math.min(pixels[j], pixels[j + 1], pixels[j + 2]);
      if (lo < 246 || hi - lo > 6) return;

      visited[q] = 1;
      stack.push(q);
    };

    step(x + 1, y);
    step(x - 1, y);
    step(x, y + 1);
    step(x, y - 1);
  }

  if (region.length >= ENCLOSED_MIN_AREA) {
    region.forEach((p) => {
      pixels[p * 4 + 3] = 0;
    });
  }
}

// 지운 자리에 남는 흰 테두리를 한 겹 부드럽게 깎는다.
for (let y = 1; y < H - 1; y += 1) {
  for (let x = 1; x < W - 1; x += 1) {
    const p = y * W + x;
    if (pixels[p * 4 + 3] === 0) continue;

    const neighbours =
      (visited[p - 1] ? 1 : 0) +
      (visited[p + 1] ? 1 : 0) +
      (visited[p - W] ? 1 : 0) +
      (visited[p + W] ? 1 : 0);

    if (neighbours > 0 && isBackground(p * 4)) pixels[p * 4 + 3] = 90;
  }
}

// 남은 그림의 경계를 찾아 여백을 잘라낸다.
let left = W;
let right = 0;
let top = H;
let bottom = 0;

for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    if (pixels[(y * W + x) * 4 + 3] < 12) continue;
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
}

const crop = {
  left,
  top,
  width: right - left + 1,
  height: bottom - top + 1,
};

const target = Math.min(MAX_WIDTH, crop.width);

await sharp(pixels, { raw: { width: W, height: H, channels: 4 } })
  .extract(crop)
  .resize(target)
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(path.basename(OUT), '|', `${W}x${H}`, '->', `${crop.width}x${crop.height}`, '->', `${target}px`);
