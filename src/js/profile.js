// src/profile.js

document.addEventListener('DOMContentLoaded', function() {
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();

    // HTML要素
    const usernameInput = document.getElementById('profile-username');
    const bioInput = document.getElementById('profile-bio');
    const saveButton = document.getElementById('save-profile-button');
    const usernameDisplay = document.getElementById('username-display');

    // 画像関連要素
    const coverImagePreview = document.getElementById('cover-image-preview');
    const avatarImagePreview = document.getElementById('profile-avatar-preview');
    const coverImageUpload = document.getElementById('cover-image-upload');
    const avatarImageUpload = document.getElementById('avatar-image-upload');
    const changeCoverButton = document.getElementById('change-cover-button');
    const changeAvatarButton = document.getElementById('change-avatar-button');

    let currentUser = null;
    let currentCoverUrl = '';   
    let currentAvatarUrl = '';

    // ログイン監視
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            if (usernameInput) usernameInput.value = user.displayName || '';
            if (usernameDisplay) usernameDisplay.textContent = user.displayName || 'ゲスト';
            loadUserProfile(user.uid);
        } else {
             window.location.href = 'login.html';
        }
    });

    // ▼ プロフィール読み込み
    function loadUserProfile(uid) {
        db.collection('users').doc(uid).get().then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                
                // 自己紹介
                if (bioInput && data.bio) bioInput.value = data.bio;
                
                // カバー画像 (ある場合だけ表示)
                if (data.coverUrl) {
                    coverImagePreview.src = data.coverUrl;
                    coverImagePreview.style.display = 'block'; // 表示する
                    currentCoverUrl = data.coverUrl;
                } else {
                    coverImagePreview.style.display = 'none'; // 非表示（背景色のみ）
                }
                
                // アバター画像
                if (data.avatarUrl) {
                    avatarImagePreview.src = data.avatarUrl;
                    currentAvatarUrl = data.avatarUrl;
                }

                // 統計
                if (data.stats) {
                    document.getElementById('stat-total').textContent = data.stats.total || 0;
                    document.getElementById('stat-prefs').textContent = data.stats.prefs || 0;
                    document.getElementById('stat-rate').textContent = (data.stats.rate || 0) + '%';
                }
            }
        }).catch(err => console.error("データ取得エラー", err));
    }


    // ▼ 画像アップロード処理
    async function uploadImage(file, path) {
        const storageRef = storage.ref(path + '/' + file.name);
        const snapshot = await storageRef.put(file);
        return await snapshot.ref.getDownloadURL();
    }


    // --- イベントリスナー ---

    // 1. カバー画像
    if (changeCoverButton) {
        changeCoverButton.addEventListener('click', () => coverImageUpload.click());
    }
    if (coverImageUpload) {
        coverImageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    coverImagePreview.src = ev.target.result;
                    coverImagePreview.style.display = 'block'; // 選択したら表示
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 2. アバター
    if (changeAvatarButton) {
        changeAvatarButton.addEventListener('click', () => avatarImageUpload.click());
    }
    if (avatarImageUpload) {
        avatarImageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    avatarImagePreview.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }


    // 3. 保存ボタン
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            if (!currentUser) return;

            const newUsername = usernameInput.value.trim();
            const newBio = bioInput.value.trim();
            const coverFile = coverImageUpload.files[0];
            const avatarFile = avatarImageUpload.files[0];

            if (!newUsername) {
                alert("ユーザー名は必須です。");
                return;
            }

            saveButton.disabled = true;
            saveButton.textContent = "保存中...";

            try {
                // 画像アップロード
                let finalCoverUrl = currentCoverUrl;
                if (coverFile) {
                    finalCoverUrl = await uploadImage(coverFile, `users/${currentUser.uid}/cover`);
                }

                let finalAvatarUrl = currentAvatarUrl;
                if (avatarFile) {
                    finalAvatarUrl = await uploadImage(avatarFile, `users/${currentUser.uid}/avatar`);
                }

                // Auth更新
                const authPromise = currentUser.updateProfile({ displayName: newUsername });

                // Firestore更新
                const firestoreData = {
                    displayName: newUsername,
                    bio: newBio,
                    coverUrl: finalCoverUrl,
                    avatarUrl: finalAvatarUrl,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                const dbPromise = db.collection('users').doc(currentUser.uid).set(firestoreData, { merge: true });

                await Promise.all([authPromise, dbPromise]);

                alert("プロフィールを保存しました！");
                if (usernameDisplay) usernameDisplay.textContent = newUsername;

                currentCoverUrl = finalCoverUrl;
                currentAvatarUrl = finalAvatarUrl;
                
                coverImageUpload.value = '';
                avatarImageUpload.value = '';

            } catch (error) {
                console.error("保存エラー:", error);
                alert("保存に失敗しました: " + error.message);
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = "変更を保存";
            }
        });
    }
});