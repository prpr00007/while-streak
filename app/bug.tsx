import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Pressable, ScrollView, type ScrollViewInstance, Share, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { fonts, hardShadow, Palette, useTheme } from '../src/theme';
import type { BugPuzzle } from '../src/types';
import * as B from '../src/game/bugEngine';
import { getTodaysBugPuzzle } from '../src/lib/puzzles';
import { loadGame, loadStats, loadStreak, recordFinish, saveGame, Stats, StreakInfo } from '../src/lib/storage';
import { localDateKey } from '../src/lib/date';
import { FinishedResult, submitResult } from '../src/lib/results';
import CodeLine from '../src/components/CodeLine';
import RichText from '../src/components/RichText';
import ResultCard from '../src/components/ResultCard';
import { Button, Label, Loading } from '../src/components/ui';

const toResult = (g: B.BugGame, p: BugPuzzle): FinishedResult => ({
  format: 'bug',
  puzzleNumber: g.puzzleNumber,
  won: g.status === 'won',
  tries: g.guesses.length,
  timeMs: (g.endedAt ?? Date.now()) - g.startedAt,
  grid: B.gridRows(g, p),
});

export default function BugScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);

  const [puzzle, setPuzzle] = useState<BugPuzzle | null>(null);
  const [game, setGame] = useState<B.BugGame | null>(null);
  const [streak, setStreak] = useState<StreakInfo>({ count: 0, best: 0, last: null });
  const [stats, setStats] = useState<Stats>({ played: 0, wins: 0, dist: [0, 0, 0] });
  const [selected, setSelected] = useState<number | null>(null);
  const loadedDay = useRef('');
  const scrollRef = useRef<ScrollViewInstance>(null);
  const shake = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const p = await getTodaysBugPuzzle();
    const g = (await loadGame('bug', p.number)) ?? B.newGame(p);
    loadedDay.current = localDateKey();
    setPuzzle(p);
    setGame(g);
    setSelected(null);
    setStreak(await loadStreak());
    setStats(await loadStats('bug'));
  }, []);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && loadedDay.current && loadedDay.current !== localDateKey()) load();
    });
    return () => sub.remove();
  }, [load]);

  const commit = (next: B.BugGame) => {
    setGame(next);
    saveGame('bug', next);
  };

  // Retry uploading a finished result whenever this screen regains focus (e.g. after signing in).
  useFocusEffect(
    useCallback(() => {
      if (!game || !puzzle || game.status === 'playing' || game.submitted) return;
      submitResult(toResult(game, puzzle)).then((ok) => ok && commit({ ...game, submitted: true }));
    }, [game, puzzle]),
  );

  if (!puzzle || !game) return <Loading theme={theme} />;

  const playing = game.status === 'playing';
  const missed = new Set(B.misses(game, puzzle));
  const triesLeft = B.MAX_TRIES - game.guesses.length;

  const onSelect = (i: number) => {
    if (!B.canGuess(game, i)) return;
    Haptics.selectionAsync();
    setSelected(selected === i ? null : i);
  };

  const onCheck = async () => {
    if (selected === null) return;
    let next = B.guess(game, puzzle, selected);
    if (next === game) return;
    setSelected(null);
    if (next.status === 'won') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence(
        [8, -8, 5, -5, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 60, useNativeDriver: true })),
      ).start();
    }
    commit(next);
    if (next.status !== 'playing') {
      const res = await recordFinish('bug', next.status === 'won', next.guesses.length);
      setStreak(res.streak);
      setStats(res.stats);
      if (await submitResult(toResult(next, puzzle))) commit((next = { ...next, submitted: true }));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
    }
  };

  const onShare = () => {
    Share.share({ message: B.shareText(game, puzzle, streak.count) });
  };

  return (
    <View style={s.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.content}>
        <View style={s.status}>
          <Text style={s.statusText}>NO. {String(puzzle.number).padStart(3, '0')}</Text>
          <Text style={s.statusText}>FORMAT: BUG HUNT</Text>
          <Text style={s.statusText} accessibilityLabel={`Current streak ${streak.count}`}>
            STREAK {String(streak.count).padStart(2, '0')}
          </Text>
        </View>

        <Text style={s.title}>{puzzle.title}</Text>
        <RichText text={puzzle.prompt} theme={theme} style={s.prompt} />

        <View style={s.tries} accessibilityLabel={`${triesLeft} of ${B.MAX_TRIES} tries left`}>
          {Array.from({ length: B.MAX_TRIES }, (_, i) => (
            <View key={i} style={[s.pip, i < game.guesses.length && { backgroundColor: theme.ink }]} />
          ))}
          <Label theme={theme} style={{ marginLeft: 6 }}>{`${triesLeft} of ${B.MAX_TRIES} tries left`}</Label>
        </View>

        {playing && missed.size > 0 && (
          <View style={s.hint}>
            <Label theme={theme} style={{ color: theme.accent, marginBottom: 4 }}>Hint</Label>
            <RichText text={puzzle.hint} theme={theme} style={s.hintText} />
          </View>
        )}

        <Label theme={theme} index={1} style={s.section}>{playing ? 'Source, tap the buggy line' : 'Source, with the fix'}</Label>
        <Animated.View style={[s.editor, { transform: [{ translateX: shake }] }]}>
          {puzzle.lines.map((line, i) => {
            const isBug = i === puzzle.bug;
            const isMiss = missed.has(i);
            const isSel = selected === i;
            const reveal = !playing && isBug;
            return (
              <View key={i}>
                <Pressable
                  onPress={() => onSelect(i)}
                  disabled={!B.canGuess(game, i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel, disabled: !B.canGuess(game, i) }}
                  accessibilityLabel={`Line ${i + 1}: ${line.text}${isMiss ? ', not the bug' : ''}${reveal ? ', the bug' : ''}`}
                  style={[
                    s.row,
                    isSel && { borderColor: theme.accent, backgroundColor: theme.slot },
                    isMiss && { backgroundColor: theme.badBg },
                    reveal && { backgroundColor: game.status === 'won' ? theme.okBg : theme.badBg, borderColor: game.status === 'won' ? theme.ok : theme.bad },
                  ]}
                >
                  <Text style={[s.gutter, (isSel || reveal) && { color: reveal ? theme.bad : theme.accent }]}>
                    {reveal ? '-' : String(i + 1).padStart(2, '0')}
                  </Text>
                  <View style={[s.code, isMiss && { opacity: 0.55 }]}>
                    <CodeLine text={line.text} indent={line.indent} theme={theme} />
                  </View>
                  {isMiss && <Text style={s.tag}>MISS</Text>}
                </Pressable>
                {reveal && (
                  <View style={[s.row, s.fixRow]} accessibilityLabel={`Fixed line: ${puzzle.fix}`}>
                    <Text style={[s.gutter, { color: theme.ok }]}>+</Text>
                    <View style={s.code}>
                      <CodeLine text={puzzle.fix} indent={line.indent} theme={theme} />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>

        {playing && (
          <>
            <View style={s.actions}>
              <Button
                label={selected === null ? 'Select a line' : `Check line ${String(selected + 1).padStart(2, '0')}`}
                variant="primary"
                onPress={onCheck}
                theme={theme}
                disabled={selected === null}
                style={{ flex: 1 }}
              />
            </View>
            <Text style={s.help}>Tap a line to select it, then check. A miss costs a try. The hint unlocks after your first miss.</Text>
          </>
        )}

        {!playing && (
          <ResultCard
            won={game.status === 'won'}
            tries={game.guesses.length}
            maxTries={B.MAX_TRIES}
            timeMs={(game.endedAt ?? Date.now()) - game.startedAt}
            grid={B.gridRows(game, puzzle)}
            lostNote="The bug and its fix are marked above."
            why={puzzle.why}
            section={2}
            streak={streak}
            stats={stats}
            theme={theme}
            onShare={onShare}
            onLeaderboard={() => router.push({ pathname: '/leaderboard', params: { format: 'bug' } })}
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
    status: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: t.ink, paddingHorizontal: 10, paddingVertical: 6 },
    statusText: { fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 1.6, color: t.bg },
    title: { fontFamily: fonts.display, fontSize: 52, lineHeight: 52, color: t.ink, marginTop: 20 },
    prompt: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 22, color: t.ink, marginTop: 8 },
    tries: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 18 },
    pip: { width: 12, height: 12, borderWidth: 2, borderColor: t.ink },
    hint: { marginTop: 18, borderLeftWidth: 3, borderColor: t.accent, paddingLeft: 12, paddingVertical: 2 },
    hintText: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: t.ink },
    section: { marginTop: 26, marginBottom: 10 },
    editor: { backgroundColor: t.surface, borderColor: t.ink, borderWidth: 2, paddingVertical: 6, ...hardShadow(t, 4) },
    row: {
      flexDirection: 'row', alignItems: 'center', minHeight: 40, marginHorizontal: 6, marginVertical: 1,
      borderWidth: 1.5, borderColor: 'transparent', paddingVertical: 5,
    },
    fixRow: { backgroundColor: t.okBg, borderColor: t.ok },
    gutter: { width: 30, textAlign: 'right', paddingRight: 10, fontFamily: fonts.mono, fontSize: 11, color: t.muted },
    code: { flex: 1 },
    tag: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.4, color: t.bad, paddingHorizontal: 6 },
    actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    help: { fontFamily: fonts.mono, color: t.muted, fontSize: 12, lineHeight: 18, marginTop: 14 },
  });
