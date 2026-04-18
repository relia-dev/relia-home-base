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
const ACTIVITY: { when: string; who: string; what: string; ref: string; extra: string }[] = [];
const ISSUES_SEED = [
  { id:'REL-142', title:'Voice capture drops last second on iOS 18', status:'prog',   prio:'urgent', who:'J', project:'iOS app · v0.9' },
  { id:'REL-139', title:'Auto-chase email lands in spam — SPF record', status:'review', prio:'high', who:'M', project:'Backend' },
  { id:'REL-136', title:'Quote PDF — line items overflow on long jobs', status:'prog',  prio:'high', who:'J', project:'iOS app · v0.9' },
  { id:'REL-131', title:'Onboarding step 3 — ABN lookup timeout',      status:'todo',  prio:'med',  who:'S', project:'iOS app · v0.9' },
  { id:'REL-128', title:'Admin: export waitlist to CSV',                status:'done',  prio:'low',  who:'M', project:'Web' },
  { id:'REL-127', title:'Dark mode — slate backgrounds clash on Samsung',status:'todo', prio:'med',  who:'S', project:'iOS app · v0.9' },
  { id:'REL-120', title:'Push notification not firing on quote accept', status:'block', prio:'urgent',who:'M', project:'Backend' },
];
const REQS_SEED: { ref: string; type: string; category: string; priority: string; status: string; title: string; linear_id: string }[] = [];
const UAT_SEED: { id: string; ref: string; req_ref: string; title: string; status: string; tester: string; date: string; linear_id: string; notes: string }[] = [];

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

