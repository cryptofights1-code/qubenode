// === QubeNode Wallet Integration v2.3.0 ===
// Keplr + Cosmostation Wallet Integration for Qubetics Network
// Features: Connect wallet, show balance, delegate tokens, rewards display
// v2.1.0: Fixed Keplr account selection bug - now correctly uses selected account
// v2.1.1: Added Cosmostation account change listener
// v2.1.2: Added detailed diagnostic logging to troubleshoot address mismatch
// v2.1.3: Enhanced logging to trace the entire connection flow
// v2.1.4: Added alert to show which address Keplr returns
// v2.2.0: Changed chain ID from "qubetics-1" to "9030" 
// v2.2.1: CRITICAL FIX - Correct chain ID is "qubetics_9030-1" (EVM-compatible format)
// v2.2.2: Removed DEBUG alert - production ready
// v2.3.0: Added connectWalletDirect() for modal integration - direct connection without choice modal

console.log('🔐 QubeNode Wallet Integration v2.3.0 LOADED');

// Qubetics Network Configuration
const QUBETICS_CHAIN_ID = "qubetics_9030-1";
const QUBETICS_CHAIN_NAME = "Qubetics";
const QUBETICS_RPC = "https://rpc.qubetics.com"; // TODO: Verify correct RPC endpoint
const QUBETICS_REST = "https://swagger.qubetics.com";
const QUBETICS_DENOM = "utics";
const QUBETICS_DECIMALS = 18; // EVM-compatible chain uses 18 decimals
const VALIDATOR_ADDRESS = "qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld";

// Global state
let walletConnected = false;
let walletType = null; // 'keplr' or 'cosmostation'
let userAddress = null;
let userBalance = null;
let userDelegated = null;
let userRewards = null;

// === CHAIN CONFIGURATION FOR BOTH WALLETS ===
const CHAIN_CONFIG = {
  chainId: QUBETICS_CHAIN_ID,
  chainName: QUBETICS_CHAIN_NAME,
  rpc: QUBETICS_RPC,
  rest: QUBETICS_REST,
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: "qubetics",
    bech32PrefixAccPub: "qubetics" + "pub",
    bech32PrefixValAddr: "qubetics" + "valoper",
    bech32PrefixValPub: "qubetics" + "valoperpub",
    bech32PrefixConsAddr: "qubetics" + "valcons",
    bech32PrefixConsPub: "qubetics" + "valconspub"
  },
  currencies: [
    {
      coinDenom: "TICS",
      coinMinimalDenom: QUBETICS_DENOM,
      coinDecimals: QUBETICS_DECIMALS,
      coinGeckoId: "qubetics",
    }
  ],
  feeCurrencies: [
    {
      coinDenom: "TICS",
      coinMinimalDenom: QUBETICS_DENOM,
      coinDecimals: QUBETICS_DECIMALS,
      coinGeckoId: "qubetics",
      gasPriceStep: {
        low: 0.01,
        average: 0.025,
        high: 0.04,
      },
    }
  ],
  stakeCurrency: {
    coinDenom: "TICS",
    coinMinimalDenom: QUBETICS_DENOM,
    coinDecimals: QUBETICS_DECIMALS,
    coinGeckoId: "qubetics",
  },
  features: ["stargate", "ibc-transfer"],
};

