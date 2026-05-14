import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, Dimensions, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { useAuthStore } from '../src/store/authStore';
import { colors, spacing, radius, shadows } from '../src/theme';

const { width: W } = Dimensions.get('window');
const COLS   = 3;
const GAP    = 2;
const CELL_W = (W - GAP * (COLS + 1)) / COLS;

interface PhotoEntry { url: string; pose?: string; }
interface CheckinItem {
  checkinId:  string;
  weekNumber: number;
  year:       number;
  weekStart:  { toDate: () => Date } | null;
  photos:     PhotoEntry[];
  weight:     number | null;
}

interface SelPhoto { photo: PhotoEntry; checkin: CheckinItem; }

function weekLabel(c: CheckinItem) {
  const d = c.weekStart?.toDate?.();
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Wk ${c.weekNumber}`;
}

export default function CheckinCompareScreen() {
  const router   = useRouter();
  const { user } = useAuthStore();

  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [before,   setBefore]   = useState<SelPhoto | null>(null);
  const [after,    setAfter]    = useState<SelPhoto | null>(null);
  const [viewing,  setViewing]  = useState(false);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    const snap = await getDocs(
      query(collection(db, 'weeklyCheckins', user.uid, 'checkins'), orderBy('weekStart', 'desc'))
    );
    setCheckins(snap.docs.map(d => d.data() as CheckinItem).filter(c => c.photos?.length > 0));
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  // Build flat list of all photos across check-ins
  const allPhotos: { photo: PhotoEntry; checkin: CheckinItem }[] = [];
  for (const c of checkins) {
    for (const p of c.photos) allPhotos.push({ photo: p, checkin: c });
  }

  function handleSelect(item: { photo: PhotoEntry; checkin: CheckinItem }) {
    const isBefore = before?.photo.url === item.photo.url;
    const isAfter  = after?.photo.url  === item.photo.url;
    if (isBefore) { setBefore(null); return; }
    if (isAfter)  { setAfter(null);  return; }
    if (!before)  { setBefore(item); return; }
    if (!after)   { setAfter(item);  return; }
    // Both selected — replace the older selection
    setBefore(after);
    setAfter(item);
  }

  // ── Comparison view ─────────────────────────────────────────────────────────
  if (viewing && before && after) {
    const earlier = before.checkin.weekNumber <= after.checkin.weekNumber ? before : after;
    const later   = before.checkin.weekNumber <= after.checkin.weekNumber ? after  : before;
    const photoW  = W / 2 - spacing.lg - 2;
    const photoH  = photoW * (4 / 3);

    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setViewing(false)} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Side by Side</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.compareScroll} showsVerticalScrollIndicator={false}>
          <View style={s.compareLabels}>
            {[earlier, later].map((sel, i) => (
              <View key={i} style={s.compareCol}>
                <Text style={s.compareWeekNum}>Week {sel.checkin.weekNumber}</Text>
                <Text style={s.compareDate}>{weekLabel(sel.checkin)}</Text>
                {sel.photo.pose && <Text style={s.comparePose}>{sel.photo.pose}</Text>}
              </View>
            ))}
          </View>

          <View style={s.photoPair}>
            <Image source={{ uri: earlier.photo.url }} style={{ width: photoW, height: photoH, borderRadius: radius.lg }} resizeMode="cover" />
            <Image source={{ uri: later.photo.url   }} style={{ width: photoW, height: photoH, borderRadius: radius.lg }} resizeMode="cover" />
          </View>

          {earlier.checkin.weight && later.checkin.weight && (() => {
            const diff = later.checkin.weight! - earlier.checkin.weight!;
            const sign = diff > 0 ? '+' : '';
            const col  = diff < 0 ? colors.accent.success : diff > 0 ? colors.accent.danger : colors.text.muted;
            const wks  = Math.abs(later.checkin.weekNumber - earlier.checkin.weekNumber);
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

  // ── Gallery picker ──────────────────────────────────────────────────────────
  const hasBoth = before && after;

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
          <Text style={s.emptySub}>Add progress photos in your weekly check-ins.</Text>
        </View>
      ) : (
        <>
          {/* Instruction */}
          <View style={s.instrBar}>
            <Text style={s.instrText}>
              {!before && !after
                ? 'Tap a photo to select Before'
                : !after
                ? 'Now tap a photo to select After'
                : 'Tap any photo to change the selection'}
            </Text>
          </View>

          {/* Selected preview bar */}
          {(before || after) && (
            <View style={s.selBar}>
              {/* Before slot */}
              <View style={s.selSlot}>
                <Text style={s.selSlotLabel}>BEFORE</Text>
                {before ? (
                  <TouchableOpacity onPress={() => setBefore(null)} activeOpacity={0.85}>
                    <Image source={{ uri: before.photo.url }} style={s.selThumb} resizeMode="cover" />
                    <View style={s.selThumbBadge}>
                      <Text style={s.selThumbBadgeText}>Wk {before.checkin.weekNumber}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={s.selEmpty}>
                    <Ionicons name="add" size={20} color={colors.text.muted} />
                  </View>
                )}
              </View>

              <Ionicons name="arrow-forward" size={18} color={colors.text.muted} style={{ marginTop: 20 }} />

              {/* After slot */}
              <View style={s.selSlot}>
                <Text style={s.selSlotLabel}>AFTER</Text>
                {after ? (
                  <TouchableOpacity onPress={() => setAfter(null)} activeOpacity={0.85}>
                    <Image source={{ uri: after.photo.url }} style={s.selThumb} resizeMode="cover" />
                    <View style={s.selThumbBadge}>
                      <Text style={s.selThumbBadgeText}>Wk {after.checkin.weekNumber}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={s.selEmpty}>
                    <Ionicons name="add" size={20} color={colors.text.muted} />
                  </View>
                )}
              </View>

              {/* Compare button */}
              {hasBoth && (
                <TouchableOpacity style={s.compareBtn} onPress={() => setViewing(true)} activeOpacity={0.85}>
                  <Text style={s.compareBtnText}>Compare</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Photo grid grouped by week */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {checkins.map(c => (
              <View key={c.checkinId} style={s.weekGroup}>
                <Text style={s.weekGroupLabel}>
                  Week {c.weekNumber}  ·  {weekLabel(c)}
                </Text>
                <View style={s.photoRow}>
                  {c.photos.map((photo, j) => {
                    const isBefore = before?.photo.url === photo.url;
                    const isAfter  = after?.photo.url  === photo.url;
                    const isSelected = isBefore || isAfter;
                    return (
                      <TouchableOpacity
                        key={j}
                        style={[s.photoCell, isSelected && s.photoCellSelected]}
                        onPress={() => handleSelect({ photo, checkin: c })}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: photo.url }} style={s.photo} resizeMode="cover" />
                        {photo.pose && (
                          <View style={s.poseLabel}>
                            <Text style={s.poseLabelText} numberOfLines={1}>{photo.pose}</Text>
                          </View>
                        )}
                        {isBefore && (
                          <View style={[s.badge, s.badgeBefore]}>
                            <Text style={s.badgeText}>B</Text>
                          </View>
                        )}
                        {isAfter && (
                          <View style={[s.badge, s.badgeAfter]}>
                            <Text style={s.badgeText}>A</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            <View style={{ height: 120 }} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const THUMB = 64;

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg.primary },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },

  instrBar:  { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.bg.secondary },
  instrText: { fontSize: 13, color: colors.text.muted, textAlign: 'center' },

  selBar:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.bg.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  selSlot:   { alignItems: 'center', gap: 4 },
  selSlotLabel:{ fontSize: 9, fontWeight: '800', letterSpacing: 1.5, color: colors.text.muted },
  selThumb:  { width: THUMB, height: THUMB * (4/3), borderRadius: radius.md },
  selThumbBadge:{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md, paddingVertical: 2, alignItems: 'center' },
  selThumbBadgeText:{ fontSize: 9, fontWeight: '700', color: '#fff' },
  selEmpty:  { width: THUMB, height: THUMB * (4/3), borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.elevated },
  compareBtn:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.accent.primary, borderRadius: radius.md, height: 44, marginLeft: 'auto' as any },
  compareBtnText:{ color: '#fff', fontSize: 14, fontWeight: '800' },

  weekGroup:      { paddingTop: spacing.md, paddingHorizontal: GAP },
  weekGroupLabel: { fontSize: 11, fontWeight: '700', color: colors.text.muted, letterSpacing: 0.5, paddingHorizontal: 4, paddingBottom: 6 },
  photoRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  photoCell:      { width: CELL_W, position: 'relative', borderRadius: 4, overflow: 'hidden' },
  photoCellSelected:{ borderWidth: 2.5, borderColor: colors.accent.primary, borderRadius: 6 },
  photo:          { width: CELL_W, height: CELL_W * (4/3) },
  poseLabel:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 3, paddingHorizontal: 4 },
  poseLabelText:  { fontSize: 9, fontWeight: '600', color: '#fff' },
  badge:          { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  badgeBefore:    { backgroundColor: colors.accent.primary },
  badgeAfter:     { backgroundColor: colors.accent.info },
  badgeText:      { fontSize: 11, fontWeight: '800', color: '#fff' },

  compareScroll:  { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  compareLabels:  { flexDirection: 'row', justifyContent: 'space-around' },
  compareCol:     { flex: 1, alignItems: 'center', gap: 2 },
  compareWeekNum: { fontSize: 15, fontWeight: '800', color: colors.text.primary },
  compareDate:    { fontSize: 12, color: colors.text.muted },
  comparePose:    { fontSize: 11, fontWeight: '700', color: colors.accent.primary },
  photoPair:      { flexDirection: 'row', gap: spacing.sm },
  diffCard:       { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card, alignItems: 'center', gap: 4 },
  diffLabel:      { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.text.muted },
  diffValue:      { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  diffSub:        { fontSize: 12, color: colors.text.muted },
  emptyTitle:     { fontSize: 17, fontWeight: '700', color: colors.text.secondary },
  emptySub:       { fontSize: 14, color: colors.text.muted, textAlign: 'center', lineHeight: 20 },
});
