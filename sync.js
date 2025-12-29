// === QubeNode Live Sync Script v3.1 ===
// GitHub Pages compatible - using reliable public CORS proxies
// v3.1: Multiple stable CORS proxies with smart fallback

console.log('🚀 QubeNode Sync v3.1 LOADED - GitHub Pages compatible');

const API_BASE = "https://swagger.qubetics.com";
const VALIDATOR = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";
const TICSSCAN_API = "https://v2.ticsscan.com/api/v2";

// Validator addresses
const VALCONS_ADDR = "qubeticsvalcons1dlmj5pzg3fv54nrtejnfxmrj08d7qs09xjp2eu";
const VAL_HEX_ADDR = "0x6FF72A04488A594ACC6BCCA6936C7279DBE041E5";
const VAL_ACCOUNT_ADDR = "qubetics1tzk9f84cv2gmk3du3m9dpxcuph70sfj6ltvqjf";

// Global variables
let currentBlockTime = 5.87;
let blockAnimationInterval = null;
let lastBlockHeight = null;
let lastWorkingProxy = null; // Запам'ятовуємо робочий проксі

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

// === BLOCK HEIGHT ===
async function updateBlockHeight() {
  const el = document.getElementById("currentBlock");
  if (!el) return;
  
  const endpoints = [
    'https://swagger.qubetics.com/cosmos/base/tendermint/v1beta1/blocks/latest',
    'https://tendermint.qubetics.com/abci_info'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const data = await fetchJSON(endpoint);
      
      let blockHeight = null;
      
      if (data?.result?.response?.last_block_height) {
        blockHeight = data.result.response.last_block_height;
      }
      else if (data?.block?.header?.height) {
        blockHeight = data.block.header.height;
      }
      else if (data?.result?.sync_info?.latest_block_height) {
        blockHeight = data.result.sync_info.latest_block_height;
      }
      
      if (blockHeight) {
        const blockNum = parseInt(blockHeight);
        el.textContent = blockNum.toLocaleString('en-US');
        
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
    const url = `${API_BASE}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=300`;
    const data = await fetchJSON(url);
    
    if (!data?.validators || !Array.isArray(data.validators)) {
      el.textContent = "--";
      return;
    }

    const validators = data.validators.sort((a, b) => {
      const tokensA = parseFloat(a.tokens || "0");
      const tokensB = parseFloat(b.tokens || "0");
      return tokensB - tokensA;
    });

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
  
  const tokensString = v.tokens.toString();
  
  let millions;
  
  if (tokensString.length > 21) {
    millions = parseInt(tokensString.slice(0, -21));
  } else if (tokensString.length === 21) {
    millions = parseInt(tokensString[0]);
  } else {
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
    
    const formatted = millions.toLocaleString('en-US') + " M";
    const textNode = document.createTextNode(formatted);
    powerEl.appendChild(textNode);
    
    console.log('✅ DELEGATED AMOUNT:', formatted, '| Raw tokens:', tokensString, '| Millions:', millions);
  }
}

// === DELEGATORS COUNT ===
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

// === INFLATION ===
async function updateInflation() {
  const url = `${API_BASE}/cosmos/mint/v1beta1/inflation`;
  const data = await fetchJSON(url);
  const el = document.getElementById("inflationRate");
  if (!data?.inflation || !el) return;
  el.textContent = (parseFloat(data.inflation) * 100).toFixed(2) + "%";
}

// === VALIDATOR UPTIME ===
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

    if (entry && params?.params?.signed_blocks_window) {
      const missed = parseInt(entry.missed_blocks_count || "0");
      const window = parseInt(params.params.signed_blocks_window);
      const signed = window - missed;
      const uptime = (signed / window) * 100;
      el.textContent = uptime.toFixed(2) + "%";
      console.log(`✅ Validator uptime: ${uptime.toFixed(2)}% (${signed}/${window} blocks, missed: ${missed})`);
    } else {
      el.textContent = "100.00%";
    }
  } catch (e) {
    console.error("Uptime fetch error:", e);
    el.textContent = "—";
  }
}

