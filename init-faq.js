/**
 * FAQ Page - Complete Script
 * toggleFaq function + Event Listeners
 */

// toggleFaq function - GLOBAL
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

// Event Listeners
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