async function suggestQubeticsChain(wallet) {
  if (wallet === 'keplr') {
    if (!window.keplr) {
      throw new Error("Keplr wallet не встановлено");
    }

    try {
      // First, let's check what chains are available
      console.log('🔍 Checking available Keplr chains...');
      
      // Try to get chain info
      try {
        const chainInfo = await window.keplr.getChain(QUBETICS_CHAIN_ID);
        console.log('✅ Found chain with ID:', QUBETICS_CHAIN_ID);
        console.log('   Chain info:', chainInfo);
      } catch (e) {
        console.log('⚠️ Chain not found with ID:', QUBETICS_CHAIN_ID);
        console.log('   Trying to enable anyway...');
      }
      
      // Just try to enable without suggesting chain
      // This will use Keplr's existing Qubetics configuration
      await window.keplr.enable(QUBETICS_CHAIN_ID);
      console.log('✅ Qubetics enabled in Keplr');
      return true;
    } catch (error) {
      console.error('❌ Failed to enable Qubetics in Keplr:', error);
      throw new Error("Не вдалося підключитися до мережі Qubetics. Переконайтеся, що Qubetics додано в Keplr.");
    }
  } else if (wallet === 'cosmostation') {
    if (!window.cosmostation) {
      throw new Error("Cosmostation wallet не встановлено");
    }

    try {
      const provider = window.cosmostation.providers.keplr;
      await provider.enable(QUBETICS_CHAIN_ID);
      console.log('✅ Qubetics enabled in Cosmostation');
      return true;
    } catch (error) {
      console.error('❌ Failed to enable Qubetics in Cosmostation:', error);
      throw new Error("Не вдалося підключитися до мережі Qubetics. Переконайтеся, що Qubetics додано в Cosmostation.");
    }
  }
}

