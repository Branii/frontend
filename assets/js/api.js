let map = new Map();
let live_socket = null;
let video_socket = null;
let flvPlayer = null;
let gameDatas;

function startStream() {
  if (flvjs.isSupported()) {
    let e = document.getElementById("liveVideo");
    if (flvPlayer) {
      flvPlayer.play();
      return;
    }
    (flvPlayer = flvjs.createPlayer(
      {
        type: "flv",
        url: "https://a5bet.com/live/livestream.flv",
        isLive: !0,
        hasAudio: !1,
        hasVideo: !0,
      },
      {
        enableStashBuffer: !1,
        stashInitialSize: 128,
        autoCleanupSourceBuffer: !0,
        fixAudioTimestampGap: !0,
      }
    )).attachMediaElement(e),
      flvPlayer.load(),
      flvPlayer.play();
  }
}

async function fetchGames() {
  try {
    const response = await fetch("/1kball/public/test/getgamedata"); // Replace with your API endpoint
    const games = await response.json();

    for (game in games) {
      let items = "";
      games[game].forEach((item) => {
        items += `<li class="menu-item game-item" value="${item.id}|${item.name}|${item.details}"><button class="menu-button menu-button--purple"><i data-feather="octagon"></i>${item.name}</button></li>`;
      });
      document.getElementById(game).innerHTML = items;
    }
  } catch (error) {
    console.error("Error fetching games:", error);
  }
}
fetchGames();
//feather.replace();

const itemsPerPage = 11;
let currentPage = 1;

function renderPage(page, data) {
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedItems = data.slice(start, end);
  let html = "";
  paginatedItems.reverse().forEach((item) => {
    html += `<tr style="text-align:center;height:36px">
              <td>${item.draw_date}</td>
              <td>${item.date_created}</td>
              <td>${item.draw_number}</td>
              <td>${item.draw_time}</td>
            </tr>`;
  });
  $("#result-holder").html(html);

  renderPagination(data);
}

function renderPagination(data) {
  const pageCount = Math.ceil(data.length / itemsPerPage);
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = "";

  for (let i = 1; i <= pageCount; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;
    btn.onclick = () => {
      currentPage = i;
      renderPage(i, data);
    };
    if (i === currentPage) btn.disabled = true;
    paginationContainer.appendChild(btn);
  }
}

//do some handlers
$(document).on("click", ".game-item", function () {
  let value = $(this).attr("value");
  let parts = value.split("|");
  let gameData = map.get(`${parts[0]}`);
  $(".gameName").text(parts[1]);
  $(".gameInfo").text(parts[2]);

  let html = "";
  let saveData = { id: parts[0], name: parts[1], details: parts[2] };
  localStorage.setItem("gameId", JSON.stringify(saveData));
  $("#api_result").empty();
  if (gameData.length == 0) {
    html += `<tr class="no-results">
        <td colspan="4">
          <img src="<?php echo BASE_URL; ?>assets/images/not_found.jpg" class="dark-logo" alt="Logo-Dark" />
        </td>
      </tr>`;
  } else {
    let cleanedDataa = gameData.map(({ drawid, game_id, get_time, client, ...rest }) => rest);
    cleanedDataa.sort((a, b) => parseInt(b.draw_count) - parseInt(a.draw_count));
    let apis = {
      "Game Name": parts[1],
      "Total Count": "10",
      "Today's Date": "2025-05-09",
      "Data" : cleanedDataa.slice(0, 10)
    };
    const obj = JSON.stringify(apis, null, 5);
    $("#api_result").html("<pre>" + obj + "</pre>");
    liveDrawWss(parts[0]);
    liveVideo(parts[0]); // live
  }
});

