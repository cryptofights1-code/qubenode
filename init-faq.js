/**
 * FAQ Page Initialization Script
 * Handles FAQ accordion functionality
 * Converted from inline onclick to addEventListener for CSP compliance
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ FAQ Page Initialized');
    
    // Get all FAQ question buttons
    const faqButtons = document.querySelectorAll('.faq-question');
    
    // Add click event listener to each FAQ button
    faqButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            toggleFaq(this);
        });
    });
    
    console.log(`✅ Added event listeners to ${faqButtons.length} FAQ questions`);
});

// toggleFaq function should already exist in the HTML <script> section
// This init script only adds event listeners, doesn't change any logic
