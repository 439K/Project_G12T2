// ページのHTMLがすべて読み込まれてから、中のコードを実行する
document.addEventListener('DOMContentLoaded', function() {
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
        // Firebaseの機能を使って新しいユーザーを作成
        auth.createUserWithEmailAndPassword(email, password)

            .then((userCredential) => {
                // 成功したら、userCredentialからユーザーオブジェクトを正しく取得

                const user = userCredential.user; 
                //console.log('Firebase Authにユーザー登録成功:', user);

                // 2. そのユーザーのUIDを使ってFirestoreにデータを保存
                // ここでPromiseをreturnすることで、次の.then()がこのFirestore処理の完了を待つ
                return db.collection('users').doc(user.uid).set({
                    email: user.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp() // 登録日時をサーバー側で取得
            
                alert('登録が完了しました！');
                console.log('登録成功:', userCredential.user);
                // 変更点: 同じ階層のmain.htmlへ移動
                window.location.href = './main.html';
            })
            .catch((error) => {
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
            });
    });
});