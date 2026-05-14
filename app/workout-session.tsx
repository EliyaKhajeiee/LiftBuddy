import {
  ScrollView, View, Text, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, FlatList, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useWorkoutStore, ActiveExercise, ActiveSet } from '../src/store/workoutStore';
import { EXERCISES } from '../src/data/exercises';
import { colors, spacing, radius, typography } from '../src/theme';
import type { MuscleGroup } from '../src/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function completedSets(ex: ActiveExercise) {
  return ex.sets.filter(s => s.completed).length;
}

function getProgressionHint(ex: ActiveExercise): { text: string; direction: 'up' | 'down' | 'neutral' } | null {
  const hasPrev = ex.sets.some(s => s.prevWeight > 0);
  const allDone = ex.sets.every(s => s.completed);

  if (!hasPrev) {
    if (allDone) {
      const allHitTop = ex.sets.every(s => parseInt(s.reps) >= ex.repMax);
      if (allHitTop) return { text: `All ${ex.repMax} reps hit — +5 lbs next session`, direction: 'up' };
    }
    return { text: `Hit all ${ex.sets.length}×${ex.repMax} reps → +5 lbs next time`, direction: 'neutral' };
  }

  const prevWeight = ex.sets[0].prevWeight;
  const currWeight = parseFloat(ex.sets[0].weight) || prevWeight;
  const progressed = currWeight > prevWeight;

  if (progressed) {
    return { text: `+${currWeight - prevWeight} lbs from last session`, direction: 'up' };
  }

  if (allDone) {
    const allHitTop = ex.sets.every(s => parseInt(s.reps) >= ex.repMax);
    const hitMin    = ex.sets.every(s => parseInt(s.reps) >= ex.repMin);
    if (allHitTop)  return { text: `Hit all ${ex.repMax} reps — +5 lbs next session`, direction: 'up' };
    if (!hitMin)    return { text: `Missed min reps — stay at ${prevWeight} lbs`, direction: 'down' };
    return { text: `${prevWeight} lbs — hit ${ex.repMax} reps to unlock +5 lbs`, direction: 'neutral' };
  }

  return { text: `${prevWeight} lbs last time — hit ${ex.sets.length}×${ex.repMax} for +5 lbs`, direction: 'neutral' };
}

// ── Set Row ────────────────────────────────────────────────────────────────────

function SetRow({
  set, exIdx, setIdx,
  onUpdateWeight, onUpdateReps, onToggle,
}: {
  set: ActiveSet;
  exIdx: number;
  setIdx: number;
  onUpdateWeight: (v: string) => void;
  onUpdateReps: (v: string) => void;
  onToggle: () => void;
}) {
  const prevStr = set.prevWeight > 0 ? `${set.prevWeight}×${set.prevReps}` : '—';

  return (
    <View style={[sr.row, set.completed && sr.rowDone]}>
      <Text style={sr.num}>{set.setNumber}</Text>
      <Text style={sr.prev}>{prevStr}</Text>
      <TextInput
        style={[sr.input, set.completed && sr.inputDone, !set.weightEdited && !!set.weight && sr.inputSuggested]}
        value={set.weight}
        onChangeText={onUpdateWeight}
        placeholder="0"
        placeholderTextColor={colors.text.muted}
        keyboardType="numeric"
        maxLength={6}
      />
      <TextInput
        style={[sr.input, set.completed && sr.inputDone, !set.repsEdited && !!set.reps && sr.inputSuggested]}
        value={set.reps}
        onChangeText={onUpdateReps}
        placeholder="0"
        placeholderTextColor={colors.text.muted}
        keyboardType="number-pad"
        maxLength={3}
      />
      <TouchableOpacity style={[sr.check, set.completed && sr.checkDone]} onPress={onToggle} activeOpacity={0.8}>
        <Ionicons name={set.completed ? 'checkmark' : 'ellipse-outline'} size={18} color={set.completed ? '#fff' : colors.text.muted} />
      </TouchableOpacity>
    </View>
  );
}

