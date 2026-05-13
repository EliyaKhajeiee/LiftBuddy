import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { EXERCISES } from '../src/data/exercises';
import { useWorkoutStore, ActiveExercise } from '../src/store/workoutStore';
import { useAuthStore } from '../src/store/authStore';
import { colors, spacing, radius, typography } from '../src/theme';
import type { MuscleGroup } from '../src/types';

const DEFAULT_SETS = 3;
const DEFAULT_REPS_MIN = 8;
const DEFAULT_REPS_MAX = 12;

interface DraftExercise {
  exerciseId:     string;
  exerciseName:   string;
  primaryMuscles: MuscleGroup[];
  sets:           number;
  repMin:         number;
  repMax:         number;
  restSeconds:    number;
}

function ExercisePickerModal({ visible, onSelect, onClose }: {
  visible: boolean;
  onSelect: (ex: { exerciseId: string; name: string; muscles: MuscleGroup[] }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = EXERCISES.filter(e =>
    search === '' || e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={pm.container}>
        <View style={pm.header}>
          <Text style={pm.title}>Add Exercise</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={pm.searchRow}>
          <Ionicons name="search" size={16} color={colors.text.muted} />
          <TextInput
            style={pm.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises…"
            placeholderTextColor={colors.text.muted}
            autoFocus
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={e => e.exerciseId}
          renderItem={({ item: e }) => (
            <TouchableOpacity
              style={pm.row}
              onPress={() => { onSelect({ exerciseId: e.exerciseId, name: e.name, muscles: e.muscleGroups.primary }); onClose(); setSearch(''); }}
              activeOpacity={0.7}
            >
              <View>
                <Text style={pm.exName}>{e.name}</Text>
                <Text style={pm.exMeta}>{e.muscleGroups.primary.join(', ')} · {e.category}</Text>
              </View>
              <Ionicons name="add-circle-outline" size={20} color={colors.accent.primary} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg }} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </SafeAreaView>
    </Modal>
  );
}
const pm = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg.primary },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:       { ...typography.h4 },
  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.md, backgroundColor: colors.bg.input, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, height: 44 },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: 15 },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  exName:      { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  exMeta:      { fontSize: 11, color: colors.text.muted, marginTop: 2, textTransform: 'capitalize' },
});

function DraftCard({
  ex, onRemove, onUpdate,
}: {
  ex: DraftExercise;
  onRemove: () => void;
  onUpdate: (field: 'sets' | 'repMin' | 'repMax' | 'restSeconds', value: number) => void;
}) {
  return (
    <View style={dc.card}>
      <View style={dc.header}>
        <View style={{ flex: 1 }}>
          <Text style={dc.name}>{ex.exerciseName}</Text>
          <Text style={dc.muscles}>{ex.primaryMuscles.join(', ')}</Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={dc.remove} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={17} color={colors.accent.danger} />
        </TouchableOpacity>
      </View>

      <View style={dc.configRow}>
        <ConfigField label="SETS" value={ex.sets} onUp={() => onUpdate('sets', ex.sets + 1)} onDown={() => ex.sets > 1 && onUpdate('sets', ex.sets - 1)} />
        <ConfigField label="MIN REPS" value={ex.repMin} onUp={() => onUpdate('repMin', ex.repMin + 1)} onDown={() => ex.repMin > 1 && onUpdate('repMin', ex.repMin - 1)} />
        <ConfigField label="MAX REPS" value={ex.repMax} onUp={() => onUpdate('repMax', ex.repMax + 1)} onDown={() => ex.repMax > ex.repMin && onUpdate('repMax', ex.repMax - 1)} />
        <ConfigField label="REST (s)" value={ex.restSeconds} onUp={() => onUpdate('restSeconds', ex.restSeconds + 15)} onDown={() => ex.restSeconds > 30 && onUpdate('restSeconds', ex.restSeconds - 15)} />
      </View>
    </View>
  );
}

