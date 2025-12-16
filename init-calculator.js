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
