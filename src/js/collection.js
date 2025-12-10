/* collection.js */

// ■ 0. スタイル定義
// CSSファイルを編集せずに、必要なスタイル（検索固定、バッジ、コンプリート演出）を注入します
const styleSheet = document.createElement("style");
styleSheet.innerText = `
    /* 検索バーの固定表示 */
    .search-container {
        margin: 0 auto 20px;
        max-width: 600px;
        position: sticky;
        top: 10px;
        z-index: 100;
    }
    .search-input {
        width: 100%;
        padding: 12px 20px 12px 45px;
        font-size: 16px;
        border: 2px solid #cbb79f;
        border-radius: 25px;
        background-color: #fff;
        outline: none;
        transition: border-color 0.3s;
        box-sizing: border-box;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .search-input:focus {
        border-color: #8b7e74;
    }
    .search-icon {
        position: absolute;
        left: 15px;
        top: 50%;
        transform: translateY(-50%);
        color: #8b7e74;
        font-size: 18px;
        z-index: 101;
    }

    /* 階層1: 地方（Region） */
    .region-details {
        margin-bottom: 15px;
        border-radius: 8px;
        overflow: hidden;
        transition: opacity 0.3s;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .region-summary {
        background-color: #5a4e46;
        color: #fff;
        padding: 15px 20px;
        font-size: 20px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        list-style: none;
    }
    .region-summary::-webkit-details-marker { display: none; }
    .region-summary::after { content: '+'; font-size: 24px; margin-left: 10px; font-weight: normal; }
    .region-details[open] > .region-summary::after { content: '-'; }
    .region-content {
        padding: 10px;
        background-color: #f9f7f2;
    }

    /* 階層2: 都道府県（Pref） */
    .pref-details {
        margin-bottom: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background-color: #fff;
    }
    .pref-summary {
        background-color: #8b7e74;
        color: #fff;
        padding: 12px 15px;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        list-style: none;
        border-radius: 6px;
    }
    .pref-summary::-webkit-details-marker { display: none; }
    .pref-summary::after { content: '+'; font-size: 20px; margin-left: 10px; font-weight: normal; }
    .pref-details[open] > .pref-summary::after { content: '-'; }
    .pref-details[open] > .pref-summary { border-radius: 6px 6px 0 0; }
    
    .pref-content {
        padding: 10px;
    }

    /* 階層3: 市町村（City） */
    .city-area {
        margin-bottom: 8px !important;
        border: 1px solid #eee;
        transition: border-color 0.3s;
    }
    .city-line {
        background-color: #f2f2f2;
        color: #5c4b51;
        border-left: 5px solid #cbb79f;
        font-size: 16px;
        display: flex;
        align-items: center;
        /* transition: all 0.3s; */
    }

    /* ★ 100%達成時のスタイル（コンプリート） ★ */
    .city-complete .city-line {
        background-color: #fffbe6; /* 薄いゴールド背景 */
        color: #d39e00;            /* ゴールド文字 */
        border-left: 5px solid #d39e00;
        font-weight: bold;
    }
    /* 達成時のバッジ */
    .city-complete .badge-count {
        background-color: #d39e00 !important; /* ゴールド背景 */
        color: #fff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    /* 収集率バッジ共通 */
    .badge-count {
        font-size: 0.85em;
        margin-left: auto;
        margin-right: 10px;
        padding: 2px 8px;
        border-radius: 10px;
        background-color: rgba(255,255,255,0.25);
        color: #fff;
        font-weight: normal;
        min-width: 40px;
        text-align: center;
    }
    .city-line .badge-count {
        background-color: #a89a8e; /* 通常時の市町村バッジ色 */
    }

    .hidden-item { display: none !important; }
`;
document.head.appendChild(styleSheet);


// ■ 1. データ生成ヘルパー（3個設定）
const createCity = (name, kana, customStamps = null) => {
    // 目標個数
    const STAMP_LIMIT = 3;

    let stamps = [];
    if (customStamps && customStamps.length > 0) {
        stamps = customStamps;
        if (stamps.length < STAMP_LIMIT) {
            const remaining = STAMP_LIMIT - stamps.length;
            for(let i=0; i<remaining; i++) stamps.push({ src: "../src/images/NoneCeal.png", desc: "", earned: false });
        }
    } else {
        stamps = Array(STAMP_LIMIT).fill({ src: "../src/images/NoneCeal.png", desc: "", earned: false });
    }
    return { name, kana, stamps };
};

