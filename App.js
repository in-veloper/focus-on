import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import StatsScreen from './src/StatsScreen';
import TimerScreen from './src/TimerScreen';
import { prepareNotifications } from './src/notify';
import {
  DEFAULT_SETTINGS,
  dateKey,
  forgetTask,
  loadSettings,
  loadStats,
  loadTasks,
  recordSession,
  rememberTask,
  saveSettings,
} from './src/storage';
import { colors, font, radius } from './src/theme';
import { Label, Sheet, StepperRow, ToggleRow } from './src/ui';
import { useTimer } from './src/useTimer';

const TABS = [
  { key: 'timer', text: '타이머' },
  { key: 'stats', text: '기록' },
];

export default function App() {
  const [tab, setTab] = useState('timer');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [stats, setStats] = useState({});
  const [tasks, setTasks] = useState([]);
  const [task, setTask] = useState('');
  const [draftTask, setDraftTask] = useState('');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [loadedSettings, loadedStats, loadedTasks] = await Promise.all([
        loadSettings(),
        loadStats(),
        loadTasks(),
      ]);
      setSettings(loadedSettings);
      setStats(loadedStats);
      setTasks(loadedTasks);
      setTask(loadedTasks[0] || '');
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveSettings(settings);
  }, [ready, settings]);

  useEffect(() => {
    if (!ready || !settings.notify) return;
    prepareNotifications();
  }, [ready, settings.notify]);

  const handleFocusDone = useCallback(
    async (minutes) => {
      const next = await recordSession({ minutes, task });
      setStats({ ...next });
      if (task) setTasks(await rememberTask(task));
    },
    [task]
  );

  const timer = useTimer({ settings, onFocusDone: handleFocusDone });

  const update = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const chooseTask = useCallback(async (name) => {
    setTask(name);
    setTaskOpen(false);
    setDraftTask('');
    if (name) setTasks(await rememberTask(name));
  }, []);

  const today = stats[dateKey()] || { minutes: 0, sessions: 0 };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.screen} onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Image
                source={require('./assets/art/marker-dino.png')}
                style={styles.brandIcon}
                resizeMode="contain"
              />
              <Text style={styles.brand}>집중ON</Text>
            </View>

            <Pressable
              onPress={() => setSettingsOpen(true)}
              hitSlop={8}
              style={styles.gear}
            >
              <Ionicons name="options-outline" size={19} color={colors.textDim} />
            </Pressable>
          </View>

          <Text style={styles.subline}>
            오늘 {today.minutes}분 · 세션 {today.sessions}개
          </Text>

          <View style={styles.segment}>
            {TABS.map((item) => {
              const active = tab === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                >
                  <Text
                    style={[styles.segmentText, active && styles.segmentTextActive]}
                  >
                    {item.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.content}>
            {tab === 'timer' ? (
              <TimerScreen
                timer={timer}
                settings={settings}
                task={task}
                todayMinutes={today.minutes || 0}
                onPickTask={() => setTaskOpen(true)}
              />
            ) : (
              <StatsScreen stats={stats} />
            )}
          </View>
        </Pressable>
      </KeyboardAvoidingView>

      <Sheet visible={taskOpen} title="무엇에 집중하나요?" onClose={() => setTaskOpen(false)}>
        <View style={styles.taskInputRow}>
          <TextInput
            style={styles.taskInput}
            value={draftTask}
            onChangeText={setDraftTask}
            placeholder="예: 행정쟁송법"
            placeholderTextColor={colors.textFaint}
            onSubmitEditing={() => chooseTask(draftTask.trim())}
            returnKeyType="done"
          />
          <Pressable onPress={() => chooseTask(draftTask.trim())} style={styles.taskAdd}>
            <Ionicons name="arrow-forward" size={20} color={colors.onAccent} />
          </Pressable>
        </View>

        {tasks.length > 0 && (
          <>
            <Label style={styles.sectionLabel}>최근</Label>
            <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
              {tasks.map((name) => (
                <View key={name} style={styles.taskRow}>
                  <Pressable style={styles.taskPick} onPress={() => chooseTask(name)}>
                    <Ionicons
                      name={task === name ? 'radio-button-on' : 'radio-button-off'}
                      size={17}
                      color={task === name ? colors.accent : colors.textFaint}
                    />
                    <Text style={styles.taskName}>{name}</Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      setTasks(await forgetTask(name));
                      if (task === name) setTask('');
                    }}
                    hitSlop={10}
                    style={styles.taskRemove}
                  >
                    <Ionicons name="close" size={16} color={colors.textFaint} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        <Pressable onPress={() => chooseTask('')} style={styles.clearTask}>
          <Text style={styles.clearTaskText}>작업 없이 진행</Text>
        </Pressable>
      </Sheet>

      <Sheet visible={settingsOpen} title="설정" onClose={() => setSettingsOpen(false)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Label>시간</Label>
          <StepperRow
            title="집중"
            value={settings.focus}
            unit="분"
            min={1}
            max={90}
            step={5}
            onChange={(v) => update({ focus: v })}
          />
          <StepperRow
            title="짧은 휴식"
            value={settings.shortBreak}
            unit="분"
            min={1}
            max={30}
            onChange={(v) => update({ shortBreak: v })}
          />
          <StepperRow
            title="긴 휴식"
            value={settings.longBreak}
            unit="분"
            min={5}
            max={60}
            step={5}
            onChange={(v) => update({ longBreak: v })}
          />
          <StepperRow
            title="긴 휴식까지"
            value={settings.roundsBeforeLong}
            unit="개"
            min={2}
            max={8}
            onChange={(v) => update({ roundsBeforeLong: v })}
          />

          <Label style={styles.sectionLabel}>진행</Label>
          <ToggleRow
            icon="play-forward"
            title="휴식 자동 시작"
            description="집중이 끝나면 바로 휴식으로 넘어갑니다."
            value={settings.autoStartBreak}
            onChange={(v) => update({ autoStartBreak: v })}
          />
          <ToggleRow
            icon="play"
            title="집중 자동 시작"
            description="휴식이 끝나면 바로 다음 집중을 시작합니다."
            value={settings.autoStartFocus}
            onChange={(v) => update({ autoStartFocus: v })}
          />

          <Label style={styles.sectionLabel}>알림</Label>
          <ToggleRow
            icon="notifications-outline"
            title="종료 알림"
            description="앱을 닫아두어도 끝나는 시각에 알려줍니다."
            value={settings.notify}
            onChange={(v) => update({ notify: v })}
          />
          <ToggleRow
            icon="phone-portrait-outline"
            title="진동"
            value={settings.vibrate}
            onChange={(v) => update({ vibrate: v })}
          />
          <ToggleRow
            icon="sunny-outline"
            title="화면 켜두기"
            description="타이머가 도는 동안 화면이 꺼지지 않습니다."
            value={settings.keepAwake}
            onChange={(v) => update({ keepAwake: v })}
          />
        </ScrollView>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  flex: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandIcon: { width: 22, height: 22 * (1002 / 990) },
  brand: {
    fontFamily: font.bold,
    color: colors.text,
    fontSize: 21,
    letterSpacing: -0.5,
  },
  gear: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  subline: {
    fontFamily: font.regular,
    color: colors.textFaint,
    fontSize: 13,
    marginTop: 4,
  },

  segment: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    marginTop: 16,
    marginBottom: 10,
  },
  segmentItem: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
  },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentText: { fontFamily: font.semibold, color: colors.textDim, fontSize: 13 },
  segmentTextActive: { fontFamily: font.bold, color: colors.onAccent },

  content: { flex: 1 },

  taskInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  taskInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: font.regular,
    color: colors.text,
    fontSize: 15,
  },
  taskAdd: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },

  sectionLabel: { marginTop: 22, marginBottom: 2 },
  taskList: { maxHeight: 240, marginTop: 6 },
  taskRow: { flexDirection: 'row', alignItems: 'center' },
  taskPick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
  },
  taskName: { fontFamily: font.regular, color: colors.text, fontSize: 15 },
  taskRemove: { padding: 8 },

  clearTask: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  clearTaskText: { fontFamily: font.semibold, color: colors.textFaint, fontSize: 13 },
});
