import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { fonts, hardShadow, Palette, useTheme } from '../src/theme';
import type { BugPuzzle, Format, OrderPuzzle } from '../src/types';
import type { GameState } from '../src/game/orderEngine';
import type { BugGame } from '../src/game/bugEngine';
import { getTodaysBugPuzzle, getTodaysPuzzle } from '../src/lib/puzzles';
import { loadGame, loadStreak, MAX_TRIES, StreakInfo } from '../src/lib/storage';
import { formatClock, localDateKey, msUntilMidnight } from '../src/lib/date';
import BootScreen from '../src/components/BootScreen';
import { Label, Loading, TextLink } from '../src/components/ui';

type Today = {
  order: OrderPuzzle;
  bug: BugPuzzle;
  orderGame: GameState | null;
  bugGame: BugGame | null;
  streak: StreakInfo;
};

type Status = { label: string; tone: 'new' | 'active' | 'won' | 'lost' };

function statusOf(game: { status: string } | null, used: number, max: number): Status {
  if (game?.status === 'won') return { label: `SOLVED ${used}/${max}`, tone: 'won' };
  if (game?.status === 'lost') return { label: `FAILED X/${max}`, tone: 'lost' };
  if (game && used > 0) return { label: `${max - used} TRIES LEFT`, tone: 'active' };
  return { label: 'NEW', tone: 'new' };
}

const PROGRAMS: { format: Format; name: string; blurb: string; route: '/order' | '/bug' }[] = [
  { format: 'order', name: 'Order', blurb: 'Put the shuffled lines back in order. One of them is a decoy.', route: '/order' },
  { format: 'bug', name: 'Bug Hunt', blurb: 'One line in this function is wrong. Find it.', route: '/bug' },
];

