// === QubeNode Live Sync Script v3.0.4 ===
// Includes: validator info, delegators, inflation, uptime, validator rank, TICS price from MEXC
// v3.0.3: Added localStorage caching for circulating supply to prevent API rate limiting
// v3.0.4: Fixed TICS 24H change display - multiply by 100 and apply color to correct element

console.log('🚀 QubeNode Sync v3.0.4 LOADED - RPC Worker + Cloudflare Worker proxy + localStorage cache');

const API_BASE = "https://swagger.qubetics.com";
const VALIDATOR = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";
const TICSSCAN_API = "https://v2.ticsscan.com/api/v2";
const RPC_WORKER = "https://qubenode-rpc-proxy.yuskivvolodymyr.workers.dev";

// Validator addresses
const VALCONS_ADDR = "qubeticsvalcons1dlmj5pzg3fv54nrtejnfxmrj08d7qs09xjp2eu";
const VAL_HEX_ADDR = "0x6FF72A04488A594ACC6BCCA6936C7279DBE041E5";
const VAL_ACCOUNT_ADDR = "qubetics1tzk9f84cv2gmk3du3m9dpxcuph70sfj6ltvqjf";

// Global variables
let currentBlockTime = 5.87;
let blockAnimationInterval = null;
let lastBlockHeight = null;
let cachedCirculatingSupply = null;

// LocalStorage cache constants
const CACHE_KEY = 'qubenode_circulating_supply';
const CACHE_TIMESTAMP_KEY = 'qubenode_circulating_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

