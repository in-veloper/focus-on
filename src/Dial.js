import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { colors, font } from './theme';

const MINOR_TICKS = 60;
const MARKER = require('../assets/art/marker-dino.png');
const MARKER_RATIO = 1002 / 990; // 세로/가로

// 판 한 바퀴가 그 세션 전체 길이다. 25분 집중이면 25분이 한 바퀴,
// 5분 휴식이면 5분이 한 바퀴다.
function labelStep(totalMinutes) {
  for (const step of [5, 10, 15, 1, 2, 3, 20, 30]) {
    const count = Math.floor(totalMinutes / step);
    if (count >= 3 && count <= 8) return step;
  }
  return Math.max(1, Math.round(totalMinutes / 4));
}

function polar(cx, cy, r, fraction) {
  const angle = (fraction * 360 - 90) * (Math.PI / 180);
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

function wedgePath(cx, cy, r, fraction) {
  if (fraction <= 0.002) return null;
  if (fraction >= 0.998) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }

  const start = polar(cx, cy, r, 0);
  const end = polar(cx, cy, r, fraction);
  const large = fraction > 0.5 ? 1 : 0;

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

// 공룡 등 골판 모양. 뾰족한 끝이 판 바깥쪽을 향한다.
// 변을 살짝 곡선으로 휘어서 자로 그린 삼각형이 아니라 손으로 쓱쓱 그린 느낌을 낸다.
function spikePath(baseHalf, height, wobble) {
  return `M ${-baseHalf} 0
          Q ${-baseHalf * (0.32 + wobble)} ${-height * 0.55} 0 ${-height}
          Q ${baseHalf * (0.32 - wobble)} ${-height * 0.5} ${baseHalf} 0 Z`;
}

// 인덱스로 늘 같은 값을 주는 의사난수. 매 렌더마다 크기가 바뀌면 눈이 어지러워서
// 시간이 아니라 골판 순번에서만 값을 뽑는다.
function seeded(i) {
  let t = i * 2654435761 + 0x9e3779b9;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// 지난 시간만큼 부채꼴이 12시에서 시계 방향으로 차오른다.
// 남은 시간은 판 가운데에 속이 빈 윤곽선 숫자로, 부채꼴이 지나가도 늘 읽히게 둔다.
export default function Dial({ size, remainingMs, totalMs, tint, label }) {
  const center = size / 2;
  const spikeHeight = size * 0.06;
  // 골판 크기를 최대 1.28 배까지 흐트러뜨리므로, 가장 큰 골판도 캔버스 밖으로 안 나가게
  // 여백을 넉넉히 둔다.
  const outer = center - 1 - spikeHeight * 0.82 * 1.3;

  const numberRadius = outer - size * 0.062;
  const tickOuter = outer - size * 0.125;
  const tickInner = tickOuter - size * 0.03;
  const tickInnerMajor = tickOuter - size * 0.052;

  const totalMinutes = Math.max(1, Math.round(totalMs / 60000));
  const step = labelStep(totalMinutes);

  const elapsedFraction =
    totalMs > 0 ? Math.max(0, Math.min(1, 1 - remainingMs / totalMs)) : 0;

  const wedge = wedgePath(center, center, tickOuter, elapsedFraction);
  const needle = polar(center, center, tickOuter, elapsedFraction);

  // 마스코트는 어디로 가든 항상 똑바로 서 있게 두고 위치만 옮긴다(회전시키지 않는다).
  const markerW = size * 0.15;
  const markerH = markerW * MARKER_RATIO;

  const labels = [];
  for (let m = step; m <= totalMinutes; m += step) labels.push(m);
  const majorFractions = labels.map((m) => m / totalMinutes);

  // 골판이 판 전체를 빙 둘러싼다. 크기를 조금씩 흐트러뜨려 손으로 그린 듯한 느낌을 낸다.
  const SPIKE_COUNT = 32;
  const spikes = Array.from({ length: SPIKE_COUNT }, (_, i) => {
    const rand1 = seeded(i * 2);
    const rand2 = seeded(i * 2 + 1);
    const scale = 0.72 + rand1 * 0.56; // 0.72 ~ 1.28
    return {
      fraction: i / SPIKE_COUNT,
      scale,
      wobble: (rand2 - 0.5) * 0.5,
      jitterDeg: (rand2 - 0.5) * 8,
    };
  });

  // 자릿수가 늘어나면(1:05:00 처럼) 글자가 좁아지도록 살짝 줄인다.
  const timeFontSize = size * (label.length > 5 ? 0.125 : 0.165);

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={outer}
          fill={colors.dialFace}
          stroke={colors.line}
          strokeWidth={1}
        />

        {spikes.map((s, i) => {
          const at = polar(center, center, outer, s.fraction);
          const rotateDeg = s.fraction * 360 + s.jitterDeg;
          return (
            <Path
              key={`spike-${i}`}
              d={spikePath(size * 0.03 * s.scale, spikeHeight * 0.82 * s.scale, s.wobble)}
              fill={colors.spike}
              stroke={colors.spikeLine}
              strokeWidth={size * 0.007}
              strokeLinejoin="round"
              transform={`translate(${at.x} ${at.y}) rotate(${rotateDeg})`}
            />
          );
        })}

        {Array.from({ length: MINOR_TICKS }, (_, i) => {
          const f = i / MINOR_TICKS;
          const major = majorFractions.some((mf) => Math.abs(mf - f) < 0.004) || i === 0;
          const from = polar(center, center, major ? tickInnerMajor : tickInner, f);
          const to = polar(center, center, tickOuter, f);

          return (
            <Line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={major ? colors.dialTickMajor : colors.dialTick}
              strokeWidth={major ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {labels.map((m) => {
          const at = polar(center, center, numberRadius, m / totalMinutes);
          return (
            <SvgText
              key={m}
              x={at.x}
              y={at.y + size * 0.017}
              fontSize={size * 0.05}
              fontFamily={font.semibold}
              fill={colors.dialNumber}
              textAnchor="middle"
            >
              {m}
            </SvgText>
          );
        })}

        {wedge && <Path d={wedge} fill={tint} />}

        {/* 남은 시간 — 판 색으로 자리를 비워 부채꼴이 지나가도 늘 또렷하게 보이게 하고,
            그 위에 얇은 색 테두리만 그려 속이 비치는 숫자로 만든다. */}
        <SvgText
          x={center}
          y={center}
          fontSize={timeFontSize}
          fontFamily={font.bold}
          fill={colors.dialFace}
          stroke={colors.dialFace}
          strokeWidth={timeFontSize * 0.32}
          strokeLinejoin="round"
          textAnchor="middle"
          alignmentBaseline="central"
          letterSpacing={-1}
        >
          {label}
        </SvgText>
        <SvgText
          x={center}
          y={center}
          fontSize={timeFontSize}
          fontFamily={font.bold}
          fill="none"
          stroke={tint}
          strokeWidth={timeFontSize * 0.07}
          strokeLinejoin="round"
          textAnchor="middle"
          alignmentBaseline="central"
          letterSpacing={-1}
        >
          {label}
        </SvgText>
      </Svg>

      {/* 진행 표시 마스코트 — 지난 시간만큼 판을 따라 시계 방향으로 걸어간다. */}
      <Image
        source={MARKER}
        resizeMode="contain"
        style={{
          position: 'absolute',
          width: markerW,
          height: markerH,
          left: needle.x - markerW / 2,
          top: needle.y - markerH / 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
});
