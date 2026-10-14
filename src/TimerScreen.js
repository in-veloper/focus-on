import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Dial from './Dial';
import { MODES, colors, font, radius } from './theme';

// 하단 공룡: 집중은 공부하는 공룡, 휴식은 책 위에서 자는 공룡.
// 두 그림의 공룡 크기가 비슷해서 같은 높이 칸에 그대로 그린다.
const ART = {
  focus: require('../assets/art/v2/study.png'),
  shortBreak: require('../assets/art/v2/sleep.png'),
  longBreak: require('../assets/art/v2/sleep.png'),
};

const DECOR = {
  checklist: { source: require('../assets/art/v2/checklist.png'), ratio: 274 / 237 },
  headphones: { source: require('../assets/art/v2/headphones.png'), ratio: 232 / 258 },
  cup: { source: require('../assets/art/v2/cup.png'), ratio: 221 / 160 },
  clock: { source: require('../assets/art/v2/clock.png'), ratio: 235 / 238 },
  pencils: { source: require('../assets/art/v2/pencils.png'), ratio: 200 / 129 },
  dinoback: { source: require('../assets/art/v2/dinoback.png'), ratio: 191 / 186 },
  books: { source: require('../assets/art/v2/books.png'), ratio: 211 / 253 },
  book: { source: require('../assets/art/v2/book.png'), ratio: 119 / 201 },
};

// 시계 둘레 장식. angle 은 12시에서 시계 방향 각도, size 는 시계 지름 대비 폭,
// push 는 골판에 가리지 않게 시계 테두리 밖으로 밀어내는 정도(그림 폭 대비).
const DIAL_DECOR = [
  { key: 'checklist', angle: 316, size: 0.16, rotate: -10, push: 0.62 },
  { key: 'headphones', angle: 45, size: 0.17, rotate: 9, push: 0.55 },
  { key: 'cup', angle: 228, size: 0.115, rotate: -7, push: 0.75 },
  { key: 'clock', angle: 133, size: 0.13, rotate: 12, push: 0.6 },
];

export default function TimerScreen({ timer, settings, task, onPickTask }) {
  const { width, height } = useWindowDimensions();
  const compact = height < 780;

  const dialSize = Math.min(width - 56, compact ? 292 : 328);
  const art = ART[timer.mode];
  const artHeight = compact ? 104 : 124;
  // 화면 좌우 여백(20)을 뺀 실제 폭. 장식이 화면 밖으로 나가지 않게 이 안으로 가둔다.
  const innerWidth = width - 40;
  const sideSpace = (innerWidth - dialSize) / 2;

  const mode = MODES[timer.mode];
  const rounds = Math.max(1, settings.roundsBeforeLong || 4);
  const current = (timer.round % rounds) + 1;

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={[styles.modePill, { backgroundColor: mode.soft }]}>
          <Ionicons name="ellipse" size={7} color={mode.tint} />
          <Text style={[styles.modeText, { color: mode.tint }]}>
            {mode.label} · 세션 {current}/{rounds}
          </Text>
        </View>

        <View style={{ width: dialSize, height: dialSize }}>
          {DIAL_DECOR.map((d) => {
            const w = dialSize * d.size;
            const h = w * DECOR[d.key].ratio;
            const rad = ((d.angle - 90) * Math.PI) / 180;
            const dist = dialSize / 2 + w * d.push;
            let left = dialSize / 2 + Math.cos(rad) * dist - w / 2;
            const top = dialSize / 2 + Math.sin(rad) * dist - h / 2;
            // 좁은 화면에서도 화면 가장자리 밖으로 나가지 않게
            left = Math.max(-sideSpace, Math.min(dialSize + sideSpace - w, left));
            return (
              <Decor key={d.key} name={d.key} width={w} rotate={d.rotate} style={{ left, top }} />
            );
          })}
          <Dial
            size={dialSize}
            remainingMs={timer.remaining}
            totalMs={timer.total}
            tint={mode.tint}
            label={formatClock(timer.remaining)}
            running={timer.running}
          />
        </View>
      </View>

      <View style={styles.middle}>
        <Decor name="pencils" width={30} rotate={-9} style={styles.decorMiddleLeft} />
        <Decor name="dinoback" width={44} rotate={4} style={styles.decorMiddleRight} />
        <View style={styles.controls}>
          <Pressable
            onPress={timer.reset}
            hitSlop={8}
            style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
          >
            <Ionicons name="refresh" size={19} color={colors.textDim} />
          </Pressable>

          <Pressable
            onPress={timer.toggle}
            style={({ pressed }) => [
              styles.playButton,
              { backgroundColor: mode.tint },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={timer.running ? 'pause' : 'play'}
              size={26}
              color={colors.onAccent}
              style={timer.running ? null : styles.playNudge}
            />
          </Pressable>

          <Pressable
            onPress={timer.skip}
            hitSlop={8}
            style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
          >
            <Ionicons name="play-skip-forward" size={19} color={colors.textDim} />
          </Pressable>
        </View>

        <Pressable onPress={onPickTask} style={styles.taskChip}>
          <Ionicons
            name={task ? 'bookmark' : 'bookmark-outline'}
            size={14}
            color={task ? mode.tint : colors.textFaint}
          />
          <Text style={[styles.taskText, task && { color: colors.text }]} numberOfLines={1}>
            {task || '무엇에 집중할까요?'}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.artBox, { height: artHeight }]}>
        <Decor name="books" width={compact ? 54 : 62} rotate={-5} style={styles.decorBottomLeft} />
        <Decor name="book" width={compact ? 50 : 58} rotate={7} style={styles.decorBottomRight} />
        <Image source={art} style={[styles.art, { height: artHeight }]} resizeMode="contain" />
      </View>
    </View>
  );
}

function Decor({ name, width, rotate, style }) {
  const item = DECOR[name];
  return (
    <Image
      source={item.source}
      resizeMode="contain"
      pointerEvents="none"
      style={[
        styles.decor,
        { width, height: width * item.ratio, transform: [{ rotate: `${rotate}deg` }] },
        style,
      ]}
    />
  );
}

function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },

  top: { alignItems: 'center', gap: 16 },

  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  modeText: { fontFamily: font.bold, fontSize: 12 },

  middle: { alignSelf: 'stretch', alignItems: 'center', gap: 16 },

  decor: { position: 'absolute' },
  decorMiddleLeft: { left: 14, top: 8 },
  decorMiddleRight: { right: 10, top: 6 },
  decorBottomLeft: { left: 6, bottom: 4 },
  decorBottomRight: { right: 8, bottom: 6 },

  controls: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  smallButton: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  playButton: {
    width: 66,
    height: 66,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#1E1B26',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  playNudge: { marginLeft: 3 },

  taskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  taskText: {
    fontFamily: font.semibold,
    color: colors.textFaint,
    fontSize: 13,
    flexShrink: 1,
  },

  artBox: { width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  art: { width: '60%' },
});
