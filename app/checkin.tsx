import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  doc, setDoc, getDoc, updateDoc, arrayUnion, Timestamp,
} from 'firebase/firestore';
import { storage, db } from '../src/firebase/config';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore } from '../src/store/userStore';
import { getISOWeek, getMondayOfWeek } from '../src/utils/dateUtils';
import { colors, spacing, radius, typography, shadows } from '../src/theme';

const MOODS = ['😴', '😕', '😐', '😊', '💪'] as const;
const MOOD_LABELS = ['Exhausted', 'Low', 'Okay', 'Good', 'Crushing It'] as const;

const POSES = [
  'Front Double Bicep',
  'Back Double Bicep',
  'Side Chest',
  'Side Tricep',
  'Front Lat Spread',
  'Back Lat Spread',
  'Most Muscular',
  'Abdominal & Thigh',
] as const;

// ── Measurement field ──────────────────────────────────────────────────────────

function MeasurementRow({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={mr.row}>
      <Text style={mr.label}>{label}</Text>
      <View style={mr.inputWrap}>
        <TextInput
          style={mr.input}
          value={value}
          onChangeText={v => onChange(v.replace(/[^0-9.]/g, ''))}
          placeholder="—"
          placeholderTextColor={colors.text.muted}
          keyboardType="numeric"
          selectTextOnFocus
        />
        <Text style={mr.unit}>in</Text>
      </View>
    </View>
  );
}
const mr = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  label:     { fontSize: 14, color: colors.text.secondary },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg.elevated, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: colors.border, minWidth: 90 },
  input:     { width: 60, fontSize: 15, fontWeight: '700', color: colors.text.primary, textAlign: 'center' },
  unit:      { fontSize: 11, fontWeight: '600', color: colors.text.muted },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function CheckinScreen() {
  const router         = useRouter();
  const { user }       = useAuthStore();
  const { data }       = useUserStore();
  const { week, year } = getISOWeek(new Date());
  const docId          = `${year}-W${String(week).padStart(2, '0')}`;
  const weekStart      = getMondayOfWeek(new Date());

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [isEdit,    setIsEdit]    = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);

  // Form state
  const [weight,    setWeight]    = useState('');
  const [mood,      setMood]      = useState<1|2|3|4|5|null>(null);
  const [notes,     setNotes]     = useState('');
  // pose → { uri: local, url: uploaded }
  const [posePhotos, setPosePhotos] = useState<Record<string, { uri?: string; url?: string }>>({});
  const [measurements, setMeasurements] = useState({
    chest: '', waist: '', hips: '', leftArm: '', rightArm: '', leftThigh: '', rightThigh: '',
  });

  // Load existing check-in for this week (if any)
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'weeklyCheckins', user.uid, 'checkins', docId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setIsEdit(true);
        if (d.weight)  setWeight(String(d.weight));
        if (d.mood)    setMood(d.mood);
        if (d.notes)   setNotes(d.notes);
        if (d.photos?.length) {
          const map: Record<string, { url: string }> = {};
          (d.photos as any[]).forEach((p: any) => { if (p.pose && p.url) map[p.pose] = { url: p.url }; });
          setPosePhotos(map);
        }
        if (d.measurements) {
          const m = d.measurements;
          setMeasurements({
            chest:      m.chest      ? String(m.chest)      : '',
            waist:      m.waist      ? String(m.waist)      : '',
            hips:       m.hips       ? String(m.hips)       : '',
            leftArm:    m.leftArm    ? String(m.leftArm)    : '',
            rightArm:   m.rightArm   ? String(m.rightArm)   : '',
            leftThigh:  m.leftThigh  ? String(m.leftThigh)  : '',
            rightThigh: m.rightThigh ? String(m.rightThigh) : '',
          });
        }
        setShowMeasurements(Object.values(d.measurements ?? {}).some(Boolean));
      }
    }).finally(() => setLoading(false));
  }, [user?.uid]);

  // Auto-fill weight from profile/stats if empty
  useEffect(() => {
    if (!weight && data?.stats?.currentWeight) {
      setWeight(String(data.stats.currentWeight));
    }
  }, [data]);

  async function pickPosePhoto(poseName: string) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any, allowsEditing: true, aspect: [3, 4], quality: 0.85,
    });
    if (!result.canceled) setPosePhotos(p => ({ ...p, [poseName]: { ...p[poseName], uri: result.assets[0].uri } }));
  }

  async function takePosePhoto(poseName: string) {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Allow camera access.'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.85 });
      if (!result.canceled) setPosePhotos(p => ({ ...p, [poseName]: { ...p[poseName], uri: result.assets[0].uri } }));
    } catch {
      Alert.alert('Camera unavailable', 'Use Gallery instead.');
    }
  }

  function removePosePhoto(poseName: string) {
    setPosePhotos(p => { const next = { ...p }; delete next[poseName]; return next; });
  }

  async function save() {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const now = Timestamp.now();

      // Upload any new local photos
      const photoEntries: any[] = [];
      let isFirst = true;
      for (const [poseName, photo] of Object.entries(posePhotos)) {
        let finalUrl = photo.url;
        if (photo.uri && !photo.uri.startsWith('http')) {
          const safeName = poseName.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase();
          const path = `checkins/${user.uid}/${docId}/${safeName}.jpg`;
          const resp = await fetch(photo.uri);
          const blob = await resp.blob();
          await uploadBytes(ref(storage, path), blob, { contentType: 'image/jpeg' });
          finalUrl = await getDownloadURL(ref(storage, path));
        }
        if (finalUrl) {
          const safeName = poseName.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase();
          photoEntries.push({ url: finalUrl, storagePath: `checkins/${user.uid}/${docId}/${safeName}.jpg`, takenAt: now, note: '', isMain: isFirst, pose: poseName });
          isFirst = false;
        }
      }

      const parsedWeight = parseFloat(weight) || null;
      const m            = measurements;

      await setDoc(
        doc(db, 'weeklyCheckins', user.uid, 'checkins', docId),
        {
          checkinId:  docId,
          uid:        user.uid,
          weekNumber: week,
          year,
          weekStart:  Timestamp.fromDate(weekStart),
          ...(!isEdit && { createdAt: now }),
          updatedAt:  now,
          weight:     parsedWeight,
          notes:      notes.trim(),
          mood:       mood ?? null,
          ...(photoEntries.length > 0 ? { photos: photoEntries } : (!isEdit ? { photos: [] } : {})),
          measurements: {
            chest:      parseFloat(m.chest)      || null,
            waist:      parseFloat(m.waist)      || null,
            hips:       parseFloat(m.hips)       || null,
            leftArm:    parseFloat(m.leftArm)    || null,
            rightArm:   parseFloat(m.rightArm)   || null,
            leftThigh:  parseFloat(m.leftThigh)  || null,
            rightThigh: parseFloat(m.rightThigh) || null,
          },
        },
        { merge: true },
      );

      // Update weight — skip duplicate entry if same weight already logged today
      if (parsedWeight) {
        try {
          const alreadyToday = data?.stats?.weightHistory?.some((entry: any) => {
            try {
              const d = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
              return d.toDateString() === new Date().toDateString() && entry.weight === parsedWeight;
            } catch { return false; }
          });
          if (alreadyToday) {
            await updateDoc(doc(db, 'users', user.uid), { 'stats.currentWeight': parsedWeight });
          } else {
            await updateDoc(doc(db, 'users', user.uid), {
              'stats.currentWeight': parsedWeight,
              'stats.weightHistory': arrayUnion({ date: now, weight: parsedWeight }),
            });
          }
        } catch {}
      }

      router.back();
    } catch (e) {
      console.error('checkin save error:', e);
      Alert.alert('Error', 'Could not save check-in. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) +
    ' – ' +
    weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><ActivityIndicator color={colors.accent.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{isEdit ? 'Edit Check-in' : 'Weekly Check-in'}</Text>
          <Text style={s.headerSub}>Week {week} · {weekLabel}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Weight ───────────────────────────────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>BODYWEIGHT</Text>
            <View style={s.card}>
              <View style={s.weightRow}>
                <TouchableOpacity style={s.adjBtn} onPress={() => setWeight(v => String(Math.max(0, (parseFloat(v) || 0) - 1)))} activeOpacity={0.7}>
                  <Ionicons name="remove" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
                <View style={s.weightInputWrap}>
                  <TextInput
                    style={s.weightInput}
                    value={weight}
                    onChangeText={v => setWeight(v.replace(/[^0-9.]/g, ''))}
                    placeholder="185"
                    placeholderTextColor={colors.text.muted}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <Text style={s.weightUnit}>lbs</Text>
                </View>
                <TouchableOpacity style={s.adjBtn} onPress={() => setWeight(v => String((parseFloat(v) || 0) + 1))} activeOpacity={0.7}>
                  <Ionicons name="add" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
              {data?.stats?.currentWeight ? (
                <Text style={s.weightHint}>Last logged: {data.stats.currentWeight} lbs</Text>
              ) : null}
            </View>
          </View>

          {/* ── Mood ─────────────────────────────────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>HOW ARE YOU FEELING?</Text>
            <View style={s.card}>
              <View style={s.moodRow}>
                {MOOD_LABELS.map((label, i) => {
                  const val    = (i + 1) as 1|2|3|4|5;
                  const active = mood === val;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[s.moodBtn, active && s.moodBtnActive]}
                      onPress={() => setMood(val)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.moodBar, active && s.moodBarActive]} />
                      <Text style={[s.moodLabel, active && s.moodLabelActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Notes ────────────────────────────────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>NOTES</Text>
            <View style={s.card}>
              <TextInput
                style={s.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="How did the week go? Any PRs, soreness, wins…"
                placeholderTextColor={colors.text.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── Progress Photos (per pose) ────────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>PROGRESS PHOTOS</Text>
            <Text style={s.photoHint}>Optional — take a photo for any pose you want to track</Text>
            {(POSES as unknown as string[]).map(poseName => {
              const photo = posePhotos[poseName];
              const src   = photo?.uri ?? photo?.url;
              return (
                <View key={poseName} style={s.poseCard}>
                  <View style={s.poseCardHeader}>
                    <Text style={s.poseCardName}>{poseName}</Text>
                    {src && (
                      <TouchableOpacity onPress={() => removePosePhoto(poseName)} activeOpacity={0.7}>
                        <Ionicons name="close-circle" size={20} color={colors.accent.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {src ? (
                    <Image source={{ uri: src }} style={s.poseThumb} resizeMode="cover" />
                  ) : (
                    <View style={s.poseActions}>
                      <TouchableOpacity style={s.poseActionBtn} onPress={() => takePosePhoto(poseName)} activeOpacity={0.8}>
                        <Ionicons name="camera-outline" size={18} color={colors.accent.primary} />
                        <Text style={s.poseActionText}>Camera</Text>
                      </TouchableOpacity>
                      <View style={s.poseDivider} />
                      <TouchableOpacity style={s.poseActionBtn} onPress={() => pickPosePhoto(poseName)} activeOpacity={0.8}>
                        <Ionicons name="image-outline" size={18} color={colors.accent.primary} />
                        <Text style={s.poseActionText}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* ── Measurements ─────────────────────────────────────────────── */}
          <View style={s.section}>
            <TouchableOpacity
              style={s.measurementsHeader}
              onPress={() => setShowMeasurements(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={s.sectionLabel}>BODY MEASUREMENTS</Text>
              <Ionicons
                name={showMeasurements ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.text.muted}
              />
            </TouchableOpacity>
            {showMeasurements && (
              <View style={s.card}>
                <Text style={s.measurementNote}>All measurements in inches</Text>
                <MeasurementRow label="Chest"        value={measurements.chest}      onChange={v => setMeasurements(m => ({ ...m, chest: v }))} />
                <MeasurementRow label="Waist"        value={measurements.waist}      onChange={v => setMeasurements(m => ({ ...m, waist: v }))} />
                <MeasurementRow label="Hips"         value={measurements.hips}       onChange={v => setMeasurements(m => ({ ...m, hips: v }))} />
                <MeasurementRow label="Left Arm"     value={measurements.leftArm}    onChange={v => setMeasurements(m => ({ ...m, leftArm: v }))} />
                <MeasurementRow label="Right Arm"    value={measurements.rightArm}   onChange={v => setMeasurements(m => ({ ...m, rightArm: v }))} />
                <MeasurementRow label="Left Thigh"   value={measurements.leftThigh}  onChange={v => setMeasurements(m => ({ ...m, leftThigh: v }))} />
                <MeasurementRow label="Right Thigh"  value={measurements.rightThigh} onChange={v => setMeasurements(m => ({ ...m, rightThigh: v }))} />
              </View>
            )}
          </View>

          {/* ── Save ─────────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={save}
            activeOpacity={0.9}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={isEdit ? 'checkmark-circle-outline' : 'camera-outline'} size={20} color="#fff" />
                <Text style={s.saveBtnText}>{isEdit ? 'Update Check-in' : 'Save Check-in'}</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', gap: 2, flex: 1 },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  headerSub:    { fontSize: 11, color: colors.text.muted, textAlign: 'center' },

  scroll:      { padding: spacing.md, gap: spacing.md, paddingBottom: 60 },

  section:      { gap: spacing.xs },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: colors.text.muted, paddingHorizontal: 2 },

  card: { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },

  // Weight
  weightRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  adjBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  weightInputWrap:{ alignItems: 'center' },
  weightInput:    { fontSize: 52, fontWeight: '800', color: colors.text.primary, textAlign: 'center', minWidth: 110, letterSpacing: -2 },
  weightUnit:     { fontSize: 13, fontWeight: '600', color: colors.text.muted, marginTop: -8 },
  weightHint:     { fontSize: 12, color: colors.text.muted, textAlign: 'center', marginTop: spacing.sm },

  // Mood
  moodRow:       { flexDirection: 'row', gap: spacing.xs },
  moodBtn:       { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, gap: 6, borderWidth: 1, borderColor: 'transparent' },
  moodBtnActive: { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}10` },
  moodBar:       { width: '60%', height: 3, borderRadius: 2, backgroundColor: colors.bg.elevated },
  moodBarActive: { backgroundColor: colors.accent.primary },
  moodLabel:     { fontSize: 8, fontWeight: '700', color: colors.text.muted, letterSpacing: 0.3, textAlign: 'center' },
  moodLabelActive:{ color: colors.accent.primary },

  // Notes
  notesInput: { fontSize: 15, color: colors.text.primary, lineHeight: 22, minHeight: 90 },

  // Photo hint
  photoHint: { fontSize: 11, color: colors.text.muted, marginBottom: spacing.xs },

  // Per-pose cards
  poseCard:       { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.sm },
  poseCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  poseCardName:   { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  poseThumb:      { width: '100%', height: 200, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  poseActions:    { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  poseActionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  poseActionText: { fontSize: 13, fontWeight: '600', color: colors.accent.primary },
  poseDivider:    { width: 1, height: 36, backgroundColor: colors.border },

  // Measurements
  measurementsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  measurementNote:    { fontSize: 11, color: colors.text.muted, marginBottom: spacing.xs },

  // Save
  saveBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.lg, height: 58, marginTop: spacing.sm, ...shadows.elevated },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:     { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
});