// ── Issue row with edit panel ─────────────────────────────────────────────
function IssueRow({ issue, apiKey }: { issue: LinearIssue; apiKey: string }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(issue.title);
  const [priority, setPriority] = useState(issue.priority);

  const saveToLinear = async () => {
    if (!apiKey) return;
    setSaving(true);
    await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
      body: JSON.stringify({ query: `mutation { issueUpdate(id: "${issue.id}", input: { title: ${JSON.stringify(title)}, priority: ${priority} }) { success } }` }),
    });
    setSaving(false);
  };

  return (
    <>
      <div className="issue-row" style={{ cursor:'pointer' }} onClick={() => setExpanded(e => !e)}>
        <span className="iid">{issue.identifier}</span>
        <span className="ititle">
          <b>{title}</b>
          {issue.team && <span className="sub">{issue.team.name}</span>}
          {issue.labels.nodes.map(l => <span key={l.name} style={{ marginLeft:6, fontSize:10, padding:'1px 6px', borderRadius:3, background:`${l.color}22`, color:l.color, fontFamily:'var(--font-mono)', letterSpacing:'0.06em' }}>{l.name}</span>)}
        </span>
        {issue.assignee && <span className="iavatar" title={issue.assignee.displayName}>{initials(issue.assignee.displayName)}</span>}
        <span style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          <Pill s={linearStatusToPill(issue.state.type)} label={issue.state.name} />
          {issue.priority > 0 && <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: priorityColor(issue.priority), letterSpacing:'0.06em' }}>{priorityLabel(issue.priority)}</span>}
        </span>
      </div>
      {expanded && (
        <div style={{ padding:'14px 20px 16px', background:'var(--slate-soft)', borderBottom:'1px solid var(--border)' }}>
          <div className="form-grid" style={{ marginBottom:10 }}>
            <div className="form-field full">
              <label>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Priority</label>
              <select value={priority} onChange={e => setPriority(Number(e.target.value))}>
                {[0,1,2,3,4].map(p => <option key={p} value={p}>{priorityLabel(p)}</option>)}
              </select>
            </div>
            <div className="form-field" style={{ justifyContent:'flex-end', flexDirection:'row', alignItems:'flex-end', gap:8 }}>
              <a href={issue.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Open in Linear →</a>
              <button className="btn btn-primary btn-sm" onClick={saveToLinear} disabled={saving}>{saving ? 'Saving…' : 'Save to Linear'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Linear types ──────────────────────────────────────────────────────────
interface LinearIssue { id: string; identifier: string; title: string; state: { name: string; type: string }; priority: number; assignee: { name: string; displayName: string } | null; team: { name: string } | null; labels: { nodes: { name: string; color: string }[] }; url: string; }
interface LinearCycle { id: string; name: string | null; number: number; startsAt: string; endsAt: string; completedAt: string | null; issues: { nodes: LinearIssue[] }; progress: number; }

const LINEAR_QUERY = `query {
  cycles(first: 8, orderBy: updatedAt) {
    nodes { id name number startsAt endsAt completedAt progress
      issues(first: 100) { nodes { id identifier title
        state { name type }
        priority
        assignee { name displayName }
        team { name }
        labels { nodes { name color } }
        url
      }}
    }
  }
  issues(first: 100, orderBy: updatedAt, filter: { state: { type: { nin: ["completed","cancelled"] } } }) {
    nodes { id identifier title
      state { name type }
      priority assignee { name displayName } team { name }
      labels { nodes { name color } } url
    }
  }
}`;

function linearStatusToPill(stateType: string): string {
  switch (stateType) {
    case 'started':   return 'prog';
    case 'unstarted': return 'todo';
    case 'completed': return 'done';
    case 'cancelled': return 'block';
    case 'triage':    return 'review';
    default:          return 'todo';
  }
}
function priorityLabel(p: number) { return ['No priority','Urgent','High','Medium','Low'][p] ?? 'No priority'; }
function priorityColor(p: number) { return [,'var(--red)','var(--butter-deep)','var(--navy-soft)','var(--fg3)'][p] ?? 'var(--fg3)'; }
function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase(); }

// ── DEV sections ──────────────────────────────────────────────────────────
function InflightView() {
  const [tab, setTab] = useState<'list'|'activity'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_LINEAR_API_KEY;
    if (!key) { setLoading(false); return; }
    fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': key },
      body: JSON.stringify({ query: LINEAR_QUERY }),
    })
    .then(r => r.json())
    .then((data: { data?: { issues?: { nodes: LinearIssue[] }; cycles?: { nodes: LinearCycle[] } } }) => {
      setIssues(data.data?.issues?.nodes ?? []);
      setCycles(data.data?.cycles?.nodes ?? []);
      setLoading(false);
    })
    .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const activeCycles = cycles.filter(c => !c.completedAt);
  const currentCycle = activeCycles[0];

  const shownIssues = (() => {
    let pool = issues;
    if (cycleFilter !== 'all') {
      const cyc = cycles.find(c => c.id === cycleFilter);
      pool = cyc ? cyc.issues.nodes : [];
    }
    if (statusFilter === 'all') return pool;
    return pool.filter(i => linearStatusToPill(i.state.type) === statusFilter);
  })();

  const statusLabels: Record<string,string> = { all:'All', todo:'To do', prog:'In progress', review:'Triage', done:'Done', block:'Cancelled' };

  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>Dev</span><span className="sep">·</span><b>In flight</b></div>
      <div className="section-head">
        <h2>In <em>flight</em></h2>
        <span className="meta">
          {loading ? 'Loading from Linear…' : error ? 'Linear unavailable — showing cached' : `${issues.length} issues · Linear live`}
        </span>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn${tab==='list'?' active':''}`} onClick={() => setTab('list')}>Issues</button>
        <button className={`tab-btn${tab==='activity'?' active':''}`} onClick={() => setTab('activity')}>Activity</button>
      </div>

      {tab === 'list' && <>
        {/* Cycle filter */}
        {cycles.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--fg3)', marginBottom:8 }}>Cycle</div>
            <div className="filter-strip" style={{ marginBottom:0 }}>
              <button className={`filter-chip${cycleFilter==='all'?' on':''}`} onClick={() => setCycleFilter('all')}>All issues</button>
              {cycles.map(c => (
                <button key={c.id} className={`filter-chip${cycleFilter===c.id?' on':''}`} onClick={() => setCycleFilter(c.id)}>
                  {c.name ?? `Cycle ${c.number}`}
                  {!c.completedAt && <span style={{ marginLeft:5, width:6, height:6, borderRadius:'50%', background:'var(--bottle)', display:'inline-block', verticalAlign:'middle' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status filter */}
        <div className="filter-strip">
          {(['all','prog','todo','review','done','block'] as const).map(f => (
            <button key={f} className={`filter-chip${statusFilter===f?' on':''}`} onClick={() => setStatusFilter(f)}>
              {statusLabels[f]}
            </button>
          ))}
        </div>

        {/* Cycle summary bar */}
        {cycleFilter !== 'all' && (() => {
          const cyc = cycles.find(c => c.id === cycleFilter);
          if (!cyc) return null;
          const start = new Date(cyc.startsAt).toLocaleDateString('en-AU',{day:'numeric',month:'short'});
          const end   = new Date(cyc.endsAt).toLocaleDateString('en-AU',{day:'numeric',month:'short'});
          return (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:24 }}>
              <div><div className="mono" style={{ marginBottom:2 }}>Cycle</div><div style={{ fontWeight:600, fontSize:14 }}>{cyc.name ?? `Cycle ${cyc.number}`}</div></div>
              <div><div className="mono" style={{ marginBottom:2 }}>Period</div><div style={{ fontSize:13 }}>{start} – {end}</div></div>
              <div><div className="mono" style={{ marginBottom:2 }}>Progress</div><div style={{ fontSize:13, fontWeight:600, color:'var(--bottle)' }}>{Math.round(cyc.progress)}%</div></div>
              <div style={{ flex:1 }}>
                <div style={{ height:4, background:'var(--slate)', borderRadius:999 }}>
                  <div style={{ width:`${cyc.progress}%`, height:'100%', background:'var(--bottle)', borderRadius:999, transition:'width 0.3s' }} />
                </div>
              </div>
              {cyc.completedAt && <Pill s="done" label="Complete" />}
              {!cyc.completedAt && <Pill s="prog" label="Active" />}
            </div>
          );
        })()}

        <div className="data-card">
          {loading && <div style={{ padding:'20px', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>Loading from Linear…</div>}
          {!loading && shownIssues.length === 0 && <div style={{ padding:'20px', color:'var(--fg3)', fontSize:13 }}>No issues match this filter.</div>}
          {shownIssues.map(i => (
            <IssueRow key={i.id} issue={i} apiKey={process.env.NEXT_PUBLIC_LINEAR_API_KEY ?? ''} />
          ))}
        </div>
      </>}

      {tab === 'activity' && (
        <div className="data-card">
          {ACTIVITY.length === 0
            ? <div style={{ padding:'32px 20px', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>Activity will appear here once the cron sync is running.</div>
            : ACTIVITY.map((a,i) => (
              <div key={i} className="feed-row">
                <span className="feed-when">{a.when}</span>
                <span><span className="feed-who">{a.who}</span> <span style={{ color:'var(--fg2)' }}>{a.what} </span><span className="feed-ref">{a.ref}</span><span style={{ color:'var(--fg2)' }}>{a.extra}</span></span>
              </div>
            ))
          }
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
  const [adding, setAdding] = useState(false);
  const [linearIssues, setLinearIssues] = useState<LinearIssue[]>([]);
  const [form, setForm] = useState({ type:'functional', category:'', title:'', description:'', priority:'must_have', linear_id:'' });

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_LINEAR_API_KEY;
    if (!key) return;
    fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': key },
      body: JSON.stringify({ query: `query { issues(first: 100) { nodes { id identifier title state { name type } } } }` }),
    }).then(r => r.json()).then((d: { data?: { issues?: { nodes: LinearIssue[] } } }) => setLinearIssues(d.data?.issues?.nodes ?? []));
  }, []);

  const shown = filter === 'all' ? reqs : reqs.filter(r => r.type === filter);
  const upd = (ref: string, f: string, v: string) => setReqs(rs => rs.map(r => r.ref === ref ? {...r, [f]: v} : r));

  const nextRef = () => {
    const prefix = form.type === 'functional' ? 'FR' : 'NFR';
    const existing = reqs.filter(r => r.type === form.type).length;
    return `${prefix}-${String(existing + 1).padStart(3,'0')}`;
  };

  const addReq = () => {
    setReqs(rs => [...rs, { ref: nextRef(), type: form.type, category: form.category, title: form.title, priority: form.priority, status: 'draft', linear_id: form.linear_id }]);
    setForm({ type:'functional', category:'', title:'', description:'', priority:'must_have', linear_id:'' });
    setAdding(false);
  };

  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>Dev</span><span className="sep">·</span><b>Requirements</b></div>
      <div className="section-head">
        <h2>Requirements</h2>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="meta">{reqs.length} total</span>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)}><Ic n="plus" />{adding?'Cancel':'Add'}</button>
        </div>
      </div>

      {adding && (
        <div className="uat-form" style={{ marginBottom:20 }}>
          <h4>New requirement</h4>
          <div className="form-grid">
            <div className="form-field">
              <label>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                <option value="functional">Functional</option>
                <option value="non_functional">Non-functional</option>
              </select>
            </div>
            <div className="form-field">
              <label>Category</label>
              <input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} placeholder="e.g. Voice Capture, Security" />
            </div>
            <div className="form-field full">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="What must the system do?" />
            </div>
            <div className="form-field">
              <label>Priority (MoSCoW)</label>
              <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}>
                <option value="must_have">Must have</option>
                <option value="should_have">Should have</option>
                <option value="could_have">Could have</option>
                <option value="wont_have">Won't have</option>
              </select>
            </div>
            <div className="form-field">
              <label>Linked Linear issue</label>
              <select value={form.linear_id} onChange={e => setForm(f => ({...f, linear_id: e.target.value}))}>
                <option value="">None</option>
                {linearIssues.map(i => <option key={i.id} value={i.identifier}>{i.identifier} — {i.title}</option>)}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={addReq} disabled={!form.title || !form.category}>Add requirement</button>
          </div>
        </div>
      )}

      <div className="tab-bar">
        {(['all','functional','non_functional'] as const).map(f => (
          <button key={f} className={`tab-btn${filter===f?' active':''}`} onClick={() => setFilter(f)}>
            {f==='all'?`All (${reqs.length})`:f==='functional'?`Functional (${reqs.filter(r=>r.type==='functional').length})`:`Non-functional (${reqs.filter(r=>r.type==='non_functional').length})`}
          </button>
        ))}
      </div>

      <div className="data-card">
        <table className="data-table">
          <thead><tr><th>Ref</th><th>Category</th><th>Title</th><th>Priority</th><th>Status</th><th>Linear</th></tr></thead>
          <tbody>
            {shown.map(r => (
              <tr key={r.ref}>
                <td><span className="mono">{r.ref}</span></td>
                <td>
                  <select value={r.category} onChange={e => upd(r.ref,'category',e.target.value)} style={{ fontFamily:'var(--font-body)', fontSize:12, background:'transparent', border:'none', color:'var(--fg2)', cursor:'pointer', padding:0, width:'100%' }}>
                    {['Voice Capture','Quoting','Follow-up','Onboarding','Materials','Performance','Security','Availability','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                    {!['Voice Capture','Quoting','Follow-up','Onboarding','Materials','Performance','Security','Availability','Other'].includes(r.category) && <option value={r.category}>{r.category}</option>}
                  </select>
                </td>
                <td className="fw600"><EF value={r.title} onSave={v => upd(r.ref,'title',v)} /></td>
                <td>
                  <select value={r.priority} onChange={e => upd(r.ref,'priority',e.target.value)} style={{ fontFamily:'var(--font-body)', fontSize:11, background:'transparent', border:'none', color:'var(--fg2)', cursor:'pointer', padding:0 }}>
                    {['must_have','should_have','could_have','wont_have'].map(p => <option key={p} value={p}>{p.replace('_',' ')}</option>)}
                  </select>
                </td>
                <td>
                  <select value={r.status} onChange={e => upd(r.ref,'status',e.target.value)} style={{ fontFamily:'var(--font-body)', fontSize:11, background:'transparent', border:'none', color:'var(--fg2)', cursor:'pointer', padding:0 }}>
                    {['draft','approved','implemented','deprecated'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <select value={r.linear_id} onChange={e => upd(r.ref,'linear_id',e.target.value)} style={{ fontFamily:'var(--font-mono)', fontSize:10, background:'transparent', border:'none', color: r.linear_id ? 'var(--navy)' : 'var(--fg3)', cursor:'pointer', padding:0 }}>
                    <option value="">—</option>
                    {linearIssues.map(i => <option key={i.id} value={i.identifier}>{i.identifier}</option>)}
                    {r.linear_id && !linearIssues.find(i => i.identifier === r.linear_id) && <option value={r.linear_id}>{r.linear_id}</option>}
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
