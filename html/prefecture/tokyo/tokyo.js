// 読み込んだGeoJSONデータを保持するためのグローバル変数
var tokyoGeoJSON = null;

// =======================================================
// 1. プロジェクション（投影法）の設定
// =======================================================
var projection = d3
    .geoMercator()
    .scale(35000) 
    .center([139.7, 35.6]) 
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

    // ★ GeoJSONデータをグローバル変数に格納 ★
    tokyoGeoJSON = geojson;

    // GeoJSONデータ内の各フィーチャ（市区町村など）をSVGパスに変換
    svg.selectAll("path")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("class", "municipality") // クラスを追加して識別しやすくする
        .attr("d", path)
        // GeoJSONのプロパティから市区町村名を取得し、idとして保持（任意）
        .attr("id", d => "mun-" + d.properties.N03_004) 
        .attr("fill", "#66BB6A") // 未獲得の色
        .attr("fill-opacity", 0.7)
        .attr("stroke", "#333");
}


// =======================================================
// 5. スタンプラリー機能
// =======================================================

// 【A】現在地の取得
function getCurrentLocation() {
    d3.select("#status").text("位置情報を取得中です...");

    // GeoJSONがまだ読み込まれていない場合は処理を中断
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
    const lat = position.coords.latitude;  // 緯度
    const lng = position.coords.longitude; // 経度

    d3.select("#status").text(`現在地: 緯度 ${lat.toFixed(4)}, 経度 ${lng.toFixed(4)}`);
    
    // 次の判定ステップへ
    checkCurrentMunicipality(lat, lng); 
}

function errorCallback(error) {
    d3.select("#status").text("位置情報の取得に失敗しました。");
    console.error("位置情報の取得に失敗しました:", error);
}

// 【B】座標と市区町村の判定 (Turf.jsを使用)
function checkCurrentMunicipality(currentLat, currentLng) {
    // 現在地の点をGeoJSON形式に変換
    const point = turf.point([currentLng, currentLat]);
    let currentMunicipalityName = null;

    // 全てのフィーチャ（市区町村ポリゴン）に対してループ
    for (const feature of tokyoGeoJSON.features) {
        // turf.jsを使って点(point)がポリゴン(feature)内に存在するか判定
        const isInside = turf.booleanPointInPolygon(point, feature.geometry);

        if (isInside) {
            // ★ GeoJSONのプロパティから市区町村名を取得 ★
            // ※ N03_004 は国土数値情報データの一例。お使いのGeoJSONに合わせて変更してください。
            currentMunicipalityName = feature.properties.N03_004; 
            console.log(`現在地は ${currentMunicipalityName} 内です。`);
            
            // スタンプ獲得処理へ
            grantStamp(currentMunicipalityName);
            return; 
        }
    }
    
    // 区域外の場合
    if (!currentMunicipalityName) {
        d3.select("#status").text("現在地は GeoJSON 区域外、または特定の市区町村内にいません。");
        console.log("現在地は東京の GeoJSON 区域外です。");
    }
}

// 【C】スタンプ獲得処理と地図の更新
function grantStamp(municipalityName) {
    // 1. 地図のスタイルを更新
    // tokyoGeoJSON.featuresから該当するフィーチャを探し、D3で描画したpath要素を特定
    svg.selectAll(".municipality")
        .filter(d => d.properties.N03_004 === municipalityName) // 該当する市区町村をプロパティで特定
        .attr("fill", "#FFD700") // 獲得後の色（金色）に変更
        .attr("stroke", "#CCAA00") // 境界線の色も変更
        .attr("stroke-width", 2);

    // 2. ユーザーへの通知
    d3.select("#status").text(`${municipalityName} のスタンプを獲得しました！`);
    
    // ★ Firebaseなどのデータベースへの保存ロジックはここに追加してください ★
}