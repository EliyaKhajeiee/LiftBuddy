import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { storage, db } from '../../src/firebase/config';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { colors, spacing, radius, typography, shadows } from '../../src/theme';
import type { Goal, ExperienceLevel, Location } from '../../src/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

const GOAL_LABEL: Record<Goal, string> = {
  bulk: 'Building Muscle', cut: 'Losing Fat', strength: 'Building Strength',
};
const EXP_LABEL: Record<ExperienceLevel, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
};
const LOC_LABEL: Record<Location, string> = {
  gym: 'Gym', home: 'Home Gym',
};

function fmtHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const i  = inches % 12;
  return `${ft}'${i}"`;
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={ir.row}>
      <View style={ir.left}>
        <Ionicons name={icon as any} size={16} color={colors.text.muted} />
        <Text style={ir.label}>{label}</Text>
      </View>
      <Text style={ir.value}>{value}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  left:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.bodySmall, color: colors.text.secondary },
  value: { ...typography.bodySmall, color: colors.text.primary, fontWeight: '600' },
});

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={sb.card}>
      <Text style={sb.value}>{value}</Text>
      <Text style={sb.label}>{label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  card:  { flex: 1, alignItems: 'center', backgroundColor: colors.bg.card, borderRadius: radius.lg, paddingVertical: spacing.md, ...shadows.card },
  value: { fontSize: 22, fontWeight: '800', color: colors.text.primary },
  label: { ...typography.label, color: colors.text.muted, marginTop: 2 },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router              = useRouter();
  const { user, logout }   = useAuthStore();
  const { data, loading }  = useUserStore();
  const [uploading, setUploading] = useState(false);

  async function pickAndUploadAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !user?.uid) return;

    setUploading(true);
    try {
      const uri      = result.assets[0].uri;
      const response = await fetch(uri);
      const blob     = await response.blob();
      const storageRef = ref(storage, `avatars/${user.uid}/profile.jpg`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      await setDoc(doc(db, 'users', user.uid), { avatarUrl: url }, { merge: true });
    } catch {
      Alert.alert('Upload failed', 'Could not update your photo. Try again.');
    } finally {
      setUploading(false);
    }
  }
  const profile = data?.profile;
  const stats   = data?.stats;

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={colors.accent.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/edit-profile')} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={22} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAndUploadAvatar} activeOpacity={0.8} style={styles.avatarWrap}>
            {data?.avatarUrl ? (
              <Image source={{ uri: data.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(user?.displayName)}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              {uploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={12} color="#fff" />
              }
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.displayName ?? 'Lifter'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {profile && (
            <View style={styles.goalPill}>
              <Text style={styles.goalPillText}>{GOAL_LABEL[profile.goal]}</Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBadge label="WORKOUTS" value={String(stats?.totalWorkouts ?? 0)} />
          <StatBadge label="STREAK"   value={`${stats?.currentStreak ?? 0}d`} />
          <StatBadge label="WEIGHT"   value={stats?.currentWeight ? `${stats.currentWeight}` : '—'} />
        </View>
        <Text style={styles.weightUnit}>lbs</Text>

        {/* Profile details */}
        {profile && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>YOUR PROGRAM PROFILE</Text>
            <InfoRow icon="trending-up-outline" label="Experience"   value={EXP_LABEL[profile.experience]}  />
            <InfoRow icon="calendar-outline"   label="Days per week" value={`${profile.daysPerWeek} days`}  />
            {profile.age > 0 && (
              <InfoRow icon="person-outline"   label="Age"           value={`${profile.age} years old`}     />
            )}
            {profile.injuries?.length > 0 && (
              <InfoRow icon="medical-outline"  label="Limitations"   value={profile.injuries.join(', ')}    />
            )}
          </View>
        )}

        {/* Equipment */}
        {(profile?.equipment?.length ?? 0) > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>EQUIPMENT</Text>
            <View style={styles.chipRow}>
              {profile!.equipment.map(e => (
                <View key={e} style={styles.chip}>
                  <Text style={styles.chipText}>{e.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Muscle focus */}
        {(profile?.muscleFocus?.length ?? 0) > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>MUSCLE FOCUS</Text>
            <View style={styles.chipRow}>
              {profile!.muscleFocus.map(m => (
                <View key={m} style={styles.chip}>
                  <Text style={styles.chipText}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Friends */}
        <TouchableOpacity style={styles.friendsBtn} onPress={() => router.push('/friends' as any)} activeOpacity={0.8}>
          <Ionicons name="people-outline" size={18} color={colors.accent.primary} />
          <Text style={styles.friendsBtnText}>Friends</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={colors.accent.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg.primary },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:        { ...typography.h3 },
  iconBtn:      { padding: 4 },
  scroll:       { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  avatarSection:{ alignItems: 'center', gap: spacing.xs },
  avatarWrap:   { position: 'relative', marginBottom: spacing.xs },
  avatar:       { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accent.primary, justifyContent: 'center', alignItems: 'center' },
  avatarImg:    { width: 88, height: 88, borderRadius: 44 },
  avatarText:   { fontSize: 30, fontWeight: '800', color: '#fff' },
  avatarBadge:  { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.bg.elevated, borderWidth: 2, borderColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  name:         { ...typography.h3 },
  email:        { ...typography.bodySmall, color: colors.text.muted },
  goalPill:     { backgroundColor: `${colors.accent.primary}22`, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: `${colors.accent.primary}44`, marginTop: spacing.xs },
  goalPillText: { fontSize: 12, fontWeight: '600', color: colors.accent.primary },

  statsRow:  { flexDirection: 'row', gap: spacing.sm },
  weightUnit:{ ...typography.caption, color: colors.text.muted, textAlign: 'center', marginTop: -spacing.sm },

  card:      { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  cardTitle: { ...typography.label, color: colors.text.muted, marginBottom: spacing.sm },
  chipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip:      { backgroundColor: colors.bg.elevated, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  chipText:  { fontSize: 12, color: colors.text.secondary, textTransform: 'capitalize' },

  friendsBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: `${colors.accent.primary}10`, borderWidth: 1, borderColor: `${colors.accent.primary}30`, borderRadius: radius.md, paddingVertical: spacing.md },
  friendsBtnText:{ color: colors.accent.primary, fontWeight: '700', fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: `${colors.accent.danger}15`, borderWidth: 1, borderColor: `${colors.accent.danger}40`, borderRadius: radius.md, paddingVertical: spacing.md },
  logoutText:{ color: colors.accent.danger, fontWeight: '700', fontSize: 15 },
});
