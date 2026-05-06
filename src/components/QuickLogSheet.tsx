import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, Keyboard, TouchableWithoutFeedback, Easing, ScrollView,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../store/workoutStore';
import { useUserStore } from '../store/userStore';
import { colors, spacing, radius } from '../theme';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  const m  = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

function adj(value: string, delta: number, min = 0): string {
  const n = parseFloat(value) || 0;
  return String(Math.max(min, Math.round((n + delta) * 4) / 4)); // quarter-lb precision
}

function adjReps(value: string, delta: number): string {
  const n = parseInt(value) || 0;
  return String(Math.max(1, n + delta));
}

// ── Quick-adjust button ────────────────────────────────────────────────────────

function AdjBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={ab.btn} onPress={onPress} activeOpacity={0.65}>
      <Text style={ab.label}>{label}</Text>
    </TouchableOpacity>
  );
}
const ab = StyleSheet.create({
  btn:   { paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.bg.elevated, minWidth: 38, alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '700', color: colors.text.secondary, letterSpacing: 0.3 },
});

// ── Rest Timer Ring ────────────────────────────────────────────────────────────

function RestTimer({ remaining, total, onSkip, nextEx, nextSetNum, nextSetTotal }: {
  remaining: number; total: number; onSkip: () => void;
  nextEx: string; nextSetNum: number; nextSetTotal: number;
}) {
  const progress = total > 0 ? remaining / total : 0;
  const fillAnim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: progress,
      duration: 900,
      useNativeDriver: false,
      easing: Easing.linear,
    }).start();
  }, [remaining]);

  const isUrgent = remaining <= 10;

  return (
    <View style={rt.wrap}>
      {/* Logged badge */}
      <View style={rt.loggedBadge}>
        <Ionicons name="checkmark-circle" size={14} color={colors.accent.success} />
        <Text style={rt.loggedText}>Set logged</Text>
      </View>

      {/* Big countdown */}
      <View style={rt.countdownWrap}>
        <Text style={[rt.countdown, isUrgent && rt.countdownUrgent]}>{fmtTime(remaining)}</Text>
        <Text style={rt.restLabel}>REST</Text>

        {/* Progress bar */}
        <View style={rt.barBg}>
          <Animated.View
            style={[
              rt.barFill,
              { width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              isUrgent && rt.barUrgent,
            ]}
          />
        </View>
      </View>

      {/* Next up */}
      <View style={rt.nextWrap}>
        <Text style={rt.nextLabel}>UP NEXT</Text>
        <Text style={rt.nextEx} numberOfLines={1}>{nextEx}</Text>
        <Text style={rt.nextSet}>Set {nextSetNum} of {nextSetTotal}</Text>
      </View>

      {/* Skip */}
      <TouchableOpacity style={rt.skipBtn} onPress={onSkip} activeOpacity={0.8}>
        <Text style={rt.skipText}>Skip Rest</Text>
        <Ionicons name="arrow-forward" size={15} color={colors.accent.primary} />
      </TouchableOpacity>
    </View>
  );
}

