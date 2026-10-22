import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, AppState, LayoutAnimation, Platform, Pressable,
  ScrollView, type ScrollViewInstance, Share, StyleSheet, Text, UIManager, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { fonts, hardShadow, Palette, useTheme } from '../src/theme';
import type { OrderPuzzle } from '../src/types';
import * as E from '../src/game/orderEngine';
import { getTodaysPuzzle } from '../src/lib/puzzles';
import { loadGame, loadStats, loadStreak, recordFinish, saveGame, Stats, StreakInfo } from '../src/lib/storage';
import { localDateKey } from '../src/lib/date';
import { FinishedResult, submitResult } from '../src/lib/results';
import CodeLine from '../src/components/CodeLine';
import RichText from '../src/components/RichText';
import ResultCard from '../src/components/ResultCard';
import { Button, Cursor, Label, Loading } from '../src/components/ui';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const animate = () => LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
const REVEAL_MS = 700;

const toResult = (g: E.GameState): FinishedResult => ({
  format: 'order',
  puzzleNumber: g.puzzleNumber,
  won: g.status === 'won',
  tries: g.attempts.length,
  timeMs: (g.endedAt ?? Date.now()) - g.startedAt,
  grid: g.attempts,
});

export default function OrderScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);

  const [puzzle, setPuzzle] = useState<OrderPuzzle | null>(null);
  const [game, setGame] = useState<E.GameState | null>(null);
  const [pool, setPool] = useState<string[]>([]);
  const [streak, setStreak] = useState<StreakInfo>({ count: 0, best: 0, last: null });
  const [stats, setStats] = useState<Stats>({ played: 0, wins: 0, dist: [0, 0, 0, 0] });
  const [reveal, setReveal] = useState<boolean[] | null>(null);
  const loadedDay = useRef<string>('');
  const scrollRef = useRef<ScrollViewInstance>(null);
  const shake = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const p = await getTodaysPuzzle();
    const g = (await loadGame('order', p.number)) ?? E.newGame(p);
    loadedDay.current = localDateKey();
    setPuzzle(p);
    setPool(E.poolOrder(p));
    setGame(g);
    setStreak(await loadStreak());
    setStats(await loadStats('order'));
  }, []);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && loadedDay.current && loadedDay.current !== localDateKey()) load();
    });
    return () => sub.remove();
  }, [load]);

  const commit = (next: E.GameState) => {
    setGame(next);
    saveGame('order', next);
  };

  // Retry uploading a finished result whenever this screen regains focus (e.g. after signing in).
  useFocusEffect(
    useCallback(() => {
      if (!game || !puzzle || game.status === 'playing' || game.submitted) return;
      submitResult(toResult(game)).then((ok) => ok && commit({ ...game, submitted: true }));
    }, [game, puzzle]),
  );

  if (!puzzle || !game) return <Loading theme={theme} />;

  const playing = game.status === 'playing' && !reveal;
  const placed = E.placedIds(game);
  const firstEmpty = game.slots.findIndex((x) => x === null);
  const triesLeft = E.MAX_TRIES - game.attempts.length;

  const onPlace = (id: string) => {
    if (!playing) return;
    const next = E.place(game, id);
    if (next === game) return;
    Haptics.selectionAsync();
    animate();
    commit(next);
  };

  const onUnplace = (i: number) => {
    if (!playing) return;
    const next = E.unplace(game, i);
    if (next === game) return;
    Haptics.selectionAsync();
    animate();
    commit(next);
  };

  const onClear = () => {
    if (!playing) return;
    animate();
    commit(E.clearUnlocked(game));
  };

  const onCheck = () => {
    if (!playing || !E.isFull(game)) return;
    const row = E.evaluate(game, puzzle);
    const solved = row.every(Boolean);
    setReveal(row);
    if (solved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence(
        [8, -8, 5, -5, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 60, useNativeDriver: true })),
      ).start();
    }
    setTimeout(async () => {
      let next = E.applyResult(game, puzzle, row);
      animate();
      setReveal(null);
      if (next.status !== 'playing') {
        const res = await recordFinish('order', next.status === 'won', next.attempts.length);
        setStreak(res.streak);
        setStats(res.stats);
        if (await submitResult(toResult(next))) next = { ...next, submitted: true };
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
      }
      commit(next);
    }, REVEAL_MS);
  };

  const onShare = () => {
    Share.share({ message: E.shareText(game, puzzle, streak.count) });
  };

  return (
    <View style={s.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.content}>
        <View style={s.status}>
          <Text style={s.statusText}>NO. {String(puzzle.number).padStart(3, '0')}</Text>
          <Text style={s.statusText}>FORMAT: ORDER</Text>
          <Text style={s.statusText} accessibilityLabel={`Current streak ${streak.count}`}>
            STREAK {String(streak.count).padStart(2, '0')}
          </Text>
        </View>

        <Text style={s.title}>{puzzle.title}</Text>
        <RichText text={puzzle.prompt} theme={theme} style={s.prompt} />

        <View style={s.tries} accessibilityLabel={`${triesLeft} of ${E.MAX_TRIES} tries left`}>
          {Array.from({ length: E.MAX_TRIES }, (_, i) => (
            <View key={i} style={[s.pip, i < game.attempts.length && { backgroundColor: theme.ink }]} />
          ))}
          <Label theme={theme} style={{ marginLeft: 6 }}>{`${triesLeft} of ${E.MAX_TRIES} tries left`}</Label>
        </View>

        <Label theme={theme} index={1} style={s.section}>Solution</Label>
        <Animated.View style={[s.editor, { transform: [{ translateX: shake }] }]}>
          {game.slots.map((slot, i) => {
            const verdict = reveal ? reveal[i] : null;
            const isNext = playing && i === firstEmpty;
            const line = slot ? E.lineById(puzzle, slot.id) : null;
            return (
              <View key={i} style={s.row}>
                <Text style={s.gutter}>{String(i + 1).padStart(2, '0')}</Text>
                <Pressable
                  onPress={() => onUnplace(i)}
                  disabled={!slot || slot.locked || !playing}
                  accessibilityRole="button"
                  accessibilityLabel={line ? `Line ${i + 1}: ${line.text}${slot?.locked ? ', correct' : ', tap to remove'}` : `Empty line ${i + 1}`}
                  style={[
                    s.slot,
                    !slot && s.slotEmpty,
                    isNext && { borderStyle: 'solid', borderColor: theme.accent },
                    slot?.locked && { backgroundColor: theme.okBg },
                    verdict === true && { backgroundColor: theme.okBg, borderColor: theme.ok },
                    verdict === false && { backgroundColor: theme.badBg, borderColor: theme.bad },
                  ]}
                >
                  {line && <CodeLine text={line.text} indent={line.indent} theme={theme} />}
                  {isNext && <Cursor theme={theme} height={15} />}
                </Pressable>
              </View>
            );
          })}
        </Animated.View>

        {game.status === 'playing' && (
          <>
            <Label theme={theme} index={2} style={s.section}>Lines, tap to place</Label>
            <View style={s.pool}>
              {pool
                .filter((id) => !placed.has(id))
                .map((id) => {
                  const line = E.lineById(puzzle, id);
                  return (
                    <Pressable
                      key={id}
                      onPress={() => onPlace(id)}
                      disabled={!playing}
                      accessibilityRole="button"
                      accessibilityLabel={`Place line: ${line.text}`}
                      style={({ pressed }) => [s.chip, pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : hardShadow(theme, 2)]}
                    >
                      <CodeLine text={line.text} indent={line.indent} guides theme={theme} />
                    </Pressable>
                  );
                })}
            </View>

            <View style={s.actions}>
              <Button label="Clear" onPress={onClear} theme={theme} disabled={!playing || !E.hasUnlocked(game)} />
              <Button label="Check" variant="primary" onPress={onCheck} theme={theme} disabled={!playing || !E.isFull(game)} style={{ flex: 1 }} />
            </View>
            <Text style={s.hint}>Tap a placed line to send it back. Green lines lock in after each check.</Text>
          </>
        )}

        {game.status !== 'playing' && !reveal && (
          <ResultCard
          won={game.status === 'won'}
          tries={game.attempts.length}
          maxTries={E.MAX_TRIES}
          timeMs={(game.endedAt ?? Date.now()) - game.startedAt}
          grid={game.attempts}
          lostNote="The correct order is filled in above."
          why={puzzle.why}
          section={3}
          streak={streak}
          stats={stats}
          theme={theme}
          onShare={onShare}
          onLeaderboard={() => router.push({ pathname: '/leaderboard', params: { format: 'order' } })}
        />
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    content: { padding: 16, paddingBottom: 56, maxWidth: 600, width: '100%', alignSelf: 'center' },
    status: {
      flexDirection: 'row', justifyContent: 'space-between', backgroundColor: t.ink,
      paddingHorizontal: 10, paddingVertical: 6,
    },
    statusText: { fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 1.6, color: t.bg },
    title: { fontFamily: fonts.display, fontSize: 52, lineHeight: 52, color: t.ink, marginTop: 20 },
    prompt: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 22, color: t.ink, marginTop: 8 },
    tries: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 18 },
    pip: { width: 12, height: 12, borderWidth: 2, borderColor: t.ink },
    section: { marginTop: 26, marginBottom: 10 },
    editor: { backgroundColor: t.surface, borderColor: t.ink, borderWidth: 2, paddingVertical: 6, ...hardShadow(t, 4) },
    row: { flexDirection: 'row', alignItems: 'stretch', minHeight: 42 },
    gutter: { width: 34, textAlign: 'right', paddingRight: 10, fontFamily: fonts.mono, fontSize: 11, color: t.muted, alignSelf: 'center' },
    slot: {
      flex: 1, flexDirection: 'row', alignItems: 'center', marginVertical: 2, marginRight: 8, borderWidth: 1.5,
      borderColor: 'transparent', paddingHorizontal: 8, paddingVertical: 6,
    },
    slotEmpty: { borderStyle: 'dashed', borderColor: t.line, backgroundColor: t.slot },
    pool: { gap: 10 },
    chip: { backgroundColor: t.surface, borderColor: t.ink, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 9 },
    actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    hint: { fontFamily: fonts.mono, color: t.muted, fontSize: 12, lineHeight: 18, marginTop: 14 },
  });
