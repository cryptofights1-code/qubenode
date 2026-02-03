/**
 * Governance Admin Panel Initialization
 * QubeNode Validator Website
 * CSP Compliant - No inline scripts
 */

const API_BASE_URL = 'https://governance.qubenode.space';

/**
 * Initialize the admin panel
 */
function init() {
    console.log('🔐 Initializing governance admin panel...');
    
    // Set default start time to now
    const now = new Date();
    document.getElementById('startTime').value = formatDateTimeLocal(now);
    
    // Set default end time to 7 days from now
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    document.getElementById('endTime').value = formatDateTimeLocal(endDate);
    
    // Setup form submission handler
    setupFormHandler();
}

/**
 * Setup form submission handler
 */
function setupFormHandler() {
    const form = document.getElementById('proposalForm');
    if (!form) {
        console.error('Proposal form not found');
        return;
    }
    
    form.addEventListener('submit', handleFormSubmit);
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const successMsg = document.getElementById('successMessage');
    const errorMsg = document.getElementById('errorMessage');
    
    // Hide previous messages
    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Creating...';
    
    try {
        // Get form data
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const startTime = new Date(document.getElementById('startTime').value).toISOString();
        const endTime = new Date(document.getElementById('endTime').value).toISOString();
        const adminSecret = document.getElementById('adminSecret').value;
        
        // Validate dates
        if (new Date(endTime) <= new Date(startTime)) {
            throw new Error('End time must be after start time');
        }
        
        // Submit to API
        const response = await fetch(`${API_BASE_URL}/api/admin/create-proposal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                description,
                startTime,
                endTime,
                adminSecret
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to create proposal');
        }
        
        // Show success message
        successMsg.textContent = `✅ Proposal #${result.proposalId} created successfully!`;
        successMsg.style.display = 'block';
        
        // Reset form
        document.getElementById('proposalForm').reset();
        
        // Reset dates to defaults
        const newNow = new Date();
        document.getElementById('startTime').value = formatDateTimeLocal(newNow);
        const newEndDate = new Date(newNow.getTime() + 7 * 24 * 60 * 60 * 1000);
        document.getElementById('endTime').value = formatDateTimeLocal(newEndDate);
        
        console.log('✅ Proposal created:', result);
        
    } catch (error) {
        console.error('Error creating proposal:', error);
        errorMsg.textContent = `❌ ${error.message}`;
        errorMsg.style.display = 'block';
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = '🗳️ Create Proposal';
    }
}

/**
 * Format date for datetime-local input
 */
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);
