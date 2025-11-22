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
    await this.addControlPanel();

    // Start monitoring for jobs
    this.observePage();

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });

    // Auto-start if enabled (with proper page load wait)
    if (this.settings.autoApply) {
      log('Auto-apply is enabled, waiting for page to fully load...', 'info');
      // Wait longer for page to fully load and render
      await sleep(5000);

      // Check if we're on a jobs page before starting
      if (this.isOnJobsPage()) {
        log('On jobs page, starting automation...', 'info');
        this.startBatchProcessing();
      } else {
        log('Not on jobs page yet, waiting for navigation...', 'warn');
        this.addActivityLog('⚠️ Please click "Search & Apply" to start', 'warn');
      }
    }
  }

  async loadData() {
    this.profile = await Storage.getProfile();
    this.settings = await Storage.getSettings();
    log(`Profile loaded: ${this.profile.firstName} ${this.profile.lastName}`, 'info');
  }

  /**
   * Humanized delay - mimics human behavior with randomization
   */
  async humanDelay(baseDelay = null) {
    if (!this.settings.humanizedTiming) {
      await sleep(baseDelay || this.settings.applyDelay);
      return;
    }

    const minDelay = this.settings.minDelay || SAFETY_LIMITS.MIN_DELAY_BETWEEN_ACTIONS;
    const maxDelay = this.settings.maxDelay || SAFETY_LIMITS.MAX_DELAY_BETWEEN_ACTIONS;

    // Add randomization for more human-like behavior
    const delay = baseDelay || randomDelay(minDelay, maxDelay);
    const variance = delay * 0.2; // ±20% variance
    const finalDelay = delay + (Math.random() * variance * 2 - variance);

    await sleep(Math.max(minDelay, Math.floor(finalDelay)));
  }

  /**
   * Add floating control panel to page - PROFESSIONAL DASHBOARD
   */
  async addControlPanel() {
    // Remove existing panel if present
    const existingPanel = document.getElementById('easy-apply-control-panel');
    if (existingPanel) {
      existingPanel.remove();
      log('Removed existing control panel', 'info');
    }

    const panel = document.createElement('div');
    panel.id = 'easy-apply-control-panel';

    // Check if profile is complete
    const profileComplete = this.profile.jobTitle && this.profile.jobTitle.trim() !== '';

    // Get analytics and rate limits - with fallback to prevent panel from not showing
    let analytics = { successRate: 0 };
    let rateLimits = {
      daily: { count: 0, remaining: 50 },
      hourly: { count: 0, remaining: 10 }
    };

    try {
      analytics = await Storage.getAnalytics();
      rateLimits = await Storage.checkRateLimits();
    } catch (error) {
      log('Error loading analytics, using defaults: ' + error.message, 'warn');
    }

    panel.innerHTML = `
      <div class="easy-apply-panel-header">
        <span>🤖 Easy Apply Bot v2.0</span>
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

        <div class="easy-apply-stats" id="easy-apply-stats">
          <strong>📊 Today's Statistics:</strong>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value" id="stat-applied">${rateLimits.daily.count}</span>
              <span class="stat-label">Applied</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" id="stat-remaining">${rateLimits.daily.remaining}</span>
              <span class="stat-label">Remaining</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" id="stat-success-rate">${analytics.successRate || 0}%</span>
              <span class="stat-label">Success Rate</span>
            </div>
          </div>
        </div>

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
    log('✅ Control panel added to page with Search & Apply button', 'success');

    // Add toggle button listener
    document.getElementById('easy-apply-toggle').addEventListener('click', () => {
      this.toggleAutoApply();
    });

    // Add search button listener
    document.getElementById('search-and-apply-btn').addEventListener('click', () => {
      this.searchAndApply();
    });

    // Start statistics update interval
    this.startStatsUpdater();

    log('✅ All control panel event listeners attached', 'success');
  }

  /**
   * Update statistics in real-time
   */
  startStatsUpdater() {
    // Update stats every 10 seconds
    setInterval(async () => {
      const analytics = await Storage.getAnalytics();
      const rateLimits = await Storage.checkRateLimits();

      // Update UI elements
      const appliedEl = document.getElementById('stat-applied');
      const remainingEl = document.getElementById('stat-remaining');
      const successRateEl = document.getElementById('stat-success-rate');

      if (appliedEl) appliedEl.textContent = rateLimits.daily.count;
      if (remainingEl) remainingEl.textContent = rateLimits.daily.remaining;
      if (successRateEl) successRateEl.textContent = `${analytics.successRate || 0}%`;
    }, 10000); // Every 10 seconds
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
      if (await this.detectSessionExpired()) {
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

    // CRITICAL: Add "Past 24 hours" date filter
    searchParams.set('f_TPR', 'r86400'); // Posted in last 24 hours (86400 seconds)

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
  async stopAutoApply() {
    this.settings.autoApply = false;
    this.isRunning = false;
    this.applicationInProgress = false;

    // CRITICAL: Save settings to prevent auto-restart on page reload
    await Storage.saveSettings(this.settings);

    this.updateStatus('Stopped');
    this.addActivityLog('🛑 Bot stopped', 'error');

    const button = document.getElementById('easy-apply-toggle');
    if (button) {
      button.textContent = 'Start';
    }

    log('🛑 Bot stopped and setting saved to prevent auto-restart', 'warn');
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
          // Try to go to next page
          log('No more jobs on this page, trying to load next page...', 'info');
          const nextPageLoaded = await this.loadNextPage();

          if (nextPageLoaded) {
            log('✅ Loaded next page, continuing...', 'success');
            this.addActivityLog('📄 Moved to next page', 'success');
            await sleep(2000);
            continue;
          } else {
            log('No more pages available, stopping...', 'warn');
            showNotification('Processed all available pages', 'info');
            this.addActivityLog('✅ Completed all pages!', 'success');
            break;
          }
        }
      }

      // Wait between applications
      await sleep(randomDelay(3000, 5000));
    }

    this.updateStatus('Idle');
    this.isRunning = false;
  }

  /**
   * Find and apply to the next available job - PROFESSIONAL GRADE
   */
  async findAndApplyToNextJob() {
    log('🔍 Looking for jobs to apply to...', 'info');
    this.updateStatus('Searching for jobs...');
    this.addActivityLog('Searching for job cards...');

    // CRITICAL: Check rate limits before proceeding
    const rateLimits = await Storage.checkRateLimits();

    if (rateLimits.hourly.exceeded) {
      log(`⚠️  Hourly limit reached (${rateLimits.hourly.count}/${rateLimits.hourly.limit})`, 'warn');
      this.addActivityLog(`⏸️  Hourly limit reached - pausing`, 'warn');
      showNotification(`Hourly limit reached. Cool down for ${Math.ceil(SAFETY_LIMITS.COOL_DOWN_PERIOD / 60000)} minutes.`, 'warn');

      // Wait for cool-down period
      await sleep(SAFETY_LIMITS.COOL_DOWN_PERIOD);
      return false;
    }

    if (rateLimits.daily.exceeded) {
      log(`⚠️  Daily limit reached (${rateLimits.daily.count}/${rateLimits.daily.limit})`, 'warn');
      this.addActivityLog(`🛑 Daily limit reached`, 'error');
      showNotification('Daily application limit reached!', 'warn');
      await this.stopAutoApply();
      return false;
    }

    log(`📊 Rate limits - Hourly: ${rateLimits.hourly.remaining} remaining | Daily: ${rateLimits.daily.remaining} remaining`, 'info');

    // STRATEGY: Find job cards first, then look for Easy Apply button
    const jobCards = await this.findJobCards();

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

      // PROFESSIONAL: Check if company is blacklisted
      if (this.settings.skipBlacklistedCompanies) {
        const isBlacklisted = await Storage.isBlacklisted(jobDetails.companyName);
        if (isBlacklisted) {
          log(`🚫 Company "${jobDetails.companyName}" is blacklisted, skipping...`, 'warn');
          this.addActivityLog(`Blacklisted company, skipping`, 'warn');
          await Storage.addApplication({
            ...jobDetails,
            status: APPLICATION_STATUS.BLOCKED
          });
          continue;
        }
      }

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
  async findJobCards() {
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

    // Retry up to 3 times with delays (page might still be loading)
    for (let attempt = 1; attempt <= 3; attempt++) {
      log(`Attempt ${attempt}/3 to find job cards...`, 'info');

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

      // If not found yet, wait and retry
      if (attempt < 3) {
        log(`No jobs found on attempt ${attempt}, waiting 2s before retry...`, 'warn');
        await sleep(2000);
      }
    }

    // FALLBACK: Check if we're on a single job page
    log('⚠️  No job cards found after retries, checking if this is a single job page...', 'warn');
    const singleJobPage = document.querySelector('.jobs-details, .jobs-unified-top-card');
    if (singleJobPage) {
      log('ℹ️  This appears to be a single job page, not a search results page', 'info');
      this.addActivityLog('Single job page detected', 'warn');
      return []; // Will trigger single job mode
    }

    // Check if we're on the right page
    if (!this.isOnJobsPage()) {
      log('❌ Not on a jobs page - please navigate to LinkedIn Jobs', 'error');
      this.addActivityLog('❌ Not on jobs page - Click "Search & Apply"', 'error');
      showNotification('Please click "Search & Apply" button to start', 'error');
    } else {
      log('❌ Could not find any job cards on this page', 'error');
      this.addActivityLog('No jobs found - try scrolling or adjusting filters', 'error');
      showNotification('No jobs found - try scrolling down or adjusting filters', 'warn');
    }

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
   * Load next page of job results - PAGINATION SUPPORT
   */
  async loadNextPage() {
    log('🔍 Looking for pagination "Next" button...', 'info');

    // LinkedIn pagination selectors
    const paginationSelectors = [
      'button[aria-label="Page 2"]',
      'button[aria-label*="Next"]',
      'button[aria-label*="next"]',
      '.artdeco-pagination__button--next',
      '.jobs-search-pagination__button--next',
      'button[data-test-pagination-next]',
      'li.selected + li button', // Next page number after current
      '.artdeco-pagination li.active + li button'
    ];

    for (const selector of paginationSelectors) {
      const nextButton = document.querySelector(selector);
      if (nextButton && !nextButton.disabled && !nextButton.getAttribute('aria-disabled')) {
        log(`✅ Found pagination next button: ${selector}`, 'success');

        // Scroll to pagination
        nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        // Click next button
        log('Clicking pagination next button...', 'info');
        nextButton.click();

        // Wait for new page to load
        await sleep(2000);

        // Scroll to top to see new jobs
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await sleep(1000);

        return true;
      }
    }

    // Try looking for page number buttons (2, 3, 4, 5, etc.)
    const pageButtons = document.querySelectorAll('.artdeco-pagination__indicator button, .jobs-search-pagination button');
    for (const button of pageButtons) {
      const buttonText = button.textContent?.trim();
      const pageNumber = parseInt(buttonText);

      // Check if it's a number button and not the current page
      if (!isNaN(pageNumber) && !button.classList.contains('selected') && !button.classList.contains('active')) {
        log(`✅ Found page button: ${pageNumber}`, 'success');

        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        button.click();
        await sleep(2000);

        window.scrollTo({ top: 0, behavior: 'smooth' });
        await sleep(1000);

        return true;
      }
    }

    log('❌ No pagination button found (might be on last page)', 'warn');
    return false;
  }

  /**
   * Apply to a job - PROFESSIONAL GRADE WITH ANALYTICS
   */
  async applyToJob(button, jobDetails) {
    if (this.applicationInProgress) return false;

    this.applicationInProgress = true;
    this.currentJobId = jobDetails.jobId;
    this.updateStatus(`Applying to ${jobDetails.jobTitle}`);

    log(`Starting application for: ${jobDetails.jobTitle} at ${jobDetails.companyName}`, 'info');
    this.addActivityLog(`Applying to ${jobDetails.jobTitle}...`);

    const startTime = Date.now(); // Track application time
    let applicationSuccess = false;

    try {
      // Click Easy Apply button
      this.addActivityLog('Clicking Easy Apply button...');
      await clickElement(button, 1000);

      // Humanized delay
      await this.humanDelay(800);

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
        const timeSpent = Date.now() - startTime;

        log(`✅ Application submitted successfully in ${(timeSpent / 1000).toFixed(1)}s!`, 'success');
        showNotification(`Applied to ${jobDetails.jobTitle}`, 'success');
        this.addActivityLog(`✅ Successfully applied!`, 'success');

        // Track analytics
        const analytics = await Storage.getAnalytics();
        await Storage.updateAnalytics({
          totalAttempts: analytics.totalAttempts + 1,
          successfulApplications: analytics.successfulApplications + 1,
          totalTimeSpent: analytics.totalTimeSpent + timeSpent,
          averageTimePerJob: Math.round((analytics.totalTimeSpent + timeSpent) / (analytics.successfulApplications + 1)),
          lastRunDate: Date.now()
        });

        await Storage.addApplication({
          ...jobDetails,
          status: APPLICATION_STATUS.APPLIED,
          timeSpent
        });

        // Add to history
        await Storage.addHistory({
          action: 'application_success',
          jobId: jobDetails.jobId,
          jobTitle: jobDetails.jobTitle,
          companyName: jobDetails.companyName,
          timeSpent
        });

        applicationSuccess = true;
      } else {
        throw new Error('Application process failed');
      }
    } catch (error) {
      const timeSpent = Date.now() - startTime;

      log(`❌ Application failed: ${error.message}`, 'error');
      showNotification(`Failed: ${error.message}`, 'error');
      this.addActivityLog(`❌ Failed: ${error.message}`, 'error');

      // Determine error type
      let errorType = ERROR_TYPES.UNKNOWN;
      if (error.message.includes('validation')) errorType = ERROR_TYPES.FORM_VALIDATION;
      else if (error.message.includes('network')) errorType = ERROR_TYPES.NETWORK;
      else if (error.message.includes('session')) errorType = ERROR_TYPES.SESSION_EXPIRED;
      else if (error.message.includes('element') || error.message.includes('not found')) errorType = ERROR_TYPES.ELEMENT_NOT_FOUND;
      else if (error.message.includes('timeout')) errorType = ERROR_TYPES.TIMEOUT;

      // Track analytics
      const analytics = await Storage.getAnalytics();
      await Storage.updateAnalytics({
        totalAttempts: analytics.totalAttempts + 1,
        failedApplications: analytics.failedApplications + 1,
        totalTimeSpent: analytics.totalTimeSpent + timeSpent,
        lastRunDate: Date.now()
      });

      await Storage.trackError(errorType);

      await Storage.addApplication({
        ...jobDetails,
        status: APPLICATION_STATUS.FAILED,
        error: error.message,
        errorType,
        timeSpent
      });

      // Add to history
      await Storage.addHistory({
        action: 'application_failed',
        jobId: jobDetails.jobId,
        jobTitle: jobDetails.jobTitle,
        companyName: jobDetails.companyName,
        error: error.message,
        errorType,
        timeSpent
      });

      applicationSuccess = false;
    } finally {
      this.applicationInProgress = false;
      this.currentJobId = null;
      this.updateStatus(this.settings.autoApply ? 'Running' : 'Idle');

      // Close modal if still open
      await this.closeModal();

      // Humanized delay between applications
      if (applicationSuccess && this.settings.pauseBetweenJobs) {
        log(`Pausing for ${this.settings.pauseBetweenJobs / 1000}s before next job...`, 'info');
        await this.humanDelay(this.settings.pauseBetweenJobs);
      }
    }

    return applicationSuccess;
  }

  /**
   * Process application form - BUILT FROM SCRATCH BASED ON ACTUAL LINKEDIN FLOW
   *
   * LinkedIn Application Flow:
   * Step 1 (0%):   Initial page - Click to start
   * Step 2 (33%):  Resume page - Select resume → Click "Next"
   * Step 3 (67%):  Additional Questions - Fill questions → Click "Review"
   * Step 4 (100%): Review Your Application - Verify → Click "Submit application"
   * Success: "Your application was sent to [Company]!" message appears
   */
  async processApplicationForm() {
    const MAX_STEPS = 20;
    log('🚀 Starting LinkedIn application (following exact flow)...', 'info');

    for (let step = 0; step < MAX_STEPS; step++) {
      log(`\n━━━ STEP ${step + 1}/${MAX_STEPS} ━━━`, 'info');

      // Safety checks
      if (!this.settings.autoApply || !this.isRunning || !this.applicationInProgress) {
        log('🛑 User stopped', 'warn');
        await this.closeModal();
        return false;
      }

      if (await this.detectSessionExpired()) {
        throw new Error('Session expired');
      }

      await this.handleSaveApplicationDialog();
      await sleep(1000);

      // Check if already successful
      if (this.checkSubmissionSuccess()) {
        log('✅ APPLICATION SUBMITTED SUCCESSFULLY!', 'success');
        return true;
      }

      // Fill all visible fields on current page
      log('📝 Filling all fields on current page...', 'info');
      await this.fillCurrentForm();
      await sleep(800);

      // Find and click the appropriate button based on LinkedIn flow
      log('🔍 Finding next button to click...', 'info');

      let clicked = false;

      // Priority 1: Submit application (final step at 100%)
      const submitButton = this.findButton(['Submit application', 'Submit']);
      if (submitButton) {
        log('✅ Found SUBMIT button (Step 4 - 100%) - Final step!', 'success');
        this.addActivityLog('📤 Submitting application...');
        await clickElement(submitButton, 1500);

        // Wait for submission confirmation
        await sleep(3000);
        if (this.checkSubmissionSuccess()) {
          log('✅ APPLICATION SUBMITTED SUCCESSFULLY!', 'success');
          return true;
        }

        // Wait a bit more for slow confirmations
        await sleep(2000);
        if (this.checkSubmissionSuccess()) {
          log('✅ APPLICATION SUBMITTED SUCCESSFULLY (delayed)!', 'success');
          return true;
        }

        clicked = true;
      }

      // Priority 2: Review (from step 3 to step 4: 67% → 100%)
      if (!clicked) {
        const reviewButton = this.findButton(['Review', 'Review your application']);
        if (reviewButton) {
          log('✅ Found REVIEW button (Step 3 → Step 4: 67% → 100%)', 'success');
          this.addActivityLog('📋 Reviewing application...');
          await clickElement(reviewButton, 1000);
          clicked = true;
        }
      }

      // Priority 3: Next/Continue (from step 1 → 2 or step 2 → 3)
      if (!clicked) {
        const nextButton = this.findButton(['Next', 'Continue']);
        if (nextButton) {
          log('✅ Found NEXT button (proceeding to next step)', 'success');
          this.addActivityLog('➡️ Going to next step...');
          await clickElement(nextButton, 1000);
          clicked = true;
        }
      }

      // If no button found, check if we need to fill more fields
      if (!clicked) {
        log('⚠️ No button found - checking for unfilled fields...', 'warn');

        const requiredFields = this.findUnfilledRequiredFields();
        if (requiredFields.length > 0) {
          log(`📝 Found ${requiredFields.length} unfilled required fields - filling them...`, 'info');
          for (const field of requiredFields) {
            await this.fillFieldIntelligent(field);
            await sleep(300);
          }
          await sleep(500);
          continue; // Try again after filling fields
        }

        // Check one more time if submitted
        if (this.checkSubmissionSuccess()) {
          log('✅ APPLICATION SUBMITTED SUCCESSFULLY!', 'success');
          return true;
        }

        // No button and no fields - stuck
        log('❌ No button found and no fields to fill - application stuck or failed', 'error');
        return false;
      }

      // Wait before next iteration
      await sleep(1000);
    }

    // Exceeded max steps
    log('❌ Exceeded maximum steps - application incomplete', 'error');
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
      if (this.applicationInProgress && this.settings.autoApply && this.isRunning) {
        log('ℹ️  "Save application" dialog detected, but application IN PROGRESS - CLICKING CANCEL to continue!', 'info');
        // Try to click CANCEL/SAVE to continue the application instead of discarding
        const modalSelectors = [
          '.artdeco-modal',
          '[role="dialog"]',
          '[data-test-modal]'
        ];

        for (const selector of modalSelectors) {
          const modals = document.querySelectorAll(selector);

          for (const modal of modals) {
            const modalText = modal.textContent || '';

            if (modalText.includes('Save this application')) {
              const allButtons = modal.querySelectorAll('button');

              // Try to click SAVE to keep progress and continue
              for (const button of allButtons) {
                const btnText = (button.textContent || '').toLowerCase().trim();

                if (btnText.includes('save') && !btnText.includes('discard')) {
                  log(`✅ Clicking SAVE to preserve application progress`, 'success');
                  button.click();
                  await sleep(1000);
                  return true;
                }
              }

              // If no Save button, try Cancel
              for (const button of allButtons) {
                const btnText = (button.textContent || '').toLowerCase().trim();

                if (btnText.includes('cancel')) {
                  log(`✅ Clicking CANCEL to continue filling application`, 'success');
                  button.click();
                  await sleep(1000);
                  return true;
                }
              }
            }
          }
        }

        // If we can't find Save or Cancel, press ESC
        log('Pressing ESC to cancel save dialog and continue...', 'warn');
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

    // Whitelist of important action buttons that should NEVER be avoided
    const whitelistButtons = [
      'review',
      'submit',
      'next',
      'continue',
      'apply'
    ];

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
      'discard',
      'skip',
      'later',
      'dialog',
      'modal',
      'x',  // Close button with X symbol
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
      'any time',
      'past month',
      'past week',
      'past 24 hours',
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

      // Check if button is whitelisted (important action buttons)
      const isWhitelisted = whitelistButtons.some(wl => combinedText.includes(wl));

      // STRICT: Skip buttons we want to avoid (unless whitelisted)
      if (!isWhitelisted) {
        if (avoidTexts.some(avoid => combinedText.includes(avoid))) {
          log(`    ❌ SKIPPING unsafe button: "${buttonText}"`, 'warn');
          continue;
        }
      } else {
        log(`    ✅ Whitelisted button found: "${buttonText}"`, 'success');
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

      // Check if button is whitelisted (important action buttons)
      const isWhitelisted = whitelistButtons.some(wl => combinedText.includes(wl));

      // STRICT: Skip buttons we want to avoid (unless whitelisted)
      if (!isWhitelisted) {
        if (avoidTexts.some(avoid => combinedText.includes(avoid))) {
          continue;
        }
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
      'Application complete',
      'Applied',  // Matches "Applied 8 seconds ago"
      'Application was sent',
      'application sent to'
    ];

    const pageText = document.body.textContent;

    // Check for "Applied X seconds/minutes ago" pattern
    if (/Applied\s+\d+\s+(second|minute|hour|day)s?\s+ago/i.test(pageText)) {
      log('✅ Detected success: "Applied X time ago" pattern', 'success');
      return true;
    }

    // Check standard success indicators
    const found = successIndicators.some(indicator =>
      pageText.toLowerCase().includes(indicator.toLowerCase())
    );

    if (found) {
      log('✅ Detected success via indicator text', 'success');
    }

    return found;
  }

  /**
   * Find buttons with advanced logic - ULTRA STRICT (avoids wrong buttons)
   */
  findButtonAdvanced(textOptions) {
    log(`🔍 Searching for buttons: ${textOptions.join(', ')}`, 'info');

    // Whitelist of important action buttons that should NEVER be avoided
    const whitelistButtons = [
      'review',
      'submit',
      'next',
      'continue',
      'apply'
    ];

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
      'discard',
      'skip',
      'later',
      'close',
      'dialog',
      'modal',
      'x',  // Close button with X symbol
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
      'any time',
      'past month',
      'past week',
      'past 24 hours',
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

      // Check if button is whitelisted (important action buttons)
      const isWhitelisted = whitelistButtons.some(wl => combinedText.includes(wl));

      // ULTRA STRICT: Skip if button contains ANY avoid words (unless whitelisted)
      if (!isWhitelisted) {
        const avoidedWord = avoidWords.find(word => combinedText.includes(word));
        if (avoidedWord) {
          log(`    ❌ SKIPPING - Contains avoided word "${avoidedWord}": "${buttonText}"`, 'warn');
          continue;
        }
      } else {
        log(`    ✅ Whitelisted button found: "${buttonText}"`, 'success');
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

    // Find standard required fields
    const requiredInputs = document.querySelectorAll('input[required], select[required], textarea[required], [aria-required="true"]');

    for (const input of requiredInputs) {
      // Check if field is empty
      if (!input.value || input.value.trim() === '') {
        fields.push(input);
        continue;
      }

      // For select dropdowns, also check if a valid option is selected (not placeholder)
      if (input.tagName.toLowerCase() === 'select') {
        const selectedText = input.options[input.selectedIndex]?.text || '';
        if (selectedText.toLowerCase().includes('select') ||
            selectedText === '--' ||
            selectedText === '' ||
            input.selectedIndex === 0) {
          fields.push(input);
        }
      }
    }

    // ALSO find custom dropdowns that are required but not filled
    const customDropdowns = document.querySelectorAll(`
      [role="combobox"][aria-required="true"],
      button[aria-expanded][aria-required="true"],
      [data-test-text-entity-list-form-select][aria-required="true"]
    `.trim().replace(/\s+/g, ' '));

    for (const dropdown of customDropdowns) {
      const selectedText = (dropdown.textContent || '').trim().toLowerCase();

      // Check if dropdown is still showing placeholder text
      if (selectedText.includes('select an option') ||
          selectedText.includes('select') ||
          selectedText.includes('choose') ||
          selectedText === '--' ||
          selectedText === '') {
        fields.push(dropdown);
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
    const role = field.getAttribute('role');
    log(`🔧 Intelligently filling required field: ${label} (${fieldType}, role=${role})`, 'info');

    // CRITICAL: Handle custom dropdowns (role=combobox, button with aria-expanded)
    if (role === 'combobox' ||
        (fieldType === 'button' && field.hasAttribute('aria-expanded')) ||
        field.hasAttribute('data-test-text-entity-list-form-select')) {
      log(`  Detected custom dropdown, using fillCustomDropdown...`, 'info');
      await this.fillCustomDropdown(field);
      return;
    }

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

    // CRITICAL: Also find custom LinkedIn dropdowns (div/button-based)
    const customDropdowns = formContainer.querySelectorAll(`
      [role="combobox"],
      button[aria-expanded],
      .artdeco-dropdown,
      [data-test-text-entity-list-form-select],
      [data-test-text-entity-list-form-component],
      .fb-dash-form-element__dropdown,
      select[class*="dropdown"],
      div[class*="select"]:not(input):not(textarea),
      [aria-haspopup="listbox"]
    `.trim().replace(/\s+/g, ' '));
    log(`Found ${customDropdowns.length} custom dropdowns`, 'info');

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

        await sleep(randomDelay(20, 50)); // SPEED BOOST: Reduced for faster filling
      } catch (error) {
        log(`Error filling field: ${error.message}`, 'warn');
      }
    }

    // CRITICAL: Handle custom LinkedIn dropdowns
    for (const dropdown of customDropdowns) {
      try {
        await this.fillCustomDropdown(dropdown);
        await sleep(50); // SPEED BOOST: Reduced delay
      } catch (error) {
        log(`Error filling custom dropdown: ${error.message}`, 'warn');
      }
    }

    log('Finished filling form fields', 'success');
  }

  /**
   * Fill a form field based on its label - INPUT TYPE AWARE VERSION
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

    const lowerLabel = (label || fieldName).toLowerCase();
    const questionType = detectQuestionType(label || fieldName);

    let value = '';

    // CRITICAL: Handle NUMBER inputs FIRST to avoid text in number fields
    if (fieldType === 'number') {
      value = this.getNumberValue(label || fieldName, questionType, field);

      if (value) {
        await fillInput(field, value);
        log(`  ✅ Filled number field with: "${value}"`, 'success');
      } else {
        // FALLBACK: If we can't determine a value, use a safe default
        const defaultValue = '1';
        await fillInput(field, defaultValue);
        log(`  ⚠️  No specific value determined for: ${label || fieldName}, using default: "${defaultValue}"`, 'warn');
      }
      return;
    }

    // PRIORITY 1: Field-specific mappings (names, email, phone, etc.)
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
    }

    // PRIORITY 2: Use question type for text fields
    if (!value && questionType) {
      value = await Storage.getAnswerForQuestion(questionType, this.profile);
      log(`  Detected question type: ${questionType}, value: "${value}"`, 'info');
    }

    if (value) {
      await fillInput(field, value);
      log(`  ✅ Filled with: "${value}"`, 'success');
    } else {
      log(`  ⚠️  No value found for field: ${label || fieldName}`, 'warn');
    }
  }

  /**
   * Get numeric value for number input fields based on context
   */
  getNumberValue(label, questionType, fieldElement = null) {
    const lowerLabel = label.toLowerCase();

    // Check if field requires decimal format
    let needsDecimal = false;
    if (fieldElement) {
      const placeholder = (fieldElement.placeholder || '').toLowerCase();
      const step = fieldElement.step;
      const min = fieldElement.min;

      // Detect decimal requirement from various sources
      needsDecimal =
        lowerLabel.includes('decimal') ||
        lowerLabel.includes('0.0') ||
        placeholder.includes('decimal') ||
        placeholder.includes('0.0') ||
        step === '0.1' ||
        step === '0.01' ||
        step === 'any' ||
        (min && min.includes('.'));

      log(`  🔍 Decimal detection: label="${lowerLabel.includes('decimal')}", placeholder="${placeholder.includes('decimal')}", step="${step}", needsDecimal=${needsDecimal}`, 'info');
    }

    // PRIORITY 1: Years of experience questions
    if (lowerLabel.includes('year') && (lowerLabel.includes('experience') || lowerLabel.includes('work'))) {
      // Check if asking about specific technology/skill (has "with" in question)
      if (lowerLabel.includes(' with ') || lowerLabel.includes('experience with')) {
        // Asking about specific technology (Python, AMLS, Data Science, etc.)
        return needsDecimal ? '2.0' : '2'; // Default 2 years for any specific tech/skill
      }
      // General total work experience
      const expValue = this.profile.yearsExperience || '3';
      return needsDecimal ? `${expValue}.0` : expValue;
    }

    // PRIORITY 2: Notice period (numeric) - SMART DECIMAL DETECTION
    if (lowerLabel.includes('notice')) {
      if (lowerLabel.includes('day')) {
        return needsDecimal ? '30.0' : '30'; // 30 days
      } else if (lowerLabel.includes('week')) {
        return needsDecimal ? '2.0' : '2'; // 2 weeks
      } else if (lowerLabel.includes('month')) {
        return needsDecimal ? '1.0' : '1'; // 1 month
      }
      // Default: assume days (most common format)
      return needsDecimal ? '15.0' : '15'; // 15 days
    }

    // PRIORITY 3: CTC/Salary (check for LPA vs absolute numbers)
    if (lowerLabel.includes('ctc') || lowerLabel.includes('salary') || lowerLabel.includes('compensation')) {
      const isLPA = lowerLabel.includes('lpa') || lowerLabel.includes('lakh') || lowerLabel.includes('lakhs');

      if (lowerLabel.includes('current')) {
        const val = isLPA ? '6' : '600000'; // 6 LPA or 6 lakhs
        return needsDecimal && !val.includes('.') ? `${val}.0` : val;
      } else if (lowerLabel.includes('expect')) {
        const val = isLPA ? '8' : '800000'; // 8 LPA or 8 lakhs
        return needsDecimal && !val.includes('.') ? `${val}.0` : val;
      }

      const val = isLPA ? '7' : '700000'; // Default
      return needsDecimal && !val.includes('.') ? `${val}.0` : val;
    }

    // PRIORITY 4: Hourly rate
    if ((lowerLabel.includes('hourly') || lowerLabel.includes('hour')) &&
        (lowerLabel.includes('rate') || lowerLabel.includes('expect') || lowerLabel.includes('inr'))) {
      return needsDecimal ? '500.0' : '500'; // Default hourly in INR
    }

    // PRIORITY 5: Other year fields
    if (lowerLabel.includes('year')) {
      if (lowerLabel.includes('graduation') || lowerLabel.includes('graduate') || lowerLabel.includes('complete')) {
        return '2020'; // Graduation year (never decimal)
      }
      return needsDecimal ? '2.0' : '2'; // Default years
    }

    // PRIORITY 6: Month fields
    if (lowerLabel.includes('month')) {
      return needsDecimal ? '6.0' : '6'; // Default months
    }

    // PRIORITY 7: Age
    if (lowerLabel.includes('age')) {
      return needsDecimal ? '25.0' : '25';
    }

    // PRIORITY 8: GPA/Grades
    if (lowerLabel.includes('gpa') || lowerLabel.includes('grade') || lowerLabel.includes('percentage')) {
      if (lowerLabel.includes('percentage')) {
        return needsDecimal ? '75.0' : '75'; // 75%
      }
      return '3.5'; // GPA already has decimal
    }

    // PRIORITY 9: Team size
    if (lowerLabel.includes('team')) {
      return needsDecimal ? '5.0' : '5';
    }

    // FALLBACK: Default safe number with decimal support
    log(`  ℹ️  Using default numeric value for unrecognized field`, 'info');
    return needsDecimal ? '1.0' : '1';
  }

  /**
   * Fill select dropdown - REACT-COMPATIBLE VERSION
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
      let value = await Storage.getAnswerForQuestion(questionType, this.profile);
      if (value) {
        log(`  Detected question type: ${questionType}, trying to select: "${value}"`, 'info');

        // SMART HANDLING: For Yes/No questions, be flexible with matching
        const lowerLabel = (label || '').toLowerCase();
        const isYesNoQuestion = options.length <= 3 && (
          options.some(opt => (opt.text || '').toLowerCase().includes('yes')) ||
          options.some(opt => (opt.text || '').toLowerCase().includes('no'))
        );

        // If it's a Yes/No question and we got a long answer like "Left the job", convert it
        if (isYesNoQuestion) {
          if (value.toLowerCase().includes('left') || value.toLowerCase().includes('no')) {
            value = 'No';
          } else if (value.toLowerCase().includes('yes') || value.toLowerCase().includes('serving')) {
            value = 'Yes';
          }
          log(`  Smart Yes/No conversion: "${value}"`, 'info');
        }

        // Try exact match first, then partial match
        const valueToMatch = value.toLowerCase().trim();
        for (let i = 0; i < options.length; i++) {
          const optionText = (options[i].text || '').trim().toLowerCase();
          const optionValue = (options[i].value || '').trim().toLowerCase();

          // AGGRESSIVE MATCHING: exact, contains, or partial word match
          if (optionText === valueToMatch ||
              optionValue === valueToMatch ||
              optionText.includes(valueToMatch) ||
              valueToMatch.includes(optionText) ||
              optionValue.includes(valueToMatch)) {

            // REACT-COMPATIBLE: Set value using native setter
            await this.setSelectValueReactCompatible(select, options[i].value, i);
            log(`  ✅ Selected matched option: "${options[i].text}"`, 'success');
            await sleep(100);
            return;
          }
        }
        log(`  ⚠️ No match found for "${value}", falling back...`, 'warn');
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
      // REACT-COMPATIBLE: Set value using native setter
      await this.setSelectValueReactCompatible(select, optionValue, i);
      log(`  ✅ FORCE-selected first valid option: "${option.text}"`, 'success');
      await sleep(100);
      return;
    }

    // ULTRA-AGGRESSIVE FALLBACK: If no valid option found, select ANYTHING (even placeholder)
    log(`  ⚠️ WARNING: No valid option found, selecting ANY option...`, 'error');
    if (options.length > 1) {
      // Select second option (skip first which is likely placeholder)
      const fallbackOption = options[1];
      await this.setSelectValueReactCompatible(select, fallbackOption.value, 1);
      log(`  ⚠️ ULTRA-FALLBACK: Force-selected option: "${fallbackOption.text}"`, 'warn');
      await sleep(100);
      return;
    } else if (options.length === 1) {
      // Only one option available, select it
      await this.setSelectValueReactCompatible(select, options[0].value, 0);
      log(`  ⚠️ ULTRA-FALLBACK: Selected only available option: "${options[0].text}"`, 'warn');
      await sleep(100);
      return;
    }

    log(`  ❌ ERROR: Dropdown has NO options at all!`, 'error');
  }

  /**
   * Set select value in a React-compatible way
   * This ensures LinkedIn's React forms recognize the change
   */
  async setSelectValueReactCompatible(select, value, index) {
    try {
      // CRITICAL: Use native setter for React compatibility
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLSelectElement.prototype,
        'value'
      ).set;

      // Focus the select first
      select.focus();
      await sleep(50);

      // Set selectedIndex first
      select.selectedIndex = index;

      // Set value using native setter (React recognizes this)
      nativeInputValueSetter.call(select, value);

      // Trigger input event first (React listens to this)
      const inputEvent = new Event('input', { bubbles: true });
      select.dispatchEvent(inputEvent);

      // Small delay between events
      await sleep(50);

      // Then trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      select.dispatchEvent(changeEvent);

      // Blur to complete the interaction
      await sleep(50);
      select.blur();

      log(`  🔧 React-compatible value set: "${value}" (index: ${index})`, 'info');
    } catch (error) {
      log(`  ⚠️ Error in React-compatible setter, using fallback: ${error.message}`, 'warn');

      // Fallback to basic approach
      select.selectedIndex = index;
      select.value = value;
      select.focus();
      select.dispatchEvent(new Event('focus', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('blur', { bubbles: true }));
      select.blur();
    }
  }

  /**
   * Fill custom LinkedIn dropdown (div/button-based, not native <select>)
   * CRITICAL: LinkedIn uses custom dropdowns with aria-expanded and role="listbox"
   */
  async fillCustomDropdown(dropdown) {
    // Get label for this dropdown
    const label = getFieldLabel(dropdown);
    if (!label) {
      log('  ⚠️  No label found for custom dropdown, trying to fill anyway...', 'warn');
    }

    log(`📝 Filling CUSTOM dropdown: ${label || 'unlabeled'}`, 'info');

    // Check if already has a value selected (look for selected text)
    const selectedText = dropdown.textContent?.trim() || dropdown.innerText?.trim() || '';
    const lowerSelected = selectedText.toLowerCase();

    // Skip if already selected (not placeholder)
    if (selectedText &&
        !lowerSelected.includes('select') &&
        !lowerSelected.includes('choose') &&
        selectedText !== '--' &&
        selectedText.length > 0) {
      log(`  ✓ Already selected: "${selectedText}"`, 'info');
      return;
    }

    // Detect question type from label
    const questionType = detectQuestionType(label || '');
    let targetValue = null;

    if (questionType) {
      targetValue = await Storage.getAnswerForQuestion(questionType, this.profile);
      log(`  Detected question type: ${questionType}, looking for: "${targetValue}"`, 'info');

      // SMART HANDLING: For Yes/No questions, convert long answers to Yes/No
      const lowerLabel = (label || '').toLowerCase();
      if (targetValue && (lowerLabel.includes('yes') || lowerLabel.includes('no') ||
          lowerLabel.includes('serving') || lowerLabel.includes('notice'))) {
        if (targetValue.toLowerCase().includes('left') || targetValue.toLowerCase().includes('no')) {
          targetValue = 'No';
          log(`  Smart Yes/No conversion for custom dropdown: "No"`, 'info');
        } else if (targetValue.toLowerCase().includes('yes') || targetValue.toLowerCase().includes('serving')) {
          targetValue = 'Yes';
          log(`  Smart Yes/No conversion for custom dropdown: "Yes"`, 'info');
        }
      }
    }

    // STEP 1: Click the dropdown to expand it
    log(`  Clicking dropdown to expand...`, 'info');

    // Scroll dropdown into view first
    dropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);

    // Click to open - try multiple methods for reliability
    try {
      dropdown.click();
    } catch (e) {
      // Fallback: dispatch mouse event
      dropdown.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
    await sleep(500); // Wait LONGER for dropdown to expand (increased from 300)

    // STEP 2: Find the options list
    // LinkedIn typically shows options in a listbox with role="listbox"
    const optionsListSelectors = [
      '[role="listbox"]',
      '.artdeco-dropdown__content',
      '.artdeco-dropdown__content-inner',
      '[data-test-dropdown-options]',
      'ul[role="menu"]',
      '.select-list',
      '[aria-labelledby]'
    ];

    let optionsList = null;
    let attempts = 0;
    const maxAttempts = 5;  // Increased from 3 to 5 for more retries

    // Try multiple times to find the options list (it may take time to appear)
    while (!optionsList && attempts < maxAttempts) {
      for (const selector of optionsListSelectors) {
        // Look for visible listbox in the document (may be in a portal/modal)
        const lists = document.querySelectorAll(selector);
        for (const list of lists) {
          const style = window.getComputedStyle(list);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            optionsList = list;
            log(`  Found options list: ${selector}`, 'info');
            break;
          }
        }
        if (optionsList) break;
      }

      if (!optionsList) {
        attempts++;
        log(`  Waiting for options list to appear (attempt ${attempts}/${maxAttempts})...`, 'info');
        await sleep(300);  // Increased from 200 to 300 for better reliability
      }
    }

    if (!optionsList) {
      log(`  ❌ Could not find options list after expanding dropdown and ${maxAttempts} attempts!`, 'error');
      // Try to close the dropdown by clicking it again
      try {
        dropdown.click();
      } catch (e) {
        // Ignore close error
      }
      return;
    }

    // STEP 3: Find all option elements
    const optionSelectors = [
      '[role="option"]',
      'li',
      '.artdeco-dropdown__item',
      'button',
      '[data-test-dropdown-item]',
      '.select-list__item'
    ];

    let optionElements = [];
    for (const selector of optionSelectors) {
      const elements = optionsList.querySelectorAll(selector);
      if (elements.length > 0) {
        optionElements = Array.from(elements);
        log(`  Found ${optionElements.length} option elements using: ${selector}`, 'info');
        break;
      }
    }

    if (optionElements.length === 0) {
      log(`  ❌ No option elements found in list!`, 'error');
      try {
        dropdown.click(); // Close dropdown
      } catch (e) {
        // Ignore close error
      }
      return;
    }

    // Log all options for debugging
    optionElements.forEach((opt, idx) => {
      const text = (opt.textContent || opt.innerText || '').trim();
      log(`    Option ${idx}: "${text}"`, 'info');
    });

    // STEP 4: Try to find matching option
    if (targetValue) {
      const targetLower = targetValue.toLowerCase().trim();

      for (const option of optionElements) {
        const optionText = (option.textContent || option.innerText || '').trim();
        const optionLower = optionText.toLowerCase();

        // Skip placeholder/empty options
        if (!optionText ||
            optionLower.includes('select an option') ||
            optionLower.includes('choose') ||
            optionText === '--') {
          continue;
        }

        // AGGRESSIVE MATCHING: exact, contains, or partial word match
        if (optionLower === targetLower ||
            optionLower.includes(targetLower) ||
            targetLower.includes(optionLower)) {
          log(`  ✅ Found matching option: "${optionText}"`, 'success');

          // Scroll option into view
          option.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          await sleep(150);

          // Click the option with multiple methods for reliability
          try {
            option.click();
          } catch (e) {
            // Fallback: dispatch mouse event
            option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
          await sleep(300);  // Wait longer to ensure selection is registered

          log(`  ✅ Clicked matching option successfully`, 'success');
          return;
        }
      }

      log(`  ⚠️ No match found for "${targetValue}", using fallback...`, 'warn');
    }

    // STEP 5: AGGRESSIVE FALLBACK - Select first non-placeholder option
    for (const option of optionElements) {
      const optionText = (option.textContent || option.innerText || '').trim();
      const optionLower = optionText.toLowerCase();

      // Skip placeholder options
      if (!optionText ||
          optionLower.includes('select an option') ||
          optionLower.includes('select...') ||
          optionLower.includes('choose') ||
          optionText === '--' ||
          optionText.length === 0) {
        log(`    Skipping placeholder: "${optionText}"`, 'info');
        continue;
      }

      // Select this option!
      log(`  ✅ FALLBACK: Selecting first valid option: "${optionText}"`, 'success');

      // Scroll option into view
      option.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await sleep(150);

      // Click the option with multiple methods for reliability
      try {
        option.click();
      } catch (e) {
        // Fallback: dispatch mouse event
        option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
      await sleep(300);  // Wait longer to ensure selection is registered

      log(`  ✅ Clicked fallback option successfully`, 'success');
      return;
    }

    // STEP 6: ULTRA-AGGRESSIVE FALLBACK - Select ANY option (even if looks like placeholder)
    if (optionElements.length > 1) {
      const fallbackOption = optionElements[1]; // Skip first (likely placeholder)
      const fallbackText = (fallbackOption.textContent || fallbackOption.innerText || '').trim();
      log(`  ⚠️ ULTRA-FALLBACK: Selecting any option: "${fallbackText}"`, 'warn');

      fallbackOption.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await sleep(150);
      try {
        fallbackOption.click();
      } catch (e) {
        fallbackOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
      await sleep(300);
      return;
    } else if (optionElements.length === 1) {
      const onlyOption = optionElements[0];
      const onlyText = (onlyOption.textContent || onlyOption.innerText || '').trim();
      log(`  ⚠️ ULTRA-FALLBACK: Selecting only option: "${onlyText}"`, 'warn');

      onlyOption.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await sleep(100);
      onlyOption.click();
      await sleep(200);
      return;
    }

    log(`  ❌ ERROR: Could not select any option!`, 'error');
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
   * Check if we're on a LinkedIn jobs page
   */
  isOnJobsPage() {
    const url = window.location.href;
    const hasJobsInUrl = url.includes('linkedin.com/jobs');
    const hasJobElements = document.querySelector('.jobs-search-results, .scaffold-layout__list, .job-card-container, .jobs-details');

    return hasJobsInUrl || hasJobElements !== null;
  }

  /**
   * Detect session expired or logged out - CRITICAL FIX
   */
  async detectSessionExpired() {
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
      await this.stopAutoApply();
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
    // Only search within the Easy Apply modal
    const modal = document.querySelector('.jobs-easy-apply-modal, [data-test-modal], .artdeco-modal[role="dialog"]');
    if (!modal) {
      log('⚠️ No modal found when searching for button', 'warn');
      return null;
    }

    const buttons = modal.querySelectorAll('button');
    log(`Searching ${buttons.length} buttons in modal for: ${textOptions.join(', ')}`, 'info');

    const avoidWords = ['back', 'save', 'cancel', 'dismiss', 'discard'];

    for (const button of buttons) {
      if (button.disabled) continue;

      const buttonText = (button.textContent || '').toLowerCase().trim();
      const buttonLabel = (button.getAttribute('aria-label') || '').toLowerCase().trim();
      const combinedText = `${buttonText} ${buttonLabel}`;

      // Skip buttons we want to avoid (like Back)
      const hasAvoidWord = avoidWords.some(word => combinedText.includes(word));
      if (hasAvoidWord) {
        log(`  Skipping button with avoid word: "${buttonText}"`, 'info');
        continue;
      }

      // Check if this button matches what we're looking for
      for (const text of textOptions) {
        if (combinedText.includes(text.toLowerCase())) {
          const style = window.getComputedStyle(button);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            log(`  ✅ Found button: "${buttonText}"`, 'success');
            return button;
          }
        }
      }
    }

    log(`  ❌ No button found for: ${textOptions.join(', ')}`, 'warn');
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
