// ======== ★ 1. スタンプの「詳細データ」を定義 ========
// (本来はデータベースに保存する情報です)
const STAMP_IMAGE_PATH = "images/stamps/"; // 画像フォルダの場所
const stampMasterData = {
    // ここのキー (hotaruika.png) を...
    "hotaruika.png": {
        name: "ホタルイカ（基本）",
        description: "富山県でゲット！夜の海で青白く光る、神秘的なイカ。"
    },
    "hotaruika_gold.png": {
        name: "金のホタルイカ（レア）",
        description: "富山県に長時間滞在してゲットした、最高グレードの証！"
    },
    "kani.png": {
        name: "カニ（基本）",
        description: "福井県でゲット！冬の味覚の王様。"
    },
    "kani_rare.png": {
        name: "豪華なカニ（レア）",
        description: "福井県で長く滞在し、カニの真髄に触れた証。"
    },
    "goheimochi.png": {
        name: "五平餅",
        description: "岐阜県や長野県でゲット！甘辛いタレが香ばしい。"
    },
    "udon.png": {
        name: "うどん",
        description: "香川県でゲット！コシのある麺がたまらない。"
    }
};


// ======== ★ 2. 友達データを変更 ========
// (stamps の中身を、画像ファイル名だけの配列にします)
const friendsData = [
    {
        id: 1,
        name: "あさひ",
        icon: "images/asahi-icon.png",
        profileMessage: "旅人です。", // ★追加
        // ...ここの stamps 配列と一致させます
        stamps: ["hotaruika.png", "kani.png"] 
    },
    {
        id: 2,
        name: "れん",
        icon: "images/ren-icon.png",
        profileMessage: "五平餅、うますぎる。", // ★追加
        stamps: ["goheimochi.png"]
    },
    {
        id: 3,
        name: "みさき",
        icon: "images/misaki-icon.png",
        profileMessage: "全国制覇めざしてます！次はどこ行こうかな？", // ★追加
        stamps: ["hotaruika_gold.png", "kani_rare.png", "udon.png"]
    }
];

// --- 必要なHTML要素を取得 ---
const listContainer = document.getElementById("friend-list-container");
const profileContainer = document.getElementById("profile-container");
const friendListUL = document.getElementById("friend-list");
const backButton = document.getElementById("back-button");
const profileDetailsDiv = document.getElementById("profile-details");
const stampCollectionDiv = document.getElementById("stamp-collection");

// --- ★ 3. モーダル用のHTML要素を取得 (追加) ---
const modalOverlay = document.getElementById("stamp-modal-overlay");
const modalCloseButton = document.getElementById("modal-close-button");
const modalStampImage = document.getElementById("modal-stamp-image");
const modalStampName = document.getElementById("modal-stamp-name");
const modalStampDescription = document.getElementById("modal-stamp-description");


// --- ★ 4. モーダルを開く/閉じる関数 (追加) ---
function openModal(stampId) {
    // 1. stampId (例: "hotaruika.png") を使って、詳細データを取得
    const stampDetails = stampMasterData[stampId];
    
    if (!stampDetails) return; // もしデータがなかったら何もしない

    // 2. モーダルの内容を書き換える
    modalStampImage.src = STAMP_IMAGE_PATH + stampId; // 画像パスを設定
    modalStampName.innerText = stampDetails.name;
    modalStampDescription.innerText = stampDetails.description;

    // 3. モーダルを表示する (display: none -> flex に変更)
    modalOverlay.style.display = "flex";
}

function closeModal() {
    // モーダルを隠す
    modalOverlay.style.display = "none";
}

// --- 関数：プロフィール画面を表示する (★ 変更あり) ---
function showProfile(friendId) {
    const friend = friendsData.find(f => f.id === friendId);
    if (!friend) return; 

    // プロフィール情報をHTMLに書き込む (ここは変更なし)
    profileDetailsDiv.innerHTML = `
        <img src="${friend.icon}" alt="${friend.name}のアイコン">
        <div>
            <h2>${friend.name}</h2>
            <p>集めたシールの数: ${friend.stamps.length}個</p>
            <p class="profile-message">${friend.profileMessage}</p> </div>
        </div>
    `;

    // スタンプコレクションをHTMLに書き込む (★ ここから変更)
    stampCollectionDiv.innerHTML = ""; // 一旦中身を空にする
    
    // friend.stamps 配列 (例: ["hotaruika.png", "kani.png"]) をループ
    friend.stamps.forEach(stampId => {
        const img = document.createElement("img");
        img.src = STAMP_IMAGE_PATH + stampId; // 画像パスを設定
        img.alt = stampMasterData[stampId].name; // altテキストにスタンプ名を設定

        // ★★★重要：画像にクリックイベントを追加★★★
        img.addEventListener("click", () => {
            // クリックされたら、そのスタンプのID (ファイル名) を openModal 関数に渡す
            openModal(stampId);
        });

        stampCollectionDiv.appendChild(img);
    });
    // (★ 変更ここまで)

    // 画面を切り替える (変更なし)
    listContainer.style.display = "none";
    profileContainer.style.display = "block";
}

// --- 関数：リスト一覧画面を表示する (変更なし) ---
function showList() {
    listContainer.style.display = "block";
    profileContainer.style.display = "none";
}

// --- メインの処理 (★ 一部追加) ---

// 1. 「リストに戻る」ボタンにクリックイベントを追加
backButton.addEventListener("click", showList);

// ★ 2. モーダルの「閉じるボタン」にクリックイベントを追加 (追加)
modalCloseButton.addEventListener("click", closeModal);

// ★ 3. モーダルの「背景（黒い部分）」をクリックしても閉じるようにする (追加)
modalOverlay.addEventListener("click", (event) => {
    // クリックされたのが、背景(overlay)自身だった場合のみ閉じる
    // (中の白い箱をクリックした時は閉じないようにする)
    if (event.target === modalOverlay) {
        closeModal();
    }
});

// 4. 友達リストのHTMLを作る (変更なし)
friendsData.forEach(friend => {
    const li = document.createElement("li");
    li.innerHTML = `
        <img src="${friend.icon}" alt="${friend.name}のアイコン">
        <span>${friend.name}</span>
    `;
    li.dataset.friendId = friend.id;
    li.addEventListener("click", () => {
        const id = parseInt(li.dataset.friendId);
        showProfile(id);
    });
    friendListUL.appendChild(li);
});