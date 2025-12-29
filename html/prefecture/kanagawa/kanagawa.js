document.addEventListener('DOMContentLoaded', function() {
    
    // =======================================================
    // 1. Firebase, 定数, UI要素, 状態の定義
    // =======================================================
    const db = firebase.firestore();
    let currentUser = null;

    const statusBox = document.getElementById('status-box') || document.getElementById('status');
    const checkBtn = document.getElementById('check-stamp-btn');
    
    let kanagawaGeoJSON = null;
    let stampGroup = null;

    let stampProgress = {}; 
    const COOLDOWN_MS = 3 * 1000; 
    const MAX_STAMPS = 3; 

    const LEVEL_COLORS = {
        0: "#e2ffdb", // 未獲得
        1: "#ffe082", // レベル1
        2: "#ffb300", // レベル2
        3: "#ff8f00"  // レベル3
    };

    /**
     * 神奈川県 市区町村・区マッピング
     * 重複を避けるため「市名+区名」をキーにしています
     */
    const MUNICIPALITY_PATH_MAP = {
        // 横浜市 (18区)
        "横浜市鶴見区": "yokohama-tsurumi", "横浜市神奈川区": "yokohama-kanagawa", "横浜市西区": "yokohama-nishi",
        "横浜市中区": "yokohama-naka", "横浜市南区": "yokohama-minami", "横浜市保土ケ谷区": "yokohama-hodogaya",
        "横浜市磯子区": "yokohama-isogo", "横浜市金沢区": "yokohama-kanazawa", "横浜市港北区": "yokohama-kohoku",
        "横浜市戸塚区": "yokohama-totsuka", "横浜市港南区": "yokohama-konan", "横浜市旭区": "yokohama-asahi",
        "横浜市緑区": "yokohama-midori", "横浜市瀬谷区": "yokohama-seya", "横浜市栄区": "yokohama-sakae",
        "横浜市泉区": "yokohama-izumi", "横浜市青葉区": "yokohama-aoba", "横浜市都筑区": "yokohama-tsuzuki",
        // 川崎市 (7区)
        "川崎市川崎区": "kawasaki-kawasaki", "川崎市幸区": "kawasaki-saiwai", "川崎市中原区": "kawasaki-nakahara",
        "川崎市高津区": "kawasaki-takatsu", "川崎市多摩区": "kawasaki-tama", "川崎市宮前区": "kawasaki-miyamae",
        "川崎市麻生区": "kawasaki-asao",
        // 相模原市 (3区)
        "相模原市緑区": "sagamihara-midori", "相模原市中央区": "sagamihara-chuo", "相模原市南区": "sagamihara-minami",
        // その他市部
        "横須賀市": "yokosuka-shi", "平塚市": "hiratsuka-shi", "鎌倉市": "kamakura-shi", "藤沢市": "fujisawa-shi",
        "小田原市": "odawara-shi", "茅ヶ崎市": "chigasaki-shi", "逗子市": "zushi-shi", "三浦市": "miura-shi",
        "秦野市": "hadano-shi", "厚木市": "atsugi-shi", "大和市": "yamato-shi", "伊勢原市": "isehara-shi",
        "海老名市": "ebina-shi", "座間市": "zama-shi", "南足柄市": "minamiashigara-shi", "綾瀬市": "ayase-shi",
        // 町村部
        "葉山町": "hayama-machi", "寒川町": "samukawa-machi", "大磯町": "oiso-machi", "二宮町": "ninomiya-machi",
        "中井町": "nakai-machi", "大井町": "oi-machi", "松田町": "matsuda-machi", "山北町": "yamakita-machi",
        "開成町": "kaisei-machi", "箱根町": "hakone-machi", "真鶴町": "manazuru-machi", "湯河原町": "yugawara-machi",
        "愛川町": "aikawa-machi", "清川村": "kiyokawa-mura"
    };

    /**
     * GeoJSONのFeatureから「市名+区名」または「市町村名」を抽出する
     * 神奈川県は「南区」などが重複するため、N03_004(市) + N03_005(区) を結合します
     */
    function getTargetName(feature) {
        const city = feature.properties.N03_004 || "";
        const ward = feature.properties.N03_005 || "";
        // 区名がある場合は「横浜市西区」、ない場合は「厚木市」の形式
        return ward ? (city + ward) : city;
    }

    function getStampImagePath(name, level) {
        const pathName = MUNICIPALITY_PATH_MAP[name];
        if (!pathName) return "../stamp-img/default.png"; 
        return `../stamp-img/kanagawa/${pathName}/stamp${level}.png`;
    }

    // =======================================================
    // 2. データの永続化 (Firestore)
    // =======================================================

    async function saveProgress() {
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid).collection('progress').doc('kanagawa').set({ stamps: stampProgress });
        } catch (error) {
            console.error("データの保存に失敗:", error);
        }
    }

    async function loadProgress() {
        if (!currentUser || !kanagawaGeoJSON) return;
        try {
            const doc = await db.collection('users').doc(currentUser.uid).collection('progress').doc('kanagawa').get();
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
        if (!kanagawaGeoJSON) return;

        svg.selectAll(".municipality")
            .attr("fill", LEVEL_COLORS[0])
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);
        
        if (stampGroup) stampGroup.selectAll("image").remove();

        Object.keys(stampProgress).forEach(name => {
            const progress = stampProgress[name];
            const feature = kanagawaGeoJSON.features.find(f => getTargetName(f) === name);
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
        if (kanagawaGeoJSON) {
            svg.selectAll(".municipality").attr("fill", LEVEL_COLORS[0]).attr("stroke", "#333").attr("stroke-width", 0.5);
        }
    }

    // =======================================================
    // 3. D3.jsの初期化と描画
    // =======================================================

    const projection = d3.geoMercator()
        .scale(57000) 
        .center([139.35, 35.40]) 
        .translate([960 / 2, 500 / 2]);

    const path = d3.geoPath().projection(projection);

    const svg = d3.select("#map-container")
        .append("svg")
        .attr("viewBox", "0 0 960 500")
        .attr("preserveAspectRatio", "xMidYMid meet");

    d3.json("kanagawa.geojson", function(error, geojson) {
        if (error) {
            console.error("GeoJSON読み込みエラー:", error);
            return;
        }
        kanagawaGeoJSON = geojson;

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
        if (!currentUser || !kanagawaGeoJSON) return;
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

        for (const feature of kanagawaGeoJSON.features) {
            if (turf.booleanPointInPolygon(point, feature.geometry)) {
                const name = getTargetName(feature); 
                grantStamp(name, feature);
                found = true;
                break; 
            }
        }
        if (!found && statusBox) statusBox.textContent = "エリア外です。神奈川県内に移動してください。";
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