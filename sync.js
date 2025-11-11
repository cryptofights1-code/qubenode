// === QubeNode Live Sync Script v2.5 ===
// Includes: validator info, delegators count, inflation, uptime, block time, visual blocks

const API_BASE = "https://swagger.qubetics.com";
const RPC_BASE = "https://rpc.qubenode.space";
const API_KEY = "qubenode_94Fh29sd8GvP!";
const VALIDATOR = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";
const TICSSCAN_API = "https://v2.ticsscan.com/api/v2";

// Global variables
let currentBlockTime = 5.87; // Default value
let blockAnimationInterval = null;
let lastBlockHeight = null;

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

// === BLOCK HEIGHT (current block number) ===
async function updateBlockHeight() {
  const el = document.getElementById("currentBlock");
  if (!el) return;
  
  // Try different endpoints to get current block
  const endpoints = [
    'https://rpc.qubetics.com/abci_info',
    'https://swagger.qubetics.com/cosmos/base/tendermint/v1beta1/blocks/latest',
    `${RPC_BASE}/status`
  ];
  
  for (const endpoint of endpoints) {
    try {
      const headers = endpoint.includes('qubenode') ? { "X-API-KEY": API_KEY } : {};
      const data = await fetchJSON(endpoint, headers);
      
      // Parse different response formats
      let blockHeight = null;
      
      // Format 1: RPC abci_info
      if (data?.result?.response?.last_block_height) {
        blockHeight = data.result.response.last_block_height;
      }
      // Format 2: Cosmos SDK REST
      else if (data?.block?.header?.height) {
        blockHeight = data.block.header.height;
      }
      // Format 3: RPC status
      else if (data?.result?.sync_info?.latest_block_height) {
        blockHeight = data.result.sync_info.latest_block_height;
      }
      
      if (blockHeight) {
        const blockNum = parseInt(blockHeight);
        el.textContent = blockNum.toLocaleString('en-US');
        
        // Якщо блок змінився - додаємо нову паличку
        if (lastBlockHeight !== null && blockNum > lastBlockHeight) {
          addNewBlockVisual();
        }
        
        lastBlockHeight = blockNum;
        console.log('✅ Block height updated:', blockHeight);
        return;
      }
    } catch (err) {
      console.warn(`Failed to fetch from ${endpoint}:`, err.message);
    }
  }
  
  console.warn('⚠️ Could not fetch block height from any endpoint');
}

// === AVERAGE BLOCK TIME ===
async function updateAverageBlockTime() {
  const el = document.getElementById("avgBlockTime");
  if (!el) return;
  
  try {
    const data = await fetchJSON(`${TICSSCAN_API}/stats`);
    
    if (data?.average_block_time) {
      let blockTime = parseFloat(data.average_block_time);
      
      // Якщо значення більше 100, це мілісекунди - конвертуємо в секунди
      if (blockTime > 100) {
        blockTime = blockTime / 1000;
      }
      
      currentBlockTime = blockTime;
      el.textContent = blockTime.toFixed(2) + 's';
      console.log('✅ Average block time updated:', blockTime);
    }
  } catch (err) {
    console.warn('⚠️ Could not fetch average block time:', err);
    el.textContent = currentBlockTime.toFixed(2) + 's';
  }
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
  if (powerEl) powerEl.textContent = tokens.toLocaleString("en-US");
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

// === VISUAL BLOCK ANIMATION ===
function createBlock(isFresh = false) {
  const block = document.createElement('div');
  block.className = isFresh ? 'chain-block fresh' : 'chain-block';
  return block;
}

function addNewBlockVisual() {
  const container = document.getElementById('blocksChainInline');
  if (!container) return;
  
  const wrapper = container.querySelector('.blocks-track-inline');
  if (!wrapper) return;
  
  // Створюємо новий блок з підсвічуванням
  const block = createBlock(true);
  wrapper.appendChild(block);
  
  // Видаляємо підсвічування через 800мс
  setTimeout(() => {
    block.classList.remove('fresh');
  }, 800);
  
  // Видаляємо перший блок якщо їх більше 25
  if (wrapper.children.length > 25) {
    const firstBlock = wrapper.firstChild;
    firstBlock.style.transition = 'opacity 0.3s ease';
    firstBlock.style.opacity = '0';
    setTimeout(() => {
      if (firstBlock.parentNode === wrapper) {
        wrapper.removeChild(firstBlock);
      }
    }, 300);
  }
}

function initBlockAnimation() {
  const container = document.getElementById('blocksChainInline');
  if (!container) {
    console.warn('⚠️ Container blocksChainInline not found');
    return;
  }
  
  // Очищуємо контейнер
  container.innerHTML = '';
  
  // Створюємо wrapper для анімації
  const wrapper = document.createElement('div');
  wrapper.className = 'blocks-track-inline';
  container.appendChild(wrapper);
  
  // ВІДРАЗУ заповнюємо контейнер 20 паличками
  for (let i = 0; i < 20; i++) {
    const block = createBlock(false);
    wrapper.appendChild(block);
  }
  
  console.log('✅ Block animation initialized with 20 blocks');
}

// === MASTER UPDATE ===
async function updateAll() {
  console.log("🔄 QubeNode sync running…");
  
  // Оновлюємо дані паралельно
  await Promise.all([
    updateBlockHeight(),      // Оновлює номер блоку кожні 3 секунди
    updateAverageBlockTime(), // Оновлює Avg Block Time кожні 15 секунд
    updateValidatorCore(),
    updateDelegators(),
    updateInflation(),
    updateUptime()
  ]);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 QubeNode Sync v2.5 initialized');
  initBlockAnimation();
  updateAll();
  
  // Оновлюємо номер блоку частіше (кожні 3 секунди)
  setInterval(updateBlockHeight, 3000);
  
  // Оновлюємо всі інші дані рідше (кожні 15 секунд)
  setInterval(() => {
    updateAverageBlockTime();
    updateValidatorCore();
    updateDelegators();
    updateInflation();
    updateUptime();
  }, 15000);
});

