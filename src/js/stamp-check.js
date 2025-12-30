// stamp-check.js

// このスクリプトは prefecture-data.js の後に読み込む必要があります。

document.addEventListener('DOMContentLoaded', () => {

    const checkPrefectureBtn = document.getElementById('check-stamp-prefecture-btn');

    if (checkPrefectureBtn) {
        checkPrefectureBtn.addEventListener('click', async () => {
            checkPrefectureBtn.disabled = true;
            checkPrefectureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 判定中...';

            try {
                // 1. 位置情報を取得
                const position = await getCurrentPosition();
                const { latitude, longitude } = position.coords;

                // 2. 座標から住所（特に都道府県）を取得
                const address = await reverseGeocode(latitude, longitude);

                // 3. 取得した住所情報をコンソールに出力してデバッグ
                console.log('Reverse geocoded address:', address);

                if (address && address.prefecture) {
                    const prefectureName = address.prefecture;
                    console.log(`Found prefecture name: "${prefectureName}"`);
                    
                    // 4. 取得した都道府県名がprefecturePathsに存在するかチェック
                    if (prefecturePaths[prefectureName]) {
                        const destinationUrl = prefecturePaths[prefectureName];
                        console.log(`Match found in prefecturePaths. Redirecting to ${destinationUrl}`);
                        window.location.href = `${destinationUrl}?autocheck=true`;
                        return; // 処理終了
                    } else {
                        // 都道府県名は取得できたが、prefecturePathsのキーと一致しない場合
                        console.warn(`Prefecture "${prefectureName}" was found, but does not exist as a key in prefecturePaths.`);
                        alert(`現在地の都道府県「${prefectureName}」はシステムに登録されていません。`);
                    }
                } else {
                    // 5. 住所情報が取れなかったか、都道府県名が含まれていなかった場合
                    console.log('Could not determine prefecture from address object.');
                    alert('日本のいずれかの都道府県のエリア内にいません...');
                }

            } catch (error) {
                console.error('Geolocation or reverse geocoding error:', error);
                alert(`エラーが発生しました: ${error.message}`);
            }

            // ボタンを元の状態に戻す
            checkPrefectureBtn.disabled = false;
            checkPrefectureBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> 現在地でスタンプをチェック';
        });
    }

    // --- Helper Functions (from header.js) ---

    // 位置情報取得をPromiseでラップする関数
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("お使いのブラウザでは位置情報がサポートされていません。"));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            });
        });
    }

    // 逆ジオコーディング (座標 -> 住所) を行う関数
    async function reverseGeocode(lat, lon) {
        try {
            // OpenStreetMapのNominatim APIを使用
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ja`);
            if (!response.ok) {
                throw new Error(`逆ジオコーディングAPIへのリクエストに失敗しました (Status: ${response.status})`);
            }
            
            const data = await response.json();
            if (!data || !data.address) {
                throw new Error("APIから有効な住所データが返されませんでした。");
            }
            
            const addr = data.address;

            // 都道府県名を取得 (様々なキーの可能性に対応)
            let prefecture = addr.province || addr.prefecture || addr.state || addr.region || "";

            // display_nameから抽出を試みる (最も確実性が高い)
            if (!prefecture && data.display_name) {
                const prefs = Object.keys(prefecturePaths); // prefecture-data.jsのキーをそのまま利用
                for (const p of prefs) {
                    if (data.display_name.includes(p)) {
                        prefecture = p;
                        break;
                    }
                }
            }

            // 東京23区の場合の補完
            const city = addr.city || addr.ward || addr.town || addr.village || "";
            const tokyoWards = ["千代田区", "中央区", "港区", "新宿区", "文京区", "台東区", "墨田区", "江東区", "品川区", "目黒区", "大田区", "世田谷区", "渋谷区", "中野区", "杉並区", "豊島区", "北区", "荒川区", "板橋区", "練馬区", "足立区", "葛飾区", "江戸川区"];
            if (!prefecture && tokyoWards.includes(city)) {
                prefecture = "東京都";
            }
            
            return { prefecture, city };

        } catch (e) {
            console.error("Reverse geocode failed:", e);
            // エラーを再スローして、呼び出し元でキャッチできるようにする
            throw new Error(`住所の取得に失敗しました: ${e.message}`);
        }
    }
});

