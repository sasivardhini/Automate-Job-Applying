// Storage management for the extension

/**
 * Storage API wrapper
 */
const Storage = {
  /**
   * Get data from storage
   */
  async get(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key];
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  /**
   * Set data in storage
   */
  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },

  /**
   * Remove data from storage
   */
  async remove(key) {
    try {
      await chrome.storage.local.remove(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  },

  /**
   * Clear all storage
   */
  async clear() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  },

  /**
   * Get user profile
   */
  async getProfile() {
    const profile = await this.get(STORAGE_KEYS.PROFILE);
    return profile || {
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
    };
  },

  /**
   * Save user profile
   */
  async saveProfile(profile) {
    return await this.set(STORAGE_KEYS.PROFILE, profile);
  },

  /**
   * Get settings
   */
  async getSettings() {
    const settings = await this.get(STORAGE_KEYS.SETTINGS);
    return settings || DEFAULT_SETTINGS;
  },

  /**
   * Save settings
   */
  async saveSettings(settings) {
    return await this.set(STORAGE_KEYS.SETTINGS, settings);
  },

  /**
   * Get all applications
   */
  async getApplications() {
    const applications = await this.get(STORAGE_KEYS.APPLICATIONS);
    return applications || [];
  },

  /**
   * Add new application
   */
  async addApplication(application) {
    const applications = await this.getApplications();
    applications.unshift({
      ...application,
      id: Date.now().toString(),
      appliedAt: Date.now()
    });
    return await this.set(STORAGE_KEYS.APPLICATIONS, applications);
  },

  /**
   * Update application status
   */
  async updateApplication(jobId, updates) {
    const applications = await this.getApplications();
    const index = applications.findIndex(app => app.jobId === jobId);

    if (index !== -1) {
      applications[index] = { ...applications[index], ...updates };
      return await this.set(STORAGE_KEYS.APPLICATIONS, applications);
    }

    return false;
  },

  /**
   * Check if job was already applied to
   */
  async wasJobApplied(jobId) {
    const applications = await this.getApplications();
    return applications.some(app =>
      app.jobId === jobId && app.status === APPLICATION_STATUS.APPLIED
    );
  },

  /**
   * Get common answers
   */
  async getCommonAnswers() {
    const answers = await this.get(STORAGE_KEYS.ANSWERS);
    return answers || {};
  },

  /**
   * Save common answers
   */
  async saveCommonAnswers(answers) {
    return await this.set(STORAGE_KEYS.ANSWERS, answers);
  },

  /**
   * Get answer for question type
   */
  async getAnswerForQuestion(questionType, profile) {
    const commonAnswers = await this.getCommonAnswers();

    // Check custom answers first
    if (commonAnswers[questionType]) {
      return commonAnswers[questionType];
    }

    // COMPREHENSIVE answer map with smart defaults
    const answerMap = {
      // Work Experience
      'YEARS_EXPERIENCE': profile.yearsExperience || '5',
      'TECH_EXPERIENCE': '2', // Default 2 years with any technology
      'PRIOR_EXPERIENCE': 'Yes',
      'INTERNSHIP_EXPERIENCE': 'Yes',

      // Authorization & Sponsorship
      'AUTHORIZATION': profile.workAuthorization || 'Yes',
      'SPONSORSHIP': profile.requireSponsorship || 'No',
      'CITIZENSHIP': 'Yes',

      // Compensation & Start Date
      'SALARY': profile.expectedSalary || '80000',
      'HOURLY_RATE': '500', // Default hourly rate in INR
      'CURRENT_CTC': '600000', // Default current CTC in INR (6 LPA)
      'EXPECTED_CTC': '800000', // Default expected CTC in INR (8 LPA)
      'START_DATE': 'Immediately',
      'NOTICE_PERIOD': profile.noticePeriod || '2 weeks',
      'NOTICE_PERIOD_STATUS': 'Yes', // Default: Yes (serving notice period) - changed from 'Left the job' for better dropdown matching

      // Location & Relocation
      'LOCATION': profile.jobLocation || '',
      'RELOCATION': 'Yes', // Always say yes to relocation
      'REMOTE_WORK': 'Yes',
      'COMFORTABLE_SCHEDULE': 'Yes', // Comfortable with any schedule

      // Personal Info
      'LINKEDIN_URL': profile.linkedinUrl || '',
      'WEBSITE': profile.websiteUrl || '',
      'GENDER': 'Prefer not to say',
      'RACE': 'Prefer not to say',
      'VETERAN': 'No',
      'DISABILITY': 'No',
      'CLEARANCE': 'None',

      // Education
      'DEGREE': 'Bachelor\'s Degree',
      'GRADUATION': '2020',
      'CERTIFICATIONS': 'None',
      'IIT_GRADUATE': 'No', // Default No for IIT

      // Work Details
      'CURRENT_EMPLOYER': 'Confidential',
      'MANAGE_TEAM': '0',

      // Open-ended questions
      'WHY_WORK': 'I am excited about this opportunity and believe my skills align well with your requirements.',
      'REFERRAL': 'LinkedIn',
      'COVER_LETTER': 'I am very interested in this position and believe I would be a great fit for your team.'
    };

    return answerMap[questionType] || '';
  },

  /**
   * Get statistics
   */
  async getStatistics() {
    const applications = await this.getApplications();

    return {
      total: applications.length,
      applied: applications.filter(app => app.status === APPLICATION_STATUS.APPLIED).length,
      failed: applications.filter(app => app.status === APPLICATION_STATUS.FAILED).length,
      skipped: applications.filter(app => app.status === APPLICATION_STATUS.SKIPPED).length,
      today: applications.filter(app => {
        const today = new Date().setHours(0, 0, 0, 0);
        const appDate = new Date(app.appliedAt).setHours(0, 0, 0, 0);
        return appDate === today;
      }).length
    };
  },

  /**
   * Get analytics data
   */
  async getAnalytics() {
    const analytics = await this.get(STORAGE_KEYS.ANALYTICS);
    return analytics || {
      totalAttempts: 0,
      successfulApplications: 0,
      failedApplications: 0,
      skippedJobs: 0,
      averageTimePerJob: 0,
      totalTimeSpent: 0,
      formComplexityScores: [],
      errorTypes: {},
      successRate: 0,
      lastRunDate: null,
      sessionsCompleted: 0
    };
  },

  /**
   * Update analytics
   */
  async updateAnalytics(updates) {
    const analytics = await this.getAnalytics();
    const updated = { ...analytics, ...updates };

    // Calculate success rate
    const totalCompleted = updated.successfulApplications + updated.failedApplications;
    updated.successRate = totalCompleted > 0
      ? (updated.successfulApplications / totalCompleted * 100).toFixed(2)
      : 0;

    return await this.set(STORAGE_KEYS.ANALYTICS, updated);
  },

  /**
   * Track error
   */
  async trackError(errorType) {
    const analytics = await this.getAnalytics();
    const errorTypes = analytics.errorTypes || {};
    errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;

    return await this.updateAnalytics({ errorTypes });
  },

  /**
   * Get filters
   */
  async getFilters() {
    const filters = await this.get(STORAGE_KEYS.FILTERS);
    return filters || {
      keywords: [],
      excludeKeywords: [],
      minSalary: null,
      maxSalary: null,
      locations: [],
      jobTypes: [], // remote, hybrid, onsite
      experienceLevels: [], // entry, mid, senior
      companySize: [], // startup, small, medium, large
      industries: []
    };
  },

  /**
   * Save filters
   */
  async saveFilters(filters) {
    return await this.set(STORAGE_KEYS.FILTERS, filters);
  },

  /**
   * Get company blacklist
   */
  async getBlacklist() {
    const blacklist = await this.get(STORAGE_KEYS.BLACKLIST);
    return blacklist || [];
  },

  /**
   * Add company to blacklist
   */
  async addToBlacklist(companyName, reason = '') {
    const blacklist = await this.getBlacklist();
    if (!blacklist.find(item => item.company.toLowerCase() === companyName.toLowerCase())) {
      blacklist.push({
        company: companyName,
        reason,
        addedAt: Date.now()
      });
      return await this.set(STORAGE_KEYS.BLACKLIST, blacklist);
    }
    return false;
  },

  /**
   * Remove company from blacklist
   */
  async removeFromBlacklist(companyName) {
    const blacklist = await this.getBlacklist();
    const filtered = blacklist.filter(
      item => item.company.toLowerCase() !== companyName.toLowerCase()
    );
    return await this.set(STORAGE_KEYS.BLACKLIST, filtered);
  },

  /**
   * Check if company is blacklisted
   */
  async isBlacklisted(companyName) {
    const blacklist = await this.getBlacklist();
    return blacklist.some(
      item => item.company.toLowerCase() === companyName.toLowerCase()
    );
  },

  /**
   * Get application history (detailed logs)
   */
  async getHistory() {
    const history = await this.get(STORAGE_KEYS.HISTORY);
    return history || [];
  },

  /**
   * Add history entry
   */
  async addHistory(entry) {
    const history = await this.getHistory();
    history.unshift({
      ...entry,
      timestamp: Date.now()
    });

    // Keep only last 1000 entries
    if (history.length > 1000) {
      history.splice(1000);
    }

    return await this.set(STORAGE_KEYS.HISTORY, history);
  },

  /**
   * Export data for backup/analysis
   */
  async exportData() {
    const [profile, applications, settings, analytics, filters, blacklist] = await Promise.all([
      this.getProfile(),
      this.getApplications(),
      this.getSettings(),
      this.getAnalytics(),
      this.getFilters(),
      this.getBlacklist()
    ]);

    return {
      profile,
      applications,
      settings,
      analytics,
      filters,
      blacklist,
      exportedAt: Date.now(),
      version: '2.0'
    };
  },

  /**
   * Import data from backup
   */
  async importData(data) {
    try {
      if (data.profile) await this.saveProfile(data.profile);
      if (data.settings) await this.saveSettings(data.settings);
      if (data.analytics) await this.set(STORAGE_KEYS.ANALYTICS, data.analytics);
      if (data.filters) await this.saveFilters(data.filters);
      if (data.blacklist) await this.set(STORAGE_KEYS.BLACKLIST, data.blacklist);
      if (data.applications) await this.set(STORAGE_KEYS.APPLICATIONS, data.applications);

      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  },

  /**
   * Check rate limits (hourly and daily)
   */
  async checkRateLimits() {
    const applications = await this.getApplications();
    const now = Date.now();

    // Check hourly limit
    const lastHour = now - (60 * 60 * 1000);
    const applicationsLastHour = applications.filter(app =>
      app.appliedAt > lastHour && app.status === APPLICATION_STATUS.APPLIED
    ).length;

    // Check daily limit
    const today = new Date().setHours(0, 0, 0, 0);
    const applicationsToday = applications.filter(app => {
      const appDate = new Date(app.appliedAt).setHours(0, 0, 0, 0);
      return appDate === today && app.status === APPLICATION_STATUS.APPLIED;
    }).length;

    const settings = await this.getSettings();
    const hourlyLimit = settings.maxApplicationsPerHour || SAFETY_LIMITS.MAX_APPLICATIONS_PER_HOUR;
    const dailyLimit = settings.maxApplicationsPerDay || SAFETY_LIMITS.MAX_APPLICATIONS_PER_DAY;

    return {
      hourly: {
        count: applicationsLastHour,
        limit: hourlyLimit,
        remaining: Math.max(0, hourlyLimit - applicationsLastHour),
        exceeded: applicationsLastHour >= hourlyLimit
      },
      daily: {
        count: applicationsToday,
        limit: dailyLimit,
        remaining: Math.max(0, dailyLimit - applicationsToday),
        exceeded: applicationsToday >= dailyLimit
      }
    };
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
