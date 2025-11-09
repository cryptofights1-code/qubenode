// === QubeNode Live Sync Script (HTML-compatible edition) ===
// version 2.1 – adapted for existing index.html structure

const API_BASE = "https://swagger.qubetics.com";
const RPC_BASE = "https://rpc.qubenode.space";
const API_KEY = "qubenode_94Fh29sd8GvP!";
const VALIDATOR = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";

// universal JSON fetch helper
async function fetchJSON(url, headers = {}) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Fetch failed → ${url}`, err);
    return null;
  }
}

// === RPC STATUS (current block) ===
async function updateBlockHeight() {
  const url = `${RPC_BASE}/status`;
  const headers = { "X-API-KEY": API_KEY };
  const data = await fetchJSON(url, headers);
  const el = document.getElementById("currentBlock");
  if (data?.result?.sync_info?.latest_block_height) {
    el.textContent = data.result.sync_info.latest_block_height;
  } else if (el) el.textContent = "—";
}

// === VALIDATOR CORE INFO ===
async function updateValidatorCore() {
  const url = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}`;
  const data = await fetchJSON(url);
  if (!data?.validator) return;

  const v = data.validator;
  const commission = parseFloat(v.commission.commission_rates.rate) * 100;
  const tokens = parseFloat(v.tokens) / 1_000_000;

  const comEl = document.getElementById("commissionRate");
  const powerEl = document.getElementById("delegatedAmount");

  if (comEl) comEl.textContent = commission.toFixed(1) + "%";
  if (powerEl) powerEl.textContent = tokens.toLocaleString("en-US") + " TICS";
}

// === DELEGATORS COUNT ===
async function updateDelegators() {
  const url = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}/delegations`;
  const data = await fetchJSON(url);
  if (!data?.delegation_responses) return;
  const count = data.delegation_responses.length;
  const el = document.getElementById("delegatorsCount");
  if (el) el.textContent = count;
}

// === INFLATION (network metric) ===
async function updateInflation() {
  const url = `${API_BASE}/cosmos/mint/v1beta1/inflation`;
  const data = await fetchJSON(url);
  const el = document.getElementById("inflationRate");
  if (!data?.inflation || !el) return;
  el.textContent = (parseFloat(data.inflation) * 100).toFixed(2) + "%";
}

// === MASTER UPDATE ===
async function updateAll() {
  console.log("🔄 QubeNode sync running…");
  await Promise.all([
    updateBlockHeight(),
    updateValidatorCore(),
    updateDelegators(),
    updateInflation()
  ]);
}

// first run & schedule
updateAll();
setInterval(updateAll, 15000);