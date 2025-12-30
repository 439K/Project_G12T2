import { auth, db, storage, ref, getDownloadURL, onAuthStateChanged, doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit } from './firebase-service.js'; 
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

// ★追加: 市町村名と画像フォルダ名のマッピング (collection.jsより移植)
const MUNICIPALITY_PATH_MAP = {
    // 東京都
    "千代田区": "chiyoda-ku", "中央区": "chuo-ku", "港区": "minato-ku", "新宿区": "shinjuku-ku",
    "文京区": "bunkyo-ku", "台東区": "taito-ku", "墨田区": "sumida-ku", "江東区": "koto-ku",
    "品川区": "shinagawa-ku", "目黒区": "meguro-ku", "大田区": "ota-ku", "世田谷区": "setagaya-ku",
    "渋谷区": "shibuya-ku", "中野区": "nakano-ku", "杉並区": "suginami-ku", "豊島区": "toshima-ku",
    "北区": "kita-ku", "荒川区": "arakawa-ku", "板橋区": "itabashi-ku", "練馬区": "nerima-ku",
    "足立区": "adachi-ku", "葛飾区": "katsushika-ku", "江戸川区": "edogawa-ku",
    // 神奈川県
    "横浜市": "yokohama-shi", "川崎市": "kawasaki-shi", "相模原市": "sagamihara-shi",
    "横須賀市": "yokosuka-shi", "鎌倉市": "kamakura-shi", "藤沢市": "fujisawa-shi",
    "小田原市": "odawara-shi", "茅ヶ崎市": "chigasaki-shi", "逗子市": "zushi-shi",
    "三浦市": "miura-shi", "秦野市": "hadano-shi", "厚木市": "atsugi-shi",
    "大和市": "yamato-shi", "伊勢原市": "isehara-shi", "海老名市": "ebina-shi",
    "座間市": "zama-shi", "南足柄市": "minamiashigara-shi", "綾瀬市": "ayase-shi",
    "葉山町": "hayama-machi", "寒川町": "samukawa-machi", "大磯町": "oiso-machi",
    "二宮町": "ninomiya-machi", "中井町": "nakai-machi", "大井町": "oi-machi",
    "松田町": "matsuda-machi", "山北町": "yamakita-machi", "開成町": "kaisei-machi",
    "箱根町": "hakone-machi", "真鶴町": "manazuru-machi", "湯河原町": "yugawara-machi",
    "愛川町": "aikawa-machi", "清川村": "kiyokawa-mura"
    // 必要に応じて他の県も追加
};

const stampKeys = Object.keys(stampMasterData);
let currentFriendsList = [];

// ★追加: ランキング用スタイル定義
const rankingStyle = document.createElement("style");
rankingStyle.innerText = `
    .ranking-tabs {
        display: flex;
        justify-content: center;
        margin-bottom: 15px;
        background-color: transparent;
        gap: 10px;
    }
    .ranking-tab {
        flex: 1;
        padding: 12px;
        background-color: rgba(139, 126, 116, 0.7);
        border: 1px solid #ddd;
        border-radius: 50px;
        font-size: 16px;
        font-weight: bold;
        color: #fff;
        cursor: pointer;
        transition: all 0.3s;
        backdrop-filter: blur(5px);
    }
    .ranking-tab.active {
        background-color: rgba(255, 252, 249, 0.75);
        color: #5a4e46;
        border-color: #8b7e74;
        backdrop-filter: blur(5px);
    }
    .ranking-tab:hover {
        background-color: rgba(122, 110, 101, 0.85);
    }
    .ranking-tab.active:hover {
        background-color: rgba(255, 255, 255, 0.9);
    }
    .ranking-back-btn {
        background-color: rgba(255, 255, 255, 0.75);
        border: 1px solid #b8860b;
        color: #5a4e46;
        font-size: 1rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 20px;
        border-radius: 25px;
        transition: all 0.3s;
        font-weight: bold;
        backdrop-filter: blur(5px);
    }
    .ranking-back-btn:hover {
        background-color: rgba(255, 255, 255, 0.9);
    }
`;
document.head.appendChild(rankingStyle);

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

