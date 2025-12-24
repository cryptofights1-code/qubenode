/**
 * FAQ Page - Complete Script
 * Function FIRST (global), then event listeners
 */

// GLOBAL function - defined BEFORE DOMContentLoaded
function toggleFaq(button) {
    const answer = button.nextElementSibling;
    const isActive = button.classList.contains('active');
    
    // Close all other answers
    document.querySelectorAll('.faq-question').forEach(q => {
        q.classList.remove('active');
        q.nextElementSibling.classList.remove('active');
    });
    
    // Toggle current answer
    if (!isActive) {
        button.classList.add('active');
        answer.classList.add('active');
    }
}

// Event Listeners - attached after DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ FAQ Page Initialized');
    
    const faqButtons = document.querySelectorAll('.faq-question');
    
    faqButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            toggleFaq(this);
        });
    });
    
    console.log(`✅ Added event listeners to ${faqButtons.length} FAQ questions`);
});
