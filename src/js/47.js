document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById("container");
    const backBtn = document.getElementById("back");

    // 初期HTMLを保存
    // Note: DOMContentLoadedの外で実行すると、要素が見つからない可能性があるため中に入れる
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

    // 都道府県クリックイベントを設定する関数
    // この関数はグローバルスコープの prefecturePaths (prefecture-data.jsで定義) に依存します
    function setupPrefectureClickListeners() {
        container.querySelectorAll(".box").forEach(box => {
            box.addEventListener("click", () => {
                const prefectureName = box.querySelector(".contents").textContent;
                // prefecturePaths は prefecture-data.js で定義されているグローバル変数
                const path = prefecturePaths[prefectureName];

                if (path) {
                    window.location.href = path;
                } else {
                    console.warn(`遷移先URLが設定されていません: ${prefectureName}`);
                }
            });
        });
    }

    // 地方クリックで県リスト表示
    container.addEventListener("click", e => {
        const target = e.target.closest(".box");
        if (!target) return;

        // 県がクリックされた場合は、setupPrefectureClickListeners内の処理に任せる
        // (data-area属性がないものが県BOX)
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
            
            // 新しく生成された都道府県要素にイベントリスナーを設定
            setupPrefectureClickListeners();
        }
    });

    // 戻るボタン
    backBtn.addEventListener("click", () => {
      container.innerHTML = initialHTML;
      backBtn.style.display = "none";
    });
});