// ■ 2. データ定義
const collectionData = [
    {
        region: "北陸地方",
        prefs: [
            {
                name: "富山県",
                cities: [
                    // コンプリート例（3つとも earned: true）
                    createCity("富山市", "とやまし", [
                        { src: "../src/images/one-hotaruika.png", desc: "富山のホタルイカ", earned: true },
                        { src: "../src/images/three-hotaruika.png", desc: "ホタルイカ群遊", earned: true },
                        { src: "../src/images/gold-three-hotaruika.png", desc: "金のホタルイカ", earned: true }
                    ]),
                    createCity("高岡市", "たかおかし"),
                    createCity("射水市", "いみずし"),
                    createCity("魚津市", "うおづし"),
                    createCity("氷見市", "ひみし"),
                    createCity("滑川市", "なめりかわし"),
                    createCity("黒部市", "くろべし"),
                    createCity("砺波市", "となみし"),
                    createCity("小矢部市", "おやべし"),
                    createCity("南砺市", "なんとし"),
                    createCity("舟橋村", "ふなはしむら"),
                    createCity("上市町", "かみいちまち"),
                    createCity("立山町", "たてやままち"),
                    createCity("入善町", "にゅうぜんまち"),
                    createCity("朝日町", "あさひまち")
                ]
            }
        ]
    },
    {
        region: "関東地方",
        prefs: [
            {
                name: "東京都",
                cities: [
                    // コンプリートしていない例
                    createCity("千代田区", "ちよだく", [{ src: "../src/images/tokyo-station.png", desc: "東京駅", earned: true }]),
                    createCity("中央区", "ちゅうおうく"),
                    createCity("港区", "みなとく"),
                    createCity("新宿区", "しんじゅくく"),
                    createCity("文京区", "ぶんきょうく"),
                    createCity("台東区", "たいとうく"),
                    createCity("墨田区", "すみだく"),
                    createCity("江東区", "こうとうく"),
                    createCity("品川区", "しながわく"),
                    createCity("目黒区", "めぐろく"),
                    createCity("大田区", "おおたく"),
                    createCity("世田谷区", "せたがやく"),
                    createCity("渋谷区", "しぶやく"),
                    createCity("中野区", "なかのく"),
                    createCity("杉並区", "すぎなみく"),
                    createCity("豊島区", "としまく"),
                    createCity("北区", "きたく"),
                    createCity("荒川区", "あらかわく"),
                    createCity("板橋区", "いたばしく"),
                    createCity("練馬区", "ねりまく"),
                    createCity("足立区", "あだちく"),
                    createCity("葛飾区", "かつしかく"),
                    createCity("江戸川区", "えどがわく"),
                    createCity("八王子市", "はちおうじし"),
                    createCity("立川市", "たちかわし"),
                    createCity("武蔵野市", "むさしのし"),
                    createCity("三鷹市", "みたかし"),
                    createCity("青梅市", "おうめし"),
                    createCity("府中市", "ふちゅうし"),
                    createCity("昭島市", "あきしまし"),
                    createCity("調布市", "ちょうふし"),
                    createCity("町田市", "まちだし"),
                    createCity("小金井市", "こがねいし"),
                    createCity("小平市", "こだいらし"),
                    createCity("日野市", "ひのし"),
                    createCity("東村山市", "ひがしむらやまし"),
                    createCity("国分寺市", "こくぶんじし"),
                    createCity("国立市", "くにたちし"),
                    createCity("福生市", "ふっさし"),
                    createCity("狛江市", "こまえし"),
                    createCity("東大和市", "ひがしやまとし"),
                    createCity("清瀬市", "きよせし"),
                    createCity("東久留米市", "ひがしくるめし"),
                    createCity("武蔵村山市", "むさしむらやまし"),
                    createCity("多摩市", "たまし"),
                    createCity("稲城市", "いなぎし"),
                    createCity("羽村市", "はむらし"),
                    createCity("あきる野市", "あきるのし"),
                    createCity("西東京市", "にしとうきょうし"),
                    createCity("瑞穂町", "みずほまち"),
                    createCity("日の出町", "ひのでまち"),
                    createCity("檜原村", "ひのはらむら"),
                    createCity("奥多摩町", "おくたままち"),
                    createCity("大島町", "おおしままち"),
                    createCity("利島村", "としまむら"),
                    createCity("新島村", "にいじまむら"),
                    createCity("神津島村", "こうづしまむら"),
                    createCity("三宅村", "みやけむら"),
                    createCity("御蔵島村", "みくらじまむら"),
                    createCity("八丈町", "はちじょうまち"),
                    createCity("青ヶ島村", "あおがしまむら"),
                    createCity("小笠原村", "おがさわらむら")
                ]
            },
            {
                name: "神奈川県",
                cities: [
                    createCity("横浜市", "よこはまし", [{ src: "../src/images/minatomirai.png", desc: "みなとみらい", earned: true }]),
                    createCity("川崎市", "かわさきし"),
                    createCity("相模原市", "さがみはらし"),
                    createCity("横須賀市", "よこすかし"),
                    createCity("平塚市", "ひらつかし"),
                    createCity("鎌倉市", "かまくらし"),
                    createCity("藤沢市", "ふじさわし"),
                    createCity("小田原市", "おだわらし"),
                    createCity("茅ヶ崎市", "ちがさきし"),
                    createCity("逗子市", "ずしし"),
                    createCity("三浦市", "みうらし"),
                    createCity("秦野市", "はだのし"),
                    createCity("厚木市", "あつぎし"),
                    createCity("大和市", "やまとし"),
                    createCity("伊勢原市", "いせはらし"),
                    createCity("海老名市", "えびなし"),
                    createCity("座間市", "ざまし"),
                    createCity("南足柄市", "みなみあしがらし"),
                    createCity("綾瀬市", "あやせし"),
                    createCity("葉山町", "はやままち"),
                    createCity("寒川町", "さむかわまち"),
                    createCity("大磯町", "おおいそまち"),
                    createCity("二宮町", "にのみやまち"),
                    createCity("中井町", "なかいまち"),
                    createCity("大井町", "おおいまち"),
                    createCity("松田町", "まつだまち"),
                    createCity("山北町", "やまきたまち"),
                    createCity("開成町", "かいせいまち"),
                    createCity("箱根町", "はこねまち"),
                    createCity("真鶴町", "まなづるまち"),
                    createCity("湯河原町", "ゆがわらまち"),
                    createCity("愛川町", "あいかわまち"),
                    createCity("清川村", "きよかわむら")
                ]
            },
            {
                name: "埼玉県",
                cities: [
                    createCity("さいたま市", "さいたまし"),
                    createCity("川越市", "かわごえし"),
                    createCity("熊谷市", "くまがやし"),
                    createCity("川口市", "かわぐちし"),
                    createCity("行田市", "ぎょうだし"),
                    createCity("秩父市", "ちちぶし"),
                    createCity("所沢市", "ところざわし"),
                    createCity("飯能市", "はんのうし"),
                    createCity("加須市", "かぞし"),
                    createCity("本庄市", "ほんじょうし"),
                    createCity("東松山市", "ひがしまつやまし"),
                    createCity("春日部市", "かすかべし"),
                    createCity("狭山市", "さやまし"),
                    createCity("羽生市", "はにゅうし"),
                    createCity("鴻巣市", "こうのすし"),
                    createCity("深谷市", "ふかやし"),
                    createCity("上尾市", "あげおし"),
                    createCity("草加市", "そうかし"),
                    createCity("越谷市", "こしがやし"),
                    createCity("蕨市", "わらびし"),
                    createCity("戸田市", "とだし"),
                    createCity("入間市", "いるまし"),
                    createCity("朝霞市", "あさかし"),
                    createCity("志木市", "しきし"),
                    createCity("和光市", "わこうし"),
                    createCity("新座市", "にいざし"),
                    createCity("桶川市", "おけがわし"),
                    createCity("久喜市", "くきし"),
                    createCity("北本市", "きたもとし"),
                    createCity("八潮市", "やしおし"),
                    createCity("富士見市", "ふじみし"),
                    createCity("三郷市", "みさとし"),
                    createCity("蓮田市", "はすだし"),
                    createCity("坂戸市", "さかどし"),
                    createCity("幸手市", "さってし"),
                    createCity("鶴ヶ島市", "つるがしまし"),
                    createCity("日高市", "ひだかし"),
                    createCity("吉川市", "よしかわし"),
                    createCity("ふじみ野市", "ふじみのし"),
                    createCity("白岡市", "しらおかし"),
                    createCity("伊奈町", "いなまち"),
                    createCity("三芳町", "みよしまち"),
                    createCity("毛呂山町", "もろやままち"),
                    createCity("越生町", "おごせまち"),
                    createCity("滑川町", "なめがわまち"),
                    createCity("嵐山町", "らんざんまち"),
                    createCity("小川町", "おがわまち"),
                    createCity("川島町", "かわじままち"),
                    createCity("吉見町", "よしみまち"),
                    createCity("鳩山町", "はとやままち"),
                    createCity("ときがわ町", "ときがわまち"),
                    createCity("横瀬町", "よこぜまち"),
                    createCity("皆野町", "みなのまち"),
                    createCity("長瀞町", "ながとろまち"),
                    createCity("小鹿野町", "おがのまち"),
                    createCity("東秩父村", "ひがしちちぶむら"),
                    createCity("美里町", "みさとまち"),
                    createCity("神川町", "かみかわまち"),
                    createCity("上里町", "かみさとまち"),
                    createCity("寄居町", "よりいまち"),
                    createCity("宮代町", "みやしろまち"),
                    createCity("杉戸町", "すぎとまち"),
                    createCity("松伏町", "まつぶしまち")
                ]
            },
            {
                name: "千葉県",
                cities: [
                    createCity("千葉市", "ちばし"),
                    createCity("銚子市", "ちょうしし"),
                    createCity("市川市", "いちかわし"),
                    createCity("船橋市", "ふなばしし"),
                    createCity("館山市", "たてやまし"),
                    createCity("木更津市", "きさらづし"),
                    createCity("松戸市", "まつどし"),
                    createCity("野田市", "のだし"),
                    createCity("茂原市", "もばらし"),
                    createCity("成田市", "なりたし"),
                    createCity("佐倉市", "さくらし"),
                    createCity("東金市", "とうがねし"),
                    createCity("旭市", "あさひし"),
                    createCity("習志野市", "ならしのし"),
                    createCity("柏市", "かしわし"),
                    createCity("勝浦市", "かつうらし"),
                    createCity("市原市", "いちはらし"),
                    createCity("流山市", "ながれやまし"),
                    createCity("八千代市", "やちよし"),
                    createCity("我孫子市", "あびこし"),
                    createCity("鴨川市", "かもがわし"),
                    createCity("鎌ケ谷市", "かまがやし"),
                    createCity("君津市", "きみつし"),
                    createCity("富津市", "ふっつし"),
                    createCity("浦安市", "うらやすし"),
                    createCity("四街道市", "よつかいどうし"),
                    createCity("袖ケ浦市", "そでがうらし"),
                    createCity("八街市", "やちまたし"),
                    createCity("印西市", "いんざいし"),
                    createCity("白井市", "しろいし"),
                    createCity("富里市", "とみさとし"),
                    createCity("南房総市", "みなみぼうそうし"),
                    createCity("匝瑳市", "そうさし"),
                    createCity("香取市", "かとりし"),
                    createCity("山武市", "さんむし"),
                    createCity("いすみ市", "いすみし"),
                    createCity("大網白里市", "おおあみしらさとし"),
                    createCity("酒々井町", "しすいまち"),
                    createCity("栄町", "さかえまち"),
                    createCity("神崎町", "こうざきまち"),
                    createCity("多古町", "たこまち"),
                    createCity("東庄町", "とうのしょうまち"),
                    createCity("九十九里町", "くじゅうくりまち"),
                    createCity("芝山町", "しばやままち"),
                    createCity("横芝光町", "よこしばひかりまち"),
                    createCity("一宮町", "いちのみやまち"),
                    createCity("睦沢町", "むつざわまち"),
                    createCity("長生村", "ちょうせいむら"),
                    createCity("白子町", "しらこまち"),
                    createCity("長柄町", "ながらまち"),
                    createCity("長南町", "ちょうなんまち"),
                    createCity("大多喜町", "おおたきまち"),
                    createCity("御宿町", "おんじゅくまち"),
                    createCity("鋸南町", "きょなんまち")
                ]
            },
            {
                name: "茨城県",
                cities: [
                    createCity("水戸市", "みとし"),
                    createCity("日立市", "ひたちし"),
                    createCity("土浦市", "つちうらし"),
                    createCity("古河市", "こがし"),
                    createCity("石岡市", "いしおかし"),
                    createCity("結城市", "ゆうきし"),
                    createCity("龍ケ崎市", "りゅうがさきし"),
                    createCity("下妻市", "しもつまし"),
                    createCity("常総市", "じょうそうし"),
                    createCity("常陸太田市", "ひたちおおたし"),
                    createCity("高萩市", "たかはぎし"),
                    createCity("北茨城市", "きたいばらきし"),
                    createCity("笠間市", "かさまし"),
                    createCity("取手市", "とりでし"),
                    createCity("牛久市", "うしくし"),
                    createCity("つくば市", "つくばし"),
                    createCity("ひたちなか市", "ひたちなかし"),
                    createCity("鹿嶋市", "かしまし"),
                    createCity("潮来市", "いたこし"),
                    createCity("守谷市", "もりやし"),
                    createCity("常陸大宮市", "ひたちおおみやし"),
                    createCity("那珂市", "なかし"),
                    createCity("筑西市", "ちくせいち"),
                    createCity("坂東市", "ばんどうし"),
                    createCity("稲敷市", "いなしきし"),
                    createCity("かすみがうら市", "かすみがうらし"),
                    createCity("桜川市", "さくらがわし"),
                    createCity("神栖市", "かみすし"),
                    createCity("行方市", "なめがたし"),
                    createCity("鉾田市", "ほこたし"),
                    createCity("つくばみらい市", "つくばみらいし"),
                    createCity("小美玉市", "おみたまし"),
                    createCity("茨城町", "いばらきまち"),
                    createCity("大洗町", "おおあらいまち"),
                    createCity("城里町", "しろさとまち"),
                    createCity("東海村", "とうかいむら"),
                    createCity("大子町", "だいごまち"),
                    createCity("美浦村", "みほむら"),
                    createCity("阿見町", "あみまち"),
                    createCity("河内町", "かわちまち"),
                    createCity("八千代町", "やちよまち"),
                    createCity("五霞町", "ごかまち"),
                    createCity("境町", "さかいまち"),
                    createCity("利根町", "とねまち")
                ]
            },
            {
                name: "栃木県",
                cities: [
                    createCity("宇都宮市", "うつのみやし"),
                    createCity("足利市", "あしかがし"),
                    createCity("栃木市", "とちぎし"),
                    createCity("佐野市", "さのし"),
                    createCity("鹿沼市", "かぬまし"),
                    createCity("日光市", "にっこうし"),
                    createCity("小山市", "おやまし"),
                    createCity("真岡市", "もおかし"),
                    createCity("大田原市", "おおたわらし"),
                    createCity("矢板市", "やいたし"),
                    createCity("那須塩原市", "なすしおばらし"),
                    createCity("さくら市", "さくらし"),
                    createCity("那須烏山市", "なすからすやまし"),
                    createCity("下野市", "しもつけし"),
                    createCity("上三川町", "かみなかわまち"),
                    createCity("益子町", "ましこまち"),
                    createCity("茂木町", "もてぎまち"),
                    createCity("市貝町", "いちかいまち"),
                    createCity("芳賀町", "はがまち"),
                    createCity("壬生町", "みぶまち"),
                    createCity("野木町", "のぎまち"),
                    createCity("塩谷町", "しおやまち"),
                    createCity("高根沢町", "たかねざわまち"),
                    createCity("那須町", "なすまち"),
                    createCity("那珂川町", "なかがわまち")
                ]
            },
            {
                name: "群馬県",
                cities: [
                    createCity("前橋市", "まえばしし"),
                    createCity("高崎市", "たかさきし"),
                    createCity("桐生市", "きりゅうし"),
                    createCity("伊勢崎市", "いせさきし"),
                    createCity("太田市", "おおたし"),
                    createCity("沼田市", "ぬまたし"),
                    createCity("館林市", "たてばやしし"),
                    createCity("渋川市", "しぶかわし"),
                    createCity("藤岡市", "ふじおかし"),
                    createCity("富岡市", "とみおかし"),
                    createCity("安中市", "あんなかし"),
                    createCity("みどり市", "みどりし"),
                    createCity("榛東村", "しんとうむら"),
                    createCity("吉岡町", "よしおかまち"),
                    createCity("上野村", "うえのむら"),
                    createCity("神流町", "かんなまち"),
                    createCity("下仁田町", "しもにたまち"),
                    createCity("南牧村", "なんもくむら"),
                    createCity("甘楽町", "かんらまち"),
                    createCity("中之条町", "なかのじょうまち"),
                    createCity("長野原町", "ながのはらまち"),
                    createCity("嬬恋村", "つまごいむら"),
                    createCity("草津町", "くさつまち"),
                    createCity("高山村", "たかやまむら"),
                    createCity("東吾妻町", "ひがしあがつままち"),
                    createCity("片品村", "かたしなむら"),
                    createCity("川場村", "かわばむら"),
                    createCity("昭和村", "しょうわむら"),
                    createCity("みなかみ町", "みなかみまち"),
                    createCity("玉村町", "たまむらまち"),
                    createCity("板倉町", "いたくらまち"),
                    createCity("明和町", "めいわまち"),
                    createCity("千代田町", "ちよだまち"),
                    createCity("大泉町", "おおいずみまち"),
                    createCity("邑楽町", "おうらまち")
                ]
            }
        ]
    }
];


