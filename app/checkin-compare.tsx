import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  FlatList, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { useAuthStore } from '../src/store/authStore';
import { colors, spacing, radius, typography } from '../src/theme';

const { width: W } = Dimensions.get('window');
const THUMB = (W - spacing.lg * 2 - spacing.sm * 2) / 3;

interface CheckinItem {
  checkinId:  string;
  weekNumber: number;
  year:       number;
  weekStart:  { toDate: () => Date } | null;
  photos:     { url: string; pose?: string }[];
  weight:     number | null;
}

function weekLabel(c: CheckinItem) {
  const d = c.weekStart?.toDate?.();
  if (!d) return `Week ${c.weekNumber}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CheckinCompareScreen() {
  const router      = useRouter();
  const { user }    = useAuthStore();
  const [checkins,  setCheckins]  = useState<CheckinItem[]>([]);
  const [selA,      setSelA]      = useState<CheckinItem | null>(null);
  const [selB,      setSelB]      = useState<CheckinItem | null>(null);
  const [comparing, setComparing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    const snap = await getDocs(
      query(collection(db, 'weeklyCheckins', user.uid, 'checkins'), orderBy('weekStart', 'desc'))
    );
    setCheckins(snap.docs.map(d => d.data() as CheckinItem).filter(c => c.photos?.length > 0));
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  function tap(item: CheckinItem) {
    if (comparing) return;
    if (selA?.checkinId === item.checkinId) { setSelA(null); return; }
    if (selB?.checkinId === item.checkinId) { setSelB(null); return; }
    if (!selA) { setSelA(item); return; }
    if (!selB) { setSelB(item); return; }
    // Both selected — replace the older selection
    setSelB(item);
  }

  function selIndex(item: CheckinItem): 1 | 2 | null {
    if (selA?.checkinId === item.checkinId) return 1;
    if (selB?.checkinId === item.checkinId) return 2;
    return null;
  }

  const canCompare = selA && selB;

  // ── Comparison view ──────────────────────────────────────────────────────────
  if (comparing && selA && selB) {
    const earlier = selA.weekNumber <= selB.weekNumber ? selA : selB;
    const later   = selA.weekNumber <= selB.weekNumber ? selB : selA;
    const photoH  = (W / 2 - spacing.md * 1.5) * (4 / 3);

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
          <View style={s.compareLabels}>
            <View style={s.compareLabel}>
              <Text style={s.compareWeek}>Week {earlier.weekNumber}</Text>
              <Text style={s.compareDate}>{weekLabel(earlier)}</Text>
              {earlier.weight ? <Text style={s.compareWeight}>{earlier.weight} lbs</Text> : null}
            </View>
            <View style={s.compareArrow}>
              <Ionicons name="arrow-forward" size={20} color={colors.accent.primary} />
            </View>
            <View style={s.compareLabel}>
              <Text style={s.compareWeek}>Week {later.weekNumber}</Text>
              <Text style={s.compareDate}>{weekLabel(later)}</Text>
              {later.weight ? <Text style={s.compareWeight}>{later.weight} lbs</Text> : null}
            </View>
          </View>

          {/* Photos side by side */}
          <View style={s.photoPair}>
            <Image
              source={{ uri: earlier.photos[0].url }}
              style={[s.comparePhoto, { height: photoH }]}
              resizeMode="cover"
            />
            <Image
              source={{ uri: later.photos[0].url }}
              style={[s.comparePhoto, { height: photoH }]}
              resizeMode="cover"
            />
          </View>

          {/* Pose labels if tagged */}
          {(earlier.photos[0].pose || later.photos[0].pose) && (
            <View style={s.poseRow}>
              <Text style={s.poseTag}>{earlier.photos[0].pose ?? '—'}</Text>
              <Text style={s.poseTag}>{later.photos[0].pose ?? '—'}</Text>
            </View>
          )}

          {/* Weight diff */}
          {earlier.weight && later.weight && (
            <View style={s.diffCard}>
              {(() => {
                const diff  = later.weight - earlier.weight;
                const sign  = diff > 0 ? '+' : '';
                const color = diff < 0 ? colors.accent.success : diff > 0 ? colors.accent.danger : colors.text.muted;
                return (
                  <>
                    <Text style={s.diffLabel}>WEIGHT CHANGE</Text>
                    <Text style={[s.diffValue, { color }]}>{sign}{diff.toFixed(1)} lbs</Text>
                    <Text style={s.diffSub}>over {later.weekNumber - earlier.weekNumber} weeks</Text>
                  </>
                );
              })()}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Selection view ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Compare Check-ins</Text>
          <Text style={s.headerSub}>
            {!selA ? 'Tap a photo to select BEFORE' : !selB ? 'Tap a photo to select AFTER' : 'Ready to compare'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Selected pair preview strip */}
      {(selA || selB) && (
        <View style={s.selStrip}>
          {[selA, selB].map((item, i) => (
            <View key={i} style={s.selSlot}>
              {item ? (
                <>
                  <Image source={{ uri: item.photos[0].url }} style={s.selThumb} resizeMode="cover" />
                  <Text style={s.selLabel}>Week {item.weekNumber}</Text>
                  <Text style={s.selDate}>{weekLabel(item)}</Text>
                </>
              ) : (
                <View style={s.selEmpty}>
                  <Ionicons name="add" size={20} color={colors.text.muted} />
                  <Text style={s.selEmptyText}>{i === 0 ? 'Before' : 'After'}</Text>
                </View>
              )}
            </View>
          ))}
          {canCompare && (
            <TouchableOpacity style={s.goBtn} onPress={() => setComparing(true)} activeOpacity={0.85}>
              <Ionicons name="git-compare-outline" size={16} color="#fff" />
              <Text style={s.goBtnText}>Compare</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={checkins}
        keyExtractor={c => c.checkinId}
        numColumns={3}
        contentContainerStyle={s.grid}
        columnWrapperStyle={s.gridRow}
        renderItem={({ item }) => {
          const idx = selIndex(item);
          return (
            <TouchableOpacity style={s.gridItem} onPress={() => tap(item)} activeOpacity={0.8}>
              <Image source={{ uri: item.photos[0].url }} style={s.gridPhoto} resizeMode="cover" />
              {idx && (
                <View style={[s.gridBadge, idx === 2 && s.gridBadgeB]}>
                  <Text style={s.gridBadgeText}>{idx === 1 ? 'A' : 'B'}</Text>
                </View>
              )}
              <View style={s.gridMeta}>
                <Text style={s.gridWeek}>Wk {item.weekNumber}</Text>
                {item.photos[0].pose && (
                  <Text style={s.gridPose} numberOfLines={1}>{item.photos[0].pose}</Text>
                )}
              </View>
              {idx && <View style={[s.gridOverlay, idx === 2 && s.gridOverlayB]} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="camera-outline" size={40} color={colors.text.muted} />
            <Text style={s.emptyTitle}>No photos yet</Text>
            <Text style={s.emptySub}>Add a progress photo to your weekly check-in to compare.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', flex: 1, gap: 2 },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  headerSub:    { fontSize: 12, color: colors.text.muted },

  // Selection strip
  selStrip: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg.secondary },
  selSlot:  { flex: 1, alignItems: 'center', gap: 3 },
  selThumb: { width: '100%', aspectRatio: 3/4, borderRadius: radius.md },
  selLabel: { fontSize: 12, fontWeight: '700', color: colors.text.primary },
  selDate:  { fontSize: 10, color: colors.text.muted },
  selEmpty: { width: '100%', aspectRatio: 3/4, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: colors.bg.card },
  selEmptyText: { fontSize: 11, color: colors.text.muted, fontWeight: '600' },
  goBtn:    { backgroundColor: colors.accent.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6 },
  goBtnText:{ color: '#fff', fontWeight: '700', fontSize: 13 },

  // Grid
  grid:    { padding: spacing.lg, gap: spacing.sm },
  gridRow: { gap: spacing.sm },
  gridItem:{ width: THUMB, position: 'relative' },
  gridPhoto:{ width: THUMB, height: THUMB * (4/3), borderRadius: radius.md },
  gridMeta: { paddingTop: 3, gap: 1 },
  gridWeek: { fontSize: 11, fontWeight: '700', color: colors.text.secondary },
  gridPose: { fontSize: 9, color: colors.text.muted },
  gridBadge: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent.primary, justifyContent: 'center', alignItems: 'center' },
  gridBadgeB:{ backgroundColor: colors.accent.warning ?? colors.accent.primary },
  gridBadgeText:{ fontSize: 11, fontWeight: '800', color: '#fff' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: radius.md, borderWidth: 2, borderColor: colors.accent.primary, height: THUMB * (4/3) },
  gridOverlayB:{ borderColor: colors.accent.warning ?? colors.accent.primary },

  // Compare view
  compareScroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  compareLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareLabel:  { flex: 1, alignItems: 'center', gap: 2 },
  compareWeek:   { fontSize: 16, fontWeight: '800', color: colors.text.primary },
  compareDate:   { fontSize: 12, color: colors.text.muted, textAlign: 'center' },
  compareWeight: { fontSize: 13, fontWeight: '700', color: colors.accent.primary },
  compareArrow:  { paddingHorizontal: spacing.sm },
  photoPair:     { flexDirection: 'row', gap: spacing.sm },
  comparePhoto:  { flex: 1, borderRadius: radius.lg },
  poseRow:       { flexDirection: 'row', gap: spacing.sm },
  poseTag:       { flex: 1, fontSize: 11, fontWeight: '600', color: colors.text.muted, textAlign: 'center' },

  diffCard:  { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 4 },
  diffLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.text.muted },
  diffValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  diffSub:   { fontSize: 12, color: colors.text.muted },

  // Empty state
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { ...typography.h3 },
  emptySub:   { fontSize: 14, color: colors.text.muted, textAlign: 'center', paddingHorizontal: spacing.xl },
});
