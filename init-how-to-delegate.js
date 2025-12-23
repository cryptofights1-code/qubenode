/**
 * How To Delegate - Complete Script
 * Functions from inline scripts + Event Listeners
 */

        const CHAIN_ID = 'qubetics_9030-1';
        
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
                        btn.innerHTML = '<img src="keplr.png" alt="Keplr" style="width: 28px; height: 28px; border-radius: 6px;"><span>Keplr Wallet</span>';
                        return;
                    }
                    
                    await window.keplr.enable(CHAIN_ID);
                    const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
                    const accounts = await offlineSigner.getAccounts();
                    address = accounts[0].address;
                    
                } else if (walletType === 'cosmostation') {
                    if (!window.cosmostation) {
                        alert('Please install Cosmostation Wallet');
                        btn.style.pointerEvents = 'auto';
                        btn.innerHTML = '<img src="Cosmostation.png" alt="Cosmostation" style="width: 28px; height: 28px; border-radius: 6px;"><span>Cosmostation</span>';
                        return;
                    }
                    
                    const provider = window.cosmostation.providers.keplr;
                    await provider.enable(CHAIN_ID);
                    const offlineSigner = provider.getOfflineSigner(CHAIN_ID);
                    const accounts = await offlineSigner.getAccounts();
                    address = accounts[0].address;
                }
                
                // Redirect to dashboard with wallet info
                window.location.href = `dashboard.html?wallet=${walletType}&address=${address}`;
                
            } catch (error) {
                console.error('Wallet connection error:', error);
                alert('Connection error: ' + error.message);
                btn.style.pointerEvents = 'auto';
                btn.innerHTML = walletType === 'keplr' ? 
                    '<img src="keplr.png" alt="Keplr" style="width: 28px; height: 28px; border-radius: 6px;"><span>Keplr Wallet</span>' : 
                    '<img src="Cosmostation.png" alt="Cosmostation" style="width: 28px; height: 28px; border-radius: 6px;"><span>Cosmostation</span>';
            }
        }

        function openKeplrModal() {
            document.getElementById('keplrModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        function closeKeplrModal() {
            document.getElementById('keplrModal').classList.remove('active');
            document.body.style.overflow = '';
        }
        
        // Close modal on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeKeplrModal();
            }
        });

/**
 * How To Delegate Page Initialization Script
 * Handles wallet connection modals
 * Converted from inline onclick to addEventListener for CSP compliance
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ How To Delegate Page Initialized');
    
    // Guide link - openKeplrModal()
    const guideLinks = document.querySelectorAll('a.link');
    guideLinks.forEach(function(link) {
        const onclick = link.getAttribute('onclick');
        if (onclick && onclick.includes('openKeplrModal')) {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                openKeplrModal();
                return false;
            });
        }
    });
    
    // Connect Keplr button
    const connectKeplrBtn = document.getElementById('connectKeplrBtn');
    if (connectKeplrBtn) {
        connectKeplrBtn.addEventListener('click', function() {
            connectWallet('keplr');
        });
    }
    
    // Connect Cosmostation button
    const connectCosmostationBtn = document.getElementById('connectCosmostationBtn');
    if (connectCosmostationBtn) {
        connectCosmostationBtn.addEventListener('click', function() {
            connectWallet('cosmostation');
        });
    }
    
    // Modal overlay - close on click outside
    const keplrModal = document.getElementById('keplrModal');
    if (keplrModal) {
        keplrModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeKeplrModal();
            }
        });
    }
    
    // Modal close button
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    modalCloseButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            closeKeplrModal();
        });
    });
    
    console.log('✅ How To Delegate event listeners attached');
});

// Functions (openKeplrModal, closeKeplrModal, connectWallet) should already exist in HTML
// This script only adds event listeners
