import { useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore } from '../src/store/userStore';
import { colors, spacing, radius, typography } from '../src/theme';
import type { Goal, ExperienceLevel, Location, Equipment, MuscleGroup } from '../src/types';

// ── Constants ──────────────────────────────────────────────────────────────────

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'barbell',          label: 'Barbell' },
  { value: 'dumbbells',        label: 'Dumbbells' },
  { value: 'cables',           label: 'Cables' },
  { value: 'machines',         label: 'Machines' },
  { value: 'kettlebell',       label: 'Kettlebell' },
  { value: 'bodyweight',       label: 'Bodyweight' },
  { value: 'resistance_bands', label: 'Resistance Bands' },
  { value: 'pull_up_bar',      label: 'Pull-up Bar' },
];

const MUSCLE_OPTIONS: { value: MuscleGroup; label: string }[] = [
  { value: 'chest',      label: 'Chest' },
  { value: 'back',       label: 'Back' },
  { value: 'shoulders',  label: 'Shoulders' },
  { value: 'biceps',     label: 'Biceps' },
  { value: 'triceps',    label: 'Triceps' },
  { value: 'core',       label: 'Core' },
  { value: 'quads',      label: 'Quads' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes',     label: 'Glutes' },
  { value: 'calves',     label: 'Calves' },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sec.wrap}>
      <Text style={sec.title}>{title}</Text>
      {children}
    </View>
  );
}
const sec = StyleSheet.create({
  wrap:  { gap: spacing.sm },
  title: { ...typography.label, color: colors.text.muted, marginBottom: spacing.xs },
});

function OptionCard({ label, sub, selected, onPress }: {
  label: string; sub?: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[oc.card, selected && oc.selected]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[oc.label, selected && oc.labelSelected]}>{label}</Text>
      {sub ? <Text style={oc.sub}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}
const oc = StyleSheet.create({
  card:          { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.bg.card },
  selected:      { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}1A` },
  label:         { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  labelSelected: { color: colors.accent.primary },
  sub:           { ...typography.bodySmall, marginTop: 2 },
});

function PillRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>{children}</View>;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[chip.wrap, selected && chip.selected]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[chip.text, selected && chip.textSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}
const chip = StyleSheet.create({
  wrap:         { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, margin: 4, backgroundColor: colors.bg.card },
  selected:     { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}1A` },
  text:         { fontSize: 13, fontWeight: '500', color: colors.text.secondary },
  textSelected: { color: colors.accent.primary, fontWeight: '600' },
});

