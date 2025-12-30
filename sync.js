// === QubeNode Live Sync Script v3.0.0 ===
// Extended with real delegations, rewards, and top 20 delegators
// Integrated for about.html page

console.log('🚀 QubeNode Sync v3.0.0 LOADED - Extended for About page');

const API_BASE = "https://swagger.qubetics.com";
const VALIDATOR = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";
const TICSSCAN_API = "https://v2.ticsscan.com/api/v2";

// CORS Proxy for testing (remove when using Cloudflare Worker)
const CORS_PROXY = "https://corsproxy.io/?";
const USE_CORS_PROXY = true; // Set to false when using Cloudflare Worker

// Validator addresses
const VALCONS_ADDR = "qubeticsvalcons1dlmj5pzg3fv54nrtejnfxmrj08d7qs09xjp2eu";
const VAL_HEX_ADDR = "0x6FF72A04488A594ACC6BCCA6936C7279DBE041E5";
const VAL_ACCOUNT_ADDR = "qubetics1tzk9f84cv2gmk3du3m9dpxcuph70sfj6ltvqjf";

// Global variables
let currentBlockTime = 5.87;
let blockAnimationInterval = null;
let lastBlockHeight = null;

// Universal JSON fetch helper
async function fetchJSON(url, headers = {}) {
  try {
    // Use CORS proxy if enabled
    const fetchUrl = USE_CORS_PROXY ? CORS_PROXY + encodeURIComponent(url) : url;
    
    const res = await fetch(fetchUrl, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Fetch failed → ${url}`, err);
    return null;
  }
}

// Format helpers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toLocaleString();
}

function formatAddress(address) {
    if (!address || address.length < 20) return address;
    return address.slice(0, 12) + '...' + address.slice(-6);
}

function timeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return days + 'd ago';
    if (hours > 0) return hours + 'h ago';
    if (minutes > 0) return minutes + 'm ago';
    return 'just now';
}

// ===== BLOCK HEIGHT =====
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
      } else if (data?.block?.header?.height) {
        blockHeight = data.block.header.height;
      } else if (data?.result?.sync_info?.latest_block_height) {
        blockHeight = data.result.sync_info.latest_block_height;
      }
      
      if (blockHeight) {
        const blockNum = parseInt(blockHeight);
        el.textContent = blockNum.toLocaleString('en-US');
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

// ===== AVERAGE BLOCK TIME =====
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

// ===== VALIDATOR RANK =====
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

    if (rank > 0) {
      el.textContent = `#${rank}`;
      console.log(`✅ Validator rank: #${rank}`);
    } else {
      el.textContent = "--";
    }
  } catch (e) {
    console.error("Validator rank fetch error:", e);
    el.textContent = "--";
  }
}

// ===== VALIDATOR CORE INFO =====
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
    console.log('✅ VOTING POWER:', formatted);
  }
}

