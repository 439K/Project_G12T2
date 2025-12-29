const chibaConfig = {
    prefectureId: 'chiba',
    geojsonPath: 'chiba.geojson',
    projectionConfig: {
        scale: 42000,
        center: [140.28, 35.50]
    },
    // 千葉市などの区名重複を避けるためのロジック
    getTargetName: function(feature) {
        const city = feature.properties.N03_004 || "";
        const ward = feature.properties.N03_005 || "";
        return ward ? (city + ward) : city;
    },
    municipalityPathMap: {
        // 千葉市 (6区)
        "千葉市中央区": "chiba-chuo", "千葉市花見川区": "chiba-hanamigawa", "千葉市稲毛区": "chiba-inage",
        "千葉市若葉区": "chiba-wakaba", "千葉市緑区": "chiba-midori", "千葉市美浜区": "chiba-mihama",
        // 市部
        "銚子市": "choshi-shi", "市川市": "ichikawa-shi", "船橋市": "funabashi-shi", "館山市": "tateyama-shi",
        "木更津市": "kisarazu-shi", "松戸市": "matsudo-shi", "野田市": "noda-shi", "茂原市": "mobara-shi",
        "成田市": "narita-shi", "佐倉市": "sakura-shi", "東金市": "togane-shi", "旭市": "asahi-shi",
        "習志野市": "narashino-shi", "柏市": "kashiwa-shi", "勝浦市": "katsuura-shi", "市原市": "ichihara-shi",
        "流山市": "nagareyama-shi", "八千代市": "yachiyo-shi", "我孫子市": "abiko-shi", "鴨川市": "kamogawa-shi",
        "鎌ケ谷市": "kamagaya-shi", "君津市": "kimitsu-shi", "富津市": "futtsu-shi", "浦安市": "urayasu-shi",
        "四街道市": "yotsukaido-shi", "袖ケ浦市": "sodegaura-shi", "八街市": "yachimata-shi", "印西市": "inzai-shi",
        "白井市": "shiroi-shi", "富里市": "tomisato-shi", "南房総市": "minamiboso-shi", "匝瑳市": "sosa-shi",
        "香取市": "katori-shi", "山武市": "sammu-shi", "いすみ市": "isumi-shi", "大網白里市": "oamishirasato-shi",
        // 町村部
        "酒々井町": "shisui-machi", "印旛村": "inba-mura", "本埜村": "motono-mura", "栄町": "sakae-machi",
        "神崎町": "kozaki-machi", "多古町": "tako-machi", "東庄町": "tonosho-machi", "大網白里町": "oamishirasato-machi",
        "九十九里町": "kujukuri-machi", "芝山町": "shibayama-machi", "横芝光町": "yokoshibahikari-machi",
        "一宮町": "ichinomiya-machi", "睦沢町": "mutsuzawa-machi", "長生村": "chosei-mura", "白子町": "shirako-machi",
        "長柄町": "nagara-machi", "長南町": "chonan-machi", "大多喜町": "otaki-machi", "御宿町": "onjuku-machi",
        "鋸南町": "kyonan-machi"
    }
};

document.addEventListener('DOMContentLoaded', function() {
    if (typeof initializeMap === 'function') initializeMap(chibaConfig);
});