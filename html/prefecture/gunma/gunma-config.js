const gunmaConfig = {
    prefectureId: 'gunma',
    geojsonPath: 'gunma.geojson',
    projectionConfig: {
        scale: 40000,
        center: [139.03, 36.52]
    },
    municipalityPathMap: {
        "前橋市": "maebashi-shi", "高崎市": "takasaki-shi", "桐生市": "kiryu-shi", "伊勢崎市": "isesaki-shi",
        "太田市": "ota-shi", "沼田市": "numata-shi", "館林市": "tatebayashi-shi", "渋川市": "shibukawa-shi",
        "藤岡市": "fujioka-shi", "富岡市": "tomioka-shi", "安中市": "annaka-shi", "みどり市": "midori-shi",
        // 町村部
        "榛東村": "shinto-mura", "吉岡町": "yoshioka-machi", "上野村": "ueno-mura", "神流町": "kanna-machi",
        "下仁田町": "shimonita-machi", "南牧村": "nanmoku-mura", "甘楽町": "kanra-machi", "中之条町": "nakanojo-machi",
        "長野原町": "naganohara-machi", "嬬恋村": "tsumagoi-mura", "草津町": "kusatsu-machi", "高山村": "takayama-mura",
        "東吾妻町": "higashiagatsuma-machi", "片品村": "katashina-mura", "川場村": "kawaba-mura", "昭和村": "showa-mura",
        "みなかみ町": "minakami-machi", "玉村町": "tamamura-machi", "板倉町": "itakura-machi", "明和町": "meiwa-machi",
        "千代田町": "chiyoda-machi", "大泉町": "oizumi-machi", "邑楽町": "ora-machi"
    }
};

document.addEventListener('DOMContentLoaded', function() {
    if (typeof initializeMap === 'function') initializeMap(gunmaConfig);
});