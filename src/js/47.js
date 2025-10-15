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

// 地方クリックで県リスト表示
container.addEventListener("click", e => {
  const target = e.target.closest(".box");
  if (target) {
    const area = target.dataset.area;
    if (areas[area]) {
      container.innerHTML = areas[area]
        .map(pref => `<div class="box"><div class="contents">${pref}</div></div>`)
        .join("");
      backBtn.style.display = "inline-block";
    }
  }
});

// 戻るボタン
backBtn.addEventListener("click", () => {
  container.innerHTML = initialHTML;
  backBtn.style.display = "none";
});
