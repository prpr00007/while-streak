import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, Palette } from '../theme';
import { Cursor, Label } from './ui';

type Props = {
  ready: boolean; // today's puzzle and save are loaded
  number?: number;
  theme: Palette;
  onDone: () => void;
};

const TICK_MS = 70;
const TICKS_PER_LINE = 3;
const FILL_TICKS = 18; // about 1.3s for the bar to fill
const SEGMENTS = 16;
const HOLD_MS = 280;
const FADE_MS = 260;
const WIDTH = 22; // log lines are dot-padded to this many characters before the status

// A short terminal-style boot log shown on cold start. The last line only reads OK once the
// puzzle has actually loaded, and the bar holds one segment short until then.
export default function BootScreen({ ready, number, theme, onDone }: Props) {
  const [tick, setTick] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const finished = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const t = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const finish = (animated: boolean) => {
    if (finished.current) return;
    finished.current = true;
    if (!animated) return onDone();
    Animated.timing(fade, { toValue: 0, duration: FADE_MS, delay: HOLD_MS, useNativeDriver: true }).start(() => onDone());
  };

  const complete = ready && tick >= FILL_TICKS;
  useEffect(() => {
    if (ready && reduceMotion) finish(false);
    else if (complete) finish(true);
  }, [ready, reduceMotion, complete]);

  const lines = [
    { text: 'load display', ok: true },
    { text: 'read save', ok: true },
    { text: number ? `fetch puzzle no.${String(number).padStart(3, '0')}` : 'fetch puzzle', ok: ready },
  ];
  const shown = Math.min(lines.length, Math.floor(tick / TICKS_PER_LINE) + 1);
  const filled = Math.min(ready ? SEGMENTS : SEGMENTS - 1, Math.floor((tick * SEGMENTS) / FILL_TICKS));
  const s = makeStyles(theme);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.screen, { opacity: fade }]}>
      <Pressable
        style={s.body}
        onPress={() => ready && finish(true)}
        accessibilityLabel={ready ? 'Loaded. Tap to start.' : 'Loading today’s puzzle'}
      >
        <Label theme={theme}>while(streak) system v0.1</Label>
        <Text style={s.mark}>
          <Text style={s.paren}>while(</Text>streak<Text style={s.paren}>)</Text>
        </Text>
        <Text style={s.tagline}>ONE PUZZLE A DAY. DON'T BREAK THE LOOP.</Text>

        <View style={s.log}>
          {lines.slice(0, shown).map((line, i) => {
            const last = i === shown - 1;
            return (
              <View key={line.text} style={s.logRow}>
                <Text style={s.logText}>
                  <Text style={{ color: theme.accent }}>&gt; </Text>
                  {(line.text + ' ').padEnd(WIDTH, '.')}
                  {line.ok ? <Text style={s.ok}> OK</Text> : ' '}
                </Text>
                {last && !line.ok && <Cursor theme={theme} height={13} />}
              </View>
            );
          })}
        </View>

        <View style={s.bar} accessibilityElementsHidden>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <View key={i} style={[s.segment, i < filled && { backgroundColor: theme.ink }]} />
          ))}
        </View>
        <Text style={s.percent}>{String(Math.round((filled / SEGMENTS) * 100)).padStart(3, ' ')}%</Text>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    screen: { backgroundColor: t.bg, zIndex: 10 },
    body: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, maxWidth: 520, width: '100%', alignSelf: 'center' },
    mark: { fontFamily: fonts.display, fontSize: 64, lineHeight: 68, color: t.ink, marginTop: 10 },
    paren: { color: t.accent },
    tagline: { fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 1.6, color: t.muted, marginTop: 4 },
    log: { marginTop: 36, minHeight: 3 * 22, gap: 4 },
    logRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    logText: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, color: t.muted },
    ok: { fontFamily: fonts.monoBold, color: t.ok },
    bar: { flexDirection: 'row', gap: 3, marginTop: 24, borderWidth: 2, borderColor: t.ink, padding: 3 },
    segment: { flex: 1, height: 12, backgroundColor: 'transparent' },
    percent: { fontFamily: fonts.display, fontSize: 22, color: t.ink, alignSelf: 'flex-end', marginTop: 6 },
  });
