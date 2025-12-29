import { auth, db, onAuthStateChanged, doc, setDoc, getDoc } from './firebase-service.js'; 
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
const mainContent = document.querySelector('.main-content'); 
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
        startListeners(); 
    } else {
        console.warn("ログインしていません");
        if(friendListUL) friendListUL.innerHTML = '<li class="message">ログインしてください</li>';
    }
});

function startListeners() {
    // フレンドリスト取得時に、最新のユーザー情報を取得しに行く
    unsubscribeFriends = listenForFriends(async (friends) => {
        
        const friendsWithDetailsPromises = friends.map(async (friend) => {
            const existing = currentFriendsList.find(f => f.uid === friend.uid);
            
            let finalIcon = "https://placehold.co/100x100?text=User";
            let finalName = friend.displayName || "Unknown";
            let finalBio = "自己紹介なし";

            try {
                const userRef = doc(db, "users", friend.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData.avatarUrl) {
                        finalIcon = userData.avatarUrl;
                    } else if (userData.icon) {
                        finalIcon = userData.icon;
                    }
                    
                    if (userData.displayName) {
                        finalName = userData.displayName;
                    }

                    if (userData.bio) {
                        finalBio = userData.bio;
                    }
                }
            } catch (err) {
                console.error(`ID: ${friend.uid} の情報取得に失敗`, err);
            }

            return {
                ...friend,
                displayName: finalName,
                icon: finalIcon,
                bio: finalBio,
                stamps: existing?.stamps || generateRandomStamps()
            };
        });

        currentFriendsList = await Promise.all(friendsWithDetailsPromises);

        if (listContainer.style.display !== "none" && rankingContainer.style.display === "none" && profileContainer.style.display === "none") {
            const currentInput = searchInput ? searchInput.value.trim() : "";
            if (!currentInput) {
                renderFriendList(currentFriendsList, "friend");
            }
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
        
        const iconSrc = user.icon || user.avatarUrl || 'https://placehold.co/100x100?text=User';
        const stampCount = user.stamps ? user.stamps.length : 0; 
        const bioText = user.bio || "自己紹介なし"; 

        userInfoDiv.innerHTML = `
            <img src="${iconSrc}" class="user-icon" alt="icon">
            <div class="user-details-container">
                <div class="user-top-row">
                    <strong class="user-name">${user.displayName}</strong>
                    <span class="user-uid">ID: ${user.uid.substring(0,8)}...</span>
                </div>
                <div class="user-bottom-row">
                    <span class="user-bio">${bioText}</span>
                    <span class="user-stamp-badge">シール数: ${stampCount}</span>
                </div>
            </div>
        `;
        
        userInfoDiv.addEventListener("click", () => showProfile(user.uid));
        userInfoDiv.style.cursor = "pointer";
        
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
            if (auth.currentUser && user.uid === auth.currentUser.uid) {
                const selfSpan = document.createElement("span");
                selfSpan.innerText = "あなた";
                selfSpan.style.color = "#999";
                selfSpan.style.fontSize = "0.8rem";
                actionDiv.appendChild(selfSpan);
            } 
            else if (currentFriendsList.some(f => f.uid === user.uid)) {
                const friendSpan = document.createElement("span");
                friendSpan.innerText = "フレンド済";
                friendSpan.style.color = "#2e7d32";
                friendSpan.style.fontSize = "0.8rem";
                friendSpan.style.fontWeight = "bold";
                actionDiv.appendChild(friendSpan);
            }
            else {
                const addBtn = document.createElement("button");
                addBtn.className = "btn-add";
                addBtn.innerText = "申請";
                addBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    if (!confirm(`${user.displayName} さんにフレンド申請を送りますか？`)) return;

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
//  ★ 検索機能ロジック (searchUsers 使用版)
// =========================================================

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

async function performSearch(keyword) {
    if (!keyword) {
        renderFriendList(currentFriendsList, "friend");
        return;
    }

    if(friendListUL) friendListUL.innerHTML = '<li class="loading">検索中...</li>'; 
    
    try {
        // ★修正: 外部の searchUsers を使用 (ID検索は外部ファイル側の実装依存となります)
        const results = await searchUsers(keyword);
        
        // 検索結果にシール情報やアイコンがない場合の補完処理
        const resultsWithDetails = results.map(user => ({
            ...user,
            icon: user.icon || user.avatarUrl || "https://placehold.co/100x100?text=User",
            // スタンプ情報がなければ仮生成 (表示崩れ防止)
            stamps: user.stamps || generateRandomStamps(),
            bio: user.bio || "自己紹介なし"
        }));

        renderFriendList(resultsWithDetails, "search");
    } catch (err) {
        console.error("検索エラー:", err);
        if(friendListUL) friendListUL.innerHTML = '<li class="message">検索エラーが発生しました。</li>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const searchBtn = document.getElementById("search-button");
    const searchInp = document.getElementById("search-input");

    if (searchInp) {
        searchInp.addEventListener("input", debounce((e) => {
            const keyword = e.target.value.trim();
            performSearch(keyword);
        }, 500));
    }

    if(searchBtn) {
        searchBtn.addEventListener("click", () => {
            const keyword = searchInp ? searchInp.value.trim() : "";
            performSearch(keyword);
        });
    }
});

// --- ★ プロフィール表示 (閲覧モード) ---
async function showProfile(uid) {
    
    if(mainContent) {
        mainContent.style.padding = "0";       
        mainContent.style.display = "block";   
        mainContent.style.width = "100%";
        mainContent.style.maxWidth = "100%";
    }

    if(profileDetailsDiv) {
        profileDetailsDiv.style.display = "block";         
        profileDetailsDiv.style.backgroundColor = "transparent"; 
        profileDetailsDiv.style.padding = "0";             
        profileDetailsDiv.style.boxShadow = "none";        
        profileDetailsDiv.style.marginTop = "0";           
    }

    const legacyStampHeader = profileContainer.querySelector('h3');
    if(legacyStampHeader) legacyStampHeader.style.display = 'none';
    if(stampCollectionDiv) stampCollectionDiv.style.display = 'none';

    const friendSimple = currentFriendsList.find(f => f.uid === uid);
    
    listContainer.style.display = "none";
    rankingContainer.style.display = "none";
    profileContainer.style.display = "block";
    window.scrollTo(0,0);

    if(profileDetailsDiv) {
        profileDetailsDiv.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">読み込み中...</div>';
    }

    try {
        const userDocRef = doc(db, "users", uid);
        const userSnap = await getDoc(userDocRef);
        
        let userData = friendSimple || {}; 
        if (userSnap.exists()) {
            userData = { ...userData, ...userSnap.data() };
        }

        const displayName = userData.displayName || "名無しユーザー";
        const bio = userData.bio || "自己紹介はまだありません。";
        const coverUrl = userData.coverUrl || ""; 
        const avatarUrl = userData.avatarUrl || userData.icon || "https://placehold.co/100x100?text=User";
        const stats = userData.stats || { total: 0, prefs: 0, rate: 0 };
        
        if(profileDetailsDiv) {
            profileDetailsDiv.innerHTML = `
                <div class="friend-profile-header">
                    ${coverUrl ? `<img src="${coverUrl}" class="friend-cover-image" alt="cover">` : ''}
                    
                    <div class="friend-avatar-container">
                        <img src="${avatarUrl}" class="friend-avatar-img" alt="avatar">
                    </div>
                </div>

                <div class="friend-card friend-name-area">
                    <h2 class="friend-name-text">${displayName}</h2>
                    <div class="friend-id-text">ID: ${uid}</div>
                </div>

                <div class="friend-card">
                    <h3>自己紹介</h3>
                    <div class="friend-bio-text">${bio}</div>
                </div>

                <div class="friend-card">
                    <h3>記録</h3>
                    <div class="friend-stats">
                        <div class="friend-stat-item">
                            <div class="friend-stat-value">${stats.total || 0}</div>
                            <div class="friend-stat-label">シール数</div>
                        </div>
                        <div class="friend-stat-item">
                            <div class="friend-stat-value">${stats.prefs || 0}</div>
                            <div class="friend-stat-label">制覇県</div>
                        </div>
                        <div class="friend-stat-item">
                            <div class="friend-stat-value">${stats.rate || 0}%</div>
                            <div class="friend-stat-label">コンプ率</div>
                        </div>
                    </div>
                </div>

                <div class="friend-card">
                    <h3>集めたシール</h3>
                    <div id="friend-stamps-insert-area"></div>
                </div>
            `;
        }

        const insertArea = document.getElementById("friend-stamps-insert-area");
        if(insertArea) {
            const displayStamps = (userData.stamps && userData.stamps.length > 0) ? userData.stamps : (friendSimple?.stamps || []);
            
            if (!displayStamps || displayStamps.length === 0) {
                insertArea.innerHTML = "<p style='color:#999; font-size:14px;'>シールはまだありません</p>";
            } else {
                const gridDiv = document.createElement("div");
                gridDiv.className = "friend-stamps-grid";

                displayStamps.forEach(stampId => {
                    const key = (typeof stampId === 'string') ? stampId : stampId.id; 
                    const data = stampMasterData[key];
                    if(!data) return;

                    const itemDiv = document.createElement("div");
                    itemDiv.className = "friend-stamp-item";
                    itemDiv.innerHTML = `<img src="${STAMP_IMAGE_PATH + data.name}" class="friend-stamp-img" alt="${data.name}">`;
                    
                    itemDiv.addEventListener("click", () => {
                        if(typeof openModal === "function") openModal(key);
                        else alert(`${data.name}\n${data.description}`);
                    });
                    
                    gridDiv.appendChild(itemDiv);
                });
                insertArea.appendChild(gridDiv);
            }
        }

    } catch (err) {
        console.error("プロフィール表示エラー:", err);
        if(profileDetailsDiv) {
            profileDetailsDiv.innerHTML = `<p style="text-align:center; padding:20px; color:red;">情報の取得に失敗しました</p>`;
        }
    }
}

// --- ランキング表示 ---
function showRanking() {
    if(mainContent) {
        mainContent.style.padding = ""; 
        mainContent.style.display = ""; 
    }

    listContainer.style.display = "none";
    profileContainer.style.display = "none";
    rankingContainer.style.display = "block";

    const sorted = [...currentFriendsList].sort((a, b) => {
        const lenA = a.stamps ? a.stamps.length : 0;
        const lenB = b.stamps ? b.stamps.length : 0;
        return lenB - lenA;
    });

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
            
            const stampCount = friend.stamps ? friend.stamps.length : 0;
            const iconSrc = friend.icon || "https://placehold.co/100x100?text=User";
            const bioText = friend.bio || "自己紹介なし";

            li.innerHTML = `
                <div style="display:flex; align-items:center; flex:1; overflow:hidden;">
                    <div class="rank-number" style="min-width:40px; text-align:center;">${iconHtml}${rank}</div>
                    <img src="${iconSrc}" style="width:40px; height:40px; border-radius:50%; margin:0 10px; object-fit:cover;">
                    <div class="user-details-container">
                        <div class="user-top-row">
                            <strong class="user-name">${friend.displayName}</strong>
                            <span class="user-uid">ID: ${friend.uid.substring(0,8)}...</span>
                        </div>
                        <div class="user-bottom-row">
                            <span class="user-bio">${bioText}</span>
                        </div>
                    </div>
                </div>
                <span class="rank-count" style="margin-left:10px; font-weight:bold; color:#8b7e74; white-space:nowrap;">${stampCount} 枚</span>
            `;
            li.style.cursor = "pointer";
            li.addEventListener("click", () => showProfile(friend.uid));
            rankingListUL.appendChild(li);
        });
    }
}

// --- 画面遷移リセット ---
function showList() {
    if(mainContent) {
        mainContent.style.padding = ""; 
        mainContent.style.display = ""; 
    }

    listContainer.style.display = "block";
    profileContainer.style.display = "none";
    rankingContainer.style.display = "none";
    window.scrollTo(0,0);
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