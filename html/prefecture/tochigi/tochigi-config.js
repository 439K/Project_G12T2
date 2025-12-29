const tochigiConfig = {
    prefectureId: 'tochigi',
    geojsonPath: 'tochigi.geojson',
    projectionConfig: {
        scale: 48000,
        center: [139.79, 36.68]
    },
    stampSizeConfig: {
        base: 60,      // レベル1の時の基本サイズ
        increment: 20  // レベルが1上がるごとの増加量
    },
    municipalityPathMap: {
        "宇都宮市": "utsunomiya-shi", "足利市": "ashikaga-shi", "栃木市": "tochigi-shi", "佐野市": "sano-shi",
        "鹿沼市": "kanuma-shi", "日光市": "nikko-shi", "小山市": "oyama-shi", "真岡市": "moka-shi",
        "大田原市": "otawara-shi", "矢板市": "yaita-shi", "那須塩原市": "nasushiobara-shi", "さくら市": "sakura-shi",
        "那須烏山市": "nasukarasuyama-shi", "下野市": "shimotsuke-shi",
        // 町村部
        "上三川町": "kaminokawa-machi", "益子町": "mashiko-machi", "茂木町": "motegi-machi", "市貝町": "ichikai-machi",
        "芳賀町": "haga-machi", "壬生町": "mibu-machi", "野木町": "nogi-machi", "塩谷町": "shioya-machi",
        "高根沢町": "takanezawa-machi", "那須町": "nasu-machi", "那珂川町": "nakagawa-machi"
    }
};

document.addEventListener('DOMContentLoaded', function() {
    if (typeof initializeMap === 'function') initializeMap(tochigiConfig);
});