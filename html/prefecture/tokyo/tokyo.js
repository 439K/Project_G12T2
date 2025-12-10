document.addEventListener('DOMContentLoaded', function() {
    // =======================================================
    // A. グローバル状態、定数、UI要素の定義 (mmk と main の統合)
    // =======================================================
    // UI要素の取得 (main)
    const statusBox = document.getElementById('status-box');
    const checkBtn = document.getElementById('check-stamp-btn');
    
    // D3.jsによる地図描画スクリプトのためのグローバル変数
    var tokyoGeoJSON = null;
    var stampGroup = null;

    // スタンプの進捗状況を保持するオブジェクト (mmk)
    // 例: { "千代田区": { level: 2, lastCheckIn: 1700000000000 } }
    var stampProgress = {}; 

    // クールダウン期間 (ミリ秒) - 5秒 (mmk)
    const COOLDOWN_MS = 5 * 1000; 
    const MAX_STAMPS = 3; // 各市区町村で獲得できる最大スタンプ数 (mmk)

    // スタンプレベルに応じた色パレット (mmk)
    const LEVEL_COLORS = {
        0: "#e2ffdb", // Default (未獲得)
        1: "#ffe082", // Level 1 (薄い金色)
        2: "#ffb300", // Level 2 (中くらいの金色)
        3: "#ff8f00"  // Level 3 (最終、濃い金色)
    };

    // スタンプ画像パスの管理オブジェクト (mmk)
    const STAMP_IMAGES = {
        1: "../stamp-img/tokyo/kita-ku/stamp1.png", // Level 1
        2: "../stamp-img/tokyo/kita-ku/stamp2.png", // Level 2
        3: "../stamp-img/tokyo/kita-ku/stamp3.png"  // Level 3
    };

    /**
    * レベルに基づいたスタンプ画像のファイルパスを返します。(mmk)
    */
    function getStampImagePath(level) {
        return STAMP_IMAGES[level] || "default.png"; 
    }

    // =======================================================
    // B. D3.jsの初期化と描画 (プロジェクション、SVGステージ)
    // =======================================================

    // 1. プロジェクションの設定 - scaleはmain、centerはmmkを採用
    var projection = d3.geoMercator()
        .scale(52000) // mainを採用
        .center([139.7, 35.6]) // mmkを採用
        .translate([960 / 2, 500 / 2]);

    // 2. パスジェネレーターの生成
    var path = d3.geoPath().projection(projection);

    // 3. SVGステージの作成 - main側のレスポンシブSVGを採用
    var svg = d3.select("#map-container")
        .append("svg")
        .attr("viewBox", "0 0 960 500")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    // 4. GeoJSONデータの読み込みと描画
    d3.json("tokyo.geojson", drawMaps);

    // 地図を描画する関数
    function drawMaps(error, geojson) {
        if (error) {
            console.error("GeoJSON読み込みエラー:", error);
            if (statusBox) {
                statusBox.textContent = "地図データの読み込みに失敗しました。";
            }
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
            .attr("fill", LEVEL_COLORS[0]) // mmkの定数を使用
            .attr("fill-opacity", 1.0)
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5); // mainのstroke-widthを採用

        // スタンプグループを最前面に追加
        stampGroup = svg.append("g").attr("class", "stamp-group");
    }

    // 5. ボタンイベントの設定 (main)
    if (checkBtn) {
        checkBtn.addEventListener('click', getCurrentLocation);
    }

    // =======================================================
    // C. スタンプラリー機能 (mmk のロジックを採用)
    // =======================================================

    // 【A】現在地の取得
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

    // 【B】座標と市区町村の判定 (Turf.jsを使用)
    function checkCurrentMunicipality(currentLat, currentLng) {
        const point = turf.point([currentLng, currentLat]);
        let currentMunicipalityName = null;
        let currentMunicipalityFeature = null;

        for (const feature of tokyoGeoJSON.features) {
            // Turf.js: 点がポリゴン内にあるか判定
            const isInside = turf.booleanPointInPolygon(point, feature.geometry);

            if (isInside) {
                currentMunicipalityName = feature.properties.N03_004; 
                currentMunicipalityFeature = feature; 
                console.log(`現在地は ${currentMunicipalityName} 内です。`);
                
                // スタンプ獲得処理へ
                grantStamp(currentMunicipalityName, currentMunicipalityFeature);
                return; 
            }
        }
        
        if (!currentMunicipalityName && statusBox) {
            statusBox.textContent = "現在地は GeoJSON 区域外、または特定の市区町村内にいません。";
            console.log("現在地は東京の GeoJSON 区域外です。");
        }
    }

    // 【C】スタンプ獲得処理と地図の更新（mmkの複雑なロジックを採用）
    function grantStamp(municipalityName, feature) {
        const currentTime = Date.now();
        // 進捗を取得。なければ初期値 { level: 0, lastCheckIn: 0 } を使用
        let progress = stampProgress[municipalityName] || { level: 0, lastCheckIn: 0 };
        const currentLevel = progress.level;

        // 1. 既に全スタンプ獲得済みかチェック
        if (currentLevel >= MAX_STAMPS) {
            if (statusBox) statusBox.textContent = `${municipalityName} のスタンプは既に**すべて**獲得済みです！(レベル${MAX_STAMPＳ})`;
            return;
        }

        // 2. クールダウン期間をチェック
        const timeElapsed = currentTime - progress.lastCheckIn;
        if (timeElapsed < COOLDOWN_MS) {
            const timeLeftMs = COOLDOWN_MS - timeElapsed;
            const timeLeftSec = Math.ceil(timeLeftMs / 1000); // 残り時間を秒単位に変換
            if (statusBox) statusBox.textContent = `${municipalityName} の次のスタンプ (レベル${currentLevel + 1}) 獲得まで、あと **${timeLeftSec} 秒**お待ちください。`;
            return;
        }

        // 3. スタンプ獲得処理 (レベルアップ)
        progress.level += 1;
        progress.lastCheckIn = currentTime;
        stampProgress[municipalityName] = progress; // グローバル状態を更新
        const newLevel = progress.level;

        // 4. 地図のスタイルを更新 (レベルに応じた色と境界線)
        const newColor = LEVEL_COLORS[newLevel];
        svg.select("#mun-" + municipalityName) // 該当する市区町村のpath要素を選択
            .transition().duration(500) // mainのtransition durationを採用
            .attr("fill", newColor) 
            .attr("stroke", "#f5d56cff") 
            .attr("stroke-width", newLevel === MAX_STAMPS ? 3 : 2); // 最終レベルで境界線を太く

        // 5. スタンプ画像を配置/更新
        const stampId = "stamp-" + municipalityName;
        let stampElement = d3.select("#" + stampId);
        const centroid = path.centroid(feature); 
        const baseStampSize = 30;
        // レベルに応じてスタンプ画像を大きくする (視覚的な進捗)
        const currentStampSize = baseStampSize + (newLevel - 1) * 10; 

        // 獲得した新しいレベルの画像パスを取得
        const newStampImagePath = getStampImagePath(newLevel); 

        if (stampElement.empty()) {
            // (A) スタンプがまだ存在しない場合 (レベル1獲得時)
            stampGroup.append("image")
                .attr("id", stampId) 
                .attr("xlink:href", newStampImagePath)
                .attr("x", centroid[0] - currentStampSize / 2) 
                .attr("y", centroid[1] - currentStampSize / 2)
                .attr("width", currentStampSize)
                .attr("height", currentStampSize)
                .attr("opacity", 0) 
                .transition() // フェードイン
                .duration(500)
                .attr("opacity", 1); 
        } else {
            // (B) 既にスタンプが存在する場合 (レベル2, 3獲得時)
            // サイズと位置、そして画像をアニメーションで更新
            stampElement.transition()
                .duration(300)
                .attr("xlink:href", newStampImagePath) // 画像パスを更新
                .attr("x", centroid[0] - currentStampSize / 2) 
                .attr("y", centroid[1] - currentStampSize / 2)
                .attr("width", currentStampSize)
                .attr("height", currentStampSize);
        }

        // 6. ユーザーへの通知
        if (statusBox) statusBox.textContent = `${municipalityName} のスタンプ (**レベル${newLevel}/${MAX_STAMPS}**) を獲得しました！`;
    }
});