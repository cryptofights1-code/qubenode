/**
 * Governance Page Initialization
 * QubeNode Internal Voting System
 * CSP Compliant - No inline scripts
 */

// Configuration
const QUBENODE_VALIDATOR = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
const API_BASE_URL = 'https://governance.qubenode.space'; // Cloudflare Worker endpoint

// Global state
let walletManager = null;
let chainClient = null;
let connectedAddress = null;
let votingPower = '0';
let proposals = [];
let countdownIntervals = [];

/**
 * Initialize the governance page
 */
async function init() {
    console.log('🗳️ Initializing governance page...');
    
    // Initialize chain client
    try {
        chainClient = new CosmosChainClient(QUBETICS_CHAIN_CONFIG);
        await chainClient.initialize();
        console.log('✅ Chain client initialized');
    } catch (error) {
        console.error('Failed to initialize chain client:', error);
        showToast('Failed to connect to blockchain', 'error');
    }
    
    // Initialize wallet manager
    walletManager = new CosmosWalletManager(QUBETICS_CHAIN_CONFIG);
    
    // Setup event listeners
    setupEventListeners();
    
    // Load proposals
    await loadProposals();
    
    // Check if wallet already connected (from URL params or localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const walletType = urlParams.get('wallet');
    const address = urlParams.get('address');
    
    if (walletType && address) {
        await connectWalletFromParams(walletType);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    const connectBtn = document.getElementById('connectWalletBtn');
    const disconnectBtn = document.getElementById('disconnectWalletBtn');
    
    if (connectBtn) {
        connectBtn.addEventListener('click', showWalletModal);
    }
    
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectWallet);
    }
}

/**
 * Show wallet connection modal
 */
function showWalletModal() {
    const modal = document.getElementById('walletModal');
    if (!modal) {
        console.error('Wallet modal not found');
        return;
    }
    
    // Show modal
    modal.style.display = 'flex';
    
    // Setup modal event listeners
    setupModalListeners();
}

/**
 * Setup modal event listeners
 */
