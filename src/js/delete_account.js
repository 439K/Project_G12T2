document.addEventListener('DOMContentLoaded', () => {
    const deleteForm = document.getElementById('delete-account-form');
    const messageArea = document.getElementById('message-area');
    const passwordInput = document.getElementById('current-password');
    const deleteButton = deleteForm.querySelector('button[type="submit"]');
    const deleteUsernameSpan = document.getElementById('delete-username');
    const deleteEmailSpan = document.getElementById('delete-email');

    // ログイン状態の監視
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            if (deleteUsernameSpan) deleteUsernameSpan.textContent = user.displayName || '（未設定）';
            if (deleteEmailSpan) deleteEmailSpan.textContent = user.email;
        } else {
            // 未ログインの場合はログインページへ
            // window.location.href = 'login.html';
        }
    });

    deleteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!confirm('本当にアカウントを削除しますか？\nこの操作は元に戻せません。')) {
            return;
        }

        messageArea.textContent = '';
        messageArea.className = '';
        deleteButton.disabled = true;
        deleteButton.textContent = '削除処理中...';

        const password = passwordInput.value;
        const user = firebase.auth().currentUser;

        if (!user) {
            showMessage('ユーザーが見つかりません。再度ログインしてください。', 'error');
            deleteButton.disabled = false;
            return;
        }

        try {
            // 1. セキュリティのため再認証
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await user.reauthenticateWithCredential(credential);

            // 2. Firestoreデータの削除
            const db = firebase.firestore();

            // (A) フレンド情報の削除処理
            const friendsSnapshot = await db.collection('users').doc(user.uid).collection('friends').get();
            
            if (!friendsSnapshot.empty) {
                deleteButton.textContent = 'フレンド情報を削除中...';
                
                // Cloud Functionsを直接fetchで叩く準備
                // firebase.app().options.projectId が取れない場合があるので firebaseConfig から取る
                const projectId = (typeof firebaseConfig !== 'undefined' && firebaseConfig.projectId) 
                                  ? firebaseConfig.projectId 
                                  : firebase.app().options.projectId;
                
                if (!projectId) throw new Error("プロジェクトIDが取得できません。");

                const region = 'us-central1'; // デフォルトリージョン
                const unfriendUrl = `https://${region}-${projectId}.cloudfunctions.net/unfriendUser`;
                const token = await user.getIdToken();

                const friendDeletionPromises = [];

                friendsSnapshot.forEach(doc => {
                    const friendUid = doc.id;
                    
                    // 1. fetchで直接呼び出し (onCall形式のため body に data プロパティが必要)
                    const p = fetch(unfriendUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            data: {
                                myUid: user.uid,
                                friendUid: friendUid
                            }
                        })
                    }).then(async (res) => {
                        if (!res.ok) {
                            // エラーの詳細をコンソールに出力して、原因特定しやすくする
                            const errText = await res.text();
                            console.error(`フレンド解除APIエラー (${friendUid}): ${res.status}`, errText);
                            throw new Error(`HTTP Error: ${res.status}`);
                        }
                        const json = await res.json();
                        if (json.error) throw new Error(json.error.message);
                    }).catch(err => {
                        // 個別のフレンド解除失敗はログに出して続行する（アカウント削除を優先）
                        console.error(`フレンド解除失敗 (${friendUid}):`, err);
                    });

                    friendDeletionPromises.push(p);
                });

                // 並行して実行
                await Promise.all(friendDeletionPromises);
            }

            // (B) スタンプ獲得履歴（progressサブコレクション）の削除処理
            const progressSnapshot = await db.collection('users').doc(user.uid).collection('progress').get();
            if (!progressSnapshot.empty) {
                const progressBatch = db.batch();
                progressSnapshot.forEach(doc => progressBatch.delete(doc.ref));
                await progressBatch.commit();
            }

            // (C) ユーザー本体のドキュメント削除
            await db.collection('users').doc(user.uid).delete();

            // 3. アカウント削除
            await user.delete();

            alert('アカウントを削除しました。ご利用ありがとうございました。');
            window.location.href = 'login.html';

        } catch (error) {
            console.error('Account deletion error:', error);
            let errorMessage = 'エラーが発生しました。';
            
            switch (error.code) {
                case 'auth/wrong-password':
                    errorMessage = 'パスワードが正しくありません。';
                    break;
                case 'auth/requires-recent-login':
                    errorMessage = 'セッションが切れました。再度ログインしてください。';
                    break;
                default:
                    errorMessage = error.message;
            }
            showMessage(errorMessage, 'error');
            deleteButton.disabled = false;
            deleteButton.textContent = 'アカウントを完全に削除する';
        }
    });

    function showMessage(msg, type) {
        messageArea.textContent = msg;
        messageArea.className = type === 'success' ? 'success-message' : 'error-message';
    }
});