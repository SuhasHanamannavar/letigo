// Chatbot Adapter — base interface and abstract class
// Each supported chatbot implements this adapter

import type {
  ComplianceStatus,
  RuleEvaluation,
} from '../../../packages/core/src/types';

export interface ChatbotResponse {
  id: string;
  text: string;
  element: HTMLElement;
  timestamp: Date;
  isComplete: boolean;
}

export interface ChatbotAdapter {
  // Identification
  readonly id: string;
  readonly name: string;
  readonly urlPattern: RegExp;

  // Detection
  detect(): boolean;

  // Conversation observation
  observeResponse(
    callback: (response: ChatbotResponse) => void
  ): () => void;

  // Response extraction
  extractResponse(element: HTMLElement): string;

  // UI injection
  getIndicatorContainer(element: HTMLElement): HTMLElement | null;
  injectIndicator(
    container: HTMLElement,
    status: ComplianceStatus
  ): HTMLElement;
  updateIndicator(
    indicator: HTMLElement,
    status: ComplianceStatus
  ): void;
  removeLitigoUI(): void;

  // Lifecycle
  initialize?(): void;
  destroy?(): void;
}

export abstract class BaseChatbotAdapter implements ChatbotAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly urlPattern: RegExp;

  protected injectedElements: HTMLElement[] = [];
  protected observers: MutationObserver[] = [];
  protected responseIds: Set<string> = new Set();

  abstract detect(): boolean;
  abstract observeResponse(callback: (response: ChatbotResponse) => void): () => void;
  abstract extractResponse(element: HTMLElement): string;
  abstract getIndicatorContainer(element: HTMLElement): HTMLElement | null;

  injectIndicator(
    container: HTMLElement,
    status: ComplianceStatus
  ): HTMLElement {
    // Remove any existing indicator first
    const existing = container.querySelector('.litigo-indicator');
    if (existing) existing.remove();

    const indicator = this.createIndicatorElement(status);
    container.appendChild(indicator);
    this.injectedElements.push(indicator);
    return indicator;
  }

  updateIndicator(
    indicator: HTMLElement,
    status: ComplianceStatus
  ): void {
    const newIndicator = this.createIndicatorElement(status);
    indicator.replaceWith(newIndicator);
    const idx = this.injectedElements.indexOf(indicator);
    if (idx >= 0) this.injectedElements[idx] = newIndicator;
  }

  protected createIndicatorElement(status: ComplianceStatus): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'litigo-indicator';
    wrapper.setAttribute('data-litigo', 'true');

    const hasViolations = status.violations > 0;
    const hasWarnings = status.warnings > 0;
    const statusColor = hasViolations ? '#991b1b' : hasWarnings ? '#92400e' : '#166534';
    const statusBg = hasViolations ? 'rgba(153,27,27,.08)' : hasWarnings ? 'rgba(146,64,14,.08)' : 'rgba(22,101,52,.08)';

    const ruleSummaries = status.evaluations.slice(0, 3).map(e => {
      const icon = e.result === 'passed' ? '✓' : e.result === 'warning' ? '⚠' : '✗';
      const color = e.result === 'passed' ? '#166534' : e.result === 'warning' ? '#92400e' : '#991b1b';
      return `<div class="litigo-rule-row" style="display:flex;align-items:center;gap:6px;font-size:11px;">
        <span style="color:${color};font-weight:600;">${icon}</span>
        <span style="color:#6b7280;">${this.truncate(e.ruleName, 24)}</span>
      </div>`;
    }).join('');

    wrapper.innerHTML = `
      <div style="
        background:${statusBg};
        border:1px solid rgba(10,10,10,.1);
        border-radius:8px;
        padding:8px 12px;
        font-family:'Archivo',system-ui,sans-serif;
        min-width:180px;
        box-shadow:0 2px 8px rgba(0,0,0,.06);
      ">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:7px;height:7px;border-radius:50%;background:${statusColor};display:inline-block;"></span>
            <span style="font-weight:700;font-size:12px;color:#0a0a0a;">Litigo</span>
          </div>
          <span style="font-size:16px;font-weight:700;color:#0a0a0a;">${status.score}%</span>
        </div>
        <div style="height:3px;background:rgba(10,10,10,.08);border-radius:2px;overflow:hidden;margin-bottom:8px;">
          <div style="height:100%;width:${status.score}%;background:${statusColor};border-radius:2px;transition:width .3s ease;"></div>
        </div>
        ${ruleSummaries}
      </div>
    `;

    return wrapper;
  }

  removeLitigoUI(): void {
    this.injectedElements.forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    this.injectedElements = [];
  }

  destroy(): void {
    this.observers.forEach(o => o.disconnect());
    this.observers = [];
    this.removeLitigoUI();
    this.responseIds.clear();
  }

  protected generateResponseId(element: HTMLElement, text: string): string {
    const hash = this.simpleHash(text.slice(0, 100));
    return `${this.id}_${element.getAttribute('data-message-id') || element.dataset.testid || 'el'}_${hash}`;
  }

  protected simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  protected truncate(str: string, max: number): string {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }

  protected findElement(selectors: string[]): HTMLElement | null {
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el) return el as HTMLElement;
      } catch { /* invalid selector, skip */ }
    }
    return null;
  }

  protected findElements(selectors: string[]): HTMLElement[] {
    for (const selector of selectors) {
      try {
        const els = document.querySelectorAll(selector);
        if (els.length > 0) return Array.from(els) as HTMLElement[];
      } catch { /* invalid selector, skip */ }
    }
    return [];
  }

  /**
   * Check if a response appears to be complete (not streaming)
   * Uses: debounce timing + DOM stability checks
   */
  protected isResponseStable(
    element: HTMLElement,
    previousText: string,
    stableMs: number = 800
  ): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const currentText = this.extractResponse(element);
        resolve(currentText === previousText && currentText.length > 0);
      }, stableMs);
    });
  }
}
