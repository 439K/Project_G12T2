document.addEventListener('DOMContentLoaded', function() {
    
    // UI要素の取得
    const statusBox = document.getElementById('status-box') || document.getElementById('status');
    const checkBtn = document.getElementById('check-stamp-btn');

    // D3.js関連の変数
    var tokyoGeoJSON = null;
    var stampGroup = null;

    // --- 設定値 ---
    var stampProgress = {}; // 進捗管理
    const COOLDOWN_MS = 5 * 1000; // 5秒
    const MAX_STAMPS = 3; 

    const LEVEL_COLORS = {
        0: "#e2ffdb", // 未獲得
        1: "#ffe082", // Level 1
        2: "#ffb300", // Level 2
        3: "#ff8f00"  // Level 3
    };

    const STAMP_IMAGES = {
        1: "stamp1.png", 
        2: "stamp2.png", 
        3: "stamp3.png"  
    };

    function getStampImagePath(level) {
        return STAMP_IMAGES[level] || "stamp.png"; 
    }

    // 1. プロジェクションの設定（精度の高い設定を採用）
    var projection = d3.geoMercator()
        .scale(52000)
        .center([139.43, 35.68]) 
        .translate([960 / 2, 500 / 2]);

    // 2. パスジェネレーター
    var path = d3.geoPath().projection(projection);

    // 3. SVGステージの作成（レスポンシブ）
    var svg = d3.select("#map-container")
        .append("svg")
        .attr("viewBox", "0 0 960 500")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    // 4. GeoJSONデータの読み込み
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
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);

        stampGroup = svg.append("g").attr("class", "stamp-group");
    });

    // 5. ボタンイベント
    if (checkBtn) {
        checkBtn.addEventListener('click', getCurrentLocation);
    }

    function getCurrentLocation() {
        if (statusBox) statusBox.textContent = "位置情報を取得中です...";

        if (!tokyoGeoJSON) {
            if (statusBox) statusBox.textContent = "地図データを読み込み中です。";
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
        checkCurrentMunicipality(lat, lng);
    }

    function errorCallback(error) {
        if (statusBox) statusBox.textContent = "位置情報の取得に失敗しました。";
    }

    function checkCurrentMunicipality(currentLat, currentLng) {
        const point = turf.point([currentLng, currentLat]);
        let currentMunicipalityName = null;
        let currentMunicipalityFeature = null;

        for (const feature of tokyoGeoJSON.features) {
            const isInside = turf.booleanPointInPolygon(point, feature.geometry);
            if (isInside) {
                currentMunicipalityName = feature.properties.N03_004;
                currentMunicipalityFeature = feature;
                break;
            }
        }

        if (currentMunicipalityName) {
            grantStamp(currentMunicipalityName, currentMunicipalityFeature);
        } else {
            if (statusBox) statusBox.textContent = "東京都のエリア外です。";
        }
    }

    function grantStamp(municipalityName, feature) {
        const currentTime = Date.now();
        let progress = stampProgress[municipalityName] || { level: 0, lastCheckIn: 0 };
        const currentLevel = progress.level;

        // 獲得済みチェック
        if (currentLevel >= MAX_STAMPS) {
            if (statusBox) statusBox.textContent = `${municipalityName}は全レベル獲得済みです！`;
            return;
        }

        // クールダウンチェック
        const timeElapsed = currentTime - progress.lastCheckIn;
        if (timeElapsed < COOLDOWN_MS) {
            const timeLeftSec = Math.ceil((COOLDOWN_MS - timeElapsed) / 1000);
            if (statusBox) statusBox.textContent = `${municipalityName}の次まであと ${timeLeftSec} 秒お待ちください。`;
            return;
        }

        // レベルアップ処理
        progress.level += 1;
        progress.lastCheckIn = currentTime;
        stampProgress[municipalityName] = progress;
        const newLevel = progress.level;

        // 地図更新
        svg.select("#mun-" + municipalityName)
            .transition().duration(500)
            .attr("fill", LEVEL_COLORS[newLevel])
            .attr("stroke", "#f5d56c")
            .attr("stroke-width", newLevel === MAX_STAMPS ? 3 : 2);

        // スタンプ画像更新
        const stampId = "stamp-" + municipalityName;
        let stampElement = d3.select("#" + stampId);
        const centroid = path.centroid(feature);
        const currentStampSize = 30 + (newLevel - 1) * 10;
        const newStampPath = getStampImagePath(newLevel);

        if (stampElement.empty()) {
            stampGroup.append("image")
                .attr("id", stampId)
                .attr("xlink:href", newStampPath)
                .attr("x", centroid[0] - currentStampSize / 2)
                .attr("y", centroid[1] - currentStampSize / 2)
                .attr("width", currentStampSize)
                .attr("height", currentStampSize)
                .attr("opacity", 0)
                .transition().duration(500).attr("opacity", 1);
        } else {
            stampElement.transition().duration(300)
                .attr("xlink:href", newStampPath)
                .attr("x", centroid[0] - currentStampSize / 2)
                .attr("y", centroid[1] - currentStampSize / 2)
                .attr("width", currentStampSize)
                .attr("height", currentStampSize);
        }

        if (statusBox) statusBox.textContent = `${municipalityName} レベル ${newLevel} 獲得！`;
    }
});