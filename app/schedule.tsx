import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore }  from '../src/store/userStore';
import { colors, spacing, radius, typography } from '../src/theme';
import type { WeekDay, WorkoutDay, WorkoutPlan } from '../src/types';

const DAYS: WeekDay[]  = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABEL: Record<WeekDay, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

export default function ScheduleScreen() {
  const router      = useRouter();
  const { user }    = useAuthStore();
  const { data }    = useUserStore();
  const plan        = data?.plan;

  const [schedule, setSchedule] = useState<Record<WeekDay, string | null>>(
    plan?.schedule ?? { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null }
  );
  const [days, setDays] = useState<Record<string, WorkoutDay>>(plan?.days ?? {});
  const [saving, setSaving] = useState(false);
  const [pickingDay, setPickingDay] = useState<WeekDay | null>(null);

  if (!plan) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={{ color: colors.text.secondary }}>No plan generated yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dayKeys = Object.keys(days).sort();

  function deleteTrainingDay(dk: string) {
    Alert.alert(
      `Delete "${days[dk]?.name}"?`,
      'This removes the training day and unassigns it from the schedule.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            const newDays = { ...days };
            delete newDays[dk];
            setDays(newDays);
            const newSched = { ...schedule };
            (Object.keys(newSched) as WeekDay[]).forEach(d => {
              if (newSched[d] === dk) newSched[d] = null;
            });
            setSchedule(newSched);
          },
        },
      ]
    );
  }

  function assign(weekDay: WeekDay, dayKey: string | null) {
    // Remove this dayKey from any other weekday first (avoid duplicate assignment)
    const updated = { ...schedule };
    if (dayKey) {
      Object.keys(updated).forEach(d => {
        if (updated[d as WeekDay] === dayKey) updated[d as WeekDay] = null;
      });
    }
    updated[weekDay] = dayKey;
    setSchedule(updated);
    setPickingDay(null);
  }

  async function save() {
    if (!user?.uid || !plan) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        plan: { ...plan, schedule, days },
      }, { merge: true });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save schedule. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          <Text style={s.backText}>Workout</Text>
        </TouchableOpacity>
        <Text style={s.title}>Schedule</Text>
        <TouchableOpacity onPress={save} disabled={saving} style={s.saveBtn} activeOpacity={0.8}>
          {saving
            ? <ActivityIndicator size="small" color={colors.accent.primary} />
            : <Text style={s.saveText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <Text style={s.sectionLabel}>WEEKLY SCHEDULE</Text>
        <Text style={s.sub}>Tap a day to assign or change its workout. Each training day can only appear once.</Text>

        {/* Day rows */}
        {DAYS.map(d => {
          const dayKey = schedule[d];
          const day    = dayKey ? days[dayKey] : null;
          const isToday = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === d;

          return (
            <View key={d} style={[s.row, isToday && s.rowToday]}>
              <View style={s.rowLeft}>
                {isToday && <View style={s.todayDot} />}
                <Text style={[s.dayName, isToday && s.dayNameToday]}>{DAY_LABEL[d]}</Text>
              </View>

              <TouchableOpacity
                style={[s.pill, day ? s.pillActive : s.pillRest]}
                onPress={() => setPickingDay(d)}
                activeOpacity={0.8}
              >
                <Text style={[s.pillText, day && s.pillTextActive]} numberOfLines={1}>
                  {day ? day.name : 'Rest'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={13}
                  color={day ? colors.accent.primary : colors.text.muted}
                />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Plan overview */}
        <View style={s.planCard}>
          <Text style={s.planCardTitle}>YOUR TRAINING DAYS</Text>
          {dayKeys.length === 0 && (
            <Text style={s.planMeta}>No training days. Import or generate a plan to add some.</Text>
          )}
          {dayKeys.map(dk => {
            const day = days[dk];
            if (!day) return null;
            const assignedTo = Object.entries(schedule).find(([, v]) => v === dk)?.[0] as WeekDay | undefined;
            return (
              <View key={dk} style={s.planRow}>
                <View style={s.planDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.planName}>{day.name}</Text>
                  <Text style={s.planMeta}>
                    {day.exercises.length} exercises · {assignedTo ? DAY_LABEL[assignedTo] : 'Unassigned'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteTrainingDay(dk)}
                  style={s.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.accent.danger} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

      </ScrollView>

      {/* Day picker modal */}
      {pickingDay && (
        <View style={s.pickerOverlay}>
          <TouchableOpacity style={s.pickerBackdrop} onPress={() => setPickingDay(null)} activeOpacity={1} />
          <View style={s.picker}>
            <View style={s.pickerHandle} />
            <Text style={s.pickerTitle}>
              {DAY_LABEL[pickingDay]}
            </Text>

            <TouchableOpacity
              style={s.pickerOption}
              onPress={() => assign(pickingDay, null)}
              activeOpacity={0.7}
            >
              <View style={s.pickerOptionLeft}>
                <Ionicons name="moon-outline" size={18} color={colors.text.muted} />
                <Text style={s.pickerOptionText}>Rest Day</Text>
              </View>
              {schedule[pickingDay] === null && (
                <Ionicons name="checkmark" size={18} color={colors.accent.primary} />
              )}
            </TouchableOpacity>

            {dayKeys.map(dk => {
              const day    = days[dk];
              if (!day) return null;
              const active = schedule[pickingDay] === dk;
              return (
                <TouchableOpacity
                  key={dk}
                  style={[s.pickerOption, active && s.pickerOptionActive]}
                  onPress={() => assign(pickingDay, dk)}
                  activeOpacity={0.7}
                >
                  <View style={s.pickerOptionLeft}>
                    <Ionicons name="barbell-outline" size={18} color={active ? colors.accent.primary : colors.text.muted} />
                    <View>
                      <Text style={[s.pickerOptionText, active && s.pickerOptionTextActive]}>{day.name}</Text>
                      <Text style={s.pickerOptionMeta}>{day.exercises.length} exercises</Text>
                    </View>
                  </View>
                  {active && <Ionicons name="checkmark" size={18} color={colors.accent.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 70 },
  backText: { ...typography.body, color: colors.text.primary },
  title:    { ...typography.h4 },
  saveBtn:  { minWidth: 70, alignItems: 'flex-end' },
  saveText: { fontSize: 15, fontWeight: '700', color: colors.accent.primary },

  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 60 },

  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.text.muted },
  sub:          { fontSize: 13, color: colors.text.secondary, lineHeight: 19 },

  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowToday:  { borderColor: `${colors.accent.primary}40` },
  rowLeft:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  todayDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent.primary },
  dayName:   { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  dayNameToday: { color: colors.accent.primary },

  pill:          { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 6, maxWidth: 200 },
  pillActive:    { borderColor: `${colors.accent.primary}60`, backgroundColor: `${colors.accent.primary}10` },
  pillRest:      {},
  pillText:      { fontSize: 12, fontWeight: '600', color: colors.text.muted, maxWidth: 160 },
  pillTextActive:{ color: colors.accent.primary },

  planCard:      { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  planCardTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.text.muted, marginBottom: spacing.xs },
  planRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent.primary },
  planName:      { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  planMeta:      { fontSize: 11, color: colors.text.muted },
  assignedLabel: { fontSize: 11, fontWeight: '700', color: colors.text.muted },
  assignedLabelActive: { color: colors.accent.primary },
  deleteBtn:     { padding: spacing.sm },

  pickerOverlay:  { position: 'absolute', inset: 0, justifyContent: 'flex-end' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  picker:         { backgroundColor: colors.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: colors.border },
  pickerHandle:   { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  pickerTitle:    { fontSize: 17, fontWeight: '700', color: colors.text.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },

  pickerOption:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerOptionActive:{ backgroundColor: `${colors.accent.primary}08` },
  pickerOptionLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pickerOptionText:  { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  pickerOptionTextActive: { color: colors.accent.primary },
  pickerOptionMeta:  { fontSize: 11, color: colors.text.muted, marginTop: 2 },
});
