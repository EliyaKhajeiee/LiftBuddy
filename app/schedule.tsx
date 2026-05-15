import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, deleteField } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore }  from '../src/store/userStore';
import { EXERCISES } from '../src/data/exercises';
import { colors, spacing, radius, typography } from '../src/theme';
import type { WeekDay, WorkoutDay, ExercisePlan, Exercise } from '../src/types/index';

const DAYS: WeekDay[] = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABEL: Record<WeekDay, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

// ── Exercise editor row ────────────────────────────────────────────────────────

function ExerciseEditor({
  ex, onUpdate, onRemove, onSwap,
}: {
  ex: ExercisePlan;
  onUpdate: (updated: ExercisePlan) => void;
  onRemove: () => void;
  onSwap: () => void;
}) {
  const [sets,    setSets]    = useState(String(ex.sets));
  const [repMin,  setRepMin]  = useState(String(ex.repMin));
  const [repMax,  setRepMax]  = useState(String(ex.repMax));
  const [rest,    setRest]    = useState(String(ex.restSeconds));

  // Sync if parent swaps the exercise underneath us
  useEffect(() => {
    setSets(String(ex.sets));
    setRepMin(String(ex.repMin));
    setRepMax(String(ex.repMax));
    setRest(String(ex.restSeconds));
  }, [ex.exerciseId]);

  function commit(overrides: Partial<{ sets: string; repMin: string; repMax: string; rest: string }>) {
    const s  = parseInt(overrides.sets    ?? sets)    || ex.sets;
    const mn = parseInt(overrides.repMin  ?? repMin)  || ex.repMin;
    const mx = parseInt(overrides.repMax  ?? repMax)  || ex.repMax;
    const r  = parseInt(overrides.rest    ?? rest)    || ex.restSeconds;
    onUpdate({ ...ex, sets: Math.max(1, s), repMin: Math.max(1, mn), repMax: Math.max(mn, mx), restSeconds: Math.max(30, r) });
  }

  return (
    <View style={ee.card}>
      <View style={ee.header}>
        <Text style={ee.name} numberOfLines={1}>{ex.exerciseName}</Text>
        <View style={ee.headerActions}>
          <TouchableOpacity onPress={onSwap} style={ee.actionBtn} activeOpacity={0.7}>
            <Ionicons name="swap-horizontal-outline" size={15} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} style={ee.actionBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={15} color={colors.accent.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={ee.fields}>
        <View style={ee.field}>
          <Text style={ee.fieldLabel}>SETS</Text>
          <TextInput
            style={ee.fieldInput}
            value={sets}
            onChangeText={setSets}
            onBlur={() => commit({ sets })}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
        </View>
        <View style={ee.field}>
          <Text style={ee.fieldLabel}>MIN</Text>
          <TextInput
            style={ee.fieldInput}
            value={repMin}
            onChangeText={setRepMin}
            onBlur={() => commit({ repMin })}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
          />
        </View>
        <View style={ee.field}>
          <Text style={ee.fieldLabel}>MAX</Text>
          <TextInput
            style={ee.fieldInput}
            value={repMax}
            onChangeText={setRepMax}
            onBlur={() => commit({ repMax })}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
          />
        </View>
        <View style={ee.field}>
          <Text style={ee.fieldLabel}>REST (s)</Text>
          <TextInput
            style={ee.fieldInput}
            value={rest}
            onChangeText={setRest}
            onBlur={() => commit({ rest })}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
          />
        </View>
      </View>
    </View>
  );
}

const ee = StyleSheet.create({
  card:          { backgroundColor: colors.bg.elevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name:          { fontSize: 14, fontWeight: '700', color: colors.text.primary, flex: 1 },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  actionBtn:     { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  fields:        { flexDirection: 'row', gap: spacing.xs },
  field:         { flex: 1, alignItems: 'center', gap: 4 },
  fieldLabel:    { fontSize: 8, fontWeight: '700', letterSpacing: 0.8, color: colors.text.muted },
  fieldInput:    { width: '100%', backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, height: 34, textAlign: 'center', color: colors.text.primary, fontSize: 15, fontWeight: '700' },
});

// ── Exercise picker modal ──────────────────────────────────────────────────────

function ExercisePicker({
  visible, onSelect, onClose,
}: {
  visible: boolean;
  onSelect: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const { user }    = useAuthStore();
  const { data }    = useUserStore();
  const [search,    setSearch]    = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [customName, setCustomName] = useState('');
  const [creating,  setCreating]  = useState(false);

  const customExs: Exercise[] = (data as any)?.customExercises ?? [];

  const allExercises = [...customExs, ...EXERCISES];
  const filtered = allExercises.filter(ex =>
    !search || ex.name.toLowerCase().includes(search.toLowerCase())
  );

  async function createCustom() {
    const name = customName.trim();
    if (!name || !user?.uid) return;
    setCreating(true);
    const id = `custom_${Date.now()}`;
    const ex: Exercise = {
      exerciseId:     id,
      name,
      category:       'isolation',
      muscleGroups:   { primary: ['core'], secondary: [] },
      equipment:      ['bodyweight'],
      difficulty:     'beginner',
      movementPattern:'push',
      instructions:   [],
      videoUrl:       null,
      imageUrl:       null,
    };
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        customExercises: arrayUnion(ex),
      });
      onSelect(ex);
      onClose();
    } catch { Alert.alert('Error', 'Could not save custom exercise.'); }
    finally { setCreating(false); setCustomName(''); setShowCreate(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={ep.container}>
        <View style={ep.header}>
          <Text style={ep.title}>Add Exercise</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Create custom */}
        {showCreate ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={ep.createWrap}>
            <Text style={ep.createLabel}>CUSTOM EXERCISE NAME</Text>
            <TextInput
              style={ep.createInput}
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. Ab Crunches"
              placeholderTextColor={colors.text.muted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={createCustom}
            />
            <View style={ep.createActions}>
              <TouchableOpacity style={ep.cancelBtn} onPress={() => { setShowCreate(false); setCustomName(''); }} activeOpacity={0.7}>
                <Text style={ep.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ep.createBtn, !customName.trim() && { opacity: 0.4 }]} onPress={createCustom} disabled={!customName.trim() || creating} activeOpacity={0.8}>
                {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={ep.createBtnText}>Add & Select</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <>
            <View style={ep.searchRow}>
              <Ionicons name="search" size={16} color={colors.text.muted} />
              <TextInput
                style={ep.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search exercises…"
                placeholderTextColor={colors.text.muted}
                autoFocus
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.text.muted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={ep.createCustomBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={16} color={colors.accent.primary} />
              <Text style={ep.createCustomText}>Create Custom Exercise</Text>
            </TouchableOpacity>
            <FlatList
              data={filtered}
              keyExtractor={ex => ex.exerciseId}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={ep.row}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={ep.exNameRow}>
                      <Text style={ep.exName}>{item.name}</Text>
                      {item.exerciseId.startsWith('custom_') && (
                        <View style={ep.customBadge}><Text style={ep.customBadgeText}>Custom</Text></View>
                      )}
                    </View>
                    <Text style={ep.exMeta}>{item.muscleGroups.primary.join(', ')} · {item.category}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={colors.accent.primary} />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg }} />}
            />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const ep = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg.primary },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:           { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  searchRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.md, backgroundColor: colors.bg.input, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, height: 44 },
  searchInput:     { flex: 1, color: colors.text.primary, fontSize: 15 },
  row:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  exNameRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  exName:          { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  exMeta:          { fontSize: 12, color: colors.text.muted, marginTop: 2, textTransform: 'capitalize' },
  customBadge:     { backgroundColor: `${colors.accent.primary}20`, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  customBadgeText: { fontSize: 9, fontWeight: '800', color: colors.accent.primary, letterSpacing: 0.5 },
  createCustomBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: `${colors.accent.primary}30`, backgroundColor: `${colors.accent.primary}08` },
  createCustomText:{ fontSize: 14, fontWeight: '700', color: colors.accent.primary },
  createWrap:      { flex: 1, padding: spacing.lg, gap: spacing.md },
  createLabel:     { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: colors.text.muted },
  createInput:     { backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 54, fontSize: 18, fontWeight: '700', color: colors.text.primary },
  createActions:   { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:       { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  cancelText:      { fontSize: 15, fontWeight: '600', color: colors.text.secondary },
  createBtn:       { flex: 2, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.accent.primary },
  createBtnText:   { fontSize: 15, fontWeight: '800', color: '#fff' },
});

// ── Day editor modal ───────────────────────────────────────────────────────────

function DayEditorModal({
  visible, dayKey, day, onSave, onClose,
}: {
  visible: boolean;
  dayKey: string;
  day: WorkoutDay;
  onSave: (dayKey: string, updated: WorkoutDay) => void;
  onClose: () => void;
}) {
  const [name, setName]         = useState(day.name);
  const [exercises, setExercises] = useState<ExercisePlan[]>([...day.exercises]);
  const [showPicker, setShowPicker]   = useState(false);
  const [swappingIdx, setSwappingIdx] = useState<number | null>(null);

  function updateEx(idx: number, updated: ExercisePlan) {
    setExercises(exs => exs.map((e, i) => i === idx ? updated : e));
  }

  function removeEx(idx: number) {
    Alert.alert('Remove exercise?', exercises[idx]?.exerciseName ?? '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () =>
        setExercises(exs => exs.filter((_, i) => i !== idx))
      },
    ]);
  }

  function addEx(ex: Exercise) {
    setExercises(exs => [...exs, {
      exerciseId:      ex.exerciseId,
      exerciseName:    ex.name,
      order:           exs.length,
      sets:            3,
      repMin:          8,
      repMax:          12,
      suggestedWeight: 0,
      restSeconds:     90,
    }]);
  }

  function swapEx(idx: number, ex: Exercise) {
    setExercises(exs => exs.map((e, i) => i === idx ? {
      ...e,
      exerciseId:   ex.exerciseId,
      exerciseName: ex.name,
    } : e));
  }

  function handleSave() {
    onSave(dayKey, {
      ...day,
      name:      name.trim() || day.name,
      exercises: exercises.map((e, i) => ({ ...e, order: i })),
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={de.container}>
        <View style={de.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={de.headerBtn}>
            <Ionicons name="close" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <TextInput
            style={de.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Day name"
            placeholderTextColor={colors.text.muted}
            selectTextOnFocus
          />
          <TouchableOpacity onPress={handleSave} style={de.headerBtn} activeOpacity={0.8}>
            <Text style={de.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={de.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={de.label}>{exercises.length} EXERCISES</Text>

            {exercises.map((ex, i) => (
              <ExerciseEditor
                key={`${ex.exerciseId}-${i}`}
                ex={ex}
                onUpdate={updated => updateEx(i, updated)}
                onRemove={() => removeEx(i)}
                onSwap={() => setSwappingIdx(i)}
              />
            ))}

            <TouchableOpacity
              style={de.addBtn}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={colors.accent.primary} />
              <Text style={de.addBtnText}>Add Exercise</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        <ExercisePicker
          visible={showPicker}
          onSelect={ex => addEx(ex)}
          onClose={() => setShowPicker(false)}
        />

        {swappingIdx !== null && (
          <ExercisePicker
            visible={true}
            onSelect={ex => { swapEx(swappingIdx, ex); setSwappingIdx(null); }}
            onClose={() => setSwappingIdx(null)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const de = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg.primary },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn:  { width: 52, height: 40, justifyContent: 'center', alignItems: 'center' },
  nameInput:  { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text.primary, textAlign: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: colors.accent.primary, textAlign: 'right' },
  scroll:     { padding: spacing.md, gap: spacing.md, paddingBottom: 60 },
  label:      { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.text.muted, marginBottom: spacing.xs },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: `${colors.accent.primary}50`, borderRadius: radius.md, height: 52, marginTop: spacing.xs },
  addBtnText: { fontSize: 15, fontWeight: '700', color: colors.accent.primary },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const router   = useRouter();
  const { user } = useAuthStore();
  const { data } = useUserStore();
  const plan     = data?.plan;

  const [schedule, setSchedule] = useState<Record<WeekDay, string | null>>(
    plan?.schedule ?? { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null }
  );
  const [days, setDays]   = useState<Record<string, WorkoutDay>>(plan?.days ?? {});
  const [saving, setSaving] = useState(false);
  const [pickingDay, setPickingDay]   = useState<WeekDay | null>(null);
  const [editingDayKey, setEditingDayKey] = useState<string | null>(null);

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
          onPress: async () => {
            const newDays = { ...days };
            delete newDays[dk];
            setDays(newDays);
            const newSched = { ...schedule };
            (Object.keys(newSched) as WeekDay[]).forEach(d => {
              if (newSched[d] === dk) newSched[d] = null;
            });
            setSchedule(newSched);
            if (!user?.uid) return;
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                [`plan.days.${dk}`]: deleteField(),
                'plan.schedule': newSched,
              });
            } catch {
              Alert.alert('Error', 'Could not save. Try again.');
            }
          },
        },
      ]
    );
  }

  function addNewDay() {
    const newKey = `day_${Date.now()}`;
    const newDay: WorkoutDay = {
      name:      'New Day',
      focus:     [],
      exercises: [],
      splitKey:  'full_body',
    };
    setDays(prev => ({ ...prev, [newKey]: newDay }));
    setEditingDayKey(newKey);
  }

  async function handleSaveDay(dayKey: string, updated: WorkoutDay) {
    const newDays = { ...days, [dayKey]: updated };
    setDays(newDays);
    setEditingDayKey(null);
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [`plan.days.${dayKey}`]: updated,
      });
    } catch {
      Alert.alert('Error', 'Could not save. Try again.');
    }
  }

  function assign(weekDay: WeekDay, dayKey: string | null) {
    const updated = { ...schedule };
    if (dayKey) {
      (Object.keys(updated) as WeekDay[]).forEach(d => {
        if (updated[d] === dayKey) updated[d] = null;
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
      await updateDoc(doc(db, 'users', user.uid), {
        'plan.schedule': schedule,
        'plan.days': days,
      });
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

        {/* Weekly schedule */}
        <Text style={s.sectionLabel}>WEEKLY SCHEDULE</Text>
        <View style={s.scheduleCard}>
          {DAYS.map((d, i) => {
            const dayKey = schedule[d];
            const day    = dayKey ? days[dayKey] : null;
            const isToday = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === d;

            return (
              <View key={d} style={[s.row, i < DAYS.length - 1 && s.rowBorder]}>
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
                    size={12}
                    color={day ? colors.accent.primary : colors.text.muted}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Training days */}
        <View style={s.trainingHeader}>
          <Text style={s.sectionLabel}>YOUR TRAINING DAYS</Text>
          <TouchableOpacity style={s.addDayBtn} onPress={addNewDay} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color={colors.accent.primary} />
            <Text style={s.addDayText}>New Day</Text>
          </TouchableOpacity>
        </View>

        <View style={s.planCard}>
          {dayKeys.length === 0 && (
            <Text style={s.emptyText}>No training days yet. Tap "New Day" to create one.</Text>
          )}
          {dayKeys.map((dk, i) => {
            const day = days[dk];
            if (!day) return null;
            const assignedTo = Object.entries(schedule).find(([, v]) => v === dk)?.[0] as WeekDay | undefined;
            return (
              <View key={dk} style={[s.planRow, i < dayKeys.length - 1 && s.planRowBorder]}>
                <View style={s.planDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.planName}>{day.name}</Text>
                  <Text style={s.planMeta}>
                    {day.exercises.length} exercises · {assignedTo ? DAY_LABEL[assignedTo] : 'Unassigned'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditingDayKey(dk)}
                  style={s.iconBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.text.muted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteTrainingDay(dk)}
                  style={s.iconBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.accent.danger} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

      </ScrollView>

      {/* Day picker sheet */}
      {pickingDay && (
        <View style={s.pickerOverlay}>
          <TouchableOpacity style={s.pickerBackdrop} onPress={() => setPickingDay(null)} activeOpacity={1} />
          <View style={s.picker}>
            <View style={s.pickerHandle} />
            <Text style={s.pickerTitle}>{DAY_LABEL[pickingDay]}</Text>

            <TouchableOpacity style={s.pickerOption} onPress={() => assign(pickingDay, null)} activeOpacity={0.7}>
              <View style={s.pickerOptionLeft}>
                <Ionicons name="moon-outline" size={18} color={colors.text.muted} />
                <Text style={s.pickerOptionText}>Rest Day</Text>
              </View>
              {schedule[pickingDay] === null && <Ionicons name="checkmark" size={18} color={colors.accent.primary} />}
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

      {/* Day editor modal */}
      {editingDayKey && days[editingDayKey] && (
        <DayEditorModal
          visible={true}
          dayKey={editingDayKey}
          day={days[editingDayKey]}
          onSave={handleSaveDay}
          onClose={() => setEditingDayKey(null)}
        />
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

  scroll:        { padding: spacing.lg, gap: spacing.md, paddingBottom: 60 },
  sectionLabel:  { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.text.muted },

  scheduleCard:  { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  rowBorder:     { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLeft:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  todayDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent.primary },
  dayName:       { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  dayNameToday:  { color: colors.accent.primary },

  pill:           { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 180 },
  pillActive:     { borderColor: `${colors.accent.primary}60`, backgroundColor: `${colors.accent.primary}10` },
  pillRest:       {},
  pillText:       { fontSize: 12, fontWeight: '600', color: colors.text.muted, maxWidth: 140 },
  pillTextActive: { color: colors.accent.primary },

  trainingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addDayBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  addDayText:     { fontSize: 13, fontWeight: '700', color: colors.accent.primary },

  planCard:       { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  planRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  planRowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.border },
  planDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent.primary, flexShrink: 0 },
  planName:       { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  planMeta:       { fontSize: 11, color: colors.text.muted, marginTop: 1 },
  iconBtn:        { padding: spacing.sm },
  emptyText:      { fontSize: 13, color: colors.text.muted, padding: spacing.md },

  pickerOverlay:  { position: 'absolute', inset: 0, justifyContent: 'flex-end' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  picker:         { backgroundColor: colors.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: colors.border },
  pickerHandle:   { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  pickerTitle:    { fontSize: 17, fontWeight: '700', color: colors.text.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },

  pickerOption:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerOptionActive:    { backgroundColor: `${colors.accent.primary}08` },
  pickerOptionLeft:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pickerOptionText:      { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  pickerOptionTextActive:{ color: colors.accent.primary },
  pickerOptionMeta:      { fontSize: 11, color: colors.text.muted, marginTop: 2 },
});
