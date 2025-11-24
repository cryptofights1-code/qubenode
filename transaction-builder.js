/**
 * Cosmos Transaction Builder
 * Creates message objects for staking operations
 */

class CosmosTransactionBuilder {
    constructor(chainConfig) {
        this.chainConfig = chainConfig;
    }

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

    createClaimRewardsMsg(delegatorAddress, validatorAddress) {
        return {
            typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
            value: {
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress
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
