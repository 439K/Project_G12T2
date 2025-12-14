// ページのHTMLがすべて読み込まれてから、中のコードを実行する
document.addEventListener('DOMContentLoaded', function() {
    // --- ★追加: エラー診断コード ---
    // 1. Firebase SDK自体が読み込まれているか確認
    if (typeof firebase === 'undefined') {
        alert('【エラー】Firebase SDKが読み込まれていません。\nインターネット接続を確認するか、register.htmlのscriptタグを確認してください。');
        return;
    }
    // 2. Firebaseアプリが初期化されているか確認 (firebase-config.jsの読み込み確認)
    if (!firebase.apps.length) {
        alert('【エラー】Firebaseが初期化されていません。\nfirebase-config.js が正しく読み込まれていないか、中身の記述が間違っている可能性があります。\n(コンソールのエラーログも確認してください)');
        return;
    }
    // 3. Firestore SDKが読み込まれているか確認
    if (typeof firebase.firestore !== 'function') {
        alert('【エラー】Firestore SDKが読み込まれていません。\nregister.html に firebase-firestore.js の読み込みタグがあるか確認してください。');
        return;
    }
    // -----------------------------

    // Firebase Authのインスタンスを取得
    const auth = firebase.auth();


    const db = firebase.firestore();

    // エラーメッセージなどを日本語に設定
    auth.languageCode = 'ja';
    // HTMLからフォームや入力欄の要素を取得
    const registerForm = document.getElementById('registerForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    // 登録フォームが送信されたときの処理
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        if (password !== confirmPassword) {
            alert('パスワードが一致しません。');
            return;
        }

        try {
            // 1. Firebase Authでユーザー作成
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // 2. Firestoreにユーザー情報を保存
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 3. 完了メッセージと画面遷移
            alert('登録が完了しました！');
            window.location.href = './main.html';

        } catch (error) {
                console.error('Firebase登録エラー:', error);
                let errorMessage = "登録に失敗しました。";
                switch (error.code) {
                    case 'auth/invalid-email':
                        errorMessage = "メールアドレスの形式が正しくありません。";
                        break;
                    case 'auth/email-already-in-use':
                        errorMessage = "このメールアドレスは既に使用されています。";
                        break;
                    case 'auth/weak-password':
                        errorMessage = "パスワードは6文字以上で入力してください。";
                        break;
                    default:
                        errorMessage = "登録に失敗しました。\n" + error.message;
                        break;
                }
                alert(errorMessage);
        }
    });
});