// === TICS PRICE FROM MEXC (Smart proxy fallback) ===
async function updateTicsPrice() {
  const priceEl = document.getElementById("ticsPrice");
  const changeEl = document.getElementById("ticsChange");
  
  if (!priceEl || !changeEl) {
    console.warn('⚠️ Price elements not found');
    return;
  }

  console.log('🔄 Fetching TICS price from MEXC...');
  
  const mexcUrl = "https://api.mexc.com/api/v3/ticker/24hr?symbol=TICSUSDT";
  
  // Список надійних CORS проксі (від найкращих до запасних)
  const corsProxies = [
    { url: "https://api.allorigins.win/raw?url=", name: "AllOrigins" },
    { url: "https://corsproxy.io/?", name: "CorsProxy.io" },
    { url: "https://proxy.cors.sh/", name: "CORS.sh" },
    { url: "https://api.codetabs.com/v1/proxy?quest=", name: "CodeTabs" }
  ];
  
  // Якщо є збережений робочий проксі - пробуємо його першим
  if (lastWorkingProxy) {
    corsProxies.unshift(lastWorkingProxy);
  }
  
  // Пробуємо кожен проксі
  for (let i = 0; i < corsProxies.length; i++) {
    const proxy = corsProxies[i];
    
    try {
      const proxiedUrl = proxy.url + encodeURIComponent(mexcUrl);
      
      console.log(`🔄 Attempt ${i + 1}/${corsProxies.length}: ${proxy.name}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 секунд timeout
      
      const response = await fetch(proxiedUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`❌ ${proxy.name}: HTTP ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      console.log('📊 MEXC response:', data);
      
      if (data && data.lastPrice) {
        const price = parseFloat(data.lastPrice);
        const change24h = parseFloat(data.priceChangePercent);
        
        priceEl.textContent = "$" + price.toFixed(5);
        const changeText = (change24h >= 0 ? "+" : "") + change24h.toFixed(2) + "%";
        changeEl.textContent = changeText;
        
        const changeValue = changeEl.parentElement;
        changeValue.style.color = change24h >= 0 ? "#22c55e" : "#ef4444";
        
        // Update calculator price
        if (typeof updateCalculatorPrice === 'function') {
          updateCalculatorPrice(price);
        }
        
        // Зберігаємо робочий проксі для наступних разів
        lastWorkingProxy = proxy;
        
        console.log(`✅ TICS price: $${price.toFixed(5)} (${changeText}) - via ${proxy.name}`);
        return; // SUCCESS
      }
      
      console.warn(`⚠️ ${proxy.name} returned data without lastPrice`);
      
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn(`⏱️ ${proxy.name} timeout (6s)`);
      } else {
        console.warn(`❌ ${proxy.name} error:`, e.message);
      }
    }
  }
  
  // Всі спроби провалилися
  console.error('❌ All MEXC price fetch attempts failed');
  priceEl.textContent = "--";
  changeEl.textContent = "--";
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
  
  const existingBlock = wrapper.querySelector('.chain-block');
  const blockWidth = existingBlock ? existingBlock.offsetWidth : 6;
  
  const block = createBlock(true);
  block.style.width = blockWidth + 'px';
  wrapper.appendChild(block);
  
  console.log('✅ Block element created with .fresh class at the END (right side)');
  
  setTimeout(() => {
    block.classList.remove('fresh');
    console.log('⚪ .fresh class removed after 600ms');
  }, 600);
  
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
  
  container.innerHTML = '';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'blocks-track-inline';
  container.appendChild(wrapper);
  
  const isMobile = window.innerWidth <= 768;
  let containerWidth;
  let blocksCount;
  let blockWidth;
  let gapWidth;
  
  if (isMobile) {
    containerWidth = container.offsetWidth || (window.innerWidth - 40);
    blocksCount = 30;
    
    gapWidth = 3;
    const totalGapsWidth = (blocksCount - 1) * gapWidth;
    blockWidth = Math.floor((containerWidth - totalGapsWidth) / blocksCount);
    
    if (blockWidth < 4) {
      blockWidth = 4;
      blocksCount = Math.floor(containerWidth / (blockWidth + gapWidth));
    }
  } else {
    containerWidth = container.offsetWidth || 800;
    blockWidth = 6;
    gapWidth = 8;
    const totalBlockSpace = blockWidth + gapWidth;
    blocksCount = Math.floor(containerWidth / totalBlockSpace);
  }
  
  console.log(`📊 Container: ${containerWidth}px, Block: ${blockWidth}px, Gap: ${gapWidth}px, Count: ${blocksCount} (${isMobile ? 'MOBILE' : 'DESKTOP'}, screenWidth: ${window.innerWidth}px)`);
  
  for (let i = 0; i < blocksCount; i++) {
    const block = createBlock(false);
    block.style.width = blockWidth + 'px';
    wrapper.appendChild(block);
  }
  
  console.log(`✅ Block animation initialized with ${blocksCount} blocks`);
}

// === MASTER UPDATE ===
async function updateAll() {
  console.log("🔄 QubeNode sync running…");
  
  await Promise.all([
    updateBlockHeight(),
    updateAverageBlockTime(),
    updateValidatorCore(),
    updateValidatorRank(),
    updateDelegators(),
    updateInflation(),
    updateUptime(),
    updateTicsPrice()
  ]);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 QubeNode Sync v3.1 initialized - GitHub Pages compatible');
  
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
  
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateValidatorCore();
    }, 250);
  });
  
  const isMobile = window.innerWidth <= 768;
  const initDelay = isMobile ? 300 : 100;
  
  setTimeout(() => {
    initBlockAnimation();
    updateAll();
  }, initDelay);
  
  setInterval(updateBlockHeight, 3000);
  
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

// Reinitialize on resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    console.log('🔄 Reinitializing blocks on resize');
    initBlockAnimation();
  }, 300);
});
