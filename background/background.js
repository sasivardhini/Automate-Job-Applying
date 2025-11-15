// Background service worker for LinkedIn Easy Apply Bot

// Installation handler
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('LinkedIn Easy Apply Bot installed');

    // Initialize storage with default values
    await chrome.storage.local.set({
      settings: {
        autoApply: false,
        applyDelay: 2000,
        skipApplied: true,
        notifications: true,
        maxApplicationsPerDay: 50
      },
      userProfile: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        linkedinUrl: '',
        websiteUrl: '',
        yearsExperience: '',
        workAuthorization: '',
        requireSponsorship: '',
        expectedSalary: '',
        noticePeriod: '',
        willingToRelocate: ''
      },
      applications: [],
      commonAnswers: {}
    });

    // Open welcome page
    chrome.tabs.create({
      url: 'https://www.linkedin.com/jobs/'
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // Keep channel open for async response
});

/**
 * Handle messages
 */
async function handleMessage(request, sender, sendResponse) {
  switch (request.action) {
    case 'getProfile':
      const profile = await getProfile();
      sendResponse({ success: true, data: profile });
      break;

    case 'saveProfile':
      await saveProfile(request.data);
      sendResponse({ success: true });
      break;

    case 'getSettings':
      const settings = await getSettings();
      sendResponse({ success: true, data: settings });
      break;

    case 'saveSettings':
      await saveSettings(request.data);
      // Notify content script about settings update
      notifyContentScript('updateSettings');
      sendResponse({ success: true });
      break;

    case 'getApplications':
      const applications = await getApplications();
      sendResponse({ success: true, data: applications });
      break;

    case 'getStatistics':
      const stats = await getStatistics();
      sendResponse({ success: true, data: stats });
      break;

    case 'clearApplications':
      await chrome.storage.local.set({ applications: [] });
      sendResponse({ success: true });
      break;

    case 'exportApplications':
      const apps = await getApplications();
      const csv = convertToCSV(apps);
      sendResponse({ success: true, data: csv });
      break;

    case 'showNotification':
      if (request.title && request.message) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: request.title,
          message: request.message
        });
      }
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
}

/**
 * Get user profile
 */
async function getProfile() {
  const result = await chrome.storage.local.get('userProfile');
  return result.userProfile || {};
}

/**
 * Save user profile
 */
async function saveProfile(profile) {
  await chrome.storage.local.set({ userProfile: profile });
}

/**
 * Get settings
 */
async function getSettings() {
  const result = await chrome.storage.local.get('settings');
  return result.settings || {};
}

/**
 * Save settings
 */
async function saveSettings(settings) {
  await chrome.storage.local.set({ settings: settings });
}

/**
 * Get applications
 */
async function getApplications() {
  const result = await chrome.storage.local.get('applications');
  return result.applications || [];
}

/**
 * Get statistics
 */
async function getStatistics() {
  const applications = await getApplications();

  const today = new Date().setHours(0, 0, 0, 0);

  return {
    total: applications.length,
    applied: applications.filter(app => app.status === 'applied').length,
    failed: applications.filter(app => app.status === 'failed').length,
    skipped: applications.filter(app => app.status === 'skipped').length,
    today: applications.filter(app => {
      const appDate = new Date(app.appliedAt).setHours(0, 0, 0, 0);
      return appDate === today && app.status === 'applied';
    }).length
  };
}

/**
 * Convert applications to CSV
 */
function convertToCSV(applications) {
  if (applications.length === 0) return '';

  const headers = ['Date', 'Job Title', 'Company', 'Status', 'URL'];
  const rows = applications.map(app => [
    new Date(app.appliedAt).toLocaleDateString(),
    app.jobTitle || '',
    app.companyName || '',
    app.status || '',
    app.jobUrl || ''
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csv;
}

/**
 * Notify content script
 */
async function notifyContentScript(action) {
  const tabs = await chrome.tabs.query({ url: 'https://www.linkedin.com/*' });

  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { action: action }).catch(() => {
      // Ignore errors if content script not loaded
    });
  }
}

// Badge management
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local' && changes.applications) {
    const stats = await getStatistics();
    updateBadge(stats.today);
  }
});

/**
 * Update extension badge with daily application count
 */
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#0073b1' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Initialize badge on startup
(async () => {
  const stats = await getStatistics();
  updateBadge(stats.today);
})();
