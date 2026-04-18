'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── Route helpers ─────────────────────────────────────────────────────────
type Route = { hub: string; section: string };
function parseRoute(hash: string): Route {
  const parts = hash.replace('#/', '').split('/');
  return { hub: parts[0] ?? '', section: parts[1] ?? '' };
}
function navigate(hub: string, section = '') {
  window.location.hash = section ? `/${hub}/${section}` : `/${hub}`;
}

// ── Hub definitions ───────────────────────────────────────────────────────
const HUBS = {
  trades: {
    num: 'I', label: 'Trades Hub',
    tagline: 'Your market — tradies, their customers, and the pipeline.',
    desc: 'Every tradie on your waitlist, the customers they serve, the research behind the product, and the deals in motion.',
    sections: [
      { group: 'Overview', items: [{ id: '', label: 'Overview' }] },
      { group: 'Customers', items: [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'tradies',   label: 'Tradie directory' },
        { id: 'endcustomers', label: 'End customers' },
      ]},
      { group: 'Pipeline', items: [
        { id: 'deals',    label: 'Deals' },
        { id: 'research', label: 'Research & interviews' },
      ]},
    ],
    overviewCards: [
      { n: '01', id: 'dashboard',    title: 'Dashboard',              desc: 'Waitlist count, win rate, active tradies, and quote metrics at a glance.' },
      { n: '02', id: 'tradies',      title: 'Tradie directory',        desc: 'Every tradie using or waiting for Relia — trade, location, status.' },
      { n: '03', id: 'endcustomers', title: 'End customers',          desc: 'The homeowners and businesses tradies quote for.' },
      { n: '04', id: 'deals',        title: 'Deals',                  desc: 'Pipeline from prospect through to closed.' },
      { n: '05', id: 'research',     title: 'Research & interviews',   desc: 'Customer interviews, NPS quotes, and what we\'ve learned.' },
    ],
  },
  ops: {
    num: 'II', label: 'Ops Hub',
    tagline: 'How the business runs day to day.',
    desc: 'Notes, decisions, policies, and runbooks. Everything the team needs to know to operate without asking.',
    sections: [
      { group: 'Overview', items: [{ id: '', label: 'Overview' }] },
      { group: 'Decisions', items: [
        { id: 'notes',    label: 'Notes & decisions' },
      ]},
      { group: 'Legal', items: [
        { id: 'policies', label: 'Policies' },
      ]},
      { group: 'Practice', items: [
        { id: 'runbooks', label: 'Runbooks' },
      ]},
    ],
    overviewCards: [
      { n: '01', id: 'notes',    title: 'Notes & decisions', desc: 'Standup notes, decision log, planning sessions.' },
      { n: '02', id: 'policies', title: 'Policies',          desc: 'Terms of service, privacy policy, acceptable use, and SLA.' },
      { n: '03', id: 'runbooks', title: 'Runbooks',          desc: 'How to deploy, roll back, and handle incidents without waking anyone up.' },
    ],
  },
  knowledge: {
    num: 'III', label: 'Knowledge Hub',
    tagline: 'What Relia knows and how it operates.',
    desc: 'The wiki, changelog, brand system, voice guidelines, and trade vocabulary. The collective memory.',
    sections: [
      { group: 'Overview', items: [{ id: '', label: 'Overview' }] },
      { group: 'Product', items: [
        { id: 'wiki',      label: 'Wiki' },
        { id: 'changelog', label: 'Changelog' },
      ]},
      { group: 'Brand', items: [
        { id: 'brand',  label: 'Brand system' },
        { id: 'voice',  label: 'Voice & copy' },
        { id: 'trades', label: 'Trade vocab' },
      ]},
    ],
    overviewCards: [
      { n: '01', id: 'wiki',      title: 'Wiki',          desc: 'How we write, how we build, how we run things.' },
      { n: '02', id: 'changelog', title: 'Changelog',     desc: 'Every release — what shipped, what changed, what it fixed.' },
      { n: '03', id: 'brand',     title: 'Brand system',  desc: 'Colours, typefaces, the stamp, logos, spacing rules.' },
      { n: '04', id: 'voice',     title: 'Voice & copy',  desc: 'How Relia sounds — contractions, sentence length, tone by surface.' },
      { n: '05', id: 'trades',    title: 'Trade vocab',   desc: 'Sparky, chippie, plumber, tiler — what we know about each trade.' },
    ],
  },
  dev: {
    num: '—', label: 'Dev',
    tagline: 'Build internals.',
    desc: 'In-flight issues, requirements, UAT, activity log, and database schema.',
    sections: [
      { group: 'Overview', items: [{ id: '', label: 'Overview' }] },
      { group: 'Work', items: [
        { id: 'inflight', label: 'In flight' },
        { id: 'activity', label: 'Activity' },
      ]},
      { group: 'Quality', items: [
        { id: 'requirements', label: 'Requirements' },
        { id: 'uat',          label: 'UAT' },
      ]},
    ],
    overviewCards: [
      { n: '01', id: 'inflight',     title: 'In flight',     desc: 'Live Linear issues — list and activity views.' },
      { n: '02', id: 'requirements', title: 'Requirements',  desc: 'Functional and non-functional requirements with MoSCoW priority.' },
      { n: '03', id: 'uat',          title: 'UAT',           desc: 'User acceptance tests — add, edit, link to Linear issues.' },
      { n: '04', id: 'activity',     title: 'Activity',      desc: 'Everything that happened across the team in the last 48 hours.' },
    ],
  },
};