function FieldInput({ label, value, onChangeText, placeholder, keyboardType, maxLength }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; maxLength?: number;
}) {
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        style={fi.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        keyboardType={keyboardType ?? 'default'}
        maxLength={maxLength}
      />
    </View>
  );
}
const fi = StyleSheet.create({
  wrap:  { gap: spacing.xs },
  label: { ...typography.label, color: colors.text.secondary },
  input: { backgroundColor: colors.bg.input, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, color: colors.text.primary, fontSize: 16 },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router    = useRouter();
  const { user }  = useAuthStore();
  const { data }  = useUserStore();
  const p         = data?.profile;

  function inchesToFt(inches: number) { return String(Math.floor(inches / 12)); }
  function inchesToIn(inches: number) { return String(inches % 12); }

  const [goal,        setGoal]        = useState<Goal>(p?.goal ?? 'bulk');
  const [experience,  setExperience]  = useState<ExperienceLevel>(p?.experience ?? 'beginner');
  const [daysPerWeek, setDaysPerWeek] = useState<2|3|4|5|6>(p?.daysPerWeek ?? 3);
  const [location,    setLocation]    = useState<Location>(p?.location ?? 'gym');
  const [equipment,   setEquipment]   = useState<Equipment[]>(p?.equipment ?? []);
  const [muscleFocus, setMuscleFocus] = useState<MuscleGroup[]>(p?.muscleFocus ?? []);
  const [age,         setAge]         = useState(p?.age ? String(p.age) : '');
  const [heightFt,    setHeightFt]    = useState(p?.height ? inchesToFt(p.height) : '');
  const [heightIn,    setHeightIn]    = useState(p?.height ? inchesToIn(p.height) : '');
  const [weight,      setWeight]      = useState(p?.weight ? String(p.weight) : '');
  const [injuries,    setInjuries]    = useState(p?.injuries?.join(', ') ?? '');
  const [workoutMode, setWorkoutMode] = useState<'timer' | 'quick'>(data?.settings?.workoutMode ?? 'timer');
  const [saving,      setSaving]      = useState(false);

  function toggleEquipment(v: Equipment) {
    setEquipment(prev => prev.includes(v) ? prev.filter(e => e !== v) : [...prev, v]);
  }
  function toggleMuscle(v: MuscleGroup) {
    setMuscleFocus(prev => prev.includes(v) ? prev.filter(m => m !== v) : [...prev, v]);
  }

  async function save() {
    if (!user?.uid) return;
    setSaving(true);
    const totalInches = parseInt(heightFt || '0') * 12 + parseInt(heightIn || '0');
    const updatedProfile = {
      goal,
      experience,
      daysPerWeek,
      location,
      equipment: location === 'gym'
        ? (['barbell','dumbbells','cables','machines','kettlebell','bodyweight','pull_up_bar'] as Equipment[])
        : equipment,
      muscleFocus,
      age:     parseInt(age)    || (p?.age ?? 25),
      height:  totalInches      || (p?.height ?? 70),
      weight:  parseFloat(weight) || (p?.weight ?? 150),
      injuries: injuries ? injuries.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
    try {
      await setDoc(doc(db, 'users', user.uid), { profile: updatedProfile }, { merge: true });
      await updateDoc(doc(db, 'users', user.uid), { 'settings.workoutMode': workoutMode });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save changes. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          <Text style={styles.backText}>Profile</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.8} style={styles.saveBtn}>
          {saving
            ? <ActivityIndicator size="small" color={colors.accent.primary} />
            : <Text style={styles.saveText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Goal */}
          <Section title="TRAINING GOAL">
            <OptionCard label="Build muscle"   sub="Lean bulk"           selected={goal === 'bulk'}     onPress={() => setGoal('bulk')}     />
            <OptionCard label="Lose fat"       sub="Cut, preserve strength" selected={goal === 'cut'}   onPress={() => setGoal('cut')}      />
            <OptionCard label="Build strength" sub="Lift heavier over time" selected={goal === 'strength'} onPress={() => setGoal('strength')} />
          </Section>

          {/* Experience */}
          <Section title="EXPERIENCE LEVEL">
            <OptionCard label="Beginner"     sub="< 6 months"        selected={experience === 'beginner'}     onPress={() => setExperience('beginner')}     />
            <OptionCard label="Intermediate" sub="6 months – 3 years" selected={experience === 'intermediate'} onPress={() => setExperience('intermediate')} />
            <OptionCard label="Advanced"     sub="3+ years"          selected={experience === 'advanced'}     onPress={() => setExperience('advanced')}     />
          </Section>

          {/* Schedule */}
          <Section title="TRAINING SCHEDULE">
            <Text style={styles.subLabel}>Days per week</Text>
            <PillRow>
              {([2,3,4,5,6] as const).map(d => (
                <Chip key={d} label={`${d}`} selected={daysPerWeek === d} onPress={() => setDaysPerWeek(d)} />
              ))}
            </PillRow>
            <Text style={[styles.subLabel, { marginTop: spacing.sm }]}>Training location</Text>
            <View style={styles.twoCol}>
              <OptionCard label="Gym"  sub="Full equipment" selected={location === 'gym'}  onPress={() => setLocation('gym')}  />
              <OptionCard label="Home" sub="Home gym"       selected={location === 'home'} onPress={() => setLocation('home')} />
            </View>
          </Section>

          {/* Equipment — home gym only */}
          {location === 'home' && (
            <Section title="EQUIPMENT">
              <PillRow>
                {EQUIPMENT_OPTIONS.map(o => (
                  <Chip key={o.value} label={o.label} selected={equipment.includes(o.value)} onPress={() => toggleEquipment(o.value)} />
                ))}
              </PillRow>
            </Section>
          )}

          {/* Muscle focus */}
          <Section title="MUSCLE FOCUS (OPTIONAL)">
            <PillRow>
              {MUSCLE_OPTIONS.map(o => (
                <Chip key={o.value} label={o.label} selected={muscleFocus.includes(o.value)} onPress={() => toggleMuscle(o.value)} />
              ))}
            </PillRow>
          </Section>

          {/* Body stats */}
          <Section title="BODY STATS">
            <FieldInput label="AGE" value={age} onChangeText={v => setAge(v.replace(/[^0-9]/g, ''))} placeholder="25" keyboardType="number-pad" maxLength={2} />
            <Text style={styles.subLabel}>HEIGHT</Text>
            <View style={styles.heightRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={fi.input}
                  value={heightFt}
                  onChangeText={v => setHeightFt(v.replace(/[^0-9]/g, ''))}
                  placeholder="5"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <Text style={styles.unitLabel}>ft</Text>
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={fi.input}
                  value={heightIn}
                  onChangeText={v => {
                  const d = v.replace(/[^0-9]/g, '');
                  const n = parseInt(d);
                  setHeightIn(!isNaN(n) && n > 11 ? '11' : d);
                }}
                  placeholder="10"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.unitLabel}>in</Text>
              </View>
            </View>
            <FieldInput label="WEIGHT (LBS)" value={weight} onChangeText={v => setWeight(v.replace(/[^0-9.]/g, ''))} placeholder="185" keyboardType="numeric" maxLength={3} />
          </Section>

          {/* Workout logging mode */}
          <Section title="WORKOUT LOGGING">
            <Text style={styles.subLabel}>How do you want to log sets?</Text>
            <OptionCard
              label="Rest Timer"
              sub="Log one set at a time with an automatic rest countdown"
              selected={workoutMode === 'timer'}
              onPress={() => setWorkoutMode('timer')}
            />
            <OptionCard
              label="Quick Log"
              sub="See all your sets at once and fill them in fast"
              selected={workoutMode === 'quick'}
              onPress={() => setWorkoutMode('quick')}
            />
          </Section>

          {/* Injuries */}
          <Section title="INJURIES / LIMITATIONS (OPTIONAL)">
            <TextInput
              style={styles.textArea}
              value={injuries}
              onChangeText={setInjuries}
              placeholder="e.g. lower back pain, shoulder impingement…"
              placeholderTextColor={colors.text.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Section>

          {/* Save button at bottom */}
          <TouchableOpacity style={[styles.saveCta, saving && styles.saveCtaDisabled]} onPress={save} disabled={saving} activeOpacity={0.8}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveCtaText}>Save Changes</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 70 },
  backText: { ...typography.body, color: colors.text.primary },
  title:    { ...typography.h4 },
  saveBtn:  { minWidth: 70, alignItems: 'flex-end' },
  saveText: { ...typography.body, color: colors.accent.primary, fontWeight: '700' },

  scroll:   { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },

  subLabel:  { ...typography.label, color: colors.text.secondary, marginBottom: spacing.xs },
  unitLabel: { ...typography.caption, color: colors.text.muted, textAlign: 'center', marginTop: 3 },
  twoCol:    { gap: spacing.sm },
  heightRow: { flexDirection: 'row', gap: spacing.md },

  textArea: { backgroundColor: colors.bg.input, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text.primary, fontSize: 16, minHeight: 100 },

  saveCta:         { backgroundColor: colors.accent.primary, borderRadius: radius.md, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  saveCtaDisabled: { opacity: 0.4 },
  saveCtaText:     { color: '#fff', fontSize: 17, fontWeight: '700' },
});
