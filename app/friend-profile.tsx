import {
  ScrollView, View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { colors, spacing, radius, typography, shadows } from '../src/theme';

const { width: W } = Dimensions.get('window');

const GOAL_LABEL: Record<string, string> = {
  bulk: 'Building Muscle', cut: 'Losing Fat', strength: 'Building Strength',
};
const EXP_LABEL: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
};

interface FriendData {
  displayName:  string;
  avatarUrl:    string | null;
  email:        string;
  profile?: {
    goal:        string;
    experience:  string;
    daysPerWeek: number;
    equipment:   string[];
    muscleFocus: string[];
  };
  stats?: {
    totalWorkouts:  number;
    currentStreak:  number;
    currentWeight:  number | null;
  };
  plan?: {
    name:     string;
    schedule: string[];
    days:     Record<string, { name: string; exercises: any[] }>;
  };
  lastSessions?: Record<string, {
    date:      any;
    exercises: { exerciseName: string; sets: { weight: number; reps: number; completed: boolean }[] }[];
  }>;
}

interface CheckinItem {
  weekNumber: number;
  weekStart:  { toDate: () => Date } | null;
  photos:     { url: string; pose?: string }[];
  weight:     number | null;
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// Recent 28 days as a workout heatmap
function WorkoutCalendar({ lastSessions }: { lastSessions: Record<string, any> }) {
  const today = new Date();
  const days: { date: Date; hasWorkout: boolean }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const hasWorkout = Object.values(lastSessions).some(s => {
      try {
        const sd: Date = s.date?.toDate ? s.date.toDate() : new Date(s.date);
        sd.setHours(0, 0, 0, 0);
        return sd.getTime() === d.getTime();
      } catch { return false; }
    });
    days.push({ date: d, hasWorkout });
  }

  const cellW = (W - spacing.lg * 2 - spacing.xs * 6) / 7;

  return (
    <View style={cal.grid}>
      {days.map((day, i) => (
        <View
          key={i}
          style={[cal.cell, { width: cellW, height: cellW },
            day.hasWorkout && cal.cellActive,
          ]}
        >
          <Text style={[cal.cellText, day.hasWorkout && cal.cellTextActive]}>
            {day.date.getDate()}
          </Text>
        </View>
      ))}
    </View>
  );
}
const cal = StyleSheet.create({
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  cell:          { justifyContent: 'center', alignItems: 'center', borderRadius: 6, backgroundColor: colors.bg.elevated },
  cellActive:    { backgroundColor: `${colors.accent.primary}25`, borderWidth: 1, borderColor: `${colors.accent.primary}50` },
  cellText:      { fontSize: 11, color: colors.text.muted, fontWeight: '500' },
  cellTextActive:{ color: colors.accent.primary, fontWeight: '700' },
});