function ConfigField({ label, value, onUp, onDown }: { label: string; value: number; onUp: () => void; onDown: () => void }) {
  return (
    <View style={cf.wrap}>
      <Text style={cf.label}>{label}</Text>
      <View style={cf.controls}>
        <TouchableOpacity onPress={onDown} style={cf.btn} activeOpacity={0.7}>
          <Ionicons name="remove" size={14} color={colors.text.muted} />
        </TouchableOpacity>
        <Text style={cf.value}>{value}</Text>
        <TouchableOpacity onPress={onUp} style={cf.btn} activeOpacity={0.7}>
          <Ionicons name="add" size={14} color={colors.text.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
const cf = StyleSheet.create({
  wrap:     { flex: 1, alignItems: 'center', gap: 4 },
  label:    { fontSize: 8, fontWeight: '800', letterSpacing: 0.8, color: colors.text.muted },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn:      { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.bg.elevated, justifyContent: 'center', alignItems: 'center' },
  value:    { fontSize: 15, fontWeight: '700', color: colors.text.primary, minWidth: 24, textAlign: 'center' },
});

const dc = StyleSheet.create({
  card:      { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  header:    { flexDirection: 'row', alignItems: 'flex-start' },
  name:      { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  muscles:   { fontSize: 11, color: colors.text.muted, marginTop: 2, textTransform: 'capitalize' },
  remove:    { padding: 4 },
  configRow: { flexDirection: 'row', gap: 0 },
});

export default function CustomWorkoutScreen() {
  const router              = useRouter();
  const { user }            = useAuthStore();
  const { startCustom }     = useWorkoutStore();
  const [name, setName]     = useState('');
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  function addExercise(picked: { exerciseId: string; name: string; muscles: MuscleGroup[] }) {
    setExercises(prev => [...prev, {
      exerciseId:     picked.exerciseId,
      exerciseName:   picked.name,
      primaryMuscles: picked.muscles,
      sets:           DEFAULT_SETS,
      repMin:         DEFAULT_REPS_MIN,
      repMax:         DEFAULT_REPS_MAX,
      restSeconds:    90,
    }]);
  }

  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }

  function updateExercise(idx: number, field: keyof DraftExercise, value: number) {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  function handleStart() {
    if (!user?.uid) return;
    if (exercises.length === 0) { Alert.alert('Add at least one exercise.'); return; }
    const workoutName = name.trim() || 'Custom Workout';

    const activeExercises: ActiveExercise[] = exercises.map(e => ({
      exerciseId:     e.exerciseId,
      exerciseName:   e.exerciseName,
      primaryMuscles: e.primaryMuscles,
      targetSets:     e.sets,
      repMin:         e.repMin,
      repMax:         e.repMax,
      restSeconds:    e.restSeconds,
      sets:           Array.from({ length: e.sets }, (_, i) => ({
        setNumber: i + 1, prevWeight: 0, prevReps: 0,
        weight: '', reps: String(e.repMin), completed: false, weightEdited: false, repsEdited: false,
      })),
    }));

    startCustom(user.uid, workoutName, activeExercises);
    router.back();
  }

  const totalSets = exercises.reduce((n, e) => n + e.sets, 0);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          <Text style={s.backText}>Workout</Text>
        </TouchableOpacity>
        <Text style={s.title}>Custom Workout</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Workout name */}
        <View style={s.nameWrap}>
          <TextInput
            style={s.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Workout name (e.g. Arms Day)"
            placeholderTextColor={colors.text.muted}
            maxLength={50}
          />
        </View>

        {/* Stats */}
        {exercises.length > 0 && (
          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statNum}>{exercises.length}</Text><Text style={s.statLabel}>EXERCISES</Text></View>
            <View style={s.statDivider} />
            <View style={s.stat}><Text style={s.statNum}>{totalSets}</Text><Text style={s.statLabel}>TOTAL SETS</Text></View>
          </View>
        )}

        {/* Exercise cards */}
        {exercises.map((e, idx) => (
          <DraftCard
            key={`${e.exerciseId}-${idx}`}
            ex={e}
            onRemove={() => removeExercise(idx)}
            onUpdate={(field, value) => updateExercise(idx, field, value)}
          />
        ))}

        {/* Add exercise */}
        <TouchableOpacity style={s.addBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color={colors.accent.primary} />
          <Text style={s.addBtnText}>Add Exercise</Text>
        </TouchableOpacity>

        {/* Start button */}
        {exercises.length > 0 && (
          <TouchableOpacity style={s.startBtn} onPress={handleStart} activeOpacity={0.9}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={s.startText}>Start Workout</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      <ExercisePickerModal
        visible={pickerOpen}
        onSelect={addExercise}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 70 },
  backText:  { ...typography.body, color: colors.text.primary },
  title:     { ...typography.h4 },
  scroll:    { padding: spacing.md, gap: spacing.md, paddingBottom: 60 },

  nameWrap:  {},
  nameInput: { backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 52, color: colors.text.primary, fontSize: 16, fontWeight: '600' },

  statsRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  stat:        { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statNum:     { fontSize: 26, fontWeight: '800', color: colors.accent.primary },
  statLabel:   { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: colors.text.muted, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: colors.border },

  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 2, borderColor: `${colors.accent.primary}40`, borderRadius: radius.md, borderStyle: 'dashed', height: 52 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: colors.accent.primary },

  startBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.md, height: 56 },
  startText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
