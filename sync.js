// QubeNode Sync v2.4
// Автоматична синхронізація даних валідатора Qubetics

const validatorAddress = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";
let lastBlock = 0;

// --- Отримання даних валідатора ---
async function updateValidatorStats() {
  try {
    const res = await fetch(`https://v2.ticsscan.com/api/validator/${validatorAddress}`);
    const data = await res.json();

    if (data) {
      document.getElementById("delegatedAmount").textContent = parseFloat(data.total_staked).toLocaleString();
      document.getElementById("delegatorsCount").textContent = data.delegators || "--";
      document.getElementById("commissionRate").textContent = (data.commission_rate * 100).toFixed(1) + "%";
      document.getElementById("signedBlocks").textContent = data.blocks_signed || "--";
    }
  } catch (e) {
    console.error("Validator stats error:", e);
  }
}

// --- Отримання аптайму ---
async function updateUptime() {
  try {
    const res = await fetch("https://native.ticsscan.com/qubetics/uptime");
    const data = await res.json();
    if (data && data.uptime) {
      document.getElementById("uptimePercent").textContent = data.uptime.toFixed(2) + "%";
    }
  } catch (e) {
    console.error("Uptime error:", e);
  }
}

// --- Отримання середнього часу блоку ---
async function updateBlockStats() {
  try {
    const res = await fetch("https://v2.ticsscan.com/api/blocks/stats");
    const stats = await res.json();
    if (stats && stats.average_block_time) {
      const avg = parseFloat(stats.average_block_time).toFixed(2);
      const blockInfo = document.querySelector(".block-info");
      if (blockInfo && lastBlock) {
        blockInfo.innerHTML = `Блок #<span id="currentBlock">${lastBlock.toLocaleString()}</span> • ~${avg}s`;
      }
    }
  } catch (e) {
    console.error("Block stats error:", e);
  }
}

// --- Плавна анімація блоків ---
function addBlockToChain(blockNum) {
  const container = document.getElementById("blocksChainInline");
  if (!container) return;

  const block = document.createElement("div");
  block.className = "chain-block fresh";
  block.textContent = blockNum.toString().slice(-2); // останні 2 цифри

  container.appendChild(block);
  const maxBlocks = 20;
  if (container.children.length > maxBlocks) {
    container.removeChild(container.firstElementChild);
  }
}

async function updateBlocks() {
  try {
    const res = await fetch("https://v2.ticsscan.com/api/blocks/latest");
    const data = await res.json();
    const current = parseInt(data.height);

    if (lastBlock && current > lastBlock) {
      for (let i = lastBlock + 1; i <= current; i++) {
        addBlockToChain(i);
        document.getElementById("currentBlock").textContent = i.toLocaleString();
        await new Promise(r => setTimeout(r, 5800)); // середній час блоку
      }
    } else {
      addBlockToChain(current);
      document.getElementById("currentBlock").textContent = current.toLocaleString();
    }

    lastBlock = current;
  } catch (e) {
    console.error("Blocks error:", e);
  }
}

// --- Оновлення ціни монети ---
async function updatePrice() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=qubetics&vs_currencies=usd&include_24hr_change=true");
    const data = await res.json();
    if (data.qubetics) {
      document.getElementById("ticsPrice").textContent = "$" + data.qubetics.usd.toFixed(5);
      document.getElementById("ticsChange").textContent = data.qubetics.usd_24h_change.toFixed(2) + "%";
    }
  } catch (e) {
    console.error("Price error:", e);
  }
}

// --- Інтервали оновлення ---
updateValidatorStats();
updateUptime();
updateBlocks();
updatePrice();
updateBlockStats();

setInterval(updateValidatorStats, 60000);
setInterval(updateUptime, 90000);
setInterval(updateBlocks, 15000);
setInterval(updatePrice, 120000);
setInterval(updateBlockStats, 60000);
