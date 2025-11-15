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
    this.init();
  }

  async init() {
    log('LinkedIn Easy Apply Bot initialized - Advanced Mode', 'success');

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
    panel.innerHTML = `
      <div class="easy-apply-panel-header">
        <span>🤖 Easy Apply Bot</span>
        <button id="easy-apply-toggle" class="easy-apply-btn">
          ${this.settings.autoApply ? 'Stop' : 'Start'}
        </button>
      </div>
      <div class="easy-apply-panel-body">
        <div class="easy-apply-status">Status: <span id="easy-apply-status">Idle</span></div>
        <button id="search-and-apply-btn" class="easy-apply-search-btn">🔍 Search & Apply</button>
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
   * Search LinkedIn and start applying
   */
  async searchAndApply() {
    log('Search & Apply clicked', 'info');

    // Check if profile has job title
    if (!this.profile.jobTitle || this.profile.jobTitle.trim() === '') {
      showNotification('Please fill your Job Title in the Profile tab first!', 'error');
      return;
    }

    showNotification(`Searching for "${this.profile.jobTitle}"...`, 'info');
    this.updateStatus('Navigating to search...');

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
        window.location.href = url;
        return;
      }
    }

    // Navigate to search results
    const url = `https://www.linkedin.com/jobs/search/?${searchParams.toString()}`;
    log(`Navigating to: ${url}`, 'info');
    window.location.href = url;
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
      showNotification('Auto-apply stopped', 'info');
      this.isRunning = false;
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
   * Find all Easy Apply buttons on the page
   */
  findAllEasyApplyButtons() {
    const selectors = [
      'button.jobs-apply-button',
      'button[aria-label*="Easy Apply"]',
      'button:has-text("Easy Apply")',
      '.jobs-apply-button',
      'button.jobs-apply-button--top-card'
    ];

    const buttons = [];
    selectors.forEach(selector => {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(btn => {
          const text = btn.textContent || btn.getAttribute('aria-label') || '';
          if (text.includes('Easy Apply') && !buttons.includes(btn)) {
            buttons.push(btn);
          }
        });
      } catch (e) {}
    });

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
   * Find and apply to the next available job
   */
  async findAndApplyToNextJob() {
    const easyApplyButtons = this.findAllEasyApplyButtons();

    log(`Found ${easyApplyButtons.length} Easy Apply buttons`, 'info');

    for (const button of easyApplyButtons) {
      // Scroll button into view
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(1000);

      // Click the job card to open details
      await this.clickJobCard(button);
      await sleep(2000);

      // Extract job details
      const jobDetails = extractJobDetails();

      if (!jobDetails || !jobDetails.jobId) {
        log('Could not extract job details, skipping...', 'warn');
        continue;
      }

      // Check if already applied
      if (this.settings.skipApplied) {
        const wasApplied = await Storage.wasJobApplied(jobDetails.jobId);
        if (wasApplied) {
          log(`Already applied to ${jobDetails.jobTitle}, skipping...`, 'info');
          continue;
        }
      }

      // Apply to this job
      log(`Attempting to apply to: ${jobDetails.jobTitle}`, 'info');
      await this.applyToJob(button, jobDetails);
      return true;
    }

    return false;
  }

  /**
   * Click the job card to open job details
   */
  async clickJobCard(easyApplyButton) {
    try {
      const jobCard = easyApplyButton.closest('.job-card-container, .jobs-search-results__list-item, li');
      if (jobCard) {
        const titleLink = jobCard.querySelector('a.job-card-list__title, a.job-card-container__link');
        if (titleLink) {
          await clickElement(titleLink, 500);
          return;
        }
      }

      // Fallback: just click the button area
      const rect = easyApplyButton.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      document.elementFromPoint(x, y - 50)?.click();
    } catch (e) {
      log('Could not click job card', 'warn');
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
    if (this.applicationInProgress) return;

    this.applicationInProgress = true;
    this.currentJobId = jobDetails.jobId;
    this.updateStatus(`Applying to ${jobDetails.jobTitle}`);

    log(`Starting application for: ${jobDetails.jobTitle} at ${jobDetails.companyName}`, 'info');

    try {
      // Click Easy Apply button
      await clickElement(button, 1000);

      // Wait for modal to appear
      const modal = await waitForElement(SELECTORS.MODAL, 5000);

      if (!modal) {
        throw new Error('Easy Apply modal did not appear');
      }

      // Process application form
      const success = await this.processApplicationForm();

      if (success) {
        log('Application submitted successfully', 'success');
        showNotification(`Applied to ${jobDetails.jobTitle}`, 'success');

        await Storage.addApplication({
          ...jobDetails,
          status: APPLICATION_STATUS.APPLIED
        });
      } else {
        throw new Error('Application process failed');
      }
    } catch (error) {
      log(`Application failed: ${error.message}`, 'error');
      showNotification('Application failed', 'error');

      await Storage.addApplication({
        ...jobDetails,
        status: APPLICATION_STATUS.FAILED,
        error: error.message
      });
    } finally {
      this.applicationInProgress = false;
      this.currentJobId = null;
      this.updateStatus(this.settings.autoApply ? 'Running' : 'Idle');

      // Close modal if still open
      this.closeModal();
    }
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
      await sleep(randomDelay(1500, 2500));

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

      // Wait for any validation or dynamic content
      await sleep(1500);

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
      if (reviewButton && !reviewButton.disabled) {
        log('Found REVIEW button, clicking...', 'info');
        await clickElement(reviewButton, 2000);
        currentStep++;
        continue;
      }

      // Look for Next/Continue button
      const nextButton = this.findButtonAdvanced(['Next', 'Continue', 'next', 'continue']);
      if (nextButton && !nextButton.disabled) {
        log('Found NEXT button, moving to next step...', 'info');
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
   * Handle "Save this application?" dialog
   */
  async handleSaveApplicationDialog() {
    // Check if the save dialog is present
    const pageText = document.body.textContent;

    if (pageText.includes('Save this application?') ||
        pageText.includes('your application will be discarded')) {
      log('Found "Save application" dialog - clicking Discard...', 'warn');

      // Look for Discard/Don't save button
      const discardButtons = [
        'Discard',
        "Don't save",
        'Do not save',
        'Skip'
      ];

      for (const text of discardButtons) {
        const button = this.findButtonAdvanced([text]);
        if (button) {
          log(`Clicking "${text}" button to discard and continue...`, 'info');
          await clickElement(button, 2000);
          return true;
        }
      }

      // If can't find discard, try to close the modal
      const closeButton = document.querySelector('button[aria-label*="Dismiss"]');
      if (closeButton) {
        log('Clicking Dismiss to close save dialog...', 'info');
        await clickElement(closeButton, 2000);
        return true;
      }
    }

    return false;
  }

  /**
   * Find safe action button (avoids clicking wrong buttons)
   */
  findSafeActionButton() {
    const modal = document.querySelector('.jobs-easy-apply-modal, [data-test-modal]');
    if (!modal) {
      log('No modal found for safe button search', 'warn');
      return null;
    }

    const buttons = modal.querySelectorAll('button');
    // EXPANDED avoid list - same as findButtonAdvanced
    const avoidTexts = [
      'save',
      'preferences',
      'preference',
      'match',
      'matching',
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
      'show'
    ];

    // Try to find primary button first
    for (const button of buttons) {
      if (button.disabled) continue;

      const buttonText = (button.textContent || button.getAttribute('aria-label') || '').toLowerCase().trim();

      // Skip buttons we want to avoid
      if (avoidTexts.some(avoid => buttonText.includes(avoid))) {
        log(`Skipping unsafe button: "${buttonText}"`, 'warn');
        continue;
      }

      // Only click visible buttons
      const style = window.getComputedStyle(button);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        // Prefer primary buttons
        if (button.classList.contains('artdeco-button--primary')) {
          log(`Found safe primary button: "${buttonText}"`, 'info');
          return button;
        }
      }
    }

    // If no primary button, return any safe button
    for (const button of buttons) {
      if (button.disabled) continue;

      const buttonText = (button.textContent || button.getAttribute('aria-label') || '').toLowerCase().trim();

      if (avoidTexts.some(avoid => buttonText.includes(avoid))) {
        continue;
      }

      const style = window.getComputedStyle(button);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        log(`Found safe button: "${buttonText}"`, 'info');
        return button;
      }
    }

    log('No safe button found', 'warn');
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
   * Find buttons with advanced logic (IMPROVED - avoids wrong buttons)
   */
  findButtonAdvanced(textOptions) {
    // Words to STRICTLY avoid in buttons - EXPANDED LIST
    const avoidWords = [
      'preferences',
      'preference',
      'match',
      'matching',
      'save',
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
      'show'
    ];

    // Only search within the Easy Apply modal (STRICT)
    const modal = document.querySelector('.jobs-easy-apply-modal, [data-test-modal], .artdeco-modal');

    // If no modal, don't search at all to avoid clicking wrong buttons
    if (!modal) {
      log('No Easy Apply modal found, skipping button search', 'warn');
      return null;
    }

    const allButtons = modal.querySelectorAll('button, [role="button"], input[type="submit"]');

    for (const button of allButtons) {
      const buttonText = (button.textContent || button.getAttribute('aria-label') || button.value || '').toLowerCase().trim();

      // STRICT: Skip if button contains ANY avoid words
      const shouldAvoid = avoidWords.some(word => buttonText.includes(word));
      if (shouldAvoid) {
        log(`Skipping button with avoided word: "${buttonText}"`, 'warn');
        continue;
      }

      // Check if this button matches what we're looking for
      for (const text of textOptions) {
        if (buttonText.includes(text.toLowerCase())) {
          // Make sure it's visible and not disabled
          const style = window.getComputedStyle(button);
          if (style.display !== 'none' && style.visibility !== 'hidden' && !button.disabled) {
            log(`✅ Found button: "${buttonText}" for search: "${text}"`, 'success');
            return button;
          }
        }
      }
    }

    log(`No button found for: ${textOptions.join(', ')}`, 'warn');
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
   * Fill field with intelligent fallback values
   */
  async fillFieldIntelligent(field) {
    const label = getFieldLabel(field);
    log(`Intelligently filling required field: ${label}`, 'info');

    // Try normal fill first
    await this.fillField(field);

    // If still empty, use fallback values
    if (!field.value || field.value.trim() === '') {
      const tagName = field.tagName.toLowerCase();

      if (tagName === 'select') {
        // Select first non-empty option
        const options = Array.from(field.options);
        const validOption = options.find(opt => opt.value && opt.value !== '' && opt.value !== 'Select');
        if (validOption) {
          field.value = validOption.value;
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else if (field.type === 'number') {
        field.value = '0';
        field.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        field.value = 'N/A';
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
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
        if (inputType === 'radio') {
          // Handle radio buttons
          if (!field.checked) {
            const name = field.name;
            const radioGroup = formContainer.querySelectorAll(`input[type="radio"][name="${name}"]`);
            await this.fillRadioGroup(Array.from(radioGroup));
          }
        } else if (inputType === 'checkbox') {
          // Handle checkboxes
          await this.fillCheckbox(field);
        } else if (fieldType === 'select') {
          // Handle dropdowns
          await this.fillSelect(field);
        } else {
          // Handle text inputs, email, phone, etc.
          await this.fillField(field);
        }

        await sleep(randomDelay(100, 300));
      } catch (error) {
        log(`Error filling field: ${error.message}`, 'warn');
      }
    }

    log('Finished filling form fields', 'success');
  }

  /**
   * Fill a form field based on its label
   */
  async fillField(field) {
    const label = getFieldLabel(field);
    if (!label) return;

    log(`Filling field: ${label}`, 'info');

    // Detect question type
    const questionType = detectQuestionType(label);

    let value = '';

    if (questionType) {
      value = await Storage.getAnswerForQuestion(questionType, this.profile);
    }

    // Field-specific mappings
    const lowerLabel = label.toLowerCase();

    if (!value) {
      if (lowerLabel.includes('first name') || lowerLabel.includes('firstname')) {
        value = this.profile.firstName;
      } else if (lowerLabel.includes('last name') || lowerLabel.includes('lastname')) {
        value = this.profile.lastName;
      } else if (lowerLabel.includes('email')) {
        value = this.profile.email;
      } else if (lowerLabel.includes('phone') || lowerLabel.includes('mobile')) {
        value = this.profile.phone;
      } else if (lowerLabel.includes('linkedin')) {
        value = this.profile.linkedinUrl;
      } else if (lowerLabel.includes('website') || lowerLabel.includes('portfolio')) {
        value = this.profile.websiteUrl;
      }
    }

    if (value) {
      await fillInput(field, value);
    }
  }

  /**
   * Fill select dropdown
   */
  async fillSelect(select) {
    const label = getFieldLabel(select);
    if (!label) return;

    log(`Filling select: ${label}`, 'info');

    const questionType = detectQuestionType(label);
    if (questionType) {
      const value = await Storage.getAnswerForQuestion(questionType, this.profile);
      if (value) {
        await selectOption(select, value);
      }
    }
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
   * Fill checkbox
   */
  async fillCheckbox(checkbox) {
    const label = getFieldLabel(checkbox);
    log(`Found checkbox: ${label}`, 'info');

    // Generally safe to check optional checkboxes
    // Skip if it looks like terms/conditions
    const lowerLabel = label.toLowerCase();
    if (!lowerLabel.includes('terms') && !lowerLabel.includes('agree') && !lowerLabel.includes('acknowledge')) {
      // Leave unchecked for now
    }
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