// ■ 3. 画面描画
function renderCollections() {
    const container = document.getElementById("collection-container");
    if (!container) return;
    container.innerHTML = "";

    // 3-1. 検索バー生成
    const searchWrapper = document.createElement("div");
    searchWrapper.className = "search-container";
    
    const searchIcon = document.createElement("i");
    searchIcon.className = "fas fa-search search-icon";
    searchWrapper.appendChild(searchIcon);

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "search-input";
    searchInput.placeholder = "市町村名を検索 (例: かまくら, 鎌倉)";
    
    searchInput.addEventListener("input", (e) => {
        filterCollections(e.target.value);
    });

    searchWrapper.appendChild(searchInput);
    container.appendChild(searchWrapper);

    // 3-2. リスト生成（3階層：地方 > 都道府県 > 市町村）
    collectionData.forEach(regionData => {
        // --- 階層1: 地方 (Region) ---
        const regionDetails = document.createElement("details");
        regionDetails.className = "region-details";
        regionDetails.dataset.regionName = regionData.region;

        const regionSummary = document.createElement("summary");
        regionSummary.className = "region-summary";
        regionDetails.appendChild(regionSummary);

        const regionContent = document.createElement("div");
        regionContent.className = "region-content";

        // カウンター（地方計）
        let regionEarned = 0;
        let regionTotal = 0;

        regionData.prefs.forEach(prefData => {
            // --- 階層2: 都道府県 (Pref) ---
            const prefDetails = document.createElement("details");
            prefDetails.className = "pref-details";
            prefDetails.dataset.prefName = prefData.name;

            const prefSummary = document.createElement("summary");
            prefSummary.className = "pref-summary";
            prefDetails.appendChild(prefSummary);

            const prefContent = document.createElement("div");
            prefContent.className = "pref-content";

            // カウンター（県計）
            let prefEarned = 0;
            let prefTotal = 0;

            prefData.cities.forEach(cityData => {
                // --- 階層3: 市町村 (City) ---
                const cityDetails = document.createElement("details");
                cityDetails.className = "city-area accordion-005";
                
                // アコーディオン排他制御識別子
                cityDetails.name = "city-group";

                cityDetails.dataset.cityName = cityData.name;
                cityDetails.dataset.cityKana = cityData.kana;

                const citySummary = document.createElement("summary");
                citySummary.className = "city-line";
                
                // 集計
                const cityEarnedCount = cityData.stamps.filter(s => s.earned).length;
                const cityTotalCount = cityData.stamps.length;
                
                prefEarned += cityEarnedCount;
                prefTotal += cityTotalCount;

                // ★コンプリート判定★
                const isComplete = (cityEarnedCount === cityTotalCount && cityTotalCount > 0);
                if (isComplete) {
                    cityDetails.classList.add("city-complete");
                }

                // アイコン追加（コンプリート時は王冠）
                const icon = isComplete ? ' <i class="fas fa-crown" style="color:#d39e00; margin-left:8px;"></i>' : '';

                // HTML生成
                citySummary.innerHTML = `${cityData.name}${icon} <span class="badge-count">${cityEarnedCount} / ${cityTotalCount}</span>`;
                cityDetails.appendChild(citySummary);

                // スタンプ画像
                const stamps = cityData.stamps;
                for (let i = 0; i < stamps.length; i += 3) {
                    const rowDiv = document.createElement("div");
                    rowDiv.className = "ceal-area";
                    const chunk = stamps.slice(i, i + 3);
                    
                    chunk.forEach(stamp => {
                        const img = document.createElement("img");
                        img.src = stamp.src;
                        img.alt = stamp.earned ? "獲得済み" : "未獲得";
                        img.className = "ceal-img";
                        img.dataset.description = stamp.desc;
                        img.loading = "lazy";
                        img.onerror = function() { this.src = "../src/images/NoneCeal.png"; };
                        rowDiv.appendChild(img);
                    });
                    cityDetails.appendChild(rowDiv);
                }
                prefContent.appendChild(cityDetails);
            });

            // 県の集計バッジ
            regionEarned += prefEarned;
            regionTotal += prefTotal;
            prefSummary.innerHTML = `${prefData.name} <span class="badge-count">${prefEarned} / ${prefTotal}</span>`;

            prefDetails.appendChild(prefContent);
            regionContent.appendChild(prefDetails);
        });

        // 地方の集計バッジ
        regionSummary.innerHTML = `${regionData.region} <span class="badge-count">${regionEarned} / ${regionTotal}</span>`;

        regionDetails.appendChild(regionContent);
        container.appendChild(regionDetails);
    });
}


