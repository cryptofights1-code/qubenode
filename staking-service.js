/**
 * Cosmos Staking Service - Using Protobuf encoding like competitor
 * Compatible with Ethermint/Qubetics
 */

class CosmosStakingService {
    constructor(walletManager, chainClient, txBuilder) {
        this.walletManager = walletManager;
        this.chainClient = chainClient;
        this.txBuilder = txBuilder;
    }

    // Protobuf encoding helpers (from competitor's code)
    encodeVarint(value) {
        const bytes = [];
        while (value > 127) {
            bytes.push((value & 0x7f) | 0x80);
            value >>= 7;
        }
        bytes.push(value & 0x7f);
        return new Uint8Array(bytes);
    }

    concatenateUint8Arrays(arrays) {
        const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }

    encodeCoin(coin) {
        const encoder = new TextEncoder();
        const parts = [];
        
        const denomBytes = encoder.encode(coin.denom);
        parts.push(new Uint8Array([0x0a, denomBytes.length]));
        parts.push(denomBytes);
        
        const amountBytes = encoder.encode(coin.amount);
        parts.push(new Uint8Array([0x12, amountBytes.length]));
        parts.push(amountBytes);
        
        return this.concatenateUint8Arrays(parts);
    }

    encodeStakingMsg(value) {
        const encoder = new TextEncoder();
        const parts = [];
        
        const delegatorBytes = encoder.encode(value.delegatorAddress);
        parts.push(new Uint8Array([0x0a, delegatorBytes.length]));
        parts.push(delegatorBytes);
        
        const validatorBytes = encoder.encode(value.validatorAddress);
        parts.push(new Uint8Array([0x12, validatorBytes.length]));
        parts.push(validatorBytes);
        
        const coinBytes = this.encodeCoin(value.amount);
        parts.push(new Uint8Array([0x1a, coinBytes.length]));
        parts.push(coinBytes);
        
        return this.concatenateUint8Arrays(parts);
    }

    encodeWithdrawMsg(value) {
        const encoder = new TextEncoder();
        const parts = [];
        
        const delegatorBytes = encoder.encode(value.delegatorAddress);
        parts.push(new Uint8Array([0x0a, delegatorBytes.length]));
        parts.push(delegatorBytes);
        
        const validatorBytes = encoder.encode(value.validatorAddress);
        parts.push(new Uint8Array([0x12, validatorBytes.length]));
        parts.push(validatorBytes);
        
        return this.concatenateUint8Arrays(parts);
    }

    encodeRedelegateMsg(value) {
        const encoder = new TextEncoder();
        const parts = [];
        
        // Field 1: delegator_address
        const delegatorBytes = encoder.encode(value.delegatorAddress);
        parts.push(new Uint8Array([0x0a, delegatorBytes.length]));
        parts.push(delegatorBytes);
        
        // Field 2: validator_src_address
        const validatorSrcBytes = encoder.encode(value.validatorSrcAddress);
        parts.push(new Uint8Array([0x12, validatorSrcBytes.length]));
        parts.push(validatorSrcBytes);
        
        // Field 3: validator_dst_address
        const validatorDstBytes = encoder.encode(value.validatorDstAddress);
        parts.push(new Uint8Array([0x1a, validatorDstBytes.length]));
        parts.push(validatorDstBytes);
        
        // Field 4: amount (Coin)
        const coinBytes = this.encodeCoin(value.amount);
        parts.push(new Uint8Array([0x22, coinBytes.length]));
        parts.push(coinBytes);
        
        return this.concatenateUint8Arrays(parts);
    }

    encodeCancelUnbondingMsg(value) {
        const encoder = new TextEncoder();
        const parts = [];
        
        // Field 1: delegator_address
        const delegatorBytes = encoder.encode(value.delegatorAddress);
        parts.push(new Uint8Array([0x0a, delegatorBytes.length]));
        parts.push(delegatorBytes);
        
        // Field 2: validator_address
        const validatorBytes = encoder.encode(value.validatorAddress);
        parts.push(new Uint8Array([0x12, validatorBytes.length]));
        parts.push(validatorBytes);
        
        // Field 3: amount (Coin)
        const coinBytes = this.encodeCoin(value.amount);
        parts.push(new Uint8Array([0x1a, coinBytes.length]));
        parts.push(coinBytes);
        
        // Field 4: creation_height (int64)
        const heightBytes = this.encodeVarint(value.creationHeight);
        parts.push(new Uint8Array([0x20]));
        parts.push(heightBytes);
        
        return this.concatenateUint8Arrays(parts);
    }

