// 初期位置（東京駅）
let map = L.map('map').setView([35.6812, 139.7671], 13);

    // OpenStreetMapのタイルを表示
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    document.getElementById("getLocation").addEventListener("click", () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            // 地図を現在地に移動
            map.setView([lat, lon], 15);

            // マーカーを追加
            L.marker([lat, lon]).addTo(map)
              .bindPopup("あなたの現在地")
              .openPopup();
          },
          (err) => {
            alert("位置情報を取得できません: " + err.message);
          }
        );
      } else {
        alert("このブラウザは位置情報に対応していません。");
      }
    });