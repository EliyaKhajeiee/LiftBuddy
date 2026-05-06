import {
  ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore } from '../src/store/userStore';
import { colors, spacing, radius, shadows } from '../src/theme';
import type { WeekDay, WorkoutDay, WorkoutPlan, ExercisePlan, WorkoutSession } from '../src/types';

// ── CSV Parsing ────────────────────────────────────────────────────────────────

const DAY_MAP: Record<string, WeekDay> = {
  monday: 'mon', mon: 'mon', m: 'mon',
  tuesday: 'tue', tue: 'tue', tu: 'tue',
  wednesday: 'wed', wed: 'wed', w: 'wed',
  thursday: 'thu', thu: 'thu', th: 'thu',
  friday: 'fri', fri: 'fri', f: 'fri',
  saturday: 'sat', sat: 'sat',
  sunday: 'sun', sun: 'sun',
};

const DOW: WeekDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABEL: Record<WeekDay, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

function parseDayKey(raw: string): WeekDay | null {
  return DAY_MAP[raw.trim().toLowerCase()] ?? null;
}

function parseReps(raw: string): { repMin: number; repMax: number } {
  const s = (raw ?? '').trim().replace('–', '-').replace('—', '-');
  const parts = s.split('-').map(p => parseInt(p.trim())).filter(n => !isNaN(n));
  if (parts.length >= 2) return { repMin: parts[0], repMax: parts[1] };
  if (parts.length === 1) return { repMin: parts[0], repMax: parts[0] };
  return { repMin: 8, repMax: 12 };
}

function toExerciseId(name: string): string {
  return 'custom_' + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

interface ParsedSession { name: string; exercises: ExercisePlan[] }
interface ParsedDay { dayKey: WeekDay; sessions: ParsedSession[]; isRest: boolean }
interface ParseResult { days: ParsedDay[]; errors: string[]; warnings: string[] }

function parseCSV(raw: string): ParseResult {
  const lines  = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const errors: string[] = [];
  const warnings: string[] = [];

  // dayKey → sessionName → exercises
  const dayMap  = new Map<WeekDay, Map<string, ExercisePlan[]>>();
  const restSet = new Set<WeekDay>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip header row
    if (i === 0 && /^day/i.test(line)) continue;

    const parts = line.split(',').map(p => p.trim());
    const [dayRaw = '', sessionRaw = '', exerciseRaw = '', setsRaw = '', repsRaw = ''] = parts;

    const dayKey = parseDayKey(dayRaw);
    if (!dayKey) {
      if (dayRaw) warnings.push(`Row ${i + 1}: Unknown day "${dayRaw}" — skipped`);
      continue;
    }

    const sessionLow = sessionRaw.toLowerCase();
    if (!exerciseRaw || ['rest', 'off', '', '-'].includes(sessionLow)) {
      restSet.add(dayKey);
      continue;
    }

    if (!dayMap.has(dayKey)) dayMap.set(dayKey, new Map());
    const sessMap = dayMap.get(dayKey)!;

    if (!sessMap.has(sessionRaw)) sessMap.set(sessionRaw, []);
    const exList = sessMap.get(sessionRaw)!;

    const sets = Math.max(1, parseInt(setsRaw) || 3);
    const { repMin, repMax } = parseReps(repsRaw);

    exList.push({
      exerciseId:      toExerciseId(exerciseRaw),
      exerciseName:    exerciseRaw.trim(),
      order:           exList.length,
      sets,
      repMin,
      repMax,
      suggestedWeight: 0,
      restSeconds:     90,
    });
  }

  if (dayMap.size === 0 && restSet.size === 0) {
    errors.push('No valid rows found. Check the format and try again.');
  }

  const days: ParsedDay[] = DOW.flatMap((dk): ParsedDay[] => {
    const sessMap  = dayMap.get(dk);
    const isRest   = !sessMap && restSet.has(dk);

    if (!sessMap && !isRest) return [];

    if (isRest) return [{ dayKey: dk, sessions: [], isRest: true }];

    const sessions: ParsedSession[] = [];
    for (const [name, exercises] of sessMap!) {
      if (exercises.length === 0) continue;
      sessions.push({ name, exercises });
    }
    if (sessions.length === 0) return [];
    return [{ dayKey: dk, sessions, isRest: false }];
  });

  return { days, errors, warnings };
}

