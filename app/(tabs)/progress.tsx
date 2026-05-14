import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, getDocs, orderBy, query, limit,
} from 'firebase/firestore';
import { db } from '../../src/firebase/config';

import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { colors, spacing, radius, typography, shadows } from '../../src/theme';

// ── Helpers ─────────────────────────────────────────────────────────────────────

function getISOWeek(d: Date): { week: number; year: number } {
  const utc  = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day  = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const jan1 = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return {
    week: Math.ceil((((utc.getTime() - jan1.getTime()) / 86400000) + 1) / 7),
    year: utc.getUTCFullYear(),
  };
}

const MOODS = ['Drained', 'Low', 'Okay', 'Good', 'Crushing It'] as const;

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text style={sl.label}>{text}</Text>;
}
const sl = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1.8, color: colors.text.muted },
});

interface CheckinData {
  checkinId:  string;
  weekNumber: number;
  year:       number;
  weight:     number | null;
  mood:       1|2|3|4|5|null;
  notes:      string;
  photos:     { url: string }[];
  weekStart:  { toDate: () => Date } | null;
}

function CheckinCard({ checkin, onPress }: { checkin: CheckinData; onPress: () => void }) {
  const date   = checkin.weekStart?.toDate?.();
  const label  = date
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' +
      new Date(date.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : `Week ${checkin.weekNumber}`;
  const photo  = checkin.photos?.[0]?.url;
  const emoji  = checkin.mood ? MOODS[checkin.mood - 1] : null;

  return (
    <TouchableOpacity style={cc.card} onPress={onPress} activeOpacity={0.8}>
      {photo && <Image source={{ uri: photo }} style={cc.photo} resizeMode="cover" />}
      <View style={cc.body}>
        <View style={cc.top}>
          <View>
            <Text style={cc.week}>Week {checkin.weekNumber}</Text>
            <Text style={cc.date}>{label}</Text>
          </View>
          <View style={cc.badges}>
            {checkin.weight && (
              <View style={cc.badge}>
                <Ionicons name="scale-outline" size={11} color={colors.accent.primary} />
                <Text style={cc.badgeText}>{checkin.weight} lbs</Text>
              </View>
            )}
            {emoji && (
              <View style={cc.moodPill}>
                <Text style={cc.moodPillText}>{emoji}</Text>
              </View>
            )}
          </View>
        </View>
        {checkin.notes ? (
          <Text style={cc.notes} numberOfLines={2}>{checkin.notes}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
const cc = StyleSheet.create({
  card:     { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.card },
  photo:    { width: '100%', height: 140 },
  body:     { padding: spacing.md, gap: spacing.xs },
  top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  week:     { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  date:     { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  badges:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.accent.primary}15`, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText:{ fontSize: 11, fontWeight: '700', color: colors.accent.primary },
  moodPill:    { backgroundColor: `${colors.accent.primary}15`, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  moodPillText:{ fontSize: 11, fontWeight: '700', color: colors.accent.primary },
  notes:    { fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const router            = useRouter();
  const { user }          = useAuthStore();
  const { data, loading } = useUserStore();
  const stats             = data?.stats;

  const { week, year } = getISOWeek(new Date());
  const thisWeekId     = `${year}-W${String(week).padStart(2, '0')}`;

  const weekMonday = (() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);
  const weekRange = weekMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' – ' + weekSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const [checkins,      setCheckins]      = useState<CheckinData[]>([]);
  const [checkinsLoading, setCheckinsLoading] = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  const thisWeekCheckin = checkins.find(c => c.checkinId === thisWeekId);

  const loadCheckins = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const snap = await getDocs(
        query(
          collection(db, 'weeklyCheckins', user.uid, 'checkins'),
          orderBy('weekStart', 'desc'),
          limit(12),
        )
      );
      setCheckins(snap.docs.map(d => d.data() as CheckinData));
    } catch (e) {
      console.error('loadCheckins:', e);
    } finally {
      setCheckinsLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => { loadCheckins(); }, [loadCheckins]);

  const weightHistory = stats?.weightHistory ?? [];
  const currentWeight = stats?.currentWeight;
  const pastCheckins  = checkins.filter(c => c.checkinId !== thisWeekId);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topBar}>
        <Text style={s.title}>Progress</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadCheckins(); }}
            tintColor={colors.accent.primary}
          />
        }
      >

        {/* ── This Week's Check-in ─────────────────────────────────────── */}
        <View style={s.section}>
          <SectionLabel text="THIS WEEK'S CHECK-IN" />
          {checkinsLoading ? (
            <View style={[s.card, s.center]}>
              <ActivityIndicator color={colors.accent.primary} />
            </View>
          ) : thisWeekCheckin ? (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push('/checkin' as any)}
              activeOpacity={0.85}
            >
              <View style={s.thisWeekDone}>
                <View style={s.thisWeekLeft}>
                  <View style={s.doneIcon}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent.success} />
                  </View>
                  <View style={s.doneText}>
                    <Text style={s.doneTitle}>{weekRange} ✓</Text>
                    <Text style={s.doneSub}>
                      {[
                        thisWeekCheckin.weight ? `${thisWeekCheckin.weight} lbs` : null,
                        thisWeekCheckin.mood ? MOODS[thisWeekCheckin.mood - 1] : null,
                        thisWeekCheckin.photos?.length > 0 ? 'Photo' : null,
                      ].filter(Boolean).join('  ·  ')}
                    </Text>
                  </View>
                </View>
                <View style={s.editBadge}>
                  <Text style={s.editText}>Edit</Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.card}>
              <View style={s.checkinEmpty}>
                <View style={s.checkinEmptyIcon}>
                  <Ionicons name="camera-outline" size={24} color={colors.accent.primary} />
                </View>
                <View style={s.checkinEmptyText}>
                  <Text style={s.checkinEmptyTitle}>{weekRange}</Text>
                  <Text style={s.checkinEmptySub}>Track weight, mood, measurements & a progress photo.</Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.checkinBtn}
                onPress={() => router.push('/checkin' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={s.checkinBtnText}>Start This Week's Check-in</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Bodyweight ────────────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionLabel text="BODYWEIGHT" />
          <View style={s.card}>
            {currentWeight ? (
              <View style={s.weightDisplay}>
                <Text style={s.currentWeightNum}>{currentWeight}</Text>
                <Text style={s.currentWeightUnit}>lbs</Text>
              </View>
            ) : (
              <Text style={s.noDataText}>Log weight in your weekly check-in</Text>
            )}
            {weightHistory.length > 0 && (
              <View style={s.historyList}>
                {[...weightHistory].reverse().slice(0, 5).map((entry: any, i: number) => (
                  <View key={i} style={s.historyRow}>
                    <Text style={s.historyDate}>
                      {entry.date?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) ?? '—'}
                    </Text>
                    <Text style={s.historyWeight}>{entry.weight} lbs</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Check-in History ─────────────────────────────────────────── */}
        {pastCheckins.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <SectionLabel text="PAST CHECK-INS" />
              {pastCheckins.some(c => c.photos?.length > 0) && (
                <TouchableOpacity
                  style={s.compareBtn}
                  onPress={() => router.push('/checkin-compare' as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="git-compare-outline" size={14} color={colors.accent.primary} />
                  <Text style={s.compareBtnText}>Compare</Text>
                </TouchableOpacity>
              )}
            </View>
            {pastCheckins.map(c => (
              <CheckinCard
                key={c.checkinId}
                checkin={c}
                onPress={() => router.push('/checkin' as any)}
              />
            ))}
          </View>
        )}

        {/* ── Personal Records ─────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionLabel text="PERSONAL RECORDS" />
          <View style={[s.card, s.emptyCard]}>
            <Ionicons name="trophy-outline" size={28} color={colors.text.muted} />
            <Text style={s.emptyTitle}>No PRs yet</Text>
            <Text style={s.emptySub}>Automatically tracked when you log workouts.</Text>
          </View>
        </View>

        {/* ── Strength Trends ───────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionLabel text="STRENGTH TRENDS" />
          <View style={[s.card, s.emptyCard]}>
            <Ionicons name="trending-up-outline" size={28} color={colors.text.muted} />
            <Text style={s.emptyTitle}>No workout data yet</Text>
            <Text style={s.emptySub}>Strength charts appear after your first logged workout.</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  topBar:    { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:     { ...typography.h3 },
  scroll:    { padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 },
  center:    { justifyContent: 'center', alignItems: 'center', padding: spacing.xl },

  section:       { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.accent.primary}15`, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: `${colors.accent.primary}30` },
  compareBtnText:{ fontSize: 12, fontWeight: '700', color: colors.accent.primary },

  card:        { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  cardHeader:  { marginBottom: spacing.sm },

  // This week check-in
  thisWeekDone:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  thisWeekLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  doneIcon:      { width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.accent.success}15`, justifyContent: 'center', alignItems: 'center' },
  doneText:      { flex: 1, gap: 2 },
  doneTitle:     { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  doneSub:       { fontSize: 13, color: colors.text.muted },
  editBadge:     { backgroundColor: colors.bg.elevated, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  editText:      { fontSize: 12, fontWeight: '600', color: colors.text.secondary },

  checkinEmpty:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  checkinEmptyIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: `${colors.accent.primary}12`, borderWidth: 1, borderColor: `${colors.accent.primary}25`, justifyContent: 'center', alignItems: 'center' },
  checkinEmptyText: { flex: 1, gap: 3 },
  checkinEmptyTitle:{ fontSize: 15, fontWeight: '700', color: colors.text.primary },
  checkinEmptySub:  { fontSize: 12, color: colors.text.muted, lineHeight: 17 },
  checkinBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.md, paddingVertical: 13 },
  checkinBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Weight
  weightDisplay:    { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: spacing.sm },
  currentWeightNum: { fontSize: 36, fontWeight: '800', color: colors.accent.primary, letterSpacing: -1 },
  currentWeightUnit:{ fontSize: 16, fontWeight: '600', color: colors.text.muted },
  noDataText:       { fontSize: 14, color: colors.text.muted, marginBottom: spacing.sm },

  historyList:   { gap: 0 },
  historyRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  historyDate:   { fontSize: 13, color: colors.text.secondary },
  historyWeight: { fontSize: 13, fontWeight: '600', color: colors.text.primary },

  // Empties
  emptyCard:  { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text.secondary },
  emptySub:   { fontSize: 13, color: colors.text.muted, textAlign: 'center' },
});
