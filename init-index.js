/**
 * Index Page Initialization Script - FINAL VERSION
 * Handles all static HTML elements on the main page
 * Converted from inline onclick to addEventListener for CSP compliance
 * 
 * Date: 2025-12-13
 * File count: 25 static event listeners
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 QubeNode Index Page Initialization...');
    
    let listenersAdded = 0;
    
    // ========== 1. WALLET MODAL CLOSE BUTTON ==========
    const walletModalClose = document.querySelector('.wallet-modal-close');
    if (walletModalClose) {
        walletModalClose.addEventListener('click', function() {
            closeWalletModal();
        });
        listenersAdded++;
    }
    
    // ========== 2. MOBILE MENU NAVIGATION (5 buttons) ==========
    const mobileMenuPages = {
        'mobileMenuEcosystem': 'ecosystem.html',
        'mobileMenuTics': 'tics.html',
        'mobileMenuCalculator': 'calculator.html',
        'mobileMenuDelegate': 'how-to-delegate.html',
        'mobileMenuFaq': 'faq.html'
    };
    
    Object.keys(mobileMenuPages).forEach(function(id) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', function() {
                window.location.href = mobileMenuPages[id];
            });
            listenersAdded++;
        }
    });
    
    // ========== 3. DESKTOP ECOSYSTEM BUTTONS (5 buttons) ==========
    const desktopPages = {
        'desktopEcosystemBtn': 'ecosystem.html',
        'desktopTicsBtn': 'tics.html',
        'desktopCalculatorBtn': 'calculator.html',
        'desktopDelegateBtn': 'how-to-delegate.html',
        'desktopFaqBtn': 'faq.html'
    };
    
    Object.keys(desktopPages).forEach(function(id) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', function() {
                window.location.href = desktopPages[id];
            });
            listenersAdded++;
        }
    });
    
    // ========== 4. HEADER WALLET BUTTON ==========
    const headerWalletBtn = document.getElementById('headerWalletBtn');
    if (headerWalletBtn) {
        headerWalletBtn.addEventListener('click', function(event) {
            toggleHeaderWalletDropdown(event);
        });
        listenersAdded++;
    }
    
    // ========== 5. HEADER WALLET DROPDOWN OPTIONS ==========
    const headerKeplrOption = document.getElementById('headerKeplrOption');
    if (headerKeplrOption) {
        headerKeplrOption.addEventListener('click', function(event) {
            event.stopPropagation();
            connectHeaderWallet('keplr');
        });
        listenersAdded++;
    }
    
    const headerCosmostationOption = document.getElementById('headerCosmostationOption');
    if (headerCosmostationOption) {
        headerCosmostationOption.addEventListener('click', function(event) {
            event.stopPropagation();
            connectHeaderWallet('cosmostation');
        });
        listenersAdded++;
    }
    
    // ========== 6. DELEGATOR MODAL - CLOSE BUTTON ==========
    const closeButtons = document.querySelectorAll('.close-button[data-close], .закрити-button[data-close]');
    closeButtons.forEach(function(button) {
        const modalId = button.getAttribute('data-close');
        if (modalId) {
            button.addEventListener('click', function() {
                closeModal(modalId);
            });
            listenersAdded++;
        }
    });
    
    // ========== 7. KEPLR GUIDE LINK ==========
    const keplrGuideLinks = document.querySelectorAll('[data-modal="keplrGuideModal"]');
    keplrGuideLinks.forEach(function(link) {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            openModal('keplrGuideModal');
        });
        listenersAdded++;
    });
    
    // ========== 8. WALLET CONNECTION BUTTONS IN MODAL ==========
    const connectKeplrBtn = document.getElementById('connectKeplrBtn');
    if (connectKeplrBtn) {
        connectKeplrBtn.addEventListener('click', function() {
            connectHeaderWallet('keplr');
        });
        listenersAdded++;
    }
    
    const connectCosmostationBtn = document.getElementById('connectCosmostationBtn');
    if (connectCosmostationBtn) {
        connectCosmostationBtn.addEventListener('click', function() {
            connectHeaderWallet('cosmostation');
        });
        listenersAdded++;
    }
    
    // ========== 9. DISCONNECT WALLET BUTTON ==========
    const disconnectWalletBtn = document.getElementById('disconnectWalletBtn');
    if (disconnectWalletBtn) {
        disconnectWalletBtn.addEventListener('click', function() {
            disconnectWallet();
        });
        listenersAdded++;
    }
    
    // ========== 10. STAKING TABS ==========
    const tabDelegate = document.getElementById('tabDelegate');
    if (tabDelegate) {
        tabDelegate.addEventListener('click', function() {
            showStakingTab('delegate');
        });
        listenersAdded++;
    }
    
    const tabUndelegate = document.getElementById('tabUndelegate');
    if (tabUndelegate) {
        tabUndelegate.addEventListener('click', function() {
            showStakingTab('undelegate');
        });
        listenersAdded++;
    }
    
    const tabClaim = document.getElementById('tabClaim');
    if (tabClaim) {
        tabClaim.addEventListener('click', function() {
            showStakingTab('claim');
        });
        listenersAdded++;
    }
    
    // ========== 11. EXECUTE STAKING BUTTONS ==========
    const executeDelegateBtn = document.getElementById('executeDelegateBtn');
    if (executeDelegateBtn) {
        executeDelegateBtn.addEventListener('click', function() {
            executeDelegate();
        });
        listenersAdded++;
    }
    
    const executeUndelegateBtn = document.getElementById('executeUndelegateBtn');
    if (executeUndelegateBtn) {
        executeUndelegateBtn.addEventListener('click', function() {
            executeUndelegate();
        });
        listenersAdded++;
    }
    
    const executeClaimBtn = document.getElementById('executeClaimBtn');
    if (executeClaimBtn) {
        executeClaimBtn.addEventListener('click', function() {
            executeClaim();
        });
        listenersAdded++;
    }
    
    // ========== 12. DISCONNECT DASHBOARD BUTTON ==========
    const disconnectDashboardBtn = document.getElementById('disconnectDashboardBtn');
    if (disconnectDashboardBtn) {
        disconnectDashboardBtn.addEventListener('click', function() {
            disconnectDashboard();
        });
        listenersAdded++;
    }
    
    // ========== 13. VALIDATOR SELECTOR MODAL - CLOSE ON OVERLAY CLICK ==========
    const validatorSelectorModal = document.getElementById('validatorSelectorModal');
    if (validatorSelectorModal) {
        validatorSelectorModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeModal('validatorSelectorModal');
            }
        });
        listenersAdded++;
    }
    
    // ========== INITIALIZATION COMPLETE ==========
    console.log(`✅ QubeNode Index Page Initialized`);
    console.log(`📊 Event listeners added: ${listenersAdded}`);
    console.log(`📝 Note: Dynamic elements (created via JS) keep their inline onclick - this is safe for CSP`);
});

// All functions (closeWalletModal, connectHeaderWallet, etc.) already exist in the HTML
// This script only adds event listeners to static elements