function loadDefault() {
  let default_socket = new WebSocket("ws://localhost:2020?group=get_all");
  default_socket.onopen = () => {
    console.log("Connected to draw get_all WebSocket");
  };

  default_socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    //console.log("All games received:", data);
    for (games in data) {
      map.set(games, data[games]);
    }
    const custom = {
      id: "10001",
      name: "1kball 5D 1m",
      details: "1kball 5D 1m rules: daily 1380 00:00-23:59 1 minute period, maintenance time GMT+8 05:00-06:00 am"
    };
    const storedGame = localStorage.getItem("gameId") ?? JSON.stringify(custom);
    let json = JSON.parse(storedGame);
    //console.log(storedGame);
    gameDatas = map.get(`${json.id}`);
    $(".gameName").text(json.name);
    $(".gameInfo").text(json.details);
    //console.log("data=>>>", gameDatas)
    let cleanedData = gameDatas.map(({ drawid, game_id, get_time, client, ...rest }) => rest);
    cleanedData.sort((a, b) => parseInt(b.draw_count) - parseInt(a.draw_count));
    let apis = {
      "Game Name": json.name,
      "Total Count": "10",
      "Today's Date": "2025-05-09",
      "Data" : cleanedData.slice(0, 10)
    };
    const obj = JSON.stringify(apis, null, 5);
    $("#api_result").html("<pre>" + obj + "</pre>");
    liveDrawWss(json.id);
    liveVideo(json.id); // live
  };

  default_socket.onclose = () => {
    console.log("WebSocket closed");
  };

  default_socket.onopen = () => {
    console.log("Connected to draw get_all WebSocket");
  };

}

function liveDrawWss(gameId = 10001) {
  if (
    live_socket &&
    (live_socket.readyState === WebSocket.OPEN ||
      live_socket.readyState === WebSocket.CONNECTING)
  ) {
    live_socket.close();
  }

  live_socket = new WebSocket(`ws://localhost:2020?group=${gameId}`);

  live_socket.onopen = () => {
    console.log("Connected to live draw WebSocket");
  };

  live_socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Message received livesocket:", data);
    if (!data.type) {
      let newItem = {
        "draw_date":data.draw_date,
        "draw_time": data.draw_time,
        "draw_number": data.draw_number,
        "draw_count": data.draw_count,
        "draw_created": data.date_created,
    };
    gameDatas.push(newItem);
    gameDatas.sort((a, b) => parseInt(b.draw_count) - parseInt(a.draw_count));
    let cleanedDatas = gameDatas.map(({ drawid, game_id, get_time, client, ...rest }) => rest);
    let liveapi = {
      "Game Name": $(".gameName").text(),
      "Total Count": "10",
      "Today's Date": "2025-05-09",
      "Data" : cleanedDatas.slice(0, 10)
    };
    //console.log(gameDatas);
      const obj = JSON.stringify(liveapi, null, 5);
      $("#api_result").html("<pre>" + obj + "</pre>");
    } else {
      if (data.result == "live") {
        $(".streamer").show();
      } else {
        $(".streamer").hide();
      }
    }
  };

  live_socket.onclose = () => {
    console.log("WebSocket closed");
  };
}

function liveVideo(gameId = 10001) {
  if (
    video_socket &&
    (video_socket.readyState === WebSocket.OPEN ||
      video_socket.readyState === WebSocket.CONNECTING)
  ) {
    video_socket.close();
  }

  video_socket = new WebSocket(
    `ws://localhost:2020?group=vid_state&gameid=` + gameId
  );

  video_socket.onopen = () => {
    console.log("liveVideo open");
  };

  video_socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Message received:", data);

    if (data.result === "live") {
      const template = document.getElementById("secret-template");
      const clone = template.content.cloneNode(true);

      // Wrap the DocumentFragment content in jQuery and append
      $(".streamer").empty().append($(clone));
    } else {
      $(".playbtn").remove();
    }
  };

  video_socket.onclose = () => {
    console.log("liveVideo closed");
  };
}

function storeDrawWss() {
  let draw_socket = new WebSocket(
    "ws://localhost:2020?group=draw_storage"
  );
  draw_socket.onopen = () => {
    console.log("Connected to draw storage WebSocket");
  };

  draw_socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // console.log("Message received:", data);
    for (games in data) {
      map.set(games, data[games]);
    }
    console.log(map);
  };

  draw_socket.onclose = () => {
    console.log("WebSocket closed");
  };

  draw_socket.onopen = () => {
    console.log("Connected to draw storage WebSocket");
  };

  draw_socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // console.log("Message received:", data);
    for (games in data) {
      map.set(games, data[games]);
    }
    console.log(map);
  };

  draw_socket.onclose = () => {
    console.log("WebSocket closed");
  };
}

liveDrawWss();
storeDrawWss();
loadDefault();
