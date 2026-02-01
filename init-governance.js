/**
 * QubeNode Governance - Main Script
 * All event listeners and logic - CSP compliant (no inline handlers)
 */

// ==================== STATE ====================
const state = {
    wallet: null,           // EVM or Cosmos address
    walletType: null,       // 'metamask', 'keplr', 'cosmostation'
    cosmosAddress: null,    // Converted Cosmos address
    votingPower: 0,         // TICS delegated to QubeNode
    polls: [],
    myVotes: {},
    isConnected: false
};

const VALIDATOR_ADDRESS = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';

// ==================== UI HELPERS ====================
function showStatus(message, type = 'info') {
    const container = document.getElementById('statusContainer');
    container.innerHTML = `<div class="status ${type}">${message}</div>`;
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }
}

function clearStatus() {
    document.getElementById('statusContainer').innerHTML = '';
}

function shortenAddress(addr) {
    if (!addr) return '';
    return addr.slice(0, 10) + '...' + addr.slice(-6);
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
}

function formatDeadline(deadline) {
    const date = new Date(deadline);
    const now = new Date();
    const diff = date - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
}

// ==================== WALLET CONNECTION ====================
function openWalletModal() {
    const modal = document.getElementById('walletModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

async function connectMetaMask() {
    try {
        showStatus('Connecting MetaMask...', 'info');
        
        const result = await window.govWalletConnect('metamask');
        
        if (result.success) {
            state.wallet = result.address;
            state.walletType = 'metamask';
            state.cosmosAddress = result.cosmosAddress;
            
            // FALLBACK: Якщо cosmosAddress не прийшов, конвертуємо вручну
            if (!state.cosmosAddress && state.wallet) {
                console.log('[FALLBACK] Converting EVM to Cosmos address...');
                state.cosmosAddress = window.govWalletEvmToCosmos(state.wallet);
                console.log('[FALLBACK] Converted:', state.wallet, '→', state.cosmosAddress);
            }
            
            if (!state.cosmosAddress) {
                throw new Error('Failed to convert address to Cosmos format');
            }
            
            state.isConnected = true;
            
            await onWalletConnected();
        }
    } catch (error) {
        console.error('MetaMask connection error:', error);
        showStatus('Failed to connect MetaMask: ' + error.message, 'error');
    }
}

async function connectKeplr() {
    try {
        showStatus('Connecting Keplr...', 'info');
        
        const result = await window.govWalletConnect('keplr');
        
        if (result.success) {
            state.wallet = result.address;
            state.walletType = 'keplr';
            state.cosmosAddress = result.cosmosAddress;
            state.isConnected = true;
            
            await onWalletConnected();
        }
    } catch (error) {
        console.error('Keplr connection error:', error);
        showStatus('Failed to connect Keplr: ' + error.message, 'error');
    }
}

async function connectCosmostation() {
    try {
        showStatus('Connecting Cosmostation...', 'info');
        
        const result = await window.govWalletConnect('cosmostation');
        
        if (result.success) {
            state.wallet = result.address;
            state.walletType = 'cosmostation';
            state.cosmosAddress = result.cosmosAddress;
            state.isConnected = true;
            
            await onWalletConnected();
        }
    } catch (error) {
        console.error('Cosmostation connection error:', error);
        showStatus('Failed to connect Cosmostation: ' + error.message, 'error');
    }
}

async function onWalletConnected() {
    closeWalletModal();
    
    // Update UI
    document.getElementById('walletAddress').textContent = shortenAddress(state.wallet);
    document.getElementById('connectSection').classList.add('hidden');
    document.getElementById('walletSection').classList.remove('hidden');
    
    // Check voting power
    await checkVotingPower();
    
    // Load polls
    loadPolls();
    
    showStatus('Wallet connected successfully!', 'success');
}

function disconnectWallet() {
    window.govWalletDisconnect();
    
    state.wallet = null;
    state.walletType = null;
    state.cosmosAddress = null;
    state.votingPower = 0;
    state.isConnected = false;
    state.myVotes = {};
    
    document.getElementById('connectSection').classList.remove('hidden');
    document.getElementById('walletSection').classList.add('hidden');
    
    renderPolls();
    
    showStatus('Wallet disconnected', 'info');
}

// ==================== VOTING POWER CHECK ====================
async function checkVotingPower() {
    const votingPowerEl = document.getElementById('votingPower');
    votingPowerEl.textContent = 'Checking voting power...';
    
    try {
        console.log('=== VOTING POWER DEBUG START ===');
        console.log('State:', {
            wallet: state.wallet,
            walletType: state.walletType,
            cosmosAddress: state.cosmosAddress,
            isConnected: state.isConnected
        });
        console.log('Validator address:', VALIDATOR_ADDRESS);
        
        if (!state.cosmosAddress) {
            throw new Error('No Cosmos address');
        }
        
        // Initialize chain client if not exists
        if (!window.chainClient) {
            console.log('Initializing chain client...');
            if (!window.CosmosChainClient) {
                throw new Error('CosmosChainClient not loaded. Check if chain-client.js is included.');
            }
            if (!window.QUBETICS_CHAIN_CONFIG) {
                throw new Error('QUBETICS_CHAIN_CONFIG not found. Check if chain-config.js is included.');
            }
            window.chainClient = new window.CosmosChainClient(window.QUBETICS_CHAIN_CONFIG);
            await window.chainClient.initialize();
            console.log('Chain client initialized successfully');
        }
        
        console.log('Fetching delegation from API...');
        console.log('API URL:', `https://swagger.qubetics.com/cosmos/staking/v1beta1/validators/${VALIDATOR_ADDRESS}/delegations/${state.cosmosAddress}`);
        
        // Get delegation to QubeNode
        const delegation = await window.chainClient.getDelegation(
            state.cosmosAddress,
            VALIDATOR_ADDRESS
        );
        
        console.log('Delegation response:', delegation);
        
        if (delegation && delegation.balance && delegation.balance.amount) {
            const amount = parseFloat(delegation.balance.amount) / 1e18;
            state.votingPower = amount;
            
            console.log('Voting power calculated:', amount, 'TICS');
            
            votingPowerEl.innerHTML = `Voting Power: <strong>${formatNumber(amount)} TICS</strong>`;
        } else {
            console.log('No delegation found or invalid response structure');
            state.votingPower = 0;
            votingPowerEl.innerHTML = '<span style="color: #f97316;">Not delegated to QubeNode</span>';
        }
        
        console.log('=== VOTING POWER DEBUG END ===');
        
    } catch (error) {
        console.error('=== VOTING POWER ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Full error:', error);
        
        // Show user-friendly error
        votingPowerEl.textContent = 'Could not verify voting power';
        
        // Additional debug info
        if (error.message.includes('CosmosChainClient')) {
            console.error('💡 FIX: Make sure chain-client.js is loaded before init-governance.js');
        }
        if (error.message.includes('QUBETICS_CHAIN_CONFIG')) {
            console.error('💡 FIX: Make sure chain-config.js is loaded before init-governance.js');
        }
        if (error.message.includes('fetch') || error.message.includes('network')) {
            console.error('💡 FIX: Check your internet connection or API endpoint');
        }
    }
}

// ==================== POLLS MANAGEMENT ====================
function initializeDemoPolls() {
    // Check if polls already exist in localStorage
    const existingPolls = localStorage.getItem('governance_polls');
    if (existingPolls) {
        return JSON.parse(existingPolls);
    }
    
    // Create demo polls
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    const demoPolls = [
        {
            id: 1,
            title: 'Proposal #1: Increase Block Gas Limit',
            description: 'This proposal aims to increase the block gas limit from 30M to 50M to accommodate more transactions per block and improve network throughput.',
            status: 'active',
            deadline: futureDate.toISOString(),
            tallies: {
                yes: 0,
                no: 0,
                abstain: 0,
                no_with_veto: 0,
                total: 0,
                voters: 0
            }
        },
        {
            id: 2,
            title: 'Proposal #2: Community Pool Funding for Development',
            description: 'Allocate 100,000 TICS from the community pool to fund the development of new ecosystem tools and documentation.',
            status: 'active',
            deadline: futureDate.toISOString(),
            tallies: {
                yes: 0,
                no: 0,
                abstain: 0,
                no_with_veto: 0,
                total: 0,
                voters: 0
            }
        }
    ];
    
    localStorage.setItem('governance_polls', JSON.stringify(demoPolls));
    return demoPolls;
}

function loadPolls() {
    document.getElementById('loadingSection').classList.remove('hidden');
    
    try {
        state.polls = initializeDemoPolls();
        
        // Load user's votes from localStorage
        if (state.cosmosAddress) {
            const votesKey = `governance_votes_${state.cosmosAddress}`;
            const savedVotes = localStorage.getItem(votesKey);
            if (savedVotes) {
                state.myVotes = JSON.parse(savedVotes);
            }
        }
        
        renderPolls();
    } catch (error) {
        console.error('Error loading polls:', error);
        showStatus('Failed to load polls', 'error');
    } finally {
        document.getElementById('loadingSection').classList.add('hidden');
    }
}

function renderPolls() {
    const grid = document.getElementById('pollsGrid');
    
    if (state.polls.length === 0) {
        grid.innerHTML = `
            <div class="no-polls">
                <div class="no-polls-icon">📋</div>
                <div class="no-polls-text">
                    No active proposals at the moment.<br>
                    Check back later for governance proposals.
                </div>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = state.polls.map(poll => renderPollCard(poll)).join('');
    
    // Attach vote button listeners
    attachVoteListeners();
}

function renderPollCard(poll) {
    const deadline = new Date(poll.deadline);
    const isExpired = new Date() > deadline;
    const myVote = state.myVotes[poll.id];
    const canVote = state.isConnected && state.votingPower > 0 && !isExpired;
    
    // Calculate percentages
    const total = poll.tallies.total || 0;
    const yesPct = total > 0 ? ((poll.tallies.yes / total) * 100).toFixed(1) : 0;
    const noPct = total > 0 ? ((poll.tallies.no / total) * 100).toFixed(1) : 0;
    const abstainPct = total > 0 ? ((poll.tallies.abstain / total) * 100).toFixed(1) : 0;
    const vetoPct = total > 0 ? ((poll.tallies.no_with_veto / total) * 100).toFixed(1) : 0;
    
    let voteButtonsHtml = '';
    if (canVote) {
        voteButtonsHtml = `
            <div class="vote-buttons">
                <button class="vote-btn yes ${myVote === 'yes' ? 'selected' : ''}" data-poll-id="${poll.id}" data-vote="yes">
                    Yes
                    <span class="vote-btn-label">Support the proposal</span>
                </button>
                <button class="vote-btn no ${myVote === 'no' ? 'selected' : ''}" data-poll-id="${poll.id}" data-vote="no">
                    No
                    <span class="vote-btn-label">Oppose the proposal</span>
                </button>
                <button class="vote-btn abstain ${myVote === 'abstain' ? 'selected' : ''}" data-poll-id="${poll.id}" data-vote="abstain">
                    Abstain
                    <span class="vote-btn-label">No opinion</span>
                </button>
                <button class="vote-btn veto ${myVote === 'no_with_veto' ? 'selected' : ''}" data-poll-id="${poll.id}" data-vote="no_with_veto">
                    No With Veto
                    <span class="vote-btn-label">Strong opposition</span>
                </button>
            </div>
        `;
    } else if (!state.isConnected) {
        voteButtonsHtml = `
            <p style="text-align: center; color: #94a3b8; margin: 24px 0;">
                Connect your wallet above to vote
            </p>
        `;
    } else if (state.votingPower <= 0) {
        voteButtonsHtml = `
            <p style="text-align: center; color: #f97316; margin: 24px 0;">
                You must delegate to QubeNode to vote
            </p>
        `;
    }
    
    return `
        <div class="poll-card">
            <div class="poll-header">
                <h3 class="poll-title">${poll.title}</h3>
                <div class="poll-badges">
                    <span class="poll-badge ${isExpired ? 'closed' : 'active'}">
                        ${isExpired ? 'Voting Ended' : 'Active'}
                    </span>
                </div>
            </div>
            
            <p class="poll-description">${poll.description}</p>
            
            <p class="poll-deadline">
                <strong>Voting Deadline:</strong> ${deadline.toLocaleString()} (${formatDeadline(poll.deadline)})
            </p>
            
            ${myVote ? `
                <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Your Current Vote</div>
                    <div style="font-size: 18px; font-weight: 600; color: #ffffff; text-transform: uppercase;">${myVote.replace('_', ' ')}</div>
                </div>
            ` : ''}
            
            ${voteButtonsHtml}
            
            <div class="results-section">
                <h4 class="results-title">Current Results (${poll.tallies.voters} voters)</h4>
                
                <div class="result-bar">
                    <div class="result-header">
                        <span class="result-label">Yes</span>
                        <span class="result-value">${formatNumber(poll.tallies.yes)} TICS (${yesPct}%)</span>
                    </div>
                    <div class="result-track">
                        <div class="result-fill yes" style="width: ${yesPct}%"></div>
                    </div>
                </div>
                
                <div class="result-bar">
                    <div class="result-header">
                        <span class="result-label">No</span>
                        <span class="result-value">${formatNumber(poll.tallies.no)} TICS (${noPct}%)</span>
                    </div>
                    <div class="result-track">
                        <div class="result-fill no" style="width: ${noPct}%"></div>
                    </div>
                </div>
                
                <div class="result-bar">
                    <div class="result-header">
                        <span class="result-label">Abstain</span>
                        <span class="result-value">${formatNumber(poll.tallies.abstain)} TICS (${abstainPct}%)</span>
                    </div>
                    <div class="result-track">
                        <div class="result-fill abstain" style="width: ${abstainPct}%"></div>
                    </div>
                </div>
                
                <div class="result-bar">
                    <div class="result-header">
                        <span class="result-label">No With Veto</span>
                        <span class="result-value">${formatNumber(poll.tallies.no_with_veto)} TICS (${vetoPct}%)</span>
                    </div>
                    <div class="result-track">
                        <div class="result-fill veto" style="width: ${vetoPct}%"></div>
                    </div>
                </div>
                
                <div class="results-summary">
                    <div class="summary-stat">
                        <div class="summary-value">${formatNumber(poll.tallies.total)}</div>
                        <div class="summary-label">Total TICS Voted</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-value">${poll.tallies.voters}</div>
                        <div class="summary-label">Unique Voters</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function attachVoteListeners() {
    const voteButtons = document.querySelectorAll('.vote-btn');
    voteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const pollId = parseInt(this.getAttribute('data-poll-id'));
            const vote = this.getAttribute('data-vote');
            submitVote(pollId, vote);
        });
    });
}

