/**
 * Index Page - Complete Script
 * All functions from inline scripts + Event Listeners
 */

// ========== БЛОК 1: Wallet Modal Functions (з рядків 147-220) ==========
        let headerWalletConnected = false;
        let cosmosStaking = null;
        
        function toggleHeaderWalletDropdown(event) {
            if (event) event.stopPropagation();
            const dropdown = document.getElementById('headerWalletDropdown');
            if (dropdown) dropdown.classList.toggle('show');
        }
        
        async function connectHeaderWallet(walletType) {
            const dropdown = document.getElementById('headerWalletDropdown');
            if (dropdown) dropdown.classList.remove('show');
            
            const headerBtn = document.getElementById('headerWalletBtn');
            if (headerBtn) {
                headerBtn.innerHTML = '<span>⏳</span><span>Connecting...</span>';
                headerBtn.style.pointerEvents = 'none';
            }
            
            try {
                // Wait for modules to load (max 5 seconds)
                let attempts = 0;
                while ((typeof CosmosStakingModule === 'undefined' || typeof QUBETICS_CHAIN_CONFIG === 'undefined') && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (typeof CosmosStakingModule === 'undefined') {
                    throw new Error('Modules failed to load. Reload the page.');
                }
                
                if (typeof QUBETICS_CHAIN_CONFIG === 'undefined') {
                    throw new Error('Chain configuration not loaded. Reload the page.');
                }
                
                await initializeStaking();
                const result = await cosmosStaking.connectWallet(walletType);
                
                if (result.success) {
                    headerWalletConnected = true;
                    const walletInfo = cosmosStaking.getWalletInfo();
                    window.location.href = `dashboard.html?wallet=${walletType}&address=${walletInfo.address}`;
                }
            } catch (error) {
                // console.error('Header wallet connection error:', error);
                alert('Connection error: ' + error.message);
                resetHeaderWalletButton();
            } finally {
                if (headerBtn) headerBtn.style.pointerEvents = 'auto';
            }
        }
        
        async function initializeStaking() {
            if (!cosmosStaking) {
                cosmosStaking = new CosmosStakingModule();
                await cosmosStaking.initialize();
            }
        }
        
        function resetHeaderWalletButton() {
            const headerBtn = document.getElementById('headerWalletBtn');
            if (headerBtn) {
                headerBtn.innerHTML = '<span>💼</span><span>Connect Wallet</span>';
                headerBtn.classList.remove('wallet-connected');
            }
        }
        
        function disconnectHeaderWallet() {
            headerWalletConnected = false;
            if (typeof cosmosStaking !== 'undefined' && cosmosStaking) cosmosStaking.disconnect();
            resetHeaderWalletButton();
        }

// ========== БЛОК 2: FAQ Toggle + Main Functions (з рядків 936-2857) ==========
        // FAQ Accordion Toggle
        function toggleFaq(button) {
            const faqItem = button.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Close all other FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Toggle current item
            if (!isActive) {
                faqItem.classList.add('active');
            }
        }

        function bindCloseButtons() {
            var closeButtons = document.querySelectorAll('.close-button[data-close]');
            closeButtons.forEach(function(btn) {
                var modalId = btn.getAttribute('data-close');
                
                // Remove old listeners
                var newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // Touch event for mobile
                newBtn.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeModal(modalId);
                }, {passive: false});
                
                // Click event for desktop  
                newBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeModal(modalId);
                });
            });
        }
    
        function openModal(id) {
            var modal = document.getElementById(id);
            
            if (modal) {
                modal.classList.add('show');
                modal.style.display = 'block';
                modal.style.zIndex = '100000';
                
                // Check if opening delegator modal
                if (id === 'delegatorModal') {
                    const dashboard = document.getElementById('delegatorDashboard');
                    const walletSection = document.getElementById('walletSection');
                    const walletStatus = document.getElementById('walletStatus');
                    const stakingActions = document.getElementById('stakingActions');
                    
                    // Check if wallet is connected
                    if (headerWalletConnected && cosmosStaking && cosmosStaking.isWalletConnected()) {
                        // Wallet IS connected - hide buttons, show dashboard
                        if (walletSection) walletSection.style.display = 'none';
                        if (walletStatus) walletStatus.style.display = 'none';
                        if (stakingActions) stakingActions.style.display = 'none';
                        if (dashboard) {
                            dashboard.style.display = 'block';
                            updateDashboardData();
                        }
                    } else {
                        // Wallet NOT connected - show buttons, hide dashboard
                        if (walletSection) walletSection.style.display = 'block';
                        if (walletStatus) walletStatus.style.display = 'none';
                        if (stakingActions) stakingActions.style.display = 'none';
                        if (dashboard) dashboard.style.display = 'none';
                        
                        // Reset buttons to enabled state
                        const keplrBtn = document.getElementById('connectKeplrBtn');
                        const cosmostationBtn = document.getElementById('connectCosmostationBtn');
                        if (keplrBtn) {
                            keplrBtn.disabled = false;
                            keplrBtn.innerHTML = '<span class="wallet-icon-emoji">🔷</span><span>Keplr Wallet</span>';
                        }
                        if (cosmostationBtn) {
                            cosmostationBtn.disabled = false;
                            cosmostationBtn.innerHTML = '<span class="wallet-icon-emoji">🔶</span><span>Cosmostation</span>';
                        }
                    }
                }
                
                // ПРИХОВАТИ іконки меню, телеграм та пошти в модальних вікнах
                var iconsContainer = document.getElementById('mobile-icons-container');
                if (iconsContainer) {
                    iconsContainer.style.display = 'none';
                }
                
                // Bind close button after modal opens
                setTimeout(bindCloseButtons, 100);
            }
        }

        function closeModal(id) {
            var modal = document.getElementById(id);
            if (modal) {
                modal.classList.remove('show');
                modal.style.display = 'none';
                
                // ПОКАЗАТИ іконки меню, телеграм та пошти назад (тільки на мобільних)
                var iconsContainer = document.getElementById('mobile-icons-container');
                if (iconsContainer && window.innerWidth <= 768) {
                    iconsContainer.style.display = 'block';
                }
            }
        }

        // DOMContentLoaded - bind close buttons
        document.addEventListener('DOMContentLoaded', function() {
            // Bind close buttons on page load
            bindCloseButtons();
        });

        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.classList.remove('show');
                event.target.style.display = 'none';
            }
        }

        // Cosmos Staking Functions already declared above
        // let cosmosStaking = null; // REMOVED - duplicate declaration
        let stakingModuleReady = false;

        // Wait for all modules to load
        window.addEventListener('DOMContentLoaded', function() {
            // Initialize wallet dropdown - make sure it's hidden
            const dropdown = document.getElementById('headerWalletDropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
                dropdown.style.display = 'none';
            }
            
            // Check if CosmosStakingModule is available
            const checkModules = setInterval(function() {
                if (typeof CosmosStakingModule !== 'undefined' && 
                    typeof QUBETICS_CHAIN_CONFIG !== 'undefined' && 
                    typeof VALIDATOR_CONFIG !== 'undefined') {
                    stakingModuleReady = true;
                    clearInterval(checkModules);
                    // console.log('✅ Cosmos Staking Module ready');
                }
            }, 100);
        });

        async function initializeStaking() {
            if (!cosmosStaking) {
                if (!stakingModuleReady) {
                    throw new Error('Staking modules still loading, try in a second');
                }
                cosmosStaking = new CosmosStakingModule();
                await cosmosStaking.initialize();
            }
        }

        async function connectWallet(walletType) {
            try {
                // Disable buttons and show loading
                const keplrBtn = document.getElementById('connectKeplrBtn');
                const cosmostationBtn = document.getElementById('connectCosmostationBtn');
                
                if (keplrBtn) keplrBtn.disabled = true;
                if (cosmostationBtn) cosmostationBtn.disabled = true;
                
                if (walletType === 'keplr' && keplrBtn) {
                    keplrBtn.innerHTML = '<span>⏳</span><span>Connecting...</span>';
                } else if (cosmostationBtn) {
                    cosmostationBtn.innerHTML = '<span>⏳</span><span>Connecting...</span>';
                }

                await initializeStaking();
                const result = await cosmosStaking.connectWallet(walletType);

                if (result.success) {
                    // Hide old interface
                    const stakingInterface = document.getElementById('stakingInterface');
                    if (stakingInterface) {
                        stakingInterface.style.display = 'none';
                    }
                    
                    // Show dashboard
                    const dashboard = document.getElementById('delegatorDashboard');
                    if (dashboard) {
                        dashboard.style.display = 'block';
                    }
                    
                    // Update dashboard data
                    await updateDashboardData();
                    
                    // Update header
                    headerWalletConnected = true;
                    await updateHeaderWalletDisplay();
                }
            } catch (error) {
                // console.error('Connection error:', error);
                alert('Connection error: ' + error.message);
                
                // Reset buttons
                const keplrBtn = document.getElementById('connectKeplrBtn');
                const cosmostationBtn = document.getElementById('connectCosmostationBtn');
                
                if (keplrBtn) {
                    keplrBtn.disabled = false;
                    keplrBtn.innerHTML = '<span class="wallet-icon-emoji-large">🔷</span><span>Keplr Wallet</span>';
                }
                if (cosmostationBtn) {
                    cosmostationBtn.disabled = false;
                    cosmostationBtn.innerHTML = '<span class="wallet-icon-emoji-large">🔶</span><span>Cosmostation</span>';
                }
            }
        }

        async function disconnectWallet() {
            if (cosmosStaking) {
                cosmosStaking.disconnect();
            }
            
            document.getElementById('walletSection').style.display = 'block';
            document.getElementById('walletStatus').style.display = 'none';
            document.getElementById('stakingActions').style.display = 'none';
            document.getElementById('connectKeplrBtn').disabled = false;
            document.getElementById('connectCosmostationBtn').disabled = false;
            document.getElementById('connectKeplrBtn').innerHTML = '<span class="wallet-icon-emoji-large">🔷</span><span>Keplr Wallet</span>';
        }

        // DASHBOARD FUNCTIONS
        


                // =====================================================================
        // SIMPLE WORKING FUNCTIONS (like the working module below)
        // =====================================================================
        
        window.quickStakeMore = async function(validatorAddress) {
            // ✅ БЕЗПЕЧНО: Санітизація адреси валідатора
            const sanitizedAddress = String(validatorAddress).replace(/[<>"']/g, '');
            
            // Get validator name and sanitize
            let validatorName = validatorNamesCache[sanitizedAddress] || sanitizedAddress.substring(0, 20) + '...';
            const sanitizedName = String(validatorName).replace(/[<>"']/g, '');
            
            // Create and show custom modal
            const modal = document.createElement('div');
            modal.id = 'customStakeModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                z-index: 999999 !important;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            const overview = cosmosStaking ? cosmosStaking.getStakingOverview() : null;
            const available = overview ? cosmosStaking.formatTics(overview.balance) : '0';
            
            // ✅ БЕЗПЕЧНО: Використовуємо екрановані значення
            modal.innerHTML = `
                <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 2px solid rgba(0, 212, 255, 0.4); border-radius: 20px; padding: 30px; max-width: 500px; width: 90%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);">
                    <h3 style="color: #00D4FF; font-size: 1.5em; margin: 0 0 20px 0; text-align: center;">💎 Delegate TICS</h3>
                    
                    <div style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                        <div id="modalValidatorName" style="color: #00FFF0; font-weight: 600; margin-bottom: 8px; font-size: 1.1em;"></div>
                        <div id="modalValidatorAddress" style="color: #64748b; font-size: 0.85em; font-family: monospace; word-break: break-all;"></div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="color: #94a3b8; font-size: 0.9em; display: block; margin-bottom: 8px; font-weight: 500;">Amount to delegate (TICS)</label>
                        <input 
                            type="number" 
                            id="modalStakeAmount" 
                            placeholder="0.00"
                            min="0.1"
                            step="0.1"
                            style="width: 100%; padding: 14px; background: rgba(15, 23, 42, 0.6); border: 2px solid rgba(0, 212, 255, 0.3); border-radius: 10px; color: #fff; font-size: 1.2em; font-weight: 600; text-align: center; box-sizing: border-box;"
                        />
                        <div style="color: #64748b; font-size: 0.85em; margin-top: 8px; display: flex; justify-content: space-between;">
                            <span>Minimum: 0.1 TICS</span>
                            <span>Available: ${parseFloat(available).toFixed(2)} TICS</span>
                        </div>
                    </div>
                    
                    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 10px; padding: 12px; margin-bottom: 20px;">
                        <div style="color: #86efac; font-size: 0.85em;">
                            ✅ You will start receiving rewards immediately after delegation
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button onclick="document.getElementById('customStakeModal').remove()" style="flex: 1; padding: 14px; background: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.4); border-radius: 12px; color: #94a3b8; font-size: 1em; font-weight: 600; cursor: pointer;">
                            Cancel
                        </button>
                        <button id="modalConfirmBtn" style="flex: 1; padding: 14px; background: linear-gradient(135deg, #00D4FF, #00FFF0); border: none; border-radius: 12px; color: #000; font-size: 1em; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 212, 255, 0.4);">
                            Delegate
                        </button>
                    </div>
                </div>
            `;
            
            // Ensure modal is LAST element in body (after everything else)
            document.body.appendChild(modal);
            // Force modal to be on top by setting style after append
            modal.style.zIndex = '2147483647'; // Max z-index value
            
            // ✅ БЕЗПЕЧНО: Встановлюємо текст через textContent після створення DOM
            const nameEl = document.getElementById('modalValidatorName');
            const addressEl = document.getElementById('modalValidatorAddress');
            if (nameEl) nameEl.textContent = sanitizedName;
            if (addressEl) addressEl.textContent = sanitizedAddress;
            
            // Focus input
            setTimeout(() => document.getElementById('modalStakeAmount').focus(), 100);
            
            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            // Confirm button handler
            document.getElementById('modalConfirmBtn').onclick = async () => {
                const amount = document.getElementById('modalStakeAmount').value;
                
                if (!amount || isNaN(amount) || parseFloat(amount) < 0.1) {
                    alert('Minimum amount: 0.1 TICS');
                    return;
                }
                
                modal.remove();
                
                try {
                    showDashTxStatus('processing', 'Processing transaction...');
                    
                    // Get staking service directly
                    const stakingService = cosmosStaking.stakingService;
                    if (!stakingService) {
                        throw new Error('Staking service not available');
                    }
                    
                    // Convert to minimal units
                    const amountMinimal = cosmosStaking.ticsToMinimal(parseFloat(amount));
                    
                    // Delegate to specific validator (using sanitized address)
                    const result = await stakingService.delegate(sanitizedAddress, amountMinimal, 'Stake more to ' + sanitizedName);
                    
                    showDashTxStatus('success', `Успішно! TX: ${result.transactionHash}`);
                    
                    setTimeout(async () => await updateDashboardData(), 3000);
                    let refreshCount = 0;
                    const refreshInterval = setInterval(async () => {
                        refreshCount++;
                        await updateDashboardData();
                        if (refreshCount >= 6) clearInterval(refreshInterval);
                    }, 5000);
                } catch (error) {
                    showDashTxStatus('error', 'Помилка: ' + error.message);
                }
            };
        }
        
        window.quickSwitchValidator = async function(fromValidatorAddress) {
            // ✅ Санітизація адреси
            const sanitizedFromAddress = String(fromValidatorAddress).replace(/[<>"']/g, '');
            let fromValidatorName = validatorNamesCache[sanitizedFromAddress] || sanitizedFromAddress.substring(0, 20) + '...';
            const sanitizedFromName = String(fromValidatorName).replace(/[<>"']/g, '');
            
            const overview = cosmosStaking ? cosmosStaking.getStakingOverview() : null;
            
            if (!overview || !overview.delegations) {
                alert('No delegations');
                return;
            }
            
            // Get current delegation amount
            let currentAmount = '0';
            const delegation = overview.delegations.find(d => d.delegation.validator_address === sanitizedFromAddress);
            if (delegation) {
                currentAmount = cosmosStaking.formatTics(delegation.balance.amount);
            }
            
            // Create modal
            const modal = document.createElement('div');
            modal.id = 'customSwitchModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                z-index: 999999 !important;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Create modal content container
            const modalContent = document.createElement('div');
            modalContent.style.cssText = 'background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 2px solid rgba(0, 212, 255, 0.4); border-radius: 20px; padding: 30px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);';
            
            // Title
            const title = document.createElement('h3');
            title.style.cssText = 'color: #00D4FF; font-size: 1.5em; margin: 0 0 20px 0; text-align: center;';
            title.textContent = '🔄 Switch Validator';
            
            // From section
            const fromSection = document.createElement('div');
            fromSection.style.cssText = 'background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 20px;';
            
            const fromLabel = document.createElement('div');
            fromLabel.style.cssText = 'color: #00FFF0; font-weight: 600; margin-bottom: 8px;';
            fromLabel.textContent = 'From:';
            
            const fromName = document.createElement('div');
            fromName.style.cssText = 'color: #00D4FF; font-size: 1.1em; font-weight: 700; margin-bottom: 4px;';
            fromName.textContent = sanitizedFromName;
            
            const fromAmount = document.createElement('div');
            fromAmount.style.cssText = 'color: #64748b; font-size: 0.85em;';
            fromAmount.textContent = `Staked: ${parseFloat(currentAmount).toFixed(4)} TICS`;
            
            fromSection.appendChild(fromLabel);
            fromSection.appendChild(fromName);
            fromSection.appendChild(fromAmount);
            
            // Amount input section
            const amountSection = document.createElement('div');
            amountSection.style.cssText = 'margin-bottom: 20px;';
            
            const amountLabel = document.createElement('label');
            amountLabel.style.cssText = 'color: #94a3b8; font-size: 0.9em; display: block; margin-bottom: 8px; font-weight: 500;';
            amountLabel.textContent = 'Amount to redelegate (TICS)';
            
            const amountInput = document.createElement('input');
            amountInput.type = 'number';
            amountInput.id = 'modalSwitchAmount';
            amountInput.placeholder = '0.00';
            amountInput.min = '0.1';
            amountInput.step = '0.1';
            amountInput.style.cssText = 'width: 100%; padding: 14px; background: rgba(15, 23, 42, 0.6); border: 2px solid rgba(0, 212, 255, 0.3); border-radius: 10px; color: #fff; font-size: 1.2em; font-weight: 600; text-align: center; box-sizing: border-box;';
            
            const amountInfo = document.createElement('div');
            amountInfo.style.cssText = 'color: #64748b; font-size: 0.85em; margin-top: 8px;';
            amountInfo.innerHTML = `Min: 0.1 TICS &nbsp;•&nbsp; Available: ${parseFloat(currentAmount).toFixed(2)} TICS`;
            
            const maxBtn = document.createElement('button');
            maxBtn.style.cssText = 'width: 100%; margin-top: 10px; padding: 10px; background: rgba(0, 212, 255, 0.15); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 8px; color: #00D4FF; font-weight: 600; cursor: pointer;';
            maxBtn.textContent = '⚡ Use Maximum';
            maxBtn.addEventListener('click', () => {
                amountInput.value = currentAmount;
            });
            
            amountSection.appendChild(amountLabel);
            amountSection.appendChild(amountInput);
            amountSection.appendChild(amountInfo);
            amountSection.appendChild(maxBtn);
            
            // To section (validators list)
            const toSection = document.createElement('div');
            toSection.style.cssText = 'margin-bottom: 20px;';
            
            const toLabel = document.createElement('label');
            toLabel.style.cssText = 'color: #94a3b8; font-size: 0.9em; display: block; margin-bottom: 12px; font-weight: 500;';
            toLabel.textContent = 'Select new validator:';
            
            const validatorsList = document.createElement('div');
            validatorsList.style.cssText = 'max-height: 300px; overflow-y: auto; padding-right: 5px;';
            validatorsList.id = 'validatorsList';
            
            toSection.appendChild(toLabel);
            toSection.appendChild(validatorsList);
            
            // Buttons section
            const buttonsSection = document.createElement('div');
            buttonsSection.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.style.cssText = 'padding: 14px; background: rgba(100, 116, 139, 0.2); border: 2px solid rgba(100, 116, 139, 0.4); border-radius: 10px; color: #94a3b8; font-size: 1em; font-weight: 600; cursor: pointer;';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => modal.remove());
            
            const confirmBtn = document.createElement('button');
            confirmBtn.id = 'modalSwitchConfirmBtn';
            confirmBtn.style.cssText = 'padding: 14px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.3), rgba(0, 212, 255, 0.15)); border: 2px solid rgba(0, 212, 255, 0.5); border-radius: 10px; color: #00FFF0; font-size: 1em; font-weight: 600; cursor: pointer;';
            confirmBtn.textContent = '🔄 Switch Validator';
            
            buttonsSection.appendChild(cancelBtn);
            buttonsSection.appendChild(confirmBtn);
            
            // Assemble modal
            modalContent.appendChild(title);
            modalContent.appendChild(fromSection);
            modalContent.appendChild(amountSection);
            modalContent.appendChild(toSection);
            modalContent.appendChild(buttonsSection);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            modal.style.zIndex = '2147483647';
            
            // ✅ БЕЗПЕЧНО: Додаємо валідаторів через DOM API
            const qubenodeAddr = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
            let selectedToValidator = null;
            
            function createValidatorOption(addr, name, commission, isQubeNode = false) {
                const sanitizedAddr = String(addr).replace(/[<>"']/g, '');
                const sanitizedName = String(name).replace(/[<>"']/g, '');
        
                const option = document.createElement('div');
                option.className = 'validator-option';
                option.dataset.address = sanitizedAddr;
                option.style.cssText = isQubeNode
                    ? 'background: rgba(0, 212, 255, 0.12); border: 2px solid rgba(0, 212, 255, 0.4); border-radius: 12px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.3s;'
                    : 'background: rgba(100, 116, 139, 0.1); border: 2px solid rgba(100, 116, 139, 0.3); border-radius: 12px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.3s;';
        
                const topRow = document.createElement('div');
                topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;';
        
                const nameDiv = document.createElement('div');
                nameDiv.style.cssText = isQubeNode 
                    ? 'color: #00D4FF; font-weight: 600; font-size: 1em;'
                    : 'color: #94a3b8; font-weight: 600; font-size: 0.95em;';
                nameDiv.textContent = sanitizedName;
        
                const commissionDiv = document.createElement('div');
                commissionDiv.style.cssText = 'color: #64748b; font-size: 0.85em;';
                commissionDiv.textContent = `Commission: ${commission}%`;
        
                topRow.appendChild(nameDiv);
                topRow.appendChild(commissionDiv);
        
                const addressDiv = document.createElement('div');
                addressDiv.style.cssText = 'color: #64748b; font-size: 0.75em; font-family: monospace;';
                addressDiv.textContent = sanitizedAddr.substring(0, 30) + '...';
        
                option.appendChild(topRow);
                option.appendChild(addressDiv);
        
                // Selection logic
                option.addEventListener('click', function() {
                    // Remove selection from all
                    document.querySelectorAll('.validator-option').forEach(el => {
                        el.style.borderColor = el.classList.contains('qubenode-option') 
                            ? 'rgba(0, 212, 255, 0.4)'
                            : 'rgba(100, 116, 139, 0.3)';
                    });
                    // Highlight selected
                    this.style.borderColor = '#00FFF0';
                    this.style.borderWidth = '3px';
                    selectedToValidator = sanitizedAddr;
                });
        
                option.addEventListener('mouseover', function() {
                    if (selectedToValidator !== sanitizedAddr) {
                        this.style.background = isQubeNode
                            ? 'rgba(0, 212, 255, 0.18)'
                            : 'rgba(100, 116, 139, 0.15)';
                    }
                });
        
                option.addEventListener('mouseout', function() {
                    if (selectedToValidator !== sanitizedAddr) {
                        this.style.background = isQubeNode
                            ? 'rgba(0, 212, 255, 0.12)'
                            : 'rgba(100, 116, 139, 0.1)';
                    }
                });
        
                if (isQubeNode) option.classList.add('qubenode-option');
        
                return option;
            }
            
            // Add QubeNode first
            if (sanitizedFromAddress !== qubenodeAddr) {
                const qubenodeOption = createValidatorOption(qubenodeAddr, 'QubeNode 🏆', '5.00', true);
                validatorsList.appendChild(qubenodeOption);
            }
            
            // Add all other validators
            if (allValidators && allValidators.length > 0) {
                allValidators.forEach(validator => {
                    const addr = validator.operator_address;
                    if (addr !== sanitizedFromAddress && addr !== qubenodeAddr) {
                        const name = validatorNamesCache[addr] || validator.description?.moniker || addr.substring(0, 20) + '...';
                        const commission = validator.commission?.commission_rates?.rate 
                            ? (parseFloat(validator.commission.commission_rates.rate) * 100).toFixed(2) 
                            : '5.00';
                
                        const option = createValidatorOption(addr, name, commission, false);
                        validatorsList.appendChild(option);
                    }
                });
            }
            
            // Focus input
            setTimeout(() => amountInput.focus(), 100);
            
            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            // Confirm button handler
            confirmBtn.onclick = async () => {
                const amount = amountInput.value;
        
                if (!amount || isNaN(amount) || parseFloat(amount) < 0.1) {
                    alert('Minimum amount: 0.1 TICS');
                    return;
                }
        
                if (!selectedToValidator) {
                    alert('Please select a validator');
                    return;
                }
        
                modal.remove();
        
                try {
                    showDashTxStatus('processing', 'Processing redelegate transaction...');
            
                    const stakingService = cosmosStaking.stakingService;
                    if (!stakingService) {
                        throw new Error('Staking service not available');
                    }
            
                    const amountMinimal = cosmosStaking.ticsToMinimal(parseFloat(amount));
            
                    // Redelegate
                    const result = await stakingService.redelegate(
                        sanitizedFromAddress,
                        selectedToValidator,
                        amountMinimal,
                        'Switch validator via QubeNode.space'
                    );
            
                    showDashTxStatus('success', `Success! TX: ${result.transactionHash}`);
            
                    setTimeout(async () => await updateDashboardData(), 3000);
                    let refreshCount = 0;
                    const refreshInterval = setInterval(async () => {
                        refreshCount++;
                        await updateDashboardData();
                        if (refreshCount >= 6) clearInterval(refreshInterval);
                    }, 5000);
                } catch (error) {
                    showDashTxStatus('error', 'Error: ' + error.message);
                }
            };
        };

        // ===============================================
        // FIXED: window.quickUnbond
        // ===============================================
        window.quickUnbond = async function(validatorAddress) {
            // ✅ Санітизація
            const sanitizedAddress = String(validatorAddress).replace(/[<>"']/g, '');
            let validatorName = validatorNamesCache[sanitizedAddress] || sanitizedAddress.substring(0, 20) + '...';
            const sanitizedName = String(validatorName).replace(/[<>"']/g, '');
            
            const overview = cosmosStaking ? cosmosStaking.getStakingOverview() : null;
            
            if (!overview || !overview.delegations) {
                alert('No delegations');
                return;
            }
            
            // Get current delegation
            let currentAmount = '0';
            const delegation = overview.delegations.find(d => d.delegation.validator_address === sanitizedAddress);
            if (delegation) {
                currentAmount = cosmosStaking.formatTics(delegation.balance.amount);
            }
            
            // Create modal
            const modal = document.createElement('div');
            modal.id = 'customUnbondModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                z-index: 999999 !important;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.style.cssText = 'background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 2px solid rgba(239, 68, 68, 0.5); border-radius: 20px; padding: 30px; max-width: 500px; width: 90%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);';
            
            // Title
            const title = document.createElement('h3');
            title.style.cssText = 'color: #ef4444; font-size: 1.5em; margin: 0 0 20px 0; text-align: center;';
            title.textContent = '🔓 Unbond TICS';
            
            // Validator info
            const validatorSection = document.createElement('div');
            validatorSection.style.cssText = 'background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 20px;';
            
            const valNameDiv = document.createElement('div');
            valNameDiv.style.cssText = 'color: #f87171; font-weight: 600; margin-bottom: 8px; font-size: 1.1em;';
            valNameDiv.textContent = sanitizedName;
            
            const valStakedDiv = document.createElement('div');
            valStakedDiv.style.cssText = 'color: #64748b; font-size: 0.85em;';
            valStakedDiv.textContent = `Staked: ${parseFloat(currentAmount).toFixed(4)} TICS`;
            
            validatorSection.appendChild(valNameDiv);
            validatorSection.appendChild(valStakedDiv);
            
            // Amount input
            const amountSection = document.createElement('div');
            amountSection.style.cssText = 'margin-bottom: 20px;';
            
            const amountLabel = document.createElement('label');
            amountLabel.style.cssText = 'color: #94a3b8; font-size: 0.9em; display: block; margin-bottom: 8px; font-weight: 500;';
            amountLabel.textContent = 'Amount to unbond (TICS)';
            
            const amountInput = document.createElement('input');
            amountInput.type = 'number';
            amountInput.id = 'modalUnbondAmount';
            amountInput.placeholder = '0.00';
            amountInput.min = '0.1';
            amountInput.step = '0.1';
            amountInput.style.cssText = 'width: 100%; padding: 14px; background: rgba(15, 23, 42, 0.6); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 10px; color: #fff; font-size: 1.2em; font-weight: 600; text-align: center; box-sizing: border-box;';
            
            const amountInfo = document.createElement('div');
            amountInfo.style.cssText = 'color: #64748b; font-size: 0.85em; margin-top: 8px;';
            amountInfo.textContent = `Min: 0.1 TICS • Available: ${parseFloat(currentAmount).toFixed(2)} TICS`;
            
            const maxBtn = document.createElement('button');
            maxBtn.style.cssText = 'width: 100%; margin-top: 10px; padding: 10px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: #ef4444; font-weight: 600; cursor: pointer;';
            maxBtn.textContent = '⚡ Unbond Maximum';
            maxBtn.addEventListener('click', () => {
                amountInput.value = currentAmount;
            });
            
            amountSection.appendChild(amountLabel);
            amountSection.appendChild(amountInput);
            amountSection.appendChild(amountInfo);
            amountSection.appendChild(maxBtn);
            
            // Warning box
            const warningBox = document.createElement('div');
            warningBox.style.cssText = 'background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin-bottom: 20px;';
            
            const warningText = document.createElement('div');
            warningText.style.cssText = 'color: #fca5a5; font-size: 0.85em; line-height: 1.5;';
            warningText.innerHTML = '<strong>⚠️ Important:</strong><br>• Unbonding period: 21 days<br>• No rewards during unbonding<br>• Cannot cancel after confirmation';
            
            warningBox.appendChild(warningText);
            
            // Buttons
            const buttonsSection = document.createElement('div');
            buttonsSection.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.style.cssText = 'padding: 14px; background: rgba(100, 116, 139, 0.2); border: 2px solid rgba(100, 116, 139, 0.4); border-radius: 10px; color: #94a3b8; font-size: 1em; font-weight: 600; cursor: pointer;';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => modal.remove());
            
            const confirmBtn = document.createElement('button');
            confirmBtn.id = 'modalUnbondConfirmBtn';
            confirmBtn.style.cssText = 'padding: 14px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.15)); border: 2px solid rgba(239, 68, 68, 0.5); border-radius: 10px; color: #ef4444; font-size: 1em; font-weight: 600; cursor: pointer;';
            confirmBtn.textContent = '🔓 Confirm Unbond';
            
            buttonsSection.appendChild(cancelBtn);
            buttonsSection.appendChild(confirmBtn);
            
            // Assemble modal
            modalContent.appendChild(title);
            modalContent.appendChild(validatorSection);
            modalContent.appendChild(amountSection);
            modalContent.appendChild(warningBox);
            modalContent.appendChild(buttonsSection);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            modal.style.zIndex = '2147483647';
            
            // Focus input
            setTimeout(() => amountInput.focus(), 100);
            
            // Close on overlay
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            // Confirm handler
            confirmBtn.onclick = async () => {
                const amount = amountInput.value;
        
                if (!amount || isNaN(amount) || parseFloat(amount) < 0.1) {
                    alert('Minimum amount: 0.1 TICS');
                    return;
                }
        
                modal.remove();
        
                try {
                    showDashTxStatus('processing', 'Processing unbond transaction...');
            
                    const stakingService = cosmosStaking.stakingService;
                    if (!stakingService) {
                        throw new Error('Staking service not available');
                    }
            
                    const amountMinimal = cosmosStaking.ticsToMinimal(parseFloat(amount));
            
                    // Unbond
                    const result = await stakingService.undelegate(
                        sanitizedAddress,
                        amountMinimal,
                        'Unbond via QubeNode.space'
                    );
            
                    showDashTxStatus('success', `Success! TX: ${result.transactionHash}`);
            
                    setTimeout(async () => await updateDashboardData(), 3000);
                    let refreshCount = 0;
                    const refreshInterval = setInterval(async () => {
                        refreshCount++;
                        await updateDashboardData();
                        if (refreshCount >= 6) clearInterval(refreshInterval);
                    }, 5000);
                } catch (error) {
                    showDashTxStatus('error', 'Error: ' + error.message);
                }
            };
        };

        
        window.quickStakeQubeNode = async function() {
            const qubenodeAddress = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
            quickStakeMore(qubenodeAddress);
        }
        
        window.quickClaimAllRewards = async function() {
            if (!cosmosStaking || !cosmosStaking.isWalletConnected()) {
                alert('Please connect your wallet first');
                return;
            }
            
            const overview = cosmosStaking.getStakingOverview();
            if (!overview || !overview.delegations || overview.delegations.length === 0) {
                alert('No active delegations');
                return;
            }
            
            const totalRewards = overview.totalRewards ? (parseFloat(overview.totalRewards) / 1e18).toFixed(4) : '0.0000';
            
            // Create modal
            const modal = document.createElement('div');
            modal.id = 'customClaimModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                z-index: 999999 !important;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Build validator rewards list
            let validatorsList = '';
            if (overview.rewards && overview.rewards.rewards) {
                overview.rewards.rewards.forEach(rewardEntry => {
                    const addr = rewardEntry.validator_address;
                    const name = validatorNamesCache[addr] || addr.substring(0, 20) + '...';
                    
                    let rewards = '0.0000';
                    if (rewardEntry.reward && rewardEntry.reward.length > 0) {
                        const ticsReward = rewardEntry.reward.find(r => r.denom === 'tics');
                        if (ticsReward) {
                            rewards = (parseFloat(ticsReward.amount) / 1e18).toFixed(4);
                        }
                    }
                    
                    if (parseFloat(rewards) > 0) {
                        validatorsList += `
                            <div style="display: flex; justify-content: space-between; padding: 12px; background: rgba(250, 204, 21, 0.05); border-radius: 8px; margin-bottom: 8px;">
                                <span style="color: #94a3b8; font-size: 0.9em;">${name}</span>
                                <span style="color: #facc15; font-weight: 600; font-size: 0.9em;">${rewards} TICS</span>
                            </div>
                        `;
                    }
                });
            }
            
            modal.innerHTML = `
                <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 2px solid rgba(250, 204, 21, 0.4); border-radius: 20px; padding: 30px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);">
                    <h3 style="color: #facc15; font-size: 1.5em; margin: 0 0 20px 0; text-align: center;">💰 Claim Rewards</h3>
                    
                    <div style="background: rgba(250, 204, 21, 0.15); border: 2px solid rgba(250, 204, 21, 0.4); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
                        <div style="color: #fde047; font-size: 0.9em; margin-bottom: 8px;">Total Rewards:</div>
                        <div style="color: #facc15; font-size: 2em; font-weight: 700;">${totalRewards} TICS</div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="color: #94a3b8; font-size: 0.9em; margin-bottom: 12px; font-weight: 600;">Rewards from validators:</div>
                        <div style="max-height: 250px; overflow-y: auto;">
                            ${validatorsList}
                        </div>
                    </div>
                    
                    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 10px; padding: 12px; margin-bottom: 20px;">
                        <div style="color: #86efac; font-size: 0.85em;">
                            ✅ All rewards will be claimed in one transaction
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button onclick="document.getElementById('customClaimModal').remove()" style="flex: 1; padding: 14px; background: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.4); border-radius: 12px; color: #94a3b8; font-size: 1em; font-weight: 600; cursor: pointer;">
                            Cancel
                        </button>
                        <button id="modalClaimBtn" style="flex: 1; padding: 14px; background: linear-gradient(135deg, #facc15, #eab308); border: none; border-radius: 12px; color: #000; font-size: 1em; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(250, 204, 21, 0.3);">
                            Claim
                        </button>
                    </div>
                </div>
            `;
            
            // Ensure modal is LAST element in body (after everything else)
            document.body.appendChild(modal);
            // Force modal to be on top by setting style after append
            modal.style.zIndex = '2147483647'; // Max z-index value
            
            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            // Handle Claim button
            document.getElementById('modalClaimBtn').onclick = async () => {
                modal.remove();
                
                try {
                    showDashTxStatus('processing', 'Processing transaction...');
                    const result = await cosmosStaking.claimRewards('Claim all rewards');
                    showDashTxStatus('success', `All rewards claimed! TX: ${result.txHash}`);
                    
                    setTimeout(async () => await updateDashboardData(), 3000);
                    let refreshCount = 0;
                    const refreshInterval = setInterval(async () => {
                        refreshCount++;
                        await updateDashboardData();
                        if (refreshCount >= 6) clearInterval(refreshInterval);
                    }, 5000);
                } catch (error) {
                    showDashTxStatus('error', 'Error: ' + error.message);
                }
            };
        }

        async function updateDashboardData() {
            try {
                const overview = await cosmosStaking.refresh();
                
                const balance = cosmosStaking.formatTics(overview.balance);
                const delegated = cosmosStaking.formatTics(overview.totalDelegated);
                const rewards = cosmosStaking.formatTics(overview.totalRewards);
                
                // Calculate unbonding - FIXED to use unbondingDelegations
                let unbonding = '0';
                // console.log('Unbonding data:', overview.unbondingDelegations); // Debug
                
                if (overview.unbondingDelegations && Array.isArray(overview.unbondingDelegations) && overview.unbondingDelegations.length > 0) {
                    let totalUnbonding = BigInt(0);
                    overview.unbondingDelegations.forEach(unbondingItem => {
                        if (unbondingItem.entries && Array.isArray(unbondingItem.entries)) {
                            unbondingItem.entries.forEach(entry => {
                                if (entry.balance) {
                                    totalUnbonding += BigInt(entry.balance);
                                }
                            });
                        }
                    });
                    
                    if (totalUnbonding > BigInt(0)) {
                        unbonding = cosmosStaking.formatTics(totalUnbonding.toString());
                    }
                }

                // Update dashboard displays with 2 decimal places
                document.getElementById('dashBalance').textContent = parseFloat(balance).toFixed(2);
                document.getElementById('dashDelegated').textContent = parseFloat(delegated).toFixed(2);
                document.getElementById('dashRewards').textContent = parseFloat(rewards).toFixed(2);
                document.getElementById('dashUnbonding').textContent = parseFloat(unbonding).toFixed(2);
                document.getElementById('dashClaimableRewards').textContent = parseFloat(rewards).toFixed(2);
                
                // Update delegations list if exists
                if (document.getElementById('dashDelegationsList')) {
                    updateDelegationsList(overview);
                }
                
                // Update rewards forecast if exists
                if (document.getElementById('dashRewardsForecast')) {
                    updateRewardsForecast(overview);
                }
                
                // Update unbonding list if exists
                if (document.getElementById('unbondingList')) {
                    updateUnbondingList(overview);
                }
            } catch (error) {
                // console.error('Error updating dashboard data:', error);
            }
        }

        // Update Unbonding List
        function updateUnbondingList(overview) {
            const section = document.getElementById('unbondingSection');
            const container = document.getElementById('unbondingList');
            
            if (!overview.unbondingDelegations || overview.unbondingDelegations.length === 0) {
                section.style.display = 'none';
                return;
            }
            
            // Check if there are any actual entries
            let hasEntries = false;
            overview.unbondingDelegations.forEach(unbonding => {
                if (unbonding.entries && unbonding.entries.length > 0) {
                    hasEntries = true;
                }
            });
            
            if (!hasEntries) {
                section.style.display = 'none';
                return;
            }
            
            section.style.display = 'block';
            
            // ✅ БЕЗПЕЧНО: Створюємо контейнер без innerHTML
            const mainContainer = document.createElement('div');
            mainContainer.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
            
            overview.unbondingDelegations.forEach(unbonding => {
                const valAddress = unbonding.validator_address;
                const validatorName = validatorNamesCache[valAddress] || valAddress.substring(0, 20) + '...';
                
                if (unbonding.entries && unbonding.entries.length > 0) {
                    unbonding.entries.forEach(entry => {
                        const amount = cosmosStaking.formatTics(entry.balance);
                        const completionTime = new Date(entry.completion_time);
                        const now = new Date();
                        const timeRemaining = Math.max(0, completionTime - now);
                        const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                        const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        
                        // Головна картка
                        const card = document.createElement('div');
                        card.style.cssText = 'background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 15px;';
                        
                        // Верхня секція
                        const topSection = document.createElement('div');
                        topSection.style.cssText = 'display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;';
                        
                        // Ліва частина
                        const leftInfo = document.createElement('div');
                        leftInfo.style.cssText = 'flex: 1;';
                        
                        const amountDiv = document.createElement('div');
                        amountDiv.style.cssText = 'color: #ef4444; font-weight: 700; font-size: 1.1em; margin-bottom: 5px;';
                        amountDiv.textContent = `${parseFloat(amount).toFixed(4)} TICS`;
                        
                        const validatorDiv = document.createElement('div');
                        validatorDiv.style.cssText = 'color: #fff; font-weight: 600; font-size: 0.9em; margin-bottom: 3px;';
                        validatorDiv.textContent = `From: ${validatorName}`;
                        
                        const addressDiv = document.createElement('div');
                        addressDiv.style.cssText = 'color: #64748b; font-size: 0.75em;';
                        addressDiv.textContent = valAddress;
                        
                        leftInfo.appendChild(amountDiv);
                        leftInfo.appendChild(validatorDiv);
                        leftInfo.appendChild(addressDiv);
                        
                        // Права частина
                        const rightInfo = document.createElement('div');
                        rightInfo.style.cssText = 'text-align: right;';
                        
                        const completionLabel = document.createElement('div');
                        completionLabel.style.cssText = 'color: #94a3b8; font-size: 0.75em; margin-bottom: 3px;';
                        completionLabel.textContent = 'Completion';
                        
                        const completionDate = document.createElement('div');
                        completionDate.style.cssText = 'color: #fff; font-size: 0.85em; font-weight: 600;';
                        completionDate.textContent = completionTime.toLocaleString('uk-UA', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                        
                        rightInfo.appendChild(completionLabel);
                        rightInfo.appendChild(completionDate);
                        
                        topSection.appendChild(leftInfo);
                        topSection.appendChild(rightInfo);
                        
                        // Час що залишився
                        const timeBox = document.createElement('div');
                        timeBox.style.cssText = 'background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 10px; margin-bottom: 10px;';
                        
                        const timeLabel = document.createElement('div');
                        timeLabel.style.cssText = 'color: #94a3b8; font-size: 0.75em; margin-bottom: 3px;';
                        timeLabel.textContent = 'Time Remaining';
                        
                        const timeValue = document.createElement('div');
                        timeValue.style.cssText = 'color: #FFA500; font-size: 1em; font-weight: 700;';
                        timeValue.textContent = `${daysRemaining}d ${hoursRemaining}h`;
                        
                        timeBox.appendChild(timeLabel);
                        timeBox.appendChild(timeValue);
                        
                        // Кнопка Cancel
                        const cancelBtn = document.createElement('button');
                        cancelBtn.style.cssText = 'width: 100%; padding: 10px; background: rgba(239, 68, 68, 0.2); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 8px; color: #ef4444; font-size: 0.9em; font-weight: 600; cursor: pointer; transition: all 0.3s;';
                        cancelBtn.textContent = 'Cancel Unbonding';
                        cancelBtn.addEventListener('click', () => executeCancelUnbonding(valAddress, amount, entry.creation_height));
                        
                        // Збираємо картку
                        card.appendChild(topSection);
                        card.appendChild(timeBox);
                        card.appendChild(cancelBtn);
                        
                        mainContainer.appendChild(card);
                    });
                }
            });
            
            // Очищаємо контейнер та додаємо новий контент
            container.textContent = '';
            container.appendChild(mainContainer);
        }

        async function executeCancelUnbonding(validatorAddress, amount, creationHeight) {
            try {
                if (!confirm(`Cancel unbonding ${amount} TICS?\n\nТокени будуть знову делеговані на валідатора.`)) {
                    return;
                }
                
                showDashTxStatus('processing', 'Processing transaction...');
                
                const result = await cosmosStaking.cancelUnbonding(validatorAddress, amount, creationHeight, 'Cancel unbonding via QubeNode.space');
                
                showDashTxStatus('success', `Успішно скасовано! TX: ${result.txHash}`);
                
                setTimeout(async () => {
                    await updateDashboardData();
                }, 2000);
                
            } catch (error) {
                showDashTxStatus('error', 'Помилка: ' + error.message);
            }
        }

        function showDashTab(tab) {
            document.querySelectorAll('.dash-tab').forEach(btn => {
                btn.style.background = 'transparent';
                btn.style.color = '#94a3b8';
            });
            document.querySelectorAll('.dash-tab-content').forEach(content => {
                content.style.display = 'none';
            });

            document.getElementById('dashTab' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.background = 'rgba(0, 212, 255, 0.2)';
            document.getElementById('dashTab' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.color = '#00FFF0';
            document.getElementById('dash' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Tab').style.display = 'block';
        }

        async function executeDashDelegate() {
            const amount = parseFloat(document.getElementById('dashDelegateAmount').value);
            
            if (!amount || amount < 0.1) {
                alert('Minimum delegation amount: 0.1 TICS');
                return;
            }

            try {
                showDashTxStatus('processing', 'Processing transaction...');
                
                const result = await cosmosStaking.delegate(amount, 'Delegation via QubeNode.space');
                
                showDashTxStatus('success', `Успішно! TX: ${result.txHash}`);
                
                // Clear input field immediately
                document.getElementById('dashDelegateAmount').value = '';
                
                // Refresh every 5 seconds for 30 seconds (6 times)
                let refreshCount = 0;
                const maxRefreshes = 6;
                const refreshInterval = setInterval(async () => {
                    refreshCount++;
                    // console.log(`🔄 Auto-refresh #${refreshCount} after delegate...`);
                    await updateDashboardData();
                    
                    if (refreshCount >= maxRefreshes) {
                        clearInterval(refreshInterval);
                        // console.log('✅ Auto-refresh completed');
                    }
                }, 5000);
                
                // First immediate refresh after 3 seconds
                setTimeout(async () => {
                    // console.log('🔄 Initial refresh after delegate...');
                    await updateDashboardData();
                }, 3000);
                
            } catch (error) {
                showDashTxStatus('error', 'Помилка: ' + error.message);
            }
        }

        async function executeDashUndelegate() {
            const amount = parseFloat(document.getElementById('dashUndelegateAmount').value);
            
            if (!amount || amount < 0.1) {
                alert('Minimum amount: 0.1 TICS');
                return;
            }

            if (!confirm(`Undelegate ${amount} TICS? Період очікування: 14 днів`)) {
                return;
            }

            try {
                showDashTxStatus('processing', 'Processing transaction...');
                
                const result = await cosmosStaking.undelegate(amount, 'Undelegation via QubeNode.space');
                
                showDashTxStatus('success', `Успішно! TX: ${result.txHash}. Очікуйте 14 днів.`);
                
                // Clear input field immediately
                document.getElementById('dashUndelegateAmount').value = '';
                
                // Refresh every 5 seconds for 30 seconds (6 times)
                let refreshCount = 0;
                const maxRefreshes = 6;
                const refreshInterval = setInterval(async () => {
                    refreshCount++;
                    // console.log(`🔄 Auto-refresh #${refreshCount} after undelegate...`);
                    await updateDashboardData();
                    
                    if (refreshCount >= maxRefreshes) {
                        clearInterval(refreshInterval);
                        // console.log('✅ Auto-refresh completed');
                    }
                }, 5000);
                
                // First immediate refresh after 3 seconds
                setTimeout(async () => {
                    // console.log('🔄 Initial refresh after undelegate...');
                    await updateDashboardData();
                }, 3000);
                
            } catch (error) {
                showDashTxStatus('error', 'Помилка: ' + error.message);
            }
        }

        async function executeDashClaim() {
            try {
                showDashTxStatus('processing', 'Processing transaction...');
                
                const result = await cosmosStaking.claimRewards('Rewards claim via QubeNode.space');
                
                showDashTxStatus('success', `Винагороду отримано! TX: ${result.txHash}`);
                
                // Refresh every 5 seconds for 30 seconds (6 times)
                let refreshCount = 0;
                const maxRefreshes = 6;
                const refreshInterval = setInterval(async () => {
                    refreshCount++;
                    // console.log(`🔄 Auto-refresh #${refreshCount} after claim rewards...`);
                    await updateDashboardData();
                    
                    if (refreshCount >= maxRefreshes) {
                        clearInterval(refreshInterval);
                        // console.log('✅ Auto-refresh completed');
                    }
                }, 5000);
                
                // First immediate refresh after 3 seconds
                setTimeout(async () => {
                    // console.log('🔄 Initial refresh after claim rewards...');
                    await updateDashboardData();
                }, 3000);
                
            } catch (error) {
                showDashTxStatus('error', 'Помилка: ' + error.message);
            }
        }

        function showDashTxStatus(type, message) {
            const statusDiv = document.getElementById('dashTxStatus');
            statusDiv.style.display = 'block';
            
            let bgColor, borderColor, textColor;
            
            if (type === 'processing') {
                bgColor = 'rgba(59, 130, 246, 0.1)';
                borderColor = 'rgba(59, 130, 246, 0.4)';
                textColor = '#3b82f6';
            } else if (type === 'success') {
                bgColor = 'rgba(34, 197, 94, 0.1)';
                borderColor = 'rgba(34, 197, 94, 0.4)';
                textColor = '#22c55e';
            } else {
                bgColor = 'rgba(239, 68, 68, 0.1)';
                borderColor = 'rgba(239, 68, 68, 0.4)';
                textColor = '#ef4444';
            }
            
            statusDiv.style.background = bgColor;
            statusDiv.style.border = '2px solid ' + borderColor;
            statusDiv.style.color = textColor;
            statusDiv.innerHTML = message;
            
            if (type !== 'processing') {
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 5000);
            }
        }

        function disconnectDashboard() {
            if (confirm('Disconnect Wallet?')) {
                if (cosmosStaking) {
                    cosmosStaking.disconnect();
                }
                
                // Hide dashboard
                const dashboard = document.getElementById('delegatorDashboard');
                if (dashboard) {
                    dashboard.style.display = 'none';
                }
                
                // Show wallet selection
                const stakingInterface = document.getElementById('stakingInterface');
                if (stakingInterface) {
                    stakingInterface.style.display = 'block';
                }
                
                // Make sure wallet section is visible
                const walletSection = document.getElementById('walletSection');
                if (walletSection) {
                    walletSection.style.display = 'block';
                }
                
                // HIDE old wallet status and actions
                const walletStatus = document.getElementById('walletStatus');
                const stakingActions = document.getElementById('stakingActions');
                if (walletStatus) walletStatus.style.display = 'none';
                if (stakingActions) stakingActions.style.display = 'none';
                
                // Reset wallet buttons
                const keplrBtn = document.getElementById('connectKeplrBtn');
                const cosmostationBtn = document.getElementById('connectCosmostationBtn');
                if (keplrBtn) {
                    keplrBtn.disabled = false;
                    keplrBtn.innerHTML = '<span class="wallet-icon-emoji-large">🔷</span><span>Keplr Wallet</span>';
                }
                if (cosmostationBtn) {
                    cosmostationBtn.disabled = false;
                    cosmostationBtn.innerHTML = '<span class="wallet-icon-emoji-large">🔶</span><span>Cosmostation</span>';
                }
                
                // Reset header
                headerWalletConnected = false;
                resetHeaderWalletButton();
            }
        }

        // Update Delegations List
        async function updateDelegationsList(overview) {
            const container = document.getElementById('dashDelegationsList');
            
            if (!overview.delegations || overview.delegations.length === 0) {
                container.innerHTML = `
                    <div style="padding: 30px; text-align: center; background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 12px;">
                        <div style="font-size: 3em; margin-bottom: 10px;">🎯</div>
                        <div style="color: #00FFF0; font-size: 1.2em; font-weight: 600; margin-bottom: 8px;">Start Staking!</div>
                        <p style="color: #94a3b8; font-size: 0.9em; margin-bottom: 0;">Delegate $TICS to QubeNode validator and earn 28.5% APY</p>
                    </div>
                `;
                return;
            }
            
            // ✅ БЕЗПЕЧНО: Створюємо контейнер без innerHTML
            const mainContainer = document.createElement('div');
            mainContainer.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
            
            overview.delegations.forEach(del => {
                const amount = cosmosStaking.formatTics(del.balance.amount);
                const valAddress = del.delegation.validator_address;
                
                // Get validator name from allValidators or cache
                let validatorName = validatorNamesCache[valAddress];
                if (!validatorName && allValidators) {
                    const validator = allValidators.find(v => v.operator_address === valAddress);
                    if (validator && validator.description) {
                        validatorName = validator.description.moniker || 'Unknown Validator';
                    }
                }
                if (!validatorName) {
                    validatorName = 'Validator ' + valAddress.substring(14, 20);
                }
                
                // Get rewards for this specific validator
                let validatorRewards = '0.00';
                if (overview.rewards && overview.rewards.rewards) {
                    const rewardEntry = overview.rewards.rewards.find(r => r.validator_address === valAddress);
                    if (rewardEntry && rewardEntry.reward && rewardEntry.reward.length > 0) {
                        const ticsReward = rewardEntry.reward.find(r => r.denom === 'tics');
                        if (ticsReward) {
                            validatorRewards = (parseFloat(ticsReward.amount) / 1e18).toFixed(4);
                        }
                    }
                }
                
                // Short address format
                const shortAddress = valAddress.substring(0, 16) + '...' + valAddress.substring(valAddress.length - 6);
                
                // Check if QubeNode
                const isQubeNode = valAddress === 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
                
                // Styles
                const cardBg = isQubeNode 
                    ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(168, 85, 247, 0.05))'
                    : 'linear-gradient(135deg, rgba(100, 116, 139, 0.08), rgba(71, 85, 105, 0.05))';
                const cardBorder = isQubeNode 
                    ? 'rgba(0, 212, 255, 0.4)'
                    : 'rgba(100, 116, 139, 0.3)';
                
                // Головна картка
                const card = document.createElement('div');
                card.style.cssText = `background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 14px; padding: 18px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);`;
                
                // Header row
                const header = document.createElement('div');
                header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;';
                
                // Left section - validator name
                const leftSection = document.createElement('div');
                leftSection.style.cssText = 'flex: 1;';
                
                const nameDiv = document.createElement('div');
                nameDiv.style.cssText = 'color: #00D4FF; font-weight: 700; font-size: 1.15em; margin-bottom: 5px;';
                nameDiv.textContent = validatorName;
                
                // Badge для QubeNode
                if (isQubeNode) {
                    const badge = document.createElement('span');
                    badge.style.cssText = 'background: linear-gradient(135deg, #00D4FF, #a855f7); padding: 2px 8px; border-radius: 6px; font-size: 0.65em; color: #000; font-weight: 700; margin-left: 6px;';
                    badge.textContent = '🏆';
                    nameDiv.appendChild(badge);
                }
                
                const addressDiv = document.createElement('div');
                addressDiv.style.cssText = 'color: #64748b; font-size: 0.8em; font-family: monospace;';
                addressDiv.textContent = shortAddress;
                
                leftSection.appendChild(nameDiv);
                leftSection.appendChild(addressDiv);
                
                // Right section - amount
                const rightSection = document.createElement('div');
                rightSection.style.cssText = 'text-align: right;';
                
                const amountDiv = document.createElement('div');
                amountDiv.style.cssText = 'color: #00D4FF; font-size: 1.4em; font-weight: 700; line-height: 1;';
                amountDiv.textContent = parseFloat(amount).toFixed(4);
                
                const amountLabel = document.createElement('div');
                amountLabel.style.cssText = 'color: #7dd3fc; font-size: 0.75em; margin-top: 3px; font-weight: 600;';
                amountLabel.textContent = 'TICS Staked';
                
                rightSection.appendChild(amountDiv);
                rightSection.appendChild(amountLabel);
                
                header.appendChild(leftSection);
                header.appendChild(rightSection);
                
                // Rewards row
                const rewardsBox = document.createElement('div');
                rewardsBox.style.cssText = 'background: linear-gradient(90deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.06)); border-left: 3px solid #22c55e; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;';
                
                const rewardsLabel = document.createElement('div');
                rewardsLabel.style.cssText = 'color: #4ade80; font-size: 0.9em; font-weight: 600;';
                rewardsLabel.textContent = '💰 Pending Rewards';
                
                const rewardsValue = document.createElement('div');
                rewardsValue.style.cssText = 'color: #86efac; font-size: 1.05em; font-weight: 700;';
                rewardsValue.textContent = `${validatorRewards} TICS`;
                
                rewardsBox.appendChild(rewardsLabel);
                rewardsBox.appendChild(rewardsValue);
                
                // Buttons container
                const buttonsContainer = document.createElement('div');
                buttonsContainer.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;';
                
                // Stake More button
                const stakeMoreBtn = document.createElement('button');
                stakeMoreBtn.className = 'btn-stake-more';
                stakeMoreBtn.dataset.validator = valAddress;
                stakeMoreBtn.style.cssText = 'padding: 11px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.18), rgba(0, 212, 255, 0.08)); border: 1px solid rgba(0, 212, 255, 0.5); border-radius: 9px; color: #00FFF0; font-size: 0.88em; font-weight: 600; cursor: pointer; transition: all 0.2s;';
                stakeMoreBtn.textContent = '💎 Stake More';
                stakeMoreBtn.addEventListener('click', () => window.quickStakeMore(valAddress));
                
                // Switch Validator button
                const switchBtn = document.createElement('button');
                switchBtn.className = 'btn-switch-validator';
                switchBtn.dataset.validator = valAddress;
                switchBtn.style.cssText = 'padding: 11px; background: linear-gradient(135deg, rgba(132, 204, 22, 0.18), rgba(132, 204, 22, 0.08)); border: 1px solid rgba(132, 204, 22, 0.5); border-radius: 9px; color: #a3e635; font-size: 0.88em; font-weight: 600; cursor: pointer; transition: all 0.2s;';
                switchBtn.textContent = '🔄 Switch Validator';
                switchBtn.addEventListener('click', () => window.quickSwitchValidator(valAddress));
                
                // Unbond button
                const unbondBtn = document.createElement('button');
                unbondBtn.className = 'btn-unbond';
                unbondBtn.dataset.validator = valAddress;
                unbondBtn.style.cssText = 'padding: 11px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(239, 68, 68, 0.08)); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 9px; color: #f87171; font-size: 0.88em; font-weight: 600; cursor: pointer; transition: all 0.2s;';
                unbondBtn.textContent = '🔓 Unbond';
                unbondBtn.addEventListener('click', () => window.quickUnbond(valAddress));
                
                buttonsContainer.appendChild(stakeMoreBtn);
                buttonsContainer.appendChild(switchBtn);
                buttonsContainer.appendChild(unbondBtn);
                
                // Збираємо картку
                card.appendChild(header);
                card.appendChild(rewardsBox);
                card.appendChild(buttonsContainer);
                
                mainContainer.appendChild(card);
            });
            
            // Очищаємо контейнер та додаємо новий контент
            container.textContent = '';
            container.appendChild(mainContainer);
            
            document.querySelectorAll('.btn-switch-validator').forEach(btn => {
                btn.addEventListener('click', function() {
                    const validator = this.getAttribute('data-validator');
                    // console.log('🔄 Switch validator clicked for:', validator);
                    window.quickSwitchValidator(validator);
                });
            });
            
            document.querySelectorAll('.btn-unbond').forEach(btn => {
                btn.addEventListener('click', function() {
                    const validator = this.getAttribute('data-validator');
                    // console.log('🔓 Unbond clicked for:', validator);
                    window.quickUnbond(validator);
                });
            });
            
            // Update redelegate dropdowns
            updateRedelegateDropdowns(overview);
        }

                // Update Rewards Forecast
        async function updateRewardsForecast(overview) {
            try {
                const delegated = cosmosStaking.formatTics(overview.totalDelegated);
                const amount = parseFloat(delegated);
                
                if (amount === 0) {
                    document.getElementById('forecastDaily').textContent = '0.00';
                    document.getElementById('forecastWeekly').textContent = '0.00';
                    document.getElementById('forecastMonthly').textContent = '0.00';
                    document.getElementById('forecastYearly').textContent = '0.00';
                    return;
                }
                
                // APY 30%, but with 5% commission = 28.5% for user
                const APY = 0.285;
                
                const dailyReward = (amount * APY) / 365;
                const weeklyReward = (amount * APY) / 52;
                const monthlyReward = (amount * APY) / 12;
                const yearlyReward = amount * APY;
                
                document.getElementById('forecastDaily').textContent = dailyReward.toFixed(2);
                document.getElementById('forecastWeekly').textContent = weeklyReward.toFixed(2);
                document.getElementById('forecastMonthly').textContent = monthlyReward.toFixed(2);
                document.getElementById('forecastYearly').textContent = yearlyReward.toFixed(2);
            } catch (error) {
                // console.error('Error updating rewards forecast:', error);
            }
        }

        // Update Redelegate Dropdowns
        async function updateRedelegateDropdowns(overview) {
            // Store user's delegations for FROM selector
            if (overview.delegations && overview.delegations.length > 0) {
                overview.delegations.forEach(del => {
                    const valAddress = del.delegation.validator_address;
                    if (valAddress === 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld') {
                        validatorNamesCache[valAddress] = 'QubeNode 🏆';
                    }
                });
            }
            
            // Fetch ALL active validators for TO selector
            try {
                allValidators = await cosmosStaking.chainClient.getAllValidators();
                
                if (allValidators && allValidators.length > 0) {
                    // Cache all validator names
                    allValidators.forEach(validator => {
                        const valAddress = validator.operator_address;
                        let valName = validator.description?.moniker || valAddress.substring(0, 15) + '...';
                        
                        if (valAddress === 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld') {
                            valName = 'QubeNode 🏆';
                        }
                        
                        validatorNamesCache[valAddress] = valName;
                    });
                    
                    // console.log(`✅ Loaded ${allValidators.length} validators`);
                }
            } catch (error) {
                // console.error('Error loading validators:', error);
            }
        }

        function openValidatorModal(mode) {
            validatorModalMode = mode;
            const modal = document.getElementById('validatorSelectorModal');
            const title = document.getElementById('validatorModalTitle');
            const container = document.getElementById('validatorListContainer');
            
            if (mode === 'from') {
                title.textContent = 'From which validator';
                // Show only user's delegations
                const overview = cosmosStaking.getStakingOverview();
                if (!overview || !overview.delegations || overview.delegations.length === 0) {
                    container.innerHTML = '<div class="empty-state-message">No delegations</div>';
                } else {
                    // ✅ БЕЗПЕЧНО: Створюємо елементи без innerHTML
                    container.textContent = '';
                    overview.delegations.forEach(del => {
                        const valAddress = del.delegation.validator_address;
                        const valName = validatorNamesCache[valAddress] || valAddress.substring(0, 20) + '...';
                        const amount = cosmosStaking.formatTics(del.balance.amount);
                        const shortAddress = valAddress.substring(0, 20) + '...' + valAddress.substring(valAddress.length - 6);
                        
                        const validatorCard = document.createElement('div');
                        validatorCard.style.cssText = 'background: rgba(0, 212, 255, 0.05); border: 2px solid rgba(0, 212, 255, 0.2); border-radius: 10px; padding: 15px; cursor: pointer; transition: all 0.3s; display: flex; justify-content: space-between; align-items: center;';
                        validatorCard.addEventListener('mouseover', function() {
                            this.style.background = 'rgba(0, 212, 255, 0.15)';
                        });
                        validatorCard.addEventListener('mouseout', function() {
                            this.style.background = 'rgba(0, 212, 255, 0.05)';
                        });
                        validatorCard.addEventListener('click', () => selectValidator(valAddress, valName, 'from'));
                        
                        const leftSection = document.createElement('div');
                        leftSection.style.cssText = 'flex: 1;';
                        
                        const nameDiv = document.createElement('div');
                        nameDiv.style.cssText = 'color: #00FFF0; font-weight: 700; font-size: 1.05em; margin-bottom: 5px;';
                        nameDiv.textContent = valName;
                        
                        const addressDiv = document.createElement('div');
                        addressDiv.style.cssText = 'color: #64748b; font-size: 0.8em;';
                        addressDiv.textContent = shortAddress;
                        
                        leftSection.appendChild(nameDiv);
                        leftSection.appendChild(addressDiv);
                        
                        const rightSection = document.createElement('div');
                        rightSection.style.cssText = 'text-align: right;';
                        
                        const amountDiv = document.createElement('div');
                        amountDiv.style.cssText = 'color: #00D4FF; font-weight: 700; font-size: 1.1em;';
                        amountDiv.textContent = parseFloat(amount).toFixed(2);
                        
                        const labelDiv = document.createElement('div');
                        labelDiv.style.cssText = 'color: #86efac; font-size: 0.8em;';
                        labelDiv.textContent = 'TICS';
                        
                        rightSection.appendChild(amountDiv);
                        rightSection.appendChild(labelDiv);
                        
                        validatorCard.appendChild(leftSection);
                        validatorCard.appendChild(rightSection);
                        
                        container.appendChild(validatorCard);
                    });
                }
            } else {
                title.textContent = 'To whom to delegate';
                // Show all validators
                if (!allValidators || allValidators.length === 0) {
                    container.innerHTML = '<div class="empty-state-message">Loading validators...</div>';
                } else {
                    // ✅ БЕЗПЕЧНО: Створюємо елементи без innerHTML
                    container.textContent = '';
                    allValidators.forEach(validator => {
                        const valAddress = validator.operator_address;
                        const valName = validatorNamesCache[valAddress] || valAddress.substring(0, 20) + '...';
                        const shortAddress = valAddress.substring(0, 20) + '...' + valAddress.substring(valAddress.length - 6);
                        const commission = validator.commission?.commission_rates?.rate 
                            ? (parseFloat(validator.commission.commission_rates.rate) * 100).toFixed(2) 
                            : '0.00';
                        
                        const validatorCard = document.createElement('div');
                        validatorCard.style.cssText = 'background: rgba(0, 212, 255, 0.05); border: 2px solid rgba(0, 212, 255, 0.2); border-radius: 10px; padding: 15px; cursor: pointer; transition: all 0.3s; display: flex; justify-content: space-between; align-items: center;';
                        validatorCard.addEventListener('mouseover', function() {
                            this.style.background = 'rgba(0, 212, 255, 0.15)';
                        });
                        validatorCard.addEventListener('mouseout', function() {
                            this.style.background = 'rgba(0, 212, 255, 0.05)';
                        });
                        validatorCard.addEventListener('click', () => selectValidator(valAddress, valName, 'to'));
                        
                        const leftSection = document.createElement('div');
                        leftSection.style.cssText = 'flex: 1;';
                        
                        const nameDiv = document.createElement('div');
                        nameDiv.style.cssText = 'color: #00FFF0; font-weight: 700; font-size: 1.05em; margin-bottom: 5px;';
                        nameDiv.textContent = valName;
                        
                        const addressDiv = document.createElement('div');
                        addressDiv.style.cssText = 'color: #64748b; font-size: 0.8em;';
                        addressDiv.textContent = shortAddress;
                        
                        leftSection.appendChild(nameDiv);
                        leftSection.appendChild(addressDiv);
                        
                        const rightSection = document.createElement('div');
                        rightSection.style.cssText = 'text-align: right;';
                        
                        const commissionLabel = document.createElement('div');
                        commissionLabel.style.cssText = 'color: #94a3b8; font-weight: 600; font-size: 0.8em; margin-bottom: 2px;';
                        commissionLabel.textContent = 'Commission';
                        
                        const commissionValue = document.createElement('div');
                        commissionValue.style.cssText = 'color: #22c55e; font-weight: 700; font-size: 1.1em;';
                        commissionValue.textContent = `${commission}%`;
                        
                        rightSection.appendChild(commissionLabel);
                        rightSection.appendChild(commissionValue);
                        
                        validatorCard.appendChild(leftSection);
                        validatorCard.appendChild(rightSection);
                        
                        container.appendChild(validatorCard);
                    });
                }
            }
            
            openModal('validatorSelectorModal');
        }

        function selectValidator(address, name, mode) {
            if (mode === 'from') {
                document.getElementById('dashRedelegateFrom').value = address;
                document.getElementById('fromValidatorText').textContent = name;
            } else {
                document.getElementById('dashRedelegateTo').value = address;
                document.getElementById('toValidatorText').textContent = name;
            }
            closeModal('validatorSelectorModal');
        }

        // Execute Redelegate
        async function executeDashRedelegate() {
            const fromValidator = document.getElementById('dashRedelegateFrom').value;
            const toValidator = document.getElementById('dashRedelegateTo').value;
            const amount = parseFloat(document.getElementById('dashRedelegateAmount').value);
            
            if (!fromValidator) {
                alert('Select validator from which to redelegate');
                return;
            }
            
            if (!toValidator) {
                alert('Select validator to whom to redelegate');
                return;
            }
            
            if (fromValidator === toValidator) {
                alert('Cannot redelegate to the same validator');
                return;
            }
            
            if (!amount || amount < 0.1) {
                alert('Minimum amount: 0.1 TICS');
                return;
            }
            
            if (!confirm(`Redelegate ${amount} TICS?`)) {
                return;
            }

            try {
                showDashTxStatus('processing', 'Processing transaction...');
                
                const result = await cosmosStaking.redelegate(fromValidator, toValidator, amount, 'Redelegation via QubeNode.space');
                
                showDashTxStatus('success', `Успішно! TX: ${result.txHash}`);
                
                // Aggressive refresh for redelegate - API is slow to update
                // Clear input field immediately
                document.getElementById('dashRedelegateAmount').value = '';
                
                // Refresh every 5 seconds for 60 seconds (12 times total)
                let refreshCount = 0;
                const maxRefreshes = 12;
                const refreshInterval = setInterval(async () => {
                    refreshCount++;
                    // console.log(`🔄 Auto-refresh #${refreshCount} after redelegate...`);
                    await updateDashboardData();
                    
                    if (refreshCount >= maxRefreshes) {
                        clearInterval(refreshInterval);
                        // console.log('✅ Auto-refresh completed');
                    }
                }, 5000); // Every 5 seconds
                
                // First immediate refresh after 3 seconds
                setTimeout(async () => {
                    // console.log('🔄 Initial refresh after redelegate...');
                    await updateDashboardData();
                }, 3000);
                
            } catch (error) {
                showDashTxStatus('error', 'Помилка: ' + error.message);
            }
        }

        async function updateStakingData() {
            try {
                const overview = await cosmosStaking.refresh();
                
                const balance = cosmosStaking.formatTics(overview.balance);
                const delegated = cosmosStaking.formatTics(overview.totalDelegated);
                const rewards = cosmosStaking.formatTics(overview.totalRewards);

                document.getElementById('walletBalance').textContent = parseFloat(balance).toFixed(2);
                document.getElementById('walletDelegated').textContent = parseFloat(delegated).toFixed(2);
                document.getElementById('walletRewards').textContent = parseFloat(rewards).toFixed(4);
                document.getElementById('claimableRewards').textContent = parseFloat(rewards).toFixed(4);
            } catch (error) {
                // console.error('Error updating staking data:', error);
            }
        }

        function showStakingTab(tab) {
            document.querySelectorAll('.staking-tab').forEach(btn => {
                btn.style.background = 'transparent';
                btn.style.color = '#94a3b8';
            });
            document.querySelectorAll('.staking-tab-content').forEach(content => {
                content.style.display = 'none';
            });

            document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.background = 'rgba(0, 212, 255, 0.2)';
            document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.color = '#00FFF0';
            document.getElementById(tab + 'Tab').style.display = 'block';
        }

        async function executeDelegate() {
            const amount = parseFloat(document.getElementById('delegateAmount').value);
            
            if (!amount || amount < 0.1) {
                alert('Minimum delegation amount: 0.1 TICS');
                return;
            }

            try {
                showTxStatus('processing', 'Processing transaction...');
                
                const result = await cosmosStaking.delegate(amount, 'Delegation via QubeNode.space');
                
                showTxStatus('success', `Успішно! TX: ${result.txHash}`);
                
                setTimeout(async () => {
                    await updateStakingData();
                    document.getElementById('delegateAmount').value = '';
                }, 2000);
                
            } catch (error) {
                showTxStatus('error', 'Помилка: ' + error.message);
            }
        }

        async function executeUndelegate() {
            const amount = parseFloat(document.getElementById('undelegateAmount').value);
            
            if (!amount || amount < 0.1) {
                alert('Minimum amount: 0.1 TICS');
                return;
            }

            if (!confirm(`Undelegate ${amount} TICS? Період очікування: 14 днів`)) {
                return;
            }

            try {
                showTxStatus('processing', 'Processing transaction...');
                
                const result = await cosmosStaking.undelegate(amount, 'Undelegation via QubeNode.space');
                
                showTxStatus('success', `Успішно! TX: ${result.txHash}. Очікуйте 14 днів.`);
                
                setTimeout(async () => {
                    await updateStakingData();
                    document.getElementById('undelegateAmount').value = '';
                }, 2000);
                
            } catch (error) {
                showTxStatus('error', 'Помилка: ' + error.message);
            }
        }

        async function executeClaim() {
            try {
                showTxStatus('processing', 'Processing transaction...');
                
                const result = await cosmosStaking.claimRewards('Rewards claim via QubeNode.space');
                
                showTxStatus('success', `Винагороду отримано! TX: ${result.txHash}`);
                
                setTimeout(async () => {
                    await updateStakingData();
                }, 2000);
                
            } catch (error) {
                showTxStatus('error', 'Помилка: ' + error.message);
            }
        }

        function showTxStatus(type, message) {
            const statusDiv = document.getElementById('txStatus');
            statusDiv.style.display = 'block';
            
            let bgColor, borderColor, textColor;
            
            if (type === 'processing') {
                bgColor = 'rgba(59, 130, 246, 0.1)';
                borderColor = 'rgba(59, 130, 246, 0.4)';
                textColor = '#3b82f6';
            } else if (type === 'success') {
                bgColor = 'rgba(34, 197, 94, 0.1)';
                borderColor = 'rgba(34, 197, 94, 0.4)';
                textColor = '#22c55e';
            } else {
                bgColor = 'rgba(239, 68, 68, 0.1)';
                borderColor = 'rgba(239, 68, 68, 0.4)';
                textColor = '#ef4444';
            }
            
            statusDiv.style.background = bgColor;
            statusDiv.style.border = '2px solid ' + borderColor;
            statusDiv.style.color = textColor;
            statusDiv.innerHTML = message;
            
            if (type !== 'processing') {
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 5000);
            }
        }

        // Header Wallet Additional Variables
        let allValidators = []; // Store all validators with names
        let validatorModalMode = ''; // 'from' or 'to'
        let validatorNamesCache = {}; // Cache validator names by address

        async function updateHeaderWalletDisplay() {
            try {
                const overview = await cosmosStaking.refresh();
                const walletInfo = cosmosStaking.getWalletInfo();
                
                const balance = cosmosStaking.formatTics(overview.balance);
                const formattedBalance = parseFloat(balance).toFixed(2);
                
                // ✅ БЕЗПЕЧНО: Санітизація адреси гаманця
                const address = String(walletInfo.address).replace(/[<>"']/g, '');
                const shortAddress = address.substring(0, 8) + '...' + address.substring(address.length - 6);
                
                // ✅ БЕЗПЕЧНО: Створюємо елементи через DOM API замість innerHTML
                const headerBtn = document.getElementById('headerWalletBtn');
                headerBtn.innerHTML = ''; // Очищуємо
                
                const iconSpan = document.createElement('span');
                iconSpan.textContent = '💼';
                
                const walletInfoDiv = document.createElement('div');
                walletInfoDiv.className = 'wallet-info';
                
                const addressDiv = document.createElement('div');
                addressDiv.className = 'wallet-address';
                addressDiv.textContent = shortAddress; // textContent автоматично екранує
                
                const balanceDiv = document.createElement('div');
                balanceDiv.className = 'wallet-balance';
                balanceDiv.textContent = `${formattedBalance} TICS`;
                
                walletInfoDiv.appendChild(addressDiv);
                walletInfoDiv.appendChild(balanceDiv);
                headerBtn.appendChild(iconSpan);
                headerBtn.appendChild(walletInfoDiv);
                headerBtn.classList.add('wallet-connected');
                
                // ✅ БЕЗПЕЧНО: Update dropdown без innerHTML та inline onclick
                const dropdown = document.getElementById('headerWalletDropdown');
                if (dropdown) {
                    dropdown.innerHTML = ''; // Очищуємо
                    
                    // Dashboard button
                    const dashboardBtn = document.createElement('button');
                    dashboardBtn.className = 'wallet-option';
                    const dashIcon = document.createElement('span');
                    dashIcon.textContent = '📊';
                    const dashText = document.createElement('span');
                    dashText.textContent = 'View Dashboard';
                    dashboardBtn.appendChild(dashIcon);
                    dashboardBtn.appendChild(dashText);
                    dashboardBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        window.location.href = `dashboard.html?wallet=${encodeURIComponent(walletInfo.walletType)}&address=${encodeURIComponent(address)}`;
                    });
                    
                    // Disconnect button
                    const disconnectBtn = document.createElement('button');
                    disconnectBtn.className = 'wallet-option';
                    disconnectBtn.style.cssText = 'background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #ef4444;';
                    const discIcon = document.createElement('span');
                    discIcon.textContent = '🔌';
                    const discText = document.createElement('span');
                    discText.textContent = 'Disconnect Wallet';
                    disconnectBtn.appendChild(discIcon);
                    disconnectBtn.appendChild(discText);
                    disconnectBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        disconnectHeaderWallet();
                    });
                    
                    dropdown.appendChild(dashboardBtn);
                    dropdown.appendChild(disconnectBtn);
                }
                
                // Update mobile button too
                updateMobileWalletButton();
            } catch (error) {
                // console.error('Error updating header wallet display:', error);
                resetHeaderWalletButton();
            }
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('headerWalletDropdown');
            const headerBtn = document.getElementById('headerWalletBtn');
            
            if (dropdown && headerBtn && !headerBtn.contains(event.target)) {
                dropdown.classList.remove('show');
            }
        });

        // Mobile wallet button handler - for menu button (not working due to checkbox)
        window.handleMobileWalletClick = async function() {
            console.log('Menu wallet button - opening modal...');
            openWalletModal();
        }

        // WALLET MODAL FUNCTIONS - PURE JAVASCRIPT, NO onclick
        function openWalletModal() {
            const modal = document.getElementById('walletModal');
            if (modal) {
                modal.classList.add('active');
                console.log('✅ Wallet modal opened');
            }
        }

        function closeWalletModal() {
            const modal = document.getElementById('walletModal');
            if (modal) {
                modal.classList.remove('active');
                console.log('✅ Wallet modal closed');
            }
        }

        async function connectWalletFromModal(walletType) {
            console.log(`💼 Connecting ${walletType}...`);
            
            const CHAIN_ID = 'qubetics-1';
            const btn = document.getElementById(walletType === 'keplr' ? 'modalKeplrBtn' : 'modalCosmostationBtn');
            
            if (!btn) return;
            
            btn.innerHTML = '<span>⏳</span><span>Connecting...</span>';
            btn.style.pointerEvents = 'none';
            
            try {
                let address;
                
                if (walletType === 'keplr') {
                    if (!window.keplr) {
                        alert('Please install Keplr Wallet or open site through Keplr browser');
                        btn.style.pointerEvents = 'auto';
                        btn.innerHTML = '<span>🔷</span><span>Keplr Wallet</span>';
                        return;
                    }
                    
                    await window.keplr.enable(CHAIN_ID);
                    const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
                    const accounts = await offlineSigner.getAccounts();
                    address = accounts[0].address;
                    console.log('✅ Keplr connected:', address);
                    
                } else if (walletType === 'cosmostation') {
                    if (!window.cosmostation) {
                        alert('Please install Cosmostation Wallet or open site through Cosmostation browser');
                        btn.style.pointerEvents = 'auto';
                        btn.innerHTML = '<span>🔶</span><span>Cosmostation</span>';
                        return;
                    }
                    
                    const provider = window.cosmostation.providers.keplr;
                    await provider.enable(CHAIN_ID);
                    const offlineSigner = provider.getOfflineSigner(CHAIN_ID);
                    const accounts = await offlineSigner.getAccounts();
                    address = accounts[0].address;
                    console.log('✅ Cosmostation connected:', address);
                }
                
                // Redirect to dashboard
                console.log('✅ Redirecting to dashboard...');
                window.location.href = `dashboard.html?wallet=${walletType}&address=${address}`;
                
            } catch (error) {
                console.error('❌ Connection error:', error);
                alert('Connection error: ' + error.message);
                btn.style.pointerEvents = 'auto';
                btn.innerHTML = walletType === 'keplr' ? 
                    '<span>🔷</span><span>Keplr Wallet</span>' : 
                    '<span>🔶</span><span>Cosmostation</span>';
            }
        }

        // INITIALIZE ALL EVENT LISTENERS ON DOM READY
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Initializing wallet connection...');
            
            // Mobile-only wallet button (bottom right, only visible on mobile)
            const mobileOnlyBtn = document.getElementById('mobileOnlyWalletBtn');
            if (mobileOnlyBtn) {
                mobileOnlyBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log('💼 Mobile-only wallet button CLICKED');
                    openWalletModal();
                });
                
                mobileOnlyBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    console.log('👆 Mobile-only wallet button TOUCHED');
                    openWalletModal();
                }, { passive: false });
                
                console.log('✅ Mobile-only wallet button listeners attached');
            }
            
            // Modal close button
            const closeBtn = document.querySelector('.wallet-modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeWalletModal);
            }
            
            // Keplr button
            const keplrBtn = document.getElementById('modalKeplrBtn');
            if (keplrBtn) {
                keplrBtn.addEventListener('click', function() {
                    console.log('🔷 Keplr button clicked');
                    connectWalletFromModal('keplr');
                });
                keplrBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    console.log('👆 Keplr button touched');
                    connectWalletFromModal('keplr');
                }, { passive: false });
            }
            
            // Cosmostation button
            const cosmostationBtn = document.getElementById('modalCosmostationBtn');
            if (cosmostationBtn) {
                cosmostationBtn.addEventListener('click', function() {
                    console.log('🔶 Cosmostation button clicked');
                    connectWalletFromModal('cosmostation');
                });
                cosmostationBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    console.log('👆 Cosmostation button touched');
                    connectWalletFromModal('cosmostation');
                }, { passive: false });
            }
            
            // Close modal on overlay click
            const modal = document.getElementById('walletModal');
            if (modal) {
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        closeWalletModal();
                    }
                });
            }
            
            console.log('✅ All wallet modal listeners initialized');
        });
        
        console.log('✅ handleMobileWalletClick function registered globally');

        // Update mobile wallet button display
        function updateMobileWalletButton() {
            const mobileBtn = document.getElementById('mobileWalletBtn');
            if (!mobileBtn) return;
            
            if (headerWalletConnected && cosmosStaking) {
                const walletInfo = cosmosStaking.getWalletInfo();
                const address = walletInfo.address;
                const shortAddress = address.substring(0, 8) + '...' + address.substring(address.length - 6);
                
                mobileBtn.innerHTML = `
                    <span>💼</span>
                    <span>${shortAddress}</span>
                `;
                mobileBtn.style.background = 'rgba(34, 197, 94, 0.2)';
                mobileBtn.style.borderColor = 'rgba(34, 197, 94, 0.4)';
            } else {
                mobileBtn.innerHTML = `
                    <span>💼</span>
                    <span>Connect Wallet</span>
                `;
                mobileBtn.style.background = '';
                mobileBtn.style.borderColor = '';
            }
        }

        // Check if wallet was connected in modal and update header
        const originalConnectWallet = connectWallet;
        async function connectWallet(walletType) {
            await originalConnectWallet(walletType);
            if (cosmosStaking && cosmosStaking.isWalletConnected()) {
                headerWalletConnected = true;
                await updateHeaderWalletDisplay();
            }
        }

        // Check if wallet gets disconnected in modal and update header
        const originalDisconnectWallet = disconnectWallet;
        async function disconnectWallet() {
            await originalDisconnectWallet();
            resetHeaderWalletButton();
        }



