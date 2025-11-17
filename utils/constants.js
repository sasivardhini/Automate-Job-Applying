// Storage keys
const STORAGE_KEYS = {
  PROFILE: 'userProfile',
  APPLICATIONS: 'applications',
  SETTINGS: 'settings',
  ANSWERS: 'commonAnswers',
  ANALYTICS: 'botAnalytics',
  FILTERS: 'jobFilters',
  HISTORY: 'applicationHistory',
  BLACKLIST: 'companyBlacklist'
};

// LinkedIn selectors - UPDATED FOR 2025+
const SELECTORS = {
  EASY_APPLY_BUTTON: 'button.jobs-apply-button, button[aria-label*="Easy Apply"], .jobs-apply-button',
  MODAL: '.jobs-easy-apply-modal, [data-test-modal], .artdeco-modal',
  NEXT_BUTTON: 'button[aria-label*="Continue"], button[aria-label*="Next"], button.artdeco-button--primary',
  REVIEW_BUTTON: 'button[aria-label*="Review"]',
  SUBMIT_BUTTON: 'button[aria-label*="Submit"], button[aria-label*="submit application"]',
  FORM_CONTAINER: '.jobs-easy-apply-content, .jobs-easy-apply-modal__content, form',
  TEXT_INPUT: 'input[type="text"]',
  EMAIL_INPUT: 'input[type="email"]',
  TEL_INPUT: 'input[type="tel"]',
  NUMBER_INPUT: 'input[type="number"]',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  RADIO: 'input[type="radio"]',
  CHECKBOX: 'input[type="checkbox"]',
  FILE_INPUT: 'input[type="file"]',
  JOB_TITLE: '.job-details-jobs-unified-top-card__job-title, h1.t-24, .job-details-jobs-unified-top-card__job-title-link',
  COMPANY_NAME: '.job-details-jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name a',
  JOB_LINK: 'a.job-card-list__title, a.job-card-container__link',
  JOB_CARD: '.job-card-container, .jobs-search-results__list-item, .scaffold-layout__list-item',
  ALL_INPUTS: 'input, select, textarea',
  JOB_DESCRIPTION: '.jobs-description, .jobs-box__html-content, .jobs-description-content',
  JOB_LOCATION: '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet'
};

// Common question patterns - ENHANCED FOR AI
const QUESTION_PATTERNS = {
  YEARS_EXPERIENCE: /years.*experience|experience.*years|how many years|total.*years|overall.*experience/i,
  TECH_EXPERIENCE: /years.*experience.*with|experience.*with|worked with|proficiency.*with|familiar.*with/i,
  AUTHORIZATION: /authorized.*work|work.*authorization|legally.*work|legal.*right.*work|permitted.*work/i,
  SPONSORSHIP: /require.*sponsorship|sponsorship.*require|visa.*sponsor|need.*visa|visa.*support/i,
  SALARY: /salary.*expectation|expected.*salary|compensation|desired.*salary|salary.*range/i,
  HOURLY_RATE: /hourly.*expectation|hourly.*rate|hourly.*salary|expected.*hourly|hour.*expectation|hourly.*INR|hourly.*USD|rate.*per.*hour/i,
  START_DATE: /start.*date|available.*start|when.*start|earliest.*start|join.*date|joining.*date/i,
  NOTICE_PERIOD: /notice.*period|available.*notice|how.*soon|availability/i,
  NOTICE_PERIOD_STATUS: /serving.*notice|notice.*period.*left|left.*job|serving.*notice.*period|resignation.*submitted/i,
  RELOCATION: /willing.*relocate|relocate|can you relocate|able to relocate|open.*relocation/i,
  LOCATION: /location|city|where.*located|current.*location|residing.*in/i,
  GENDER: /gender|sex/i,
  RACE: /race|ethnicity/i,
  VETERAN: /veteran|military.*service/i,
  DISABILITY: /disability|disabled|accommodations/i,
  LINKEDIN_URL: /linkedin.*url|linkedin.*profile|linkedin.*link/i,
  WEBSITE: /website|portfolio|github|personal.*site|online.*portfolio/i,
  COVER_LETTER: /cover.*letter|letter.*interest|motivation.*letter/i,
  WHY_WORK: /why.*work|why.*join|why.*interested|why.*company|what.*interests.*you/i,
  REFERRAL: /referred|referral|how.*hear|who.*referred|employee.*referral/i,
  CITIZENSHIP: /citizen|citizenship|nationality/i,
  DEGREE: /degree|education|qualification|bachelor|master|phd|diploma/i,
  GRADUATION: /graduation.*date|when.*graduate|graduated|completion.*date|year.*graduated/i,
  CERTIFICATIONS: /certification|certified|license|credentials|professional.*certification/i,
  CLEARANCE: /security.*clearance|clearance|background.*check/i,
  CURRENT_EMPLOYER: /current.*employer|currently.*work|present.*company|working.*at/i,
  MANAGE_TEAM: /manage.*team|team.*size|people.*manage|direct.*reports|team.*lead/i,
  REMOTE_WORK: /remote.*work|work.*remote|work.*home|distributed.*team|work.*anywhere/i,
  IIT_GRADUATE: /IIT|indian institute of technology|graduate.*IIT|current student.*IIT|IIT.*alumni/i,
  COMFORTABLE_SCHEDULE: /comfortable.*schedule|comfortable.*hours|comfortable.*full-time|comfortable.*8 hours|flexible.*hours/i,
  PRIOR_EXPERIENCE: /prior.*experience|prior.*internship|previous.*experience|work experience|past.*experience/i,
  INTERNSHIP_EXPERIENCE: /internship.*experience|any.*internship|completed.*internship/i,
  CURRENT_CTC: /current.*ctc|current.*compensation|present.*salary|existing.*salary/i,
  EXPECTED_CTC: /expected.*ctc|expected.*compensation|expecting.*salary|desired.*ctc|salary.*expectation/i,
  PROFESSIONAL_SUMMARY: /professional.*summary|about.*yourself|describe.*yourself|brief.*introduction/i,
  SKILLS: /skills|technical.*skills|core.*competencies|proficiencies/i,
  LANGUAGES: /languages|language.*proficiency|speak|fluent.*in/i,
  PROJECTS: /projects|portfolio.*projects|major.*projects|key.*projects/i,
  ACHIEVEMENTS: /achievements|accomplishments|awards|recognition/i,
  REFERENCES: /references|professional.*references|can.*contact/i,
  COMMUTE: /commute|travel.*distance|willing.*travel|daily.*commute/i,
  SHIFT_PREFERENCE: /shift.*preference|preferred.*shift|night.*shift|day.*shift/i,
  OVERTIME: /overtime|work.*extra.*hours|flexible.*timing/i,
  CONTRACT: /ok.*contract|contract.*role|contract.*position|contract.*job|comfortable.*contract|accept.*contract|contract.*work/i,
  OK_WITH: /ok with|okay with|comfortable with|fine with|accept/i
};