// ==================== VOTING ====================
async function submitVote(pollId, vote) {
    if (!state.isConnected) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }
    
    if (state.votingPower <= 0) {
        showStatus('You must delegate to QubeNode to vote', 'error');
        return;
    }
    
    try {
        showStatus('Recording your vote...', 'info');
        
        // Update poll tallies
        const poll = state.polls.find(p => p.id === pollId);
        if (!poll) {
            throw new Error('Poll not found');
        }
        
        // Remove previous vote if exists
        const previousVote = state.myVotes[pollId];
        if (previousVote) {
            poll.tallies[previousVote] = Math.max(0, poll.tallies[previousVote] - state.votingPower);
            poll.tallies.total = Math.max(0, poll.tallies.total - state.votingPower);
        } else {
            poll.tallies.voters += 1;
        }
        
        // Add new vote
        poll.tallies[vote] += state.votingPower;
        poll.tallies.total += state.votingPower;
        
        // Save vote
        state.myVotes[pollId] = vote;
        
        // Save to localStorage
        localStorage.setItem('governance_polls', JSON.stringify(state.polls));
        const votesKey = `governance_votes_${state.cosmosAddress}`;
        localStorage.setItem(votesKey, JSON.stringify(state.myVotes));
        
        showStatus(`Vote recorded: ${vote.replace('_', ' ').toUpperCase()}`, 'success');
        
        // Re-render polls
        renderPolls();
        
    } catch (error) {
        console.error('Vote submission error:', error);
        showStatus('Failed to submit vote: ' + error.message, 'error');
    }
}

