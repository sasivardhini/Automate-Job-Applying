// Popup script for LinkedIn Easy Apply Bot

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize tabs
  initTabs();

  // Load data
  await loadDashboard();
  await loadProfile();
  await loadSettings();

  // Set up event listeners
  setupEventListeners();
});

/**
 * Initialize tab navigation
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');

      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(tabName).classList.add('active');
    });
  });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Profile form
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProfile();
  });

  // Settings form
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings();
  });

  // Action buttons
  document.getElementById('apply-now-btn').addEventListener('click', applyNow);
  document.getElementById('export-btn').addEventListener('click', exportApplications);
  document.getElementById('clear-btn').addEventListener('click', clearApplications);
}

/**
 * Load dashboard data
 */
async function loadDashboard() {
  try {
    // Load statistics
    const statsResponse = await chrome.runtime.sendMessage({ action: 'getStatistics' });
    if (statsResponse.success) {
      const stats = statsResponse.data;
      document.getElementById('stat-total').textContent = stats.total;
      document.getElementById('stat-today').textContent = stats.today;
      document.getElementById('stat-applied').textContent = stats.applied;
      document.getElementById('stat-failed').textContent = stats.failed;
    }

    // Load applications list
    const appsResponse = await chrome.runtime.sendMessage({ action: 'getApplications' });
    if (appsResponse.success) {
      displayApplications(appsResponse.data);
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

/**
 * Display applications list
 */
function displayApplications(applications) {
  const listContainer = document.getElementById('applications-list');

  if (applications.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">No applications yet</div>
      </div>
    `;
    return;
  }

  // Show only last 5 applications
  const recentApps = applications.slice(0, 5);

  listContainer.innerHTML = recentApps.map(app => `
    <div class="application-item ${app.status}">
      <div class="application-title">${escapeHtml(app.jobTitle || 'Unknown Position')}</div>
      <div class="application-company">${escapeHtml(app.companyName || 'Unknown Company')}</div>
      <div class="application-meta">
        <span class="application-date">${formatDate(app.appliedAt)}</span>
        <span class="application-status ${app.status}">${app.status}</span>
      </div>
    </div>
  `).join('');
}

/**
 * Load profile data
 */
async function loadProfile() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getProfile' });
    if (response.success) {
      const profile = response.data;

      // Fill form fields
      document.getElementById('firstName').value = profile.firstName || '';
      document.getElementById('lastName').value = profile.lastName || '';
      document.getElementById('email').value = profile.email || '';
      document.getElementById('phone').value = profile.phone || '';
      document.getElementById('linkedinUrl').value = profile.linkedinUrl || '';
      document.getElementById('websiteUrl').value = profile.websiteUrl || '';
      document.getElementById('yearsExperience').value = profile.yearsExperience || '';
      document.getElementById('workAuthorization').value = profile.workAuthorization || '';
      document.getElementById('requireSponsorship').value = profile.requireSponsorship || '';
      document.getElementById('expectedSalary').value = profile.expectedSalary || '';
      document.getElementById('noticePeriod').value = profile.noticePeriod || '';
      document.getElementById('willingToRelocate').value = profile.willingToRelocate || '';
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

/**
 * Save profile data
 */
async function saveProfile() {
  try {
    const profile = {
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      linkedinUrl: document.getElementById('linkedinUrl').value,
      websiteUrl: document.getElementById('websiteUrl').value,
      yearsExperience: document.getElementById('yearsExperience').value,
      workAuthorization: document.getElementById('workAuthorization').value,
      requireSponsorship: document.getElementById('requireSponsorship').value,
      expectedSalary: document.getElementById('expectedSalary').value,
      noticePeriod: document.getElementById('noticePeriod').value,
      willingToRelocate: document.getElementById('willingToRelocate').value
    };

    const response = await chrome.runtime.sendMessage({
      action: 'saveProfile',
      data: profile
    });

    if (response.success) {
      showSuccessMessage('Profile saved successfully!');
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    alert('Error saving profile');
  }
}

/**
 * Load settings data
 */
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (response.success) {
      const settings = response.data;

      document.getElementById('autoApply').checked = settings.autoApply || false;
      document.getElementById('skipApplied').checked = settings.skipApplied !== false;
      document.getElementById('notifications').checked = settings.notifications !== false;
      document.getElementById('maxApplicationsPerDay').value = settings.maxApplicationsPerDay || 50;
      document.getElementById('applyDelay').value = settings.applyDelay || 2000;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Save settings data
 */
async function saveSettings() {
  try {
    const settings = {
      autoApply: document.getElementById('autoApply').checked,
      skipApplied: document.getElementById('skipApplied').checked,
      notifications: document.getElementById('notifications').checked,
      maxApplicationsPerDay: parseInt(document.getElementById('maxApplicationsPerDay').value),
      applyDelay: parseInt(document.getElementById('applyDelay').value)
    };

    const response = await chrome.runtime.sendMessage({
      action: 'saveSettings',
      data: settings
    });

    if (response.success) {
      showSuccessMessage('Settings saved successfully!');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Error saving settings');
  }
}

/**
 * Apply to current job
 */
async function applyNow() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('linkedin.com')) {
      alert('Please navigate to LinkedIn first');
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'applyNow' });

    if (response.success) {
      alert('Application started!');
      setTimeout(loadDashboard, 2000); // Reload dashboard after 2 seconds
    } else {
      alert(response.error || 'Could not start application');
    }
  } catch (error) {
    console.error('Error applying:', error);
    alert('Error: Make sure you are on a LinkedIn job page');
  }
}

/**
 * Export applications to CSV
 */
async function exportApplications() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'exportApplications' });

    if (response.success && response.data) {
      const csv = response.data;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedin-applications-${Date.now()}.csv`;
      a.click();

      URL.revokeObjectURL(url);

      showSuccessMessage('Applications exported!');
    } else {
      alert('No applications to export');
    }
  } catch (error) {
    console.error('Error exporting:', error);
    alert('Error exporting applications');
  }
}

/**
 * Clear all applications
 */
async function clearApplications() {
  if (!confirm('Are you sure you want to clear all application history?')) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({ action: 'clearApplications' });

    if (response.success) {
      await loadDashboard();
      showSuccessMessage('Application history cleared!');
    }
  } catch (error) {
    console.error('Error clearing applications:', error);
    alert('Error clearing applications');
  }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
  // Create or get success message element
  let msgElement = document.querySelector('.success-message');

  if (!msgElement) {
    msgElement = document.createElement('div');
    msgElement.className = 'success-message';
    const activeTab = document.querySelector('.tab-content.active');
    activeTab.insertBefore(msgElement, activeTab.firstChild);
  }

  msgElement.textContent = message;
  msgElement.classList.add('show');

  setTimeout(() => {
    msgElement.classList.remove('show');
  }, 3000);
}

/**
 * Format date
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
