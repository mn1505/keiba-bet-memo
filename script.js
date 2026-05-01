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
const totalPayout = document.getElementById("total-payout");
const profitLoss = document.getElementById("profit-loss");
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
    result: "未確定",
    payout: 0,
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

// 的中/不的中や払戻金を変えたら、その場で保存します。
betList.addEventListener("change", function (event) {
  if (!event.target.classList.contains("result-select")) {
    return;
  }

  const id = Number(event.target.dataset.id);
  updateBetResult(id, event.target.value);
});

betList.addEventListener("input", function (event) {
  if (!event.target.classList.contains("payout-input")) {
    return;
  }

  const id = Number(event.target.dataset.id);
  updateBetPayout(id, event.target.value);
});

function loadBets() {
  const savedBets = localStorage.getItem(STORAGE_KEY);

  if (savedBets === null) {
    return [];
  }

  const parsedBets = JSON.parse(savedBets);

  return parsedBets.map(function (bet) {
    return normalizeBet(bet);
  });
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
      <div>
        <dt>結果</dt>
        <dd>
          <select class="result-select" data-id="${bet.id}" aria-label="結果">
            <option value="未確定"${bet.result === "未確定" ? " selected" : ""}>未確定</option>
            <option value="的中"${bet.result === "的中" ? " selected" : ""}>的中</option>
            <option value="不的中"${bet.result === "不的中" ? " selected" : ""}>不的中</option>
          </select>
        </dd>
      </div>
      <div>
        <dt>払戻金</dt>
        <dd>
          <input
            type="number"
            class="payout-input"
            data-id="${bet.id}"
            min="0"
            step="10"
            value="${bet.payout}"
            ${bet.result === "的中" ? "" : "disabled"}
            aria-label="払戻金"
          >
        </dd>
      </div>
      <div class="bet-memo">
        <dt>メモ</dt>
        <dd>${escapeHtml(bet.memo || "なし")}</dd>
      </div>
    </dl>
  `;

  return card;
}

function normalizeBet(bet) {
  return {
    id: bet.id,
    date: bet.date,
    place: bet.place,
    race: bet.race,
    ticketType: bet.ticketType,
    betNumbers: bet.betNumbers,
    amount: Number(bet.amount) || 0,
    result: bet.result || "未確定",
    payout: Number(bet.payout) || 0,
    memo: bet.memo || ""
  };
}

function deleteBet(id) {
  bets = bets.filter(function (bet) {
    return bet.id !== id;
  });

  saveBets();
  renderBets();
}

function updateBetResult(id, result) {
  const bet = findBet(id);

  if (bet === undefined) {
    return;
  }

  bet.result = result;

  if (result !== "的中") {
    bet.payout = 0;
  }

  saveBets();
  renderBets();
}

function updateBetPayout(id, payout) {
  const bet = findBet(id);

  if (bet === undefined) {
    return;
  }

  bet.payout = Number(payout) || 0;
  saveBets();
  updateSummary();
}

function findBet(id) {
  return bets.find(function (bet) {
    return bet.id === id;
  });
}

function updateSummary() {
  const amountSum = bets.reduce(function (total, bet) {
    return total + bet.amount;
  }, 0);

  const payoutSum = bets.reduce(function (total, bet) {
    return total + bet.payout;
  }, 0);

  const balance = payoutSum - amountSum;

  totalAmount.textContent = formatYen(amountSum);
  totalPayout.textContent = formatYen(payoutSum);
  profitLoss.textContent = formatSignedYen(balance);
  profitLoss.className = balance >= 0 ? "plus" : "minus";
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

function formatSignedYen(number) {
  if (number > 0) {
    return "+" + formatYen(number);
  }

  return formatYen(number);
}

// 画面に文字を表示するとき、HTMLとして解釈されないようにします。
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