// ■ 4. 検索フィルタリング
function filterCollections(keyword) {
    const regions = document.querySelectorAll(".region-details");
    const trimKeyword = keyword.trim();

    regions.forEach(region => {
        const prefs = region.querySelectorAll(".pref-details");
        let hasVisiblePref = false;

        prefs.forEach(pref => {
            const cities = pref.querySelectorAll(".city-area");
            let hasVisibleCity = false;

            cities.forEach(city => {
                const name = city.dataset.cityName || "";
                const kana = city.dataset.cityKana || "";
                
                if (name.includes(trimKeyword) || kana.includes(trimKeyword)) {
                    city.classList.remove("hidden-item");
                    hasVisibleCity = true;
                    if (trimKeyword !== "") {
                        city.open = true;
                    } else {
                        city.open = false;
                    }
                } else {
                    city.classList.add("hidden-item");
                }
            });

            if (hasVisibleCity) {
                pref.classList.remove("hidden-item");
                hasVisiblePref = true;
                if (trimKeyword !== "") {
                    pref.open = true;
                } else {
                    pref.open = false;
                }
            } else {
                pref.classList.add("hidden-item");
            }
        });

        if (hasVisiblePref) {
            region.classList.remove("hidden-item");
            if (trimKeyword !== "") {
                region.open = true;
            } else {
                region.open = false;
            }
        } else {
            region.classList.add("hidden-item");
        }
    });
}


