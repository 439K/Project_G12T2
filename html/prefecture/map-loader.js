/**
 * map-loader.js
 * 各都道府県のHTMLから呼び出される共通地図読み込みライブラリ
 * モーダル表示・スタンプ大型化・キャッシュ機能統合版
 */
function initializeMap(config) {
    // =======================================================
    // 1. 設定の読み込みと状態の定義
    // =======================================================
    const { 
        prefectureId, 
        geojsonPath, 
        projectionConfig, 
        municipalityPathMap 
    } = config;

    const db = firebase.firestore();
    const storage = firebase.storage();
    let currentUser = null;

    const statusBox = document.getElementById('status-box') || document.getElementById('status');
    const checkBtn = document.getElementById('check-stamp-btn');
    
    let geoJSONData = null;
    let stampGroup = null;
    let stampProgress = {}; 

    // 定数
    const MAX_STAMPS = 3; 
    const LEVEL_COLORS = {
        0: "#e2ffdb", // 未獲得
        1: "#ffe082", // レベル1
        2: "#ffb300", // レベル2
        3: "#ff8f00"  // レベル3
    };

    function getTargetName(feature) {
        return feature.properties.N03_005 || feature.properties.N03_004;
    }

    function getStampImagePath(name, level) {
        const pathName = municipalityPathMap[name];
        if (!pathName) return "../../../stamp-img/default.png";
        return `../../../stamp-img/${prefectureId}/${pathName}/stamp${level}.png`;
    }

    // =======================================================
    // 2. データの保存と復元（キャッシュ機能追加）
    // =======================================================

    // キャッシュ用のキーを生成
    function getCacheKey() {
        return currentUser ? `stamp_cache_${prefectureId}_${currentUser.uid}` : null;
    }

    async function saveProgress() {
        if (!currentUser) return;
        try {
            // 1. Firebaseへ保存
            await db.collection('users').doc(currentUser.uid)
                    .collection('progress').doc(prefectureId)
                    .set({ stamps: stampProgress });

            // 2. ローカルキャッシュへ保存
            const key = getCacheKey();
            if (key) {
                localStorage.setItem(key, JSON.stringify(stampProgress));
            }
        } catch (error) {
            console.error("データの保存に失敗:", error);
        }
    }

    async function loadProgress() {
        if (!currentUser || !geoJSONData) return;

        const key = getCacheKey();

        // 1. まずはキャッシュから読み込んで即座に表示
        if (key) {
            const cachedData = localStorage.getItem(key);
            if (cachedData) {
                try {
                    stampProgress = JSON.parse(cachedData);
                    restoreMapState();
                    console.log("キャッシュからデータを復元しました");
                } catch (e) {
                    console.error("キャッシュデータの解析に失敗:", e);
                }
            }
        }

        // 2. 次にFirebaseから最新データを取得（バックグラウンド更新）
        try {
            const doc = await db.collection('users').doc(currentUser.uid)
                            .collection('progress').doc(prefectureId).get();
            
            if (doc.exists) {
                const cloudData = doc.data().stamps || {};
                
                // キャッシュとデータが異なる場合のみ再描画
                if (JSON.stringify(stampProgress) !== JSON.stringify(cloudData)) {
                    stampProgress = cloudData;
                    if (key) {
                        localStorage.setItem(key, JSON.stringify(stampProgress));
                    }
                    restoreMapState();
                    console.log("Firebaseの最新データと同期しました");
                }
            } else if (!localStorage.getItem(key)) {
                // クラウドにもキャッシュにもデータがない場合のみリセット
                resetMapAndProgress();
            }
        } catch (error) {
            console.error("Firebaseからの読み込みに失敗（オフラインの可能性があります）:", error);
        }
    }

    function restoreMapState() {
        if (!geoJSONData) return;

        svg.selectAll(".municipality")
            .attr("fill", LEVEL_COLORS[0])
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);
        
        if (stampGroup) stampGroup.selectAll("image").remove();

        Object.keys(stampProgress).forEach(name => {
            const progress = stampProgress[name];
            const feature = geoJSONData.features.find(f => getTargetName(f) === name);
            if (feature) {
                svg.select("#mun-" + name)
                    .attr("fill", LEVEL_COLORS[progress.level])
                    .attr("stroke", "#f5d56cff")
                    .attr("stroke-width", progress.level === MAX_STAMPS ? 3 : 2);
                
                updateStampImage(name, feature, progress.level, false);
            }
        });
    }

    function resetMapAndProgress() {
        stampProgress = {};
        if (stampGroup) stampGroup.selectAll("image").remove();
        if (geoJSONData) {
            svg.selectAll(".municipality")
                .attr("fill", LEVEL_COLORS[0])
                .attr("stroke", "#333")
                .attr("stroke-width", 0.5);
        }
        const key = getCacheKey();
        if (key) localStorage.removeItem(key);
    }

    // =======================================================
    // 3. D3.jsの初期化と描画
    // =======================================================

    const projection = d3.geoMercator()
        .scale(projectionConfig.scale) 
        .center(projectionConfig.center) 
        .translate([960 / 2, 500 / 2]);

    const path = d3.geoPath().projection(projection);

    const svg = d3.select("#map-container")
        .append("svg")
        .attr("viewBox", "0 0 960 500")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    d3.json(geojsonPath, function(error, geojson) {
        if (error) {
            console.error("地図データの読み込みエラー:", error);
            return;
        }
        geoJSONData = geojson;

        svg.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("class", "municipality")
            .attr("id", d => "mun-" + getTargetName(d))
            .attr("d", path)
            .attr("fill", LEVEL_COLORS[0])
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);

        stampGroup = svg.append("g").attr("class", "stamp-group");

        loadProgress();
        handleAutoCheck();
        setupModalEvents(); 
    });

    if (checkBtn) {
        checkBtn.addEventListener('click', getCurrentLocation);
    }
    
    // =======================================================
    // 4. スタンプラリーロジック & 画像更新
    // =======================================================

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadProgress();
        } else {
            currentUser = null;
            resetMapAndProgress();
        }
    });

    function getCurrentLocation() {
        if (!currentUser) {
            if (statusBox) statusBox.textContent = "ログインが必要です。";
            return;
        }
        if (statusBox) statusBox.textContent = "位置情報を取得中です...";

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => checkCurrentMunicipality(pos.coords.latitude, pos.coords.longitude),
                () => { if (statusBox) statusBox.textContent = "位置情報の取得に失敗しました。"; },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    }

    function checkCurrentMunicipality(currentLat, currentLng) {
        const point = turf.point([currentLng, currentLat]);
        let found = false;

        for (const feature of geoJSONData.features) {
            if (turf.booleanPointInPolygon(point, feature.geometry)) {
                const name = getTargetName(feature); 
                grantStamp(name, feature);
                found = true;
                break; 
            }
        }
        if (!found && statusBox) statusBox.textContent = "エリア外、または該当する場所がありません。";
    }

    function grantStamp(name, feature) {
        const currentTime = Date.now();
        let progress = stampProgress[name] || { level: 0, lastCheckIn: 0 };

        if (progress.level >= MAX_STAMPS) {
            if (statusBox) statusBox.textContent = `${name} のスタンプはコンプリート済みです！`;
            return;
        }

        // --- クールダウン判定の修正箇所 ---
        let requiredCooldown = 0;
        if (progress.level === 1) {
            requiredCooldown = 1 * 60 * 1000; // レベル1から2の間：1分
        } else if (progress.level === 2) {
            requiredCooldown = 10 * 60 * 1000; // レベル2から3の間：10分
        }

        const timeElapsed = currentTime - progress.lastCheckIn;

        if (timeElapsed < requiredCooldown) {
            const totalSecondsLeft = Math.ceil((requiredCooldown - timeElapsed) / 1000);
            const mins = Math.floor(totalSecondsLeft / 60);
            const secs = totalSecondsLeft % 60;
            const timeStr = mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;

            if (statusBox) statusBox.textContent = `クールダウン中...あと ${timeStr}`;
            return;
        }
        // ------------------------------

        progress.level += 1;
        progress.lastCheckIn = currentTime;
        stampProgress[name] = progress;
        saveProgress();

        svg.select("#mun-" + name)
            .transition().duration(500)
            .attr("fill", LEVEL_COLORS[progress.level])
            .attr("stroke", "#f5d56cff")
            .attr("stroke-width", progress.level === MAX_STAMPS ? 3 : 2);

        updateStampImage(name, feature, progress.level, true);
        if (statusBox) statusBox.textContent = `${name} のスタンプ (Lv.${progress.level}) を獲得！`;
    }

    async function updateStampImage(name, feature, level, useTransition) {
        const stampId = "stamp-" + name;
        let stampElement = d3.select("#" + stampId);
        const centroid = path.centroid(feature); 
        
        const currentSize = 60 + (level - 1) * 20; 
        
        let imagePath = null;
        try {
            const storageRefPath = `stamps/${prefectureId}/${name}_${level}.png`;
            imagePath = await storage.ref(storageRefPath).getDownloadURL();
        } catch (e1) {
            try {
                const prefecturePath = `stamps/${prefectureId}/${prefectureId}_${level}.png`;
                imagePath = await storage.ref(prefecturePath).getDownloadURL();
            } catch (e2) {
                imagePath = getStampImagePath(name, level);
            }
        }

        if (stampElement.empty()) {
            stampElement = stampGroup.append("image")
                .attr("id", stampId)
                .attr("href", imagePath)
                .attr("x", centroid[0] - currentSize / 2)
                .attr("y", centroid[1] - currentSize / 2)
                .attr("width", currentSize)
                .attr("height", currentSize)
                .attr("opacity", 0)
                .style("cursor", "pointer")
                .on("click", () => showStampModal(name, imagePath, level));

            const target = useTransition ? stampElement.transition().duration(500) : stampElement;
            target.attr("opacity", 1);
        } else {
            const el = useTransition ? stampElement.transition().duration(300) : stampElement;
            el.attr("href", imagePath)
                .attr("x", centroid[0] - currentSize / 2)
                .attr("y", centroid[1] - currentSize / 2)
                .attr("width", currentSize)
                .attr("height", currentSize)
                .on("end", function() {
                    d3.select(this).on("click", () => showStampModal(name, imagePath, level));
                });
        }
    }

    // =======================================================
    // 5. モーダル表示ロジック
    // =======================================================

    function showStampModal(name, imgSrc, level) {
        const modal = document.getElementById("img-modal");
        if (!modal) return;

        document.getElementById("modal-city-name").textContent = name;
        document.getElementById("modal-img").src = imgSrc;
        document.getElementById("modal-desc").textContent = `${name}のスタンプ (レベル ${level}) です。現地を訪れて獲得しました！`;
        modal.style.display = "flex";
    }

    function setupModalEvents() {
        const modal = document.getElementById("img-modal");
        const closeBtn = document.getElementById("modal-close");

        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                modal.style.display = "none";
            });
        }

        window.addEventListener("click", (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    }

    function handleAutoCheck() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autocheck') === 'true') {
            setTimeout(() => { getCurrentLocation(); }, 1000);
        }
    }
}