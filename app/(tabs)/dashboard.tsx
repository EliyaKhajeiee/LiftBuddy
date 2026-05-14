import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { getDayQuote } from '../../src/data/muscleQuotes';
import { colors, spacing, radius } from '../../src/theme';
import { Skeleton, SkeletonCard } from '../../src/components/Skeleton';
import type { WeekDay } from '../../src/types';

const DOW: WeekDay[] = ['sun','mon','tue','wed','thu','fri','sat'];
function todayKey(): WeekDay { return DOW[new Date().getDay()]; }

// ── Helpers ────────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function buildWeekDots(streak: number) {
  const day   = new Date().getDay();
  const today = day === 0 ? 6 : day - 1;
  return ['M','T','W','T','F','S','S'].map((d, i) => ({
    d,
    active: i <= today && (today - i) < streak,
  }));
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router            = useRouter();
  const { user }          = useAuthStore();
  const { data, loading } = useUserStore();

  const today        = todayKey();
  const plan         = data?.plan;
  const todayDayKey  = plan?.schedule?.[today] ?? null;
  const todayDay     = todayDayKey ? plan?.days[todayDayKey] : null;
  const quote        = getDayQuote(todayDay?.splitKey ?? 'rest');

  const firstName  = user?.displayName?.split(' ')[0] ?? 'there';
  const stats      = data?.stats;
  const profile    = data?.profile;
  const streak     = stats?.currentStreak  ?? 0;
  const best       = stats?.longestStreak  ?? 0;
  const weight     = (stats?.currentWeight  ?? 0) > 0
                      ? stats!.currentWeight
                      : (profile?.weight ?? 0) > 0 ? profile!.weight : null;
  const weekDots   = buildWeekDots(streak);

  if (loading && !data) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.nav}>
          <Skeleton height={18} width={100} />
          <Skeleton height={32} width={32} borderRadius={16} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <Skeleton height={14} width={120} />
            <Skeleton height={28} width={200} />
            <Skeleton height={13} width={160} />
          </View>
          <SkeletonCard>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[0,1,2,3,4,5,6].map(i => (
                <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                  <Skeleton height={10} width={16} />
                  <Skeleton height={28} width={28} borderRadius={14} />
                </View>
              ))}
            </View>
          </SkeletonCard>
          <SkeletonCard>
            <Skeleton height={16} width="50%" />
            <Skeleton height={12} width="70%" />
            <Skeleton height={44} borderRadius={12} style={{ marginTop: 8 }} />
          </SkeletonCard>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[0,1,2].map(i => (
              <SkeletonCard key={i} style={{ flex: 1 }}>
                <Skeleton height={22} width="60%" />
                <Skeleton height={11} width="80%" />
              </SkeletonCard>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>

      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <View style={s.nav}>
        <Text style={s.wordmark}>LIFT<Text style={s.wordmarkAccent}>BUDDY</Text></Text>
        <View style={s.navRight}>
          <TouchableOpacity style={s.navBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.avatarBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            {data?.avatarUrl
              ? <Image source={{ uri: data.avatarUrl }} style={s.avatarThumb} />
              : <View style={s.avatarThumb}><Text style={s.avatarInitial}>{(user?.displayName?.[0] ?? '?').toUpperCase()}</Text></View>
            }
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >

        {/* ── Greeting ─────────────────────────────────────────────────── */}
        <View style={s.greeting}>
          <Text style={s.greetLine}>{getGreeting()}, {firstName}</Text>
          <Text style={s.dateLine}>{formatDate()}</Text>
        </View>

        {/* ── Quote ────────────────────────────────────────────────────── */}
        <View style={s.quote}>
          <View style={s.quoteAccent} />
          <View style={s.quoteInner}>
            <Text style={s.quoteText}>"{quote.text}"</Text>
            <Text style={s.quoteAuthor}>— {quote.author}</Text>
          </View>
        </View>

        <View style={s.sep} />

        {/* ── Streak ───────────────────────────────────────────────────── */}
        <View style={s.streakSection}>
          {/* Numbers */}
          <View style={s.streakNumbers}>
            <View style={s.streakCol}>
              <Text style={s.streakLabelTop}>CURRENT STREAK</Text>
              <Text style={s.streakNum}>{streak}</Text>
              <Text style={s.streakUnit}>days</Text>
            </View>
            <View style={s.streakDivider} />
            <View style={s.streakCol}>
              <Text style={s.streakLabelTop}>PERSONAL BEST</Text>
              <Text style={[s.streakNum, s.streakNumMuted]}>{best}</Text>
              <Text style={s.streakUnit}>days</Text>
            </View>
          </View>

          {/* Week track */}
          <View style={s.weekRow}>
            {weekDots.map(({ d, active }, i) => (
              <View key={i} style={s.weekItem}>
                <Text style={s.weekLabel}>{d}</Text>
                <View style={[s.weekDot, active && s.weekDotActive]} />
              </View>
            ))}
          </View>
        </View>

        <View style={s.sep} />

        {/* ── Today ────────────────────────────────────────────────────── */}
        <View style={s.todaySection}>
          <Text style={s.sectionLabel}>TODAY'S WORKOUT</Text>

          {todayDay ? (
            /* Active workout day */
            <TouchableOpacity
              style={s.todayCard}
              onPress={() => router.push('/(tabs)/workout')}
              activeOpacity={0.88}
            >
              <View style={s.todayTopBar} />
              <View style={s.todayBody}>
                <View style={[s.todayIcon, s.todayIconActive]}>
                  <Ionicons name="barbell-outline" size={24} color={colors.accent.primary} />
                </View>
                <View style={s.todayText}>
                  <Text style={s.todayTitle}>{todayDay.name}</Text>
                  <Text style={s.todaySub}>
                    {todayDay.focus.slice(0, 3).map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(' · ')}
                    {'  ·  '}{todayDay.exercises.length} exercises{'  ·  '}{todayDay.exercises.reduce((n, e) => n + e.sets, 0)} sets
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
              </View>
              <View style={s.todayBtn}>
                <Text style={s.todayBtnText}>Begin Workout</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </View>
            </TouchableOpacity>

          ) : plan ? (
            /* Rest day */
            <View style={s.todayCard}>
              <View style={[s.todayTopBar, { backgroundColor: colors.bg.elevated }]} />
              <View style={s.todayBody}>
                <View style={s.todayIcon}>
                  <Ionicons name="moon-outline" size={24} color={colors.text.muted} />
                </View>
                <View style={s.todayText}>
                  <Text style={s.todayTitle}>Rest Day</Text>
                  <Text style={s.todaySub}>Recovery is part of the process. Come back stronger.</Text>
                </View>
              </View>
            </View>

          ) : (
            /* No plan */
            <View style={s.todayCard}>
              <View style={s.todayTopBar} />
              <View style={s.todayBody}>
                <View style={s.todayIcon}>
                  <Ionicons name="barbell-outline" size={24} color={colors.text.muted} />
                </View>
                <View style={s.todayText}>
                  <Text style={s.todayTitle}>No program yet</Text>
                  <Text style={s.todaySub}>Build a plan around your goals, schedule, and equipment.</Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.todayBtn}
                onPress={() => router.push('/(tabs)/workout')}
                activeOpacity={0.85}
              >
                <Text style={s.todayBtnText}>Set Up Your Program</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={s.sep} />

        {/* ── Numbers ──────────────────────────────────────────────────── */}
        <View style={s.numbersSection}>
          <Text style={s.sectionLabel}>YOUR STATS</Text>
          <View style={s.numbersRow}>
            <NumberItem
              value={weight ? String(weight) : '—'}
              unit={weight ? 'lbs' : undefined}
              label="BODY WEIGHT"
              highlight
            />
            <View style={s.numDivider} />
            <NumberItem
              value={stats?.totalWorkouts != null ? String(stats.totalWorkouts) : '0'}
              label="SESSIONS"
            />
            <View style={s.numDivider} />
            <NumberItem
              value={profile?.daysPerWeek ? `${profile.daysPerWeek}×` : '—'}
              label="DAYS / WK"
            />
          </View>

        </View>

        <View style={s.sep} />

        {/* ── Quick actions ─────────────────────────────────────────────── */}
        <View style={s.actionsSection}>
          <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
          <View style={s.actionsRow}>
            <QuickAction
              icon="scale-outline"
              label="Log Weight"
              onPress={() => router.push('/(tabs)/progress')}
            />
            <QuickAction
              icon="camera-outline"
              label="Check-in"
              onPress={() => router.push('/(tabs)/progress')}
            />
            <QuickAction
              icon="people-outline"
              label="Community"
              onPress={() => router.push('/(tabs)/feed')}
            />
            <QuickAction
              icon="settings-outline"
              label="Settings"
              onPress={() => router.push('/edit-profile')}
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Mini components ────────────────────────────────────────────────────────────

function NumberItem({
  value, unit, label, highlight,
}: {
  value: string; unit?: string; label: string; highlight?: boolean;
}) {
  return (
    <View style={ni.wrap}>
      <View style={ni.row}>
        <Text style={[ni.value, highlight && ni.valueAccent]}>{value}</Text>
        {unit && <Text style={ni.unit}>{unit}</Text>}
      </View>
      <Text style={ni.label}>{label}</Text>
    </View>
  );
}
const ni = StyleSheet.create({
  wrap:        { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  row:         { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  value:       { fontSize: 26, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5 },
  valueAccent: { color: colors.accent.primary },
  unit:        { fontSize: 11, fontWeight: '600', color: colors.text.muted, paddingBottom: 2 },
  label:       { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: colors.text.muted, marginTop: 4 },
});

function QuickAction({
  icon, label, onPress,
}: {
  icon: string; label: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={qa.wrap} onPress={onPress} activeOpacity={0.7}>
      <View style={qa.iconBox}>
        <Ionicons name={icon as any} size={19} color={colors.text.secondary} />
      </View>
      <Text style={qa.label}>{label}</Text>
    </TouchableOpacity>
  );
}
const qa = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', gap: 6 },
  iconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  label:   { fontSize: 10, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.3, textAlign: 'center' },
});

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 40 },

  // Nav
  nav:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  wordmark:      { fontSize: 16, fontWeight: '900', letterSpacing: 3, color: colors.text.primary },
  wordmarkAccent:{ color: colors.accent.primary },
  navRight:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navBtn:        { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  avatarBtn:     {},
  avatarThumb:   { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarInitial: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Greeting
  greeting:  { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },
  greetLine: { fontSize: 22, fontWeight: '600', color: colors.text.primary, letterSpacing: -0.3 },
  dateLine:  { fontSize: 13, color: colors.text.muted, marginTop: 3, fontWeight: '400' },

  // Quote
  quote:      { flexDirection: 'row', marginHorizontal: 20, marginBottom: 24, gap: 14 },
  quoteAccent:{ width: 2, borderRadius: 1, backgroundColor: colors.accent.primary },
  quoteInner: { flex: 1, gap: 6 },
  quoteText:  { fontSize: 13, fontStyle: 'italic', color: colors.text.secondary, lineHeight: 21, fontWeight: '400' },
  quoteAuthor:{ fontSize: 11, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.3 },

  // Separator
  sep: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginVertical: 4 },

  // Streak
  streakSection: { paddingHorizontal: 20, paddingVertical: 24 },
  streakNumbers: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  streakCol:     { flex: 1, alignItems: 'center' },
  streakDivider: { width: 1, height: 60, backgroundColor: colors.border },
  streakLabelTop:{ fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: colors.text.muted, marginBottom: 6 },
  streakNum:     { fontSize: 48, fontWeight: '800', color: colors.accent.primary, letterSpacing: -2, lineHeight: 52 },
  streakNumMuted:{ color: colors.text.primary },
  streakUnit:    { fontSize: 12, fontWeight: '500', color: colors.text.muted, marginTop: 2 },

  weekRow:      { flexDirection: 'row', justifyContent: 'space-between' },
  weekItem:     { flex: 1, alignItems: 'center', gap: 6 },
  weekLabel:    { fontSize: 11, fontWeight: '600', color: colors.text.muted },
  weekDot:      { width: 9, height: 9, borderRadius: 5, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.borderLight },
  weekDotActive:{ backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },

  // Today
  todaySection: { paddingHorizontal: 20, paddingVertical: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: colors.text.muted, marginBottom: 14 },
  todayCard:    { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg.card, overflow: 'hidden' },
  todayTopBar:  { height: 2, backgroundColor: colors.accent.primary },
  todayBody:    { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 18 },
  todayIcon:       { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bg.elevated, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  todayIconActive: { backgroundColor: `${colors.accent.primary}18` },
  todayText:    { flex: 1 },
  todayTitle:   { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  todaySub:     { fontSize: 13, color: colors.text.secondary, lineHeight: 19 },
  todayBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.accent.primary, paddingVertical: 14 },
  todayBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },

  // Numbers
  numbersSection: { paddingHorizontal: 20, paddingVertical: 20 },
  numbersRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  numDivider:     { width: 1, height: 50, backgroundColor: colors.border },

  goalRow:  { flexDirection: 'row', gap: 0 },
  goalItem: { flex: 1, paddingVertical: 14, paddingHorizontal: 4 },
  goalKey:  { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: colors.text.muted, marginBottom: 4 },
  goalVal:  { fontSize: 13, fontWeight: '600', color: colors.text.primary },

  // Actions
  actionsSection: { paddingHorizontal: 20, paddingVertical: 20 },
  actionsRow:     { flexDirection: 'row', gap: 8 },
});
