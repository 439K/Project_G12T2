document.addEventListener('DOMContentLoaded', function() {
    
    // =======================================================
    // 1. グローバル状態、定数、UI要素の定義
    // =======================================================
    const db = firebase.firestore();
    const storage = firebase.storage();
    let currentUser = null;

    const statusBox = document.getElementById('status-box') || document.getElementById('status');
    const checkBtn = document.getElementById('check-stamp-btn');
    
    let tokyoGeoJSON = null;
    let stampGroup = null;

    // 進捗データ
    let stampProgress = {}; 

    // クールダウン期間 (5秒)
    const COOLDOWN_MS = 5 * 1000; 
    const MAX_STAMPS = 3; 

    // レベルに応じた色
    const LEVEL_COLORS = {
        0: "#e2ffdb", // 未獲得
        1: "#ffe082", // レベル1
        2: "#ffb300", // レベル2
        3: "#ff8f00"  // レベル3
    };

    // 市区町村名と画像フォルダ名のマッピング
    const MUNICIPALITY_PATH_MAP = {
        "千代田区": "chiyoda-ku",
        "中央区": "chuo-ku",
        "港区": "minato-ku",
        "新宿区": "shinjuku-ku",
        "文京区": "bunkyo-ku",
        "台東区": "taito-ku",
        "墨田区": "sumida-ku",
        "江東区": "koto-ku",
        "品川区": "shinagawa-ku",
        "目黒区": "meguro-ku",
        "大田区": "ota-ku",
        "世田谷区": "setagaya-ku",
        "渋谷区": "shibuya-ku",
        "中野区": "nakano-ku",
        "杉並区": "suginami-ku",
        "豊島区": "toshima-ku",
        "北区": "kita-ku",
        "荒川区": "arakawa-ku",
        "板橋区": "itabashi-ku",
        "練馬区": "nerima-ku",
        "足立区": "adachi-ku",
        "葛飾区": "katsushika-ku",
        "江戸川区": "edogawa-ku"
    };

    function getStampImagePath(municipalityName, level) {
        const pathName = MUNICIPALITY_PATH_MAP[municipalityName];
        if (!pathName) return "../stamp-img/default.png"; // マッピングにない場合はデフォルト画像
        return `../stamp-img/tokyo/${pathName}/stamp${level}.png`;
    }

    // =======================================================
    // 2. データの永続化 (Firestore)
    // =======================================================

    async function saveProgress() {
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid).collection('progress').doc('tokyo').set({ stamps: stampProgress });
        } catch (error) {
            console.error("データの保存に失敗:", error);
        }
    }

    async function loadProgress() {
        if (!currentUser || !tokyoGeoJSON) return;

        try {
            const doc = await db.collection('users').doc(currentUser.uid).collection('progress').doc('tokyo').get();
            if (doc.exists) {
                stampProgress = doc.data().stamps || {};
                restoreMapState();
            } else {
                // Firestoreにデータがない場合は初期状態
                resetMapAndProgress();
            }
        } catch (error) {
            console.error("データの読み込みに失敗:", error);
        }
    }

    function restoreMapState() {
        if (!tokyoGeoJSON) return;

        // 全ての市区町村を一度リセット
        svg.selectAll(".municipality")
            .attr("fill", LEVEL_COLORS[0])
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);
        
        // スタンプ画像を一度リセット
        if (stampGroup) stampGroup.selectAll("image").remove();

        // 保存された進捗に基づいて復元
        Object.keys(stampProgress).forEach(municipalityName => {
            const progress = stampProgress[municipalityName];
            const feature = tokyoGeoJSON.features.find(f => f.properties.N03_004 === municipalityName);
            if (feature) {
                svg.select("#mun-" + municipalityName)
                    .attr("fill", LEVEL_COLORS[progress.level])
                    .attr("stroke", "#f5d56cff")
                    .attr("stroke-width", progress.level === MAX_STAMPS ? 3 : 2);
                
                updateStampImage(municipalityName, feature, progress.level, false); // アニメーションなしで更新
            }
        });
    }

    function resetMapAndProgress() {
        stampProgress = {};
        if (stampGroup) stampGroup.selectAll("image").remove();
        if (tokyoGeoJSON) {
            svg.selectAll(".municipality").attr("fill", LEVEL_COLORS[0]).attr("stroke", "#333").attr("stroke-width", 0.5);
        }
        if (statusBox) statusBox.textContent = "地図上のエリアに移動してスタンプをゲットしよう！";
    }

    // =======================================================
    // 3. D3.jsの初期化と描画
    // =======================================================

    // プロジェクション設定
    const projection = d3.geoMercator()
        .scale(52000) 
        .center([139.43, 35.68]) 
        .translate([960 / 2, 500 / 2]);

    const path = d3.geoPath().projection(projection);

    // SVGステージの作成 (レスポンシブ対応)
    const svg = d3.select("#map-container")
        .append("svg")
        .attr("viewBox", "0 0 960 500")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    // GeoJSONデータの読み込み
    d3.json("tokyo.geojson", function(error, geojson) {
        if (error) {
            console.error("地図データの読み込みエラー:", error);
            if (statusBox) statusBox.textContent = "地図データの読み込みに失敗しました。";
            return;
        }

        tokyoGeoJSON = geojson;

        svg.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("class", "municipality")
            .attr("id", d => "mun-" + d.properties.N03_004)
            .attr("d", path)
            .attr("fill", LEVEL_COLORS[0])
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);

        stampGroup = svg.append("g").attr("class", "stamp-group");

        // 地図描画後、ログイン状態に応じてデータを読み込む
        loadProgress();
    });

    // ボタンクリックイベント
    if (checkBtn) {
        checkBtn.addEventListener('click', getCurrentLocation);
    }
    
    // =======================================================
    // 4. 認証とスタンプラリー機能
    // =======================================================

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            if (statusBox) statusBox.textContent = "ログインしました。データを読み込んでいます...";
            loadProgress();
        } else {
            currentUser = null;
            resetMapAndProgress();
        }
    });

    function getCurrentLocation() {
        if (!currentUser) {
            if (statusBox) statusBox.textContent = "この機能を利用するにはログインが必要です。";
            return;
        }

        if (statusBox) statusBox.textContent = "位置情報を取得中です...";

        if (!tokyoGeoJSON) {
            if (statusBox) statusBox.textContent = "地図データを読み込み中です。しばらくお待ちください。";
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        } else {
            alert("お使いのブラウザは位置情報に対応していません。");
        }
    }

    function successCallback(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (statusBox) statusBox.textContent = `現在地: 緯度 ${lat.toFixed(4)}, 経度 ${lng.toFixed(4)}`;
        checkCurrentMunicipality(lat, lng); 
    }

    function errorCallback(error) {
        if (statusBox) statusBox.textContent = "位置情報の取得に失敗しました。";
        console.error("位置情報の取得に失敗しました:", error);
    }

    function checkCurrentMunicipality(currentLat, currentLng) {
        const point = turf.point([currentLng, currentLat]);
        let found = false;

        for (const feature of tokyoGeoJSON.features) {
            if (turf.booleanPointInPolygon(point, feature.geometry)) {
                const municipalityName = feature.properties.N03_004; 
                grantStamp(municipalityName, feature);
                found = true;
                break; 
            }
        }
        
        if (!found && statusBox) {
            statusBox.textContent = "現在地は GeoJSON 区域外、または特定の市区町村内にいません。";
        }
    }

    async function grantStamp(municipalityName, feature) {
        const currentTime = Date.now();
        let progress = stampProgress[municipalityName] || { level: 0, lastCheckIn: 0 };
        const currentLevel = progress.level;

        // 1. 最大レベルチェック
        if (currentLevel >= MAX_STAMPS) {
            if (statusBox) statusBox.textContent = `${municipalityName} のスタンプはすべて獲得済みです！(Lv.${MAX_STAMPS})`;
            return;
        }

        // 2. クールダウンチェック
        const timeElapsed = currentTime - progress.lastCheckIn;
        if (timeElapsed < COOLDOWN_MS) {
            const timeLeftSec = Math.ceil((COOLDOWN_MS - timeElapsed) / 1000);
            if (statusBox) statusBox.textContent = `${municipalityName} の次まであと ${timeLeftSec} 秒お待ちください。`;
            return;
        }

        // 3. 更新処理
        progress.level += 1;
        progress.lastCheckIn = currentTime;
        stampProgress[municipalityName] = progress;
        saveProgress(); // Firestoreに保存
        const newLevel = progress.level;

        // 4. 地図のスタイル更新
        svg.select("#mun-" + municipalityName)
            .transition().duration(500)
            .attr("fill", LEVEL_COLORS[newLevel])
            .attr("stroke", "#f5d56cff")
            .attr("stroke-width", newLevel === MAX_STAMPS ? 3 : 2);

        // 5. スタンプ画像更新
        updateStampImage(municipalityName, feature, newLevel, true); // アニメーションありで更新

        if (statusBox) statusBox.textContent = `${municipalityName} のスタンプ (Lv.${newLevel}/${MAX_STAMPS}) を獲得！`;
    }

    async function updateStampImage(municipalityName, feature, level, useTransition) {
        const stampId = "stamp-" + municipalityName;
        let stampElement = d3.select("#" + stampId);
        const centroid = path.centroid(feature); 
        const currentSize = 30 + (level - 1) * 10; 
        
        // デフォルトはローカルのレベル別画像
        let imagePath = getStampImagePath(municipalityName, level);
        // Firebaseから画像URLを取得して上書き
        try {
            // Storageから直接画像URLを取得 (例: stamps/tokyo/北区_1.png)
            const path = `stamps/tokyo/${municipalityName}_${level}.png`;
            imagePath = await storage.ref(path).getDownloadURL();
        } catch (e) {
        }

        if (stampElement.empty()) {
            stampElement = stampGroup.append("image")
                .attr("id", stampId)
                .attr("href", imagePath)
                .attr("x", centroid[0] - currentSize / 2)
                .attr("y", centroid[1] - currentSize / 2)
                .attr("width", currentSize)
                .attr("height", currentSize)
                .attr("opacity", 0);
            
            if (useTransition) {
                stampElement.transition().duration(500).attr("opacity", 1);
            } else {
                stampElement.attr("opacity", 1);
            }
        } else {
            // 画像のパスはアニメーションできないため、transitionの前に即時更新する
            stampElement.attr("xlink:href", imagePath);
            stampElement.transition().duration(300)
                .attr("x", centroid[0] - currentSize / 2)
                .attr("y", centroid[1] - currentSize / 2)
                .attr("width", currentSize)
                .attr("height", currentSize);
        }
    }

    // Auto-check logic
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autocheck') === 'true') {
        // A small delay might be needed to ensure the map/data is ready
        setTimeout(() => {
            // Check if getCurrentLocation function exists before calling
            if (typeof getCurrentLocation === 'function') {
                getCurrentLocation();
            }
        }, 500);
    }
});