// Get cached circulating supply from localStorage
function getCachedCirculatingSupply() {
  try {
    const cachedValue = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (cachedValue && cachedTimestamp) {
      const now = Date.now();
      const age = now - parseInt(cachedTimestamp);
      
      if (age < CACHE_DURATION) {
        const value = parseFloat(cachedValue);
        console.log(`✅ Using cached Circulating Supply: ${value.toLocaleString()} TICS (age: ${Math.floor(age/1000)}s)`);
        return value;
      } else {
        console.log(`⏰ Cache expired (age: ${Math.floor(age/1000)}s), fetching fresh data`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Error reading cache:', error);
  }
  return null;
}

// Save circulating supply to localStorage
function saveCachedCirculatingSupply(value) {
  try {
    localStorage.setItem(CACHE_KEY, value.toString());
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    console.log(`💾 Cached Circulating Supply: ${value.toLocaleString()} TICS`);
  } catch (error) {
    console.warn('⚠️ Error saving cache:', error);
  }
}

// Fetch circulating supply with cache check
async function fetchCirculatingSupply(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCachedCirculatingSupply();
    if (cached) {
      cachedCirculatingSupply = cached;
      return cached;
    }
  }
  
  try {
    console.log('🔄 Fetching fresh Circulating Supply from pricebot...');
    const pricebotData = await fetchJSON('https://pricebot.ticslab.xyz/api/prices');
    
    if (pricebotData?.combined?.circulatingSupply) {
      const circulatingSupply = parseFloat(pricebotData.combined.circulatingSupply);
      cachedCirculatingSupply = circulatingSupply;
      saveCachedCirculatingSupply(circulatingSupply);
      console.log(`✅ Fresh Circulating Supply: ${circulatingSupply.toLocaleString()} TICS`);
      return circulatingSupply;
    }
  } catch (error) {
    console.error('❌ Pricebot fetch error:', error);
  }
  return null;
}

// Format large numbers with M/K suffix
function formatLargeNumber(num) {
  if (num >= 1000000) {
    const millions = num / 1000000;
    const truncated = Math.floor(millions * 1000) / 1000;
    return truncated.toFixed(3) + 'M';
  } else if (num >= 1000) {
    const thousands = num / 1000;
    const truncated = Math.floor(thousands * 1000) / 1000;
    return truncated.toFixed(3) + 'K';
  }
  return num.toLocaleString();
}

// === BLOCK HEIGHT (current block number) ===
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

// === TICS PRICE FROM MEXC (via Cloudflare Worker) ===
async function updateTicsPrice() {
  const priceEl = document.getElementById("ticsPrice");
  const changeEl = document.getElementById("ticsChange");
  const high24hEl = document.getElementById("ticsHigh24h");
  const low24hEl = document.getElementById("ticsLow24h");
  
  if (!priceEl && !changeEl && !high24hEl && !low24hEl) {
    return;
  }

  try {
    console.log('🔄 Fetching TICS price from MEXC via Cloudflare Worker...');
    
    const workerUrl = "https://tics-price.yuskivvolodymyr.workers.dev";
    const data = await fetchJSON(workerUrl);
    
    console.log('📊 MEXC response:', data);
    
    if (data && data.lastPrice) {
      const price = parseFloat(data.lastPrice);
      const change24h = parseFloat(data.priceChangePercent) * 100;  // ✅ FIX: Multiply by 100 (API returns decimal format)
      const high24h = parseFloat(data.highPrice);
      const low24h = parseFloat(data.lowPrice);
      
      if (priceEl) {
        priceEl.textContent = "$" + price.toFixed(5);
      }
      
      if (changeEl) {
        const changeText = (change24h >= 0 ? "+" : "") + change24h.toFixed(2) + "%";
        changeEl.textContent = changeText;
        // ✅ FIX: Apply color directly to changeEl, not parentElement
        changeEl.style.color = change24h >= 0 ? "#22c55e" : "#ef4444";
      }
      
      if (high24hEl && high24h) {
        high24hEl.textContent = "$" + high24h.toFixed(5);
      }
      
      if (low24hEl && low24h) {
        low24hEl.textContent = "$" + low24h.toFixed(5);
      }
      
      if (typeof updateCalculatorPrice === 'function') {
        updateCalculatorPrice(price);
      }
      
      console.log(`✅ TICS price: $${price.toFixed(5)} (${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%)`);
      return;
    }
    
    console.error('❌ MEXC returned data without lastPrice');
    if (priceEl) priceEl.textContent = "--";
    if (changeEl) changeEl.textContent = "--";
    if (high24hEl) high24hEl.textContent = "--";
    if (low24hEl) low24hEl.textContent = "--";
    
  } catch (e) {
    console.error("❌ TICS price error:", e.message);
    if (priceEl) priceEl.textContent = "--";
    if (changeEl) changeEl.textContent = "--";
    if (high24hEl) high24hEl.textContent = "--";
    if (low24hEl) low24hEl.textContent = "--";
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
    updateTicsPrice(),
    updateBlocksProposed(),
    updateSelfBonded(),
    updateNetworkShare(),
    updateNetworkStats(),
    updateMarketCap(),
    updateTotalSupply(),
    updateCirculationSupply(),
    updateTicsBurn(),
    updateAPY()
  ]);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 QubeNode Sync v3.0.3 initialized - localStorage cache enabled');
  
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
  
  // Load circulating supply from cache or API BEFORE updateAll
  const circulatingSupply = await fetchCirculatingSupply();
  if (circulatingSupply) {
    updateCirculationSupplyDisplay(circulatingSupply);
  }
  
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
    updateBlocksProposed();
    updateSelfBonded();
    updateNetworkShare();
    updateNetworkStats();
    updateMarketCap();
    updateTotalSupply();
    updateTicsBurn();
  }, 15000);
  
  // Refresh circulating supply every 5 minutes (with cache check)
  setInterval(async () => {
    const circulatingSupply = await fetchCirculatingSupply(true);
    if (circulatingSupply) {
      updateCirculationSupplyDisplay(circulatingSupply);
      await updateMarketCap();
    }
  }, 300000);
});

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    console.log('🔄 Reinitializing blocks on resize');
    initBlockAnimation();
  }, 300);
});

// ===== ABOUT PAGE ADDITIONAL FUNCTIONS =====
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(3) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(3) + 'K';
    return num.toLocaleString();
}

function formatAddress(address) {
    if (!address || address.length < 20) return address;
    return address.slice(0, 12) + '...' + address.slice(-6);
}

