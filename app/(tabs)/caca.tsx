import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useMemo } from 'react';
import { useUserStore } from '../../src/store/userStore';
import { buildCacaHtml } from '../../src/data/cacaHtml';
import { colors, spacing, radius } from '../../src/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const VIEWER_H = Math.round(SCREEN_H * 0.62);

// ── XP / level helpers ────────────────────────────────────────────────────────

function computeWeeklyVolume(lastSessions: any): number {
  if (!lastSessions) return 0;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return Object.values(lastSessions).reduce((total: number, ls: any) => {
    if (!ls?.date) return total;
    try {
      const d: Date = ls.date?.toDate ? ls.date.toDate() : new Date(ls.date);
      if (d.getTime() < weekAgo) return total;
      const vol = (ls.exercises ?? []).reduce((t: number, ex: any) =>
        t + (ex.sets ?? []).reduce((s: number, set: any) =>
          s + (set.completed ? (set.weight ?? 0) * (set.reps ?? 0) : 0), 0), 0);
      return total + vol;
    } catch { return total; }
  }, 0);
}

function totalLifetimeVolume(lastSessions: any): number {
  if (!lastSessions) return 0;
  return Object.values(lastSessions).reduce((total: number, ls: any) => {
    const vol = (ls?.exercises ?? []).reduce((t: number, ex: any) =>
      t + (ex.sets ?? []).reduce((s: number, set: any) =>
        s + (set.completed ? (set.weight ?? 0) * (set.reps ?? 0) : 0), 0), 0);
    return total + vol;
  }, 0);
}

function xpFromStats(totalWorkouts: number, lifetimeVolume: number): number {
  return Math.round(totalWorkouts * 500 + lifetimeVolume / 8);
}

function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 250)) + 1;
}

function xpForLevel(lvl: number): number {
  return Math.pow(lvl - 1, 2) * 250;
}

function muscleFromLevel(lvl: number): number {
  // 0 = baby, 1 = jacked — reaches max at level ~40
  return Math.min(1, (lvl - 1) / 38);
}

function levelTitle(lvl: number): string {
  if (lvl < 3)  return 'BABY BUDDY';
  if (lvl < 6)  return 'BABY GAINS';
  if (lvl < 10) return 'GETTING THERE';
  if (lvl < 15) return 'SWOLE RISING';
  if (lvl < 22) return 'THICK & SOLID';
  if (lvl < 30) return 'BUILT DIFFERENT';
  if (lvl < 40) return 'ABSOLUTE UNIT';
  return 'BUDDY GOD MODE';
}

function fmtVolume(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M lbs`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k lbs`;
  return `${Math.round(v)} lbs`;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CacaScreen() {
  const { data } = useUserStore();

  const lastSessions    = data?.lastSessions ?? {};
  const totalWorkouts   = data?.stats?.totalWorkouts ?? 0;
  const weekVol         = computeWeeklyVolume(lastSessions);
  const lifeVol         = totalLifetimeVolume(lastSessions);
  const xp              = xpFromStats(totalWorkouts, lifeVol);
  const level           = xpToLevel(xp);
  const muscle          = muscleFromLevel(level);
  const thisLevelXP     = xpForLevel(level);
  const nextLevelXP     = xpForLevel(level + 1);
  const xpProgress      = nextLevelXP > thisLevelXP
    ? (xp - thisLevelXP) / (nextLevelXP - thisLevelXP)
    : 1;

  const html = useMemo(() => buildCacaHtml(muscle, level), [level, Math.round(muscle * 10)]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Character viewer */}
      <View style={[s.viewer, { height: VIEWER_H }]}>
        <WebView
          source={{ html }}
          style={s.webview}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled
          originWhitelist={['*']}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
      </View>

      {/* Stats panel */}
      <View style={s.panel}>
        {/* Title */}
        <Text style={s.title}>{levelTitle(level)}</Text>

        {/* XP bar */}
        <View style={s.xpRow}>
          <Text style={s.xpLabel}>LVL {level}</Text>
          <View style={s.xpBarWrap}>
            <View style={[s.xpBar, { width: `${Math.min(100, xpProgress * 100)}%` as any }]} />
          </View>
          <Text style={s.xpLabel}>LVL {level + 1}</Text>
        </View>
        <Text style={s.xpSub}>{Math.round(nextLevelXP - xp).toLocaleString()} XP to next level</Text>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statVal}>{totalWorkouts}</Text>
            <Text style={s.statLbl}>Workouts</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statVal}>{fmtVolume(weekVol)}</Text>
            <Text style={s.statLbl}>This Week</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statVal}>{fmtVolume(lifeVol)}</Text>
            <Text style={s.statLbl}>Lifetime</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  viewer:  { width: '100%', backgroundColor: '#0A0A0A', overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: 'transparent' },

  panel: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  title: {
    fontSize: 13, fontWeight: '800', letterSpacing: 2,
    color: colors.accent.primary, textAlign: 'center',
  },

  xpRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  xpLabel: { fontSize: 10, fontWeight: '800', color: colors.text.muted, width: 38 },
  xpBarWrap: {
    flex: 1, height: 6, backgroundColor: colors.bg.elevated,
    borderRadius: 3, overflow: 'hidden',
  },
  xpBar:   { height: '100%', backgroundColor: colors.accent.primary, borderRadius: 3 },
  xpSub:   { fontSize: 10, color: colors.text.muted, textAlign: 'center' },

  statsRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  stat:       { flex: 1, alignItems: 'center' },
  statVal:    { fontSize: 14, fontWeight: '800', color: colors.text.primary },
  statLbl:    { fontSize: 10, color: colors.text.muted, marginTop: 2 },
  statDivider:{ width: 1, height: 32, backgroundColor: colors.border },
});
