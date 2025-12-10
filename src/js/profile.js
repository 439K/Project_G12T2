// src/profile.js

document.addEventListener('DOMContentLoaded', function() {
    
    const auth = firebase.auth();

    // HTML要素を取得
    const usernameInput = document.getElementById('profile-username');
    const bioInput = document.getElementById('profile-bio');
    const saveButton = document.getElementById('save-profile-button');
    // const avatarPreview = document.getElementById('profile-avatar-preview');

    let currentUser = null;

    // ログイン状態の監視
    auth.onAuthStateChanged((user) => {
        if (user) {
            // --- ユーザーがログインしている ---
            currentUser = user;
            console.log('プロフィール編集ページ: ログイン中', user);
            
            // 既存の情報をフォームにセット
            usernameInput.value = user.displayName || '';

            // TODO: 自己紹介文 (bio) は Firestore などに保存する必要がある
            // (ここではダミーのテキストを入れています)
            // bioInput.value = "自己紹介が読み込まれました";

        } else {
            // --- ユーザーがログインしていない ---
            console.log('プロフィール編集ページ: ログインしていません。');
            window.location.href = 'login.html'; // ログインページに戻す
        }
    });

    // 保存ボタンのクリック処理
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            if (!currentUser) {
                alert('ユーザー情報が読み込めていません。');
                return;
            }

            const newUsername = usernameInput.value.trim();
            // const newBio = bioInput.value.trim();

            if (newUsername === '') {
                alert('ユーザー名は空にできません。');
                return;
            }

            // Firebase Authentication のプロフィール (displayName) を更新
            currentUser.updateProfile({
                displayName: newUsername
            }).then(() => {
                alert('プロフィールを保存しました！');
                
                // TODO: 自己紹介文 (bio) もFirestoreなどに保存する処理をここに追加
                
            }).catch((error) => {
                console.error('プロフィール更新エラー:', error);
                alert('プロフィールの保存に失敗しました。');
            });
        });
    }
});