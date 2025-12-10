/**
 * Validators Registry for Qubetics
 * Loads all validators from API and provides metadata to Keplr
 */

class QubeticsValidatorsRegistry {
    constructor() {
        this.validators = new Map();
        this.loaded = false;
    }

    async loadValidators() {
        try {
            console.log('📋 Loading validators registry...');
            
            const response = await fetch('https://swagger.qubetics.com/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED');
            const data = await response.json();
            
            if (data.validators && Array.isArray(data.validators)) {
                data.validators.forEach(validator => {
                    if (validator.description && validator.description.moniker) {
                        this.validators.set(validator.operator_address, {
                            name: validator.description.moniker,
                            identity: validator.description.identity || '',
                            website: validator.description.website || '',
                            details: validator.description.details || ''
                        });
                    }
                });
                
                this.loaded = true;
                console.log(`✅ Loaded ${this.validators.size} validators to registry`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Failed to load validators registry:', error);
            return false;
        }
    }

    getValidatorName(address) {
        const validator = this.validators.get(address);
        return validator ? validator.name : null;
    }

    getValidator(address) {
        return this.validators.get(address);
    }

    getAllValidators() {
        return Array.from(this.validators.entries()).map(([address, data]) => ({
            address,
            ...data
        }));
    }

    // Create chain config with validators metadata for Keplr
    createChainConfigWithValidators(baseChainConfig) {
        const validatorsArray = this.getAllValidators();
        
        return {
            ...baseChainConfig,
            // Add validators metadata that Keplr can use
            validatorsMetadata: validatorsArray.reduce((acc, val) => {
                acc[val.address] = {
                    name: val.name,
                    identity: val.identity,
                    website: val.website
                };
                return acc;
            }, {})
        };
    }
}

// Global instance
window.validatorsRegistry = new QubeticsValidatorsRegistry();

console.log('✅ Validators Registry loaded');
