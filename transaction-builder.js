/**
 * Cosmos Transaction Builder
 * Builds and broadcasts transactions using Keplr's native methods
 */

class CosmosTransactionBuilder {
    constructor(chainConfig) {
        this.chainConfig = chainConfig;
    }

    /**
     * Create delegation message
     */
    createDelegateMsg(delegatorAddress, validatorAddress, amount) {
        return {
            typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
            value: {
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress,
                amount: {
                    denom: this.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: amount
                }
            }
        };
    }

    /**
     * Create undelegation message
     */
    createUndelegateMsg(delegatorAddress, validatorAddress, amount) {
        return {
            typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
            value: {
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress,
                amount: {
                    denom: this.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: amount
                }
            }
        };
    }

    /**
     * Create claim rewards message
     */
    createClaimRewardsMsg(delegatorAddress, validatorAddress) {
        return {
            typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
            value: {
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress
            }
        };
    }

    /**
     * Sign and broadcast using Keplr's signAmino method
     */
    async signAndBroadcast(offlineSigner, signerAddress, messages, gasLimit, memo = '') {
        try {
            console.log('🔏 Signing transaction with Keplr...');
            console.log('   Messages:', messages.length);
            console.log('   Gas limit:', gasLimit);
            console.log('   Memo:', memo || '(none)');

            // Calculate fee
            const gasPrice = this.chainConfig.feeCurrencies[0].gasPriceStep.average;
            const feeAmount = Math.ceil(gasLimit * gasPrice);

            const fee = {
                amount: [{
                    denom: this.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: feeAmount.toString()
                }],
                gas: gasLimit.toString()
            };

            // Get account info
            const accountResponse = await fetch(
                `${this.chainConfig.rest}/cosmos/auth/v1beta1/accounts/${signerAddress}`
            );
            
            if (!accountResponse.ok) {
                throw new Error('Failed to fetch account info');
            }

            const accountData = await accountResponse.json();
            const account = accountData.account.base_account || accountData.account;
            const accountNumber = account.account_number;
            const sequence = account.sequence;

            // Convert messages to Amino format
            const aminoMsgs = messages.map(msg => this.toAminoMsg(msg));

            // Create sign doc
            const signDoc = {
                chain_id: this.chainConfig.chainId,
                account_number: accountNumber.toString(),
                sequence: sequence.toString(),
                fee: fee,
                msgs: aminoMsgs,
                memo: memo
            };

            console.log('📝 Requesting signature from Keplr...');

            // Sign with Keplr using signAmino
            const signed = await window.keplr.signAmino(
                this.chainConfig.chainId,
                signerAddress,
                signDoc
            );

            console.log('✅ Transaction signed');
            console.log('📡 Broadcasting transaction...');

            // Prepare tx for broadcast in StdTx format
            const stdTx = {
                msg: signed.signed.msgs,
                fee: signed.signed.fee,
                signatures: [signed.signature],
                memo: signed.signed.memo
            };
            
            const broadcastResponse = await fetch(
                `${this.chainConfig.rest}/txs`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tx: stdTx,
                        mode: 'sync'
                    })
                }
            );

            if (!broadcastResponse.ok) {
                const errorText = await broadcastResponse.text();
                throw new Error('Failed to broadcast transaction: ' + errorText);
            }

            const result = await broadcastResponse.json();

            if (result.code !== undefined && result.code !== 0) {
                throw new Error(result.raw_log || result.logs || 'Transaction failed');
            }

            console.log('✅ Transaction broadcast successful!');
            console.log('   TX Hash:', result.txhash);

            return {
                success: true,
                txHash: result.txhash,
                height: result.height
            };

        } catch (error) {
            console.error('❌ Transaction failed:', error);
            throw error;
        }
    }

    /**
     * Convert Protobuf message to Amino format
     */
    toAminoMsg(msg) {
        if (msg.typeUrl === '/cosmos.staking.v1beta1.MsgDelegate') {
            return {
                type: 'cosmos-sdk/MsgDelegate',
                value: msg.value
            };
        } else if (msg.typeUrl === '/cosmos.staking.v1beta1.MsgUndelegate') {
            return {
                type: 'cosmos-sdk/MsgUndelegate',
                value: msg.value
            };
        } else if (msg.typeUrl === '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward') {
            return {
                type: 'cosmos-sdk/MsgWithdrawDelegationReward',
                value: msg.value
            };
        }
        throw new Error('Unsupported message type: ' + msg.typeUrl);
    }

    /**
     * Format amount for display
     */
    formatAmount(amount, decimals = 18) {
        const value = BigInt(amount);
        const divisor = BigInt(10 ** decimals);
        const whole = value / divisor;
        const fraction = value % divisor;
        
        if (fraction === BigInt(0)) {
            return whole.toString();
        }
        
        const fractionStr = fraction.toString().padStart(decimals, '0');
        const trimmed = fractionStr.replace(/0+$/, '');
        
        return `${whole}.${trimmed}`;
    }
}

if (typeof window !== 'undefined') {
    window.CosmosTransactionBuilder = CosmosTransactionBuilder;
    console.log('✅ Transaction Builder loaded');
}
