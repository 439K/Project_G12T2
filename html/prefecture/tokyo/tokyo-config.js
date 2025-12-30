const tokyoConfig = {
    prefectureId: 'tokyo',
    geojsonPath: 'tokyo.geojson',
    projectionConfig: {
        scale: 52000,
        center: [139.43, 35.68]
    },
    stampSizeConfig: {
        base: 30,      // レベル1の時の基本サイズ
        increment: 20  // レベルが1上がるごとの増加量
    },
    municipalityPathMap: {
        "千代田区": "chiyoda-ku",
        "中央区": "chuo-ku",
        "港区": "minato-ku",
        "新宿区": "shinjuku-ku",
        "文京区": "bunkyo-ku",
        "台東区": "taito-ku",
        "墨田区": "sumida-ku",
        "江東区": "koto-ku",
        "品川区": "shinagawa-ku",
        "目黒区": "meguro-ku",
        "大田区": "ota-ku",
        "世田谷区": "setagaya-ku",
        "渋谷区": "shibuya-ku",
        "中野区": "nakano-ku",
        "杉並区": "suginami-ku",
        "豊島区": "toshima-ku",
        "北区": "kita-ku",
        "荒川区": "arakawa-ku",
        "板橋区": "itabashi-ku",
        "練馬区": "nerima-ku",
        "足立区": "adachi-ku",
        "葛飾区": "katsushika-ku",
        "江戸川区": "edogawa-ku"
    }
};

// DOMが読み込まれたら、設定を渡してマップを初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeMap(tokyoConfig);
});
