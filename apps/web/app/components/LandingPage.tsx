'use client';

import { useEffect, useState } from 'react';
import styles from './LandingPage.module.css';

// ─── Download Artifacts ───────────────────────────────────────────
const DOWNLOADS = {
  chrome: {
    name: 'Chrome Extension',
    file: '/downloads/litigo-chrome-extension.zip',
    size: '27 KB',
    version: '1.0.0',
    status: 'Source available',
    note: 'Load as unpacked extension in Chrome',
  },
  windows: {
    name: 'Windows',
    file: '/downloads/Litigo-Setup.exe',
    size: '6 KB',
    version: '1.0.0',
    status: 'Installer',
    note: 'Standalone Windows Desktop Installer (.exe)',
  },
  macos: {
    name: 'macOS',
    file: '/downloads/litigo-desktop-source.zip',
    size: '10 KB',
    version: '1.0.0',
    status: 'Source code',
    note: 'Build with Tauri (Rust + Node.js required)',
  },
  android: {
    name: 'Android',
    file: '/downloads/litigo-android-source.zip',
    size: '18 KB',
    version: '1.0.0',
    status: 'Source code',
    note: 'Build with Android Studio / Gradle',
  },
  iphone: {
    name: 'iPhone',
    file: '/downloads/litigo-ios-source.zip',
    size: '13 KB',
    version: '1.0.0',
    status: 'Source code',
    note: 'Build with Xcode 15+ (macOS required)',
  },
};

