// stamp-check.js

// このスクリプトは prefecture-data.js の後に読み込む必要があります。

document.addEventListener('DOMContentLoaded', () => {
    // GeoJSON ファイルへのパスを解決するためのヘルパー関数
    function getGeoJsonPath(prefectureUrl) {
        // prefectureUrl は "prefecture/tokyo/tokyo.html" のような形式
        const parts = prefectureUrl.split('/');
        const prefKey = parts[1]; // 'tokyo'
        // HTMLファイルからの相対パスを返す
        return `html/prefecture/${prefKey}/${prefKey}.geojson`;
    }
    
    // GeoJSONパスのマッピングを生成
    const prefectureGeoJSONPaths = Object.keys(prefecturePaths).reduce((acc, key) => {
        acc[key] = getGeoJsonPath(prefecturePaths[key]);
        return acc;
    }, {});

    const checkPrefectureBtn = document.getElementById('check-stamp-prefecture-btn');

    if (checkPrefectureBtn) {
        checkPrefectureBtn.addEventListener('click', () => {
            checkPrefectureBtn.disabled = true;
            checkPrefectureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 判定中...';

            const successCallback = async (position) => {
                const userPoint = turf.point([position.coords.longitude, position.coords.latitude]);
                
                let foundPrefecture = false;

                // 各都道府県のGeoJSONと照合
                for (const prefectureName of Object.keys(prefectureGeoJSONPaths)) {
                    const geojsonPath = prefectureGeoJSONPaths[prefectureName];
                    
                    try {
                        const response = await fetch(geojsonPath);
                        if (!response.ok) {
                            console.warn(`Could not fetch GeoJSON for ${prefectureName} at ${geojsonPath}`);
                            continue;
                        }
                        const prefectureGeoJSON = await response.json();

                        for (const feature of prefectureGeoJSON.features) {
                            if (turf.booleanPointInPolygon(userPoint, feature.geometry)) {
                                foundPrefecture = true;
                                const destinationUrl = prefecturePaths[prefectureName];
                                window.location.href = `${destinationUrl}?autocheck=true`;
                                return; // 処理終了
                            }
                        }
                    } catch (e) {
                        console.error(`Error processing ${prefectureName}:`, e);
                    }
                }

                if (!foundPrefecture) {
                    alert('日本のいずれかの都道府県のエリア内にいません。');
                    checkPrefectureBtn.disabled = false;
                    checkPrefectureBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> 現在地でスタンプをチェック';
                }
            };

            const errorCallback = (error) => {
                console.error('Geolocation error:', error);
                alert(`位置情報の取得に失敗しました: ${error.message}`);
                checkPrefectureBtn.disabled = false;
                checkPrefectureBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> 現在地でスタンプをチェック';
            };

            try {
                navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            } catch (error) {
                // In case getCurrentPosition itself throws an error (e.g., if geolocation is blocked by browser settings)
                console.error('Geolocation initiation error:', error);
                alert(`位置情報サービスの利用が許可されていません。ブラウザの設定を確認してください。`);
                checkPrefectureBtn.disabled = false;
                checkPrefectureBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> 現在地でスタンプをチェック';
            }
        });
    }
});
