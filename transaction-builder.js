/**
 * Cosmos Transaction Builder
 * Builds, signs, and broadcasts transactions using CosmJS
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
     * Sign and broadcast transaction using CosmJS
     */
    async signAndBroadcast(offlineSigner, signerAddress, messages, gasLimit, memo = '') {
        try {
            console.log('🔏 Signing transaction...');
            console.log('   Messages:', messages.length);
            console.log('   Gas limit:', gasLimit);
            console.log('   Memo:', memo || '(none)');

            // Check if CosmJS is loaded
            if (typeof window.stargate === 'undefined') {
                throw new Error('CosmJS library not loaded');
            }

            // Create SigningStargateClient
            const client = await window.stargate.SigningStargateClient.connectWithSigner(
                this.chainConfig.rpc,
                offlineSigner,
                {
                    gasPrice: window.stargate.GasPrice.fromString(
                        `${this.chainConfig.feeCurrencies[0].gasPriceStep.average}${this.chainConfig.stakeCurrency.coinMinimalDenom}`
                    )
                }
            );

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

            // Sign and broadcast
            const result = await client.signAndBroadcast(
                signerAddress,
                messages,
                fee,
                memo
            );

            console.log('✅ Transaction broadcast');
            console.log('   TX Hash:', result.transactionHash);

            if (result.code !== 0) {
                throw new Error(`Transaction failed: ${result.rawLog || 'Unknown error'}`);
            }

            return {
                success: true,
                txHash: result.transactionHash,
                height: result.height,
                gasUsed: result.gasUsed,
                gasWanted: result.gasWanted
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