async function updateValidatorStatus() {
  const statusEl = document.getElementById("validatorStatus");
  if (!statusEl) return;
  
  try {
    const url = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}`;
    const data = await fetchJSON(url);
    
    if (data?.validator) {
      const validator = data.validator;
      
      if (validator.status === "BOND_STATUS_BONDED") {
        statusEl.textContent = "ACTIVE";
        statusEl.style.color = "#22c55e";
      } else if (validator.jailed) {
        statusEl.textContent = "JAILED";
        statusEl.style.color = "#ef4444";
      } else if (validator.status === "BOND_STATUS_UNBONDING") {
        statusEl.textContent = "UNBONDING";
        statusEl.style.color = "#fbbf24";
      } else {
        statusEl.textContent = "INACTIVE";
        statusEl.style.color = "#94a3b8";
      }
      
      console.log(`✅ Validator status: ${statusEl.textContent}`);
    }
  } catch (error) {
    console.error('❌ Error fetching validator status:', error);
  }
}

async function updateNetworkPeers() {
  const peerCountEl = document.getElementById("peerCount");
  if (!peerCountEl) return;
  
  try {
    const url = `${RPC_WORKER}/rpc/net_info`;
    const data = await fetchJSON(url);
    
    if (data?.result?.n_peers) {
      const totalPeers = parseInt(data.result.n_peers);
      peerCountEl.textContent = totalPeers;
      console.log(`✅ Network peers: ${totalPeers}`);
    }
  } catch (error) {
    console.error('❌ Error fetching network peers:', error);
  }
}

async function updateLatestDelegations() {
  const tableBody = document.getElementById("delegationsTable");
  if (!tableBody) return;

  try {
    const url = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}/delegations?pagination.limit=100&pagination.reverse=true`;
    const data = await fetchJSON(url);
    
    if (!data?.delegation_responses) return;

    const latestDelegations = data.delegation_responses.slice(0, 10);
    tableBody.innerHTML = '';
    
    latestDelegations.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'table-row';
      row.style.animationDelay = (index * 0.05) + 's';
      
      const delegator = item.delegation.delegator_address;
      const amountMicro = parseInt(item.balance.amount);
      const amountTICS = (amountMicro / 1000000000000000000).toFixed(1);
      
      const addressDiv = document.createElement('div');
      addressDiv.className = 'delegator-address';
      addressDiv.textContent = formatAddress(delegator);
      
      const amountDiv = document.createElement('div');
      amountDiv.className = 'delegation-amount';
      amountDiv.textContent = amountTICS + ' TICS';
      
      const timeDiv = document.createElement('div');
      timeDiv.className = 'delegation-time';
      timeDiv.textContent = 'recent';
      
      row.appendChild(addressDiv);
      row.appendChild(amountDiv);
      row.appendChild(timeDiv);
      
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching latest delegations:', error);
  }
}

async function updateBlocksProposed() {
  const blocksEl = document.getElementById("blocksProposed");
  if (!blocksEl) return;
  
  try {
    const url = `${RPC_WORKER}/blocks-proposed`;
    const data = await fetchJSON(url);
    
    if (data?.total_blocks_proposed) {
      const blocks = parseInt(data.total_blocks_proposed);
      blocksEl.textContent = blocks.toLocaleString();
      console.log(`✅ Blocks proposed: ${blocks.toLocaleString()}`);
    } else {
      blocksEl.textContent = "141,715";
    }
  } catch (error) {
    console.error('❌ Error fetching blocks proposed:', error);
    blocksEl.textContent = "141,715";
  }
}