// === SHOW WALLET CHOICE MODAL ===
function showWalletChoice() {
  const keplrAvailable = !!window.keplr;
  const cosmostationAvailable = !!window.cosmostation;

  if (!keplrAvailable && !cosmostationAvailable) {
    alert('Будь ласка, встановіть Keplr або Cosmostation wallet:\n\nKeplr: https://www.keplr.app/\nCosmostation: https://cosmostation.io/');
    return;
  }

  const modalHTML = `
    <div id="walletChoiceModal" class="modal show" style="display: flex; z-index: 100000;">
      <div class="modal-content" style="max-width: 450px; animation: modalSlideIn 0.3s ease;">
        <div class="modal-header" style="border-bottom: 2px solid rgba(0, 212, 255, 0.3);">
          <h2 class="modal-title" style="font-size: 1.5em;">🔐 Оберіть гаманець</h2>
          <button class="close-button" onclick="closeWalletChoice()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 40px;">
          <p style="text-align: center; color: rgba(255, 255, 255, 0.7); margin-bottom: 30px; font-size: 1.05em;">
            Оберіть гаманець для підключення до Qubetics
          </p>
          
          <div style="display: flex; flex-direction: column; gap: 15px;">
            ${keplrAvailable ? `
              <button onclick="connectWalletType('keplr')" class="wallet-choice-btn" style="display: flex; align-items: center; gap: 20px; padding: 20px 25px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 255, 240, 0.05)); border: 2px solid rgba(0, 212, 255, 0.3); border-radius: 16px; cursor: pointer; transition: all 0.3s; width: 100%;">
                <div style="width: 60px; height: 60px; background: rgba(0, 212, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8em; font-weight: 800; color: #00D4FF; flex-shrink: 0;">K</div>
                <div style="flex: 1; text-align: left;">
                  <div style="font-size: 1.3em; font-weight: 700; color: #00FFF0; margin-bottom: 5px;">Keplr</div>
                  <div style="font-size: 0.9em; color: rgba(255, 255, 255, 0.6);">Найпопулярніший Cosmos гаманець</div>
                </div>
                <span style="font-size: 1.5em; color: rgba(255, 255, 255, 0.3);">→</span>
              </button>
            ` : `
              <div style="display: flex; align-items: center; gap: 20px; padding: 20px 25px; background: rgba(100, 100, 100, 0.1); border: 2px solid rgba(100, 100, 100, 0.3); border-radius: 16px; opacity: 0.5;">
                <div style="width: 60px; height: 60px; background: rgba(100, 100, 100, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8em; font-weight: 800; color: rgba(255, 255, 255, 0.3); flex-shrink: 0;">K</div>
                <div style="flex: 1; text-align: left;">
                  <div style="font-size: 1.3em; font-weight: 700; color: rgba(255, 255, 255, 0.5); margin-bottom: 5px;">Keplr</div>
                  <div style="font-size: 0.9em; color: rgba(255, 255, 255, 0.4);">Не встановлено</div>
                </div>
                <a href="https://www.keplr.app/download" target="_blank" style="padding: 8px 16px; background: rgba(0, 212, 255, 0.2); border: 1px solid rgba(0, 212, 255, 0.4); border-radius: 8px; color: #00D4FF; text-decoration: none; font-size: 0.9em; font-weight: 600;">Встановити</a>
              </div>
            `}
            
            ${cosmostationAvailable ? `
              <button onclick="connectWalletType('cosmostation')" class="wallet-choice-btn" style="display: flex; align-items: center; gap: 20px; padding: 20px 25px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 255, 240, 0.05)); border: 2px solid rgba(0, 212, 255, 0.3); border-radius: 16px; cursor: pointer; transition: all 0.3s; width: 100%;">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, rgba(147, 112, 219, 0.3), rgba(0, 212, 255, 0.3)); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8em; font-weight: 800; color: #9370DB; flex-shrink: 0;">C</div>
                <div style="flex: 1; text-align: left;">
                  <div style="font-size: 1.3em; font-weight: 700; color: #00FFF0; margin-bottom: 5px;">Cosmostation</div>
                  <div style="font-size: 0.9em; color: rgba(255, 255, 255, 0.6);">Професійний Cosmos гаманець</div>
                </div>
                <span style="font-size: 1.5em; color: rgba(255, 255, 255, 0.3);">→</span>
              </button>
            ` : `
              <div style="display: flex; align-items: center; gap: 20px; padding: 20px 25px; background: rgba(100, 100, 100, 0.1); border: 2px solid rgba(100, 100, 100, 0.3); border-radius: 16px; opacity: 0.5;">
                <div style="width: 60px; height: 60px; background: rgba(100, 100, 100, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8em; font-weight: 800; color: rgba(255, 255, 255, 0.3); flex-shrink: 0;">C</div>
                <div style="flex: 1; text-align: left;">
                  <div style="font-size: 1.3em; font-weight: 700; color: rgba(255, 255, 255, 0.5); margin-bottom: 5px;">Cosmostation</div>
                  <div style="font-size: 0.9em; color: rgba(255, 255, 255, 0.4);">Не встановлено</div>
                </div>
                <a href="https://cosmostation.io/wallet" target="_blank" style="padding: 8px 16px; background: rgba(0, 212, 255, 0.2); border: 1px solid rgba(0, 212, 255, 0.4); border-radius: 8px; color: #00D4FF; text-decoration: none; font-size: 0.9em; font-weight: 600;">Встановити</a>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer.firstElementChild);

  document.querySelectorAll('.wallet-choice-btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      this.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 255, 240, 0.1))';
      this.style.transform = 'translateX(5px)';
      this.style.borderColor = 'rgba(0, 212, 255, 0.5)';
    });
    btn.addEventListener('mouseleave', function() {
      this.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 255, 240, 0.05))';
      this.style.transform = 'translateX(0)';
      this.style.borderColor = 'rgba(0, 212, 255, 0.3)';
    });
  });
}

function closeWalletChoice() {
  const modal = document.getElementById('walletChoiceModal');
  if (modal) modal.remove();
}

// === CONNECT WALLET (shows choice modal) ===
async function connectWallet() {
  showWalletChoice();
}

// === CONNECT WALLET DIRECTLY (without choice modal) ===
async function connectWalletDirect(type) {
  console.log('🔵 connectWalletDirect called with:', type);
  
  // Check if wallet extension is installed
  if (type === 'keplr' && !window.keplr) {
    alert('Будь ласка, встановіть Keplr Wallet: https://www.keplr.app/');
    return;
  }
  
  if (type === 'cosmostation' && !window.cosmostation) {
    alert('Будь ласка, встановіть Cosmostation Wallet: https://cosmostation.io/');
    return;
  }
  
  // Connect directly
  await connectWalletType(type);
}

