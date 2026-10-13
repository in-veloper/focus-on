import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { cancelScheduled, scheduleEnd } from './notify';

const TICK_MS = 250;
const KEEP_AWAKE_TAG = 'focuson-timer';

const END_TEXT = {
  focus: { title: '집중 완료', body: '잠깐 쉬어가세요.' },
  shortBreak: { title: '휴식 끝', body: '다시 집중할 시간입니다.' },
  longBreak: { title: '긴 휴식 끝', body: '다시 집중할 시간입니다.' },
};

export function useTimer({ settings, onFocusTime, onSessionDone }) {
  const durationOf = useCallback(
    (mode) => Math.max(1, settings[mode] || 25) * 60000,
    [settings]
  );

  const [mode, setMode] = useState('focus');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(() => (settings.focus || 25) * 60000);
  const [round, setRound] = useState(0);

  // 타이머는 화면이 꺼져도 흘러야 하므로 "끝나는 시각"을 기준으로 계산한다.
  const endsAtRef = useRef(null);
  const remainingRef = useRef(remaining);
  const notifRef = useRef(null);
  const modeRef = useRef(mode);
  const roundRef = useRef(round);
  const settingsRef = useRef(settings);
  const onFocusTimeRef = useRef(onFocusTime);
  const onSessionDoneRef = useRef(onSessionDone);
  const completeRef = useRef(null);
  // 집중 모드로 시간이 흐르기 시작한 시각. 멈추거나 끝날 때 여기까지를 기록하고 비운다.
  const segStartRef = useRef(null);

  modeRef.current = mode;
  roundRef.current = round;
  settingsRef.current = settings;
  onFocusTimeRef.current = onFocusTime;
  onSessionDoneRef.current = onSessionDone;

  const clearNotification = useCallback(async () => {
    const id = notifRef.current;
    notifRef.current = null;
    await cancelScheduled(id);
  }, []);

  // 지금까지 흐른 집중 시간을 기록한다. keepGoing 이면 이어서 다시 잰다.
  const flushFocus = useCallback((keepGoing = false) => {
    const from = segStartRef.current;
    if (from == null) return;
    const now = Date.now();
    const end = endsAtRef.current ? Math.min(now, endsAtRef.current) : now;
    segStartRef.current = keepGoing ? end : null;
    if (end - from >= 1000) onFocusTimeRef.current?.(from, end);
  }, []);

  const start = useCallback(
    async (ms) => {
      const total = ms ?? remainingRef.current;
      if (total <= 0) return;

      endsAtRef.current = Date.now() + total;
      if (modeRef.current === 'focus') segStartRef.current = Date.now();
      remainingRef.current = total;
      setRemaining(total);
      setRunning(true);

      await clearNotification();

      if (settingsRef.current.notify) {
        const text = END_TEXT[modeRef.current] || END_TEXT.focus;
        notifRef.current = await scheduleEnd(total / 1000, text);
      }
    },
    [clearNotification]
  );

  const pause = useCallback(() => {
    flushFocus();
    const end = endsAtRef.current;
    const left = end ? Math.max(0, end - Date.now()) : remainingRef.current;

    endsAtRef.current = null;
    remainingRef.current = left;
    setRemaining(left);
    setRunning(false);
    clearNotification();
  }, [clearNotification, flushFocus]);

  const complete = useCallback(
    (recorded = true) => {
      const finished = modeRef.current;

      flushFocus();
      endsAtRef.current = null;
      setRunning(false);
      clearNotification();

      if (settingsRef.current.vibrate) {
        Vibration.vibrate([0, 300, 150, 300]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => {}
        );
      }

      let nextRound = roundRef.current;
      if (finished === 'focus') {
        if (recorded) onSessionDoneRef.current?.();
        nextRound += 1;
        setRound(nextRound);
        roundRef.current = nextRound;
      }

      const rounds = Math.max(1, settingsRef.current.roundsBeforeLong || 4);
      const next =
        finished === 'focus'
          ? nextRound % rounds === 0
            ? 'longBreak'
            : 'shortBreak'
          : 'focus';

      setMode(next);
      modeRef.current = next;

      const ms = Math.max(1, settingsRef.current[next] || 25) * 60000;
      remainingRef.current = ms;
      setRemaining(ms);

      const auto =
        next === 'focus'
          ? settingsRef.current.autoStartFocus
          : settingsRef.current.autoStartBreak;

      if (auto) start(ms);
    },
    [clearNotification, start, flushFocus]
  );

  completeRef.current = complete;

  useEffect(() => {
    if (!running) return undefined;

    const id = setInterval(() => {
      const end = endsAtRef.current;
      if (!end) return;

      const left = end - Date.now();
      if (left <= 0) {
        completeRef.current?.(true);
        return;
      }

      remainingRef.current = left;
      setRemaining(left);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [running]);

  // 앱을 다시 열었을 때 남은 시간을 곧바로 맞춘다.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      // 백그라운드로 갈 때 그때까지 잰 시간을 미리 저장해 둔다(앱이 그대로 종료돼도 안 날아가게).
      if (next !== 'active') {
        flushFocus(true);
        return;
      }
      if (!endsAtRef.current) return;

      const left = endsAtRef.current - Date.now();
      if (left <= 0) {
        completeRef.current?.(true);
        return;
      }

      remainingRef.current = left;
      setRemaining(left);
    });

    return () => sub.remove();
  }, [flushFocus]);

  useEffect(() => {
    if (!running || !settings.keepAwake) return undefined;

    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      try {
        deactivateKeepAwake(KEEP_AWAKE_TAG);
      } catch {
        // 이미 해제된 경우
      }
    };
  }, [running, settings.keepAwake]);

  // 설정에서 시간을 바꾸면, 멈춰 있을 때만 남은 시간을 새로 맞춘다.
  const durationsKey = `${settings.focus}-${settings.shortBreak}-${settings.longBreak}`;
  const durationsRef = useRef(durationsKey);

  useEffect(() => {
    if (durationsRef.current === durationsKey) return;
    durationsRef.current = durationsKey;
    if (running) return;

    const ms = durationOf(modeRef.current);
    remainingRef.current = ms;
    setRemaining(ms);
  }, [durationsKey, running, durationOf]);

  const changeMode = useCallback(
    (next) => {
      flushFocus();
      endsAtRef.current = null;
      setRunning(false);
      clearNotification();

      setMode(next);
      modeRef.current = next;

      const ms = durationOf(next);
      remainingRef.current = ms;
      setRemaining(ms);
    },
    [clearNotification, durationOf, flushFocus]
  );

  const toggle = useCallback(() => {
    if (running) pause();
    else start();
  }, [running, pause, start]);

  const reset = useCallback(() => changeMode(modeRef.current), [changeMode]);
  // 집중 중에 과목을 바꿀 때, 그때까지 흐른 시간을 이전 과목으로 먼저 저장한다.
  const checkpoint = useCallback(() => flushFocus(true), [flushFocus]);
  const skip = useCallback(() => complete(false), [complete]);

  return {
    mode,
    running,
    remaining,
    round,
    total: durationOf(mode),
    toggle,
    reset,
    skip,
    checkpoint,
    changeMode,
  };
}