// ========== БЛОК 3: Quick Actions Event Listeners (з рядків 2869-2899) ==========
    // TEST: Verify functions are loaded
    // console.log('🔧 Testing function definitions...');
    // console.log('quickStakeMore type:', typeof window.quickStakeMore);
    // console.log('quickStakeQubeNode type:', typeof window.quickStakeQubeNode);
    // console.log('quickClaimAllRewards type:', typeof window.quickClaimAllRewards);
    
    if (typeof window.quickStakeQubeNode === 'function') {
        // console.log('✅ Functions are loaded correctly!');
        
        // Attach event listeners to Quick Actions buttons (FIRST block - before My Delegations)
        const btnQuickStakeQubeNode = document.getElementById('btnQuickStakeQubeNode');
        const btnQuickClaimAllRewards = document.getElementById('btnQuickClaimAllRewards');
        
        if (btnQuickStakeQubeNode) {
            btnQuickStakeQubeNode.addEventListener('click', function() {
                // console.log('🚀 Quick Stake QubeNode clicked!');
                window.quickStakeQubeNode();
            });
            // console.log('✅ btnQuickStakeQubeNode listener attached');
        }
        
        if (btnQuickClaimAllRewards) {
            btnQuickClaimAllRewards.addEventListener('click', function() {
                // console.log('💰 Quick Claim All Rewards clicked!');
                window.quickClaimAllRewards();
            });
            // console.log('✅ btnQuickClaimAllRewards listener attached');
        }
    } else {
        // console.error('❌ Functions are NOT loaded!');
    }

// ========== EVENT LISTENERS (статичні елементи) ==========
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
