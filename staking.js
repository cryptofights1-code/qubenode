
// === QubeNode Staking dApp v0.1 ===
// Keplr-based delegations viewer + basic staking actions for Qubetics

import { SigningStargateClient, GasPrice } from "https://esm.sh/@cosmjs/stargate@0.32.4";
import { coins } from "https://esm.sh/@cosmjs/proto-signing@0.32.4";

// --- Qubetics chain config ---
// NOTE: базова монета й gasPrice взяті з загальних патернів Cosmos.
// Будь ласка, за потреби перевір ці значення з офіційним chain-registry.
const CHAIN_ID = "qubetics_9030-1";
const RPC_ENDPOINT = "https://rpc.qubetics.com";
const REST_ENDPOINT = "https://swagger.qubetics.com";

// Базовий деном для стейкінгу (припущення, перевір в chain-registry)
const STAKING_DENOM = "utics";
// Для відображення в TICS (кількість знаків після крапки)
const DISPLAY_DECIMALS = 6;

// Адреса валідатора QubeNode (valoper)
const QUBENODE_VALOPER = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";

// Стан dApp
const stakingState = {
  walletType: null,      // "keplr" | "cosmostation"
  delegator: null,       // bech32 адреса
  client: null,          // SigningStargateClient
  delegations: [],       // масив делегувань по всіх валідаторах
  rewardsByValidator: {},// map valoper -> сума винагород
  validatorsByAddress: {}, // map valoper -> moniker
};

// --- helpers ---

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return await res.json();
}

function fmtAmount(baseAmountStr) {
  if (!baseAmountStr) return "0";
  try {
    const n = Number(baseAmountStr) / Math.pow(10, DISPLAY_DECIMALS);
    if (!isFinite(n)) return baseAmountStr;
    if (n === 0) return "0";
    if (n < 0.000001) return n.toExponential(2) + " TICS";
    if (n < 1) return n.toFixed(6) + " TICS";
    if (n < 1000) return n.toFixed(4) + " TICS";
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " TICS";
  } catch {
    return baseAmountStr;
  }
}

function setStatus(msg) {
  const el = document.getElementById("stakingStatus");
  if (el) el.textContent = msg;
}

function setMessage(msg, type = "info") {
  const el = document.getElementById("stakingMessages");
  if (!el) return;
  el.textContent = msg;
  el.style.color = type === "error" ? "#fecaca" : "#e5e7eb";
}

function setConnectedUI(connected) {
  const block = document.getElementById("stakingConnected");
  if (block) block.style.display = connected ? "block" : "none";
}

// --- Load validators meta (monikers) ---

async function loadValidatorsMeta() {
  try {
    const url = `${REST_ENDPOINT}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=300`;
    const data = await fetchJSON(url);
    if (Array.isArray(data.validators)) {
      data.validators.forEach(v => {
        stakingState.validatorsByAddress[v.operator_address] = v.description?.moniker || v.operator_address;
      });
    }
  } catch (err) {
    console.warn("Could not load validators meta:", err);
  }
}

// --- Wallet connections ---

async function connectKeplr() {
  try {
    if (!window.keplr || !window.getOfflineSigner) {
      alert("Keplr не знайдено. Перевірте, чи встановлено розширення.");
      return;
    }

    await window.keplr.enable(CHAIN_ID);
    const offlineSigner = window.getOfflineSigner(CHAIN_ID);
    const accounts = await offlineSigner.getAccounts();
    if (!accounts.length) throw new Error("Keplr: рахунки не знайдені");

    const gasPrice = GasPrice.fromString(`0.025${STAKING_DENOM}`);
    const client = await SigningStargateClient.connectWithSigner(
      RPC_ENDPOINT,
      offlineSigner,
      { gasPrice }
    );

    stakingState.walletType = "keplr";
    stakingState.delegator = accounts[0].address;
    stakingState.client = client;

    const walletTypeEl = document.getElementById("stakingWalletType");
    if (walletTypeEl) walletTypeEl.textContent = "Keplr";

    const addrEl = document.getElementById("stakingDelegatorAddress");
    if (addrEl) addrEl.textContent = stakingState.delegator;

    setConnectedUI(true);
    setStatus("Гаманець Keplr підключений.");
    setMessage("");

    await loadValidatorsMeta();
    await refreshStakingData();
  } catch (err) {
    console.error("Keplr connect error:", err);
    setMessage("Помилка підключення Keplr: " + err.message, "error");
  }
}

// Тимчасовий плейсхолдер для Cosmostation. Повноцінну інтеграцію можна додати пізніше.
async function connectCosmostation() {
  if (!window.cosmostation) {
    alert("Cosmostation не знайдено. Перевірте, чи встановлено розширення.");
    return;
  }
  alert("Cosmostation (beta): на даному етапі повна інтеграція ще не реалізована. Рекомендуємо використовувати Keplr для операцій через цей сайт.");
}

// --- Data loading ---