// ── Static seed data ──────────────────────────────────────────────────────
const TRADIES = [
  { id:'1', name:'Brendan Walsh',  trade:'Plumber',     company:'Walsh Plumbing',    city:'Geelong',   state:'VIC', email:'brendan@walshplumbing.com.au', status:'active',   abn:'51 824 753 556' },
  { id:'2', name:'Dani Nguyen',    trade:'Electrician', company:'Nguyen Electrical', city:'Melbourne', state:'VIC', email:'dani@nguyenelec.com.au',       status:'active',   abn:'33 712 489 201' },
  { id:'3', name:'Kevin Morris',   trade:'Tiler',       company:'Morris Tiling',     city:'Brisbane',  state:'QLD', email:'kev@morristiling.com.au',      status:'active',   abn:'78 234 901 345' },
  { id:'4', name:'Sue Cartwright', trade:'Builder',     company:'Cartwright Build',  city:'Sydney',    state:'NSW', email:'sue@cartwrightbuild.com.au',   status:'prospect', abn:'' },
  { id:'5', name:'Marco Ricci',    trade:'Plumber',     company:'Ricci Plumbing',    city:'Perth',     state:'WA',  email:'marco@ricciplumbing.com.au',   status:'active',   abn:'92 456 123 789' },
  { id:'6', name:'Amy Chen',       trade:'Painter',     company:'Chen Painting',     city:'Adelaide',  state:'SA',  email:'amy@chenpainting.com.au',      status:'prospect', abn:'' },
];
const END_CUSTOMERS = [
  { id:'1', name:'Sarah Okafor',   company:'Okafor Properties',  email:'sarah@okaforprop.com.au',  city:'Melbourne', state:'VIC', source:'Direct referral' },
  { id:'2', name:'Tom Reid',       company:'',                   email:'tom.reid@gmail.com',        city:'Brisbane',  state:'QLD', source:'Google' },
  { id:'3', name:'Nina Patel',     company:'Patel Developments', email:'nina@patelddev.com.au',    city:'Sydney',    state:'NSW', source:'Tradie referral' },
  { id:'4', name:'James O\'Brien', company:'',                   email:'james.obrien@hotmail.com', city:'Perth',     state:'WA',  source:'Google' },
];
const DEALS = [
  { id:'1', contact:'Brendan Walsh',  title:'Relia Pro · annual plan', stage:'closed_won', value:'$228', date:'12 Apr' },
  { id:'2', contact:'Dani Nguyen',    title:'Relia Pro · monthly',     stage:'trial',      value:'$19',  date:'15 Apr' },
  { id:'3', contact:'Sue Cartwright', title:'Relia Starter',           stage:'prospect',   value:'$0',   date:'17 Apr' },
  { id:'4', contact:'Amy Chen',       title:'Relia Pro · monthly',     stage:'qualified',  value:'$19',  date:'18 Apr' },
];
const RESEARCH = [
  { who:'Brendan Walsh',   role:'Plumber · Geelong',  date:'16 Apr', q:'The auto-chase bit is the <em>killer feature</em>. My old system needed me to do that manually.', score:9 },
  { who:'Dani Nguyen',     role:'Electrician · Melb', date:'14 Apr', q:'Voice capture is unreal but it messed up "downlights" twice. I had to fix it.',                   score:7 },
  { who:'Kevin Morris',    role:'Tiler · Brisbane',   date:'11 Apr', q:'Fastest quote I\'ve ever sent. Customer called me back in 10 minutes.',                           score:10 },
  { who:'Sue Cartwright',  role:'Builder · Sydney',   date:'9 Apr',  q:'Pricing is fine. ABN lookup saved me a step I always forget.',                                    score:8 },
];
const NOTES_DATA = [
  { id:'1', date:'17 APR', title:'Standup — Tues',   type:'standup',  tags:['weekly','internal'], body:'Focus: iOS TestFlight goes wide. Voice drop bug REL-142 is P0. Mia owns SPF fix by EOD.' },
  { id:'2', date:'15 APR', title:'Pricing decision', type:'decision', tags:['decision','pricing'], body:'Keeping $19/mo solo tier. No freemium — support cost too high. Revisit Q3 if waitlist plateaus.' },
  { id:'3', date:'12 APR', title:'Design retro',     type:'retro',    tags:['design','brand'],    body:'New Sentient type landing well in beta. Stamp device recognised unprompted by 3/5 subjects.' },
];
const POLICIES_DATA = [
  { n:'I',   id:'tos',     title:'Terms of Service',        sub:'How Relia and users agree to play.', version:'v1.3', updated:'12 Apr' },
  { n:'II',  id:'privacy', title:'Privacy Policy',          sub:'What we collect and why.',           version:'v2.1', updated:'1 Mar' },
  { n:'III', id:'aup',     title:'Acceptable Use',          sub:"What the platform isn't for.",        version:'v1.0', updated:'15 Jan' },
  { n:'IV',  id:'sla',     title:'Service Level Agreement', sub:'Uptime commitments and remedies.',   version:'v1.1', updated:'20 Feb' },
];
const WIKI_DATA = [
  { n:'I',   id:'writing',  title:'How we write',  sub:'The house style. Short wins. One exclamation, ever.',              pages:'12 pages' },
  { n:'II',  id:'stack',    title:'The stack',      sub:'Flutter, Next.js, Supabase, Cloudflare. Why each one.',           pages:'8 pages'  },
  { n:'III', id:'runbooks', title:'Runbooks',       sub:'How to deploy, roll back, and not wake anyone up.',               pages:'6 pages'  },
  { n:'IV',  id:'brand',    title:'Brand system',   sub:'Colours, type, the stamp, the voice.',                            pages:'18 pages' },
  { n:'V',   id:'security', title:'Security',       sub:'Access, secrets, incident response.',                             pages:'9 pages'  },
  { n:'VI',  id:'trades',   title:'Trade vocab',    sub:'Sparky, chippy, plumber — what we know about each trade.',        pages:'14 pages' },
];
const CHANGELOG_DATA = [
  { date:'17 Apr', v:'v0.9.0', title:'iOS app <em>beta</em> opens', tags:['ship'], body:'TestFlight open to 200 waitlist trades. Voice capture redesigned. Quote PDF v2.' },
  { date:'2 Apr',  v:'v0.8.4', title:'Auto-chase <em>goes live</em>', tags:['ship','fix'], body:'Automated follow-ups at day 2, day 5. Fixed SPF record. Win rate up 8pts.' },
  { date:'18 Mar', v:'v0.8.0', title:'Materials list <em>rewrite</em>', tags:['ship','brand'], body:'New price-lookup covers 4,200 SKUs. Brand refresh — Sentient typeface, navy palette.' },
];
const ACTIVITY = [
  { when:'14m ago',   who:'James', what:'shipped',      ref:'REL-134', extra:' — Postman collection for /v1/estimates' },
  { when:'1h ago',    who:'Mia',   what:'opened PR for', ref:'REL-139', extra:' SPF fix' },
  { when:'2h ago',    who:'Sam',   what:'closed',        ref:'REL-128', extra:' — CSV export live on admin' },
  { when:'3h ago',    who:'James', what:'commented on',  ref:'REL-142', extra:'' },
  { when:'Yesterday', who:'Mia',   what:'deployed',      ref:'v0.8.4',  extra:' to production' },
  { when:'Yesterday', who:'Sam',   what:'updated',       ref:'REL-131', extra:' — ABN timeout now 8s' },
];
const ISSUES_SEED = [
  { id:'REL-142', title:'Voice capture drops last second on iOS 18', status:'prog',   prio:'urgent', who:'J', project:'iOS app · v0.9' },
  { id:'REL-139', title:'Auto-chase email lands in spam — SPF record', status:'review', prio:'high', who:'M', project:'Backend' },
  { id:'REL-136', title:'Quote PDF — line items overflow on long jobs', status:'prog',  prio:'high', who:'J', project:'iOS app · v0.9' },
  { id:'REL-131', title:'Onboarding step 3 — ABN lookup timeout',      status:'todo',  prio:'med',  who:'S', project:'iOS app · v0.9' },
  { id:'REL-128', title:'Admin: export waitlist to CSV',                status:'done',  prio:'low',  who:'M', project:'Web' },
  { id:'REL-127', title:'Dark mode — slate backgrounds clash on Samsung',status:'todo', prio:'med',  who:'S', project:'iOS app · v0.9' },
  { id:'REL-120', title:'Push notification not firing on quote accept', status:'block', prio:'urgent',who:'M', project:'Backend' },
];
const REQS_SEED = [
  { ref:'FR-001',  type:'functional',     category:'Voice Capture', priority:'must_have',   status:'implemented', title:'Voice-to-quote in under 60s',              linear_id:'' },
  { ref:'FR-002',  type:'functional',     category:'Quoting',       priority:'must_have',   status:'implemented', title:'Auto-generate compliant PDF quote',         linear_id:'' },
  { ref:'FR-003',  type:'functional',     category:'Follow-up',     priority:'must_have',   status:'approved',    title:'Automated chase emails at day 2 and day 5', linear_id:'' },
  { ref:'FR-004',  type:'functional',     category:'Onboarding',    priority:'must_have',   status:'implemented', title:'ABN lookup and validation',                 linear_id:'' },
  { ref:'FR-005',  type:'functional',     category:'Materials',     priority:'should_have', status:'approved',    title:'Price lookup for 4,200+ SKUs',              linear_id:'' },
  { ref:'NFR-001', type:'non_functional', category:'Performance',   priority:'must_have',   status:'implemented', title:'App loads in under 2s on 4G',               linear_id:'' },
  { ref:'NFR-002', type:'non_functional', category:'Security',      priority:'must_have',   status:'approved',    title:'All data encrypted at rest and in transit',  linear_id:'' },
  { ref:'NFR-003', type:'non_functional', category:'Availability',  priority:'should_have', status:'draft',       title:'99.5% uptime SLA',                          linear_id:'' },
];
const UAT_SEED = [
  { id:'1', ref:'UAT-001', req_ref:'FR-001', title:'Voice capture — basic plumbing job',          status:'passed',      tester:'James', date:'15 Apr', linear_id:'REL-142', notes:'' },
  { id:'2', ref:'UAT-002', req_ref:'FR-001', title:'Voice capture — electrical with downlights',  status:'failed',      tester:'Mia',   date:'14 Apr', linear_id:'REL-142', notes:'Fails on the word "downlights"' },
  { id:'3', ref:'UAT-003', req_ref:'FR-002', title:'PDF quote renders on iOS 18',                 status:'in_progress', tester:'Sam',   date:'17 Apr', linear_id:'REL-136', notes:'' },
  { id:'4', ref:'UAT-004', req_ref:'FR-003', title:'Chase email delivered — not spam',             status:'passed',      tester:'Mia',   date:'10 Apr', linear_id:'REL-139', notes:'' },
  { id:'5', ref:'UAT-005', req_ref:'FR-004', title:'ABN lookup — valid ABN',                      status:'passed',      tester:'James', date:'8 Apr',  linear_id:'',        notes:'' },
  { id:'6', ref:'UAT-006', req_ref:'NFR-001', title:'Load time on Telstra 4G',                    status:'draft',       tester:'',      date:'',       linear_id:'',        notes:'' },
];

