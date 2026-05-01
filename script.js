const STORAGE_KEY = "keibaBetMemoList";
const APP_NAME = "keiba-bet-memo";
const APP_VERSION = "v7";
const TICKET_TYPES = ["単勝", "複勝", "ワイド", "馬連", "馬単", "三連複", "三連単"];
const STATUS_TYPES = ["未確定", "的中", "不的中"];
const TICKET_TYPE_FIELDS = {
  "単勝": ["馬番"],
  "複勝": ["馬番"],
  "ワイド": ["1頭目", "2頭目"],
  "馬連": ["1頭目", "2頭目"],
  "馬単": ["1着", "2着"],
  "三連複": ["1頭目", "2頭目", "3頭目"],
  "三連単": ["1着", "2着", "3着"]
};
const ORDERLESS_TICKET_TYPES = ["ワイド", "馬連", "三連複"];

const betForm = document.getElementById("bet-form");
const dateInput = document.getElementById("date");
const placeInput = document.getElementById("place");
const raceInput = document.getElementById("race");
const ticketTypeInput = document.getElementById("ticket-type");
const betNumbersInput = document.getElementById("bet-numbers");
const horseNumberFields = document.getElementById("horse-number-fields");
const betNumbersError = document.getElementById("bet-numbers-error");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");
const tagsInput = document.getElementById("tags");
const statusInput = document.getElementById("status");
const payoutInput = document.getElementById("payout");
const editOnlyFields = document.getElementById("edit-only-fields");
const editMessage = document.getElementById("edit-message");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit");

const betList = document.getElementById("bet-list");
const emptyMessage = document.getElementById("empty-message");
const totalAmount = document.getElementById("total-amount");
const totalPayout = document.getElementById("total-payout");
const profitLoss = document.getElementById("profit-loss");
const recoveryRate = document.getElementById("recovery-rate");
const betCount = document.getElementById("bet-count");
const ticketSummaryList = document.getElementById("ticket-summary-list");
const filterDateInput = document.getElementById("filter-date");
const filterPlaceInput = document.getElementById("filter-place");
const filterTicketTypeInput = document.getElementById("filter-ticket-type");
const filterStatusInput = document.getElementById("filter-status");
const resetFiltersButton = document.getElementById("reset-filters");
const exportCsvButton = document.getElementById("export-csv");
const csvMessage = document.getElementById("csv-message");
const exportBackupButton = document.getElementById("export-backup");
const restoreFileInput = document.getElementById("restore-file");
const restoreModeInput = document.getElementById("restore-mode");
const restoreBackupButton = document.getElementById("restore-backup");
const backupMessage = document.getElementById("backup-message");

let bets = loadBets();
let editingBetId = null;

setToday();
setSelectValidationMessages();
renderHorseNumberInputs();
setFormModeNew();
renderBets();

betForm.addEventListener("submit", function (event) {
  event.preventDefault();

  if (!placeInput.value) {
    placeInput.setCustomValidity("競馬場を選択してください。");
    placeInput.reportValidity();
    return;
  }

  if (!raceInput.value) {
    raceInput.setCustomValidity("レース番号を選択してください。");
    raceInput.reportValidity();
    return;
  }

  const combination = validateAndBuildCombination();

  if (combination === "") {
    return;
  }

  if (!confirmAmountIfNeeded()) {
    return;
  }

  const nowText = new Date().toISOString();
  const formValues = createBetValuesFromForm(combination);

  if (editingBetId === null) {
    const bet = Object.assign({}, formValues, {
      id: createUniqueId(createUsedIdSet(bets)),
      createdAt: nowText,
      updatedAt: nowText
    });

    bets.push(bet);
  } else {
    const bet = findBet(editingBetId);

    if (bet === undefined) {
      setFormModeNew();
      renderBets();
      return;
    }

    Object.assign(bet, formValues, {
      id: bet.id,
      createdAt: bet.createdAt || nowText,
      updatedAt: nowText
    });
  }

  saveBets();
  renderBets();
  resetForm();
});

