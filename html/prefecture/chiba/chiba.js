document.addEventListener('DOMContentLoaded', function() {
    
    // UI要素の取得
    const statusBox = document.getElementById('status-box');
    const checkBtn = document.getElementById('check-stamp-btn');

    // D3.jsによる地図描画スクリプト
    var tokyoGeoJSON = null;
    var stampGroup = null;

    // 1. プロジェクションの設定
    // 修正: ご指定の座標 [139.43, 35.68] を使用
    var projection = d3.geoMercator()
        .scale(42000)
        .center([140.28, 35.50]) 
        .translate([960 / 2, 500 / 2]);

    // 2. パスジェネレーター
    var path = d3.geoPath().projection(projection);

    // 3. SVGステージの作成（レスポンシブ対応）
    // bodyではなく #map-container に追加
    var svg = d3.select("#map-container")
        .append("svg")
        // 固定サイズではなく viewBox を使用してレスポンシブにする
        .attr("viewBox", "0 0 960 500")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    // 4. GeoJSONデータの読み込みと描画
    // プロジェクト構成に合わせてパスを調整 (../sample.geojson)
    d3.json("chiba.geojson", drawMaps);

    function drawMaps(error, geojson) {
        if (error) {
            console.error("GeoJSON読み込みエラー:", error);
            statusBox.textContent = "地図データの読み込みに失敗しました。";
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
            .attr("fill", "#e2ffdb")
            .attr("fill-opacity", 1.0)
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5); // 線を少し細く

        // スタンプグループを最前面に追加
        stampGroup = svg.append("g").attr("class", "stamp-group");
    }

    // 5. ボタンイベントの設定
    if (checkBtn) {
        checkBtn.addEventListener('click', getCurrentLocation);
    }

    // 現在地の取得
    function getCurrentLocation() {
        statusBox.textContent = "位置情報を取得中です...";

        if (!tokyoGeoJSON) {
            statusBox.textContent = "地図データを読み込み中です。";
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
        // デバッグ用表示
        // statusBox.textContent = `現在地: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        checkCurrentMunicipality(lat, lng);
    }

    function errorCallback(error) {
        statusBox.textContent = "位置情報の取得に失敗しました。";
        console.error("位置情報の取得に失敗しました:", error);
    }

    // 座標判定
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
            statusBox.textContent = "エリア外です。千葉県に移動してください。";
        }
    }

    // スタンプ獲得処理
    function grantStamp(municipalityName, feature) {
        // 地図のスタイル更新
        svg.select("#mun-" + municipalityName)
            .transition().duration(500)
            .attr("fill", "#fff048")
            .attr("stroke", "#f5d56c")
            .attr("stroke-width", 2);

        // スタンプ画像配置
        if (d3.select("#stamp-" + municipalityName).empty()) {
            const centroid = path.centroid(feature);
            const stampSize = 40; // 少し大きく

            // ※注意: スタンプ画像のパスも確認してください
            stampGroup.append("image")
                .attr("id", "stamp-" + municipalityName)
                .attr("xlink:href", "stamp.png") 
                .attr("x", centroid[0] - stampSize / 2)
                .attr("y", centroid[1] - stampSize / 2)
                .attr("width", stampSize)
                .attr("height", stampSize)
                .attr("opacity", 0)
                .transition()
                .duration(500)
                .attr("opacity", 1);
            
            statusBox.textContent = `「${municipalityName}」のスタンプをゲットしました！`;
        } else {
            statusBox.textContent = `「${municipalityName}」は既に獲得済みです！`;
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
