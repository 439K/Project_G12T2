// ページのHTMLがすべて読み込まれてから、中のコードを実行する
document.addEventListener('DOMContentLoaded', function() {

    const auth = firebase.auth();
    
    // HTML要素を取得
    const usernameDisplay = document.getElementById('username-display');
    const settingsIcon = document.getElementById('settings-icon');
    // アニメーション対象を ticker の中の要素に限定
    const tickerItems = document.querySelectorAll('.profile-ticker .ticker-item');

    // ログイン状態の変化を監視する
    auth.onAuthStateChanged((user) => {
        if (user) {
            // --- ユーザーがログインしている場合の処理 ---
            console.log('ログイン中のユーザー:', user);

            const name = user.displayName || user.email;
            if (usernameDisplay) {
                usernameDisplay.textContent = name;
                
                // ユーザー名をクリックして変更する機能
                usernameDisplay.addEventListener('click', () => {
                    const currentName = user.displayName || '';
                    const newName = prompt('新しいユーザー名を入力してください:', currentName);

                    if (newName && newName.trim() !== '' && newName.trim() !== currentName) {
                        user.updateProfile({
                            displayName: newName.trim()
                        }).then(() => {
                            alert('ユーザー名を変更しました。');
                            usernameDisplay.textContent = newName.trim();
                        }).catch((error) => {
                            console.error('ユーザー名の更新エラー:', error);
                            alert('ユーザー名の変更に失敗しました。');
                        });
                    }
                });
            }

            // プロフィール情報のテロップアニメーションを開始
            startTickerAnimation();

        } else {
            // --- ユーザーがログインしていない場合の処理 ---
            console.log('ログインしていません。');
            // パスをフォルダ構成に合わせて修正
            window.location.href = '../html/login.html';
        }
    });

    // プロフィール情報のテロップアニメーション関数
    function startTickerAnimation() {
        if (tickerItems.length === 0) return;

        let currentItemIndex = 0; // 0番目(ユーザー名)が 'active' になっている

        // 4秒後に「最初の切り替え」を実行
        setTimeout(() => {
            
            // 最初のアイテム(ユーザー名)を非表示に
            tickerItems[currentItemIndex].classList.remove('active');
            
            // 次のアイテムのインデックスを計算
            currentItemIndex = (currentItemIndex + 1) % tickerItems.length;
            
            // 次のアイテムを表示
            tickerItems[currentItemIndex].classList.add('active');

            // --- 最初の切り替えの後、定期的なスライドショーを開始 ---
            setInterval(() => {
                tickerItems[currentItemIndex].classList.remove('active');
                currentItemIndex = (currentItemIndex + 1) % tickerItems.length;
                tickerItems[currentItemIndex].classList.add('active');
            }, 4000); // 4秒ごとに切り替え

        }, 4000); // 最初の4秒間はユーザー名を表示
    }
});