// ===== DELEGATORS COUNT =====
async function updateDelegators() {
  const url = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}/delegations?pagination.count_total=true`;
  const data = await fetchJSON(url);
  const el = document.getElementById("delegatorsCount");

  if (data?.pagination?.total && el) {
    el.textContent = data.pagination.total;
    console.log('✅ Delegators count:', data.pagination.total);
  } else if (el) {
    el.textContent = data?.delegation_responses?.length || "—";
  }
}

// ===== INFLATION =====
async function updateInflation() {
  const url = `${API_BASE}/cosmos/mint/v1beta1/inflation`;
  const data = await fetchJSON(url);
  const el = document.getElementById("inflationRate");
  if (!data?.inflation || !el) return;
  el.textContent = (parseFloat(data.inflation) * 100).toFixed(2) + "%";
}

// ===== VALIDATOR UPTIME =====
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
      ? list.find(i => i.address === VALCONS_ADDR || i.cons_address === VALCONS_ADDR)
      : null;

    if (!entry) {
      console.warn("⚠️ Validator not found in signing info");
      return;
    }

    const signedBlocksWindow = parseInt(params?.params?.signed_blocks_window || "10000");
    const missedBlocksCounter = parseInt(entry.missed_blocks_counter || "0");
    const signedBlocks = signedBlocksWindow - missedBlocksCounter;
    const uptimePercent = (signedBlocks / signedBlocksWindow * 100).toFixed(2);

    el.textContent = uptimePercent + "%";
    console.log(`✅ Uptime: ${uptimePercent}% (missed ${missedBlocksCounter}/${signedBlocksWindow})`);
  } catch (e) {
    console.error("Uptime fetch error:", e);
  }
}

// ===== NEW: REAL LATEST DELEGATIONS =====
async function updateLatestDelegations() {
  const tableBody = document.getElementById("delegationsTable");
  if (!tableBody) return;

  try {
    console.log('🔄 Fetching latest delegations...');
    
    // Get all delegations with pagination
    const url = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}/delegations?pagination.limit=100&pagination.reverse=true`;
    const data = await fetchJSON(url);
    
    if (!data?.delegation_responses) {
      console.warn('⚠️ No delegation data');
      return;
    }

    // Take latest 10 delegations
    const latestDelegations = data.delegation_responses.slice(0, 10);
    
    tableBody.innerHTML = '';
    
    latestDelegations.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'table-row';
      row.style.animationDelay = (index * 0.05) + 's';
      
      const delegator = item.delegation.delegator_address;
      const amountMicro = parseInt(item.balance.amount);
      const amountTICS = (amountMicro / 1000000000000000000).toFixed(1); // Convert from micro
      
      row.innerHTML = `
        <div class="delegator-address">${formatAddress(delegator)}</div>
        <div class="delegation-amount">${amountTICS} TICS</div>
        <div class="delegation-time">recent</div>
      `;
      
      tableBody.appendChild(row);
    });
    
    console.log(`✅ Latest delegations updated: ${latestDelegations.length} items`);
    
  } catch (error) {
    console.error('❌ Error fetching latest delegations:', error);
  }
}

