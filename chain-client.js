/**
 * Cosmos Chain Client - REST API Version
 * Handles all blockchain queries using Qubetics REST API
 */

class CosmosChainClient {
    constructor(chainConfig) {
        this.chainConfig = chainConfig;
        this.restEndpoint = chainConfig.rest;
    }

    async initialize() {
        try {
            console.log('Connecting to Qubetics REST API...');
            console.log('   Endpoint:', this.restEndpoint);
            
            const response = await fetch(`${this.restEndpoint}/cosmos/base/tendermint/v1beta1/blocks/latest`);
            
            if (!response.ok) {
                throw new Error(`REST API connection failed: ${response.status}`);
            }

            console.log('✅ Chain client initialized (REST API)');
            return true;

        } catch (error) {
            console.error('❌ Chain client initialization failed:', error);
            throw error;
        }
    }

    async getBalance(address) {
        try {
            const response = await fetch(
                `${this.restEndpoint}/cosmos/bank/v1beta1/balances/${address}`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch balance: ${response.status}`);
            }

            const data = await response.json();
            
            const ticsBalance = data.balances.find(
                b => b.denom === this.chainConfig.stakeCurrency.coinMinimalDenom
            );

            return ticsBalance || { denom: 'tics', amount: '0' };

        } catch (error) {
            console.error('Error fetching balance:', error);
            throw error;
        }
    }

    async getDelegations(delegatorAddress) {
        try {
            const response = await fetch(
                `${this.restEndpoint}/cosmos/staking/v1beta1/delegations/${delegatorAddress}`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch delegations: ${response.status}`);
            }

            const data = await response.json();
            return data.delegation_responses || [];

        } catch (error) {
            console.error('Error fetching delegations:', error);
            return [];
        }
    }

    async getDelegation(delegatorAddress, validatorAddress) {
        try {
            const response = await fetch(
                `${this.restEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}/delegations/${delegatorAddress}`
            );

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`Failed to fetch delegation: ${response.status}`);
            }

            const data = await response.json();
            return data.delegation_response || null;

        } catch (error) {
            console.error('Error fetching delegation:', error);
            return null;
        }
    }

    async getRewards(delegatorAddress) {
        try {
            const response = await fetch(
                `${this.restEndpoint}/cosmos/distribution/v1beta1/delegators/${delegatorAddress}/rewards`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch rewards: ${response.status}`);
            }

            const data = await response.json();
            return data || { rewards: [], total: [] };

        } catch (error) {
            console.error('Error fetching rewards:', error);
            return { rewards: [], total: [] };
        }
    }

    async getUnbondingDelegations(delegatorAddress) {
        try {
            const response = await fetch(
                `${this.restEndpoint}/cosmos/staking/v1beta1/delegators/${delegatorAddress}/unbonding_delegations`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch unbonding delegations: ${response.status}`);
            }

            const data = await response.json();
            return data.unbonding_responses || [];

        } catch (error) {
            console.error('Error fetching unbonding delegations:', error);
            return [];
        }
    }

    async getValidator(validatorAddress) {
        try {
            const response = await fetch(
                `${this.restEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch validator: ${response.status}`);
            }

            const data = await response.json();
            return data.validator;

        } catch (error) {
            console.error('Error fetching validator:', error);
            return null;
        }
    }

    async getAccount(address) {
        try {
            const response = await fetch(
                `${this.restEndpoint}/cosmos/auth/v1beta1/accounts/${address}`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch account: ${response.status}`);
            }

            const data = await response.json();
            return data.account;

        } catch (error) {
            console.error('Error fetching account:', error);
            throw error;
        }
    }

    async simulateTransaction(signerAddress, messages, memo = '') {
        try {
            console.warn('Gas simulation not available with REST API - using defaults');
            
            const messageType = messages[0]?.typeUrl || messages[0]?.['@type'] || '';
            
            if (messageType.includes('MsgDelegate')) {
                return this.chainConfig.gas.delegate;
            } else if (messageType.includes('MsgUndelegate')) {
                return this.chainConfig.gas.undelegate;
            } else if (messageType.includes('MsgWithdrawDelegatorReward')) {
                return this.chainConfig.gas.claimRewards;
            }

            return 200000;

        } catch (error) {
            console.error('Error simulating transaction:', error);
            return 200000;
        }
    }

    calculateTotalDelegated(delegations) {
        if (!delegations || delegations.length === 0) return '0';

        let total = BigInt(0);

        for (const delegation of delegations) {
            if (delegation.balance && delegation.balance.amount) {
                total += BigInt(delegation.balance.amount);
            }
        }

        return total.toString();
    }

    calculateTotalRewards(rewards) {
        if (!rewards || !rewards.total || rewards.total.length === 0) return '0';

        const ticsRewards = rewards.total.find(
            r => r.denom === this.chainConfig.stakeCurrency.coinMinimalDenom
        );

        if (!ticsRewards) return '0';

        const amount = parseFloat(ticsRewards.amount);
        return Math.floor(amount).toString();
    }

    calculateTotalUnbonding(unbondingDelegations) {
        if (!unbondingDelegations || unbondingDelegations.length === 0) return '0';

        let total = BigInt(0);

        for (const unbonding of unbondingDelegations) {
            if (unbonding.entries && unbonding.entries.length > 0) {
                for (const entry of unbonding.entries) {
                    if (entry.balance) {
                        total += BigInt(entry.balance);
                    }
                }
            }
        }

        return total.toString();
    }

    async getAllValidators() {
        try {
            console.log('📋 Fetching all validators...');
            
            // Fetch bonded validators
            const response = await fetch(
                `${this.restEndpoint}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=100`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch validators: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.validators || data.validators.length === 0) {
                console.warn('No validators found');
                return [];
            }

            console.log(`✅ Found ${data.validators.length} validators`);
            
            // Sort validators by tokens (descending)
            const sortedValidators = data.validators.sort((a, b) => {
                const tokensA = BigInt(a.tokens || '0');
                const tokensB = BigInt(b.tokens || '0');
                return tokensB > tokensA ? 1 : tokensB < tokensA ? -1 : 0;
            });
            
            return sortedValidators;

        } catch (error) {
            console.error('Error fetching validators:', error);
            return [];
        }
    }
}

if (typeof window !== 'undefined') {
    window.CosmosChainClient = CosmosChainClient;
    console.log('✅ Chain Client loaded');
}
