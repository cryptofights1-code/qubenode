/**
 * How To Delegate - Complete Script
 * CSP Compliant - No inline scripts or event handlers
 */

const chainId = 'qubetics_9030-1';

// Wallet connection function
async function connectWallet(walletType) {
    const btn = document.getElementById(walletType === 'keplr' ? 'connectKeplrBtn' : 'connectCosmostationBtn');
    btn.innerHTML = '<span>⏳</span><span>Connecting...</span>';
    btn.style.pointerEvents = 'none';
    
    try {
        let address;
        
        if (walletType === 'keplr') {
            if (!window.keplr) {
                alert('Please install Keplr Wallet');
                btn.style.pointerEvents = 'auto';
                // Reset button content without inline styles
                btn.innerHTML = '<img src="keplr.png" alt="Keplr" class="wallet-icon"><span>Keplr Wallet</span>';
                return;
            }
            
            await window.keplr.enable(chainId);
            const offlineSigner = window.keplr.getOfflineSigner(chainId);
            const accounts = await offlineSigner.getAccounts();
            address = accounts[0].address;
            
        } else if (walletType === 'cosmostation') {
            if (!window.cosmostation) {
                alert('Please install Cosmostation Wallet');
                btn.style.pointerEvents = 'auto';
                // Reset button content without inline styles
                btn.innerHTML = '<img src="Cosmostation.png" alt="Cosmostation" class="wallet-icon"><span>Cosmostation</span>';
                return;
            }
            
            const provider = window.cosmostation.providers.keplr;
            await provider.enable(chainId);
            const offlineSigner = provider.getOfflineSigner(chainId);
            const accounts = await offlineSigner.getAccounts();
            address = accounts[0].address;
        }
        
        // Redirect to dashboard with wallet info
        window.location.href = `dashboard.html?wallet=${walletType}&address=${address}`;
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        alert('Connection error: ' + error.message);
        btn.style.pointerEvents = 'auto';
        // Reset button content without inline styles
        btn.innerHTML = walletType === 'keplr' ? 
            '<img src="keplr.png" alt="Keplr" class="wallet-icon"><span>Keplr Wallet</span>' : 
            '<img src="Cosmostation.png" alt="Cosmostation" class="wallet-icon"><span>Cosmostation</span>';
    }
}

// Modal functions
function openKeplrModal() {
    document.getElementById('keplrModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeKeplrModal() {
    document.getElementById('keplrModal').classList.remove('active');
    document.body.style.overflow = '';
}

function openCosmostationModal() {
    document.getElementById('cosmostationModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCosmostationModal() {
    document.getElementById('cosmostationModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ How To Delegate Page Initialized');
    
    // Keplr Guide link
    const keplrGuideLink = document.getElementById('keplrGuideLink');
    if (keplrGuideLink) {
        keplrGuideLink.addEventListener('click', function(event) {
            event.preventDefault();
            openKeplrModal();
        });
        console.log('✅ Keplr guide link listener attached');
    }
    
    // Cosmostation Guide link
    const cosmostationGuideLink = document.getElementById('cosmostationGuideLink');
    if (cosmostationGuideLink) {
        cosmostationGuideLink.addEventListener('click', function(event) {
            event.preventDefault();
            openCosmostationModal();
        });
        console.log('✅ Cosmostation guide link listener attached');
    }
    
    // Connect Keplr button
    const connectKeplrBtn = document.getElementById('connectKeplrBtn');
    if (connectKeplrBtn) {
        connectKeplrBtn.addEventListener('click', function() {
            connectWallet('keplr');
        });
        console.log('✅ Keplr connect button listener attached');
    }
    
    // Connect Cosmostation button
    const connectCosmostationBtn = document.getElementById('connectCosmostationBtn');
    if (connectCosmostationBtn) {
        connectCosmostationBtn.addEventListener('click', function() {
            connectWallet('cosmostation');
        });
        console.log('✅ Cosmostation connect button listener attached');
    }
    
    // Keplr Modal - close on click outside
    const keplrModal = document.getElementById('keplrModal');
    if (keplrModal) {
        keplrModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeKeplrModal();
            }
        });
    }
    
    // Cosmostation Modal - close on click outside
    const cosmostationModal = document.getElementById('cosmostationModal');
    if (cosmostationModal) {
        cosmostationModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeCosmostationModal();
            }
        });
    }
    
    // Modal close buttons
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    modalCloseButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            closeKeplrModal();
            closeCosmostationModal();
        });
    });
    
    // Close modals with ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeKeplrModal();
            closeCosmostationModal();
        }
    });
    
    console.log('✅ All event listeners attached successfully');
});
