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
    // Show connected section, hide not-connected section
    const notConnected = document.getElementById('delegatorWalletNotConnected');
    const connected = document.getElementById('delegatorWalletConnected');
    
    if (window.walletConnected && window.userAddress) {
        if (notConnected) notConnected.style.display = 'none';
        if (connected) connected.style.display = 'block';
        
        // Update address
        const addressEl = document.getElementById('delegatorConnectedAddress');
        if (addressEl) {
            addressEl.textContent = window.userAddress;
        }
        
        // Update available balance
        const balanceEl = document.getElementById('delegatorAvailableBalance');
        if (balanceEl && typeof window.userBalance !== 'undefined') {
            balanceEl.textContent = window.userBalance.toFixed(2);
        }
        
        // Update delegated amount
        const delegatedEl = document.getElementById('delegatorDelegatedAmount');
        if (delegatedEl && typeof window.delegatedAmount !== 'undefined') {
            delegatedEl.textContent = window.delegatedAmount.toFixed(2);
        }
        
        // Update rewards
        const rewardsEl = document.getElementById('delegatorRewardsAmount');
        if (rewardsEl && typeof window.rewardsAmount !== 'undefined') {
            rewardsEl.textContent = window.rewardsAmount.toFixed(6);
        }
        
        console.log('🔄 UI updated with wallet data');
    } else {
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
        const balanceResponse = await fetch(`https://swagger.qubetics.com/cosmos/bank/v1beta1/balances/${window.userAddress}`);
        const balanceData = await balanceResponse.json();
        
        // Find TICS balance
        const ticsBalance = balanceData.balances?.find(b => b.denom === 'utics');
        const balanceInTics = ticsBalance ? parseFloat(ticsBalance.amount) / Math.pow(10, 18) : 0;
        
        console.log('💰 Balance:', balanceInTics, 'TICS');
        
        // Get delegations
        const delegResponse = await fetch(`https://swagger.qubetics.com/cosmos/staking/v1beta1/delegations/${window.userAddress}`);
        const delegData = await delegResponse.json();
        
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        const delegation = delegData.delegation_responses?.find(d => d.delegation.validator_address === validatorAddress);
        const delegatedAmount = delegation ? parseFloat(delegation.balance.amount) / Math.pow(10, 18) : 0;
        
        console.log('🔒 Delegated:', delegatedAmount, 'TICS');
        
        // Get rewards
        const rewardsResponse = await fetch(`https://swagger.qubetics.com/cosmos/distribution/v1beta1/delegators/${window.userAddress}/rewards/${validatorAddress}`);
        const rewardsData = await rewardsResponse.json();
        
        const rewards = rewardsData.rewards?.find(r => r.denom === 'utics');
        const rewardsAmount = rewards ? parseFloat(rewards.amount) / Math.pow(10, 18) : 0;
        
        console.log('🎁 Rewards:', rewardsAmount, 'TICS');
        
        // Update global variables for UI
        window.userBalance = balanceInTics;
        window.delegatedAmount = delegatedAmount;
        window.rewardsAmount = rewardsAmount;
        
        // Update UI immediately
        updateDelegationModal();
        
        // Trigger UI update event
        window.dispatchEvent(new Event('walletDataUpdated'));
        
        console.log('✅ Wallet data updated and UI refreshed');
        
    } catch (error) {
        console.error('❌ Update error:', error);
    }
};

// Helper to broadcast transaction
async function broadcastTransaction(signedTx) {
    try {
        console.log('📡 Preparing broadcast...');
        console.log('   Signed tx:', signedTx);
        
        // Encode transaction to base64
        const txBytes = new TextEncoder().encode(JSON.stringify(signedTx));
        const base64Tx = btoa(String.fromCharCode.apply(null, txBytes));
        
        console.log('📤 Broadcasting via RPC...');
        
        // Try broadcast_tx_commit (waits for confirmation)
        const response = await fetch('https://rpc.qubetics.com/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'broadcast_tx_commit',
                params: {
                    tx: base64Tx
                }
            })
        });
        
        const result = await response.json();
        console.log('📡 Broadcast result:', result);
        
        if (result.result) {
            // Check if transaction was successful
            if (result.result.check_tx && result.result.check_tx.code === 0) {
                return {
                    success: true,
                    hash: result.result.hash
                };
            } else if (result.result.deliver_tx && result.result.deliver_tx.code === 0) {
                return {
                    success: true,
                    hash: result.result.hash
                };
            } else {
                const errorLog = result.result.check_tx?.log || result.result.deliver_tx?.log || 'Unknown error';
                throw new Error(errorLog);
            }
        } else if (result.error) {
            throw new Error(result.error.message || 'RPC error');
        } else {
            throw new Error('Unexpected response format');
        }
        
    } catch (error) {
        console.error('❌ Broadcast error:', error);
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
