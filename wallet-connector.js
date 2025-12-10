class QubeNodeWalletConnector {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.walletType = null;
        this.isConnected = false;
        
        this.QubeticsKeplrChain = {
            chainId: "qubetics-1",
            chainName: "Qubetics Mainnet",
            rpc: "https://rpc.qubetics.com",
            rest: "https://api.qubetics.com",
            stakeCurrency: {
                coinDenom: "TICS",
                coinMinimalDenom: "atics",
                coinDecimals: 18
            },
            bip44: { coinType: 60 },
            bech32Config: {
                bech32PrefixAccAddr: "qubetics",
                bech32PrefixAccPub: "qubeticspub",
                bech32PrefixValAddr: "qubeticsvaloper",
                bech32PrefixValPub: "qubeticsvaloperpub",
                bech32PrefixConsAddr: "qubeticsvalcons",
                bech32PrefixConsPub: "qubeticsvalconspub"
            },
            currencies: [{
                coinDenom: "TICS",
                coinMinimalDenom: "atics",
                coinDecimals: 18
            }],
            feeCurrencies: [{
                coinDenom: "TICS",
                coinMinimalDenom: "atics",
                coinDecimals: 18,
                gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 }
            }],
            features: []
        };
        
        this.init();
    }
    
    init() {
        console.log('🚀 QubeNode Wallet Connector initialized');
        this.setupEventListeners();
        this.setupWalletEventListeners();
    }
    
    setupEventListeners() {
        // Modal controls
        const modal = document.getElementById('walletModal');
        const closeBtn = document.querySelector('.wallet-modal-close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal();
            });
        }
        
        // Wallet buttons
        const keplrBtn = document.getElementById('modalKeplrBtn');
        const cosmostationBtn = document.getElementById('modalCosmostationBtn');
        
        if (keplrBtn) {
            keplrBtn.addEventListener('click', () => this.connectKeplr());
        }
        
        if (cosmostationBtn) {
            cosmostationBtn.addEventListener('click', () => this.connectCosmostation());
        }
        
        console.log('✅ Event listeners attached');
    }
    
    setupWalletEventListeners() {
        if (window.keplr) {
            window.addEventListener('keplr_keystorechange', () => {
                if (this.walletType === 'keplr') {
                    console.log('🔄 Keplr keystore changed');
                    this.checkKeplrConnection();
                }
            });
        }
    }
    
    showModal() {
        const modal = document.getElementById('walletModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log('📱 Wallet modal opened');
        }
    }
    
    hideModal() {
        const modal = document.getElementById('walletModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            console.log('📱 Wallet modal closed');
        }
    }
    
    showConnecting(btnId) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.innerHTML = '<span>⏳</span><span>Підключення...</span>';
            btn.style.pointerEvents = 'none';
        }
    }
    
    resetButton(btnId, emoji, text) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.innerHTML = `<span>${emoji}</span><span>${text}</span>`;
            btn.style.pointerEvents = 'auto';
        }
    }
    
    async connectKeplr() {
        console.log('🔷 Connecting Keplr...');
        
        if (!window.keplr) {
            alert('Keplr не встановлено. Будь ласка, встановіть Keplr Wallet або відкрийте сайт через браузер Keplr.');
            return;
        }
        
        this.showConnecting('modalKeplrBtn');
        
        try {
            // Load validators registry first
            if (window.validatorsRegistry && !window.validatorsRegistry.loaded) {
                await window.validatorsRegistry.loadValidators();
            }
            
            // Create chain config with validators metadata
            let chainConfigToSuggest = this.QubeticsKeplrChain;
            if (window.validatorsRegistry && window.validatorsRegistry.loaded) {
                chainConfigToSuggest = window.validatorsRegistry.createChainConfigWithValidators(this.QubeticsKeplrChain);
                console.log('✅ Chain config includes validators metadata');
            }
            
            // Suggest the chain to Keplr with validators metadata
            try {
                await window.keplr.experimentalSuggestChain(chainConfigToSuggest);
                console.log('✅ Chain with validators suggested to Keplr');
            } catch (suggestError) {
                console.log('Chain already exists or suggestion failed:', suggestError.message);
                // Continue anyway, chain might already be added
            }
            
            // Enable Keplr
            await window.keplr.enable(this.QubeticsKeplrChain.chainId);
            
            // Get offline signer
            const offlineSigner = window.keplr.getOfflineSigner(this.QubeticsKeplrChain.chainId);
            const accounts = await offlineSigner.getAccounts();
            
            this.address = accounts[0].address;
            this.walletType = 'keplr';
            this.isConnected = true;
            
            console.log('✅ Keplr connected:', this.address);
            
            this.hideModal();
            this.redirectToDashboard();
            
        } catch (error) {
            console.error('❌ Keplr connection error:', error);
            alert('Помилка підключення Keplr: ' + error.message);
            this.resetButton('modalKeplrBtn', '🔷', 'Keplr Wallet');
        }
    }
    
    async connectCosmostation() {
        console.log('🔶 Connecting Cosmostation...');
        
        if (!window.cosmostation) {
            alert('Cosmostation не встановлено. Будь ласка, встановіть Cosmostation Wallet або відкрийте сайт через браузер Cosmostation.');
            return;
        }
        
        this.showConnecting('modalCosmostationBtn');
        
        try {
            // Get Keplr-compatible provider from Cosmostation
            const provider = window.cosmostation.providers.keplr;
            
            // Suggest the chain first
            try {
                await provider.experimentalSuggestChain(this.QubeticsKeplrChain);
                console.log('✅ Chain suggested to Cosmostation');
            } catch (suggestError) {
                console.log('Chain already exists or suggestion failed:', suggestError.message);
            }
            
            // Enable the chain
            await provider.enable(this.QubeticsKeplrChain.chainId);
            
            // Get offline signer
            const offlineSigner = provider.getOfflineSigner(this.QubeticsKeplrChain.chainId);
            const accounts = await offlineSigner.getAccounts();
            
            this.address = accounts[0].address;
            this.walletType = 'cosmostation';
            this.isConnected = true;
            
            console.log('✅ Cosmostation connected:', this.address);
            
            this.hideModal();
            this.redirectToDashboard();
            
        } catch (error) {
            console.error('❌ Cosmostation connection error:', error);
            alert('Помилка підключення Cosmostation: ' + error.message);
            this.resetButton('modalCosmostationBtn', '🔶', 'Cosmostation');
        }
    }
    
    async checkKeplrConnection() {
        if (window.keplr && this.walletType === 'keplr') {
            try {
                const key = await window.keplr.getKey(this.QubeticsKeplrChain.chainId);
                this.address = key.bech32Address;
                console.log('🔄 Keplr connection updated:', this.address);
            } catch (error) {
                console.error('❌ Keplr connection check failed:', error);
                this.disconnect();
            }
        }
    }
    
    redirectToDashboard() {
        const url = `dashboard.html?wallet=${this.walletType}&address=${this.address}`;
        console.log('🔀 Redirecting to:', url);
        window.location.href = url;
    }
    
    disconnect() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.walletType = null;
        this.isConnected = false;
        console.log('🔌 Wallet disconnected');
    }
    
    // Public getters
    getAddress() { return this.address; }
    getWalletType() { return this.walletType; }
    getIsConnected() { return this.isConnected; }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 Initializing QubeNode Wallet Connector...');
    window.walletConnector = new QubeNodeWalletConnector();
    
    // Attach to mobile header button
    const mobileBtn = document.getElementById('mobileHeaderWalletBtn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            console.log('💼 Mobile wallet button clicked');
            window.walletConnector.showModal();
        });
        
        mobileBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            console.log('👆 Mobile wallet button touched');
            window.walletConnector.showModal();
        }, { passive: false });
        
        console.log('✅ Mobile header button connected to wallet connector');
    }
});
