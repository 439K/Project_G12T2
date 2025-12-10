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


// --- ★検索機能のために必要な要素を取得 (追加) ---
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");

// ======== ★ 4. 友達リストを作る部分を「関数」にする (変更・追加) ========
// (リストデータを受け取って、画面に表示する役割の関数です)
function renderFriendList(listData) {
    // 1. まずリストを空っぽにする（検索結果を新しく表示するため）
    friendListUL.innerHTML = "";

    // 2. データがない場合の表示
    if (listData.length === 0) {
        friendListUL.innerHTML = "<p>見つかりませんでした。</p>";
        return;
    }

    // 3. リストを作るループ処理
    listData.forEach(friend => {
        const li = document.createElement("li");
        
        // IDも表示するように少し変更しました（検索しやすくするため）
        li.innerHTML = `
            <img src="${friend.icon}" alt="${friend.name}のアイコン">
            <div>
                <span style="font-size: 12px; color: #666;">ID: ${friend.id}</span><br>
                <span>${friend.name}</span>
            </div>
        `;
        
        li.dataset.friendId = friend.id;
        li.addEventListener("click", () => {
            const id = parseInt(li.dataset.friendId);
            showProfile(id);
        });
        friendListUL.appendChild(li);
    });
}

// ======== ★ 5. 検索ボタンが押された時の動き (追加) ========
searchButton.addEventListener("click", () => {
    const keyword = searchInput.value; // 入力された文字を取得

    // 何も入力されていなかったら、全員表示して終わる
    if (keyword === "") {
        renderFriendList(friendsData);
        return;
    }

    // 検索キーワードでフィルタリング（絞り込み）する
    // ID が一致するか、または 名前 にキーワードが含まれているか
    const filteredFriends = friendsData.filter(friend => {
        return String(friend.id) === keyword || friend.name.includes(keyword);
    });

    // 絞り込んだ結果を表示する
    renderFriendList(filteredFriends);
});


// ======== ★ 6. 最初に画面を開いた時の処理 (変更) ========
// 最初は「全員」を表示する
renderFriendList(friendsData);

// friend.js の最後の方に追加してください

// --- ★ランキング機能用の要素を取得 ---
const rankingButton = document.getElementById("ranking-button");
const rankingContainer = document.getElementById("ranking-container");
const rankingListUL = document.getElementById("ranking-list");
const backToListButton = document.getElementById("back-to-list-button");

// --- 関数：ランキングを表示する ---
function showRanking() {
    // 1. 画面の切り替え（リストを隠して、ランキングを出す）
    listContainer.style.display = "none";
    rankingContainer.style.display = "block";
    profileContainer.style.display = "none"; // プロフィールも念のため隠す

    // 2. データをシールの数(stamps.length)で多い順に並び替える
    // (元の friendsData を壊さないように [...] でコピーしてから sort します)
    const sortedFriends = [...friendsData].sort((a, b) => {
        return b.stamps.length - a.stamps.length; // 多い順 (降順)
    });

    // 3. ランキングリストのHTMLを作る
    rankingListUL.innerHTML = ""; // 一旦空にする

    sortedFriends.forEach((friend, index) => {
        const rank = index + 1; // 順位 (0始まりなので+1)
        const li = document.createElement("li");

        // 1位〜3位には特別なクラス(.rank-1など)をつける
        if (rank <= 3) {
            li.classList.add(`rank-${rank}`);
        }

        // 王冠アイコンの表示分け (FontAwesomeを使っている想定)
        let iconHtml = "";
        if (rank === 1) iconHtml = '<i class="fa-solid fa-crown" style="color:gold;"></i> ';
        else if (rank === 2) iconHtml = '<i class="fa-solid fa-crown" style="color:silver;"></i> ';
        else if (rank === 3) iconHtml = '<i class="fa-solid fa-crown" style="color:#cd7f32;"></i> ';

        li.innerHTML = `
            <div class="rank-number">${iconHtml}${rank}</div>
            <img src="${friend.icon}" alt="アイコン" style="width:40px; height:40px; border-radius:50%; margin-right:10px;">
            <span>${friend.name}</span>
            <span class="rank-count">${friend.stamps.length} 枚</span>
        `;
        
        // ★ランキングからでもクリックでプロフィール見れたら便利なので追加！
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
             // プロフィールを表示するには一度ランキングを隠す必要がある
             rankingContainer.style.display = "none";
             showProfile(friend.id);
        });

        rankingListUL.appendChild(li);
    });
}

// --- 関数：ランキングからリストに戻る ---
function hideRanking() {
    rankingContainer.style.display = "none";
    listContainer.style.display = "block";
}

// --- イベント設定 ---
rankingButton.addEventListener("click", showRanking);
backToListButton.addEventListener("click", hideRanking);

// プロフィール画面の「戻る」ボタンを押したとき、
// ランキングから来た場合でも強制的に「リスト一覧」に戻る仕様でOKなら
// 既存の backButton の処理はそのままで大丈夫です！