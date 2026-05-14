import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useFriendsStore, FriendReq, FriendEntry, UserSearchResult } from '../src/store/friendsStore';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore } from '../src/store/userStore';
import { colors, spacing, radius, typography } from '../src/theme';

// ── Avatar helper ──────────────────────────────────────────────────────────────

function Avatar({ url, name, size = 44 }: { url: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[av.text, { fontSize: size * 0.36 }]}>{initials || '?'}</Text>
    </View>
  );
}
const av = StyleSheet.create({
  circle: { backgroundColor: colors.accent.primary, justifyContent: 'center', alignItems: 'center' },
  text:   { color: '#fff', fontWeight: '800' },
});

// ── Search result row ──────────────────────────────────────────────────────────

function SearchRow({ item, onAdd }: { item: UserSearchResult; onAdd: () => void }) {
  return (
    <View style={sr.row}>
      <Avatar url={item.avatarUrl} name={item.displayName} />
      <View style={sr.text}>
        <Text style={sr.name}>{item.displayName}</Text>
        <Text style={sr.sub}>{item.email}</Text>
      </View>
      {item.isFriend ? (
        <View style={sr.friendBadge}>
          <Ionicons name="checkmark" size={12} color={colors.accent.success} />
          <Text style={sr.friendText}>Friends</Text>
        </View>
      ) : item.requestSent ? (
        <View style={sr.pendingBadge}>
          <Text style={sr.pendingText}>Pending</Text>
        </View>
      ) : (
        <TouchableOpacity style={sr.addBtn} onPress={onAdd} activeOpacity={0.8}>
          <Ionicons name="person-add-outline" size={14} color="#fff" />
          <Text style={sr.addText}>Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const sr = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  text:         { flex: 1, gap: 2 },
  name:         { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  sub:          { fontSize: 12, color: colors.text.muted },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7 },
  addText:      { fontSize: 12, fontWeight: '700', color: '#fff' },
  friendBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.accent.success}18`, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  friendText:   { fontSize: 11, fontWeight: '700', color: colors.accent.success },
  pendingBadge: { backgroundColor: colors.bg.elevated, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.border },
  pendingText:  { fontSize: 11, fontWeight: '600', color: colors.text.muted },
});

// ── Incoming request row ───────────────────────────────────────────────────────

function RequestRow({ req, onAccept, onDecline }: {
  req: FriendReq;
  onAccept:  () => void;
  onDecline: () => void;
}) {
  return (
    <View style={rr.card}>
      <Avatar url={req.fromAvatar} name={req.fromName} />
      <View style={rr.text}>
        <Text style={rr.name}>{req.fromName}</Text>
        <Text style={rr.sub}>Wants to be friends</Text>
      </View>
      <View style={rr.actions}>
        <TouchableOpacity style={rr.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
          <Ionicons name="checkmark" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={rr.declineBtn} onPress={onDecline} activeOpacity={0.85}>
          <Ionicons name="close" size={16} color={colors.text.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
const rr = StyleSheet.create({
  card:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: `${colors.accent.primary}30` },
  text:       { flex: 1, gap: 2 },
  name:       { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  sub:        { fontSize: 12, color: colors.text.muted },
  actions:    { flexDirection: 'row', gap: spacing.sm },
  acceptBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent.primary, justifyContent: 'center', alignItems: 'center' },
  declineBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
});

// ── Friend row ─────────────────────────────────────────────────────────────────

function FriendRow({ friend, onPress, onRemove }: { friend: FriendEntry; onPress: () => void; onRemove: () => void }) {
  return (
    <TouchableOpacity style={fr.row} onPress={onPress} activeOpacity={0.8}>
      <Avatar url={friend.avatarUrl} name={friend.displayName} />
      <View style={fr.text}>
        <Text style={fr.name}>{friend.displayName}</Text>
        <Text style={fr.sub}>Tap to view profile</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
      <TouchableOpacity onPress={onRemove} style={fr.removeBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="person-remove-outline" size={16} color={colors.text.muted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
const fr = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  text:      { flex: 1, gap: 2 },
  name:      { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  sub:       { fontSize: 12, color: colors.text.muted },
  removeBtn: { padding: 4 },
});

// ── Main ───────────────────────────────────────────────────────────────────────

type Tab = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data } = useUserStore();
  const {
    friends, incomingReqs, searchResults, searching,
    subscribe, sendRequest, acceptRequest, declineRequest,
    removeFriend, searchUsers, clearSearch,
  } = useFriendsStore();

  const [tab,        setTab]    = useState<Tab>('friends');
  const [searchTerm, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribe(user.uid);
    return unsub;
  }, [user?.uid]);

  // Auto-switch to requests tab if we have incoming
  useEffect(() => {
    if (incomingReqs.length > 0 && tab === 'friends') setTab('requests');
  }, [incomingReqs.length]);

  function handleSearch(text: string) {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { clearSearch(); return; }
    debounceRef.current = setTimeout(() => {
      if (user?.uid) searchUsers(text.trim(), user.uid);
    }, 500);
  }

  async function handleAdd(item: UserSearchResult) {
    if (!user?.uid || !data?.displayName) return;
    try {
      await sendRequest(user.uid, data.displayName, data.avatarUrl ?? null, item.uid);
    } catch {
      Alert.alert('Error', 'Could not send friend request. Try again.');
    }
  }

  async function handleAccept(req: FriendReq) {
    if (!data?.displayName) return;
    try {
      await acceptRequest(req, data.displayName, data.avatarUrl ?? null);
    } catch {
      Alert.alert('Error', 'Could not accept request. Try again.');
    }
  }

  async function handleDecline(requestId: string) {
    try { await declineRequest(requestId); } catch { Alert.alert('Error', 'Try again.'); }
  }

  function handleRemove(friendUid: string, friendName: string) {
    Alert.alert('Remove friend', `Remove ${friendName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        if (user?.uid) await removeFriend(user.uid, friendUid);
      }},
    ]);
  }

  const reqCount = incomingReqs.length;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Friends</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search bar */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={colors.text.muted} />
        <TextInput
          style={s.searchInput}
          value={searchTerm}
          onChangeText={handleSearch}
          placeholder="Search by name or email…"
          placeholderTextColor={colors.text.muted}
          onFocus={() => setTab('search')}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); clearSearch(); setTab('friends'); }}>
            <Ionicons name="close-circle" size={16} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      {tab !== 'search' && (
        <View style={s.tabs}>
          {([
            { key: 'friends',  label: 'Friends',  count: friends.length },
            { key: 'requests', label: 'Requests', count: reqCount },
          ] as { key: Tab; label: string; count: number }[]).map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, tab === t.key && s.tabActive]}
              onPress={() => setTab(t.key as Tab)}
              activeOpacity={0.75}
            >
              <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
              {t.count > 0 && (
                <View style={[s.tabBadge, tab === t.key && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeText, tab === t.key && s.tabBadgeTextActive]}>{t.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {tab === 'search' ? (
        <FlatList
          data={searchResults}
          keyExtractor={i => i.uid}
          contentContainerStyle={s.list}
          ListHeaderComponent={searching ? (
            <View style={s.center}><ActivityIndicator color={colors.accent.primary} /></View>
          ) : searchResults.length === 0 && searchTerm.length > 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="search-outline" size={32} color={colors.text.muted} />
              <Text style={s.emptyText}>No users found for "{searchTerm}"</Text>
              <Text style={s.emptySub}>Try searching by exact email address</Text>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <SearchRow item={item} onAdd={() => handleAdd(item)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      ) : tab === 'requests' ? (
        <FlatList
          data={incomingReqs}
          keyExtractor={r => r.requestId}
          contentContainerStyle={s.list}
          ListEmptyComponent={() => (
            <View style={s.emptyWrap}>
              <Ionicons name="mail-outline" size={36} color={colors.text.muted} />
              <Text style={s.emptyText}>No pending requests</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <RequestRow
              req={item}
              onAccept={() => handleAccept(item)}
              onDecline={() => handleDecline(item.requestId)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      ) : (
        <FlatList
          data={friends}
          keyExtractor={f => f.uid}
          contentContainerStyle={s.list}
          ListEmptyComponent={() => (
            <View style={s.emptyWrap}>
              <Ionicons name="people-outline" size={48} color={colors.text.muted} />
              <Text style={s.emptyText}>No friends yet</Text>
              <Text style={s.emptySub}>Search by name or email to connect with people</Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => { setTab('search'); }}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add-outline" size={16} color="#fff" />
                <Text style={s.emptyBtnText}>Find Friends</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => (
            <FriendRow
              friend={item}
              onPress={() => router.push({ pathname: '/friend-profile' as any, params: { uid: item.uid, name: item.displayName } })}
              onRemove={() => handleRemove(item.uid, item.displayName)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  title:    { ...typography.h4 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.md, backgroundColor: colors.bg.input, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 46 },
  searchInput:{ flex: 1, color: colors.text.primary, fontSize: 15 },

  tabs:          { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
  tab:           { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg.card },
  tabActive:     { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}15` },
  tabLabel:      { fontSize: 13, fontWeight: '600', color: colors.text.muted },
  tabLabelActive:{ color: colors.accent.primary },
  tabBadge:      { backgroundColor: colors.bg.elevated, borderRadius: radius.full, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  tabBadgeActive:{ backgroundColor: colors.accent.primary },
  tabBadgeText:  { fontSize: 10, fontWeight: '800', color: colors.text.muted },
  tabBadgeTextActive: { color: '#fff' },

  list:      { padding: spacing.md, gap: spacing.sm, paddingBottom: 60, flexGrow: 1 },
  center:    { padding: spacing.xl, alignItems: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  emptySub:  { fontSize: 13, color: colors.text.muted, textAlign: 'center', paddingHorizontal: spacing.xl },
  emptyBtn:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, marginTop: spacing.md },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
