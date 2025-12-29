document.addEventListener('DOMContentLoaded', function() {
    
    // =======================================================
    // 1. Firebase, 定数, UI要素, 状態の定義
    // =======================================================
    const db = firebase.firestore();
    let currentUser = null;

    const statusBox = document.getElementById('status-box') || document.getElementById('status');
    const checkBtn = document.getElementById('check-stamp-btn');
    
    let saitamaGeoJSON = null;
    let stampGroup = null;

    let stampProgress = {}; 
    const COOLDOWN_MS = 3 * 1000; 
    const MAX_STAMPS = 3; 

    const LEVEL_COLORS = {
        0: "#e2ffdb", 1: "#ffe082", 2: "#ffb300", 3: "#ff8f00"
    };

    // 【更新】さいたま市を区単位に分割し、他の市町村と並列に定義
    const MUNICIPALITY_PATH_MAP = {
        // さいたま市 10区
        "西区": "saitama-nishi",
        "北区": "saitama-kita",
        "大宮区": "saitama-omiya",
        "見沼区": "saitama-minuma",
        "中央区": "saitama-chuo",
        "桜区": "saitama-sakura",
        "浦和区": "saitama-urawa",
        "南区": "saitama-minami",
        "緑区": "saitama-midori",
        "岩槻区": "saitama-iwatsuki",
        // その他市町村
        "川越市": "kawagoe-shi",
        "熊谷市": "kumagaya-shi",
        "川口市": "kawaguchi-shi",
        "行田市": "gyoda-shi",
        "秩父市": "chichibu-shi",
        "所沢市": "tokorozawa-shi",
        "飯能市": "hanno-shi",
        "加須市": "kazo-shi",
        "本庄市": "honjo-shi",
        "東松山市": "higashimatsuyama-shi",
        "春日部市": "kasukabe-shi",
        "狭山市": "sayama-shi",
        "羽生市": "hanyu-shi",
        "鴻巣市": "konosu-shi",
        "深谷市": "fukaya-shi",
        "上尾市": "ageo-shi",
        "草加市": "soka-shi",
        "越谷市": "koshigaya-shi",
        "蕨市": "warabi-shi",
        "戸田市": "toda-shi",
        "入間市": "iruma-shi",
        "朝霞市": "asaka-shi",
        "志木市": "shiki-shi",
        "和光市": "wako-shi",
        "新座市": "niiza-shi",
        "桶川市": "okegawa-shi",
        "久喜市": "kuki-shi",
        "北本市": "kitamoto-shi",
        "八潮市": "yashio-shi",
        "富士見市": "fujimi-shi",
        "三郷市": "misato-shi",
        "蓮田市": "hasuda-shi",
        "坂戸市": "sakado-shi",
        "幸手市": "satte-shi",
        "鶴ヶ島市": "tsurugashima-shi",
        "日高市": "hidaka-shi",
        "吉川市": "yoshikawa-shi",
        "ふじみ野市": "fujimino-shi",
        "白岡市": "shiraoka-shi"
    };

    // 【便利関数】GeoJSONのFeatureから「区名」または「市町村名」を抽出する
    function getTargetName(feature) {
        // N03_005(区名)があればそれを使い、なければN03_004(市町村名)を使う
        return feature.properties.N03_005 || feature.properties.N03_004;
    }

    function getStampImagePath(name, level) {
        const pathName = MUNICIPALITY_PATH_MAP[name];
        if (!pathName) return "../stamp-img/default.png"; 
        return `../stamp-img/saitama/${pathName}/stamp${level}.png`;
    }

    // =======================================================
    // 2. データの永続化 (Firestore)
    // =======================================================

    async function saveProgress() {
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid).collection('progress').doc('saitama').set({ stamps: stampProgress });
        } catch (error) {
            console.error("データの保存に失敗:", error);
        }
    }

    async function loadProgress() {
        if (!currentUser || !saitamaGeoJSON) return;
        try {
            const doc = await db.collection('users').doc(currentUser.uid).collection('progress').doc('saitama').get();
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
        if (!saitamaGeoJSON) return;

        svg.selectAll(".municipality")
            .attr("fill", LEVEL_COLORS[0])
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);
        
        if (stampGroup) stampGroup.selectAll("image").remove();

        Object.keys(stampProgress).forEach(name => {
            const progress = stampProgress[name];
            // 復元時も N03_005 または N03_004 で検索
            const feature = saitamaGeoJSON.features.find(f => getTargetName(f) === name);
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
        if (saitamaGeoJSON) {
            svg.selectAll(".municipality").attr("fill", LEVEL_COLORS[0]).attr("stroke", "#333").attr("stroke-width", 0.5);
        }
    }

    // =======================================================
    // 3. D3.jsの初期化と描画
    // =======================================================

    const projection = d3.geoMercator()
        .scale(42000) 
        .center([139.30, 36.01]) 
        .translate([960 / 2, 500 / 2]);

    const path = d3.geoPath().projection(projection);

    const svg = d3.select("#map-container")
        .append("svg")
        .attr("viewBox", "0 0 960 500")
        .attr("preserveAspectRatio", "xMidYMid meet");

    d3.json("saitama.geojson", function(error, geojson) {
        if (error) return;
        saitamaGeoJSON = geojson;

        svg.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("class", "municipality")
            // IDに区名または市町村名を使用
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
        if (!currentUser || !saitamaGeoJSON) return;
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

        for (const feature of saitamaGeoJSON.features) {
            if (turf.booleanPointInPolygon(point, feature.geometry)) {
                // 【更新】ここで区名を取得
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
            if (statusBox) statusBox.textContent = `${name} は獲得済みです！`;
            return;
        }

        const timeElapsed = currentTime - progress.lastCheckIn;
        if (timeElapsed < COOLDOWN_MS) {
            if (statusBox) statusBox.textContent = "クールダウン中です...";
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
        if (statusBox) statusBox.textContent = `${name} のスタンプを獲得！`;
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