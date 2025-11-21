// Simple Delegation Functions - Using Keplr experimental API
// This uses Keplr's built-in signing and broadcasting

console.log('🔧 Loading simple delegation functions (Keplr experimental API)...');

// Simple delegate function using Keplr experimental API
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
        
        // Convert amount to utics (18 decimals)
        // Use string multiplication to avoid floating point errors
        const amountInUtics = (BigInt(Math.floor(amount * 1000000)) * BigInt(1000000000000)).toString();
        
        console.log('📝 Creating delegation message...');
        console.log('   Amount:', amount, 'TICS =', amountInUtics, 'utics');
        
        // Check if Keplr has experimental features
        if (!window.keplr && !window.cosmostation) {
            throw new Error('Гаманець не знайдено');
        }
        
        // Use Keplr's sendMsgs (experimental feature)
        let wallet;
        if (window.keplr) {
            wallet = window.keplr;
        } else {
            wallet = window.cosmostation.providers.keplr;
        }
        
        // Create the message
        const msg = {
            typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
            value: {
                delegatorAddress: userAddress,
                validatorAddress: validatorAddress,
                amount: {
                    denom: 'utics',
                    amount: amountInUtics
                }
            }
        };
        
        console.log('📤 Sending transaction...');
        
        // Use Keplr's signAndBroadcast if available
        if (typeof wallet.signAndBroadcast === 'function') {
            const result = await wallet.signAndBroadcast(
                chainId,
                userAddress,
                [msg],
                {
                    amount: [{ denom: 'utics', amount: '500000000000000000' }],
                    gas: '200000'
                },
                'Delegation via QubeNode'
            );
            
            console.log('✅ Transaction result:', result);
            
            if (result.code === 0 || !result.code) {
                alert(`✅ Делегування успішне!\n\nКількість: ${amount} TICS\nTx Hash: ${result.transactionHash || result.hash}`);
                
                if (typeof window.updateWalletData === 'function') {
                    setTimeout(() => window.updateWalletData(), 2000);
                }
                
                return true;
            } else {
                throw new Error(result.rawLog || result.log || 'Transaction failed');
            }
        } else {
            throw new Error('Keplr signAndBroadcast not available. Please update Keplr wallet.');
        }
        
    } catch (error) {
        console.error('❌ Delegation error:', error);
        alert('Помилка делегування: ' + error.message);
        return false;
    }
};

// Simple claim rewards function using Keplr experimental API
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
        
        console.log('📝 Creating claim message...');
        
        let wallet;
        if (window.keplr) {
            wallet = window.keplr;
        } else if (window.cosmostation) {
            wallet = window.cosmostation.providers.keplr;
        } else {
            throw new Error('Гаманець не знайдено');
        }
        
        // Create the message
        const msg = {
            typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
            value: {
                delegatorAddress: userAddress,
                validatorAddress: validatorAddress
            }
        };
        
        console.log('📤 Sending transaction...');
        
        if (typeof wallet.signAndBroadcast === 'function') {
            const result = await wallet.signAndBroadcast(
                chainId,
                userAddress,
                [msg],
                {
                    amount: [{ denom: 'utics', amount: '500000000000000000' }],
                    gas: '200000'
                },
                'Claim rewards via QubeNode'
            );
            
            console.log('✅ Claim result:', result);
            
            if (result.code === 0 || !result.code) {
                alert(`✅ Винагороди отримано!\n\nTx Hash: ${result.transactionHash || result.hash}`);
                
                if (typeof window.updateWalletData === 'function') {
                    setTimeout(() => window.updateWalletData(), 2000);
                }
                
                return true;
            } else {
                throw new Error(result.rawLog || result.log || 'Transaction failed');
            }
        } else {
            throw new Error('Keplr signAndBroadcast not available. Please update Keplr wallet.');
        }
        
    } catch (error) {
        console.error('❌ Claim error:', error);
        alert('Помилка отримання винагород: ' + error.message);
        return false;
    }
};

