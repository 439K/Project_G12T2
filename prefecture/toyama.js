navigator.geolocation.watchPosition(success, error, { enableHighAccuracy: true });

function success(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  console.log("現在地:", lat, lon);
}

function error(err) {
  console.warn("位置情報を取得できませんでした:", err.message);
}


// 市区町村エリアの定義
const toyamaArea = turf.polygon([[
  [137.1, 36.7],
  [137.3, 36.7],
  [137.3, 36.5],
  [137.1, 36.5],
  [137.1, 36.7]
]]);
const current = turf.point([lon, lat]);

if (turf.booleanPointInPolygon(current, toyamaArea)) {
  collectStamp("富山市");
}
