// Storage keys
const STORAGE_KEYS = {
  PROFILE: 'userProfile',
  APPLICATIONS: 'applications',
  SETTINGS: 'settings',
  ANSWERS: 'commonAnswers'
};

// LinkedIn selectors
const SELECTORS = {
  EASY_APPLY_BUTTON: 'button.jobs-apply-button',
  MODAL: '.jobs-easy-apply-modal',
  NEXT_BUTTON: 'button[aria-label*="Continue"], button[aria-label*="Next"], button:contains("Next")',
  REVIEW_BUTTON: 'button[aria-label*="Review"], button:contains("Review")',
  SUBMIT_BUTTON: 'button[aria-label*="Submit"], button:contains("Submit application")',
  FORM_CONTAINER: '.jobs-easy-apply-content',
  TEXT_INPUT: 'input[type="text"]',
  EMAIL_INPUT: 'input[type="email"]',
  TEL_INPUT: 'input[type="tel"]',
  NUMBER_INPUT: 'input[type="number"]',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  RADIO: 'input[type="radio"]',
  CHECKBOX: 'input[type="checkbox"]',
  FILE_INPUT: 'input[type="file"]',
  JOB_TITLE: '.job-details-jobs-unified-top-card__job-title',
  COMPANY_NAME: '.job-details-jobs-unified-top-card__company-name',
  JOB_LINK: 'a.job-card-list__title'
};

// Common question patterns
const QUESTION_PATTERNS = {
  YEARS_EXPERIENCE: /years.*experience|experience.*years/i,
  AUTHORIZATION: /authorized.*work|work.*authorization|legally.*work/i,
  SPONSORSHIP: /require.*sponsorship|sponsorship.*require|visa.*sponsor/i,
  SALARY: /salary.*expectation|expected.*salary|compensation/i,
  START_DATE: /start.*date|available.*start|when.*start/i,
  NOTICE_PERIOD: /notice.*period|available.*notice/i,
  LOCATION: /willing.*relocate|relocate|location/i,
  GENDER: /gender|sex/i,
  RACE: /race|ethnicity/i,
  VETERAN: /veteran/i,
  DISABILITY: /disability|disabled/i,
  LINKEDIN_URL: /linkedin.*url|linkedin.*profile/i,
  WEBSITE: /website|portfolio|github/i,
  COVER_LETTER: /cover.*letter/i
};

// Default settings
const DEFAULT_SETTINGS = {
  autoApply: false,
  applyDelay: 2000, // milliseconds between actions
  skipApplied: true,
  notifications: true,
  maxApplicationsPerDay: 50
};

// Application status
const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPLIED: 'applied',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_KEYS,
    SELECTORS,
    QUESTION_PATTERNS,
    DEFAULT_SETTINGS,
    APPLICATION_STATUS
  };
}
