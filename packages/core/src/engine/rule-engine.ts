// Litigo Rule Engine
// Evaluates chatbot responses against user-defined rules
// Uses local processing only — no network calls

import type {
  Rule,
  RuleEvaluation,
  EvaluationResult,
  ComplianceStatus,
  RuleConflict,
} from '../types';

export class RuleEngine {
  private rules: Rule[] = [];

  constructor(rules: Rule[] = []) {
    this.rules = rules.filter(r => r.status === 'enabled');
  }

  setRules(rules: Rule[]): void {
    this.rules = rules.filter(r => r.status === 'enabled');
  }

  getActiveRules(chatbotId?: string): Rule[] {
    if (!chatbotId) return this.rules;
    return this.rules.filter(r =>
      r.appliedTo.length === 0 || r.appliedTo.includes(chatbotId)
    );
  }

  /**
   * Evaluate a response text against all active rules
   * Returns individual rule evaluations and a compliance score
   */
  evaluate(response: string, chatbotId?: string): ComplianceStatus {
    const activeRules = this.getActiveRules(chatbotId);
    const evaluations: RuleEvaluation[] = [];

    for (const rule of activeRules) {
      const evaluation = this.evaluateRule(rule, response);
      evaluations.push(evaluation);
    }

    // Sort by priority for display
    evaluations.sort((a, b) => {
      const priorityOrder: Record<string, number> = { violated: 0, warning: 1, passed: 2, not_applicable: 3 };
      return priorityOrder[a.result] - priorityOrder[b.result];
    });

    const passed = evaluations.filter(e => e.result === 'passed').length;
    const warnings = evaluations.filter(e => e.result === 'warning').length;
    const violations = evaluations.filter(e => e.result === 'violated').length;
    const applicable = evaluations.filter(e => e.result !== 'not_applicable').length;

    // Score calculation: passed / applicable * 100
    // Warnings count as partial (0.5) for a more nuanced score
    const score = applicable > 0
      ? Math.round(((passed + (warnings * 0.5)) / applicable) * 100)
      : 100;

    return {
      score,
      totalRules: activeRules.length,
      passed,
      warnings,
      violations,
      evaluations,
      timestamp: new Date(),
    };
  }

