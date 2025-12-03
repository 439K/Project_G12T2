// D3.jsによる地図描画スクリプト

// 読み込んだGeoJSONデータを保持するためのグローバル変数
var tokyoGeoJSON = null;
var stampGroup = null;

// =======================================================
// 1. プロジェクション（投影法）の設定
// =======================================================
var projection = d3
    .geoMercator()
    .scale(16000) //表示する都道府県のサイズ
    .center([140.7, 35.6]) //各都道府県の中心座標の緯度・経度
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

// スタンプ画像用のグループ要素を事前に作成（スタンプが地図の上に描画されるように）
// var stampGroup = svg.append("g").attr("class", "stamp-group");

// =======================================================
// 4. GeoJSONデータの読み込みと描画
// =======================================================
d3.json("chiba.geojson", drawMaps);

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
        .attr("fill", "#e2ffdb") // 未獲得の色はそのまま
        .attr("fill-opacity", 1.0)
        .attr("stroke", "#333");

// (B) 🚨 ここにグループ要素の作成を移動します 🚨
    // 地図パス（<path>）の**後に**グループ要素（<g>）を追加することで、最前面に来る
    stampGroup = svg.append("g").attr("class", "stamp-group");

    // ★ ここで初期スタンプの状態を反映させる処理も追加できます ★
    // 例: 獲得済みのスタンプがあれば、ここに描画ロジックを呼び出す
    // 例えば、Firebaseからスタンプ情報を取得し、grantStamp(municipalityName)を呼ぶ
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
        const isInside = turf.booleanPointInPolygon(point, feature.geometry);

        if (isInside) {
            currentMunicipalityName = feature.properties.N03_004; 
            currentMunicipalityFeature = feature; // フィーチャオブジェクトを保存
            console.log(`現在地は ${currentMunicipalityName} 内です。`);
            
            // スタンプ獲得処理へ
            grantStamp(currentMunicipalityName, currentMunicipalityFeature);
            return; 
        }
    }
    
    if (!currentMunicipalityName) {
        d3.select("#status").text("現在地は GeoJSON 区域外、または特定の市区町村内にいません。");
        console.log("現在地は千葉の GeoJSON 区域外です。");
    }
}

// 【C】スタンプ獲得処理と地図の更新（スタンプ画像表示）
function grantStamp(municipalityName, feature) {
    // 1. 地図のスタイルを更新（任意：境界線の色を変えるなど）
    svg.select("#mun-" + municipalityName) // 該当する市区町村のpath要素を選択
        .attr("fill", "#fff048ff") // 獲得後の色（金色）に変更
        .attr("stroke", "#f5d56cff") // 境界線の色を変更
        .attr("stroke-width", 2);

    // 2. スタンプ画像を配置
    // 既にスタンプが配置されていないか確認
    if (d3.select("#stamp-" + municipalityName).empty()) {
        // 各市区町村の中心座標を計算
        // path.centroid() は D3.js の機能で、GeoJSONの形状の中心を返します
        const centroid = path.centroid(feature); 
        const stampSize = 30; // スタンプ画像のサイズ（ピクセル）

        stampGroup.append("image")
            .attr("id", "stamp-" + municipalityName) // IDを設定
            .attr("xlink:href", "stamp.png") // スタンプ画像のパス
            .attr("x", centroid[0] - stampSize / 2) // 中心に配置するためにオフセット
            .attr("y", centroid[1] - stampSize / 2)
            .attr("width", stampSize)
            .attr("height", stampSize)
            .attr("opacity", 0) // 最初は透明
            .transition() // フェードインアニメーション
            .duration(500)
            .attr("opacity", 1); // 不透明に
    } else {
        // 既にスタンプが設置されている場合は何もしないか、別のフィードバックを行う
        d3.select("#status").text(`${municipalityName} のスタンプは既に獲得済みです！`);
    }

    // 3. ユーザーへの通知
    d3.select("#status").text(`${municipalityName} のスタンプを獲得しました！`);
    
    // ★ Firebaseなどのデータベースへの保存ロジックはここに追加してください ★
}