function setupModalListeners() {
    const modal = document.getElementById('walletModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const overlay = modal.querySelector('.wallet-modal-overlay');
    const walletOptions = modal.querySelectorAll('.wallet-option');
    
    // Close button
    if (closeBtn) {
        closeBtn.onclick = closeWalletModal;
    }
    
    // Click outside to close
    if (overlay) {
        overlay.onclick = closeWalletModal;
    }
    
    // Wallet option buttons
    walletOptions.forEach(option => {
        option.onclick = async () => {
            const walletType = option.dataset.wallet;
            closeWalletModal();
            await connectWallet(walletType);
        };
    });
}

/**
 * Close wallet modal
 */
function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Detect available wallets and connect
 */
async function detectAndConnectWallet() {
    try {
        // Try Keplr first
        if (window.keplr) {
            await connectWallet('keplr');
            return;
        }
        
        // Try Cosmostation
        if (window.cosmostation) {
            await connectWallet('cosmostation');
            return;
        }
        
        // No wallet found
        showToast('Please install Keplr or Cosmostation wallet', 'error');
        
    } catch (error) {
        console.error('Wallet detection error:', error);
        showToast('Failed to detect wallet: ' + error.message, 'error');
    }
}

/**
 * Connect wallet
 */
async function connectWallet(walletType) {
    try {
        console.log('🔗 Connecting wallet:', walletType);
        
        let result;
        if (walletType === 'keplr') {
            if (!window.keplr) {
                showToast('Keplr wallet not installed. Please install from https://www.keplr.app/', 'error');
                return;
            }
            result = await walletManager.connectKeplr();
        } else if (walletType === 'cosmostation') {
            if (!window.cosmostation) {
                showToast('Cosmostation wallet not installed. Please install from https://cosmostation.io/', 'error');
                return;
            }
            result = await walletManager.connectCosmostation();
        } else if (walletType === 'metamask') {
            // Use MetaMaskConnector
            if (!window.ethereum || !window.ethereum.isMetaMask) {
                showToast('MetaMask not installed. Please install from https://metamask.io/', 'error');
                return;
            }
            
            // Create MetaMask connector instance
            const metamaskConnector = new MetaMaskConnector();
            result = await metamaskConnector.connect();
            
            if (result.success) {
                // Store MetaMask connector for later use
                window.metamaskConnector = metamaskConnector;
                
                // Get all delegations and find QubeNode delegation
                const delegations = await metamaskConnector.getDelegations();
                const qubenodeDelegation = delegations.find(
                    d => d.delegation.validator_address === QUBENODE_VALIDATOR
                );
                
                connectedAddress = metamaskConnector.cosmosAddress; // Use Cosmos address for display
                votingPower = qubenodeDelegation ? qubenodeDelegation.balance.amount : '0';
                
                console.log('✅ MetaMask connected');
                console.log('   EVM Address:', metamaskConnector.address);
                console.log('   Cosmos Address:', metamaskConnector.cosmosAddress);
                console.log('   Voting Power:', votingPower);
                
                // Update UI
                updateWalletUI();
                updateVotingPowerUI(); // ← Додано оновлення voting power!
                showToast('MetaMask connected successfully! 🦊', 'success');
                
                // Reload proposals with voter parameter
                await loadProposals();
                return;
            }
        } else {
            throw new Error('Unsupported wallet type');
        }
        
        if (result.success) {
            connectedAddress = result.address;
            console.log('✅ Wallet connected:', connectedAddress);
            
            // Update UI
            await updateWalletUI();
            
            // Load voting power
            await loadVotingPower();
            
            // Reload proposals to show user's votes
            await loadProposals();
            
            showToast('Wallet connected successfully!', 'success');
        }
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        showToast('Failed to connect wallet: ' + error.message, 'error');
    }
}

/**
 * Connect wallet from URL parameters
 */
async function connectWalletFromParams(walletType) {
    try {
        await connectWallet(walletType);
    } catch (error) {
        console.error('Failed to auto-connect wallet:', error);
    }
}

/**
 * Update wallet UI after connection
 */
async function updateWalletUI() {
    // Show wallet info bar
    const walletInfoBar = document.getElementById('walletInfoBar');
    if (walletInfoBar) {
        walletInfoBar.classList.add('active');
    }
    
    // Update address display (shortened)
    const addressElement = document.getElementById('connectedAddress');
    if (addressElement && connectedAddress) {
        const shortened = `${connectedAddress.substring(0, 12)}...${connectedAddress.substring(connectedAddress.length - 6)}`;
        addressElement.textContent = shortened;
    }
    
    // Show disconnect button, hide connect button
    const connectBtn = document.getElementById('connectWalletBtn');
    const disconnectBtn = document.getElementById('disconnectWalletBtn');
    
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'inline-flex';
}

/**
 * Load voting power from blockchain
 */
async function loadVotingPower() {
    if (!connectedAddress) {
        console.log('No wallet connected, skipping voting power load');
        return;
    }
    
    try {
        console.log('📊 Loading voting power...');
        
        // Get delegation to QubeNode validator
        const delegation = await chainClient.getDelegation(connectedAddress, QUBENODE_VALIDATOR);
        
        if (delegation && delegation.balance && delegation.balance.amount) {
            votingPower = delegation.balance.amount;
            console.log('✅ Voting power loaded:', votingPower);
        } else {
            votingPower = '0';
            console.log('ℹ️ No delegation found to QubeNode');
        }
        
        // Update UI
        updateVotingPowerUI();
        
    } catch (error) {
        console.error('Error loading voting power:', error);
        votingPower = '0';
        updateVotingPowerUI();
    }
}

/**
 * Update voting power UI
 */
function updateVotingPowerUI() {
    const votingPowerElement = document.getElementById('votingPower');
    const delegatedAmountElement = document.getElementById('delegatedAmount');
    
    const votingPowerTics = formatTics(votingPower);
    
    if (votingPowerElement) {
        votingPowerElement.textContent = `${votingPowerTics} TICS`;
    }
    
    if (delegatedAmountElement) {
        delegatedAmountElement.textContent = `${votingPowerTics} TICS`;
    }
}

/**
 * Disconnect wallet
 */
function disconnectWallet() {
    walletManager.disconnect();
    
    // Also disconnect MetaMask if connected
    if (window.metamaskConnector) {
        window.metamaskConnector.disconnect();
        window.metamaskConnector = null;
    }
    
    connectedAddress = null;
    votingPower = '0';
    
    // Update UI
    const walletInfoBar = document.getElementById('walletInfoBar');
    if (walletInfoBar) {
        walletInfoBar.classList.remove('active');
    }
    
    const connectBtn = document.getElementById('connectWalletBtn');
    const disconnectBtn = document.getElementById('disconnectWalletBtn');
    
    if (connectBtn) connectBtn.style.display = 'inline-flex';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    
    // Reload proposals to hide user votes
    loadProposals();
    
    showToast('Wallet disconnected', 'info');
}

/**
 * Load proposals from API
 */
async function loadProposals() {
    const loadingContainer = document.getElementById('loadingContainer');
    const proposalsList = document.getElementById('proposalsList');
    const emptyState = document.getElementById('emptyState');
    
    try {
        console.log('📋 Loading proposals...');
        
        // Show loading
        if (loadingContainer) loadingContainer.style.display = 'block';
        if (proposalsList) proposalsList.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        
        // Fetch proposals from API
        const response = await fetch(`${API_BASE_URL}/api/proposals`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        proposals = data.proposals || [];
        
        console.log(`✅ Loaded ${proposals.length} proposals`);
        
        // Hide loading
        if (loadingContainer) loadingContainer.style.display = 'none';
        
        // Display proposals
        if (proposals.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
        } else {
            if (proposalsList) {
                proposalsList.style.display = 'block';
                renderProposals();
            }
        }
        
    } catch (error) {
        console.error('Error loading proposals:', error);
        
        // Hide loading
        if (loadingContainer) loadingContainer.style.display = 'none';
        
        // Show empty state with error
        if (emptyState) {
            emptyState.style.display = 'block';
            emptyState.querySelector('.empty-state-title').textContent = 'Failed to Load Proposals';
            emptyState.querySelector('.empty-state-text').textContent = error.message;
        }
        
        showToast('Failed to load proposals', 'error');
    }
}

/**
 * Render proposals
 */
function renderProposals() {
    const proposalsList = document.getElementById('proposalsList');
    if (!proposalsList) return;
    
    // Clear existing proposals
    proposalsList.innerHTML = '';
    
    // Clear existing countdown intervals
    countdownIntervals.forEach(interval => clearInterval(interval));
    countdownIntervals = [];
    
    // Render each proposal
    proposals.forEach(proposal => {
        const proposalCard = createProposalCard(proposal);
        proposalsList.appendChild(proposalCard);
    });
}

/**
 * Create proposal card element
 */
function createProposalCard(proposal) {
    const card = document.createElement('div');
    card.className = 'proposal-card';
    card.dataset.proposalId = proposal.id;
    
    // Determine status
    const now = Date.now();
    const endTime = new Date(proposal.endTime).getTime();
    const isActive = now < endTime;
    const statusClass = isActive ? 'status-active' : 'status-ended';
    const statusText = isActive ? 'ACTIVE' : 'ENDED';
    
    // Check if user has voted
    const userVote = proposal.userVote || null;
    
    // Calculate vote results
    const totalVotes = BigInt(proposal.results.yes) + BigInt(proposal.results.no) + BigInt(proposal.results.abstain);
    const totalVotesNum = Number(totalVotes) / 1e18;
    
    const yesVotes = Number(BigInt(proposal.results.yes)) / 1e18;
    const noVotes = Number(BigInt(proposal.results.no)) / 1e18;
    const abstainVotes = Number(BigInt(proposal.results.abstain)) / 1e18;
    
    const yesPercent = totalVotesNum > 0 ? (yesVotes / totalVotesNum * 100).toFixed(1) : '0.0';
    const noPercent = totalVotesNum > 0 ? (noVotes / totalVotesNum * 100).toFixed(1) : '0.0';
    const abstainPercent = totalVotesNum > 0 ? (abstainVotes / totalVotesNum * 100).toFixed(1) : '0.0';
    
    // Create card HTML
    card.innerHTML = `
        <div class="proposal-header">
            <span class="proposal-id">#${proposal.id}</span>
            <span class="proposal-status ${statusClass}">${statusText}</span>
        </div>
        
        <h3 class="proposal-title-text">${escapeHtml(proposal.title)}</h3>
        <p class="proposal-description">${escapeHtml(proposal.description)}</p>
        
        <div class="proposal-metadata">
            <div class="metadata-item">
                <span class="metadata-label">Started</span>
                <span class="metadata-value">${formatDate(proposal.startTime)}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Ends</span>
                <span class="metadata-value">${formatDate(proposal.endTime)}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Time Remaining</span>
                <span class="metadata-value countdown-timer" id="countdown-${proposal.id}">${isActive ? 'Calculating...' : 'Ended'}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Total Participants</span>
                <span class="metadata-value">${proposal.results.totalVoters || 0} wallets</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Total Votes</span>
                <span class="metadata-value">${totalVotesNum.toFixed(3)} TICS</span>
            </div>
        </div>
        
        ${userVote ? `
        <div class="user-vote-indicator active">
            <span class="user-vote-text">Your vote:</span>
            <span class="user-vote-value">${userVote.toUpperCase()}</span>
        </div>
        ` : ''}
        
        <div class="voting-results">
            <div class="results-title">Results</div>
            
            <div class="vote-option">
                <div class="vote-option-name">
                    <span>✅ YES</span>
                </div>
                <div class="vote-option-stats">
                    <span class="vote-count">${yesVotes.toFixed(3)} TICS</span>
                    <span class="vote-percentage">${yesPercent}%</span>
                </div>
            </div>
            <div class="vote-bar">
                <div class="vote-bar-fill vote-bar-yes" style="width: ${yesPercent}%"></div>
            </div>
            
            <div class="vote-option">
                <div class="vote-option-name">
                    <span>❌ NO</span>
                </div>
                <div class="vote-option-stats">
                    <span class="vote-count">${noVotes.toFixed(3)} TICS</span>
                    <span class="vote-percentage">${noPercent}%</span>
                </div>
            </div>
            <div class="vote-bar">
                <div class="vote-bar-fill vote-bar-no" style="width: ${noPercent}%"></div>
            </div>
            
            <div class="vote-option">
                <div class="vote-option-name">
                    <span>⚪ ABSTAIN</span>
                </div>
                <div class="vote-option-stats">
                    <span class="vote-count">${abstainVotes.toFixed(3)} TICS</span>
                    <span class="vote-percentage">${abstainPercent}%</span>
                </div>
            </div>
            <div class="vote-bar">
                <div class="vote-bar-fill vote-bar-abstain" style="width: ${abstainPercent}%"></div>
            </div>
        </div>
        
        <div class="voting-actions">
            <button class="btn-vote btn-vote-yes" data-proposal="${proposal.id}" data-vote="yes" ${!isActive || userVote ? 'disabled' : ''}>
                ✅ Vote YES
            </button>
            <button class="btn-vote btn-vote-no" data-proposal="${proposal.id}" data-vote="no" ${!isActive || userVote ? 'disabled' : ''}>
                ❌ Vote NO
            </button>
            <button class="btn-vote btn-vote-abstain" data-proposal="${proposal.id}" data-vote="abstain" ${!isActive || userVote ? 'disabled' : ''}>
                ⚪ Abstain
            </button>
        </div>
    `;
    
    // Setup vote button listeners
    const voteButtons = card.querySelectorAll('.btn-vote');
    voteButtons.forEach(btn => {
        btn.addEventListener('click', handleVote);
    });
    
    // Setup countdown timer
    if (isActive) {
        setupCountdown(proposal.id, endTime);
    }
    
    return card;
}

/**
 * Setup countdown timer for proposal
 */
function setupCountdown(proposalId, endTime) {
    const countdownElement = document.getElementById(`countdown-${proposalId}`);
    if (!countdownElement) return;
    
    const updateCountdown = () => {
        const now = Date.now();
        const remaining = endTime - now;
        
        if (remaining <= 0) {
            countdownElement.textContent = 'Ended';
            return;
        }
        
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
            countdownElement.textContent = `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            countdownElement.textContent = `${hours}h ${minutes}m`;
        } else {
            countdownElement.textContent = `${minutes}m`;
        }
    };
    
    // Update immediately
    updateCountdown();
    
    // Update every minute
    const interval = setInterval(updateCountdown, 60000);
    countdownIntervals.push(interval);
}

/**
 * Handle vote button click
 */
async function handleVote(event) {
    const button = event.currentTarget;
    const proposalId = button.dataset.proposal;
    const vote = button.dataset.vote;
    
    // Check if wallet is connected
    if (!connectedAddress) {
        showToast('Please connect your wallet first', 'error');
        return;
    }
    
    // Check if user has voting power
    if (votingPower === '0' || BigInt(votingPower) === BigInt(0)) {
        showToast('You need to delegate to QubeNode to vote', 'error');
        return;
    }
    
    // Confirm vote
    if (!confirm(`Confirm your vote: ${vote.toUpperCase()}?`)) {
        return;
    }
    
    // Disable button
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ Voting...';
    
    try {
        console.log('🗳️ Submitting vote:', { proposalId, vote, votingPower });
        
        // Generate signature (simplified - in production should use wallet signature)
        const timestamp = Date.now();
        const message = `${connectedAddress}:${proposalId}:${vote}:${timestamp}`;
        
        // Submit vote to API
        const response = await fetch(`${API_BASE_URL}/api/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                proposalId,
                voter: connectedAddress,
                vote,
                votingPower,
                timestamp,
                message
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit vote');
        }
        
        const result = await response.json();
        console.log('✅ Vote submitted:', result);
        
        showToast(`Vote "${vote.toUpperCase()}" submitted successfully!`, 'success');
        
        // Reload proposals to show updated results
        await loadProposals();
        
    } catch (error) {
        console.error('Vote submission error:', error);
        showToast('Failed to submit vote: ' + error.message, 'error');
        
        // Re-enable button
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

/**
 * Format TICS amount (18 decimals)
 */
function formatTics(minimal) {
    if (!minimal || minimal === '0') return '0.000';
    const tics = Number(BigInt(minimal)) / 1e18;
    return tics.toFixed(3);
}

/**
 * Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    countdownIntervals.forEach(interval => clearInterval(interval));
});
