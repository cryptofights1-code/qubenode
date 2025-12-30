/**
 * Calculator Page - Complete Script
 */

        let currentTicsPrice = 0.047190;
        let userCustomPrice = null;
        
        function setAmount(value) {
            document.getElementById('amount').value = value;
            calculateAuto();
        }
        
        function usePeriod() {
            const period = document.getElementById('period').value;
            if (period) {
                document.getElementById('customDays').value = '';
                calculateAuto();
            }
        }
        
        function useCustomDays() {
            const days = parseInt(document.getElementById('customDays').value);
            if (days && days > 0) {
                document.getElementById('period').value = '';
                calculateAuto();
            }
        }
        
        function useCustomPrice() {
            const price = parseFloat(document.getElementById('customPrice').value);
            if (price && price > 0) {
                userCustomPrice = price;
                calculateAuto();
            } else {
                userCustomPrice = null;
                calculateAuto();
            }
        }
        
        function calculateAuto() {
            const amount = parseFloat(document.getElementById('amount').value);
            let period = parseInt(document.getElementById('period').value);
            const customDays = parseInt(document.getElementById('customDays').value);
            const compoundFreq = document.getElementById('compoundFrequency').value;
            
            if (customDays && customDays > 0) {
                period = customDays / 30;
            }
            
            if (!amount || amount <= 0 || !period || period <= 0) {
                document.getElementById('calcResults').style.display = 'none';
                return;
            }
            
            const priceToUse = userCustomPrice || currentTicsPrice;
            
            const APY = 30;
            const COMMISSION = 5;
            const NET_APY = APY * (1 - COMMISSION / 100);
            const ANNUAL_RATE = NET_APY / 100;
            
            let finalAmount, totalReward, compoundsPerYear, compoundText;
            
            if (compoundFreq === 'none') {
                const monthlyRate = ANNUAL_RATE / 12;
                const monthlyReward = amount * monthlyRate;
                totalReward = monthlyReward * period;
                finalAmount = amount + totalReward;
                compoundText = 'No compounding';
            } else {
                switch(compoundFreq) {
                    case 'daily': compoundsPerYear = 365; compoundText = 'Daily (manual)'; break;
                    case 'weekly': compoundsPerYear = 52; compoundText = 'Weekly (manual)'; break;
                    case 'monthly': compoundsPerYear = 12; compoundText = 'Monthly (manual)'; break;
                    case 'quarterly': compoundsPerYear = 4; compoundText = 'Quarterly (manual)'; break;
                }
                
                const ratePerPeriod = ANNUAL_RATE / compoundsPerYear;
                const totalPeriods = compoundsPerYear * (period / 12);
                finalAmount = amount * Math.pow(1 + ratePerPeriod, totalPeriods);
                totalReward = finalAmount - amount;
            }
            
            const daysInPeriod = (period / 12) * 365;
            const dailyReward = totalReward / daysInPeriod;
            const weeklyReward = dailyReward * 7;
            const monthlyReward = totalReward / period;
            
            document.getElementById('calcResults').style.display = 'block';
            
            document.getElementById('dailyResult').textContent = dailyReward.toFixed(2) + ' TICS';
            document.getElementById('dailyUSD').textContent = '$' + (dailyReward * priceToUse).toFixed(2);
            
            document.getElementById('weeklyResult').textContent = weeklyReward.toFixed(2) + ' TICS';
            document.getElementById('weeklyUSD').textContent = '$' + (weeklyReward * priceToUse).toFixed(2);
            
            document.getElementById('monthlyResult').textContent = monthlyReward.toFixed(2) + ' TICS';
            document.getElementById('monthlyUSD').textContent = '$' + (monthlyReward * priceToUse).toFixed(2);
            
            document.getElementById('totalResult').textContent = totalReward.toFixed(2) + ' TICS';
            document.getElementById('totalUSD').textContent = '$' + (totalReward * priceToUse).toFixed(2);
            
            const netReward = totalReward;
            const grossReward = netReward / 0.95;
            const validatorCommission = grossReward - netReward;
            
            // COLORS: USD must match TICS color EXACTLY
            const WHITE = '#ffffff';        // Для білих значень
            const GREEN = '#22c55e';        // Для зелених значень  
            const YELLOW = '#fbbf24';       // Для жовтих значень
            
            // Тіло депозиту - БІЛИЙ TICS → БІЛИЙ USD
            document.getElementById('initialAmount').innerHTML = amount.toLocaleString() + ' TICS<br><span style="font-size: 0.85em; color: ' + WHITE + ';">($' + (amount * priceToUse).toFixed(2) + ')</span>';
            document.getElementById('periodText').textContent = getPeriodText(period, customDays);
            document.getElementById('compoundText').textContent = compoundText;
            
            // Загальна винагорода - ЗЕЛЕНИЙ TICS → ЗЕЛЕНИЙ USD
            document.getElementById('totalRewardAmount').innerHTML = grossReward.toFixed(2) + ' TICS<br><span style="font-size: 0.85em; color: ' + GREEN + ';">($' + (grossReward * priceToUse).toFixed(2) + ')</span>';
            
            // Комісія валідатора - ЖОВТИЙ TICS → ЖОВТИЙ USD
            document.getElementById('validatorCommissionAmount').innerHTML = validatorCommission.toFixed(2) + ' TICS<br><span style="font-size: 0.85em; color: ' + YELLOW + ';">($' + (validatorCommission * priceToUse).toFixed(2) + ')</span>';
            
            // Ваша винагорода (чиста) - ЗЕЛЕНИЙ TICS → ЗЕЛЕНИЙ USD
            document.getElementById('netRewardAmount').innerHTML = netReward.toFixed(2) + ' TICS<br><span style="font-size: 0.85em; color: ' + GREEN + ';">($' + (netReward * priceToUse).toFixed(2) + ')</span>';
            
            // Кінцева сума - ЗЕЛЕНИЙ TICS → ЗЕЛЕНИЙ USD
            document.getElementById('finalAmount').innerHTML = finalAmount.toFixed(2) + ' TICS<br><span style="font-size: 0.85em; color: ' + GREEN + ';">($' + (finalAmount * priceToUse).toFixed(2) + ')</span>';
            
            // FIXED: Calculate real APY based on compound frequency using NET_APY
            const NET_APY_DECIMAL = NET_APY / 100; // 28.5% -> 0.285
            let realAPY;
            if (compoundFreq === 'none') {
                realAPY = NET_APY; // 28.5% без реінвестування
            } else {
                // Формула складного відсотка: (1 + r/n)^n - 1
                // де r = NET_APY (28.5%), n = кількість компаундингів на рік
                const effectiveAPY = (Math.pow(1 + NET_APY_DECIMAL / compoundsPerYear, compoundsPerYear) - 1) * 100;
                realAPY = effectiveAPY;
            }
            document.getElementById('realAPY').textContent = realAPY.toFixed(2) + '%';
            
            if (compoundFreq !== 'none') {
                const monthlyRate = ANNUAL_RATE / 12;
                const withoutCompoundReward = amount * monthlyRate * period;
                const withoutCompoundFinal = amount + withoutCompoundReward;
                const benefit = finalAmount - withoutCompoundFinal;
                
                document.getElementById('compoundComparison').style.display = 'block';
                document.getElementById('withoutCompound').textContent = withoutCompoundFinal.toFixed(2) + ' TICS';
                document.getElementById('withoutCompoundUSD').textContent = '$' + (withoutCompoundFinal * priceToUse).toFixed(2);
                document.getElementById('withCompound').textContent = finalAmount.toFixed(2) + ' TICS';
                document.getElementById('withCompoundUSD').textContent = '$' + (finalAmount * priceToUse).toFixed(2);
                document.getElementById('compoundBenefit').innerHTML = '+' + benefit.toFixed(2) + ' TICS<br><span style="font-size: 0.85em; color: ' + GREEN + ';">($' + (benefit * priceToUse).toFixed(2) + ')</span>';
            } else {
                document.getElementById('compoundComparison').style.display = 'none';
            }
        }
        
        function getPeriodText(months, customDays) {
            if (customDays && customDays > 0) return customDays + ' days';
            if (months === 1) return '1 month';
            if (months === 3) return '3 months';
            if (months === 6) return '6 months';
            if (months === 12) return '1 year';
            if (months === 24) return '2 years';
            if (months === 36) return '3 years';
            if (months === 48) return '4 years';
            if (months === 60) return '5 years';
            return months.toFixed(1) + ' months';
        }
        
        // Fetch price from MEXC (using Cloudflare Worker)
        async function fetchTicsPrice() {
            try {
                console.log('🔄 Fetching TICS price from MEXC via Cloudflare Worker...');
                
                // Use Cloudflare Worker instead of CORS proxy
                const workerUrl = "https://tics-price.yuskivvolodymyr.workers.dev";
                
                const response = await fetch(workerUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                console.log('📊 MEXC response:', data);
                
                if (data && data.lastPrice) {
                    currentTicsPrice = parseFloat(data.lastPrice);
                    const priceElement = document.getElementById('currentPriceDisplay');
                    if (priceElement) {
                        priceElement.textContent = currentTicsPrice.toFixed(5); // 5 decimals like in sync.js
                        priceElement.style.color = '#00FFF0'; // Highlight update
                        setTimeout(() => priceElement.style.color = '', 500);
                    }
                    if (document.getElementById('calcResults').style.display !== 'none') {
                        calculateAuto();
                    }
                    console.log('✅ TICS price loaded:', currentTicsPrice);
                } else {
                    console.warn('⚠️ Invalid price data from MEXC');
                    setFallbackPrice();
                }
            } catch (error) {
                console.error('❌ Error fetching TICS price:', error);
                setFallbackPrice();
            }
        }
        
        function setFallbackPrice() {
            if (!currentTicsPrice || currentTicsPrice === 0.038) {
                currentTicsPrice = 0.038;
                document.getElementById('currentPriceDisplay').textContent = currentTicsPrice.toFixed(4);
                console.log('Using fallback price:', currentTicsPrice);
            }
        }
        
        // Fetch price on load and every 30 seconds
        fetchTicsPrice();
        setInterval(fetchTicsPrice, 30000);

/**
 * Calculator Page Initialization Script
 * Handles preset buttons and input events
 * Converted from inline events to addEventListener for CSP compliance
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Calculator Page Initialized');
    
    // Preset buttons - setAmount()
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            // Extract amount from button text (e.g., "100 TICS" -> 100)
            const text = this.textContent.trim();
            const amount = parseInt(text.replace(/[^0-9]/g, ''));
            setAmount(amount);
        });
    });
    
    // Amount input - oninput="calculateAuto()"
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.addEventListener('input', function() {
            calculateAuto();
        });
    }
    
    // Period select - onchange="usePeriod()"
    const periodSelect = document.getElementById('period');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            usePeriod();
        });
    }
    
    // Custom days input - oninput="useCustomDays()"
    const customDaysInput = document.getElementById('customDays');
    if (customDaysInput) {
        customDaysInput.addEventListener('input', function() {
            useCustomDays();
        });
    }
    
    // Custom price input - oninput="useCustomPrice()"
    const customPriceInput = document.getElementById('customPrice');
    if (customPriceInput) {
        customPriceInput.addEventListener('input', function() {
            useCustomPrice();
        });
    }
    
    // Compound frequency select - onchange="calculateAuto()"
    const compoundSelect = document.getElementById('compoundFrequency');
    if (compoundSelect) {
        compoundSelect.addEventListener('change', function() {
            calculateAuto();
        });
    }
    
    console.log('✅ Calculator event listeners attached');
});

// All calculator functions (setAmount, calculateAuto, etc.) should already exist in the HTML
// This script only adds event listeners, doesn't change any logic
