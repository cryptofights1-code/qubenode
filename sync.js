
// === QubeNode Live Sync ===
const CONFIG = {
  RPC_URL: "https://rpc.qubenode.space",
  LCD_URL: "https://api.qubetics.network", // change if different
  // Exact uptime JSON endpoint from Ticsscan (insert when you have it)
  UPTIME_URL: "", // e.g. https://native.ticsscan.com/api/v2/validators/uptime/<valoper>
  VALOPER: "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld",
  VALCONS_HEX: "6FF72A04488A594ACC6BCCA6936C7279DBE041E5",
  MEXC_SYMBOL: "TICSUSDT",
  REFRESH_MS: 10000
};

function formatNum(n) {
  if (n == null || isNaN(n)) return "--";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n/1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n/1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n/1e3).toFixed(2) + "K";
  return String(Math.round(n));
}
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function fetchJSON(url, opts={}) {
  const r = await fetch(url, {...opts, cache: "no-store"});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

// --- Blocks (height + age + marquee) ---
async function updateBlocks() {
  try {
    const data = await fetchJSON(`${CONFIG.RPC_URL}/status`);
    const h = Number(data.result.sync_info.latest_block_height);
    const t = new Date(data.result.sync_info.latest_block_time);
    const age = Math.max(0, ((Date.now() - t.getTime())/1000)).toFixed(1);
    setText("currentBlock", h.toLocaleString("en-US"));
    const info = document.querySelector(".block-info");
    if (info) info.innerHTML = `Блок #<span id="currentBlock">${h.toLocaleString("en-US")}</span> • ~${age}с`;
    // Render moving blocks
    const container = document.getElementById("blocksChainInline");
    if (container) {
      let html = "";
      for (let i=0;i<40;i++) {
        const num = (h - i);
        html += `<div class="chain-block">${String(num).slice(-2)}</div>`;
      }
      container.innerHTML = `<div class="blocks-track-inline">${html.repeat(4)}</div>`;
    }
  } catch(e) {
    console.warn("updateBlocks failed:", e);
  }
}

// --- Validator info (commission, delegated total, delegators count) ---
async function updateValidator() {
  try {
    // Validator basic
    const v = await fetchJSON(`${CONFIG.LCD_URL}/cosmos/staking/v1beta1/validators/${CONFIG.VALOPER}`);
    // Commission
    const commission = Number(v.validator.commission.commission_rates.rate) * 100;
    setText("commissionRate", `${commission.toFixed(2)}%`);
    // Delegated tokens (voting power tokens)
    const tokens = Number(v.validator.tokens || 0);
    setText("delegatedAmount", formatNum(tokens));
  } catch (e) {
    console.warn("validator info failed:", e);
  }
  try {
    // Delegators count (use count_total)
    const d = await fetchJSON(`${CONFIG.LCD_URL}/cosmos/staking/v1beta1/validators/${CONFIG.VALOPER}/delegations?pagination.count_total=true&pagination.limit=1`);
    const total = Number(d.pagination?.total || d.pagination?.total_records || 0);
    if (total) setText("delegatorsCount", formatNum(total));
  } catch(e) {
    console.warn("delegators count failed:", e);
  }
}

// --- Price from MEXC ---
async function updatePrice() {
  try {
    const price = await fetchJSON(`https://api.mexc.com/api/v3/ticker/price?symbol=${CONFIG.MEXC_SYMBOL}`);
    const p = Number(price.price);
    setText("ticsPrice", `$${p.toFixed(4)}`);
    const change = await fetchJSON(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${CONFIG.MEXC_SYMBOL}`);
    const pct = Number(change.priceChangePercent);
    const el = document.getElementById("ticsChange");
    if (el) {
      el.textContent = `${pct>0?'+':''}${pct.toFixed(2)}%`;
      el.parentElement && (el.parentElement.style.color = pct >= 0 ? "#22c55e" : "#ef4444");
    }
  } catch(e) {
    console.warn("price update failed:", e);
  }
}

// --- Uptime from Ticsscan (preferred) or fallback computed (last 100 blocks) ---
async function updateUptime() {
  // Preferred remote API (fill CONFIG.UPTIME_URL). Expect fields: uptime (0..1), missed, proposed/signed
  if (CONFIG.UPTIME_URL) {
    try {
      const u = await fetchJSON(CONFIG.UPTIME_URL);
      const up = (Number(u.uptime) * (u.uptime <= 1 ? 100 : 1)).toFixed(2); // handle 0..1 or %
      setText("uptimePercent", `${up}%`);
      if (typeof u.proposed !== "undefined") setText("signedBlocks", formatNum(Number(u.proposed)));
      return;
    } catch(e) {
      console.warn("remote uptime failed, using fallback:", e);
    }
  }
  // Fallback: estimate over last 100 blocks via /block (heavy but works once)
  try {
    const status = await fetchJSON(`${CONFIG.RPC_URL}/status`);
    const latest = Number(status.result.sync_info.latest_block_height);
    const valconsHex = CONFIG.VALCONS_HEX.toLowerCase();
    let signed = 0;
    const sample = 100;
    // Fetch a subset to limit load
    const heights = Array.from({length: sample}, (_,i)=> latest - i);
    for (const h of heights) {
      try {
        const b = await fetchJSON(`${CONFIG.RPC_URL}/block?height=${h}`);
        const sigs = b.result.block.last_commit.signatures || [];
        const ok = sigs.some(s => (s.validator_address||"").toLowerCase() === valconsHex);
        if (ok) signed++;
      } catch {}
    }
    const pct = (signed / sample) * 100;
    setText("uptimePercent", `${pct.toFixed(2)}%`);
    setText("signedBlocks", formatNum(signed));
  } catch(e) {
    console.warn("fallback uptime failed:", e);
  }
}

function init() {
  updateBlocks();
  updateValidator();
  updatePrice();
  updateUptime();
  setInterval(updateBlocks, 5000);
  setInterval(updateValidator, CONFIG.REFRESH_MS);
  setInterval(updatePrice, CONFIG.REFRESH_MS);
  setInterval(updateUptime, CONFIG.REFRESH_MS * 3);
}

document.addEventListener("DOMContentLoaded", init);
