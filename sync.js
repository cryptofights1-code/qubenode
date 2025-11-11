// === QubeNode Live Sync Script v2.5 ===
// Includes: validator info, delegators count, inflation, uptime, block time, visual blocks

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

// === VALIDATOR CORE INFO ===
async function updateValidatorCore() {
  const url = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}`;
  const data = await fetchJSON(url);
  if (!data?.validator) return;

  const v = data.validator;
  const commission = parseFloat(v.commission.commission_rates.rate) * 100;
  const tokens = Math.round(parseFloat(v.tokens) / 1_000_000); // Округлюємо до цілого

  const comEl = document.getElementById("commissionRate");
  const powerEl = document.getElementById("delegatedAmount");

  if (comEl) comEl.textContent = commission.toFixed(1) + "%";
  if (powerEl) powerEl.textContent = tokens.toLocaleString("en-US", { maximumFractionDigits: 0 }); // БЕЗ дробових
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

// === SIGNED BLOCKS (total blocks validated by validator) ===
async function updateSignedBlocks() {
  const el = document.getElementById("signedBlocks");
  if (!el) return;

  try {
    // Спроба 1: TicsScan Blockscout API - пробуємо різні адреси
    const addressesToTry = [
      VAL_HEX_ADDR,           // 0x6FF72A04488A594ACC6BCCA6936C7279DBE041E5
      VALCONS_ADDR,           // qubeticsvalcons1dlmj5pzg3fv54nrtejnfxmrj08d7qs09xjp2eu
      VAL_ACCOUNT_ADDR        // qubetics1tzk9f84cv2gmk3du3m9dpxcuph70sfj6ltvqjf
    ];
    
    for (const address of addressesToTry) {
      try {
        // Використовуємо правильний endpoint для Blockscout v2
        const blocksUrl = `https://v2.ticsscan.com/api/addresses/${address}/blocks-validated`;
        const blocksData = await fetchJSON(blocksUrl);
        
        if (blocksData && blocksData.items && Array.isArray(blocksData.items)) {
          const count = blocksData.items.length;
          
          if (count > 0) {
            // Якщо є next_page_params - значить блоків більше
            // Показуємо count+ щоб вказати що це не все
            const displayText = blocksData.next_page_params 
              ? count.toLocaleString("en-US") + "+" 
              : count.toLocaleString("en-US");
            
            el.textContent = displayText;
            console.log(`✅ Signed blocks from TicsScan (${address}):`, count);
            return;
          }
        }
      } catch (e) {
        console.warn(`TicsScan API failed for ${address}:`, e.message);
      }
    }

    // Спроба 2: Через Cosmos Slashing API
    const infoUrl = `${API_BASE}/cosmos/slashing/v1beta1/signing_infos?pagination.limit=1000`;
    const info = await fetchJSON(infoUrl);
    
    const list = info?.signing_infos || info?.info || [];
    const entry = Array.isArray(list)
      ? list.find(i => i.address === VALCONS_ADDR || i.cons_address === VALCONS_ADDR || i.valcons_address === VALCONS_ADDR)
      : null;

    if (entry) {
      const indexOffset = parseInt(entry.index_offset ?? entry.start_height ?? "0", 10);
      const missedBlocks = parseInt(entry.missed_blocks_counter ?? entry.missed_blocks ?? "0", 10);
      
      if (indexOffset > 0) {
        const signedBlocks = Math.max(0, indexOffset - missedBlocks);
        el.textContent = signedBlocks.toLocaleString("en-US");
        console.log('✅ Signed blocks from Slashing API:', signedBlocks);
        return;
      }
    }

    // Якщо нічого не працює
    el.textContent = "--";
    console.warn('⚠️ Signed blocks data unavailable from all sources');
    
  } catch (e) {
    console.error("Signed blocks fetch error:", e);
    el.textContent = "--";
  }
}

// === TICS PRICE FROM MEXC ===
async function updateTicsPrice() {
  const priceEl = document.getElementById("ticsPrice");
  const changeEl = document.getElementById("ticsChange");
  
  if (!priceEl || !changeEl) return;

  try {
    // MEXC API для TICS/USDT (підтверджено що працює!)
    const mexcUrl = "https://api.mexc.com/api/v3/ticker/24hr?symbol=TICSUSDT";
    const data = await fetchJSON(mexcUrl);
    
    if (data && data.lastPrice) {
      const price = parseFloat(data.lastPrice);
      const change24h = parseFloat(data.priceChangePercent);
      
      // Форматуємо ціну
      priceEl.textContent = "$" + price.toFixed(6);
      
      // Форматуємо зміну з кольором
      const changeText = (change24h >= 0 ? "+" : "") + change24h.toFixed(2) + "%";
      changeEl.textContent = changeText;
      
      // Змінюємо колір в залежності від зміни
      const changeValue = changeEl.parentElement;
      changeValue.style.color = change24h >= 0 ? "#22c55e" : "#ef4444";
      
      console.log(`✅ TICS price from MEXC: $${price.toFixed(6)} (${changeText})`);
      return;
    }
    
    // Fallback якщо MEXC не відповідає
    console.warn('⚠️ MEXC API returned empty data');
    priceEl.textContent = "--";
    changeEl.textContent = "--";
    
  } catch (e) {
    console.error("TICS price fetch error:", e);
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
  
  // Створюємо новий блок з підсвічуванням
  const block = createBlock(true);
  wrapper.appendChild(block);
  
  // Видаляємо підсвічування через 800мс
  setTimeout(() => {
    block.classList.remove('fresh');
  }, 800);
  
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
  // Ширина контейнера мінус padding
  const containerWidth = container.offsetWidth || 800; // fallback 800px
  const blockWidth = window.innerWidth <= 768 ? 5 : 6; // 5px на мобільних, 6px на desktop
  const gapWidth = window.innerWidth <= 768 ? 6 : 8; // 6px на мобільних, 8px на desktop
  const totalBlockSpace = blockWidth + gapWidth;
  
  // Кількість паличок = ширина контейнера / простір на паличку
  const blocksCount = Math.floor(containerWidth / totalBlockSpace);
  
  console.log(`📊 Container: ${containerWidth}px, Block: ${blockWidth}px, Gap: ${gapWidth}px, Count: ${blocksCount}`);
  
  // ЗАПОВНЮЄМО ВСЕ ВІКНО паличками відразу
  for (let i = 0; i < blocksCount; i++) {
    const block = createBlock(false);
    wrapper.appendChild(block);
  }
  
  console.log(`✅ Block animation initialized with ${blocksCount} blocks (${window.innerWidth <= 768 ? 'MOBILE' : 'DESKTOP'})`);
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
    updateUptime(),
    updateSignedBlocks(),     // Нова функція - кількість підписаних блоків
    updateTicsPrice()         // Нова функція - ціна TICS з MEXC
  ]);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 QubeNode Sync v2.5 initialized');
  
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
    updateDelegators();
    updateInflation();
    updateUptime();
    updateSignedBlocks();
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

