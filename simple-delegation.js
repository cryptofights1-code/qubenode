// Simple Delegation Functions - WITHOUT CosmJS
// Uses Keplr's built-in signAmino and broadcast methods

console.log('🔧 Loading simple delegation functions (no CosmJS)...');

// Helper: Broadcast transaction to RPC
async function broadcastTx(txBytes) {
    const rpcUrl = 'https://rpc-qubetics.whispernode.com';
    
    // Convert Uint8Array to base64
    const base64Tx = btoa(String.fromCharCode.apply(null, txBytes));
    
    const response = await fetch(`${rpcUrl}/broadcast_tx_commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'broadcast_tx_commit',
            params: {
                tx: base64Tx
            }
        })
    });
    
    const result = await response.json();
    console.log('📡 Broadcast result:', result);
    
    if (result.result && result.result.deliver_tx) {
        return {
            code: result.result.deliver_tx.code || 0,
            transactionHash: result.result.hash,
            rawLog: result.result.deliver_tx.log
        };
    }
    
    throw new Error(result.error?.message || 'Broadcast failed');
}

// Simple delegate function
window.simpleDelegateTokens = async function(amount) {
    console.log('💰 Simple delegate:', amount, 'TICS');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        const userAddress = window.userAddress;
        
        // Convert amount to utics (18 decimals)
        const amountInUtics = Math.floor(amount * Math.pow(10, 18)).toString();
        
        // Create Amino message
        const msg = {
            type: 'cosmos-sdk/MsgDelegate',
            value: {
                delegator_address: userAddress,
                validator_address: validatorAddress,
                amount: {
                    denom: 'utics',
                    amount: amountInUtics
                }
            }
        };
        
        // Fee
        const fee = {
            amount: [{ denom: 'utics', amount: '500000000000000000' }], // 0.5 TICS
            gas: '200000'
        };
        
        console.log('📝 Signing with Keplr...');
        
        // Sign with Keplr
        const signDoc = {
            chain_id: chainId,
            account_number: '0', // Will be filled by Keplr
            sequence: '0', // Will be filled by Keplr
            fee: fee,
            msgs: [msg],
            memo: 'Delegation via QubeNode'
        };
        
        let signedTx;
        if (window.keplr) {
            signedTx = await window.keplr.signAmino(chainId, userAddress, signDoc);
        } else if (window.cosmostation) {
            const provider = window.cosmostation.providers.keplr;
            signedTx = await provider.signAmino(chainId, userAddress, signDoc);
        } else {
            throw new Error('No wallet found');
        }
        
        console.log('✅ Signed:', signedTx);
        
        // Broadcast
        console.log('📡 Broadcasting...');
        const result = await broadcastTx(signedTx.signed);
        
        if (result.code === 0) {
            alert(`✅ Делегування успішне!\n\nКількість: ${amount} TICS\nTx Hash: ${result.transactionHash}`);
            
            // Update wallet data
            if (typeof window.updateWalletData === 'function') {
                setTimeout(() => window.updateWalletData(), 2000);
            }
            
            return true;
        } else {
            throw new Error(result.rawLog || 'Transaction failed');
        }
        
    } catch (error) {
        console.error('❌ Delegation error:', error);
        alert('Помилка: ' + error.message);
        return false;
    }
};

// Simple claim rewards function  
window.simpleClaimRewards = async function() {
    console.log('🎁 Simple claim rewards');
    
    if (!window.walletConnected || !window.userAddress) {
        alert('Будь ласка, підключіть гаманець');
        return false;
    }
    
    try {
        const chainId = 'qubetics_9030-1';
        const validatorAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        const userAddress = window.userAddress;
        
        // Create Amino message
        const msg = {
            type: 'cosmos-sdk/MsgWithdrawDelegationReward',
            value: {
                delegator_address: userAddress,
                validator_address: validatorAddress
            }
        };
        
        // Fee
        const fee = {
            amount: [{ denom: 'utics', amount: '500000000000000000' }], // 0.5 TICS
            gas: '200000'
        };
        
        console.log('📝 Signing claim with Keplr...');
        
        // Sign with Keplr
        const signDoc = {
            chain_id: chainId,
            account_number: '0',
            sequence: '0',
            fee: fee,
            msgs: [msg],
            memo: 'Claim rewards via QubeNode'
        };
        
        let signedTx;
        if (window.keplr) {
            signedTx = await window.keplr.signAmino(chainId, userAddress, signDoc);
        } else if (window.cosmostation) {
            const provider = window.cosmostation.providers.keplr;
            signedTx = await provider.signAmino(chainId, userAddress, signDoc);
        } else {
            throw new Error('No wallet found');
        }
        
        console.log('✅ Signed claim');
        
        // Broadcast
        console.log('📡 Broadcasting claim...');
        const result = await broadcastTx(signedTx.signed);
        
        if (result.code === 0) {
            alert(`✅ Винагороди отримано!\n\nTx Hash: ${result.transactionHash}`);
            
            // Update wallet data
            if (typeof window.updateWalletData === 'function') {
                setTimeout(() => window.updateWalletData(), 2000);
            }
            
            return true;
        } else {
            throw new Error(result.rawLog || 'Transaction failed');
        }
        
    } catch (error) {
        console.error('❌ Claim error:', error);
        alert('Помилка: ' + error.message);
        return false;
    }
};

console.log('✅ Simple delegation functions loaded');
console.log('   Functions: window.simpleDelegateTokens(), window.simpleClaimRewards()');