async function updateSelfBonded() {
  const selfBondedEl = document.getElementById("selfBonded");
  if (!selfBondedEl) return;
  
  try {
    const delegationsUrl = 'https://swagger.qubetics.com/cosmos/staking/v1beta1/delegations/qubetics1tzk9f84cv2gmk3du3m9dpxcuph70sfj6ltvqjf';
    const response = await fetch(delegationsUrl);
    
    if (!response.ok) {
      console.error('❌ Self-Bonded API error:', response.status);
      return;
    }
    
    const data = await response.json();
    
    if (data?.delegation_responses && data.delegation_responses.length > 0) {
      const selfDelegation = data.delegation_responses.find(d => 
        d.delegation.validator_address === 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld'
      );
      
      if (selfDelegation) {
        const amountMicro = parseFloat(selfDelegation.balance.amount);
        const amountTICS = amountMicro / 1000000000000000000;
        
        selfBondedEl.textContent = formatLargeNumber(amountTICS) + ' TICS';
        console.log('✅ Self-Bonded:', amountTICS.toFixed(1), 'TICS');
      }
    }
  } catch (error) {
    console.error('❌ Self-Bonded error:', error);
  }
}

async function updateNetworkShare() {
  const networkShareEl = document.getElementById("networkShare");
  if (!networkShareEl) return;
  
  try {
    const validatorUrl = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}`;
    const poolUrl = `${API_BASE}/cosmos/staking/v1beta1/pool`;
    
    const [validatorData, poolData] = await Promise.all([
      fetchJSON(validatorUrl),
      fetchJSON(poolUrl)
    ]);
    
    if (validatorData?.validator && poolData?.pool) {
      const ourTokens = parseInt(validatorData.validator.tokens);
      const totalBonded = parseInt(poolData.pool.bonded_tokens);
      
      const ourStake = ourTokens / 1e18;
      const networkTotal = totalBonded / 1e18;
      const share = ((ourStake / networkTotal) * 100).toFixed(2);
      
      networkShareEl.textContent = share + '%';
      console.log(`✅ Network Share: ${share}%`);
    }
  } catch (error) {
    console.error('❌ Network Share error:', error);
  }
}

async function updateNetworkStats() {
  try {
    const poolUrl = `${API_BASE}/cosmos/staking/v1beta1/pool`;
    const validatorsUrl = `${API_BASE}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=300`;
    
    const [poolData, validatorsData] = await Promise.all([
      fetchJSON(poolUrl),
      fetchJSON(validatorsUrl)
    ]);
    
    const totalStakedEl = document.getElementById("totalStaked");
    if (totalStakedEl && poolData?.pool) {
      const totalBonded = parseInt(poolData.pool.bonded_tokens) / 1e18;
      totalStakedEl.textContent = formatLargeNumber(totalBonded);
      console.log(`✅ Total Staked: ${totalBonded.toLocaleString()} TICS`);
    }
    
    const activeValidatorsEl = document.getElementById("activeValidators");
    if (activeValidatorsEl && validatorsData?.validators) {
      const count = validatorsData.validators.length;
      activeValidatorsEl.textContent = count;
      console.log(`✅ Active Validators: ${count}`);
    }
    
    const circulationStakedEl = document.getElementById("circulationStaked");
    if (circulationStakedEl && poolData?.pool && cachedCirculatingSupply) {
      const totalStaked = parseInt(poolData.pool.bonded_tokens) / 1e18;
      const circulatingSupply = cachedCirculatingSupply;
      
      if (circulatingSupply > 0) {
        const percentStaked = ((totalStaked / circulatingSupply) * 100).toFixed(2);
        circulationStakedEl.textContent = percentStaked + '%';
        console.log(`✅ % Circulation Staked: ${percentStaked}% (${totalStaked.toLocaleString()} / ${circulatingSupply.toLocaleString()})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Network Stats error:', error);
  }
}

function updateTotalSupply() {
  const totalSupplyEl = document.getElementById("totalSupply");
  if (!totalSupplyEl) return;
  
  const TOTAL_SUPPLY = 1361867964;
  
  const billions = Math.floor(TOTAL_SUPPLY / 1000000000);
  const millions = Math.floor((TOTAL_SUPPLY % 1000000000) / 1000000);
  const thousands = Math.floor((TOTAL_SUPPLY % 1000000) / 1000);
  
  const formatted = `${billions}.${millions.toString().padStart(3, '0')}.${thousands.toString().padStart(3, '0')}B`;
  
  totalSupplyEl.textContent = formatted;
  console.log(`✅ Total Supply: ${formatted} (${TOTAL_SUPPLY.toLocaleString()} TICS)`);
}