// ■ 5. イベント設定
function setupEvents() {
    const modal = document.getElementById("img-modal");
    const modalCityName = document.getElementById("modal-city-name");
    const modalImg = document.getElementById("modal-img");
    const modalDesc = document.getElementById("modal-desc");
    const modalClose = document.getElementById("modal-close");
    const container = document.getElementById("collection-container");

    if (container) {
        container.addEventListener("click", (e) => {
            const target = e.target;

            // A. 画像クリック -> モーダル
            if (target.classList.contains("ceal-img")) {
                modal.style.display = "block";
                modalImg.src = target.src;
                modalDesc.textContent = target.dataset.description || "";
                
                // 市名取得
                const details = target.closest(".city-area");
                if (details) {
                    const summary = details.querySelector(".city-line");
                    if (summary) {
                        // アイコンやバッジなどのタグを除去してテキストのみ取得
                        const tempDiv = document.createElement("div");
                        tempDiv.innerHTML = summary.innerHTML;
                        // badge-countなどを消す
                        const badge = tempDiv.querySelector(".badge-count");
                        if(badge) badge.remove();
                        const icon = tempDiv.querySelector("i");
                        if(icon) icon.remove();
                        
                        modalCityName.textContent = tempDiv.textContent.trim();
                    }
                }
            }

            // B. 市町村アコーディオン排他制御
            const summary = target.closest("summary.city-line");
            if (summary) {
                const currentDetails = summary.parentElement;
                if (!currentDetails.open) {
                    const allOpenedCities = container.querySelectorAll(".city-area[open]");
                    allOpenedCities.forEach(openedCity => {
                        if (openedCity !== currentDetails) {
                            openedCity.open = false;
                        }
                    });
                }
            }
        });
    }

    if (modalClose) modalClose.addEventListener("click", () => modal.style.display = "none");
    if (modal) modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });
}


// ■ 6. 実行
document.addEventListener("DOMContentLoaded", () => {
    renderCollections();
    setupEvents();
});