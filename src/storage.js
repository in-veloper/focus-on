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

// 집중 한 판이 끝날 때마다 그날 기록에 더한다.
export async function recordSession({ minutes, task }) {
  const stats = await loadStats();
  const key = dateKey();
  const day = stats[key] || { minutes: 0, sessions: 0, tasks: {} };

  day.minutes += minutes;
  day.sessions += 1;

  const name = (task || '').trim();
  if (name) day.tasks[name] = (day.tasks[name] || 0) + minutes;

  stats[key] = day;
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
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

export function formatMinutes(minutes) {
  if (!minutes) return '0분';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}분`;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}