// ─── Icons ───────────────────────────────────────────────────────
const Icon = {
  Shield: (p: any) => (
    <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.stroke || 2.2} {...p}>
      <path d="M12 2L3 7v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V7l-9-5z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  Chrome: (p: any) => (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.stroke || 2} {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  ),
  Windows: (p: any) => (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.stroke || 2} {...p}>
      <path d="M3 12l9-9 9 4v14l-9 4-9-5" />
    </svg>
  ),
  Mac: (p: any) => (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.stroke || 2} {...p}>
      <path d="M12 2c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5z" />
      <path d="M20 22c0-4-4-7-8-7s-8 3-8 7" />
    </svg>
  ),
  Android: (p: any) => (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.stroke || 2} {...p}>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
  IPhone: (p: any) => (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.stroke || 2} {...p}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  ),
  Arrow: (p: any) => (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.stroke || 2.5} {...p}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  ),
  Download: (p: any) => (
    <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.stroke || 2} {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Plus: (p: any) => (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.stroke || 2.5} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Check: (p: any) => (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.stroke || 2.5} {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

// ─── Landing Page ────────────────────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activityFilter, setActivityFilter] = useState('all');

  useEffect(() => {
    // Smooth anchor scrolling
    const handleAnchor = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href.length > 1) {
          e.preventDefault();
          const el = document.querySelector(href);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    };
    document.addEventListener('click', handleAnchor);
    return () => document.removeEventListener('click', handleAnchor);
  }, []);

  return (
    <div className={styles.page}>
      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navLeft}>
            <a href="#" className={styles.brand}>
              <img src="/litigo-logo.webp" alt="Litigo" className={styles.brandLogo} />
              <span className={styles.brandName}>Litigo</span>
            </a>
            <div className={styles.navLinks}>
              <a href="#product" className={styles.navLink}>Product</a>
              <a href="#how" className={styles.navLink}>How it works</a>
              <a href="#platforms" className={styles.navLink}>Platforms</a>
              <a href="#privacy" className={styles.navLink}>Privacy</a>
              <a href="#downloads" className={styles.navLink}>Downloads</a>
              <a href="#faq" className={styles.navLink}>FAQ</a>
            </div>
          </div>
          <a href="#downloads" className={styles.btnPrimary}>
            Get Litigo
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
          <span className={styles.eyebrow}>AI Rule Enforcement</span>
          <h1 className={styles.heroTitle}>
            Your rules.
            <br />
            <span style={{ color: 'var(--muted)' }}>Every chatbot.</span>
          </h1>
          <p className={styles.heroSub}>
            Define your AI rules once. Litigo keeps them enforced across the chatbots you use — quietly, precisely, and locally.
          </p>
          <div className={styles.heroCtas}>
            <a href="#downloads" className={styles.btnPrimary}>
              Get Litigo
              <Icon.Arrow size={14} />
            </a>
            <a href="#product" className={styles.btnSecondary}>
              See how it works
            </a>
          </div>
          <div className={styles.platformPills}>
            <span className={styles.platformPill}><Icon.Chrome size={12} /> Chrome</span>
            <span className={styles.platformPill}><Icon.Windows size={12} /> Windows</span>
            <span className={styles.platformPill}><Icon.Mac size={12} /> macOS</span>
            <span className={styles.platformPill}><Icon.Android size={12} /> Android</span>
            <span className={styles.platformPill}><Icon.IPhone size={12} /> iPhone</span>
          </div>
        </div>

        {/* Product Demo */}
        <div className={`reveal ${styles.heroDemo}`}>
          <div className={styles.windowBar}>
            <span className={styles.windowDotRed} />
            <span className={styles.windowDotYellow} />
            <span className={styles.windowDotGreen} />
            <span className={styles.windowTitle}>chat.openai.com</span>
          </div>
          <div className={styles.chatArea}>
            <div className={styles.chatUser}>
              <span>Explain the benefits of renewable energy sources.</span>
            </div>
            <div className={styles.chatAi}>
              <div className={styles.chatAiLabel}>ChatGPT</div>
              <p>
                Renewable energy offers several key advantages. First, it produces minimal greenhouse gas emissions, helping combat climate change. Second, sources like solar and wind are infinite and will not deplete over time. Third, renewable systems can reduce dependence on imported fuels and stabilize energy prices. Finally, distributed generation can improve grid resilience and create local employment opportunities.
              </p>
            </div>
            {/* Litigo Indicator */}
            <div className={styles.litigoIndicator}>
              <div className={styles.litigoIndicatorHeader}>
                <span className={styles.statusDotSuccess} />
                <span className={styles.litigoIndicatorTitle}>Litigo Active</span>
              </div>
              <div className={styles.litigoScoreRow}>
                <span className={styles.litigoScore}>93%</span>
                <span className={styles.litigoScoreLabel}>Compliance</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFillSuccess} style={{ width: '93%' }} />
              </div>
              <div className={styles.ruleRows}>
                <div className={styles.ruleRow}>
                  <span className={styles.rulePass}>✓</span>
                  <span>Bullet points</span>
                </div>
                <div className={styles.ruleRow}>
                  <span className={styles.rulePass}>✓</span>
                  <span>Citation</span>
                </div>
                <div className={styles.ruleRow}>
                  <span className={styles.ruleWarn}>⚠</span>
                  <span>Word limit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className={styles.heroDemoCaption}>
          Litigo runs alongside your chatbots — no workflow changes required.
        </p>
      </section>

      <div className={styles.divider} />

      {/* HOW IT WORKS */}
      <section id="how" className={styles.section}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
          <span className={styles.eyebrow}>How Litigo works</span>
          <h2 className={styles.sectionTitle}>Four steps. Zero friction.</h2>
          <p className={styles.sectionSub}>
            Litigo integrates quietly into your existing workflow. You keep using the same chatbots the same way.
          </p>
        </div>
        <div className={`reveal ${styles.stepsGrid}`}>
          {[
            { n: 1, t: 'Create your rules', d: 'Define rules once — word limits, formatting requirements, citation policies, tone guidelines.' },
            { n: 2, t: 'Open your chatbot', d: 'Use ChatGPT, Claude, Gemini, or any supported chatbot normally. Litigo detects automatically.' },
            { n: 3, t: 'Litigo checks responses', d: 'Every AI response is evaluated against your active rules locally, in real time.' },
            { n: 4, t: 'See compliance', d: 'A subtle indicator shows compliance score, passed rules, and any violations.' },
          ].map(s => (
            <div key={s.n}>
              <div className={styles.stepNum}>{s.n}</div>
              <h3 className={styles.stepTitle}>{s.t}</h3>
              <p className={styles.stepDesc}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.divider} />

      {/* DOWNLOADS */}
      <section id="downloads" className={styles.section}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
          <span className={styles.eyebrow}>Downloads</span>
          <h2 className={styles.sectionTitle}>Get Litigo on every platform</h2>
          <p className={styles.sectionSub}>
            Litigo is available as source code for all platforms. Binary installers are coming soon.
          </p>
        </div>

        <div className={`reveal ${styles.downloadGrid}`}>
          {/* Chrome */}
          <a href={DOWNLOADS.chrome.file} download className={styles.downloadCard}>
            <div className={styles.downloadCardHeader}>
              <div className={styles.downloadIconWrap}>
                <Icon.Chrome size={24} />
              </div>
              <span className={styles.badgeStable}>Source</span>
            </div>
            <h3 className={styles.downloadCardTitle}>{DOWNLOADS.chrome.name}</h3>
            <p className={styles.downloadCardDesc}>{DOWNLOADS.chrome.note}</p>
            <div className={styles.downloadMeta}>
              <span className={styles.mono}>{DOWNLOADS.chrome.size}</span>
              <span>v{DOWNLOADS.chrome.version}</span>
            </div>
            <div className={styles.downloadBtn}>
              <Icon.Download size={16} />
              Download ZIP
            </div>
          </a>

          {/* Windows */}
          <a href={DOWNLOADS.windows.file} download className={styles.downloadCard}>
            <div className={styles.downloadCardHeader}>
              <div className={styles.downloadIconWrap}>
                <Icon.Windows size={24} />
              </div>
              <span className={styles.badgeSource} style={{ background: '#dbeafe', color: '#1e40af' }}>Installer</span>
            </div>
            <h3 className={styles.downloadCardTitle}>{DOWNLOADS.windows.name}</h3>
            <p className={styles.downloadCardDesc}>{DOWNLOADS.windows.note}</p>
            <div className={styles.downloadMeta}>
              <span className={styles.mono}>{DOWNLOADS.windows.size}</span>
              <span>v{DOWNLOADS.windows.version}</span>
            </div>
            <div className={styles.downloadBtn}>
              <Icon.Download size={16} />
              Download Windows (.exe)
            </div>
          </a>

          {/* macOS */}
          <a href={DOWNLOADS.macos.file} download className={styles.downloadCard}>
            <div className={styles.downloadCardHeader}>
              <div className={styles.downloadIconWrap}>
                <Icon.Mac size={24} />
              </div>
              <span className={styles.badgeSource}>Source</span>
            </div>
            <h3 className={styles.downloadCardTitle}>{DOWNLOADS.macos.name}</h3>
            <p className={styles.downloadCardDesc}>{DOWNLOADS.macos.note}</p>
            <div className={styles.downloadMeta}>
              <span className={styles.mono}>{DOWNLOADS.macos.size}</span>
              <span>v{DOWNLOADS.macos.version}</span>
            </div>
            <div className={styles.downloadBtn}>
              <Icon.Download size={16} />
              Download Source
            </div>
          </a>

          {/* Android */}
          <a href={DOWNLOADS.android.file} download className={styles.downloadCard}>
            <div className={styles.downloadCardHeader}>
              <div className={styles.downloadIconWrap}>
                <Icon.Android size={24} />
              </div>
              <span className={styles.badgeSource}>Source</span>
            </div>
            <h3 className={styles.downloadCardTitle}>{DOWNLOADS.android.name}</h3>
            <p className={styles.downloadCardDesc}>{DOWNLOADS.android.note}</p>
            <div className={styles.downloadMeta}>
              <span className={styles.mono}>{DOWNLOADS.android.size}</span>
              <span>v{DOWNLOADS.android.version}</span>
            </div>
            <div className={styles.downloadBtn}>
              <Icon.Download size={16} />
              Download Source
            </div>
          </a>

          {/* iPhone */}
          <a href={DOWNLOADS.iphone.file} download className={styles.downloadCard}>
            <div className={styles.downloadCardHeader}>
              <div className={styles.downloadIconWrap}>
                <Icon.IPhone size={24} />
              </div>
              <span className={styles.badgeSource}>Source</span>
            </div>
            <h3 className={styles.downloadCardTitle}>{DOWNLOADS.iphone.name}</h3>
            <p className={styles.downloadCardDesc}>{DOWNLOADS.iphone.note}</p>
            <div className={styles.downloadMeta}>
              <span className={styles.mono}>{DOWNLOADS.iphone.size}</span>
              <span>v{DOWNLOADS.iphone.version}</span>
            </div>
            <div className={styles.downloadBtn}>
              <Icon.Download size={16} />
              Download Source
            </div>
          </a>

          {/* Coming Soon Placeholder */}
          <div className={`${styles.downloadCard} ${styles.downloadCardSoon}`}>
            <div className={styles.downloadCardHeader}>
              <div className={styles.downloadIconWrap}>
                <Icon.Plus size={24} />
              </div>
              <span className={styles.badgeSoon}>Soon</span>
            </div>
            <h3 className={styles.downloadCardTitle}>Binary Installers</h3>
            <p className={styles.downloadCardDesc}>
              Pre-built .msi, .dmg, .apk, and App Store listings are in active development.
            </p>
            <div className={styles.downloadMetaSoon}>
              <span>Check back for updates</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.divider} />

      {/* FINAL CTA */}
      <section className={styles.section}>
        <div className={`reveal ${styles.finalCta}`}>
          <h2 className={styles.finalCtaTitle}>
            Your rules. Every chatbot.
          </h2>
          <p className={styles.finalCtaSub}>
            Start enforcing AI output rules across the chatbots you use.
          </p>
          <a href="#downloads" className={styles.btnPrimaryLarge}>
            Get Litigo
            <Icon.Arrow size={16} />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img src="/litigo-logo.webp" alt="Litigo" className={styles.footerBrandLogo} />
              <span style={{ fontWeight: 700, fontSize: 17 }}>Litigo</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 280, lineHeight: 1.6 }}>
              AI rule enforcement that runs locally, respects your privacy, and works across the chatbots you use.
            </p>
          </div>
          <div className={styles.footerCols}>
            <div>
              <div className={styles.footerColTitle}>Product</div>
              <a href="#product" className={styles.footerLink}>Features</a>
              <a href="#how" className={styles.footerLink}>How it works</a>
              <a href="#downloads" className={styles.footerLink}>Downloads</a>
            </div>
            <div>
              <div className={styles.footerColTitle}>Platforms</div>
              <a href="#downloads" className={styles.footerLink}>Chrome</a>
              <a href="#downloads" className={styles.footerLink}>Windows</a>
              <a href="#downloads" className={styles.footerLink}>macOS</a>
              <a href="#downloads" className={styles.footerLink}>Android</a>
              <a href="#downloads" className={styles.footerLink}>iPhone</a>
            </div>
            <div>
              <div className={styles.footerColTitle}>Resources</div>
              <a href="#privacy" className={styles.footerLink}>Privacy</a>
              <a href="#faq" className={styles.footerLink}>FAQ</a>
              <a href="#" className={styles.footerLink}>Documentation</a>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>© 2026 Litigo. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#" className={styles.footerLink}>Privacy Policy</a>
            <a href="#" className={styles.footerLink}>Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
