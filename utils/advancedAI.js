/**
 * Advanced AI-like Intelligence for LinkedIn Easy Apply Bot
 * Provides context-aware question answering and smart decision making
 */

class AdvancedAI {
  /**
   * Analyze question context and generate intelligent answer
   */
  static analyzeQuestionContext(questionText, profile) {
    const lowerQuestion = questionText.toLowerCase();

    // Context patterns with intelligent responses
    const contextPatterns = [
      {
        pattern: /why.*interested|why.*apply|why.*want.*work|why.*join|what.*interests.*you/i,
        generate: (profile) => {
          const jobTitle = profile.jobTitle || 'this position';
          return `I am highly interested in ${jobTitle} because it aligns perfectly with my ${profile.yearsExperience || '5'}+ years of professional experience. I am excited about the opportunity to contribute my skills and grow with your organization. The role matches my career goals and I believe I can make a significant impact on your team's success.`;
        }
      },
      {
        pattern: /tell.*about.*yourself|describe.*yourself|introduce.*yourself/i,
        generate: (profile) => {
          return `I am a dedicated professional with ${profile.yearsExperience || '5'}+ years of experience in ${profile.jobTitle || 'my field'}. I have a proven track record of delivering results and continuously seek opportunities to expand my expertise. I am passionate about innovation, problem-solving, and collaborating with talented teams to achieve organizational goals.`;
        }
      },
      {
        pattern: /strengths|strong.*points|what.*good.*at/i,
        generate: () => {
          return `My key strengths include strong analytical thinking, effective communication, quick learning ability, attention to detail, and excellent problem-solving skills. I thrive in fast-paced environments and excel at both independent work and team collaboration.`;
        }
      },
      {
        pattern: /weakness|areas.*improve|challenges/i,
        generate: () => {
          return `I am continuously working on improving my public speaking skills and becoming more comfortable with large presentations. I believe in ongoing professional development and actively seek feedback to enhance my capabilities.`;
        }
      },
      {
        pattern: /experience.*with.*team|team.*experience|worked.*team/i,
        generate: (profile) => {
          return `Throughout my ${profile.yearsExperience || '5'}+ years of experience, I have successfully collaborated with cross-functional teams ranging from 3 to 15 members. I value diverse perspectives and believe strong teamwork is essential for achieving complex goals.`;
        }
      },
      {
        pattern: /cover.*letter/i,
        generate: (profile) => {
          const jobTitle = profile.jobTitle || 'this position';
          return `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${jobTitle} opportunity. With ${profile.yearsExperience || '5'}+ years of relevant experience, I am confident in my ability to contribute effectively to your team.\n\nMy background includes proven expertise in delivering high-quality results, collaborating with diverse teams, and continuously adapting to new challenges. I am particularly drawn to this role because it aligns with my career aspirations and offers the opportunity to leverage my skills while continuing to grow professionally.\n\nI would welcome the opportunity to discuss how my experience and enthusiasm can benefit your organization.\n\nThank you for your consideration.\n\nBest regards,\n${profile.firstName || ''} ${profile.lastName || ''}`;
        }
      },
      {
        pattern: /salary.*expectation|expected.*salary|salary.*range|compensation/i,
        generate: (profile) => {
          const baseSalary = profile.expectedSalary || '80000';
          const salaryNum = parseInt(baseSalary.replace(/[^0-9]/g, ''));
          if (!isNaN(salaryNum)) {
            const min = salaryNum - 10000;
            const max = salaryNum + 15000;
            return `$${min.toLocaleString()} - $${max.toLocaleString()} annually, depending on the complete compensation package and growth opportunities`;
          }
          return profile.expectedSalary || 'Negotiable based on the complete compensation package';
        }
      },
      {
        pattern: /relocate|relocation|willing.*move|can.*you.*move/i,
        generate: (profile) => {
          if (profile.willingToRelocate === 'Yes') {
            return `Yes, I am open to relocation for the right opportunity. I am flexible and excited about new experiences.`;
          }
          return `I am open to discussing relocation options based on the role requirements and support provided.`;
        }
      },
      {
        pattern: /remote.*work|work.*remote|work.*from.*home/i,
        generate: () => {
          return `Yes, I have extensive experience with remote work and am equipped with a professional home office setup. I am self-motivated, maintain excellent communication with remote teams, and have proven ability to deliver results independently.`;
        }
      },
      {
        pattern: /start.*date|available.*start|when.*can.*start|earliest.*start/i,
        generate: (profile) => {
          return profile.noticePeriod || 'I can start within 2-4 weeks upon receiving an offer, or sooner if needed';
        }
      },
      {
        pattern: /notice.*period|current.*notice/i,
        generate: (profile) => {
          return profile.noticePeriod || '2 weeks';
        }
      },
      {
        pattern: /work.*authorization|authorized.*work|legal.*work/i,
        generate: (profile) => {
          return profile.workAuthorization || 'Yes, I am authorized to work';
        }
      },
      {
        pattern: /sponsor|sponsorship|visa.*sponsor/i,
        generate: (profile) => {
          if (profile.requireSponsorship === 'No') {
            return 'No, I do not require sponsorship';
          }
          return profile.requireSponsorship || 'I am open to discussing sponsorship options';
        }
      },
      {
        pattern: /reference|references|provide.*reference/i,
        generate: () => {
          return 'Yes, I can provide professional references upon request';
        }
      },
      {
        pattern: /linkedin|linkedin.*profile|linkedin.*url/i,
        generate: (profile) => {
          return profile.linkedinUrl || 'Available upon request';
        }
      },
      {
        pattern: /portfolio|website|github|personal.*site/i,
        generate: (profile) => {
          return profile.websiteUrl || 'Available upon request';
        }
      }
    ];

    // Find matching pattern
    for (const pattern of contextPatterns) {
      if (pattern.pattern.test(questionText)) {
        return pattern.generate(profile);
      }
    }

    return null; // No context match found
  }

