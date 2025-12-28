document.addEventListener('DOMContentLoaded', () => {
    const currentEmailSpan = document.getElementById('current-email');
    const updateForm = document.getElementById('update-email-form');
    const messageArea = document.getElementById('message-area');
    const newEmailInput = document.getElementById('new-email');
    const passwordInput = document.getElementById('current-password');
    const submitButton = updateForm.querySelector('button[type="submit"]');

    // ログイン状態の監視
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentEmailSpan.textContent = user.email;
        } else {
            // 未ログインの場合はログインページへリダイレクト（必要に応じて）
            // window.location.href = 'login.html';
            currentEmailSpan.textContent = '未ログイン';
        }
    });

    updateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // メッセージエリアをクリア
        messageArea.textContent = '';
        messageArea.className = '';
        submitButton.disabled = true;

        const newEmail = newEmailInput.value;
        const password = passwordInput.value;
        const user = firebase.auth().currentUser;

        if (!user) {
            showMessage('ユーザーが見つかりません。再度ログインしてください。', 'error');
            submitButton.disabled = false;
            return;
        }

        if (newEmail === user.email) {
            showMessage('現在のメールアドレスと同じです。', 'error');
            submitButton.disabled = false;
            return;
        }

        try {
            // 重要な操作の前に再認証を行う
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await user.reauthenticateWithCredential(credential);

            // メールアドレスを更新
            await user.updateEmail(newEmail); // verifyBeforeUpdateEmailではなくupdateEmailを使用

            showMessage('メールアドレスを更新しました。', 'success');
            currentEmailSpan.textContent = newEmail;
            updateForm.reset();

        } catch (error) {
            console.error('Email update error:', error);
            let errorMessage = 'エラーが発生しました。';
            
            switch (error.code) {
                case 'auth/wrong-password':
                    errorMessage = 'パスワードが正しくありません。';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'メールアドレスの形式が正しくありません。';
                    break;
                case 'auth/email-already-in-use':
                    errorMessage = 'このメールアドレスは既に使用されています。';
                    break;
                case 'auth/requires-recent-login':
                    errorMessage = 'セッションが切れました。再度ログインしてください。';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Firebaseの設定により変更がブロックされました。コンソールの「Email enumeration protection」を無効にしてください。';
                    break;
                default:
                    errorMessage = error.message;
            }
            showMessage(errorMessage, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });

    function showMessage(msg, type) {
        messageArea.textContent = msg;
        messageArea.className = type === 'success' ? 'success-message' : 'error-message';
    }
});
