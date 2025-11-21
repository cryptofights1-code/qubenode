// Simple Delegation Functions - Uses ONLY Keplr sendTx API
// No CosmJS, no manual broadcasting - Keplr handles everything!

console.log('🔧 Loading simple delegation functions (Keplr sendTx API)...');

// Delegate tokens
window.simpleDelegateTokens = async function(amount) {
    console.log('💰 Delegating:', amount, 'TICS');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        const userAddress = window.userAddress;
        
        // Convert to utics (18 decimals)
        const amountInUtics = Math.floor(amount * Math.pow(10, 18)).toString();
        
        console.log('📤 Sending delegation transaction...');
        
        // Use Keplr sendTx - it handles signing AND broadcasting
        const result = await window.keplr.sendTx(
            chainId,
            {
                msgs: [{
                    type: 'cosmos-sdk/MsgDelegate',
                    value: {
                        delegator_address: userAddress,
                        validator_address: validatorAddress,
                        amount: {
                            denom: 'utics',
                            amount: amountInUtics
                        }
                    }
                }],
                fee: {
                    amount: [{ denom: 'utics', amount: '500000000000000000' }],
                    gas: '300000'
                },
                memo: 'Delegation via QubeNode'
            },
            'sync'
        );
        
        console.log('✅ Transaction sent:', result);
        
        alert(`✅ Делегування успішне!\n\nКількість: ${amount} TICS\n\nТранзакція надіслана. Баланс оновиться через кілька секунд.`);
        
        // Update wallet data
        if (typeof window.updateWalletData === 'function') {
            setTimeout(() => window.updateWalletData(), 4000);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Delegation error:', error);
        if (error.message && error.message.includes('rejected')) {
            console.log('ℹ️ User cancelled');
            return false;
        }
        alert('Помилка делегування: ' + error.message);
        return false;
    }
};

// Claim rewards
window.simpleClaimRewards = async function() {
    console.log('🎁 Claiming rewards');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        const userAddress = window.userAddress;
        
        console.log('📤 Sending claim transaction...');
        
        // Use Keplr sendTx
        const result = await window.keplr.sendTx(
            chainId,
            {
                msgs: [{
                    type: 'cosmos-sdk/MsgWithdrawDelegationReward',
                    value: {
                        delegator_address: userAddress,
                        validator_address: validatorAddress
                    }
                }],
                fee: {
                    amount: [{ denom: 'utics', amount: '500000000000000000' }],
                    gas: '300000'
                },
                memo: 'Claim rewards via QubeNode'
            },
            'sync'
        );
        
        console.log('✅ Claim sent:', result);
        
        alert(`✅ Винагороди отримано!\n\nТранзакція надіслана. Баланс оновиться через кілька секунд.`);
        
        // Update wallet data
        if (typeof window.updateWalletData === 'function') {
            setTimeout(() => window.updateWalletData(), 4000);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Claim error:', error);
        if (error.message && error.message.includes('rejected')) {
            console.log('ℹ️ User cancelled');
            return false;
        }
        alert('Помилка отримання винагород: ' + error.message);
        return false;
    }
};

// Redelegate tokens
window.simpleRedelegateTokens = async function(fromValidatorAddress, toValidatorAddress, amount) {
    console.log('🔄 Redelegating:', amount, 'TICS');
    console.log('   From:', fromValidatorAddress);
    console.log('   To:', toValidatorAddress);
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const userAddress = window.userAddress;
        
        // Convert to utics
        const amountInUtics = Math.floor(amount * Math.pow(10, 18)).toString();
        
        console.log('📤 Sending redelegate transaction...');
        
        // Use Keplr sendTx
        const result = await window.keplr.sendTx(
            chainId,
            {
                msgs: [{
                    type: 'cosmos-sdk/MsgBeginRedelegate',
                    value: {
                        delegator_address: userAddress,
                        validator_src_address: fromValidatorAddress,
                        validator_dst_address: toValidatorAddress,
                        amount: {
                            denom: 'utics',
                            amount: amountInUtics
                        }
                    }
                }],
                fee: {
                    amount: [{ denom: 'utics', amount: '500000000000000000' }],
                    gas: '300000'
                },
                memo: 'Redelegate via QubeNode'
            },
            'sync'
        );
        
        console.log('✅ Redelegate sent:', result);
        
        alert(`✅ Ределегування успішне!\n\nКількість: ${amount} TICS\n\nТокени миттєво переміщено до нового валідатора.`);
        
        // Update wallet data
        if (typeof window.updateWalletData === 'function') {
            setTimeout(() => window.updateWalletData(), 4000);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Redelegate error:', error);
        if (error.message && error.message.includes('rejected')) {
            console.log('ℹ️ User cancelled');
            return false;
        }
        alert('Помилка ределегування: ' + error.message);
        return false;
    }
};

// Unstake tokens
window.simpleUnstakeTokens = async function(validatorAddress, amount) {
    console.log('📤 Unstaking:', amount, 'TICS');
    console.log('   From validator:', validatorAddress);
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const userAddress = window.userAddress;
        
        // Convert to utics
        const amountInUtics = Math.floor(amount * Math.pow(10, 18)).toString();
        
        console.log('📤 Sending unstake transaction...');
        
        // Use Keplr sendTx
        const result = await window.keplr.sendTx(
            chainId,
            {
                msgs: [{
                    type: 'cosmos-sdk/MsgUndelegate',
                    value: {
                        delegator_address: userAddress,
                        validator_address: validatorAddress,
                        amount: {
                            denom: 'utics',
                            amount: amountInUtics
                        }
                    }
                }],
                fee: {
                    amount: [{ denom: 'utics', amount: '500000000000000000' }],
                    gas: '300000'
                },
                memo: 'Unstake via QubeNode'
            },
            'sync'
        );
        
        console.log('✅ Unstake sent:', result);
        
        alert(
            `✅ Unstake успішний!\n\n` +
            `Кількість: ${amount} TICS\n\n` +
            `⏳ Unbonding Period: 14 днів\n\n` +
            `Токени будуть автоматично повернуті у ваш гаманець через 14 днів.`
        );
        
        // Update wallet data
        if (typeof window.updateWalletData === 'function') {
            setTimeout(() => window.updateWalletData(), 4000);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Unstake error:', error);
        if (error.message && error.message.includes('rejected')) {
            console.log('ℹ️ User cancelled');
            return false;
        }
        alert('Помилка unstake: ' + error.message);
        return false;
    }
};

console.log('✅ Simple delegation functions loaded (Keplr sendTx API)');
console.log('   Functions available:');
console.log('   - window.simpleDelegateTokens(amount)');
console.log('   - window.simpleClaimRewards()');
console.log('   - window.simpleRedelegateTokens(fromValidator, toValidator, amount)');
console.log('   - window.simpleUnstakeTokens(validatorAddress, amount)');
