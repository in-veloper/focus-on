import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'focuson/settings';
const STATS_KEY = 'focuson/stats';
const TASKS_KEY = 'focuson/tasks';

export const DEFAULT_SETTINGS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  roundsBeforeLong: 4,
  autoStartBreak: true,
  autoStartFocus: false,
  keepAwake: true,
  vibrate: true,
  notify: true,
};

export function dateKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 설정 저장 실패는 다음 실행에 기본값으로 돌아갈 뿐이라 무시한다.
  }
}

export async function loadStats() {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// 읽고-고치고-쓰는 기록 작업이 겹치면 한쪽이 덮어써지므로 차례로 실행한다.
let writeQueue = Promise.resolve();
function queued(fn) {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => {});
  return run;
}

function dayOf(stats, key) {
  const day = stats[key] || { minutes: 0, sessions: 0, tasks: {} };
  if (!day.tasks) day.tasks = {};
  stats[key] = day;
  return day;
}

// 집중 모드로 실제 흐른 구간(start~end, ms)을 더한다. 중간에 멈춘 시간도 그대로 쌓이고,
// 자정을 넘긴 구간은 날짜별로 나눠 넣는다. minutes 는 소수(초 단위 정밀도)로 쌓인다.
export function recordFocus({ start, end, task }) {
  return queued(async () => {
    const stats = await loadStats();
    const name = (task || '').trim();

    let from = start;
    while (from < end) {
      const d = new Date(from);
      const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      const to = Math.min(end, midnight);
      const minutes = (to - from) / 60000;

      const day = dayOf(stats, dateKey(d));
      day.minutes += minutes;
      if (name) day.tasks[name] = (day.tasks[name] || 0) + minutes;

      from = to;
    }

    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
    return stats;
  });
}

// 집중 한 판을 끝까지 채웠을 때만 세션 수를 올린다.
export function recordSessionDone() {
  return queued(async () => {
    const stats = await loadStats();
    dayOf(stats, dateKey()).sessions += 1;
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
    return stats;
  });
}

// 공부한 날만 최근 날짜부터.
export function historyOf(stats) {
  return Object.entries(stats)
    .filter(([, day]) => (day.minutes || 0) >= 1)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, day]) => {
      const [y, m, d] = key.split('-').map(Number);
      return { key, date: new Date(y, m - 1, d), ...day };
    });
}

export async function loadTasks() {
  try {
    const raw = await AsyncStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function rememberTask(name) {
  const clean = (name || '').trim();
  if (!clean) return loadTasks();

  const tasks = await loadTasks();
  const next = [clean, ...tasks.filter((t) => t !== clean)].slice(0, 12);
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(next));
  return next;
}

export async function forgetTask(name) {
  const tasks = await loadTasks();
  const next = tasks.filter((t) => t !== name);
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(next));
  return next;
}

export function lastDays(stats, count = 7) {
  const days = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = dateKey(date);
    const day = stats[key] || { minutes: 0, sessions: 0, tasks: {} };
    days.push({ key, date, ...day });
  }
  return days;
}

// 오늘(또는 어제)부터 거꾸로 세어 집중 기록이 끊기지 않은 날 수.
export function streakOf(stats) {
  const today = new Date();
  let count = 0;

  for (let i = 0; i < 400; i += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const day = stats[dateKey(date)];

    if (day && day.sessions > 0) {
      count += 1;
    } else if (i > 0) {
      break;
    }
    // 오늘 아직 안 했으면 어제부터 이어서 센다.
  }

  return count;
}

export function totalOf(stats) {
  return Object.values(stats).reduce(
    (acc, day) => ({
      minutes: acc.minutes + (day.minutes || 0),
      sessions: acc.sessions + (day.sessions || 0),
    }),
    { minutes: 0, sessions: 0 }
  );
}

// minutes 는 소수일 수 있어서 초로 반올림한 뒤 분 단위로 내린다.
export function splitMinutes(minutes) {
  const whole = Math.floor(Math.round((minutes || 0) * 60) / 60);
  return { hours: Math.floor(whole / 60), mins: whole % 60 };
}

export function formatMinutes(minutes) {
  const { hours, mins } = splitMinutes(minutes);
  if (!hours) return `${mins}분`;
  return mins ? `${hours}시간 ${mins}분` : `${hours}시간`;
}

// 막대그래프 위처럼 좁은 자리에 쓰는 짧은 표기.
export function formatShort(minutes) {
  const { hours, mins } = splitMinutes(minutes);
  if (!hours && !mins) return '';
  if (!hours) return `${mins}분`;
  return `${(hours + mins / 60).toFixed(1)}h`;
}
