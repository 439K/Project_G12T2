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

    // 進捗データ
    let stampProgress = {}; 

    // クールダウン期間 (5秒)
    const COOLDOWN_MS = 5 * 1000; 
    const MAX_STAMPS = 3; 

    // レベルに応じた色
    const LEVEL_COLORS = {
        0: "#e2ffdb", // 未獲得
        1: "#ffe082", // レベル1
        2: "#ffb300", // レベル2
        3: "#ff8f00"  // レベル3
    };

    // 市区町村名と画像フォルダ名のマッピング (埼玉版)
    // ※ フォルダ名は便宜上ローマ字にしていますが、実際の構成に合わせて変更してください。
    const MUNICIPALITY_PATH_MAP = {
        "さいたま市": "saitama-shi",
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
        // 町村が必要な場合はここに追加
    };

    function getStampImagePath(municipalityName, level) {
        const pathName = MUNICIPALITY_PATH_MAP[municipalityName];
        if (!pathName) return "../stamp-img/default.png"; 
        return `../stamp-img/saitama/${pathName}/stamp${level}.png`;
    }

    // =======================================================
    // 2. データの永続化 (Firestore)
    // =======================================================

    async function saveProgress() {
        if (!currentUser) return;
        try {
            // doc名を 'saitama' に変更
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

        Object.keys(stampProgress).forEach(municipalityName => {
            const progress = stampProgress[municipalityName];
            const feature = saitamaGeoJSON.features.find(f => f.properties.N03_004 === municipalityName);
            if (feature) {
                svg.select("#mun-" + municipalityName)
                    .attr("fill", LEVEL_COLORS[progress.level])
                    .attr("stroke", "#f5d56cff")
                    .attr("stroke-width", progress.level === MAX_STAMPS ? 3 : 2);
                
                updateStampImage(municipalityName, feature, progress.level, false);
            }
        });
    }

    function resetMapAndProgress() {
        stampProgress = {};
        if (stampGroup) stampGroup.selectAll("image").remove();
        if (saitamaGeoJSON) {
            svg.selectAll(".municipality").attr("fill", LEVEL_COLORS[0]).attr("stroke", "#333").attr("stroke-width", 0.5);
        }
        if (statusBox) statusBox.textContent = "地図上のエリアに移動してスタンプをゲットしよう！";
    }

    // =======================================================
    // 3. D3.jsの初期化と描画
    // =======================================================

    // プロジェクション設定 (Saitama座標)
    const projection = d3.geoMercator()
        .scale(42000) 
        .center([139.30, 36.01]) 
        .translate([960 / 2, 500 / 2]);

    const path = d3.geoPath().projection(projection);

    const svg = d3.select("#map-container")
        .append("svg")
        .attr("viewBox", "0 0 960 500")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    // GeoJSONデータの読み込み
    d3.json("saitama.geojson", function(error, geojson) {
        if (error) {
            console.error("地図データの読み込みエラー:", error);
            if (statusBox) statusBox.textContent = "地図データの読み込みに失敗しました。";
            return;
        }

        saitamaGeoJSON = geojson;

        svg.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("class", "municipality")
            .attr("id", d => "mun-" + d.properties.N03_004)
            .attr("d", path)
            .attr("fill", LEVEL_COLORS[0])
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);

        stampGroup = svg.append("g").attr("class", "stamp-group");

        loadProgress();
    });

    if (checkBtn) {
        checkBtn.addEventListener('click', getCurrentLocation);
    }
    
    // =======================================================
    // 4. 認証とスタンプラリー機能
    // =======================================================

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            if (statusBox) statusBox.textContent = "ログインしました。データを読み込んでいます...";
            loadProgress();
        } else {
            currentUser = null;
            resetMapAndProgress();
        }
    });

    function getCurrentLocation() {
        if (!currentUser) {
            if (statusBox) statusBox.textContent = "この機能を利用するにはログインが必要です。";
            return;
        }

        if (statusBox) statusBox.textContent = "位置情報を取得中です...";

        if (!saitamaGeoJSON) {
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
        checkCurrentMunicipality(lat, lng); 
    }

    function errorCallback(error) {
        if (statusBox) statusBox.textContent = "位置情報の取得に失敗しました。";
        console.error("位置情報の取得に失敗しました:", error);
    }

    function checkCurrentMunicipality(currentLat, currentLng) {
        const point = turf.point([currentLng, currentLat]);
        let found = false;

        for (const feature of saitamaGeoJSON.features) {
            if (turf.booleanPointInPolygon(point, feature.geometry)) {
                const municipalityName = feature.properties.N03_004; 
                grantStamp(municipalityName, feature);
                found = true;
                break; 
            }
        }
        
        if (!found && statusBox) {
            statusBox.textContent = "エリア外です。埼玉県内に移動してください。";
        }
    }

    function grantStamp(municipalityName, feature) {
        const currentTime = Date.now();
        let progress = stampProgress[municipalityName] || { level: 0, lastCheckIn: 0 };
        const currentLevel = progress.level;

        if (currentLevel >= MAX_STAMPS) {
            if (statusBox) statusBox.textContent = `${municipalityName} のスタンプはすべて獲得済みです！(Lv.${MAX_STAMPS})`;
            return;
        }

        const timeElapsed = currentTime - progress.lastCheckIn;
        if (timeElapsed < COOLDOWN_MS) {
            const timeLeftSec = Math.ceil((COOLDOWN_MS - timeElapsed) / 1000);
            if (statusBox) statusBox.textContent = `${municipalityName} の次まであと ${timeLeftSec} 秒お待ちください。`;
            return;
        }

        progress.level += 1;
        progress.lastCheckIn = currentTime;
        stampProgress[municipalityName] = progress;
        saveProgress();
        const newLevel = progress.level;

        svg.select("#mun-" + municipalityName)
            .transition().duration(500)
            .attr("fill", LEVEL_COLORS[newLevel])
            .attr("stroke", "#f5d56cff")
            .attr("stroke-width", newLevel === MAX_STAMPS ? 3 : 2);

        updateStampImage(municipalityName, feature, newLevel, true);

        if (statusBox) statusBox.textContent = `${municipalityName} のスタンプ (Lv.${newLevel}/${MAX_STAMPS}) を獲得！`;
    }

    function updateStampImage(municipalityName, feature, level, useTransition) {
        const stampId = "stamp-" + municipalityName;
        let stampElement = d3.select("#" + stampId);
        const centroid = path.centroid(feature); 
        const currentSize = 30 + (level - 1) * 10; 
        const imagePath = getStampImagePath(municipalityName, level);

        if (stampElement.empty()) {
            stampElement = stampGroup.append("image")
                .attr("id", stampId)
                .attr("href", imagePath)
                .attr("x", centroid[0] - currentSize / 2)
                .attr("y", centroid[1] - currentSize / 2)
                .attr("width", currentSize)
                .attr("height", currentSize)
                .attr("opacity", 0);
            
            if (useTransition) {
                stampElement.transition().duration(500).attr("opacity", 1);
            } else {
                stampElement.attr("opacity", 1);
            }
        } else {
            const el = useTransition ? stampElement.transition().duration(300) : stampElement;
            el.attr("href", imagePath)
                .attr("x", centroid[0] - currentSize / 2)
                .attr("y", centroid[1] - currentSize / 2)
                .attr("width", currentSize)
                .attr("height", currentSize);
        }
      
      // =======================================================
    // 5. 自動チェックイン機能 (コンフリクト解消部分)
    // =======================================================
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autocheck') === 'true') {
        // 地図やデータの読み込み完了を待つため少し遅延させる
        setTimeout(() => {
            if (typeof getCurrentLocation === 'function') {
                getCurrentLocation();
            }
        }, 500);
    }
});
    }

