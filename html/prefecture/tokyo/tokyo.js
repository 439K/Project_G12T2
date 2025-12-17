document.addEventListener('DOMContentLoaded', function() {
    
    // =======================================================
    // Firebase Firestoreの初期化
    // =======================================================
    const db = firebase.firestore();
    const storage = firebase.storage();

    // =======================================================
    // 1. グローバル状態、定数、UI要素の定義
    // =======================================================
    const statusBox = document.getElementById('status-box') || document.getElementById('status');
    const checkBtn = document.getElementById('check-stamp-btn');
    
    var tokyoGeoJSON = null;
    var stampGroup = null;

    // スタンプの進捗状況
    var stampProgress = {}; 

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

    // スタンプ画像パス
    const STAMP_IMAGES = {
        1: "../stamp-img/tokyo/kita-ku/stamp1.png", 
        2: "../stamp-img/tokyo/kita-ku/stamp2.png", 
        3: "../stamp-img/tokyo/kita-ku/stamp3.png" 
    };

    function getStampImagePath(level) {
        return STAMP_IMAGES[level] || "default.png"; 
    }

    // =======================================================
    // 2. D3.jsの初期化と描画
    // =======================================================

    // プロジェクション設定
    var projection = d3.geoMercator()
        .scale(52000) 
        .center([139.43, 35.68]) 
        .translate([960 / 2, 500 / 2]);

    var path = d3.geoPath().projection(projection);

    // SVGステージの作成 (レスポンシブ対応)
    var svg = d3.select("#map-container")
        .append("svg")
        .attr("viewBox", "0 0 960 500")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    // GeoJSONデータの読み込み
    d3.json("tokyo.geojson", function(error, geojson) {
        if (error) {
            console.error("GeoJSON読み込みエラー:", error);
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
            .attr("fill-opacity", 1.0)
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);

        stampGroup = svg.append("g").attr("class", "stamp-group");
    });

    // ボタンクリックイベント
    if (checkBtn) {
        checkBtn.addEventListener('click', getCurrentLocation);
    }

    // =======================================================
    // 3. スタンプラリー機能
    // =======================================================

    function getCurrentLocation() {
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
        const newLevel = progress.level;

        // 4. 地図のスタイル更新
        svg.select("#mun-" + municipalityName)
            .transition().duration(500)
            .attr("fill", LEVEL_COLORS[newLevel])
            .attr("stroke", "#f5d56cff")
            .attr("stroke-width", newLevel === MAX_STAMPS ? 3 : 2);

        // 5. スタンプ画像更新
        const stampId = "stamp-" + municipalityName;
        let stampElement = d3.select("#" + stampId);
        const centroid = path.centroid(feature); 
        const currentSize = 30 + (newLevel - 1) * 10; 
        
        // デフォルトはローカルのレベル別画像
        let imagePath = getStampImagePath(newLevel);
        // Firebaseから画像URLを取得して上書き
        try {
            // Storageから直接画像URLを取得 (例: stamps/tokyo/北区_1.png)
            const path = `stamps/tokyo/${municipalityName}_${newLevel}.png`;
            imagePath = await storage.ref(path).getDownloadURL();
        } catch (e) {
        }

        if (stampElement.empty()) {
            stampGroup.append("image")
                .attr("id", stampId)
                .attr("xlink:href", imagePath)
                .attr("x", centroid[0] - currentSize / 2)
                .attr("y", centroid[1] - currentSize / 2)
                .attr("width", currentSize)
                .attr("height", currentSize)
                .attr("opacity", 0)
                .transition().duration(500).attr("opacity", 1);
        } else {
            // 画像のパスはアニメーションできないため、transitionの前に即時更新する
            stampElement.attr("xlink:href", imagePath);
            stampElement.transition().duration(300)
                .attr("x", centroid[0] - currentSize / 2)
                .attr("y", centroid[1] - currentSize / 2)
                .attr("width", currentSize)
                .attr("height", currentSize);
        }

        if (statusBox) statusBox.textContent = `${municipalityName} のスタンプ (Lv.${newLevel}/${MAX_STAMPS}) を獲得！`;
    }
});