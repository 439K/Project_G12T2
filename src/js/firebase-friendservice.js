// src/friendService.js

import {
  db, 
  auth, 
  // functions, // fetchを使うため不要
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
  // httpsCallable, // fetchを使うため不要
  subscribeToFriendRequests,
  createSearchUsersQuery,
  createSentRequestsQuery,
  createReceivedRequestsQuery,
  checkIsFriend,
  checkRequestExists
} from './firebase-service.js';

// ----------------------------------------------------
// ヘルパー関数
// ----------------------------------------------------

// 現在ログインしているユーザー情報を取得するヘルパー
function getCurrentUser() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("ユーザーがログインしていません。");
  }
  return currentUser;
}

// ★追加: Cloud Functionsを直接fetchで呼び出すヘルパー関数
// SDKの認証トラブルを回避するため、手動でトークンをヘッダーに付与します
async function callFunction(functionName, data) {
    const currentUser = getCurrentUser();
    
    // 1. 最新の認証トークンを取得
    const token = await currentUser.getIdToken(true);
    
    // 2. プロジェクトIDを取得してURLを構築
    const projectId = db.app.options.projectId;
    if (!projectId) throw new Error("Project IDが見つかりません。firebase-config.jsを確認してください。");
    
    const region = 'us-central1';
    const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
    
    // 3. fetchで直接送信
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // ★ここで確実にトークンを渡す
        },
        body: JSON.stringify(data) // ★修正: onRequest用にシンプルにデータを送る
    });

    // 4. レスポンス処理
    const json = await response.json();
    
    if (!response.ok) {
        console.error(`サーバーエラー: ${response.status}`, json);
        const msg = json.error?.message || `サーバーエラー: ${response.status}`;
        throw new Error(msg);
    }

    if (json.error) {
        throw new Error(json.error.message || "Function returned error");
    }
    
    return json.result;
}

// ----------------------------------------------------
// 1. ユーザー検索機能
// ----------------------------------------------------
export async function searchUsers(searchTerm) {
  const currentUser = getCurrentUser();

  if (!searchTerm.trim()) {
    return [];
  }

  const foundUsersMap = new Map();

  try {
    const docRef = doc(db, "users", searchTerm);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
       const userData = docSnap.data();
       const uid = docSnap.id;
       if (uid !== currentUser.uid) {
         foundUsersMap.set(uid, {
            uid: uid,
            displayName: userData.displayName || "名無しユーザー",
            ...userData
         });
       }
    }
  } catch (e) {
    // 無視
  }

  const q = createSearchUsersQuery(searchTerm);
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((doc) => {
    const userData = doc.data();
    const uid = doc.id;
    if (uid !== currentUser.uid) {
      foundUsersMap.set(uid, {
        uid: uid,
        displayName: userData.displayName || "名無しユーザー", 
        ...userData
      });
    }
  });

  return Array.from(foundUsersMap.values());
}

// ----------------------------------------------------
// 2. フレンドリクエスト送信機能
// ----------------------------------------------------
export async function sendFriendRequest(receiverUser) {
  const currentUser = getCurrentUser();
  const friendRequestsRef = collection(db, "friendRequests");

  const isFriend = await checkIsFriend(currentUser.uid, receiverUser.uid);
  if (isFriend) {
    throw new Error("すでにフレンド登録済みです。");
  }

  const isSent = await checkRequestExists(currentUser.uid, receiverUser.uid);
  if (isSent) {
    throw new Error("すでにフレンドリクエストを送信済みです。");
  }

  const isReceived = await checkRequestExists(receiverUser.uid, currentUser.uid);
  if (isReceived) {
    throw new Error("相手からフレンドリクエストが届いています。リクエスト一覧を確認してください。");
  }

  await addDoc(friendRequestsRef, {
    senderId: currentUser.uid,
    senderDisplayName: currentUser.displayName || "名無し",
    receiverId: receiverUser.uid,
    receiverDisplayName: receiverUser.displayName || "名無し",
    status: "pending",
    timestamp: Timestamp.now()
  });
  
  console.log(`フレンドリクエストを ${receiverUser.displayName} に送信しました！`);
}

// ----------------------------------------------------
// 3. 届いたフレンドリクエストのリアルタイム表示
// ----------------------------------------------------
export function listenForFriendRequests(callback) {
  const currentUser = getCurrentUser();
  return subscribeToFriendRequests(
    currentUser.uid,
    (requests) => callback(requests),
    (error) => console.error("フレンドリクエストの監視中にエラーが発生しました:", error)
  );
}

// ----------------------------------------------------
// 4. フレンドリクエストの承認/拒否機能 (Cloud Functions経由)
// ----------------------------------------------------
export async function handleFriendRequest(
  requestId,
  action,
  senderId,
  senderDisplayName,
  receiverId,
  receiverDisplayName
) {
  try {
    // ★修正: callFunction (fetch) を使用
    const result = await callFunction('handleFriendRequest', {
      requestId,
      action,
      senderId,
      senderDisplayName,
      receiverId,
      receiverDisplayName
    });
    
    console.log(`リクエスト ${requestId} を${action === 'accept' ? '承認' : '拒否'}しました。`, result);
    return result;
  } catch (error) {
    console.error("フレンドリクエスト処理エラー:", error);
    throw error;
  }
}

// ----------------------------------------------------
// 5. フレンドリストのリアルタイム表示
// ----------------------------------------------------
export function listenForFriends(callback) {
  const currentUser = getCurrentUser();

  try {
    const path = `users/${currentUser.uid}/friends`;
    const friendsCollectionRef = collection(db, path);
    
    const unsubscribe = onSnapshot(friendsCollectionRef, (snapshot) => {
      const friendsList = [];
      snapshot.forEach((doc) => {
        friendsList.push(doc.data());
      });
      callback(friendsList);
    }, (error) => {
      console.error("フレンドリストの監視中にエラーが発生しました:", error);
    });

    return unsubscribe;
  } catch (e) {
    console.error("❌ listenForFriends 内でクリティカルエラー:", e);
    return () => {};
  }
}

// ----------------------------------------------------
// 6. フレンド解除機能 (Cloud Functions経由)
// ----------------------------------------------------
export async function unfriendUser(friendUid) {
  const currentUser = getCurrentUser();

  try {
    // ★修正: callFunction (fetch) を使用
    const result = await callFunction('unfriendUser', {
      myUid: currentUser.uid,
      friendUid: friendUid
    });
    
    console.log(`${friendUid}さんとのフレンド関係を解除しました。`, result);
    return result;
  } catch (error) {
    console.error("フレンド解除エラー:", error);
    throw error;
  }
}
