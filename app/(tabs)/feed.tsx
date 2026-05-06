import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, TextInput,
  Image, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection, addDoc, query, where, orderBy, limit,
  onSnapshot, Timestamp, doc, getDoc, updateDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { storage, db } from '../../src/firebase/config';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { colors, spacing, radius, typography, shadows } from '../../src/theme';
import { useRouter } from 'expo-router';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FeedPost {
  postId:       string;
  uid:          string;
  authorName:   string;
  authorAvatar: string | null;
  imageUrl:     string;
  caption:      string;
  isPublic:     boolean;
  createdAt:    any;
  likes:        number;
  likedBy:      string[];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[tp.pill, active && tp.active]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[tp.text, active && tp.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
const tp = StyleSheet.create({
  pill:       { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border },
  active:     { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}18` },
  text:       { fontSize: 13, fontWeight: '600', color: colors.text.muted },
  textActive: { color: colors.accent.primary },
});

function timeAgo(ts: any): string {
  try {
    const d    = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs  < 24)  return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  } catch { return ''; }
}

function PostCard({ post, currentUid }: { post: FeedPost; currentUid: string }) {
  const liked = post.likedBy?.includes(currentUid);

  async function toggleLike() {
    try {
      const ref = doc(db, 'posts', post.postId);
      if (liked) {
        await updateDoc(ref, { likedBy: arrayRemove(currentUid), likes: Math.max(0, (post.likes ?? 0) - 1) });
      } else {
        await updateDoc(ref, { likedBy: arrayUnion(currentUid), likes: (post.likes ?? 0) + 1 });
      }
    } catch {}
  }

  return (
    <View style={pc.card}>
      {/* Author row */}
      <View style={pc.author}>
        <View style={pc.avatar}>
          {post.authorAvatar
            ? <Image source={{ uri: post.authorAvatar }} style={pc.avatarImg} />
            : <Text style={pc.avatarLetter}>{(post.authorName?.[0] ?? '?').toUpperCase()}</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={pc.authorName}>{post.authorName}</Text>
          <Text style={pc.timestamp}>{timeAgo(post.createdAt)}</Text>
        </View>
        {!post.isPublic && (
          <View style={pc.privateBadge}>
            <Ionicons name="people" size={11} color={colors.text.muted} />
            <Text style={pc.privateBadgeText}>Friends</Text>
          </View>
        )}
      </View>

      {/* Image */}
      <Image source={{ uri: post.imageUrl }} style={pc.image} resizeMode="cover" />

      {/* Caption + likes */}
      <View style={pc.footer}>
        {post.caption ? <Text style={pc.caption}>{post.caption}</Text> : null}
        <View style={pc.actions}>
          <TouchableOpacity style={pc.likeBtn} onPress={toggleLike} activeOpacity={0.7}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={20}
              color={liked ? colors.accent.danger : colors.text.muted}
            />
            <Text style={[pc.likeCount, liked && { color: colors.accent.danger }]}>
              {post.likes ?? 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card:        { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.card },
  author:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  avatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg:   { width: 36, height: 36, borderRadius: 18 },
  avatarLetter:{ fontSize: 14, fontWeight: '700', color: '#fff' },
  authorName:  { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  timestamp:   { fontSize: 11, color: colors.text.muted, marginTop: 1 },
  privateBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  privateBadgeText: { fontSize: 10, color: colors.text.muted },
  image:       { width: '100%', aspectRatio: 1 },
  footer:      { padding: spacing.md },
  caption:     { fontSize: 14, color: colors.text.secondary, marginBottom: spacing.sm, lineHeight: 20 },
  actions:     { flexDirection: 'row', alignItems: 'center' },
  likeBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  likeCount:   { fontSize: 14, fontWeight: '600', color: colors.text.muted },
});

// ── Post creation modal ────────────────────────────────────────────────────────

function PostModal({
  visible, uid, userName, avatarUrl, onClose,
}: {
  visible: boolean;
  uid: string;
  userName: string;
  avatarUrl: string | null;
  onClose: () => void;
}) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption]   = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!visible) { setImageUri(null); setCaption(''); setUploading(false); }
  }, [visible]);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to post.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function handlePost() {
    if (!imageUri) { Alert.alert('Pick a photo first.'); return; }
    setUploading(true);
    try {
      const response = await fetch(imageUri);
      const blob     = await response.blob();
      const path     = `posts/${uid}/${Date.now()}.jpg`;
      const sRef     = ref(storage, path);
      await uploadBytes(sRef, blob, { contentType: 'image/jpeg' });
      const imageUrl = await getDownloadURL(sRef);

      await addDoc(collection(db, 'posts'), {
        uid,
        authorName:   userName,
        authorAvatar: avatarUrl,
        imageUrl,
        caption:      caption.trim(),
        isPublic,
        createdAt:    Timestamp.now(),
        likes:        0,
        likedBy:      [],
      });

      onClose();
    } catch {
      Alert.alert('Upload failed', 'Could not post. Try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={pm.container}>
        <View style={pm.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} disabled={uploading}>
            <Text style={pm.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={pm.title}>New Post</Text>
          <TouchableOpacity onPress={handlePost} activeOpacity={0.8} disabled={uploading || !imageUri}>
            {uploading
              ? <ActivityIndicator size="small" color={colors.accent.primary} />
              : <Text style={[pm.postBtn, !imageUri && pm.postBtnDisabled]}>Post</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={pm.scroll}>
          {/* Image picker */}
          <TouchableOpacity style={pm.imagePicker} onPress={pickImage} activeOpacity={0.8}>
            {imageUri
              ? <Image source={{ uri: imageUri }} style={pm.previewImage} resizeMode="cover" />
              : (
                <View style={pm.imagePlaceholder}>
                  <Ionicons name="camera" size={36} color={colors.text.muted} />
                  <Text style={pm.imagePlaceholderText}>Tap to add photo</Text>
                </View>
              )
            }
          </TouchableOpacity>

          {/* Caption */}
          <TextInput
            style={pm.captionInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a caption…"
            placeholderTextColor={colors.text.muted}
            multiline
            maxLength={300}
          />

          {/* Visibility */}
          <View style={pm.visRow}>
            <Text style={pm.visLabel}>Who can see this?</Text>
            <View style={pm.visPills}>
              <TouchableOpacity
                style={[pm.visPill, isPublic && pm.visPillActive]}
                onPress={() => setIsPublic(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="globe-outline" size={13} color={isPublic ? colors.accent.primary : colors.text.muted} />
                <Text style={[pm.visPillText, isPublic && pm.visPillTextActive]}>Everyone</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[pm.visPill, !isPublic && pm.visPillActive]}
                onPress={() => setIsPublic(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="people-outline" size={13} color={!isPublic ? colors.accent.primary : colors.text.muted} />
                <Text style={[pm.visPillText, !isPublic && pm.visPillTextActive]}>Friends</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const pm = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg.primary },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  cancel:        { fontSize: 15, color: colors.text.secondary },
  title:         { ...typography.h4 },
  postBtn:       { fontSize: 15, fontWeight: '700', color: colors.accent.primary },
  postBtnDisabled:{ opacity: 0.3 },
  scroll:        { padding: spacing.lg, gap: spacing.lg },
  imagePicker:   { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  previewImage:  { width: '100%', aspectRatio: 1 },
  imagePlaceholder:{ height: 280, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.card, gap: spacing.sm },
  imagePlaceholderText:{ fontSize: 14, color: colors.text.muted },
  captionInput:  { backgroundColor: colors.bg.input, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text.primary, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  visRow:        { gap: spacing.sm },
  visLabel:      { ...typography.label, color: colors.text.secondary },
  visPills:      { flexDirection: 'row', gap: spacing.sm },
  visPill:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 7, flex: 1, justifyContent: 'center' },
  visPillActive: { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}15` },
  visPillText:   { fontSize: 13, fontWeight: '600', color: colors.text.muted },
  visPillTextActive:{ color: colors.accent.primary },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const { user }            = useAuthStore();
  const { data: userData }  = useUserStore();
  const [tab,    setTab]    = useState<'friends' | 'explore'>('friends');
  const [search, setSearch] = useState('');
  const [posts,  setPosts]  = useState<FeedPost[]>([]);
  const [postModalVisible, setPostModal] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const q = tab === 'explore'
      ? query(collection(db, 'posts'), where('isPublic', '==', true), orderBy('createdAt', 'desc'), limit(30))
      : query(collection(db, 'posts'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'), limit(20));

    const unsub = onSnapshot(q, snap => {
      const items = snap.docs.map(d => ({ postId: d.id, ...d.data() } as FeedPost));
      setPosts(items);
    }, () => {});

    return () => unsub();
  }, [tab, user?.uid]);

  // Check if user has already posted today
  const hasPostedToday = posts.some(p => {
    if (p.uid !== user?.uid) return false;
    try {
      const d = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      return d.toDateString() === new Date().toDateString();
    } catch { return false; }
  });

  const myPosts = posts.filter(p => p.uid === user?.uid);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Community</Text>
        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => {
            if (hasPostedToday && tab === 'friends') {
              Alert.alert('One post per day', 'You\'ve already posted today. Come back tomorrow!');
              return;
            }
            setPostModal(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TabPill label="My Feed"  active={tab === 'friends'}  onPress={() => setTab('friends')}  />
        <TabPill label="Explore"  active={tab === 'explore'}  onPress={() => setTab('explore')}  />
      </View>

      <FlatList
        data={tab === 'explore' ? posts.filter(p => search === '' || p.authorName?.toLowerCase().includes(search.toLowerCase())) : myPosts}
        keyExtractor={p => p.postId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          tab === 'explore' ? (
            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={colors.text.muted} style={{ marginRight: 4 }} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name…"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={16} color={colors.text.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name={tab === 'friends' ? 'images-outline' : 'globe-outline'} size={34} color={colors.text.muted} />
            </View>
            <Text style={styles.emptyTitle}>{tab === 'friends' ? 'No posts yet' : 'No public posts yet'}</Text>
            <Text style={styles.emptySub}>
              {tab === 'friends'
                ? 'Tap Post to share your gym check-in.'
                : search ? `No results for "${search}"` : 'Be the first to share a post with the community.'}
            </Text>
            {tab === 'friends' && (
              <TouchableOpacity style={styles.ctaBtn} onPress={() => setPostModal(true)} activeOpacity={0.85}>
                <Ionicons name="camera-outline" size={16} color="#fff" />
                <Text style={styles.ctaBtnText}>Share Today's Check-in</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <PostCard post={item} currentUid={user?.uid ?? ''} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

      <PostModal
        visible={postModalVisible}
        uid={user?.uid ?? ''}
        userName={user?.displayName ?? 'Lifter'}
        avatarUrl={userData?.avatarUrl ?? null}
        onClose={() => setPostModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  topBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:     { ...typography.h3 },
  postBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 7 },
  postBtnText:{ fontSize: 13, fontWeight: '700', color: '#fff' },
  tabRow:    { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  scroll:    { padding: spacing.lg, paddingBottom: spacing.xxl },

  searchRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.input, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, height: 44, marginBottom: spacing.md },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: 15, height: '100%' },

  emptyWrap:  { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyIcon:  { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.bg.elevated, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { ...typography.h3, textAlign: 'center' },
  emptySub:   { ...typography.bodySmall, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.xl },
  ctaBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.accent.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, marginTop: spacing.sm },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
