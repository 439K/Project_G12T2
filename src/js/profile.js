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

    // ★追加: ユーザーID表示・コピー用要素
    const userIdDisplay = document.getElementById('profile-user-id');
    const copyUidButton = document.getElementById('copy-uid-button');

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
            
            // 既存の表示処理
            if (usernameInput) usernameInput.value = user.displayName || '';
            if (usernameDisplay) usernameDisplay.textContent = user.displayName || 'ゲスト';
            
            // ★追加: ユーザーIDを表示
            if (userIdDisplay) {
                userIdDisplay.textContent = user.uid;
            }

            loadUserProfile(user.uid);
            updateUserStats(user.uid); 
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
                    const elTotal = document.getElementById('stat-total');
                    const elPrefs = document.getElementById('stat-prefs');
                    const elRate = document.getElementById('stat-rate');

                    if(elTotal) elTotal.textContent = data.stats.total || 0;
                    if(elPrefs) elPrefs.textContent = data.stats.prefs || 0;
                    if(elRate) elRate.textContent = (data.stats.rate || 0) + '%';
                }
            }
        }).catch(err => console.error("データ取得エラー", err));
    }

    // ▼ 統計情報の集計と更新
    async function updateUserStats(uid) {
        try {
            // 1. 進捗状況（progressサブコレクション）を全取得
            const progressSnapshot = await db.collection('users').doc(uid).collection('progress').get();
            
            let totalEarned = 0;
            let conqueredPrefs = 0;
            
            // 各都道府県のスタンプ総数定義
            const PREF_STAMP_TOTALS = {
                "hokkaido": 0, "aomori": 0, "iwate": 0, "miyagi": 0, "akita": 0, "yamagata": 0, "fukushima": 0,
                "ibaraki": 132, "tochigi": 75, "gunma": 105, "saitama": 216, "chiba": 177, "tokyo": 186, "kanagawa": 174,
                "niigata": 0, "toyama": 45, "ishikawa": 0, "fukui": 0, "yamanashi": 0, "nagano": 0, "gifu": 0, "shizuoka": 0, "aichi": 0,
                "mie": 0, "shiga": 0, "kyoto": 0, "osaka": 0, "hyogo": 0, "nara": 0, "wakayama": 0,
                "tottori": 0, "shimane": 0, "okayama": 0, "hiroshima": 0, "yamaguchi": 0,
                "tokushima": 0, "kagawa": 0, "ehime": 0, "kochi": 0,
                "fukuoka": 0, "saga": 0, "nagasaki": 0, "kumamoto": 0, "oita": 0, "miyazaki": 0, "kagoshima": 0, "okinawa": 0
            };

            // コンプ率計算用の分母（全スタンプ数）
            const totalStampsAllJapan = Object.values(PREF_STAMP_TOTALS).reduce((sum, num) => sum + num, 0);

            progressSnapshot.forEach(doc => {
                const prefId = doc.id;
                const data = doc.data();
                const cityStamps = data.stamps || {}; 

                let prefEarned = 0;
                
                // 各市町村の獲得レベルを加算
                Object.values(cityStamps).forEach(city => {
                    prefEarned += (city.level || 0);
                });

                totalEarned += prefEarned;

                // --- 制覇判定 ---
                const prefTotal = PREF_STAMP_TOTALS[prefId] || 0;
                if (prefTotal > 0 && prefEarned >= prefTotal) {
                    conqueredPrefs++;
                }
            });

            // コンプ率計算
            let rate = 0;
            if (totalStampsAllJapan > 0) {
                rate = ((totalEarned / totalStampsAllJapan) * 100).toFixed(1);
            }

            // 2. 画面表示を更新
            const statTotalEl = document.getElementById('stat-total');
            const statPrefsEl = document.getElementById('stat-prefs');
            const statRateEl = document.getElementById('stat-rate');

            if (statTotalEl) statTotalEl.textContent = totalEarned;
            if (statPrefsEl) statPrefsEl.textContent = conqueredPrefs;
            if (statRateEl) statRateEl.textContent = rate + '%';

            // 3. Firestoreに統計情報を保存
            await db.collection('users').doc(uid).set({
                stats: {
                    total: totalEarned,
                    prefs: conqueredPrefs,
                    rate: rate
                }
            }, { merge: true });

        } catch (error) {
            console.error("統計情報の更新に失敗:", error);
        }
    }

    // ▼ 画像アップロード処理
    async function uploadImage(file, path) {
        const storageRef = storage.ref(path + '/' + file.name);
        const snapshot = await storageRef.put(file);
        return await snapshot.ref.getDownloadURL();
    }


    // --- イベントリスナー ---

    // ★追加: IDコピーボタンのクリックイベント
    if (copyUidButton && userIdDisplay) {
        copyUidButton.addEventListener('click', () => {
            const uidText = userIdDisplay.textContent.trim();
            // まだ読み込み中や空の場合は何もしない
            if (!uidText || uidText === "読み込み中...") return;

            // クリップボードにコピー
            navigator.clipboard.writeText(uidText).then(() => {
                // 成功時の演出（アイコンをチェックマークに変更）
                const originalHtml = copyUidButton.innerHTML;
                copyUidButton.innerHTML = '<i class="fas fa-check"></i>';
                copyUidButton.style.color = 'green';
                
                // 2秒後に元に戻す
                setTimeout(() => {
                    copyUidButton.innerHTML = originalHtml;
                    copyUidButton.style.color = ''; // 色をリセット
                }, 2000);
            }).catch(err => {
                console.error('コピー失敗:', err);
                alert('IDのコピーに失敗しました');
            });
        });
    }

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