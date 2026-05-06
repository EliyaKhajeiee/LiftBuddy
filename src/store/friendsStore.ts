import { create } from 'zustand';
import {
  collection, query, where, onSnapshot,
  doc, setDoc, updateDoc, deleteDoc,
  getDocs, limit, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FriendEntry {
  uid:         string;
  displayName: string;
  avatarUrl:   string | null;
  since:       Timestamp;
}

export interface FriendReq {
  requestId:  string;
  fromUid:    string;
  fromName:   string;
  fromAvatar: string | null;
  toUid:      string;
  status:     'pending' | 'accepted' | 'declined';
  createdAt:  Timestamp;
}

export interface UserSearchResult {
  uid:         string;
  displayName: string;
  avatarUrl:   string | null;
  email:       string;
  isFriend:    boolean;
  requestSent: boolean;
}

interface FriendsStore {
  friends:       FriendEntry[];
  incomingReqs:  FriendReq[];
  outgoingReqs:  FriendReq[];
  loading:       boolean;
  searchResults: UserSearchResult[];
  searching:     boolean;

  subscribe:      (uid: string) => () => void;
  sendRequest:    (fromUid: string, fromName: string, fromAvatar: string | null, toUid: string) => Promise<void>;
  acceptRequest:  (req: FriendReq, myName: string, myAvatar: string | null) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  removeFriend:   (myUid: string, friendUid: string) => Promise<void>;
  searchUsers:    (term: string, myUid: string) => Promise<void>;
  clearSearch:    () => void;
  clear:          () => void;
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useFriendsStore = create<FriendsStore>((set, get) => ({
  friends:      [],
  incomingReqs: [],
  outgoingReqs: [],
  loading:      false,
  searchResults:[],
  searching:    false,

  subscribe(uid) {
    set({ loading: true });

    // My friends subcollection
    const friendsUnsub = onSnapshot(
      collection(db, 'users', uid, 'friends'),
      snap => set({ friends: snap.docs.map(d => d.data() as FriendEntry), loading: false }),
      err  => { console.error('[friends] friends listener:', err); set({ loading: false }); },
    );

    // Incoming requests — query by toUid only, filter pending in JS (avoids composite index)
    const inUnsub = onSnapshot(
      query(collection(db, 'friendRequests'), where('toUid', '==', uid)),
      snap => set({
        incomingReqs: snap.docs
          .map(d => d.data() as FriendReq)
          .filter(r => r.status === 'pending'),
      }),
      err => console.error('[friends] incoming listener:', err),
    );

    // Outgoing requests — same approach
    const outUnsub = onSnapshot(
      query(collection(db, 'friendRequests'), where('fromUid', '==', uid)),
      snap => set({
        outgoingReqs: snap.docs
          .map(d => d.data() as FriendReq)
          .filter(r => r.status === 'pending'),
      }),
      err => console.error('[friends] outgoing listener:', err),
    );

    return () => { friendsUnsub(); inUnsub(); outUnsub(); };
  },

  async sendRequest(fromUid, fromName, fromAvatar, toUid) {
    const requestId = `req_${fromUid}_${toUid}_${Date.now()}`;
    await setDoc(doc(db, 'friendRequests', requestId), {
      requestId,
      fromUid,
      fromName,
      fromAvatar: fromAvatar ?? null,
      toUid,
      status:    'pending',
      createdAt: Timestamp.now(),
    });
  },

  async acceptRequest(req, myName, myAvatar) {
    const now = Timestamp.now();
    await updateDoc(doc(db, 'friendRequests', req.requestId), { status: 'accepted' });
    await setDoc(doc(db, 'users', req.toUid, 'friends', req.fromUid), {
      uid:         req.fromUid,
      displayName: req.fromName,
      avatarUrl:   req.fromAvatar ?? null,
      since:       now,
    });
    await setDoc(doc(db, 'users', req.fromUid, 'friends', req.toUid), {
      uid:         req.toUid,
      displayName: myName,
      avatarUrl:   myAvatar ?? null,
      since:       now,
    });
  },

  async declineRequest(requestId) {
    await updateDoc(doc(db, 'friendRequests', requestId), { status: 'declined' });
  },

  async removeFriend(myUid, friendUid) {
    await deleteDoc(doc(db, 'users', myUid,     'friends', friendUid));
    await deleteDoc(doc(db, 'users', friendUid, 'friends', myUid));
  },

  async searchUsers(term, myUid) {
    if (!term.trim()) { set({ searchResults: [] }); return; }
    set({ searching: true });
    try {
      const { friends, outgoingReqs } = get();
      const friendIds   = new Set(friends.map(f => f.uid));
      const outgoingIds = new Set(outgoingReqs.map(r => r.toUid));

      // Try multiple capitalizations so "eli" finds "Eli", "ELI", etc.
      const variants = Array.from(new Set([
        term,
        term.charAt(0).toUpperCase() + term.slice(1),
        term.toLowerCase(),
        term.toUpperCase(),
      ]));

      // Firestore prefix query: '\\uf8ff' is a high-unicode sentinel for range upper bound
      const nameSearches = variants.map(v =>
        getDocs(query(
          collection(db, 'users'),
          orderBy('displayName'),
          where('displayName', '>=', v),
          where('displayName', '<=', v + ''),
          limit(10),
        ))
      );
      const emailSearch = getDocs(
        query(collection(db, 'users'), where('email', '==', term.toLowerCase()), limit(5))
      );

      const snaps = await Promise.all([...nameSearches, emailSearch]);

      const seen    = new Set<string>();
      const results: UserSearchResult[] = [];

      for (const snap of snaps) {
        for (const d of snap.docs) {
          if (seen.has(d.id) || d.id === myUid) continue;
          seen.add(d.id);
          const data = d.data();
          results.push({
            uid:         d.id,
            displayName: data.displayName ?? 'Unknown',
            avatarUrl:   data.avatarUrl   ?? null,
            email:       data.email       ?? '',
            isFriend:    friendIds.has(d.id),
            requestSent: outgoingIds.has(d.id),
          });
        }
      }

      set({ searchResults: results, searching: false });
    } catch (e) {
      console.error('[friends] searchUsers error:', e);
      set({ searching: false });
    }
  },

  clearSearch() {
    set({ searchResults: [] });
  },

  clear() {
    set({ friends: [], incomingReqs: [], outgoingReqs: [], searchResults: [], loading: false });
  },
}));