async function refreshStakingData() {
  try {
    if (!stakingState.delegator) return;

    setStatus("Оновлюємо делегування та винагороди...");
    setMessage("");

    // Делегування
    const delUrl = `${REST_ENDPOINT}/cosmos/staking/v1beta1/delegations/${stakingState.delegator}?pagination.limit=300`;
    const delData = await fetchJSON(delUrl);
    stakingState.delegations = Array.isArray(delData.delegation_responses)
      ? delData.delegation_responses
      : [];

    // Винагороди
    const rewardsUrl = `${REST_ENDPOINT}/cosmos/distribution/v1beta1/delegators/${stakingState.delegator}/rewards`;
    const rewardsData = await fetchJSON(rewardsUrl);
    stakingState.rewardsByValidator = {};
    if (Array.isArray(rewardsData.rewards)) {
      rewardsData.rewards.forEach(r => {
        const val = r.validator_address;
        const coin = (r.reward || []).find(c => c.denom === STAKING_DENOM);
        if (coin) stakingState.rewardsByValidator[val] = coin.amount;
      });
    }

    renderDelegationsTable();
    updateQubeNodeDelegation();
    setStatus("Дані успішно оновлено.");
  } catch (err) {
    console.error("refreshStakingData error:", err);
    setMessage("Не вдалося завантажити дані про делегування: " + err.message, "error");
  }
}

function renderDelegationsTable() {
  const tbody = document.getElementById("stakingDelegationsTableBody");
  const emptyEl = document.getElementById("stakingDelegationsEmpty");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!stakingState.delegations.length) {
    if (emptyEl) emptyEl.style.display = "block";
    return;
  } else if (emptyEl) {
    emptyEl.style.display = "none";
  }

  stakingState.delegations.forEach(item => {
    const valoper = item.delegation?.validator_address;
    const validatorName = stakingState.validatorsByAddress[valoper] || (valoper || "").slice(0, 18) + "...";
    const amountCoin = (item.balance || {});
    const baseAmount = amountCoin.amount || "0";

    const tr = document.createElement("tr");

    const tdVal = document.createElement("td");
    tdVal.style.padding = "6px 8px";
    tdVal.style.borderBottom = "1px solid rgba(30,64,175,0.4)";
    tdVal.textContent = validatorName;

    const tdAmt = document.createElement("td");
    tdAmt.style.padding = "6px 8px";
    tdAmt.style.textAlign = "right";
    tdAmt.style.borderBottom = "1px solid rgba(30,64,175,0.4)";
    tdAmt.textContent = fmtAmount(baseAmount);

    const reward = stakingState.rewardsByValidator[valoper] || "0";
    const tdRw = document.createElement("td");
    tdRw.style.padding = "6px 8px";
    tdRw.style.textAlign = "right";
    tdRw.style.borderBottom = "1px solid rgba(30,64,175,0.4)";
    tdRw.textContent = fmtAmount(reward);

    const tdAction = document.createElement("td");
    tdAction.style.padding = "6px 8px";
    tdAction.style.textAlign = "right";
    tdAction.style.borderBottom = "1px solid rgba(30,64,175,0.4)";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = valoper === QUBENODE_VALOPER ? "Дод. делегування" : "Ределегувати → QubeNode";
    btn.style.fontSize = "0.75em";
    btn.style.padding = "5px 8px";
    btn.style.borderRadius = "999px";
    btn.style.border = "1px solid rgba(56,189,248,0.8)";
    btn.style.background = "rgba(15,23,42,0.9)";
    btn.style.color = "#e5e7eb";
    btn.style.cursor = "pointer";

    btn.addEventListener("click", () => {
      const input = document.getElementById("delegateAmountInput");
      if (input) input.focus();
      if (valoper !== QUBENODE_VALOPER) {
        // збережемо вибраного валідатора для ределегування
        stakingState._selectedFromValoper = valoper;
        setMessage("Обрано валідатора для ределегування → QubeNode. Вкажіть суму та натисніть «Ределегувати → QubeNode».", "info");
      } else {
        setMessage("Обрано додаткове делегування до QubeNode. Вкажіть суму та натисніть «Делегувати до QubeNode».", "info");
      }
    });

    tdAction.appendChild(btn);

    tr.appendChild(tdVal);
    tr.appendChild(tdAmt);
    tr.appendChild(tdRw);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });
}

function updateQubeNodeDelegation() {
  const el = document.getElementById("stakingQubeNodeDelegation");
  if (!el) return;

  const entry = stakingState.delegations.find(
    d => d.delegation?.validator_address === QUBENODE_VALOPER
  );
  if (!entry) {
    el.textContent = "немає активного делегування";
    return;
  }
  const amt = entry.balance?.amount || "0";
  el.textContent = fmtAmount(amt);
}

// --- Actions ---