// === CONNECT SPECIFIC WALLET TYPE ===
async function connectWalletType(type) {
  console.log('🔵 connectWalletType called with:', type);
  
  walletType = type;
  closeWalletChoice();

  const btn = document.getElementById('connectWalletBtn');
  
  try {
    if (btn) {
      btn.innerHTML = '<span>Підключення...</span>';
      btn.disabled = true;
    }

    console.log('🔵 About to call suggestQubeticsChain...');
    await suggestQubeticsChain(type);
    console.log('🔵 suggestQubeticsChain completed');

    // CRITICAL FIX: Use getKey() to get the CURRENTLY SELECTED account
    // getAccounts()[0] always returns the first account, ignoring user's selection
    console.log('🔵 About to call getKey()...');
    let key;
    if (type === 'keplr') {
      console.log('🔵 Calling window.keplr.getKey with chainId:', QUBETICS_CHAIN_ID);
      key = await window.keplr.getKey(QUBETICS_CHAIN_ID);
      
      // DETAILED LOGGING FOR DIAGNOSIS
      console.log('🔍 KEPLR DEBUG INFO:');
      console.log('   Chain ID used:', QUBETICS_CHAIN_ID);
      console.log('   Key object:', key);
      console.log('   bech32Address:', key.bech32Address);
      console.log('   name:', key.name);
      console.log('   algo:', key.algo);
      console.log('   pubKey:', key.pubKey);
      
    } else {
      console.log('🔵 Calling cosmostation getKey with chainId:', QUBETICS_CHAIN_ID);
      key = await window.cosmostation.providers.keplr.getKey(QUBETICS_CHAIN_ID);
      
      // DETAILED LOGGING FOR DIAGNOSIS
      console.log('🔍 COSMOSTATION DEBUG INFO:');
      console.log('   Chain ID used:', QUBETICS_CHAIN_ID);
      console.log('   Key object:', key);
      console.log('   bech32Address:', key.bech32Address);
      console.log('   name:', key.name);
    }

    console.log('🔵 Got key, setting userAddress...');
    userAddress = key.bech32Address;
    walletConnected = true;

    console.log(`✅ ${type} wallet connected:`, userAddress);
    console.log(`   Account name: ${key.name}`);

    updateHeaderAfterConnection();
    await updateWalletData();

  } catch (error) {
    console.error('❌ Connection error:', error);
    alert('Помилка підключення: ' + error.message);
    
    if (btn) {
      btn.innerHTML = '<span>🔐 Підключити гаманець</span>';
      btn.disabled = false;
    }
  }
}

// === UPDATE HEADER AFTER CONNECTION ===
function updateHeaderAfterConnection() {
  const btn = document.getElementById('connectWalletBtn');
  const btnMobile = document.getElementById('connectWalletBtnMobile');
  if (!btn) return;

  const shortAddress = userAddress.substring(0, 10) + '...' + userAddress.substring(userAddress.length - 4);
  const balanceText = userBalance !== null ? userBalance.toFixed(2) + ' TICS' : '...';

  // Desktop button
  btn.innerHTML = `
    <span>👤</span>
    <span style="display: flex; align-items: center; gap: 6px;">
      <span>${shortAddress}</span>
      <span style="opacity: 0.7;">|</span>
      <span style="font-weight: 700;">${balanceText}</span>
    </span>
  `;
  btn.disabled = false;
  btn.onclick = toggleWalletDropdown;

  // Mobile button
  if (btnMobile) {
    btnMobile.innerHTML = `
      <span>👤</span>
      <span style="font-size: 0.75em;">${shortAddress}</span>
    `;
    btnMobile.onclick = toggleWalletDropdown;
  }
}

