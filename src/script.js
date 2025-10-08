// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', function() {

    // プロフィール情報のアニメーション
    const tickerItems = document.querySelectorAll('.ticker-item');
    let currentItemIndex = 0;

    // 4秒ごと（4000ミリ秒）に情報を切り替える
    setInterval(() => {
        // 現在表示されているアイテムから 'active' クラスを削除
        tickerItems[currentItemIndex].classList.remove('active');

        // 次のアイテムのインデックスを計算（末尾に来たら最初に戻る）
        currentItemIndex = (currentItemIndex + 1) % tickerItems.length;

        // 次のアイテムに 'active' クラスを追加して表示
        tickerItems[currentItemIndex].classList.add('active');
    }, 4000);

});