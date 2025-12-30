/**
 * 富山県専用設定ファイル
 */
const toyamaConfig = {
    prefectureId: 'toyama',
    geojsonPath: 'toyama.geojson',
    projectionConfig: {
        scale: 48000,           // 富山県が画面に収まるよう調整
        center: [137.26, 36.62] // 県庁所在地（富山市）付近を中心に設定
    },
    stampSizeConfig: {
        base: 60,      // レベル1の時の基本サイズ
        increment: 20  // レベルが1上がるごとの増加量
    },
    // 市区町村名取得ロジック（将来的な拡張性のため保持）
    getTargetName: function(feature) {
        return feature.properties.N03_004 || "";
    },
    municipalityPathMap: {
        // 市部 (10市)
        "富山市": "toyama-shi",
        "高岡市": "takaoka-shi",
        "魚津市": "uozu-shi",
        "氷見市": "himi-shi",
        "滑川市": "namerikawa-shi",
        "黒部市": "kurobe-shi",
        "砺波市": "tonami-shi",
        "小矢部市": "oyabe-shi",
        "南砺市": "nanto-shi",
        "射水市": "imizu-shi",
        
        // 町村部 (4町 1村)
        "舟橋村": "funahashi-mura",
        "上市町": "kamiichi-machi",
        "立山町": "tateyama-machi",
        "入善町": "nyuzen-machi",
        "朝日町": "asahi-machi"
    }
};

// DOMが読み込まれたら、設定を渡してマップを初期化
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initializeMap === 'function') {
        initializeMap(toyamaConfig);
    }
});