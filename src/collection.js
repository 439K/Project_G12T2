// JavaScript例
const modal = document.getElementById("img-modal");
const modalCityName = document.getElementById("modal-city-name");
const modalImg = document.getElementById("modal-img");
const modalDesc = document.getElementById("modal-desc");
const modalClose = document.getElementById("modal-close");

// すべての画像にクリックイベントを追加
document.querySelectorAll(".ceal-img").forEach(img => {
    img.addEventListener("click", () => {
        modal.style.display = "block";
        modalImg.src = img.src;
        modalDesc.textContent = img.dataset.description;

        // 市町村名を上に表示
        const cityName = img.closest("details, .city-area").querySelector(".city-line").textContent;
        modalCityName.textContent = cityName;
    });
});

// ×ボタンで閉じる
modalClose.addEventListener("click", () => {
    modal.style.display = "none";
});

// モーダル外クリックでも閉じる
modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
});
