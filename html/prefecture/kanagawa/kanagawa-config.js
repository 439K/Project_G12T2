const kanagawaConfig = {
    prefectureId: 'kanagawa',
    geojsonPath: 'kanagawa.geojson',
    projectionConfig: {
        scale: 57000,
        center: [139.35, 35.40]
    },
    // 神奈川県は「区名」が重複するため、市名+区名で判定するロジックを追加
    getTargetName: function(feature) {
        const city = feature.properties.N03_004 || "";
        const ward = feature.properties.N03_005 || "";
        return ward ? (city + ward) : city;
    },
    stampSizeConfig: {
        base: 30,      // レベル1の時の基本サイズ
        increment: 20  // レベルが1上がるごとの増加量
    },
    municipalityPathMap: {
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
    }
};

// DOMが読み込まれたら、設定を渡してマップを初期化
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initializeMap === 'function') {
        initializeMap(kanagawaConfig);
    }
});