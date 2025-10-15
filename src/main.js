// ページのHTMLがすべて読み込まれてから、中のコードを実行する
document.addEventListener('DOMContentLoaded', function() {

    const auth = firebase.auth();
    
    // HTML要素を取得
    const usernameDisplay = document.getElementById('username-display');
    const settingsIcon = document.getElementById('settings-icon');
    const tickerItems = document.querySelectorAll('.ticker-item');

    // ログイン状態の変化を監視する（ページを開いた瞬間に実行される）
    auth.onAuthStateChanged((user) => {
        if (user) {
            // --- ユーザーがログインしている場合の処理 ---
            console.log('ログイン中のユーザー:', user);

            const name = user.displayName || user.email;
            if (usernameDisplay) {
                usernameDisplay.textContent = name;
                
                // ▼▼▼ ここからが追加部分 ▼▼▼
                // ユーザー名をクリックして変更する機能を追加
                usernameDisplay.addEventListener('click', () => {
                    const currentName = user.displayName || '';
                    const newName = prompt('新しいユーザー名を入力してください:', currentName);

                    // 新しい名前が入力され、キャンセルボタンが押されなかった場合
                    if (newName && newName.trim() !== '') {
                        user.updateProfile({
                            displayName: newName.trim()
                        }).then(() => {
                            // Firebaseプロフィールの更新に成功
                            alert('ユーザー名を変更しました。');
                            // 画面の表示もすぐに更新
                            usernameDisplay.textContent = newName.trim();
                        }).catch((error) => {
                            // 更新に失敗した場合
                            console.error('ユーザー名の更新エラー:', error);
                            alert('ユーザー名の変更に失敗しました。');
                        });
                    }
                });
                // ▲▲▲ ここまでが追加部分 ▲▲▲
            }

            // プロフィール情報のテロップアニメーションを開始
            startTickerAnimation();

        } else {
            // --- ユーザーがログインしていない場合の処理 ---
            console.log('ログインしていません。');
            window.location.href = 'login.html';
        }
    });

    // 設定アイコンにログアウト機能を追加
    if (settingsIcon) {
        settingsIcon.addEventListener('click', () => {
            if (confirm('ログアウトしますか？')) {
                auth.signOut().then(() => {
                    window.location.href = 'title.html';
                }).catch((error) => {
                    console.error('ログアウトエラー', error);
                });
            }
        });
    }

    // プロフィール情報のテロップアニメーション関数
    function startTickerAnimation() {
        let currentItemIndex = 0;
        setInterval(() => {
            if (tickerItems.length > 0) {
                tickerItems[currentItemIndex].classList.remove('active');
                currentItemIndex = (currentItemIndex + 1) % tickerItems.length;
                tickerItems[currentItemIndex].classList.add('active');
            }
        }, 4000);
    }
});