    encodeMessageValue(typeUrl, value) {
        if (typeUrl === '/cosmos.staking.v1beta1.MsgDelegate' || 
            typeUrl === '/cosmos.staking.v1beta1.MsgUndelegate') {
            return this.encodeStakingMsg(value);
        } else if (typeUrl === '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward') {
            return this.encodeWithdrawMsg(value);
        } else if (typeUrl === '/cosmos.staking.v1beta1.MsgBeginRedelegate') {
            return this.encodeRedelegateMsg(value);
        } else if (typeUrl === '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation') {
            return this.encodeCancelUnbondingMsg(value);
        }
        throw new Error(`Unsupported message type: ${typeUrl}`);
    }

    encodeAny(typeUrl, valueBytes) {
        const encoder = new TextEncoder();
        const parts = [];
        
        const typeUrlBytes = encoder.encode(typeUrl);
        parts.push(new Uint8Array([0x0a, typeUrlBytes.length]));
        parts.push(typeUrlBytes);
        
        parts.push(new Uint8Array([0x12]));
        const lengthBytes = this.encodeVarint(valueBytes.length);
        parts.push(lengthBytes);
        parts.push(valueBytes);
        
        return this.concatenateUint8Arrays(parts);
    }

    encodeTxBody(messages, memo) {
        const parts = [];
        
        for (const msg of messages) {
            const anyBytes = this.encodeAny(msg.typeUrl, this.encodeMessageValue(msg.typeUrl, msg.value));
            parts.push(new Uint8Array([0x0a]));
            const lengthBytes = this.encodeVarint(anyBytes.length);
            parts.push(lengthBytes);
            parts.push(anyBytes);
        }
        
        if (memo) {
            const encoder = new TextEncoder();
            const memoBytes = encoder.encode(memo);
            parts.push(new Uint8Array([0x12]));
            parts.push(new Uint8Array([memoBytes.length]));
            parts.push(memoBytes);
        }
        
        return this.concatenateUint8Arrays(parts);
    }

    encodeFee(fee) {
        const parts = [];
        
        for (const coin of fee.amount) {
            const coinBytes = this.encodeCoin(coin);
            parts.push(new Uint8Array([0x0a]));
            const lengthBytes = this.encodeVarint(coinBytes.length);
            parts.push(lengthBytes);
            parts.push(coinBytes);
        }
        
        const gasLimit = parseInt(fee.gas);
        const gasBytes = this.encodeVarint(gasLimit);
        parts.push(new Uint8Array([0x10]));
        parts.push(gasBytes);
        
        return this.concatenateUint8Arrays(parts);
    }

    encodeSignerInfo(publicKey, sequence) {
        const parts = [];
        
        // Field 1: public_key (Any) - encode the public key properly
        if (publicKey) {
            const pubKeyAny = this.encodePublicKeyAny(publicKey);
            parts.push(new Uint8Array([0x0a])); // Tag for field 1
            const pkLengthBytes = this.encodeVarint(pubKeyAny.length);
            parts.push(pkLengthBytes);
            parts.push(pubKeyAny);
        }
        
        // Field 2: mode_info (ModeInfo for SIGN_MODE_DIRECT)
        const modeInfoBytes = new Uint8Array([0x0a, 0x02, 0x08, 0x01]);
        parts.push(new Uint8Array([0x12, modeInfoBytes.length]));
        parts.push(modeInfoBytes);
        
        // Field 3: sequence (uint64)
        const seqNum = parseInt(sequence);
        const seqBytes = this.encodeVarint(seqNum);
        parts.push(new Uint8Array([0x18]));
        parts.push(seqBytes);
        
        return this.concatenateUint8Arrays(parts);
    }

