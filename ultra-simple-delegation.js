// ULTRA SIMPLE DELEGATION - No dependencies, only Keplr!
console.log('🚀 Loading ultra-simple delegation...');

// Connect wallet function
window.connectWallet = async function() {
    console.log('🔌 Connecting wallet...');
    
    try {
        if (!window.keplr) {
            alert('Будь ласка, встановіть Keplr extension');
            return false;
        }
        
        const chainId = 'qubetics_9030-1';
        
        // Enable chain in Keplr
        await window.keplr.enable(chainId);
        
        // Get offline signer
        const offlineSigner = window.keplr.getOfflineSigner(chainId);
        const accounts = await offlineSigner.getAccounts();
        
        if (accounts.length > 0) {
            window.userAddress = accounts[0].address;
            window.walletConnected = true;
            
            console.log('✅ Wallet connected:', window.userAddress);
            
            // Update wallet data
            await window.updateWalletData();
            
            // Update UI elements
            updateUIAfterConnection();
            
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Connection error:', error);
        alert('Помилка підключення: ' + error.message);
        return false;
    }
};

// Direct connection for modal (called by index.html)
window.connectWalletDirect = async function(walletType) {
    console.log('🔌 Connecting wallet directly:', walletType);
    
    if (walletType === 'keplr') {
        const result = await window.connectWallet();
        
        if (result) {
            // Force UI update after connection
            setTimeout(() => {
                updateDelegationModal();
            }, 500);
        }
        
        return result;
    } else {
        alert('Cosmostation підтримка буде додана найближчим часом. Будь ласка, використовуйте Keplr.');
        return false;
    }
};

// Direct connection functions for modal
window.connectKeplrDirect = async function() {
    console.log('🔌 Connecting Keplr from modal...');
    
    // Just call connectWallet - it already checks for Keplr
    try {
        const result = await window.connectWallet();
        
        if (result) {
            console.log('✅ Connection successful, updating UI...');
            // Force UI update
            setTimeout(() => {
                updateDelegationModal();
            }, 1000);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Connection failed:', error);
        return false;
    }
};

window.connectCosmostationDirect = async function() {
    console.log('🔌 Cosmostation not supported yet');
    alert('Cosmostation підтримка буде додана найближчим часом. Будь ласка, використовуйте Keplr.');
};

// Update UI after connection
function updateUIAfterConnection() {
    // Update connect button text
    const connectBtn = document.getElementById('connectWalletBtn');
    const connectBtnMobile = document.getElementById('connectWalletBtnMobile');
    
    if (connectBtn) {
        connectBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            ${window.userAddress.substring(0, 8)}...${window.userAddress.substring(window.userAddress.length - 6)}
        `;
    }
    
    if (connectBtnMobile) {
        connectBtnMobile.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
            ${window.userAddress.substring(0, 6)}...
        `;
    }
    
    // Update delegation modal if it exists
    updateDelegationModal();
}

// Update delegation modal with wallet data
function updateDelegationModal() {
    console.log('🔄 Updating delegation modal UI...');
    console.log('   Wallet connected:', window.walletConnected);
    console.log('   User address:', window.userAddress);
    console.log('   Balance:', window.userBalance);
    console.log('   Delegated:', window.delegatedAmount);
    console.log('   Rewards:', window.rewardsAmount);
    
    // Show connected section, hide not-connected section
    const notConnected = document.getElementById('delegatorWalletNotConnected');
    const connected = document.getElementById('delegatorWalletConnected');
    
    if (window.walletConnected && window.userAddress) {
        console.log('   Showing connected section...');
        
        if (notConnected) {
            notConnected.style.display = 'none';
            console.log('   ✅ Hidden not-connected section');
        }
        if (connected) {
            connected.style.display = 'block';
            console.log('   ✅ Shown connected section');
        }
        
        // Update address
        const addressEl = document.getElementById('delegatorConnectedAddress');
        if (addressEl) {
            addressEl.textContent = window.userAddress;
            console.log('   ✅ Updated address');
        }
        
        // Update available balance (може бути 0)
        const balanceEl = document.getElementById('delegatorAvailableBalance');
        if (balanceEl) {
            const balance = typeof window.userBalance !== 'undefined' ? window.userBalance : 0;
            balanceEl.textContent = balance.toFixed(2);
            console.log('   ✅ Updated balance:', balance);
        }
        
        // Update delegated amount
        const delegatedEl = document.getElementById('delegatorDelegatedAmount');
        if (delegatedEl) {
            const delegated = typeof window.delegatedAmount !== 'undefined' ? window.delegatedAmount : 0;
            delegatedEl.textContent = delegated.toFixed(2);
            console.log('   ✅ Updated delegated:', delegated);
        }
        
        // Update rewards
        const rewardsEl = document.getElementById('delegatorRewardsAmount');
        if (rewardsEl) {
            const rewards = typeof window.rewardsAmount !== 'undefined' ? window.rewardsAmount : 0;
            rewardsEl.textContent = rewards.toFixed(6);
            console.log('   ✅ Updated rewards:', rewards);
        }
        
        console.log('✅ Delegation modal UI updated!');
    } else {
        console.log('   Showing not-connected section...');
        if (notConnected) notConnected.style.display = 'block';
        if (connected) connected.style.display = 'none';
    }
}

// Disconnect wallet
window.disconnectWallet = function() {
    window.walletConnected = false;
    window.userAddress = null;
    console.log('🔌 Wallet disconnected');
    
    // Update UI
    if (typeof window.updateWalletData === 'function') {
        window.updateWalletData();
    }
};

// Update wallet data
window.updateWalletData = async function() {
    console.log('🔄 Updating wallet data...');
    
    if (!window.walletConnected || !window.userAddress) {
        console.log('ℹ️ Wallet not connected');
        return;
    }
    
    try {
        // Get balance
        console.log('📊 Fetching balance...');
        const balanceResponse = await fetch(`https://swagger.qubetics.com/cosmos/bank/v1beta1/balances/${window.userAddress}`);
        const balanceData = await balanceResponse.json();
        
        console.log('💰 Balance data:', balanceData);
        
        // Find TICS balance
        const ticsBalance = balanceData.balances?.find(b => b.denom === 'utics');
        const balanceInTics = ticsBalance ? parseFloat(ticsBalance.amount) / Math.pow(10, 18) : 0;
        
        console.log('💰 Balance:', balanceInTics, 'TICS (raw:', ticsBalance?.amount || '0', 'utics)');
        
        // Get delegations
        console.log('📊 Fetching delegations...');
        const delegResponse = await fetch(`https://swagger.qubetics.com/cosmos/staking/v1beta1/delegations/${window.userAddress}`);
        const delegData = await delegResponse.json();
        
        console.log('🤝 Delegation data:', delegData);
        
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        const delegation = delegData.delegation_responses?.find(d => d.delegation.validator_address === validatorAddress);
        const delegatedAmount = delegation ? parseFloat(delegation.balance.amount) / Math.pow(10, 18) : 0;
        
        console.log('🔒 Delegated:', delegatedAmount, 'TICS (raw:', delegation?.balance.amount || '0', 'utics)');
        
        // Get rewards
        console.log('📊 Fetching rewards...');
        const rewardsResponse = await fetch(`https://swagger.qubetics.com/cosmos/distribution/v1beta1/delegators/${window.userAddress}/rewards/${validatorAddress}`);
        const rewardsData = await rewardsResponse.json();
        
        console.log('🎁 Rewards data:', rewardsData);
        
        const rewards = rewardsData.rewards?.find(r => r.denom === 'utics');
        const rewardsAmount = rewards ? parseFloat(rewards.amount) / Math.pow(10, 18) : 0;
        
        console.log('🎁 Rewards:', rewardsAmount, 'TICS (raw:', rewards?.amount || '0', 'utics)');
        
        // Update global variables for UI
        window.userBalance = balanceInTics;
        window.delegatedAmount = delegatedAmount;
        window.rewardsAmount = rewardsAmount;
        
        // Update UI immediately
        updateDelegationModal();
        
        // Trigger UI update event
        window.dispatchEvent(new Event('walletDataUpdated'));
        
        console.log('✅ Wallet data updated and UI refreshed');
        console.log('   Balance:', window.userBalance);
        console.log('   Delegated:', window.delegatedAmount);
        console.log('   Rewards:', window.rewardsAmount);
        
    } catch (error) {
        console.error('❌ Update error:', error);
    }
};

// Helper to broadcast transaction using REST API
async function broadcastTransaction(signedTx) {
    try {
        console.log('📡 Preparing broadcast via REST API...');
        console.log('   Signed tx:', signedTx);
        
        // signedTx is the result from Keplr signAmino
        // It has structure: { signed: {...}, signature: {...} }
        
        // For REST API we need to create proper transaction format
        const txBody = {
            tx: {
                msg: signedTx.signed.msgs,
                fee: signedTx.signed.fee,
                signatures: [signedTx.signature],
                memo: signedTx.signed.memo
            },
            mode: 'sync'  // or 'block' or 'async'
        };
        
        console.log('📤 Sending to REST API:', JSON.stringify(txBody, null, 2));
        
        // Use Cosmos REST API endpoint for broadcast
        const response = await fetch('https://swagger.qubetics.com/cosmos/tx/v1beta1/txs', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(txBody)
        });
        
        console.log('📡 Response status:', response.status);
        
        const result = await response.json();
        console.log('📡 Broadcast result:', result);
        
        if (result.tx_response) {
            // Check transaction code
            const code = parseInt(result.tx_response.code || 0);
            if (code === 0) {
                return {
                    success: true,
                    hash: result.tx_response.txhash
                };
            } else {
                const errorMsg = result.tx_response.raw_log || 'Transaction failed';
                throw new Error(`Transaction failed (code ${code}): ${errorMsg}`);
            }
        } else if (result.code) {
            // Error response
            throw new Error(result.message || `API error (code ${result.code})`);
        } else {
            throw new Error('Unexpected response format: ' + JSON.stringify(result));
        }
        
    } catch (error) {
        console.error('❌ Broadcast error:', error);
        console.error('   Error details:', error.message);
        throw error;
    }
}

// Helper to create transaction
async function createAndSignTx(msgs, memo) {
    const chainId = 'qubetics_9030-1';
    const offlineSigner = window.keplr.getOfflineSigner(chainId);
    const accounts = await offlineSigner.getAccounts();
    const account = accounts[0];
    
    // Get account info from RPC
    const response = await fetch('https://swagger.qubetics.com/cosmos/auth/v1beta1/accounts/' + account.address);
    const data = await response.json();
    const accountNumber = data.account.account_number;
    const sequence = data.account.sequence;
    
    // Sign document
    const signDoc = {
        chain_id: chainId,
        account_number: String(accountNumber),
        sequence: String(sequence),
        fee: {
            amount: [{ denom: 'utics', amount: '500000000000000000' }],
            gas: '300000'
        },
        msgs: msgs,
        memo: memo
    };
    
    // Sign with Keplr
    const signed = await window.keplr.signAmino(chainId, account.address, signDoc);
    return signed;
}

// Delegate
window.delegateTokens = async function(amount) {
    console.log('💰 Delegating:', amount, 'TICS');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Підключіть гаманець');
        return false;
    }
    
    try {
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        const amountInUtics = Math.floor(amount * Math.pow(10, 18)).toString();
        
        const msg = {
            type: 'cosmos-sdk/MsgDelegate',
            value: {
                delegator_address: window.userAddress,
                validator_address: validatorAddress,
                amount: {
                    denom: 'utics',
                    amount: amountInUtics
                }
            }
        };
        
        console.log('📝 Creating and signing transaction...');
        const signed = await createAndSignTx([msg], 'Delegation via QubeNode');
        
        console.log('✅ Transaction signed!');
        console.log('📤 Broadcasting to blockchain...');
        
        // Broadcast transaction
        const result = await broadcastTransaction(signed);
        
        console.log('✅ Transaction broadcasted! Hash:', result.hash);
        alert(`✅ Делегування успішне!\n\nТранзакція: ${result.hash}\n\nБаланс оновиться через кілька секунд.`);
        
        // Update wallet
        setTimeout(() => {
            if (typeof window.updateWalletData === 'function') {
                window.updateWalletData();
            }
        }, 5000);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Помилка: ' + error.message);
        return false;
    }
};

