// D3.jsによる地図描画スクリプト

// 読み込んだGeoJSONデータを保持するためのグローバル変数
var tokyoGeoJSON = null;
var stampGroup = null;

// =======================================================
// 🚨 【追加機能のためのグローバル状態と定数】 🚨
// =======================================================

// スタンプの進捗状況を保持するオブジェクト
// 例: { "千代田区": { level: 2, lastCheckIn: 1700000000000 } }
var stampProgress = {}; 

// クールダウン期間 (ミリ秒) - テスト用に5秒を設定
const COOLDOWN_MS = 5 * 1000; 
const MAX_STAMPS = 3; // 各市区町村で獲得できる最大スタンプ数

// スタンプレベルに応じた色パレット
const LEVEL_COLORS = {
    0: "#e2ffdb", // Default (未獲得)
    1: "#ffe082", // Level 1 (薄い金色)
    2: "#ffb300", // Level 2 (中くらいの金色)
    3: "#ff8f00"  // Level 3 (最終、濃い金色)
};

// 【✨ スタンプ画像パスの管理オブジェクト ✨】
// レベルとスタンプ画像のファイルパスを集中管理します
const STAMP_IMAGES = {
    1: "../stamp-img/tokyo/kita-ku/stamp1.png", // Level 1
    2: "../stamp-img/tokyo/kita-ku/stamp2.png", // Level 2
    3: "../stamp-img/tokyo/kita-ku/stamp3.png"  // Level 3
    // ここでファイルパスを変更すれば、コード内の参照箇所全てに反映されます。
};

/**
 * レベルに基づいたスタンプ画像のファイルパスを返します。
 * @param {number} level - 現在のスタンプレベル (1, 2, 3)
 * @returns {string} - 画像ファイルパス。見つからない場合は 'default.png' を返します。
 */
function getStampImagePath(level) {
    return STAMP_IMAGES[level] || "default.png"; 
}

// =======================================================
// 1. プロジェクション（投影法）の設定
// =======================================================
var projection = d3
    .geoMercator()
    .scale(35000) //表示する都道府県のサイズ
    .center([139.7, 35.6]) //各都道府県の中心座標の緯度・経度
    .translate([960 / 2, 500 / 2]);

// =======================================================
// 2. パスジェネレーターの生成
// =======================================================
var path = d3.geoPath().projection(projection);

// =======================================================
// 3. SVGステージの作成
// =======================================================
var width = 960;
var height = 500;

var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// =======================================================
// 4. GeoJSONデータの読み込みと描画
// =======================================================
d3.json("tokyo.geojson", drawMaps);

// 地図を描画する関数
function drawMaps(error, geojson) {
    if (error) throw error; 

    tokyoGeoJSON = geojson;

    svg.selectAll("path")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("class", "municipality")
        .attr("id", d => "mun-" + d.properties.N03_004) 
        .attr("d", path)
        .attr("fill", LEVEL_COLORS[0]) // 初期色はLEVEL_COLORS[0]
        .attr("fill-opacity", 1.0)
        .attr("stroke", "#333");

    // 地図パス（<path>）の**後に**グループ要素（<g>）を追加することで、最前面に来る
    stampGroup = svg.append("g").attr("class", "stamp-group");
}


// =======================================================
// 5. スタンプラリー機能
// =======================================================

// 【A】現在地の取得
function getCurrentLocation() {
    d3.select("#status").text("位置情報を取得中です...");

    if (!tokyoGeoJSON) {
        d3.select("#status").text("地図データを読み込み中です。しばらくお待ちください。");
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

    d3.select("#status").text(`現在地: 緯度 ${lat.toFixed(4)}, 経度 ${lng.toFixed(4)}`);
    
    checkCurrentMunicipality(lat, lng); 
}

function errorCallback(error) {
    d3.select("#status").text("位置情報の取得に失敗しました。");
    console.error("位置情報の取得に失敗しました:", error);
}

// 【B】座標と市区町村の判定 (Turf.jsを使用)
function checkCurrentMunicipality(currentLat, currentLng) {
    const point = turf.point([currentLng, currentLat]);
    let currentMunicipalityName = null;
    let currentMunicipalityFeature = null; // 該当フィーチャも保持

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
    
    if (!currentMunicipalityName) {
        d3.select("#status").text("現在地は GeoJSON 区域外、または特定の市区町村内にいません。");
        console.log("現在地は東京の GeoJSON 区域外です。");
    }
}

// 【C】スタンプ獲得処理と地図の更新（スタンプ画像表示）
function grantStamp(municipalityName, feature) {
    const currentTime = Date.now();
    // 進捗を取得。なければ初期値 { level: 0, lastCheckIn: 0 } を使用
    let progress = stampProgress[municipalityName] || { level: 0, lastCheckIn: 0 };
    const currentLevel = progress.level;

    // 1. 既に全スタンプ獲得済みかチェック
    if (currentLevel >= MAX_STAMPS) {
        d3.select("#status").text(`${municipalityName} のスタンプは既に**すべて**獲得済みです！(レベル${MAX_STAMPS})`);
        return;
    }

    // 2. クールダウン期間をチェック
    const timeElapsed = currentTime - progress.lastCheckIn;
    if (timeElapsed < COOLDOWN_MS) {
        const timeLeftMs = COOLDOWN_MS - timeElapsed;
        const timeLeftSec = Math.ceil(timeLeftMs / 1000); // 残り時間を秒単位に変換
        d3.select("#status").text(`${municipalityName} の次のスタンプ (レベル${currentLevel + 1}) 獲得まで、あと **${timeLeftSec} 秒**お待ちください。`);
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

    // ✨ 獲得した新しいレベルの画像パスを取得
    const newStampImagePath = getStampImagePath(newLevel); 

    if (stampElement.empty()) {
        // (A) スタンプがまだ存在しない場合 (レベル1獲得時)
        stampGroup.append("image")
            .attr("id", stampId) 
            .attr("xlink:href", newStampImagePath) // 💡 修正: レベルに応じた画像パスを使用
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
             .attr("xlink:href", newStampImagePath) // 💡 追加: レベルに応じた画像パスに更新
            .attr("x", centroid[0] - currentStampSize / 2) 
            .attr("y", centroid[1] - currentStampSize / 2)
            .attr("width", currentStampSize)
            .attr("height", currentStampSize);
    }

    // 6. ユーザーへの通知
    d3.select("#status").text(`${municipalityName} のスタンプ (**レベル${newLevel}/${MAX_STAMPS}**) を獲得しました！`);
    
    // ★ Firebaseなどのデータベースへの保存ロジックはここに追加してください ★
}