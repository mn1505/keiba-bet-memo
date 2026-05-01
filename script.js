const STORAGE_KEY = "keibaBetMemoList";
const TICKET_TYPES = ["単勝", "複勝", "ワイド", "馬連", "馬単", "三連複", "三連単"];

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
const recoveryRate = document.getElementById("recovery-rate");
const betCount = document.getElementById("bet-count");
const ticketSummaryList = document.getElementById("ticket-summary-list");

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
    status: "未確定",
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
  if (!event.target.classList.contains("status-select")) {
    return;
  }

  const id = Number(event.target.dataset.id);
  updateBetStatus(id, event.target.value);
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

  try {
    const parsedBets = JSON.parse(savedBets);

    if (!Array.isArray(parsedBets)) {
      return [];
    }

    return parsedBets.map(function (bet) {
      return normalizeBet(bet);
    });
  } catch (error) {
    return [];
  }
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
          <select class="status-select" data-id="${bet.id}" aria-label="結果ステータス">
            <option value="未確定"${bet.status === "未確定" ? " selected" : ""}>未確定</option>
            <option value="的中"${bet.status === "的中" ? " selected" : ""}>的中</option>
            <option value="不的中"${bet.status === "不的中" ? " selected" : ""}>不的中</option>
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
            ${bet.status === "的中" ? "" : "disabled"}
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
  bet = bet || {};

  // v1の保存データにはstatus/payoutがないため、ここでv2の形にそろえます。
  const status = bet.status || bet.result || "未確定";

  return {
    id: bet.id,
    date: bet.date,
    place: bet.place,
    race: bet.race,
    ticketType: bet.ticketType,
    betNumbers: bet.betNumbers,
    amount: Number(bet.amount) || 0,
    status: normalizeStatus(status),
    payout: Number(bet.payout) || 0,
    memo: bet.memo || ""
  };
}

function normalizeStatus(status) {
  if (status === "的中" || status === "不的中" || status === "未確定") {
    return status;
  }

  return "未確定";
}

function deleteBet(id) {
  bets = bets.filter(function (bet) {
    return bet.id !== id;
  });

  saveBets();
  renderBets();
}

function updateBetStatus(id, status) {
  const bet = findBet(id);

  if (bet === undefined) {
    return;
  }

  bet.status = normalizeStatus(status);

  if (bet.status !== "的中") {
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
  const recoveryRateValue = amountSum === 0 ? 0 : (payoutSum / amountSum) * 100;

  totalAmount.textContent = formatYen(amountSum);
  totalPayout.textContent = formatYen(payoutSum);
  profitLoss.textContent = formatSignedYen(balance);
  profitLoss.className = balance >= 0 ? "plus" : "minus";
  recoveryRate.textContent = recoveryRateValue.toFixed(1);
  betCount.textContent = bets.length + "件";
  updateTicketTypeSummary();
}

function updateTicketTypeSummary() {
  const ticketSummaries = createTicketTypeSummaries();

  ticketSummaryList.innerHTML = "";

  ticketSummaries.forEach(function (summary) {
    const card = createTicketSummaryCard(summary);
    ticketSummaryList.appendChild(card);
  });
}

function createTicketTypeSummaries() {
  const summaries = {};

  // 表示対象の券種を先に作っておくと、登録が0件でも全券種を表示できます。
  TICKET_TYPES.forEach(function (ticketType) {
    summaries[ticketType] = {
      ticketType: ticketType,
      count: 0,
      amountSum: 0,
      payoutSum: 0
    };
  });

  bets.forEach(function (bet) {
    const summary = summaries[bet.ticketType];

    if (summary === undefined) {
      return;
    }

    summary.count += 1;
    summary.amountSum += Number(bet.amount) || 0;
    summary.payoutSum += Number(bet.payout) || 0;
  });

  return TICKET_TYPES.map(function (ticketType) {
    const summary = summaries[ticketType];
    summary.balance = summary.payoutSum - summary.amountSum;
    summary.recoveryRate = summary.amountSum === 0 ? 0 : (summary.payoutSum / summary.amountSum) * 100;
    return summary;
  });
}

function createTicketSummaryCard(summary) {
  const card = document.createElement("article");
  card.className = "ticket-summary-card";

  const balanceClass = summary.balance >= 0 ? "plus" : "minus";

  card.innerHTML = `
    <h3>${escapeHtml(summary.ticketType)}</h3>
    <dl>
      <div>
        <dt>件数</dt>
        <dd>${summary.count}件</dd>
      </div>
      <div>
        <dt>購入</dt>
        <dd>${formatYen(summary.amountSum)}円</dd>
      </div>
      <div>
        <dt>払戻</dt>
        <dd>${formatYen(summary.payoutSum)}円</dd>
      </div>
      <div>
        <dt>収支</dt>
        <dd class="${balanceClass}">${formatSignedYen(summary.balance)}円</dd>
      </div>
      <div>
        <dt>回収率</dt>
        <dd>${summary.recoveryRate.toFixed(1)}%</dd>
      </div>
    </dl>
  `;

  return card;
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