    encodePublicKeyAny(publicKey) {
        const parts = [];
        const encoder = new TextEncoder();
        
        // Type URL for secp256k1 public key (Ethermint uses this)
        const typeUrl = '/ethermint.crypto.v1.ethsecp256k1.PubKey';
        const typeUrlBytes = encoder.encode(typeUrl);
        
        // Field 1: type_url
        parts.push(new Uint8Array([0x0a, typeUrlBytes.length]));
        parts.push(typeUrlBytes);
        
        // Field 2: value (the actual public key bytes)
        // Public key structure: field 1 with tag 0x0a for key bytes
        const keyBytes = new Uint8Array(publicKey);
        const keyValueBytes = new Uint8Array([0x0a, keyBytes.length, ...keyBytes]);
        
        parts.push(new Uint8Array([0x12]));
        const valueLengthBytes = this.encodeVarint(keyValueBytes.length);
        parts.push(valueLengthBytes);
        parts.push(keyValueBytes);
        
        return this.concatenateUint8Arrays(parts);
    }

    encodeAuthInfo(publicKey, sequence, fee) {
        const parts = [];
        
        const signerInfoBytes = this.encodeSignerInfo(publicKey, sequence);
        parts.push(new Uint8Array([0x0a]));
        const siLengthBytes = this.encodeVarint(signerInfoBytes.length);
        parts.push(siLengthBytes);
        parts.push(signerInfoBytes);
        
        const feeBytes = this.encodeFee(fee);
        parts.push(new Uint8Array([0x12]));
        const feeLengthBytes = this.encodeVarint(feeBytes.length);
        parts.push(feeLengthBytes);
        parts.push(feeBytes);
        
        return this.concatenateUint8Arrays(parts);
    }

    encodeTxRaw(bodyBytes, authInfoBytes, signatures) {
        const parts = [];
        
        parts.push(new Uint8Array([0x0a]));
        const bodyLengthBytes = this.encodeVarint(bodyBytes.length);
        parts.push(bodyLengthBytes);
        parts.push(bodyBytes);
        
        parts.push(new Uint8Array([0x12]));
        const authLengthBytes = this.encodeVarint(authInfoBytes.length);
        parts.push(authLengthBytes);
        parts.push(authInfoBytes);
        
        for (const sig of signatures) {
            parts.push(new Uint8Array([0x1a]));
            const sigLengthBytes = this.encodeVarint(sig.length);
            parts.push(sigLengthBytes);
            parts.push(sig);
        }
        
        return this.concatenateUint8Arrays(parts);
    }

    base64ToUint8Array(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    uint8ArrayToHex(bytes) {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('').toUpperCase();
    }

    async signAndBroadcast(messages, fee, memo = '') {
        try {
            const chainId = this.chainClient.chainConfig.chainId;
            const address = this.walletManager.getAddress();

            console.log('📝 Preparing Protobuf transaction...');

            const account = await this.chainClient.getAccount(address);

            let accountNumber, sequence;
            if (account.base_account) {
                accountNumber = String(account.base_account.account_number);
                sequence = String(account.base_account.sequence);
                console.log('   Account Type: EthAccount (Ethermint)');
            } else {
                accountNumber = String(account.account_number || '0');
                sequence = String(account.sequence || '0');
            }

            console.log('   Account Number:', accountNumber);
            console.log('   Sequence:', sequence);

            const connectedWallet = this.walletManager.connectedWallet;
            const key = await connectedWallet.getKey(chainId);
            const publicKey = key.pubKey;

            const bodyBytes = this.encodeTxBody(messages, memo);
            const authInfoBytes = this.encodeAuthInfo(publicKey, sequence, fee);

            const signDoc = {
                bodyBytes: bodyBytes,
                authInfoBytes: authInfoBytes,
                chainId: chainId,
                accountNumber: accountNumber
            };

            console.log('🖊️ Requesting signature from wallet...');

            const signResponse = await connectedWallet.signDirect(
                chainId,
                address,
                signDoc
            );

            console.log('✅ Transaction signed');
            console.log('📡 Broadcasting transaction...');

            const signatureBytes = this.base64ToUint8Array(signResponse.signature.signature);
            const txRawBytes = this.encodeTxRaw(
                signResponse.signed.bodyBytes,
                signResponse.signed.authInfoBytes,
                [signatureBytes]
            );

            // CRITICAL: Different broadcast methods for different wallets
            let txHashHex;

            if (this.walletManager.walletType === 'keplr') {
                // Keplr: Use native sendTx method (works perfectly)
                console.log('📡 Broadcasting via Keplr sendTx...');
                const txHash = await connectedWallet.sendTx(chainId, txRawBytes, 'sync');
                txHashHex = this.uint8ArrayToHex(txHash);
            } else {
                // Cosmostation: Use REST API broadcast
                console.log('📡 Broadcasting via REST API (Cosmostation)...');
                
                // Convert to base64 for REST API
                const base64Tx = btoa(String.fromCharCode.apply(null, Array.from(txRawBytes)));
                
                const broadcastResponse = await fetch(
                    `${this.chainClient.chainConfig.rest}/cosmos/tx/v1beta1/txs`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tx_bytes: base64Tx,
                            mode: 'BROADCAST_MODE_SYNC'
                        })
                    }
                );

                if (!broadcastResponse.ok) {
                    const errorText = await broadcastResponse.text();
                    throw new Error(`Broadcast failed: ${broadcastResponse.status} - ${errorText}`);
                }

                const broadcastResult = await broadcastResponse.json();

                if (broadcastResult.tx_response && broadcastResult.tx_response.code !== 0) {
                    throw new Error(broadcastResult.tx_response.raw_log || 'Transaction failed');
                }

                txHashHex = broadcastResult.tx_response.txhash;
            }

