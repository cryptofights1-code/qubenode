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