export default function FriendProfileScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams<{ uid: string; name: string }>();
  const uid     = params.uid;

  const [data,     setData]     = useState<FriendData | null>(null);
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!uid) return;
    Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDocs(query(collection(db, 'weeklyCheckins', uid, 'checkins'), orderBy('weekStart', 'desc'), limit(8))),
    ]).then(([userSnap, checkinsSnap]) => {
      if (userSnap.exists()) setData(userSnap.data() as FriendData);
      setCheckins(checkinsSnap.docs.map(d => d.data() as CheckinItem).filter(c => c.photos?.length > 0));
    }).catch(console.error).finally(() => setLoading(false));
  }, [uid]);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><ActivityIndicator color={colors.accent.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  const profile      = data?.profile;
  const stats        = data?.stats;
  const plan         = data?.plan;
  const lastSessions = data?.lastSessions ?? {};
  const name         = data?.displayName ?? params.name ?? 'Friend';

  // Current split days
  const splitDays = plan?.schedule?.map(dayKey => plan.days?.[dayKey]).filter(Boolean) ?? [];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Avatar + name ─────────────────────────────────────────────── */}
        <View style={s.hero}>
          {data?.avatarUrl ? (
            <Image source={{ uri: data.avatarUrl }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarText}>{initials(name)}</Text>
            </View>
          )}
          <Text style={s.name}>{name}</Text>
          {profile?.goal && (
            <View style={s.goalPill}>
              <Text style={s.goalPillText}>{GOAL_LABEL[profile.goal] ?? profile.goal}</Text>
            </View>
          )}
        </View>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          {[
            { label: 'WORKOUTS', value: String(stats?.totalWorkouts ?? 0) },
            { label: 'STREAK',   value: `${stats?.currentStreak ?? 0}d` },
            { label: 'WEIGHT',   value: stats?.currentWeight ? `${stats.currentWeight} lbs` : '—' },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <Text style={s.statVal}>{stat.value}</Text>
              <Text style={s.statLbl}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Current Split ─────────────────────────────────────────────── */}
        {plan && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>CURRENT SPLIT</Text>
            <View style={s.card}>
              <Text style={s.splitName}>{plan.name}</Text>
              {splitDays.map((day, i) => (
                <View key={i} style={s.splitDay}>
                  <Text style={s.splitDayName}>{day.name}</Text>
                  <Text style={s.splitDayCount}>{day.exercises?.length ?? 0} exercises</Text>
                </View>
              ))}
              {splitDays.length === 0 && (
                <Text style={s.splitEmpty}>No days configured yet</Text>
              )}
            </View>
          </View>
        )}

        {/* ── Workout Calendar (last 28 days) ───────────────────────────── */}
        {Object.keys(lastSessions).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>LAST 28 DAYS</Text>
            <View style={s.card}>
              <WorkoutCalendar lastSessions={lastSessions} />
            </View>
          </View>
        )}

        {/* ── Profile details ────────────────────────────────────────────── */}
        {profile && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>PROFILE</Text>
            <View style={s.card}>
              {[
                { icon: 'trending-up-outline', label: 'Experience', value: EXP_LABEL[profile.experience] ?? profile.experience },
                { icon: 'calendar-outline',    label: 'Days / week', value: `${profile.daysPerWeek} days` },
              ].map(row => (
                <View key={row.label} style={s.infoRow}>
                  <View style={s.infoLeft}>
                    <Ionicons name={row.icon as any} size={15} color={colors.text.muted} />
                    <Text style={s.infoLabel}>{row.label}</Text>
                  </View>
                  <Text style={s.infoValue}>{row.value}</Text>
                </View>
              ))}
              {(profile.equipment?.length ?? 0) > 0 && (
                <View style={s.chipSection}>
                  <Text style={s.chipSectionLabel}>Equipment</Text>
                  <View style={s.chipRow}>
                    {profile.equipment.map(e => (
                      <View key={e} style={s.chip}><Text style={s.chipText}>{e.replace(/_/g, ' ')}</Text></View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Progress photos ────────────────────────────────────────────── */}
        {checkins.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>PROGRESS PHOTOS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.photoStrip}>
              {checkins.map((c, i) => {
                const d = c.weekStart?.toDate?.();
                const label = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Wk ${c.weekNumber}`;
                return c.photos.map((photo, j) => (
                  <View key={`${i}-${j}`} style={s.photoCard}>
                    <Image source={{ uri: photo.url }} style={s.photo} resizeMode="cover" />
                    <Text style={s.photoWeek}>Wk {c.weekNumber} · {label}</Text>
                    {photo.pose && <Text style={s.photoPose}>{photo.pose}</Text>}
                  </View>
                ));
              })}
            </ScrollView>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const PHOTO_W = W * 0.42;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },

  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 },

  hero:              { alignItems: 'center', gap: spacing.sm },
  avatar:            { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accent.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText:        { fontSize: 28, fontWeight: '800', color: '#fff' },
  name:              { ...typography.h3 },
  goalPill:          { backgroundColor: `${colors.accent.primary}20`, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: `${colors.accent.primary}40` },
  goalPillText:      { fontSize: 12, fontWeight: '600', color: colors.accent.primary },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center', backgroundColor: colors.bg.card, borderRadius: radius.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  statVal:  { fontSize: 20, fontWeight: '800', color: colors.text.primary },
  statLbl:  { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: colors.text.muted, marginTop: 2 },

  section:      { gap: spacing.sm },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: colors.text.muted },
  card:         { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },

  splitName:      { fontSize: 15, fontWeight: '800', color: colors.text.primary, marginBottom: spacing.sm },
  splitDay:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  splitDayName:   { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  splitDayCount:  { fontSize: 12, color: colors.text.muted },
  splitEmpty:     { fontSize: 13, color: colors.text.muted },

  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoLabel: { fontSize: 13, color: colors.text.secondary },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.text.primary },

  chipSection:      { marginTop: spacing.sm, gap: spacing.xs },
  chipSectionLabel: { fontSize: 11, color: colors.text.muted, fontWeight: '600' },
  chipRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip:             { backgroundColor: colors.bg.elevated, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  chipText:         { fontSize: 12, color: colors.text.secondary, textTransform: 'capitalize' },

  photoStrip: { gap: spacing.sm, paddingBottom: 4 },
  photoCard:  { width: PHOTO_W, gap: 4 },
  photo:      { width: PHOTO_W, height: PHOTO_W * (4/3), borderRadius: radius.lg },
  photoWeek:  { fontSize: 11, fontWeight: '600', color: colors.text.secondary },
  photoPose:  { fontSize: 10, color: colors.text.muted },
});