const sr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  rowDone:  { opacity: 0.7 },
  num:      { width: 28, fontSize: 13, fontWeight: '700', color: colors.text.muted, textAlign: 'center' },
  prev:     { width: 52, fontSize: 12, color: colors.text.muted, textAlign: 'center' },
  input:         { flex: 1, backgroundColor: colors.bg.input, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, height: 36, textAlign: 'center', color: colors.text.primary, fontSize: 15, fontWeight: '600' },
  inputDone:     { borderColor: `${colors.accent.success}50` },
  inputSuggested:{ color: colors.text.muted },
  check:    { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  checkDone:{ backgroundColor: colors.accent.success, borderColor: colors.accent.success },
});

// ── Exercise Card ──────────────────────────────────────────────────────────────

function ExerciseCard({
  ex, exIdx, onSwap, onAddSet, onRemoveSet,
}: {
  ex: ActiveExercise;
  exIdx: number;
  onSwap: () => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
}) {
  const { updateSetField, toggleComplete } = useWorkoutStore();
  const done    = completedSets(ex);
  const total   = ex.sets.length;
  const allDone = done === total;
  const hint    = getProgressionHint(ex);

  return (
    <View style={[ec.card, allDone && ec.cardDone]}>
      {allDone && <View style={ec.topBar} />}

      {/* Header */}
      <View style={ec.header}>
        <View style={{ flex: 1 }}>
          <Text style={ec.name}>{ex.exerciseName}</Text>
          <Text style={ec.meta}>{ex.repMin}–{ex.repMax} reps · {ex.restSeconds}s rest</Text>
          {hint && (
            <View style={ec.hintRow}>
              <Ionicons
                name={hint.direction === 'up' ? 'trending-up' : hint.direction === 'down' ? 'trending-down' : 'remove'}
                size={12}
                color={hint.direction === 'up' ? colors.accent.success : hint.direction === 'down' ? colors.accent.danger : colors.text.muted}
              />
              <Text style={[ec.hint, hint.direction === 'up' && ec.hintUp, hint.direction === 'down' && ec.hintDown]}>
                {hint.text}
              </Text>
            </View>
          )}
        </View>
        <View style={ec.headerRight}>
          <Text style={[ec.progress, allDone && ec.progressDone]}>{done}/{total}</Text>
          <TouchableOpacity onPress={onSwap} style={ec.swapBtn} activeOpacity={0.7}>
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.text.muted} />
            <Text style={ec.swapText}>Swap</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Column headers */}
      <View style={ec.colHeader}>
        <Text style={[ec.colLabel, { width: 28 }]}>SET</Text>
        <Text style={[ec.colLabel, { width: 52 }]}>PREV</Text>
        <Text style={[ec.colLabel, { flex: 1 }]}>LBS</Text>
        <Text style={[ec.colLabel, { flex: 1 }]}>REPS</Text>
        <Text style={[ec.colLabel, { width: 32 }]}>✓</Text>
      </View>

      {/* Sets */}
      {ex.sets.map((set, setIdx) => (
        <SetRow
          key={setIdx}
          set={set}
          exIdx={exIdx}
          setIdx={setIdx}
          onUpdateWeight={v => updateSetField(exIdx, setIdx, 'weight', v)}
          onUpdateReps={v => updateSetField(exIdx, setIdx, 'reps', v)}
          onToggle={() => toggleComplete(exIdx, setIdx)}
        />
      ))}

      {/* Add / Remove set */}
      <View style={ec.setActions}>
        <TouchableOpacity style={ec.setBtn} onPress={onAddSet} activeOpacity={0.7}>
          <Ionicons name="add" size={14} color={colors.text.muted} />
          <Text style={ec.setBtnText}>Add set</Text>
        </TouchableOpacity>
        {ex.sets.length > 1 && (
          <TouchableOpacity style={ec.setBtn} onPress={onRemoveSet} activeOpacity={0.7}>
            <Ionicons name="remove" size={14} color={colors.text.muted} />
            <Text style={ec.setBtnText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const ec = StyleSheet.create({
  card:       { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardDone:   { borderColor: `${colors.accent.success}40` },
  topBar:     { height: 2, backgroundColor: colors.accent.success },
  header:     { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  name:       { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  meta:       { fontSize: 11, color: colors.text.muted, marginTop: 2 },
  hintRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  hint:       { fontSize: 11, color: colors.text.muted, fontStyle: 'italic', flex: 1 },
  hintUp:     { color: colors.accent.success },
  hintDown:   { color: colors.accent.danger },
  headerRight:{ alignItems: 'flex-end', gap: 6 },
  progress:   { fontSize: 12, fontWeight: '700', color: colors.text.muted },
  progressDone:{ color: colors.accent.success },
  swapBtn:    { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  swapText:   { fontSize: 11, color: colors.text.muted },
  colHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  colLabel:   { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: colors.text.muted, textAlign: 'center' },
  setActions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingTop: spacing.sm },
  setBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  setBtnText: { fontSize: 12, color: colors.text.muted },
});

// ── Swap modal ─────────────────────────────────────────────────────────────────

function SwapModal({
  visible, currentMuscles, onSelect, onClose,
}: {
  visible: boolean;
  currentMuscles: MuscleGroup[];
  onSelect: (exerciseId: string, name: string, muscles: MuscleGroup[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = EXERCISES.filter(ex => {
    const matchesMuscle = currentMuscles.length === 0 || ex.muscleGroups.primary.some(m => currentMuscles.includes(m));
    const matchesSearch = search === '' || ex.name.toLowerCase().includes(search.toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={sm.container}>
        <View style={sm.header}>
          <Text style={sm.title}>Swap Exercise</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={sm.searchRow}>
          <Ionicons name="search" size={16} color={colors.text.muted} />
          <TextInput
            style={sm.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises…"
            placeholderTextColor={colors.text.muted}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={ex => ex.exerciseId}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item: ex }) => (
            <TouchableOpacity
              style={sm.exRow}
              onPress={() => {
                onSelect(ex.exerciseId, ex.name, ex.muscleGroups.primary);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View>
                <Text style={sm.exName}>{ex.name}</Text>
                <Text style={sm.exMeta}>{ex.muscleGroups.primary.join(', ')} · {ex.category}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg }} />}
        />
      </SafeAreaView>
    </Modal>
  );
}

const sm = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg.primary },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:       { ...typography.h3 },
  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.lg, backgroundColor: colors.bg.input, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, height: 44 },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: 15 },
  exRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  exName:      { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  exMeta:      { fontSize: 12, color: colors.text.muted, marginTop: 2, textTransform: 'capitalize' },
});

// ── Rest Timer Modal ──────────────────────────────────────────────────────────

function RestTimerModal({ visible, remaining, total, onSkip }: {
  visible: boolean; remaining: number; total: number; onSkip: () => void;
}) {
  const fillAnim = useRef(new Animated.Value(1)).current;
  const isUrgent = remaining <= 10;

  useEffect(() => {
    const pct = total > 0 ? remaining / total : 0;
    Animated.timing(fillAnim, {
      toValue: pct, duration: 950, useNativeDriver: false, easing: Easing.linear,
    }).start();
  }, [remaining]);

  function fmt(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={rm.backdrop}>
        <View style={rm.card}>
          <View style={rm.loggedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.accent.success} />
            <Text style={rm.loggedText}>Set logged</Text>
          </View>

          <Text style={rm.restLabel}>REST</Text>
          <Text style={[rm.countdown, isUrgent && rm.urgent]}>{fmt(remaining)}</Text>

          <View style={rm.barBg}>
            <Animated.View style={[
              rm.barFill,
              { width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              isUrgent && rm.barUrgent,
            ]} />
          </View>

          <TouchableOpacity style={rm.skipBtn} onPress={onSkip} activeOpacity={0.8}>
            <Text style={rm.skipText}>Skip Rest</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.accent.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const rm = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card:       { width: '100%', backgroundColor: colors.bg.card, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.lg, borderWidth: 1, borderColor: colors.border },
  loggedBadge:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.accent.success}18`, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  loggedText: { fontSize: 13, fontWeight: '700', color: colors.accent.success },
  restLabel:  { fontSize: 11, fontWeight: '800', letterSpacing: 3, color: colors.text.muted },
  countdown:  { fontSize: 72, fontWeight: '800', color: colors.text.primary, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  urgent:     { color: colors.accent.danger },
  barBg:      { width: '80%', height: 4, backgroundColor: colors.bg.elevated, borderRadius: 2, overflow: 'hidden' },
  barFill:    { height: 4, backgroundColor: colors.accent.primary, borderRadius: 2 },
  barUrgent:  { backgroundColor: colors.accent.danger },
  skipBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: `${colors.accent.primary}50`, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  skipText:   { fontSize: 15, fontWeight: '700', color: colors.accent.primary },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function WorkoutSession() {
  const router  = useRouter();
  const { user } = useAuthStore();
  const {
    dayName, exercises, elapsed, status,
    finishSession, clearSession,
    swapExercise, addSet, removeSet, removeExercise,
    restActive, restRemaining, restTotal, skipRest,
  } = useWorkoutStore();

  const [swapTarget, setSwapTarget] = useState<number | null>(null);

  const navigatingRef = useRef(false);

  // Redirect if no active session (e.g. direct navigation)
  useEffect(() => {
    if (status !== 'active') { router.back(); }
  }, []);

  const totalSets = exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const doneSets  = exercises.reduce((n, ex) => n + completedSets(ex), 0);

  async function handleFinish() {
    if (!user?.uid) return;
    const remaining = totalSets - doneSets;
    if (remaining > 0) {
      Alert.alert('Finish workout?', `${remaining} sets not completed.`, [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Finish anyway', onPress: doFinish },
      ]);
    } else {
      doFinish();
    }
  }

  async function doFinish() {
    if (!user?.uid || navigatingRef.current) return;
    navigatingRef.current = true;
    await finishSession(user.uid);
    clearSession();
    router.back();
  }

  function handleDiscard() {
    Alert.alert('Discard workout?', 'Your progress will not be saved.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { clearSession(); router.back(); } },
    ]);
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleDiscard} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.dayName}>{dayName}</Text>
          <Text style={s.timer}>{fmtTime(elapsed)}</Text>
        </View>

        <TouchableOpacity
          style={[s.finishBtn, doneSets === totalSets && s.finishBtnReady]}
          onPress={handleFinish}
          activeOpacity={0.85}
        >
          <Text style={[s.finishText, doneSets === totalSets && s.finishTextReady]}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${(doneSets / Math.max(totalSets, 1)) * 100}%` as any }]} />
      </View>

      {/* Progress label */}
      <View style={s.progressLabel}>
        <Text style={s.progressText}>{doneSets} / {totalSets} sets</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.map((ex, exIdx) => (
          <ExerciseCard
            key={`${ex.exerciseId}-${exIdx}`}
            ex={ex}
            exIdx={exIdx}
            onSwap={() => setSwapTarget(exIdx)}
            onAddSet={() => addSet(exIdx)}
            onRemoveSet={() => removeSet(exIdx)}
          />
        ))}
      </ScrollView>

      {/* Swap modal */}
      {swapTarget !== null && (
        <SwapModal
          visible={true}
          currentMuscles={exercises[swapTarget]?.primaryMuscles ?? []}
          onSelect={(id, name, muscles) => swapExercise(swapTarget, id, name, muscles)}
          onClose={() => setSwapTarget(null)}
        />
      )}

      {/* Rest timer modal */}
      <RestTimerModal
        visible={restActive}
        remaining={restRemaining}
        total={restTotal}
        onSkip={skipRest}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter:{ alignItems: 'center' },
  dayName:     { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  timer:       { fontSize: 13, color: colors.text.muted, marginTop: 1, fontVariant: ['tabular-nums'] },

  finishBtn:      { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 7 },
  finishBtnReady: { borderColor: colors.accent.success, backgroundColor: `${colors.accent.success}15` },
  finishText:     { fontSize: 14, fontWeight: '700', color: colors.text.muted },
  finishTextReady:{ color: colors.accent.success },

  progressBar:   { height: 2, backgroundColor: colors.border },
  progressFill:  { height: 2, backgroundColor: colors.accent.primary },
  progressLabel: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  progressText:  { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.text.muted },

  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 60 },
});