  /**
   * Evaluate a single rule against response text
   */
  private evaluateRule(rule: Rule, response: string): RuleEvaluation {
    const { pattern } = rule;
    const text = response.trim();

    if (!text) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        result: 'not_applicable',
        severity: 0,
      };
    }

    switch (pattern.type) {
      case 'word_count':
        return this.evaluateWordCount(rule, text);
      case 'formatting':
        return this.evaluateFormatting(rule, text);
      case 'citation':
        return this.evaluateCitation(rule, text);
      case 'tone':
        return this.evaluateTone(rule, text);
      case 'keyword_exclude':
        return this.evaluateKeywordExclude(rule, text);
      case 'keyword_require':
        return this.evaluateKeywordRequire(rule, text);
      case 'semantic':
        return this.evaluateSemantic(rule, text);
      case 'custom':
        return this.evaluateCustom(rule, text);
      default:
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          result: 'not_applicable',
          severity: 0,
        };
    }
  }

  private evaluateWordCount(rule: Rule, text: string): RuleEvaluation {
    const words = this.countWords(text);
    const maxWords = rule.pattern.config.maxWords as number;
    const minWords = rule.pattern.config.minWords as number;

    let result: EvaluationResult = 'passed';
    let severity = 0;
    let details = `${words} words`;

    if (maxWords && words > maxWords) {
      result = 'violated';
      severity = Math.min(100, ((words - maxWords) / maxWords) * 100);
      details = `Detected ${words} words, limit is ${maxWords}`;
    } else if (minWords && words < minWords) {
      result = 'warning';
      severity = Math.min(50, ((minWords - words) / minWords) * 100);
      details = `Detected ${words} words, minimum is ${minWords}`;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      result,
      severity: Math.round(severity),
      details,
      detected: `${words} words`,
      expected: maxWords ? `under ${maxWords}` : minWords ? `over ${minWords}` : 'any',
    };
  }

  private evaluateFormatting(rule: Rule, text: string): RuleEvaluation {
    const requiredFormat = rule.pattern.config.format as string;
    let result: EvaluationResult = 'passed';
    let severity = 0;
    let details = '';

    switch (requiredFormat) {
      case 'bullet_points':
        const hasBullets = /^[\s]*[-*•]|\n[\s]*[-*•]/m.test(text) ||
          /^\s*\d+\.\s/m.test(text);
        if (!hasBullets && this.countWords(text) > 30) {
          result = 'violated';
          severity = 60;
          details = 'No bullet points or numbered lists detected';
        }
        break;
      case 'numbered_list':
        const hasNumbered = /^\s*\d+\.\s/m.test(text);
        if (!hasNumbered && this.countWords(text) > 30) {
          result = 'violated';
          severity = 60;
          details = 'No numbered list detected';
        }
        break;
      case 'headings':
        const hasHeadings = /^#{1,6}\s|\n[A-Z][^\n]{0,40}\n[-=]+/m.test(text);
        if (!hasHeadings && this.countWords(text) > 100) {
          result = 'warning';
          severity = 30;
          details = 'No headings detected in longer response';
        }
        break;
      case 'short_paragraphs':
        const paragraphs = text.split(/\n\n+/);
        const longParagraphs = paragraphs.filter(p => this.countWords(p) > 80).length;
        if (longParagraphs > 0) {
          result = 'warning';
          severity = Math.min(50, longParagraphs * 20);
          details = `${longParagraphs} long paragraph(s) detected`;
        }
        break;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      result,
      severity,
      details: details || `Format requirement "${requiredFormat}" satisfied`,
    };
  }

  private evaluateCitation(rule: Rule, text: string): RuleEvaluation {
    // Look for citation patterns: [1], (Author, Year), URLs, quoted sources
    const citationPatterns = [
      /\[\d+\]/g,
      /\([A-Z][a-z]+,\s*\d{4}\)/g,
      /https?:\/\/[^\s)]+/g,
      /[""][^""]{5,}[""]\s*\([^)]+\)/g,
      /according to/gi,
      /cited from/gi,
      /source:/gi,
      /reference:/gi,
    ];

    let foundCitations = 0;
    for (const pattern of citationPatterns) {
      const matches = text.match(pattern);
      if (matches) foundCitations += matches.length;
    }

    const minCitations = (rule.pattern.config.minCitations as number) || 1;
    const wordCount = this.countWords(text);

    // Only require citations for substantial responses
    if (wordCount < 40) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        result: 'not_applicable',
        severity: 0,
        details: 'Response too short to require citations',
      };
    }

    let result: EvaluationResult = 'passed';
    let severity = 0;
    let details = `${foundCitations} citation indicator(s) found`;

    if (foundCitations < minCitations) {
      result = 'violated';
      severity = 70;
      details = `No citations detected. Expected at least ${minCitations} citation indicator(s).`;
    } else if (foundCitations < minCitations + 1) {
      result = 'warning';
      severity = 25;
      details = `Minimal citation indicators found (${foundCitations})`;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      result,
      severity,
      details,
    };
  }

  private evaluateTone(rule: Rule, text: string): RuleEvaluation {
    const requiredTone = rule.pattern.config.tone as string;
    let result: EvaluationResult = 'passed';
    let severity = 0;
    let details = '';

    const lowerText = text.toLowerCase();

    switch (requiredTone) {
      case 'professional':
        const informalMarkers = [
          /\bgonna\b/, /\bwanna\b/, /\bgotta\b/, /\byo\b/, /\bhey\b/,
          /\bcool\b/, /\bawesome\b/, /\btotally\b/, /\bbasically\b/,
          /!{2,}/, /\?{2,}/, /\b(so|like)\s+(so|like)\b/,
        ];
        const informalHits = informalMarkers.filter(p => p.test(lowerText)).length;
        if (informalHits >= 3) {
          result = 'warning';
          severity = Math.min(60, informalHits * 15);
          details = `${informalHits} informal language marker(s) detected`;
        }
        break;
      case 'simple':
        // Check for overly complex sentences and rare words
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        const avgSentenceLength = sentences.length > 0
          ? sentences.reduce((sum, s) => sum + this.countWords(s), 0) / sentences.length
          : 0;
        if (avgSentenceLength > 35) {
          result = 'warning';
          severity = Math.min(50, (avgSentenceLength - 35) * 3);
          details = `Average sentence length: ${Math.round(avgSentenceLength)} words (complex)`;
        }
        break;
      case 'formal':
        const contractions = /\b(can't|don't|won't|isn't|aren't|it's|they're|we're|i'm|you're)\b/gi;
        const contractionHits = (lowerText.match(contractions) || []).length;
        if (contractionHits > 3) {
          result = 'warning';
          severity = Math.min(40, contractionHits * 6);
          details = `${contractionHits} contraction(s) detected in formal context`;
        }
        break;
      case 'neutral':
        const emotionalWords = [
          /\b(amazing|incredible|terrible|horrible|fantastic|awful|wonderful|disgusting)\b/gi,
          /!{1,}/,
        ];
        const emotionalHits = emotionalWords.reduce((sum, p) =>
          sum + ((lowerText.match(p) || []).length), 0);
        if (emotionalHits > 2) {
          result = 'warning';
          severity = Math.min(50, emotionalHits * 12);
          details = `${emotionalHits} emotional language indicator(s) detected`;
        }
        break;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      result,
      severity,
      details: details || `Tone requirement "${requiredTone}" satisfied`,
    };
  }

  private evaluateKeywordExclude(rule: Rule, text: string): RuleEvaluation {
    const keywords = (rule.pattern.config.keywords as string[]) || [];
    const lowerText = text.toLowerCase();
    const found: string[] = [];

    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }

    let result: EvaluationResult = 'passed';
    let severity = 0;
    let details = 'No excluded keywords found';

    if (found.length > 0) {
      result = 'violated';
      severity = Math.min(100, found.length * 40);
      details = `Excluded keyword(s) found: ${found.join(', ')}`;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      result,
      severity,
      details,
      detected: found.length > 0 ? found.join(', ') : undefined,
      expected: `None of: ${keywords.join(', ')}`,
    };
  }

  private evaluateKeywordRequire(rule: Rule, text: string): RuleEvaluation {
    const keywords = (rule.pattern.config.keywords as string[]) || [];
    const lowerText = text.toLowerCase();
    const missing: string[] = [];
    const found: string[] = [];

    const requireAll = rule.pattern.config.requireAll as boolean;

    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      } else {
        missing.push(keyword);
      }
    }

    let result: EvaluationResult = 'passed';
    let severity = 0;
    let details = '';

    if (requireAll) {
      if (missing.length > 0) {
        result = 'violated';
        severity = Math.min(100, (missing.length / keywords.length) * 100);
        details = `Missing required keyword(s): ${missing.join(', ')}`;
      } else {
        details = `All ${keywords.length} required keyword(s) found`;
      }
    } else {
      if (found.length === 0) {
        result = 'violated';
        severity = 70;
        details = `None of the required keywords found. Expected at least one of: ${keywords.join(', ')}`;
      } else {
        details = `Found ${found.length} of ${keywords.length} required keyword(s)`;
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      result,
      severity,
      details,
    };
  }

  private evaluateSemantic(rule: Rule, text: string): RuleEvaluation {
    // Semantic evaluation using pattern matching heuristics
    // In production, this would interface with the Moss Wasm semantic engine
    const semanticPattern = rule.pattern.config.pattern as string;
    const threshold = (rule.pattern.config.threshold as number) || 0.7;

    if (!semanticPattern) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        result: 'not_applicable',
        severity: 0,
        details: 'No semantic pattern defined',
      };
    }

    // Heuristic: check for key concepts from the semantic pattern
    const patternWords = semanticPattern.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const lowerText = text.toLowerCase();
    let matchedConcepts = 0;

    for (const word of patternWords) {
      if (lowerText.includes(word)) {
        matchedConcepts++;
      }
    }

    const matchRatio = patternWords.length > 0 ? matchedConcepts / patternWords.length : 0;
    const mode = rule.pattern.config.mode as 'include' | 'exclude' || 'include';

    let result: EvaluationResult = 'passed';
    let severity = 0;
    let details = '';

    if (mode === 'include') {
      if (matchRatio < threshold) {
        result = 'warning';
        severity = Math.round((1 - matchRatio) * 60);
        details = `Semantic pattern match: ${Math.round(matchRatio * 100)}% (threshold: ${Math.round(threshold * 100)}%)`;
      } else {
        details = `Semantic pattern match: ${Math.round(matchRatio * 100)}%`;
      }
    } else {
      if (matchRatio > (1 - threshold)) {
        result = 'warning';
        severity = Math.round(matchRatio * 50);
        details = `Excluded semantic pattern detected: ${Math.round(matchRatio * 100)}% match`;
      } else {
        details = `Excluded semantic pattern not detected`;
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      result,
      severity,
      details,
    };
  }

  private evaluateCustom(rule: Rule, text: string): RuleEvaluation {
    // Custom rules use a simple expression evaluator
    // Supports: minLength, maxLength, contains, notContains, regex
    const config = rule.pattern.config;
    let result: EvaluationResult = 'passed';
    let severity = 0;
    const reasons: string[] = [];

    if (config.minLength && text.length < config.minLength) {
      result = 'violated';
      severity = 50;
      reasons.push(`text too short (${text.length} < ${config.minLength})`);
    }

    if (config.maxLength && text.length > config.maxLength) {
      result = 'violated';
      severity = Math.max(severity, 50);
      reasons.push(`text too long (${text.length} > ${config.maxLength})`);
    }

    if (config.contains) {
      const contains = Array.isArray(config.contains) ? config.contains : [config.contains];
      for (const term of contains) {
        if (!text.toLowerCase().includes(String(term).toLowerCase())) {
          result = result === 'violated' ? 'violated' : 'warning';
          severity = Math.max(severity, 40);
          reasons.push(`missing "${term}"`);
        }
      }
    }

    if (config.notContains) {
      const notContains = Array.isArray(config.notContains) ? config.notContains : [config.notContains];
      for (const term of notContains) {
        if (text.toLowerCase().includes(String(term).toLowerCase())) {
          result = 'violated';
          severity = Math.max(severity, 60);
          reasons.push(`contains forbidden "${term}"`);
        }
      }
    }

    if (config.regex) {
      try {
        const regex = new RegExp(config.regex, config.regexFlags || 'i');
        const regexMode = config.regexMode as 'match' | 'noMatch' || 'match';
        const matches = regex.test(text);

        if (regexMode === 'match' && !matches) {
          result = 'warning';
          severity = Math.max(severity, 35);
          reasons.push('regex pattern not matched');
        } else if (regexMode === 'noMatch' && matches) {
          result = 'violated';
          severity = Math.max(severity, 55);
          reasons.push('forbidden regex pattern matched');
        }
      } catch {
        // Invalid regex — skip gracefully
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      result,
      severity,
      details: reasons.length > 0 ? reasons.join('; ') : 'Custom rule satisfied',
    };
  }

  /**
   * Detect potential conflicts between rules
   */
  detectConflicts(): RuleConflict[] {
    const conflicts: RuleConflict[] = [];
    const enabledRules = this.rules;

    for (let i = 0; i < enabledRules.length; i++) {
      for (let j = i + 1; j < enabledRules.length; j++) {
        const conflict = this.checkConflict(enabledRules[i], enabledRules[j]);
        if (conflict) conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  private checkConflict(ruleA: Rule, ruleB: Rule): RuleConflict | null {
    // Check for contradictory requirements
    if (ruleA.pattern.type === 'word_count' && ruleB.pattern.type === 'word_count') {
      const aMax = ruleA.pattern.config.maxWords;
      const bMin = ruleB.pattern.config.minWords;
      if (aMax && bMin && aMax < bMin) {
        return {
          ruleAId: ruleA.id,
          ruleBId: ruleB.id,
          type: 'contradictory',
          description: `"${ruleA.name}" requires under ${aMax} words while "${ruleB.name}" requires over ${bMin} words`,
          severity: 'high',
        };
      }
    }

    if (ruleA.pattern.type === 'keyword_exclude' && ruleB.pattern.type === 'keyword_require') {
      const aKeywords = (ruleA.pattern.config.keywords as string[] || []).map(k => k.toLowerCase());
      const bKeywords = (ruleB.pattern.config.keywords as string[] || []).map(k => k.toLowerCase());
      const overlap = aKeywords.filter(k => bKeywords.includes(k));
      if (overlap.length > 0) {
        return {
          ruleAId: ruleA.id,
          ruleBId: ruleB.id,
          type: 'contradictory',
          description: `"${ruleA.name}" excludes keyword(s) that "${ruleB.name}" requires: ${overlap.join(', ')}`,
          severity: 'high',
        };
      }
    }

    if (ruleA.pattern.type === 'tone' && ruleB.pattern.type === 'tone') {
      const aTone = ruleA.pattern.config.tone;
      const bTone = ruleB.pattern.config.tone;
      const contradictory: Record<string, string[]> = {
        formal: ['simple'],
        professional: ['simple'],
      };
      if (contradictory[aTone]?.includes(bTone) || contradictory[bTone]?.includes(aTone)) {
        return {
          ruleAId: ruleA.id,
          ruleBId: ruleB.id,
          type: 'contradictory',
          description: `"${ruleA.name}" (${aTone}) and "${ruleB.name}" (${bTone}) may require contradictory tones`,
          severity: 'medium',
        };
      }
    }

    // Check for overlapping scope (same chatbots, similar types)
    const sharedChatbots = ruleA.appliedTo.filter(c => ruleB.appliedTo.includes(c));
    const bothHaveEmptyScope = ruleA.appliedTo.length === 0 && ruleB.appliedTo.length === 0;
    if ((sharedChatbots.length > 0 || bothHaveEmptyScope) &&
        ruleA.pattern.type === ruleB.pattern.type &&
        ruleA.id !== ruleB.id) {
      return {
        ruleAId: ruleA.id,
        ruleBId: ruleB.id,
        type: 'overlapping',
        description: `"${ruleA.name}" and "${ruleB.name}" both apply ${ruleA.pattern.type} checks to overlapping chatbots`,
        severity: ruleA.priority === ruleB.priority ? 'medium' : 'low',
      };
    }

    return null;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Generate a unique ID
   */
  static generateId(): string {
    return 'rule_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }
}
