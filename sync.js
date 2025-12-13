// === QubeNode Live Sync Script v2.9.1 ===
// Includes: validator info, delegators, inflation, uptime, validator rank, TICS price from MEXC
// v2.9.1: Mobile blocks optimized for 85% width - 25 blocks
// New commission text: "Від 30% APY → 28.5% ваш дохід"
// Rank format: "#7" (only position, "by voting power")

console.log('🚀 QubeNode Sync v2.9.1 LOADED - 25 blocks for mobile (85% width)');

const API_BASE = "https://swagger.qubetics.com";
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
    'https://swagger.qubetics.com/cosmos/base/tendermint/v1beta1/blocks/latest',
    'https://tendermint.qubetics.com/abci_info'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const data = await fetchJSON(endpoint);
      
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
  
  // v.tokens приходить у форматі uTICS (micro TICS) як STRING  
  // Приклад: "10758095273067618117969514" (26 цифр)
  // Щоб отримати мільйони TICS: відрізаємо останні 21 цифру
  // 10758 M TICS = 10,758,000,000 TICS = 10,758,000,000,000,000 uTICS
  const tokensString = v.tokens.toString();
  
  let millions;
  
  if (tokensString.length > 21) {
    // Відрізаємо останні 21 цифру щоб отримати мільйони
    // "10758095273067618117969514" (26 цифр) -> slice(0, -21) -> "10758"
    millions = parseInt(tokensString.slice(0, -21));
  } else if (tokensString.length === 21) {
    // Рівно 21 цифра = менше 10 мільйонів
    millions = parseInt(tokensString[0]);
  } else {
    // Менше 21 цифри = менше 1 мільйона
    millions = 0;
  }
  
  console.log('🔍 DEBUG: tokensString =', tokensString, '| Length:', tokensString.length, '| Millions =', millions);

  const comEl = document.getElementById("commissionRate");
  const powerEl = document.getElementById("delegatedAmountContainer");

  if (comEl) comEl.textContent = commission.toFixed(1) + "%";
  if (powerEl) {
    powerEl.textContent = '';
    powerEl.innerHTML = '';
    
    while (powerEl.firstChild) {
      powerEl.removeChild(powerEl.firstChild);
    }
    
    // Форматуємо: 10758 -> "10,758 M"
    // Показуємо мільйони з комою після тисяч
    const formatted = millions.toLocaleString('en-US') + " M";
    const textNode = document.createTextNode(formatted);
    powerEl.appendChild(textNode);
    
    console.log('✅ DELEGATED AMOUNT:', formatted, '| Raw tokens:', tokensString, '| Millions:', millions);
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
      
      // Update calculator price
      if (typeof updateCalculatorPrice === 'function') {
        updateCalculatorPrice(price);
      }
      
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
  
  // Отримуємо ширину існуючих паличок
  const existingBlock = wrapper.querySelector('.chain-block');
  const blockWidth = existingBlock ? existingBlock.offsetWidth : 6;
  
  // Створюємо новий блок з підсвічуванням СПРАВА (в кінець)
  const block = createBlock(true);
  block.style.width = blockWidth + 'px'; // Встановлюємо ту саму ширину
  wrapper.appendChild(block); // Додаємо в кінець (справа)
  
  console.log('✅ Block element created with .fresh class at the END (right side)');
  
  // Видаляємо підсвічування через 600мс
  setTimeout(() => {
    block.classList.remove('fresh');
    console.log('⚪ .fresh class removed after 600ms');
  }, 600);
  
  // Видаляємо ПЕРШИЙ блок (зліва) щоб загальна кількість не змінювалася
  const firstBlock = wrapper.firstChild;
  if (firstBlock) {
    firstBlock.style.transition = 'opacity 0.3s ease';
    firstBlock.style.opacity = '0';
    setTimeout(() => {
      if (firstBlock.parentNode === wrapper) {
        wrapper.removeChild(firstBlock);
        console.log('🗑️ First block (left) removed');
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
  const isMobile = window.innerWidth <= 768;
  let containerWidth;
  let blocksCount;
  let blockWidth;
  let gapWidth;
  
  if (isMobile) {
    // МОБІЛЬНА ВЕРСІЯ: фіксована кількість паличок для всіх пристроїв
    containerWidth = container.offsetWidth || (window.innerWidth - 40);
    blocksCount = 30; // Оптимально для видимого вікна
    
    // Динамічно розраховуємо ширину паличку та gap щоб заповнити контейнер
    // Формула: containerWidth = (blocksCount × blockWidth) + ((blocksCount - 1) × gap)
    // Приймаємо gap = 3px (фіксований), розраховуємо blockWidth
    gapWidth = 3;
    const totalGapsWidth = (blocksCount - 1) * gapWidth;
    blockWidth = Math.floor((containerWidth - totalGapsWidth) / blocksCount);
    
    // Мінімальна ширина паличку - 4px
    if (blockWidth < 4) {
      blockWidth = 4;
      blocksCount = Math.floor(containerWidth / (blockWidth + gapWidth));
    }
  } else {
    // DESKTOP ВЕРСІЯ: заповнюємо всю ширину
    containerWidth = container.offsetWidth || 800;
    blockWidth = 6;
    gapWidth = 8;
    const totalBlockSpace = blockWidth + gapWidth;
    blocksCount = Math.floor(containerWidth / totalBlockSpace);
  }
  
  console.log(`📊 Container: ${containerWidth}px, Block: ${blockWidth}px, Gap: ${gapWidth}px, Count: ${blocksCount} (${isMobile ? 'MOBILE' : 'DESKTOP'}, screenWidth: ${window.innerWidth}px)`);
  
  // ЗАПОВНЮЄМО паличками
  for (let i = 0; i < blocksCount; i++) {
    const block = createBlock(false);
    block.style.width = blockWidth + 'px'; // Встановлюємо динамічну ширину
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

