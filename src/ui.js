import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, font, label, radius } from './theme';

export function Card({ style, children }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children, style }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function BigButton({ icon, text, tint, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.big,
        { backgroundColor: tint },
        style,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={21} color={colors.onAccent} />
      <Text style={styles.bigText}>{text}</Text>
    </Pressable>
  );
}

export function RoundButton({ icon, onPress, size = 52, tint, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.round,
        { width: size, height: size },
        disabled && styles.dimmed,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={size * 0.4}
        color={disabled ? colors.textFaint : tint || colors.textDim}
      />
    </Pressable>
  );
}

export function Chip({ text, active, tint, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: tint },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
    </Pressable>
  );
}

export function Sheet({ visible, title, onClose, children }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const [keyboard, setKeyboard] = useState(0);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // 시트는 Modal 안이라 바깥의 KeyboardAvoidingView 가 닿지 않는다.
  // 키보드 높이를 직접 받아 그만큼 밀어 올린다.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboard(e.endCoordinates?.height || 0)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const dismissRef = useRef(null);
  dismissRef.current = () => {
    Animated.timing(translateY, {
      toValue: 800,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      translateY.setValue(0);
      closeRef.current?.();
    });
  };

  // 손잡이 띠에서 터치가 시작되면 이 제스처를 확실히 가져간다.
  const drag = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },

      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 0.7 || Math.abs(g.dy) < 6) {
          dismissRef.current();
          return;
        }

        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: false,
          bounciness: 2,
        }).start();
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: false,
          bounciness: 2,
        }).start();
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.sheetRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              marginBottom: keyboard,
              maxHeight: keyboard > 0 ? '60%' : '88%',
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.dragZone} {...drag.panHandlers}>
            <View style={styles.grabber} />
          </View>

          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textDim} />
            </Pressable>
          </View>

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function ToggleRow({ icon, title, description, value, onChange }) {
  return (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={19} color={colors.textDim} />
      <View style={styles.settingBody}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description ? (
          <Text style={styles.settingDescription}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceHigh, true: colors.accentDim }}
        thumbColor={value ? colors.accent : colors.textFaint}
      />
    </View>
  );
}

export function StepperRow({ title, value, unit, min, max, step = 1, onChange }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingBody}>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>

      <View style={styles.stepper}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
          hitSlop={8}
          style={styles.stepperButton}
        >
          <Ionicons name="remove" size={18} color={colors.textDim} />
        </Pressable>
        <Text style={styles.stepperValue}>
          {value}
          {unit}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          hitSlop={8}
          style={styles.stepperButton}
        >
          <Ionicons name="add" size={18} color={colors.textDim} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
  },
  label: { ...label },
  dimmed: { opacity: 0.4 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },

  big: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: radius.pill,
  },
  bigText: { fontFamily: font.bold, color: colors.onAccent, fontSize: 17 },

  round: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
  },
  chipText: { fontFamily: font.semibold, color: colors.textDim, fontSize: 13 },
  chipTextActive: { fontFamily: font.bold, color: colors.onAccent },

  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30,27,38,0.34)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  dragZone: { height: 38, alignItems: 'center', justifyContent: 'center' },
  grabber: {
    width: 46,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.lineStrong,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: { fontFamily: font.bold, color: colors.text, fontSize: 19, letterSpacing: -0.4 },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  settingBody: { flex: 1 },
  settingTitle: { fontFamily: font.semibold, color: colors.text, fontSize: 15 },
  settingDescription: {
    fontFamily: font.regular,
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    padding: 4,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontFamily: font.bold,
    color: colors.text,
    fontSize: 14,
    minWidth: 46,
    textAlign: 'center',
  },
});