  /**
   * Generate smart default based on field characteristics
   */
  static generateSmartDefault(label, fieldType, options = []) {
    const lowerLabel = label.toLowerCase();

    // For yes/no questions
    if (lowerLabel.includes('?') && options.length === 2) {
      const optionTexts = options.map(o => o.toLowerCase());

      // Prefer "Yes" for positive questions
      if (lowerLabel.includes('willing') || lowerLabel.includes('able') ||
          lowerLabel.includes('comfortable') || lowerLabel.includes('can you')) {
        return optionTexts.indexOf('yes') >= 0 ? 'Yes' : options[0];
      }

      // Prefer "No" for negative questions (require, need)
      if (lowerLabel.includes('require') && !lowerLabel.includes('authorization')) {
        return optionTexts.indexOf('no') >= 0 ? 'No' : options[1];
      }
    }

    // For number fields
    if (fieldType === 'number') {
      if (lowerLabel.includes('year')) return '2';
      if (lowerLabel.includes('month')) return '6';
      if (lowerLabel.includes('salary') || lowerLabel.includes('compensation')) return '80000';
      if (lowerLabel.includes('experience')) return '3';
      return '1';
    }

    // For text fields
    if (fieldType === 'text') {
      if (lowerLabel.includes('city') || lowerLabel.includes('location')) return 'Remote';
      if (lowerLabel.includes('phone')) return '';
      if (lowerLabel.includes('email')) return '';
      return 'Flexible';
    }

    // For dropdowns with options
    if (options.length > 0) {
      // Look for positive options
      for (const opt of options) {
        const optLower = opt.toLowerCase();
        if (optLower.includes('yes') || optLower.includes('bachelor') ||
            optLower.includes('graduate') || optLower.includes('available')) {
          return opt;
        }
      }
      // Return first non-placeholder option
      return options[0];
    }

    return null;
  }

  /**
   * Analyze form complexity and estimate completion time
   */
  static analyzeFormComplexity(formFields) {
    let complexity = {
      score: 0,
      estimatedTimeSeconds: 0,
      fieldCounts: {
        text: 0,
        number: 0,
        select: 0,
        textarea: 0,
        radio: 0,
        checkbox: 0,
        file: 0
      },
      warnings: []
    };

    formFields.forEach(field => {
      const type = field.type || field.tagName.toLowerCase();

      if (type === 'text' || type === 'email' || type === 'tel') {
        complexity.fieldCounts.text++;
        complexity.score += 1;
        complexity.estimatedTimeSeconds += 2;
      } else if (type === 'number') {
        complexity.fieldCounts.number++;
        complexity.score += 1;
        complexity.estimatedTimeSeconds += 2;
      } else if (type === 'select' || field.tagName === 'SELECT') {
        complexity.fieldCounts.select++;
        complexity.score += 2;
        complexity.estimatedTimeSeconds += 3;
      } else if (type === 'textarea' || field.tagName === 'TEXTAREA') {
        complexity.fieldCounts.textarea++;
        complexity.score += 5;
        complexity.estimatedTimeSeconds += 8;
        complexity.warnings.push('Contains essay/paragraph question');
      } else if (type === 'radio') {
        complexity.fieldCounts.radio++;
        complexity.score += 1;
        complexity.estimatedTimeSeconds += 1;
      } else if (type === 'checkbox') {
        complexity.fieldCounts.checkbox++;
        complexity.score += 1;
        complexity.estimatedTimeSeconds += 1;
      } else if (type === 'file') {
        complexity.fieldCounts.file++;
        complexity.score += 3;
        complexity.estimatedTimeSeconds += 5;
        complexity.warnings.push('Contains file upload');
      }
    });

    // Determine difficulty level
    if (complexity.score <= 5) {
      complexity.level = 'Simple';
    } else if (complexity.score <= 15) {
      complexity.level = 'Moderate';
    } else if (complexity.score <= 30) {
      complexity.level = 'Complex';
    } else {
      complexity.level = 'Very Complex';
    }

    return complexity;
  }

  /**
   * Predict button action based on context
   */
  static predictButtonAction(button, currentStepNumber, totalFields, filledFields) {
    const buttonText = (button.textContent || '').toLowerCase().trim();
    const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
    const isDisabled = button.disabled || button.getAttribute('aria-disabled') === 'true';

    if (isDisabled) {
      return { action: 'skip', confidence: 1.0, reason: 'Button is disabled' };
    }

    // High confidence actions
    if (buttonText.includes('submit') || ariaLabel.includes('submit')) {
      const completion = filledFields / totalFields;
      if (completion >= 0.8) {
        return { action: 'click', confidence: 0.95, reason: 'Submit button with high form completion' };
      }
      return { action: 'wait', confidence: 0.7, reason: 'Submit button but form not complete' };
    }

    if (buttonText.includes('review') || ariaLabel.includes('review')) {
      return { action: 'click', confidence: 0.9, reason: 'Review button - likely final step' };
    }

    if (buttonText.includes('next') || buttonText.includes('continue')) {
      return { action: 'click', confidence: 0.85, reason: 'Next/Continue button - advance to next step' };
    }

    // Medium confidence actions
    if (buttonText.includes('save') || buttonText.includes('draft')) {
      return { action: 'skip', confidence: 0.8, reason: 'Save/Draft button - not submission' };
    }

    if (buttonText.includes('cancel') || buttonText.includes('back')) {
      return { action: 'skip', confidence: 0.9, reason: 'Cancel/Back button - avoid' };
    }

    // Low confidence
    return { action: 'skip', confidence: 0.5, reason: 'Unknown button type' };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedAI;
}
