// === QubeNode Live Sync Script v2.3 ===
// Includes: validator info, accurate delegators count, inflation, uptime %, block chain feed

const API_BASE = "https://swagger.qubetics.com";
const RPC_BASE = "https://rpc.qubenode.space";
const API_KEY = "qubenode_94Fh29sd8GvP!";
const VALIDATOR = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";

// Universal JSON fetch helper
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

// === DELEGATORS COUNT (accurate total) ===
async function updateDelegators() {
  const url = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}/delegations?pagination.count_total=true`;
  const data = await fetchJSON(url);
  const el = document.getElementById("delegatorsCount");

  if (data?.pagination?.total && el) {
    el.textContent = data.pagination.total;
  } else if (el) {
    el.textContent = data?.delegation_responses?.length || "—";
  }
}

// === INFLATION (network metric) ===
async function updateInflation() {
  const url = `${API_BASE}/cosmos/mint/v1beta1/inflation`;
  const data = await fetchJSON(url);
  const el = document.getElementById("inflationRate");
  if (!data?.inflation || !el) return;
  el.textContent = (parseFloat(data.inflation) * 100).toFixed(2) + "%";
}

// === VALIDATOR UPTIME (%) ===
async function updateUptime() {
  const el = document.getElementById("uptimeValue");
  if (!el) return;

  const explorerUrl = `https://v2.ticsscan.com/api/uptime/${VALIDATOR}`;
  let data = await fetchJSON(explorerUrl);

  if (data?.uptime) {
    el.textContent = data.uptime + "%";
    return;
  }

  const url = `${API_BASE}/cosmos/slashing/v1beta1/signing_infos`;
  const info = await fetchJSON(url);
  const item = info?.info?.find((v) => v.address?.includes(VALIDATOR.slice(0, 15)));

  if (item && item.signed_blocks_window && item.missed_blocks_counter) {
    const total = parseFloat(item.signed_blocks_window);
    const missed = parseFloat(item.missed_blocks_counter);
    const uptime = ((total - missed) / total) * 100;
    el.textContent = uptime.toFixed(2) + "%";
  } else {
    el.textContent = "—";
  }
}

// === LATEST BLOCKS (visual chain) ===
async function updateBlocksChain() {
  const container = document.getElementById("blockChain");
  if (!container) return;

  const url = "https://v2.ticsscan.com/api/blocks?limit=10";
  const data = await fetchJSON(url);

  if (!data || !Array.isArray(data)) {
    container.innerHTML = "<span>—</span>";
    return;
  }

  container.innerHTML = data
    .slice(0, 10)
    .map(
      (b) => `
        <div class="block-item">
          <span class="block-height">#${b.height}</span>
          <span class="block-time">${new Date(b.timestamp).toLocaleTimeString("uk-UA", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          })}</span>
        </div>`
    )
    .join("");
}

// === MASTER UPDATE ===
async function updateAll() {
  console.log("🔄 QubeNode sync running…");
  await Promise.all([
    updateBlockHeight(),
    updateValidatorCore(),
    updateDelegators(),
    updateInflation(),
    updateBlocksChain(),
    updateUptime()
  ]);
}

// first run & schedule
updateAll();
setInterval(updateAll, 15000);

// === UPTIME (last 100k blocks via slashing API) ===
const VALCONS_ADDR = "qubeticsvalcons1dlmj5pzg3fv54nrtejnfxmrj08d7qs09xjp2eu";

async function updateUptime() {
  const el = document.getElementById("uptimePercent");
  if (!el) return;

  try {
    const infoUrl = `${API_BASE}/cosmos/slashing/v1beta1/signing_infos?pagination.limit=1000`;
    const paramsUrl = `${API_BASE}/cosmos/slashing/v1beta1/params`;

    const [info, params] = await Promise.all([
      fetchJSON(infoUrl),
      fetchJSON(paramsUrl)
    ]);

    const list = info?.signing_infos || info?.info || [];

    const entry = Array.isArray(list)
      ? list.find(i => i.address === VALCONS_ADDR || i.cons_address === VALCONS_ADDR || i.valcons_address === VALCONS_ADDR)
      : null;

    if (!entry || !params?.params) {
      el.textContent = "--";
      return;
    }

    const missed = parseInt(entry.missed_blocks_counter ?? entry.missed_blocks ?? "0", 10);
    const windowSize = parseInt(params.params.signed_blocks_window ?? params.params.signed_blocks_window_size ?? "100000", 10) || 100000;

    let uptime = 100;
    if (windowSize > 0 && !Number.isNaN(missed)) {
      uptime = ((windowSize - missed) / windowSize) * 100;
    }

    if (Number.isFinite(uptime)) {
      el.textContent = uptime.toFixed(2) + "%";
    } else {
      el.textContent = "--";
    }
  } catch (e) {
    console.error("Uptime fetch error:", e);
    el.textContent = "--";
  }
}

updateUptime();
setInterval(updateUptime, 60000);
