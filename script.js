const STORAGE_KEY = "keibaBetMemoList";
const SIMULATION_STORAGE_KEY = "keibaBetMemoSimulationSettings";
const IMPORT_HISTORY_STORAGE_KEY = "keibaBetMemoResultImportHistory";
const LAST_IMPORT_SNAPSHOT_STORAGE_KEY = "bakenoni_last_import_snapshot";
const APP_NAME = "keiba-bet-memo";
const APP_VERSION = "v12.9";
const DEFAULT_INITIAL_FUND = 100000;
const RACE_OPTIONS = ["1R", "2R", "3R", "4R", "5R", "6R", "7R", "8R", "9R", "10R", "11R", "12R"];
const TICKET_TYPES = ["単勝", "複勝", "ワイド", "馬連", "馬単", "三連複", "三連単"];
const PURCHASE_MODES = ["通常", "ながし", "ボックス", "フォーメーション"];
const STATUS_TYPES = ["未確定", "的中", "不的中"];
const TRACK_CODES = {
  "札幌": "SAPPORO",
  "函館": "HAKODATE",
  "福島": "FUKUSHIMA",
  "新潟": "NIIGATA",
  "東京": "TOKYO",
  "中山": "NAKAYAMA",
  "中京": "CHUKYO",
  "京都": "KYOTO",
  "阪神": "HANSHIN",
  "小倉": "KOKURA"
};
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
const HORSE_NUMBERS = Array.from({ length: 18 }, function (_, index) {
  return String(index + 1);
});

const betForm = document.getElementById("bet-form");
const dateInput = document.getElementById("date");
const placeInput = document.getElementById("place");
const raceInput = document.getElementById("race");
const ticketTypeInput = document.getElementById("ticket-type");
const purchaseModeInputs = Array.from(document.querySelectorAll('input[name="purchase-mode"]'));
const purchaseModeNote = document.getElementById("purchase-mode-note");
const betNumbersInput = document.getElementById("bet-numbers");
const horseNumberFields = document.getElementById("horse-number-fields");
const betNumbersError = document.getElementById("bet-numbers-error");
const generatedCount = document.getElementById("generated-count");
const generatedTotalAmount = document.getElementById("generated-total-amount");
const generatedPreview = document.getElementById("generated-preview");
const generatedWarning = document.getElementById("generated-warning");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");
const tagsInput = document.getElementById("tags");
const statusInput = document.getElementById("status");
const payoutInput = document.getElementById("payout");
const editOnlyFields = document.getElementById("edit-only-fields");
const editMessage = document.getElementById("edit-message");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit");
const simulationInitialFund = document.getElementById("simulation-initial-fund");
const simulationCurrentBalance = document.getElementById("simulation-current-balance");
const simulationTotalAmount = document.getElementById("simulation-total-amount");
const simulationTotalPayout = document.getElementById("simulation-total-payout");
const simulationProfitLoss = document.getElementById("simulation-profit-loss");
const simulationRecoveryRate = document.getElementById("simulation-recovery-rate");
const simulationBalanceRate = document.getElementById("simulation-balance-rate");
const initialFundInput = document.getElementById("initial-fund-input");
const saveInitialFundButton = document.getElementById("save-initial-fund");
const resetAllDataButton = document.getElementById("reset-all-data");
const simulationMessage = document.getElementById("simulation-message");

const betList = document.getElementById("bet-list");
const emptyMessage = document.getElementById("empty-message");
const totalAmount = document.getElementById("total-amount");
const totalPayout = document.getElementById("total-payout");
const profitLoss = document.getElementById("profit-loss");
const recoveryRate = document.getElementById("recovery-rate");
const betCount = document.getElementById("bet-count");
const ticketSummaryList = document.getElementById("ticket-summary-list");
const analysisBasicCards = document.getElementById("analysis-basic-cards");
const analysisDateTable = document.getElementById("analysis-date-table");
const analysisPlaceTable = document.getElementById("analysis-place-table");
const analysisTagTable = document.getElementById("analysis-tag-table");
const analysisPurchaseModeTable = document.getElementById("analysis-purchase-mode-table");
const analysisTicketRanking = document.getElementById("analysis-ticket-ranking");
const analysisPlaceRanking = document.getElementById("analysis-place-ranking");
const analysisTagRanking = document.getElementById("analysis-tag-ranking");
const analysisRecordHighlights = document.getElementById("analysis-record-highlights");
const filterDateInput = document.getElementById("filter-date");
const filterPlaceInput = document.getElementById("filter-place");
const filterTicketTypeInput = document.getElementById("filter-ticket-type");
const filterStatusInput = document.getElementById("filter-status");
const filterTagInput = document.getElementById("filter-tag");
const filterPurchaseModeInput = document.getElementById("filter-purchase-mode");
const searchKeywordInput = document.getElementById("search-keyword");
const resetFiltersButton = document.getElementById("reset-filters");
const exportCsvButton = document.getElementById("export-csv");
const csvMessage = document.getElementById("csv-message");
const resultImportFileInput = document.getElementById("result-import-file");
const readResultImportButton = document.getElementById("read-result-import");
const applyResultImportButton = document.getElementById("apply-result-import");
const markRaceMissButton = document.getElementById("mark-race-miss");
const overwriteResultImportInput = document.getElementById("overwrite-result-import");
const undoResultImportButton = document.getElementById("undo-result-import");
const undoResultImportStatus = document.getElementById("undo-result-import-status");
const resultImportMessage = document.getElementById("result-import-message");
const resultImportPreview = document.getElementById("result-import-preview");
const resultImportHistoryList = document.getElementById("result-import-history-list");
const exportBackupButton = document.getElementById("export-backup");
const restoreFileInput = document.getElementById("restore-file");
const restoreModeInput = document.getElementById("restore-mode");
const restoreBackupButton = document.getElementById("restore-backup");
const backupMessage = document.getElementById("backup-message");

let bets = loadBets();
let simulationSettings = loadSimulationSettings();
let resultImportHistory = loadResultImportHistory();
let editingBetId = null;
let currentResultImportPreview = null;
let betSortState = {
  key: "date",
  direction: "desc"
};

setToday();
setSelectValidationMessages();
renderHorseNumberInputs();
updateGeneratedPreview();
setFormModeNew();
saveBets();
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

  const nowText = new Date().toISOString();

  if (editingBetId === null) {
    const combinations = validateAndBuildCombinations();

    if (combinations.length === 0) {
      return;
    }

    if (!confirmAmountIfNeeded()) {
      return;
    }

    if (combinations.length > 100 && !window.confirm("生成点数が" + combinations.length + "点です。このまま登録しますか？")) {
      return;
    }

    const amountPerPoint = Number(amountInput.value) || 0;
    const totalPurchaseAmount = combinations.length * amountPerPoint;
    const currentBalance = calculateSimulationSummary(null).currentBalance;

    if (totalPurchaseAmount > currentBalance) {
      showSimulationMessage("現在残高が不足しています。合計購入金額が現在残高を" + formatYen(totalPurchaseAmount - currentBalance) + "円超えています。", true);
      amountInput.focus();
      return;
    }

    const duplicateCombinations = findExistingDuplicateCombinations(combinations);

    if (duplicateCombinations.length > 0 && !window.confirm("同じ日付・競馬場・レース・券種・買い目が既にあります。重複：" + duplicateCombinations.join(", ") + "。このまま登録しますか？")) {
      return;
    }

    const usedIds = createUsedIdSet(bets);
    const groupId = combinations.length > 1 ? createGeneratedGroupId() : "";
    const formValues = createBetValuesFromForm("");
    const newBets = combinations.map(function (combination) {
      const id = createUniqueId(usedIds);
      usedIds.add(String(id));

      return Object.assign({}, formValues, {
        id: id,
        betNumbers: normalizeCombinationForTicketType(formValues.ticketType, combination),
        amount: amountPerPoint,
        status: "未確定",
        payout: 0,
        purchaseMode: getEffectivePurchaseMode(formValues.ticketType),
        generatedGroupId: groupId,
        createdAt: nowText,
        updatedAt: nowText
      });
    });

    bets = bets.concat(newBets);
  } else {
    const combination = validateAndBuildCombination();

    if (combination === "") {
      return;
    }

    if (!confirmAmountIfNeeded()) {
      return;
    }

    const formValues = createBetValuesFromForm(combination);
    const projectedBalance = calculateProjectedBalance(formValues, editingBetId);

    if (projectedBalance < 0) {
      const shortage = Math.abs(projectedBalance);
      showSimulationMessage("現在残高が不足しています。保存すると残高が" + formatYen(shortage) + "円不足します。", true);
      amountInput.focus();
      return;
    }

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
  showSimulationMessage("現在残高を全記録から再計算しました。", false);
  renderBets();
  resetForm();
});

filterDateInput.addEventListener("input", renderBets);
filterPlaceInput.addEventListener("change", renderBets);
filterTicketTypeInput.addEventListener("change", renderBets);
filterStatusInput.addEventListener("change", renderBets);
filterTagInput.addEventListener("change", renderBets);
filterPurchaseModeInput.addEventListener("change", renderBets);
searchKeywordInput.addEventListener("input", renderBets);

resetFiltersButton.addEventListener("click", function () {
  filterDateInput.value = "";
  filterPlaceInput.value = "";
  filterTicketTypeInput.value = "";
  filterStatusInput.value = "";
  filterTagInput.value = "";
  filterPurchaseModeInput.value = "";
  searchKeywordInput.value = "";
  renderBets();
});

exportCsvButton.addEventListener("click", exportVisibleBetsToCsv);
readResultImportButton.addEventListener("click", readResultImportFile);
applyResultImportButton.addEventListener("click", applyResultImport);
markRaceMissButton.addEventListener("click", markPendingBetsAsMissForImportedRaces);
overwriteResultImportInput.addEventListener("change", function () {
  if (currentResultImportPreview !== null) {
    renderResultImportPreview(currentResultImportPreview);
  }
});
undoResultImportButton.addEventListener("click", undoLastResultImport);
exportBackupButton.addEventListener("click", exportBackupJson);
restoreBackupButton.addEventListener("click", restoreBackupJson);
ticketTypeInput.addEventListener("change", function () {
  ticketTypeInput.setCustomValidity("");
  ensurePurchaseModeAllowed();
  renderHorseNumberInputs();
});
purchaseModeInputs.forEach(function (input) {
  input.addEventListener("change", renderHorseNumberInputs);
});
amountInput.addEventListener("input", updateGeneratedPreview);
statusInput.addEventListener("change", updateFormPayoutState);
cancelEditButton.addEventListener("click", resetForm);
saveInitialFundButton.addEventListener("click", saveInitialFundOnly);
resetAllDataButton.addEventListener("click", resetAllDataAndInitialFund);

placeInput.addEventListener("change", function () {
  placeInput.setCustomValidity("");
});

raceInput.addEventListener("change", function () {
  raceInput.setCustomValidity("");
});

horseNumberFields.addEventListener("input", function (event) {
  if (!event.target.classList.contains("horse-number-input") && !event.target.classList.contains("horse-choice-input") && !event.target.classList.contains("flow-type-input")) {
    return;
  }

  clearBetNumbersError();
  updateGeneratedPreview();
});

horseNumberFields.addEventListener("change", function () {
  clearBetNumbersError();
  updateGeneratedPreview();
});

