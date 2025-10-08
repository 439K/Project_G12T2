// ページのHTMLがすべて読み込まれてから、中のコードを実行する
document.addEventListener('DOMContentLoaded', function() {

    // Firebase Authのインスタンスを取得
    const auth = firebase.auth();
    // エラーメッセージなどを日本語に設定
    auth.languageCode = 'ja';

    // HTMLからフォームや入力欄の要素を取得
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // ログインフォームが送信されたときの処理
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;

        // Firebaseの機能を使ってログイン
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                alert('ログインしました！');
                console.log('ログイン成功:', userCredential.user);
                window.location.href = 'main.html';
            })
            .catch((error) => {
                console.error('Firebaseログインエラー:', error);
                let errorMessage = "ログインに失敗しました。";

                switch (error.code) {
                    case 'auth/invalid-email':
                        errorMessage = "メールアドレスの形式が正しくありません。";
                        break;
                    case 'auth/invalid-credential':
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage = "メールアドレスまたはパスワードが間違っています。";
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = "試行回数が上限を超えました。しばらく時間をおいてから再度お試しください。";
                        break;
                    // ▼▼▼ internal-errorに対応するケースを追加しました ▼▼▼
                    case 'auth/internal-error':
                        errorMessage = "認証サーバーで内部エラーが発生しました。プロジェクトの設定を確認するか、時間をおいて再度お試しください。";
                        break;
                    default:
                        console.log('未知のエラーコード:', error.code);
                        errorMessage = "ログインに失敗しました。時間をおいて再度お試しください。";
                        break;
                }
                alert(errorMessage);
            });
    });
});

