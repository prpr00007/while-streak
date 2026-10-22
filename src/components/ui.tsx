import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { fonts, hardShadow, Palette } from '../theme';

// Small uppercase label used for section headings, e.g. "01 / SOLUTION".
export function Label({ children, theme, index, style }: { children: string; theme: Palette; index?: number; style?: TextStyle }) {
  return (
    <Text style={[{ fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 1.8, color: theme.muted }, style]}>
      {index !== undefined && <Text style={{ color: theme.accent }}>{String(index).padStart(2, '0')} / </Text>}
      {children.toUpperCase()}
    </Text>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  theme: Palette;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  style?: ViewStyle;
};

// Square button with a hard shadow; pressing pushes it down into the shadow.
export function Button({ label, onPress, theme, variant = 'outline', disabled, style }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        b.base,
        { borderColor: theme.ink, backgroundColor: primary ? theme.accent : theme.surface },
        !disabled && !pressed && hardShadow(theme),
        pressed && { transform: [{ translateX: 3 }, { translateY: 3 }] },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Text style={[b.text, { color: primary ? theme.accentInk : theme.ink }]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

// Plain underlined text action for secondary navigation.
export function TextLink({ label, onPress, theme, color }: { label: string; onPress: () => void; theme: Palette; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.6 }}>
      <Text style={[b.link, { color: color ?? theme.ink, textDecorationColor: color ?? theme.ink }]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

// Blinking block cursor, as on a terminal waiting for input.
export function Cursor({ theme, height = 16 }: { theme: Palette; height?: number }) {
  const on = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(on, { toValue: 0, duration: 0, delay: 530, useNativeDriver: true }),
        Animated.timing(on, { toValue: 1, duration: 0, delay: 530, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on]);
  return <Animated.View style={{ width: height * 0.55, height, backgroundColor: theme.accent, opacity: on }} />;
}

// Full-screen "LOADING" state with a cursor, in place of a spinner.
export function Loading({ theme }: { theme: Palette }) {
  return (
    <View style={[b.center, { backgroundColor: theme.bg }]}>
      <View style={b.loadingRow}>
        <Text style={{ fontFamily: fonts.display, fontSize: 28, color: theme.ink }}>LOADING</Text>
        <Cursor theme={theme} height={22} />
      </View>
    </View>
  );
}

const b = StyleSheet.create({
  base: { borderWidth: 2, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.monoBold, fontSize: 14, letterSpacing: 2 },
  link: { fontFamily: fonts.monoMedium, fontSize: 12, letterSpacing: 1.6, textDecorationLine: 'underline' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
