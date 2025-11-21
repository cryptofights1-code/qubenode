// Simple Delegation - Direct Keplr methods (most reliable)
console.log('🔧 Loading delegation functions...');

// Delegate using Keplr's built-in staking interface
window.simpleDelegateTokens = async function(amount) {
    console.log('💰 Delegating:', amount, 'TICS');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        
        // Convert TICS to utics (18 decimals) - Keplr expects string in base denom
        const amountInUtics = Math.floor(amount * Math.pow(10, 18)).toString();
        
        console.log('📤 Opening Keplr delegation interface...');
        console.log('   Amount:', amount, 'TICS =', amountInUtics, 'utics');
        
        // Use Keplr delegate method (amount must be in base denom string)
        await window.keplr.delegate(chainId, validatorAddress, amountInUtics);
        
        alert(`✅ Делегування успішне!\n\nКількість: ${amount} TICS\n\nБаланс оновиться через кілька секунд.`);
        
        // Update after delay
        if (typeof window.updateWalletData === 'function') {
            setTimeout(() => window.updateWalletData(), 5000);
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

// Claim rewards using Keplr method
window.simpleClaimRewards = async function() {
    console.log('🎁 Claiming rewards');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        
        // Use Keplr withdrawRewards method
        await window.keplr.withdrawRewards(chainId, validatorAddress);
        
        alert(`✅ Отримання винагород ініційовано!\n\nПідтвердіть транзакцію в Keplr.`);
        
        if (typeof window.updateWalletData === 'function') {
            setTimeout(() => window.updateWalletData(), 5000);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Claim error:', error);
        if (error.message && error.message.includes('rejected')) {
            console.log('ℹ️ User cancelled');
            return false;
        }
        alert('Помилка: ' + error.message);
        return false;
    }
};

// Redelegate
window.simpleRedelegateTokens = async function(fromValidatorAddress, toValidatorAddress, amount) {
    console.log('🔄 Redelegating:', amount, 'TICS');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        
        // Convert to utics
        const amountInUtics = Math.floor(amount * Math.pow(10, 18)).toString();
        
        console.log('📤 Opening Keplr redelegate interface...');
        
        // Use Keplr redelegate method
        await window.keplr.redelegate(chainId, fromValidatorAddress, toValidatorAddress, amountInUtics);
        
        alert(`✅ Ределегування успішне!\n\nКількість: ${amount} TICS\n\nТокени миттєво переміщено до нового валідатора.`);
        
        if (typeof window.updateWalletData === 'function') {
            setTimeout(() => window.updateWalletData(), 5000);
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

// Unstake
window.simpleUnstakeTokens = async function(validatorAddress, amount) {
    console.log('📤 Unstaking:', amount, 'TICS');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        
        // Convert to utics
        const amountInUtics = Math.floor(amount * Math.pow(10, 18)).toString();
        
        console.log('📤 Opening Keplr unstake interface...');
        
        // Use Keplr undelegate method
        await window.keplr.undelegate(chainId, validatorAddress, amountInUtics);
        
        alert(
            `✅ Unstake успішний!\n\n` +
            `Кількість: ${amount} TICS\n\n` +
            `⏳ Unbonding Period: 14 днів\n\n` +
            `Токени будуть автоматично повернуті у ваш гаманець через 14 днів.`
        );
        
        if (typeof window.updateWalletData === 'function') {
            setTimeout(() => window.updateWalletData(), 5000);
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

console.log('✅ Delegation functions loaded');
console.log('   Using Keplr built-in methods (most reliable)');
