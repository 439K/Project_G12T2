document.addEventListener('DOMContentLoaded', () => {
    const updateForm = document.getElementById('update-password-form');
    const messageArea = document.getElementById('message-area');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const submitButton = updateForm.querySelector('button[type="submit"]');

    // ログイン状態の監視
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            // 未ログインの場合はログインページへ（必要に応じて）
            // window.location.href = 'login.html';
        }
    });

    updateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        messageArea.textContent = '';
        messageArea.className = '';
        submitButton.disabled = true;

        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const user = firebase.auth().currentUser;

        if (!user) {
            showMessage('ユーザーが見つかりません。再度ログインしてください。', 'error');
            submitButton.disabled = false;
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage('新しいパスワードが一致しません。', 'error');
            submitButton.disabled = false;
            return;
        }

        if (newPassword.length < 6) {
            showMessage('パスワードは6文字以上で設定してください。', 'error');
            submitButton.disabled = false;
            return;
        }

        try {
            // セキュリティのため、現在のパスワードで再認証を行う
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);

            // パスワードを更新
            await user.updatePassword(newPassword);

            showMessage('パスワードを変更しました。', 'success');
            updateForm.reset();

        } catch (error) {
            console.error('Password update error:', error);
            let errorMessage = 'エラーが発生しました。';
            
            switch (error.code) {
                case 'auth/wrong-password':
                    errorMessage = '現在のパスワードが正しくありません。';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'パスワードが脆弱です。より強力なパスワードにしてください。';
                    break;
                case 'auth/requires-recent-login':
                    errorMessage = 'セッションが切れました。再度ログインしてください。';
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