// Redelegate function - move stake from one validator to another
window.simpleRedelegateTokens = async function(fromValidatorAddress, toValidatorAddress, amount) {
    console.log('🔄 Redelegating:', amount, 'TICS');
    console.log('   From:', fromValidatorAddress);
    console.log('   To:', toValidatorAddress);
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    if (!fromValidatorAddress || !toValidatorAddress) {
        alert('Будь ласка, оберіть валідаторів для ределегування');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const userAddress = window.userAddress;
        
        // Convert amount to utics
        const amountInUtics = (BigInt(Math.floor(amount * 1000000)) * BigInt(1000000000000)).toString();
        
        console.log('📝 Creating redelegate message...');
        console.log('   Amount:', amount, 'TICS =', amountInUtics, 'utics');
        
        let wallet;
        if (window.keplr) {
            wallet = window.keplr;
        } else if (window.cosmostation) {
            wallet = window.cosmostation.providers.keplr;
        } else {
            throw new Error('Гаманець не знайдено');
        }
        
        // Create the redelegate message
        const msg = {
            typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
            value: {
                delegatorAddress: userAddress,
                validatorSrcAddress: fromValidatorAddress,
                validatorDstAddress: toValidatorAddress,
                amount: {
                    denom: 'utics',
                    amount: amountInUtics
                }
            }
        };
        
        console.log('📤 Sending redelegate transaction...');
        
        if (typeof wallet.signAndBroadcast === 'function') {
            const result = await wallet.signAndBroadcast(
                chainId,
                userAddress,
                [msg],
                {
                    amount: [{ denom: 'utics', amount: '500000000000000000' }],
                    gas: '300000'
                },
                'Redelegate via QubeNode'
            );
            
            console.log('✅ Redelegate result:', result);
            
            if (result.code === 0 || !result.code) {
                alert(`✅ Ределегування успішне!\n\nКількість: ${amount} TICS\n\nТокени миттєво переміщено до нового валідатора.\n\nTx Hash: ${result.transactionHash || result.hash}`);
                
                if (typeof window.updateWalletData === 'function') {
                    setTimeout(() => window.updateWalletData(), 2000);
                }
                
                return true;
            } else {
                throw new Error(result.rawLog || result.log || 'Transaction failed');
            }
        } else {
            throw new Error('Keplr signAndBroadcast not available. Please update Keplr wallet.');
        }
        
    } catch (error) {
        console.error('❌ Redelegate error:', error);
        alert('Помилка ределегування: ' + error.message);
        return false;
    }
};

// Unstake (Undelegate) function - withdraw tokens from staking
window.simpleUnstakeTokens = async function(validatorAddress, amount) {
    console.log('📤 Unstaking:', amount, 'TICS');
    console.log('   From validator:', validatorAddress);
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    if (!validatorAddress) {
        alert('Будь ласка, оберіть валідатора');
        return false;
    }
    
    // Confirm with user about unbonding period
    const confirmed = confirm(
        `⚠️ Увага: Unbonding Period\n\n` +
        `Після unstake діє період очікування 14 днів.\n\n` +
        `Протягом цього періоду:\n` +
        `• Токени не приносять винагороду\n` +
        `• Токени заблоковані і недоступні\n` +
        `• Через 14 днів токени автоматично повернуться у ваш гаманець\n\n` +
        `Продовжити unstake ${amount} TICS?`
    );
    
    if (!confirmed) {
        console.log('ℹ️ Unstake cancelled by user');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const userAddress = window.userAddress;
        
        // Convert amount to utics
        const amountInUtics = (BigInt(Math.floor(amount * 1000000)) * BigInt(1000000000000)).toString();
        
        console.log('📝 Creating unstake message...');
        console.log('   Amount:', amount, 'TICS =', amountInUtics, 'utics');
        
        let wallet;
        if (window.keplr) {
            wallet = window.keplr;
        } else if (window.cosmostation) {
            wallet = window.cosmostation.providers.keplr;
        } else {
            throw new Error('Гаманець не знайдено');
        }
        
        // Create the undelegate message
        const msg = {
            typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
            value: {
                delegatorAddress: userAddress,
                validatorAddress: validatorAddress,
                amount: {
                    denom: 'utics',
                    amount: amountInUtics
                }
            }
        };
        
        console.log('📤 Sending unstake transaction...');
        
        if (typeof wallet.signAndBroadcast === 'function') {
            const result = await wallet.signAndBroadcast(
                chainId,
                userAddress,
                [msg],
                {
                    amount: [{ denom: 'utics', amount: '500000000000000000' }],
                    gas: '300000'
                },
                'Unstake via QubeNode'
            );
            
            console.log('✅ Unstake result:', result);
            
            if (result.code === 0 || !result.code) {
                alert(
                    `✅ Unstake успішний!\n\n` +
                    `Кількість: ${amount} TICS\n\n` +
                    `⏳ Unbonding Period: 14 днів\n\n` +
                    `Токени будуть автоматично повернуті у ваш гаманець через 14 днів.\n\n` +
                    `Tx Hash: ${result.transactionHash || result.hash}`
                );
                
                if (typeof window.updateWalletData === 'function') {
                    setTimeout(() => window.updateWalletData(), 2000);
                }
                
                return true;
            } else {
                throw new Error(result.rawLog || result.log || 'Transaction failed');
            }
        } else {
            throw new Error('Keplr signAndBroadcast not available. Please update Keplr wallet.');
        }
        
    } catch (error) {
        console.error('❌ Unstake error:', error);
        alert('Помилка unstake: ' + error.message);
        return false;
    }
};

console.log('✅ Simple delegation functions loaded (Keplr experimental API)');
console.log('   Functions available:');
console.log('   - window.simpleDelegateTokens(amount)');
console.log('   - window.simpleClaimRewards()');
console.log('   - window.simpleRedelegateTokens(fromValidator, toValidator, amount)');
console.log('   - window.simpleUnstakeTokens(validatorAddress, amount)');