async function updateMarketCap() {
  const marketCapEl = document.getElementById("marketCap");
  if (!marketCapEl) return;
  
  try {
    const workerUrl = "https://tics-price.yuskivvolodymyr.workers.dev";
    const priceData = await fetchJSON(workerUrl);
    
    if (priceData && priceData.lastPrice && cachedCirculatingSupply) {
      const price = parseFloat(priceData.lastPrice);
      const circulatingSupply = cachedCirculatingSupply;
      
      const marketCap = price * circulatingSupply;
      
      marketCapEl.textContent = '$' + formatLargeNumber(marketCap);
      console.log(`✅ Market Cap: $${marketCap.toLocaleString()} (Price: $${price} × Circulating: ${circulatingSupply.toLocaleString()})`);
    }
  } catch (error) {
    console.error('❌ Market Cap error:', error);
  }
}

function updateCirculationSupplyDisplay(circulatingSupply) {
  const circulationSupplyEl = document.getElementById("circulationSupply");
  if (!circulationSupplyEl) return;
  
  if (circulatingSupply) {
    circulationSupplyEl.textContent = formatLargeNumber(circulatingSupply);
    console.log(`✅ Circulation Supply displayed: ${circulatingSupply.toLocaleString()} TICS`);
  }
}

async function updateCirculationSupply() {
  const circulationSupplyEl = document.getElementById("circulationSupply");
  if (!circulationSupplyEl) return;
  
  try {
    const data = await fetchJSON('https://pricebot.ticslab.xyz/api/prices');
    
    if (data?.combined?.circulatingSupply) {
      const circulatingSupply = parseFloat(data.combined.circulatingSupply);
      cachedCirculatingSupply = circulatingSupply;
      circulationSupplyEl.textContent = formatLargeNumber(circulatingSupply);
      console.log(`✅ Circulation Supply: ${circulatingSupply.toLocaleString()} TICS (from pricebot)`);
      return circulatingSupply;
    }
    
    if (cachedCirculatingSupply) {
      circulationSupplyEl.textContent = formatLargeNumber(cachedCirculatingSupply);
      console.log(`✅ Circulation Supply: ${cachedCirculatingSupply.toLocaleString()} TICS (from cache)`);
      return cachedCirculatingSupply;
    }
    
    console.warn('⚠️ Circulating supply not found and no cached value');
    circulationSupplyEl.textContent = "--";
    return null;
  } catch (error) {
    console.error('❌ Circulation Supply error:', error);
    
    if (cachedCirculatingSupply) {
      circulationSupplyEl.textContent = formatLargeNumber(cachedCirculatingSupply);
      console.log(`✅ Circulation Supply: ${cachedCirculatingSupply.toLocaleString()} TICS (from cache after error)`);
      return cachedCirculatingSupply;
    }
    
    return null;
  }
}

async function updateTicsBurn() {
  const ticsBurnEl = document.getElementById("ticsBurn");
  if (!ticsBurnEl) return;
  
  try {
    const data = await fetchJSON('https://native-api.qubetics.com/qubetics/explorer/dashboard');
    
    if (data?.data?.burnedAmount) {
      const burned = parseFloat(data.data.burnedAmount);
      ticsBurnEl.textContent = formatLargeNumber(burned);
      console.log(`✅ TICS Burned: ${burned.toLocaleString()} TICS`);
    } else {
      console.warn('⚠️ Burn data structure:', data);
      ticsBurnEl.textContent = "--";
    }
  } catch (error) {
    console.error('❌ TICS Burn error:', error);
    ticsBurnEl.textContent = "--";
  }
}

function updateAPY() {
  const apyEl = document.getElementById("apyRate");
  if (!apyEl) return;
  
  apyEl.textContent = "30%";
}
