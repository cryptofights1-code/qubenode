/**
 * Cosmos Transaction Builder
 * Builds, signs, and broadcasts transactions using wallet's native signing
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
     * Sign and broadcast transaction using wallet
     */
    async signAndBroadcast(signer, signerAddress, messages, gasLimit, memo = '') {
        try {
            console.log('🔏 Signing transaction...');
            console.log('   Messages:', messages.length);
            console.log('   Gas limit:', gasLimit);
            console.log('   Memo:', memo || '(none)');

            // Get fee from gas price
            const gasPrice = this.chainConfig.feeCurrencies[0].gasPriceStep.average;
            const feeAmount = Math.ceil(gasLimit * gasPrice / 1e18); // Convert from minimal denom

            const fee = {
                amount: [{
                    denom: this.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: (feeAmount * 1e18).toString() // Back to minimal denom
                }],
                gas: gasLimit.toString()
            };

            // Sign transaction using wallet's native method
            const result = await signer.signAndBroadcast(
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
