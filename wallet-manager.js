/**
 * Cosmos Wallet Manager
 * Handles Keplr and Cosmostation wallet connections
 */

class CosmosWalletManager {
    constructor(chainConfig) {
        this.chainConfig = chainConfig;
        this.connectedWallet = null;
        this.walletType = null;
        this.address = null;
        this.offlineSigner = null;
        
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    isConnected() {
        return this.address !== null && this.offlineSigner !== null;
    }

    async detectWallets() {
        const available = {
            keplr: false,
            cosmostation: false,
            mobile: this.isMobile
        };

        if (window.keplr) {
            available.keplr = true;
        }

        if (window.cosmostation) {
            available.cosmostation = true;
        }

        return available;
    }

    async connectKeplr() {
        try {
            if (!window.keplr) {
                throw new Error('Keplr не знайдено. Будь ласка, встановіть розширення Keplr.');
            }

            console.log('🔗 Connecting to Keplr...');

            try {
                await window.keplr.experimentalSuggestChain({
                    chainId: this.chainConfig.chainId,
                    chainName: this.chainConfig.chainName,
                    rpc: this.chainConfig.rpc,
                    rest: this.chainConfig.rest,
                    bip44: { coinType: 118 },
                    bech32Config: this.chainConfig.bech32Config,
                    currencies: this.chainConfig.currencies,
                    feeCurrencies: this.chainConfig.feeCurrencies,
                    stakeCurrency: this.chainConfig.stakeCurrency,
                    features: this.chainConfig.features
                });
                console.log('✅ Chain added/verified in Keplr');
            } catch (error) {
                console.warn('Chain suggestion failed (may already exist):', error);
            }

            await window.keplr.enable(this.chainConfig.chainId);
            this.offlineSigner = window.keplr.getOfflineSigner(this.chainConfig.chainId);
            const accounts = await this.offlineSigner.getAccounts();
            
            if (accounts.length === 0) {
                throw new Error('No accounts found in Keplr');
            }

            this.address = accounts[0].address;
            this.walletType = 'keplr';
            this.connectedWallet = window.keplr;

            console.log('✅ Keplr connected:', this.address);

            return {
                success: true,
                address: this.address,
                wallet: 'Keplr'
            };

        } catch (error) {
            console.error('❌ Keplr connection failed:', error);
            throw new Error(error.message || 'Failed to connect to Keplr');
        }
    }

    async connectCosmostation() {
        try {
            if (!window.cosmostation) {
                throw new Error('Cosmostation не знайдено. Будь ласка, встановіть розширення Cosmostation.');
            }

            console.log('🔗 Connecting to Cosmostation...');

            const provider = window.cosmostation.providers.keplr;

            if (!provider) {
                throw new Error('Cosmostation Keplr provider not available');
            }

            try {
                await provider.experimentalSuggestChain({
                    chainId: this.chainConfig.chainId,
                    chainName: this.chainConfig.chainName,
                    rpc: this.chainConfig.rpc,
                    rest: this.chainConfig.rest,
                    bip44: { coinType: 118 },
                    bech32Config: this.chainConfig.bech32Config,
                    currencies: this.chainConfig.currencies,
                    feeCurrencies: this.chainConfig.feeCurrencies,
                    stakeCurrency: this.chainConfig.stakeCurrency,
                    features: this.chainConfig.features
                });
            } catch (error) {
                console.warn('Chain suggestion failed:', error);
            }

            await provider.enable(this.chainConfig.chainId);
            this.offlineSigner = provider.getOfflineSigner(this.chainConfig.chainId);
            const accounts = await this.offlineSigner.getAccounts();

            if (accounts.length === 0) {
                throw new Error('No accounts found in Cosmostation');
            }

            this.address = accounts[0].address;
            this.walletType = 'cosmostation';
            this.connectedWallet = provider;

            console.log('✅ Cosmostation connected:', this.address);

            return {
                success: true,
                address: this.address,
                wallet: 'Cosmostation'
            };

        } catch (error) {
            console.error('❌ Cosmostation connection failed:', error);
            throw new Error(error.message || 'Failed to connect to Cosmostation');
        }
    }

    disconnect() {
        this.address = null;
        this.offlineSigner = null;
        this.connectedWallet = null;
        this.walletType = null;

        localStorage.removeItem('cosmos_wallet_type');
        localStorage.removeItem('cosmos_wallet_address');

        console.log('🔌 Wallet disconnected');

        return { success: true };
    }

    saveConnection() {
        if (this.walletType && this.address) {
            localStorage.setItem('cosmos_wallet_type', this.walletType);
            localStorage.setItem('cosmos_wallet_address', this.address);
        }
    }

    getOfflineSigner() {
        if (!this.offlineSigner) {
            throw new Error('Wallet not connected. Please connect your wallet first.');
        }
        return this.offlineSigner;
    }

    getAddress() {
        if (!this.address) {
            throw new Error('Wallet not connected. Please connect your wallet first.');
        }
        return this.address;
    }

    getWalletInfo() {
        return {
            connected: this.isConnected(),
            address: this.address,
            walletType: this.walletType,
            isMobile: this.isMobile
        };
    }

    onAccountChange(callback) {
        if (this.walletType === 'keplr' && window.keplr) {
            window.addEventListener('keplr_keystorechange', async () => {
                console.log('🔄 Keplr account changed');
                if (callback) callback();
            });
        }

        if (this.walletType === 'cosmostation' && window.cosmostation) {
            window.addEventListener('cosmostation_keystorechange', async () => {
                console.log('🔄 Cosmostation account changed');
                if (callback) callback();
            });
        }
    }
}

if (typeof window !== 'undefined') {
    window.CosmosWalletManager = CosmosWalletManager;
    console.log('✅ Wallet Manager loaded');
}
