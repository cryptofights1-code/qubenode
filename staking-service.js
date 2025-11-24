/**
 * Cosmos Staking Service
 * High-level staking operations
 */

class CosmosStakingService {
    constructor(walletManager, chainClient, txBuilder) {
        this.walletManager = walletManager;
        this.chainClient = chainClient;
        this.txBuilder = txBuilder;
    }

    /**
     * Get complete staking overview for an address
     */
    async getStakingOverview(address) {
        try {
            console.log('📊 Loading staking overview for:', address);

            const [balance, delegations, rewards, unbonding] = await Promise.all([
                this.chainClient.getBalance(address),
                this.chainClient.getDelegations(address),
                this.chainClient.getRewards(address),
                this.chainClient.getUnbondingDelegations(address)
            ]);

            const totalDelegated = this.chainClient.calculateTotalDelegated(delegations);
            const totalRewards = this.chainClient.calculateTotalRewards(rewards);

            const overview = {
                address: address,
                balance: balance.amount,
                totalDelegated: totalDelegated,
                totalRewards: totalRewards,
                delegations: delegations,
                rewards: rewards,
                unbondingDelegations: unbonding
            };

            console.log('✅ Staking overview loaded');
            console.log('   Balance:', this.formatTics(balance.amount), 'TICS');
            console.log('   Delegated:', this.formatTics(totalDelegated), 'TICS');
            console.log('   Rewards:', this.formatTics(totalRewards), 'TICS');

            return overview;

        } catch (error) {
            console.error('Error loading staking overview:', error);
            throw error;
        }
    }

    /**
     * Delegate tokens
     */
    async delegate(validatorAddress, amount, memo = '') {
        try {
            const address = this.walletManager.getAddress();
            const signer = this.walletManager.getOfflineSigner();

            console.log('📤 Creating delegation transaction...');
            console.log('   From:', address);
            console.log('   To:', validatorAddress);
            console.log('   Amount:', this.formatTics(amount), 'TICS');

            const msg = this.txBuilder.createDelegateMsg(address, validatorAddress, amount);
            const gasLimit = this.chainClient.chainConfig.gas.delegate;

            const result = await this.txBuilder.signAndBroadcast(
                signer,
                address,
                [msg],
                gasLimit,
                memo
            );

            console.log('✅ Delegation successful!');
            return result;

        } catch (error) {
            console.error('❌ Delegation failed:', error);
            throw error;
        }
    }

    /**
     * Undelegate tokens
     */
    async undelegate(validatorAddress, amount, memo = '') {
        try {
            const address = this.walletManager.getAddress();
            const signer = this.walletManager.getOfflineSigner();

            console.log('📤 Creating undelegation transaction...');
            console.log('   From:', address);
            console.log('   Validator:', validatorAddress);
            console.log('   Amount:', this.formatTics(amount), 'TICS');

            const msg = this.txBuilder.createUndelegateMsg(address, validatorAddress, amount);
            const gasLimit = this.chainClient.chainConfig.gas.undelegate;

            const result = await this.txBuilder.signAndBroadcast(
                signer,
                address,
                [msg],
                gasLimit,
                memo
            );

            console.log('✅ Undelegation successful!');
            return result;

        } catch (error) {
            console.error('❌ Undelegation failed:', error);
            throw error;
        }
    }

    /**
     * Claim rewards
     */
    async claimRewards(validatorAddress, memo = '') {
        try {
            const address = this.walletManager.getAddress();
            const signer = this.walletManager.getOfflineSigner();

            console.log('📤 Creating claim rewards transaction...');
            console.log('   From:', address);
            console.log('   Validator:', validatorAddress);

            const msg = this.txBuilder.createClaimRewardsMsg(address, validatorAddress);
            const gasLimit = this.chainClient.chainConfig.gas.claimRewards;

            const result = await this.txBuilder.signAndBroadcast(
                signer,
                address,
                [msg],
                gasLimit,
                memo
            );

            console.log('✅ Rewards claimed successfully!');
            return result;

        } catch (error) {
            console.error('❌ Claim rewards failed:', error);
            throw error;
        }
    }

    /**
     * Format TICS amount for display
     */
    formatTics(amount) {
        if (!amount || amount === '0') return '0';
        
        const value = parseFloat(amount) / 1e18;
        return value.toFixed(6);
    }
}

if (typeof window !== 'undefined') {
    window.CosmosStakingService = CosmosStakingService;
    console.log('✅ Staking Service loaded');
}
