document.addEventListener('DOMContentLoaded', function() {
    
    // =======================================================
    // 1. Firebase, 定数, UI要素, 状態の定義
    // =======================================================
    const db = firebase.firestore();
    let currentUser = null;

    const statusBox = document.getElementById('status-box') || document.getElementById('status');
    const checkBtn = document.getElementById('check-stamp-btn');
    
    let tokyoGeoJSON = null;
    let stampGroup = null;

    let stampProgress = {}; 
    const COOLDOWN_MS = 5 * 1000; // 東京版は5秒に設定
    const MAX_STAMPS = 3; 

    const LEVEL_COLORS = {
        0: "#e2ffdb", 1: "#ffe082", 2: "#ffb300", 3: "#ff8f00"
    };

    /**
     * 東京都 全62市区町村 マッピング
     */
    const MUNICIPALITY_PATH_MAP = {
        // 特別区 (23区)
        "千代田区": "chiyoda-ku", "中央区": "chuo-ku", "港区": "minato-ku", "新宿区": "shinjuku-ku",
        "文京区": "bunkyo-ku", "台東区": "taito-ku", "墨田区": "sumida-ku", "江東区": "koto-ku",
        "品川区": "shinagawa-ku", "目黒区": "meguro-ku", "大田区": "ota-ku", "世田谷区": "setagaya-ku",
        "渋谷区": "shibuya-ku", "中野区": "nakano-ku", "杉並区": "suginami-ku", "豊島区": "toshima-ku",
        "北区": "kita-ku", "荒川区": "arakawa-ku", "板橋区": "itabashi-ku", "練馬区": "nerima-ku",
        "足立区": "adachi-ku", "葛飾区": "katsushika-ku", "江戸川区": "edogawa-ku",
        // 市部 (26市)
        "八王子市": "hachioji-shi", "立川市": "tachikawa-shi", "武蔵野市": "musashino-shi",
        "三鷹市": "mitaka-shi", "青梅市": "ome-shi", "府中市": "fuchu-shi", "昭島市": "akishima-shi",
        "調布市": "chofu-shi", "町田市": "machida-shi", "小金井市": "koganei-shi", "小平市": "kodaira-shi",
        "日野市": "hino-shi", "東村山市": "higashimurayama-shi", "国分寺市": "kokubunji-shi",
        "国立市": "kunitachi-shi", "福生市": "fussa-shi", "狛江市": "komae-shi", "東大和市": "higashiyamato-shi",
        "清瀬市": "kiyose-shi", "東久留米市": "higashikurume-shi", "武蔵村山市": "musashimurayama-shi",
        "多摩市": "tama-shi", "稲城市": "inagi-shi", "羽村市": "hamura-shi", "あきる野市": "akiruno-shi",
        "西東京市": "nishitokyo-shi",
        // 西多摩郡・島嶼部
        "瑞穂町": "mizuho-machi", "日の出町": "hinode-machi", "檜原村": "hinohara-mura", "奥多摩町": "okutama-machi",
        "大島町": "oshima-machi", "利島村": "toshima-mura", "新島村": "niijima-mura", "神津島村": "kozushima-mura",
        "三宅村": "miyake-mura", "御蔵島村": "mikurajima-mura", "八丈町": "hachijo-machi", "青ヶ島村": "aogashima-mura",
        "小笠原村": "ogasawara-mura"
    };

    /**
     * GeoJSONのFeatureから市区町村名を抽出する
     */
    function getTargetName(feature) {
        // 東京の場合、通常N03_004に区名・市名が入る
        return feature.properties.N03_004;
    }

    function getStampImagePath(name, level) {
        const pathName = MUNICIPALITY_PATH_MAP[name];
        if (!pathName) return "../stamp-img/default.png"; 
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
                resetMapAndProgress();
            }
        } catch (error) {
            console.error("データの読み込みに失敗:", error);
        }
    }

    function restoreMapState() {
        if (!tokyoGeoJSON) return;

        svg.selectAll(".municipality")
            .attr("fill", LEVEL_COLORS[0])
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);
        
        if (stampGroup) stampGroup.selectAll("image").remove();

        Object.keys(stampProgress).forEach(name => {
            const progress = stampProgress[name];
            const feature = tokyoGeoJSON.features.find(f => getTargetName(f) === name);
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
        if (tokyoGeoJSON) {
            svg.selectAll(".municipality").attr("fill", LEVEL_COLORS[0]).attr("stroke", "#333").attr("stroke-width", 0.5);
        }
    }

    // =======================================================
    // 3. D3.jsの初期化と描画
    // =======================================================

    const projection = d3.geoMercator()
        .scale(52000) 
        .center([139.43, 35.68]) 
        .translate([960 / 2, 500 / 2]);

    const path = d3.geoPath().projection(projection);

    const svg = d3.select("#map-container")
        .append("svg")
        .attr("viewBox", "0 0 960 500")
        .attr("preserveAspectRatio", "xMidYMid meet");

    d3.json("tokyo.geojson", function(error, geojson) {
        if (error) return;
        tokyoGeoJSON = geojson;

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
    });

    if (checkBtn) checkBtn.addEventListener('click', getCurrentLocation);
    
    // =======================================================
    // 4. 認証とスタンプラリー機能
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
        if (!currentUser || !tokyoGeoJSON) return;
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

        for (const feature of tokyoGeoJSON.features) {
            if (turf.booleanPointInPolygon(point, feature.geometry)) {
                const name = getTargetName(feature); 
                grantStamp(name, feature);
                found = true;
                break; 
            }
        }
        if (!found && statusBox) statusBox.textContent = "エリア外です。";
    }

    function grantStamp(name, feature) {
        const currentTime = Date.now();
        let progress = stampProgress[name] || { level: 0, lastCheckIn: 0 };

        if (progress.level >= MAX_STAMPS) {
            if (statusBox) statusBox.textContent = `${name} は全レベル獲得済みです！`;
            return;
        }

        const timeElapsed = currentTime - progress.lastCheckIn;
        if (timeElapsed < COOLDOWN_MS) {
            const timeLeft = Math.ceil((COOLDOWN_MS - timeElapsed) / 1000);
            if (statusBox) statusBox.textContent = `あと ${timeLeft} 秒お待ちください。`;
            return;
        }

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
        if (statusBox) statusBox.textContent = `${name} のスタンプ(Lv.${progress.level})を獲得！`;
    }

    function updateStampImage(name, feature, level, useTransition) {
        const stampId = "stamp-" + name;
        let stampElement = d3.select("#" + stampId);
        const centroid = path.centroid(feature); 
        const currentSize = 30 + (level - 1) * 10; 
        const imagePath = getStampImagePath(name, level);

        if (stampElement.empty()) {
            stampElement = stampGroup.append("image")
                .attr("id", stampId)
                .attr("href", imagePath)
                .attr("x", centroid[0] - currentSize / 2)
                .attr("y", centroid[1] - currentSize / 2)
                .attr("width", currentSize)
                .attr("height", currentSize)
                .attr("opacity", 0);
            
            const target = useTransition ? stampElement.transition().duration(500) : stampElement;
            target.attr("opacity", 1);
        } else {
            const el = useTransition ? stampElement.transition().duration(300) : stampElement;
            el.attr("href", imagePath)
                .attr("x", centroid[0] - currentSize / 2)
                .attr("y", centroid[1] - currentSize / 2)
                .attr("width", currentSize)
                .attr("height", currentSize);
        }
    }

    function handleAutoCheck() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autocheck') === 'true') {
            setTimeout(() => { if (typeof getCurrentLocation === 'function') getCurrentLocation(); }, 500);
        }
    }
});