// Claim rewards
window.claimRewards = async function() {
    console.log('🎁 Claiming rewards');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Підключіть гаманець');
        return false;
    }
    
    try {
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        
        const msg = {
            type: 'cosmos-sdk/MsgWithdrawDelegationReward',
            value: {
                delegator_address: window.userAddress,
                validator_address: validatorAddress
            }
        };
        
        console.log('📝 Creating claim transaction...');
        const signed = await createAndSignTx([msg], 'Claim rewards via QubeNode');
        
        console.log('✅ Transaction signed!');
        console.log('📤 Broadcasting...');
        
        const result = await broadcastTransaction(signed);
        
        console.log('✅ Claim broadcasted! Hash:', result.hash);
        alert(`✅ Винагороди отримано!\n\nТранзакція: ${result.hash}`);
        
        setTimeout(() => {
            if (typeof window.updateWalletData === 'function') {
                window.updateWalletData();
            }
        }, 5000);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Помилка: ' + error.message);
        return false;
    }
};

// Redelegate
window.redelegateTokens = async function(fromValidator, toValidator, amount) {
    console.log('🔄 Redelegating:', amount, 'TICS');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Підключіть гаманець');
        return false;
    }
    
    try {
        const amountInUtics = Math.floor(amount * Math.pow(10, 18)).toString();
        
        const msg = {
            type: 'cosmos-sdk/MsgBeginRedelegate',
            value: {
                delegator_address: window.userAddress,
                validator_src_address: fromValidator,
                validator_dst_address: toValidator,
                amount: {
                    denom: 'utics',
                    amount: amountInUtics
                }
            }
        };
        
        const signed = await createAndSignTx([msg], 'Redelegate via QubeNode');
        
        alert(`✅ Транзакція підписана!`);
        
        if (typeof window.updateWalletData === 'function') {
            setTimeout(() => window.updateWalletData(), 3000);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Помилка: ' + error.message);
        return false;
    }
};

