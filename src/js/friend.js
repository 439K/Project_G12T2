import { auth, db, onAuthStateChanged, doc, setDoc } from './firebase-service.js'; 
import { 
    searchUsers, 
    sendFriendRequest, 
    listenForFriendRequests, 
    handleFriendRequest, 
    listenForFriends, 
    unfriendUser 
} from './firebase-friendservice.js';

// ======== ★ 1. スタンプの「詳細データ」定義 ========
const STAMP_IMAGE_PATH = "https://placehold.co/150x150?text=";
const stampMasterData = {
    "hotaruika.png": { name: "ホタルイカ", description: "富山県でゲット！夜の海で青白く光る、神秘的なイカ。" },
    "hotaruika_gold.png": { name: "金のホタルイカ", description: "富山県でゲットした、最高グレードの証！" },
    "kani.png": { name: "カニ", description: "福井県でゲット！冬の味覚の王様。" },
    "kani_rare.png": { name: "豪華なカニ", description: "福井県でカニの真髄に触れた証。" },
    "goheimochi.png": { name: "五平餅", description: "岐阜・長野でゲット！甘辛いタレが香ばしい。" },
    "udon.png": { name: "うどん", description: "香川県でゲット！コシのある麺がたまらない。" }
};

const stampKeys = Object.keys(stampMasterData);
let currentFriendsList = [];

// --- DOM要素 ---
const listContainer = document.getElementById("friend-list-container");
const profileContainer = document.getElementById("profile-container");
const rankingContainer = document.getElementById("ranking-container");

const friendListUL = document.getElementById("friend-list");
const rankingListUL = document.getElementById("ranking-list");
const requestListMiniUL = document.getElementById("request-list-mini");
const requestNotificationArea = document.getElementById("request-notification-area");

const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const rankingButton = document.getElementById("ranking-button");
const backButton = document.getElementById("back-button");
const backToListButton = document.getElementById("back-to-list-button");

const profileDetailsDiv = document.getElementById("profile-details");
const stampCollectionDiv = document.getElementById("stamp-collection");

const modalOverlay = document.getElementById("stamp-modal-overlay");
const modalCloseButton = document.getElementById("modal-close-button");
const modalStampImage = document.getElementById("modal-stamp-image");
const modalStampName = document.getElementById("modal-stamp-name");
const modalStampDescription = document.getElementById("modal-stamp-description");

let unsubscribeRequests = null;
let unsubscribeFriends = null;

// =========================================================
//  Firebase 認証と初期化フロー
// =========================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ログイン確認完了
        startListeners(); 
    } else {
        console.warn("ログインしていません");
        if(friendListUL) friendListUL.innerHTML = '<li class="message">ログインしてください</li>';
        if (unsubscribeRequests) unsubscribeRequests();
        if (unsubscribeFriends) unsubscribeFriends();
    }
});

function startListeners() {
    unsubscribeFriends = listenForFriends((friends) => {
        currentFriendsList = friends.map(friend => {
            const existing = currentFriendsList.find(f => f.uid === friend.uid);
            return {
                ...friend,
                icon: friend.icon || "https://placehold.co/100x100?text=User",
                profileMessage: existing?.profileMessage || "よろしくお願いします！",
                stamps: existing?.stamps || generateRandomStamps()
            };
        });

        if (listContainer.style.display !== "none") {
            renderFriendList(currentFriendsList, "friend");
        }
    });

    unsubscribeRequests = listenForFriendRequests((requests) => {
        renderRequestList(requests);
    });
}

function generateRandomStamps() {
    const count = Math.floor(Math.random() * 5); 
    const myStamps = [];
    for(let i=0; i<count; i++) {
        const randomKey = stampKeys[Math.floor(Math.random() * stampKeys.length)];
        if(!myStamps.includes(randomKey)) myStamps.push(randomKey);
    }
    return myStamps;
}


// =========================================================
//  UI レンダリング関数
// =========================================================

