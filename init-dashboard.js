/**
 * Dashboard Page Initialization Script - CORRECTED VERSION
 * Handles wallet operations, delegations, and modal interactions
 * Fixed: No name conflicts between buttons and functions
 * 
 * Date: 2025-12-16 (FIXED v2)
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard Initialization...');
    
    let listenersAdded = 0;
    
    // ========== 1. DISCONNECT WALLET BUTTON ==========
    const disconnectBtn = document.getElementById('disconnectWalletBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', function() {
            disconnectWallet();
        });
        listenersAdded++;
    }
    
    // ========== 2. QUICK ACTION BUTTONS ==========
    const quickDelegateBtn = document.querySelector('.btn-quick.btn-delegate');
    if (quickDelegateBtn) {
        quickDelegateBtn.addEventListener('click', function() {
            quickDelegateQubeNode();
        });
        listenersAdded++;
    }
    
    const quickClaimBtn = document.querySelector('.btn-quick.btn-claim-all');
    if (quickClaimBtn) {
        quickClaimBtn.addEventListener('click', function() {
            quickClaimAll();
        });
        listenersAdded++;
    }
    
    // ========== 3. STAKE MORE MODAL ==========
    const closeStakeMoreBtn = document.getElementById('closeStakeMoreModal');
    if (closeStakeMoreBtn) {
        closeStakeMoreBtn.addEventListener('click', function() {
            closeModal('stakeMoreModal');
        });
        listenersAdded++;
    }
    
    const cancelStakeMoreBtn = document.getElementById('cancelStakeMore');
    if (cancelStakeMoreBtn) {
        cancelStakeMoreBtn.addEventListener('click', function() {
            closeModal('stakeMoreModal');
        });
        listenersAdded++;
    }
    
    const confirmStakeMoreBtn = document.getElementById('confirmStakeMore');
    if (confirmStakeMoreBtn) {
        confirmStakeMoreBtn.addEventListener('click', function() {
            confirmStakeMore();  // ✅ Викликаємо ФУНКЦІЮ confirmStakeMore()
        });
        listenersAdded++;
    }
    
    // ========== 4. CLAIM ALL MODAL ==========
    const closeClaimAllBtn = document.getElementById('closeClaimAllModal');
    if (closeClaimAllBtn) {
        closeClaimAllBtn.addEventListener('click', function() {
            closeModal('claimAllModal');
        });
        listenersAdded++;
    }
    
    const cancelClaimAllBtn = document.getElementById('cancelClaimAll');
    if (cancelClaimAllBtn) {
        cancelClaimAllBtn.addEventListener('click', function() {
            closeModal('claimAllModal');
        });
        listenersAdded++;
    }
    
    const confirmClaimAllBtn = document.getElementById('confirmClaimAll');
    if (confirmClaimAllBtn) {
        confirmClaimAllBtn.addEventListener('click', function() {
            confirmClaimAll();  // ✅ Викликаємо ФУНКЦІЮ confirmClaimAll()
        });
        listenersAdded++;
    }
    
    // ========== 5. SWITCH VALIDATOR MODAL 1 ==========
    const closeSwitchModal1Btn = document.getElementById('closeSwitchModal1');
    if (closeSwitchModal1Btn) {
        closeSwitchModal1Btn.addEventListener('click', function() {
            closeModal('switchValidatorModal');
        });
        listenersAdded++;
    }
    
    const cancelSwitch1Btn = document.getElementById('cancelSwitch1');
    if (cancelSwitch1Btn) {
        cancelSwitch1Btn.addEventListener('click', function() {
            closeModal('switchValidatorModal');
        });
        listenersAdded++;
    }
    
    const nextSwitchBtn = document.getElementById('nextSwitch');
    if (nextSwitchBtn) {
        nextSwitchBtn.addEventListener('click', function() {
            switchValidatorStep2();  // ✅ Викликаємо ФУНКЦІЮ switchValidatorStep2()
        });
        listenersAdded++;
    }
    
    // ========== 6. SWITCH VALIDATOR MODAL 2 ==========
    const closeSwitchModal2Btn = document.getElementById('closeSwitchModal2');
    if (closeSwitchModal2Btn) {
        closeSwitchModal2Btn.addEventListener('click', function() {
            closeModal('switchValidatorModal2');
        });
        listenersAdded++;
    }
    
    const cancelSwitch2Btn = document.getElementById('cancelSwitch2');
    if (cancelSwitch2Btn) {
        cancelSwitch2Btn.addEventListener('click', function() {
            closeModal('switchValidatorModal2');
        });
        listenersAdded++;
    }
    
    const confirmSwitchBtn = document.getElementById('confirmSwitch');
    if (confirmSwitchBtn) {
        confirmSwitchBtn.addEventListener('click', function() {
            confirmSwitch();  // ✅ Викликаємо ФУНКЦІЮ confirmSwitch()
        });
        listenersAdded++;
    }
    
    // ========== 7. UNBOND MODAL ==========
    const closeUnbondBtn = document.getElementById('closeUnbondModal');
    if (closeUnbondBtn) {
        closeUnbondBtn.addEventListener('click', function() {
            closeModal('unbondModal');
        });
        listenersAdded++;
    }
    
    const cancelUnbondBtn = document.getElementById('cancelUnbond');
    if (cancelUnbondBtn) {
        cancelUnbondBtn.addEventListener('click', function() {
            closeModal('unbondModal');
        });
        listenersAdded++;
    }
    
    const confirmUnbondBtn = document.getElementById('confirmUnbond');
    if (confirmUnbondBtn) {
        confirmUnbondBtn.addEventListener('click', function() {
            confirmUnbond();  // ✅ Викликаємо ФУНКЦІЮ confirmUnbond()
        });
        listenersAdded++;
    }
    
    // ========== 8. SUCCESS MODAL ==========
    const closeSuccessBtn = document.getElementById('closeSuccessModal');
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', function() {
            closeModal('successModal');
        });
        listenersAdded++;
    }
    
    const successOKBtn = document.getElementById('successOK');
    if (successOKBtn) {
        successOKBtn.addEventListener('click', function() {
            closeModal('successModal');
        });
        listenersAdded++;
    }
    
    // ========== INITIALIZATION COMPLETE ==========
    console.log('✅ Dashboard Initialized');
    console.log(`📊 Event listeners added: ${listenersAdded}`);
    console.log('📝 Note: Dynamic elements keep inline onclick - safe for CSP');
});

// All functions exist in dashboard.html:
// - disconnectWallet()
// - quickDelegateQubeNode()
// - quickClaimAll()
// - closeModal(modalId)
// - confirmStakeMore()
// - confirmClaimAll()
// - switchValidatorStep2()
// - confirmSwitch()
// - confirmUnbond()
