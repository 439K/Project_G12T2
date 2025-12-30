/**
 * map-loader.js
 * 重複描画対策済 ＋ 特産品説明（municipalityDescMap）対応版
 */
function initializeMap(config) {
    // =======================================================
    // 1. 設定と状態
    // =======================================================
    const { 
        prefectureId, 
        geojsonPath, 
        projectionConfig, 
        municipalityPathMap,
        municipalityDescMap, // ← 追加
        stampSizeConfig 
    } = config;

    const baseSize = (stampSizeConfig && stampSizeConfig.base) ? stampSizeConfig.base : 50;
    const incSize = (stampSizeConfig && stampSizeConfig.increment) ? stampSizeConfig.increment : 15;

    const db = firebase.firestore();
    const storage = firebase.storage();
    let currentUser = null;

    const statusBox = document.getElementById('status-box') || document.getElementById('status');
    const checkBtn = document.getElementById('check-stamp-btn');
    
    let geoJSONData = null;
    let stampGroup = null;
    let stampProgress = {}; 

    const MAX_STAMPS = 3; 
    const LEVEL_COLORS = { 0: "#e2ffdb", 1: "#ffe082", 2: "#ffb300", 3: "#ff8f00" };

    function getTargetName(feature) {
        return feature.properties.N03_005 || feature.properties.N03_004;
    }

    function getStampImagePath(name, level) {
        const pathName = municipalityPathMap[name];
        if (!pathName) return "../../../stamp-img/default.png";
        return `../../../stamp-img/${prefectureId}/${pathName}/stamp${level}.png`;
    }

    // =======================================================
    // 2. データの保存と復元
    // =======================================================
    function getCacheKey() {
        return currentUser ? `stamp_cache_${prefectureId}_${currentUser.uid}` : null;
    }

    async function saveProgress() {
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid)
                    .collection('progress').doc(prefectureId)
                    .set({ stamps: stampProgress });
            const key = getCacheKey();
            if (key) localStorage.setItem(key, JSON.stringify(stampProgress));
        } catch (error) { console.error("保存失敗:", error); }
    }

    async function loadProgress() {
        if (!currentUser || !geoJSONData) return;
        const key = getCacheKey();
        if (key) {
            const cachedData = localStorage.getItem(key);
            if (cachedData) {
                try {
                    stampProgress = JSON.parse(cachedData);
                    restoreMapState();
                } catch (e) { console.error("キャッシュ解析失敗", e); }
            }
        }
        try {
            const doc = await db.collection('users').doc(currentUser.uid)
                            .collection('progress').doc(prefectureId).get();
            if (doc.exists) {
                const cloudData = doc.data().stamps || {};
                if (JSON.stringify(stampProgress) !== JSON.stringify(cloudData)) {
                    stampProgress = cloudData;
                    if (key) localStorage.setItem(key, JSON.stringify(stampProgress));
                    restoreMapState();
                }
            } else if (!localStorage.getItem(key)) {
                resetMapAndProgress();
            }
        } catch (error) { console.error("Firebase読み込み失敗", error); }
    }

    function restoreMapState() {
        if (!geoJSONData) return;
        svg.selectAll(".municipality").attr("fill", LEVEL_COLORS[0]).attr("stroke", "#333").attr("stroke-width", 0.5);
        if (stampGroup) stampGroup.selectAll("image").remove();
        Object.keys(stampProgress).forEach(name => {
            const progress = stampProgress[name];
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
        if (geoJSONData) svg.selectAll(".municipality").attr("fill", LEVEL_COLORS[0]).attr("stroke", "#333").attr("stroke-width", 0.5);
        const key = getCacheKey();
        if (key) localStorage.removeItem(key);
    }

    // =======================================================
    // 3. D3.jsの初期化
    // =======================================================
    const projection = d3.geoMercator()
        .scale(projectionConfig.scale).center(projectionConfig.center).translate([960 / 2, 500 / 2]);
    const path = d3.geoPath().projection(projection);
    const svg = d3.select("#map-container").append("svg")
        .attr("viewBox", "0 0 960 500").attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%").style("height", "100%");

    d3.json(geojsonPath, function(error, geojson) {
        if (error) return;
        geoJSONData = geojson;
        svg.selectAll("path").data(geojson.features).enter().append("path")
            .attr("class", "municipality").attr("id", d => "mun-" + getTargetName(d))
            .attr("d", path).attr("fill", LEVEL_COLORS[0]).attr("stroke", "#333").attr("stroke-width", 0.5);
        stampGroup = svg.append("g").attr("class", "stamp-group");
        loadProgress();
        handleAutoCheck();
        setupModalEvents(); 
    });

    if (checkBtn) checkBtn.addEventListener('click', getCurrentLocation);
    firebase.auth().onAuthStateChanged(user => {
        if (user) { currentUser = user; loadProgress(); }
        else { currentUser = null; resetMapAndProgress(); }
    });

    function getCurrentLocation() {
        if (!currentUser) return statusBox && (statusBox.textContent = "ログインが必要です。");
        if (statusBox) statusBox.textContent = "位置情報を取得中です...";
        navigator.geolocation.getCurrentPosition(
            (pos) => checkCurrentMunicipality(pos.coords.latitude, pos.coords.longitude),
            () => statusBox && (statusBox.textContent = "位置情報の取得に失敗しました。"),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }

    function checkCurrentMunicipality(lat, lng) {
        const point = turf.point([lng, lat]);
        let found = false;
        for (const feature of geoJSONData.features) {
            if (turf.booleanPointInPolygon(point, feature.geometry)) {
                grantStamp(getTargetName(feature), feature);
                found = true; break; 
            }
        }
        if (!found && statusBox) statusBox.textContent = "現在の位置はエリア外です。対象の地域に移動してください。";
    }

    // =======================================================
    // 4. スタンプ付与
    // =======================================================
    function grantStamp(name, feature) {
        const currentTime = Date.now();
        let progress = stampProgress[name] || { level: 0, lastCheckIn: 0 };
        if (progress.level >= MAX_STAMPS) return statusBox && (statusBox.textContent = `${name}のスタンプはコンプリート済みです！`);

        let requiredCooldown = progress.level === 1 ? 60000 : (progress.level === 2 ? 600000 : 0);
        const timeElapsed = currentTime - progress.lastCheckIn;

        if (timeElapsed < requiredCooldown) {
            const total = Math.ceil((requiredCooldown - timeElapsed) / 1000);
            return statusBox && (statusBox.textContent = `${name} のアップグレードまであと ${Math.floor(total/60)}分${total%60}秒`);
        }

        progress.level += 1;
        progress.lastCheckIn = currentTime;
        stampProgress[name] = progress;
        saveProgress();

        svg.select("#mun-" + name).transition().duration(500)
            .attr("fill", LEVEL_COLORS[progress.level])
            .attr("stroke", "#f5d56cff")
            .attr("stroke-width", progress.level === MAX_STAMPS ? 3 : 2);

        updateStampImage(name, feature, progress.level, true);
        if (statusBox) statusBox.textContent = `${name}のスタンプ(Lv.${progress.level})を獲得！`;
    }

    // =======================================================
    // 5. 画像更新（物理削除＆再生成）
    // =======================================================
    async function updateStampImage(name, feature, level, useTransition) {
        const stampId = "stamp-" + name;
        const centroid = path.centroid(feature); 
        const currentSize = baseSize + (level - 1) * incSize; 

        stampGroup.selectAll("#" + stampId).remove();

        const stampElement = stampGroup.append("image")
            .attr("id", stampId)
            .attr("x", centroid[0] - currentSize / 2)
            .attr("y", centroid[1] - currentSize / 2)
            .attr("width", currentSize)
            .attr("height", currentSize)
            .attr("opacity", 0)
            .style("cursor", "pointer");

        let imagePath = null;
        try {
            const storageRefPath = `stamps/${prefectureId}/${name}_${level}.png`;
            imagePath = await storage.ref(storageRefPath).getDownloadURL();
        } catch (e1) {
            try {
                const prefRef = `stamps/${prefectureId}/${prefectureId}_${level}.png`;
                imagePath = await storage.ref(prefRef).getDownloadURL();
            } catch (e2) { imagePath = getStampImagePath(name, level); }
        }

        stampElement
            .attr("href", imagePath)
            .on("click", () => showStampModal(name, imagePath, level));

        if (useTransition) {
            stampElement.transition().duration(500).attr("opacity", 1);
        } else {
            stampElement.attr("opacity", 1);
        }
    }

    // =======================================================
    // 6. モーダル表示（特産品説明を追記）
    // =======================================================
    function showStampModal(name, imgSrc, level) {
        const m = document.getElementById("img-modal");
        if (!m) return;
        document.getElementById("modal-city-name").textContent = name;
        document.getElementById("modal-img").src = imgSrc;

        // もともとの文言
        let descText = `${name}のスタンプ (レベル${level})です。現地を訪れて獲得しました！`;

        // 特産品説明があれば改行して追記
        if (municipalityDescMap && municipalityDescMap[name]) {
            descText += `\n\n【地域の特産品】\n${municipalityDescMap[name]}`;
        }

        document.getElementById("modal-desc").textContent = descText;
        m.style.display = "flex";
    }

    function setupModalEvents() {
        const m = document.getElementById("img-modal");
        const c = document.getElementById("modal-close");
        if (c) c.onclick = () => m.style.display = "none";
        window.onclick = (e) => { if (e.target === m) m.style.display = "none"; };
    }

    function handleAutoCheck() {
        if (new URLSearchParams(window.location.search).get('autocheck') === 'true') 
            setTimeout(() => getCurrentLocation(), 1000);
    }
}