// ===== NEW: TOP 20 DELEGATORS =====
async function updateTop20Delegators() {
  const tableBody = document.getElementById("topDelegatorsTable");
  if (!tableBody) return;

  try {
    console.log('🔄 Fetching top 20 delegators...');
    
    // Get ALL delegations
    const url = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}/delegations?pagination.limit=1000`;
    const data = await fetchJSON(url);
    
    if (!data?.delegation_responses) {
      console.warn('⚠️ No delegation data');
      return;
    }

    // Sort by amount and take top 20
    const allDelegations = data.delegation_responses.map(item => {
      const amountMicro = parseInt(item.balance.amount);
      const amountTICS = amountMicro / 1000000000000000000; // Convert from micro
      
      return {
        address: item.delegation.delegator_address,
        amount: amountTICS
      };
    });

    // Sort descending
    allDelegations.sort((a, b) => b.amount - a.amount);
    
    // Take top 20
    const top20 = allDelegations.slice(0, 20);
    
    // Calculate total stake for percentages
    const totalStake = allDelegations.reduce((sum, d) => sum + d.amount, 0);
    
    tableBody.innerHTML = '';
    
    top20.forEach((delegator, index) => {
      const row = document.createElement('div');
      row.className = 'table-row';
      row.style.animationDelay = (index * 0.03) + 's';
      
      const rank = index + 1;
      let medal = '';
      if (rank === 1) medal = '🥇';
      else if (rank === 2) medal = '🥈';
      else if (rank === 3) medal = '🥉';
      
      const share = ((delegator.amount / totalStake) * 100).toFixed(2);
      
      row.innerHTML = `
        <div class="top-rank"><span class="medal">${medal}</span>#${rank}</div>
        <div class="delegator-address">${formatAddress(delegator.address)}</div>
        <div class="delegation-amount">${formatNumber(delegator.amount)} TICS</div>
        <div class="top-share">${share}%</div>
      `;
      
      tableBody.appendChild(row);
    });
    
    console.log(`✅ Top 20 delegators updated: ${top20.length} items`);
    
  } catch (error) {
    console.error('❌ Error fetching top 20 delegators:', error);
  }
}

// ===== NEW: OUTSTANDING REWARDS =====
async function updateOutstandingRewards() {
  const totalRewardsEl = document.getElementById("totalRewards");
  if (!totalRewardsEl) return;

  try {
    console.log('🔄 Fetching outstanding rewards...');
    
    // Get validator rewards
    const url = `${API_BASE}/cosmos/distribution/v1beta1/validators/${VALIDATOR}/outstanding_rewards`;
    const data = await fetchJSON(url);
    
    if (!data?.rewards?.rewards || data.rewards.rewards.length === 0) {
      console.warn('⚠️ No rewards data');
      return;
    }

    // Get TICS rewards (denom: utics or aqube)
    const ticsReward = data.rewards.rewards.find(r => 
      r.denom === 'utics' || r.denom === 'aqube'
    );
    
    if (ticsReward) {
      const amountMicro = parseFloat(ticsReward.amount);
      const amountTICS = (amountMicro / 1000000000000000000).toFixed(1);
      
      totalRewardsEl.textContent = formatNumber(parseFloat(amountTICS)) + ' TICS';
      console.log(`✅ Outstanding rewards: ${amountTICS} TICS`);
    }
    
  } catch (error) {
    console.error('❌ Error fetching outstanding rewards:', error);
  }
}

// ===== NEW: NETWORK SHARE =====
async function updateNetworkShare() {
  const networkShareEl = document.getElementById("networkShare");
  const ourStakeEl = document.getElementById("ourStake");
  const networkTotalEl = document.getElementById("networkTotal");
  
  if (!networkShareEl) return;

  try {
    // Get our stake from validator info
    const validatorUrl = `${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR}`;
    const validatorData = await fetchJSON(validatorUrl);
    
    // Get total bonded tokens (network total)
    const poolUrl = `${API_BASE}/cosmos/staking/v1beta1/pool`;
    const poolData = await fetchJSON(poolUrl);
    
    if (validatorData?.validator && poolData?.pool) {
      const ourTokens = parseInt(validatorData.validator.tokens);
      const totalBonded = parseInt(poolData.pool.bonded_tokens);
      
      const ourStake = ourTokens / 1000000000000000000; // Convert to TICS
      const networkTotal = totalBonded / 1000000000000000000;
      const share = ((ourStake / networkTotal) * 100).toFixed(2);
      
      if (networkShareEl) networkShareEl.textContent = share + '%';
      if (ourStakeEl) ourStakeEl.textContent = formatNumber(ourStake) + ' TICS';
      
      // Only update networkTotal if it's the share stats element (not network traffic)
      if (networkTotalEl && networkTotalEl.closest('.share-stats')) {
        networkTotalEl.textContent = formatNumber(networkTotal) + ' TICS';
      }
      
      console.log(`✅ Network share: ${share}% (${formatNumber(ourStake)} / ${formatNumber(networkTotal)})`);
    }
    
  } catch (error) {
    console.error('❌ Error calculating network share:', error);
  }
}

// ===== MASTER UPDATE =====
async function updateAll() {
  console.log("🔄 QubeNode sync running (extended)...");
  
  await Promise.all([
    updateBlockHeight(),
    updateAverageBlockTime(),
    updateValidatorCore(),
    updateValidatorRank(),
    updateDelegators(),
    updateInflation(),
    updateUptime(),
    updateLatestDelegations(),      // NEW: Real delegations
    updateTop20Delegators(),        // NEW: Real top 20
    updateOutstandingRewards(),     // NEW: Real rewards
    updateNetworkShare()            // NEW: Real network share
  ]);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 QubeNode Sync v3.0.0 initialized (About page extended)');
  
  // Initial update
  setTimeout(() => {
    updateAll();
  }, 100);
  
  // Update block height frequently (every 3 seconds)
  setInterval(updateBlockHeight, 3000);
  
  // Update all other data every 15 seconds
  setInterval(() => {
    updateAverageBlockTime();
    updateValidatorCore();
    updateValidatorRank();
    updateDelegators();
    updateInflation();
    updateUptime();
    updateLatestDelegations();
    updateTop20Delegators();
    updateOutstandingRewards();
    updateNetworkShare();
  }, 15000);
});