function buildPlan(days: ParsedDay[], uid: string): WorkoutPlan {
  const planDays: Record<string, WorkoutDay> = {};
  const schedule: Record<WeekDay, string | null> = {
    mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null,
  };

  for (const pd of days) {
    if (pd.isRest || pd.sessions.length === 0) continue;
    const dayKey = `day_${pd.dayKey}`;
    const primary = pd.sessions[0];

    const sessions: WorkoutSession[] = pd.sessions.map(s => ({
      name:      s.name,
      exercises: s.exercises,
    }));

    planDays[dayKey] = {
      name:      primary.name,
      focus:     [],
      exercises: primary.exercises,
      splitKey:  'custom',
      sessions,
    };

    schedule[pd.dayKey] = dayKey;
  }

  return {
    planId:      `imported_${Date.now()}`,
    uid,
    name:        'My Training Plan',
    type:        'custom',
    split:       'full_body',
    daysPerWeek: Object.values(schedule).filter(Boolean).length,
    createdAt:   Timestamp.now(),
    isActive:    true,
    days:        planDays,
    schedule,
  };
}

// ── Example CSV ────────────────────────────────────────────────────────────────

const EXAMPLE = `Day,Session,Exercise,Sets,Reps
Monday,AM Lift,Bench Press,4,6-8
Monday,AM Lift,Incline DB Press,3,8-10
Monday,PM Plyo,Box Jumps,4,10
Monday,PM Plyo,Broad Jumps,3,8
Tuesday,AM Lift,Squat,5,3-5
Tuesday,AM Lift,Romanian Deadlift,3,8-10
Wednesday,Rest,,,
Thursday,AM Lift,Deadlift,4,3-5
Thursday,AM Lift,Pull-Ups,4,6-8
Thursday,PM Plyo,Depth Jumps,3,6
Friday,AM Lift,Overhead Press,4,6-8
Friday,AM Lift,Dips,3,8-12
Friday,PM Plyo,Hurdle Hops,3,8
Saturday,Rest,,,
Sunday,Rest,,,`.trim();

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function ImportPlanScreen() {
  const router   = useRouter();
  const { user } = useAuthStore();
  const { data } = useUserStore();

  const [csvText,   setCsvText]   = useState('');
  const [step,      setStep]      = useState<'input' | 'preview'>('input');
  const [parsed,    setParsed]    = useState<ParseResult | null>(null);
  const [plan,      setPlan]      = useState<WorkoutPlan | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [showExample, setShowExample] = useState(false);

  function handlePreview() {
    if (!csvText.trim()) {
      Alert.alert('Empty', 'Paste your CSV content first.');
      return;
    }
    const result = parseCSV(csvText);
    setParsed(result);
    if (result.errors.length > 0) {
      Alert.alert('Parse Errors', result.errors.join('\n'));
      return;
    }
    if (result.days.filter(d => !d.isRest).length === 0) {
      Alert.alert('No workouts found', 'Check your CSV has exercise rows with a valid day name, session name, exercise name, sets, and reps.');
      return;
    }
    const newPlan = buildPlan(result.days, user!.uid);
    setPlan(newPlan);
    setStep('preview');
  }

  async function handleSave() {
    if (!user?.uid || !plan) return;

    const hasPlan = !!data?.plan;
    if (hasPlan) {
      await new Promise<void>(resolve => {
        Alert.alert(
          'Replace Current Plan?',
          'This will overwrite your existing training plan. Workout history is kept.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
            { text: 'Replace', style: 'destructive', onPress: () => resolve() },
          ],
        );
      });
      if (!data?.plan) return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { plan }, { merge: true });
      Alert.alert('Plan Imported!', `${plan.daysPerWeek} training days loaded.`, [
        { text: 'Let\'s Go', onPress: () => router.replace('/(tabs)/workout' as any) },
      ]);
    } catch (e) {
      console.error('import save:', e);
      Alert.alert('Error', 'Could not save plan. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => step === 'preview' ? setStep('input') : router.back()}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{step === 'preview' ? 'Review Plan' : 'Import Plan'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 'input' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Format card */}
            <View style={s.infoCard}>
              <View style={s.infoRow}>
                <Ionicons name="document-text-outline" size={20} color={colors.accent.primary} />
                <Text style={s.infoTitle}>CSV Format</Text>
              </View>
              <Text style={s.infoBody}>
                Each row is one exercise. Use the same Day + Session name to group exercises together. Add multiple sessions per day for AM/PM splits.
              </Text>
              <View style={s.formatRow}>
                {['Day', 'Session', 'Exercise', 'Sets', 'Reps'].map((col, i) => (
                  <View key={i} style={s.formatBadge}>
                    <Text style={s.formatBadgeText}>{col}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.infoNote}>Reps: "8" or "6-8". Rest days: any row with "Rest" or "Off" as Session, or no Exercise.</Text>
            </View>

            {/* Example toggle */}
            <TouchableOpacity
              style={s.exampleToggle}
              onPress={() => {
                setShowExample(v => !v);
              }}
              activeOpacity={0.7}
            >
              <Text style={s.exampleToggleText}>{showExample ? 'Hide Example' : 'Show Example CSV'}</Text>
              <Ionicons name={showExample ? 'chevron-up' : 'chevron-down'} size={14} color={colors.accent.primary} />
            </TouchableOpacity>

            {showExample && (
              <View style={s.exampleCard}>
                <View style={s.exampleHeader}>
                  <Text style={s.exampleLabel}>EXAMPLE</Text>
                  <TouchableOpacity
                    onPress={() => setCsvText(EXAMPLE)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.useExampleBtn}>Use this example</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={s.exampleCode}>{EXAMPLE}</Text>
                </ScrollView>
              </View>
            )}

            {/* Paste input */}
            <View style={s.inputSection}>
              <Text style={s.inputLabel}>PASTE YOUR CSV</Text>
              <TextInput
                style={s.csvInput}
                value={csvText}
                onChangeText={setCsvText}
                multiline
                placeholder={`Day,Session,Exercise,Sets,Reps\nMonday,AM Lift,Bench Press,4,6-8\nMonday,PM Plyo,Box Jumps,3,10\n...`}
                placeholderTextColor={colors.text.muted}
                autoCorrect={false}
                autoCapitalize="none"
                spellCheck={false}
                textAlignVertical="top"
              />
              {csvText.length > 0 && (
                <TouchableOpacity
                  style={s.clearBtn}
                  onPress={() => setCsvText('')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={16} color={colors.text.muted} />
                  <Text style={s.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={s.previewBtn} onPress={handlePreview} activeOpacity={0.9}>
              <Ionicons name="eye-outline" size={18} color="#fff" />
              <Text style={s.previewBtnText}>Preview Import</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

            {/* Summary */}
            <View style={s.summaryCard}>
              <Text style={s.summaryTitle}>My Training Plan</Text>
              <View style={s.summaryBadges}>
                <View style={s.badge}>
                  <Ionicons name="barbell-outline" size={12} color={colors.accent.primary} />
                  <Text style={s.badgeText}>{plan!.daysPerWeek} training days</Text>
                </View>
                {parsed!.days.some(d => (d.sessions?.length ?? 0) > 1) && (
                  <View style={s.badge}>
                    <Ionicons name="layers-outline" size={12} color={colors.accent.secondary} />
                    <Text style={[s.badgeText, { color: colors.accent.secondary }]}>AM + PM sessions</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Day-by-day preview */}
            {DOW.map(dk => {
              const pd = parsed!.days.find(d => d.dayKey === dk);
              if (!pd) return null;

              return (
                <View key={dk} style={s.dayCard}>
                  <View style={s.dayHeader}>
                    <View style={[s.dayDot, pd.isRest && s.dayDotRest]} />
                    <Text style={s.dayName}>{DAY_LABEL[dk]}</Text>
                    {pd.isRest && <View style={s.restBadge}><Text style={s.restBadgeText}>REST</Text></View>}
                  </View>

                  {pd.sessions.map((sess, si) => (
                    <View key={si} style={[s.sessionBlock, si > 0 && s.sessionBlockSecondary]}>
                      <View style={s.sessionHeader}>
                        <View style={[s.sessionTag, si > 0 && s.sessionTagSecondary]}>
                          <Text style={[s.sessionTagText, si > 0 && s.sessionTagTextSecondary]}>
                            {si === 0 ? 'PRIMARY' : 'SECONDARY'}
                          </Text>
                        </View>
                        <Text style={s.sessionName}>{sess.name}</Text>
                        <Text style={s.sessionMeta}>{sess.exercises.length} exercises</Text>
                      </View>
                      {sess.exercises.map((e, ei) => (
                        <View key={ei} style={s.exRow}>
                          <Text style={s.exNum}>{ei + 1}</Text>
                          <Text style={s.exName} numberOfLines={1}>{e.exerciseName}</Text>
                          <Text style={s.exVol}>
                            {e.sets} × {e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              );
            })}

            {/* Warnings */}
            {(parsed?.warnings ?? []).length > 0 && (
              <View style={s.warnCard}>
                <View style={s.warnHeader}>
                  <Ionicons name="warning-outline" size={16} color={colors.accent.warning} />
                  <Text style={s.warnTitle}>Warnings</Text>
                </View>
                {parsed!.warnings.map((w, i) => (
                  <Text key={i} style={s.warnText}>{w}</Text>
                ))}
              </View>
            )}

            {/* Save button */}
            <TouchableOpacity
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.9}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={s.saveBtnText}>Save This Plan</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.editBack} onPress={() => setStep('input')} activeOpacity={0.7}>
              <Text style={s.editBackText}>Edit CSV</Text>
            </TouchableOpacity>

          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: colors.text.primary },

  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 60 },

  // Format info
  infoCard:  { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm, ...shadows.card },
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  infoBody:  { fontSize: 13, color: colors.text.secondary, lineHeight: 19 },
  formatRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  formatBadge:     { backgroundColor: `${colors.accent.primary}15`, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${colors.accent.primary}30` },
  formatBadgeText: { fontSize: 11, fontWeight: '700', color: colors.accent.primary },
  infoNote:  { fontSize: 11, color: colors.text.muted, lineHeight: 16 },

  // Example
  exampleToggle:     { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  exampleToggleText: { fontSize: 13, fontWeight: '600', color: colors.accent.primary },
  exampleCard:    { backgroundColor: colors.bg.elevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  exampleHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  exampleLabel:   { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, color: colors.text.muted },
  useExampleBtn:  { fontSize: 12, fontWeight: '700', color: colors.accent.primary },
  exampleCode:    { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 11, color: colors.text.secondary, padding: spacing.md, lineHeight: 18 },

  // Input
  inputSection: { gap: spacing.xs },
  inputLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: colors.text.muted },
  csvInput:     { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.text.primary, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', minHeight: 220, lineHeight: 20, ...shadows.card },
  clearBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  clearBtnText: { fontSize: 12, color: colors.text.muted },

  previewBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.lg, height: 56, ...shadows.elevated },
  previewBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Summary
  summaryCard:   { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: `${colors.accent.primary}40`, ...shadows.card, gap: spacing.sm },
  summaryTitle:  { fontSize: 18, fontWeight: '800', color: colors.text.primary },
  summaryBadges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${colors.accent.primary}12`, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  badgeText:     { fontSize: 12, fontWeight: '700', color: colors.accent.primary },

  // Day card
  dayCard:   { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.card },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent.primary },
  dayDotRest:{ backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border },
  dayName:   { fontSize: 15, fontWeight: '700', color: colors.text.primary, flex: 1 },
  restBadge: { backgroundColor: colors.bg.elevated, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  restBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: colors.text.muted },

  // Session blocks
  sessionBlock:          { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sessionBlockSecondary: { backgroundColor: `${colors.accent.secondary}06` },
  sessionHeader:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sessionTag:            { backgroundColor: `${colors.accent.primary}15`, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  sessionTagSecondary:   { backgroundColor: `${colors.accent.secondary}15` },
  sessionTagText:        { fontSize: 8, fontWeight: '800', letterSpacing: 1, color: colors.accent.primary },
  sessionTagTextSecondary: { color: colors.accent.secondary },
  sessionName:           { fontSize: 13, fontWeight: '700', color: colors.text.primary, flex: 1 },
  sessionMeta:           { fontSize: 11, color: colors.text.muted },

  // Exercise row
  exRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  exNum:  { fontSize: 10, fontWeight: '800', color: colors.text.muted, width: 16, textAlign: 'center' },
  exName: { flex: 1, fontSize: 13, color: colors.text.secondary },
  exVol:  { fontSize: 12, fontWeight: '700', color: colors.text.muted },

  // Warnings
  warnCard:   { backgroundColor: `${colors.accent.warning}10`, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: `${colors.accent.warning}30`, gap: spacing.xs },
  warnHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  warnTitle:  { fontSize: 13, fontWeight: '700', color: colors.accent.warning },
  warnText:   { fontSize: 12, color: colors.text.secondary, lineHeight: 18 },

  // Save
  saveBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.lg, height: 58, ...shadows.elevated },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:     { color: '#fff', fontSize: 17, fontWeight: '800' },
  editBack:        { alignItems: 'center', paddingVertical: spacing.sm },
  editBackText:    { fontSize: 14, color: colors.text.muted },
});