export default function Home() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [today, setToday] = useState<Today | null>(null);
  const [booting, setBooting] = useState(true);
  const [left, setLeft] = useState(msUntilMidnight());
  const loadedDay = useRef('');

  const load = useCallback(async () => {
    const [order, bug] = await Promise.all([getTodaysPuzzle(), getTodaysBugPuzzle()]);
    const [orderGame, bugGame, streak] = await Promise.all([
      loadGame('order', order.number),
      loadGame('bug', bug.number),
      loadStreak(),
    ]);
    loadedDay.current = localDateKey();
    setToday({ order, bug, orderGame, bugGame, streak });
  }, []);

  // Reload on focus so statuses update after playing, and when the app wakes on a new day.
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && loadedDay.current && loadedDay.current !== localDateKey()) load();
    });
    const t = setInterval(() => setLeft(msUntilMidnight()), 1000);
    return () => { sub.remove(); clearInterval(t); };
  }, [load]);

  // The boot screen sits in the same slot in both renders so it isn't remounted when loading finishes.
  const boot = booting ? (
    <BootScreen ready={!!today} number={today?.order.number} theme={theme} onDone={() => setBooting(false)} />
  ) : null;
  if (!today) return <View style={s.root}>{null}{boot ?? <Loading theme={theme} />}</View>;

  const statuses: Record<Format, Status> = {
    order: statusOf(today.orderGame, today.orderGame?.attempts.length ?? 0, MAX_TRIES.order),
    bug: statusOf(today.bugGame, today.bugGame?.guesses.length ?? 0, MAX_TRIES.bug),
  };
  const titles: Record<Format, string> = { order: today.order.title, bug: today.bug.title };
  const solved = Object.values(statuses).filter((st) => st.tone === 'won').length;
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();

  return (
    <View style={s.root}>
      <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.header}>
            <Text style={s.mark} accessibilityRole="header">
              <Text style={s.paren}>while(</Text>streak<Text style={s.paren}>)</Text>
            </Text>
            <View style={s.nav}>
              <TextLink label="Board" onPress={() => router.push('/leaderboard')} theme={theme} />
              <TextLink label="Account" onPress={() => router.push('/account')} theme={theme} />
            </View>
          </View>

          <View style={s.status}>
            <Text style={s.statusText}>NO. {String(today.order.number).padStart(3, '0')}</Text>
            <Text style={s.statusText}>{date}</Text>
            <Text style={s.statusText} accessibilityLabel={`Current streak ${today.streak.count}`}>
              STREAK {String(today.streak.count).padStart(2, '0')}
            </Text>
          </View>

          <Text style={s.title}>Today's programs</Text>
          <Text style={s.lede}>Solve either one to keep your streak. Lose both and it resets.</Text>

          <View style={s.cards}>
            {PROGRAMS.map((prog, i) => {
              const st = statuses[prog.format];
              const done = st.tone === 'won' || st.tone === 'lost';
              return (
                <Pressable
                  key={prog.format}
                  onPress={() => router.push(prog.route)}
                  accessibilityRole="button"
                  accessibilityLabel={`${prog.name}: ${titles[prog.format]}. ${st.label.toLowerCase()}`}
                  style={({ pressed }) => [s.card, pressed ? { transform: [{ translateX: 4 }, { translateY: 4 }] } : hardShadow(theme, 4)]}
                >
                  <View style={s.cardTop}>
                    <Label theme={theme} index={i + 1}>{prog.name}</Label>
                    <Badge status={st} theme={theme} />
                  </View>
                  <Text style={s.cardTitle}>{titles[prog.format]}</Text>
                  <Text style={s.blurb}>{prog.blurb}</Text>
                  <View style={s.cardFoot}>
                    <Text style={s.footText}>{MAX_TRIES[prog.format]} TRIES</Text>
                    <Text style={s.run}>{done ? 'REVIEW' : st.tone === 'active' ? 'RESUME' : 'RUN'} -&gt;</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={s.summary}>
            <View>
              <Text style={s.summaryValue}>{solved}/2</Text>
              <Text style={s.summaryLabel}>SOLVED TODAY</Text>
            </View>
            <View>
              <Text style={s.summaryValue}>{today.streak.best}</Text>
              <Text style={s.summaryLabel}>BEST STREAK</Text>
            </View>
            <View style={{ alignItems: 'flex-end', flex: 1 }}>
              <Text style={s.summaryValue}>{formatClock(left)}</Text>
              <Text style={s.summaryLabel}>NEXT PUZZLES</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      {boot}
    </View>
  );
}

function Badge({ status, theme }: { status: Status; theme: Palette }) {
  const tones = {
    new: { bg: theme.accent, fg: theme.accentInk, border: theme.accent },
    active: { bg: 'transparent', fg: theme.ink, border: theme.ink },
    won: { bg: theme.ok, fg: theme.bg, border: theme.ok },
    lost: { bg: 'transparent', fg: theme.bad, border: theme.bad },
  }[status.tone];
  return (
    <Text style={[badge.text, { backgroundColor: tones.bg, color: tones.fg, borderColor: tones.border }]}>{status.label}</Text>
  );
}

const badge = StyleSheet.create({
  text: {
    fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.4, borderWidth: 1.5,
    paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden',
  },
});

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    screen: { flex: 1, backgroundColor: t.bg },
    content: { padding: 16, paddingBottom: 56, maxWidth: 600, width: '100%', alignSelf: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
    nav: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    mark: { fontFamily: fonts.display, fontSize: 34, color: t.ink },
    paren: { color: t.accent },
    status: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: t.ink, paddingHorizontal: 10, paddingVertical: 6 },
    statusText: { fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 1.6, color: t.bg },
    title: { fontFamily: fonts.display, fontSize: 44, lineHeight: 44, color: t.ink, marginTop: 24 },
    lede: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: t.muted, marginTop: 6 },
    cards: { gap: 22, marginTop: 24 },
    card: { backgroundColor: t.surface, borderColor: t.ink, borderWidth: 2, padding: 16 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: fonts.display, fontSize: 36, lineHeight: 38, color: t.ink, marginTop: 10 },
    blurb: { fontFamily: fonts.mono, fontSize: 12.5, lineHeight: 19, color: t.muted, marginTop: 2 },
    cardFoot: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10,
      borderTopWidth: 1, borderStyle: 'dashed', borderColor: t.line,
    },
    footText: { fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 1.6, color: t.muted },
    run: { fontFamily: fonts.monoBold, fontSize: 13, letterSpacing: 1.6, color: t.accent },
    summary: { flexDirection: 'row', gap: 28, marginTop: 32, borderTopWidth: 2, borderColor: t.ink, paddingTop: 12 },
    summaryValue: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32, color: t.ink },
    summaryLabel: { fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 1.6, color: t.muted },
  });
