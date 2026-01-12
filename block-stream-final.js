/**
 * Live Block Stream - Final Version
 * Uses sdk_block + signing_infos for accurate validator names
 */

(function() {
    'use strict';

    // ===== CONFIGURATION =====
    const CONFIG = {
        VALIDATOR_ADDRESS: 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld',
        API_BASE: 'https://swagger.qubetics.com',
        WORKER_PROXY: 'https://qubenode-rpc-proxy.yuskivvolodymyr.workers.dev',
        POLL_INTERVAL: 6000,
        MAX_BLOCKS_DISPLAY: 15
    };

    // ===== STATE =====
    const state = {
        blocks: [],
        qubenodeBlocks: 0,
        totalBlocks: 0,
        lastBlockHeight: null,
        startTime: Date.now(),
        validatorInfo: null,
        validatorNames: new Map(), // Map: consensus address -> moniker
        qubenodeConsensusAddress: null
    };

    // ===== DOM ELEMENTS =====
    const elements = {
        blockStream: document.getElementById('blockStream'),
        qubenodeBlockCount: document.getElementById('qubenodeBlockCount'),
        totalBlockCount: document.getElementById('totalBlockCount'),
        blockShare: document.getElementById('blockShare'),
        networkStatus: document.getElementById('networkStatus'),
        blockHeight: document.getElementById('blockHeight'),
        chainId: document.getElementById('chainId'),
        validatorStatus: document.getElementById('validatorStatus'),
        votingPower: document.getElementById('votingPower'),
        commission: document.getElementById('commission'),
        monitorDuration: document.getElementById('monitorDuration'),
        lastUpdate: document.getElementById('lastUpdate')
    };

    // ===== UTILITY FUNCTIONS =====
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        }
        return num.toLocaleString();
    }

    function formatAddress(address) {
        if (!address || address.length < 20) return address;
        return address.slice(0, 10) + '...' + address.slice(-8);
    }

    function timeAgo(timestamp) {
        const now = Date.now();
        const diff = now - new Date(timestamp).getTime();
        const seconds = Math.floor(diff / 1000);
        
        if (seconds < 10) return 'just now';
        if (seconds < 60) return seconds + 's ago';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + 'm ago';
        const hours = Math.floor(minutes / 60);
        return hours + 'h ago';
    }

    function updateMonitorDuration() {
        const elapsed = Date.now() - state.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            elements.monitorDuration.textContent = hours + 'h ' + (minutes % 60) + 'm';
        } else {
            elements.monitorDuration.textContent = minutes + 'm';
        }
    }

    // ===== API FUNCTIONS =====
    async function fetchLatestBlock() {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/cosmos/base/tendermint/v1beta1/blocks/latest`);
            if (!response.ok) throw new Error('Failed to fetch block');
            
            const data = await response.json();
            // Use sdk_block which has bech32 addresses
            return data.sdk_block || data.block;
        } catch (error) {
            console.error('Error fetching latest block:', error);
            return null;
        }
    }

    async function fetchBlockByHeight(height) {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/cosmos/base/tendermint/v1beta1/blocks/${height}`);
            if (!response.ok) throw new Error(`Failed to fetch block ${height}`);
            
            const data = await response.json();
            // Use sdk_block which has bech32 addresses
            return data.sdk_block || data.block;
        } catch (error) {
            console.error(`Error fetching block ${height}:`, error);
            return null;
        }
    }

    async function fetchValidatorInfo() {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/cosmos/staking/v1beta1/validators/${CONFIG.VALIDATOR_ADDRESS}`);
            if (!response.ok) throw new Error('Failed to fetch validator');
            
            const data = await response.json();
            state.validatorInfo = data.validator;
            
            // Update validator display
            elements.validatorStatus.textContent = data.validator.status === 'BOND_STATUS_BONDED' ? 'ACTIVE' : 'INACTIVE';
            
            const tokens = parseInt(data.validator.tokens) / 1000000000000000000;
            elements.votingPower.textContent = formatNumber(tokens) + ' TICS';
            
            const commission = parseFloat(data.validator.commission.commission_rates.rate) * 100;
            elements.commission.textContent = commission.toFixed(1) + '%';
            
            console.log('✅ Validator info loaded');
        } catch (error) {
            console.error('Error fetching validator info:', error);
        }
    }

    // ===== BUILD VALIDATOR NAME MAPPING =====
    async function buildValidatorNameMapping() {
        try {
            console.log('🔄 Building validator name mapping via worker...');
            
            // Use worker proxy for validators
            const validatorsResponse = await fetch(`${CONFIG.WORKER_PROXY}/rest/cosmos/staking/v1beta1/validators?pagination.limit=200`);
            const validatorsData = await validatorsResponse.json();
            
            if (!validatorsData.validators) {
                console.warn('⚠️ No validators data');
                return;
            }
            
            console.log(`📋 Loaded ${validatorsData.validators.length} validators`);
            
            // Use worker proxy for signing infos
            const signingResponse = await fetch(`${CONFIG.WORKER_PROXY}/rest/cosmos/slashing/v1beta1/signing_infos?pagination.limit=200`);
            const signingData = await signingResponse.json();
            
            if (!signingData.info) {
                console.warn('⚠️ No signing info data');
                return;
            }
            
            console.log(`📋 Loaded ${signingData.info.length} signing infos`);
            
            // Build mapping - match by address suffix
            validatorsData.validators.forEach(validator => {
                const moniker = validator.description?.moniker || 'Unknown';
                const operatorAddr = validator.operator_address;
                
                const operatorSuffix = operatorAddr.replace('qubeticsvaloper', '');
                
                signingData.info.forEach(signingInfo => {
                    const consensusAddr = signingInfo.address;
                    const consensusSuffix = consensusAddr.replace('qubeticsvalcons', '');
                    
                    if (operatorSuffix === consensusSuffix) {
                        state.validatorNames.set(consensusAddr, moniker);
                        
                        if (operatorAddr === CONFIG.VALIDATOR_ADDRESS) {
                            state.qubenodeConsensusAddress = consensusAddr;
                            console.log(`✅ QubeNode: ${moniker}`);
                            console.log(`   Consensus: ${consensusAddr}`);
                        }
                    }
                });
            });
            
            console.log(`✅ Mapped ${state.validatorNames.size} validator names`);
            
        } catch (error) {
            console.error('❌ Error building validator mapping:', error);
        }
    }

    // ===== VALIDATOR NAME LOOKUP =====
    function getValidatorName(proposerAddress) {
        // proposerAddress is in bech32 format: qubeticsvalcons1...
        
        if (state.validatorNames.has(proposerAddress)) {
            return state.validatorNames.get(proposerAddress);
        }
        
        // If not found, return shortened address
        return formatAddress(proposerAddress);
    }

    function isQubeNodeBlock(proposerAddress) {
        return proposerAddress === state.qubenodeConsensusAddress;
    }

    // ===== BLOCK PROCESSING =====
    async function processNewBlocks() {
        const latestBlock = await fetchLatestBlock();
        if (!latestBlock || !latestBlock.header) return;

        const latestHeight = parseInt(latestBlock.header.height);
        
        // First time initialization
        if (!state.lastBlockHeight) {
            await processBlock(latestBlock);
            state.lastBlockHeight = latestHeight;
            return;
        }

        // Check for gaps
        const gap = latestHeight - state.lastBlockHeight;
        
        if (gap === 0) {
            return;
        } else if (gap === 1) {
            await processBlock(latestBlock);
            state.lastBlockHeight = latestHeight;
        } else if (gap > 1 && gap <= 20) {
            console.log(`⚠️ Missed ${gap - 1} blocks, backfilling...`);
            
            for (let height = state.lastBlockHeight + 1; height < latestHeight; height++) {
                const block = await fetchBlockByHeight(height);
                if (block) {
                    await processBlock(block);
                }
            }
            
            await processBlock(latestBlock);
            state.lastBlockHeight = latestHeight;
        } else {
            console.log(`⚠️ Large gap detected (${gap} blocks), jumping to latest`);
            await processBlock(latestBlock);
            state.lastBlockHeight = latestHeight;
        }
    }

    async function processBlock(block) {
        if (!block || !block.header) return;

        const height = parseInt(block.header.height);
        const proposer = block.header.proposer_address;
        
        const blockData = {
            height: height,
            time: block.header.time,
            proposer: proposer,
            proposerName: getValidatorName(proposer),
            txCount: block.data?.txs?.length || 0,
            chainId: block.header.chain_id,
            isQubeNode: isQubeNodeBlock(proposer)
        };

        // Update stats
        state.totalBlocks++;
        if (blockData.isQubeNode) {
            state.qubenodeBlocks++;
            console.log(`✨ QubeNode block #${height}`);
        }

        // Add to blocks array
        state.blocks.unshift(blockData);

        // Keep only MAX_BLOCKS_DISPLAY blocks
        if (state.blocks.length > CONFIG.MAX_BLOCKS_DISPLAY) {
            state.blocks.pop();
        }

        // Update display
        updateBlockStream();
        updateStats();
        updateNetworkHealth(blockData);
    }

    // ===== UI UPDATE FUNCTIONS =====
    function updateBlockStream() {
        const streamHeader = elements.blockStream.querySelector('.stream-header');
        
        elements.blockStream.innerHTML = '';
        elements.blockStream.appendChild(streamHeader);

        state.blocks.forEach(block => {
            const blockEl = createBlockElement(block);
            elements.blockStream.appendChild(blockEl);
        });
    }

    function createBlockElement(block) {
        const div = document.createElement('div');
        div.className = 'block-item' + (block.isQubeNode ? ' qubenode' : '');
        
        const proposerDisplay = block.isQubeNode 
            ? '<span class="block-proposer is-qubenode">QubeNode <span class="qubenode-badge">✨</span></span>'
            : `<span class="block-proposer">${block.proposerName}</span>`;

        div.innerHTML = `
            <div class="block-header">
                <div class="block-height">#${block.height.toLocaleString()}</div>
                <div class="block-time">${timeAgo(block.time)}</div>
            </div>
            ${proposerDisplay}
            <div class="block-details">
                <div class="block-detail">
                    <span>📝</span>
                    <span>Txs: ${block.txCount}</span>
                </div>
            </div>
        `;

        return div;
    }

    function updateStats() {
        elements.qubenodeBlockCount.textContent = state.qubenodeBlocks;
        elements.totalBlockCount.textContent = state.totalBlocks;
        
        const share = state.totalBlocks > 0 
            ? ((state.qubenodeBlocks / state.totalBlocks) * 100).toFixed(1)
            : '0.0';
        elements.blockShare.textContent = share + '%';
        
        elements.lastUpdate.textContent = new Date().toLocaleTimeString();
    }

    function updateNetworkHealth(latestBlock) {
        if (latestBlock) {
            elements.blockHeight.textContent = latestBlock.height.toLocaleString();
            elements.chainId.textContent = latestBlock.chainId;
        }
    }

    // ===== INITIALIZATION =====
    async function init() {
        console.log('🚀 Initializing Live Block Stream...');
        
        // Load validator info
        await fetchValidatorInfo();
        
        // Build validator name mapping
        await buildValidatorNameMapping();
        
        // Initial blocks
        await processNewBlocks();
        
        // Start polling
        setInterval(processNewBlocks, CONFIG.POLL_INTERVAL);
        
        // Update monitor duration every minute
        setInterval(updateMonitorDuration, 60000);
        updateMonitorDuration();
        
        console.log('✅ Block stream initialized');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
