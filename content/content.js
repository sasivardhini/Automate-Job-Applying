// Advanced LinkedIn Easy Apply Bot with full automation

class LinkedInEasyApplyBot {
  constructor() {
    this.isRunning = false;
    this.currentJobId = null;
    this.profile = null;
    this.settings = null;
    this.applicationInProgress = false;
    this.jobQueue = [];
    this.currentJobIndex = 0;
    this.retryCount = 0;
    this.maxRetries = 3;

    // ADVANCED: Analytics and tracking
    this.analytics = {
      totalAttempts: 0,
      successfulApplications: 0,
      failedApplications: 0,
      skippedJobs: 0,
      averageTimePerJob: 0,
      totalTimeSpent: 0,
      formComplexityScores: [],
      errorTypes: {}
    };

    // ADVANCED: Exponential backoff configuration
    this.retryConfig = {
      baseDelay: 2000, // Start with 2 seconds
      maxDelay: 30000, // Max 30 seconds
      multiplier: 2    // Double each time
    };

    this.init();
  }

  async init() {
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
    log('🤖 LinkedIn Easy Apply Bot - v2.0 Advanced Mode', 'success');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');

    // Show current page info
    const currentUrl = window.location.href;
    log(`📍 Current URL: ${currentUrl}`, 'info');

    if (currentUrl.includes('/jobs/search')) {
      log('✅ On LinkedIn Jobs Search page', 'success');
    } else if (currentUrl.includes('/jobs/view')) {
      log('ℹ️  On a single job view page', 'info');
    } else if (currentUrl.includes('/jobs')) {
      log('ℹ️  On LinkedIn Jobs section', 'info');
    } else {
      log('⚠️  NOT on LinkedIn Jobs page - bot may not work', 'warn');
    }

    // Load profile and settings
    await this.loadData();

    // Add control panel
    await sleep(1000);
    this.addControlPanel();

    // Start monitoring for jobs
    this.observePage();

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });

    // Auto-start if enabled
    if (this.settings.autoApply) {
      log('Auto-apply is enabled, starting automation...', 'info');
      await sleep(2000);
      this.startBatchProcessing();
    }
  }

  async loadData() {
    this.profile = await Storage.getProfile();
    this.settings = await Storage.getSettings();
    log(`Profile loaded: ${this.profile.firstName} ${this.profile.lastName}`, 'info');
  }

  /**
   * Add floating control panel to page
   */
  addControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'easy-apply-control-panel';

    // Check if profile is complete
    const profileComplete = this.profile.jobTitle && this.profile.jobTitle.trim() !== '';

    panel.innerHTML = `
      <div class="easy-apply-panel-header">
        <span>🤖 Easy Apply Bot</span>
        <button id="easy-apply-toggle" class="easy-apply-btn">
          ${this.settings.autoApply ? 'Stop' : 'Start'}
        </button>
      </div>
      <div class="easy-apply-panel-body">
        ${!profileComplete ? `
          <div class="easy-apply-steps">
            <strong>📋 Quick Steps:</strong>
            <ol class="steps-list">
              <li>Click extension icon</li>
              <li>Fill "Job Title" field</li>
              <li>Save your profile</li>
              <li>Click "Search & Apply" below</li>
            </ol>
          </div>
        ` : ''}
        <div class="easy-apply-status">
          <strong>Status:</strong> <span id="easy-apply-status">Idle</span>
        </div>
        <div class="easy-apply-activity" id="easy-apply-activity">
          <strong>Activity:</strong>
          <div id="easy-apply-activity-log" class="activity-log">
            <div class="activity-item">Waiting to start...</div>
          </div>
        </div>
        <button id="search-and-apply-btn" class="easy-apply-search-btn">🔍 Search & Apply</button>
        <div class="easy-apply-hint">💡 Open Console (F12) for detailed logs</div>
      </div>
    `;

    document.body.appendChild(panel);

    // Add toggle button listener
    document.getElementById('easy-apply-toggle').addEventListener('click', () => {
      this.toggleAutoApply();
    });

    // Add search button listener
    document.getElementById('search-and-apply-btn').addEventListener('click', () => {
      this.searchAndApply();
    });
  }

  /**
   * Add activity log message
   */
  addActivityLog(message, type = 'info') {
    const activityLog = document.getElementById('easy-apply-activity-log');
    if (!activityLog) return;

    const item = document.createElement('div');
    item.className = `activity-item activity-${type}`;
    item.textContent = `${new Date().toLocaleTimeString()}: ${message}`;

    activityLog.insertBefore(item, activityLog.firstChild);

    // Keep only last 5 messages
    while (activityLog.children.length > 5) {
      activityLog.removeChild(activityLog.lastChild);
    }
  }

  /**
   * Search LinkedIn and start applying
   */
  async searchAndApply() {
    log('Search & Apply clicked', 'info');

    // CRITICAL: Prevent multiple simultaneous clicks
    const searchBtn = document.getElementById('search-and-apply-btn');
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.textContent = '⏳ Processing...';
    }

    try {
      // CRITICAL: Check if session is expired first
      if (this.detectSessionExpired()) {
        return;
      }

      // RELOAD profile to get latest data
      await this.loadData();
      log(`Profile reloaded: Job Title = "${this.profile.jobTitle}"`, 'info');

      // Check if profile has job title
      if (!this.profile.jobTitle || this.profile.jobTitle.trim() === '') {
        showNotification('Please fill your Job Title in the Profile tab first!', 'error');
        this.addActivityLog('❌ Please set Job Title first', 'error');
        return;
      }

    showNotification(`Searching for "${this.profile.jobTitle}"...`, 'info');
    this.updateStatus('Navigating to search...');
    this.addActivityLog(`Searching: "${this.profile.jobTitle}"`, 'info');

    // Build LinkedIn search URL
    const searchParams = new URLSearchParams();
    searchParams.set('keywords', this.profile.jobTitle);

    if (this.profile.jobLocation) {
      searchParams.set('location', this.profile.jobLocation);
    }

    // Add Easy Apply filter
    searchParams.set('f_AL', 'true'); // Easy Apply filter

    // Add job type filter
    if (this.profile.jobType) {
      const jobTypeMap = {
        'remote': 'f_WT=2',
        'on-site': 'f_WT=1',
        'hybrid': 'f_WT=3'
      };
      if (jobTypeMap[this.profile.jobType]) {
        const url = `https://www.linkedin.com/jobs/search/?${searchParams.toString()}&${jobTypeMap[this.profile.jobType]}`;
        log(`Navigating to: ${url}`, 'info');
        window.location.href = url;
        return;
      }
    }

      // Navigate to search results
      const url = `https://www.linkedin.com/jobs/search/?${searchParams.toString()}`;
      log(`Navigating to: ${url}`, 'info');
      window.location.href = url;

    } catch (error) {
      log(`Error in searchAndApply: ${error.message}`, 'error');
      this.addActivityLog(`❌ Error: ${error.message}`, 'error');
      showNotification('Error starting search', 'error');
    } finally {
      // Re-enable button if we didn't navigate away
      setTimeout(() => {
        if (searchBtn) {
          searchBtn.disabled = false;
          searchBtn.textContent = '🔍 Search & Apply';
        }
      }, 2000); // Wait 2 seconds before re-enabling
    }
  }

  /**
   * Toggle auto-apply mode
   */
  async toggleAutoApply() {
    this.settings.autoApply = !this.settings.autoApply;
    await Storage.saveSettings(this.settings);

    const button = document.getElementById('easy-apply-toggle');
    button.textContent = this.settings.autoApply ? 'Stop' : 'Start';

    this.updateStatus(this.settings.autoApply ? 'Running' : 'Idle');

    if (this.settings.autoApply) {
      showNotification('Auto-apply started - Bot will process all visible jobs', 'success');
      this.startBatchProcessing();
    } else {
      // CRITICAL: Stop the bot IMMEDIATELY
      showNotification('Auto-apply stopped - Bot will halt after current step', 'info');
      this.isRunning = false;
      this.applicationInProgress = false; // Force stop current application
      this.addActivityLog('🛑 STOP requested by user', 'error');
      log('🛑 STOP button clicked - halting bot...', 'warn');
    }
  }

  /**
   * Stop auto-apply - called when stop is needed
   */
  stopAutoApply() {
    this.settings.autoApply = false;
    this.isRunning = false;
    this.applicationInProgress = false;
    this.updateStatus('Stopped');
    this.addActivityLog('🛑 Bot stopped', 'error');

    const button = document.getElementById('easy-apply-toggle');
    if (button) {
      button.textContent = 'Start';
    }
  }

  /**
   * Update status display
   */
  updateStatus(status) {
    const statusElement = document.getElementById('easy-apply-status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  /**
   * Observe page for changes
   */
  observePage() {
    const observer = new MutationObserver(() => {
      if (this.settings.autoApply && !this.applicationInProgress) {
        this.highlightEasyApplyButtons();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Highlight all Easy Apply buttons on page
   */
  highlightEasyApplyButtons() {
    const buttons = this.findAllEasyApplyButtons();
    buttons.forEach(btn => {
      if (!btn.classList.contains('easy-apply-highlighted')) {
        btn.classList.add('easy-apply-highlighted');
      }
    });
  }

  /**
   * Find all Easy Apply buttons on the page - FIXED TO AVOID FILTERS
   */
  findAllEasyApplyButtons() {
    log('🔍 Searching for ACTUAL Easy Apply buttons (not filters)...', 'info');

    const buttons = [];

    // CRITICAL: Look for Easy Apply buttons ONLY in job cards and job details
    // NOT in the filter/search bar at the top
    const jobContainers = [
      '.jobs-search-results__list',           // Job list container
      '.jobs-search-results-list',            // Alternative job list
      '.scaffold-layout__list',               // Job list scaffold
      '.jobs-details',                        // Job details panel (right side)
      '.jobs-details-top-card',              // Top card in details
      '.jobs-unified-top-card'               // Unified top card
    ];

    // Search within job containers only
    for (const containerSelector of jobContainers) {
      const container = document.querySelector(containerSelector);
      if (!container) continue;

      // Look for Easy Apply buttons using specific selectors
      const selectors = [
        'button.jobs-apply-button',
        'button.jobs-apply-button--top-card',
        'button[aria-label*="Easy Apply to"]',  // Specific to job applications
        'button.jobs-unified-top-card__job-insight-text-button'
      ];

      for (const selector of selectors) {
        try {
          const found = container.querySelectorAll(selector);
          found.forEach(btn => {
            const text = (btn.textContent || '').trim();
            const ariaLabel = btn.getAttribute('aria-label') || '';
            const classes = btn.className || '';

            // STRICT: Must be an actual Easy Apply button
            const isEasyApplyButton = (
              text.includes('Easy Apply') ||
              ariaLabel.includes('Easy Apply to')
            );

            // STRICT: Must NOT be a filter button
            const isFilterButton = (
              classes.includes('filter') ||
              classes.includes('search-reusables') ||
              btn.closest('.search-reusables__filter-list') ||
              btn.closest('.search-reusables__filter-pill-bar') ||
              btn.closest('[data-test-reusables-filters]') ||
              ariaLabel.includes('filter') ||
              ariaLabel.includes('Remove') ||
              ariaLabel.includes('Reset')
            );

            if (isEasyApplyButton && !isFilterButton && !buttons.includes(btn)) {
              log(`  ✅ Found REAL Easy Apply button: "${text}" | aria="${ariaLabel}"`, 'success');
              buttons.push(btn);
            } else if (isFilterButton) {
              log(`  ❌ SKIPPING filter button: "${text}"`, 'warn');
            }
          });
        } catch (e) {
          log(`Error searching with selector ${selector}: ${e.message}`, 'warn');
        }
      }
    }

    log(`📊 Total REAL Easy Apply buttons found: ${buttons.length}`, 'info');
    return buttons;
  }

  /**
   * Start batch processing of multiple jobs
   */
  async startBatchProcessing() {
    this.isRunning = true;
    this.updateStatus('Scanning for jobs...');

    while (this.settings.autoApply && this.isRunning) {
      // Check daily limit
      const stats = await Storage.getStatistics();
      if (stats.today >= this.settings.maxApplicationsPerDay) {
        showNotification('Daily application limit reached!', 'warn');
        this.settings.autoApply = false;
        await Storage.saveSettings(this.settings);
        break;
      }

      // Try to find and apply to a job
      const applied = await this.findAndApplyToNextJob();

      if (!applied) {
        // No more jobs on current page, try to load more
        log('No more jobs found, attempting to scroll for more...', 'info');
        await this.scrollForMoreJobs();
        await sleep(3000);

        // Check again
        const retryApplied = await this.findAndApplyToNextJob();
        if (!retryApplied) {
          log('No more jobs available, stopping...', 'warn');
          showNotification('No more jobs to apply to on this page', 'info');
          break;
        }
      }

      // Wait between applications
      await sleep(randomDelay(3000, 5000));
    }

    this.updateStatus('Idle');
    this.isRunning = false;
  }

  /**
   * Find and apply to the next available job - IMPROVED STRATEGY
   */
  async findAndApplyToNextJob() {
    log('🔍 Looking for jobs to apply to...', 'info');
    this.updateStatus('Searching for jobs...');
    this.addActivityLog('Searching for job cards...');

    // STRATEGY: Find job cards first, then look for Easy Apply button
    const jobCards = this.findJobCards();

    if (jobCards.length === 0) {
      log('❌ No job cards found, checking for single job page...', 'warn');

      // Try single job page mode - look for Easy Apply on current page
      const singleJobButton = this.findEasyApplyButtonInJobDetails();
      if (singleJobButton) {
        log('✅ Found Easy Apply button on single job page!', 'success');
        this.addActivityLog('Single job - applying...', 'info');

        const jobDetails = extractJobDetails();
        if (jobDetails && jobDetails.jobId) {
          await this.applyToJob(singleJobButton, jobDetails);
          return true;
        }
      }

      log('❌ No jobs found - please navigate to LinkedIn job search', 'error');
      this.addActivityLog('No jobs found - go to job search page', 'error');
      showNotification('Please go to LinkedIn job search page', 'error');
      return false;
    }

    log(`📋 Found ${jobCards.length} job cards`, 'info');
    this.addActivityLog(`Found ${jobCards.length} jobs on page`, 'success');

    for (let i = 0; i < jobCards.length; i++) {
      // CRITICAL: Check if user clicked STOP
      if (!this.settings.autoApply || !this.isRunning) {
        log('🛑 STOP detected - exiting job processing loop', 'warn');
        this.addActivityLog('🛑 Stopped by user', 'error');
        return false;
      }

      const jobCard = jobCards[i];

      log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info');
      log(`📌 Processing job ${i + 1}/${jobCards.length}...`, 'info');
      this.updateStatus(`Processing job ${i + 1}/${jobCards.length}...`);
      this.addActivityLog(`Processing job ${i + 1}/${jobCards.length}...`);

      // Scroll job card into view
      jobCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(1000);

      // Click the job card to open details
      log('👆 Clicking job card to view details...', 'info');
      this.addActivityLog('Opening job details...');
      await this.clickJobCard(jobCard);
      await sleep(3000); // Wait for job details to load

      // Extract job details
      const jobDetails = extractJobDetails();

      if (!jobDetails || !jobDetails.jobId) {
        log('⚠️  Could not extract job details, skipping...', 'warn');
        this.addActivityLog('Could not load job info, skipping', 'warn');
        continue;
      }

      log(`📄 Job: ${jobDetails.jobTitle} at ${jobDetails.companyName}`, 'info');
      this.addActivityLog(`Checking: ${jobDetails.jobTitle}`);

      // Check if already applied
      if (this.settings.skipApplied) {
        const wasApplied = await Storage.wasJobApplied(jobDetails.jobId);
        if (wasApplied) {
          log(`✓ Already applied to this job, skipping...`, 'info');
          this.addActivityLog('Already applied, skipping', 'info');
          continue;
        }
      }

      // NOW look for Easy Apply button in job details panel
      log('🔍 Looking for Easy Apply button in job details...', 'info');
      this.addActivityLog('Looking for Easy Apply button...');
      const easyApplyButton = this.findEasyApplyButtonInJobDetails();

      if (!easyApplyButton) {
        log('❌ No Easy Apply button found for this job, skipping...', 'warn');
        this.addActivityLog('Not an Easy Apply job, skipping', 'warn');
        continue;
      }

      log(`✅ Found Easy Apply button! Starting application...`, 'success');
      this.addActivityLog('Found Easy Apply! Starting...', 'success');

      // Apply to this job (returns true if successful)
      const applied = await this.applyToJob(easyApplyButton, jobDetails);

      if (applied) {
        // Successfully applied, return to trigger delay before next job
        return true;
      } else {
        // Failed to apply, continue to next job
        log('⚠️  Application failed, continuing to next job...', 'warn');
        this.addActivityLog('Failed, trying next job...', 'warn');
        await sleep(2000); // Brief delay before next attempt
        continue;
      }
    }

    log('No more jobs to apply to', 'warn');
    this.addActivityLog('No more jobs to apply to', 'warn');
    return false;
  }

  /**
   * Find job cards on the page - COMPREHENSIVE VERSION
   */
  findJobCards() {
    log('🔍 DEBUG: Searching for job cards with multiple selectors...', 'info');

    // Try many different selectors for LinkedIn's various layouts
    const jobListSelectors = [
      // Standard job search results
      '.jobs-search-results__list li',
      '.jobs-search-results__list-item',
      'ul.jobs-search-results__list > li',

      // Scaffold layout (newer LinkedIn design)
      '.scaffold-layout__list-container li',
      '.scaffold-layout__list li',

      // Job cards by class
      '.job-card-container',
      '.job-card-list',
      'li[class*="job-card"]',
      'li[class*="jobs-search"]',

      // Generic list items in jobs area
      'ul[class*="jobs"] li',
      'div[class*="jobs-search"] li',

      // Very broad fallback
      'li[data-occludable-job-id]',
      'li[data-job-id]'
    ];

    for (const selector of jobListSelectors) {
      try {
        const cards = document.querySelectorAll(selector);
        if (cards.length > 0) {
          log(`✅ Found ${cards.length} job cards using selector: "${selector}"`, 'success');
          this.addActivityLog(`Found ${cards.length} job cards`, 'success');
          return Array.from(cards);
        } else {
          log(`  ⚠️  No cards with selector: "${selector}"`, 'info');
        }
      } catch (e) {
        log(`  ❌ Error with selector "${selector}": ${e.message}`, 'warn');
      }
    }

    // FALLBACK: Check if we're on a single job page
    log('⚠️  No job cards found, checking if this is a single job page...', 'warn');
    const singleJobPage = document.querySelector('.jobs-details, .jobs-unified-top-card');
    if (singleJobPage) {
      log('ℹ️  This appears to be a single job page, not a search results page', 'info');
      this.addActivityLog('Single job page detected', 'warn');
      return []; // Will trigger single job mode
    }

    log('❌ Could not find any job cards on this page', 'error');
    this.addActivityLog('No jobs found - wrong page?', 'error');
    return [];
  }

  /**
   * Find Easy Apply button in the job details panel (right side)
   */
  findEasyApplyButtonInJobDetails() {
    // Look ONLY in the job details panel (right side of the screen)
    const jobDetailsSelectors = [
      '.jobs-details',
      '.jobs-details-top-card',
      '.jobs-unified-top-card',
      '.jobs-details__main-content'
    ];

    for (const selector of jobDetailsSelectors) {
      const detailsPanel = document.querySelector(selector);
      if (!detailsPanel) continue;

      // Look for Easy Apply button within this panel
      const buttonSelectors = [
        'button.jobs-apply-button',
        'button.jobs-apply-button--top-card',
        'button[aria-label*="Easy Apply"]'
      ];

      for (const btnSelector of buttonSelectors) {
        const buttons = detailsPanel.querySelectorAll(btnSelector);

        for (const btn of buttons) {
          const text = (btn.textContent || '').trim();
          const ariaLabel = btn.getAttribute('aria-label') || '';

          // Must contain "Easy Apply" and NOT be a filter
          if ((text.includes('Easy Apply') || ariaLabel.includes('Easy Apply')) &&
              !btn.closest('.search-reusables__filter-list')) {
            log(`  ✅ Found Easy Apply button: "${text}"`, 'success');
            return btn;
          }
        }
      }
    }

    return null;
  }

  /**
   * Click the job card to open job details
   */
  async clickJobCard(jobCard) {
    try {
      // Look for the job title link
      const titleLinkSelectors = [
        'a.job-card-list__title',
        'a.job-card-container__link',
        'a.disabled-ember-view',
        'a[data-control-name="job_card_title"]'
      ];

      for (const selector of titleLinkSelectors) {
        const titleLink = jobCard.querySelector(selector);
        if (titleLink) {
          log(`  Clicking job title link...`, 'info');
          await clickElement(titleLink, 500);
          return;
        }
      }

      // Fallback: click anywhere on the job card
      log(`  Clicking job card directly...`, 'info');
      await clickElement(jobCard, 500);
    } catch (e) {
      log(`⚠️  Error clicking job card: ${e.message}`, 'warn');
    }
  }

  /**
   * Scroll page to load more jobs
   */
  async scrollForMoreJobs() {
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2000);
    window.scrollTo(0, document.body.scrollHeight);
  }

  /**
   * Apply to a job
   */
  async applyToJob(button, jobDetails) {
    if (this.applicationInProgress) return false;

    this.applicationInProgress = true;
    this.currentJobId = jobDetails.jobId;
    this.updateStatus(`Applying to ${jobDetails.jobTitle}`);

    log(`Starting application for: ${jobDetails.jobTitle} at ${jobDetails.companyName}`, 'info');
    this.addActivityLog(`Applying to ${jobDetails.jobTitle}...`);

    let applicationSuccess = false;

    try {
      // Click Easy Apply button
      this.addActivityLog('Clicking Easy Apply button...');
      await clickElement(button, 1000);

      // Wait for modal to appear
      this.addActivityLog('Waiting for application form...');
      const modal = await waitForElement(SELECTORS.MODAL, 5000);

      if (!modal) {
        throw new Error('Easy Apply modal did not appear');
      }

      // Process application form
      this.addActivityLog('Filling application form...');
      const success = await this.processApplicationForm();

      if (success) {
        log('✅ Application submitted successfully!', 'success');
        showNotification(`Applied to ${jobDetails.jobTitle}`, 'success');
        this.addActivityLog(`✅ Successfully applied!`, 'success');

        await Storage.addApplication({
          ...jobDetails,
          status: APPLICATION_STATUS.APPLIED
        });

        applicationSuccess = true;
      } else {
        throw new Error('Application process failed');
      }
    } catch (error) {
      log(`❌ Application failed: ${error.message}`, 'error');
      showNotification(`Failed: ${error.message}`, 'error');
      this.addActivityLog(`❌ Failed: ${error.message}`, 'error');

      await Storage.addApplication({
        ...jobDetails,
        status: APPLICATION_STATUS.FAILED,
        error: error.message
      });

      applicationSuccess = false;
    } finally {
      this.applicationInProgress = false;
      this.currentJobId = null;
      this.updateStatus(this.settings.autoApply ? 'Running' : 'Idle');

      // Close modal if still open
      await this.closeModal();
    }

    return applicationSuccess;
  }

  /**
   * Process application form through all steps - ADVANCED VERSION
   */
  async processApplicationForm() {
    let currentStep = 0;
    const maxSteps = 15;
    let lastFormState = '';

    log('Starting advanced form processing...', 'info');

    while (currentStep < maxSteps) {
      await sleep(randomDelay(500, 800)); // SPEED FIX: Reduced from 1500-2500

      // CRITICAL: Check if user clicked STOP
      if (!this.settings.autoApply || !this.isRunning || !this.applicationInProgress) {
        log('🛑 STOP detected - exiting form processing', 'warn');
        this.addActivityLog('🛑 Stopped by user during form fill', 'error');
        await this.closeModal();
        return false;
      }

      // CRITICAL: Check if session expired
      if (this.detectSessionExpired()) {
        throw new Error('Session expired');
      }

      // IMPORTANT: Check for "Save application" dialog and handle it
      await this.handleSaveApplicationDialog();

      // Get current form state
      const currentFormState = this.getFormState();

      // Check if we're stuck in a loop
      if (currentFormState === lastFormState && currentStep > 0) {
        log('Form state unchanged, attempting recovery...', 'warn');

        // Try clicking any enabled primary button (but not preferences/save)
        const anyButton = this.findSafeActionButton();
        if (anyButton) {
          log('Found safe action button, clicking...', 'info');
          await clickElement(anyButton, 2000);
          currentStep++;
          continue;
        } else {
          log('No action buttons found, form may be complete or stuck', 'warn');
          break;
        }
      }

      lastFormState = currentFormState;

      // Fill all fields on current page
      await this.fillCurrentForm();

      // IMPORTANT: Scroll modal to reveal buttons at bottom (Review, Next, Submit)
      await this.scrollModalToBottom();

      // Wait for any validation or dynamic content
      await sleep(500); // SPEED FIX: Reduced from 1500

      // CRITICAL: Check for form validation errors
      const validationErrors = this.detectFormValidationErrors();
      if (validationErrors.length > 0) {
        log(`⚠️  Found ${validationErrors.length} validation errors, trying to fix...`, 'warn');

        // Try to fill unfilled required fields
        const requiredFields = this.findUnfilledRequiredFields();
        if (requiredFields.length > 0) {
          log(`  Attempting to fill ${requiredFields.length} required fields...`, 'info');
          for (const field of requiredFields) {
            await this.fillFieldIntelligent(field);
            await sleep(randomDelay(100, 200)); // SPEED FIX: Reduced from 300-600
          }

          // Wait and check errors again
          await sleep(500); // SPEED FIX: Reduced from 1500
          const remainingErrors = this.detectFormValidationErrors();

          if (remainingErrors.length > 0 && remainingErrors.length >= validationErrors.length) {
            // Errors persist - might be unfixable
            log(`  ⚠️  Still ${remainingErrors.length} errors after retry - continuing anyway`, 'warn');
            this.addActivityLog(`⚠️ Form errors persisting`, 'warn');
          } else if (remainingErrors.length === 0) {
            log(`  ✅ All validation errors fixed!`, 'success');
          }
        }
      }

      // Look for Submit button (final step)
      const submitButton = this.findButtonAdvanced(['Submit application', 'Submit', 'submit']);
      if (submitButton && !submitButton.disabled) {
        log('Found SUBMIT button - Submitting application!', 'success');
        await clickElement(submitButton, 3000);

        // Wait to confirm submission
        await sleep(3000);

        // Check for success confirmation
        if (this.checkSubmissionSuccess()) {
          log('Application submitted successfully!', 'success');
          return true;
        }
      }

      // Look for Review button
      const reviewButton = this.findButtonAdvanced(['Review', 'Review your application', 'review']);
      if (reviewButton && !reviewButton.disabled && !reviewButton.getAttribute('aria-disabled')) {
        log('Found REVIEW button, clicking...', 'info');
        this.addActivityLog('Clicking Review button...', 'info');
        await clickElement(reviewButton, 2000);
        currentStep++;
        continue;
      }

      // Look for Next/Continue button
      const nextButton = this.findButtonAdvanced(['Next', 'Continue', 'next', 'continue']);
      if (nextButton && !nextButton.disabled && !nextButton.getAttribute('aria-disabled')) {
        log('Found NEXT button, moving to next step...', 'info');
        this.addActivityLog('Clicking Next button...', 'info');
        await clickElement(nextButton, 2000);
        currentStep++;
        continue;
      }

      // Check if there are required fields preventing progress
      const requiredFields = this.findUnfilledRequiredFields();
      if (requiredFields.length > 0) {
        log(`Found ${requiredFields.length} unfilled required fields, attempting to fill...`, 'warn');
        for (const field of requiredFields) {
          await this.fillFieldIntelligent(field);
        }
        await sleep(1000);
        continue;
      }

      // If we've processed but no buttons found, might be done
      log('No more action buttons found, checking completion...', 'info');

      // Final attempt - look for ANY clickable button that might advance
      const fallbackButton = this.findFallbackActionButton();
      if (fallbackButton) {
        log('Found fallback button, attempting click...', 'info');
        await clickElement(fallbackButton, 2000);
        currentStep++;
        continue;
      }

      break;
    }

    log('Form processing completed or maxed out', 'warn');
    return false;
  }

  /**
   * Handle "Save this application?" dialog - ULTRA AGGRESSIVE VERSION
   */
  async handleSaveApplicationDialog() {
    // Check if the save dialog is present
    const pageText = document.body.textContent;

    // CRITICAL: Handle "Remove from your application?" dialog - NEVER click Remove!
    if (pageText.includes('Remove from your application?') ||
        pageText.includes('This will not affect your LinkedIn profile')) {

      log('🚨 DETECTED "Remove from application" dialog - clicking CANCEL!', 'warn');

      const modals = document.querySelectorAll('.artdeco-modal, [role="dialog"]');

      for (const modal of modals) {
        const modalText = modal.textContent || '';

        if (modalText.includes('Remove from your application')) {
          const allButtons = modal.querySelectorAll('button');

          for (const button of allButtons) {
            const btnText = (button.textContent || '').toLowerCase().trim();

            // Click CANCEL, not Remove
            if (btnText.includes('cancel')) {
              log(`✅ Clicking CANCEL to keep application data`, 'success');
              button.click();
              await sleep(1000);
              return true;
            }
          }

          // If no Cancel found, press ESC
          log('Pressing ESC to cancel removal...', 'warn');
          document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true
          }));
          await sleep(1000);
          return true;
        }
      }
    }

    if (pageText.includes('Save this application?') ||
        pageText.includes('your application will be discarded') ||
        pageText.includes('Any uploaded files will not be saved')) {

      // CRITICAL: Only handle if we're NOT actively filling an application
      // If application is in progress and user hasn't clicked stop, KEEP the dialog open!
      if (this.applicationInProgress && this.settings.autoApply) {
        log('ℹ️  "Save application" dialog detected, but application IN PROGRESS - IGNORING for now', 'info');
        return false; // Don't handle it yet!
      }

      log('🚨 DETECTED "Save application" dialog - DISCARDING (application stopped or complete)...', 'warn');

      // Find ALL possible modals
      const modalSelectors = [
        '.artdeco-modal',
        '[role="dialog"]',
        '[data-test-modal]',
        '.artdeco-modal-overlay',
        'div[aria-labelledby]'
      ];

      for (const selector of modalSelectors) {
        const modals = document.querySelectorAll(selector);

        for (const modal of modals) {
          const modalText = modal.textContent || '';

          // Check if this is the save dialog
          if (modalText.includes('Save this application') ||
              modalText.includes('your application will be discarded')) {

            log('✅ Found save dialog modal!', 'info');

            // Strategy 1: Look for Discard/Don't Save buttons
            const allButtons = modal.querySelectorAll('button');
            log(`Found ${allButtons.length} buttons in modal`, 'info');

            // Check all buttons and log them
            for (const button of allButtons) {
              const btnText = (button.textContent || '').toLowerCase().trim();
              const btnLabel = (button.getAttribute('aria-label') || '').toLowerCase();
              const btnDataControl = button.getAttribute('data-control-name') || '';

              log(`  Button: text="${btnText}" | label="${btnLabel}" | data-control="${btnDataControl}"`, 'info');

              // Look for Discard/Don't Save with many variations
              if (btnText.includes('discard') ||
                  btnLabel.includes('discard') ||
                  btnText.includes("don't save") ||
                  btnText.includes('do not save') ||
                  btnText.includes('dont save') ||
                  btnText.includes('no') ||
                  btnDataControl.includes('discard')) {

                log(`🎯 Found DISCARD button: "${btnText}", clicking NOW...`, 'success');
                button.click();
                await sleep(200); // SPEED FIX: Reduced from 500
                button.click(); // Double click for safety
                await sleep(500); // SPEED FIX: Reduced from 2000
                return true;
              }
            }

            // Strategy 2: Click any SECONDARY button (not primary)
            log('Strategy 2: Looking for secondary button...', 'warn');
            for (const button of allButtons) {
              const classes = button.className || '';
              const btnText = (button.textContent || '').toLowerCase().trim();

              // Skip "Save" buttons
              if (btnText.includes('save')) {
                log(`  Skipping Save button: "${btnText}"`, 'info');
                continue;
              }

              // Click secondary buttons
              if (classes.includes('secondary') || classes.includes('tertiary')) {
                log(`🎯 Clicking secondary button: "${btnText}"`, 'success');
                button.click();
                await sleep(200); // SPEED FIX: Reduced from 500
                button.click();
                await sleep(500); // SPEED FIX: Reduced from 2000
                return true;
              }
            }

            // Strategy 3: Click the LAST button (often Discard/Cancel)
            log('Strategy 3: Clicking last button in modal...', 'warn');
            if (allButtons.length >= 2) {
              const lastButton = allButtons[allButtons.length - 1];
              const btnText = (lastButton.textContent || '').toLowerCase().trim();

              // Only if it's not "Save"
              if (!btnText.includes('save')) {
                log(`🎯 Clicking last button: "${btnText}"`, 'success');
                lastButton.click();
                await sleep(200); // SPEED FIX: Reduced from 500
                lastButton.click();
                await sleep(500); // SPEED FIX: Reduced from 2000
                return true;
              }
            }

            // Strategy 4: Close button (X)
            log('Strategy 4: Looking for close/dismiss button...', 'warn');
            const closeSelectors = [
              'button[aria-label*="Dismiss"]',
              'button[aria-label*="dismiss"]',
              'button[aria-label*="Close"]',
              'button[aria-label*="close"]',
              'button.artdeco-modal__dismiss',
              'button[data-test-modal-close-btn]'
            ];

            for (const closeSelector of closeSelectors) {
              const closeBtn = modal.querySelector(closeSelector);
              if (closeBtn) {
                log(`🎯 Clicking close button`, 'success');
                closeBtn.click();
                await sleep(200); // SPEED FIX: Reduced from 500
                closeBtn.click();
                await sleep(500); // SPEED FIX: Reduced from 2000
                return true;
              }
            }
          }
        }
      }

      // Strategy 5: AGGRESSIVE ESC key (multiple times)
      log('🚨 LAST RESORT: Pressing ESC multiple times...', 'warn');
      for (let i = 0; i < 5; i++) {
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true
        }));
        await sleep(200);
      }
      await sleep(1000);
      return true;
    }

    return false;
  }

  /**
   * Scroll modal to bottom to reveal hidden buttons (Review, Next, Submit)
   */
  async scrollModalToBottom() {
    try {
      // Find the scrollable container in the Easy Apply modal
      const scrollContainers = [
        '.jobs-easy-apply-modal__content',
        '.jobs-easy-apply-content',
        '[data-test-modal-content]',
        '.artdeco-modal__content',
        '.jobs-easy-apply-modal'
      ];

      for (const selector of scrollContainers) {
        const container = document.querySelector(selector);
        if (container) {
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;

          // Check if container is scrollable
          if (scrollHeight > clientHeight) {
            log(`📜 Scrolling modal container to reveal buttons...`, 'info');

            // Scroll to bottom smoothly
            container.scrollTo({
              top: scrollHeight,
              behavior: 'smooth'
            });

            await sleep(400); // Wait for scroll to complete
            log(`✅ Scrolled to bottom`, 'success');
            return;
          }
        }
      }

      log('ℹ️  No scrollable container found or already at bottom', 'info');
    } catch (error) {
      log(`Error scrolling modal: ${error.message}`, 'warn');
    }
  }

  /**
   * Find safe action button (avoids clicking wrong buttons) - ULTRA STRICT
   */
  findSafeActionButton() {
    log('🔍 Looking for safe action button...', 'info');

    // ULTRA STRICT avoid list - same as findButtonAdvanced
    const avoidTexts = [
      'save',
      'saved',
      'preferences',
      'preference',
      'match',
      'matching',
      'matches',
      'cancel',
      'close',
      'back',
      'dismiss',
      'skip',
      'later',
      'filter',
      'filters',
      'sort',
      'view',
      'see',
      'show',
      'salary',
      'remote',
      'full-time',
      'part-time',
      'hybrid',
      'remove',
      'delete',
      'clear',
      'edit',
      'update',
      'change',
      'upload',
      'browse',
      'add another',
      'add more',
      '+ add',
      'apply filters',
      'reset filters',
      'date posted',
      'experience level',
      'company',
      'job type',
      'benefits',
      'industry'
    ];

    // Only search in modal footer (most restrictive)
    const footerSelectors = [
      '.jobs-easy-apply-modal__footer',
      '.artdeco-modal__footer',
      '[data-test-modal-footer]'
    ];

    let footer = null;
    for (const selector of footerSelectors) {
      footer = document.querySelector(selector);
      if (footer) break;
    }

    // Fallback to full modal
    if (!footer) {
      footer = document.querySelector('.jobs-easy-apply-modal, [data-test-modal], .artdeco-modal');
    }

    if (!footer) {
      log('🚫 No modal found for safe button search', 'error');
      return null;
    }

    const buttons = footer.querySelectorAll('button');
    log(`Found ${buttons.length} buttons in modal`, 'info');

    // Try to find primary button first
    for (const button of buttons) {
      if (button.disabled) continue;

      const buttonText = (button.textContent || '').toLowerCase().trim();
      const buttonLabel = (button.getAttribute('aria-label') || '').toLowerCase().trim();
      const combinedText = `${buttonText} ${buttonLabel}`;

      log(`  Checking button: "${buttonText}"`, 'info');

      // STRICT: Skip buttons we want to avoid
      if (avoidTexts.some(avoid => combinedText.includes(avoid))) {
        log(`    ❌ SKIPPING unsafe button: "${buttonText}"`, 'warn');
        continue;
      }

      // Only click visible buttons
      const style = window.getComputedStyle(button);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        // Prefer primary buttons
        if (button.classList.contains('artdeco-button--primary')) {
          log(`    ✅ Found safe primary button: "${buttonText}"`, 'success');
          return button;
        }
      }
    }

    // If no primary button, return any safe button
    for (const button of buttons) {
      if (button.disabled) continue;

      const buttonText = (button.textContent || '').toLowerCase().trim();
      const buttonLabel = (button.getAttribute('aria-label') || '').toLowerCase().trim();
      const combinedText = `${buttonText} ${buttonLabel}`;

      if (avoidTexts.some(avoid => combinedText.includes(avoid))) {
        continue;
      }

      const style = window.getComputedStyle(button);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        log(`    ✅ Found safe button: "${buttonText}"`, 'success');
        return button;
      }
    }

    log('❌ No safe button found', 'warn');
    return null;
  }

  /**
   * Get current form state for loop detection
   */
  getFormState() {
    const modal = document.querySelector('.jobs-easy-apply-modal, [data-test-modal]');
    if (!modal) return '';
    return modal.innerHTML.substring(0, 500);
  }

  /**
   * Check if submission was successful
   */
  checkSubmissionSuccess() {
    const successIndicators = [
      'Application sent',
      'Application submitted',
      'Your application was sent',
      'successfully applied',
      'Application complete'
    ];

    const pageText = document.body.textContent;
    return successIndicators.some(indicator =>
      pageText.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Find buttons with advanced logic - ULTRA STRICT (avoids wrong buttons)
   */
  findButtonAdvanced(textOptions) {
    log(`🔍 Searching for buttons: ${textOptions.join(', ')}`, 'info');

    // ULTRA STRICT avoid list - expanded with more variations
    const avoidWords = [
      'preferences',
      'preference',
      'match',
      'matching',
      'matches',
      'save',
      'saved',
      'cancel',
      'back',
      'dismiss',
      'skip',
      'later',
      'filter',
      'filters',
      'sort',
      'view',
      'see',
      'show',
      'salary',
      'remote',
      'full-time',
      'part-time',
      'hybrid',
      'remove',
      'delete',
      'clear',
      'edit',
      'update',
      'change',
      'upload',
      'browse',
      'add another',
      'add more',
      '+ add',
      'apply filters',
      'reset filters',
      'date posted',
      'experience level',
      'company',
      'job type',
      'benefits',
      'industry'
    ];

    // CRITICAL: Only search within Easy Apply modal footer/actions
    // This is even more restrictive to avoid page-level buttons
    const modalFooterSelectors = [
      '.jobs-easy-apply-modal__footer',
      '.jobs-easy-apply-modal footer',
      '.artdeco-modal__footer',
      '.artdeco-modal footer',
      '[data-test-modal-footer]'
    ];

    let searchContainer = null;

    // Try to find modal footer first (most restrictive)
    for (const selector of modalFooterSelectors) {
      searchContainer = document.querySelector(selector);
      if (searchContainer) {
        log(`Found modal footer: ${selector}`, 'info');
        break;
      }
    }

    // Fallback to full modal
    if (!searchContainer) {
      const modalSelectors = [
        '.jobs-easy-apply-modal',
        '[data-test-modal="jobs-easy-apply-modal"]',
        '.artdeco-modal[role="dialog"]'
      ];

      for (const selector of modalSelectors) {
        searchContainer = document.querySelector(selector);
        if (searchContainer) {
          log(`Found modal: ${selector}`, 'info');
          break;
        }
      }
    }

    // CRITICAL: If no modal found, DO NOT search - prevents wrong clicks
    if (!searchContainer) {
      log('🚫 NO MODAL FOUND - Refusing to search to prevent wrong clicks!', 'error');
      return null;
    }

    // Get all buttons in the container
    const allButtons = searchContainer.querySelectorAll('button, [role="button"], input[type="submit"]');
    log(`Found ${allButtons.length} buttons in container`, 'info');

    // Check each button
    for (const button of allButtons) {
      const buttonText = (button.textContent || '').toLowerCase().trim();
      const buttonLabel = (button.getAttribute('aria-label') || '').toLowerCase().trim();
      const buttonDataControl = (button.getAttribute('data-control-name') || '').toLowerCase();
      const combinedText = `${buttonText} ${buttonLabel} ${buttonDataControl}`;

      log(`  Checking button: "${buttonText}" | aria-label="${buttonLabel}"`, 'info');

      // ULTRA STRICT: Skip if button contains ANY avoid words
      const avoidedWord = avoidWords.find(word => combinedText.includes(word));
      if (avoidedWord) {
        log(`    ❌ SKIPPING - Contains avoided word "${avoidedWord}": "${buttonText}"`, 'warn');
        continue;
      }

      // Skip disabled buttons
      if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
        log(`    ❌ SKIPPING - Button is disabled: "${buttonText}"`, 'warn');
        continue;
      }

      // ULTRA STRICT: Skip buttons that are in sidebars/headers (not in modal body/footer)
      const buttonParent = button.closest('[class*="sidebar"], [class*="header"], [class*="nav"]');
      if (buttonParent && !buttonParent.closest('.jobs-easy-apply-modal')) {
        log(`    ❌ SKIPPING - Button is in sidebar/header: "${buttonText}"`, 'warn');
        continue;
      }

      // Check if this button matches what we're looking for
      for (const searchText of textOptions) {
        if (combinedText.includes(searchText.toLowerCase())) {
          // Make sure it's visible and enabled
          const style = window.getComputedStyle(button);
          if (style.display !== 'none' && style.visibility !== 'hidden' && !button.disabled) {
            log(`    ✅ FOUND MATCHING BUTTON: "${buttonText}" for "${searchText}"`, 'success');
            return button;
          } else {
            log(`    ⚠️  Button matches but is hidden/disabled: "${buttonText}"`, 'warn');
          }
        }
      }
    }

    log(`❌ No button found for: ${textOptions.join(', ')}`, 'warn');
    return null;
  }

  /**
   * Find any enabled action button
   */
  findAnyActionButton() {
    const buttons = document.querySelectorAll('.jobs-easy-apply-modal button, [data-test-modal] button');

    for (const button of buttons) {
      if (!button.disabled) {
        const style = window.getComputedStyle(button);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          return button;
        }
      }
    }

    return null;
  }

  /**
   * Find fallback action button
   */
  findFallbackActionButton() {
    const selectors = [
      'button[aria-label*="Continue"]',
      'button[aria-label*="Next"]',
      'button[aria-label*="Submit"]',
      'button.artdeco-button--primary',
      '.jobs-easy-apply-modal button[type="submit"]'
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button && !button.disabled) {
        return button;
      }
    }

    return null;
  }

  /**
   * Find unfilled required fields
   */
  findUnfilledRequiredFields() {
    const fields = [];
    const requiredInputs = document.querySelectorAll('input[required], select[required], textarea[required], [aria-required="true"]');

    for (const input of requiredInputs) {
      if (!input.value || input.value.trim() === '') {
        fields.push(input);
      }
    }

    return fields;
  }

  /**
   * Fill field with intelligent fallback values - ENHANCED
   */
  async fillFieldIntelligent(field) {
    const label = getFieldLabel(field) || field.name || '';
    const fieldType = field.tagName.toLowerCase();
    log(`🔧 Intelligently filling required field: ${label} (${fieldType})`, 'info');

    // Try normal fill first
    if (fieldType === 'textarea') {
      await this.fillTextarea(field);
    } else if (fieldType === 'select') {
      await this.fillSelect(field);
    } else {
      await this.fillField(field);
    }

    // If still empty after trying to fill, use aggressive fallbacks
    if (!field.value || field.value.trim() === '') {
      log(`  ⚠️  Field still empty, using aggressive fallback...`, 'warn');

      if (fieldType === 'select') {
        // Select first non-empty option
        const options = Array.from(field.options);
        for (const opt of options) {
          if (opt.value && opt.value !== '' && opt.value !== 'Select') {
            field.value = opt.value;
            field.selectedIndex = opt.index;
            field.dispatchEvent(new Event('change', { bubbles: true }));
            log(`  ✅ Auto-selected: "${opt.text}"`, 'success');
            return true;
          }
        }
      } else if (field.type === 'number') {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('year') || lowerLabel.includes('experience')) {
          field.value = '2';
        } else {
          field.value = '0';
        }
        field.dispatchEvent(new Event('input', { bubbles: true }));
        log(`  ✅ Filled number field with: ${field.value}`, 'success');
        return true;
      } else if (fieldType === 'textarea') {
        field.value = 'I am very interested in this position and believe my skills and experience make me a strong candidate for this role.';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        log(`  ✅ Filled textarea with default text`, 'success');
        return true;
      } else {
        field.value = 'N/A';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        log(`  ✅ Filled with: "N/A"`, 'success');
        return true;
      }
    }

    return true;
  }

  /**
   * Fill textarea (for essay/paragraph questions)
   */
  async fillTextarea(textarea) {
    const label = getFieldLabel(textarea) || '';
    log(`📝 Filling textarea: ${label}`, 'info');

    // Detect question type
    const questionType = detectQuestionType(label);
    let value = '';

    if (questionType) {
      value = await Storage.getAnswerForQuestion(questionType, this.profile);
    }

    // If no specific answer, use a generic professional response
    if (!value) {
      const lowerLabel = label.toLowerCase();

      if (lowerLabel.includes('why') && lowerLabel.includes('work')) {
        value = 'I am excited about this opportunity and believe my skills and experience align well with your team\'s needs. I am eager to contribute to your company\'s success.';
      } else if (lowerLabel.includes('cover letter')) {
        value = 'I am writing to express my strong interest in this position. With my background and skills, I am confident I would be a valuable addition to your team. I look forward to the opportunity to discuss how I can contribute to your organization.';
      } else if (lowerLabel.includes('about yourself') || lowerLabel.includes('tell us about')) {
        value = `I am a dedicated professional with ${this.profile.yearsExperience || '5'} years of experience. I am passionate about my work and committed to delivering high-quality results.`;
      } else {
        value = 'I am very interested in this position and believe my skills and experience make me a strong candidate for this role.';
      }
    }

    if (value) {
      await fillInput(textarea, value);
      log(`  ✅ Filled textarea`, 'success');
    }
  }

  /**
   * Fill current form page - ADVANCED VERSION
   */
  async fillCurrentForm() {
    log('Filling current form page (Advanced Mode)...', 'info');

    // Try multiple container selectors
    const containers = document.querySelectorAll('.jobs-easy-apply-content, .jobs-easy-apply-modal__content, form, [data-test-modal-content]');
    const formContainer = containers[containers.length - 1]; // Get most recent/nested

    if (!formContainer) {
      log('No form container found', 'warn');
      return;
    }

    // Get ALL form fields
    const allInputs = formContainer.querySelectorAll('input:not([type="hidden"]), select, textarea');
    log(`Found ${allInputs.length} total form fields`, 'info');

    for (const field of allInputs) {
      const fieldType = field.tagName.toLowerCase();
      const inputType = field.type;

      // Skip if already filled
      if (field.value && field.value.trim() !== '' && inputType !== 'radio' && inputType !== 'checkbox') {
        continue;
      }

      try {
        if (inputType === 'file') {
          // CRITICAL: Handle file uploads (resume, cover letter)
          await this.handleFileUpload(field);
        } else if (inputType === 'radio') {
          // Handle radio buttons
          if (!field.checked) {
            const name = field.name;
            const radioGroup = formContainer.querySelectorAll(`input[type="radio"][name="${name}"]`);
            await this.fillRadioGroup(Array.from(radioGroup));
          }
        } else if (inputType === 'checkbox') {
          // Handle checkboxes
          await this.fillCheckbox(field);
        } else if (fieldType === 'textarea') {
          // Handle textarea (essay questions)
          await this.fillTextarea(field);
        } else if (fieldType === 'select') {
          // Handle dropdowns
          await this.fillSelect(field);
        } else {
          // Handle text inputs, email, phone, number, etc.
          await this.fillField(field);
        }

        await sleep(randomDelay(50, 150)); // SPEED FIX: Reduced from 100-300
      } catch (error) {
        log(`Error filling field: ${error.message}`, 'warn');
      }
    }

    log('Finished filling form fields', 'success');
  }

  /**
   * Fill a form field based on its label - ADVANCED VERSION
   */
  async fillField(field) {
    const label = getFieldLabel(field);
    const fieldType = field.type || 'text';
    const fieldName = field.name || '';

    if (!label && !fieldName) {
      log('  ⚠️  No label or name for field, skipping...', 'warn');
      return;
    }

    log(`📝 Filling field: ${label || fieldName} (type: ${fieldType})`, 'info');

    // Skip if already filled (except for hidden fields)
    if (field.value && field.value.trim() !== '' && fieldType !== 'hidden') {
      log(`  ✓ Already filled: "${field.value}"`, 'info');
      return;
    }

    // Detect question type
    const questionType = detectQuestionType(label || fieldName);

    let value = '';

    if (questionType) {
      value = await Storage.getAnswerForQuestion(questionType, this.profile);
    }

    // Field-specific mappings
    const lowerLabel = (label || fieldName).toLowerCase();

    if (!value) {
      if (lowerLabel.includes('first name') || lowerLabel.includes('firstname') || lowerLabel.includes('given name')) {
        value = this.profile.firstName;
      } else if (lowerLabel.includes('last name') || lowerLabel.includes('lastname') || lowerLabel.includes('family name') || lowerLabel.includes('surname')) {
        value = this.profile.lastName;
      } else if (lowerLabel.includes('full name') || lowerLabel.includes('name') && !lowerLabel.includes('company')) {
        value = `${this.profile.firstName} ${this.profile.lastName}`;
      } else if (lowerLabel.includes('email')) {
        value = this.profile.email;
      } else if (lowerLabel.includes('phone') || lowerLabel.includes('mobile') || lowerLabel.includes('telephone')) {
        value = this.profile.phone;
      } else if (lowerLabel.includes('linkedin')) {
        value = this.profile.linkedinUrl;
      } else if (lowerLabel.includes('website') || lowerLabel.includes('portfolio') || lowerLabel.includes('url')) {
        value = this.profile.websiteUrl;
      } else if (lowerLabel.includes('city') || lowerLabel.includes('location') || lowerLabel.includes('address')) {
        value = this.profile.jobLocation || '';
      } else if (fieldType === 'number' && lowerLabel.includes('year')) {
        value = '5'; // Default years of experience
      } else if (fieldType === 'number') {
        value = '0'; // Default for other number fields
      }
    }

    if (value) {
      await fillInput(field, value);
      log(`  ✅ Filled with: "${value}"`, 'success');
    } else {
      log(`  ⚠️  No value found for field: ${label || fieldName}`, 'warn');
    }
  }

  /**
   * Fill select dropdown - ADVANCED VERSION
   */
  async fillSelect(select) {
    const label = getFieldLabel(select);
    if (!label) {
      log('  ⚠️  No label found for select, trying to fill anyway...', 'warn');
    }

    log(`📝 Filling dropdown: ${label || 'unlabeled'}`, 'info');

    const options = Array.from(select.options);
    log(`  Found ${options.length} options in dropdown`, 'info');

    // Log all options for debugging
    options.forEach((opt, idx) => {
      log(`    Option ${idx}: text="${opt.text}" value="${opt.value}"`, 'info');
    });

    // Skip if already selected (not the placeholder)
    if (select.value && select.value !== '' && select.value !== 'Select' && select.selectedIndex > 0) {
      log(`  ✓ Already selected: "${select.options[select.selectedIndex].text}"`, 'info');
      return;
    }

    // Try to match based on question type
    const questionType = detectQuestionType(label || '');
    if (questionType) {
      const value = await Storage.getAnswerForQuestion(questionType, this.profile);
      if (value) {
        log(`  Detected question type: ${questionType}, trying to select: "${value}"`, 'info');

        // Try exact match first
        for (let i = 0; i < options.length; i++) {
          const optionText = (options[i].text || '').trim().toLowerCase();
          const valueToMatch = value.toLowerCase();

          if (optionText === valueToMatch || optionText.includes(valueToMatch) || valueToMatch.includes(optionText)) {
            select.selectedIndex = i;
            select.value = options[i].value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('blur', { bubbles: true }));
            log(`  ✅ Selected matched option: "${options[i].text}"`, 'success');
            await sleep(100);
            return;
          }
        }
      }
    }

    // AGGRESSIVE FALLBACK: Select first non-empty, non-placeholder option
    log(`  Using fallback: selecting first valid option...`, 'warn');
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const optionText = (option.text || '').trim().toLowerCase();
      const optionValue = (option.value || '').trim();

      // Skip placeholder options
      if (!optionValue ||
          optionValue === '' ||
          optionValue === 'Select' ||
          optionValue === 'select' ||
          optionText === 'select' ||
          optionText === 'select an option' ||
          optionText === 'choose' ||
          optionText === 'choose an option' ||
          optionText === 'please select' ||
          optionText === '--' ||
          optionText === '- select -' ||
          optionText.startsWith('select ') ||
          optionText.startsWith('choose ')) {
        log(`    Skipping placeholder option: "${optionText}"`, 'info');
        continue;
      }

      // ALWAYS SELECT THE FIRST VALID OPTION - NEVER LEAVE EMPTY!
      select.selectedIndex = i;
      select.value = optionValue;

      // Trigger ALL events to ensure LinkedIn recognizes the selection
      select.focus();
      select.dispatchEvent(new Event('focus', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('blur', { bubbles: true }));

      log(`  ✅ FORCE-selected first valid option: "${option.text}"`, 'success');
      await sleep(150);
      return;
    }

    log(`  ❌ ERROR: Could not find ANY valid option in dropdown!`, 'error');
  }

  /**
   * Get radio button groups
   */
  getRadioGroups(container) {
    const radios = container.querySelectorAll(SELECTORS.RADIO);
    const groups = {};

    radios.forEach(radio => {
      const name = radio.name;
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(radio);
    });

    return groups;
  }

  /**
   * Fill radio button group
   */
  async fillRadioGroup(radios) {
    if (radios.length === 0) return;

    const label = getFieldLabel(radios[0]);
    log(`Filling radio group: ${label}`, 'info');

    const questionType = detectQuestionType(label);
    if (questionType) {
      const answer = await Storage.getAnswerForQuestion(questionType, this.profile);

      if (answer) {
        // Try to find matching radio button
        for (const radio of radios) {
          const radioLabel = getFieldLabel(radio);
          if (radioLabel.toLowerCase().includes(answer.toLowerCase())) {
            await clickElement(radio);
            return;
          }
        }
      }
    }

    // Default: select first option
    if (radios[0]) {
      await clickElement(radios[0]);
    }
  }

  /**
   * Fill checkbox - ENHANCED with required checkbox support
   */
  async fillCheckbox(checkbox) {
    const label = getFieldLabel(checkbox);
    const lowerLabel = label.toLowerCase();
    const isRequired = checkbox.required || checkbox.hasAttribute('required') || checkbox.getAttribute('aria-required') === 'true';

    log(`Found checkbox: ${label} (required: ${isRequired})`, 'info');

    // CRITICAL FIX: Check REQUIRED checkboxes even if they're terms/conditions
    if (isRequired) {
      if (!checkbox.checked) {
        log(`  ✅ Checking REQUIRED checkbox: "${label}"`, 'success');
        checkbox.click();
        await sleep(randomDelay(100, 200)); // SPEED FIX: Reduced from 200-400

        // Dispatch change event for React/Angular
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        checkbox.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      // For optional checkboxes, be conservative
      // Only check if it's clearly beneficial (e.g., "Would you like updates about similar positions?")
      if (lowerLabel.includes('notify') ||
          lowerLabel.includes('update') ||
          lowerLabel.includes('alert') ||
          lowerLabel.includes('similar position')) {
        if (!checkbox.checked) {
          log(`  ✅ Checking optional beneficial checkbox: "${label}"`, 'info');
          checkbox.click();
          await sleep(randomDelay(100, 200)); // SPEED FIX: Reduced from 200-400
        }
      } else {
        log(`  ⏭️  Skipping optional checkbox: "${label}"`, 'info');
      }
    }
  }

  /**
   * Handle file upload fields - CRITICAL FIX - ENHANCED for Resume step
   */
  async handleFileUpload(fileInput) {
    const label = getFieldLabel(fileInput);
    const lowerLabel = label.toLowerCase();
    const isRequired = fileInput.required || fileInput.hasAttribute('required') || fileInput.getAttribute('aria-required') === 'true';

    log(`📎 Found file upload field: "${label}" (required: ${isRequired})`, 'info');

    // Check if this is a resume or cover letter upload
    const isResume = lowerLabel.includes('resume') || lowerLabel.includes('cv');
    const isCoverLetter = lowerLabel.includes('cover letter');

    // CRITICAL: Check if resume is already uploaded in LinkedIn profile
    // LinkedIn shows uploaded resume from profile - look for document name or "Uploaded" text
    const container = fileInput.closest('div[class*="jobs-document"]') ||
                     fileInput.closest('div[class*="document"]') ||
                     fileInput.closest('section') ||
                     fileInput.closest('div');

    if (container) {
      const containerText = container.textContent || '';

      // Check for already uploaded resume indicators
      if (containerText.includes('.pdf') ||
          containerText.includes('.doc') ||
          containerText.includes('.docx') ||
          containerText.includes('Uploaded') ||
          containerText.includes('uploaded') ||
          containerText.includes('attached') ||
          containerText.match(/\d+\s*(KB|MB|bytes)/i)) { // File size indicator

        log(`  ✅ Resume/file already uploaded from LinkedIn profile!`, 'success');
        this.addActivityLog(`✅ Resume detected - already uploaded`, 'success');
        return;
      }

      // Check if there's a "Use resume from profile" or similar button
      const useProfileBtn = container.querySelector('button[aria-label*="resume"], button[aria-label*="Resume"]');
      if (useProfileBtn) {
        log(`  🔄 Clicking "Use resume from profile" button...`, 'info');
        useProfileBtn.click();
        await sleep(500);
        this.addActivityLog(`✅ Using resume from profile`, 'success');
        return;
      }
    }

    if (isRequired) {
      // LinkedIn usually auto-fills resume from profile
      // Just log and continue - don't block the application
      log(`  ⚠️  Required resume upload field found`, 'warn');
      log(`  ➡️  LinkedIn should auto-fill from profile - continuing...`, 'info');
      this.addActivityLog(`⚠️ Resume upload required`, 'warn');
    } else {
      log(`  ⏭️  Optional file upload - skipping`, 'info');
    }
  }

  /**
   * Detect session expired or logged out - CRITICAL FIX
   */
  detectSessionExpired() {
    const pageText = document.body.textContent.toLowerCase();

    // Check for session expired indicators
    if (pageText.includes('session has expired') ||
        pageText.includes('please log in') ||
        pageText.includes('sign in to continue') ||
        pageText.includes('you must be logged in') ||
        document.querySelector('input[type="password"][name*="session"]')) {

      log('🚨 SESSION EXPIRED - User needs to log in again!', 'error');
      this.addActivityLog('❌ Session expired - please log in', 'error');

      // Stop the bot
      this.stopAutoApply();
      showNotification('Session expired - Please log in to LinkedIn', 'error');

      return true;
    }

    return false;
  }

  /**
   * Detect form validation errors - CRITICAL FIX
   */
  detectFormValidationErrors() {
    // Look for error messages
    const errorSelectors = [
      '.artdeco-inline-feedback--error',
      '[role="alert"]',
      '.error-message',
      '.validation-error',
      '.field-error',
      '[class*="error"]',
      '[class*="Error"]'
    ];

    const errors = [];

    for (const selector of errorSelectors) {
      const errorElements = document.querySelectorAll(selector);

      for (const el of errorElements) {
        const errorText = (el.textContent || '').trim();

        // Filter out false positives
        if (errorText.length > 0 &&
            errorText.length < 200 && // Real errors are short
            !errorText.toLowerCase().includes('learn more')) {

          // Check if error is visible
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            errors.push(errorText);
          }
        }
      }
    }

    if (errors.length > 0) {
      log(`⚠️  Form validation errors detected:`, 'warn');
      errors.forEach((err, idx) => {
        log(`  ${idx + 1}. ${err}`, 'warn');
      });

      this.addActivityLog(`⚠️ Validation errors: ${errors.length}`, 'warn');

      return errors;
    }

    return [];
  }

  /**
   * Find button by text content
   */
  findButton(textOptions) {
    const buttons = document.querySelectorAll('button');

    for (const button of buttons) {
      for (const text of textOptions) {
        if (buttonContainsText(button, text)) {
          return button;
        }
      }
    }

    return null;
  }

  /**
   * Close Easy Apply modal
   */
  async closeModal() {
    // First check for save dialog and handle it
    await this.handleSaveApplicationDialog();

    // Then close the modal
    await sleep(1000);

    const closeSelectors = [
      'button[aria-label*="Dismiss"]',
      'button[aria-label*="Close"]',
      'button.artdeco-modal__dismiss'
    ];

    for (const selector of closeSelectors) {
      const closeButton = document.querySelector(selector);
      if (closeButton) {
        log('Closing Easy Apply modal...', 'info');
        await clickElement(closeButton, 1000);
        return;
      }
    }

    // Press ESC key as last resort
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
  }

  /**
   * Handle messages from popup - ENHANCED VERSION
   */
  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'applyNow':
        log('Manual apply triggered from popup', 'info');

        // Find Easy Apply button using enhanced detection
        const buttons = this.findAllEasyApplyButtons();

        if (buttons.length > 0) {
          const button = buttons[0]; // Use first available button
          log(`Found Easy Apply button, starting application...`, 'info');

          // Extract job details
          const jobDetails = extractJobDetails();

          if (!jobDetails || !jobDetails.jobId) {
            log('Could not extract job details', 'error');
            sendResponse({ success: false, error: 'Could not extract job information from page' });
            break;
          }

          // Start application process
          try {
            await this.applyToJob(button, jobDetails);
            sendResponse({ success: true });
          } catch (error) {
            log(`Error in application: ${error.message}`, 'error');
            sendResponse({ success: false, error: error.message });
          }
        } else {
          log('No Easy Apply button found on page', 'error');
          sendResponse({
            success: false,
            error: 'No "Easy Apply" button found. Make sure:\n1. This is an Easy Apply job\n2. The job posting has fully loaded\n3. You haven\'t already applied to this job'
          });
        }
        break;

      case 'updateSettings':
        log('Reloading settings from popup', 'info');
        await this.loadData();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }
}

// Initialize bot when page is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new LinkedInEasyApplyBot();
  });
} else {
  new LinkedInEasyApplyBot();
}
