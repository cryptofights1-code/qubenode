
// === QubeNode Live Sync Final ===
// All endpoints routed via https://api.qubenode.space (Cloudflare Worker proxy)

const VALOPER = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";
const LCD_BASE = "https://api.qubenode.space/lcd";
const RPC_BASE = "https://api.qubenode.space/rpc";
const MEXC_PRICE = "https://api.mexc.com/api/v3/ticker/price?symbol=TICSUSDT";
const MEXC_24H = "https://api.mexc.com/api/v3/ticker/24hr?symbol=TICSUSDT";

// === DOM Targets ===
const currentBlockEl = document.getElementById("currentBlock");
const blockInfoEl = document.querySelector(".block-info");
const blocksContainer = document.getElementById("blocksChainInline");

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

// === Block ticker ===
const TICKER_SIZE = 20;
let tickerHeights = [];

function renderTicker() {
  if (!blocksContainer) return;
  blocksContainer.innerHTML = "";
  for (let i = 0; i < tickerHeights.length; i++) {
    const div = document.createElement("div");
    div.className = "block-pill" + (i === 0 ? " new" : "");
    div.title = "Block #" + tickerHeights[i];
    blocksContainer.appendChild(div);
  }
}

(function injectTickerStyles(){
  if (document.getElementById("qubenode-ticker-style")) return;
  const style = document.createElement("style");
  style.id = "qubenode-ticker-style";
  style.textContent = `
  #blocksChainInline { display:flex; align-items:center; gap:8px; overflow:hidden; }
  .block-pill {
    width: 32px; height: 10px; background:#20E3B2; border-radius:6px;
    opacity: .7; box-shadow: 0 0 8px rgba(32, 227, 178, .45);
    transform: scale(.9); transition: transform .35s ease, opacity .35s ease;
  }
  .block-pill.new { opacity: 1; transform: scale(1.2); }
  `;
  document.head.appendChild(style);
})();

async function refreshBlock() {
  try {
    const res = await fetch(`${RPC_BASE}/status`);
    const data = await res.json();
    const h = parseInt(data?.result?.sync_info?.latest_block_height);
    const tISO = data?.result?.sync_info?.latest_block_time;
    if (Number.isFinite(h)) {
      tickerHeights.unshift(h);
      tickerHeights = tickerHeights.slice(0, TICKER_SIZE);
      renderTicker();
      const secs = tISO ? Math.max(0, (Date.now() - new Date(tISO).getTime())/1000) : NaN;
      const pretty = isFinite(secs) ? `~${secs.toFixed(2)}с` : "~—";
      if (blockInfoEl) blockInfoEl.innerHTML = `Блок #<span id="currentBlock">${h}</span> • ${pretty}`;
    }
  } catch (e) { console.error("Block update error:", e); }
}

async function refreshValidator() {
  try {
    const res = await fetch(`${LCD_BASE}/cosmos/staking/v1beta1/validators/${VALOPER}`);
    const data = await res.json();
    const v = data?.validator;
    const tokens = v?.tokens ? Number(v.tokens)/1e6 : Number(v?.delegator_shares)/1e6;
    const commission = Number(v?.commission?.commission_rates?.rate ?? v?.commission?.rate ?? 0)*100;
    setCardValue("Загальна Сума", `${niceTics(tokens)} TICS`);
    setCardValue("Комісія", commission.toFixed(2)+"%");
  } catch(e){ console.error("Validator info error:", e); }
}

async function refreshDelegators() {
  try {
    const res = await fetch(`${LCD_BASE}/cosmos/staking/v1beta1/validators/${VALOPER}/delegations?pagination.limit=1000`);
    const data = await res.json();
    const count = Array.isArray(data?.delegation_responses) ? data.delegation_responses.length : 0;
    setCardValue("Делегатори", count.toString());
  } catch(e){ console.error("Delegators error:", e); }
}

async function refreshPrice() {
  try {
    const [pRes, hRes] = await Promise.all([fetch(MEXC_PRICE), fetch(MEXC_24H)]);
    const p = await pRes.json(); const h = await hRes.json();
    const price = Number(p?.price ?? p?.lastPrice ?? NaN);
    const change = Number(h?.priceChangePercent ?? h?.priceChange ?? NaN);
    if (isFinite(price)) setCardValue("Ціна $TICS", "$" + price.toFixed(4));
    if (isFinite(change)) setCardValue("Зміна за 24Г", (change>=0?"+":"")+change.toFixed(2)+"%", change>=0?"#22c55e":"#ef4444");
  } catch(e){ console.error("Price error:", e); }
}

function markUptimeAsPending(){ setCardValue("Uptime","—"); }

// Init
(function initTicker(){ tickerHeights = Array(TICKER_SIZE).fill(0); renderTicker(); })();
refreshBlock(); refreshValidator(); refreshDelegators(); refreshPrice(); markUptimeAsPending();

setInterval(refreshBlock,6000);
setInterval(refreshValidator,30000);
setInterval(refreshDelegators,45000);
setInterval(refreshPrice,30000);
