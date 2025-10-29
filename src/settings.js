// ページのHTMLがすべて読み込まれてから、中のコードを実行する
document.addEventListener('DOMContentLoaded', function() {

    const auth = firebase.auth();
    
    // HTML要素を取得
    const settingsIcon = document.getElementById('logout-icon');
    //const profileGo = document.getElementById("")

     //設定アイコンにログアウト機能を追加
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

});