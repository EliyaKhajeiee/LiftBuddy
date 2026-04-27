import * as admin from 'firebase-admin';
import * as functionsV1 from 'firebase-functions/v1';
import { onSchedule } from 'firebase-functions/v2/scheduler';

admin.initializeApp();
const db = admin.firestore();

// ─── handleFriendAccept (Gen 1) ────────────────────────────────────────────────
// Fires when a friendRequest document is updated.
// When status transitions pending → accepted, writes both friendship subcollections.
export const handleFriendAccept = functionsV1.firestore
  .document('friendRequests/{requestId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after  = change.after.data();

    if (before.status !== 'pending' || after.status !== 'accepted') return;

    const { fromUid, fromName, fromAvatar, toUid } = after as {
      fromUid:    string;
      fromName:   string;
      fromAvatar: string | null;
      toUid:      string;
    };

    const now = admin.firestore.FieldValue.serverTimestamp();

    const toUserSnap = await db.doc(`users/${toUid}`).get();
    const toUser     = toUserSnap.data();

    const batch = db.batch();

    batch.set(db.doc(`friendships/${toUid}/friends/${fromUid}`), {
      uid:         fromUid,
      displayName: fromName ?? '',
      avatarUrl:   fromAvatar ?? null,
      since:       now,
    });

    batch.set(db.doc(`friendships/${fromUid}/friends/${toUid}`), {
      uid:         toUid,
      displayName: toUser?.displayName ?? '',
      avatarUrl:   toUser?.avatarUrl   ?? null,
      since:       now,
    });

    await batch.commit();
    functionsV1.logger.info(`Friendship created: ${fromUid} ↔ ${toUid}`);
  });

// ─── cleanOldPosts (Gen 2) ─────────────────────────────────────────────────────
// Kept as Gen 2 — already deployed that way and cannot be downgraded.
// Runs daily at 03:00 UTC. Deletes Firestore post docs older than 30 days.
export const cleanOldPosts = onSchedule(
  { schedule: '0 3 * * *', timeZone: 'UTC' },
  async () => {
    const cutoff = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );

    const snap = await db
      .collection('posts')
      .where('createdAt', '<', cutoff)
      .limit(500)
      .get();

    if (snap.empty) {
      console.log('cleanOldPosts: nothing to delete');
      return;
    }

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    console.log(`cleanOldPosts: deleted ${snap.size} posts`);
  },
);
