/**
 * QubeNode Governance - Complete Implementation
 * Supports MetaMask, Keplr, and Cosmostation wallets
 * Fetches delegation amount and submits votes to Cloudflare backend
 */

// ==================== CONFIGURATION ====================
const CONFIG = {
    VALIDATOR_ADDRESS: 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld',
    REST_API: 'https://swagger.qubetics.com',
    // TODO: Replace with your Cloudflare Worker URL after deployment
    BACKEND_API: 'https://governance.qubenode.workers.dev'
};

// ==================== STATE ====================
const state = {
    wallet: null,           // EVM address (0x...) or Cosmos address (qubetics...)
    walletType: null,       // 'metamask', 'keplr', 'cosmostation'
    cosmosAddress: null,    // Always Cosmos bech32 address
    votingPower: 0,         // TICS delegated to QubeNode (in TICS, not minimal units)
    polls: [],
    myVotes: {},            // pollId -> vote option
    isConnected: false,
    
    // Wallet instances
    metamaskConnector: null,
    cosmosWalletManager: null,
    chainClient: null
};

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
    const statusDiv = document.createElement('div');
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
    container.innerHTML = '';
    container.appendChild(statusDiv);
    
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
    return new Intl.NumberFormat('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
    }).format(num);
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

// ==================== WALLET MODAL ====================
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

