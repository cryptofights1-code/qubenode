
// === QubeNode Live Sync (Variant A, no uptime yet) ===

const VALOPER = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";
const RPC_STATUS = "https://api-rpc-mainnet-1.qubetics.space/status";
const LCD_VALIDATOR = `https://api-lcd-mainnet-1.qubetics.space/cosmos/staking/v1beta1/validators/${VALOPER}`;
const LCD_DELEGATIONS = `https://api-lcd-mainnet-1.qubetics.space/cosmos/staking/v1beta1/validators/${VALOPER}/delegations?pagination.limit=1000`;
const MEXC_PRICE = "https://api.mexc.com/api/v3/ticker/price?symbol=TICSUSDT";
const MEXC_24H = "https://api.mexc.com/api/v3/ticker/24hr?symbol=TICSUSDT";

// DOM targets already in your HTML
const currentBlockEl = document.getElementById("currentBlock");
const blockInfoEl = document.querySelector(".block-info");
const blocksContainer = document.getElementById("blocksChainInline");

// Inject minimal CSS for the green "sticks"
(function injectTickerStyles(){
  if (document.getElementById("qubenode-ticker-style")) return;
  const style = document.createElement("style");
  style.id = "qubenode-ticker-style";
  style.textContent = `
  #blocksChainInline { display:flex; align-items:center; gap:8px; overflow:hidden; }
  .block-pill {
    width: 32px; height: 10px; background:#20E3B2; border-radius:6px;
    opacity: .65; box-shadow: 0 0 8px rgba(32, 227, 178, .45);
    transform: scale(.9); transition: transform .35s ease, opacity .35s ease;
  }
  .block-pill.new { opacity: 1; transform: scale(1.25); }
  `;
  document.head.appendChild(style);
})();

// Helpers
function niceTics(n) {
  if (!isFinite(n)) return "—";
  if (n >= 1_000_000_000) return (n/1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n/1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n/1_000).toFixed(2) + "K";
  return String(Math.round(n));
}
function setCardValue(labelText, valueText, color) {
  const cards = document.querySelectorAll(".stat-card");
  for (const card of cards) {
    const label = card.querySelector(".stat-label");
    const val = card.querySelector(".stat-value");
    if (!label || !val) continue;
    if (label.textContent.trim() === labelText) {
      val.textContent = valueText;
      if (color) val.style.color = color;
      return true;
    }
  }
  return false;
}

// Live block ticker state
const TICKER_SIZE = 20;
let latestHeight = 0;
let lastBlockTimeISO = null;
let tickerHeights = [];

// Render the green sticks
function renderTicker() {
  blocksContainer.innerHTML = "";
  for (let i = 0; i < tickerHeights.length; i++) {
    const div = document.createElement("div");
    div.className = "block-pill" + (i === 0 ? " new" : "");
    div.title = "Block #" + tickerHeights[i];
    blocksContainer.appendChild(div);
  }
}

// Fetch block status from RPC
async function refreshBlock() {
  try {
    const res = await fetch(RPC_STATUS, { cache: "no-store" });
    const data = await res.json();
    const h = parseInt(data?.result?.sync_info?.latest_block_height);
    const tISO = data?.result?.sync_info?.latest_block_time;
    if (Number.isFinite(h)) {
      latestHeight = h;
      if (!tickerHeights.length || tickerHeights[0] !== h) {
        tickerHeights.unshift(h);
        tickerHeights = tickerHeights.slice(0, TICKER_SIZE);
        renderTicker();
      }
      // Update header "Блок #... • ~Xs"
      currentBlockEl && (currentBlockEl.textContent = h.toLocaleString("uk-UA"));
      if (blockInfoEl) {
        const secs = tISO ? Math.max(0, (Date.now() - new Date(tISO).getTime())/1000) : NaN;
        const pretty = isFinite(secs) ? `~${secs.toFixed(2)}с` : "~—";
        // blockInfoEl format: 'Блок #<span id="currentBlock">...</span> • ~5.83с'
        const html = `Блок #<span id="currentBlock">${h.toLocaleString("uk-UA")}</span> • ${pretty}`;
        blockInfoEl.innerHTML = html;
      }
      lastBlockTimeISO = tISO || lastBlockTimeISO;
    }
  } catch (e) { /* silent */ }
}

// Fetch validator staking info (delegated amount + commission)
async function refreshValidatorInfo() {
  try {
    const res = await fetch(LCD_VALIDATOR, { cache: "no-store" });
    const data = await res.json();
    const v = data?.validator;
    // tokens are in uTICS (assume 6 decimals). If not present, try delegator_shares
    const tokens = v?.tokens ? Number(v.tokens)/1e6 : (v?.delegator_shares ? Number(v.delegator_shares)/1e6 : NaN);
    const commission = Number(v?.commission?.commission_rates?.rate ?? v?.commission?.rate ?? 0) * 100;
    if (isFinite(tokens)) setCardValue("Загальна Сума", `${niceTics(tokens)} TICS`);
    setCardValue("Комісія", (isFinite(commission) ? commission.toFixed(2) : "—") + "%");
  } catch (e) { /* silent */ }
}

// Fetch delegators count
async function refreshDelegators() {
  try {
    const res = await fetch(LCD_DELEGATIONS, { cache: "no-store" });
    const data = await res.json();
    const count = Array.isArray(data?.delegation_responses) ? data.delegation_responses.length : NaN;
    setCardValue("Делегатори", isFinite(count) ? String(count) : "—");
  } catch (e) { /* silent */ }
}

// Fetch price + 24h change
async function refreshPrice() {
  try {
    const [pRes, hRes] = await Promise.all([
      fetch(MEXC_PRICE, { cache: "no-store" }),
      fetch(MEXC_24H, { cache: "no-store" })
    ]);
    const p = await pRes.json();
    const h = await hRes.json();
    const price = Number(p?.price ?? p?.lastPrice ?? NaN);
    const change = Number(h?.priceChangePercent ?? h?.priceChange ?? NaN);
    if (isFinite(price)) setCardValue("Ціна $TICS", "$" + price.toFixed(4));
    if (isFinite(change)) setCardValue("Зміна за 24Г", (change >= 0 ? "+" : "") + change.toFixed(2) + "%", change >= 0 ? "#22c55e" : "#ef4444");
  } catch (e) { /* silent */ }
}

// Uptime card — temporarily dash
function markUptimeAsPending() {
  setCardValue("Uptime", "—");
}

// Initialize ticker with placeholders
(function initTicker(){
  tickerHeights = [];
  for (let i=0;i<TICKER_SIZE;i++) tickerHeights.push(0);
  renderTicker();
})();

// First run
refreshBlock();
refreshValidatorInfo();
refreshDelegators();
refreshPrice();
markUptimeAsPending();

// Schedules
setInterval(refreshBlock, 6000);
setInterval(refreshValidatorInfo, 30000);
setInterval(refreshDelegators, 45000);
setInterval(refreshPrice, 30000);
