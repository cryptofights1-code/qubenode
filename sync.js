// sync.js — оновлена версія для live-синхронізації сайту QubeNode

const RPC_BASE = 'https://rpc.qubenode.space';
const API_BASE = 'https://api.qubenode.space';
const API_KEY = 'qubenode_94Fh29sd8GvP!';
const VALIDATOR_ADDR = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';

// Функція для безпечного fetch із ключем
async function fetchData(url) {
  try {
    const res = await fetch(url, {
      headers: { 'X-API-KEY': API_KEY }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('❌ Fetch error:', url, err);
    return null;
  }
}

// Оновлення висоти блоку
async function updateBlockHeight() {
  const data = await fetchData(`${RPC_BASE}/status`);
  if (data?.result?.sync_info?.latest_block_height) {
    const block = parseInt(data.result.sync_info.latest_block_height);
    document.getElementById('currentBlock').textContent = block.toLocaleString('uk-UA');
  }
}

// Оновлення статистики валідатора
async function updateValidatorInfo() {
  const validator = await fetchData(`${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR_ADDR}`);
  if (validator?.validator) {
    const tokens = parseInt(validator.validator.tokens) / 1e6;
    const commission = parseFloat(validator.validator.commission.commission_rates.rate) * 100;

    document.getElementById('delegatedAmount').textContent = tokens.toLocaleString('uk-UA', { maximumFractionDigits: 0 });
    document.getElementById('commissionRate').textContent = commission.toFixed(1) + '%';
  }

  const delegations = await fetchData(`${API_BASE}/cosmos/staking/v1beta1/validators/${VALIDATOR_ADDR}/delegations`);
  if (delegations?.delegation_responses) {
    document.getElementById('delegatorsCount').textContent = delegations.delegation_responses.length;
  }
}

// Uptime та підписані блоки (тимчасові значення)
async function updatePerformance() {
  const uptime = 99.98;
  const signed = 1968000;
  document.getElementById('uptimePercent').textContent = uptime.toFixed(2) + '%';
  document.getElementById('signedBlocks').textContent = signed.toLocaleString('uk-UA');
}

// Дані про ціну TICS
async function updateTicsPrice() {
  const data = await fetchData('https://api.coingecko.com/api/v3/simple/price?ids=tics&vs_currencies=usd&include_24hr_change=true');
  if (data?.tics) {
    const price = data.tics.usd;
    const change = data.tics.usd_24h_change;

    document.getElementById('ticsPrice').textContent = '$' + price.toFixed(4);
    const changeElem = document.getElementById('ticsChange');
    changeElem.textContent = change.toFixed(2) + '%';
    changeElem.style.color = change >= 0 ? '#22c55e' : '#ef4444';
  }
}

// Основна функція оновлення
async function refreshAll() {
  await updateBlockHeight();
  await updateValidatorInfo();
  await updatePerformance();
  await updateTicsPrice();
}

// Автоматичне оновлення кожні 10 секунд
refreshAll();
setInterval(refreshAll, 10000);

console.log('✅ QubeNode live sync initialized');