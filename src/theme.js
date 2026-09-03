// 공룡 크레용 그림의 색을 그대로 가져왔다: 잎사귀 초록, 골판 노랑, 종이 크림.
export const colors = {
  bg: '#FBF3E3',
  surface: '#FFFDF7',
  surfaceHigh: '#F4E7C9',
  surfaceSoft: 'rgba(58, 46, 32, 0.05)',

  line: 'rgba(58, 46, 32, 0.10)',
  lineStrong: 'rgba(58, 46, 32, 0.22)',

  text: '#3A2E20',
  textDim: '#8A7960',
  textFaint: '#BBA98C',

  accent: '#5E9C2C',
  accentSoft: '#8FCC3B',
  accentDim: 'rgba(94, 156, 44, 0.14)',

  onAccent: '#FFFDF7',
  danger: '#D6553F',

  // 다이얼 판과 골판 장식
  dialFace: '#FFFDF7',
  dialTick: 'rgba(58, 46, 32, 0.24)',
  dialTickMajor: 'rgba(58, 46, 32, 0.5)',
  dialNumber: '#9C8A6E',
  spike: '#F2B93A',
  spikeLine: '#2B2318',
};

// 세 구간. 집중은 공룡 몸통 초록, 짧은 휴식은 골판 노랑, 긴 휴식은 책 표지 파랑.
export const MODES = {
  focus: {
    key: 'focus',
    label: '집중',
    caption: '집중하는 중',
    tint: '#5E9C2C',
    soft: 'rgba(94, 156, 44, 0.14)',
  },
  shortBreak: {
    key: 'shortBreak',
    label: '짧은 휴식',
    caption: '잠시 쉬는 중',
    tint: '#E8A324',
    soft: 'rgba(232, 163, 36, 0.16)',
  },
  longBreak: {
    key: 'longBreak',
    label: '긴 휴식',
    caption: '길게 쉬는 중',
    tint: '#4E7CAE',
    soft: 'rgba(78, 124, 174, 0.14)',
  },
};

export const MODE_ORDER = ['focus', 'shortBreak', 'longBreak'];

export const font = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const label = {
  fontFamily: font.bold,
  fontSize: 11,
  letterSpacing: 1.6,
  color: colors.textFaint,
};
