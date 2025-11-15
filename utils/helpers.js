// Helper functions for the extension

/**
 * Wait for a specified amount of time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for an element to appear in the DOM
 */
async function waitForElement(selector, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await sleep(100);
  }

  return null;
}

/**
 * Wait for multiple elements to appear
 */
async function waitForElements(selector, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) return elements;
    await sleep(100);
  }

  return [];
}

/**
 * Click element with retry logic
 */
async function clickElement(element, delay = 500) {
  if (!element) return false;

  try {
    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);

    // Try multiple click methods
    if (element.click) {
      element.click();
    } else {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    await sleep(delay);
    return true;
  } catch (error) {
    console.error('Click error:', error);
    return false;
  }
}

/**
 * Fill input field with value
 */
async function fillInput(input, value, delay = 300) {
  if (!input || !value) return false;

  try {
    // Focus the input
    input.focus();
    await sleep(100);

    // Clear existing value
    input.value = '';

    // Set new value
    input.value = value;

    // Trigger events
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));

    await sleep(delay);
    return true;
  } catch (error) {
    console.error('Fill input error:', error);
    return false;
  }
}

/**
 * Select dropdown option
 */
async function selectOption(select, value, delay = 300) {
  if (!select) return false;

  try {
    // Try to find option by value or text
    const options = Array.from(select.options);
    const option = options.find(opt =>
      opt.value === value ||
      opt.text.toLowerCase().includes(value.toLowerCase())
    );

    if (option) {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(delay);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Select option error:', error);
    return false;
  }
}

/**
 * Extract job details from the page
 */
function extractJobDetails() {
  try {
    const jobTitle = document.querySelector(SELECTORS.JOB_TITLE)?.textContent?.trim() || 'Unknown';
    const companyName = document.querySelector(SELECTORS.COMPANY_NAME)?.textContent?.trim() || 'Unknown';
    const jobUrl = window.location.href;
    const jobId = extractJobIdFromUrl(jobUrl);

    return {
      jobId,
      jobTitle,
      companyName,
      jobUrl,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Extract job details error:', error);
    return null;
  }
}

/**
 * Extract job ID from LinkedIn URL
 */
function extractJobIdFromUrl(url) {
  try {
    const match = url.match(/\/jobs\/view\/(\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a button contains specific text
 */
function buttonContainsText(button, text) {
  const buttonText = button.textContent || button.getAttribute('aria-label') || '';
  return buttonText.toLowerCase().includes(text.toLowerCase());
}

/**
 * Get label text for an input field
 */
function getFieldLabel(input) {
  try {
    // Try to find label by 'for' attribute
    const id = input.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent.trim();
    }

    // Try to find parent label
    const parentLabel = input.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();

    // Try to find aria-label
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    // Try to find placeholder
    const placeholder = input.getAttribute('placeholder');
    if (placeholder) return placeholder.trim();

    // Try to find nearby text
    const parent = input.closest('.jobs-easy-apply-form-element, .fb-single-line-text, .fb-text-selectable');
    if (parent) {
      const labelElement = parent.querySelector('label, .fb-form-element-label');
      if (labelElement) return labelElement.textContent.trim();
    }

    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Detect question type from label
 */
function detectQuestionType(label) {
  const lowerLabel = label.toLowerCase();

  for (const [type, pattern] of Object.entries(QUESTION_PATTERNS)) {
    if (pattern.test(label)) {
      return type;
    }
  }

  return null;
}

/**
 * Generate random delay for natural behavior
 */
function randomDelay(min = 500, max = 1500) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Log message with timestamp
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = '[LinkedIn Easy Apply Bot]';

  switch (type) {
    case 'error':
      console.error(`${prefix} ${timestamp}:`, message);
      break;
    case 'warn':
      console.warn(`${prefix} ${timestamp}:`, message);
      break;
    case 'success':
      console.log(`%c${prefix} ${timestamp}: ${message}`, 'color: green; font-weight: bold');
      break;
    default:
      console.log(`${prefix} ${timestamp}:`, message);
  }
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `easy-apply-notification easy-apply-notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#0073b1'};
    color: white;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 999999;
    font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sleep,
    waitForElement,
    waitForElements,
    clickElement,
    fillInput,
    selectOption,
    extractJobDetails,
    extractJobIdFromUrl,
    buttonContainsText,
    getFieldLabel,
    detectQuestionType,
    randomDelay,
    log,
    showNotification
  };
}