// ── Pill component ────────────────────────────────────────────────────────
const STATUS_MAP: Record<string,string> = { todo:'p-todo', prog:'p-prog', review:'p-review', done:'p-done', block:'p-block', draft:'p-draft', active:'p-active', prospect:'p-prospect', passed:'p-passed', failed:'p-failed', in_progress:'p-prog', must_have:'p-must', should_have:'p-should', could_have:'p-could', wont_have:'p-wont', implemented:'p-done', approved:'p-review', closed_won:'p-done', trial:'p-review', qualified:'p-prog' };
const STATUS_LABEL: Record<string,string> = { todo:'To do', prog:'In progress', review:'In review', done:'Done', block:'Blocked', draft:'Draft', active:'Active', prospect:'Prospect', passed:'Passed', failed:'Failed', in_progress:'In progress', must_have:'Must', should_have:'Should', could_have:'Could', wont_have:'Won\'t', implemented:'Live', approved:'Approved', closed_won:'Won', trial:'Trial', qualified:'Qualified' };
function Pill({ s, label }: { s: string; label?: string }) {
  return <span className={`pill ${STATUS_MAP[s] ?? 'p-draft'}`}><span className="dot" />{label ?? STATUS_LABEL[s] ?? s}</span>;
}

// ── Editable field ────────────────────────────────────────────────────────
function EF({ value, onSave, multi = false, className = '' }: { value: string; onSave: (v: string) => void; multi?: boolean; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) (ref.current as HTMLElement | null)?.focus(); }, [editing]);
  const commit = () => { setEditing(false); if (draft !== value) onSave(draft); };
  if (!editing) return <span className={`ef ${className}`} onClick={() => setEditing(true)}>{value || <span className="ef-empty">—</span>}</span>;
  const props = { ref: ref as React.Ref<HTMLElement>, className: `ef-input ${className}`, value: draft, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value), onBlur: commit, onKeyDown: (e: React.KeyboardEvent) => { if (!multi && e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } } };
  return multi ? <textarea {...props as React.TextareaHTMLAttributes<HTMLTextAreaElement>} ref={ref as React.Ref<HTMLTextAreaElement>} /> : <input {...props as React.InputHTMLAttributes<HTMLInputElement>} ref={ref as React.Ref<HTMLInputElement>} />;
}