filterDateInput.addEventListener("input", renderBets);
filterPlaceInput.addEventListener("change", renderBets);
filterTicketTypeInput.addEventListener("change", renderBets);
filterStatusInput.addEventListener("change", renderBets);

resetFiltersButton.addEventListener("click", function () {
  filterDateInput.value = "";
  filterPlaceInput.value = "";
  filterTicketTypeInput.value = "";
  filterStatusInput.value = "";
  renderBets();
});

exportCsvButton.addEventListener("click", exportVisibleBetsToCsv);
exportBackupButton.addEventListener("click", exportBackupJson);
restoreBackupButton.addEventListener("click", restoreBackupJson);
ticketTypeInput.addEventListener("change", renderHorseNumberInputs);
statusInput.addEventListener("change", updateFormPayoutState);
cancelEditButton.addEventListener("click", resetForm);

placeInput.addEventListener("change", function () {
  placeInput.setCustomValidity("");
});

raceInput.addEventListener("change", function () {
  raceInput.setCustomValidity("");
});

ticketTypeInput.addEventListener("change", function () {
  ticketTypeInput.setCustomValidity("");
});

horseNumberFields.addEventListener("input", function (event) {
  if (!event.target.classList.contains("horse-number-input")) {
    return;
  }

  clearBetNumbersError();
});

// 一覧のボタンはあとから作るため、一覧全体でクリックを受け取ります。
betList.addEventListener("click", function (event) {
  if (event.target.classList.contains("edit-button")) {
    startEditBet(event.target.dataset.id);
    return;
  }

  if (event.target.classList.contains("duplicate-button")) {
    duplicateBet(event.target.dataset.id);
    return;
  }

  if (event.target.classList.contains("delete-button")) {
    deleteBet(event.target.dataset.id);
  }
});

// 的中/不的中や払戻金を変えたら、その場で保存します。
betList.addEventListener("change", function (event) {
  if (!event.target.classList.contains("status-select")) {
    return;
  }

  const id = event.target.dataset.id;
  updateBetStatus(id, event.target.value);
});

