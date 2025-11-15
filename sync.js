// === QubeNode Live Sync Script v2.7.1 ===
// Includes: validator info, delegators, inflation, uptime, validator rank, TICS price from MEXC
// v2.7.1: Final card layout - Uptime before Rank, APY before Commission
// New commission text: "Від 30% APY → 28.5% ваш дохід"
// Rank format: "#7" (only position, "by voting power")

const API_BASE = "https://swagger.qubetics.com";
const RPC_BASE = "https://rpc.qubenode.space";
const API_KEY = "qubenode_94Fh29sd8GvP!";
const VALIDATOR = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";
const TICSSCAN_API = "https://v2.ticsscan.com/api/v2";

// Validator addresses
const VALCONS_ADDR = "qubeticsvalcons1dlmj5pzg3fv54nrtejnfxmrj08d7qs09xjp2eu"; // Signer/Consensus
const VAL_HEX_ADDR = "0x6FF72A04488A594ACC6BCCA6936C7279DBE041E5"; // Hex address with 0x prefix
const VAL_ACCOUNT_ADDR = "qubetics1tzk9f84cv2gmk3du3m9dpxcuph70sfj6ltvqjf"; // Account address

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

// === VALIDATOR RANK ===
async function updateValidatorRank() {
  const el = document.getElementById("validatorRank");
  if (!el) return;

  try {
    // Отримуємо всіх активних валідаторів
    const url = `${API_BASE}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=300`;
    const data = await fetchJSON(url);
    
    if (!data?.validators || !Array.isArray(data.validators)) {
      el.textContent = "--";
      return;
    }

    // Сортуємо валідаторів за кількістю токенів (від більшого до меншого)
    const validators = data.validators.sort((a, b) => {
      const tokensA = parseFloat(a.tokens || "0");
      const tokensB = parseFloat(b.tokens || "0");
      return tokensB - tokensA;
    });

    // Знаходимо позицію QubeNode
    const rank = validators.findIndex(v => v.operator_address === VALIDATOR) + 1;
    const total = validators.length;

    if (rank > 0) {
      el.textContent = `#${rank}`;
      console.log(`✅ Validator rank: #${rank} out of ${total} (by voting power)`);
    } else {
      el.textContent = "--";
      console.warn('⚠️ QubeNode not found in validators list');
    }
  } catch (e) {
    console.error("Validator rank fetch error:", e);
    el.textContent = "--";
  }
}

