/**
 * Cosmos Staking Module - Main Entry Point
 * Provides complete Cosmos wallet and staking functionality for QubeNode
 */

class CosmosStakingModule {
    constructor() {
        this.chainConfig = QUBETICS_CHAIN_CONFIG;
        this.validatorConfig = VALIDATOR_CONFIG;
        
        this.walletManager = new CosmosWalletManager(this.chainConfig);
        this.chainClient = new CosmosChainClient(this.chainConfig);
        this.txBuilder = new CosmosTransactionBuilder(this.chainConfig);
        this.stakingService = null;
        
        this.initialized = false;
        this.stakingOverview = null;
        
        console.log('Cosmos Staking Module created');
    }

    async initialize() {
        try {
            console.log('Initializing Cosmos Staking Module...');

            await this.chainClient.initialize();

            this.initialized = true;
            console.log('✅ Cosmos Staking Module initialized');

            return { success: true };

        } catch (error) {
            console.error('❌ Initialization failed:', error);
            throw error;
        }
    }

    async connectWallet(walletType = 'keplr') {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log('Connecting wallet:', walletType);

            let result;

            if (walletType === 'keplr') {
                result = await this.walletManager.connectKeplr();
            } else if (walletType === 'cosmostation') {
                result = await this.walletManager.connectCosmostation();
            } else {
                throw new Error('Unknown wallet type: ' + walletType);
            }

            if (result.success) {
                this.walletManager.saveConnection();

                this.stakingService = new CosmosStakingService(
                    this.walletManager,
                    this.chainClient,
                    this.txBuilder
                );

                await this.loadStakingOverview();

                console.log('✅ Wallet connected successfully');
            }

            return result;

        } catch (error) {
            console.error('❌ Wallet connection failed:', error);
            throw error;
        }
    }

    disconnect() {
        this.walletManager.disconnect();
        this.stakingService = null;
        this.stakingOverview = null;

        console.log('🔌 Wallet disconnected');

        return { success: true };
    }

    async loadStakingOverview() {
        try {
            if (!this.stakingService) {
                throw new Error('Staking service not initialized. Please connect wallet first.');
            }

            const address = this.walletManager.getAddress();
            this.stakingOverview = await this.stakingService.getStakingOverview(address);

            return this.stakingOverview;

        } catch (error) {
            console.error('Failed to load staking overview:', error);
            throw error;
        }
    }

    async refresh() {
        return await this.loadStakingOverview();
    }

    async delegate(amountTics, memo = '') {
        try {
            if (!this.stakingService) {
                throw new Error('Будь ласка, спочатку підключіть гаманець');
            }

            const amountMinimal = this.ticsToMinimal(amountTics);

            // Validate minimum
            if (amountTics < this.validatorConfig.minDelegation) {
                throw new Error(`Мінімальна сума делегування: ${this.validatorConfig.minDelegation} TICS`);
            }

            console.log('Delegating', amountTics, 'TICS...');

            const result = await this.stakingService.delegate(
                this.validatorConfig.operatorAddress,
                amountMinimal,
                memo
            );

            await this.loadStakingOverview();

            return result;

        } catch (error) {
            console.error('❌ Delegation failed:', error);
            throw error;
        }
    }

    async undelegate(amountTics, memo = '') {
        try {
            if (!this.stakingService) {
                throw new Error('Будь ласка, спочатку підключіть гаманець');
            }

            const amountMinimal = this.ticsToMinimal(amountTics);

            console.log('Undelegating', amountTics, 'TICS...');

            const result = await this.stakingService.undelegate(
                this.validatorConfig.operatorAddress,
                amountMinimal,
                memo
            );

            await this.loadStakingOverview();

            return result;

        } catch (error) {
            console.error('❌ Undelegation failed:', error);
            throw error;
        }
    }

    async redelegate(validatorSrcAddress, validatorDstAddress, amountTics, memo = '') {
        try {
            if (!this.stakingService) {
                throw new Error('Будь ласка, спочатку підключіть гаманець');
            }

            const amountMinimal = this.ticsToMinimal(amountTics);

            console.log('Redelegating', amountTics, 'TICS from', validatorSrcAddress, 'to', validatorDstAddress);

            const result = await this.stakingService.redelegate(
                validatorSrcAddress,
                validatorDstAddress,
                amountMinimal,
                memo
            );

            await this.loadStakingOverview();

            return result;

        } catch (error) {
            console.error('❌ Redelegation failed:', error);
            throw error;
        }
    }

    async claimRewards(memo = '', validatorAddresses = null) {
        try {
            if (!this.stakingService) {
                throw new Error('Будь ласка, спочатку підключіть гаманець');
            }

            console.log('Claiming rewards...');
            
            // If no validator addresses provided, use default (QubeNode)
            const validators = validatorAddresses || this.validatorConfig.operatorAddress;

            const result = await this.stakingService.claimRewards(
                validators,
                memo
            );

            await this.loadStakingOverview();

            return result;

        } catch (error) {
            console.error('❌ Claim rewards failed:', error);
            throw error;
        }
    }

    async cancelUnbonding(validatorAddress, amountTics, creationHeight, memo = '') {
        try {
            if (!this.stakingService) {
                throw new Error('Будь ласка, спочатку підключіть гаманець');
            }

            const amountMinimal = this.ticsToMinimal(amountTics);

            console.log('Canceling unbonding', amountTics, 'TICS from', validatorAddress, 'at height', creationHeight);

            const result = await this.stakingService.cancelUnbonding(
                validatorAddress,
                amountMinimal,
                creationHeight,
                memo
            );

            await this.loadStakingOverview();

            return result;

        } catch (error) {
            console.error('❌ Cancel unbonding failed:', error);
            throw error;
        }
    }

    getWalletInfo() {
        return this.walletManager.getWalletInfo();
    }

    getStakingOverview() {
        return this.stakingOverview;
    }

    getValidatorConfig() {
        return this.validatorConfig;
    }

    isWalletConnected() {
        return this.walletManager.isConnected();
    }

    async detectWallets() {
        return await this.walletManager.detectWallets();
    }

    ticsToMinimal(tics) {
        const result = String((parseFloat(tics) * 1e18).toFixed(0));
        console.log(`🔍 ticsToMinimal: ${tics} TICS -> ${result} minimal`);
        return result;
    }

    minimalToTics(minimal) {
        return parseFloat(minimal) / 1e18;
    }

    formatTics(minimal) {
        const tics = this.minimalToTics(minimal);
        return tics.toFixed(6);
    }
}

window.CosmosStakingModule = CosmosStakingModule;

console.log('✅ Cosmos Staking Module loaded');
