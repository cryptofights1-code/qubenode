// ===================================================================
// QUBENODE DELEGATION - FINAL WORKING VERSION
// Uses only methods that actually work with Qubetics
// ===================================================================

console.log('🚀 Loading QubeNode Delegation (Final Version)...');

// ===================================================================
// WALLET CONNECTION
// ===================================================================

window.connectWallet = async function(walletType = 'keplr') {
    console.log('🔌 Connecting wallet:', walletType);
    
    try {
        const chainId = 'qubetics_9030-1';
        
        if (walletType === 'keplr') {
            if (!window.keplr) {
                alert('Будь ласка, встановіть Keplr extension');
                return false;
            }
            await window.keplr.enable(chainId);
        } else if (walletType === 'cosmostation') {
            if (!window.cosmostation) {
                alert('Будь ласка, встановіть Cosmostation extension');
                return false;
            }
            await window.cosmostation.providers.keplr.enable(chainId);
        }
        
        const offlineSigner = walletType === 'cosmostation' 
            ? window.cosmostation.providers.keplr.getOfflineSigner(chainId)
            : window.keplr.getOfflineSigner(chainId);
            
        const accounts = await offlineSigner.getAccounts();
        
        if (accounts.length > 0) {
            window.userAddress = accounts[0].address;
            window.walletConnected = true;
            window.currentWallet = walletType;
            
            console.log('✅ Wallet connected:', window.userAddress);
            
            await window.updateWalletData();
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

window.connectWalletDirect = async function(walletType) {
    const result = await window.connectWallet(walletType);
    if (result) {
        setTimeout(() => updateDelegationModal(), 500);
    }
    return result;
};

window.disconnectWallet = function() {
    window.walletConnected = false;
    window.userAddress = null;
    window.currentWallet = null;
    console.log('🔌 Wallet disconnected');
    if (typeof window.updateWalletData === 'function') {
        window.updateWalletData();
    }
};

// ===================================================================
// GET WALLET DATA - FETCH ALL AT ONCE (like competitor)
// ===================================================================

window.updateWalletData = async function() {
    console.log('🔄 Updating wallet data...');
    
    if (!window.walletConnected || !window.userAddress) {
        console.log('ℹ️ Wallet not connected');
        window.userBalance = 0;
        window.delegatedAmount = 0;
        window.rewardsAmount = 0;
        updateDelegationModal();
        return;
    }
    
    console.log('📊 Fetching staking overview...');
    
    try {
        const apiBase = 'https://swagger.qubetics.com';
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        
        // Fetch all data in parallel
        const [balanceRes, allDelegRes, totalRewardsRes] = await Promise.all([
            fetch(`${apiBase}/cosmos/bank/v1beta1/balances/${window.userAddress}`).catch(e => null),
            fetch(`${apiBase}/cosmos/staking/v1beta1/delegations/${window.userAddress}`).catch(e => null),
            fetch(`${apiBase}/cosmos/distribution/v1beta1/delegators/${window.userAddress}/rewards`).catch(e => null)
        ]);
        
        // Parse balance
        let balance = 0;
        if (balanceRes && balanceRes.ok) {
            const balanceData = await balanceRes.json();
            const ticsBalance = balanceData.balances?.find(b => b.denom === 'utics');
            balance = ticsBalance ? parseFloat(ticsBalance.amount) / 1e18 : 0;
        }
        
        // Parse all delegations and find ours
        let delegated = 0;
        if (allDelegRes && allDelegRes.ok) {
            const delegData = await allDelegRes.json();
            const ourDelegation = delegData.delegation_responses?.find(d => 
                d.delegation.validator_address === validatorAddress
            );
            delegated = ourDelegation ? parseFloat(ourDelegation.balance.amount) / 1e18 : 0;
        }
        
        // Parse total rewards (not per validator, but total)
        let rewards = 0;
        if (totalRewardsRes && totalRewardsRes.ok) {
            const rewardsData = await totalRewardsRes.json();
            
            // Try 'total' field first (like competitor uses)
            if (rewardsData.total && rewardsData.total.length > 0) {
                const totalReward = rewardsData.total.find(r => r.denom === 'utics');
                rewards = totalReward ? parseFloat(totalReward.amount) / 1e18 : 0;
            }
            
            // If no total, sum all rewards from all validators
            if (rewards === 0 && rewardsData.rewards) {
                for (const validatorRewards of rewardsData.rewards) {
                    if (validatorRewards.reward) {
                        const utics = validatorRewards.reward.find(r => r.denom === 'utics');
                        if (utics) {
                            rewards += parseFloat(utics.amount) / 1e18;
                        }
                    }
                }
            }
        }
        
        console.log('? Staking overview fetched');
        console.log('Changes detected:', {
            hasChanges: true,
            balance: balance !== window.userBalance,
            totalDelegated: delegated !== window.delegatedAmount,
            totalRewards: rewards !== window.rewardsAmount
        });
        
        // Update global state
        window.userBalance = balance;
        window.delegatedAmount = delegated;
        window.rewardsAmount = rewards;
        
        console.log('✅ Final values:');
        console.log('   Balance:', balance, 'TICS');
        console.log('   Total Delegated:', delegated, 'TICS');
        console.log('   Total Rewards:', rewards, 'TICS');
        
        // Update UI
        updateDelegationModal();
        window.dispatchEvent(new Event('walletDataUpdated'));
        
    } catch (error) {
        console.error('❌ Staking overview fetch error:', error);
    }
};

// ===================================================================
// UI UPDATE
// ===================================================================

function updateUIAfterConnection() {
    const connectBtn = document.getElementById('connectWalletBtn');
    const connectBtnMobile = document.getElementById('connectWalletBtnMobile');
    
    if (connectBtn && window.userAddress) {
        connectBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
            ${window.userAddress.substring(0, 8)}...${window.userAddress.substring(window.userAddress.length - 6)}
        `;
    }
    
    if (connectBtnMobile && window.userAddress) {
        connectBtnMobile.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
            ${window.userAddress.substring(0, 6)}...
        `;
    }
    
    updateDelegationModal();
}

function updateDelegationModal() {
    if (!window.walletConnected || !window.userAddress) {
        const notConnected = document.getElementById('delegatorWalletNotConnected');
        const connected = document.getElementById('delegatorWalletConnected');
        if (notConnected) notConnected.style.display = 'block';
        if (connected) connected.style.display = 'none';
        return;
    }
    
    const notConnected = document.getElementById('delegatorWalletNotConnected');
    const connected = document.getElementById('delegatorWalletConnected');
    
    if (notConnected) notConnected.style.display = 'none';
    if (connected) connected.style.display = 'block';
    
    const addressEl = document.getElementById('delegatorConnectedAddress');
    const balanceEl = document.getElementById('delegatorAvailableBalance');
    const delegatedEl = document.getElementById('delegatorDelegatedAmount');
    const rewardsEl = document.getElementById('delegatorRewardsAmount');
    
    if (addressEl) addressEl.textContent = window.userAddress;
    if (balanceEl) balanceEl.textContent = (window.userBalance || 0).toFixed(2);
    if (delegatedEl) delegatedEl.textContent = (window.delegatedAmount || 0).toFixed(2);
    if (rewardsEl) rewardsEl.textContent = (window.rewardsAmount || 0).toFixed(6);
    
    console.log('✅ UI updated');
}

// ===================================================================
// DELEGATION FUNCTIONS
// ===================================================================

window.delegateTokens = async function(amount) {
    console.log('💰 Delegating:', amount, 'TICS');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        const amountInUtics = Math.floor(amount * 1e18).toString();
        
        console.log('📊 Getting account info...');
        
        // Get account info with better error handling
        let accountNumber, sequence;
        try {
            const accountResponse = await fetch(`https://swagger.qubetics.com/cosmos/auth/v1beta1/accounts/${window.userAddress}`);
            
            if (!accountResponse.ok) {
                throw new Error(`Account fetch failed: ${accountResponse.status}`);
            }
            
            const accountData = await accountResponse.json();
            console.log('📋 Account data:', accountData);
            
            // Handle different account response structures
            if (accountData.account) {
                accountNumber = accountData.account.account_number || accountData.account.base_account?.account_number;
                sequence = accountData.account.sequence || accountData.account.base_account?.sequence;
            } else {
                throw new Error('Invalid account data structure');
            }
            
            if (!accountNumber || sequence === undefined) {
                throw new Error(`Missing account info: number=${accountNumber}, sequence=${sequence}`);
            }
            
            console.log('✅ Account info:', { accountNumber, sequence });
            
        } catch (accountError) {
            console.error('❌ Failed to get account info:', accountError);
            throw new Error('Не вдалося отримати інформацію про акаунт. Спробуйте ще раз.');
        }
        
        // Create message
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
        
        // Sign document
        const signDoc = {
            chain_id: chainId,
            account_number: String(accountNumber),
            sequence: String(sequence),
            fee: {
                amount: [{ denom: 'utics', amount: '500000000000000000' }],
                gas: '300000'
            },
            msgs: [msg],
            memo: 'Delegation via QubeNode'
        };
        
        console.log('✍️ Signing transaction...');
        
        const wallet = window.currentWallet === 'cosmostation' 
            ? window.cosmostation.providers.keplr 
            : window.keplr;
            
        const signedTx = await wallet.signAmino(chainId, window.userAddress, signDoc);
        
        console.log('✅ Transaction signed');
        console.log('   Signed tx:', JSON.stringify(signedTx, null, 2));
        console.log('📤 Broadcasting transaction...');
        
        // Use simple format
        const broadcastBody = {
            tx: signedTx,
            mode: 'BROADCAST_MODE_BLOCK'  // Wait for block inclusion
        };
        
        const broadcastResponse = await fetch('https://swagger.qubetics.com/cosmos/tx/v1beta1/txs', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(broadcastBody)
        });
        
        const result = await broadcastResponse.json();
        console.log('📡 Broadcast result:', result);
        
        if (result.tx_response && result.tx_response.code === 0) {
            alert(`✅ Делегування успішне!\n\nHash: ${result.tx_response.txhash}`);
            setTimeout(() => window.updateWalletData(), 5000);
            return true;
        } else {
            throw new Error(result.tx_response?.raw_log || result.message || 'Broadcast failed');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Помилка: ' + error.message);
        return false;
    }
};

window.claimRewards = async function() {
    console.log('🎁 Claiming rewards');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        
        console.log('📊 Getting account info...');
        
        const accountResponse = await fetch(`https://swagger.qubetics.com/cosmos/auth/v1beta1/accounts/${window.userAddress}`);
        
        if (!accountResponse.ok) {
            throw new Error(`Account fetch failed: ${accountResponse.status}`);
        }
        
        const accountData = await accountResponse.json();
        console.log('📋 Account data:', accountData);
        
        let accountNumber, sequence;
        if (accountData.account) {
            accountNumber = accountData.account.account_number || accountData.account.base_account?.account_number;
            sequence = accountData.account.sequence || accountData.account.base_account?.sequence;
        }
        
        if (!accountNumber || sequence === undefined) {
            throw new Error('Missing account info');
        }
        
        console.log('✅ Account info:', { accountNumber, sequence });
        
        const msg = {
            type: 'cosmos-sdk/MsgWithdrawDelegationReward',
            value: {
                delegator_address: window.userAddress,
                validator_address: validatorAddress
            }
        };
        
        const signDoc = {
            chain_id: chainId,
            account_number: String(accountNumber),
            sequence: String(sequence),
            fee: {
                amount: [{ denom: 'utics', amount: '500000000000000000' }],
                gas: '300000'
            },
            msgs: [msg],
            memo: 'Claim rewards via QubeNode'
        };
        
        const wallet = window.currentWallet === 'cosmostation' 
            ? window.cosmostation.providers.keplr 
            : window.keplr;
            
        const signed = await wallet.signAmino(chainId, window.userAddress, signDoc);
        
        const txBody = {
            tx: signed,
            mode: 'BROADCAST_MODE_SYNC'
        };
        
        const broadcastResponse = await fetch('https://swagger.qubetics.com/cosmos/tx/v1beta1/txs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txBody)
        });
        
        const result = await broadcastResponse.json();
        
        if (result.tx_response && result.tx_response.code === 0) {
            alert(`✅ Винагороди отримано!\n\nHash: ${result.tx_response.txhash}`);
            setTimeout(() => window.updateWalletData(), 5000);
            return true;
        } else {
            throw new Error(result.tx_response?.raw_log || 'Claim failed');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Помилка: ' + error.message);
        return false;
    }
};

window.redelegateTokens = async function(fromValidator, toValidator, amount) {
    alert('Redelegate функція буде додана найближчим часом');
    return false;
};

window.unstakeTokens = async function(validatorAddress, amount) {
    alert('Unstake функція буде додана найближчим часом');
    return false;
};

// ===================================================================
// INITIALIZATION
// ===================================================================

console.log('✅ QubeNode Delegation loaded (Final Version)');
console.log('   All functions ready to use');

// Watch for modal opening
setTimeout(() => {
    const delegatorModal = document.getElementById('delegatorModal');
    if (delegatorModal) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'style') {
                    if (delegatorModal.style.display === 'flex' && window.walletConnected) {
                        updateDelegationModal();
                    }
                }
            });
        });
        observer.observe(delegatorModal, { attributes: true });
        console.log('👀 Watching for modal events');
    }
}, 1000);

// Auto-detect Keplr
if (window.keplr) {
    console.log('✅ Keplr detected');
} else {
    console.log('⚠️ Keplr not detected');
}