function renderFriendList(listData, mode = "friend") {
    if(!friendListUL) return;
    friendListUL.innerHTML = "";

    if (listData.length === 0) {
        friendListUL.innerHTML = `<li class="message">${mode === 'search' ? "ユーザーが見つかりません" : "フレンドがいません"}</li>`;
        return;
    }

    listData.forEach(user => {
        const li = document.createElement("li");
        const userInfoDiv = document.createElement("div");
        userInfoDiv.className = "user-info";
        
        const uidDisplay = `<span class="user-uid">ID: ${user.uid}</span>`;
        
        userInfoDiv.innerHTML = `
            <img src="${user.icon || 'https://placehold.co/100x100?text=User'}" class="user-icon" alt="icon">
            <div>
                ${uidDisplay}<br>
                <strong>${user.displayName}</strong>
            </div>
        `;
        
        if (mode === 'friend') {
            userInfoDiv.addEventListener("click", () => showProfile(user.uid));
        }
        li.appendChild(userInfoDiv);

        const actionDiv = document.createElement("div");
        actionDiv.className = "action-area";

        if (mode === "friend") {
            const removeBtn = document.createElement("button");
            removeBtn.className = "btn-remove";
            removeBtn.innerText = "解除";
            removeBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if(confirm(`${user.displayName}さんとのフレンドを解除しますか？`)) {
                    await unfriendUser(user.uid);
                }
            });
            actionDiv.appendChild(removeBtn);

        } else if (mode === "search") {
            const addBtn = document.createElement("button");
            addBtn.className = "btn-add";
            addBtn.innerText = "申請";
            addBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                
                // ★修正: 送信前の確認ダイアログを追加
                if (!confirm(`${user.displayName} さんにフレンド申請を送りますか？`)) {
                    return;
                }

                addBtn.disabled = true;
                addBtn.innerText = "送信中...";
                try {
                    await sendFriendRequest(user);
                    alert("リクエストを送信しました！");
                    addBtn.innerText = "済";
                } catch (err) {
                    alert(err.message);
                    addBtn.disabled = false;
                    addBtn.innerText = "申請";
                }
            });
            actionDiv.appendChild(addBtn);
        }

        li.appendChild(actionDiv);
        friendListUL.appendChild(li);
    });
}

function renderRequestList(requests) {
    if(!requestListMiniUL || !requestNotificationArea) return;
    
    requestListMiniUL.innerHTML = "";
    if (requests.length > 0) {
        requestNotificationArea.style.display = "block";
        requests.forEach(req => {
            const li = document.createElement("li");
            li.style.background = "white";
            li.style.padding = "8px";
            li.style.borderRadius = "4px";
            li.style.marginBottom = "5px";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            
            li.innerHTML = `
                <span>${req.senderDisplayName} から申請</span>
                <div class="action-area">
                    <button class="btn-add btn-accept">承認</button>
                    <button class="btn-remove btn-reject">拒否</button>
                </div>
            `;
            
            li.querySelector(".btn-accept").addEventListener("click", () => 
                handleFriendRequest(req.id, 'accept', req.senderId, req.senderDisplayName, req.receiverId, req.receiverDisplayName)
            );
            li.querySelector(".btn-reject").addEventListener("click", () => 
                handleFriendRequest(req.id, 'reject', req.senderId, req.senderDisplayName, req.receiverId, req.receiverDisplayName)
            );
            
            requestListMiniUL.appendChild(li);
        });
    } else {
        requestNotificationArea.style.display = "none";
    }
}


// =========================================================
//  機能ロジック
// =========================================================

// --- 検索ボタンのクリック処理 ---
document.addEventListener("DOMContentLoaded", () => {
    const searchBtn = document.getElementById("search-button");
    const searchInp = document.getElementById("search-input");

    if(searchBtn) {
        searchBtn.addEventListener("click", async () => {
            
            const keyword = searchInp.value.trim();
            
            if (!keyword) {
                renderFriendList(currentFriendsList, "friend");
                return;
            }

            friendListUL.innerHTML = '<li class="loading">検索中...</li>'; 
            try {
                const results = await searchUsers(keyword);
                renderFriendList(results, "search");
            } catch (err) {
                console.error("検索エラー発生:", err);
                friendListUL.innerHTML = '<li class="message">検索エラーが発生しました。コンソールを確認してください。</li>';
            }
        });
    } else {
        console.error("検索ボタンが見つかりません: id='search-button'");
    }
});