            console.log('✅ Transaction broadcast successful!');
            console.log('   TX Hash:', txHashHex);

            return {
                success: true,
                txHash: txHashHex
            };

        } catch (error) {
            console.error('❌ Transaction failed:', error);
            throw error;
        }
    }

    async delegate(validatorAddress, amount, memo = '') {
        try {
            const delegatorAddress = this.walletManager.getAddress();

            const msg = this.txBuilder.createDelegateMsg(delegatorAddress, validatorAddress, amount);
            const gasLimit = this.chainClient.chainConfig.gas.delegate;
            
            const gasPrice = this.chainClient.chainConfig.feeCurrencies[0].gasPriceStep.average;
            const feeAmount = Math.ceil(gasLimit * gasPrice);

            const fee = {
                amount: [{
                    denom: this.chainClient.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: feeAmount.toString()
                }],
                gas: gasLimit.toString()
            };

            console.log('📤 Broadcasting delegation...');

            const result = await this.signAndBroadcast([msg], fee, memo);

            console.log('✅ Delegation successful:', result.txHash);

            return result;

        } catch (error) {
            console.error('❌ Delegation failed:', error);
            throw error;
        }
    }

    async undelegate(validatorAddress, amount, memo = '') {
        try {
            const delegatorAddress = this.walletManager.getAddress();

            const msg = this.txBuilder.createUndelegateMsg(delegatorAddress, validatorAddress, amount);
            const gasLimit = this.chainClient.chainConfig.gas.undelegate;
            
            const gasPrice = this.chainClient.chainConfig.feeCurrencies[0].gasPriceStep.average;
            const feeAmount = Math.ceil(gasLimit * gasPrice);

            const fee = {
                amount: [{
                    denom: this.chainClient.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: feeAmount.toString()
                }],
                gas: gasLimit.toString()
            };

            console.log('📤 Broadcasting undelegation...');

            const result = await this.signAndBroadcast([msg], fee, memo);

            console.log('✅ Undelegation successful:', result.txHash);

            return result;

        } catch (error) {
            console.error('❌ Undelegation failed:', error);
            throw error;
        }
    }

    async redelegate(validatorSrcAddress, validatorDstAddress, amount, memo = '') {
        try {
            const delegatorAddress = this.walletManager.getAddress();

            const msg = this.txBuilder.createRedelegateMsg(
                delegatorAddress, 
                validatorSrcAddress, 
                validatorDstAddress, 
                amount
            );
            
            const gasLimit = this.chainClient.chainConfig.gas.redelegate || 300000;
            
            const gasPrice = this.chainClient.chainConfig.feeCurrencies[0].gasPriceStep.average;
            const feeAmount = Math.ceil(gasLimit * gasPrice);

            const fee = {
                amount: [{
                    denom: this.chainClient.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: feeAmount.toString()
                }],
                gas: gasLimit.toString()
            };

            console.log('📤 Broadcasting redelegation...');
            console.log('   From:', validatorSrcAddress);
            console.log('   To:', validatorDstAddress);
            console.log('   Amount:', amount);

            const result = await this.signAndBroadcast([msg], fee, memo);

            console.log('✅ Redelegation successful:', result.txHash);

            return result;

        } catch (error) {
            console.error('❌ Redelegation failed:', error);
            throw error;
        }
    }

    async claimRewards(validatorAddressOrArray, memo = '') {
        try {
            const delegatorAddress = this.walletManager.getAddress();
            
            // Support both single validator and array of validators
            const validatorAddresses = Array.isArray(validatorAddressOrArray) 
                ? validatorAddressOrArray 
                : [validatorAddressOrArray];
            
            // Create message for each validator
            const messages = validatorAddresses.map(validatorAddress => 
                this.txBuilder.createClaimRewardsMsg(delegatorAddress, validatorAddress)
            );
            
            // Calculate gas based on number of validators
            const baseGas = this.chainClient.chainConfig.gas.claimRewards;
            const gasLimit = baseGas * validatorAddresses.length;
            
            const gasPrice = this.chainClient.chainConfig.feeCurrencies[0].gasPriceStep.average;
            const feeAmount = Math.ceil(gasLimit * gasPrice);

            const fee = {
                amount: [{
                    denom: this.chainClient.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: feeAmount.toString()
                }],
                gas: gasLimit.toString()
            };

            console.log(`📤 Broadcasting claim rewards from ${validatorAddresses.length} validator(s)...`);

            const result = await this.signAndBroadcast(messages, fee, memo);

            console.log('✅ Claim rewards successful:', result.txHash);

            return result;

        } catch (error) {
            console.error('❌ Claim rewards failed:', error);
            throw error;
        }
    }

    async cancelUnbonding(validatorAddress, amount, creationHeight, memo = '') {
        try {
            const delegatorAddress = this.walletManager.getAddress();

            const msg = this.txBuilder.createCancelUnbondingMsg(
                delegatorAddress, 
                validatorAddress, 
                amount,
                creationHeight
            );
            
            const gasLimit = this.chainClient.chainConfig.gas.cancelUnbonding || 250000;
            
            const gasPrice = this.chainClient.chainConfig.feeCurrencies[0].gasPriceStep.average;
            const feeAmount = Math.ceil(gasLimit * gasPrice);

            const fee = {
                amount: [{
                    denom: this.chainClient.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: feeAmount.toString()
                }],
                gas: gasLimit.toString()
            };

            console.log('📤 Broadcasting cancel unbonding...');
            console.log('   Validator:', validatorAddress);
            console.log('   Amount:', amount);
            console.log('   Creation Height:', creationHeight);

            const result = await this.signAndBroadcast([msg], fee, memo);

            console.log('✅ Cancel unbonding successful:', result.txHash);

            return result;

        } catch (error) {
            console.error('❌ Cancel unbonding failed:', error);
            throw error;
        }
    }

    async getStakingOverview(address) {
        try {
            console.log('📊 Loading staking overview...');

            const [balance, delegations, rewards, unbonding] = await Promise.all([
                this.chainClient.getBalance(address),
                this.chainClient.getDelegations(address),
                this.chainClient.getRewards(address),
                this.chainClient.getUnbondingDelegations(address)
            ]);

            const totalDelegated = this.chainClient.calculateTotalDelegated(delegations);
            const totalRewards = this.chainClient.calculateTotalRewards(rewards);
            const totalUnbonding = this.chainClient.calculateTotalUnbonding(unbonding);

            const overview = {
                address,
                balance: balance.amount,
                totalDelegated,
                totalRewards,
                totalUnbonding,
                delegations,
                rewards,
                unbondingDelegations: unbonding
            };

            console.log('✅ Staking overview loaded');
            return overview;

        } catch (error) {
            console.error('Error loading staking overview:', error);
            throw error;
        }
    }

    formatTics(amount) {
        if (!amount || amount === '0') return '0';
        
        const value = parseFloat(amount) / 1e18;
        return value.toFixed(6);
    }
}

if (typeof window !== 'undefined') {
    window.CosmosStakingService = CosmosStakingService;
    console.log('✅ Staking Service loaded (Protobuf encoding)');
}
