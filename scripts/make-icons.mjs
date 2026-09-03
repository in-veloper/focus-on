import sharp from 'sharp';
import path from 'node:path';

const SRC = process.argv[2];
const OUT = process.argv[3];
const SIZE = 1024;
// 그림 안에서 캐릭터가 이미 여백을 두고 있어, 마스크 안전 영역에 넉넉히 들어가는 비율.
const SAFE = Math.round(SIZE * 0.74);

const img = sharp(SRC).ensureAlpha();
const meta = await img.metadata();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const at = (x, y) => {
  const i = (y * W + x) * C;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

// 바깥 검정/투명 배경을 걷어내고 둥근 사각형 카드 영역만 찾는다.
let left = W, right = 0, top = H, bottom = 0;
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const [r, g, b, a] = at(x, y);
    const bright = Math.max(r, g, b);
    if (a > 80 && bright > 40) {
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
}

const cx = (left + right) / 2;
const cy = (top + bottom) / 2;
const side = Math.max(right - left, bottom - top) + 1;
const crop = {
  left: Math.max(0, Math.round(cx - side / 2)),
  top: Math.max(0, Math.round(cy - side / 2)),
  width: Math.min(W, side),
  height: Math.min(H, side),
};

// 카드의 노란 바탕색을 모서리에서 뽑는다.
function sampleCorner(fx, fy) {
  let r = 0, g = 0, b = 0, n = 0;
  const x0 = Math.round(crop.left + crop.width * fx);
  const y0 = Math.round(crop.top + crop.height * fy);

  for (let y = y0; y < y0 + crop.height * 0.05; y += 2) {
    for (let x = x0; x < x0 + crop.width * 0.05; x += 2) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const [pr, pg, pb, pa] = at(x, y);
      if (pa < 200) continue;
      r += pr; g += pg; b += pb; n += 1;
    }
  }

  if (!n) return { r: 240, g: 190, b: 60 };
  return { r: r / n, g: g / n, b: b / n };
}

const bgColor = sampleCorner(0.06, 0.06);
const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: { ...bgColor, alpha: 1 } },
})
  .png()
  .toFile(path.join(OUT, 'android-icon-background.png'));

const artwork = await sharp(SRC)
  .extract(crop)
  .resize(SAFE, SAFE, { fit: 'cover' })
  .png()
  .toBuffer();

const onCanvas = (input, opts = {}) =>
  sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input, gravity: 'center', ...opts }])
    .png();

await onCanvas(artwork).toFile(path.join(OUT, 'android-icon-foreground.png'));

// 테마 아이콘 — 바탕(노랑)과 색이 많이 다른 픽셀(초록/빨강/검정 선)만 실루엣으로 남긴다.
const flat = await sharp(SRC)
  .extract(crop)
  .resize(SAFE, SAFE, { fit: 'cover' })
  .raw()
  .toBuffer({ resolveWithObject: true });

const mono = Buffer.alloc(SAFE * SAFE * 4);
for (let i = 0; i < SAFE * SAFE; i += 1) {
  const src = i * flat.info.channels;
  const dst = i * 4;
  const dr = flat.data[src] - bgColor.r;
  const dg = flat.data[src + 1] - bgColor.g;
  const db = flat.data[src + 2] - bgColor.b;
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);

  mono[dst] = 255;
  mono[dst + 1] = 255;
  mono[dst + 2] = 255;
  mono[dst + 3] = Math.max(0, Math.min(255, Math.round((dist - 25) * 3)));
}

await onCanvas(mono, { raw: { width: SAFE, height: SAFE, channels: 4 } }).toFile(
  path.join(OUT, 'android-icon-monochrome.png')
);

await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: { ...bgColor, alpha: 1 } },
})
  .composite([{ input: await onCanvas(artwork).toBuffer() }])
  .png()
  .toFile(path.join(OUT, 'icon.png'));

console.log('source    :', `${meta.width}x${meta.height}`);
console.log('card bbox :', crop);
console.log('bg color  :', hex(bgColor));
console.log('written   :', OUT);
