/**
 * Cosmos Transaction Builder
 * Creates message objects for staking operations
 */

class CosmosTransactionBuilder {
    constructor(chainConfig) {
        this.chainConfig = chainConfig;
    }

    createDelegateMsg(delegatorAddress, validatorAddress, amount) {
        // CRITICAL: Use BigInt for large numbers to avoid exponential notation
        let amountStr;
        if (typeof amount === 'string' && amount.includes('e')) {
            const num = parseFloat(amount);
            amountStr = BigInt(Math.floor(num)).toString();
        } else {
            amountStr = String(amount);
        }
        
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
        // CRITICAL: Use BigInt for large numbers to avoid exponential notation
        let amountStr;
        if (typeof amount === 'string' && amount.includes('e')) {
            // Has exponential notation - convert via BigInt
            const num = parseFloat(amount);
            amountStr = BigInt(Math.floor(num)).toString();
        } else {
            amountStr = String(amount);
        }
        
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
        // CRITICAL: Use BigInt for large numbers to avoid exponential notation
        let amountStr;
        if (typeof amount === 'string' && amount.includes('e')) {
            const num = parseFloat(amount);
            amountStr = BigInt(Math.floor(num)).toString();
        } else {
            amountStr = String(amount);
        }
        
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
        // CRITICAL: Use BigInt for large numbers to avoid exponential notation
        let amountStr;
        if (typeof amount === 'string' && amount.includes('e')) {
            const num = parseFloat(amount);
            amountStr = BigInt(Math.floor(num)).toString();
        } else {
            amountStr = String(amount);
        }
        
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
