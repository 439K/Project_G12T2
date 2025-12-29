/**
 * map-loader.js
 * 各都道府県のHTMLから呼び出される共通地図読み込みライブラリ
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
    const COOLDOWN_MS = 3 * 1000; // 3秒（saitama.jsに合わせた調整）
    const MAX_STAMPS = 3; 
    const LEVEL_COLORS = {
        0: "#e2ffdb", // 未獲得
        1: "#ffe082", // レベル1
        2: "#ffb300", // レベル2
        3: "#ff8f00"  // レベル3
    };

    // 【saitama.jsより継承】区名(N03_005)があれば優先し、なければ市町村名(N03_004)を返す
    function getTargetName(feature) {
        return feature.properties.N03_005 || feature.properties.N03_004;
    }

    function getStampImagePath(name, level) {
        const pathName = municipalityPathMap[name];
        if (!pathName) return "../stamp-img/default.png";
        return `../stamp-img/${prefectureId}/${pathName}/stamp${level}.png`;
    }

    // =======================================================
    // 2. データの保存と復元
    // =======================================================

    async function saveProgress() {
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid)
                    .collection('progress').doc(prefectureId)
                    .set({ stamps: stampProgress });
        } catch (error) {
            console.error("データの保存に失敗:", error);
        }
    }

    async function loadProgress() {
        if (!currentUser || !geoJSONData) return;
        try {
            const doc = await db.collection('users').doc(currentUser.uid)
                            .collection('progress').doc(prefectureId).get();
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
        if (!geoJSONData) return;

        svg.selectAll(".municipality")
            .attr("fill", LEVEL_COLORS[0])
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);
        
        if (stampGroup) stampGroup.selectAll("image").remove();

        Object.keys(stampProgress).forEach(name => {
            const progress = stampProgress[name];
            // IDまたはプロパティ名で検索
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
            .attr("id", d => "mun-" + getTargetName(d)) // 区名または市町村名をIDに
            .attr("d", path)
            .attr("fill", LEVEL_COLORS[0])
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);

        stampGroup = svg.append("g").attr("class", "stamp-group");

        // 初期データ読み込み
        loadProgress();
        // saitama.jsの自動チェック機能
        handleAutoCheck();
    });

    if (checkBtn) {
        checkBtn.addEventListener('click', getCurrentLocation);
    }
    
    // =======================================================
    // 4. スタンプラリーロジック
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
        } else {
            alert("お使いのブラウザは位置情報に対応していません。");
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
            if (statusBox) statusBox.textContent = `${name} のスタンプは獲得済みです！`;
            return;
        }

        const timeElapsed = currentTime - progress.lastCheckIn;
        if (timeElapsed < COOLDOWN_MS) {
            const timeLeft = Math.ceil((COOLDOWN_MS - timeElapsed) / 1000);
            if (statusBox) statusBox.textContent = `クールダウン中...あと ${timeLeft} 秒`;
            return;
        }

        progress.level += 1;
        progress.lastCheckIn = currentTime;
        stampProgress[name] = progress;
        saveProgress();

        // 地図更新
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
        const currentSize = 30 + (level - 1) * 10; 
        
        let imagePath = null;
        // Firebase Storage 優先チェック (元々の map-loader.js の機能を維持)
        try {
            const storageRefPath = `stamps/${prefectureId}/${name}_${level}.png`;
            imagePath = await storage.ref(storageRefPath).getDownloadURL();
        } catch (e) {
            // Storageになければローカル
            imagePath = getStampImagePath(name, level);
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

    // 自動チェック機能
    function handleAutoCheck() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autocheck') === 'true') {
            setTimeout(() => { 
                getCurrentLocation(); 
            }, 1000);
        }
    }
}