/**
 * QubeNode Staking Platform - Main Controller
 * Complete platform initialization and module management
 */

// ===== PLATFORM CORE =====
class QubeNodePlatform {
    constructor() {
        this.currentModule = null;
        this.cosmosStaking = null;
        this.walletConnected = false;
        this.walletType = null;
        this.walletAddress = null;
        this.VALIDATOR_ADDRESS = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        
        console.log('QubeNode Platform initializing...');
    }
    
    async init() {
        // Check wallet connection from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.walletType = urlParams.get('wallet');
        this.walletAddress = urlParams.get('address');
        
        if (!this.walletType || !this.walletAddress) {
            this.showError('No wallet connection. Redirecting...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        // Update wallet display
        this.updateWalletDisplay();
        
        // Initialize Cosmos Staking
        await this.initCosmosStaking();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load default module (Staking Hub)
        await this.loadModule('staking');
        
        console.log('Platform initialized successfully');
    }
    
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
    
    updateWalletDisplay() {
        const el = document.getElementById('walletAddress');
        if (el) {
            const short = this.walletAddress.slice(0, 10) + '...' + this.walletAddress.slice(-8);
            el.textContent = short;
        }
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item[data-module]').forEach(item => {
            item.addEventListener('click', async () => {
                await this.loadModule(item.dataset.module);
            });
        });
        
        // Disconnect
        const disconnectBtn = document.getElementById('disconnectBtn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnect());
        }
        
        // Modal
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) this.closeModal();
            });
        }
        
        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }
    
    async loadModule(moduleName) {
        console.log('Loading module:', moduleName);
        
        this.updateNavigation(moduleName);
        
        const container = document.getElementById('moduleContainer');
        
        // Exit animation
        if (this.currentModule) {
            container.classList.add('module-leave');
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        container.innerHTML = '';
        container.className = 'module-container';
        
        // Load module
        try {
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
            
            container.classList.add('module-enter');
            this.currentModule = moduleName;
            
        } catch (error) {
            console.error('Error loading module:', error);
            this.showError('Failed to load module: ' + error.message);
        }
    }
    
    // ===== STAKING MODULE =====
    async renderStakingModule(container) {
        const data = await this.cosmosStaking.refresh();
        
        container.innerHTML = `
            <div class="staking-hub">
                <div class="page-header">
                    <h1 class="page-title">Staking Hub</h1>
                    <p class="page-subtitle">Delegate your TICS tokens and earn rewards</p>
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
                
                <div class="card action-card">
                    <h3 class="card-title">Quick Actions</h3>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-large" id="delegateQuickBtn">
                            Delegate to QubeNode
                        </button>
                        <button class="btn btn-success btn-large" id="claimRewardsQuickBtn">
                            Claim Rewards (${this.formatTics(data.totalRewards)} TICS)
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <div class="validator-header">
                        <div>
                            <h3 class="card-title">QubeNode Validator</h3>
                            <p class="validator-address">${this.VALIDATOR_ADDRESS}</p>
                        </div>
                        <div class="validator-badge">
                            <span class="live-indicator"></span>
                            Active
                        </div>
                    </div>
                    <div class="validator-stats">
                        <div class="validator-stat">
                            <span class="stat-label">Commission</span>
                            <span class="stat-value">5%</span>
                        </div>
                        <div class="validator-stat">
                            <span class="stat-label">Uptime</span>
                            <span class="stat-value">99.9%</span>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title">My Delegations</h3>
                    <div id="delegationsList">${this.renderDelegations(data)}</div>
                </div>
            </div>
        `;
        
        // Setup event listeners for this module
        setTimeout(() => {
            this.setupStakingEventListeners();
        }, 100);
    }
    
    setupStakingEventListeners() {
        // Delegate button
        const delegateBtn = document.getElementById('delegateQuickBtn');
        if (delegateBtn) {
            delegateBtn.addEventListener('click', () => this.showDelegateModal());
        }
        
        // Claim rewards button
        const claimBtn = document.getElementById('claimRewardsQuickBtn');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => this.handleClaimRewards());
        }
        
        // Copy validator address buttons
        const copyBtns = document.querySelectorAll('.btn-copy-validator');
        copyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const validator = btn.dataset.validator;
                this.copyToClipboard(validator);
            });
        });
    }
    
    renderDelegations(data) {
        if (!data.delegations || data.delegations.length === 0) {
            return '<div class="empty-state"><p>No active delegations</p></div>';
        }
        
        let html = '';
        for (const del of data.delegations) {
            const amount = this.formatTics(del.balance.amount);
            const validator = del.delegation.validator_address;
            const isQubeNode = validator === this.VALIDATOR_ADDRESS;
            
            html += `
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
                        <button class="btn-small btn-secondary btn-copy-validator" data-validator="${validator}">
                            Copy
                        </button>
                    </div>
                </div>
            `;
        }
        return html;
    }
    
    async showDelegateModal() {
        const data = await this.cosmosStaking.getStakingOverview();
        
        const modal = `
            <div class="modal-header">
                <h2>Delegate TICS</h2>
                <button class="modal-close" id="modalCloseBtn">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Validator</label>
                    <div class="validator-select">
                        <span class="badge-qubenode">QubeNode</span>
                        <span class="validator-commission">5% commission</span>
                    </div>
                </div>
                <div class="form-group">
                    <label>Amount (TICS)</label>
                    <input type="number" id="delegateAmount" placeholder="0.00" step="0.001" min="0.1" />
                    <div class="form-help">
                        Available: ${this.formatTics(data.balance)} TICS | Minimum: 0.1 TICS
                    </div>
                </div>
                <div class="info-box">
                    <p>You will start receiving rewards immediately after delegation</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="modalCancelBtn">Cancel</button>
                <button class="btn btn-primary" id="modalConfirmBtn">Delegate</button>
            </div>
        `;
        
        this.showModal(modal);
        
        // Setup modal event listeners after DOM update
        setTimeout(() => {
            const closeBtn = document.getElementById('modalCloseBtn');
            const cancelBtn = document.getElementById('modalCancelBtn');
            const confirmBtn = document.getElementById('modalConfirmBtn');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeModal());
            }
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.closeModal());
            }
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => this.confirmDelegate());
            }
        }, 100);
    }
    
    async confirmDelegate() {
        const input = document.getElementById('delegateAmount');
        const amount = parseFloat(input.value);
        
        if (!amount || amount < 0.1) {
            this.showError('Minimum delegation is 0.1 TICS');
            return;
        }
        
        try {
            this.closeModal();
            this.showNotification('Processing delegation...', 'info');
            
            const result = await this.cosmosStaking.delegate(amount);
            
            if (result.code === 0) {
                this.showSuccess('Delegation successful!');
                await this.loadModule('staking');
            } else {
                throw new Error(result.rawLog || 'Delegation failed');
            }
        } catch (error) {
            console.error('Delegation error:', error);
            this.showError('Delegation failed: ' + error.message);
        }
    }
    
    async handleClaimRewards() {
        try {
            this.showNotification('Claiming rewards...', 'info');
            
            const result = await this.cosmosStaking.claimRewards();
            
            if (result.code === 0) {
                this.showSuccess('Rewards claimed!');
                await this.loadModule('staking');
            } else {
                throw new Error(result.rawLog || 'Claim failed');
            }
        } catch (error) {
            console.error('Claim error:', error);
            this.showError('Claim failed: ' + error.message);
        }
    }
    
    // ===== PORTFOLIO MODULE =====
    async renderPortfolioModule(container) {
        const data = await this.cosmosStaking.refresh();
        const balance = parseFloat(data.balance) / 1e18;
        const delegated = parseFloat(data.totalDelegated) / 1e18;
        const rewards = parseFloat(data.totalRewards) / 1e18;
        const total = balance + delegated + rewards;
        const APY = 0.285;
        const dailyReward = (delegated * APY) / 365;
        
        container.innerHTML = `
            <div class="portfolio-module">
                <div class="page-header">
                    <h1 class="page-title">Portfolio Overview</h1>
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
                
                <div class="card">
                    <h3 class="card-title">Rewards Forecast</h3>
                    <div class="forecast-grid">
                        <div class="forecast-item">
                            <div class="forecast-period">Daily</div>
                            <div class="forecast-amount">${dailyReward.toFixed(3)}</div>
                            <div class="forecast-label">TICS/day</div>
                        </div>
                        <div class="forecast-item">
                            <div class="forecast-period">Weekly</div>
                            <div class="forecast-amount">${(dailyReward * 7).toFixed(3)}</div>
                            <div class="forecast-label">TICS/week</div>
                        </div>
                        <div class="forecast-item">
                            <div class="forecast-period">Monthly</div>
                            <div class="forecast-amount">${(dailyReward * 30).toFixed(3)}</div>
                            <div class="forecast-label">TICS/month</div>
                        </div>
                        <div class="forecast-item">
                            <div class="forecast-period">Yearly</div>
                            <div class="forecast-amount">${(delegated * APY).toFixed(3)}</div>
                            <div class="forecast-label">TICS/year</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title">APY Calculator</h3>
                    <div class="calculator">
                        <div class="calculator-input">
                            <label>Amount to stake (TICS)</label>
                            <input type="number" id="calcAmount" placeholder="1000" value="1000" />
                        </div>
                        <div class="calculator-results">
                            <div class="calc-result">
                                <span>Daily earnings:</span>
                                <span id="calcDaily" class="calc-value">0.780 TICS</span>
                            </div>
                            <div class="calc-result">
                                <span>Monthly earnings:</span>
                                <span id="calcMonthly" class="calc-value">23.400 TICS</span>
                            </div>
                            <div class="calc-result">
                                <span>Yearly earnings:</span>
                                <span id="calcYearly" class="calc-value">285.000 TICS</span>
                            </div>
                            <div class="calc-result highlight">
                                <span>Total after 1 year:</span>
                                <span id="calcTotal" class="calc-value-large">1285.000 TICS</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Setup calculator event listener
        setTimeout(() => {
            const calcInput = document.getElementById('calcAmount');
            if (calcInput) {
                calcInput.addEventListener('input', () => this.calculateAPY());
                this.calculateAPY();
            }
        }, 100);
    }
    
    calculateAPY() {
        const input = document.getElementById('calcAmount');
        if (!input) return;
        
        const amount = parseFloat(input.value) || 0;
        const APY = 0.285;
        const daily = (amount * APY) / 365;
        const monthly = daily * 30;
        const yearly = amount * APY;
        const total = amount + yearly;
        
        document.getElementById('calcDaily').textContent = daily.toFixed(3) + ' TICS';
        document.getElementById('calcMonthly').textContent = monthly.toFixed(3) + ' TICS';
        document.getElementById('calcYearly').textContent = yearly.toFixed(3) + ' TICS';
        document.getElementById('calcTotal').textContent = total.toFixed(3) + ' TICS';
    }
    
    // ===== OTHER MODULES =====
    async renderHistoryModule(container) {
        container.innerHTML = `
            <div class="module-enter">
                <h2 class="page-title">Transaction History</h2>
                <div class="card">
                    <p class="card-content">Coming soon - Full transaction history tracking</p>
                </div>
            </div>
        `;
    }
    
    async renderGovernanceModule(container) {
        container.innerHTML = `
            <div class="module-enter">
                <h2 class="page-title">Governance</h2>
                <div class="card">
                    <p class="card-content">Coming soon - Vote on network proposals</p>
                </div>
            </div>
        `;
    }
    
    async renderExplorersModule(container) {
        container.innerHTML = `
            <div class="module-enter">
                <h2 class="page-title">Blockchain Explorers</h2>
                <div class="stats-grid">
                    <div class="card hover-lift">
                        <h3 class="card-title">Native Explorer</h3>
                        <p class="card-content explorer-description">Explore blockchain transactions and validators</p>
                        <a href="https://explorer.qubetics.com" target="_blank" class="btn btn-primary">Open Explorer</a>
                    </div>
                    <div class="card hover-lift">
                        <h3 class="card-title">EVM Explorer</h3>
                        <p class="card-content explorer-description">View EVM transactions and contracts</p>
                        <a href="https://v2.ticsscan.com" target="_blank" class="btn btn-primary">Open Explorer</a>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ===== UTILITY METHODS =====
    updateNavigation(moduleName) {
        document.querySelectorAll('.nav-item[data-module]').forEach(item => {
            item.classList.toggle('active', item.dataset.module === moduleName);
        });
    }
    
    disconnect() {
        if (this.cosmosStaking) {
            this.cosmosStaking.disconnect();
        }
        this.showNotification('Wallet disconnected', 'info');
        setTimeout(() => window.location.href = 'index.html', 1000);
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
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showSuccess('Copied to clipboard!');
        }).catch(() => {
            this.showError('Failed to copy');
        });
    }
}

// ===== INITIALIZATION =====
let platformInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing platform...');
    
    platformInstance = new QubeNodePlatform();
    await platformInstance.init();
    
    window.platformInstance = platformInstance;
});

// Add slideOutRight animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