// --- プロフィール表示 ---
function showProfile(uid) {
    const friend = currentFriendsList.find(f => f.uid === uid);
    if (!friend) return;

    if(profileDetailsDiv) {
        profileDetailsDiv.innerHTML = `
            <img src="${friend.icon}" alt="icon">
            <div>
                <h2>${friend.displayName}</h2>
                <p style="font-size:0.8em; color:#888;">ID: ${friend.uid}</p>
                <p>集めたシールの数: ${friend.stamps.length}個</p>
                <p style="color:#666;">"${friend.profileMessage}"</p>
            </div>
        `;
    }

    if(stampCollectionDiv) {
        stampCollectionDiv.innerHTML = "";
        friend.stamps.forEach(stampId => {
            const data = stampMasterData[stampId];
            if(!data) return;

            const img = document.createElement("img");
            img.src = STAMP_IMAGE_PATH + data.name; 
            img.alt = data.name;
            img.addEventListener("click", () => openModal(stampId));
            stampCollectionDiv.appendChild(img);
        });
    }

    listContainer.style.display = "none";
    rankingContainer.style.display = "none";
    profileContainer.style.display = "block";
}

// --- ランキング表示 ---
function showRanking() {
    listContainer.style.display = "none";
    profileContainer.style.display = "none";
    rankingContainer.style.display = "block";

    const sorted = [...currentFriendsList].sort((a, b) => b.stamps.length - a.stamps.length);

    if(rankingListUL) {
        rankingListUL.innerHTML = "";
        sorted.forEach((friend, index) => {
            const rank = index + 1;
            const li = document.createElement("li");
            if (rank <= 3) li.classList.add(`rank-${rank}`);

            let iconHtml = "";
            if (rank === 1) iconHtml = '<i class="fa-solid fa-crown" style="color:gold;"></i> ';
            else if (rank === 2) iconHtml = '<i class="fa-solid fa-crown" style="color:silver;"></i> ';
            else if (rank === 3) iconHtml = '<i class="fa-solid fa-crown" style="color:#cd7f32;"></i> ';

            li.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <div class="rank-number" style="width:30px;">${iconHtml}${rank}</div>
                    <img src="${friend.icon}" style="width:40px; height:40px; border-radius:50%; margin:0 10px;">
                    <div>
                        <span>${friend.displayName}</span>
                        <div style="font-size:0.7em; color:#999;">${friend.uid.substring(0,6)}...</div>
                    </div>
                </div>
                <span class="rank-count">${friend.stamps.length} 枚</span>
            `;
            li.style.cursor = "pointer";
            li.addEventListener("click", () => showProfile(friend.uid));
            rankingListUL.appendChild(li);
        });
    }
}

// --- 画面遷移リセット ---
function showList() {
    if(listContainer) listContainer.style.display = "block";
    if(profileContainer) profileContainer.style.display = "none";
    if(rankingContainer) rankingContainer.style.display = "none";
}

if(backButton) backButton.addEventListener("click", showList);
if(backToListButton) backToListButton.addEventListener("click", showList);
if(rankingButton) rankingButton.addEventListener("click", showRanking);


// =========================================================
//  モーダル制御
// =========================================================
function openModal(stampId) {
    const data = stampMasterData[stampId];
    if (!data) return;

    if(modalStampImage) modalStampImage.src = STAMP_IMAGE_PATH + data.name;
    if(modalStampName) modalStampName.innerText = data.name;
    if(modalStampDescription) modalStampDescription.innerText = data.description;
    if(modalOverlay) modalOverlay.style.display = "flex";
}

function closeModal() {
    if(modalOverlay) modalOverlay.style.display = "none";
}

if(modalCloseButton) modalCloseButton.addEventListener("click", closeModal);
if(modalOverlay) modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
});