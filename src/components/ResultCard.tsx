import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, hardShadow, Palette } from '../theme';
import type { OrderPuzzle } from '../types';
import { GameState, MAX_TRIES, gridRows, scoreLabel } from '../game/orderEngine';
import { Stats, StreakInfo } from '../lib/storage';
import { formatClock, formatDuration, msUntilMidnight } from '../lib/date';
import RichText from './RichText';
import { Button, Label, TextLink } from './ui';

type Props = {
  puzzle: OrderPuzzle;
  game: GameState;
  streak: StreakInfo;
  stats: Stats;
  theme: Palette;
  onShare: () => void;
  onLeaderboard: () => void;
};

export default function ResultCard({ puzzle, game, streak, stats, theme, onShare, onLeaderboard }: Props) {
  const [left, setLeft] = useState(msUntilMidnight());
  useEffect(() => {
    const t = setInterval(() => setLeft(msUntilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);

  const won = game.status === 'won';
  const tries = game.attempts.length;
  const headline = won ? (tries === 1 ? 'First try. Clean.' : `Solved in ${tries} tries`) : 'Out of tries';
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const maxDist = Math.max(1, ...stats.dist);
  const s = makeStyles(theme);

  return (
    <View style={s.card}>
      <Label theme={theme} index={3} style={{ marginBottom: 6 }}>{won ? 'Solved' : 'Game over'}</Label>
      <Text style={s.headline}>{headline}</Text>
      {!won && <Text style={s.sub}>The correct order is filled in above.</Text>}

      <View style={s.stats}>
        <Stat label="score" value={scoreLabel(game)} s={s} />
        <Stat label="time" value={formatDuration((game.endedAt ?? Date.now()) - game.startedAt)} s={s} />
        <Stat label="streak" value={String(streak.count)} s={s} />
      </View>

      <View style={s.grid} accessibilityLabel={`Your attempts: ${gridRows(game).join(', ')}`}>
        {game.attempts.map((row, r) => (
          <View key={r} style={s.gridRow}>
            {row.map((ok, c) => (
              <View key={c} style={[s.cell, ok && { backgroundColor: theme.ok, borderColor: theme.ok }]} />
            ))}
          </View>
        ))}
      </View>

      <Button label="Share result" variant="primary" onPress={onShare} theme={theme} />
      <View style={s.linkRow}>
        <TextLink label="Today's leaderboard" onPress={onLeaderboard} theme={theme} />
      </View>

      <View style={s.why}>
        <Label theme={theme} style={{ marginBottom: 6 }}>Why it works</Label>
        <RichText text={puzzle.why} theme={theme} style={{ fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: theme.ink }} />
      </View>

      <Label theme={theme} style={{ marginTop: 18 }}>Your stats</Label>
      <View style={s.stats}>
        <Stat label="played" value={String(stats.played)} s={s} />
        <Stat label="win %" value={String(winPct)} s={s} />
        <Stat label="best" value={String(streak.best)} s={s} />
      </View>
      {Array.from({ length: MAX_TRIES }, (_, i) => (
        <View key={i} style={s.distRow}>
          <Text style={s.distLabel}>{i + 1}</Text>
          <View
            style={[
              s.distBar,
              { flex: Math.max(0.08, stats.dist[i] / maxDist), backgroundColor: won && tries === i + 1 ? theme.accent : theme.ink },
            ]}
          >
            <Text style={s.distCount}>{stats.dist[i]}</Text>
          </View>
          <View style={{ flex: 1 - Math.max(0.08, stats.dist[i] / maxDist) }} />
        </View>
      ))}

      <View style={s.next}>
        <Text style={s.nextLabel}>NEXT PUZZLE IN</Text>
        <Text style={s.nextClock}>{formatClock(left)}</Text>
      </View>
    </View>
  );
}

function Stat({ label, value, s }: { label: string; value: string; s: ReturnType<typeof makeStyles> }) {
  return (
    <View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderColor: t.ink, borderWidth: 2, padding: 18, marginTop: 28, ...hardShadow(t, 4) },
    headline: { fontFamily: fonts.display, fontSize: 40, lineHeight: 40, color: t.ink },
    sub: { fontFamily: fonts.mono, color: t.muted, marginTop: 4, fontSize: 13 },
    stats: { flexDirection: 'row', gap: 28, marginVertical: 14 },
    statValue: { fontFamily: fonts.display, fontSize: 34, lineHeight: 34, color: t.ink },
    statLabel: { fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 1.6, color: t.muted },
    grid: { gap: 4, marginBottom: 18 },
    gridRow: { flexDirection: 'row', gap: 4 },
    cell: { width: 18, height: 18, borderWidth: 2, borderColor: t.line },
    linkRow: { alignItems: 'center', paddingVertical: 14 },
    why: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.line, borderStyle: 'dashed', paddingVertical: 14, marginTop: 4 },
    distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 },
    distLabel: { width: 14, fontFamily: fonts.mono, fontSize: 12, color: t.muted },
    distBar: { paddingHorizontal: 6, paddingVertical: 2, alignItems: 'flex-end', minWidth: 26 },
    distCount: { fontFamily: fonts.monoBold, fontSize: 11, color: t.bg },
    next: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 16, borderTopWidth: 2, borderColor: t.ink, paddingTop: 10 },
    nextLabel: { fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 1.6, color: t.muted },
    nextClock: { fontFamily: fonts.display, fontSize: 30, color: t.ink },
  });