const rt = StyleSheet.create({
  wrap:          { paddingTop: spacing.md, paddingBottom: spacing.sm, alignItems: 'center', gap: spacing.lg },
  loggedBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${colors.accent.success}18`, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 5 },
  loggedText:    { fontSize: 12, fontWeight: '700', color: colors.accent.success },
  countdownWrap: { alignItems: 'center', gap: spacing.sm, width: '100%' },
  countdown:     { fontSize: 64, fontWeight: '800', color: colors.text.primary, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  countdownUrgent:{ color: colors.accent.danger },
  restLabel:     { fontSize: 11, fontWeight: '800', letterSpacing: 3, color: colors.text.muted },
  barBg:         { width: '80%', height: 4, backgroundColor: colors.bg.elevated, borderRadius: 2, overflow: 'hidden' },
  barFill:       { height: 4, backgroundColor: colors.accent.primary, borderRadius: 2 },
  barUrgent:     { backgroundColor: colors.accent.danger },
  nextWrap:      { alignItems: 'center', gap: 3 },
  nextLabel:     { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: colors.text.muted, textTransform: 'uppercase' },
  nextEx:        { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  nextSet:       { fontSize: 12, color: colors.text.muted },
  skipBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: `${colors.accent.primary}50`, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  skipText:      { fontSize: 14, fontWeight: '700', color: colors.accent.primary },
});

// ── Exercise navigator ─────────────────────────────────────────────────────────

function ExNav({ name, muscles, setLabel, onPrev, onNext, canPrev, canNext, doneSets, totalSets }: {
  name: string; muscles: string; setLabel: string;
  onPrev: () => void; onNext: () => void; canPrev: boolean; canNext: boolean;
  doneSets: number; totalSets: number;
}) {
  return (
    <View style={en.wrap}>
      <TouchableOpacity onPress={onPrev} disabled={!canPrev} style={en.arrow} activeOpacity={0.6}>
        <Ionicons name="chevron-back" size={22} color={canPrev ? colors.text.secondary : colors.border} />
      </TouchableOpacity>
      <View style={en.center}>
        <Text style={en.name} numberOfLines={1}>{name}</Text>
        <Text style={en.muscles} numberOfLines={1}>{muscles}</Text>
        <Text style={en.setLabel}>{setLabel}</Text>
      </View>
      <TouchableOpacity onPress={onNext} disabled={!canNext} style={en.arrow} activeOpacity={0.6}>
        <Ionicons name="chevron-forward" size={22} color={canNext ? colors.text.secondary : colors.border} />
      </TouchableOpacity>
    </View>
  );
}
const en = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center' },
  arrow:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  center:  { flex: 1, alignItems: 'center', gap: 2 },
  name:    { fontSize: 18, fontWeight: '800', color: colors.text.primary, textAlign: 'center', letterSpacing: -0.3 },
  muscles: { fontSize: 11, color: colors.text.muted, textTransform: 'capitalize', textAlign: 'center' },
  setLabel:{ fontSize: 12, fontWeight: '600', color: colors.accent.primary, marginTop: 2 },
});

// ── Quick Log mode: all sets at once with ghost prev-values ───────────────────

type LocalSet = { weight: string; reps: string; weightDirty: boolean };

function QuickLogView({ onFinish }: { onFinish: () => void }) {
  const { dayName, exercises, elapsed, updateSetField, toggleComplete, doneSets, totalSets } = useWorkoutStore();
  const done  = doneSets();
  const total = totalSets();

  // Local state: initialize from store's already-suggested values; track if user touched each field
  const [localSets, setLocalSets] = useState<LocalSet[][]>(() =>
    exercises.map(ex =>
      ex.sets.map(set => ({
        weight:      set.weight,
        reps:        set.reps,
        weightDirty: false,
      }))
    )
  );

  function handleWeightChange(exIdx: number, setIdx: number, val: string) {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setLocalSets(prev => {
      const next = prev.map(arr => arr.map(s => ({ ...s })));
      next[exIdx][setIdx].weight      = cleaned;
      next[exIdx][setIdx].weightDirty = true;
      // Propagate to non-dirty sets in the same exercise
      next[exIdx].forEach((s, i) => {
        if (i !== setIdx && !s.weightDirty) next[exIdx][i].weight = cleaned;
      });
      return next;
    });
  }

  function handleRepsChange(exIdx: number, setIdx: number, val: string) {
    const cleaned = val.replace(/[^0-9]/g, '');
    setLocalSets(prev => {
      const next = prev.map(arr => arr.map(s => ({ ...s })));
      next[exIdx][setIdx].reps = cleaned;
      return next;
    });
  }

  function handleLogAll() {
    exercises.forEach((ex, exIdx) => {
      ex.sets.forEach((set, setIdx) => {
        const local = localSets[exIdx]?.[setIdx];
        const w = local?.weight || (set.prevWeight > 0 ? String(set.prevWeight) : '0');
        const r = local?.reps   || (set.prevReps   > 0 ? String(set.prevReps)   : String(ex.repMin));
        updateSetField(exIdx, setIdx, 'weight', w);
        updateSetField(exIdx, setIdx, 'reps',   r);
        if (!set.completed) toggleComplete(exIdx, setIdx);
      });
    });
    onFinish();
  }

  return (
    <>
      {/* Header */}
      <View style={ql.header}>
        <View>
          <Text style={ql.dayName}>{dayName}</Text>
          <Text style={ql.progress}>{fmtTime(elapsed)} elapsed</Text>
        </View>
        <TouchableOpacity style={ql.skipBtn} onPress={onFinish} activeOpacity={0.85}>
          <Text style={ql.skipText}>Finish Early</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={ql.barBg}>
        <View style={[ql.barFill, { width: `${(done / Math.max(total, 1)) * 100}%` as any }]} />
      </View>

      {/* Hint */}
      <Text style={ql.hint}>Gray = last week's values  ·  Changing set 1 fills the rest</Text>

      {/* All exercises + sets */}
      {exercises.map((ex, exIdx) => (
        <View key={ex.exerciseId} style={ql.exBlock}>
          <View style={ql.exHeader}>
            <Text style={ql.exName}>{ex.exerciseName}</Text>
            <Text style={ql.exMeta}>
              {ex.repMin}–{ex.repMax} reps
              {ex.primaryMuscles.length > 0 ? `  ·  ${ex.primaryMuscles[0]}` : ''}
            </Text>
          </View>

          {/* Column labels */}
          <View style={ql.colRow}>
            <Text style={ql.colSet}>SET</Text>
            <Text style={ql.colWt}>WEIGHT (LBS)</Text>
            <Text style={ql.colX} />
            <Text style={ql.colReps}>REPS</Text>
          </View>

          {ex.sets.map((set, setIdx) => {
            const local      = localSets[exIdx]?.[setIdx];
            const isDirty    = local?.weightDirty ?? false;
            const wVal       = local?.weight ?? set.weight;
            const rVal       = local?.reps   ?? set.reps;
            const textColor  = isDirty ? colors.text.primary : colors.text.secondary;

            return (
              <View key={setIdx} style={[ql.setRow, set.completed && ql.setRowDone]}>
                <Text style={ql.setNum}>{set.setNumber}</Text>

                <View style={[ql.inlineInput, isDirty && ql.inlineInputDirty]}>
                  <TextInput
                    style={[ql.input, { color: textColor }]}
                    value={wVal}
                    onChangeText={v => handleWeightChange(exIdx, setIdx, v)}
                    placeholder={set.prevWeight > 0 ? String(set.prevWeight) : '0'}
                    placeholderTextColor={colors.text.muted}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <Text style={ql.inputUnit}>lbs</Text>
                </View>

                <Text style={ql.inputSep}>×</Text>

                <View style={ql.inlineInput}>
                  <TextInput
                    style={[ql.input, { color: rVal ? colors.text.primary : colors.text.secondary }]}
                    value={rVal}
                    onChangeText={v => handleRepsChange(exIdx, setIdx, v)}
                    placeholder={set.prevReps > 0 ? String(set.prevReps) : String(ex.repMin)}
                    placeholderTextColor={colors.text.muted}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={ql.inputUnit}>reps</Text>
                </View>

                {set.completed && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.accent.success} style={ql.checkIcon} />
                )}
              </View>
            );
          })}
        </View>
      ))}

      <TouchableOpacity style={ql.saveBtn} onPress={handleLogAll} activeOpacity={0.9}>
        <Ionicons name="trophy-outline" size={18} color="#fff" />
        <Text style={ql.saveBtnText}>Log All & Finish</Text>
      </TouchableOpacity>
    </>
  );
}

const ql = StyleSheet.create({
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  dayName:  { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  progress: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  skipBtn:  { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 7 },
  skipText: { fontSize: 13, fontWeight: '700', color: colors.text.muted },

  barBg:   { height: 2, backgroundColor: colors.bg.elevated, borderRadius: 1, marginBottom: spacing.sm },
  barFill: { height: 2, backgroundColor: colors.accent.primary, borderRadius: 1 },

  hint: { fontSize: 11, color: colors.text.muted, textAlign: 'center', marginBottom: spacing.md, fontStyle: 'italic' },

  exBlock:  { marginBottom: spacing.lg },
  exHeader: { marginBottom: spacing.xs },
  exName:   { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  exMeta:   { fontSize: 11, color: colors.text.muted, textTransform: 'capitalize', marginTop: 2 },

  colRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingHorizontal: 2 },
  colSet:   { width: 28, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: colors.text.muted },
  colWt:    { flex: 1, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: colors.text.muted, textAlign: 'center' },
  colX:     { width: 16 },
  colReps:  { flex: 1, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: colors.text.muted, textAlign: 'center' },

  setRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, marginBottom: 3 },
  setRowDone:{ opacity: 0.6 },
  setNum:    { width: 22, fontSize: 12, fontWeight: '700', color: colors.text.muted, textAlign: 'center' },

  inlineInput:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bg.elevated, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 7, borderWidth: 1, borderColor: colors.border },
  inlineInputDirty: { borderColor: `${colors.accent.primary}50`, backgroundColor: `${colors.accent.primary}08` },
  input:     { flex: 1, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  inputUnit: { fontSize: 9, fontWeight: '700', color: colors.text.muted, letterSpacing: 0.5 },
  inputSep:  { width: 16, fontSize: 13, color: colors.text.muted, fontWeight: '700', textAlign: 'center' },
  checkIcon: { marginLeft: 2 },

  saveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.md, height: 54, marginTop: spacing.md },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

// ── Main sheet ─────────────────────────────────────────────────────────────────

interface Props {
  visible:  boolean;
  onClose:  () => void;
  onFinish: () => void;
}

export default function QuickLogSheet({ visible, onClose, onFinish }: Props) {
  const {
    dayName, exercises, elapsed, currentExIdx,
    restActive, restRemaining, restTotal, skipRest,
    focusExercise, logSet, addSet, removeSet, totalSets, doneSets,
  } = useWorkoutStore();
  const { data } = useUserStore();
  const workoutMode = data?.settings?.workoutMode ?? 'timer';

  const [localWeight, setLocalWeight] = useState('');
  const [localReps,   setLocalReps]   = useState('');
  const [logged,      setLogged]      = useState(false);
  const slideAnim  = useRef(new Animated.Value(600)).current;
  const loggedAnim = useRef(new Animated.Value(0)).current;

  const ex      = exercises[currentExIdx];
  const setIdx  = ex?.sets.findIndex(s => !s.completed) ?? -1;
  const currSet = setIdx !== -1 ? ex?.sets[setIdx] : null;
  const exDone  = ex?.sets.filter(s => s.completed).length ?? 0;
  const exTotal = ex?.sets.length ?? 0;
  const allDone = doneSets() === totalSets() && totalSets() > 0;

  const nextIncomplete = useWorkoutStore.getState().firstIncompleteSet();
  const nextEx         = nextIncomplete ? exercises[nextIncomplete.exIdx] : null;
  const nextSetIdx     = nextIncomplete ? exercises[nextIncomplete.exIdx].sets.findIndex(s => !s.completed) : -1;

  // Sync local inputs when ex/set changes
  useEffect(() => {
    if (currSet) {
      setLocalWeight(currSet.weight || (currSet.prevWeight > 0 ? String(currSet.prevWeight) : ''));
      setLocalReps(currSet.reps   || (currSet.prevReps   > 0 ? String(currSet.prevReps)   : ''));
    }
    setLogged(false);
  }, [currentExIdx, setIdx]);

  // Slide animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue:  visible ? 0 : 600,
      tension:  75,
      friction: 13,
      useNativeDriver: true,
    }).start();
    if (!visible) Keyboard.dismiss();
  }, [visible]);

  // "Logged!" flash animation
  useEffect(() => {
    if (logged) {
      Animated.sequence([
        Animated.timing(loggedAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
        Animated.delay(400),
        Animated.timing(loggedAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [logged]);

  function handleLog() {
    if (!ex || setIdx === -1) return;
    logSet(currentExIdx, setIdx, localWeight, localReps);
    setLogged(true);
    Keyboard.dismiss();
    setTimeout(() => {
      setLogged(false);
      const next = useWorkoutStore.getState().firstIncompleteSet();
      if (next) focusExercise(next.exIdx);
    }, 650);
  }

  const doneCount  = doneSets();
  const totalCount = totalSets();
  const progressPct = (doneCount / Math.max(totalCount, 1)) * 100;

  const logBtnBg = loggedAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [colors.accent.primary, colors.accent.success],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={s.backdrop}>
          <TouchableOpacity style={s.backdropClose} onPress={onClose} activeOpacity={1} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>

            {/* Drag handle */}
            <View style={s.handle} />

            {/* Quick Log mode: show all sets in a scrollable list */}
            {workoutMode === 'quick' ? (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
                <QuickLogView onFinish={onFinish} />
              </ScrollView>
            ) : (

            /* Timer mode below */
            <>

            {/* Header row */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                <Text style={s.dayName} numberOfLines={1}>{dayName}</Text>
                <View style={s.timerRow}>
                  <View style={s.timerDot} />
                  <Text style={s.timer}>{fmtTime(elapsed)}</Text>
                </View>
              </View>

              <View style={s.headerRight}>
                <Text style={s.setsProgress}>{doneCount}/{totalCount}</Text>
                <TouchableOpacity
                  style={[s.finishBtn, allDone && s.finishBtnReady]}
                  onPress={onFinish}
                  activeOpacity={0.85}
                >
                  <Text style={[s.finishText, allDone && s.finishTextReady]}>
                    {allDone ? '🏆 Done!' : 'Finish'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Progress bar */}
            <View style={s.progressBg}>
              <Animated.View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
            </View>

            {/* Content */}
            {allDone ? (
              <View style={s.allDoneWrap}>
                <Text style={s.allDoneIcon}>💪</Text>
                <Text style={s.allDoneTitle}>All sets complete!</Text>
                <Text style={s.allDoneSub}>Hit Finish to save your session.</Text>
                <TouchableOpacity style={s.finishBigBtn} onPress={onFinish} activeOpacity={0.9}>
                  <Ionicons name="trophy" size={18} color="#fff" />
                  <Text style={s.finishBigText}>Finish Workout</Text>
                </TouchableOpacity>
              </View>
            ) : restActive ? (
              /* ── REST TIMER ── */
              <RestTimer
                remaining={restRemaining}
                total={restTotal}
                onSkip={skipRest}
                nextEx={nextEx?.exerciseName ?? ex?.exerciseName ?? ''}
                nextSetNum={(nextSetIdx !== -1 ? nextSetIdx : exDone) + 1}
                nextSetTotal={nextEx?.sets.length ?? exTotal}
              />
            ) : (
              /* ── LOG SET ── */
              <>
                {/* Exercise navigator */}
                <ExNav
                  name={ex?.exerciseName ?? ''}
                  muscles={(ex?.primaryMuscles ?? []).join(', ')}
                  setLabel={currSet ? `Set ${currSet.setNumber} of ${exTotal}` : `${exDone}/${exTotal} complete`}
                  onPrev={() => focusExercise(currentExIdx - 1)}
                  onNext={() => focusExercise(currentExIdx + 1)}
                  canPrev={currentExIdx > 0}
                  canNext={currentExIdx < exercises.length - 1}
                  doneSets={exDone}
                  totalSets={exTotal}
                />

                {currSet ? (
                  <>
                    {/* Prev session info */}
                    {currSet.prevWeight > 0 ? (
                      <View style={s.prevRow}>
                        <Ionicons name="time-outline" size={12} color={colors.text.muted} />
                        <Text style={s.prevText}>
                          Last: {currSet.prevWeight} lbs × {currSet.prevReps} reps
                        </Text>
                        {parseFloat(localWeight) > currSet.prevWeight && (
                          <View style={s.prBadge}>
                            <Text style={s.prText}>↑ Overload</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={s.targetRow}>
                        <Text style={s.targetText}>
                          Target: {ex.repMin}–{ex.repMax} reps
                        </Text>
                      </View>
                    )}

                    {/* Weight input + quick adjust */}
                    <View style={s.inputBlock}>
                      <Text style={s.inputBlockLabel}>WEIGHT (LBS)</Text>
                      <View style={s.adjRow}>
                        <AdjBtn label="-5"   onPress={() => setLocalWeight(v => adj(v, -5))}   />
                        <AdjBtn label="-2.5" onPress={() => setLocalWeight(v => adj(v, -2.5))} />
                        <TextInput
                          style={s.bigInput}
                          value={localWeight}
                          onChangeText={setLocalWeight}
                          placeholder="0"
                          placeholderTextColor={colors.text.muted}
                          keyboardType="numeric"
                          maxLength={6}
                          selectTextOnFocus
                        />
                        <AdjBtn label="+2.5" onPress={() => setLocalWeight(v => adj(v, +2.5))} />
                        <AdjBtn label="+5"   onPress={() => setLocalWeight(v => adj(v, +5))}   />
                      </View>
                    </View>

                    {/* Reps input + quick adjust */}
                    <View style={s.inputBlock}>
                      <Text style={s.inputBlockLabel}>REPS</Text>
                      <View style={s.adjRow}>
                        <AdjBtn label="-2" onPress={() => setLocalReps(v => adjReps(v, -2))} />
                        <AdjBtn label="-1" onPress={() => setLocalReps(v => adjReps(v, -1))} />
                        <TextInput
                          style={[s.bigInput, s.bigInputReps]}
                          value={localReps}
                          onChangeText={setLocalReps}
                          placeholder="0"
                          placeholderTextColor={colors.text.muted}
                          keyboardType="number-pad"
                          maxLength={3}
                          selectTextOnFocus
                        />
                        <AdjBtn label="+1" onPress={() => setLocalReps(v => adjReps(v, +1))} />
                        <AdjBtn label="+2" onPress={() => setLocalReps(v => adjReps(v, +2))} />
                      </View>
                    </View>

                    {/* Log button */}
                    <Animated.View style={[s.logBtnWrap, { backgroundColor: logBtnBg }]}>
                      <TouchableOpacity style={s.logBtnInner} onPress={handleLog} activeOpacity={0.9}>
                        <Ionicons
                          name={logged ? 'checkmark-circle' : 'checkmark'}
                          size={22}
                          color="#fff"
                        />
                        <Text style={s.logBtnText}>{logged ? 'Logged!' : 'Log Set'}</Text>
                      </TouchableOpacity>
                    </Animated.View>

                    {/* Set controls */}
                    <View style={s.setControls}>
                      <TouchableOpacity style={s.setCtrlBtn} onPress={() => addSet(currentExIdx)} activeOpacity={0.7}>
                        <Ionicons name="add-circle-outline" size={14} color={colors.text.muted} />
                        <Text style={s.setCtrlText}>Add set</Text>
                      </TouchableOpacity>
                      {exTotal > 1 && (
                        <TouchableOpacity style={s.setCtrlBtn} onPress={() => removeSet(currentExIdx)} activeOpacity={0.7}>
                          <Ionicons name="remove-circle-outline" size={14} color={colors.text.muted} />
                          <Text style={s.setCtrlText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                ) : (
                  /* All sets for this exercise done — show next exercise button */
                  <View style={s.exCompleteWrap}>
                    <View style={s.exCompleteIconWrap}>
                      <Ionicons name="checkmark-circle" size={36} color={colors.accent.success} />
                    </View>
                    <Text style={s.exCompleteTitle}>Exercise done!</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const next = useWorkoutStore.getState().firstIncompleteSet();
                        if (next) focusExercise(next.exIdx);
                      }}
                      style={s.nextExBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={s.nextExBtnText}>Next exercise</Text>
                      <Ionicons name="arrow-forward" size={15} color={colors.accent.primary} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Exercise dot navigation */}
                <View style={s.dotRow}>
                  {exercises.map((exItem, i) => {
                    const done     = exItem.sets.filter(s => s.completed).length;
                    const total    = exItem.sets.length;
                    const isActive = i === currentExIdx;
                    const isDone   = done === total;
                    return (
                      <TouchableOpacity key={i} onPress={() => focusExercise(i)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                        <View style={[s.dot, isActive && s.dotActive, isDone && s.dotDone]} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Close timer-mode fragment */}
            </>
            )}

          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop:      { flex: 1, justifyContent: 'flex-end' },
  backdropClose: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },

  sheet: {
    backgroundColor:     colors.bg.card,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingBottom:        44,
    paddingHorizontal:    spacing.lg,
    borderTopWidth:       1,
    borderLeftWidth:      1,
    borderRightWidth:     1,
    borderColor:          colors.borderLight,
  },

  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.sm },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  headerLeft: { flex: 1, gap: 3 },
  headerRight:{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayName:    { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  timerRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timerDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent.primary },
  timer:      { fontSize: 13, fontWeight: '600', color: colors.text.muted, fontVariant: ['tabular-nums'] },
  setsProgress:{ fontSize: 13, fontWeight: '700', color: colors.text.secondary },
  finishBtn:      { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 7 },
  finishBtnReady: { borderColor: colors.accent.success, backgroundColor: `${colors.accent.success}18` },
  finishText:     { fontSize: 13, fontWeight: '700', color: colors.text.muted },
  finishTextReady:{ color: colors.accent.success },

  progressBg:   { height: 2, backgroundColor: colors.bg.elevated, borderRadius: 1, marginBottom: spacing.md },
  progressFill: { height: 2, backgroundColor: colors.accent.primary, borderRadius: 1 },

  // Prev session row
  prevRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center', marginBottom: spacing.sm },
  prevText:   { fontSize: 12, color: colors.text.muted },
  prBadge:    { backgroundColor: `${colors.accent.success}20`, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  prText:     { fontSize: 10, fontWeight: '700', color: colors.accent.success },
  targetRow:  { alignItems: 'center', marginBottom: spacing.sm },
  targetText: { fontSize: 12, color: colors.text.muted },

  // Input blocks
  inputBlock:      { marginBottom: spacing.sm },
  inputBlockLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: colors.text.muted, textAlign: 'center', marginBottom: 6 },
  adjRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bigInput: {
    width: 90,
    height: 64,
    backgroundColor: colors.bg.elevated,
    borderWidth:     1.5,
    borderColor:     colors.borderLight,
    borderRadius:    radius.md,
    textAlign:       'center',
    fontSize:        28,
    fontWeight:      '700',
    color:           colors.text.primary,
  },
  bigInputReps: { width: 70 },

  // Log button
  logBtnWrap:  { borderRadius: radius.lg, overflow: 'hidden', marginTop: spacing.sm, marginBottom: spacing.xs },
  logBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: 58 },
  logBtnText:  { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  setControls: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center', paddingVertical: spacing.xs },
  setCtrlBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  setCtrlText: { fontSize: 12, color: colors.text.muted },

  // Exercise dots
  dotRow:    { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: spacing.sm },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent.primary, width: 20, borderRadius: 4 },
  dotDone:   { backgroundColor: colors.accent.success },

  // Exercise complete state
  exCompleteWrap:     { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  exCompleteIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${colors.accent.success}15`, justifyContent: 'center', alignItems: 'center' },
  exCompleteTitle:    { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  nextExBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs, borderWidth: 1.5, borderColor: `${colors.accent.primary}50`, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  nextExBtnText:      { fontSize: 14, fontWeight: '700', color: colors.accent.primary },

  // All done
  allDoneWrap:    { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  allDoneIcon:    { fontSize: 48 },
  allDoneTitle:   { fontSize: 24, fontWeight: '800', color: colors.text.primary },
  allDoneSub:     { fontSize: 14, color: colors.text.muted },
  finishBigBtn:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, height: 54, marginTop: spacing.sm },
  finishBigText:  { color: '#fff', fontSize: 17, fontWeight: '800' },
});
