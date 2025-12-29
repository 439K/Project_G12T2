// ページのHTMLがすべて読み込まれてから、中のコードを実行する
document.addEventListener('DOMContentLoaded', function() {

    const auth = firebase.auth();
    
    // HTML要素を取得
    const usernameDisplay = document.getElementById('username-display');
    
    // アニメーション対象を ticker の中の要素に限定
    // ※ページによっては要素数が異なる場合があるため、処理内で都度確認します
    const tickerItems = document.querySelectorAll('.profile-ticker .ticker-item');

    // ログイン状態の変化を監視する
    auth.onAuthStateChanged((user) => {
        if (user) {
            // --- ユーザーがログインしている場合の処理 ---

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
            
            // 現在地と収集率の情報を更新
            updateHeaderInfo(user);

        } else {
            // --- ユーザーがログインしていない場合の処理 ---
            // ログインページへリダイレクト（必要に応じてコメントアウトを解除）
            // window.location.href = '../html/login.html';
        }
    });

    // プロフィール情報のテロップアニメーション関数
    function startTickerAnimation() {
        if (tickerItems.length === 0) return;

        let currentItemIndex = 0; // 0番目(ユーザー名)が 'active' になっている

        // 4秒後に「最初の切り替え」を実行
        setTimeout(() => {
            if (tickerItems[currentItemIndex]) {
                tickerItems[currentItemIndex].classList.remove('active');
            }
            
            // 次のアイテムのインデックスを計算
            currentItemIndex = (currentItemIndex + 1) % tickerItems.length;
            
            if (tickerItems[currentItemIndex]) {
                tickerItems[currentItemIndex].classList.add('active');
            }

            // --- 最初の切り替えの後、定期的なスライドショーを開始 ---
            setInterval(() => {
                if (tickerItems[currentItemIndex]) {
                    tickerItems[currentItemIndex].classList.remove('active');
                }
                currentItemIndex = (currentItemIndex + 1) % tickerItems.length;
                if (tickerItems[currentItemIndex]) {
                    tickerItems[currentItemIndex].classList.add('active');
                }
            }, 4000); // 4秒ごとに切り替え

        }, 4000); // 最初の4秒間はユーザー名を表示
    }

    // ▼▼▼ 追加機能: 現在地と収集率の更新 ▼▼▼

    const PREF_NAME_TO_ID = {
        "北海道": "hokkaido", "青森県": "aomori", "岩手県": "iwate", "宮城県": "miyagi", "秋田県": "akita", "山形県": "yamagata", "福島県": "fukushima",
        "茨城県": "ibaraki", "栃木県": "tochigi", "群馬県": "gunma", "埼玉県": "saitama", "千葉県": "chiba", "東京都": "tokyo", "神奈川県": "kanagawa",
        "新潟県": "niigata", "富山県": "toyama", "石川県": "ishikawa", "福井県": "fukui", "山梨県": "yamanashi", "長野県": "nagano", "岐阜県": "gifu", "静岡県": "shizuoka", "愛知県": "aichi",
        "三重県": "mie", "滋賀県": "shiga", "京都府": "kyoto", "大阪府": "osaka", "兵庫県": "hyogo", "奈良県": "nara", "和歌山県": "wakayama",
        "鳥取県": "tottori", "島根県": "shimane", "岡山県": "okayama", "広島県": "hiroshima", "山口県": "yamaguchi",
        "徳島県": "tokushima", "香川県": "kagawa", "愛媛県": "ehime", "高知県": "kochi",
        "福岡県": "fukuoka", "佐賀県": "saga", "長崎県": "nagasaki", "熊本県": "kumamoto", "大分県": "oita", "宮崎県": "miyazaki", "鹿児島県": "kagoshima", "沖縄県": "okinawa"
    };

    // ▼▼▼ スタンプ総数設定 ▼▼▼
    // 各都道府県のスタンプ枚数をここに設定してください。
    // ※現在は仮の値(0)を入れています。正しい数値に書き換えてください。
    const PREF_STAMP_TOTALS = {
        "hokkaido": 0, "aomori": 0, "iwate": 0, "miyagi": 0, "akita": 0, "yamagata": 0, "fukushima": 0,
        "ibaraki": 132, "tochigi": 75, "gunma": 105, "saitama": 216, "chiba": 177, "tokyo": 186, "kanagawa": 174,
        "niigata": 0, "toyama": 45, "ishikawa": 0, "fukui": 0, "yamanashi": 0, "nagano": 0, "gifu": 0, "shizuoka": 0, "aichi": 0,
        "mie": 0, "shiga": 0, "kyoto": 0, "osaka": 0, "hyogo": 0, "nara": 0, "wakayama": 0,
        "tottori": 0, "shimane": 0, "okayama": 0, "hiroshima": 0, "yamaguchi": 0,
        "tokushima": 0, "kagawa": 0, "ehime": 0, "kochi": 0,
        "fukuoka": 0, "saga": 0, "nagasaki": 0, "kumamoto": 0, "oita": 0, "miyazaki": 0, "kagoshima": 0, "okinawa": 0
    };

    async function updateHeaderInfo(user) {
        const db = firebase.firestore();
        
        // 要素をIDで取得（安全のため）
        const locationEl = document.getElementById('header-location');
        const localRateEl = document.getElementById('header-local-rate');
        const nationalRateEl = document.getElementById('header-national-rate');

        // -------------------------------------------------
        // 1. 現在地の取得
        // -------------------------------------------------
        let currentPrefecture = "";
        let currentCity = "";
        let locationText = "現在地: 取得失敗";

        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;

            // 座標から住所を取得 (Nominatim API)
            const address = await reverseGeocode(latitude, longitude);
            
            if (address && (address.prefecture || address.city)) {
                currentPrefecture = address.prefecture || "";
                currentCity = address.city || "";
                // 都道府県と市区町村を結合して表示
                const addrStr = [currentPrefecture, currentCity].filter(s => s).join(" ");
                locationText = `現在地: ${addrStr}`;
            } else {
                locationText = "現在地: 住所不明";
            }
        } catch (error) {
            locationText = "現在地: 取得不可";
        }

        // 画面更新: 現在地
        if (locationEl) locationEl.textContent = locationText;


        // -------------------------------------------------
        // 2. スタンプ収集率の集計
        // -------------------------------------------------
        let nationalCount = 0;
        let localCount = 0;
        
        // 現在地の都道府県IDを特定
        const currentPrefId = PREF_NAME_TO_ID[currentPrefecture];

        try {
            // ユーザーの進捗データを全取得
            const progressSnapshot = await db.collection('users').doc(user.uid).collection('progress').get();

            progressSnapshot.forEach(doc => {
                const prefId = doc.id;
                const data = doc.data();
                const stamps = data.stamps || {};

                // 各市町村のレベルを加算
                let prefTotal = 0;
                Object.values(stamps).forEach(stampData => {
                    // レベル3まであるが各レベル1枚と換算 (レベル値をそのまま加算)
                    // 数値変換して安全に加算
                    const level = parseInt(stampData.level, 10) || 0;
                    prefTotal += level;
                });

                nationalCount += prefTotal;

                // 現在地の都道府県と一致すればローカルカウントに加算
                if (currentPrefId && prefId === currentPrefId) {
                    localCount = prefTotal;
                }
            });

        } catch (e) {
            console.error("Header: スタンプデータ集計エラー", e);
        }

        // 画面更新: 現在地の収集率
        if (localRateEl) {
            const prefLabel = currentPrefecture ? currentPrefecture : "エリア";
            
            // 分母を取得 (設定値があれば使用、なければ '---')
            let totalLocal = "---";
            if (currentPrefId && PREF_STAMP_TOTALS[currentPrefId] > 0) {
                totalLocal = PREF_STAMP_TOTALS[currentPrefId];
            }
            
            localRateEl.textContent = `${prefLabel}の収集率: ${localCount} / ${totalLocal}`;
        }

        // 画面更新: 全国の収集率
        if (nationalRateEl) {
            // 全国の総数を計算 (各県の合計)
            const totalNational = Object.values(PREF_STAMP_TOTALS).reduce((sum, num) => sum + num, 0);
            const displayTotal = totalNational > 0 ? totalNational : "---";
            
            nationalRateEl.textContent = `全国の収集率: ${nationalCount} / ${displayTotal}`;
        }
    }

    // 位置情報取得ラッパー
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation not supported"));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            });
        });
    }

    // 逆ジオコーディング (座標 -> 住所)
    async function reverseGeocode(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ja`);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            const addr = data.address;
            
            if (!addr) return null;

            // 市区町村の取得
            const city = addr.city || addr.ward || addr.town || addr.village || "";

            // 都道府県の取得（Nominatimのレスポンス形式の揺らぎに対応 + 補完）
            let prefecture = addr.province || addr.prefecture || addr.state || addr.region || "";

            // ★汎用対策: addressオブジェクトから取れない場合、display_name (全住所文字列) から抽出を試みる
            // Nominatimの display_name は "場所, 市区町村, 都道府県, 国" のような形式で返るため、ここから都道府県名を探すのが最も確実です。
            if (!prefecture && data.display_name) {
                const prefs = [
                    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
                    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
                    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県",
                    "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
                    "鳥取県", "島根県", "岡山県", "広島県", "山口県",
                    "徳島県", "香川県", "愛媛県", "高知県",
                    "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
                ];
                for (const p of prefs) {
                    if (data.display_name.includes(p)) {
                        prefecture = p;
                        break;
                    }
                }
            }

            // 念のため東京23区の手動補完も残しておく
            const tokyoWards = ["千代田区", "中央区", "港区", "新宿区", "文京区", "台東区", "墨田区", "江東区", "品川区", "目黒区", "大田区", "世田谷区", "渋谷区", "中野区", "杉並区", "豊島区", "北区", "荒川区", "板橋区", "練馬区", "足立区", "葛飾区", "江戸川区"];
            if (!prefecture && tokyoWards.includes(city)) {
                prefecture = "東京都";
            }
            
            return { prefecture, city };
        } catch (e) {
            console.error("Header: Reverse geocode failed:", e);
            return null;
        }
    }
});