// Unstake
window.unstakeTokens = async function(validatorAddress, amount) {
    console.log('📤 Unstaking:', amount, 'TICS');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Підключіть гаманець');
        return false;
    }
    
    try {
        const amountInUtics = Math.floor(amount * Math.pow(10, 18)).toString();
        
        const msg = {
            type: 'cosmos-sdk/MsgUndelegate',
            value: {
                delegator_address: window.userAddress,
                validator_address: validatorAddress,
                amount: {
                    denom: 'utics',
                    amount: amountInUtics
                }
            }
        };
        
        const signed = await createAndSignTx([msg], 'Unstake via QubeNode');
        
        alert(`✅ Транзакція підписана!\n\n⏳ Unbonding: 14 днів`);
        
        if (typeof window.updateWalletData === 'function') {
            setTimeout(() => window.updateWalletData(), 3000);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Помилка: ' + error.message);
        return false;
    }
};

console.log('✅ Ultra-simple delegation loaded');
console.log('   Functions: connectWallet, disconnectWallet, updateWalletData');
console.log('   Functions: delegateTokens, claimRewards, redelegateTokens, unstakeTokens');

// Auto-detect Keplr
if (window.keplr) {
    console.log('✅ Keplr detected');
} else {
    console.log('⚠️ Keplr not detected - install Keplr extension');
    
    // Wait for Keplr to load
    window.addEventListener('keplr_keystorechange', () => {
        console.log('✅ Keplr loaded');
    });
}

// Watch for modal opening to update UI
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'style') {
            const delegatorModal = document.getElementById('delegatorModal');
            if (delegatorModal && delegatorModal.style.display === 'flex') {
                console.log('📂 Delegator modal opened - updating UI');
                if (window.walletConnected) {
                    updateDelegationModal();
                }
            }
        }
    });
});

// Start observing when DOM is ready
setTimeout(() => {
    const delegatorModal = document.getElementById('delegatorModal');
    if (delegatorModal) {
        observer.observe(delegatorModal, { attributes: true });
        console.log('👀 Watching for modal open events');
    }
}, 1000);