// ==================== WALLET CONNECTION ====================
async function connectMetaMask() {
    try {
        showStatus('Connecting MetaMask...', 'info');
        
        if (!window.MetaMaskConnector) {
            throw new Error('MetaMask connector not loaded. Please refresh the page.');
        }
        
        state.metamaskConnector = new window.MetaMaskConnector();
        const result = await state.metamaskConnector.connect();
        
        if (result.success) {
            state.wallet = result.address; // EVM address
            state.walletType = 'metamask';
            state.cosmosAddress = evmToCosmos(result.address);
            state.isConnected = true;
            
            console.log('✅ MetaMask connected:');
            console.log('   EVM:', state.wallet);
            console.log('   Cosmos:', state.cosmosAddress);
            
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
        
        if (!window.CosmosWalletManager) {
            throw new Error('Cosmos wallet manager not loaded. Please refresh the page.');
        }
        
        if (!window.QUBETICS_CHAIN_CONFIG) {
            throw new Error('Chain config not loaded. Please refresh the page.');
        }
        
        state.cosmosWalletManager = new window.CosmosWalletManager(window.QUBETICS_CHAIN_CONFIG);
        const result = await state.cosmosWalletManager.connectKeplr();
        
        if (result.success) {
            state.wallet = result.address;
            state.walletType = 'keplr';
            state.cosmosAddress = result.address;
            state.isConnected = true;
            
            console.log('✅ Keplr connected:', state.cosmosAddress);
            
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
        
        if (!window.CosmosWalletManager) {
            throw new Error('Cosmos wallet manager not loaded. Please refresh the page.');
        }
        
        if (!window.QUBETICS_CHAIN_CONFIG) {
            throw new Error('Chain config not loaded. Please refresh the page.');
        }
        
        state.cosmosWalletManager = new window.CosmosWalletManager(window.QUBETICS_CHAIN_CONFIG);
        const result = await state.cosmosWalletManager.connectCosmostation();
        
        if (result.success) {
            state.wallet = result.address;
            state.walletType = 'cosmostation';
            state.cosmosAddress = result.address;
            state.isConnected = true;
            
            console.log('✅ Cosmostation connected:', state.cosmosAddress);
            
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
    document.getElementById('walletAddress').textContent = shortenAddress(state.cosmosAddress);
    document.getElementById('connectSection').classList.add('hidden');
    document.getElementById('walletSection').classList.remove('hidden');
    
    // Update header button
    const headerBtn = document.getElementById('headerWalletBtn');
    if (headerBtn) {
        headerBtn.innerHTML = `
            <span class="wallet-icon">💼</span>
            <span class="wallet-text">${shortenAddress(state.cosmosAddress)}</span>
        `;
    }
    
    // Check voting power
    await checkVotingPower();
    
    // Load user's votes
    await loadMyVotes();
    
    // Re-render polls with updated state
    renderPolls();
    
    showStatus('Wallet connected successfully!', 'success');
}

function disconnectWallet() {
    // Disconnect based on wallet type
    if (state.walletType === 'keplr' || state.walletType === 'cosmostation') {
        if (state.cosmosWalletManager) {
            state.cosmosWalletManager.disconnect();
        }
    }
    
    // Reset state
    state.wallet = null;
    state.walletType = null;
    state.cosmosAddress = null;
    state.votingPower = 0;
    state.myVotes = {};
    state.isConnected = false;
    state.metamaskConnector = null;
    state.cosmosWalletManager = null;
    
    // Update UI
    document.getElementById('connectSection').classList.remove('hidden');
    document.getElementById('walletSection').classList.add('hidden');
    document.getElementById('votingPower').textContent = 'Checking voting power...';
    
    // Reset header button
    const headerBtn = document.getElementById('headerWalletBtn');
    if (headerBtn) {
        headerBtn.innerHTML = `
            <span class="wallet-icon">💼</span>
            <span class="wallet-text">Connect Wallet</span>
        `;
    }
    
    // Re-render polls
    renderPolls();
    
    showStatus('Wallet disconnected', 'info');
}

// ==================== VOTING POWER ====================
async function checkVotingPower() {
    try {
        if (!state.cosmosAddress) {
            throw new Error('No wallet connected');
        }
        
        showStatus('Checking your voting power...', 'info');
        
        // Fetch delegation to QubeNode validator
        const response = await fetch(
            `${CONFIG.REST_API}/cosmos/staking/v1beta1/validators/${CONFIG.VALIDATOR_ADDRESS}/delegations/${state.cosmosAddress}`
        );
        
        if (!response.ok) {
            if (response.status === 404) {
                // No delegation found
                state.votingPower = 0;
                updateVotingPowerUI();
                showStatus('No delegation found to QubeNode', 'error');
                return;
            }
            throw new Error(`Failed to fetch delegation: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.delegation_response && data.delegation_response.balance) {
            const balanceMinimal = data.delegation_response.balance.amount;
            // Convert from minimal units (18 decimals) to TICS
            state.votingPower = parseFloat(balanceMinimal) / 1e18;
            
            console.log('✅ Voting power:', state.votingPower, 'TICS');
            
            updateVotingPowerUI();
            clearStatus();
        } else {
            state.votingPower = 0;
            updateVotingPowerUI();
            showStatus('No delegation found to QubeNode', 'error');
        }
        
    } catch (error) {
        console.error('Error checking voting power:', error);
        state.votingPower = 0;
        updateVotingPowerUI();
        showStatus('Failed to check voting power: ' + error.message, 'error');
    }
}

function updateVotingPowerUI() {
    const votingPowerEl = document.getElementById('votingPower');
    if (!votingPowerEl) return;
    
    if (state.votingPower > 0) {
        votingPowerEl.innerHTML = `
            <span style="font-weight: 600; color: #10b981;">Voting Power: ${formatNumber(state.votingPower)} TICS</span>
        `;
    } else {
        votingPowerEl.innerHTML = `
            <span style="color: #f97316;">No delegation to QubeNode</span>
        `;
    }
}

// ==================== POLLS LOADING ====================
async function loadPolls() {
    try {
        showStatus('Loading governance proposals...', 'info');
        
        document.getElementById('loadingSection').classList.remove('hidden');
        
        const response = await fetch(`${CONFIG.BACKEND_API}/api/polls`);
        
        if (!response.ok) {
            throw new Error(`Failed to load polls: ${response.status}`);
        }
        
        const data = await response.json();
        state.polls = data.polls || [];
        
        console.log('✅ Loaded', state.polls.length, 'polls');
        
        document.getElementById('loadingSection').classList.add('hidden');
        clearStatus();
        
        renderPolls();
        
    } catch (error) {
        console.error('Error loading polls:', error);
        document.getElementById('loadingSection').classList.add('hidden');
        showStatus('Failed to load governance proposals. Using demo data.', 'error');
        
        // Fallback to demo poll
        state.polls = [
            {
                id: 1,
                title: 'Demo Proposal: Enable IBC Transfers',
                description: 'This is a demo proposal. Real proposals will be loaded from the backend once deployed.',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString(),
                status: 'active',
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
        
        renderPolls();
    }
}

async function loadMyVotes() {
    if (!state.cosmosAddress) return;
    
    try {
        const response = await fetch(
            `${CONFIG.BACKEND_API}/api/votes/${state.cosmosAddress}`
        );
        
        if (!response.ok) {
            console.warn('Failed to load user votes:', response.status);
            return;
        }
        
        const data = await response.json();
        
        // Convert array to object: { pollId: vote }
        state.myVotes = {};
        if (data.votes && Array.isArray(data.votes)) {
            data.votes.forEach(v => {
                state.myVotes[v.poll_id] = v.vote;
            });
        }
        
        console.log('✅ Loaded user votes:', state.myVotes);
        
    } catch (error) {
        console.error('Error loading user votes:', error);
    }
}

// ==================== POLLS RENDERING ====================
function renderPolls() {
    const grid = document.getElementById('pollsGrid');
    
    if (!grid) {
        console.error('Polls grid element not found');
        return;
    }
    
    if (state.polls.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px;">
                <p style="font-size: 18px; color: #94a3b8; margin-bottom: 12px;">
                    No active governance proposals at the moment
                </p>
                <p style="font-size: 14px; color: #64748b;">
                    Check back soon for new proposals from QubeNode community
                </p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = state.polls.map(poll => renderPollCard(poll)).join('');
    
    // Attach event listeners to vote buttons
    attachVoteListeners();
}

function renderPollCard(poll) {
    const deadline = new Date(poll.deadline);
    const now = new Date();
    const isExpired = deadline <= now;
    
    // Calculate percentages
    const total = poll.tallies.total || 0;
    const yesPct = total > 0 ? ((poll.tallies.yes / total) * 100).toFixed(1) : 0;
    const noPct = total > 0 ? ((poll.tallies.no / total) * 100).toFixed(1) : 0;
    const abstainPct = total > 0 ? ((poll.tallies.abstain / total) * 100).toFixed(1) : 0;
    const vetoPct = total > 0 ? ((poll.tallies.no_with_veto / total) * 100).toFixed(1) : 0;
    
    // Check if user already voted
    const myVote = state.myVotes[poll.id];
    
    // Vote buttons
    let voteButtonsHtml = '';
    
    if (isExpired) {
        voteButtonsHtml = `
            <div style="background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
                <span style="color: #94a3b8;">Voting period has ended</span>
            </div>
        `;
    } else if (state.isConnected && state.votingPower > 0) {
        const voteOptions = [
            { value: 'yes', label: 'Yes', color: '#10b981' },
            { value: 'no', label: 'No', color: '#ef4444' },
            { value: 'abstain', label: 'Abstain', color: '#64748b' },
            { value: 'no_with_veto', label: 'No With Veto', color: '#f97316' }
        ];
        
        voteButtonsHtml = `
            <div class="vote-buttons">
                ${voteOptions.map(opt => `
                    <button class="vote-btn ${myVote === opt.value ? 'voted' : ''}" 
                            data-poll-id="${poll.id}" 
                            data-vote="${opt.value}"
                            style="border-color: ${opt.color}; ${myVote === opt.value ? `background: ${opt.color}22;` : ''}">
                        ${opt.label}
                        ${myVote === opt.value ? '<span style="margin-left: 8px;">✓</span>' : ''}
                    </button>
                `).join('')}
            </div>
        `;
    } else if (!state.isConnected) {
        voteButtonsHtml = `
            <div style="text-align: center; padding: 24px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; margin-bottom: 24px;">
                <p style="color: #94a3b8; margin-bottom: 16px;">Connect your wallet to vote</p>
                <button onclick="document.getElementById('connectWalletBtn').click()" 
                        style="background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Connect Wallet
                </button>
            </div>
        `;
    } else if (state.votingPower <= 0) {
        voteButtonsHtml = `
            <div style="text-align: center; padding: 24px; background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 12px; margin-bottom: 24px;">
                <p style="color: #f97316; margin: 0;">You must delegate to QubeNode to vote</p>
            </div>
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
            
            <div style="margin: 16px 0; padding: 12px; background: rgba(100, 116, 139, 0.1); border-radius: 8px;">
                <strong style="color: #94a3b8;">Deadline:</strong> 
                <span style="color: #e2e8f0;">${deadline.toLocaleString()}</span>
                <span style="color: #64748b; margin-left: 8px;">(${formatDeadline(poll.deadline)})</span>
            </div>
            
            ${myVote ? `
                <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Your Current Vote</div>
                    <div style="font-size: 18px; font-weight: 600; color: #ffffff; text-transform: uppercase;">${myVote.replace('_', ' ')}</div>
                </div>
            ` : ''}
            
            ${voteButtonsHtml}
            
            <div class="results-section">
                <h4 class="results-title">Current Results</h4>
                <div style="font-size: 14px; color: #94a3b8; margin-bottom: 16px;">
                    ${formatNumber(poll.tallies.total)} TICS from ${poll.tallies.voters} voter${poll.tallies.voters !== 1 ? 's' : ''}
                </div>
                
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
            </div>
        </div>
    `;
}

function attachVoteListeners() {
    const voteButtons = document.querySelectorAll('.vote-btn');
    voteButtons.forEach(btn => {
        btn.addEventListener('click', async function() {
            const pollId = parseInt(this.getAttribute('data-poll-id'));
            const vote = this.getAttribute('data-vote');
            await submitVote(pollId, vote);
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
        showStatus('Submitting your vote...', 'info');
        
        const response = await fetch(`${CONFIG.BACKEND_API}/api/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                poll_id: pollId,
                voter_address: state.cosmosAddress,
                vote: vote,
                voting_power: state.votingPower
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to submit vote: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update local state
        state.myVotes[pollId] = vote;
        
        // Update poll tallies from backend response
        const poll = state.polls.find(p => p.id === pollId);
        if (poll && data.tallies) {
            poll.tallies = data.tallies;
        }
        
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
        headerWalletBtn.addEventListener('click', () => {
            if (state.isConnected) {
                // Already connected, do nothing or show info
                return;
            }
            openWalletModal();
        });
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
    
    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeWalletModal();
        }
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
