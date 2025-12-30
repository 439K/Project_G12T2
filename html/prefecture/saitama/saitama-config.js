const saitamaConfig = {
    prefectureId: 'saitama',
    geojsonPath: 'saitama.geojson',
    projectionConfig: {
        scale: 42000,
        center: [139.30, 36.01]
    },
    stampSizeConfig: {
        base: 30,      // レベル1の時の基本サイズ
        increment: 20  // レベルが1上がるごとの増加量
    },
    // GeoJSONのFeatureから名前を抽出するロジック
    getTargetName: function(feature) {
        // N03_005(区名)があればそれを使い、なければN03_004(市町村名)を使う
        return feature.properties.N03_005 || feature.properties.N03_004;
    },
    municipalityPathMap: {
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
        "東松山市": "higashimuyama-shi",
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
    }
};

// DOMが読み込まれたら、設定を渡してマップを初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeMap(saitamaConfig);
});