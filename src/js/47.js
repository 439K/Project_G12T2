document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById("container");
    const backBtn = document.getElementById("back");

    // 初期状態の地方ボタンにロックをかける
    const applyRegionLocks = () => {
        container.querySelectorAll(".box").forEach(box => {
            const area = box.dataset.area;
            // 関東(kanto)と中部(chubu)以外はロック
            if (area && area !== "kanto" && area !== "chubu") {
                box.classList.add("locked");
                // 鍵アイコンを中に追加（任意）
                if (!box.querySelector('.fa-lock')) {
                    box.insertAdjacentHTML('beforeend', '<i class="fas fa-lock lock-icon"></i>');
                }
            }
        });
    };

    // 最初に実行
    applyRegionLocks();

    const initialHTML = container.innerHTML;

    const areas = {
      chubu: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"],
      kanto: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"],
      // 他の地方...
    };

    function setupPrefectureClickListeners() {
        container.querySelectorAll(".box").forEach(box => {
            box.addEventListener("click", (e) => {
                // ロックされていたら遷移させない
                if (box.classList.contains('locked')) {
                    e.stopPropagation();
                    return;
                }

                const contents = box.querySelector(".contents");
                if (!contents) return;
                
                const prefectureName = contents.textContent.trim();
                const path = prefecturePaths[prefectureName];

                if (path) {
                    window.location.href = path;
                }
            });
        });
    }

    container.addEventListener("click", e => {
        const target = e.target.closest(".box");
        if (!target) return;

        // 1. 地方ボタンをクリックした時の判定
        const area = target.dataset.area;
        if (area !== undefined) {
            // 関東と中部以外は何もしない
            if (area !== "kanto" && area !== "chubu") {
                return; 
            }

            if (areas[area]) {
                container.innerHTML = areas[area]
                    .map(pref => {
                        // 2. 中部地方の中でのロック判定（富山県以外をロック）
                        const isLocked = (area === "chubu" && pref !== "富山県");
                        return `
                            <div class="box ${isLocked ? 'locked' : ''}">
                                <div class="contents">${pref}</div>
                                ${isLocked ? '<i class="fas fa-lock lock-icon"></i>' : ''}
                            </div>`;
                    })
                    .join("");

                backBtn.style.display = "inline-block";
                setupPrefectureClickListeners();
            }
        }
    });

    backBtn.addEventListener("click", () => {
      container.innerHTML = initialHTML;
      backBtn.style.display = "none";
      applyRegionLocks(); // 戻った時にもう一度ロックを適用
    });
});