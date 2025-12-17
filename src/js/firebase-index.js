
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Firebase Admin SDKを初期化
// Cloud Functions環境では自動的にプロジェクトの設定が読み込まれる
admin.initializeApp();
const db = admin.firestore(); // Firestoreへの参照

// ----------------------------------------------------
// 1. フレンドリクエストの承認/拒否処理
// ----------------------------------------------------
exports.handleFriendRequest = functions.https.onCall(async (data, context) => {
  // 認証チェック: 呼び出し元がログインしているか確認
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '認証が必要です。');
  }

  // データのバリデーション: クライアントから受け取ったデータの形式と内容を確認
  const { requestId, action, senderId, senderDisplayName, receiverId, receiverDisplayName } = data;

  if (!requestId || !action || !senderId || !senderDisplayName || !receiverId || !receiverDisplayName) {
    throw new functions.https.HttpsError('invalid-argument', '必須データが不足しています。');
  }
  if (!['accept', 'reject'].includes(action)) {
    throw new functions.https.HttpsError('invalid-argument', '無効なアクションです。');
  }
  // 呼び出し元がリクエストの受信者であることを確認 (セキュリティ上重要)
  if (context.auth.uid !== receiverId) {
    throw new functions.https.HttpsError('permission-denied', 'このリクエストを処理する権限がありません。');
  }

  const requestDocRef = db.collection('friendRequests').doc(requestId); // リクエストドキュメントへの参照
  const myFriendDocRef = db.collection('users').doc(receiverId).collection('friends').doc(senderId); // 自分のフレンドリストへの参照
  const senderFriendDocRef = db.collection('users').doc(senderId).collection('friends').doc(receiverId); // 相手のフレンドリストへの参照

  // Firestoreトランザクションを開始
  // 複数のデータベース操作をアトミック（全て成功するか、全て失敗するか）に実行するために使用
  const result = await db.runTransaction(async (transaction) => {
    const requestDoc = await transaction.get(requestDocRef); // リクエストドキュメントをトランザクション内で取得

    // リクエストが存在しない、または既に処理済みの場合はエラー
    if (!requestDoc.exists || requestDoc.data().status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'リクエストは存在しないか、既に処理済みです。');
    }

    if (action === 'accept') {
      // 1. フレンドリクエストのステータスを'accepted'に更新
      transaction.update(requestDocRef, { status: 'accepted' });

      // 2. 自分のフレンドリストに送信者を追加
      transaction.set(myFriendDocRef, {
        uid: senderId,
        displayName: senderDisplayName,
        acceptedAt: admin.firestore.FieldValue.serverTimestamp() // サーバー側でタイムスタンプを生成
      });

      // 3. 送信者のフレンドリストに自分を追加
      transaction.set(senderFriendDocRef, {
        uid: receiverId,
        displayName: receiverDisplayName,
        acceptedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { message: 'フレンドリクエストを承認しました。' };

    } else if (action === 'reject') {
      // 1. フレンドリクエストのステータスを'rejected'に更新 (またはドキュメントを削除)
      transaction.update(requestDocRef, { status: 'rejected' });
      // transaction.delete(requestDocRef); // リクエストドキュメントを削除したい場合はこちら

      return { message: 'フレンドリクエストを拒否しました。' };
    }
  });
  return result;
});

// ----------------------------------------------------
// 2. フレンド解除処理
// ----------------------------------------------------
exports.unfriendUser = functions.https.onCall(async (data, context) => {
  // 認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '認証が必要です。');
  }

  // データのバリデーション
  const { myUid, friendUid } = data;
  if (!myUid || !friendUid) {
    throw new functions.https.HttpsError('invalid-argument', '必須データが不足しています。');
  }
  // 呼び出し元が自分のUIDであることを確認
  if (context.auth.uid !== myUid) {
    throw new functions.https.HttpsError('permission-denied', 'この操作を実行する権限がありません。');
  }

  // 自分のフレンドリストから相手を削除
  const mySideFriendDocRef = db.collection('users').doc(myUid).collection('friends').doc(friendUid);
  // 相手のフレンドリストから自分を削除
  const otherSideFriendDocRef = db.collection('users').doc(friendUid).collection('friends').doc(myUid);

  // Firestoreトランザクションを開始
  const result = await db.runTransaction(async (transaction) => {
    // 1. 自分のフレンドリストから相手のドキュメントを削除
    transaction.delete(mySideFriendDocRef);

    // 2. 相手のフレンドリストから自分のドキュメントを削除
    // 相手がブロックしているなど、相手側のドキュメントが存在しない可能性も考慮するが、
    // フレンド関係であれば両方に存在するのが前提のため、ここでは単純に削除を試みる
    transaction.delete(otherSideFriendDocRef);

    return { message: 'フレンド関係を解除しました。' };
  });
  return result;
});
