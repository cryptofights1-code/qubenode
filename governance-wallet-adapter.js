/**
 * QubeNode Governance Wallet Adapter
 * Universal adapter for MetaMask, Keplr, and Cosmostation
 * Provides unified API for governance system
 */

(function() {
    'use strict';
    
    // ==================== STATE ====================
    let state = {
        walletType: null,           // 'metamask', 'keplr', 'cosmostation'
        address: null,              // Connected address
        cosmosAddress: null,        // Cosmos format address
        isConnected: false,
        cosmosStaking: null,
        metamaskConnector: null,
        onConnect: null,
        onDisconnect: null
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
    
    // ==================== WALLET DETECTION ====================
    async function detectWallets() {
        return {
            metamask: typeof window.ethereum !== 'undefined',
            keplr: typeof window.keplr !== 'undefined',
            cosmostation: typeof window.cosmostation !== 'undefined'
        };
    }
    
    // ==================== METAMASK ====================
    async function connectMetaMask() {
        console.log('[GOV-WALLET] Connecting MetaMask...');
        
        if (!window.MetaMaskConnector) {
            throw new Error('MetaMask connector not loaded. Please include metamask-connector.js');
        }
        
        try {
            state.metamaskConnector = new window.MetaMaskConnector();
            const result = await state.metamaskConnector.connect();
            
            if (result.success) {
                state.walletType = 'metamask';
                state.address = result.evmAddress;
                state.cosmosAddress = result.cosmosAddress;
                
                // FALLBACK: Якщо cosmosAddress не прийшов, конвертуємо вручну
                if (!state.cosmosAddress && state.address) {
                    console.log('[GOV-WALLET] Converting EVM to Cosmos address...');
                    state.cosmosAddress = evmToCosmos(state.address);
                    console.log('[GOV-WALLET] Converted:', state.address, '→', state.cosmosAddress);
                }
                
                if (!state.cosmosAddress) {
                    throw new Error('Failed to convert address to Cosmos format');
                }
                
                state.isConnected = true;
                
                console.log('[GOV-WALLET] MetaMask connected:', state.address);
                console.log('[GOV-WALLET] Cosmos address:', state.cosmosAddress);
                
                if (state.onConnect) {
                    state.onConnect(state.address, 'metamask');
                }
                
                return {
                    success: true,
                    address: state.address,
                    cosmosAddress: state.cosmosAddress,
                    walletType: 'metamask'
                };
            }
            
            throw new Error('MetaMask connection failed');
            
        } catch (error) {
            console.error('[GOV-WALLET] MetaMask error:', error);
            throw error;
        }
    }
    
    // ==================== KEPLR ====================
    async function connectKeplr() {
        console.log('[GOV-WALLET] Connecting Keplr...');
        
        if (!window.CosmosStakingModule) {
            throw new Error('Cosmos staking module not loaded. Please include cosmos-staking.js');
        }
        
        try {
            if (!state.cosmosStaking) {
                state.cosmosStaking = new window.CosmosStakingModule();
                await state.cosmosStaking.initialize();
            }
            
            const result = await state.cosmosStaking.connectWallet('keplr');
            
            if (result.success) {
                const walletInfo = state.cosmosStaking.getWalletInfo();
                state.walletType = 'keplr';
                state.address = walletInfo.address;
                state.cosmosAddress = walletInfo.address;
                state.isConnected = true;
                
                console.log('[GOV-WALLET] Keplr connected:', state.address);
                
                if (state.onConnect) {
                    state.onConnect(state.address, 'keplr');
                }
                
                return {
                    success: true,
                    address: state.address,
                    cosmosAddress: state.cosmosAddress,
                    walletType: 'keplr'
                };
            }
            
            throw new Error('Keplr connection failed');
            
        } catch (error) {
            console.error('[GOV-WALLET] Keplr error:', error);
            throw error;
        }
    }
    
    // ==================== COSMOSTATION ====================
    async function connectCosmostation() {
        console.log('[GOV-WALLET] Connecting Cosmostation...');
        
        if (!window.CosmosStakingModule) {
            throw new Error('Cosmos staking module not loaded. Please include cosmos-staking.js');
        }
        
        try {
            if (!state.cosmosStaking) {
                state.cosmosStaking = new window.CosmosStakingModule();
                await state.cosmosStaking.initialize();
            }
            
            const result = await state.cosmosStaking.connectWallet('cosmostation');
            
            if (result.success) {
                const walletInfo = state.cosmosStaking.getWalletInfo();
                state.walletType = 'cosmostation';
                state.address = walletInfo.address;
                state.cosmosAddress = walletInfo.address;
                state.isConnected = true;
                
                console.log('[GOV-WALLET] Cosmostation connected:', state.address);
                
                if (state.onConnect) {
                    state.onConnect(state.address, 'cosmostation');
                }
                
                return {
                    success: true,
                    address: state.address,
                    cosmosAddress: state.cosmosAddress,
                    walletType: 'cosmostation'
                };
            }
            
            throw new Error('Cosmostation connection failed');
            
        } catch (error) {
            console.error('[GOV-WALLET] Cosmostation error:', error);
            throw error;
        }
    }
    
    // ==================== SIGN MESSAGE ====================
    async function signMessage(message) {
        console.log('[GOV-WALLET] Signing message...');
        
        if (!state.isConnected) {
            throw new Error('No wallet connected');
        }
        
        try {
            let signature;
            
            if (state.walletType === 'metamask') {
                if (!state.metamaskConnector) {
                    throw new Error('MetaMask connector not available');
                }
                
                // MetaMask sign через eth_sign
                if (!window.ethereum) {
                    throw new Error('MetaMask not available');
                }
                
                signature = await window.ethereum.request({
                    method: 'personal_sign',
                    params: [message, state.address]
                });
                
            } else if (state.walletType === 'keplr' || state.walletType === 'cosmostation') {
                // Cosmos wallets sign через offlineSigner
                const offlineSigner = state.walletType === 'keplr' 
                    ? window.keplr.getOfflineSigner(window.QUBETICS_CHAIN_CONFIG.chainId)
                    : window.cosmostation.providers.keplr.getOfflineSigner(window.QUBETICS_CHAIN_CONFIG.chainId);
                
                const accounts = await offlineSigner.getAccounts();
                if (accounts.length === 0) {
                    throw new Error('No accounts found');
                }
                
                // For Cosmos wallets, we use Amino signing
                const signDoc = {
                    chain_id: '',
                    account_number: '0',
                    sequence: '0',
                    fee: { amount: [], gas: '0' },
                    msgs: [{
                        type: 'sign/MsgSignData',
                        value: {
                            signer: state.cosmosAddress,
                            data: btoa(message)
                        }
                    }],
                    memo: ''
                };
                
                const signed = state.walletType === 'keplr'
                    ? await window.keplr.signAmino(window.QUBETICS_CHAIN_CONFIG.chainId, state.cosmosAddress, signDoc)
                    : await window.cosmostation.providers.keplr.signAmino(window.QUBETICS_CHAIN_CONFIG.chainId, state.cosmosAddress, signDoc);
                
                signature = signed.signature.signature;
            } else {
                throw new Error('Unknown wallet type');
            }
            
            console.log('[GOV-WALLET] Message signed successfully');
            
            return {
                signature: signature,
                address: state.address,
                walletType: state.walletType
            };
            
        } catch (error) {
            console.error('[GOV-WALLET] Sign error:', error);
            throw error;
        }
    }
    
    // ==================== DISCONNECT ====================
    async function disconnect() {
        console.log('[GOV-WALLET] Disconnecting...');
        
        try {
            if (state.cosmosStaking) {
                state.cosmosStaking.disconnect();
            }
            
            const wasConnected = state.isConnected;
            
            state.walletType = null;
            state.address = null;
            state.cosmosAddress = null;
            state.isConnected = false;
            state.metamaskConnector = null;
            
            if (wasConnected && state.onDisconnect) {
                state.onDisconnect();
            }
            
            console.log('[GOV-WALLET] Disconnected');
            
            return { success: true };
            
        } catch (error) {
            console.error('[GOV-WALLET] Disconnect error:', error);
            throw error;
        }
    }
    
    // ==================== PUBLIC API ====================
    
    /**
     * Initialize the wallet adapter
     * @param {Object} options - Configuration options
     * @param {Function} options.onConnect - Callback when wallet connects
     * @param {Function} options.onDisconnect - Callback when wallet disconnects
     */
    window.govWalletInit = function(options = {}) {
        console.log('[GOV-WALLET] Initializing governance wallet adapter...');
        
        state.onConnect = options.onConnect || null;
        state.onDisconnect = options.onDisconnect || null;
        
        console.log('[GOV-WALLET] Adapter ready');
    };
    
    /**
     * Connect a specific wallet
     * @param {String} walletType - 'metamask', 'keplr', or 'cosmostation'
     * @returns {Promise<Object>} Connection result
     */
    window.govWalletConnect = async function(walletType) {
        if (!walletType) {
            throw new Error('Wallet type is required. Use: metamask, keplr, or cosmostation');
        }
        
        switch (walletType.toLowerCase()) {
            case 'metamask':
                return await connectMetaMask();
            case 'keplr':
                return await connectKeplr();
            case 'cosmostation':
                return await connectCosmostation();
            default:
                throw new Error(`Unknown wallet type: ${walletType}`);
        }
    };
    
    /**
     * Disconnect current wallet
     * @returns {Promise<Object>} Disconnect result
     */
    window.govWalletDisconnect = async function() {
        return await disconnect();
    };
    
    /**
     * Sign a message with connected wallet
     * @param {String} message - Message to sign
     * @returns {Promise<Object>} Signature result
     */
    window.govWalletSign = async function(message) {
        return await signMessage(message);
    };
    
    /**
     * Get current connected address
     * @returns {String|null} Address or null if not connected
     */
    window.govWalletGetAddress = function() {
        return state.address;
    };
    
    /**
     * Get Cosmos format address
     * @returns {String|null} Cosmos address or null if not connected
     */
    window.govWalletGetCosmosAddress = function() {
        return state.cosmosAddress;
    };
    
    /**
     * Check if wallet is connected
     * @returns {Boolean} Connection status
     */
    window.govWalletIsConnected = function() {
        return state.isConnected;
    };
    
    /**
     * Get current wallet type
     * @returns {String|null} Wallet type or null if not connected
     */
    window.govWalletGetType = function() {
        return state.walletType;
    };
    
    /**
     * Detect available wallets
     * @returns {Promise<Object>} Available wallets
     */
    window.govWalletDetect = async function() {
        return await detectWallets();
    };
    
    /**
     * Get wallet info
     * @returns {Object} Wallet information
     */
    window.govWalletGetInfo = function() {
        return {
            isConnected: state.isConnected,
            walletType: state.walletType,
            address: state.address,
            cosmosAddress: state.cosmosAddress
        };
    };
    
    // ==================== UTILITIES ====================
    
    /**
     * Convert EVM address to Cosmos format
     * @param {String} evmAddress - EVM address (0x...)
     * @returns {String|null} Cosmos address or null if invalid
     */
    window.govWalletEvmToCosmos = function(evmAddress) {
        return evmToCosmos(evmAddress);
    };
    
    console.log('✅ QubeNode Governance Wallet Adapter loaded');
    console.log('📋 Available functions:');
    console.log('   - govWalletInit(options)');
    console.log('   - govWalletConnect(walletType)');
    console.log('   - govWalletDisconnect()');
    console.log('   - govWalletSign(message)');
    console.log('   - govWalletGetAddress()');
    console.log('   - govWalletGetCosmosAddress()');
    console.log('   - govWalletIsConnected()');
    console.log('   - govWalletGetType()');
    console.log('   - govWalletDetect()');
    console.log('   - govWalletGetInfo()');
    console.log('   - govWalletEvmToCosmos(address)');
    
})();
