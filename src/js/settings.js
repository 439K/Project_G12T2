// ページのHTMLがすべて読み込まれてから、中のコードを実行する
document.addEventListener('DOMContentLoaded', function() {

    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // HTML要素を取得
    const settingsIcon = document.getElementById('logout-icon');
    //const profileGo = document.getElementById("")

     //設定アイコンにログアウト機能を追加
    if (settingsIcon) {
        settingsIcon.addEventListener('click', () => {
            if (confirm('ログアウトしますか？')) {
                auth.signOut().then(() => {
                    window.location.href = './title.html';
                }).catch((error) => {
                    console.error('ログアウトエラー', error);
                });
            }
        });
    }

    // プライバシー設定の読み込みと保存
    auth.onAuthStateChanged((user) => {
        if (user) {
            const privacyToggle = document.getElementById('privacy-toggle');
            if (privacyToggle) {
                // 1. 現在の設定を読み込んでスイッチに反映 (デフォルトは公開=true)
                db.collection('users').doc(user.uid).get().then((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        privacyToggle.checked = data.isProfilePublic !== false;
                    }
                });

                // 2. スイッチ切り替え時にFirestoreを更新
                privacyToggle.addEventListener('change', (e) => {
                    db.collection('users').doc(user.uid).set({
                        isProfilePublic: e.target.checked
                    }, { merge: true });
                });
            }
        }
    });
});