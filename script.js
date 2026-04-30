const STORAGE_KEY = "keibaBetMemoList";

const betForm = document.getElementById("bet-form");
const dateInput = document.getElementById("date");
const placeInput = document.getElementById("place");
const raceInput = document.getElementById("race");
const ticketTypeInput = document.getElementById("ticket-type");
const betNumbersInput = document.getElementById("bet-numbers");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");

const betList = document.getElementById("bet-list");
const emptyMessage = document.getElementById("empty-message");
const totalAmount = document.getElementById("total-amount");
const betCount = document.getElementById("bet-count");

let bets = loadBets();

setToday();
renderBets();

betForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const bet = {
    id: Date.now(),
    date: dateInput.value,
    place: placeInput.value.trim(),
    race: raceInput.value.trim(),
    ticketType: ticketTypeInput.value,
    betNumbers: betNumbersInput.value.trim(),
    amount: Number(amountInput.value),
    memo: memoInput.value.trim()
  };

  bets.push(bet);
  saveBets();
  renderBets();
  resetForm();
});

// 削除ボタンは一覧の中にあとから作るため、一覧全体でクリックを受け取ります。
betList.addEventListener("click", function (event) {
  if (!event.target.classList.contains("delete-button")) {
    return;
  }

  const id = Number(event.target.dataset.id);
  deleteBet(id);
});

function loadBets() {
  const savedBets = localStorage.getItem(STORAGE_KEY);

  if (savedBets === null) {
    return [];
  }

  return JSON.parse(savedBets);
}

function saveBets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
}

function renderBets() {
  betList.innerHTML = "";

  if (bets.length === 0) {
    emptyMessage.style.display = "block";
  } else {
    emptyMessage.style.display = "none";
  }

  bets.forEach(function (bet) {
    const card = createBetCard(bet);
    betList.appendChild(card);
  });

  updateSummary();
}

function createBetCard(bet) {
  const card = document.createElement("article");
  card.className = "bet-card";

  card.innerHTML = `
    <div class="bet-card-header">
      <div>
        <h3 class="bet-title">${escapeHtml(bet.place)} ${escapeHtml(bet.race)}</h3>
        <p class="bet-date">${escapeHtml(bet.date)}</p>
      </div>
      <button type="button" class="delete-button" data-id="${bet.id}">削除</button>
    </div>

    <dl class="bet-details">
      <div>
        <dt>券種</dt>
        <dd>${escapeHtml(bet.ticketType)}</dd>
      </div>
      <div>
        <dt>買い目</dt>
        <dd>${escapeHtml(bet.betNumbers)}</dd>
      </div>
      <div>
        <dt>金額</dt>
        <dd>${formatYen(bet.amount)}円</dd>
      </div>
      <div class="bet-memo">
        <dt>メモ</dt>
        <dd>${escapeHtml(bet.memo || "なし")}</dd>
      </div>
    </dl>
  `;

  return card;
}

function deleteBet(id) {
  bets = bets.filter(function (bet) {
    return bet.id !== id;
  });

  saveBets();
  renderBets();
}

function updateSummary() {
  const sum = bets.reduce(function (total, bet) {
    return total + bet.amount;
  }, 0);

  totalAmount.textContent = formatYen(sum);
  betCount.textContent = bets.length + "件";
}

function resetForm() {
  betForm.reset();
  setToday();
  placeInput.focus();
}

function setToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const today = year + "-" + month + "-" + date;

  dateInput.value = today;
}

function formatYen(number) {
  return number.toLocaleString("ja-JP");
}

// 画面に文字を表示するとき、HTMLとして解釈されないようにします。
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
