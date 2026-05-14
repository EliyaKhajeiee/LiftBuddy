import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { useAuthStore } from '../src/store/authStore';
import { colors, spacing, radius, typography, shadows } from '../src/theme';

const { width: W } = Dimensions.get('window');

interface PhotoEntry { url: string; pose?: string; }
interface CheckinItem {
  checkinId:  string;
  weekNumber: number;
  year:       number;
  weekStart:  { toDate: () => Date } | null;
  photos:     PhotoEntry[];
  weight:     number | null;
}

interface Selection { checkin: CheckinItem; photo: PhotoEntry; }

function dateLabel(c: CheckinItem) {
  const d = c.weekStart?.toDate?.();
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

// ── Slot picker: pick a week then a pose from that week ──────────────────────
function SlotPicker({
  label, selection, checkins, otherCheckin, onSelect,
}: {
  label:        string;
  selection:    Selection | null;
  checkins:     CheckinItem[];
  otherCheckin: CheckinItem | null;
  onSelect:     (s: Selection) => void;
}) {
  const [pickedWeek, setPickedWeek] = useState<CheckinItem | null>(selection?.checkin ?? null);

  useEffect(() => { if (!selection) setPickedWeek(null); }, [selection]);

  const weeks = checkins.filter(c => c.checkinId !== otherCheckin?.checkinId);

  return (
    <View style={sp.container}>
      <Text style={sp.slotLabel}>{label}</Text>

      {/* Preview of selected photo */}
      {selection ? (
        <View style={sp.preview}>
          <Image source={{ uri: selection.photo.url }} style={sp.previewImg} resizeMode="cover" />
          <Text style={sp.previewWeek}>Week {selection.checkin.weekNumber}</Text>
          <Text style={sp.previewDate}>{dateLabel(selection.checkin)}</Text>
          {selection.photo.pose && <Text style={sp.previewPose}>{selection.photo.pose}</Text>}
        </View>
      ) : (
        <View style={sp.emptyPreview}>
          <Ionicons name="add" size={28} color={colors.text.muted} />
          <Text style={sp.emptyText}>Pick a week & pose</Text>
        </View>
      )}

      {/* Week list */}
      <Text style={sp.pickLabel}>WEEK</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sp.weekScroll} contentContainerStyle={sp.weekList}>
        {weeks.map(c => (
          <TouchableOpacity
            key={c.checkinId}
            style={[sp.weekChip, pickedWeek?.checkinId === c.checkinId && sp.weekChipActive]}
            onPress={() => setPickedWeek(c)}
            activeOpacity={0.7}
          >
            <Text style={[sp.weekChipText, pickedWeek?.checkinId === c.checkinId && sp.weekChipTextActive]}>
              Wk {c.weekNumber}
            </Text>
            <Text style={sp.weekChipDate}>{dateLabel(c).split(',')[0]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Poses from picked week */}
      {pickedWeek && (
        <>
          <Text style={sp.pickLabel}>POSE</Text>
          <View style={sp.poseGrid}>
            {pickedWeek.photos.map((photo, i) => (
              <TouchableOpacity
                key={i}
                style={[sp.poseTile, selection?.photo.url === photo.url && sp.poseTileActive]}
                onPress={() => onSelect({ checkin: pickedWeek, photo })}
                activeOpacity={0.8}
              >
                <Image source={{ uri: photo.url }} style={sp.poseTileImg} resizeMode="cover" />
                {photo.pose && (
                  <View style={sp.poseTileLabel}>
                    <Text style={sp.poseTileLabelText} numberOfLines={2}>{photo.pose}</Text>
                  </View>
                )}
                {selection?.photo.url === photo.url && (
                  <View style={sp.selectedBadge}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const TILE = (W - spacing.lg * 2 - spacing.sm * 3) / 3;
const sp = StyleSheet.create({
  container:    { flex: 1 },
  slotLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: colors.text.muted, marginBottom: spacing.sm },
  preview:      { alignItems: 'center', marginBottom: spacing.sm },
  previewImg:   { width: '100%', aspectRatio: 3/4, borderRadius: radius.lg, marginBottom: 4 },
  previewWeek:  { fontSize: 13, fontWeight: '800', color: colors.text.primary },
  previewDate:  { fontSize: 11, color: colors.text.muted },
  previewPose:  { fontSize: 11, fontWeight: '600', color: colors.accent.primary, marginTop: 2, textAlign: 'center' },
  emptyPreview: { width: '100%', aspectRatio: 3/4, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: spacing.sm, backgroundColor: colors.bg.card },
  emptyText:    { fontSize: 12, color: colors.text.muted, fontWeight: '600', textAlign: 'center' },
  pickLabel:    { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: colors.text.muted, marginBottom: 6 },
  weekScroll:   { marginBottom: spacing.sm },
  weekList:     { gap: spacing.xs, paddingBottom: 2 },
  weekChip:     { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  weekChipActive:{ backgroundColor: `${colors.accent.primary}15`, borderColor: colors.accent.primary },
  weekChipText: { fontSize: 12, fontWeight: '700', color: colors.text.secondary },
  weekChipTextActive:{ color: colors.accent.primary },
  weekChipDate: { fontSize: 10, color: colors.text.muted },
  poseGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  poseTile:     { width: TILE, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  poseTileActive:{ borderWidth: 2, borderColor: colors.accent.primary },
  poseTileImg:  { width: TILE, height: TILE * (4/3) },
  poseTileLabel:{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4 },
  poseTileLabelText:{ fontSize: 9, fontWeight: '700', color: '#fff', textAlign: 'center' },
  selectedBadge:{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent.primary, justifyContent: 'center', alignItems: 'center' },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CheckinCompareScreen() {
  const router      = useRouter();
  const { user }    = useAuthStore();
  const [checkins,  setCheckins]  = useState<CheckinItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selA,      setSelA]      = useState<Selection | null>(null);
  const [selB,      setSelB]      = useState<Selection | null>(null);
  const [comparing, setComparing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    const snap = await getDocs(
      query(collection(db, 'weeklyCheckins', user.uid, 'checkins'), orderBy('weekStart', 'desc'))
    );
    setCheckins(snap.docs.map(d => d.data() as CheckinItem).filter(c => c.photos?.length > 0));
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  // ── Comparison result ────────────────────────────────────────────────────────
  if (comparing && selA && selB) {
    const earlier = selA.checkin.weekNumber <= selB.checkin.weekNumber ? selA : selB;
    const later   = selA.checkin.weekNumber <= selB.checkin.weekNumber ? selB : selA;
    const photoW  = W / 2 - spacing.lg - spacing.xs / 2;
    const photoH  = photoW * (4 / 3);

    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setComparing(false)} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Side by Side</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.compareScroll} showsVerticalScrollIndicator={false}>
          {/* Week labels */}
          <View style={s.compareHeaders}>
            <View style={s.compareCol}>
              <Text style={s.compareWeek}>Week {earlier.checkin.weekNumber}</Text>
              <Text style={s.compareDate}>{dateLabel(earlier.checkin)}</Text>
              {earlier.photo.pose && <Text style={s.comparePose}>{earlier.photo.pose}</Text>}
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.accent.primary} />
            <View style={s.compareCol}>
              <Text style={s.compareWeek}>Week {later.checkin.weekNumber}</Text>
              <Text style={s.compareDate}>{dateLabel(later.checkin)}</Text>
              {later.photo.pose && <Text style={s.comparePose}>{later.photo.pose}</Text>}
            </View>
          </View>

          {/* Photos */}
          <View style={s.photoPair}>
            <Image source={{ uri: earlier.photo.url }} style={{ width: photoW, height: photoH, borderRadius: radius.lg }} resizeMode="cover" />
            <Image source={{ uri: later.photo.url   }} style={{ width: photoW, height: photoH, borderRadius: radius.lg }} resizeMode="cover" />
          </View>

          {/* Weight diff */}
          {earlier.checkin.weight && later.checkin.weight && (() => {
            const diff  = later.checkin.weight! - earlier.checkin.weight!;
            const sign  = diff > 0 ? '+' : '';
            const col   = diff < 0 ? colors.accent.success : diff > 0 ? colors.accent.danger : colors.text.muted;
            const wks   = Math.abs(later.checkin.weekNumber - earlier.checkin.weekNumber);
            return (
              <View style={s.diffCard}>
                <Text style={s.diffLabel}>WEIGHT CHANGE</Text>
                <Text style={[s.diffValue, { color: col }]}>{sign}{diff.toFixed(1)} lbs</Text>
                <Text style={s.diffSub}>over {wks} week{wks !== 1 ? 's' : ''}</Text>
              </View>
            );
          })()}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Picker view ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Compare Photos</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent.primary} size="large" /></View>
      ) : checkins.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="camera-outline" size={48} color={colors.text.muted} />
          <Text style={s.emptyTitle}>No photos yet</Text>
          <Text style={s.emptySub}>Add progress photos to your weekly check-ins to compare them.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.pickerScroll} showsVerticalScrollIndicator={false}>
          <View style={s.slots}>
            <SlotPicker label="BEFORE" selection={selA} checkins={checkins} otherCheckin={selB?.checkin ?? null} onSelect={setSelA} />
            <View style={s.slotDivider} />
            <SlotPicker label="AFTER"  selection={selB} checkins={checkins} otherCheckin={selA?.checkin ?? null} onSelect={setSelB} />
          </View>

          {selA && selB && (
            <TouchableOpacity style={s.compareBtn} onPress={() => setComparing(true)} activeOpacity={0.85}>
              <Ionicons name="git-compare-outline" size={18} color="#fff" />
              <Text style={s.compareBtnText}>Compare Side by Side</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg.primary },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },

  pickerScroll:{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  slots:       { flexDirection: 'row', gap: spacing.md },
  slotDivider: { width: 1, backgroundColor: colors.border },

  compareBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.lg, height: 54, ...shadows.elevated },
  compareBtnText:{ color: '#fff', fontSize: 16, fontWeight: '800' },

  compareScroll:  { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  compareHeaders: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareCol:     { flex: 1, alignItems: 'center', gap: 2 },
  compareWeek:    { fontSize: 15, fontWeight: '800', color: colors.text.primary },
  compareDate:    { fontSize: 12, color: colors.text.muted, textAlign: 'center' },
  comparePose:    { fontSize: 11, fontWeight: '700', color: colors.accent.primary, textAlign: 'center' },
  photoPair:      { flexDirection: 'row', gap: spacing.sm },

  diffCard:  { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card, alignItems: 'center', gap: 4 },
  diffLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.text.muted },
  diffValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  diffSub:   { fontSize: 12, color: colors.text.muted },

  emptyTitle:{ fontSize: 17, fontWeight: '700', color: colors.text.secondary },
  emptySub:  { fontSize: 14, color: colors.text.muted, textAlign: 'center', lineHeight: 20 },
});