// ==================== INITIALIZATION ====================
function init() {
    console.log('🚀 QubeNode Governance initializing...');
    
    // Initialize Governance Wallet Adapter
    if (typeof window.govWalletInit !== 'undefined') {
        window.govWalletInit({
            onConnect: (address, walletType) => {
                console.log('✅ Wallet connected:', address, walletType);
            },
            onDisconnect: () => {
                console.log('📌 Wallet disconnected');
            }
        });
        console.log('✅ Governance Wallet Adapter initialized');
    } else {
        console.error('❌ Governance Wallet Adapter not loaded');
    }
    
    // Event Listeners - Header
    const headerWalletBtn = document.getElementById('headerWalletBtn');
    if (headerWalletBtn) {
        headerWalletBtn.addEventListener('click', openWalletModal);
    }
    
    // Event Listeners - Connect Section
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', openWalletModal);
    }
    
    // Event Listeners - Disconnect
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectWallet);
    }
    
    // Event Listeners - Modal
    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
        modalClose.addEventListener('click', closeWalletModal);
    }
    
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeWalletModal);
    }
    
    // Event Listeners - Wallet Options
    const metamaskOption = document.getElementById('metamaskOption');
    if (metamaskOption) {
        metamaskOption.addEventListener('click', connectMetaMask);
    }
    
    const keplrOption = document.getElementById('keplrOption');
    if (keplrOption) {
        keplrOption.addEventListener('click', connectKeplr);
    }
    
    const cosmostationOption = document.getElementById('cosmostationOption');
    if (cosmostationOption) {
        cosmostationOption.addEventListener('click', connectCosmostation);
    }
    
    // Image Error Handlers (CSP-compliant)
    // Handle logo image error
    const logoImg = document.getElementById('logoImg');
    if (logoImg) {
        logoImg.addEventListener('error', function() {
            this.style.display = 'none';
        });
    }
    
    // Handle wallet icon errors with emoji fallbacks
    const walletIcons = document.querySelectorAll('.wallet-icon');
    walletIcons.forEach(icon => {
        icon.addEventListener('error', function() {
            const fallback = this.getAttribute('data-fallback');
            if (fallback) {
                // Create SVG with emoji as fallback
                const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ctext y='18' font-size='18'%3E${fallback}%3C/text%3E%3C/svg%3E`;
                this.src = svg;
            }
        });
    });
    
    // Show connect section initially
    document.getElementById('connectSection').classList.remove('hidden');
    
    // Load polls
    loadPolls();
    
    console.log('✅ QubeNode Governance initialized');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
