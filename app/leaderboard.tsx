import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { fonts, hardShadow, Palette, useTheme } from '../src/theme';
import { Label } from '../src/components/ui';
import { supabase } from '../src/lib/supabase';
import { formatDuration, localDateKey, puzzleNumberFor } from '../src/lib/date';
import { MAX_TRIES } from '../src/lib/storage';
import type { Format } from '../src/types';

const TABS: { format: Format; label: string }[] = [
  { format: 'order', label: 'Order' },
  { format: 'bug', label: 'Bug' },
  { format: 'output', label: 'Output' },
  { format: 'fill', label: 'Fill' },
];

type Row = { user_id: string; username: string; solved: boolean; tries: number; time_ms: number };

export default function Leaderboard() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const number = puzzleNumberFor(localDateKey());
  const params = useLocalSearchParams<{ format?: string }>();
  const [format, setFormat] = useState<Format>(TABS.find((t) => t.format === params.format)?.format ?? 'order');
  const max = MAX_TRIES[format];

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: session } = await supabase.auth.getSession();
    setMe(session.session?.user.id ?? null);
    const { data, error } = await supabase
      .from('leaderboard')
      .select('user_id, username, solved, tries, time_ms')
      .eq('puzzle_number', number)
      .eq('format', format)
      .order('solved', { ascending: false })
      .order('tries', { ascending: true })
      .order('time_ms', { ascending: true })
      .limit(100);
    if (error) setError('Couldn’t load the leaderboard. Pull down to try again.');
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [number, format]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!supabase) {
    return (
      <View style={s.center}>
        <Label theme={theme} style={{ marginBottom: 10 }}>Offline mode</Label>
        <Text style={s.emptyTitle}>Leaderboards need a backend</Text>
        <Text style={s.emptyBody}>Add your Supabase URL and anon key to .env, then restart the app. The README has the steps.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={s.list}
      data={rows}
      keyExtractor={(r) => r.user_id}
      refreshControl={<RefreshControl refreshing={loading && rows.length > 0} onRefresh={load} tintColor={theme.accent} />}
      ListHeaderComponent={
        <View>
          <Text style={s.heading}>Puzzle No. {String(number).padStart(3, '0')}</Text>
          <View style={s.tabs} accessibilityRole="tablist">
            {TABS.map((tab) => {
              const on = tab.format === format;
              return (
                <Pressable
                  key={tab.format}
                  onPress={() => { setRows([]); setFormat(tab.format); }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={[s.tab, on && { backgroundColor: theme.ink }]}
                >
                  <Text style={[s.tabText, on && { color: theme.bg }]}>{tab.label.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>
          {!me && (
            <Pressable
              style={({ pressed }) => [s.banner, pressed ? { transform: [{ translateX: 3 }, { translateY: 3 }] } : hardShadow(theme)]}
              onPress={() => router.push('/account')}
              accessibilityRole="button"
            >
              <Text style={s.bannerText}>Sign in to put your score on the board</Text>
              <Text style={s.bannerArrow}>-&gt;</Text>
            </Pressable>
          )}
          {error && <Text style={s.error}>{error}</Text>}
          {loading && rows.length === 0 && <Text style={s.loading}>LOADING...</Text>}
          <View style={s.tableHead}>
            <Text style={[s.th, s.rank]}>RK</Text>
            <Text style={[s.th, { flex: 1 }]}>PLAYER</Text>
            <Text style={s.th}>SCORE</Text>
            <Text style={[s.th, s.time]}>TIME</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        !loading && !error ? <Text style={s.emptyRow}>No scores yet today. Solve it and be first.</Text> : undefined
      }
      renderItem={({ item, index }) => {
        const mine = item.user_id === me;
        return (
          <View style={[s.row, mine && { backgroundColor: theme.ink }]}>
            <Text style={[s.rank, s.rankText, mine && { color: theme.accent }]}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={[s.name, mine && { color: theme.bg }]} numberOfLines={1}>{item.username}</Text>
            <Text style={[s.score, mine && { color: theme.bg }]}>{item.solved ? `${item.tries}/${max}` : `X/${max}`}</Text>
            <Text style={[s.time, s.timeText, mine && { color: theme.bg }]}>{formatDuration(item.time_ms)}</Text>
          </View>
        );
      }}
    />
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    list: { padding: 16 },
    heading: { fontFamily: fonts.display, fontSize: 40, lineHeight: 40, color: t.ink, marginBottom: 14 },
    tabs: { flexDirection: 'row', borderWidth: 2, borderColor: t.ink, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 9, alignItems: 'center' },
    tabText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1.4, color: t.ink },
    banner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      backgroundColor: t.surface, borderColor: t.ink, borderWidth: 2, padding: 14, marginBottom: 22,
    },
    bannerText: { flex: 1, fontFamily: fonts.monoMedium, color: t.ink, fontSize: 13 },
    bannerArrow: { fontFamily: fonts.monoBold, color: t.accent, fontSize: 14 },
    error: { fontFamily: fonts.mono, color: t.bad, fontSize: 13, marginBottom: 12 },
    loading: { fontFamily: fonts.display, fontSize: 24, color: t.muted, marginVertical: 12 },
    tableHead: { flexDirection: 'row', gap: 12, borderBottomWidth: 2, borderColor: t.ink, paddingHorizontal: 8, paddingBottom: 6 },
    th: { fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 1.6, color: t.muted },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 12,
      borderBottomWidth: 1, borderStyle: 'dashed', borderColor: t.line,
    },
    rank: { width: 26 },
    rankText: { fontFamily: fonts.monoBold, fontSize: 13, color: t.muted },
    name: { flex: 1, fontFamily: fonts.mono, color: t.ink, fontSize: 14 },
    score: { fontFamily: fonts.monoBold, color: t.ink, fontSize: 13 },
    time: { width: 56, textAlign: 'right' },
    timeText: { fontFamily: fonts.mono, color: t.muted, fontSize: 13 },
    emptyRow: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: t.muted, paddingHorizontal: 8, paddingVertical: 16 },
    center: { flex: 1, backgroundColor: t.bg, padding: 24, justifyContent: 'center' },
    emptyTitle: { fontFamily: fonts.display, fontSize: 36, lineHeight: 36, color: t.ink, marginBottom: 10 },
    emptyBody: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: t.muted },
  });