// 一覧のボタンはあとから作るため、一覧全体でクリックを受け取ります。
betList.addEventListener("click", function (event) {
  if (event.target.classList.contains("sort-button")) {
    updateBetSort(event.target.dataset.sortKey);
    return;
  }

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

function loadResultImportHistory() {
  const savedHistory = localStorage.getItem(IMPORT_HISTORY_STORAGE_KEY);

  if (savedHistory === null) {
    return [];
  }

  try {
    const parsedHistory = JSON.parse(savedHistory);

    if (!Array.isArray(parsedHistory)) {
      return [];
    }

    return parsedHistory.map(normalizeResultImportHistoryItem).filter(function (historyItem) {
      return historyItem.importedAt !== "";
    });
  } catch (error) {
    return [];
  }
}

function saveResultImportHistory() {
  localStorage.setItem(IMPORT_HISTORY_STORAGE_KEY, JSON.stringify(resultImportHistory));
}

function loadSimulationSettings() {
  const savedSettings = localStorage.getItem(SIMULATION_STORAGE_KEY);

  if (savedSettings === null) {
    return createDefaultSimulationSettings();
  }

  try {
    return normalizeSimulationSettings(JSON.parse(savedSettings));
  } catch (error) {
    return createDefaultSimulationSettings();
  }
}

function saveSimulationSettings() {
  localStorage.setItem(SIMULATION_STORAGE_KEY, JSON.stringify(simulationSettings));
}

function createDefaultSimulationSettings() {
  return {
    mode: "simulation",
    initialFund: DEFAULT_INITIAL_FUND
  };
}

function normalizeSimulationSettings(settings) {
  const initialFund = Number(settings && settings.initialFund);

  return {
    mode: "simulation",
    initialFund: Number.isFinite(initialFund) && initialFund >= 0 ? Math.floor(initialFund) : DEFAULT_INITIAL_FUND
  };
}

function renderBets() {
  updateDynamicFilterOptions();
  clearCsvMessage();
  renderResultImportHistory();
  updateUndoResultImportState();

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

  if (filteredBets.length > 0) {
    betList.appendChild(createBetTable(filteredBets));
    betList.appendChild(createBetMobileList(filteredBets));
  }

  updateSummary(filteredBets);
  updateSimulationSummary();
}

function createBetTable(targetBets) {
  const wrapper = document.createElement("div");
  wrapper.className = "bet-table-scroll";
  wrapper.innerHTML = `
    <table class="bet-table">
      <thead>
        <tr>
          ${createSortableHeader("date", "日付")}
          ${createSortableHeader("place", "競馬場")}
          ${createSortableHeader("race", "R")}
          <th>raceId</th>
          <th>券種</th>
          <th>買い方</th>
          <th>買い目</th>
          ${createSortableHeader("amount", "金額", "number")}
          ${createSortableHeader("status", "結果")}
          ${createSortableHeader("payout", "払戻", "number")}
          ${createSortableHeader("profit", "収支", "number")}
          <th>タグ</th>
          <th>メモ</th>
          <th>更新</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${targetBets.map(createBetRowHtml).join("")}
      </tbody>
    </table>
  `;

  return wrapper;
}

function createSortableHeader(key, label, className) {
  const active = betSortState.key === key;
  const mark = active ? (betSortState.direction === "asc" ? " ▲" : " ▼") : "";
  const thClass = className ? ' class="' + className + '"' : "";

  return '<th' + thClass + '><button type="button" class="sort-button" data-sort-key="' + key + '">' + escapeHtml(label + mark) + "</button></th>";
}

function createBetRowHtml(bet) {
  const amount = Number(bet.amount) || 0;
  const payout = Number(bet.payout) || 0;
  const profit = payout - amount;
  const profitClass = profit >= 0 ? "plus" : "minus";
  const raceIdText = bet.raceId || createRaceId(bet.date, bet.place, bet.race);
  const tagsText = Array.isArray(bet.tags) && bet.tags.length > 0 ? bet.tags.join(", ") : "";

  return `
    <tr>
      <td>${escapeHtml(bet.date || "")}</td>
      <td>${escapeHtml(bet.place || "")}</td>
      <td>${escapeHtml(bet.race || "")}</td>
      <td class="mono-cell">${escapeHtml(raceIdText || "")}</td>
      <td>${escapeHtml(bet.ticketType || "")}</td>
      <td>${escapeHtml(normalizePurchaseMode(bet.purchaseMode))}</td>
      <td class="bet-number-cell">${escapeHtml(bet.betNumbers || "")}</td>
      <td class="number-cell">${formatYen(amount)}円</td>
      <td>
        <select class="status-select status-${getStatusClassName(bet.status)}" data-id="${bet.id}" aria-label="結果ステータス">
          <option value="未確定"${bet.status === "未確定" ? " selected" : ""}>未確定</option>
          <option value="的中"${bet.status === "的中" ? " selected" : ""}>的中</option>
          <option value="不的中"${bet.status === "不的中" ? " selected" : ""}>不的中</option>
        </select>
      </td>
      <td class="number-cell">
        <input
          type="number"
          class="payout-input"
          data-id="${bet.id}"
          min="0"
          step="10"
          value="${payout}"
          ${bet.status === "的中" ? "" : "disabled"}
          aria-label="払戻金"
        >
      </td>
      <td class="number-cell ${profitClass}">${formatSignedYen(profit)}円</td>
      <td class="tag-cell">${escapeHtml(tagsText || "なし")}</td>
      <td class="memo-cell">${escapeHtml(bet.memo || "")}</td>
      <td>${escapeHtml(formatDateTime(bet.updatedAt || bet.createdAt) || "")}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="edit-button" data-id="${bet.id}">編集</button>
          <button type="button" class="duplicate-button" data-id="${bet.id}">複製</button>
          <button type="button" class="delete-button" data-id="${bet.id}">削除</button>
        </div>
      </td>
    </tr>
  `;
}

function createBetMobileList(targetBets) {
  const wrapper = document.createElement("div");
  wrapper.className = "bet-mobile-list";
  wrapper.setAttribute("aria-label", "購入記録スマホ表示");
  wrapper.innerHTML = targetBets.map(createBetMobileItemHtml).join("");

  return wrapper;
}

function createBetMobileItemHtml(bet) {
  const amount = Number(bet.amount) || 0;
  const payout = Number(bet.payout) || 0;
  const profit = payout - amount;
  const profitClass = profit >= 0 ? "plus" : "minus";
  const tagsText = Array.isArray(bet.tags) && bet.tags.length > 0 ? bet.tags.join(", ") : "なし";
  const titleParts = [
    bet.date || "",
    ((bet.place || "") + (bet.race || "")).trim(),
    bet.ticketType || "",
    normalizePurchaseMode(bet.purchaseMode)
  ].filter(function (part) {
    return part !== "";
  });

  return `
    <article class="bet-mobile-item">
      <h3>${escapeHtml(titleParts.join("　") || "購入記録")}</h3>
      <dl class="bet-mobile-details">
        <div class="bet-mobile-full"><dt>買い目</dt><dd>${escapeHtml(bet.betNumbers || "未入力")}</dd></div>
        <div><dt>金額</dt><dd>${formatYen(amount)}円</dd></div>
        <div><dt>結果</dt><dd>
          <select class="status-select status-${getStatusClassName(bet.status)}" data-id="${bet.id}" aria-label="結果ステータス">
            <option value="未確定"${bet.status === "未確定" ? " selected" : ""}>未確定</option>
            <option value="的中"${bet.status === "的中" ? " selected" : ""}>的中</option>
            <option value="不的中"${bet.status === "不的中" ? " selected" : ""}>不的中</option>
          </select>
        </dd></div>
        <div><dt>払戻</dt><dd>
          <input
            type="number"
            class="payout-input"
            data-id="${bet.id}"
            min="0"
            step="10"
            value="${payout}"
            ${bet.status === "的中" ? "" : "disabled"}
            aria-label="払戻金"
          >
        </dd></div>
        <div><dt>収支</dt><dd class="${profitClass}">${formatSignedYen(profit)}円</dd></div>
        <div class="bet-mobile-full"><dt>タグ</dt><dd>${escapeHtml(tagsText)}</dd></div>
        <div class="bet-mobile-full"><dt>メモ</dt><dd>${escapeHtml(bet.memo || "なし")}</dd></div>
      </dl>
      <div class="bet-mobile-actions">
        <button type="button" class="edit-button" data-id="${bet.id}">編集</button>
        <button type="button" class="duplicate-button" data-id="${bet.id}">複製</button>
        <button type="button" class="delete-button" data-id="${bet.id}">削除</button>
      </div>
    </article>
  `;
}

function updateBetSort(key) {
  if (!key) {
    return;
  }

  if (betSortState.key === key) {
    betSortState.direction = betSortState.direction === "asc" ? "desc" : "asc";
  } else {
    betSortState.key = key;
    betSortState.direction = key === "date" ? "desc" : "asc";
  }

  renderBets();
}

function normalizeBet(bet) {
  bet = bet || {};

  // v1の保存データにはstatus/payoutがないため、ここでv2の形にそろえます。
  const status = bet.status || bet.result || "未確定";
  const date = bet.date || "";
  const place = bet.place || bet.track || "";
  const race = normalizeRaceNumber(bet.race) || bet.race || "";
  const ticketType = normalizeTicketType(bet.ticketType || bet.betType);
  const betNumbers = normalizeCombinationForTicketType(ticketType, bet.betNumbers || bet.combination || "");

  return {
    id: bet.id,
    raceId: normalizeRaceId(bet.raceId) || createRaceId(date, place, race),
    date: date,
    place: place,
    race: race,
    ticketType: ticketType,
    betNumbers: betNumbers,
    amount: Number(bet.amount) || 0,
    status: normalizeStatus(status),
    payout: Number(bet.payout) || 0,
    memo: bet.memo || "",
    tags: normalizeTags(bet.tags),
    purchaseMode: normalizePurchaseMode(bet.purchaseMode),
    generatedGroupId: String(bet.generatedGroupId || ""),
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

function normalizeTicketType(ticketType) {
  if (TICKET_TYPES.includes(ticketType)) {
    return ticketType;
  }

  return String(ticketType || "").trim();
}

function normalizePurchaseMode(purchaseMode) {
  if (PURCHASE_MODES.includes(purchaseMode)) {
    return purchaseMode;
  }

  return "通常";
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
  ensureSelectHasOption(ticketTypeInput, bet.ticketType);
  placeInput.value = bet.place || "";
  raceInput.value = normalizeRaceNumber(bet.race);
  ticketTypeInput.value = bet.ticketType || "";
  setSelectedPurchaseMode("通常");
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

  const projectedBalance = calculateProjectedBalance({
    amount: sourceBet.amount,
    payout: 0
  }, null);

  if (projectedBalance < 0) {
    showSimulationMessage("現在残高が不足しているため複製できません。保存すると残高が" + formatYen(Math.abs(projectedBalance)) + "円不足します。", true);
    return;
  }

  const nowText = new Date().toISOString();
  const copiedBet = Object.assign({}, normalizeBet(sourceBet), {
    id: createUniqueId(createUsedIdSet(bets)),
    race: normalizeRaceNumber(sourceBet.race) || sourceBet.race,
    status: "未確定",
    payout: 0,
    generatedGroupId: sourceBet.generatedGroupId ? createGeneratedGroupId() : "",
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
  updateSimulationSummary();
}

function renderHorseNumberInputs() {
  const ticketType = ticketTypeInput.value;
  const purchaseMode = getSelectedPurchaseMode();
  const labels = purchaseMode === "通常" ? (TICKET_TYPE_FIELDS[ticketType] || []) : [];

  horseNumberFields.className = "horse-number-fields";
  horseNumberFields.innerHTML = "";
  betNumbersInput.value = "";
  clearBetNumbersError();
  purchaseModeNote.textContent = "";

  if (!ticketType) {
    const message = document.createElement("p");
    message.className = "horse-number-placeholder";
    message.textContent = "券種を選ぶと必要な馬番入力欄が表示されます。";
    horseNumberFields.appendChild(message);
    updateGeneratedPreview();
    return;
  }

  if (purchaseMode === "通常") {
    labels.forEach(function (labelText, index) {
      horseNumberFields.appendChild(createSingleHorseInput(labelText, "normal-" + index));
    });
  } else if (purchaseMode === "ながし") {
    horseNumberFields.classList.add("horse-selection-groups", "horse-selection-groups-flow");
    renderFlowInputs(ticketType);
  } else if (purchaseMode === "ボックス") {
    horseNumberFields.classList.add("horse-selection-groups", "horse-selection-groups-box");
    horseNumberFields.appendChild(createHorseChoiceGroup("選択馬", "box", true));
  } else if (purchaseMode === "フォーメーション") {
    horseNumberFields.classList.add("horse-selection-groups", "horse-selection-groups-formation");
    renderFormationInputs(ticketType);
  }

  updateGeneratedPreview();
}

function createSingleHorseInput(labelText, name) {
  const label = document.createElement("label");
  const input = document.createElement("input");

  input.type = "text";
  input.className = "horse-number-input";
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.setAttribute("list", "horse-number-options");
  input.setAttribute("aria-label", labelText + "の馬番");
  input.dataset.name = name;
  input.placeholder = "1〜18";

  label.textContent = labelText;
  label.appendChild(input);
  return label;
}

function renderFlowInputs(ticketType) {
  if (ticketType === "単勝" || ticketType === "複勝") {
    purchaseModeNote.textContent = "単勝・複勝はながし不要のため、通常入力を使用してください。";
    horseNumberFields.appendChild(createSingleHorseInput("馬番", "normal-0"));
    return;
  }

  if (ticketType === "三連単") {
    purchaseModeNote.textContent = "三連単はフォーメーションを使用してください。";
    horseNumberFields.appendChild(createMessageBlock("三連単ながしは今回未実装です。買い方をフォーメーションに切り替えてください。"));
    return;
  }

  if (ticketType === "馬単") {
    horseNumberFields.appendChild(createFlowTypeOptions([
      { value: "first", label: "軸1着ながし" },
      { value: "second", label: "軸2着ながし" }
    ]));
  } else if (ticketType === "三連複") {
    horseNumberFields.appendChild(createFlowTypeOptions([
      { value: "one", label: "軸1頭ながし" },
      { value: "two", label: "軸2頭ながし" }
    ]));
  }

  horseNumberFields.appendChild(createHorseChoiceGroup(ticketType === "三連複" ? "軸馬" : "軸馬", "axis", ticketType === "三連複"));
  horseNumberFields.appendChild(createHorseChoiceGroup("相手馬", "opponent", true));
}

function renderFormationInputs(ticketType) {
  if (ticketType === "単勝" || ticketType === "複勝") {
    purchaseModeNote.textContent = "単勝・複勝は通常またはボックスを使用してください。";
    horseNumberFields.appendChild(createMessageBlock("単勝・複勝ではフォーメーション入力は不要です。"));
    return;
  }

  const labelsByTicketType = {
    "ワイド": ["1列目", "2列目"],
    "馬連": ["1列目", "2列目"],
    "馬単": ["1着候補", "2着候補"],
    "三連複": ["1列目", "2列目", "3列目"],
    "三連単": ["1着候補", "2着候補", "3着候補"]
  };
  const labels = labelsByTicketType[ticketType] || [];

  labels.forEach(function (labelText, index) {
    horseNumberFields.appendChild(createHorseChoiceGroup(labelText, "formation-" + index, true));
  });
}

function createFlowTypeOptions(options) {
  const wrapper = document.createElement("fieldset");
  const legend = document.createElement("legend");
  const row = document.createElement("div");

  wrapper.className = "horse-choice-group flow-type-group";
  legend.textContent = "ながし方式";
  row.className = "segment-options flow-option-row";

  options.forEach(function (option, index) {
    const label = document.createElement("label");
    const input = document.createElement("input");

    input.type = "radio";
    input.name = "flow-type";
    input.value = option.value;
    input.className = "flow-type-input";
    input.checked = index === 0;
    label.appendChild(input);
    label.appendChild(document.createTextNode(option.label));
    row.appendChild(label);
  });

  wrapper.appendChild(legend);
  wrapper.appendChild(row);
  return wrapper;
}

function createHorseChoiceGroup(title, name, multiple) {
  const wrapper = document.createElement("fieldset");
  const legend = document.createElement("legend");
  const grid = document.createElement("div");

  wrapper.className = "horse-choice-group";
  wrapper.dataset.group = name;
  legend.className = "horse-choice-title";
  legend.textContent = title;
  grid.className = "horse-choice-grid";

  HORSE_NUMBERS.forEach(function (numberText) {
    const label = document.createElement("label");
    const input = document.createElement("input");

    input.type = multiple ? "checkbox" : "radio";
    input.name = name;
    input.value = numberText;
    input.className = "horse-choice-input";
    input.dataset.group = name;
    label.appendChild(input);
    label.appendChild(document.createTextNode(numberText));
    grid.appendChild(label);
  });

  wrapper.appendChild(legend);
  wrapper.appendChild(grid);
  return wrapper;
}

function createMessageBlock(messageText) {
  const message = document.createElement("p");
  message.className = "horse-number-placeholder";
  message.textContent = messageText;
  return message;
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

function validateAndBuildCombinations() {
  const ticketType = ticketTypeInput.value;
  const purchaseMode = getSelectedPurchaseMode();
  let combinations = [];

  clearBetNumbersError();

  if (!ticketType) {
    ticketTypeInput.setCustomValidity("券種を選択してください。");
    ticketTypeInput.reportValidity();
    return [];
  }

  if (purchaseMode === "通常" || (purchaseMode === "ながし" && (ticketType === "単勝" || ticketType === "複勝"))) {
    const combination = validateAndBuildCombination();
    return combination === "" ? [] : [combination];
  }

  if (purchaseMode === "ながし" && ticketType === "三連単") {
    betNumbersError.textContent = "三連単はフォーメーションを使用してください。";
    return [];
  }

  if (purchaseMode === "ボックス") {
    combinations = buildBoxCombinations(ticketType);
  } else if (purchaseMode === "ながし") {
    combinations = buildFlowCombinations(ticketType);
  } else if (purchaseMode === "フォーメーション") {
    combinations = buildFormationCombinations(ticketType);
  }

  if (combinations.length === 0) {
    const message = "生成できる買い目がありません。馬番の選択数と重複を確認してください。";
    betNumbersError.textContent = message;
    return [];
  }

  combinations = uniqueCombinations(combinations, ticketType);
  betNumbersInput.value = combinations.join(", ");
  return combinations;
}

function buildBoxCombinations(ticketType) {
  const selected = getSelectedHorseNumbers("box");

  if (ticketType === "単勝" || ticketType === "複勝") {
    return selected;
  }

  if (ticketType === "ワイド" || ticketType === "馬連") {
    return combinationsOf(selected, 2).map(joinOrderless);
  }

  if (ticketType === "馬単") {
    return permutationsOf(selected, 2).map(joinOrdered);
  }

  if (ticketType === "三連複") {
    return combinationsOf(selected, 3).map(joinOrderless);
  }

  if (ticketType === "三連単") {
    return permutationsOf(selected, 3).map(joinOrdered);
  }

  return [];
}

function buildFlowCombinations(ticketType) {
  const axis = getSelectedHorseNumbers("axis");
  const opponents = getSelectedHorseNumbers("opponent");
  const flowType = getSelectedFlowType();

  if (ticketType === "ワイド" || ticketType === "馬連") {
    if (axis.length !== 1 || opponents.length < 1) {
      return [];
    }

    return opponents.filter(function (opponent) {
      return opponent !== axis[0];
    }).map(function (opponent) {
      return joinOrderless([axis[0], opponent]);
    });
  }

  if (ticketType === "馬単") {
    if (axis.length !== 1 || opponents.length < 1) {
      return [];
    }

    return opponents.filter(function (opponent) {
      return opponent !== axis[0];
    }).map(function (opponent) {
      return flowType === "second" ? joinOrdered([opponent, axis[0]]) : joinOrdered([axis[0], opponent]);
    });
  }

  if (ticketType === "三連複" && flowType === "two") {
    if (axis.length !== 2 || opponents.length < 1) {
      return [];
    }

    return opponents.filter(function (opponent) {
      return !axis.includes(opponent);
    }).map(function (opponent) {
      return joinOrderless(axis.concat([opponent]));
    });
  }

  if (ticketType === "三連複") {
    if (axis.length !== 1 || opponents.length < 2) {
      return [];
    }

    return combinationsOf(opponents.filter(function (opponent) {
      return opponent !== axis[0];
    }), 2).map(function (opponentPair) {
      return joinOrderless(axis.concat(opponentPair));
    });
  }

  return [];
}

function buildFormationCombinations(ticketType) {
  const first = getSelectedHorseNumbers("formation-0");
  const second = getSelectedHorseNumbers("formation-1");
  const third = getSelectedHorseNumbers("formation-2");
  const combinations = [];

  if (ticketType === "ワイド" || ticketType === "馬連") {
    first.forEach(function (firstNumber) {
      second.forEach(function (secondNumber) {
        if (firstNumber !== secondNumber) {
          combinations.push(joinOrderless([firstNumber, secondNumber]));
        }
      });
    });
    return combinations;
  }

  if (ticketType === "馬単") {
    first.forEach(function (firstNumber) {
      second.forEach(function (secondNumber) {
        if (firstNumber !== secondNumber) {
          combinations.push(joinOrdered([firstNumber, secondNumber]));
        }
      });
    });
    return combinations;
  }

  if (ticketType === "三連複") {
    first.forEach(function (firstNumber) {
      second.forEach(function (secondNumber) {
        third.forEach(function (thirdNumber) {
          if (hasUniqueNumbers([firstNumber, secondNumber, thirdNumber])) {
            combinations.push(joinOrderless([firstNumber, secondNumber, thirdNumber]));
          }
        });
      });
    });
    return combinations;
  }

  if (ticketType === "三連単") {
    first.forEach(function (firstNumber) {
      second.forEach(function (secondNumber) {
        third.forEach(function (thirdNumber) {
          if (hasUniqueNumbers([firstNumber, secondNumber, thirdNumber])) {
            combinations.push(joinOrdered([firstNumber, secondNumber, thirdNumber]));
          }
        });
      });
    });
  }

  return combinations;
}

function getSelectedHorseNumbers(groupName) {
  return Array.from(horseNumberFields.querySelectorAll('.horse-choice-input[data-group="' + groupName + '"]:checked')).map(function (input) {
    return input.value;
  }).sort(function (a, b) {
    return Number(a) - Number(b);
  });
}

function getSelectedFlowType() {
  const checked = horseNumberFields.querySelector('input[name="flow-type"]:checked');
  return checked ? checked.value : "";
}

function uniqueCombinations(combinations, ticketType) {
  const seen = {};
  const uniqueValues = [];

  combinations.forEach(function (combination) {
    const normalizedCombination = normalizeCombinationForTicketType(ticketType, combination);

    if (!seen[normalizedCombination]) {
      seen[normalizedCombination] = true;
      uniqueValues.push(normalizedCombination);
    }
  });

  return uniqueValues;
}

function combinationsOf(values, size) {
  const results = [];

  function walk(startIndex, picked) {
    if (picked.length === size) {
      results.push(picked.slice());
      return;
    }

    for (let index = startIndex; index < values.length; index += 1) {
      picked.push(values[index]);
      walk(index + 1, picked);
      picked.pop();
    }
  }

  walk(0, []);
  return results;
}

function permutationsOf(values, size) {
  const results = [];

  function walk(picked) {
    if (picked.length === size) {
      results.push(picked.slice());
      return;
    }

    values.forEach(function (value) {
      if (!picked.includes(value)) {
        picked.push(value);
        walk(picked);
        picked.pop();
      }
    });
  }

  walk([]);
  return results;
}

function joinOrderless(values) {
  return values.slice().sort(function (a, b) {
    return Number(a) - Number(b);
  }).join("-");
}

function joinOrdered(values) {
  return values.join("→");
}

function hasUniqueNumbers(values) {
  return new Set(values).size === values.length;
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

  if (input && typeof input.setCustomValidity === "function") {
    input.setCustomValidity(message);
    input.reportValidity();
    input.setCustomValidity("");
  }

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
  const date = dateInput.value;
  const place = placeInput.value.trim();
  const race = normalizeRaceNumber(raceInput.value);
  const ticketType = ticketTypeInput.value;
  const normalizedCombination = normalizeCombinationForTicketType(ticketType, combination);

  return {
    raceId: createRaceId(date, place, race),
    date: date,
    place: place,
    race: race,
    ticketType: ticketType,
    betNumbers: normalizedCombination,
    amount: Number(amountInput.value),
    status: editingBetId === null ? "未確定" : status,
    payout: editingBetId === null ? 0 : payout,
    memo: memoInput.value.trim(),
    tags: parseTags(tagsInput.value),
    purchaseMode: editingBetId === null ? getEffectivePurchaseMode(ticketType) : getEditedPurchaseMode(),
    generatedGroupId: getEditedGeneratedGroupId()
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

function getSelectedPurchaseMode() {
  const checked = purchaseModeInputs.find(function (input) {
    return input.checked;
  });

  return normalizePurchaseMode(checked ? checked.value : "通常");
}

function getEffectivePurchaseMode(ticketType) {
  const purchaseMode = getSelectedPurchaseMode();

  if ((ticketType === "単勝" || ticketType === "複勝") && purchaseMode === "ながし") {
    return "通常";
  }

  return purchaseMode;
}

function setSelectedPurchaseMode(purchaseMode) {
  const normalizedPurchaseMode = normalizePurchaseMode(purchaseMode);

  purchaseModeInputs.forEach(function (input) {
    input.checked = input.value === normalizedPurchaseMode;
  });
}

function getEditedPurchaseMode() {
  const bet = editingBetId === null ? undefined : findBet(editingBetId);
  return bet === undefined ? getSelectedPurchaseMode() : normalizePurchaseMode(bet.purchaseMode);
}

function getEditedGeneratedGroupId() {
  const bet = editingBetId === null ? undefined : findBet(editingBetId);
  return bet === undefined ? "" : String(bet.generatedGroupId || "");
}

function createGeneratedGroupId() {
  return "grp-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function confirmAmountIfNeeded() {
  const amount = Number(amountInput.value);

  if (amount >= 100 && amount % 100 === 0) {
    return true;
  }

  return window.confirm("購入金額は通常100円単位です。入力した金額のまま保存しますか？");
}

function calculateProjectedBalance(formValues, editingId) {
  const summary = calculateSimulationSummary(null);
  const nextAmount = Number(formValues.amount) || 0;
  const nextPayout = Number(formValues.payout) || 0;

  if (editingId === null) {
    return summary.currentBalance - nextAmount + nextPayout;
  }

  const currentBet = findBet(editingId);

  if (currentBet === undefined) {
    return summary.currentBalance - nextAmount + nextPayout;
  }

  return summary.currentBalance
    + (Number(currentBet.amount) || 0)
    - (Number(currentBet.payout) || 0)
    - nextAmount
    + nextPayout;
}

function updateGeneratedPreview() {
  if (generatedPreview === null) {
    return;
  }

  const ticketType = ticketTypeInput.value;
  const amountPerPoint = Number(amountInput.value) || 0;
  const combinations = previewBuildCombinations();
  const totalAmountValue = combinations.length * amountPerPoint;

  generatedCount.textContent = String(combinations.length);
  generatedTotalAmount.textContent = formatYen(totalAmountValue);
  generatedWarning.textContent = "";

  if (!ticketType || combinations.length === 0) {
    generatedPreview.innerHTML = '<p class="horse-number-placeholder">券種と馬番を選ぶと、生成される買い目が表示されます。</p>';
  } else {
    generatedPreview.innerHTML = '<table class="generated-preview-table"><thead><tr><th>No</th><th>買い目</th></tr></thead><tbody>' + combinations.map(function (combination, index) {
      return "<tr><td>" + (index + 1) + "</td><td>" + escapeHtml(combination) + "</td></tr>";
    }).join("") + "</tbody></table>";
  }

  if (combinations.length > 100) {
    generatedWarning.textContent = "生成点数が100点を超えています。登録時に確認します。";
  } else if (combinations.length > 50) {
    generatedWarning.textContent = "生成点数が50点を超えています。金額と買い目を確認してください。";
  }
}

function previewBuildCombinations() {
  const ticketType = ticketTypeInput.value;
  const purchaseMode = getSelectedPurchaseMode();

  if (!ticketType) {
    return [];
  }

  if (purchaseMode === "通常" || (purchaseMode === "ながし" && (ticketType === "単勝" || ticketType === "複勝"))) {
    const inputs = Array.from(horseNumberFields.querySelectorAll(".horse-number-input"));
    const values = inputs.map(function (input) {
      return String(input.value || "").trim();
    });

    if (values.length === 0 || values.some(function (value) {
      return !isValidHorseNumber(value);
    }) || new Set(values).size !== values.length) {
      return [];
    }

    return [normalizeCombinationForTicketType(ticketType, values.join("-"))];
  }

  if (purchaseMode === "ながし" && ticketType === "三連単") {
    return [];
  }

  let combinations = [];

  if (purchaseMode === "ながし") {
    combinations = buildFlowCombinations(ticketType);
  } else if (purchaseMode === "ボックス") {
    combinations = buildBoxCombinations(ticketType);
  } else if (purchaseMode === "フォーメーション") {
    combinations = buildFormationCombinations(ticketType);
  }

  return uniqueCombinations(combinations, ticketType);
}

function findExistingDuplicateCombinations(combinations) {
  const date = dateInput.value;
  const place = placeInput.value.trim();
  const race = normalizeRaceNumber(raceInput.value);
  const ticketType = ticketTypeInput.value;
  const duplicateMap = {};

  bets.forEach(function (bet) {
    if (bet.date !== date || bet.place !== place || normalizeRaceNumber(bet.race) !== race || bet.ticketType !== ticketType) {
      return;
    }

    duplicateMap[normalizeCombinationForTicketType(ticketType, bet.betNumbers)] = true;
  });

  return combinations.filter(function (combination) {
    return duplicateMap[normalizeCombinationForTicketType(ticketType, combination)];
  });
}

function ensurePurchaseModeAllowed() {
  const ticketType = ticketTypeInput.value;
  const purchaseMode = getSelectedPurchaseMode();

  if ((ticketType === "単勝" || ticketType === "複勝") && (purchaseMode === "ながし" || purchaseMode === "フォーメーション")) {
    setSelectedPurchaseMode("通常");
  }
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
  updateGeneratedPreview();
}

function setFormModeEdit(bet) {
  submitButton.textContent = "編集を保存";
  cancelEditButton.style.display = "inline-block";
  editOnlyFields.style.display = "grid";
  editMessage.textContent = "編集中：" + (bet.date || "") + " " + (bet.place || "") + " " + (bet.race || "");
  updateGeneratedPreview();
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

function normalizeRaceNumber(value) {
  const text = String(value || "").trim();
  const match = text.match(/(1[0-2]|[1-9])\s*R?$/i);

  if (match === null) {
    return "";
  }

  const raceNumber = Number(match[1]);

  if (!RACE_OPTIONS.includes(raceNumber + "R")) {
    return "";
  }

  return raceNumber + "R";
}

function createRaceId(date, place, race) {
  const dateCode = normalizeRaceIdDate(date);
  const trackCode = getTrackCode(place);
  const raceCode = normalizeRaceNumber(race);

  if (dateCode === "" || trackCode === "" || raceCode === "") {
    return "";
  }

  return dateCode + "-" + trackCode + "-" + raceCode;
}

function normalizeRaceId(value) {
  const text = String(value || "").trim().toUpperCase();
  const match = text.match(/^(\d{8})-([A-Z]+)-(1[0-2]|[1-9])R$/);

  if (match === null) {
    return "";
  }

  return match[1] + "-" + match[2] + "-" + Number(match[3]) + "R";
}

function normalizeRaceIdDate(date) {
  const text = String(date || "").trim();

  if (/^\d{8}$/.test(text)) {
    return text;
  }

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match === null) {
    return "";
  }

  return match[1] + match[2] + match[3];
}

function getTrackCode(place) {
  const text = String(place || "").trim();

  if (TRACK_CODES[text]) {
    return TRACK_CODES[text];
  }

  const upperText = text.toUpperCase();
  const codeValues = Object.keys(TRACK_CODES).map(function (trackName) {
    return TRACK_CODES[trackName];
  });

  if (codeValues.includes(upperText)) {
    return upperText;
  }

  return "";
}

function normalizeCombinationForTicketType(ticketType, combination) {
  const numbers = String(combination || "").match(/\d+/g) || [];

  if (numbers.length === 0) {
    return String(combination || "").trim();
  }

  const normalizedNumbers = numbers.map(function (numberText) {
    return String(Number(numberText));
  });

  if (ticketType === "単勝" || ticketType === "複勝") {
    return normalizedNumbers[0];
  }

  if (ORDERLESS_TICKET_TYPES.includes(ticketType)) {
    return normalizedNumbers.slice().sort(function (a, b) {
      return Number(a) - Number(b);
    }).join("-");
  }

  if (ticketType === "馬単" || ticketType === "三連単") {
    return normalizedNumbers.join("→");
  }

  return normalizedNumbers.join("-");
}

function createResultMatchKey(raceId, ticketType, combination) {
  return [
    normalizeRaceId(raceId),
    normalizeTicketType(ticketType),
    normalizeCombinationForTicketType(ticketType, combination)
  ].join("|");
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
      simulation: normalizeSimulationSettings(simulationSettings),
      resultImportHistory: resultImportHistory.map(normalizeResultImportHistoryItem),
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
      const importedBackup = parseBackupJson(reader.result);
      const importedBets = importedBackup.bets;
      const usedIds = createUsedIdSet(mode === "append" ? bets : []);
      const restoredBets = importedBets.map(function (bet) {
        return normalizeImportedBet(bet, usedIds);
      });

      bets = mode === "append" ? bets.concat(restoredBets) : restoredBets;
      simulationSettings = importedBackup.simulation;
      resultImportHistory = mode === "append"
        ? importedBackup.resultImportHistory.concat(resultImportHistory)
        : importedBackup.resultImportHistory;
      saveBets();
      saveSimulationSettings();
      saveResultImportHistory();
      renderBets();
      restoreFileInput.value = "";

      const actionText = mode === "append" ? "追加" : "置き換え";
      showBackupMessage(restoredBets.length + "件のデータを" + actionText + "復元し、初期資金も復元しました。", false);
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

  return {
    bets: backupBets,
    simulation: getBackupSimulationSettings(parsedBackup),
    resultImportHistory: getBackupResultImportHistory(parsedBackup)
  };
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

function getBackupSimulationSettings(parsedBackup) {
  if (parsedBackup.data && parsedBackup.data.simulation) {
    return normalizeSimulationSettings(parsedBackup.data.simulation);
  }

  if (parsedBackup.data && parsedBackup.data.initialFund !== undefined) {
    return normalizeSimulationSettings({
      initialFund: parsedBackup.data.initialFund
    });
  }

  if (parsedBackup.simulation) {
    return normalizeSimulationSettings(parsedBackup.simulation);
  }

  return createDefaultSimulationSettings();
}

function getBackupResultImportHistory(parsedBackup) {
  if (parsedBackup.data && Array.isArray(parsedBackup.data.resultImportHistory)) {
    return parsedBackup.data.resultImportHistory.map(normalizeResultImportHistoryItem);
  }

  if (Array.isArray(parsedBackup.resultImportHistory)) {
    return parsedBackup.resultImportHistory.map(normalizeResultImportHistoryItem);
  }

  return [];
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
    "raceId",
    "track",
    "race",
    "betType",
    "combination",
    "purchaseMode",
    "generatedGroupId",
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
      bet.raceId,
      bet.place,
      bet.race,
      bet.ticketType,
      bet.betNumbers,
      normalizePurchaseMode(bet.purchaseMode),
      bet.generatedGroupId || "",
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

function readResultImportFile() {
  const file = resultImportFileInput.files[0];

  if (file === undefined) {
    showResultImportMessage("結果データファイルを選択してください。", true);
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", function () {
    try {
      const importedResults = parseResultImportFile(reader.result, file.name);
      currentResultImportPreview = createResultImportPreview(importedResults, file.name);
      renderResultImportPreview(currentResultImportPreview);
      showResultImportMessage(file.name + " を読み込みました。内容を確認してから反映してください。", false);
    } catch (error) {
      currentResultImportPreview = null;
      renderResultImportPreview(null);
      showResultImportMessage(error.message, true);
    }
  });

  reader.addEventListener("error", function () {
    showResultImportMessage("結果データファイルを読み込めませんでした。", true);
  });

  reader.readAsText(file);
}

function parseResultImportFile(text, fileName) {
  const lowerFileName = String(fileName || "").toLowerCase();
  const rawRows = lowerFileName.endsWith(".csv") ? parseResultCsv(text) : parseResultJson(text);
  const results = rawRows.map(normalizeResultRow).filter(function (result) {
    return result.raceId !== "" && result.betType !== "" && result.combination !== "" && result.payout >= 0;
  });

  if (results.length === 0) {
    throw new Error("読み込める結果データがありません。raceId、betType、combination、payoutを確認してください。");
  }

  return results;
}

function parseResultJson(text) {
  let parsedJson;

  try {
    parsedJson = JSON.parse(text);
  } catch (error) {
    throw new Error("results.jsonのJSON形式が正しくありません。");
  }

  if (!Array.isArray(parsedJson)) {
    throw new Error("results.jsonは配列形式にしてください。");
  }

  return parsedJson;
}

function parseResultCsv(text) {
  const rows = parseCsvRows(String(text || "").replace(/^\uFEFF/, ""));

  if (rows.length < 2) {
    throw new Error("CSVはヘッダー行とデータ行を含めてください。");
  }

  const headers = rows[0].map(function (header) {
    return String(header || "").trim();
  });

  return rows.slice(1).filter(function (row) {
    return row.some(function (value) {
      return String(value || "").trim() !== "";
    });
  }).map(function (row) {
    const record = {};

    headers.forEach(function (header, index) {
      record[header] = row[index] || "";
    });

    return record;
  });
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  rows.push(row);
  return rows;
}

function normalizeResultRow(row) {
  const betType = normalizeTicketType(row.betType || row.ticketType || "");

  return {
    raceId: normalizeRaceId(row.raceId),
    betType: betType,
    combination: normalizeCombinationForTicketType(betType, row.combination || row.betNumbers || ""),
    payout: Number(row.payout)
  };
}

function createResultImportPreview(importedResults, fileName) {
  const resultMap = {};
  const raceIds = Array.from(new Set(importedResults.map(function (result) {
    return result.raceId;
  }))).sort();
  const resultCountsByRaceId = countResultsByRaceId(importedResults);
  const purchaseCountsByRaceId = countBetsByRaceId(bets);
  const matchedRows = [];
  const unmatchedRows = [];

  importedResults.forEach(function (result) {
    resultMap[createResultMatchKey(result.raceId, result.betType, result.combination)] = result;
  });

  bets.filter(function (bet) {
    const key = createResultMatchKey(bet.raceId, bet.ticketType, bet.betNumbers);
    return resultMap[key] !== undefined;
  }).map(function (bet) {
    const key = createResultMatchKey(bet.raceId, bet.ticketType, bet.betNumbers);
    const result = resultMap[key];
    const reflectedPayout = calculateReflectedPayout(result.payout, bet.amount);

    const currentPayout = Number(bet.payout) || 0;
    const isPending = bet.status === "未確定";
    const payoutDiff = bet.status === "的中" && currentPayout !== reflectedPayout;

    matchedRows.push({
      betId: bet.id,
      raceId: bet.raceId,
      betType: bet.ticketType,
      combination: bet.betNumbers,
      amount: Number(bet.amount) || 0,
      resultPayout: result.payout,
      reflectedPayout: reflectedPayout,
      currentStatus: bet.status,
      currentPayout: currentPayout,
      importedStatus: "的中",
      importedPayout: reflectedPayout,
      decision: isPending ? "反映予定" : "上書き注意",
      payoutDiff: payoutDiff,
      warningText: payoutDiff ? "差異あり" : ""
    });
  });

  importedResults.forEach(function (result) {
    const hasMatchedBet = bets.some(function (bet) {
      return createResultMatchKey(bet.raceId, bet.ticketType, bet.betNumbers) === createResultMatchKey(result.raceId, result.betType, result.combination);
    });

    if (!hasMatchedBet) {
      unmatchedRows.push({
        betId: "",
        raceId: result.raceId,
        betType: result.betType,
        combination: result.combination,
        amount: 0,
        resultPayout: result.payout,
        reflectedPayout: 0,
        currentStatus: "-",
        currentPayout: 0,
        importedStatus: "-",
        importedPayout: 0,
        decision: "不一致",
        payoutDiff: false,
        warningText: "購入記録なし"
      });
    }
  });

  const previewRows = matchedRows.concat(unmatchedRows).sort(function (a, b) {
    return (a.raceId + a.betType + a.combination).localeCompare(b.raceId + b.betType + b.combination);
  });
  const alreadyResultEnteredCount = matchedRows.filter(function (row) {
    return row.currentStatus !== "未確定";
  }).length;
  const overwriteWarningCount = matchedRows.filter(function (row) {
    return row.decision === "上書き注意";
  }).length;
  const payoutDiffWarningCount = matchedRows.filter(function (row) {
    return row.payoutDiff;
  }).length;
  const appliedCandidateCount = matchedRows.filter(function (row) {
    return row.decision === "反映予定";
  }).length;
  const skippedCount = unmatchedRows.length + overwriteWarningCount;

  return {
    fileName: fileName,
    importedResults: importedResults,
    resultCount: importedResults.length,
    matchedBets: matchedRows,
    previewRows: previewRows,
    matchedCount: matchedRows.length,
    hitPlannedCount: appliedCandidateCount,
    unmatchedCount: unmatchedRows.length,
    skippedCount: skippedCount,
    alreadyResultEnteredCount: alreadyResultEnteredCount,
    overwriteWarningCount: overwriteWarningCount,
    payoutDiffWarningCount: payoutDiffWarningCount,
    appliedCandidateCount: appliedCandidateCount,
    raceIds: raceIds,
    resultCountsByRaceId: resultCountsByRaceId,
    purchaseCountsByRaceId: purchaseCountsByRaceId,
    markLostPreview: createMarkLostPreview(importedResults, raceIds)
  };
}

function countResultsByRaceId(importedResults) {
  return importedResults.reduce(function (counts, result) {
    counts[result.raceId] = (counts[result.raceId] || 0) + 1;
    return counts;
  }, {});
}

function countBetsByRaceId(targetBets) {
  return targetBets.reduce(function (counts, bet) {
    const raceId = normalizeRaceId(bet.raceId);

    if (raceId !== "") {
      counts[raceId] = (counts[raceId] || 0) + 1;
    }

    return counts;
  }, {});
}

function createMarkLostPreview(importedResults, raceIds) {
  const resultKeys = {};
  const raceIdSet = new Set(raceIds);
  const summary = {
    raceIds: raceIds,
    pendingCount: 0,
    changeCount: 0,
    hitCount: 0,
    lostCount: 0
  };

  importedResults.forEach(function (result) {
    resultKeys[createResultMatchKey(result.raceId, result.betType, result.combination)] = true;
  });

  bets.forEach(function (bet) {
    const key = createResultMatchKey(bet.raceId, bet.ticketType, bet.betNumbers);

    if (!raceIdSet.has(bet.raceId)) {
      return;
    }

    if (bet.status === "未確定") {
      summary.pendingCount += 1;

      if (!resultKeys[key]) {
        summary.changeCount += 1;
      }
    } else if (bet.status === "的中") {
      summary.hitCount += 1;
    } else if (bet.status === "不的中") {
      summary.lostCount += 1;
    }
  });

  return summary;
}

function calculateReflectedPayout(resultPayout, amount) {
  return Math.round((Number(resultPayout) || 0) * ((Number(amount) || 0) / 100));
}

function renderResultImportPreview(preview) {
  const overwriteEnabled = overwriteResultImportInput.checked;
  const applyTargetCount = preview === null ? 0 : getResultImportApplyRows(preview, overwriteEnabled).length;

  applyResultImportButton.disabled = preview === null || applyTargetCount === 0;
  markRaceMissButton.disabled = preview === null || preview.raceIds.length === 0;

  if (preview === null) {
    resultImportPreview.innerHTML = '<p class="import-empty">結果データを読み込むと、ここにプレビューが表示されます。</p>';
    return;
  }

  const raceIdsHtml = preview.raceIds.map(function (raceId) {
    return '<span class="tag-chip">' + escapeHtml(raceId) + "</span>";
  }).join("");
  const raceSummaryRowsHtml = preview.raceIds.map(function (raceId) {
    const resultCount = preview.resultCountsByRaceId[raceId] || 0;
    const purchaseCount = preview.purchaseCountsByRaceId[raceId] || 0;
    const className = purchaseCount > 0 ? "import-row-apply" : "import-row-skip";

    return `
      <tr class="${className}">
        <td>${escapeHtml(raceId)}</td>
        <td class="number-cell">${resultCount}件</td>
        <td class="number-cell">${purchaseCount}件</td>
        <td>${purchaseCount > 0 ? "購入記録あり" : "購入記録なし"}</td>
      </tr>
    `;
  }).join("");
  const detailRowsHtml = preview.previewRows.length === 0
    ? '<tr><td colspan="9" class="empty-table-cell">表示できる明細はありません。</td></tr>'
    : preview.previewRows.map(function (row) {
        const rowClass = getImportDecisionClassName(row.decision, row.payoutDiff);
        const decisionText = row.warningText ? row.decision + "（" + row.warningText + "）" : row.decision;

        return `
          <tr class="${rowClass}">
            <td>${escapeHtml(row.raceId)}</td>
            <td>${escapeHtml(row.betType)}</td>
            <td>${escapeHtml(row.combination)}</td>
            <td>${escapeHtml(row.currentStatus)}</td>
            <td class="number-cell">${row.currentStatus === "-" ? "-" : formatYen(row.currentPayout) + "円"}</td>
            <td>${escapeHtml(row.importedStatus)}</td>
            <td class="number-cell">${row.importedStatus === "-" ? "-" : formatYen(row.importedPayout) + "円"}</td>
            <td class="number-cell">${formatYen(row.resultPayout)}円</td>
            <td>${escapeHtml(decisionText)}</td>
          </tr>
        `;
      }).join("");
  const detailMobileHtml = preview.previewRows.length === 0
    ? '<p class="analysis-mobile-empty">表示できる明細はありません。</p>'
    : preview.previewRows.map(function (row) {
        const rowClass = getImportDecisionClassName(row.decision, row.payoutDiff);
        const decisionText = row.warningText ? row.decision + "（" + row.warningText + "）" : row.decision;

        return `
          <article class="analysis-mobile-item ${rowClass}">
            <h4>${escapeHtml(row.raceId)}</h4>
            <dl>
              <div><dt>券種</dt><dd>${escapeHtml(row.betType)}</dd></div>
              <div><dt>買い目</dt><dd>${escapeHtml(row.combination)}</dd></div>
              <div><dt>現在結果</dt><dd>${escapeHtml(row.currentStatus)}</dd></div>
              <div><dt>現在払戻</dt><dd>${row.currentStatus === "-" ? "-" : formatYen(row.currentPayout) + "円"}</dd></div>
              <div><dt>取込後結果</dt><dd>${escapeHtml(row.importedStatus)}</dd></div>
              <div><dt>取込後払戻</dt><dd>${row.importedStatus === "-" ? "-" : formatYen(row.importedPayout) + "円"}</dd></div>
              <div><dt>判定</dt><dd>${escapeHtml(decisionText)}</dd></div>
            </dl>
          </article>
        `;
      }).join("");
  const markLost = preview.markLostPreview;

  resultImportPreview.innerHTML = `
    <div class="import-preview-grid">
      <div><span>ファイル名</span><strong>${escapeHtml(preview.fileName)}</strong></div>
      <div><span>JSON内の結果データ</span><strong>${preview.resultCount}件</strong></div>
      <div><span>購入記録と一致</span><strong>${preview.matchedCount}件</strong></div>
      <div><span>的中予定</span><strong>${preview.hitPlannedCount}件</strong></div>
      <div><span>反映対象外</span><strong>${preview.skippedCount}件</strong></div>
      <div><span>結果入力済み</span><strong>${preview.alreadyResultEnteredCount}件</strong></div>
      <div><span>上書き注意</span><strong>${preview.overwriteWarningCount}件</strong></div>
      <div><span>払戻差異警告</span><strong>${preview.payoutDiffWarningCount}件</strong></div>
    </div>
    <div class="import-race-list" aria-label="対象raceId一覧">${raceIdsHtml}</div>
    <div class="table-scroll">
      <table class="analysis-table result-import-race-table">
        <thead>
          <tr>
            <th>raceId</th>
            <th>結果データ</th>
            <th>購入記録</th>
            <th>状態</th>
          </tr>
        </thead>
        <tbody>${raceSummaryRowsHtml}</tbody>
      </table>
    </div>
    <div class="table-scroll">
      <table class="analysis-table result-import-table">
        <thead>
          <tr>
            <th>raceId</th>
            <th>券種</th>
            <th>買い目</th>
            <th>現在ステータス</th>
            <th>現在払戻</th>
            <th>取込後ステータス</th>
            <th>取込後払戻</th>
            <th>100円払戻</th>
            <th>判定</th>
          </tr>
        </thead>
        <tbody>${detailRowsHtml}</tbody>
      </table>
    </div>
    <div class="analysis-mobile-list result-import-mobile-list">${detailMobileHtml}</div>
    <div class="import-mark-lost-preview">
      <h3>不的中一括反映プレビュー</h3>
      <div class="import-preview-grid">
        <div><span>対象raceId</span><strong>${markLost.raceIds.length}件</strong></div>
        <div><span>未確定</span><strong>${markLost.pendingCount}件</strong></div>
        <div><span>不的中に変更</span><strong>${markLost.changeCount}件</strong></div>
        <div><span>すでに的中</span><strong>${markLost.hitCount}件</strong></div>
        <div><span>すでに不的中</span><strong>${markLost.lostCount}件</strong></div>
      </div>
    </div>
  `;
}

function getImportDecisionClassName(decision, payoutDiff) {
  if (payoutDiff) {
    return "import-row-danger";
  }

  if (decision === "反映予定") {
    return "import-row-apply";
  }

  if (decision === "上書き注意") {
    return "import-row-warning";
  }

  return "import-row-skip";
}

function applyResultImport() {
  if (currentResultImportPreview === null) {
    showResultImportMessage("先に結果データを読み込んでください。", true);
    return;
  }

  const overwriteEnabled = overwriteResultImportInput.checked;
  const applyRows = getResultImportApplyRows(currentResultImportPreview, overwriteEnabled);

  if (applyRows.length === 0) {
    showResultImportMessage("反映対象がありません。結果入力済みを反映する場合は上書きチェックを入れてください。", true);
    return;
  }

  if (overwriteEnabled) {
    const overwrittenCount = applyRows.filter(function (row) {
      return row.currentStatus !== "未確定";
    }).length;

    if (overwrittenCount > 0 && !window.confirm("結果入力済みの購入記録" + overwrittenCount + "件を上書きします。実行しますか？")) {
      return;
    }
  }

  const message = overwriteEnabled
    ? applyRows.length + "件の結果を反映します。実行前スナップショットを保存して続行しますか？"
    : applyRows.length + "件の未確定購入記録に結果を反映します。実行前スナップショットを保存して続行しますか？";

  if (!window.confirm(message)) {
    return;
  }

  saveLastImportSnapshot({
    reason: "result-import",
    fileName: currentResultImportPreview.fileName,
    raceIds: currentResultImportPreview.raceIds
  });

  const nowText = new Date().toISOString();
  let appliedCount = 0;
  let overwrittenCount = 0;

  applyRows.forEach(function (matchedBet) {
    const bet = findBet(matchedBet.betId);

    if (bet === undefined) {
      return;
    }

    if (bet.status !== "未確定") {
      overwrittenCount += 1;
    }

    bet.status = "的中";
    bet.payout = matchedBet.reflectedPayout;
    bet.updatedAt = nowText;
    appliedCount += 1;
  });

  addResultImportHistory(currentResultImportPreview, {
    appliedCount: appliedCount,
    overwrittenCount: overwrittenCount,
    unmatchedMarkedLostCount: 0,
    action: "result-import",
    snapshotCreated: true
  });
  saveBets();
  saveResultImportHistory();
  currentResultImportPreview = createResultImportPreview(currentResultImportPreview.importedResults, currentResultImportPreview.fileName);
  overwriteResultImportInput.checked = false;
  renderBets();
  renderResultImportPreview(currentResultImportPreview);
  showResultImportMessage(appliedCount + "件の結果を反映しました。", false);
}

function getResultImportApplyRows(preview, overwriteEnabled) {
  return preview.matchedBets.filter(function (row) {
    if (row.currentStatus === "未確定") {
      return true;
    }

    return overwriteEnabled;
  });
}

function markPendingBetsAsMissForImportedRaces() {
  if (currentResultImportPreview === null) {
    showResultImportMessage("先に結果データを読み込んでください。", true);
    return;
  }

  const markLost = currentResultImportPreview.markLostPreview;
  const confirmMessage = [
    "対象raceIdの未確定購入記録を、結果データと一致しないものだけ不的中にします。",
    "対象raceId：" + markLost.raceIds.join(", "),
    "未確定：" + markLost.pendingCount + "件",
    "不的中に変更：" + markLost.changeCount + "件",
    "すでに的中：" + markLost.hitCount + "件",
    "すでに不的中：" + markLost.lostCount + "件",
    "実行前スナップショットを保存して続行しますか？"
  ].join("\n");

  if (!window.confirm(confirmMessage)) {
    return;
  }

  saveLastImportSnapshot({
    reason: "mark-unmatched-lost",
    fileName: currentResultImportPreview.fileName,
    raceIds: currentResultImportPreview.raceIds
  });

  const resultKeys = {};
  const raceIdSet = new Set(currentResultImportPreview.raceIds);
  let changedCount = 0;
  const nowText = new Date().toISOString();

  currentResultImportPreview.importedResults.forEach(function (result) {
    resultKeys[createResultMatchKey(result.raceId, result.betType, result.combination)] = true;
  });

  bets.forEach(function (bet) {
    const key = createResultMatchKey(bet.raceId, bet.ticketType, bet.betNumbers);

    if (!raceIdSet.has(bet.raceId) || bet.status !== "未確定" || resultKeys[key]) {
      return;
    }

    bet.status = "不的中";
    bet.payout = 0;
    bet.updatedAt = nowText;
    changedCount += 1;
  });

  saveBets();
  addResultImportHistory(currentResultImportPreview, {
    appliedCount: 0,
    overwrittenCount: 0,
    unmatchedMarkedLostCount: changedCount,
    action: "mark-unmatched-lost",
    snapshotCreated: true
  });
  saveResultImportHistory();
  renderBets();
  currentResultImportPreview = createResultImportPreview(currentResultImportPreview.importedResults, currentResultImportPreview.fileName);
  renderResultImportPreview(currentResultImportPreview);
  showResultImportMessage(changedCount + "件の未確定購入記録を不的中にしました。", false);
}

function addResultImportHistory(preview, summary) {
  summary = summary || {};

  resultImportHistory.unshift({
    importId: createImportId(),
    importedAt: new Date().toISOString(),
    fileName: preview.fileName,
    raceIds: preview.raceIds,
    resultCount: preview.resultCount,
    matchedCount: preview.matchedCount,
    appliedCount: Number(summary.appliedCount) || 0,
    skippedCount: preview.skippedCount,
    overwriteWarningCount: preview.overwriteWarningCount,
    overwrittenCount: Number(summary.overwrittenCount) || 0,
    unmatchedMarkedLostCount: Number(summary.unmatchedMarkedLostCount) || 0,
    snapshotCreated: summary.snapshotCreated === true,
    action: summary.action || "result-import"
  });

  resultImportHistory = resultImportHistory.slice(0, 20);
}

function createImportId() {
  return "imp-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function normalizeResultImportHistoryItem(historyItem) {
  historyItem = historyItem || {};

  return {
    importId: historyItem.importId || "",
    importedAt: historyItem.importedAt || "",
    fileName: historyItem.fileName || "",
    raceIds: Array.isArray(historyItem.raceIds) ? historyItem.raceIds.map(normalizeRaceId).filter(function (raceId) {
      return raceId !== "";
    }) : [],
    resultCount: Number(historyItem.resultCount) || 0,
    matchedCount: Number(historyItem.matchedCount) || 0,
    appliedCount: Number(historyItem.appliedCount) || 0,
    skippedCount: Number(historyItem.skippedCount) || 0,
    overwriteWarningCount: Number(historyItem.overwriteWarningCount) || 0,
    overwrittenCount: Number(historyItem.overwrittenCount) || 0,
    unmatchedMarkedLostCount: Number(historyItem.unmatchedMarkedLostCount) || 0,
    snapshotCreated: historyItem.snapshotCreated === true,
    action: historyItem.action || "result-import"
  };
}

function renderResultImportHistory() {
  if (resultImportHistory.length === 0) {
    resultImportHistoryList.innerHTML = '<p class="import-empty">取り込み履歴はまだありません。</p>';
    return;
  }

  resultImportHistoryList.innerHTML = resultImportHistory.slice(0, 5).map(function (historyItem) {
    return `
      <article class="import-history-item">
        <h3>${escapeHtml(formatDateTime(historyItem.importedAt) || "日時不明")}</h3>
        <p>${escapeHtml(historyItem.fileName || "ファイル名なし")}</p>
        <dl>
          <div><dt>結果</dt><dd>${historyItem.resultCount}件</dd></div>
          <div><dt>照合</dt><dd>${historyItem.matchedCount}件</dd></div>
          <div><dt>反映</dt><dd>${historyItem.appliedCount}件</dd></div>
          <div><dt>対象外</dt><dd>${historyItem.skippedCount}件</dd></div>
          <div><dt>上書き注意</dt><dd>${historyItem.overwriteWarningCount}件</dd></div>
          <div><dt>上書き</dt><dd>${historyItem.overwrittenCount}件</dd></div>
          <div><dt>不的中一括</dt><dd>${historyItem.unmatchedMarkedLostCount}件</dd></div>
          <div><dt>スナップショット</dt><dd>${historyItem.snapshotCreated ? "あり" : "なし"}</dd></div>
          <div><dt>種別</dt><dd>${escapeHtml(getImportHistoryActionLabel(historyItem.action))}</dd></div>
        </dl>
        <p class="history-race-ids">${escapeHtml(historyItem.raceIds.join(", ") || "raceIdなし")}</p>
      </article>
    `;
  }).join("");
}

function getImportHistoryActionLabel(action) {
  if (action === "mark-unmatched-lost") {
    return "不的中一括";
  }

  if (action === "undo") {
    return "取り消し済み";
  }

  return "結果取込";
}

function saveLastImportSnapshot(options) {
  const snapshot = {
    createdAt: new Date().toISOString(),
    reason: options.reason,
    fileName: options.fileName || "",
    raceIds: Array.isArray(options.raceIds) ? options.raceIds : [],
    data: {
      bets: bets.map(function (bet) {
        return normalizeBet(bet);
      }),
      simulation: normalizeSimulationSettings(simulationSettings),
      resultImportHistory: resultImportHistory.map(normalizeResultImportHistoryItem)
    }
  };

  localStorage.setItem(LAST_IMPORT_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  updateUndoResultImportState();
}

function loadLastImportSnapshot() {
  const savedSnapshot = localStorage.getItem(LAST_IMPORT_SNAPSHOT_STORAGE_KEY);

  if (savedSnapshot === null) {
    return null;
  }

  try {
    const snapshot = JSON.parse(savedSnapshot);

    if (snapshot === null || typeof snapshot !== "object" || !snapshot.data || !Array.isArray(snapshot.data.bets)) {
      return null;
    }

    return {
      createdAt: snapshot.createdAt || "",
      reason: snapshot.reason || "",
      fileName: snapshot.fileName || "",
      raceIds: Array.isArray(snapshot.raceIds) ? snapshot.raceIds.map(normalizeRaceId).filter(function (raceId) {
        return raceId !== "";
      }) : [],
      data: {
        bets: snapshot.data.bets,
        simulation: normalizeSimulationSettings(snapshot.data.simulation),
        resultImportHistory: Array.isArray(snapshot.data.resultImportHistory)
          ? snapshot.data.resultImportHistory.map(normalizeResultImportHistoryItem)
          : []
      }
    };
  } catch (error) {
    return null;
  }
}

function updateUndoResultImportState() {
  const snapshot = loadLastImportSnapshot();
  const hasSnapshot = snapshot !== null;

  undoResultImportButton.disabled = !hasSnapshot;
  undoResultImportStatus.textContent = hasSnapshot
    ? "取り消し可能：" + formatDateTime(snapshot.createdAt) + " " + (snapshot.fileName || "")
    : "取り消し可能な取込がありません。";
}

function undoLastResultImport() {
  const snapshot = loadLastImportSnapshot();

  if (snapshot === null) {
    showResultImportMessage("取り消し可能な取込がありません。", true);
    updateUndoResultImportState();
    return;
  }

  if (!window.confirm("直前の結果取込前の状態に戻します。購入記録、初期資金、取り込み履歴を復元しますか？")) {
    return;
  }

  const usedIds = createUsedIdSet([]);
  bets = snapshot.data.bets.map(function (bet) {
    return normalizeImportedBet(bet, usedIds);
  });
  simulationSettings = normalizeSimulationSettings(snapshot.data.simulation);
  resultImportHistory = snapshot.data.resultImportHistory.map(normalizeResultImportHistoryItem);
  resultImportHistory.unshift({
    importId: createImportId(),
    importedAt: new Date().toISOString(),
    fileName: snapshot.fileName,
    raceIds: snapshot.raceIds,
    resultCount: 0,
    matchedCount: 0,
    appliedCount: 0,
    skippedCount: 0,
    overwriteWarningCount: 0,
    overwrittenCount: 0,
    unmatchedMarkedLostCount: 0,
    snapshotCreated: false,
    action: "undo"
  });
  resultImportHistory = resultImportHistory.slice(0, 20);

  saveBets();
  saveSimulationSettings();
  saveResultImportHistory();
  localStorage.removeItem(LAST_IMPORT_SNAPSHOT_STORAGE_KEY);
  currentResultImportPreview = null;
  renderBets();
  renderResultImportPreview(null);
  showResultImportMessage("直前の結果取込を取り消しました。", false);
}

function showResultImportMessage(message, isError) {
  resultImportMessage.textContent = message;
  resultImportMessage.classList.toggle("is-error", isError);
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

function saveInitialFundOnly() {
  const nextInitialFund = getInitialFundInputValue();

  if (nextInitialFund === null) {
    return;
  }

  if (!window.confirm("購入記録を残したまま、初期資金だけ変更します。実行しますか？")) {
    return;
  }

  simulationSettings.initialFund = nextInitialFund;
  saveSimulationSettings();
  updateSimulationSummary();
  showSimulationMessage("初期資金を" + formatYen(nextInitialFund) + "円に変更しました。", false);
}

function resetAllDataAndInitialFund() {
  const nextInitialFund = getInitialFundInputValue();

  if (nextInitialFund === null) {
    return;
  }

  if (!window.confirm("全購入記録を削除し、初期資金を再設定します。この操作は元に戻せません。実行しますか？")) {
    return;
  }

  bets = [];
  simulationSettings.initialFund = nextInitialFund;
  saveBets();
  saveSimulationSettings();
  resetForm();
  renderBets();
  showSimulationMessage("全購入記録を削除し、初期資金を" + formatYen(nextInitialFund) + "円に再設定しました。", false);
}

function getInitialFundInputValue() {
  const value = Number(initialFundInput.value);

  if (!Number.isFinite(value) || value < 0) {
    showSimulationMessage("初期資金は0円以上の数字で入力してください。", true);
    initialFundInput.focus();
    return null;
  }

  return Math.floor(value);
}

function updateSimulationSummary() {
  const summary = calculateSimulationSummary(null);
  const balanceClass = summary.currentBalance >= summary.initialFund ? "plus" : "minus";
  const profitLossClass = summary.profitLoss >= 0 ? "plus" : "minus";

  initialFundInput.value = summary.initialFund;
  simulationInitialFund.textContent = formatYen(summary.initialFund);
  simulationCurrentBalance.textContent = formatYen(summary.currentBalance);
  simulationCurrentBalance.className = balanceClass;
  simulationTotalAmount.textContent = formatYen(summary.amountSum);
  simulationTotalPayout.textContent = formatYen(summary.payoutSum);
  simulationProfitLoss.textContent = formatSignedYen(summary.profitLoss);
  simulationProfitLoss.className = profitLossClass;
  simulationRecoveryRate.textContent = summary.recoveryRate.toFixed(1);
  simulationBalanceRate.textContent = summary.balanceRate.toFixed(1);
}

function calculateSimulationSummary(excludingBetId) {
  const targetBets = bets.filter(function (bet) {
    return excludingBetId === null || String(bet.id) !== String(excludingBetId);
  });

  const amountSum = targetBets.reduce(function (total, bet) {
    return total + (Number(bet.amount) || 0);
  }, 0);
  const payoutSum = targetBets.reduce(function (total, bet) {
    return total + (Number(bet.payout) || 0);
  }, 0);
  const initialFund = Number(simulationSettings.initialFund) || 0;
  const profitLoss = payoutSum - amountSum;
  const currentBalance = initialFund + profitLoss;

  return {
    initialFund: initialFund,
    amountSum: amountSum,
    payoutSum: payoutSum,
    profitLoss: profitLoss,
    currentBalance: currentBalance,
    recoveryRate: amountSum === 0 ? 0 : (payoutSum / amountSum) * 100,
    balanceRate: initialFund === 0 ? 0 : (currentBalance / initialFund) * 100
  };
}

function showSimulationMessage(message, isError) {
  simulationMessage.textContent = message;
  simulationMessage.classList.toggle("is-error", isError);
}

function getFilteredBets() {
  const selectedDate = filterDateInput.value;
  const selectedPlace = filterPlaceInput.value;
  const selectedTicketType = filterTicketTypeInput.value;
  const selectedStatus = filterStatusInput.value;
  const selectedTag = filterTagInput.value;
  const selectedPurchaseMode = filterPurchaseModeInput.value;
  const keyword = normalizeSearchText(searchKeywordInput.value);

  const filteredBets = bets.filter(function (bet) {
    const dateMatches = selectedDate === "" || bet.date === selectedDate;
    const placeMatches = selectedPlace === "" || bet.place === selectedPlace;
    const ticketTypeMatches = selectedTicketType === "" || bet.ticketType === selectedTicketType;
    const statusMatches = selectedStatus === "" || bet.status === selectedStatus;
    const tagMatches = selectedTag === "" || bet.tags.includes(selectedTag);
    const purchaseModeMatches = selectedPurchaseMode === "" || normalizePurchaseMode(bet.purchaseMode) === selectedPurchaseMode;
    const keywordMatches = keyword === "" || createSearchTextForBet(bet).includes(keyword);

    return dateMatches && placeMatches && ticketTypeMatches && statusMatches && tagMatches && purchaseModeMatches && keywordMatches;
  });

  return sortBets(filteredBets);
}

function updateDynamicFilterOptions() {
  const selectedPlace = filterPlaceInput.value;
  const selectedTag = filterTagInput.value;
  const places = getPlaceOptions();
  const tags = getTagOptions();

  filterPlaceInput.innerHTML = '<option value="">すべて</option>';
  filterTagInput.innerHTML = '<option value="">すべて</option>';

  places.forEach(function (place) {
    const option = document.createElement("option");
    option.value = place;
    option.textContent = place;
    filterPlaceInput.appendChild(option);
  });

  tags.forEach(function (tag) {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    filterTagInput.appendChild(option);
  });

  // 削除などで選択中の競馬場がなくなった場合は「すべて」に戻します。
  if (selectedPlace !== "" && places.includes(selectedPlace)) {
    filterPlaceInput.value = selectedPlace;
  } else {
    filterPlaceInput.value = "";
  }

  if (selectedTag !== "" && tags.includes(selectedTag)) {
    filterTagInput.value = selectedTag;
  } else {
    filterTagInput.value = "";
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

function getTagOptions() {
  const tags = [];

  bets.forEach(function (bet) {
    bet.tags.forEach(function (tag) {
      if (tag !== "") {
        tags.push(tag);
      }
    });
  });

  return Array.from(new Set(tags)).sort(function (a, b) {
    return a.localeCompare(b, "ja");
  });
}

function createSearchTextForBet(bet) {
  return normalizeSearchText([
    bet.raceId,
    bet.betNumbers,
    bet.memo,
    bet.tags.join(" ")
  ].join(" "));
}

function normalizeSearchText(text) {
  return String(text || "").trim().toLowerCase();
}

function sortBets(targetBets) {
  const sortedBets = targetBets.slice();
  const direction = betSortState.direction === "asc" ? 1 : -1;

  sortedBets.sort(function (a, b) {
    const firstValue = getBetSortValue(a, betSortState.key);
    const secondValue = getBetSortValue(b, betSortState.key);

    if (typeof firstValue === "number" && typeof secondValue === "number") {
      return (firstValue - secondValue) * direction;
    }

    return String(firstValue).localeCompare(String(secondValue), "ja", { numeric: true }) * direction;
  });

  return sortedBets;
}

function getBetSortValue(bet, key) {
  if (key === "amount") {
    return Number(bet.amount) || 0;
  }

  if (key === "payout") {
    return Number(bet.payout) || 0;
  }

  if (key === "profit") {
    return getBetProfit(bet);
  }

  if (key === "race") {
    return Number(String(bet.race || "").replace(/\D/g, "")) || 0;
  }

  if (key === "status") {
    return STATUS_TYPES.indexOf(normalizeStatus(bet.status));
  }

  return bet[key] || "";
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
  updateAnalysisDashboard(targetBets);
}

function updateTicketTypeSummary(targetBets) {
  const ticketSummaries = createTicketTypeSummaries(targetBets);
  const mobileList = ensureMobileListAfterTable(ticketSummaryList, "ticket-summary-mobile-list");

  ticketSummaryList.innerHTML = "";

  ticketSummaries.forEach(function (summary) {
    const card = createTicketSummaryCard(summary);
    ticketSummaryList.appendChild(card);
  });

  mobileList.innerHTML = ticketSummaries.map(createAnalysisMobileItemHtml).join("");
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
  const row = document.createElement("tr");

  const balanceClass = summary.balance >= 0 ? "plus" : "minus";

  row.innerHTML = `
    <th scope="row">${escapeHtml(summary.ticketType)}</th>
    <td>${summary.count}件</td>
    <td>${formatYen(summary.amountSum)}円</td>
    <td>${formatYen(summary.payoutSum)}円</td>
    <td class="${balanceClass}">${formatSignedYen(summary.balance)}円</td>
    <td>${summary.recoveryRate.toFixed(1)}%</td>
  `;

  return row;
}

function updateAnalysisDashboard(targetBets) {
  // 分析は保存せず、一覧と同じ絞り込み済みデータから毎回作り直します。
  const summary = calculateAnalysisSummary(targetBets);

  renderAnalysisBasicCards(summary);
  renderAnalysisTable(analysisDateTable, createDateAnalysisRows(targetBets), "日付");
  renderAnalysisTable(analysisPlaceTable, createSingleKeyAnalysisRows(targetBets, "place", "未入力"), "競馬場");
  renderAnalysisTable(analysisTagTable, createTagAnalysisRows(targetBets), "タグ");
  renderAnalysisTable(analysisPurchaseModeTable, createPurchaseModeAnalysisRows(targetBets), "買い方");
  renderRankingList(analysisTicketRanking, createSingleKeyAnalysisRows(targetBets, "ticketType", "未入力"));
  renderRankingList(analysisPlaceRanking, createSingleKeyAnalysisRows(targetBets, "place", "未入力"));
  renderRankingList(analysisTagRanking, createTagAnalysisRows(targetBets));
  renderRecordHighlights(targetBets);
}

function calculateAnalysisSummary(targetBets) {
  const stats = createEmptyAnalysisStats("全体");

  targetBets.forEach(function (bet) {
    addBetToAnalysisStats(stats, bet);
  });

  finishAnalysisStats(stats);

  const profits = targetBets.map(function (bet) {
    return getBetProfit(bet);
  });
  const payouts = targetBets.map(function (bet) {
    return Number(bet.payout) || 0;
  });

  stats.averageAmount = stats.count === 0 ? 0 : stats.amountSum / stats.count;
  stats.averagePayout = stats.count === 0 ? 0 : stats.payoutSum / stats.count;
  stats.maxPayout = payouts.length === 0 ? 0 : Math.max.apply(null, payouts);
  stats.maxPlusProfit = profits.length === 0 ? 0 : Math.max.apply(null, profits);
  stats.maxMinusProfit = profits.length === 0 ? 0 : Math.min.apply(null, profits);

  return stats;
}

function renderAnalysisBasicCards(summary) {
  const cards = [
    { label: "表示中の購入記録件数", value: summary.count + "件" },
    { label: "的中件数", value: summary.hitCount + "件" },
    { label: "不的中件数", value: summary.missCount + "件" },
    { label: "未確定件数", value: summary.pendingCount + "件" },
    { label: "的中率", value: formatPercent(summary.hitRate) },
    { label: "合計購入金額", value: formatYen(summary.amountSum) + "円" },
    { label: "合計払戻金", value: formatYen(summary.payoutSum) + "円" },
    { label: "収支", value: formatSignedYen(summary.profitLoss) + "円", className: summary.profitLoss >= 0 ? "plus" : "minus" },
    { label: "回収率", value: formatPercent(summary.recoveryRate) },
    { label: "平均購入金額", value: formatYen(Math.round(summary.averageAmount)) + "円" },
    { label: "平均払戻金", value: formatYen(Math.round(summary.averagePayout)) + "円" },
    { label: "最大払戻金", value: formatYen(summary.maxPayout) + "円" },
    { label: "最大プラス収支", value: formatSignedYen(summary.maxPlusProfit) + "円", className: summary.maxPlusProfit >= 0 ? "plus" : "minus" },
    { label: "最大マイナス収支", value: formatSignedYen(summary.maxMinusProfit) + "円", className: summary.maxMinusProfit >= 0 ? "plus" : "minus" }
  ];

  analysisBasicCards.innerHTML = cards.map(function (card) {
    const className = card.className ? ' class="' + card.className + '"' : "";

    return `
      <div class="analysis-card">
        <span>${escapeHtml(card.label)}</span>
        <strong${className}>${escapeHtml(card.value)}</strong>
      </div>
    `;
  }).join("");
}

function createDateAnalysisRows(targetBets) {
  return createSingleKeyAnalysisRows(targetBets, "date", "未入力").sort(function (a, b) {
    return a.name.localeCompare(b.name, "ja");
  });
}

function createSingleKeyAnalysisRows(targetBets, key, emptyLabel) {
  const summaries = {};

  targetBets.forEach(function (bet) {
    const name = String(bet[key] || "").trim() || emptyLabel;

    if (summaries[name] === undefined) {
      summaries[name] = createEmptyAnalysisStats(name);
    }

    addBetToAnalysisStats(summaries[name], bet);
  });

  return Object.keys(summaries).map(function (name) {
    finishAnalysisStats(summaries[name]);
    return summaries[name];
  }).sort(function (a, b) {
    return a.name.localeCompare(b.name, "ja");
  });
}

function createTagAnalysisRows(targetBets) {
  const summaries = {};

  targetBets.forEach(function (bet) {
    const tags = Array.isArray(bet.tags) && bet.tags.length > 0 ? bet.tags : ["タグなし"];

    tags.forEach(function (tag) {
      const name = String(tag || "").trim() || "タグなし";

      if (summaries[name] === undefined) {
        summaries[name] = createEmptyAnalysisStats(name);
      }

      addBetToAnalysisStats(summaries[name], bet);
    });
  });

  return Object.keys(summaries).map(function (name) {
    finishAnalysisStats(summaries[name]);
    return summaries[name];
  }).sort(function (a, b) {
    return a.name.localeCompare(b.name, "ja");
  });
}

function createPurchaseModeAnalysisRows(targetBets) {
  const summaries = {};

  PURCHASE_MODES.forEach(function (purchaseMode) {
    summaries[purchaseMode] = createEmptyAnalysisStats(purchaseMode);
  });

  targetBets.forEach(function (bet) {
    const purchaseMode = normalizePurchaseMode(bet.purchaseMode);
    addBetToAnalysisStats(summaries[purchaseMode], bet);
  });

  return PURCHASE_MODES.map(function (purchaseMode) {
    finishAnalysisStats(summaries[purchaseMode]);
    return summaries[purchaseMode];
  });
}

function createEmptyAnalysisStats(name) {
  return {
    name: name,
    count: 0,
    hitCount: 0,
    missCount: 0,
    pendingCount: 0,
    amountSum: 0,
    payoutSum: 0,
    profitLoss: 0,
    recoveryRate: 0,
    hitRate: 0
  };
}

function addBetToAnalysisStats(stats, bet) {
  const status = normalizeStatus(bet.status);

  stats.count += 1;
  stats.amountSum += Number(bet.amount) || 0;
  stats.payoutSum += Number(bet.payout) || 0;

  if (status === "的中") {
    stats.hitCount += 1;
  } else if (status === "不的中") {
    stats.missCount += 1;
  } else {
    stats.pendingCount += 1;
  }
}

function finishAnalysisStats(stats) {
  const settledCount = stats.hitCount + stats.missCount;

  stats.profitLoss = stats.payoutSum - stats.amountSum;
  stats.recoveryRate = stats.amountSum === 0 ? 0 : (stats.payoutSum / stats.amountSum) * 100;
  // 未確定は的中率の分母に含めません。
  stats.hitRate = settledCount === 0 ? 0 : (stats.hitCount / settledCount) * 100;
}

function renderAnalysisTable(tableBody, rows, firstHeaderLabel) {
  const mobileList = ensureMobileListAfterTable(tableBody, "analysis-mobile-list");

  if (rows.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty-table-cell">表示できる分析データがありません。</td></tr>';
    mobileList.innerHTML = '<p class="analysis-mobile-empty">表示できる分析データがありません。</p>';
    return;
  }

  tableBody.innerHTML = rows.map(function (row) {
    const profitClass = row.profitLoss >= 0 ? "plus" : "minus";

    return `
      <tr>
        <th scope="row">${escapeHtml(row.name || firstHeaderLabel)}</th>
        <td>${row.count}件</td>
        <td>${formatYen(row.amountSum)}円</td>
        <td>${formatYen(row.payoutSum)}円</td>
        <td class="${profitClass}">${formatSignedYen(row.profitLoss)}円</td>
        <td>${formatPercent(row.recoveryRate)}</td>
        <td>${formatPercent(row.hitRate)}</td>
      </tr>
    `;
  }).join("");
  mobileList.innerHTML = rows.map(createAnalysisMobileItemHtml).join("");
}

function ensureMobileListAfterTable(tableBody, className) {
  const tableScroll = tableBody.closest(".table-scroll");
  let mobileList = tableScroll.nextElementSibling;

  if (mobileList === null || !mobileList.classList.contains(className)) {
    mobileList = document.createElement("div");
    mobileList.className = className;
    tableScroll.insertAdjacentElement("afterend", mobileList);
  }

  return mobileList;
}

function createAnalysisMobileItemHtml(row) {
  const profitLossValue = row.profitLoss === undefined ? Number(row.balance) || 0 : Number(row.profitLoss) || 0;
  const profitClass = profitLossValue >= 0 ? "plus" : "minus";
  const name = row.name || row.ticketType || "未入力";
  const count = Number(row.count) || 0;
  const amountSum = Number(row.amountSum) || 0;
  const payoutSum = Number(row.payoutSum) || 0;
  const recoveryRateValue = Number(row.recoveryRate) || 0;
  const hitRateValue = row.hitRate === undefined ? null : Number(row.hitRate) || 0;

  return `
    <article class="analysis-mobile-item">
      <h4>${escapeHtml(name)}</h4>
      <dl>
        <div><dt>件数</dt><dd>${count}件</dd></div>
        <div><dt>購入</dt><dd>${formatYen(amountSum)}円</dd></div>
        <div><dt>払戻</dt><dd>${formatYen(payoutSum)}円</dd></div>
        <div><dt>収支</dt><dd class="${profitClass}">${formatSignedYen(profitLossValue)}円</dd></div>
        <div><dt>回収率</dt><dd>${formatPercent(recoveryRateValue)}</dd></div>
        ${hitRateValue === null ? "" : "<div><dt>的中率</dt><dd>" + formatPercent(hitRateValue) + "</dd></div>"}
      </dl>
    </article>
  `;
}

function renderRankingList(listElement, rows) {
  const rankingRows = rows
    .filter(function (row) {
      return row.amountSum > 0;
    })
    .sort(function (a, b) {
      if (b.recoveryRate !== a.recoveryRate) {
        return b.recoveryRate - a.recoveryRate;
      }

      return b.amountSum - a.amountSum;
    })
    .slice(0, 5);

  if (rankingRows.length === 0) {
    listElement.innerHTML = '<li class="ranking-empty">対象データなし</li>';
    return;
  }

  listElement.innerHTML = rankingRows.map(function (row) {
    const sampleLabel = row.count === 1 ? '<span class="sample-badge">サンプル少</span>' : "";

    return `
      <li>
        <span class="ranking-name">${escapeHtml(row.name)}</span>
        <strong>${formatPercent(row.recoveryRate)}</strong>
        <span>${row.count}件 / 購入 ${formatYen(row.amountSum)}円</span>
        ${sampleLabel}
      </li>
    `;
  }).join("");
}

function renderRecordHighlights(targetBets) {
  if (targetBets.length === 0) {
    analysisRecordHighlights.innerHTML = '<p class="empty-record-message">表示できる購入記録がありません。</p>';
    return;
  }

  const maxPayoutBet = findMaxBet(targetBets, function (bet) {
    return Number(bet.payout) || 0;
  });
  const maxPlusBet = findMaxBet(targetBets, getBetProfit);
  const maxMinusBet = findMinBet(targetBets, getBetProfit);
  const highlights = [
    { title: "最大払戻", bet: maxPayoutBet },
    { title: "最大プラス収支", bet: maxPlusBet },
    { title: "最大マイナス収支", bet: maxMinusBet }
  ];

  analysisRecordHighlights.innerHTML = highlights.map(function (highlight) {
    return createRecordHighlightHtml(highlight.title, highlight.bet);
  }).join("");
}

function createRecordHighlightHtml(title, bet) {
  const amount = Number(bet.amount) || 0;
  const payout = Number(bet.payout) || 0;
  const profit = payout - amount;
  const profitClass = profit >= 0 ? "plus" : "minus";
  const tagsText = Array.isArray(bet.tags) && bet.tags.length > 0 ? bet.tags.join(", ") : "タグなし";

  return `
    <article class="record-highlight">
      <h4>${escapeHtml(title)}</h4>
      <dl>
        <div><dt>日付</dt><dd>${escapeHtml(bet.date || "未入力")}</dd></div>
        <div><dt>競馬場</dt><dd>${escapeHtml(bet.place || "未入力")}</dd></div>
        <div><dt>レース番号</dt><dd>${escapeHtml(bet.race || "未入力")}</dd></div>
        <div><dt>券種</dt><dd>${escapeHtml(bet.ticketType || "未入力")}</dd></div>
        <div><dt>買い目</dt><dd>${escapeHtml(bet.betNumbers || "未入力")}</dd></div>
        <div><dt>購入金額</dt><dd>${formatYen(amount)}円</dd></div>
        <div><dt>払戻金</dt><dd>${formatYen(payout)}円</dd></div>
        <div><dt>収支</dt><dd class="${profitClass}">${formatSignedYen(profit)}円</dd></div>
        <div class="record-tags"><dt>タグ</dt><dd>${escapeHtml(tagsText)}</dd></div>
      </dl>
    </article>
  `;
}

function findMaxBet(targetBets, getValue) {
  return targetBets.reduce(function (bestBet, bet) {
    return getValue(bet) > getValue(bestBet) ? bet : bestBet;
  }, targetBets[0]);
}

function findMinBet(targetBets, getValue) {
  return targetBets.reduce(function (bestBet, bet) {
    return getValue(bet) < getValue(bestBet) ? bet : bestBet;
  }, targetBets[0]);
}

function getBetProfit(bet) {
  return (Number(bet.payout) || 0) - (Number(bet.amount) || 0);
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

function formatPercent(number) {
  return Number(number || 0).toFixed(1) + "%";
}

function createTagsHtml(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "なし";
  }

  return tags.map(function (tag) {
    return '<span class="tag-chip">' + escapeHtml(tag) + "</span>";
  }).join("");
}

function getStatusClassName(status) {
  if (status === "的中") {
    return "hit";
  }

  if (status === "不的中") {
    return "miss";
  }

  return "pending";
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
