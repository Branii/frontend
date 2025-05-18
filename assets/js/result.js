// Key variables
let map = new Map();
let live_socket = null;
let video_socket = null;
let flvPlayer = null;

// Fetch game list and render
async function fetchGames() {
  try {
    const response = await fetch('/1kball/public/test/getgamedata');
    const games = await response.json();

    for (let game in games) {
      let items = '';
      games[game].forEach(item => {
        items += `<li class="menu-item game-item" value="${item.id}|${item.name}|${item.details}">
                    <button class="menu-button menu-button--purple">
                      <i data-feather="octagon"></i>${item.name}
                    </button>
                  </li>`;
      });
      document.getElementById(game).innerHTML = items;
    }
  } catch (error) {
    console.error('Error fetching games:', error);
  }
}
fetchGames();

const itemsPerPage = 11;
let currentPage = 1;

function renderPage(page, data) {
  const paginatedItems = data.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  let html = '';
  paginatedItems.reverse().forEach(item => {
    html += `<tr style="text-align:center;height:36px">
               <td>${item.draw_date}</td>
               <td>${item.date_created}</td>
               <td>${item.draw_number}</td>
               <td>${item.draw_time}</td>
             </tr>`;
  });
  $('#result-holder').html(html);
  renderPagination(data);
}

function renderPagination(data) {
  const pageCount = Math.ceil(data.length / itemsPerPage);
  const container = document.getElementById("pagination");
  container.innerHTML = '';

  for (let i = 1; i <= pageCount; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;
    btn.disabled = (i === currentPage);
    btn.onclick = () => {
      currentPage = i;
      renderPage(i, data);
    };
    container.appendChild(btn);
  }
}

// Game item click handler
$(document).on('click', '.game-item', function () {
  const [id, name, details] = $(this).attr("value").split("|");
  const gameData = map.get(id) || [];
  $(".gameName").text(name);
  $(".gameInfo").text(details);
  localStorage.setItem("gameId", JSON.stringify({ id, name, details }));

  let html = '';
  if (gameData.length === 0) {
    html = `<tr class="no-results">
              <td colspan="4">
                <img src="<?php echo BASE_URL; ?>assets/images/not_found.jpg" class="dark-logo" alt="Logo-Dark" />
              </td>
            </tr>`;
  } else {
    gameData.reverse().forEach(item => {
      html += `<tr style="text-align:center;height:36px">
                 <td>${item.draw_date}</td>
                 <td>${item.date_created}</td>
                 <td>${item.draw_number}</td>
                 <td>${item.draw_time}</td>
               </tr>`;
    });
  }
  $('#result-holder').html(html);
  liveDrawWss(id);
  liveVideo(id);
});

// Load default game from localStorage or fallback
function loadDefault() {
  const socket = new WebSocket("ws://localhost:2020?group=get_all");

  socket.onopen = () => console.log("Connected to draw get_all WebSocket");

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    for (let game in data) {
      map.set(game, data[game]);
    }

    const defaultGame = { id: "10001", name: "1kball 5D 1m", details: "1 minute draw rule..." };
    const stored = JSON.parse(localStorage.getItem("gameId") || JSON.stringify(defaultGame));
    const gameData = map.get(stored.id) || [];

    $(".gameName").text(stored.name);
    $(".gameInfo").text(stored.details);

    let html = '';
    gameData.forEach(item => {
      html += `<tr style="text-align:center;height:36px">
                 <td>${item.draw_date}</td>
                 <td>${item.date_created}</td>
                 <td>${item.draw_number}</td>
                 <td>${item.draw_time}</td>
               </tr>`;
    });
    $('#result-holder').html(html);
    liveDrawWss(stored.id);
    liveVideo(stored.id);
  };

  socket.onclose = () => console.log("WebSocket closed");
}

// Live draw updates
function liveDrawWss(gameId = "10001") {
  if (live_socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(live_socket.readyState)) {
    live_socket.close();
  }

  live_socket = new WebSocket(`ws://localhost:2020?group=${gameId}`);

  live_socket.onopen = () => console.log("Connected to live draw WebSocket");

  live_socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (!data.type) {
      $('#result-holder').prepend(`
        <tr style="text-align:center;height:36px">
          <td>${data.draw_date}</td>
          <td>${data.date_created}</td>
          <td>${data.draw_number}</td>
          <td>${data.draw_time}</td>
        </tr>`);
    } else {
      $(".streamer").toggle(data.result === 'live');
    }
  };

  live_socket.onclose = () => console.log("Live WebSocket closed");
}

// Live video state
function liveVideo(gameId = "10001") {
  if (video_socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(video_socket.readyState)) {
    video_socket.close();
  }

  video_socket = new WebSocket(`ws://localhost:2020?group=vid_state&gameid=${gameId}`);

  video_socket.onopen = () => console.log("Live video WebSocket opened");

  video_socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.result === 'live') {
      const template = document.getElementById('secret-template');
      $(".streamer").empty().append($(template.content.cloneNode(true)));
    } else {
      $(".playbtn").remove();
    }
  };

  video_socket.onclose = () => console.log("Live video WebSocket closed");
}

// Draw storage update
function storeDrawWss() {
  const draw_socket = new WebSocket("ws://localhost:2020?group=draw_storage");

  draw_socket.onopen = () => console.log("Connected to draw storage WebSocket");

  draw_socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    for (let game in data) {
      map.set(game, data[game]);
    }
    console.log("Updated draw storage:", map);
  };

  draw_socket.onclose = () => console.log("Draw storage WebSocket closed");
}

// Start everything
liveDrawWss();
storeDrawWss();
loadDefault();

const tableContainers = document.querySelectorAll(".acctablewrappers");
const headerRows = document.querySelectorAll(".accheaderrows");

tableContainers.forEach((tableContainer, index) => {
  const headerRow = headerRows[index];
  tableContainer.addEventListener("scroll", function() {
    if (tableContainer.scrollTop > 0) {
      console.log("scrolled", index);
      headerRow.classList.add("sticky-header");
    } else {
      console.log("not scrolled", index);
      headerRow.classList.remove("sticky-header");
    }
  });
});