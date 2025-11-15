// Content script for LinkedIn Easy Apply automation

class LinkedInEasyApplyBot {
  constructor() {
    this.isRunning = false;
    this.currentJobId = null;
    this.profile = null;
    this.settings = null;
    this.applicationInProgress = false;
    this.init();
  }

  async init() {
    log('LinkedIn Easy Apply Bot initialized');

    // Load profile and settings
    await this.loadData();

    // Add control panel
    this.addControlPanel();

    // Listen for Easy Apply buttons
    this.observePage();

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep channel open for async response
    });
  }

  async loadData() {
    this.profile = await Storage.getProfile();
    this.settings = await Storage.getSettings();
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
      </div>
    `;

    document.body.appendChild(panel);

    // Add toggle button listener
    document.getElementById('easy-apply-toggle').addEventListener('click', () => {
      this.toggleAutoApply();
    });
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
      showNotification('Auto-apply started', 'success');
      this.startAutoApply();
    } else {
      showNotification('Auto-apply stopped', 'info');
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
   * Observe page for Easy Apply buttons
   */
  observePage() {
    // Watch for Easy Apply buttons
    const observer = new MutationObserver(() => {
      if (this.settings.autoApply && !this.applicationInProgress) {
        this.checkForEasyApplyButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Start auto-apply process
   */
  async startAutoApply() {
    if (!this.settings.autoApply) return;

    // Check daily limit
    const stats = await Storage.getStatistics();
    if (stats.today >= this.settings.maxApplicationsPerDay) {
      showNotification('Daily application limit reached', 'warn');
      this.settings.autoApply = false;
      await Storage.saveSettings(this.settings);
      return;
    }

    this.checkForEasyApplyButton();
  }

  /**
   * Check for Easy Apply button on current page
   */
  async checkForEasyApplyButton() {
    if (this.applicationInProgress) return;

    const easyApplyButton = document.querySelector(SELECTORS.EASY_APPLY_BUTTON);

    if (easyApplyButton && easyApplyButton.textContent.includes('Easy Apply')) {
      const jobDetails = extractJobDetails();

      if (!jobDetails || !jobDetails.jobId) {
        log('Could not extract job details', 'warn');
        return;
      }

      // Check if already applied
      if (this.settings.skipApplied) {
        const wasApplied = await Storage.wasJobApplied(jobDetails.jobId);
        if (wasApplied) {
          log('Job already applied, skipping', 'info');
          await Storage.addApplication({
            ...jobDetails,
            status: APPLICATION_STATUS.SKIPPED
          });
          return;
        }
      }

      // Apply to job
      await this.applyToJob(easyApplyButton, jobDetails);
    }
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
   * Process application form through all steps
   */
  async processApplicationForm() {
    let currentStep = 0;
    const maxSteps = 10; // Prevent infinite loops

    while (currentStep < maxSteps) {
      await sleep(randomDelay(1000, 2000));

      // Fill current form
      await this.fillCurrentForm();

      // Wait for form to process
      await sleep(1000);

      // Check for next/review/submit buttons
      const submitButton = this.findButton(['Submit application', 'Submit']);
      if (submitButton) {
        log('Found submit button, submitting application', 'info');
        await clickElement(submitButton, 2000);
        return true;
      }

      const reviewButton = this.findButton(['Review', 'Review your application']);
      if (reviewButton) {
        log('Found review button, clicking', 'info');
        await clickElement(reviewButton, 1000);
        currentStep++;
        continue;
      }

      const nextButton = this.findButton(['Next', 'Continue']);
      if (nextButton) {
        log('Found next button, moving to next step', 'info');
        await clickElement(nextButton, 1000);
        currentStep++;
        continue;
      }

      // No more buttons found
      log('No more navigation buttons found', 'warn');
      break;
    }

    return false;
  }

  /**
   * Fill current form page
   */
  async fillCurrentForm() {
    log('Filling current form page', 'info');

    const formContainer = document.querySelector(SELECTORS.FORM_CONTAINER);
    if (!formContainer) return;

    // Fill text inputs
    const textInputs = formContainer.querySelectorAll(`${SELECTORS.TEXT_INPUT}, ${SELECTORS.EMAIL_INPUT}, ${SELECTORS.TEL_INPUT}, ${SELECTORS.NUMBER_INPUT}`);
    for (const input of textInputs) {
      await this.fillField(input);
    }

    // Fill textareas
    const textareas = formContainer.querySelectorAll(SELECTORS.TEXTAREA);
    for (const textarea of textareas) {
      await this.fillField(textarea);
    }

    // Fill selects
    const selects = formContainer.querySelectorAll(SELECTORS.SELECT);
    for (const select of selects) {
      await this.fillSelect(select);
    }

    // Handle radio buttons
    const radioGroups = this.getRadioGroups(formContainer);
    for (const [name, radios] of Object.entries(radioGroups)) {
      await this.fillRadioGroup(radios);
    }

    // Handle checkboxes
    const checkboxes = formContainer.querySelectorAll(SELECTORS.CHECKBOX);
    for (const checkbox of checkboxes) {
      await this.fillCheckbox(checkbox);
    }
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
    const closeButton = document.querySelector('button[aria-label*="Dismiss"]');
    if (closeButton) {
      await clickElement(closeButton);
    }
  }

  /**
   * Handle messages from popup
   */
  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'applyNow':
        const button = document.querySelector(SELECTORS.EASY_APPLY_BUTTON);
        if (button) {
          const jobDetails = extractJobDetails();
          await this.applyToJob(button, jobDetails);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No Easy Apply button found' });
        }
        break;

      case 'updateSettings':
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