let currentRankingMode = 'friend'; // 'friend' | 'global'

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
            let finalStats = { total: 0 };
            let finalIsPublic = true; // デフォルトは公開

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

                    if (userData.stats) {
                        finalStats = userData.stats;
                    }

                    if (userData.isProfilePublic !== undefined) {
                        finalIsPublic = userData.isProfilePublic;
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
                stats: finalStats,
                isProfilePublic: finalIsPublic,
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
        const stampCount = (user.stats && user.stats.total !== undefined) ? user.stats.total : 0;
        const bioText = user.bio || "自己紹介なし"; 
        
        // 公開設定チェック (undefined または true なら公開)
        const isPublic = user.isProfilePublic !== false;
        const stampDisplay = isPublic ? `スタンプ数: ${stampCount}` : `スタンプ数: 非公開`;

        userInfoDiv.innerHTML = `
            <img src="${iconSrc}" class="user-icon" alt="icon">
            <div class="user-details-container">
                <div class="user-top-row">
                    <strong class="user-name">${user.displayName}</strong>
                    <span class="user-uid">ID: ${user.uid.substring(0,8)}...</span>
                </div>
                <div class="user-bottom-row">
                    <span class="user-bio">${bioText}</span>
                    <span class="user-stamp-badge">${stampDisplay}</span>
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
            bio: user.bio || "自己紹介なし",
            stats: user.stats || { total: 0 }
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
        
        // ★追加: 公開設定のチェック (設定がない場合は true=公開 とみなす)
        const isPublic = userData.isProfilePublic !== false;

        const displayName = userData.displayName || "名無しユーザー";
        const bio = userData.bio || "自己紹介はまだありません。";
        const coverUrl = userData.coverUrl || ""; 
        const avatarUrl = userData.avatarUrl || userData.icon || "https://placehold.co/100x100?text=User";
        const stats = userData.stats || { total: 0, prefs: 0, rate: 0 };
        
        if(profileDetailsDiv) {
            let contentHTML = `
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
            `;

            if (!isPublic) {
                // ▼ 非公開の場合の表示
                contentHTML += `
                    <div class="friend-card" style="text-align: center; padding: 40px 20px; color: #666;">
                        <i class="fas fa-lock" style="font-size: 3em; margin-bottom: 15px; color: #ccc;"></i>
                        <h3>このユーザーはプロフィールを非公開にしています</h3>
                    </div>
                `;
            } else {
                // ▼ 公開の場合の表示（既存の内容）
                contentHTML += `
                    <div class="friend-card">
                        <h3>自己紹介</h3>
                        <div class="friend-bio-text">${bio}</div>
                    </div>

                    <div class="friend-card">
                        <h3>記録</h3>
                        <div class="friend-stats">
                            <div class="friend-stat-item">
                                <div class="friend-stat-value">${stats.total || 0}</div>
                                <div class="friend-stat-label">スタンプ数</div>
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
            
            profileDetailsDiv.innerHTML = contentHTML;
        }

        // スタンプ描画処理（公開されている場合のみ実行）
        // ★修正: Firestoreから実際の獲得スタンプを取得して表示
        const insertArea = document.getElementById("friend-stamps-insert-area");
        if(insertArea && isPublic) {
            insertArea.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> 読み込み中...</div>';

            try {
                // progressサブコレクションを取得
                const progressRef = collection(db, "users", uid, "progress");
                const progressSnap = await getDocs(progressRef);

                let earnedStamps = [];

                progressSnap.forEach(doc => {
                    const prefId = doc.id;
                    const data = doc.data();
                    const cities = data.stamps || {}; 

                    Object.keys(cities).forEach(cityName => {
                        const cityData = cities[cityName];
                        if (cityData && cityData.level > 0) {
                            // レベルごとにスタンプ情報を生成
                            for (let l = 1; l <= cityData.level; l++) {
                                 earnedStamps.push({
                                    prefId: prefId,
                                    cityName: cityName,
                                    level: l
                                });
                            }
                        }
                    });
                });

                // ランダムに5つ抽出（「最近」のデータがないため）
                const displayStamps = earnedStamps.sort(() => 0.5 - Math.random()).slice(0, 5);

                if (displayStamps.length === 0) {
                    insertArea.innerHTML = "<p style='color:#999; font-size:14px; text-align:center;'>シールはまだありません</p>";
                } else {
                    const gridDiv = document.createElement("div");
                    gridDiv.className = "friend-stamps-grid";

                    // ★修正: Storageから画像URLを取得 (非同期処理)
                    const stampPromises = displayStamps.map(async (stamp) => {
                        let src = "../src/images/NoneCeal.png"; 
                        const pathName = MUNICIPALITY_PATH_MAP[stamp.cityName];
                        
                        // 1. ローカルパス (フォールバック用)
                        if (pathName) {
                            src = `prefecture/stamp-img/${stamp.prefId}/${pathName}/stamp${stamp.level}.png`;
                        }

                        // 2. StorageからURL取得を試みる
                        try {
                            // A. 市区町村固有
                            const municipalityPath = `stamps/${stamp.prefId}/${stamp.cityName}_${stamp.level}.png`;
                            src = await getDownloadURL(ref(storage, municipalityPath));
                        } catch (e1) {
                            try {
                                // B. 都道府県共通
                                const prefecturePath = `stamps/${stamp.prefId}/${stamp.prefId}_${stamp.level}.png`;
                                src = await getDownloadURL(ref(storage, prefecturePath));
                            } catch (e2) {
                                // C. どちらもなければローカルパスを使用
                            }
                        }
                        return { ...stamp, src };
                    });

                    const resolvedStamps = await Promise.all(stampPromises);

                    resolvedStamps.forEach(stamp => {
                        const itemDiv = document.createElement("div");
                        itemDiv.className = "friend-stamp-item";
                        
                        const img = document.createElement("img");
                        img.src = stamp.src;
                        img.className = "friend-stamp-img";
                        img.alt = `${stamp.cityName}`;
                        img.title = `${stamp.cityName} (Lv.${stamp.level})`;
                        
                        // 画像読み込みエラー時はデフォルト画像へ
                        img.onerror = function() {
                            this.src = "../src/images/NoneCeal.png";
                        };

                        itemDiv.appendChild(img);
                        
                        // クリック時のアクション（簡易アラート）
                        itemDiv.addEventListener("click", () => {
                            alert(`${stamp.cityName}のスタンプ (Lv.${stamp.level})`);
                        });
                        
                        gridDiv.appendChild(itemDiv);
                    });
                    
                    insertArea.innerHTML = "";
                    insertArea.appendChild(gridDiv);
                }

            } catch (err) {
                console.error("スタンプデータ取得エラー:", err);
                let msg = "データの読み込みに失敗しました";
                if (err.code === 'permission-denied') {
                    msg = "閲覧権限がありません。<br>Firestoreルールで progress の読み取りを許可してください。";
                } else {
                    msg += `<br><span style="font-size:0.8em;">${err.message}</span>`;
                }
                insertArea.innerHTML = `<p style="text-align:center; color:red;">${msg}</p>`;
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
async function showRanking() {
    if(mainContent) {
        mainContent.style.padding = ""; 
        mainContent.style.display = ""; 
    }

    listContainer.style.display = "none";
    profileContainer.style.display = "none";
    rankingContainer.style.display = "block";

    // タブUIとリストコンテナを構築
    rankingContainer.innerHTML = `
        <div style="margin-bottom: 10px;">
            <button id="ranking-back-btn" class="ranking-back-btn">
                <i class="fas fa-arrow-left"></i> リストに戻る
            </button>
        </div>
        <div class="ranking-tabs">
            <button id="tab-friend" class="ranking-tab ${currentRankingMode === 'friend' ? 'active' : ''}">フレンド</button>
            <button id="tab-global" class="ranking-tab ${currentRankingMode === 'global' ? 'active' : ''}">全国TOP50</button>
        </div>
        <ul id="ranking-list">
            <li class="loading" style="text-align:center; padding:20px; color:#666;">
                <i class="fas fa-spinner fa-spin"></i> 読み込み中...
            </li>
        </ul>
    `;

    // イベントリスナー設定
    document.getElementById('ranking-back-btn').addEventListener('click', showList);
    document.getElementById('tab-friend').addEventListener('click', () => switchRankingMode('friend'));
    document.getElementById('tab-global').addEventListener('click', () => switchRankingMode('global'));

    await renderRankingList(currentRankingMode);
}

// ランキングモード切り替え
async function switchRankingMode(mode) {
    if (currentRankingMode === mode) return;
    currentRankingMode = mode;

    // タブの見た目更新
    document.querySelectorAll('.ranking-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(mode === 'friend' ? 'tab-friend' : 'tab-global').classList.add('active');

    await renderRankingList(mode);
}

// ランキングリスト描画
async function renderRankingList(mode) {
    const ul = document.getElementById('ranking-list');
    if (!ul) return;
    
    ul.innerHTML = '<li class="loading" style="text-align:center; padding:20px; color:#666;"><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>';

    let sortedUsers = [];
    const currentUser = auth.currentUser;

    try {
        if (mode === 'friend') {
            // --- フレンドランキング ---
            let allUsers = [...currentFriendsList];
            
            if (currentUser) {
                try {
                    // 自分自身の最新データを取得
                    const userDocRef = doc(db, "users", currentUser.uid);
                    const userSnap = await getDoc(userDocRef);
                    if (userSnap.exists()) {
                        const myData = { uid: currentUser.uid, ...userSnap.data() };
                        // 重複チェック
                        if (!allUsers.some(u => u.uid === currentUser.uid)) {
                            allUsers.push(myData);
                        }
                    }
                } catch (e) {
                    console.error("自分のランキング用データ取得失敗", e);
                }
            }

            sortedUsers = allUsers
                .filter(user => {
                    // 自分自身は無条件で表示、他人は非公開設定なら除外
                    if (currentUser && user.uid === currentUser.uid) return true;
                    return user.isProfilePublic !== false;
                })
                .sort((a, b) => {
                    const countA = (a.stats && a.stats.total !== undefined) ? a.stats.total : 0;
                    const countB = (b.stats && b.stats.total !== undefined) ? b.stats.total : 0;
                    return countB - countA;
                });

        } else {
            // --- 全体ランキング (TOP 50) ---
            const usersRef = collection(db, "users");
            // stats.total の降順で上位50件を取得
            const q = query(usersRef, orderBy("stats.total", "desc"), limit(50));
            const snapshot = await getDocs(q);
            
            const tempUsers = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                // 非公開ユーザーを除外 (自分自身は表示)
                const isMe = (currentUser && doc.id === currentUser.uid);
                if (d.isProfilePublic !== false || isMe) {
                    tempUsers.push({ uid: doc.id, ...d });
                }
            });
            
            sortedUsers = tempUsers;
        }

        // --- 描画 ---
        ul.innerHTML = "";
        if (sortedUsers.length === 0) {
            ul.innerHTML = '<li class="message" style="text-align:center; padding:20px;">データがありません</li>';
            return;
        }

        sortedUsers.forEach((user, index) => {
            const rank = index + 1;
            const li = document.createElement("li");
            if (rank <= 3) li.classList.add(`rank-${rank}`); 

            const isMe = (currentUser && user.uid === currentUser.uid);
            if (isMe) {
                li.style.backgroundColor = "#f9f9f9"; // ほんのりグレー
                li.style.border = "1px solid #ddd";
            }

            let iconHtml = "";
            if (rank === 1) iconHtml = '<i class="fa-solid fa-crown" style="color:gold;"></i> ';
            else if (rank === 2) iconHtml = '<i class="fa-solid fa-crown" style="color:silver;"></i> ';
            else if (rank === 3) iconHtml = '<i class="fa-solid fa-crown" style="color:#cd7f32;"></i> ';
            
            const stampCount = (user.stats && user.stats.total !== undefined) ? user.stats.total : 0;
            const iconSrc = user.icon || user.avatarUrl || "https://placehold.co/100x100?text=User";
            const bioText = user.bio || "自己紹介なし";
            const displayName = (user.displayName || "名無し") + (isMe ? " (あなた)" : "");

            li.innerHTML = `
                <div style="display:flex; align-items:center; flex:1; overflow:hidden;">
                    <div class="rank-number" style="min-width:40px; text-align:center; font-weight:bold; font-size:1.1em;">${iconHtml}${rank}</div>
                    <img src="${iconSrc}" style="width:40px; height:40px; border-radius:50%; margin:0 10px; object-fit:cover;">
                    <div class="user-details-container">
                        <div class="user-top-row">
                            <strong class="user-name">${displayName}</strong>
                            <span class="user-uid">ID: ${user.uid.substring(0,8)}...</span>
                        </div>
                        <div class="user-bottom-row">
                            <span class="user-bio" style="font-size:0.8em; color:#666;">${bioText}</span>
                        </div>
                    </div>
                </div>
                <span class="rank-count" style="margin-left:10px; font-weight:bold; color:#8b7e74; white-space:nowrap;">${stampCount} 枚</span>
            `;
            li.style.cursor = "pointer";
            li.style.padding = "10px";
            li.style.borderBottom = "1px solid #f0f0f0";
            li.addEventListener("click", () => showProfile(user.uid));
            ul.appendChild(li);
        });

    } catch (err) {
        console.error("ランキング表示エラー:", err);
        ul.innerHTML = '<li class="message" style="text-align:center; padding:20px; color:red;">ランキングの読み込みに失敗しました</li>';
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