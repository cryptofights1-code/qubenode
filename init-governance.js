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
    isConnected: false,
    cosmosStaking: null,
    metamaskConnector: null
};

const VALIDATOR_ADDRESS = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';

// ==================== BECH32 CONVERSION ====================
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values) {
    const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    for (const v of values) {
        const b = chk >> 25;
        chk = ((chk & 0x1ffffff) << 5) ^ v;
        for (let i = 0; i < 5; i++) {
            if ((b >> i) & 1) chk ^= GEN[i];
        }
    }
    return chk;
}

function bech32HrpExpand(hrp) {
    const ret = [];
    for (const c of hrp) ret.push(c.charCodeAt(0) >> 5);
    ret.push(0);
    for (const c of hrp) ret.push(c.charCodeAt(0) & 31);
    return ret;
}

function bech32CreateChecksum(hrp, data) {
    const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
    const polymod = bech32Polymod(values) ^ 1;
    const ret = [];
    for (let i = 0; i < 6; i++) ret.push((polymod >> (5 * (5 - i))) & 31);
    return ret;
}

function bech32Encode(hrp, data) {
    const combined = data.concat(bech32CreateChecksum(hrp, data));
    let ret = hrp + '1';
    for (const d of combined) ret += BECH32_CHARSET[d];
    return ret;
}

function convertBits(data, fromBits, toBits, pad) {
    let acc = 0, bits = 0;
    const ret = [], maxv = (1 << toBits) - 1;
    for (const value of data) {
        acc = (acc << fromBits) | value;
        bits += fromBits;
        while (bits >= toBits) {
            bits -= toBits;
            ret.push((acc >> bits) & maxv);
        }
    }
    if (pad && bits > 0) ret.push((acc << (toBits - bits)) & maxv);
    return ret;
}

function evmToCosmos(evmAddress) {
    if (!evmAddress || !evmAddress.startsWith('0x')) return null;
    const hex = evmAddress.slice(2).toLowerCase();
    if (hex.length !== 40) return null;
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    const words = convertBits(bytes, 8, 5, true);
    return bech32Encode('qubetics', words);
}

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
        
        if (!window.MetaMaskConnector) {
            throw new Error('MetaMask connector not loaded');
        }
        
        state.metamaskConnector = new window.MetaMaskConnector();
        const result = await state.metamaskConnector.connect();
        
        if (result.success) {
            state.wallet = result.evmAddress;
            state.walletType = 'metamask';
            state.cosmosAddress = result.cosmosAddress;
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
        
        if (!window.CosmosStakingModule) {
            throw new Error('Cosmos module not loaded');
        }
        
        state.cosmosStaking = new window.CosmosStakingModule();
        await state.cosmosStaking.initialize();
        
        const result = await state.cosmosStaking.connectWallet('keplr');
        
        if (result.success) {
            const walletInfo = state.cosmosStaking.getWalletInfo();
            state.wallet = walletInfo.address;
            state.walletType = 'keplr';
            state.cosmosAddress = walletInfo.address;
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
        
        if (!window.CosmosStakingModule) {
            throw new Error('Cosmos module not loaded');
        }
        
        state.cosmosStaking = new window.CosmosStakingModule();
        await state.cosmosStaking.initialize();
        
        const result = await state.cosmosStaking.connectWallet('cosmostation');
        
        if (result.success) {
            const walletInfo = state.cosmosStaking.getWalletInfo();
            state.wallet = walletInfo.address;
            state.walletType = 'cosmostation';
            state.cosmosAddress = walletInfo.address;
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
    if (state.cosmosStaking) {
        state.cosmosStaking.disconnect();
    }
    
    state.wallet = null;
    state.walletType = null;
    state.cosmosAddress = null;
    state.votingPower = 0;
    state.isConnected = false;
    state.myVotes = {};
    state.cosmosStaking = null;
    state.metamaskConnector = null;
    
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
        if (!state.cosmosAddress) {
            throw new Error('No Cosmos address');
        }
        
        // Initialize chain client if not exists
        if (!window.chainClient) {
            window.chainClient = new window.CosmosChainClient(window.QUBETICS_CHAIN_CONFIG);
            await window.chainClient.initialize();
        }
        
        // Get delegation to QubeNode
        const delegation = await window.chainClient.getDelegation(
            state.cosmosAddress,
            VALIDATOR_ADDRESS
        );
        
        if (delegation && delegation.balance && delegation.balance.amount) {
            const amount = parseFloat(delegation.balance.amount) / 1e18;
            state.votingPower = amount;
            
            votingPowerEl.innerHTML = `Voting Power: <strong>${formatNumber(amount)} TICS</strong>`;
        } else {
            state.votingPower = 0;
            votingPowerEl.innerHTML = '<span style="color: #f97316;">Not delegated to QubeNode</span>';
        }
    } catch (error) {
        console.error('Error checking voting power:', error);
        votingPowerEl.textContent = 'Could not verify voting power';
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
