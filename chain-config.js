/**
 * Qubetics Network Chain Configuration for QubeNode
 * CRITICAL: 18 decimals (NOT 6 like most Cosmos chains!)
 */
const QUBETICS_CHAIN_CONFIG = {
    // Chain Identification
    chainId: 'qubetics_9030-1',
    chainName: 'Qubetics Network',
    
    // RPC Endpoints
    rpc: 'https://tendermint.qubetics.com:443',
    rest: 'https://swagger.qubetics.com',
    
    // Token Configuration - CRITICAL: 18 decimals!
    stakeCurrency: {
        coinDenom: 'TICS',
        coinMinimalDenom: 'tics',
        coinDecimals: 18, // NOT 6!
        coinGeckoId: 'qubetics'
    },
    
    // Display Currency
    currencies: [
        {
            coinDenom: 'TICS',
            coinMinimalDenom: 'tics',
            coinDecimals: 18
        }
    ],
    
    // Fee Currency
    feeCurrencies: [
        {
            coinDenom: 'TICS',
            coinMinimalDenom: 'tics',
            coinDecimals: 18,
            gasPriceStep: {
                low: 10000000000,      // ~0.0025 TICS for 250k gas
                average: 25000000000,  // ~0.00625 TICS for 250k gas
                high: 40000000000      // ~0.01 TICS for 250k gas
            }
        }
    ],
    
    // Address Prefixes
    bech32Config: {
        bech32PrefixAccAddr: 'qubetics',
        bech32PrefixAccPub: 'qubetics' + 'pub',
        bech32PrefixValAddr: 'qubetics' + 'valoper',
        bech32PrefixValPub: 'qubetics' + 'valoperpub',
        bech32PrefixConsAddr: 'qubetics' + 'valcons',
        bech32PrefixConsPub: 'qubetics' + 'valconspub'
    },
    
    // Network Info
    features: ['ibc-transfer', 'ibc-go'],
    
    // Staking Parameters
    stakingParams: {
        unbondingTime: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds
        minDelegation: '100000000000000000', // 0.1 TICS with 18 decimals
        baseAPY: 30,
        effectiveAPY: 28.5
    },
    
    // Gas Defaults
    gas: {
        delegate: 250000,
        undelegate: 300000,
        claimRewards: 200000,
        cancelUnbonding: 250000,
        redelegate: 500000
    }
};

// QubeNode Validator Configuration
const VALIDATOR_CONFIG = {
    operatorAddress: 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld',
    name: 'QubeNode',
    commission: 5,
    minDelegation: 0.1,
    website: 'https://qubenode.space',
    description: 'Професійний валідатор Qubetics з uptime 100% та комісією 5%'
};

// Keplr-specific chain suggestion
const KEPLR_CHAIN_INFO = {
    chainId: QUBETICS_CHAIN_CONFIG.chainId,
    chainName: QUBETICS_CHAIN_CONFIG.chainName,
    rpc: QUBETICS_CHAIN_CONFIG.rpc,
    rest: QUBETICS_CHAIN_CONFIG.rest,
    bip44: {
        coinType: 118
    },
    bech32Config: QUBETICS_CHAIN_CONFIG.bech32Config,
    currencies: QUBETICS_CHAIN_CONFIG.currencies,
    feeCurrencies: QUBETICS_CHAIN_CONFIG.feeCurrencies,
    stakeCurrency: QUBETICS_CHAIN_CONFIG.stakeCurrency,
    features: QUBETICS_CHAIN_CONFIG.features
};

// Export for browser usage
if (typeof window !== 'undefined') {
    window.QUBETICS_CHAIN_CONFIG = QUBETICS_CHAIN_CONFIG;
    window.VALIDATOR_CONFIG = VALIDATOR_CONFIG;
    window.KEPLR_CHAIN_INFO = KEPLR_CHAIN_INFO;
    console.log('✅ Chain Config loaded');
}
