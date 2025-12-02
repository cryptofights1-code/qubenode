/**
 * Cosmos Transaction Builder
 * Creates message objects for staking operations
 */

class CosmosTransactionBuilder {
    constructor(chainConfig) {
        this.chainConfig = chainConfig;
    }

    createDelegateMsg(delegatorAddress, validatorAddress, amount) {
        // CRITICAL: Ensure amount is string, not number (prevent exponential notation)
        const amountStr = typeof amount === 'number' ? amount.toFixed(0) : String(amount);
        
        return {
            typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
            value: {
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress,
                amount: {
                    denom: this.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: amountStr
                }
            }
        };
    }

    createUndelegateMsg(delegatorAddress, validatorAddress, amount) {
        // CRITICAL: Ensure amount is string, not number (prevent exponential notation)
        const amountStr = typeof amount === 'number' ? amount.toFixed(0) : String(amount);
        console.log('🔍 createUndelegateMsg - amount received:', amount, 'type:', typeof amount);
        console.log('🔍 createUndelegateMsg - amount converted:', amountStr, 'type:', typeof amountStr);
        
        return {
            typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
            value: {
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress,
                amount: {
                    denom: this.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: amountStr
                }
            }
        };
    }

    createRedelegateMsg(delegatorAddress, validatorSrcAddress, validatorDstAddress, amount) {
        // CRITICAL: Ensure amount is string, not number (prevent exponential notation)
        const amountStr = typeof amount === 'number' ? amount.toFixed(0) : String(amount);
        
        return {
            typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
            value: {
                delegatorAddress: delegatorAddress,
                validatorSrcAddress: validatorSrcAddress,
                validatorDstAddress: validatorDstAddress,
                amount: {
                    denom: this.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: amountStr
                }
            }
        };
    }

    createClaimRewardsMsg(delegatorAddress, validatorAddress) {
        return {
            typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
            value: {
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress
            }
        };
    }

    createCancelUnbondingMsg(delegatorAddress, validatorAddress, amount, creationHeight) {
        // CRITICAL: Ensure amount is string, not number (prevent exponential notation)
        const amountStr = typeof amount === 'number' ? amount.toFixed(0) : String(amount);
        
        return {
            typeUrl: '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation',
            value: {
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress,
                amount: {
                    denom: this.chainConfig.stakeCurrency.coinMinimalDenom,
                    amount: amountStr
                },
                creationHeight: creationHeight
            }
        };
    }

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
