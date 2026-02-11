/**
 * QubeNode Platform - iOS Style Home Screen
 * Tile-based navigation with animations
 */

class QubeNodePlatform {
    constructor() {
        this.currentModule = null;
        this.cosmosStaking = null;
        this.walletConnected = false;
        this.walletType = null;
        this.walletAddress = null;
        this.VALIDATOR_ADDRESS = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        this.showingHome = true;
        
        console.log('QubeNode Platform initializing...');
    }
    
    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.walletType = urlParams.get('wallet');
        this.walletAddress = urlParams.get('address');
        
        this.setupEventListeners();
        
        if (this.walletType && this.walletAddress) {
            await this.initCosmosStaking();
            this.updateWalletDisplay();
        } else {
            this.showConnectWalletButton();
        }
        
        // Show home screen with tiles
        this.showHomeScreen();
        
        console.log('Platform initialized');
    }
    
    showConnectWalletButton() {
        const walletInfo = document.getElementById('walletInfo');
        if (walletInfo) {
            walletInfo.innerHTML = `
                <button class="btn-connect-wallet" id="connectWalletBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="7" width="18" height="13" rx="2" ry="2"/>
                        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    <span>Connect Wallet</span>
                </button>
            `;
            
            setTimeout(() => {
                const btn = document.getElementById('connectWalletBtn');
                if (btn) {
                    btn.addEventListener('click', () => this.showWalletSelectionModal());
                }
            }, 100);
        }
    }
    
    updateWalletDisplay() {
        const walletInfo = document.getElementById('walletInfo');
        if (walletInfo) {
            const short = this.walletAddress.slice(0, 10) + '...' + this.walletAddress.slice(-8);
            walletInfo.innerHTML = `
                <div class="wallet-address">${short}</div>
                <button class="btn-disconnect" id="disconnectBtn">
                    <span>Disconnect</span>
                </button>
            `;
            
            setTimeout(() => {
                const disconnectBtn = document.getElementById('disconnectBtn');
                if (disconnectBtn) {
                    disconnectBtn.addEventListener('click', () => this.disconnect());
                }
            }, 100);
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.showingHome) {
                this.showHomeScreen();
            }
        });
    }
    
    // ===== HOME SCREEN WITH TILES =====
    showHomeScreen() {
        this.showingHome = true;
        this.currentModule = null;
        
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="home-screen">
                <div class="home-header">
                    <h1 class="home-title">Welcome to QubeNode</h1>
                    <p class="home-subtitle">Choose a service to get started</p>
                </div>
                
                <div class="tiles-grid">
                    <div class="app-tile" data-module="staking">
                        <div class="tile-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                <path d="M2 17l10 5 10-5"/>
                                <path d="M2 12l10 5 10-5"/>
                            </svg>
                        </div>
                        <div class="tile-title">Staking Hub</div>
                        <div class="tile-description">Delegate & earn rewards</div>
                    </div>
                    
                    <div class="app-tile" data-module="portfolio">
                        <div class="tile-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                            </svg>
                        </div>
                        <div class="tile-title">Portfolio</div>
                        <div class="tile-description">Track your performance</div>
                    </div>
                    
                    <div class="app-tile" data-module="history">
                        <div class="tile-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 3v18h18"/>
                                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                            </svg>
                        </div>
                        <div class="tile-title">History</div>
                        <div class="tile-description">View transactions</div>
                    </div>
                    
                    <div class="app-tile" data-module="governance">
                        <div class="tile-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 11l3 3L22 4"/>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                            </svg>
                        </div>
                        <div class="tile-title">Governance</div>
                        <div class="tile-description">Vote on proposals</div>
                    </div>
                    
                    <div class="app-tile" data-module="explorers">
                        <div class="tile-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                            </svg>
                        </div>
                        <div class="tile-title">Explorers</div>
                        <div class="tile-description">Blockchain browsers</div>
                    </div>
                </div>
            </div>
        `;
        
        // Setup click handlers for tiles
        setTimeout(() => {
            document.querySelectorAll('.app-tile').forEach(tile => {
                tile.addEventListener('click', () => {
                    const module = tile.dataset.module;
                    this.openModule(module);
                });
            });
        }, 100);
    }
    
    async openModule(moduleName) {
        this.showingHome = false;
        this.currentModule = moduleName;
        
        const container = document.getElementById('mainContent');
        
        // Fade out home screen
        container.style.opacity = '0';
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Load module
        container.innerHTML = '<div class="module-loading"><div class="loading-spinner"></div></div>';
        container.style.opacity = '1';
        
        // Add back button to header
        this.showBackButton();
        
        // Render module
        setTimeout(async () => {
            if (moduleName === 'staking') {
                await this.renderStakingModule(container);
            } else if (moduleName === 'portfolio') {
                await this.renderPortfolioModule(container);
            } else if (moduleName === 'history') {
                await this.renderHistoryModule(container);
            } else if (moduleName === 'governance') {
                await this.renderGovernanceModule(container);
            } else if (moduleName === 'explorers') {
                await this.renderExplorersModule(container);
            }
        }, 500);
    }
    
    showBackButton() {
        const headerLeft = document.querySelector('.header-left');
        if (headerLeft && !document.getElementById('backBtn')) {
            const backBtn = document.createElement('button');
            backBtn.id = 'backBtn';
            backBtn.className = 'btn-back';
            backBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span>Home</span>
            `;
            headerLeft.insertBefore(backBtn, headerLeft.firstChild);
            
            backBtn.addEventListener('click', () => {
                this.showHomeScreen();
                backBtn.remove();
            });
        }
    }
    
    // ===== STAKING MODULE =====
    async renderStakingModule(container) {
        if (!this.walletConnected) {
            await this.renderPublicValidatorList(container);
        } else {
            await this.renderPersonalStaking(container);
        }
    }
    
    async renderPublicValidatorList(container) {
        container.innerHTML = `
            <div class="module-content">
                <div class="page-header">
                    <h1 class="page-title">Qubetics Validators</h1>
                    <p class="page-subtitle">Choose a validator to delegate your TICS tokens</p>
                </div>
                
                <div class="info-banner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                    <div>
                        <strong>Connect your wallet</strong> to see your delegations and delegate tokens
                    </div>
                </div>
                
                <div class="validators-grid" id="validatorsList">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Loading validators...</p>
                    </div>
                </div>
            </div>
        `;
        
        await this.loadValidators();
    }
    
    async loadValidators() {
        try {
            const response = await fetch('https://swagger.qubetics.com/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED');
            const data = await response.json();
            
            const validatorsList = document.getElementById('validatorsList');
            if (!validatorsList) return;
            
            if (data.validators && data.validators.length > 0) {
                validatorsList.innerHTML = data.validators.map(validator => {
                    const commission = parseFloat(validator.commission.commission_rates.rate) * 100;
                    const tokens = parseFloat(validator.tokens) / 1e18;
                    const isQubeNode = validator.operator_address === this.VALIDATOR_ADDRESS;
                    
                    return `
                        <div class="validator-card ${isQubeNode ? 'featured' : ''}">
                            ${isQubeNode ? '<div class="featured-badge">QubeNode</div>' : ''}
                            <div class="validator-header-info">
                                <div class="validator-avatar">${validator.description.moniker.charAt(0)}</div>
                                <div>
                                    <h3 class="validator-moniker">${validator.description.moniker}</h3>
                                    <p class="validator-address-short">${validator.operator_address.slice(0, 20)}...</p>
                                </div>
                            </div>
                            
                            <div class="validator-stats-grid">
                                <div class="validator-stat">
                                    <span class="stat-label">Commission</span>
                                    <span class="stat-value">${commission.toFixed(1)}%</span>
                                </div>
                                <div class="validator-stat">
                                    <span class="stat-label">Total Staked</span>
                                    <span class="stat-value">${this.formatNumber(tokens)} TICS</span>
                                </div>
                                <div class="validator-stat">
                                    <span class="stat-label">APY</span>
                                    <span class="stat-value stat-green">${(30 - commission).toFixed(1)}%</span>
                                </div>
                            </div>
                            
                            ${validator.description.details ? `
                                <p class="validator-description">${validator.description.details.substring(0, 100)}...</p>
                            ` : ''}
                            
                            <button class="btn btn-primary btn-delegate" data-validator="${validator.operator_address}">
                                Delegate
                            </button>
                        </div>
                    `;
                }).join('');
                
                this.setupDelegateButtons();
            } else {
                validatorsList.innerHTML = '<div class="empty-state"><p>No validators found</p></div>';
            }
        } catch (error) {
            console.error('Error loading validators:', error);
            document.getElementById('validatorsList').innerHTML = `
                <div class="empty-state">
                    <p>Failed to load validators. Please try again later.</p>
                </div>
            `;
        }
    }
    
    setupDelegateButtons() {
        document.querySelectorAll('.btn-delegate').forEach(btn => {
            btn.addEventListener('click', () => {
                const validatorAddress = btn.dataset.validator;
                if (!this.walletConnected) {
                    this.showConnectWalletPrompt('delegate');
                } else {
                    this.showDelegateModalForValidator(validatorAddress);
                }
            });
        });
    }
    
    showConnectWalletPrompt(action) {
        const messages = {
            'delegate': 'Connect your wallet to delegate tokens',
            'view': 'Connect your wallet to view your portfolio',
            'claim': 'Connect your wallet to claim rewards'
        };
        
        const modalContent = `
            <div class="modal-header">
                <h2>Wallet Required</h2>
                <button class="modal-close" id="modalCloseBtn">×</button>
            </div>
            <div class="modal-body connect-prompt">
                <div class="connect-prompt-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="7" width="18" height="13" rx="2" ry="2"/>
                        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </div>
                <p class="connect-prompt-text">${messages[action] || 'Connect your wallet to continue'}</p>
                <button class="btn btn-primary btn-large" id="connectNowBtn">Connect Wallet</button>
            </div>
        `;
        
        this.showModal(modalContent);
        
        setTimeout(() => {
            const closeBtn = document.getElementById('modalCloseBtn');
            const connectBtn = document.getElementById('connectNowBtn');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
            if (connectBtn) {
                connectBtn.addEventListener('click', () => {
                    this.closeModal();
                    this.showWalletSelectionModal();
                });
            }
        }, 100);
    }
    
    showWalletSelectionModal() {
        const modalContent = `
            <div class="modal-header">
                <h2>Connect Wallet</h2>
                <button class="modal-close" id="modalCloseBtn">×</button>
            </div>
            <div class="modal-body wallet-selection">
                <p class="wallet-selection-intro">Choose your wallet to connect</p>
                
                <button class="wallet-option-btn" id="connectKeplrBtn">
                    <div class="wallet-option-icon">
                        <svg viewBox="0 0 200 200" fill="none">
                            <circle cx="100" cy="100" r="90" fill="url(#keplrGrad)"/>
                            <path d="M100 40L70 100L100 160L130 100L100 40Z" fill="white"/>
                            <defs>
                                <linearGradient id="keplrGrad" x1="0" y1="0" x2="200" y2="200">
                                    <stop offset="0%" stop-color="#7C2AE8"/>
                                    <stop offset="100%" stop-color="#D946EF"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div class="wallet-option-info">
                        <div class="wallet-option-name">Keplr Wallet</div>
                        <div class="wallet-option-desc">Most popular Cosmos wallet</div>
                    </div>
                </button>
                
                <button class="wallet-option-btn" id="connectCosmostationBtn">
                    <div class="wallet-option-icon">
                        <svg viewBox="0 0 200 200" fill="none">
                            <circle cx="100" cy="100" r="90" fill="url(#cosmosGrad)"/>
                            <circle cx="100" cy="100" r="45" fill="white"/>
                            <defs>
                                <linearGradient id="cosmosGrad" x1="0" y1="0" x2="200" y2="200">
                                    <stop offset="0%" stop-color="#2E3148"/>
                                    <stop offset="100%" stop-color="#5F6B8A"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div class="wallet-option-info">
                        <div class="wallet-option-name">Cosmostation</div>
                        <div class="wallet-option-desc">Comprehensive Cosmos ecosystem</div>
                    </div>
                </button>
                
                <button class="wallet-option-btn" id="connectMetaMaskBtn">
                    <div class="wallet-option-icon">
                        <svg viewBox="0 0 200 200" fill="none">
                            <circle cx="100" cy="100" r="90" fill="url(#mmGrad)"/>
                            <path d="M100 80L85 100L100 110L115 100L100 80Z" fill="white"/>
                            <defs>
                                <linearGradient id="mmGrad" x1="0" y1="0" x2="200" y2="200">
                                    <stop offset="0%" stop-color="#F6851B"/>
                                    <stop offset="100%" stop-color="#E2761B"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div class="wallet-option-info">
                        <div class="wallet-option-name">MetaMask</div>
                        <div class="wallet-option-desc">EVM compatible connection</div>
                    </div>
                </button>
            </div>
        `;
        
        this.showModal(modalContent);
        
        setTimeout(() => {
            const closeBtn = document.getElementById('modalCloseBtn');
            const keplrBtn = document.getElementById('connectKeplrBtn');
            const cosmostationBtn = document.getElementById('connectCosmostationBtn');
            const metamaskBtn = document.getElementById('connectMetaMaskBtn');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
            if (keplrBtn) keplrBtn.addEventListener('click', () => this.connectWalletDirect('keplr'));
            if (cosmostationBtn) cosmostationBtn.addEventListener('click', () => this.connectWalletDirect('cosmostation'));
            if (metamaskBtn) metamaskBtn.addEventListener('click', () => this.connectWalletDirect('metamask'));
        }, 100);
    }
    
    async connectWalletDirect(walletType) {
        try {
            const btn = document.getElementById(`connect${walletType.charAt(0).toUpperCase() + walletType.slice(1)}Btn`);
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<div class="loading-spinner-small"></div><div class="wallet-option-info"><div class="wallet-option-name">Connecting...</div></div>';
            }
            
            let attempts = 0;
            while (typeof CosmosStakingModule === 'undefined' && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (typeof CosmosStakingModule === 'undefined') {
                throw new Error('CosmosStakingModule not loaded');
            }
            
            this.cosmosStaking = new CosmosStakingModule();
            await this.cosmosStaking.initialize();
            
            const result = await this.cosmosStaking.connectWallet(walletType);
            
            if (result.success) {
                this.walletConnected = true;
                this.walletType = walletType;
                this.walletAddress = result.address;
                
                const newUrl = `${window.location.pathname}?wallet=${walletType}&address=${this.walletAddress}`;
                window.history.pushState({}, '', newUrl);
                
                this.updateWalletDisplay();
                this.closeModal();
                
                // Reload current module if any
                if (this.currentModule) {
                    await this.openModule(this.currentModule);
                }
                
                this.showSuccess('Wallet connected successfully!');
            } else {
                throw new Error('Failed to connect wallet');
            }
        } catch (error) {
            console.error('Wallet connection error:', error);
            this.showError('Connection failed: ' + error.message);
            this.closeModal();
        }
    }
    
    async renderPersonalStaking(container) {
        const data = await this.cosmosStaking.refresh();
        
        container.innerHTML = `
            <div class="module-content">
                <div class="page-header">
                    <h1 class="page-title">My Staking</h1>
                    <p class="page-subtitle">Manage your TICS delegations and rewards</p>
                </div>
                
                <div class="stats-grid stagger-children">
                    <div class="stat-card">
                        <div class="stat-label">Available Balance</div>
                        <div class="stat-value">${this.formatTics(data.balance)}</div>
                        <div class="stat-unit">TICS</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Total Delegated</div>
                        <div class="stat-value">${this.formatTics(data.totalDelegated)}</div>
                        <div class="stat-unit">TICS</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Pending Rewards</div>
                        <div class="stat-value stat-green">${this.formatTics(data.totalRewards)}</div>
                        <div class="stat-unit">TICS</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">APY</div>
                        <div class="stat-value stat-green">28.5%</div>
                        <div class="stat-unit">Annual Yield</div>
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title">My Delegations</h3>
                    <div id="delegationsList">${this.renderDelegations(data)}</div>
                </div>
            </div>
        `;
    }
    
    renderDelegations(data) {
        if (!data.delegations || data.delegations.length === 0) {
            return '<div class="empty-state"><p>No active delegations</p></div>';
        }
        
        return data.delegations.map(del => {
            const amount = this.formatTics(del.balance.amount);
            const validator = del.delegation.validator_address;
            const isQubeNode = validator === this.VALIDATOR_ADDRESS;
            
            return `
                <div class="delegation-item ${isQubeNode ? 'highlight' : ''}">
                    <div class="delegation-info">
                        <div class="delegation-validator">
                            ${isQubeNode ? '<span class="badge-qubenode">QubeNode</span>' : ''}
                            <span class="validator-name">${isQubeNode ? 'QubeNode' : validator.slice(0, 20) + '...'}</span>
                        </div>
                        <div class="delegation-address">${validator}</div>
                    </div>
                    <div class="delegation-amount">
                        <div class="amount-value">${amount} TICS</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Continue with other modules...
    async renderPortfolioModule(container) {
        if (!this.walletConnected) {
            container.innerHTML = `
                <div class="module-content">
                    <div class="connect-required-card">
                        <div class="connect-required-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="7" width="18" height="13" rx="2" ry="2"/>
                                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </div>
                        <h2>Connect Wallet Required</h2>
                        <p>Connect your wallet to view your portfolio</p>
                        <button class="btn btn-primary btn-large" id="connectForPortfolio">Connect Wallet</button>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                const btn = document.getElementById('connectForPortfolio');
                if (btn) btn.addEventListener('click', () => this.showWalletSelectionModal());
            }, 100);
            return;
        }
        
        const data = await this.cosmosStaking.refresh();
        const balance = parseFloat(data.balance) / 1e18;
        const delegated = parseFloat(data.totalDelegated) / 1e18;
        const rewards = parseFloat(data.totalRewards) / 1e18;
        const total = balance + delegated + rewards;
        
        container.innerHTML = `
            <div class="module-content">
                <div class="page-header">
                    <h1 class="page-title">Portfolio</h1>
                    <p class="page-subtitle">Track your staking performance</p>
                </div>
                
                <div class="stats-grid stagger-children">
                    <div class="stat-card stat-primary">
                        <div class="stat-label">Total Value</div>
                        <div class="stat-value">${total.toFixed(3)}</div>
                        <div class="stat-unit">TICS</div>
                    </div>
                    <div class="stat-card stat-success">
                        <div class="stat-label">Staked</div>
                        <div class="stat-value">${delegated.toFixed(3)}</div>
                        <div class="stat-unit">TICS</div>
                    </div>
                    <div class="stat-card stat-warning">
                        <div class="stat-label">Claimable</div>
                        <div class="stat-value">${rewards.toFixed(3)}</div>
                        <div class="stat-unit">TICS</div>
                    </div>
                    <div class="stat-card stat-info">
                        <div class="stat-label">APY</div>
                        <div class="stat-value">28.5%</div>
                        <div class="stat-unit">Annual Rate</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async renderHistoryModule(container) {
        container.innerHTML = `
            <div class="module-content">
                <h2 class="page-title">Transaction History</h2>
                <div class="card">
                    <p class="card-content">Coming soon</p>
                </div>
            </div>
        `;
    }
    
    async renderGovernanceModule(container) {
        container.innerHTML = `
            <div class="module-content">
                <h2 class="page-title">Governance</h2>
                <div class="card">
                    <p class="card-content">Coming soon</p>
                </div>
            </div>
        `;
    }
    
    async renderExplorersModule(container) {
        container.innerHTML = `
            <div class="module-content">
                <h2 class="page-title">Blockchain Explorers</h2>
                <div class="stats-grid">
                    <div class="card hover-lift">
                        <h3 class="card-title">Native Explorer</h3>
                        <p class="card-content explorer-description">Explore transactions and validators</p>
                        <a href="https://explorer.qubetics.com" target="_blank" class="btn btn-primary">Open</a>
                    </div>
                    <div class="card hover-lift">
                        <h3 class="card-title">EVM Explorer</h3>
                        <p class="card-content explorer-description">View EVM transactions</p>
                        <a href="https://v2.ticsscan.com" target="_blank" class="btn btn-primary">Open</a>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Utility methods
    async initCosmosStaking() {
        try {
            let attempts = 0;
            while (typeof CosmosStakingModule === 'undefined' && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (typeof CosmosStakingModule === 'undefined') {
                throw new Error('CosmosStakingModule not loaded');
            }
            
            this.cosmosStaking = new CosmosStakingModule();
            await this.cosmosStaking.initialize();
            
            const result = await this.cosmosStaking.connectWallet(this.walletType);
            
            if (result.success) {
                this.walletConnected = true;
                console.log('Wallet connected successfully');
            } else {
                throw new Error('Failed to connect wallet');
            }
        } catch (error) {
            console.error('Error initializing Cosmos Staking:', error);
            this.showError('Failed to connect: ' + error.message);
        }
    }
    
    disconnect() {
        if (this.cosmosStaking) {
            this.cosmosStaking.disconnect();
        }
        this.walletConnected = false;
        this.walletType = null;
        this.walletAddress = null;
        this.showNotification('Wallet disconnected', 'info');
        this.showConnectWalletButton();
        this.showHomeScreen();
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showModal(content) {
        document.getElementById('modalContainer').innerHTML = content;
        document.getElementById('modalOverlay').classList.add('active');
    }
    
    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }
    
    formatTics(amount) {
        const tics = parseFloat(amount) / 1e18;
        return tics.toFixed(3);
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        }
        return num.toFixed(2);
    }
}

// Initialize
let platformInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing platform...');
    
    platformInstance = new QubeNodePlatform();
    await platformInstance.init();
    
    window.platformInstance = platformInstance;
});
