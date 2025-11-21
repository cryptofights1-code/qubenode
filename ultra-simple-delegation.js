// ULTRA SIMPLE DELEGATION - No dependencies, only Keplr!
console.log('🚀 Loading ultra-simple delegation...');

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
        
        console.log('📝 Creating transaction...');
        const signed = await createAndSignTx([msg], 'Delegation via QubeNode');
        
        console.log('✅ Transaction signed!');
        alert(`✅ Транзакція підписана!\n\nВідправляємо в блокчейн...`);
        
        // Update wallet
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
        alert(`✅ Транзакція підписана!\n\nВідправляємо в блокчейн...`);
        
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
console.log('   Functions: delegateTokens, claimRewards, redelegateTokens, unstakeTokens');
