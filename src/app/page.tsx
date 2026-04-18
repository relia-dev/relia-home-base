'use client';

import { useState, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
interface AppState {
  theme: 'light' | 'dark';
  density: 'cosy' | 'compact';
  nav: 'side' | 'top';
  showInflight: boolean;
  showKpi: boolean;
  showActivity: boolean;
}

const DEFAULTS: AppState = {
  theme: 'light',
  density: 'compact',
  nav: 'top',
  showInflight: true,
  showKpi: true,
  showActivity: true,
};

// ── Data ───────────────────────────────────────────────────────────────────
const NAV = [
  {
    group: 'Every day',
    items: [
      { id: 'home', label: 'Home base', icon: 'home' },
      { id: 'work', label: 'In flight', icon: 'work' },
      { id: 'activity', label: 'Activity', icon: 'log' },
    ],
  },
  {
    group: 'Knowledge',
    items: [
      { id: 'wiki', label: 'Wiki', icon: 'wiki' },
      { id: 'policies', label: 'Policies & legal', icon: 'pol' },
      { id: 'changelog', label: 'Changelog', icon: 'ship' },
    ],
  },
  {
    group: 'Customers',
    items: [
      { id: 'research', label: 'Research', icon: 'res' },
      { id: 'notes', label: 'Notes & decisions', icon: 'note' },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  home: 'Home base',
  work: 'In flight',
  activity: 'Activity',
  wiki: 'Wiki',
  policies: 'Policies & legal',
  changelog: 'Changelog',
  research: 'Research',
  notes: 'Notes & decisions',
  'policies/tos': 'Policies / Terms of Service',
};

const KPIS = [
  { l: 'Waitlist', v: '847', small: 'trades', delta: '↑ 34 this week', cls: 'up' },
  { l: 'Quotes sent', v: '2.4k', small: 'lifetime', delta: '↑ 18% MoM', cls: 'up' },
  { l: 'Win rate', v: '64', small: '%', delta: '↓ 2pts last 30d', cls: 'dn' },
  { l: 'Avg quote', v: '$840', small: '', delta: '↑ $40 vs prev qtr', cls: 'up' },
];

const ISSUES = [
  { id: 'REL-142', title: 'Voice capture drops last second on iOS 18', status: 'prog', prio: 'urgent', who: 'J', project: 'iOS app · v0.9' },
  { id: 'REL-139', title: 'Auto-chase email lands in spam — SPF record', status: 'review', prio: 'high', who: 'M', project: 'Backend' },
  { id: 'REL-136', title: 'Quote PDF — line items overflow on long jobs', status: 'prog', prio: 'high', who: 'J', project: 'iOS app · v0.9' },
  { id: 'REL-131', title: 'Onboarding step 3 — ABN lookup timeout', status: 'todo', prio: 'med', who: 'S', project: 'iOS app · v0.9' },
  { id: 'REL-128', title: 'Admin: export waitlist to CSV', status: 'done', prio: 'low', who: 'M', project: 'Web' },
];

const ALL_ISSUES = [
  ...ISSUES,
  { id: 'REL-127', title: 'Dark mode — slate backgrounds clash on Samsung', status: 'todo', prio: 'med', who: 'S', project: 'iOS app · v0.9' },
  { id: 'REL-125', title: 'Materials list — price rounding off by $0.01', status: 'review', prio: 'high', who: 'J', project: 'iOS app · v0.9' },
  { id: 'REL-120', title: 'Push notification not firing on quote accept', status: 'block', prio: 'urgent', who: 'M', project: 'Backend' },
  { id: 'REL-118', title: 'Improve voice model — plumbing vocab', status: 'prog', prio: 'high', who: 'J', project: 'AI' },
];

const ACTIVITY = [
  { when: '14m ago', who: 'James', what: 'shipped', ref: 'REL-134', extra: ' — Postman collection for /v1/estimates' },
  { when: '1h ago', who: 'Mia', what: 'opened PR for', ref: 'REL-139', extra: ' SPF fix' },
  { when: '2h ago', who: 'Sam', what: 'closed', ref: 'REL-128', extra: ' — CSV export live on admin' },
  { when: '3h ago', who: 'James', what: 'commented on', ref: 'REL-142', extra: '' },
  { when: 'Yesterday', who: 'Mia', what: 'deployed', ref: 'v0.8.4', extra: ' to production' },
  { when: 'Yesterday', who: 'Sam', what: 'updated', ref: 'REL-131', extra: ' — ABN timeout now 8s' },
];

const TILES = [
  { id: 'work', icon: 'work', t: 'In flight', d: 'Open issues and PRs across the team.' },
  { id: 'research', icon: 'res', t: 'Research', d: 'Customer interviews and NPS quotes.' },
  { id: 'changelog', icon: 'ship', t: 'Changelog', d: 'What shipped and when.' },
  { id: 'wiki', icon: 'wiki', t: 'Wiki', d: 'How we write, build, and operate.' },
];

const POLICIES = [
  { n: 'I', id: 'tos', title: 'Terms of Service', sub: 'How Relia and users agree to play.', version: 'v1.3', updated: '12 Apr' },
  { n: 'II', id: 'privacy', title: 'Privacy Policy', sub: 'What we collect and why.', version: 'v2.1', updated: '1 Mar' },
  { n: 'III', id: 'aup', title: 'Acceptable Use', sub: "What the platform isn't for.", version: 'v1.0', updated: '15 Jan' },
  { n: 'IV', id: 'sla', title: 'Service Level Agreement', sub: 'Uptime commitments and remedies.', version: 'v1.1', updated: '20 Feb' },
];

const CHANGELOG = [
  {
    date: '17 Apr', v: 'v0.9.0',
    title: 'iOS app <em>beta</em> opens',
    tags: ['ship'],
    body: 'TestFlight now open to 200 waitlist trades. Voice capture redesigned. Quote PDF v2 with itemised labour.',
  },
  {
    date: '2 Apr', v: 'v0.8.4',
    title: 'Auto-chase <em>goes live</em>',
    tags: ['ship', 'fix'],
    body: 'Automated follow-up emails at day 2, day 5. Fixed SPF record for deliverability. Win rate up 8pts in first week.',
  },
  {
    date: '18 Mar', v: 'v0.8.0',
    title: 'Materials list <em>rewrite</em>',
    tags: ['ship', 'brand'],
    body: 'New price-lookup engine covers 4,200 SKUs. Brand refresh — Sentient typeface, navy palette. Design system published.',
  },
  {
    date: '1 Feb', v: 'v0.7.2',
    title: 'ABN lookup <em>+ onboarding</em>',
    tags: ['ship', 'ops'],
    body: 'ABN validation live. Onboarding reduced from 7 steps to 3. Server-side rendering for quote PDFs.',
  },
];

const WIKI = [
  { n: 'I', id: 'writing', title: 'How we write', sub: 'The house style. Short wins. One exclamation, ever.', pages: '12 pages' },
  { n: 'II', id: 'stack', title: 'The stack', sub: 'Flutter, Next.js, Supabase, Cloudflare. Why each one.', pages: '8 pages' },
  { n: 'III', id: 'runbooks', title: 'Runbooks', sub: 'How to deploy, roll back, and not wake anyone up.', pages: '6 pages' },
  { n: 'IV', id: 'brand', title: 'Brand system', sub: 'Colours, type, the stamp, the voice.', pages: '18 pages' },
  { n: 'V', id: 'security', title: 'Security', sub: 'Access, secrets, incident response.', pages: '9 pages' },
  { n: 'VI', id: 'trades', title: 'Trade vocab', sub: 'Sparky, chippy, plumber — what we know about each.', pages: '14 pages' },
];

const RESEARCH = [
  { who: 'Brendan · plumber · Geelong', date: '16 APR', q: 'The auto-chase bit is the <em>killer feature</em>. My old system needed me to do that manually.', score: '9' },
  { who: 'Dani · electrician · Melb', date: '14 APR', q: 'Voice capture is unreal but it messed up "downlights" twice. I had to fix it.', score: '7' },
  { who: 'Kev · tiler · Brisbane', date: '11 APR', q: 'Fastest quote I\'ve ever sent. Customer called me back in 10 minutes.', score: '10' },
  { who: 'Sue · builder · Sydney', date: '9 APR', q: 'Pricing is fine. ABN lookup saved me a step I always forget.', score: '8' },
];

const NOTES = [
  { date: '17 APR', title: 'Standup — Tues', tags: ['weekly', 'internal'], body: 'Focus: iOS TestFlight goes wide. Voice drop bug REL-142 is P0. Mia owns SPF fix by EOD.' },
  { date: '15 APR', title: 'Pricing decision', tags: ['decision', 'pricing'], body: 'Keeping $19/mo solo tier. No freemium — support cost too high. Revisit Q3 if waitlist plateaus.' },
  { date: '12 APR', title: 'Design retro', tags: ['design', 'brand'], body: 'New Sentient type landing well in beta. Stamp device recognised unprompted by 3/5 interview subjects.' },
  { date: '8 APR', title: 'Infra planning', tags: ['ops', 'infra'], body: 'Move from single Supabase project to org-level setup before 1k users. Edge functions for PDF gen.' },
];

// ── SVG Icons ──────────────────────────────────────────────────────────────
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home': return <svg {...props}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
    case 'work': return <svg {...props}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="12.01"/></svg>;
    case 'log': return <svg {...props}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>;
    case 'wiki': return <svg {...props}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
    case 'pol': return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case 'ship': return <svg {...props}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>;
    case 'res': return <svg {...props}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case 'note': return <svg {...props}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    case 'settings': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
    case 'plus': return <svg {...props}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    default: return <svg {...props}><circle cx="12" cy="12" r="2"/></svg>;
  }
}

// ── Status pill ────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = { todo: 'To do', prog: 'In progress', review: 'In review', done: 'Done', block: 'Blocked' };
function StatusPill({ status }: { status: string }) {
  return (
    <span className={`status-pill s-${status}`}>
      <span className="d" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Issue row ──────────────────────────────────────────────────────────────
function IssueRow({ issue }: { issue: typeof ISSUES[0] }) {
  return (
    <div className="issue">
      <span className="id">{issue.id}</span>
      <span className="ttl">
        <b>{issue.title}</b>
        {issue.project && <span className="sub">{issue.project}</span>}
      </span>
      <span className={`assignee ${issue.who.toLowerCase()}`}>{issue.who}</span>
      <StatusPill status={issue.status} />
    </div>
  );
}

// ── Views ──────────────────────────────────────────────────────────────────
function HomeView({ state }: { state: AppState }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  const [day, ...rest] = dateStr.split(', ');

  return (
    <>
      <div className="hero">
        <h1 className="h-display">Good to have you back.<br /><em>What&rsquo;s on today?</em></h1>
        <div className="hero-meta">
          {KPIS.slice(0, 3).map(k => (
            <div className="item" key={k.l}>
              <span className="v">{k.v}{k.small && <small style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--fg3)', marginLeft: 4 }}>{k.small}</small>}</span>
              <span className="l">{k.l}</span>
            </div>
          ))}
        </div>
      </div>

      {state.showKpi && (
        <div className="kpi-grid" style={{ marginBottom: 'var(--section-gap)' }}>
          {KPIS.map(k => (
            <div className="kpi" key={k.l}>
              <div className="l">{k.l}</div>
              <div className="v">{k.v}{k.small && <small>{k.small}</small>}</div>
              <div className={`delta ${k.cls}`}>{k.delta}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid-dash">
        {state.showInflight && (
          <div className="block">
            <div className="block-hd">
              <h3>In flight</h3>
              <button className="chev" onClick={() => window.location.hash = '/work'}>See all →</button>
            </div>
            <div className="block-body tight">
              {ISSUES.filter(i => i.status !== 'done').map(i => <IssueRow key={i.id} issue={i} />)}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="block">
            <div className="block-hd">
              <h3>Today</h3>
              <span className="aside">{day}</span>
            </div>
            <div className="today">
              <div className="date">{rest.join(', ')}</div>
              <span className="subdate">Week {Math.ceil(now.getDate() / 7)} · Q2</span>
              <div className="focus">
                <span className="tag">Focus</span>
                iOS TestFlight goes wide. Voice drop is P0.
              </div>
              <ul className="check">
                <li className="done"><span className="box" /><span>Ship v0.9.0 to TestFlight</span></li>
                <li><span className="box" /><span>Fix REL-142 voice drop</span></li>
                <li><span className="box" /><span>SPF record — Mia to confirm</span></li>
                <li className="done"><span className="box" /><span>Waitlist email batch 4</span></li>
              </ul>
            </div>
          </div>

          {state.showActivity && (
            <div className="block">
              <div className="block-hd">
                <h3>Activity</h3>
                <button className="chev" onClick={() => window.location.hash = '/activity'}>All →</button>
              </div>
              <div className="feed">
                {ACTIVITY.slice(0, 4).map((a, i) => (
                  <div className="feed-item" key={i}>
                    <span className="when">{a.when}</span>
                    <span><span className="who">{a.who}</span> <span className="what">{a.what} </span><span className="ref">{a.ref}</span><span className="what">{a.extra}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="section-hd">
        <h2>Quick nav</h2>
      </div>
      <div className="tiles">
        {TILES.map(t => (
          <button key={t.id} className="tile" onClick={() => window.location.hash = `/${t.id}`}>
            <span className="ic"><Icon name={t.icon} size={20} /></span>
            <span className="t">{t.t}</span>
            <span className="d">{t.d}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function WorkView() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? ALL_ISSUES : ALL_ISSUES.filter(i => i.status === filter);
  return (
    <>
      <div className="section-hd">
        <h2>In <em>flight</em></h2>
        <span className="aside">{ALL_ISSUES.length} issues</span>
      </div>
      <div className="work-filters">
        {['all', 'prog', 'review', 'todo', 'block', 'done'].map(f => (
          <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>
      <div className="block">
        <div className="block-body tight">
          {filtered.map(i => <IssueRow key={i.id} issue={i} />)}
          {filtered.length === 0 && <div style={{ padding: 'var(--card-pad)', color: 'var(--fg3)', fontSize: 13 }}>Nothing here. Good.</div>}
        </div>
      </div>
    </>
  );
}

function ActivityView() {
  return (
    <>
      <div className="section-hd">
        <h2>Activity</h2>
        <span className="aside">Last 48 hours</span>
      </div>
      <div className="block">
        <div className="feed">
          {ACTIVITY.map((a, i) => (
            <div className="feed-item" key={i}>
              <span className="when">{a.when}</span>
              <span><span className="who">{a.who}</span> <span className="what">{a.what} </span><span className="ref">{a.ref}</span><span className="what">{a.extra}</span></span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PoliciesView({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <>
      <div className="section-hd">
        <h2>Policies <em>&amp; legal</em></h2>
      </div>
      <div className="block">
        <div className="block-body tight">
          {POLICIES.map(p => (
            <div key={p.id} className="policy-row" onClick={() => onNavigate(`policies/${p.id}`)}>
              <span className="n">{p.n}</span>
              <div className="meta">
                <h4>{p.title}</h4>
                <p>{p.sub}</p>
              </div>
              <div className="version">
                <b>{p.version}</b>
                {p.updated}
              </div>
              <span className="arrow">→</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PolicyToSView({ onBack }: { onBack: () => void }) {
  return (
    <div className="doc">
      <nav className="doc-toc">
        <span className="kicker">Contents</span>
        <a href="#tos-1" className="active">1. The agreement</a>
        <a href="#tos-2">2. Your account</a>
        <a href="#tos-3">3. What you can do</a>
        <a href="#tos-4">4. What you can&rsquo;t do</a>
        <a href="#tos-5">5. Payments</a>
        <a href="#tos-6">6. Termination</a>
        <a href="#tos-7">7. Liability</a>
        <a href="#tos-8">8. Governing law</a>
      </nav>
      <div className="doc-body">
        <span className="kicker">Policies · I</span>
        <h1>Terms of <em>Service</em></h1>
        <div className="meta-strip">
          <span>Version <b>1.3</b></span>
          <span>Updated <b>12 Apr 2026</b></span>
          <span>Jurisdiction <b>Victoria, Australia</b></span>
        </div>
        <h2 id="tos-1" data-n="1">The agreement</h2>
        <p>By creating an account you agree to these terms. If you&rsquo;re acting on behalf of a business, you confirm you&rsquo;re authorised to bind it.</p>
        <div className="note"><p>We&rsquo;ve written this to be read, not filed. If something&rsquo;s unclear, email us. We&rsquo;ll fix the copy.</p></div>
        <h2 id="tos-2" data-n="2">Your account</h2>
        <p>You&rsquo;re responsible for keeping your login secure. One account per ABN. We may suspend accounts that show signs of automated abuse.</p>
        <h2 id="tos-3" data-n="3">What you can do</h2>
        <p>Generate quotes, send them to customers, collect payments, manage your job list. That&rsquo;s the whole product.</p>
        <h2 id="tos-4" data-n="4">What you can&rsquo;t do</h2>
        <ul>
          <li>Resell or white-label the platform without a written agreement.</li>
          <li>Use automated tools to scrape pricing data.</li>
          <li>Impersonate another tradesperson or business.</li>
        </ul>
        <h2 id="tos-5" data-n="5">Payments</h2>
        <p>Subscription billing is monthly, via Stripe. You can cancel anytime. No refunds for partial months.</p>
        <h2 id="tos-6" data-n="6">Termination</h2>
        <p>You can delete your account at any time. We can terminate for cause with 7 days notice, immediately for serious breaches.</p>
        <h2 id="tos-7" data-n="7">Liability</h2>
        <p>We&rsquo;re not liable for lost revenue caused by downtime, incorrect quote calculations, or customer non-payment. Use your judgement.</p>
        <h2 id="tos-8" data-n="8">Governing law</h2>
        <p>These terms are governed by the laws of Victoria, Australia. Disputes go to the Victorian courts.</p>
      </div>
    </div>
  );
}

function ChangelogView() {
  return (
    <>
      <div className="section-hd">
        <h2>Changelog</h2>
        <span className="aside">What shipped</span>
      </div>
      {CHANGELOG.map((c, i) => (
        <div className="log-item" key={i}>
          <div className="when">
            {c.date}
            <span className="v">{c.v}</span>
          </div>
          <div>
            <h3 className="t" dangerouslySetInnerHTML={{ __html: c.title }} />
            <p>{c.body}</p>
            <div className="tags">
              {c.tags.map(t => <span key={t} className={`tag t-${t}`}>{t}</span>)}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function WikiView({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <>
      <div className="section-hd">
        <h2>Wiki</h2>
        <span className="aside">{WIKI.length} sections</span>
      </div>
      <div className="wiki-grid">
        {WIKI.map(w => (
          <div key={w.id} className="wiki-card" onClick={() => onNavigate(`wiki/${w.id}`)}>
            <div className="num">{w.n}</div>
            <h4>{w.title}</h4>
            <p>{w.sub}</p>
            <div className="pages">{w.pages}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function ResearchView() {
  return (
    <>
      <div className="section-hd">
        <h2>Research</h2>
        <span className="aside">{RESEARCH.length} interviews</span>
      </div>
      <div className="research-grid">
        {RESEARCH.map((r, i) => (
          <div key={i} className="quote-card">
            <p className="q" dangerouslySetInnerHTML={{ __html: `"${r.q}"` }} />
            <div className="src">
              <div className="who">
                {r.who.split(' · ')[0]}
                <small>{r.who.split(' · ').slice(1).join(' · ')}</small>
              </div>
              <div className="score">{r.score}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function NotesView() {
  return (
    <>
      <div className="section-hd">
        <h2>Notes <em>&amp; decisions</em></h2>
        <span className="aside">{NOTES.length} entries</span>
      </div>
      <div className="notes-grid">
        {NOTES.map((n, i) => (
          <div key={i} className="note-card">
            <div className="head">
              <h4>{n.title}</h4>
              <span className="date">{n.date}</span>
            </div>
            <p>{n.body}</p>
            <div className="pills">
              {n.tags.map(t => <span key={t}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const [appState, setAppState] = useState<AppState>(DEFAULTS);
  const [route, setRoute] = useState('home');
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('relia-hq');
    if (saved) {
      try { setAppState(JSON.parse(saved)); } catch {}
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.body.classList.toggle('theme-dark', appState.theme === 'dark');
    document.body.classList.toggle('density-compact', appState.density === 'compact');
  }, [appState.theme, appState.density, hydrated]);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#/', '') || 'home';
      setRoute(hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const update = <K extends keyof AppState>(key: K, value: AppState[K]) => {
    const next = { ...appState, [key]: value };
    setAppState(next);
    localStorage.setItem('relia-hq', JSON.stringify(next));
  };

  const navigate = (id: string) => { window.location.hash = `/${id}`; };

  const topRoute = (route.split('/')[0] ?? 'home') as string;
  const label = ROUTE_LABELS[route] ?? ROUTE_LABELS[topRoute] ?? 'Home base';

  const renderView = () => {
    if (route === 'home') return <HomeView state={appState} />;
    if (route === 'work') return <WorkView />;
    if (route === 'activity') return <ActivityView />;
    if (route === 'policies') return <PoliciesView onNavigate={navigate} />;
    if (route === 'policies/tos') return <PolicyToSView onBack={() => navigate('policies')} />;
    if (route === 'changelog') return <ChangelogView />;
    if (route === 'wiki') return <WikiView onNavigate={navigate} />;
    if (route === 'research') return <ResearchView />;
    if (route === 'notes') return <NotesView />;
    return <HomeView state={appState} />;
  };

  const sectionLabel = topRoute.toUpperCase();

  return (
    <div className={`app${appState.nav === 'top' ? ' nav-top' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sb-brand">
          <img src="/assets/relia_logo_mark.png" alt="Relia" />
          <div>
            <div className="name">Relia</div>
            <div className="sub">home base</div>
          </div>
        </div>

        {NAV.map(group => (
          <div className="sb-group" key={group.group}>
            <span className="sb-group-label">{group.group}</span>
            {group.items.map(item => (
              <button
                key={item.id}
                className={`sb-link${topRoute === item.id ? ' active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <Icon name={item.icon} />
                {item.label}
                <span className="dot" />
              </button>
            ))}
          </div>
        ))}

        <div className="sb-foot">
          <span className="avatar">A</span>
          <span>Anon</span>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        {/* Top nav */}
        <nav className="topnav">
          <div className="tn-brand">
            <img src="/assets/relia_logo_mark.png" alt="Relia" />
            <span>Relia</span>
          </div>
          {NAV.flatMap(g => g.items).map(item => (
            <button
              key={item.id}
              className={`tn-link${topRoute === item.id ? ' active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
          <div className="tn-spacer" />
          <div className="tn-avatar">A</div>
        </nav>

        {/* Topbar */}
        <header className="topbar">
          <span className="crumb">Relia · <b>{label}</b></span>
          <div className="spacer" />
          <div className="search-wrap">
            <input className="search-box" type="text" placeholder="Search…" />
          </div>
          <span className="shortcut">⌘K</span>
          <button className="tweaks-btn" onClick={() => setTweaksOpen(o => !o)} title="Settings">
            <Icon name="settings" size={15} />
          </button>
          <button className="btn">
            <Icon name="plus" size={13} />
            New
          </button>
        </header>

        {/* View content */}
        <div className="rail">
          <div className="rail-label">{sectionLabel}</div>
          <div className="rail-content">
            {renderView()}
          </div>
        </div>
      </div>

      {/* Stamp watermark */}
      <div className="stamp-wm">R</div>

      {/* Tweaks panel */}
      {tweaksOpen && (
        <div className="tweaks-panel">
          <h4>Display <em>settings</em></h4>

          <div className="tw-row">
            <span className="lab">Theme</span>
            <div className="seg">
              <button className={appState.theme === 'light' ? 'on' : ''} onClick={() => update('theme', 'light')}>Light</button>
              <button className={appState.theme === 'dark' ? 'on' : ''} onClick={() => update('theme', 'dark')}>Dark</button>
            </div>
          </div>

          <div className="tw-row">
            <span className="lab">Density</span>
            <div className="seg">
              <button className={appState.density === 'cosy' ? 'on' : ''} onClick={() => update('density', 'cosy')}>Cosy</button>
              <button className={appState.density === 'compact' ? 'on' : ''} onClick={() => update('density', 'compact')}>Compact</button>
            </div>
          </div>

          <div className="tw-row">
            <span className="lab">Navigation</span>
            <div className="seg">
              <button className={appState.nav === 'side' ? 'on' : ''} onClick={() => update('nav', 'side')}>Side</button>
              <button className={appState.nav === 'top' ? 'on' : ''} onClick={() => update('nav', 'top')}>Top</button>
            </div>
          </div>

          <div className="tw-row">
            <span className="lab">Show in-flight</span>
            <button className={`tog${appState.showInflight ? ' on' : ''}`} onClick={() => update('showInflight', !appState.showInflight)} />
          </div>

          <div className="tw-row">
            <span className="lab">Show KPIs</span>
            <button className={`tog${appState.showKpi ? ' on' : ''}`} onClick={() => update('showKpi', !appState.showKpi)} />
          </div>

          <div className="tw-row">
            <span className="lab">Show activity</span>
            <button className={`tog${appState.showActivity ? ' on' : ''}`} onClick={() => update('showActivity', !appState.showActivity)} />
          </div>
        </div>
      )}
    </div>
  );
}
