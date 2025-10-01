const container = document.getElementById("container");
const backBtn = document.getElementById("back");

// 地方と県リスト
const areas = {
  chubu: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"],
  kanto: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"],
  tohoku: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"]
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
  container.innerHTML = `
    <div class="box" data-area="chubu"><div class="contents">中部</div></div>
    <div class="box" data-area="kanto"><div class="contents">関東</div></div>
    <div class="box" data-area="tohoku"><div class="contents">東北</div></div>
  `;
  backBtn.style.display = "none";
});