betList.addEventListener("input", function (event) {
  if (!event.target.classList.contains("payout-input")) {
    return;
  }

  const id = event.target.dataset.id;
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
  updatePlaceFilterOptions();
  clearCsvMessage();

  const filteredBets = getFilteredBets();

  betList.innerHTML = "";

  if (bets.length === 0) {
    emptyMessage.textContent = "まだ購入記録が登録されていません。";
    emptyMessage.style.display = "block";
  } else if (filteredBets.length === 0) {
    emptyMessage.textContent = "条件に合う購入記録がありません。";
    emptyMessage.style.display = "block";
  } else {
    emptyMessage.style.display = "none";
  }

  filteredBets.forEach(function (bet) {
    const card = createBetCard(bet);
    betList.appendChild(card);
  });

  updateSummary(filteredBets);
}

function createBetCard(bet) {
  const card = document.createElement("article");
  card.className = "bet-card";
  const tagsHtml = createTagsHtml(bet.tags);
  const createdAtText = formatDateTime(bet.createdAt);
  const updatedAtText = formatDateTime(bet.updatedAt);

  card.innerHTML = `
    <div class="bet-card-header">
      <div>
        <h3 class="bet-title">${escapeHtml(bet.place)} ${escapeHtml(bet.race)}</h3>
        <p class="bet-date">${escapeHtml(bet.date)}</p>
      </div>
      <div class="bet-card-actions">
        <button type="button" class="edit-button" data-id="${bet.id}">編集</button>
        <button type="button" class="duplicate-button" data-id="${bet.id}">複製</button>
        <button type="button" class="delete-button" data-id="${bet.id}">削除</button>
      </div>
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
      <div class="bet-tags-row">
        <dt>タグ</dt>
        <dd>${tagsHtml}</dd>
      </div>
      <div class="bet-time-row">
        <dt>日時</dt>
        <dd>
          <span>登録：${escapeHtml(createdAtText || "不明")}</span>
          <span>更新：${escapeHtml(updatedAtText || "不明")}</span>
        </dd>
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
    place: bet.place || bet.track,
    race: bet.race,
    ticketType: bet.ticketType || bet.betType,
    betNumbers: bet.betNumbers || bet.combination || "",
    amount: Number(bet.amount) || 0,
    status: normalizeStatus(status),
    payout: Number(bet.payout) || 0,
    memo: bet.memo || "",
    tags: normalizeTags(bet.tags),
    createdAt: bet.createdAt || "",
    updatedAt: bet.updatedAt || ""
  };
}

function normalizeImportedBet(bet, usedIds) {
  const normalizedBet = normalizeBet(bet);

  if (normalizedBet.id === undefined || normalizedBet.id === null || usedIds.has(String(normalizedBet.id))) {
    normalizedBet.id = createUniqueId(usedIds);
  }

  usedIds.add(String(normalizedBet.id));
  return normalizedBet;
}

function normalizeStatus(status) {
  if (STATUS_TYPES.includes(status)) {
    return status;
  }

  return "未確定";
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map(function (tag) {
      return String(tag).trim();
    })
    .filter(function (tag) {
      return tag !== "";
    });
}

function deleteBet(id) {
  bets = bets.filter(function (bet) {
    return String(bet.id) !== String(id);
  });

  saveBets();
  renderBets();
}

function startEditBet(id) {
  const bet = findBet(id);

  if (bet === undefined) {
    return;
  }

  editingBetId = id;
  dateInput.value = bet.date || getTodayText();
  ensureSelectHasOption(placeInput, bet.place);
  ensureSelectHasOption(raceInput, bet.race);
  ensureSelectHasOption(ticketTypeInput, bet.ticketType);
  placeInput.value = bet.place || "";
  raceInput.value = bet.race || "";
  ticketTypeInput.value = bet.ticketType || "";
  renderHorseNumberInputs();
  fillHorseNumberInputs(bet);
  amountInput.value = bet.amount;
  memoInput.value = bet.memo || "";
  tagsInput.value = bet.tags.join(", ");
  statusInput.value = normalizeStatus(bet.status);
  payoutInput.value = Number(bet.payout) || 0;
  setFormModeEdit(bet);
  updateFormPayoutState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function duplicateBet(id) {
  const sourceBet = findBet(id);

  if (sourceBet === undefined) {
    return;
  }

  const nowText = new Date().toISOString();
  const copiedBet = Object.assign({}, normalizeBet(sourceBet), {
    id: createUniqueId(createUsedIdSet(bets)),
    status: "未確定",
    payout: 0,
    createdAt: nowText,
    updatedAt: nowText
  });

  bets.push(copiedBet);
  saveBets();
  renderBets();
}

function updateBetStatus(id, status) {
  const bet = findBet(id);

  if (bet === undefined) {
    return;
  }

  bet.status = normalizeStatus(status);
  bet.updatedAt = new Date().toISOString();

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
  bet.updatedAt = new Date().toISOString();
  saveBets();
  updateSummary(getFilteredBets());
}

function renderHorseNumberInputs() {
  const ticketType = ticketTypeInput.value;
  const labels = TICKET_TYPE_FIELDS[ticketType] || [];

  horseNumberFields.innerHTML = "";
  betNumbersInput.value = "";
  clearBetNumbersError();

  if (labels.length === 0) {
    const message = document.createElement("p");
    message.className = "horse-number-placeholder";
    message.textContent = "券種を選ぶと必要な馬番入力欄が表示されます。";
    horseNumberFields.appendChild(message);
    return;
  }

  labels.forEach(function (labelText, index) {
    const label = document.createElement("label");
    const input = document.createElement("input");

    input.type = "text";
    input.className = "horse-number-input";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.setAttribute("list", "horse-number-options");
    input.setAttribute("aria-label", labelText + "の馬番");
    input.dataset.index = String(index);
    input.placeholder = "1〜18";

    label.textContent = labelText;
    label.appendChild(input);
    horseNumberFields.appendChild(label);
  });
}

function validateAndBuildCombination() {
  const ticketType = ticketTypeInput.value;
  const labels = TICKET_TYPE_FIELDS[ticketType] || [];
  const inputs = Array.from(horseNumberFields.querySelectorAll(".horse-number-input"));
  const values = inputs.map(function (input) {
    return input.value.trim();
  });

  clearBetNumbersError();

  if (labels.length === 0) {
    ticketTypeInput.setCustomValidity("券種を選択してください。");
    ticketTypeInput.reportValidity();
    return "";
  }

  // 古いデータなどで馬番欄へ分解できない買い目は、編集時だけ既存文字列を維持します。
  if (editingBetId !== null && betNumbersInput.value !== "" && values.every(function (value) {
    return value === "";
  })) {
    return betNumbersInput.value;
  }

  const emptyIndex = values.findIndex(function (value) {
    return value === "";
  });

  if (emptyIndex !== -1) {
    return showBetNumbersError(inputs[emptyIndex], labels[emptyIndex] + "の馬番を選択してください。");
  }

  const invalidIndex = values.findIndex(function (value) {
    return !isValidHorseNumber(value);
  });

  if (invalidIndex !== -1) {
    return showBetNumbersError(inputs[invalidIndex], "馬番は1〜18の数字で入力してください。");
  }

  const normalizedValues = values.map(function (value) {
    return String(Number(value));
  });
  const uniqueValues = new Set(normalizedValues);

  if (uniqueValues.size !== values.length) {
    return showBetNumbersError(inputs[0], "同じ購入記録内で同じ馬番は選べません。別の馬番を選択してください。");
  }

  const numbersForSave = ORDERLESS_TICKET_TYPES.includes(ticketType)
    ? normalizedValues.slice().sort(function (a, b) {
        return Number(a) - Number(b);
      })
    : normalizedValues;
  const separator = ticketType === "馬単" || ticketType === "三連単" ? "→" : "-";
  const combination = numbersForSave.join(separator);

  betNumbersInput.value = combination;
  return combination;
}

function isValidHorseNumber(value) {
  if (!/^\d+$/.test(value)) {
    return false;
  }

  const number = Number(value);
  return number >= 1 && number <= 18;
}

function showBetNumbersError(input, message) {
  betNumbersError.textContent = message;
  input.setCustomValidity(message);
  input.reportValidity();
  input.setCustomValidity("");
  return "";
}

function clearBetNumbersError() {
  betNumbersError.textContent = "";

  horseNumberFields.querySelectorAll(".horse-number-input").forEach(function (input) {
    input.setCustomValidity("");
  });
}

function createBetValuesFromForm(combination) {
  const status = normalizeStatus(statusInput.value);
  const payout = status === "的中" ? Number(payoutInput.value) || 0 : 0;

  return {
    date: dateInput.value,
    place: placeInput.value.trim(),
    race: raceInput.value.trim(),
    ticketType: ticketTypeInput.value,
    betNumbers: combination,
    amount: Number(amountInput.value),
    status: editingBetId === null ? "未確定" : status,
    payout: editingBetId === null ? 0 : payout,
    memo: memoInput.value.trim(),
    tags: parseTags(tagsInput.value)
  };
}

function parseTags(text) {
  return text
    .split(",")
    .map(function (tag) {
      return tag.trim();
    })
    .filter(function (tag) {
      return tag !== "";
    });
}

function confirmAmountIfNeeded() {
  const amount = Number(amountInput.value);

  if (amount >= 100 && amount % 100 === 0) {
    return true;
  }

  return window.confirm("購入金額は通常100円単位です。入力した金額のまま保存しますか？");
}

function fillHorseNumberInputs(bet) {
  const inputs = Array.from(horseNumberFields.querySelectorAll(".horse-number-input"));
  const numbers = parseBetNumbersForInputs(bet.ticketType, bet.betNumbers);

  if (numbers.length !== inputs.length) {
    betNumbersInput.value = bet.betNumbers || "";
    return;
  }

  inputs.forEach(function (input, index) {
    input.value = numbers[index];
  });
}

function parseBetNumbersForInputs(ticketType, betNumbers) {
  const text = String(betNumbers || "");
  const numbers = text.match(/\d+/g) || [];
  const labels = TICKET_TYPE_FIELDS[ticketType] || [];

  if (numbers.length !== labels.length) {
    return [];
  }

  return numbers;
}

function setFormModeNew() {
  editingBetId = null;
  submitButton.textContent = "登録する";
  cancelEditButton.style.display = "none";
  editOnlyFields.style.display = "none";
  editMessage.textContent = "";
  statusInput.value = "未確定";
  payoutInput.value = 0;
  updateFormPayoutState();
}

function setFormModeEdit(bet) {
  submitButton.textContent = "編集を保存";
  cancelEditButton.style.display = "inline-block";
  editOnlyFields.style.display = "grid";
  editMessage.textContent = "編集中：" + (bet.date || "") + " " + (bet.place || "") + " " + (bet.race || "");
}

function ensureSelectHasOption(select, value) {
  if (!value) {
    return;
  }

  const exists = Array.from(select.options).some(function (option) {
    return option.value === value;
  });

  if (exists) {
    return;
  }

  const option = document.createElement("option");
  option.value = value;
  option.textContent = value;
  select.appendChild(option);
}

function updateFormPayoutState() {
  const canEditPayout = statusInput.value === "的中";

  payoutInput.disabled = !canEditPayout;

  if (!canEditPayout) {
    payoutInput.value = 0;
  }
}

function findBet(id) {
  return bets.find(function (bet) {
    return String(bet.id) === String(id);
  });
}

function exportVisibleBetsToCsv() {
  // CSV出力も画面表示と同じ絞り込み結果を使います。
  const targetBets = getFilteredBets();

  if (targetBets.length === 0) {
    showCsvMessage("CSV出力できる購入記録がありません。絞り込み条件を変更してください。", true);
    return;
  }

  const csvText = createCsvText(targetBets);
  const fileName = "keiba-bet-memo-" + getTodayText() + ".csv";
  downloadCsv(csvText, fileName);
  showCsvMessage(targetBets.length + "件のCSVを出力しました。", false);
}

function exportBackupJson() {
  const backupData = {
    appName: APP_NAME,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      bets: bets.map(function (bet) {
        return normalizeBet(bet);
      })
    }
  };

  const jsonText = JSON.stringify(backupData, null, 2);
  const fileName = "keiba-bet-memo-backup-" + getTodayText() + ".json";

  downloadTextFile(jsonText, fileName, "application/json;charset=utf-8;");
  showBackupMessage("全" + bets.length + "件のJSONバックアップを保存しました。", false);
}

function restoreBackupJson() {
  const file = restoreFileInput.files[0];
  const mode = restoreModeInput.value;

  if (file === undefined) {
    showBackupMessage("復元するJSONファイルを選択してください。", true);
    return;
  }

  const message = mode === "replace"
    ? "現在のデータをバックアップ内容で置き換えます。実行しますか？"
    : "バックアップ内容を現在のデータに追加します。実行しますか？";

  if (!window.confirm(message)) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", function () {
    try {
      const importedBets = parseBackupJson(reader.result);
      const usedIds = createUsedIdSet(mode === "append" ? bets : []);
      const restoredBets = importedBets.map(function (bet) {
        return normalizeImportedBet(bet, usedIds);
      });

      bets = mode === "append" ? bets.concat(restoredBets) : restoredBets;
      saveBets();
      renderBets();
      restoreFileInput.value = "";

      const actionText = mode === "append" ? "追加" : "置き換え";
      showBackupMessage(restoredBets.length + "件のデータを" + actionText + "復元しました。", false);
    } catch (error) {
      showBackupMessage(error.message, true);
    }
  });

  reader.addEventListener("error", function () {
    showBackupMessage("ファイルを読み込めませんでした。別のJSONバックアップを選んでください。", true);
  });

  reader.readAsText(file);
}

function parseBackupJson(jsonText) {
  let parsedBackup;

  try {
    parsedBackup = JSON.parse(jsonText);
  } catch (error) {
    throw new Error("JSONの形式が正しくありません。バックアップファイルを確認してください。");
  }

  if (parsedBackup === null || typeof parsedBackup !== "object") {
    throw new Error("バックアップ形式が正しくありません。");
  }

  const backupBets = getBackupBets(parsedBackup);

  if (!Array.isArray(backupBets)) {
    throw new Error("購入記録データが見つかりません。v6以降のJSONバックアップを選んでください。");
  }

  validateBackupBets(backupBets);

  return backupBets;
}

function getBackupBets(parsedBackup) {
  if (parsedBackup.data && Array.isArray(parsedBackup.data.bets)) {
    return parsedBackup.data.bets;
  }

  // 念のため、data自体が配列の古い/手作りJSONも読み込めるようにします。
  if (Array.isArray(parsedBackup.data)) {
    return parsedBackup.data;
  }

  return null;
}

function validateBackupBets(backupBets) {
  const hasInvalidBet = backupBets.some(function (bet) {
    return bet === null || typeof bet !== "object" || Array.isArray(bet);
  });

  if (hasInvalidBet) {
    throw new Error("購入記録データの形式が正しくありません。別のJSONバックアップを選んでください。");
  }
}

function createCsvText(targetBets) {
  const header = [
    "date",
    "track",
    "race",
    "betType",
    "combination",
    "amount",
    "status",
    "payout",
    "profit",
    "memo",
    "tags",
    "createdAt",
    "updatedAt"
  ];

  const rows = targetBets.map(function (bet) {
    const amount = Number(bet.amount) || 0;
    const payout = Number(bet.payout) || 0;

    return [
      bet.date,
      bet.place,
      bet.race,
      bet.ticketType,
      bet.betNumbers,
      amount,
      bet.status,
      payout,
      payout - amount,
      bet.memo,
      bet.tags.join(", "),
      bet.createdAt,
      bet.updatedAt
    ];
  });

  const csvRows = [header].concat(rows).map(function (row) {
    return row.map(escapeCsvValue).join(",");
  });

  // Excelで日本語が文字化けしにくいように、UTF-8 BOMを先頭に付けます。
  return "\uFEFF" + csvRows.join("\r\n");
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (text.includes(",") || text.includes("\n") || text.includes("\r") || text.includes('"')) {
    return '"' + text.replace(/"/g, '""') + '"';
  }

  return text;
}

function downloadCsv(csvText, fileName) {
  downloadTextFile(csvText, fileName, "text/csv;charset=utf-8;");
}

function downloadTextFile(text, fileName, fileType) {
  const blob = new Blob([text], { type: fileType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

function createUsedIdSet(targetBets) {
  const usedIds = new Set();

  targetBets.forEach(function (bet) {
    if (bet.id !== undefined && bet.id !== null) {
      usedIds.add(String(bet.id));
    }
  });

  return usedIds;
}

function createUniqueId(usedIds) {
  let id = Date.now();

  while (usedIds.has(String(id))) {
    id += 1;
  }

  return id;
}

function showCsvMessage(message, isError) {
  csvMessage.textContent = message;
  csvMessage.classList.toggle("is-error", isError);
}

function clearCsvMessage() {
  csvMessage.textContent = "";
  csvMessage.classList.remove("is-error");
}

function showBackupMessage(message, isError) {
  backupMessage.textContent = message;
  backupMessage.classList.toggle("is-error", isError);
}

function getFilteredBets() {
  const selectedDate = filterDateInput.value;
  const selectedPlace = filterPlaceInput.value;
  const selectedTicketType = filterTicketTypeInput.value;
  const selectedStatus = filterStatusInput.value;

  return bets.filter(function (bet) {
    const dateMatches = selectedDate === "" || bet.date === selectedDate;
    const placeMatches = selectedPlace === "" || bet.place === selectedPlace;
    const ticketTypeMatches = selectedTicketType === "" || bet.ticketType === selectedTicketType;
    const statusMatches = selectedStatus === "" || bet.status === selectedStatus;

    return dateMatches && placeMatches && ticketTypeMatches && statusMatches;
  });
}

function updatePlaceFilterOptions() {
  const selectedPlace = filterPlaceInput.value;
  const places = getPlaceOptions();

  filterPlaceInput.innerHTML = '<option value="">すべて</option>';

  places.forEach(function (place) {
    const option = document.createElement("option");
    option.value = place;
    option.textContent = place;
    filterPlaceInput.appendChild(option);
  });

  // 削除などで選択中の競馬場がなくなった場合は「すべて」に戻します。
  if (selectedPlace !== "" && places.includes(selectedPlace)) {
    filterPlaceInput.value = selectedPlace;
  } else {
    filterPlaceInput.value = "";
  }
}

function getPlaceOptions() {
  const places = bets
    .map(function (bet) {
      return bet.place || "";
    })
    .filter(function (place) {
      return place !== "";
    });

  return Array.from(new Set(places)).sort(function (a, b) {
    return a.localeCompare(b, "ja");
  });
}

function updateSummary(targetBets) {
  const amountSum = targetBets.reduce(function (total, bet) {
    return total + bet.amount;
  }, 0);

  const payoutSum = targetBets.reduce(function (total, bet) {
    return total + bet.payout;
  }, 0);

  const balance = payoutSum - amountSum;
  const recoveryRateValue = amountSum === 0 ? 0 : (payoutSum / amountSum) * 100;

  totalAmount.textContent = formatYen(amountSum);
  totalPayout.textContent = formatYen(payoutSum);
  profitLoss.textContent = formatSignedYen(balance);
  profitLoss.className = balance >= 0 ? "plus" : "minus";
  recoveryRate.textContent = recoveryRateValue.toFixed(1);
  betCount.textContent = "表示中：" + targetBets.length + "件 / 全" + bets.length + "件";
  updateTicketTypeSummary(targetBets);
}

function updateTicketTypeSummary(targetBets) {
  const ticketSummaries = createTicketTypeSummaries(targetBets);

  ticketSummaryList.innerHTML = "";

  ticketSummaries.forEach(function (summary) {
    const card = createTicketSummaryCard(summary);
    ticketSummaryList.appendChild(card);
  });
}

function createTicketTypeSummaries(targetBets) {
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

  targetBets.forEach(function (bet) {
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
  renderHorseNumberInputs();
  setFormModeNew();
  placeInput.focus();
}

function setSelectValidationMessages() {
  placeInput.addEventListener("invalid", function () {
    if (!placeInput.value) {
      placeInput.setCustomValidity("競馬場を選択してください。");
    }
  });

  raceInput.addEventListener("invalid", function () {
    if (!raceInput.value) {
      raceInput.setCustomValidity("レース番号を選択してください。");
    }
  });

  ticketTypeInput.addEventListener("invalid", function () {
    if (!ticketTypeInput.value) {
      ticketTypeInput.setCustomValidity("券種を選択してください。");
    }
  });
}

function setToday() {
  dateInput.value = getTodayText();
}

function getTodayText() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + date;
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

function createTagsHtml(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "なし";
  }

  return tags.map(function (tag) {
    return '<span class="tag-chip">' + escapeHtml(tag) + "</span>";
  }).join("");
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return year + "-" + month + "-" + day + " " + hours + ":" + minutes;
}

// 画面に文字を表示するとき、HTMLとして解釈されないようにします。
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
