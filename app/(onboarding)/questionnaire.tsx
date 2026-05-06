import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Animated, KeyboardAvoidingView, Platform,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, radius } from '../../src/theme';
import type { Goal, ExperienceLevel, Location, Equipment, MuscleGroup } from '../../src/types';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────────────────────────

type FormState = {
  goal:        Goal | null;
  experience:  ExperienceLevel | null;
  age:         string;
  heightFt:    string;
  heightIn:    string;
  weightLbs:   string;
  location:    Location | null;
  equipment:   Equipment[];
  daysPerWeek: 2 | 3 | 4 | 5 | 6 | null;
  muscleFocus: MuscleGroup[];
  injuries:    string;
};

// ── Data ───────────────────────────────────────────────────────────────────────

const GOAL_OPTIONS: { value: Goal; label: string; sub: string; icon: string }[] = [
  { value: 'bulk',     label: 'Build Muscle',   sub: 'Lean bulk with progressive overload',     icon: 'barbell-outline'  },
  { value: 'cut',      label: 'Lose Fat',        sub: 'Cut while preserving strength & muscle',  icon: 'flame-outline'    },
  { value: 'strength', label: 'Build Strength',  sub: 'Move heavier weight over time',           icon: 'trophy-outline'   },
];

const EXP_OPTIONS: { value: ExperienceLevel; label: string; sub: string; icon: string }[] = [
  { value: 'beginner',     label: 'Just Starting',   sub: 'Less than 6 months of training',         icon: 'leaf-outline'        },
  { value: 'intermediate', label: 'Getting Serious',  sub: '6 months to 3 years of consistent work', icon: 'trending-up-outline' },
  { value: 'advanced',     label: 'Seasoned Lifter',  sub: '3+ years, focused on performance',       icon: 'flash-outline'       },
];

const LOC_OPTIONS: { value: Location; label: string; sub: string; icon: string }[] = [
  { value: 'gym',  label: 'Gym',      sub: 'Full access to barbells, cables & machines', icon: 'business-outline' },
  { value: 'home', label: 'Home Gym', sub: 'Training with your own setup & equipment',   icon: 'home-outline'     },
];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string; icon: string }[] = [
  { value: 'barbell',          label: 'Barbell',          icon: 'barbell-outline'      },
  { value: 'dumbbells',        label: 'Dumbbells',        icon: 'fitness-outline'      },
  { value: 'cables',           label: 'Cables',           icon: 'git-pull-request-outline' },
  { value: 'machines',         label: 'Machines',         icon: 'hardware-chip-outline'},
  { value: 'kettlebell',       label: 'Kettlebell',       icon: 'ellipse-outline'      },
  { value: 'bodyweight',       label: 'Bodyweight',       icon: 'body-outline'         },
  { value: 'resistance_bands', label: 'Resistance Bands', icon: 'shuffle-outline'      },
  { value: 'pull_up_bar',      label: 'Pull-up Bar',      icon: 'remove-outline'       },
];

const MUSCLE_OPTIONS: { value: MuscleGroup; label: string }[] = [
  { value: 'chest',      label: 'Chest'      },
  { value: 'back',       label: 'Back'       },
  { value: 'shoulders',  label: 'Shoulders'  },
  { value: 'biceps',     label: 'Biceps'     },
  { value: 'triceps',    label: 'Triceps'    },
  { value: 'core',       label: 'Core'       },
  { value: 'quads',      label: 'Quads'      },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes',     label: 'Glutes'     },
  { value: 'calves',     label: 'Calves'     },
];

const DAYS_OPTIONS = [
  { value: 2 as const, sub: 'Recovery focus' },
  { value: 3 as const, sub: 'Full body'       },
  { value: 4 as const, sub: 'Upper / lower'   },
  { value: 5 as const, sub: 'High frequency'  },
  { value: 6 as const, sub: 'Max volume'      },
];

const TOTAL_STEPS = 9;

