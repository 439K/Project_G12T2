const container = document.getElementById("container");
const backBtn = document.getElementById("back");

// 初期HTMLを保存
const initialHTML = container.innerHTML;

// 地方と県リスト
const areas = {
  chubu: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"],
  kanto: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"],
  tohoku: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
  hokkaido: ["北海道"],
  kinki: ["京都府", "大阪府", "三重県", "滋賀県", "兵庫県", "奈良県", "和歌山県"],
  chugoku: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"],
  shikoku: ["徳島県", "香川県", "愛媛県", "高知県"],
  kyushu: ["福岡県", "佐賀県", "長崎県", "大分県", "熊本県", "宮崎県", "鹿児島県", "沖縄県"]
};

// 都道府県名とパスのマッピング（すべての都道府県分を記述する必要があります）
// 47.js の既存の areas オブジェクトの下に追記

// 都道府県名と遷移先パスの完全なマッピング
const prefecturePaths = {
    // 北海道・東北地方
    "北海道": "../../html/prefecture/hokkaido/hokkaido.html",
    "青森県": "../../html/prefecture/aomori/aomori.html",
    "岩手県": "../../html/prefecture/iwate/iwate.html",
    "宮城県": "../../html/prefecture/miyagi/miyagi.html",
    "秋田県": "../../html/prefecture/akita/akita.html",
    "山形県": "../../html/prefecture/yamagata/yamagata.html",
    "福島県": "../../html/prefecture/fukushima/fukushima.html",

    // 関東地方
    "茨城県": "../../html/prefecture/ibaraki/ibaraki.html",
    "栃木県": "../../html/prefecture/tochigi/tochigi.html",
    "群馬県": "../../html/prefecture/gunma/gunma.html",
    "埼玉県": "../../html/prefecture/saitama/saitama.html",
    "千葉県": "../../html/prefecture/chiba/chiba.html",
    "東京都": "../../html/prefecture/tokyo/tokyo.html", // 指定のパスを反映
    "神奈川県": "../../html/prefecture/kanagawa/kanagawa.html",

    // 中部地方
    "新潟県": "../../html/prefecture/niigata/niigata.html",
    "富山県": "../../html/prefecture/toyama/toyama.html",
    "石川県": "../../html/prefecture/ishikawa/ishikawa.html",
    "福井県": "../../html/prefecture/fukui/fukui.html",
    "山梨県": "../../html/prefecture/yamanashi/yamanashi.html",
    "長野県": "../../html/prefecture/nagano/nagano.html",
    "岐阜県": "../../html/prefecture/gifu/gifu.html",
    "静岡県": "../../html/prefecture/shizuoka/shizuoka.html",
    "愛知県": "../../html/prefecture/aichi/aichi.html",

    // 近畿地方
    "三重県": "../../html/prefecture/mie/mie.html",
    "滋賀県": "../../html/prefecture/shiga/shiga.html",
    "京都府": "../../html/prefecture/kyoto/kyoto.html",
    "大阪府": "../../html/prefecture/osaka/osaka.html",
    "兵庫県": "../../html/prefecture/hyogo/hyogo.html",
    "奈良県": "../../html/prefecture/nara/nara.html",
    "和歌山県": "../../html/prefecture/wakayama/wakayama.html",

    // 中国地方
    "鳥取県": "../../html/prefecture/tottori/tottori.html",
    "島根県": "../../html/prefecture/shimane/shimane.html",
    "岡山県": "../../html/prefecture/okayama/okayama.html",
    "広島県": "../../html/prefecture/hiroshima/hiroshima.html",
    "山口県": "../../html/prefecture/yamaguchi/yamaguchi.html",

    // 四国地方
    "徳島県": "../../html/prefecture/tokushima/tokushima.html",
    "香川県": "../../html/prefecture/kagawa/kagawa.html",
    "愛媛県": "../../html/prefecture/ehime/ehime.html",
    "高知県": "../../html/prefecture/kochi/kochi.html",

    // 九州・沖縄地方
    "福岡県": "../../html/prefecture/fukuoka/fukuoka.html",
    "佐賀県": "../../html/prefecture/saga/saga.html",
    "長崎県": "../../html/prefecture/nagasaki/nagasaki.html",
    "熊本県": "../../html/prefecture/kumamoto/kumamoto.html",
    "大分県": "../../html/prefecture/oita/oita.html",
    "宮崎県": "../../html/prefecture/miyazaki/miyazaki.html",
    "鹿児島県": "../../html/prefecture/kagoshima/kagoshima.html",
    "沖縄県": "../../html/prefecture/okinawa/okinawa.html"
};

// 都道府県クリックイベントを設定する関数
function setupPrefectureClickListeners() {
    container.querySelectorAll(".box").forEach(box => {
        box.addEventListener("click", () => {
            const prefectureName = box.querySelector(".contents").textContent;
            const path = prefecturePaths[prefectureName];

            if (path) {
                // 該当するパスがあればページ遷移
                window.location.href = path;
            } else {
                console.warn(`遷移先URLが設定されていません: ${prefectureName}`);
            }
        });
    });
}

// 地方クリックで県リスト表示 (既存コードの修正)
container.addEventListener("click", e => {
    const target = e.target.closest(".box");
    if (target) {
        // 既に都道府県リストが表示されている場合は何もしない（後で処理）
        if (target.dataset.area === undefined) {
            return; 
        }

        const area = target.dataset.area;
        if (areas[area]) {
            // 都道府県リストを生成して表示
            container.innerHTML = areas[area]
                .map(pref => `<div class="box"><div class="contents">${pref}</div></div>`)
                .join("");

            backBtn.style.display = "inline-block";
            
            // ★ 新しく生成された都道府県要素にイベントリスナーを設定
            setupPrefectureClickListeners(); 
        }
    }
});

// 戻るボタン
backBtn.addEventListener("click", () => {
  container.innerHTML = initialHTML;
  backBtn.style.display = "none";
});