// ── SVG icons ─────────────────────────────────────────────────────────────
function Ic({ n, size = 14 }: { n: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (n) {
    case 'plus':   return <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case 'edit':   return <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
    default:       return <svg {...p}><circle cx="12" cy="12" r="2"/></svg>;
  }
}

// ── Hub sidebar ───────────────────────────────────────────────────────────
function HubSidebar({ hub, route }: { hub: keyof typeof HUBS; route: Route }) {
  const h = HUBS[hub];
  return (
    <aside className="hub-sidebar">
      <div className="sidebar-hub-id">#{h.num} · Hub</div>
      <div className="sidebar-hub-name">{h.label}</div>
      <div className="sidebar-hub-tagline">{h.tagline}</div>
      {h.sections.map(group => (
        group.group === 'Overview'
          ? <button key="overview" className={`sidebar-overview-link${route.section === '' ? ' active' : ''}`} onClick={() => navigate(hub)}>Overview</button>
          : <div className="sidebar-group" key={group.group}>
              <span className="sidebar-group-label">{group.group}</span>
              {group.items.map(item => (
                <button key={item.id} className={`sidebar-link${route.section === item.id ? ' active' : ''}`} onClick={() => navigate(hub, item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
      ))}
    </aside>
  );
}

// ── Hub overview page ─────────────────────────────────────────────────────
function HubOverview({ hub }: { hub: keyof typeof HUBS }) {
  const h = HUBS[hub];
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#{h.num}</span><span className="sep">·</span><b>Hub</b></div>
      <h1 className="page-heading">{h.label}</h1>
      <p className="page-lede">{h.desc}</p>
      <hr className="page-divider" />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:16 }}>
        <span style={{ fontSize:14, fontWeight:600, color:'var(--fg1)' }}>In this hub</span>
        <span className="mono">{h.overviewCards.length} sections</span>
      </div>
      <div className="section-cards">
        {h.overviewCards.map(c => (
          <button key={c.id} className="section-card" onClick={() => navigate(hub, c.id)}>
            <span className="sc-num">{c.n}</span>
            <span className="sc-title">{c.title}</span>
            <span className="sc-desc">{c.desc}</span>
          </button>
        ))}
      </div>
      <div className="editors-note"><p>This hub is live. Each section will grow as the team adds data and content.</p></div>
    </div>
  );
}

// ── TRADES sections ───────────────────────────────────────────────────────
function TradesDashboard() {
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#I</span><span className="sep">·</span><b>Trades</b><span className="sep">·</span><b>Dashboard</b></div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 className="page-heading">Trades <em>dashboard</em></h1>
          <p style={{ fontSize:13, color:'var(--fg3)', marginTop:4 }}>Waitlist, activity, and pipeline — updated on sync.</p>
        </div>
      </div>
      <div className="stat-row">
        <div className="stat-card"><div className="stat-label">Waitlist</div><div className="stat-value">847<small>trades</small></div><div className="stat-delta up">↑ 34 this week</div></div>
        <div className="stat-card accent"><div className="stat-label">Win rate</div><div className="stat-value">64<small>%</small></div><div className="stat-delta" style={{color:'rgba(255,255,255,0.4)'}}>↓ 2pts last 30d</div></div>
        <div className="stat-card"><div className="stat-label">Quotes sent</div><div className="stat-value">2.4k</div><div className="stat-delta up">↑ 18% MoM</div></div>
        <div className="stat-card"><div className="stat-label">Avg quote</div><div className="stat-value">$840</div><div className="stat-delta up">↑ $40 vs prev qtr</div></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20 }}>
        <div className="data-card">
          <div className="data-card-head"><h3>Tradies by trade</h3></div>
          <div className="data-card-body">
            {[['Plumber','34%',34],['Electrician','28%',28],['Builder','18%',18],['Tiler','12%',12],['Other','8%',8]].map(([t,p,w]) => (
              <div key={t as string} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:10, width:80, color:'var(--fg3)', letterSpacing:'0.06em', textTransform:'uppercase' }}>{t}</span>
                <div style={{ flex:1, height:6, background:'var(--slate)', borderRadius:999 }}>
                  <div style={{ width:`${w}%`, height:'100%', background:'var(--navy)', borderRadius:999 }} />
                </div>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--fg3)', width:32, textAlign:'right' }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="data-card">
          <div className="data-card-head"><h3>Deal stages</h3></div>
          <div className="data-card-body">
            {DEALS.map(d => (
              <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:10, marginBottom:10, borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{d.contact}</div>
                  <div style={{ fontSize:11, color:'var(--fg3)' }}>{d.title}</div>
                </div>
                <Pill s={d.stage} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TradieDirectory() {
  const [tradies, setTradies] = useState(TRADIES);
  const upd = (id: string, f: string, v: string) => setTradies(ts => ts.map(t => t.id === id ? {...t, [f]: v} : t));
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#I</span><span className="sep">·</span><b>Trades</b><span className="sep">·</span><b>Tradie directory</b></div>
      <div className="section-head">
        <h2>Tradie <em>directory</em></h2>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="meta">{tradies.length} tradies</span>
          <button className="btn btn-primary btn-sm"><Ic n="plus" />Add tradie</button>
        </div>
      </div>
      <div className="data-card">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Trade</th><th>Company</th><th>Location</th><th>Email</th><th>Status</th></tr></thead>
          <tbody>
            {tradies.map(t => (
              <tr key={t.id}>
                <td className="fw600"><EF value={t.name}    onSave={v => upd(t.id,'name',v)} /></td>
                <td><EF value={t.trade}   onSave={v => upd(t.id,'trade',v)} /></td>
                <td><EF value={t.company} onSave={v => upd(t.id,'company',v)} /></td>
                <td><span className="mono">{t.city}, {t.state}</span></td>
                <td><EF value={t.email}   onSave={v => upd(t.id,'email',v)} /></td>
                <td><Pill s={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EndCustomers() {
  const [customers, setCustomers] = useState(END_CUSTOMERS);
  const upd = (id: string, f: string, v: string) => setCustomers(cs => cs.map(c => c.id === id ? {...c, [f]: v} : c));
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#I</span><span className="sep">·</span><b>Trades</b><span className="sep">·</span><b>End customers</b></div>
      <div className="section-head">
        <h2>End <em>customers</em></h2>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="meta">{customers.length} contacts</span>
          <button className="btn btn-primary btn-sm"><Ic n="plus" />Add customer</button>
        </div>
      </div>
      <div className="data-card">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Location</th><th>Source</th></tr></thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td className="fw600"><EF value={c.name}    onSave={v => upd(c.id,'name',v)} /></td>
                <td><EF value={c.company} onSave={v => upd(c.id,'company',v)} /></td>
                <td><EF value={c.email}   onSave={v => upd(c.id,'email',v)} /></td>
                <td><span className="mono">{c.city}, {c.state}</span></td>
                <td><span style={{ fontSize:12, color:'var(--fg3)' }}>{c.source}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DealsView() {
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#I</span><span className="sep">·</span><b>Trades</b><span className="sep">·</span><b>Deals</b></div>
      <div className="section-head"><h2>Deals</h2><span className="meta">{DEALS.length} open</span></div>
      <div className="data-card">
        <table className="data-table">
          <thead><tr><th>Contact</th><th>Deal</th><th>Value</th><th>Stage</th><th>Date</th></tr></thead>
          <tbody>
            {DEALS.map(d => (
              <tr key={d.id}>
                <td className="fw600">{d.contact}</td>
                <td>{d.title}</td>
                <td><span className="mono">{d.value}</span></td>
                <td><Pill s={d.stage} /></td>
                <td><span className="mono" style={{ color:'var(--fg3)' }}>{d.date}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResearchView() {
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#I</span><span className="sep">·</span><b>Trades</b><span className="sep">·</span><b>Research</b></div>
      <div className="section-head"><h2>Research <em>&amp; interviews</em></h2><span className="meta">{RESEARCH.length} interviews</span></div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {RESEARCH.map((r,i) => (
          <div key={i} className="data-card" style={{ padding:'22px 24px' }}>
            <p style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:20, lineHeight:1.35, color:'var(--fg1)', marginBottom:14, letterSpacing:'-0.01em' }} dangerouslySetInnerHTML={{ __html:`"${r.q}"` }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>{r.who}</div>
                <div style={{ fontSize:11, color:'var(--fg3)', marginTop:1 }}>{r.role}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span className="mono" style={{ color:'var(--fg3)' }}>{r.date}</span>
                <span style={{ fontFamily:'var(--font-body)', fontSize:28, fontWeight:700, color: r.score >= 9 ? 'var(--bottle)' : r.score >= 7 ? 'var(--butter-deep)' : 'var(--red)' }}>{r.score}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── OPS sections ──────────────────────────────────────────────────────────
function NotesView() {
  const [notes, setNotes] = useState(NOTES_DATA);
  const upd = (id: string, f: string, v: string) => setNotes(ns => ns.map(n => n.id === id ? {...n, [f]: v} : n));
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#II</span><span className="sep">·</span><b>Ops</b><span className="sep">·</span><b>Notes & decisions</b></div>
      <div className="section-head">
        <h2>Notes <em>&amp; decisions</em></h2>
        <button className="btn btn-primary btn-sm"><Ic n="plus" />Add note</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 }}>
        {notes.map(n => (
          <div key={n.id} className="data-card" style={{ padding:'18px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <EF value={n.title} onSave={v => upd(n.id,'title',v)} className="fw600" />
              <span className="mono">{n.date}</span>
            </div>
            <EF value={n.body} onSave={v => upd(n.id,'body',v)} multi className="mt8" />
            <div style={{ display:'flex', gap:6, marginTop:10 }}>
              {n.tags.map(t => <span key={t} style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'2px 6px', borderRadius:3, background:'var(--slate)', color:'var(--fg3)' }}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PoliciesView() {
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#II</span><span className="sep">·</span><b>Ops</b><span className="sep">·</span><b>Policies</b></div>
      <div className="section-head"><h2>Policies <em>&amp; legal</em></h2></div>
      <div className="data-card">
        {POLICIES_DATA.map(p => (
          <div key={p.id} style={{ display:'grid', gridTemplateColumns:'40px 1fr auto auto', gap:16, alignItems:'center', padding:'14px 20px', borderBottom:'1px solid var(--border)', cursor:'pointer' }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--red)', lineHeight:1, letterSpacing:'-0.02em' }}>{p.n}</span>
            <div><div style={{ fontSize:14, fontWeight:600 }}>{p.title}</div><div style={{ fontSize:12, color:'var(--fg3)', marginTop:2 }}>{p.sub}</div></div>
            <div style={{ textAlign:'right' }}><span className="mono" style={{ display:'block', fontWeight:600, color:'var(--fg1)' }}>{p.version}</span><span className="mono">{p.updated}</span></div>
            <span style={{ color:'var(--fg3)', fontSize:18, fontFamily:'var(--font-display)', fontStyle:'italic' }}>→</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RunbooksView() {
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#II</span><span className="sep">·</span><b>Ops</b><span className="sep">·</span><b>Runbooks</b></div>
      <div className="section-head"><h2>Runbooks</h2></div>
      <div className="editors-note" style={{ marginBottom:24 }}><p>Runbooks live in <b>docs/runbooks/</b> in the GitHub repo. Link them here as they're published.</p></div>
      {['Deploy to Cloudflare Pages','Roll back a bad deploy','Security incident response','Supabase migration failure'].map((r,i) => (
        <div key={i} className="data-card" style={{ padding:'14px 20px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
          <span style={{ fontSize:14, fontWeight:500 }}>{r}</span>
          <span style={{ fontFamily:'var(--font-display)', fontStyle:'italic', color:'var(--fg3)', fontSize:18 }}>→</span>
        </div>
      ))}
    </div>
  );
}

// ── KNOWLEDGE sections ────────────────────────────────────────────────────
function WikiView() {
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#III</span><span className="sep">·</span><b>Knowledge</b><span className="sep">·</span><b>Wiki</b></div>
      <div className="section-head"><h2>Wiki</h2><span className="meta">{WIKI_DATA.length} sections</span></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
        {WIKI_DATA.map(w => (
          <div key={w.id} className="data-card" style={{ padding:'18px 20px', cursor:'pointer' }}>
            <div style={{ fontFamily:'var(--font-body)', fontSize:28, fontWeight:700, color:'var(--red)', lineHeight:1, marginBottom:8 }}>{w.n}</div>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>{w.title}</div>
            <div style={{ fontSize:12, color:'var(--fg3)', lineHeight:1.45, marginBottom:10 }}>{w.sub}</div>
            <span className="mono">{w.pages}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangelogView() {
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#III</span><span className="sep">·</span><b>Knowledge</b><span className="sep">·</span><b>Changelog</b></div>
      <div className="section-head"><h2>Changelog</h2><span className="meta">What shipped</span></div>
      {CHANGELOG_DATA.map((c,i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:32, padding:'24px 0', borderBottom:'1px solid var(--border)' }}>
          <div>
            <span className="mono">{c.date}</span>
            <div style={{ fontFamily:'var(--font-body)', fontSize:20, fontWeight:700, color:'var(--fg1)', marginTop:2 }}>{c.v}</div>
          </div>
          <div>
            <h3 style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:400, fontSize:22, margin:'0 0 8px', letterSpacing:'-0.015em' }} dangerouslySetInnerHTML={{ __html: c.title }} />
            <p style={{ fontSize:13, color:'var(--fg2)', margin:'0 0 10px', lineHeight:1.5 }}>{c.body}</p>
            <div style={{ display:'flex', gap:6 }}>
              {c.tags.map(t => <span key={t} style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.1em', padding:'2px 7px', borderRadius:3, textTransform:'uppercase', fontWeight:500, background: t==='ship'?'var(--bottle-soft)':t==='fix'?'var(--blue-soft)':'var(--butter-soft)', color: t==='ship'?'var(--bottle-deep)':t==='fix'?'var(--blue-hover)':'var(--butter-deep)' }}>{t}</span>)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BrandView() {
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#III</span><span className="sep">·</span><b>Knowledge</b><span className="sep">·</span><b>Brand system</b></div>
      <div className="section-head"><h2>Brand <em>system</em></h2></div>
      <div className="editors-note" style={{ marginBottom:24 }}><p>The full brand book is in <b>relia-design-system/project/README.md</b> in the design handoff. Sentient typeface, navy spine, butter surprise, signal red punctuation.</p></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8, marginBottom:24 }}>
        {[['Navy','#1E3A8A','#fff'],['Red','#DC2626','#fff'],['Bottle','#115E3A','#fff'],['Butter','#F4C542','#142A6B'],['Slate','#E8EDF0','#142A6B']].map(([n,c,t]) => (
          <div key={n} style={{ background:c, borderRadius:8, padding:'16px 14px', border:'1px solid var(--border)' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:t, marginBottom:6 }}>{n}</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:t, opacity:0.7 }}>{c}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VoiceView() {
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#III</span><span className="sep">·</span><b>Knowledge</b><span className="sep">·</span><b>Voice & copy</b></div>
      <div className="section-head"><h2>Voice <em>&amp; copy</em></h2></div>
      <div className="data-card" style={{ padding:'24px 28px', marginBottom:16 }}>
        <p style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:22, lineHeight:1.3, marginBottom:16 }}>"We're not your mate. We're not your manager. We're the person who gets you paid faster."</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          {[['Do','Contractions always · Sentence case · Australian English · Nine words max · One exclamation mark, ever'],['Don\'t','Title Case SaaS Moments · "Submit" (say "Send") · "Dashboard" (say "Home") · Emoji · Two exclamation marks']].map(([label, text]) => (
            <div key={label}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color: label==='Do'?'var(--bottle)':'var(--red)', marginBottom:8 }}>{label}</div>
              <p style={{ fontSize:13, color:'var(--fg2)', lineHeight:1.6 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TradeVocabView() {
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#III</span><span className="sep">·</span><b>Knowledge</b><span className="sep">·</span><b>Trade vocab</b></div>
      <div className="section-head"><h2>Trade <em>vocabulary</em></h2></div>
      {[['Sparky','Electrician. Deals with downlights, switchboards, solar, EV chargers. Prone to jobs being delayed by council approvals.'],['Plumber','Plumber. Drainage, hot water, gas fitting. Jobs often have materials surprises — pipe sizes, fitting access.'],['Chippie','Carpenter/joiner. Framing, fitout, decking. Quote complexity varies enormously by finish level.'],['Tiler','Tiler. Bathroom, kitchen, outdoor. Material wastage and prep time are the hard parts to quote.'],['Builder','Builder/general contractor. Manages subbies. Needs Relia to handle multiple trade types in one quote.']].map(([trade, desc]) => (
        <div key={trade as string} className="data-card" style={{ padding:'16px 20px', marginBottom:8 }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{trade}</div>
          <div style={{ fontSize:13, color:'var(--fg3)', lineHeight:1.5 }}>{desc}</div>
        </div>
      ))}
    </div>
  );
}

// ── DEV sections ──────────────────────────────────────────────────────────
function InflightView() {
  const [tab, setTab] = useState<'list'|'activity'>('list');
  const [filter, setFilter] = useState('all');
  const STATUS_LABELS: Record<string,string> = { todo:'To do', prog:'In progress', review:'In review', done:'Done', block:'Blocked' };
  const shown = filter === 'all' ? ISSUES_SEED : ISSUES_SEED.filter(i => i.status === filter);
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>Dev</span><span className="sep">·</span><b>In flight</b></div>
      <div className="section-head">
        <h2>In <em>flight</em></h2>
        <span className="meta">{ISSUES_SEED.length} issues · Linear sync</span>
      </div>
      <div className="tab-bar">
        <button className={`tab-btn${tab==='list'?' active':''}`} onClick={() => setTab('list')}>Issues</button>
        <button className={`tab-btn${tab==='activity'?' active':''}`} onClick={() => setTab('activity')}>Activity</button>
      </div>
      {tab === 'list' && <>
        <div className="filter-strip">
          {['all','prog','review','todo','block','done'].map(f => (
            <button key={f} className={`filter-chip${filter===f?' on':''}`} onClick={() => setFilter(f)}>
              {f==='all'?'All':STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="data-card">
          {shown.map(i => (
            <div key={i.id} className="issue-row">
              <span className="iid">{i.id}</span>
              <span className="ititle"><b>{i.title}</b><span className="sub">{i.project}</span></span>
              <span className={`iavatar ${i.who.toLowerCase()}`}>{i.who}</span>
              <Pill s={i.status} />
            </div>
          ))}
        </div>
      </>}
      {tab === 'activity' && (
        <div className="data-card">
          {ACTIVITY.map((a,i) => (
            <div key={i} className="feed-row">
              <span className="feed-when">{a.when}</span>
              <span><span className="feed-who">{a.who}</span> <span style={{ color:'var(--fg2)' }}>{a.what} </span><span className="feed-ref">{a.ref}</span><span style={{ color:'var(--fg2)' }}>{a.extra}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityView() {
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>Dev</span><span className="sep">·</span><b>Activity</b></div>
      <div className="section-head"><h2>Activity</h2><span className="meta">Last 48 hours</span></div>
      <div className="data-card">
        {ACTIVITY.map((a,i) => (
          <div key={i} className="feed-row">
            <span className="feed-when">{a.when}</span>
            <span><span className="feed-who">{a.who}</span> <span style={{ color:'var(--fg2)' }}>{a.what} </span><span className="feed-ref">{a.ref}</span><span style={{ color:'var(--fg2)' }}>{a.extra}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequirementsView() {
  const [reqs, setReqs] = useState(REQS_SEED);
  const [filter, setFilter] = useState<'all'|'functional'|'non_functional'>('all');
  const shown = filter === 'all' ? reqs : reqs.filter(r => r.type === filter);
  const upd = (ref: string, f: string, v: string) => setReqs(rs => rs.map(r => r.ref === ref ? {...r, [f]: v} : r));
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>Dev</span><span className="sep">·</span><b>Requirements</b></div>
      <div className="section-head">
        <h2>Requirements</h2>
        <div style={{ display:'flex', gap:8 }}><span className="meta">{reqs.length} total</span><button className="btn btn-primary btn-sm"><Ic n="plus" />Add</button></div>
      </div>
      <div className="tab-bar">
        {(['all','functional','non_functional'] as const).map(f => (
          <button key={f} className={`tab-btn${filter===f?' active':''}`} onClick={() => setFilter(f)}>
            {f==='all'?'All':f==='functional'?'Functional':'Non-functional'}
          </button>
        ))}
      </div>
      <div className="data-card">
        <table className="data-table">
          <thead><tr><th>Ref</th><th>Category</th><th>Title</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>
            {shown.map(r => (
              <tr key={r.ref}>
                <td><span className="mono">{r.ref}</span></td>
                <td><EF value={r.category} onSave={v => upd(r.ref,'category',v)} /></td>
                <td className="fw600"><EF value={r.title} onSave={v => upd(r.ref,'title',v)} /></td>
                <td><Pill s={r.priority} /></td>
                <td><Pill s={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UATView() {
  const [tests, setTests] = useState(UAT_SEED);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title:'', req_ref:'', tester:'', linear_id:'', notes:'' });
  const upd = (id: string, f: string, v: string) => setTests(ts => ts.map(t => t.id === id ? {...t, [f]: v} : t));
  const addTest = () => {
    const nextRef = `UAT-${String(tests.length + 1).padStart(3,'0')}`;
    setTests(ts => [...ts, { id: String(Date.now()), ref: nextRef, status: 'draft', date: new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'}), ...form }]);
    setForm({ title:'', req_ref:'', tester:'', linear_id:'', notes:'' });
    setAdding(false);
  };
  const statusClass: Record<string,string> = { draft:'p-draft', ready:'p-todo', in_progress:'p-prog', passed:'p-passed', failed:'p-failed', blocked:'p-block' };
  const summary = { passed: tests.filter(t=>t.status==='passed').length, failed: tests.filter(t=>t.status==='failed').length, in_progress: tests.filter(t=>t.status==='in_progress').length, draft: tests.filter(t=>t.status==='draft').length };
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>Dev</span><span className="sep">·</span><b>UAT</b></div>
      <div className="section-head">
        <h2>User acceptance <em>testing</em></h2>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)}><Ic n="plus" />{adding ? 'Cancel' : 'Add test'}</button>
      </div>
      <div className="stat-row" style={{ marginBottom:24 }}>
        <div className="stat-card"><div className="stat-label">Passed</div><div className="stat-value" style={{ color:'var(--bottle)' }}>{summary.passed}</div></div>
        <div className="stat-card"><div className="stat-label">Failed</div><div className="stat-value" style={{ color:'var(--red)' }}>{summary.failed}</div></div>
        <div className="stat-card"><div className="stat-label">In progress</div><div className="stat-value" style={{ color:'var(--butter-deep)' }}>{summary.in_progress}</div></div>
        <div className="stat-card"><div className="stat-label">Draft</div><div className="stat-value" style={{ color:'var(--fg3)' }}>{summary.draft}</div></div>
      </div>
      {adding && (
        <div className="uat-form">
          <h4>New UAT test</h4>
          <div className="form-grid">
            <div className="form-field full"><label>Title</label><input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="What are you testing?" /></div>
            <div className="form-field"><label>Requirement ref</label><select value={form.req_ref} onChange={e => setForm(f => ({...f, req_ref: e.target.value}))}><option value="">None</option>{REQS_SEED.map(r => <option key={r.ref} value={r.ref}>{r.ref} — {r.title}</option>)}</select></div>
            <div className="form-field"><label>Linear issue</label><select value={form.linear_id} onChange={e => setForm(f => ({...f, linear_id: e.target.value}))}><option value="">None</option>{ISSUES_SEED.map(i => <option key={i.id} value={i.id}>{i.id} — {i.title}</option>)}</select></div>
            <div className="form-field"><label>Tester</label><input value={form.tester} onChange={e => setForm(f => ({...f, tester: e.target.value}))} placeholder="Name" /></div>
            <div className="form-field"><label>Notes</label><input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Optional" /></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={addTest} disabled={!form.title}>Add test</button>
          </div>
        </div>
      )}
      <div className="data-card">
        <table className="data-table">
          <thead><tr><th>Ref</th><th>Requirement</th><th>Test</th><th>Linear issue</th><th>Tester</th><th>Status</th></tr></thead>
          <tbody>
            {tests.map(t => (
              <tr key={t.id}>
                <td><span className="mono">{t.ref}</span></td>
                <td><span className="mono" style={{ color:'var(--fg3)' }}>{t.req_ref}</span></td>
                <td className="fw600"><EF value={t.title} onSave={v => upd(t.id,'title',v)} /></td>
                <td>{t.linear_id ? <span className="mono" style={{ color:'var(--navy)' }}>{t.linear_id}</span> : <span style={{ color:'var(--fg3)', fontSize:12 }}>—</span>}</td>
                <td><EF value={t.tester} onSave={v => upd(t.id,'tester',v)} /></td>
                <td>
                  <select value={t.status} onChange={e => upd(t.id,'status',e.target.value)} style={{ fontFamily:'var(--font-body)', fontSize:11, background:'transparent', border:'none', color:'var(--fg2)', cursor:'pointer', padding:0 }}>
                    {['draft','ready','in_progress','passed','failed','blocked'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────
function LandingPage() {
  return (
    <div className="landing-page">
      <div className="pub-header"># 001 · Relia home base · Internal</div>
      <h1 className="landing-heading">Everything <em>we know,</em><br />in one place.</h1>
      <p className="landing-sub">The team's working memory — trades data, operations, product knowledge, and the build internals that hold it all together.</p>
      <div className="landing-contents-label"><span>Contents</span><span>Three hubs</span></div>
      <div className="hub-index">
        {[
          { hub:'trades',    num:'I',   title:'Trades Hub',    desc:'Your market. Every tradie on the waitlist, their customers, research, and the pipeline.', tags:['tradie directory','end customers','research','deals'] },
          { hub:'ops',       num:'II',  title:'Ops Hub',       desc:'How the business runs. Notes, decisions, policies, and runbooks.',                         tags:['notes','decisions','policies','runbooks'] },
          { hub:'knowledge', num:'III', title:'Knowledge Hub', desc:'The collective memory. Wiki, changelog, brand system, voice, trade vocabulary.',            tags:['wiki','changelog','brand','voice','trade vocab'] },
        ].map(h => (
          <button key={h.hub} className="hub-index-card" onClick={() => navigate(h.hub)}>
            <span className="hub-card-num">{h.num}</span>
            <div className="hub-card-body">
              <span className="hub-card-title">{h.title}</span>
              <p className="hub-card-desc">{h.desc}</p>
              <div className="hub-card-tags">{h.tags.map(t => <span key={t} className="hub-card-tag">{t}</span>)}</div>
            </div>
            <span className="hub-card-arrow">→</span>
          </button>
        ))}
        <button className="hub-index-card" onClick={() => navigate('dev')} style={{ opacity:0.6 }}>
          <span className="hub-card-num dev">—</span>
          <div className="hub-card-body">
            <span className="hub-card-title" style={{ fontSize:16 }}>Dev</span>
            <p className="hub-card-desc">Build internals — in flight issues, requirements, UAT, activity.</p>
            <div className="hub-card-tags">{['in flight','requirements','uat','activity'].map(t => <span key={t} className="hub-card-tag">{t}</span>)}</div>
          </div>
          <span className="hub-card-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [route, setRoute] = useState<Route>({ hub: '', section: '' });

  useEffect(() => {
    const handle = () => { setRoute(parseRoute(window.location.hash)); window.scrollTo(0,0); };
    window.addEventListener('hashchange', handle);
    handle();
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  const hub = route.hub as keyof typeof HUBS | '';
  const isLanding = !hub || !HUBS[hub as keyof typeof HUBS];
  const hubDef = hub && HUBS[hub as keyof typeof HUBS] ? HUBS[hub as keyof typeof HUBS] : null;

  const renderContent = () => {
    if (isLanding) return <LandingPage />;
    if (!route.section) return <HubOverview hub={hub as keyof typeof HUBS} />;
    if (hub === 'trades') {
      if (route.section === 'dashboard')    return <TradesDashboard />;
      if (route.section === 'tradies')      return <TradieDirectory />;
      if (route.section === 'endcustomers') return <EndCustomers />;
      if (route.section === 'deals')        return <DealsView />;
      if (route.section === 'research')     return <ResearchView />;
    }
    if (hub === 'ops') {
      if (route.section === 'notes')    return <NotesView />;
      if (route.section === 'policies') return <PoliciesView />;
      if (route.section === 'runbooks') return <RunbooksView />;
    }
    if (hub === 'knowledge') {
      if (route.section === 'wiki')      return <WikiView />;
      if (route.section === 'changelog') return <ChangelogView />;
      if (route.section === 'brand')     return <BrandView />;
      if (route.section === 'voice')     return <VoiceView />;
      if (route.section === 'trades')    return <TradeVocabView />;
    }
    if (hub === 'dev') {
      if (route.section === 'inflight')     return <InflightView />;
      if (route.section === 'activity')     return <ActivityView />;
      if (route.section === 'requirements') return <RequirementsView />;
      if (route.section === 'uat')          return <UATView />;
    }
    return <HubOverview hub={hub as keyof typeof HUBS} />;
  };

  return (
    <>
      {/* Top nav */}
      <nav className="top-nav">
        <button className="nav-logo" onClick={() => navigate('')}>
          <img src="/assets/relia_logo_mark.png" alt="Relia" />
          <span>Relia</span>
        </button>
        <div className="nav-hub-links">
          {(['trades','ops','knowledge'] as const).map(h => (
            <button key={h} className={`nav-hub-link${hub===h?' active':''}`} onClick={() => navigate(h)}>
              <span className="num">{HUBS[h].num}</span>{HUBS[h].label.replace(' Hub','')}
            </button>
          ))}
          <button className={`nav-hub-link dev-link${hub==='dev'?' active':''}`} onClick={() => navigate('dev')}>— Dev</button>
        </div>
        <div className="nav-spacer" />
        <button className="nav-search"><Ic n="search" size={12} />Search<span className="shortcut">⌘K</span></button>
        <div className="nav-avatar">A</div>
      </nav>

      {/* Shell */}
      <div className="hub-shell">
        {!isLanding && hubDef && <HubSidebar hub={hub as keyof typeof HUBS} route={route} />}
        <div className={`hub-content${isLanding ? ' no-sidebar' : ''}`}>
          {renderContent()}
        </div>
      </div>

      <div className="stamp-wm">R</div>
    </>
  );
}
