/**
 * Dashboard - All functions GLOBAL
 */

        const QUBENODE_VALIDATOR = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
        let cosmosStaking = null;
        let validatorNamesCache = {};
        let currentValidatorAddress = '';
        let selectedSwitchValidator = '';
        let allValidators = [];
        
        // Initialize
        async function init() {
            const urlParams = new URLSearchParams(window.location.search);
            const walletType = urlParams.get('wallet');
            const address = urlParams.get('address');
            
            if (!walletType || !address) {
                alert('No wallet information. Return to main page.');
                window.location.href = 'index.html';
                return;
            }
            
            document.getElementById('walletAddress').textContent = address;
            
            // Wait for modules
            let attempts = 0;
            while (typeof CosmosStakingModule === 'undefined' && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (typeof CosmosStakingModule === 'undefined') {
                alert('Error loading modules');
                return;
            }
            
            cosmosStaking = new CosmosStakingModule();
            await cosmosStaking.initialize();
            
            const result = await cosmosStaking.connectWallet(walletType);
            if (!result.success) {
                alert('Wallet connection error');
                return;
            }
            
            await loadData();
        }
        
        async function loadData() {
            try {
                const overview = await cosmosStaking.refresh();
                
                // Preload all validator names to cache
                await preloadAllValidators();
                
                // Update stats
                document.getElementById('balance').textContent = formatTics(overview.balance);
                document.getElementById('delegated').textContent = formatTics(overview.totalDelegated);
                document.getElementById('rewards').textContent = formatTics(overview.totalRewards);
                
                // Fix NaN for unbonding
                const unbondingAmount = overview.totalUnbonding && overview.totalUnbonding !== '0' ? formatTics(overview.totalUnbonding) : '0.000';
                document.getElementById('unbonding').textContent = unbondingAmount;
                
                document.getElementById('quickClaimAmount').textContent = formatTics(overview.totalRewards);
                
                // Forecast
                const delegated = parseFloat(overview.totalDelegated) / 1e18;
                const apy = 0.285;
                const daily = (delegated * apy) / 365;
                document.getElementById('forecastDaily').textContent = daily.toFixed(3);
                document.getElementById('forecastWeekly').textContent = (daily * 7).toFixed(3);
                document.getElementById('forecastMonthly').textContent = (daily * 30).toFixed(3);
                document.getElementById('forecastYearly').textContent = (delegated * apy).toFixed(3);
                
                await loadDelegations(overview);
                await loadUnbonding(overview);
                
            } catch (error) {
                console.error('Error loading data:', error);
                alert('Error loading data: ' + error.message);
            }
        }
        
        async function loadDelegations(overview) {
            const container = document.getElementById('delegationsList');
            
            if (!overview.delegations || overview.delegations.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">No delegations found</div>';
                return;
            }
            
            let html = '';
            
            for (const del of overview.delegations) {
                const valAddr = del.delegation.validator_address;
                const amount = formatTics(del.balance.amount);
                
                let valName = validatorNamesCache[valAddr] || 'Loading...';
                if (!validatorNamesCache[valAddr]) {
                    loadValidatorName(valAddr);
                }
                
                let rewards = '0.000';
                if (overview.rewards && overview.rewards.rewards) {
                    const rewardEntry = overview.rewards.rewards.find(r => r.validator_address === valAddr);
                    if (rewardEntry && rewardEntry.reward && rewardEntry.reward.length > 0) {
                        const ticsReward = rewardEntry.reward.find(r => r.denom === 'tics');
                        if (ticsReward) {
                            rewards = formatTics(ticsReward.amount);
                        }
                    }
                }
                
                html += `
                    <div class="delegation-card" style="background: rgba(15,23,42,0.6); border: 1px solid rgba(100,116,139,0.3); border-radius: 12px; padding: 20px; margin-bottom: 16px; transition: all 0.3s; cursor: pointer;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                            <div>
                                <div style="color: #00D4FF; font-size: 18px; font-weight: 600; margin-bottom: 4px;">${valName}</div>
                                <div style="color: #64748b; font-size: 12px;">${valAddr.substring(0, 16)}...${valAddr.substring(valAddr.length - 6)}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #00FFF0; font-size: 22px; font-weight: 700; margin-bottom: 4px;">${amount}</div>
                                <div style="color: #94a3b8; font-size: 11px;">TICS Staked</div>
                            </div>
                        </div>
                        <div style="background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="color: #86efac; font-size: 13px;">💰 Pending Rewards</div>
                                <div style="color: #86efac; font-size: 16px; font-weight: 600;">${rewards} TICS</div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                            <button class="btn-stake-more" data-validator="${valAddr}" data-amount="${amount}" style="padding: 12px; background: rgba(14,165,233,0.15); border: 1px solid rgba(14,165,233,0.4); border-radius: 8px; color: #0ea5e9; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s;">💎 Stake More</button>
                            <button class="btn-switch-validator" data-validator="${valAddr}" data-amount="${amount}" style="padding: 12px; background: rgba(107,114,128,0.15); border: 1px solid rgba(107,114,128,0.4); border-radius: 8px; color: #94a3b8; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s;">🔄 Switch Validator</button>
                            <button class="btn-unbond" data-validator="${valAddr}" data-amount="${amount}" style="padding: 12px; background: rgba(153,27,27,0.15); border: 1px solid rgba(153,27,27,0.4); border-radius: 8px; color: #ef4444; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s;">🔓 Unbond</button>
                        </div>
                    </div>
                `;
            }
            
            container.innerHTML = html;
            
            // Add event listeners to dynamically created buttons
            container.querySelectorAll('.btn-stake-more').forEach(btn => {
                btn.addEventListener('click', function() {
                    stakeMore(this.dataset.validator, this.dataset.amount);
                });
                btn.addEventListener('mouseover', function() {
                    this.style.background = 'rgba(14,165,233,0.25)';
                });
                btn.addEventListener('mouseout', function() {
                    this.style.background = 'rgba(14,165,233,0.15)';
                });
            });
            
            container.querySelectorAll('.btn-switch-validator').forEach(btn => {
                btn.addEventListener('click', function() {
                    switchValidator(this.dataset.validator, this.dataset.amount);
                });
                btn.addEventListener('mouseover', function() {
                    this.style.background = 'rgba(107,114,128,0.25)';
                });
                btn.addEventListener('mouseout', function() {
                    this.style.background = 'rgba(107,114,128,0.15)';
                });
            });
            
            container.querySelectorAll('.btn-unbond').forEach(btn => {
                btn.addEventListener('click', function() {
                    unbond(this.dataset.validator, this.dataset.amount);
                });
                btn.addEventListener('mouseover', function() {
                    this.style.background = 'rgba(153,27,27,0.25)';
                });
                btn.addEventListener('mouseout', function() {
                    this.style.background = 'rgba(153,27,27,0.15)';
                });
            });
            
            // Add hover effect to delegation cards
            container.querySelectorAll('.delegation-card').forEach(card => {
                card.addEventListener('mouseover', function() {
                    this.style.borderColor = 'rgba(0,212,255,0.6)';
                    this.style.background = 'rgba(15,23,42,0.9)';
                });
                card.addEventListener('mouseout', function() {
                    this.style.borderColor = 'rgba(100,116,139,0.3)';
                    this.style.background = 'rgba(15,23,42,0.6)';
                });
            });
        }
        
        // Preload all validators to cache their names
        async function preloadAllValidators() {
            try {
                console.log('🔄 Preloading all validators...');
                const response = await fetch('https://swagger.qubetics.com/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED');
                const data = await response.json();
                
                if (data.validators && Array.isArray(data.validators)) {
                    data.validators.forEach(validator => {
                        if (validator.description && validator.description.moniker) {
                            validatorNamesCache[validator.operator_address] = validator.description.moniker;
                        }
                    });
                    console.log('✅ Loaded', Object.keys(validatorNamesCache).length, 'validator names');
                }
            } catch (error) {
                console.error('❌ Error preloading validators:', error);
                // Not critical, continue anyway
            }
        }
        
        async function loadValidatorName(address) {
            try {
                const response = await fetch(`https://swagger.qubetics.com/cosmos/staking/v1beta1/validators/${address}`);
                const data = await response.json();
                if (data.validator && data.validator.description) {
                    validatorNamesCache[address] = data.validator.description.moniker || address;
                    await loadData();
                }
            } catch (error) {
                console.error('Error loading validator name:', error);
            }
        }
        
        async function loadUnbonding(overview) {
            const section = document.getElementById('unbondingSection');
            const container = document.getElementById('unbondingList');
            
            console.log('🔍 Unbonding data:', overview.unbondingDelegations);
            
            let unbondingData = overview.unbondingDelegations;
            
            // Якщо немає dаних в overview, спробуємо прямий запит
            if (!unbondingData || unbondingData.length === 0) {
                try {
                    let address;
                    // Check if MetaMask
                    if (cosmosStaking.isMetaMask && cosmosStaking.metamaskConnector) {
                        address = cosmosStaking.metamaskConnector.cosmosAddress;
                    } else {
                        address = cosmosStaking.walletManager.getAddress();
                    }
                    
                    const response = await fetch(`https://swagger.qubetics.com/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`);
                    const data = await response.json();
                    unbondingData = data.unbonding_responses || [];
                    console.log('🔄 Fetched unbonding directly from API:', unbondingData);
                } catch (error) {
                    console.error('Error fetching unbonding:', error);
                }
            }
            
            if (!unbondingData || unbondingData.length === 0) {
                section.style.display = 'none';
                return;
            }
            
            section.style.display = 'block';
            let html = '';
            
            for (const unbonding of unbondingData) {
                const valAddr = unbonding.validator_address;
                let valName = validatorNamesCache[valAddr] || 'Loading...';
                if (!validatorNamesCache[valAddr]) {
                    loadValidatorName(valAddr);
                }
                
                for (const entry of unbonding.entries) {
                    const amount = formatTics(entry.balance);
                    const completionTime = new Date(entry.completion_time);
                    const now = new Date();
                    const totalHours = Math.ceil((completionTime - now) / (1000 * 60 * 60));
                    const days = Math.floor(totalHours / 24);
                    const hours = totalHours % 24;
                    const timeRemaining = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                    const creationHeight = entry.creation_height || entry.initial_balance;
                    
                    html += `
                        <div class="unbonding-card" style="background: rgba(15,23,42,0.6); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 20px; margin-bottom: 16px; transition: all 0.3s;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <div>
                                    <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">From: ${valName}</div>
                                    <div style="color: #64748b; font-size: 11px; margin-bottom: 8px;">${valAddr.substring(0, 16)}...${valAddr.substring(valAddr.length - 6)}</div>
                                    <div style="color: #ef4444; font-size: 24px; font-weight: 700;">${amount} TICS</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="color: #fca5a5; font-size: 12px; margin-bottom: 4px;">Time Remaining</div>
                                    <div style="color: #ef4444; font-size: 20px; font-weight: 700; margin-bottom: 4px;">${timeRemaining}</div>
                                    <div style="color: #64748b; font-size: 11px;">Completion:<br>${completionTime.toLocaleDateString('uk-UA')}, ${completionTime.toLocaleTimeString('uk-UA', {hour: '2-digit', minute: '2-digit'})}</div>
                                </div>
                            </div>
                            ${days >= 0 && hours >= 0 ? `<button class="btn-cancel-unbonding" data-validator="${valAddr}" data-balance="${entry.balance}" data-height="${creationHeight}" style="width: 100%; padding: 12px; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); border-radius: 8px; color: #ef4444; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.3s;">Cancel Unbonding</button>` : ''}
                        </div>
                    `;
                }
            }
            
            container.innerHTML = html;
            
            // Add event listeners to cancel unbonding buttons
            container.querySelectorAll('.btn-cancel-unbonding').forEach(btn => {
                btn.addEventListener('click', function() {
                    cancelUnbonding(this.dataset.validator, this.dataset.balance, this.dataset.height);
                });
                btn.addEventListener('mouseover', function() {
                    this.style.background = 'rgba(239,68,68,0.25)';
                });
                btn.addEventListener('mouseout', function() {
                    this.style.background = 'rgba(239,68,68,0.15)';
                });
            });
            
            // Add hover effect to unbonding cards
            container.querySelectorAll('.unbonding-card').forEach(card => {
                card.addEventListener('mouseover', function() {
                    this.style.borderColor = 'rgba(239,68,68,0.6)';
                    this.style.background = 'rgba(15,23,42,0.9)';
                });
                card.addEventListener('mouseout', function() {
                    this.style.borderColor = 'rgba(239,68,68,0.3)';
                    this.style.background = 'rgba(15,23,42,0.6)';
                });
            });
        }
        
        function formatTics(amount) {
            if (!amount || amount === '0' || amount === 0) return '0.000';
            const tics = parseFloat(amount) / 1e18;
            if (isNaN(tics)) return '0.000';
            
            // На мобільному 2 цифри, на dесктопі 3
            const isMobile = window.innerWidth <= 768;
            return tics.toFixed(isMobile ? 2 : 3);
        }
        
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
            
            // Очищення errorMessage та віdновлення стану dля successModal
            if (modalId === 'successModal') {
                const errorMsg = document.getElementById('errorMessage');
                if (errorMsg) {
                    errorMsg.remove();
                }
                // Повертаємо станdартний стан (на випаdок наступного використання)
                setTimeout(() => {
                    const titleElement = document.getElementById('successTitle');
                    if (titleElement) {
                        titleElement.style.color = '#22c55e';
                        titleElement.textContent = 'Transaction successful!';
                    }
                }, 300);
            }
        }
        
        function showSuccess(title, txHash) {
            // Доdаємо 0x якщо його немає
            const txHashWithPrefix = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
            
            document.getElementById('successTitle').textContent = '⏳ Checking status...';
            document.getElementById('successTitle').style.color = '#f59e0b';
            document.getElementById('successTxHash').textContent = txHashWithPrefix;
            document.getElementById('successExplorerLink').href = `https://ticsscan.com/txn/${txHashWithPrefix}`;
            document.getElementById('successModal').style.display = 'block';
            
            // Перевіряємо статус транзакції кілька разів
            checkTransactionStatus(txHashWithPrefix, title);
        }
        
        async function checkTransactionStatus(txHash, originalTitle) {
            const txHashForApi = txHash.startsWith('0x') ? txHash.substring(2) : txHash;
            let attempts = 0;
            const maxAttempts = 6; // 6 attempts x 2 seconds = 12 seconds
            
            while (attempts < maxAttempts) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                    attempts++;
                    
                    console.log(`🔍 Checking transaction status (attempt ${attempts}/${maxAttempts})...`);
                    
                    const response = await fetch(`https://swagger.qubetics.com/cosmos/tx/v1beta1/txs/${txHashForApi}`);
                    
                    if (!response.ok) {
                        console.log('⚠️ Transaction not yet indexed, trying again...');
                        continue;
                    }
                    
                    const data = await response.json();
                    
                    if (!data.tx_response) {
                        console.log('⚠️ No tx_response yet, trying again...');
                        continue;
                    }
                    
                    // Транзакція знайdена, перевіряємо статус
                    if (data.tx_response.code !== 0) {
                        // FAILED
                        const errorMsg = data.tx_response.raw_log || 'Transaction failed';
                        
                        document.getElementById('successTitle').textContent = '❌ Transaction failed';
                        document.getElementById('successTitle').style.color = '#ef4444';
                        
                        // Доdаємо повіdомлення про помилку
                        const txHashElement = document.getElementById('successTxHash').parentElement;
                        if (!document.getElementById('errorMessage')) {
                            const errorDiv = document.createElement('div');
                            errorDiv.id = 'errorMessage';
                            errorDiv.style.cssText = 'background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 12px; margin-top: 16px; color: #fca5a5; font-size: 13px;';
                            
                            // FIXED: Безпечне створення вмісту без innerHTML
                            const strongElement = document.createElement('strong');
                            strongElement.textContent = 'Reason:';
                            const brElement = document.createElement('br');
                            const errorTextNode = document.createTextNode(errorMsg);
                            
                            errorDiv.appendChild(strongElement);
                            errorDiv.appendChild(brElement);
                            errorDiv.appendChild(errorTextNode);
                            
                            txHashElement.parentElement.insertBefore(errorDiv, txHashElement.nextSibling);
                        }
                        
                        console.log('❌ Transaction failed:', errorMsg);
                        return; // Вихоdимо з функції
                        
                    } else {
                        // SUCCESS
                        document.getElementById('successTitle').textContent = originalTitle;
                        document.getElementById('successTitle').style.color = '#22c55e';
                        console.log('✅ Transaction confirmed successfully');
                        return; // Вихоdимо з функції
                    }
                    
                } catch (error) {
                    console.error('Error checking transaction status:', error);
                    if (attempts >= maxAttempts) {
                        // Якщо всі спроби вичерпані - показуємо попереdження
                        document.getElementById('successTitle').textContent = '⚠️ ' + originalTitle + ' (check status in explorer)';
                        document.getElementById('successTitle').style.color = '#f59e0b';
                    }
                }
            }
            
            // Якщо всі спроби вичерпані але транзакція не знайdена
            document.getElementById('successTitle').textContent = '⚠️ ' + originalTitle + ' (check status in explorer)';
            document.getElementById('successTitle').style.color = '#f59e0b';
            console.log('⚠️ Could not verify transaction status after all attempts');
        }
        
        // Stake More
        function stakeMore(validatorAddress, stakedAmount) {
            console.log('🎯 Stake More clicked for:', validatorAddress);
            currentValidatorAddress = validatorAddress;
            
            const valName = validatorNamesCache[validatorAddress] || validatorAddress;
            document.getElementById('stakeMoreValidatorName').textContent = valName;
            document.getElementById('stakeMoreValidatorAddr').textContent = validatorAddress;
            
            const balance = document.getElementById('balance').textContent;
            document.getElementById('stakeMoreAvailable').textContent = balance;
            document.getElementById('stakeMoreAmount').value = '';
            
            document.getElementById('stakeMoreModal').style.display = 'block';
        }
        
        async function confirmStakeMore() {
            const amount = document.getElementById('stakeMoreAmount').value;
            if (!amount || isNaN(amount) || parseFloat(amount) < 0.1) {
                alert('Minimum amount: 0.1 TICS');
                return;
            }
            
            closeModal('stakeMoreModal');
            
            try {
                console.log('📤 Delegating to:', currentValidatorAddress);
                console.log('💰 Amount:', amount, 'TICS');
                
                // Get validator name for memo
                let validatorName = 'Validator';
                if (validatorNamesCache[currentValidatorAddress]) {
                    validatorName = validatorNamesCache[currentValidatorAddress];
                }
                
                const memoText = `Delegate to ${validatorName} via QubeNode.space`;
                
                // Use cosmosStaking.delegate() - works for all wallet types
                const amountTics = parseFloat(amount);
                const result = await cosmosStaking.delegate(amountTics, memoText);
                
                showSuccess('Delegation successful!', result.txHash);
                await loadData();
            } catch (error) {
                console.error('Stake error:', error);
                alert('❌ Error: ' + error.message);
            }
        }
        
        // Quick Delegate to QubeNode
        function quickDelegateQubeNode() {
            stakeMore(QUBENODE_VALIDATOR, '0');
        }
        
        // Claim All
        async function quickClaimAll() {
            try {
                const overview = await cosmosStaking.refresh();
                
                if (!overview.rewards || !overview.rewards.rewards || overview.rewards.rewards.length === 0) {
                    alert('No rewards to claim');
                    return;
                }
                
                // Fill modal
                document.getElementById('claimTotalAmount').textContent = formatTics(overview.totalRewards);
                
                let rewardsHtml = '';
                for (const reward of overview.rewards.rewards) {
                    const valAddr = reward.validator_address;
                    const valName = validatorNamesCache[valAddr] || valAddr.substring(0, 20) + '...';
                    
                    if (reward.reward && reward.reward.length > 0) {
                        const ticsReward = reward.reward.find(r => r.denom === 'tics');
                        if (ticsReward) {
                            const rewardAmount = formatTics(ticsReward.amount);
                            rewardsHtml += `
                                <div class="reward-item">
                                    <div style="color: white; font-weight: 500;">${valName}</div>
                                    <div style="color: #fbbf24; font-weight: 600;">${rewardAmount} TICS</div>
                                </div>
                            `;
                        }
                    }
                }
                
                document.getElementById('claimRewardsList').innerHTML = rewardsHtml;
                document.getElementById('claimAllModal').style.display = 'block';
                
            } catch (error) {
                console.error('Error:', error);
                alert('Error: ' + error.message);
            }
        }
        
        async function confirmClaimAll() {
            closeModal('claimAllModal');
            
            try {
                const overview = await cosmosStaking.refresh();
                
                // Get all validator addresses with rewards
                const validatorAddresses = overview.rewards.rewards
                    .filter(r => r.reward && r.reward.length > 0)
                    .map(r => r.validator_address);
                
                if (validatorAddresses.length === 0) {
                    alert('No rewards to claim');
                    return;
                }
                
                console.log('Claiming from validators:', validatorAddresses);
                
                // Build memo with validator count and names (if short enough)
                const validatorCount = validatorAddresses.length;
                let memoText = `Claim from ${validatorCount} validator${validatorCount > 1 ? 's' : ''}`;
                
                // Try to add first few validator names if memo stays short
                const firstNames = validatorAddresses
                    .slice(0, 3) // First 3 validators
                    .map(addr => validatorNamesCache[addr] || addr.substring(0, 15))
                    .join(', ');
                
                const testMemo = `${memoText}: ${firstNames}${validatorCount > 3 ? '...' : ''} via QubeNode.space`;
                
                // Only use detailed memo if under 200 chars (safe limit)
                if (testMemo.length < 200) {
                    memoText = testMemo;
                } else {
                    memoText = `${memoText} via QubeNode.space`;
                }
                
                console.log('Memo:', memoText);
                
                const result = await cosmosStaking.claimRewards(memoText, validatorAddresses);
                showSuccess('Rewards claimed!', result.txHash);
                await loadData();
            } catch (error) {
                console.error('Claim error:', error);
                alert('❌ Error: ' + error.message);
            }
        }
        
        // Switch Validator
        async function switchValidator(validatorAddress, stakedAmount) {
            console.log('🔄 Switch Validator clicked for:', validatorAddress);
            currentValidatorAddress = validatorAddress;
            
            const valName = validatorNamesCache[validatorAddress] || validatorAddress;
            document.getElementById('switchFromValidatorName').textContent = valName;
            document.getElementById('switchFromStaked').textContent = stakedAmount;
            
            // Load all validators
            await loadAllValidators();
            
            document.getElementById('switchValidatorModal').style.display = 'block';
        }
        
        async function loadAllValidators() {
            try {
                const response = await fetch('https://swagger.qubetics.com/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED');
                const data = await response.json();
                allValidators = data.validators || [];
                
                // Sort validators: QubeNode first, then others
                const qubenodeAddr = 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
                const sortedValidators = allValidators.filter(v => v.operator_address !== currentValidatorAddress).sort((a, b) => {
                    if (a.operator_address === qubenodeAddr) return -1;
                    if (b.operator_address === qubenodeAddr) return 1;
                    return 0;
                });
                
                let html = '';
                for (const val of sortedValidators) {
                    const name = val.description.moniker || val.operator_address;
                    const commission = (parseFloat(val.commission.commission_rates.rate) * 100).toFixed(2);
                    const isQubeNode = val.operator_address === qubenodeAddr;
                    
                    // Shorten address: first 20 chars ... last 6 chars
                    const shortAddr = val.operator_address.substring(0, 20) + '...' + val.operator_address.substring(val.operator_address.length - 6);
                    
                    html += `
                        <div class="validator-list-item" data-validator="${val.operator_address}" data-name="${name}" style="${isQubeNode ? 'background: linear-gradient(135deg, rgba(0,212,255,0.15), rgba(99,102,241,0.15)); border: 1.5px solid rgba(0,212,255,0.4);' : ''} padding: 10px 12px; margin-bottom: 8px; cursor: pointer; border-radius: 12px; transition: all 0.3s;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                                <div style="flex: 1; min-width: 0;">
                                    <div style="color: ${isQubeNode ? '#00FFF0' : 'white'}; font-weight: ${isQubeNode ? '700' : '600'}; margin-bottom: 4px; font-size: ${isQubeNode ? '15px' : '14px'};">${name}${isQubeNode ? ' ⭐' : ''}</div>
                                    <div style="color: #64748b; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${shortAddr}</div>
                                </div>
                                <div style="color: ${isQubeNode ? '#00D4FF' : '#94a3b8'}; font-size: 11px; font-weight: ${isQubeNode ? '600' : 'normal'}; white-space: nowrap; text-align: right;">
                                    <div style="color: #64748b; font-size: 9px; margin-bottom: 2px;">Commission</div>
                                    <div>${commission}%</div>
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                document.getElementById('validatorsList').innerHTML = html;
                
                // Add event listeners to validator list items
                document.querySelectorAll('.validator-list-item').forEach(item => {
                    item.addEventListener('click', function() {
                        selectValidator(this.dataset.validator, this.dataset.name);
                    });
                });
            } catch (error) {
                console.error('Error loading validators:', error);
            }
        }
        
        function selectValidator(address, name) {
            selectedSwitchValidator = address;
            
            // Highlight selected
            document.querySelectorAll('.validator-list-item').forEach(item => {
                item.classList.remove('selected');
            });
            event.currentTarget.classList.add('selected');
        }
        
        function switchValidatorStep2() {
            if (!selectedSwitchValidator) {
                alert('Select validator');
                return;
            }
            
            closeModal('switchValidatorModal');
            
            // Fill step 2
            const fromName = validatorNamesCache[currentValidatorAddress] || currentValidatorAddress;
            const stakedAmount = document.getElementById('switchFromStaked').textContent;
            
            // Get selected validator name from allValidators
            const selectedVal = allValidators.find(v => v.operator_address === selectedSwitchValidator);
            const toName = selectedVal ? selectedVal.description.moniker : selectedSwitchValidator;
            
            document.getElementById('switchFromValidatorName2').textContent = fromName;
            document.getElementById('switchFromValidatorAddr2').textContent = currentValidatorAddress.substring(0, 16) + '...' + currentValidatorAddress.substring(currentValidatorAddress.length - 6);
            document.getElementById('switchFromStaked2').textContent = stakedAmount;
            document.getElementById('switchToValidatorName').textContent = toName;
            document.getElementById('switchToValidatorAddr').textContent = selectedSwitchValidator.substring(0, 16) + '...' + selectedSwitchValidator.substring(selectedSwitchValidator.length - 6);
            document.getElementById('switchMaxAmount').textContent = stakedAmount;
            document.getElementById('switchAmount').value = '';
            
            document.getElementById('switchValidatorModal2').style.display = 'block';
        }
        
        async function confirmSwitch() {
            const amount = document.getElementById('switchAmount').value;
            if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
                alert('Enter valid amount');
                return;
            }
            
            closeModal('switchValidatorModal2');
            
            try {
                const amountMinimal = String((parseFloat(amount) * 1e18).toFixed(0));
                
                console.log('📤 Redelegating from:', currentValidatorAddress);
                console.log('📥 Redelegating to:', selectedSwitchValidator);
                console.log('💰 Amount:', amount, 'TICS');
                
                // Get validator names
                const fromName = validatorNamesCache[currentValidatorAddress] || 'current validator';
                const toName = validatorNamesCache[selectedSwitchValidator] || 'new validator';
                
                const memoText = `Redelegate from ${fromName} to ${toName} via QubeNode.space`;
                
                // Use cosmosStaking.redelegate() - works for all wallet types
                const amountTics = parseFloat(amount);
                const result = await cosmosStaking.redelegate(
                    currentValidatorAddress, 
                    selectedSwitchValidator, 
                    amountTics, 
                    memoText
                );
                
                showSuccess('Validator switched!', result.txHash);
                await loadData();
            } catch (error) {
                console.error('Redelegate error:', error);
                alert('❌ Error: ' + error.message);
            }
        }
        
        // Unbond
        function unbond(validatorAddress, stakedAmount) {
            console.log('⛔ Unbond clicked for:', validatorAddress);
            currentValidatorAddress = validatorAddress;
            
            const valName = validatorNamesCache[validatorAddress] || validatorAddress;
            document.getElementById('unbondValidatorName').textContent = valName;
            document.getElementById('unbondStaked').textContent = stakedAmount;
            document.getElementById('unbondMaxAmount').textContent = stakedAmount;
            document.getElementById('unbondAmount').value = '';
            
            document.getElementById('unbondModal').style.display = 'block';
        }
        
        async function confirmUnbond() {
            const amount = document.getElementById('unbondAmount').value;
            if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
                alert('Enter valid amount');
                return;
            }
            
            closeModal('unbondModal');
            
            try {
                const amountMinimal = String((parseFloat(amount) * 1e18).toFixed(0));
                
                console.log('📤 Unbonding from:', currentValidatorAddress);
                console.log('💰 Amount:', amount, 'TICS');
                
                // Get validator name
                const validatorName = validatorNamesCache[currentValidatorAddress] || 'validator';
                const memoText = `Undelegate from ${validatorName} via QubeNode.space`;
                
                // Use cosmosStaking.undelegate() - works for all wallet types
                const amountTics = parseFloat(amount);
                const result = await cosmosStaking.undelegate(amountTics, memoText);
                
                showSuccess('Unstake started! Tokens will be available in 14 days', result.txHash);
                await loadData();
            } catch (error) {
                console.error('Unbond error:', error);
                alert('❌ Error: ' + error.message);
            }
        }
        
        // Cancel Unbonding
        async function cancelUnbonding(validatorAddress, amount, creationHeight) {
            if (!confirm(`Cancel unbond ${formatTics(amount)} TICS? Tokens will return to delegation.`)) {
                return;
            }
            
            try {
                // Get validator name
                const validatorName = validatorNamesCache[validatorAddress] || 'validator';
                const memoText = `Cancel unbond from ${validatorName} via QubeNode.space`;
                
                // Convert amount from minimal to TICS
                const amountTics = parseFloat(amount) / 1e18;
                
                // Use cosmosStaking.cancelUnbonding() - works for all wallet types
                const result = await cosmosStaking.cancelUnbonding(
                    validatorAddress, 
                    amountTics, 
                    creationHeight, 
                    memoText
                );
                
                showSuccess('Unbond cancelled! Tokens returned to staking', result.txHash);
                await loadData();
            } catch (error) {
                console.error('Cancel unbonding error:', error);
                alert('❌ Error: ' + error.message);
            }
        }
        
        function disconnectWallet() {
            window.location.href = 'index.html';
        }
        
        // Start
        init();
        
        // Auto-refresh every 10 seconds
        setInterval(async () => {
            if (cosmosStaking) {
                try {
                    await loadData();
                    console.log('🔄 Dashboard auto-refreshed');
                } catch (error) {
                    console.error('Auto-refresh error:', error);
                }
            }
        }, 10000);

// Event Listeners
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
    console.log('🔒 CSP Grade A+ - All inline handlers removed');
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
