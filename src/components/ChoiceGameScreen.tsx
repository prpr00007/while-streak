import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Pressable, ScrollView, type ScrollViewInstance, Share, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { fonts, hardShadow, Palette, useTheme } from '../theme';
import type { ChoicePuzzle } from '../types';
import * as C from '../game/choiceEngine';
import { loadGame, loadStats, loadStreak, recordFinish, saveGame, Stats, StreakInfo } from '../lib/storage';
import { localDateKey } from '../lib/date';
import { FinishedResult, submitResult } from '../lib/results';
import CodeLine from './CodeLine';
import RichText from './RichText';
import ResultCard from './ResultCard';
import { Button, Label, Loading } from './ui';

type Props = {
  format: ChoicePuzzle['format'];
  formatLabel: string; // shown in the status strip, e.g. "OUTPUT"
  load: () => Promise<ChoicePuzzle>;
};

const LETTERS = ['A', 'B', 'C', 'D'];

const toResult = (g: C.ChoiceGame, p: ChoicePuzzle): FinishedResult => ({
  format: p.format,
  puzzleNumber: g.puzzleNumber,
  won: g.status === 'won',
  tries: g.guesses.length,
  timeMs: (g.endedAt ?? Date.now()) - g.startedAt,
  grid: C.gridRows(g, p),
});

