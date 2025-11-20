// CosmJS Loader v1.0
// This script loads CosmJS library and exposes it globally

console.log('📦 CosmJS Loader starting...');

// Try loading from esm.sh (ES Modules CDN)
(async function loadCosmJS() {
    try {
        // Use dynamic import for ES modules
        const { SigningStargateClient, StargateClient } = await import('https://esm.sh/@cosmjs/stargate@0.32.2');
        
        // Expose to window
        window.cosmos = {
            SigningStargateClient,
            StargateClient
        };
        
        console.log('✅ CosmJS loaded successfully from esm.sh');
        console.log('   SigningStargateClient:', typeof window.cosmos.SigningStargateClient);
        console.log('   StargateClient:', typeof window.cosmos.StargateClient);
        
        // Dispatch event so other scripts know CosmJS is ready
        window.dispatchEvent(new Event('cosmjs-loaded'));
        
    } catch (error) {
        console.error('❌ Failed to load CosmJS:', error);
        console.error('   Delegation and claim functions will not work');
        console.error('   Please report this issue');
        
        // Set empty object to prevent errors
        window.cosmos = {
            SigningStargateClient: null,
            StargateClient: null,
            _error: error.message
        };
    }
})();