// ── Sub-components ─────────────────────────────────────────────────────────────

function SelectCard({ icon, label, sub, selected, onPress }: {
  icon: string; label: string; sub: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[sc.card, selected && sc.cardSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[sc.iconWrap, selected && sc.iconWrapSelected]}>
        <Ionicons name={icon as any} size={20} color={selected ? '#fff' : colors.text.muted} />
      </View>
      <View style={sc.textWrap}>
        <Text style={[sc.label, selected && sc.labelSelected]}>{label}</Text>
        <Text style={sc.sub} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={[sc.check, selected && sc.checkSelected]}>
        {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
      </View>
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  card:            { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.bg.card, marginBottom: spacing.sm },
  cardSelected:    { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}14` },
  iconWrap:        { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bg.elevated, justifyContent: 'center', alignItems: 'center' },
  iconWrapSelected:{ backgroundColor: colors.accent.primary },
  textWrap:        { flex: 1, gap: 2 },
  label:           { fontSize: 16, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.1 },
  labelSelected:   { color: colors.accent.primary },
  sub:             { fontSize: 13, color: colors.text.muted },
  check:           { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  checkSelected:   { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
});

function EquipmentChip({ icon, label, selected, onPress }: {
  icon: string; label: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[eq.chip, selected && eq.chipSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon as any} size={14} color={selected ? colors.accent.primary : colors.text.muted} />
      <Text style={[eq.label, selected && eq.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const eq = StyleSheet.create({
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.bg.card, margin: 4 },
  chipSelected: { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}14` },
  label:        { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  labelSelected:{ color: colors.accent.primary },
});

function MuscleChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const half = Math.floor(SCREEN_W / 2) - spacing.lg - 6;
  return (
    <TouchableOpacity
      style={[mc.chip, selected && mc.chipSelected, { width: half }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {selected
        ? <Ionicons name="checkmark-circle" size={16} color={colors.accent.primary} />
        : <View style={mc.emptyDot} />
      }
      <Text style={[mc.label, selected && mc.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const mc = StyleSheet.create({
  chip:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.bg.card, margin: 4 },
  chipSelected: { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}14` },
  emptyDot:     { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border },
  label:        { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
  labelSelected:{ color: colors.accent.primary },
});

function DayBubble({ value, sub, selected, onPress }: {
  value: number; sub: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={db.wrap} onPress={onPress} activeOpacity={0.75}>
      <View style={[db.circle, selected && db.circleSelected]}>
        <Text style={[db.num, selected && db.numSelected]}>{value}</Text>
      </View>
      <Text style={[db.sub, selected && db.subSelected]} numberOfLines={2}>{sub}</Text>
    </TouchableOpacity>
  );
}

const db = StyleSheet.create({
  wrap:          { alignItems: 'center', flex: 1, gap: spacing.sm },
  circle:        { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bg.card, justifyContent: 'center', alignItems: 'center' },
  circleSelected:{ borderColor: colors.accent.primary, backgroundColor: colors.accent.primary },
  num:           { fontSize: 22, fontWeight: '800', color: colors.text.muted },
  numSelected:   { color: '#fff' },
  sub:           { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, color: colors.text.muted, textAlign: 'center', textTransform: 'uppercase' },
  subSelected:   { color: colors.accent.primary },
});

function StatInput({ label, value, onChange, placeholder, unit, maxLength, isDecimal }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; unit: string; maxLength: number; isDecimal?: boolean;
}) {
  return (
    <View style={si.wrap}>
      <Text style={si.label}>{label}</Text>
      <View style={si.inputWrap}>
        <TextInput
          style={si.input}
          value={value}
          onChangeText={v => onChange(isDecimal ? v.replace(/[^0-9.]/g, '') : v.replace(/[^0-9]/g, ''))}
          placeholder={placeholder}
          placeholderTextColor={colors.text.muted}
          keyboardType={isDecimal ? 'decimal-pad' : 'number-pad'}
          maxLength={maxLength}
          textAlign="center"
        />
        <Text style={si.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const si = StyleSheet.create({
  wrap:      { flex: 1, gap: spacing.xs },
  label:     { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.text.muted, textTransform: 'uppercase' },
  inputWrap: { backgroundColor: colors.bg.input, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', gap: 4 },
  input:     { fontSize: 28, fontWeight: '700', color: colors.text.primary, minWidth: 60, textAlign: 'center' },
  unit:      { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, color: colors.text.muted, textTransform: 'uppercase' },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function QuestionnaireScreen() {
  const { completeOnboarding } = useAuthStore();
  const [step,   setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [form, setForm] = useState<FormState>({
    goal: null, experience: null, age: '',
    heightFt: '', heightIn: '', weightLbs: '',
    location: null, equipment: [], daysPerWeek: null,
    muscleFocus: [], injuries: '',
  });

  // Step 5 (equipment) is skipped for gym users
  function resolveNext(from: number): number {
    const next = from + 1;
    return next === 5 && form.location === 'gym' ? 6 : next;
  }
  function resolvePrev(from: number): number {
    const prev = from - 1;
    return prev === 5 && form.location === 'gym' ? 4 : prev;
  }

  function transition(next: number) {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: next > step ? -20 : 20, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(next > step ? 20 : -20);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  }

  function toggleEquipment(v: Equipment) {
    setForm(f => ({ ...f, equipment: f.equipment.includes(v) ? f.equipment.filter(e => e !== v) : [...f.equipment, v] }));
  }
  function toggleMuscle(v: MuscleGroup) {
    setForm(f => ({ ...f, muscleFocus: f.muscleFocus.includes(v) ? f.muscleFocus.filter(m => m !== v) : [...f.muscleFocus, v] }));
  }

  function canAdvance() {
    switch (step) {
      case 0: return !!form.goal;
      case 1: return !!form.experience;
      case 2: return !!form.age && parseInt(form.age) >= 13;
      case 3: return !!form.heightFt && !!form.weightLbs;
      case 4: return !!form.location;
      case 5: return form.equipment.length > 0;
      case 6: return !!form.daysPerWeek;
      default: return true;
    }
  }

  async function finish() {
    setSaving(true);
    try {
      const totalInches = parseInt(form.heightFt || '5') * 12 + parseInt(form.heightIn || '0');
      await completeOnboarding({
        age:         parseInt(form.age) || 25,
        height:      totalInches || 70,
        weight:      parseFloat(form.weightLbs) || 150,
        goal:        form.goal!,
        experience:  form.experience!,
        daysPerWeek: form.daysPerWeek ?? 3,
        location:    form.location!,
        equipment:   form.location === 'gym'
          ? ['barbell', 'dumbbells', 'cables', 'machines', 'kettlebell', 'bodyweight', 'pull_up_bar']
          : form.equipment,
        muscleFocus: form.muscleFocus,
        injuries:    form.injuries ? [form.injuries] : [],
      });
    } catch {
      setSaving(false);
    }
  }

  const isLast     = step === TOTAL_STEPS - 1;
  const isOptional = step === 7 || step === 8;

  const effectiveStep  = step > 5 && form.location === 'gym' ? step - 1 : step;
  const totalEffective = form.location === 'gym' ? TOTAL_STEPS - 1 : TOTAL_STEPS;
  const progress       = (effectiveStep + 1) / totalEffective;

  const STEP_TITLES = [
    'What\'s your goal?',
    'Your experience level',
    'How old are you?',
    'Your starting stats',
    'Where do you train?',
    'Your equipment',
    'Training frequency',
    'Muscle priorities',
    'Any limitations?',
  ];

  const STEP_SUBTITLES: Record<number, string | undefined> = {
    2: 'We calibrate recovery and training intensity by age.',
    3: 'Used to personalise your program and track progress.',
    5: 'Select everything available at your home gym.',
    7: 'Optional — we\'ll build a balanced program regardless.',
    8: 'Optional — we\'ll exclude exercises that may aggravate these.',
  };

  function renderStep() {
    switch (step) {
      case 0:
        return GOAL_OPTIONS.map(o => (
          <SelectCard
            key={o.value}
            icon={o.icon}
            label={o.label}
            sub={o.sub}
            selected={form.goal === o.value}
            onPress={() => setForm(f => ({ ...f, goal: o.value }))}
          />
        ));

      case 1:
        return EXP_OPTIONS.map(o => (
          <SelectCard
            key={o.value}
            icon={o.icon}
            label={o.label}
            sub={o.sub}
            selected={form.experience === o.value}
            onPress={() => setForm(f => ({ ...f, experience: o.value }))}
          />
        ));

      case 2:
        return (
          <View style={styles.ageWrap}>
            <TextInput
              style={styles.ageInput}
              value={form.age}
              onChangeText={v => setForm(f => ({ ...f, age: v.replace(/[^0-9]/g, '') }))}
              placeholder="25"
              placeholderTextColor={colors.text.muted}
              keyboardType="number-pad"
              maxLength={3}
              textAlign="center"
            />
            <Text style={styles.ageUnit}>years old</Text>
          </View>
        );

      case 3:
        return (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatInput
                label="Height (ft)"
                value={form.heightFt}
                onChange={v => setForm(f => ({ ...f, heightFt: v }))}
                placeholder="5"
                unit="ft"
                maxLength={1}
              />
              <StatInput
                label="Height (in)"
                value={form.heightIn}
                onChange={v => {
                  const n = parseInt(v.replace(/[^0-9]/g, ''));
                  setForm(f => ({ ...f, heightIn: !isNaN(n) && n > 11 ? '11' : v.replace(/[^0-9]/g, '') }));
                }}
                placeholder="10"
                unit="in"
                maxLength={2}
              />
              <StatInput
                label="Weight"
                value={form.weightLbs}
                onChange={v => setForm(f => ({ ...f, weightLbs: v }))}
                placeholder="185"
                unit="lbs"
                maxLength={3}
                isDecimal
              />
            </View>
          </View>
        );

      case 4:
        return LOC_OPTIONS.map(o => (
          <SelectCard
            key={o.value}
            icon={o.icon}
            label={o.label}
            sub={o.sub}
            selected={form.location === o.value}
            onPress={() => setForm(f => ({ ...f, location: o.value }))}
          />
        ));

      case 5:
        return (
          <View style={styles.chipGrid}>
            {EQUIPMENT_OPTIONS.map(o => (
              <EquipmentChip
                key={o.value}
                icon={o.icon}
                label={o.label}
                selected={form.equipment.includes(o.value)}
                onPress={() => toggleEquipment(o.value)}
              />
            ))}
          </View>
        );

      case 6:
        return (
          <>
            <View style={styles.daysRow}>
              {DAYS_OPTIONS.map(d => (
                <DayBubble
                  key={d.value}
                  value={d.value}
                  sub={d.sub}
                  selected={form.daysPerWeek === d.value}
                  onPress={() => setForm(f => ({ ...f, daysPerWeek: d.value }))}
                />
              ))}
            </View>
            {form.daysPerWeek && (
              <View style={styles.daysHint}>
                <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
                <Text style={styles.daysHintText}>
                  {form.daysPerWeek <= 3
                    ? 'Full body sessions — maximum recovery between workouts'
                    : form.daysPerWeek === 4
                    ? 'Upper / lower split — great balance of frequency and volume'
                    : 'Push / pull / legs split — high frequency, structured volume'
                  }
                </Text>
              </View>
            )}
          </>
        );

      case 7:
        return (
          <View style={styles.muscleGrid}>
            {MUSCLE_OPTIONS.map(o => (
              <MuscleChip
                key={o.value}
                label={o.label}
                selected={form.muscleFocus.includes(o.value)}
                onPress={() => toggleMuscle(o.value)}
              />
            ))}
          </View>
        );

      case 8:
        return (
          <TextInput
            style={styles.textArea}
            value={form.injuries}
            onChangeText={v => setForm(f => ({ ...f, injuries: v }))}
            placeholder="e.g. lower back pain, shoulder impingement, knee issues…"
            placeholderTextColor={colors.text.muted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        );

      default:
        return null;
    }
  }

  const dots = Array.from({ length: totalEffective }, (_, i) => i);

  return (
    <SafeAreaView style={styles.container}>

      {/* Top nav */}
      <View style={styles.topNav}>
        {step > 0 ? (
          <TouchableOpacity onPress={() => transition(resolvePrev(step))} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        {/* Dot progress */}
        <View style={styles.dots}>
          {dots.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < effectiveStep && styles.dotDone,
                i === effectiveStep && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Step label */}
            <Text style={styles.stepLabel}>STEP {effectiveStep + 1} OF {totalEffective}</Text>

            {/* Question */}
            <Text style={styles.question}>{STEP_TITLES[step]}</Text>
            {STEP_SUBTITLES[step] && (
              <Text style={styles.subtitle}>{STEP_SUBTITLES[step]}</Text>
            )}

            <View style={styles.stepContent}>
              {renderStep()}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {isOptional && (
            <TouchableOpacity
              onPress={isLast ? finish : () => transition(resolveNext(step))}
              style={styles.skipBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip this step</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.cta, (!canAdvance() || saving) && styles.ctaDisabled]}
            onPress={isLast ? finish : () => { if (canAdvance()) transition(resolveNext(step)); }}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.ctaText}>{isLast ? 'Start Training' : 'Continue'}</Text>
                {!isLast && <Ionicons name="arrow-forward" size={18} color="#fff" />}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg.primary },
  flex:        { flex: 1 },

  topNav:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },

  dots:      { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.bg.elevated },
  dotDone:   { backgroundColor: `${colors.accent.primary}60` },
  dotActive: { width: 18, height: 6, borderRadius: 3, backgroundColor: colors.accent.primary },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },

  stepLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: colors.text.muted, marginBottom: spacing.sm, textTransform: 'uppercase' },
  question:  { fontSize: 28, fontWeight: '800', color: colors.text.primary, lineHeight: 36, letterSpacing: -0.5, marginBottom: spacing.sm },
  subtitle:  { fontSize: 14, color: colors.text.muted, lineHeight: 20, marginBottom: spacing.lg },

  stepContent: { marginTop: spacing.lg },

  // Age
  ageWrap:  { alignItems: 'center', paddingTop: spacing.xl },
  ageInput: { fontSize: 80, fontWeight: '800', color: colors.text.primary, textAlign: 'center', letterSpacing: -2 },
  ageUnit:  { fontSize: 16, fontWeight: '600', color: colors.text.muted, marginTop: spacing.sm },

  // Stats
  statsCard: { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  statsRow:  { flexDirection: 'row', gap: spacing.sm },

  // Days
  daysRow:      { flexDirection: 'row', gap: 4, marginTop: spacing.md },
  daysHint:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.lg, backgroundColor: colors.bg.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  daysHintText: { flex: 1, fontSize: 13, color: colors.text.muted, lineHeight: 18 },

  // Equipment
  chipGrid:  { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },

  // Muscle
  muscleGrid:{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },

  // Injuries
  textArea: { backgroundColor: colors.bg.input, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, color: colors.text.primary, fontSize: 15, minHeight: 140, lineHeight: 22 },

  footer:   { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.xs, gap: spacing.xs },
  skipBtn:  { alignItems: 'center', paddingVertical: spacing.sm },
  skipText: { fontSize: 14, color: colors.text.muted, fontWeight: '600' },
  cta:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.md, height: 58 },
  ctaDisabled: { opacity: 0.35 },
  ctaText:     { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
});