async function delegateToQubeNode() {
  try {
    if (!stakingState.client || !stakingState.delegator) {
      setMessage("Спочатку підключіть гаманець.", "error");
      return;
    }
    const input = document.getElementById("delegateAmountInput");
    if (!input) return;
    const value = input.value.trim();
    const amountNum = Number(value);
    if (!value || !isFinite(amountNum) || amountNum <= 0) {
      setMessage("Вкажіть коректну суму в TICS для делегування.", "error");
      return;
    }

    const baseAmount = Math.floor(amountNum * Math.pow(10, DISPLAY_DECIMALS));
    const denomCoin = coins(baseAmount.toString(), STAKING_DENOM);

    setMessage("Створюємо транзакцію делегування… Підтвердіть її у гаманці.");
    const res = await stakingState.client.delegateTokens(
      stakingState.delegator,
      QUBENODE_VALOPER,
      denomCoin[0],
      "auto"
    );

    if (res.code === 0) {
      setMessage("Делегування успішно відправлено. Очікуємо підтвердження блокчейну…");
      await refreshStakingData();
    } else {
      throw new Error(res.rawLog || "невідома помилка");
    }
  } catch (err) {
    console.error("delegateToQubeNode error:", err);
    setMessage("Помилка делегування: " + err.message, "error");
  }
}

async function redelegateToQubeNode() {
  try {
    if (!stakingState.client || !stakingState.delegator) {
      setMessage("Спочатку підключіть гаманець.", "error");
      return;
    }
    const fromValoper = stakingState._selectedFromValoper;
    if (!fromValoper) {
      setMessage("Оберіть валідатора для ределегування у таблиці делегувань.", "error");
      return;
    }
    const input = document.getElementById("delegateAmountInput");
    if (!input) return;
    const value = input.value.trim();
    const amountNum = Number(value);
    if (!value || !isFinite(amountNum) || amountNum <= 0) {
      setMessage("Вкажіть коректну суму в TICS для ределегування.", "error");
      return;
    }

    const baseAmount = Math.floor(amountNum * Math.pow(10, DISPLAY_DECIMALS));
    const coinVal = { denom: STAKING_DENOM, amount: baseAmount.toString() };

    setMessage("Створюємо транзакцію ределегування… Підтвердіть її у гаманці.");
    const res = await stakingState.client.beginRedelegate(
      stakingState.delegator,
      fromValoper,
      QUBENODE_VALOPER,
      coinVal,
      "auto"
    );

    if (res.code === 0) {
      setMessage("Ределегування успішно відправлено. Очікуємо підтвердження блокчейну…");
      await refreshStakingData();
    } else {
      throw new Error(res.rawLog || "невідома помилка");
    }
  } catch (err) {
    console.error("redelegateToQubeNode error:", err);
    setMessage("Помилка ределегування: " + err.message, "error");
  }
}

async function withdrawAllRewards() {
  try {
    if (!stakingState.client || !stakingState.delegator) {
      setMessage("Спочатку підключіть гаманець.", "error");
      return;
    }
    if (!stakingState.delegations.length) {
      setMessage("Немає активних делегувань для отримання винагород.", "error");
      return;
    }

    setMessage("Створюємо транзакцію на отримання всіх винагород… Підтвердіть її у гаманці.");

    // Універсальний варіант: по кожному валідатору окремо
    for (const d of stakingState.delegations) {
      const valoper = d.delegation?.validator_address;
      try {
        const res = await stakingState.client.withdrawRewards(
          stakingState.delegator,
          valoper,
          "auto"
        );
        if (res.code !== 0) {
          console.warn("withdrawRewards error for", valoper, res);
        }
      } catch (err) {
        console.warn("withdrawRewards single error:", err);
      }
    }

    setMessage("Транзакції на отримання винагород відправлено. Після підтвердження баланс оновиться.");
    await refreshStakingData();
  } catch (err) {
    console.error("withdrawAllRewards error:", err);
    setMessage("Помилка при отриманні винагород: " + err.message, "error");
  }
}

// --- DOM wiring ---

function initStakingDapp() {
  const keplrBtn = document.getElementById("connectKeplrBtn");
  if (keplrBtn) keplrBtn.addEventListener("click", connectKeplr);

  const cosmoBtn = document.getElementById("connectCosmostationBtn");
  if (cosmoBtn) cosmoBtn.addEventListener("click", connectCosmostation);

  const refreshBtn = document.getElementById("refreshStakingBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", refreshStakingData);

  const delegateBtn = document.getElementById("delegateToQubeNodeBtn");
  if (delegateBtn) delegateBtn.addEventListener("click", delegateToQubeNode);

  const redelegateBtn = document.getElementById("redelegateToQubeNodeBtn");
  if (redelegateBtn) redelegateBtn.addEventListener("click", redelegateToQubeNode);

  const withdrawBtn = document.getElementById("withdrawRewardsBtn");
  if (withdrawBtn) withdrawBtn.addEventListener("click", withdrawAllRewards);

  setStatus("Гаманець не підключений. Оберіть Keplr або Cosmostation.");
}

// Ініціалізація після завантаження DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStakingDapp);
} else {
  initStakingDapp();
}

// Робимо функції доступними з window (на випадок налагодження)
window.QubeStaking = {
  state: stakingState,
  connectKeplr,
  connectCosmostation,
  refreshStakingData,
  delegateToQubeNode,
  redelegateToQubeNode,
  withdrawAllRewards,
};
