import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { dateKey, formatMinutes, lastDays, streakOf, totalOf } from './storage';
import { colors, font, radius } from './theme';
import { Card, Label } from './ui';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function StatsScreen({ stats }) {
  const today = stats[dateKey()] || { minutes: 0, sessions: 0, tasks: {} };
  const week = useMemo(() => lastDays(stats, 7), [stats]);
  const streak = useMemo(() => streakOf(stats), [stats]);
  const total = useMemo(() => totalOf(stats), [stats]);

  const peak = Math.max(60, ...week.map((d) => d.minutes));

  const todayTasks = useMemo(
    () =>
      Object.entries(today.tasks || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6),
    [today]
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
      <Card style={styles.hero}>
        <Label>오늘</Label>

        <View style={styles.heroRow}>
          <Text style={styles.heroValue}>{today.minutes}</Text>
          <Text style={styles.heroUnit}>분</Text>
        </View>

        <View style={styles.tomatoRow}>
          {Array.from({ length: Math.min(today.sessions, 10) }, (_, i) => (
            <Ionicons key={i} name="ellipse" size={12} color={colors.accent} />
          ))}
          {today.sessions > 10 && (
            <Text style={styles.tomatoMore}>+{today.sessions - 10}</Text>
          )}
          {today.sessions === 0 && (
            <Text style={styles.tomatoEmpty}>아직 완료한 세션이 없습니다</Text>
          )}
        </View>
      </Card>

      <View style={styles.summaryRow}>
        <Summary value={`${today.sessions}`} unit="개" caption="오늘 세션" />
        <Summary value={`${streak}`} unit="일" caption="연속 기록" tint={'#3DD9C0'} />
        <Summary
          value={`${Math.round(total.minutes / 60)}`}
          unit="시간"
          caption="누적 집중"
          tint={'#5B8CFF'}
        />
      </View>

      <Card style={styles.chartCard}>
        <Label>최근 7일</Label>
        <View style={styles.chart}>
          {week.map((day) => {
            const ratio = day.minutes / peak;
            const isToday = day.key === dateKey();

            return (
              <View key={day.key} style={styles.barColumn}>
                <Text style={styles.barValue}>{day.minutes || ''}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: day.minutes > 0 ? `${Math.max(5, ratio * 100)}%` : 3,
                        backgroundColor:
                          day.minutes > 0
                            ? isToday
                              ? colors.accent
                              : colors.accentDim
                            : colors.line,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                  {WEEKDAYS[day.date.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <Label>오늘 한 일</Label>
        {todayTasks.length === 0 ? (
          <Text style={styles.empty}>작업을 지정하고 집중하면 여기에 쌓입니다.</Text>
        ) : (
          <View style={styles.taskList}>
            {todayTasks.map(([name, minutes]) => (
              <View key={name} style={styles.taskRow}>
                <View style={styles.taskDot} />
                <Text style={styles.taskName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.taskMinutes}>{formatMinutes(minutes)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <View style={styles.note}>
        <Ionicons name="bulb-outline" size={15} color={colors.accent} />
        <Text style={styles.noteText}>
          짧게 끊어 집중하고 반드시 쉬는 것이 핵심입니다. 쉬는 시간을 건너뛰면 뒤로 갈수록
          집중이 흐려집니다.
        </Text>
      </View>
    </ScrollView>
  );
}

function Summary({ value, unit, caption, tint }) {
  return (
    <View style={styles.summary}>
      <View style={styles.summaryRowInner}>
        <Text style={[styles.summaryValue, tint && { color: tint }]}>{value}</Text>
        <Text style={styles.summaryUnit}>{unit}</Text>
      </View>
      <Text style={styles.summaryCaption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 8 },

  hero: { gap: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: -2 },
  heroValue: {
    fontFamily: font.bold,
    color: colors.text,
    fontSize: 44,
    letterSpacing: -2,
  },
  heroUnit: { fontFamily: font.semibold, color: colors.textDim, fontSize: 19 },
  tomatoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  tomatoMore: { fontFamily: font.semibold, color: colors.textFaint, fontSize: 12 },
  tomatoEmpty: { fontFamily: font.regular, color: colors.textFaint, fontSize: 12 },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summary: {
    flex: 1,
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  summaryRowInner: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  summaryValue: {
    fontFamily: font.bold,
    color: colors.text,
    fontSize: 22,
    letterSpacing: -0.8,
  },
  summaryUnit: { fontFamily: font.semibold, color: colors.textFaint, fontSize: 12 },
  summaryCaption: { fontFamily: font.regular, color: colors.textFaint, fontSize: 11 },

  chartCard: { gap: 16 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 132 },
  barColumn: { flex: 1, alignItems: 'center', gap: 6 },
  barValue: { fontFamily: font.semibold, color: colors.textFaint, fontSize: 10, height: 13 },
  barTrack: {
    flex: 1,
    width: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: radius.sm },
  barLabel: { fontFamily: font.semibold, color: colors.textFaint, fontSize: 11 },
  barLabelToday: { color: colors.accent },

  empty: { fontFamily: font.regular, color: colors.textFaint, fontSize: 13, marginTop: 12 },

  taskList: { marginTop: 14, gap: 11 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  taskName: { flex: 1, fontFamily: font.regular, color: colors.text, fontSize: 14 },
  taskMinutes: { fontFamily: font.semibold, color: colors.textDim, fontSize: 13 },

  note: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  noteText: {
    flex: 1,
    fontFamily: font.regular,
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 19,
  },
});