// === TOGGLE WALLET DROPDOWN ===
function toggleWalletDropdown() {
  let dropdown = document.getElementById('walletDropdown');
  
  if (dropdown) {
    dropdown.remove();
    return;
  }

  const btn = document.getElementById('connectWalletBtn');
  const rect = btn.getBoundingClientRect();

  // Calculate expected rewards
  const dailyReward = userDelegated ? (userDelegated * 0.285 / 365) : 0;
  const monthlyReward = dailyReward * 30;
  const yearlyReward = dailyReward * 365;

  dropdown = document.createElement('div');
  dropdown.id = 'walletDropdown';
  dropdown.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 10}px;
    right: ${window.innerWidth - rect.right}px;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    border: 2px solid rgba(0, 212, 255, 0.4);
    border-radius: 16px;
    padding: 25px;
    min-width: 380px;
    z-index: 99999;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 212, 255, 0.2);
    animation: slideDown 0.2s ease;
  `;

  dropdown.innerHTML = `
    <style>
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
    
    <!-- Address -->
    <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(0, 212, 255, 0.2);">
      <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Адреса</div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="font-family: 'Courier New', monospace; font-size: 14px; color: #00FFF0; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis;">${userAddress}</div>
        <button onclick="copyAddress()" style="padding: 6px 12px; background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 6px; color: #00D4FF; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.background='rgba(0, 212, 255, 0.2)'" onmouseout="this.style.background='rgba(0, 212, 255, 0.1)'">Copy</button>
        <a href="https://native.ticsscan.com/qubetics/address/${userAddress}" target="_blank" style="padding: 6px 12px; background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 6px; color: #00D4FF; text-decoration: none; font-size: 12px; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.background='rgba(0, 212, 255, 0.2)'" onmouseout="this.style.background='rgba(0, 212, 255, 0.1)'">Explorer</a>
      </div>
    </div>

    <!-- Balances Grid -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
      <div style="background: rgba(0, 212, 255, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(0, 212, 255, 0.2);">
        <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Баланс</div>
        <div style="font-size: 20px; font-weight: 700; color: #00FFF0;">${userBalance !== null ? userBalance.toFixed(2) : '--'} <span style="font-size: 14px; opacity: 0.7;">TICS</span></div>
      </div>
      <div style="background: rgba(34, 197, 94, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.2);">
        <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Делеговано</div>
        <div style="font-size: 20px; font-weight: 700; color: #22c55e;">${userDelegated !== null ? userDelegated.toFixed(2) : '--'} <span style="font-size: 14px; opacity: 0.7;">TICS</span></div>
      </div>
    </div>

    <!-- Rewards Section -->
    <div style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 165, 0, 0.05)); border: 1px solid rgba(255, 215, 0, 0.2); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
      <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">🎁 Доступні винагороди</div>
      <div style="font-size: 24px; font-weight: 700; color: #FFD700; margin-bottom: 12px;">${userRewards !== null ? userRewards.toFixed(2) : '--'} <span style="font-size: 16px; opacity: 0.7;">TICS</span></div>
      
      <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-bottom: 8px; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 215, 0, 0.2); text-transform: uppercase; letter-spacing: 0.5px;">📊 Очікувані винагороди</div>
      <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: rgba(255, 255, 255, 0.8);">
        <div style="display: flex; justify-content: space-between;"><span>• Щоденно:</span><span style="color: #FFD700; font-weight: 600;">~${dailyReward.toFixed(2)} TICS</span></div>
        <div style="display: flex; justify-content: space-between;"><span>• Щомісяця:</span><span style="color: #FFD700; font-weight: 600;">~${monthlyReward.toFixed(2)} TICS</span></div>
        <div style="display: flex; justify-content: space-between;"><span>• Щороку:</span><span style="color: #FFD700; font-weight: 600;">~${yearlyReward.toFixed(2)} TICS</span></div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
      <button onclick="openDelegateFormInModal()" style="flex: 1; padding: 14px; background: linear-gradient(135deg, #00D4FF, #00FFF0); border: none; border-radius: 10px; color: #000; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(0, 212, 255, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
        💰 Делегувати
      </button>
      <button onclick="disconnectWallet()" style="flex: 1; padding: 14px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; color: #ef4444; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
        Відключити
      </button>
    </div>
  `;

  document.body.appendChild(dropdown);

  // Close dropdown when clicking outside
  setTimeout(() => {
    document.addEventListener('click', closeDropdownOutside);
  }, 100);
}

function closeDropdownOutside(e) {
  const dropdown = document.getElementById('walletDropdown');
  const btn = document.getElementById('connectWalletBtn');
  
  if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
    dropdown.remove();
    document.removeEventListener('click', closeDropdownOutside);
  }
}

// === COPY ADDRESS ===
function copyAddress() {
  navigator.clipboard.writeText(userAddress).then(() => {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied';
    btn.style.background = 'rgba(34, 197, 94, 0.2)';
    btn.style.borderColor = 'rgba(34, 197, 94, 0.4)';
    btn.style.color = '#22c55e';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = 'rgba(0, 212, 255, 0.1)';
      btn.style.borderColor = 'rgba(0, 212, 255, 0.3)';
      btn.style.color = '#00D4FF';
    }, 2000);
  });
}

// === DISCONNECT WALLET ===
function disconnectWallet() {
  walletConnected = false;
  walletType = null;
  userAddress = null;
  userBalance = null;
  userDelegated = null;
  userRewards = null;

  const dropdown = document.getElementById('walletDropdown');
  if (dropdown) dropdown.remove();

  const btn = document.getElementById('connectWalletBtn');
  const btnMobile = document.getElementById('connectWalletBtnMobile');
  
  if (btn) {
    btn.innerHTML = '<span>🔐</span><span>Підключити гаманець</span>';
    btn.onclick = connectWallet;
  }
  
  if (btnMobile) {
    btnMobile.innerHTML = '<span>🔐</span><span>Підключити гаманець</span>';
    btnMobile.onclick = connectWallet;
  }

  console.log('🔌 Wallet disconnected');
}

// === UPDATE WALLET DATA ===
async function updateWalletData() {
  if (!userAddress) return;

  try {
    // Fetch balance
    const balanceUrl = `${QUBETICS_REST}/cosmos/bank/v1beta1/balances/${userAddress}`;
    const balanceRes = await fetch(balanceUrl);
    const balanceData = await balanceRes.json();

    const ticsBalance = balanceData.balances?.find(b => b.denom === QUBETICS_DENOM);
    if (ticsBalance) {
      userBalance = parseFloat(ticsBalance.amount) / Math.pow(10, QUBETICS_DECIMALS);
      console.log('✅ Balance:', userBalance, 'TICS');
    } else {
      userBalance = 0;
      console.log('⚠️ No TICS balance found');
    }

    // Fetch delegation to QubeNode
    const delegationUrl = `${QUBETICS_REST}/cosmos/staking/v1beta1/delegations/${userAddress}`;
    const delegationRes = await fetch(delegationUrl);
    const delegationData = await delegationRes.json();

    const delegation = delegationData.delegation_responses?.find(
      d => d.delegation.validator_address === VALIDATOR_ADDRESS
    );

    if (delegation) {
      userDelegated = parseFloat(delegation.balance.amount) / Math.pow(10, QUBETICS_DECIMALS);
      console.log('✅ Delegated to QubeNode:', userDelegated, 'TICS');
    } else {
      userDelegated = 0;
      console.log('⚠️ No delegation to QubeNode');
    }

    // Fetch rewards
    const rewardsUrl = `${QUBETICS_REST}/cosmos/distribution/v1beta1/delegators/${userAddress}/rewards/${VALIDATOR_ADDRESS}`;
    const rewardsRes = await fetch(rewardsUrl);
    const rewardsData = await rewardsRes.json();

    if (rewardsData.rewards && rewardsData.rewards.length > 0) {
      const ticsReward = rewardsData.rewards.find(r => r.denom === QUBETICS_DENOM);
      if (ticsReward) {
        userRewards = parseFloat(ticsReward.amount) / Math.pow(10, QUBETICS_DECIMALS);
        console.log('✅ Rewards:', userRewards, 'TICS');
      } else {
        userRewards = 0;
      }
    } else {
      userRewards = 0;
    }

    // Update header
    updateHeaderAfterConnection();

  } catch (error) {
    console.error('❌ Failed to fetch wallet data:', error);
  }
}

// === OPEN DELEGATE FORM IN MODAL ===
function openDelegateFormInModal() {
  // Close dropdown first
  const dropdown = document.getElementById('walletDropdown');
  if (dropdown) dropdown.remove();

  // Open the delegate modal
  openModal('delegateModal');
  
  // Scroll to the web delegation section
  setTimeout(() => {
    const webDelegateSection = document.getElementById('webDelegateSection');
    if (webDelegateSection) {
      webDelegateSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 300);
}

// === DELEGATE TOKENS ===
async function delegateTokens() {
  if (!walletConnected || !userAddress) {
    alert('Спочатку підключіть гаманець');
    return;
  }

  const amountInput = document.getElementById('delegateAmountInput');
  const submitBtn = document.getElementById('delegateSubmitBtn');

  if (!amountInput || !submitBtn) return;

  const amount = parseFloat(amountInput.value);

  // Validation
  if (!amount || amount <= 0) {
    alert('Будь ласка, введіть коректну суму');
    return;
  }

  if (amount > userBalance) {
    alert('Недостатньо коштів на балансі');
    return;
  }

  if (amount < 1) {
    alert('Мінімальна сума для делегування: 1 TICS');
    return;
  }

  try {
    submitBtn.innerHTML = '<span>Обробка...</span>';
    submitBtn.disabled = true;

    let offlineSigner;
    if (walletType === 'keplr') {
      offlineSigner = window.keplr.getOfflineSigner(QUBETICS_CHAIN_ID);
    } else {
      offlineSigner = window.cosmostation.providers.keplr.getOfflineSigner(QUBETICS_CHAIN_ID);
    }
    
    if (!window.cosmos || !window.cosmos.SigningStargateClient) {
      throw new Error('CosmJS library not loaded');
    }

    const client = await window.cosmos.SigningStargateClient.connectWithSigner(
      QUBETICS_RPC,
      offlineSigner
    );

    const amountInUtics = Math.floor(amount * Math.pow(10, QUBETICS_DECIMALS)).toString();

    const msg = {
      typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
      value: {
        delegatorAddress: userAddress,
        validatorAddress: VALIDATOR_ADDRESS,
        amount: {
          denom: QUBETICS_DENOM,
          amount: amountInUtics,
        },
      },
    };

    const fee = {
      amount: [
        {
          denom: QUBETICS_DENOM,
          amount: "500000000000000000", // 0.5 TICS
        },
      ],
      gas: "200000",
    };

    const result = await client.signAndBroadcast(
      userAddress,
      [msg],
      fee,
      `Delegation to QubeNode`
    );

    console.log('✅ Delegation successful:', result);

    if (result.code === 0) {
      alert(`✅ Делегування успішне!\n\nКількість: ${amount} TICS\nTx Hash: ${result.transactionHash}\n\nВинагорода почне нараховуватися автоматично.\n\nПереглянути транзакцію:\nhttps://native.ticsscan.com/qubetics/tx/${result.transactionHash}`);
      
      amountInput.value = '';
      
      setTimeout(() => updateWalletData(), 2000);
    } else {
      throw new Error(result.rawLog || 'Transaction failed');
    }

  } catch (error) {
    console.error('❌ Delegation error:', error);
    alert('Помилка делегування: ' + error.message);
  } finally {
    submitBtn.innerHTML = '<span>Делегувати →</span>';
    submitBtn.disabled = false;
  }
}