// === VALIDATOR CORE INFO ===
async function updateValidatorCore() {
  const url = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}`;
  const data = await fetchJSON(url);
  if (!data?.validator) return;

  const v = data.validator;
  const commission = parseFloat(v.commission.commission_rates.rate) * 100;
  const uTokens = parseFloat(v.tokens);
  const tics = uTokens / 1_000_000;
  const millionsValue = tics / 1_000_000;
  const comEl = document.getElementById("commissionRate");
  const powerEl = document.getElementById("delegatedAmountContainer");
  if (comEl) comEl.textContent = commission.toFixed(1) + "%";
  if (powerEl) {
    const formatted = millionsValue.toFixed(3) + " M";
    powerEl.textContent = formatted;
  }
  }
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

// === TICS PRICE FROM MEXC (with CORS proxy) ===
async function updateTicsPrice() {
  const priceEl = document.getElementById("ticsPrice");
  const changeEl = document.getElementById("ticsChange");
  
  if (!priceEl || !changeEl) {
    console.warn('⚠️ Price elements not found');
    return;
  }

  try {
    console.log('🔄 Fetching TICS price from MEXC...');
    
    // MEXC API з CORS proxy
    // Варіант 1: Через публічний CORS proxy
    const corsProxy = "https://corsproxy.io/?";
    const mexcUrl = "https://api.mexc.com/api/v3/ticker/24hr?symbol=TICSUSDT";
    const proxiedUrl = corsProxy + encodeURIComponent(mexcUrl);
    
    const data = await fetchJSON(proxiedUrl);
    
    console.log('📊 MEXC response:', data);
    
    if (data && data.lastPrice) {
      const price = parseFloat(data.lastPrice);
      const change24h = parseFloat(data.priceChangePercent);
      
      priceEl.textContent = "$" + price.toFixed(5); // 5 знаків замість 6
      const changeText = (change24h >= 0 ? "+" : "") + change24h.toFixed(2) + "%";
      changeEl.textContent = changeText;
      
      const changeValue = changeEl.parentElement;
      changeValue.style.color = change24h >= 0 ? "#22c55e" : "#ef4444";
      
      console.log(`✅ TICS price: $${price.toFixed(5)} (${changeText})`);
      return;
    }
    
    console.error('❌ MEXC returned data without lastPrice');
    priceEl.textContent = "--";
    changeEl.textContent = "--";
    
  } catch (e) {
    console.error("❌ TICS price error:", e.message);
    console.error("Full error:", e);
    priceEl.textContent = "--";
    changeEl.textContent = "--";
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
  
  console.log('🟢 NEW BLOCK ANIMATION TRIGGERED!');
  
  // Створюємо новий блок з підсвічуванням
  const block = createBlock(true);
  wrapper.appendChild(block);
  
  console.log('✅ Block element created with .fresh class');
  
  // Видаляємо підсвічування через 600мс (швидка анімація)
  setTimeout(() => {
    block.classList.remove('fresh');
    console.log('⚪ .fresh class removed after 600ms');
  }, 600);
  
  // Видаляємо перший блок (зліва) щоб загальна кількість не змінювалася
  const firstBlock = wrapper.firstChild;
  if (firstBlock) {
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
  
  // Розраховуємо скільки паличок поміститься
  // На мобільних беремо повну ширину екрану мінус padding контейнера
  const isMobile = window.innerWidth <= 768;
  let containerWidth;
  
  if (isMobile) {
    // На мобільних: ширина екрану мінус padding контейнера + padding блоку
    // Агресивно зменшуємо відступ для максимальної кількості паличок
    containerWidth = window.innerWidth - 35; // Було 50, тепер 35
  } else {
    // На desktop: реальна ширина контейнера
    containerWidth = container.offsetWidth || 800;
  }
  
  const blockWidth = isMobile ? 7 : 6; // Трохи тонші (було 8)
  const gapWidth = isMobile ? 3 : 8;   // Менший gap (було 4)
  const totalBlockSpace = blockWidth + gapWidth;
  
  // Кількість паличок = ширина контейнера / простір на паличку
  let blocksCount = Math.floor(containerWidth / totalBlockSpace);
  if (isMobile) { blocksCount = Math.max(1, blocksCount - 1); }
  
  console.log(`📊 Container: ${containerWidth}px, Block: ${blockWidth}px, Gap: ${gapWidth}px, Count: ${blocksCount} (${isMobile ? 'MOBILE' : 'DESKTOP'})`);
  
  // ЗАПОВНЮЄМО ВСЕ ВІКНО паличками відразу
  for (let i = 0; i < blocksCount; i++) {
    const block = createBlock(false);
    wrapper.appendChild(block);
  }
  
  console.log(`✅ Block animation initialized with ${blocksCount} blocks`);
}

// === MASTER UPDATE ===
async function updateAll() {
  console.log("🔄 QubeNode sync running…");
  
  // Оновлюємо дані паралельно
  await Promise.all([
    updateBlockHeight(),      // Оновлює номер блоку кожні 3 секунди
    updateAverageBlockTime(), // Оновлює Avg Block Time кожні 15 секунд
    updateValidatorCore(),
    updateValidatorRank(),    // Нова функція - Rank валідатора
    updateDelegators(),
    updateInflation(),
    updateUptime(),
    updateTicsPrice()         // Ціна TICS з MEXC
  ]);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 QubeNode Sync v2.5 initialized');
  
  // БЛОКУЄМО всі ::before та ::after для stat-value
  const style = document.createElement('style');
  style.textContent = `
    #delegatedAmountContainer,
    #delegatedAmountContainer *,
    .stat-value,
    .stat-value * {
      display: inline !important;
    }
    #delegatedAmountContainer::before,
    #delegatedAmountContainer::after,
    .stat-value::before,
    .stat-value::after {
      content: none !important;
      display: none !important;
    }
  `;
  document.head.appendChild(style);
  
  // Оновлюємо формат при зміні розміру вікна
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateValidatorCore();
    }, 250);
  });
  
  // Даємо браузеру час для розрахунку розмірів контейнера
  // На мобільних потрібно більше часу
  const isMobile = window.innerWidth <= 768;
  const initDelay = isMobile ? 300 : 100;
  
  setTimeout(() => {
    initBlockAnimation();
    updateAll();
  }, initDelay);
  
  // Оновлюємо номер блоку частіше (кожні 3 секунди)
  setInterval(updateBlockHeight, 3000);
  
  // Оновлюємо всі інші дані рідше (кожні 15 секунд)
  setInterval(() => {
    updateAverageBlockTime();
    updateValidatorCore();
    updateValidatorRank();
    updateDelegators();
    updateInflation();
    updateUptime();
    updateTicsPrice();
  }, 15000);
});

// Переініціалізація при зміні розміру вікна (для адаптації)
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    console.log('🔄 Reinitializing blocks on resize');
    initBlockAnimation();
  }, 300);
});