// Shared screen for the multiple-choice formats: Predict the Output and Fill the Blank.
export default function ChoiceGameScreen({ format, formatLabel, load: loadPuzzle }: Props) {
  const theme = useTheme();
  const s = makeStyles(theme);

  const [puzzle, setPuzzle] = useState<ChoicePuzzle | null>(null);
  const [game, setGame] = useState<C.ChoiceGame | null>(null);
  const [streak, setStreak] = useState<StreakInfo>({ count: 0, best: 0, last: null });
  const [stats, setStats] = useState<Stats>({ played: 0, wins: 0, dist: [] });
  const [selected, setSelected] = useState<number | null>(null);
  const loadedDay = useRef('');
  const scrollRef = useRef<ScrollViewInstance>(null);
  const shake = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const p = await loadPuzzle();
    const g = (await loadGame(format, p.number)) ?? C.newGame(p);
    loadedDay.current = localDateKey();
    setPuzzle(p);
    setGame(g);
    setSelected(null);
    setStreak(await loadStreak());
    setStats(await loadStats(format));
  }, [format, loadPuzzle]);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && loadedDay.current && loadedDay.current !== localDateKey()) load();
    });
    return () => sub.remove();
  }, [load]);

  const commit = (next: C.ChoiceGame) => {
    setGame(next);
    saveGame(format, next);
  };

  // Retry uploading a finished result whenever this screen regains focus (e.g. after signing in).
  useFocusEffect(
    useCallback(() => {
      if (!game || !puzzle || game.status === 'playing' || game.submitted) return;
      submitResult(toResult(game, puzzle)).then((ok) => ok && commit({ ...game, submitted: true }));
    }, [game, puzzle]),
  );

  if (!puzzle || !game) return <Loading theme={theme} />;

  const max = C.maxTries(puzzle);
  const playing = game.status === 'playing';
  const triesLeft = max - game.guesses.length;
  const missed = game.guesses.length > (game.status === 'won' ? 1 : 0);
  const isFill = puzzle.format === 'fill';

  const onSelect = (i: number) => {
    if (!C.canGuess(game, i)) return;
    Haptics.selectionAsync();
    setSelected(selected === i ? null : i);
  };

  const onCheck = async () => {
    if (selected === null) return;
    let next = C.guess(game, puzzle, selected);
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
      const res = await recordFinish(format, next.status === 'won', next.guesses.length);
      setStreak(res.streak);
      setStats(res.stats);
      if (await submitResult(toResult(next, puzzle))) commit((next = { ...next, submitted: true }));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
    }
  };

  // What the blank shows: the answer once the game is over, otherwise the current pick.
  const blank = !playing
    ? { text: puzzle.choices[puzzle.answer], color: theme.ok, bg: theme.okBg }
    : selected !== null
      ? { text: puzzle.choices[selected], color: theme.accent, bg: theme.slot }
      : { text: '____', color: theme.muted, bg: theme.slot };

  let section = 1;
  return (
    <View style={s.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.content}>
        <View style={s.status}>
          <Text style={s.statusText}>NO. {String(puzzle.number).padStart(3, '0')}</Text>
          <Text style={s.statusText}>FORMAT: {formatLabel}</Text>
          <Text style={s.statusText} accessibilityLabel={`Current streak ${streak.count}`}>
            STREAK {String(streak.count).padStart(2, '0')}
          </Text>
        </View>

        <Text style={s.title}>{puzzle.title}</Text>
        <RichText text={puzzle.prompt} theme={theme} style={s.prompt} />

        <View style={s.tries} accessibilityLabel={max === 1 ? 'One shot' : `${triesLeft} of ${max} tries left`}>
          {Array.from({ length: max }, (_, i) => (
            <View key={i} style={[s.pip, i < game.guesses.length && { backgroundColor: theme.ink }]} />
          ))}
          <Label theme={theme} style={{ marginLeft: 6 }}>{max === 1 ? 'One shot, no retries' : `${triesLeft} of ${max} tries left`}</Label>
        </View>

        {isFill && playing && missed && (
          <View style={s.hint}>
            <Label theme={theme} style={{ color: theme.accent, marginBottom: 4 }}>Hint</Label>
            <RichText text={puzzle.hint} theme={theme} style={s.hintText} />
          </View>
        )}

        <Label theme={theme} index={section++} style={s.section}>Source</Label>
        <Animated.View style={[s.editor, { transform: [{ translateX: shake }] }]}>
          {puzzle.lines.map((line, i) => (
            <View key={i} style={s.row}>
              <Text style={s.gutter}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1 }}>
                <CodeLine text={line.text} indent={line.indent} theme={theme} blank={isFill ? blank : undefined} />
              </View>
            </View>
          ))}
        </Animated.View>

        {!isFill && !playing && (
          <>
            <Label theme={theme} index={section++} style={s.section}>Output</Label>
            <View style={s.console} accessibilityLabel={`It prints ${puzzle.choices[puzzle.answer]}`}>
              <Text style={s.consoleText}>
                <Text style={{ color: theme.accent }}>$ </Text>python3 snippet.py{'\n'}
                {puzzle.choices[puzzle.answer]}
              </Text>
            </View>
          </>
        )}

        <Label theme={theme} index={section++} style={s.section}>{isFill ? 'Pick the missing token' : 'Pick what it prints'}</Label>
        <View style={s.choices}>
          {puzzle.choices.map((choice, i) => {
            const tried = game.guesses.includes(i);
            const isAnswer = i === puzzle.answer;
            const isSel = selected === i;
            const revealOk = !playing && isAnswer;
            const wrong = tried && !isAnswer;
            return (
              <Pressable
                key={i}
                onPress={() => onSelect(i)}
                disabled={!C.canGuess(game, i)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel, disabled: !C.canGuess(game, i) }}
                accessibilityLabel={`${LETTERS[i]}: ${choice}${wrong ? ', wrong' : ''}${revealOk ? ', correct' : ''}`}
                style={({ pressed }) => [
                  s.choice,
                  isSel && { borderColor: theme.accent, backgroundColor: theme.slot },
                  wrong && { backgroundColor: theme.badBg, borderColor: theme.bad },
                  revealOk && { backgroundColor: theme.okBg, borderColor: theme.ok },
                  !playing && !revealOk && !wrong && { opacity: 0.5 },
                  playing && !wrong && (pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : hardShadow(theme, 2)),
                ]}
              >
                <Text style={[s.letter, isSel && { color: theme.accent }]}>{LETTERS[i]}</Text>
                <Text style={[s.choiceText, wrong && { textDecorationLine: 'line-through', color: theme.muted }]}>{choice}</Text>
              </Pressable>
            );
          })}
        </View>

        {playing && (
          <>
            <View style={s.actions}>
              <Button
                label={selected === null ? 'Pick an answer' : `${max === 1 ? 'Submit' : 'Check'} ${LETTERS[selected]}`}
                variant="primary"
                onPress={onCheck}
                theme={theme}
                disabled={selected === null}
                style={{ flex: 1 }}
              />
            </View>
            <Text style={s.help}>
              {isFill
                ? 'Tap a token to try it in the blank, then check. A miss costs a try. The hint unlocks after your first miss.'
                : 'Read carefully: you get one answer. Tap a choice, then submit.'}
            </Text>
          </>
        )}

        {!playing && (
          <ResultCard
            won={game.status === 'won'}
            tries={game.guesses.length}
            maxTries={max}
            timeMs={(game.endedAt ?? Date.now()) - game.startedAt}
            grid={C.gridRows(game, puzzle)}
            lostNote={isFill ? 'The right token is filled in above.' : 'The real output is shown above.'}
            why={puzzle.why}
            section={section}
            streak={streak}
            stats={stats}
            theme={theme}
            onShare={() => Share.share({ message: C.shareText(game, puzzle, streak.count) })}
            onLeaderboard={() => router.push({ pathname: '/leaderboard', params: { format } })}
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
    editor: { backgroundColor: t.surface, borderColor: t.ink, borderWidth: 2, paddingVertical: 10, ...hardShadow(t, 4) },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 30, paddingRight: 10 },
    gutter: { width: 36, textAlign: 'right', paddingRight: 10, fontFamily: fonts.mono, fontSize: 11, color: t.muted },
    console: { backgroundColor: t.ink, padding: 14, ...hardShadow(t, 4) },
    consoleText: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 21, color: t.bg },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    choice: {
      flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: t.surface, borderColor: t.ink, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 12,
    },
    letter: { fontFamily: fonts.monoBold, fontSize: 11, color: t.muted },
    choiceText: { flex: 1, fontFamily: fonts.monoMedium, fontSize: 14, color: t.ink },
    actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    help: { fontFamily: fonts.mono, color: t.muted, fontSize: 12, lineHeight: 18, marginTop: 14 },
  });
