import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Dial from './Dial';
import { MODES, colors, font, radius } from './theme';

// 두 그림은 공룡이 차지하는 비율이 달라서(집중 54%, 휴식 73%),
// 같은 높이로 그리면 공룡 크기가 달라 보인다. 그래서 배율을 따로 준다.
const ART = {
  focus: { source: require('../assets/art/focus.png'), scale: 1.35 },
  shortBreak: { source: require('../assets/art/rest.png'), scale: 1 },
  longBreak: { source: require('../assets/art/rest.png'), scale: 1 },
};

export default function TimerScreen({ timer, settings, task, onPickTask }) {
  const { width, height } = useWindowDimensions();
  const compact = height < 780;

  const dialSize = Math.min(width - 72, compact ? 262 : 296);
  const art = ART[timer.mode];
  const artHeight = Math.round((compact ? 62 : 78) * art.scale);

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

        <Dial
          size={dialSize}
          remainingMs={timer.remaining}
          totalMs={timer.total}
          tint={mode.tint}
          label={formatClock(timer.remaining)}
        />
      </View>

      <View style={styles.middle}>
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

      <Image
        source={art.source}
        style={[styles.art, { height: artHeight }]}
        resizeMode="contain"
      />
    </View>
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

  middle: { alignItems: 'center', gap: 16 },

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
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
  },
  taskText: {
    fontFamily: font.semibold,
    color: colors.textFaint,
    fontSize: 12,
    flexShrink: 1,
  },

  art: { width: '100%' },
});
