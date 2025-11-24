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
     * Sign and broadcast using Keplr's signDirect method (Protobuf for Ethermint)
     */
    async signAndBroadcast(offlineSigner, signerAddress, messages, gasLimit, memo = '') {
        try {
            console.log('🔏 Signing transaction with Keplr (Protobuf)...');
            console.log('   Messages:', messages.length);
            console.log('   Gas limit:', gasLimit);
            console.log('   Memo:', memo || '(none)');

            // Use Keplr's sendTx method which handles everything
            const result = await window.keplr.sendTx(
                this.chainConfig.chainId,
                {
                    gas: gasLimit.toString(),
                    gasDenom: this.chainConfig.stakeCurrency.coinMinimalDenom,
                    msgs: messages,
                    memo: memo,
                    fee: {
                        amount: [{
                            denom: this.chainConfig.stakeCurrency.coinMinimalDenom,
                            amount: Math.ceil(gasLimit * this.chainConfig.feeCurrencies[0].gasPriceStep.average).toString()
                        }],
                        gas: gasLimit.toString()
                    }
                },
                'sync'
            );

            console.log('✅ Transaction broadcast successful!');
            console.log('   TX Hash:', Buffer.from(result).toString('hex').toUpperCase());

            const txHash = Buffer.from(result).toString('hex').toUpperCase();

            return {
                success: true,
                txHash: txHash,
                height: 0
            };

        } catch (error) {
            console.error('❌ Transaction failed:', error);
            throw error;
        }
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
