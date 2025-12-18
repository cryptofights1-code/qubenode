/**
 * Ecosystem Page Initialization Script
 * Handles scroll animations using Intersection Observer
 * Converted from inline script to external file for CSP compliance
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Ecosystem Page Initialized');
    
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe all animated elements
    const animatedElements = document.querySelectorAll(
        '.animate-on-scroll, .network-image, .section-block, .column-card, .simple-text, .cta-buttons'
    );
    
    animatedElements.forEach(el => {
        observer.observe(el);
    });
    
    console.log(`✅ Observing ${animatedElements.length} animated elements`);
});
