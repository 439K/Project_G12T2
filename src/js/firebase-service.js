// ファイルパス: src/js/firebase-service.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    onSnapshot,
    Timestamp,
    doc,
    getDoc,
    setDoc,
    orderBy,
    limit // limitもインポート
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// firebase-config.js で定義された firebaseConfig グローバル変数を使用
// windowオブジェクト経由でも探すようにして確実性を高める
const config = (typeof firebaseConfig !== 'undefined') ? firebaseConfig : (window.firebaseConfig || null);

if (!config) {
    console.error("firebaseConfig が見つかりません。firebase-config.js の読み込みを確認してください。");
}

// Firebaseアプリの初期化
const app = initializeApp(config);

// 各サービスのインスタンスを取得してエクスポート
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1'); // 必要に応じてリージョンを変更
const storage = getStorage(app);

// ★追加: フレンドリクエストの監視処理をこのファイル内で完結させる
// これにより、queryオブジェクトの受け渡しによるエラーと、権限エラーの両方を解決します
function subscribeToFriendRequests(userId, onUpdate, onError) {
    const friendRequestsRef = collection(db, "friendRequests");
    const q = query(
        friendRequestsRef,
        where("receiverId", "==", userId),
        where("status", "==", "pending")
    );

    return onSnapshot(q, (snapshot) => {
        const requests = [];
        snapshot.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
        });
        onUpdate(requests);
    }, onError);
}

// ★追加: ユーザー検索用クエリ
function createSearchUsersQuery(searchTerm) {
    const usersRef = collection(db, "users");
    return query(
        usersRef,
        where("displayName", ">=", searchTerm),
        where("displayName", "<=", searchTerm + '\uf8ff')
    );
}

// ★追加: 送信済みリクエスト確認用クエリ
function createSentRequestsQuery(senderId, receiverId) {
    const friendRequestsRef = collection(db, "friendRequests");
    return query(
        friendRequestsRef,
        where("senderId", "==", senderId),
        where("receiverId", "==", receiverId),
        where("status", "==", "pending")
    );
}

// ★追加: 受信済みリクエスト確認用クエリ
function createReceivedRequestsQuery(senderId, receiverId) {
    const friendRequestsRef = collection(db, "friendRequests");
    return query(
        friendRequestsRef,
        where("senderId", "==", senderId),
        where("receiverId", "==", receiverId),
        where("status", "==", "pending")
    );
}

// ★追加: フレンド関係かどうかをチェックする関数
async function checkIsFriend(myUid, targetUid) {
    // ★診断: IDが空でないかチェック
    if (!myUid || !targetUid) {
        throw new Error("ユーザーIDが取得できませんでした。");
    }

    try {
        const docRef = doc(db, "users", myUid, "friends", targetUid);
        const snap = await getDoc(docRef);
        return snap.exists();
    } catch (e) {
        console.error("checkIsFriend エラー:", e);
        throw e;
    }
}

// ★追加: 特定の申請が存在するかチェックする関数
async function checkRequestExists(senderId, receiverId) {
    // ★診断: IDが空でないかチェック
    if (!senderId || !receiverId) {
        throw new Error("ユーザーIDが取得できませんでした。");
    }

    try {
        const friendRequestsRef = collection(db, "friendRequests");
        const q = query(
            friendRequestsRef,
            where("senderId", "==", senderId),
            where("receiverId", "==", receiverId),
            where("status", "==", "pending")
        );
        const snap = await getDocs(q);
        return !snap.empty;
    } catch (e) {
        console.error("checkRequestExists エラー:", e);
        throw e;
    }
}

export { 
    auth, 
    db, 
    storage,
    functions,
    onAuthStateChanged, // ★追加: 認証状態監視関数もエクスポート
    // Firestore関数もここからエクスポート
    collection,
    query,
    where,
    getDocs,
    addDoc,
    onSnapshot,
    Timestamp,
    doc,
    getDoc,
    setDoc,
    orderBy,
    limit, // limitもエクスポートに追加
    ref,
    getDownloadURL,
    httpsCallable,
    subscribeToFriendRequests, // ★変更: 監視関数をエクスポート
    createSearchUsersQuery, // ★追加
    createSentRequestsQuery, // ★追加
    createReceivedRequestsQuery, // ★追加
    checkIsFriend, // ★追加
    checkRequestExists // ★追加
};
