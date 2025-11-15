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

    // Fallback to profile data
    const answerMap = {
      'YEARS_EXPERIENCE': profile.yearsExperience,
      'AUTHORIZATION': profile.workAuthorization,
      'SPONSORSHIP': profile.requireSponsorship,
      'SALARY': profile.expectedSalary,
      'NOTICE_PERIOD': profile.noticePeriod,
      'LOCATION': profile.willingToRelocate,
      'LINKEDIN_URL': profile.linkedinUrl,
      'WEBSITE': profile.websiteUrl
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
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
