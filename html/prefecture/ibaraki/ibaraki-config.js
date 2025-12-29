const ibarakiConfig = {
    prefectureId: 'ibaraki',
    geojsonPath: 'ibaraki.geojson',
    projectionConfig: {
        scale: 42000,
        center: [140.26, 36.32]
    },
    municipalityPathMap: {
        "水戸市": "mito-shi", "日立市": "hitachi-shi", "土浦市": "tsuchiura-shi", "古河市": "koga-shi",
        "石岡市": "ishioka-shi", "結城市": "yuki-shi", "龍ケ崎市": "ryugasaki-shi", "下妻市": "shimotsuma-shi",
        "常総市": "joso-shi", "常陸太田市": "hitachiota-shi", "高萩市": "takahagi-shi", "北茨城市": "kitaibaraki-shi",
        "笠間市": "kasama-shi", "取手市": "toride-shi", "牛久市": "ushiku-shi", "つくば市": "tsukuba-shi",
        "ひたちなか市": "hitachinaka-shi", "鹿嶋市": "kashima-shi", "潮来市": "itako-shi", "守谷市": "moriya-shi",
        "常陸大宮市": "hitachiomiya-shi", "那珂市": "naka-shi", "筑西市": "chikusei-shi", "坂東市": "bando-shi",
        "稲敷市": "inashiki-shi", "かすみがうら市": "kasumigaura-shi", "桜川市": "sakuragawa-shi", "神栖市": "kamisu-shi",
        "行方市": "namegata-shi", "鉾田市": "hokota-shi", "つくばみらい市": "tsukubamirai-shi", "小美玉市": "omitama-shi",
        // 町村部
        "茨城町": "ibaraki-machi", "大洗町": "oarai-machi", "城里町": "shirosato-machi", "東海村": "tokai-mura",
        "大子町": "daigo-machi", "美浦村": "miho-mura", "阿見町": "ami-machi", "河内町": "kawachi-machi",
        "八千代町": "yachiyo-machi", "五霞町": "goka-machi", "境町": "sakai-machi", "利根町": "tone-machi"
    }
};

document.addEventListener('DOMContentLoaded', function() {
    if (typeof initializeMap === 'function') initializeMap(ibarakiConfig);
});