// Set max amount for delegation
function setMaxDelegationAmount() {
  const input = document.getElementById('delegateAmountInput');
  if (input && userBalance !== null) {
    // Leave 0.6 TICS for gas fees
    const maxAmount = Math.max(0, userBalance - 0.6);
    input.value = maxAmount.toFixed(2);
    updateDelegationPreview();
  }
}

// Update delegation preview
function updateDelegationPreview() {
  const input = document.getElementById('delegateAmountInput');
  const preview = document.getElementById('delegationPreview');
  
  if (!input || !preview) return;
  
  const amount = parseFloat(input.value) || 0;
  
  if (amount > 0) {
    const daily = (amount * 0.285 / 365);
    const monthly = daily * 30;
    const yearly = daily * 365;
    
    preview.style.display = 'block';
    document.getElementById('previewDaily').textContent = `~${daily.toFixed(2)} TICS`;
    document.getElementById('previewMonthly').textContent = `~${monthly.toFixed(2)} TICS`;
    document.getElementById('previewYearly').textContent = `~${yearly.toFixed(2)} TICS`;
  } else {
    preview.style.display = 'none';
  }
}

// Make functions globally available
window.connectWallet = connectWallet;
window.connectWalletType = connectWalletType;
window.closeWalletChoice = closeWalletChoice;
window.toggleWalletDropdown = toggleWalletDropdown;
window.copyAddress = copyAddress;
window.disconnectWallet = disconnectWallet;
window.openDelegateFormInModal = openDelegateFormInModal;
window.delegateTokens = delegateTokens;
window.setMaxDelegationAmount = setMaxDelegationAmount;
window.updateDelegationPreview = updateDelegationPreview;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Wallet integration initialized');
  
  if (window.keplr) {
    console.log('✅ Keplr detected');
    
    // Listen for Keplr account changes
    window.addEventListener('keplr_keystorechange', async () => {
      console.log('🔄 Keplr account changed, reconnecting...');
      
      if (walletConnected && walletType === 'keplr') {
        try {
          // Get the new key/address
          const key = await window.keplr.getKey(QUBETICS_CHAIN_ID);
          const newAddress = key.bech32Address;
          
          // Check if address actually changed
          if (newAddress !== userAddress) {
            userAddress = newAddress;
            console.log('✅ Switched to new account:', userAddress);
            console.log(`   Account name: ${key.name}`);
            
            // Update all wallet data
            updateHeaderAfterConnection();
            await updateWalletData();
            
            // Notify user
            alert(`✅ Акаунт змінено!\n\nНова адреса: ${userAddress.substring(0, 20)}...`);
          }
        } catch (error) {
          console.error('❌ Failed to switch account:', error);
        }
      }
    });
  }
  if (window.cosmostation) {
    console.log('✅ Cosmostation detected');
    
    // Listen for Cosmostation account changes
    // Cosmostation uses the same event as Keplr since it implements Keplr compatibility layer
    window.addEventListener('cosmostation_keystorechange', async () => {
      console.log('🔄 Cosmostation account changed, reconnecting...');
      
      if (walletConnected && walletType === 'cosmostation') {
        try {
          // Get the new key/address
          const provider = window.cosmostation.providers.keplr;
          const key = await provider.getKey(QUBETICS_CHAIN_ID);
          const newAddress = key.bech32Address;
          
          // Check if address actually changed
          if (newAddress !== userAddress) {
            userAddress = newAddress;
            console.log('✅ Switched to new account:', userAddress);
            console.log(`   Account name: ${key.name}`);
            
            // Update all wallet data
            updateHeaderAfterConnection();
            await updateWalletData();
            
            // Notify user
            alert(`✅ Акаунт змінено!\n\nНова адреса: ${userAddress.substring(0, 20)}...`);
          }
        } catch (error) {
          console.error('❌ Failed to switch account:', error);
        }
      }
    });
  }
  if (!window.keplr && !window.cosmostation) {
    console.log('⚠️ No wallet extensions found');
  }
});