// Advanced settings with AI features
const DEFAULT_SETTINGS = {
  // Core Settings
  autoApply: false,
  applyDelay: 2000, // milliseconds between actions
  skipApplied: true,
  notifications: true,
  maxApplicationsPerDay: 50,

  // Safety & Rate Limiting (mimic human behavior)
  humanizedTiming: true,
  minDelay: 1500,
  maxDelay: 4000,
  randomizeDelays: true,
  pauseBetweenJobs: 3000,
  maxApplicationsPerHour: 10,

  // Smart Filtering
  enableSmartFiltering: true,
  skipBlacklistedCompanies: true,
  skipMultiStepForms: false, // Skip forms with >5 steps
  skipFileUploads: false, // Skip if requires file upload beyond resume

  // AI Features
  useContextAwareAnswers: true,
  learnFromPastApplications: true,
  improveAnswersOverTime: true,

  // Application Modes
  mode: 'copilot', // 'autopilot' or 'copilot' (copilot pauses for review)
  autoSubmit: true,
  pauseOnErrors: true,

  // Tracking
  trackApplications: true,
  saveApplicationData: true,
  exportApplicationHistory: false
};

// Application status
const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPLIED: 'applied',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  REVIEWED: 'reviewed',
  BLOCKED: 'blocked' // Company blacklisted
};

// Error types for analytics
const ERROR_TYPES = {
  FORM_VALIDATION: 'form_validation',
  NETWORK: 'network_error',
  SESSION_EXPIRED: 'session_expired',
  ELEMENT_NOT_FOUND: 'element_not_found',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
};

// LinkedIn safety limits (2025 guidelines)
const SAFETY_LIMITS = {
  MAX_APPLICATIONS_PER_DAY: 50,
  MAX_APPLICATIONS_PER_HOUR: 10,
  MIN_DELAY_BETWEEN_ACTIONS: 1000,
  MAX_DELAY_BETWEEN_ACTIONS: 5000,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  COOL_DOWN_PERIOD: 5 * 60 * 1000 // 5 minutes after hitting limit
};

// Form complexity scoring
const FORM_COMPLEXITY = {
  SIMPLE: 1, // Just contact info
  MODERATE: 2, // Contact + 1-3 questions
  COMPLEX: 3, // Contact + 4-7 questions
  VERY_COMPLEX: 4, // Contact + 8+ questions or file uploads
  EXPERT: 5 // Multiple pages, video, assessments
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_KEYS,
    SELECTORS,
    QUESTION_PATTERNS,
    DEFAULT_SETTINGS,
    APPLICATION_STATUS,
    ERROR_TYPES,
    SAFETY_LIMITS,
    FORM_COMPLEXITY
  };
}
