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
const CHANGELOG_DATA: { id: string; date: string; v: string; title: string; tags: string[]; body: string }[] = [];
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
const UAT_SEED: { id: string; ref: string; req_ref: string; title: string; status: string; tester: string; date: string; linear_id: string; notes: string; platform: string; version: string }[] = [];

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
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:'', trade:'', company:'', city:'', state:'', email:'', abn:'', status:'prospect' });
  const upd = (id: string, f: string, v: string) => setTradies(ts => ts.map(t => t.id === id ? {...t, [f]: v} : t));
  const add = () => {
    setTradies(ts => [...ts, { id: String(Date.now()), ...form }]);
    setForm({ name:'', trade:'', company:'', city:'', state:'', email:'', abn:'', status:'prospect' });
    setAdding(false);
  };
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#I</span><span className="sep">·</span><b>Trades</b><span className="sep">·</span><b>Tradie directory</b></div>
      <div className="section-head">
        <h2>Tradie <em>directory</em></h2>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="meta">{tradies.length} tradies</span>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)}><Ic n="plus" />{adding?'Cancel':'Add tradie'}</button>
        </div>
      </div>
      {adding && (
        <div className="uat-form" style={{ marginBottom:16 }}>
          <div className="form-grid">
            <div className="form-field"><label>Full name</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Brendan Walsh" /></div>
            <div className="form-field"><label>Trade</label><select value={form.trade} onChange={e => setForm(f=>({...f,trade:e.target.value}))}><option value="">Select…</option>{['Plumber','Electrician','Carpenter','Tiler','Builder','Painter','Landscaper','Other'].map(t=><option key={t}>{t}</option>)}</select></div>
            <div className="form-field"><label>Company</label><input value={form.company} onChange={e => setForm(f=>({...f,company:e.target.value}))} placeholder="Walsh Plumbing" /></div>
            <div className="form-field"><label>Email</label><input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="brendan@walshplumbing.com.au" /></div>
            <div className="form-field"><label>City</label><input value={form.city} onChange={e => setForm(f=>({...f,city:e.target.value}))} placeholder="Geelong" /></div>
            <div className="form-field"><label>State</label><select value={form.state} onChange={e => setForm(f=>({...f,state:e.target.value}))}><option value="">Select…</option>{['VIC','NSW','QLD','WA','SA','TAS','ACT','NT'].map(s=><option key={s}>{s}</option>)}</select></div>
            <div className="form-field"><label>ABN (optional)</label><input value={form.abn} onChange={e => setForm(f=>({...f,abn:e.target.value}))} placeholder="51 824 753 556" /></div>
            <div className="form-field"><label>Status</label><select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}><option value="prospect">Prospect</option><option value="active">Active</option></select></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={add} disabled={!form.name || !form.trade}>Add tradie</button>
          </div>
        </div>
      )}
      <div className="data-card">
        {tradies.length === 0 && !adding && <div style={{ padding:'32px 20px', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>No tradies yet. Add your first one above.</div>}
        <table className="data-table">
          <thead><tr><th>Name</th><th>Trade</th><th>Company</th><th>Location</th><th>Email</th><th>Status</th></tr></thead>
          <tbody>
            {tradies.map(t => (
              <tr key={t.id}>
                <td className="fw600"><EF value={t.name}    onSave={v => upd(t.id,'name',v)} /></td>
                <td><EF value={t.trade}   onSave={v => upd(t.id,'trade',v)} /></td>
                <td><EF value={t.company} onSave={v => upd(t.id,'company',v)} /></td>
                <td><EF value={`${t.city}, ${t.state}`} onSave={v => upd(t.id,'city',v)} /></td>
                <td><EF value={t.email}   onSave={v => upd(t.id,'email',v)} /></td>
                <td><select value={t.status} onChange={e => upd(t.id,'status',e.target.value)} style={{ fontFamily:'var(--font-body)', fontSize:11, background:'transparent', border:'none', color:'var(--fg2)', cursor:'pointer' }}><option value="prospect">Prospect</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="churned">Churned</option></select></td>
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
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:'', company:'', email:'', city:'', state:'', source:'' });
  const upd = (id: string, f: string, v: string) => setCustomers(cs => cs.map(c => c.id === id ? {...c, [f]: v} : c));
  const add = () => {
    setCustomers(cs => [...cs, { id: String(Date.now()), ...form }]);
    setForm({ name:'', company:'', email:'', city:'', state:'', source:'' });
    setAdding(false);
  };
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#I</span><span className="sep">·</span><b>Trades</b><span className="sep">·</span><b>End customers</b></div>
      <div className="section-head">
        <h2>End <em>customers</em></h2>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="meta">{customers.length} contacts</span>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)}><Ic n="plus" />{adding?'Cancel':'Add customer'}</button>
        </div>
      </div>
      {adding && (
        <div className="uat-form" style={{ marginBottom:16 }}>
          <div className="form-grid">
            <div className="form-field"><label>Full name</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Sarah Okafor" /></div>
            <div className="form-field"><label>Company (optional)</label><input value={form.company} onChange={e => setForm(f=>({...f,company:e.target.value}))} placeholder="Okafor Properties" /></div>
            <div className="form-field"><label>Email</label><input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="sarah@okaforprop.com.au" /></div>
            <div className="form-field"><label>Source</label><input value={form.source} onChange={e => setForm(f=>({...f,source:e.target.value}))} placeholder="Google, Referral…" /></div>
            <div className="form-field"><label>City</label><input value={form.city} onChange={e => setForm(f=>({...f,city:e.target.value}))} placeholder="Melbourne" /></div>
            <div className="form-field"><label>State</label><select value={form.state} onChange={e => setForm(f=>({...f,state:e.target.value}))}><option value="">Select…</option>{['VIC','NSW','QLD','WA','SA','TAS','ACT','NT'].map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={add} disabled={!form.name}>Add customer</button>
          </div>
        </div>
      )}
      <div className="data-card">
        {customers.length === 0 && !adding && <div style={{ padding:'32px 20px', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>No end customers yet.</div>}
        <table className="data-table">
          <thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Location</th><th>Source</th></tr></thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td className="fw600"><EF value={c.name}    onSave={v => upd(c.id,'name',v)} /></td>
                <td><EF value={c.company} onSave={v => upd(c.id,'company',v)} /></td>
                <td><EF value={c.email}   onSave={v => upd(c.id,'email',v)} /></td>
                <td><EF value={`${c.city}, ${c.state}`} onSave={v => upd(c.id,'city',v)} /></td>
                <td><EF value={c.source}  onSave={v => upd(c.id,'source',v)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DealsView() {
  const [deals, setDeals] = useState(DEALS);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ contact:'', title:'', value:'', stage:'prospect', date:'' });
  const upd = (id: string, f: string, v: string) => setDeals(ds => ds.map(d => d.id === id ? {...d, [f]: v} : d));
  const add = () => {
    const today = new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'});
    setDeals(ds => [...ds, { id: String(Date.now()), ...form, date: form.date || today }]);
    setForm({ contact:'', title:'', value:'', stage:'prospect', date:'' });
    setAdding(false);
  };
  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#I</span><span className="sep">·</span><b>Trades</b><span className="sep">·</span><b>Deals</b></div>
      <div className="section-head">
        <h2>Deals</h2>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="meta">{deals.length} deals</span>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)}><Ic n="plus" />{adding?'Cancel':'Add deal'}</button>
        </div>
      </div>
      {adding && (
        <div className="uat-form" style={{ marginBottom:16 }}>
          <div className="form-grid">
            <div className="form-field"><label>Contact</label><input value={form.contact} onChange={e => setForm(f=>({...f,contact:e.target.value}))} placeholder="Brendan Walsh" /></div>
            <div className="form-field"><label>Deal title</label><input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Relia Pro · annual" /></div>
            <div className="form-field"><label>Value</label><input value={form.value} onChange={e => setForm(f=>({...f,value:e.target.value}))} placeholder="$228" /></div>
            <div className="form-field"><label>Stage</label><select value={form.stage} onChange={e => setForm(f=>({...f,stage:e.target.value}))}>{['prospect','qualified','trial','closed_won','closed_lost'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={add} disabled={!form.contact || !form.title}>Add deal</button>
          </div>
        </div>
      )}
      <div className="data-card">
        {deals.length === 0 && !adding && <div style={{ padding:'32px 20px', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>No deals yet.</div>}
        <table className="data-table">
          <thead><tr><th>Contact</th><th>Deal</th><th>Value</th><th>Stage</th><th>Date</th></tr></thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id}>
                <td className="fw600"><EF value={d.contact} onSave={v => upd(d.id,'contact',v)} /></td>
                <td><EF value={d.title} onSave={v => upd(d.id,'title',v)} /></td>
                <td><EF value={d.value} onSave={v => upd(d.id,'value',v)} /></td>
                <td><select value={d.stage} onChange={e => upd(d.id,'stage',e.target.value)} style={{ fontFamily:'var(--font-body)', fontSize:11, background:'transparent', border:'none', color:'var(--fg2)', cursor:'pointer' }}>{['prospect','qualified','trial','closed_won','closed_lost'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></td>
                <td><span className="mono" style={{ color:'var(--fg3)' }}>{d.date}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const RESEARCH_CATEGORIES = ['Voice capture', 'Quoting', 'Onboarding', 'Pricing', 'Follow-up', 'Materials', 'General'];

function ResearchView() {
  const [interviews, setInterviews] = useState(
    RESEARCH.map((r, i) => ({ ...r, id: String(i), category: 'General', archived: false, notes: '' }))
  );
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState({ who:'', role:'', q:'', score:'', date:'', category:'General', notes:'' });

  const upd = (id: string, f: string, v: string | number | boolean) =>
    setInterviews(rs => rs.map(r => r.id === id ? {...r, [f]: v} : r));

  const add = () => {
    const today = new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'}).toUpperCase();
    setInterviews(rs => [{ ...form, id: String(Date.now()), score: Number(form.score) || 0, date: form.date || today, archived: false }, ...rs]);
    setForm({ who:'', role:'', q:'', score:'', date:'', category:'General', notes:'' });
    setAdding(false);
  };

  const visible = interviews.filter(r => {
    if (r.archived !== showArchived) return false;
    if (catFilter !== 'all' && r.category !== catFilter) return false;
    return true;
  });

  const scoreColor = (s: number) => s >= 9 ? 'var(--bottle)' : s >= 7 ? 'var(--butter-deep)' : 'var(--red)';

  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#I</span><span className="sep">·</span><b>Trades</b><span className="sep">·</span><b>Research</b></div>
      <div className="section-head">
        <h2>Research <em>&amp; interviews</em></h2>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="meta">{interviews.filter(r=>!r.archived).length} active · {interviews.filter(r=>r.archived).length} archived</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowArchived(a => !a)}>{showArchived ? 'Show active' : 'Show archived'}</button>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)}><Ic n="plus" />{adding?'Cancel':'Add'}</button>
        </div>
      </div>

      {adding && (
        <div className="uat-form" style={{ marginBottom:16 }}>
          <div className="form-grid">
            <div className="form-field"><label>Name</label><input value={form.who} onChange={e => setForm(f=>({...f,who:e.target.value}))} placeholder="Brendan Walsh" /></div>
            <div className="form-field"><label>Role & location</label><input value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))} placeholder="Plumber · Geelong" /></div>
            <div className="form-field"><label>Category</label><select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>{RESEARCH_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="form-field"><label>NPS (0–10)</label><input type="number" min="0" max="10" value={form.score} onChange={e => setForm(f=>({...f,score:e.target.value}))} placeholder="9" /></div>
            <div className="form-field full"><label>Key quote</label><textarea value={form.q} onChange={e => setForm(f=>({...f,q:e.target.value}))} placeholder="What did they say?" /></div>
            <div className="form-field full"><label>Notes (optional)</label><textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Context, follow-up actions…" /></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={add} disabled={!form.who || !form.q}>Add interview</button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="filter-strip">
        <button className={`filter-chip${catFilter==='all'?' on':''}`} onClick={() => setCatFilter('all')}>All</button>
        {RESEARCH_CATEGORIES.filter(c => interviews.some(r => r.category === c)).map(c => (
          <button key={c} className={`filter-chip${catFilter===c?' on':''}`} onClick={() => setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {visible.length === 0 && <div style={{ padding:'32px 0', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>No {showArchived ? 'archived' : 'active'} interviews{catFilter !== 'all' ? ` in ${catFilter}` : ''}.</div>}

      <div className="data-card">
        {visible.map(r => (
          <div key={r.id}>
            {/* Compact row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto auto', gap:12, alignItems:'center', padding:'10px 20px', borderBottom: expanded===r.id ? 'none' : '1px solid var(--border)', cursor:'pointer', background: expanded===r.id ? 'var(--slate-soft)' : 'transparent' }}
              onClick={() => setExpanded(e => e === r.id ? null : r.id)}>
              <div style={{ minWidth:0 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{r.who}</span>
                <span style={{ fontSize:11, color:'var(--fg3)', marginLeft:8 }}>{r.role}</span>
                <span style={{ fontSize:12, color:'var(--fg2)', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1, fontStyle:'italic' }}>"{r.q.replace(/<[^>]+>/g,'').slice(0,80)}{r.q.length > 80 ? '…' : ''}"</span>
              </div>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'2px 7px', borderRadius:3, background:'var(--slate)', color:'var(--fg3)', whiteSpace:'nowrap' }}>{r.category}</span>
              <span className="mono" style={{ color:'var(--fg3)', fontSize:10, whiteSpace:'nowrap' }}>{r.date}</span>
              <span style={{ fontSize:20, fontWeight:700, color:scoreColor(r.score), width:28, textAlign:'center' }}>{r.score}</span>
              <span style={{ fontSize:16, color:'var(--fg3)', transform: expanded===r.id ? 'rotate(90deg)' : 'none', transition:'transform 0.15s', display:'block', width:16 }}>›</span>
            </div>

            {/* Expanded detail */}
            {expanded === r.id && (
              <div style={{ padding:'16px 20px', background:'var(--slate-soft)', borderBottom:'1px solid var(--border)' }}>
                <p style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:18, lineHeight:1.4, color:'var(--fg1)', marginBottom:12 }}>
                  "<EF value={r.q} onSave={v => upd(r.id,'q',v)} multi />"
                </p>
                {r.notes && <p style={{ fontSize:13, color:'var(--fg3)', marginBottom:12 }}>{r.notes}</p>}
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <select value={r.category} onChange={e => upd(r.id,'category',e.target.value)} style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 8px', borderRadius:3, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--fg3)', cursor:'pointer' }}>
                    {RESEARCH_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <span style={{ fontSize:11, color:'var(--fg3)' }}>NPS:</span>
                  <input type="number" min="0" max="10" value={r.score} onChange={e => upd(r.id,'score',Number(e.target.value))}
                    style={{ width:48, fontFamily:'var(--font-body)', fontSize:13, fontWeight:700, textAlign:'center', border:'1px solid var(--border)', borderRadius:4, padding:'2px 4px', color:scoreColor(r.score) }} />
                  <div style={{ flex:1 }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => upd(r.id,'archived', !r.archived)}>
                    {r.archived ? 'Restore' : 'Archive'}
                  </button>
                </div>
              </div>
            )}
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
  const [entries, setEntries] = useState(CHANGELOG_DATA);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ date: '', v: '', title: '', body: '', tags: [] as string[] });

  const TAG_OPTIONS = ['ship', 'fix', 'brand', 'ops'];
  const tagColor = (t: string) => ({ ship: ['var(--bottle-soft)','var(--bottle-deep)'], fix: ['var(--blue-soft)','var(--blue-hover)'], brand: ['var(--butter-soft)','var(--butter-deep)'], ops: ['var(--slate)','var(--fg2)'] }[t] ?? ['var(--slate)','var(--fg2)']);

  const resetForm = () => setForm({ date: new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'}), v: '', title: '', body: '', tags: [] });

  const addEntry = () => {
    setEntries(es => [{ id: String(Date.now()), ...form }, ...es]);
    setAdding(false);
    resetForm();
  };

  const saveEdit = (id: string) => {
    setEntries(es => es.map(e => e.id === id ? { ...e, ...form } : e));
    setEditing(null);
  };

  const startEdit = (e: typeof entries[0]) => {
    setForm({ date: e.date, v: e.v, title: e.title, body: e.body, tags: [...e.tags] });
    setEditing(e.id);
    setAdding(false);
  };

  const toggleTag = (t: string) => setForm(f => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t] }));

  const EntryForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div className="uat-form" style={{ marginBottom: 20 }}>
      <div className="form-grid">
        <div className="form-field"><label>Version</label><input value={form.v} onChange={e => setForm(f => ({...f, v: e.target.value}))} placeholder="v1.0.0" /></div>
        <div className="form-field"><label>Date</label><input value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} placeholder="18 Apr" /></div>
        <div className="form-field full"><label>Title</label><input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="What shipped?" /></div>
        <div className="form-field full"><label>Description</label><textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} placeholder="What changed and why it matters." /></div>
        <div className="form-field full">
          <label>Tags</label>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            {TAG_OPTIONS.map(t => (
              <button key={t} type="button" onClick={() => toggleTag(t)} style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.1em', padding:'3px 8px', borderRadius:3, textTransform:'uppercase', fontWeight:500, cursor:'pointer', border: form.tags.includes(t) ? 'none' : '1px solid var(--border)', background: form.tags.includes(t) ? tagColor(t)[0] : 'var(--bg-card)', color: form.tags.includes(t) ? tagColor(t)[1] : 'var(--fg3)' }}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onSave} disabled={!form.v || !form.title}>Save entry</button>
      </div>
    </div>
  );

  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#III</span><span className="sep">·</span><b>Knowledge</b><span className="sep">·</span><b>Changelog</b></div>
      <div className="section-head">
        <h2>Changelog</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setAdding(a => !a); setEditing(null); }}>
          <Ic n="plus" />{adding ? 'Cancel' : 'Add entry'}
        </button>
      </div>

      {adding && <EntryForm onSave={addEntry} onCancel={() => setAdding(false)} />}

      {entries.length === 0 && !adding && (
        <div style={{ padding:'40px 0', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>
          No changelog entries yet. Add your first release above.
        </div>
      )}

      {entries.map(c => (
        <div key={c.id}>
          {editing === c.id
            ? <EntryForm onSave={() => saveEdit(c.id)} onCancel={() => setEditing(null)} />
            : (
              <div style={{ display:'grid', gridTemplateColumns:'120px 1fr auto', gap:32, padding:'24px 0', borderBottom:'1px solid var(--border)', alignItems:'start' }}>
                <div>
                  <span className="mono">{c.date}</span>
                  <div style={{ fontFamily:'var(--font-body)', fontSize:20, fontWeight:700, color:'var(--fg1)', marginTop:2 }}>{c.v}</div>
                </div>
                <div>
                  <h3 style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:400, fontSize:22, margin:'0 0 8px', letterSpacing:'-0.015em' }}>{c.title}</h3>
                  <p style={{ fontSize:13, color:'var(--fg2)', margin:'0 0 10px', lineHeight:1.5 }}>{c.body}</p>
                  <div style={{ display:'flex', gap:6 }}>
                    {c.tags.map(t => <span key={t} style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.1em', padding:'2px 7px', borderRadius:3, textTransform:'uppercase', fontWeight:500, background:tagColor(t)[0], color:tagColor(t)[1] }}>{t}</span>)}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}><Ic n="edit" size={12} />Edit</button>
              </div>
            )
          }
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

const LINEAR_ACTIVITY_QUERY = `query {
  issues(first: 30, orderBy: updatedAt) {
    nodes {
      id identifier title url
      updatedAt
      state { name type }
      assignee { displayName }
      comments(first: 5, orderBy: createdAt) {
        nodes { id body createdAt user { displayName } }
      }
      history(first: 3) {
        nodes {
          id createdAt
          actor { displayName }
          toState { name }
          fromState { name }
          toAssignee { displayName }
          fromAssignee { displayName }
        }
      }
    }
  }
}`;

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
  const [tab] = useState<'list'>('list');
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
      const fetchedCycles = data.data?.cycles?.nodes ?? [];
      setIssues(data.data?.issues?.nodes ?? []);
      setCycles(fetchedCycles);
      const activeCycle = [...fetchedCycles].sort((a,b) => b.number - a.number).find(c => !c.completedAt);
      if (activeCycle) setCycleFilter(activeCycle.id);
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

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <div className="tab-bar" style={{ marginBottom:0 }}>
          <button className="tab-btn active">Issues</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('dev','activity')}>Activity feed →</button>
      </div>

      {tab === 'list' && <>
        {/* Cycle filter */}
        {cycles.length > 0 && (() => {
          const sorted = [...cycles].sort((a, b) => b.number - a.number);
          const active = sorted.filter(c => !c.completedAt);
          const defaultCycle = active[0]?.id ?? 'all';
          return (
            <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--fg3)', flexShrink:0 }}>Cycle</span>
              <select
                value={cycleFilter}
                onChange={e => setCycleFilter(e.target.value)}
                style={{ fontFamily:'var(--font-body)', fontSize:13, padding:'5px 10px', borderRadius:'var(--radius-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--fg1)', cursor:'pointer', outline:'none' }}
              >
                <option value="all">All issues</option>
                {sorted.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? `Cycle ${c.number}`}{!c.completedAt ? ' ●' : ''}
                  </option>
                ))}
              </select>
              {cycleFilter === 'all' && defaultCycle !== 'all' && (
                <button className="btn btn-ghost btn-sm" onClick={() => setCycleFilter(defaultCycle)}>Jump to current</button>
              )}
            </div>
          );
        })()}

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

    </div>
  );
}

interface ActivityEntry {
  id: string; when: string; whenTs: number; who: string; what: string;
  ref: string; extra: string; source: 'linear' | 'manual'; issueId?: string; issueUrl?: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

type ActivityIssue = { id: string; identifier: string; title: string; url: string };

function ActivityView() {
  const [linearEntries, setLinearEntries] = useState<ActivityEntry[]>([]);
  const [manualEntries, setManualEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addType, setAddType] = useState<'general'|'comment'>('general');
  const [linearIssues, setLinearIssues] = useState<ActivityIssue[]>([]);
  const [form, setForm] = useState({ who: '', what: '', ref: '', extra: '', issueId: '', comment: '' });
  const [posting, setPosting] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_LINEAR_API_KEY ?? '';

  useEffect(() => {
    if (!apiKey) { setLoading(false); return; }
    fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
      body: JSON.stringify({ query: LINEAR_ACTIVITY_QUERY }),
    })
    .then(r => r.json())
    .then((data: { data?: { issues?: { nodes: Array<{ id: string; identifier: string; title: string; url: string; updatedAt: string; state: { name: string }; assignee: { displayName: string } | null; comments: { nodes: Array<{ id: string; body: string; createdAt: string; user: { displayName: string } }> }; history: { nodes: Array<{ id: string; createdAt: string; actor: { displayName: string } | null; toState: { name: string } | null; fromState: { name: string } | null; toAssignee: { displayName: string } | null }> } }> } } }) => {
      const issues = data.data?.issues?.nodes ?? [];
      const entries: ActivityEntry[] = [];
      issues.forEach(issue => {
        issue.comments.nodes.forEach(c => {
          entries.push({ id: `c-${c.id}`, when: timeAgo(c.createdAt), whenTs: new Date(c.createdAt).getTime(), who: c.user.displayName, what: 'commented on', ref: issue.identifier, extra: ` — "${c.body.slice(0,60)}${c.body.length > 60 ? '…' : ''}"`, source: 'linear', issueId: issue.id, issueUrl: issue.url });
        });
        issue.history.nodes.forEach(h => {
          if (!h.actor) return;
          let what = 'updated';
          let extra = '';
          if (h.toState && h.fromState) { what = 'moved'; extra = ` from ${h.fromState.name} → ${h.toState.name}`; }
          else if (h.toState) { what = 'set status'; extra = ` to ${h.toState.name}`; }
          else if (h.toAssignee) { what = 'assigned'; extra = ` to ${h.toAssignee.displayName}`; }
          entries.push({ id: `h-${h.id}`, when: timeAgo(h.createdAt), whenTs: new Date(h.createdAt).getTime(), who: h.actor.displayName, what, ref: issue.identifier, extra, source: 'linear', issueId: issue.id, issueUrl: issue.url });
        });
      });
      entries.sort((a, b) => b.whenTs - a.whenTs);
      setLinearEntries(entries);
      setLinearIssues(issues.map(i => ({ id: i.id, identifier: i.identifier, title: i.title, url: i.url })));
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  const addManual = () => {
    setManualEntries(es => [{ id: String(Date.now()), when: 'just now', whenTs: Date.now(), who: form.who, what: form.what, ref: form.ref, extra: form.extra ? ` — ${form.extra}` : '', source: 'manual' }, ...es]);
    setForm({ who:'', what:'', ref:'', extra:'', issueId:'', comment:'' });
    setAdding(false);
  };

  const postComment = async () => {
    if (!apiKey || !form.issueId || !form.comment) return;
    setPosting(true);
    await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
      body: JSON.stringify({ query: `mutation { commentCreate(input: { issueId: "${form.issueId}", body: ${JSON.stringify(form.comment)} }) { success comment { id createdAt } } }` }),
    });
    const issue = linearIssues.find(i => i.id === form.issueId);
    setManualEntries(es => [{ id: String(Date.now()), when: 'just now', whenTs: Date.now(), who: 'You', what: 'commented on', ref: issue?.identifier ?? '', extra: ` — "${form.comment.slice(0,60)}…"`, source: 'linear', issueUrl: issue?.url }, ...es]);
    setForm({ who:'', what:'', ref:'', extra:'', issueId:'', comment:'' });
    setPosting(false);
    setAdding(false);
  };

  const [whoFilter, setWhoFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editForm, setEditForm] = useState({ who:'', what:'', ref:'', extra:'' });
  const [showAll, setShowAll] = useState(false);

  const all = [...manualEntries, ...linearEntries].sort((a,b) => b.whenTs - a.whenTs);

  const people = [...new Set(all.map(a => a.who))].sort();
  const actionTypes = [...new Set(all.map(a => a.what))].sort();

  const filtered = all.filter(a => {
    if (whoFilter !== 'all' && a.who !== whoFilter) return false;
    if (typeFilter !== 'all' && a.what !== typeFilter) return false;
    if (sourceFilter !== 'all' && a.source !== sourceFilter) return false;
    return true;
  });

  const shown = showAll ? filtered : filtered.slice(0, 30);

  const startEdit = (a: ActivityEntry) => {
    setEditingId(a.id);
    setEditForm({ who: a.who, what: a.what, ref: a.ref, extra: a.extra.replace(/^ — /,'') });
  };

  const saveEdit = () => {
    setManualEntries(es => es.map(e => e.id === editingId ? { ...e, ...editForm, extra: editForm.extra ? ` — ${editForm.extra}` : '' } : e));
    setEditingId(null);
  };

  const deleteEntry = (id: string) => {
    setManualEntries(es => es.filter(e => e.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>Dev</span><span className="sep">·</span><b>Activity</b></div>
      <div className="section-head">
        <h2>Activity</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)}><Ic n="plus" />{adding ? 'Cancel' : 'Add entry'}</button>
      </div>

      {adding && (
        <div className="uat-form" style={{ marginBottom:16 }}>
          <div className="tab-bar" style={{ marginBottom:14 }}>
            <button className={`tab-btn${addType==='general'?' active':''}`} onClick={() => setAddType('general')}>General note</button>
            <button className={`tab-btn${addType==='comment'?' active':''}`} onClick={() => setAddType('comment')}>Comment on Linear issue</button>
          </div>
          {addType === 'general' ? (
            <div className="form-grid">
              <div className="form-field"><label>Who</label><input value={form.who} onChange={e => setForm(f=>({...f,who:e.target.value}))} placeholder="James" /></div>
              <div className="form-field"><label>Action</label><input value={form.what} onChange={e => setForm(f=>({...f,what:e.target.value}))} placeholder="shipped, fixed, reviewed…" /></div>
              <div className="form-field"><label>Ref (optional)</label><input value={form.ref} onChange={e => setForm(f=>({...f,ref:e.target.value}))} placeholder="REL-142 or v1.0.0" /></div>
              <div className="form-field"><label>Detail (optional)</label><input value={form.extra} onChange={e => setForm(f=>({...f,extra:e.target.value}))} placeholder="short description" /></div>
              <div className="form-field" style={{ gridColumn:'1/-1', justifyContent:'flex-end', flexDirection:'row', display:'flex', gap:8 }}>
                <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={addManual} disabled={!form.who || !form.what}>Add note</button>
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <div className="form-field full"><label>Linear issue</label>
                <select value={form.issueId} onChange={e => setForm(f=>({...f,issueId:e.target.value}))}>
                  <option value="">Select an issue…</option>
                  {linearIssues.map(i => <option key={i.id} value={i.id}>{i.identifier} — {i.title}</option>)}
                </select>
              </div>
              <div className="form-field full"><label>Comment</label><textarea value={form.comment} onChange={e => setForm(f=>({...f,comment:e.target.value}))} placeholder="Write your comment — it'll post directly to Linear." /></div>
              <div className="form-field" style={{ gridColumn:'1/-1', justifyContent:'flex-end', flexDirection:'row', display:'flex', gap:8 }}>
                <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={postComment} disabled={!form.issueId || !form.comment || posting}>{posting ? 'Posting…' : 'Post to Linear'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <select value={whoFilter} onChange={e => setWhoFilter(e.target.value)}
          style={{ fontFamily:'var(--font-body)', fontSize:12, padding:'5px 10px', borderRadius:'var(--radius-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color: whoFilter==='all' ? 'var(--fg3)' : 'var(--fg1)', cursor:'pointer', outline:'none' }}>
          <option value="all">All people</option>
          {people.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ fontFamily:'var(--font-body)', fontSize:12, padding:'5px 10px', borderRadius:'var(--radius-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color: typeFilter==='all' ? 'var(--fg3)' : 'var(--fg1)', cursor:'pointer', outline:'none' }}>
          <option value="all">All actions</option>
          {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          style={{ fontFamily:'var(--font-body)', fontSize:12, padding:'5px 10px', borderRadius:'var(--radius-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color: sourceFilter==='all' ? 'var(--fg3)' : 'var(--fg1)', cursor:'pointer', outline:'none' }}>
          <option value="all">All sources</option>
          <option value="linear">Linear</option>
          <option value="manual">Manual</option>
        </select>
        {(whoFilter !== 'all' || typeFilter !== 'all' || sourceFilter !== 'all') && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setWhoFilter('all'); setTypeFilter('all'); setSourceFilter('all'); }}>Clear filters</button>
        )}
        <span className="mono" style={{ marginLeft:'auto' }}>{filtered.length} entries</span>
      </div>

      <div className="data-card">
        {loading && <div style={{ padding:'20px', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>Loading from Linear…</div>}
        {!loading && filtered.length === 0 && <div style={{ padding:'32px 20px', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>No activity matches these filters.</div>}
        {shown.map(a => (
          <div key={a.id}>
            {editingId === a.id ? (
              <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--border)', background:'var(--slate-soft)' }}>
                <div className="form-grid" style={{ marginBottom:8 }}>
                  <div className="form-field"><label>Who</label><input value={editForm.who} onChange={e => setEditForm(f=>({...f,who:e.target.value}))} /></div>
                  <div className="form-field"><label>Action</label><input value={editForm.what} onChange={e => setEditForm(f=>({...f,what:e.target.value}))} /></div>
                  <div className="form-field"><label>Ref</label><input value={editForm.ref} onChange={e => setEditForm(f=>({...f,ref:e.target.value}))} /></div>
                  <div className="form-field"><label>Detail</label><input value={editForm.extra} onChange={e => setEditForm(f=>({...f,extra:e.target.value}))} /></div>
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }} onClick={() => deleteEntry(a.id)}>Delete</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                </div>
              </div>
            ) : (
              <div className="feed-row" style={{ gridTemplateColumns:'80px 1fr auto auto', cursor: a.source==='manual' ? 'pointer' : 'default' }}
                onClick={() => a.source === 'manual' && startEdit(a)}>
                <span className="feed-when">{a.when}</span>
                <span>
                  <span className="feed-who">{a.who}</span>{' '}
                  <span style={{ color:'var(--fg2)' }}>{a.what} </span>
                  {a.issueUrl
                    ? <a href={a.issueUrl} target="_blank" rel="noopener noreferrer" className="feed-ref" style={{ textDecoration:'none' }} onClick={e => e.stopPropagation()}>{a.ref}</a>
                    : <span className="feed-ref">{a.ref}</span>
                  }
                  <span style={{ color:'var(--fg2)' }}>{a.extra}</span>
                </span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', color: a.source==='linear' ? 'var(--blue)' : 'var(--fg3)', padding:'2px 6px', borderRadius:3, background: a.source==='linear' ? 'var(--blue-soft)' : 'var(--slate)', whiteSpace:'nowrap' }}>
                  {a.source === 'linear' ? 'Linear' : 'Manual'}
                </span>
                {a.source === 'manual' && <span style={{ color:'var(--fg3)', fontSize:11 }}><Ic n="edit" size={12} /></span>}
              </div>
            )}
          </div>
        ))}
        {filtered.length > 30 && !showAll && (
          <div style={{ padding:'12px 20px', textAlign:'center', borderTop:'1px solid var(--border)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(true)}>Show all {filtered.length} entries</button>
          </div>
        )}
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

  const addReq = () => {
    const prefix = form.type === 'functional' ? 'FR' : 'NFR';
    const count = reqs.filter(r => r.type === form.type).length;
    const ref = `${prefix}-${String(count + 1).padStart(3,'0')}`;
    const newReq = { ref, type: form.type, category: form.category, title: form.title, priority: form.priority, status: 'draft', linear_id: form.linear_id };
    setReqs(rs => [...rs, newReq]);
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

interface UATAttachment { id: string; file_name: string; storage_path: string; url: string; linear_issue_id: string; caption: string; }

function UATTestRow({ t, upd, linearIssues }: {
  t: typeof UAT_SEED[0];
  upd: (id: string, f: string, v: string) => void;
  linearIssues: LinearIssue[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [attachments, setAttachments] = useState<UATAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachLinear, setAttachLinear] = useState('');
  const [caption, setCaption] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const loadAttachments = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('uat_attachments')
      .select('*')
      .eq('uat_test_id', t.id)
      .order('created_at', { ascending: false });
    if (!data) return;
    const withUrls = await Promise.all(data.map(async (a: { id: string; file_name: string; storage_path: string; linear_issue_id: string; caption: string }) => {
      const { data: urlData } = await supabase.storage.from('uat-attachments').createSignedUrl(a.storage_path, 3600);
      return { ...a, url: urlData?.signedUrl ?? '' };
    }));
    setAttachments(withUrls);
  };

  const handleExpand = () => {
    if (!expanded) loadAttachments();
    setExpanded(e => !e);
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${t.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('uat-attachments').upload(path, file);
    if (!error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('uat_attachments').insert({
        uat_test_id: t.id,
        linear_issue_id: attachLinear || null,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption: caption || null,
      });
      setCaption('');
      setAttachLinear('');
      await loadAttachments();
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const deleteAttachment = async (id: string, path: string) => {
    await supabase.storage.from('uat-attachments').remove([path]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('uat_attachments').delete().eq('id', id);
    setAttachments(as => as.filter(a => a.id !== id));
  };

  return (
    <>
      <tr style={{ cursor:'pointer' }} onClick={handleExpand}>
        <td><span className="mono">{t.ref}</span></td>
        <td onClick={e => e.stopPropagation()}>
          <select value={t.platform ?? 'all'} onChange={e => upd(t.id,'platform',e.target.value)}
            style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.06em', background:'transparent', border:'none', cursor:'pointer', padding:0,
              color: t.platform==='ios'?'var(--blue-hover)':t.platform==='android'?'var(--bottle-deep)':t.platform==='web'?'var(--butter-deep)':'var(--fg3)' }}>
            <option value="all">All</option>
            <option value="ios">iPhone</option>
            <option value="android">Android</option>
            <option value="web">Web</option>
          </select>
        </td>
        <td onClick={e => e.stopPropagation()}><EF value={t.version ?? ''} onSave={v => upd(t.id,'version',v)} /></td>
        <td className="fw600"><EF value={t.title} onSave={v => upd(t.id,'title',v)} /></td>
        <td>{t.linear_id ? <span className="mono" style={{ color:'var(--navy)' }}>{t.linear_id}</span> : <span style={{ color:'var(--fg3)', fontSize:12 }}>—</span>}</td>
        <td><EF value={t.tester} onSave={v => upd(t.id,'tester',v)} /></td>
        <td onClick={e => e.stopPropagation()}>
          <select value={t.status} onChange={e => upd(t.id,'status',e.target.value)} style={{ fontFamily:'var(--font-body)', fontSize:11, background:'transparent', border:'none', color:'var(--fg2)', cursor:'pointer', padding:0 }}>
            {['draft','ready','in_progress','passed','failed','blocked'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </td>
        <td><span style={{ fontSize:11, color:'var(--fg3)' }}>{expanded ? '▲' : '▼'} {attachments.length > 0 ? `${attachments.length} img` : 'imgs'}</span></td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding:0, background:'var(--slate-soft)', borderBottom:'1px solid var(--border)' }}>
            <div style={{ padding:'16px 20px' }}>
              {/* Upload area */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--fg3)', marginBottom:8 }}>Upload image</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto auto', gap:8, alignItems:'end' }}>
                  <div className="form-field">
                    <label>Caption (optional)</label>
                    <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. iOS 18 voice drop bug" />
                  </div>
                  <div className="form-field">
                    <label>Link to Linear issue (optional)</label>
                    <select value={attachLinear} onChange={e => setAttachLinear(e.target.value)}>
                      <option value="">None</option>
                      {linearIssues.map(i => <option key={i.id} value={i.identifier}>{i.identifier} — {i.title}</option>)}
                    </select>
                  </div>
                  <label style={{ cursor:'pointer', marginBottom:1 }}>
                    <input ref={fileRef} type="file" accept="image/*,video/mp4" style={{ display:'none' }} onChange={upload} disabled={uploading} />
                    <span className={`btn btn-primary btn-sm${uploading?' disabled':''}`} style={{ display:'inline-flex', alignItems:'center', gap:6, opacity: uploading ? 0.6 : 1 }}>
                      {uploading ? 'Uploading…' : <><Ic n="plus" size={12} />Choose file</>}
                    </span>
                  </label>
                </div>
              </div>

              {/* Image gallery */}
              {attachments.length === 0
                ? <div style={{ fontSize:12, color:'var(--fg3)', fontStyle:'italic' }}>No images yet — upload one above.</div>
                : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10 }}>
                    {attachments.map(a => (
                      <div key={a.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
                        <img src={a.url} alt={a.caption || a.file_name} style={{ width:'100%', height:120, objectFit:'cover', display:'block' }} />
                        <div style={{ padding:'8px 10px' }}>
                          {a.caption && <div style={{ fontSize:11, fontWeight:500, marginBottom:3 }}>{a.caption}</div>}
                          {a.linear_issue_id && <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--navy)', letterSpacing:'0.06em' }}>{a.linear_issue_id}</div>}
                          <div style={{ fontSize:10, color:'var(--fg3)', marginTop:4, display:'flex', justifyContent:'space-between' }}>
                            <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color:'var(--navy)' }}>View</a>
                            <button style={{ background:'none', border:'none', color:'var(--red)', fontSize:10, cursor:'pointer' }} onClick={() => deleteAttachment(a.id, a.storage_path)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function UATView() {
  const [tests, setTests] = useState(UAT_SEED);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title:'', req_ref:'', tester:'', linear_id:'', notes:'', platform:'all', version:'' });
  const [linearIssues, setLinearIssues] = useState<LinearIssue[]>([]);
  const upd = (id: string, f: string, v: string) => setTests(ts => ts.map(t => t.id === id ? {...t, [f]: v} : t));

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_LINEAR_API_KEY;
    if (!key) return;
    fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': key },
      body: JSON.stringify({ query: `query { issues(first: 100) { nodes { id identifier title state { name type } priority team { name } labels { nodes { name color } } url assignee { name displayName } } } }` }),
    }).then(r => r.json()).then((d: { data?: { issues?: { nodes: LinearIssue[] } } }) => setLinearIssues(d.data?.issues?.nodes ?? []));
  }, []);

  const addTest = () => {
    const nextRef = `UAT-${String(tests.length + 1).padStart(3,'0')}`;
    setTests(ts => [...ts, { id: String(Date.now()), ref: nextRef, status: 'draft', date: new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'}), ...form }]);
    setForm({ title:'', req_ref:'', tester:'', linear_id:'', notes:'', platform:'all', version:'' });
    setAdding(false);
  };

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
            <div className="form-field"><label>Platform</label>
              <select value={form.platform} onChange={e => setForm(f => ({...f, platform: e.target.value}))}>
                <option value="all">All platforms</option>
                <option value="ios">iPhone (iOS)</option>
                <option value="android">Android</option>
                <option value="web">Web</option>
              </select>
            </div>
            <div className="form-field"><label>Release version</label><input value={form.version} onChange={e => setForm(f => ({...f, version: e.target.value}))} placeholder="v0.9.0" /></div>
            <div className="form-field"><label>Requirement ref</label><select value={form.req_ref} onChange={e => setForm(f => ({...f, req_ref: e.target.value}))}><option value="">None</option>{REQS_SEED.map(r => <option key={r.ref} value={r.ref}>{r.ref} — {r.title}</option>)}</select></div>
            <div className="form-field"><label>Linear issue</label><select value={form.linear_id} onChange={e => setForm(f => ({...f, linear_id: e.target.value}))}><option value="">None</option>{linearIssues.map(i => <option key={i.id} value={i.identifier}>{i.identifier} — {i.title}</option>)}</select></div>
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
        {tests.length === 0 && !adding && <div style={{ padding:'32px 20px', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>No UAT tests yet. Add your first above.</div>}
        {tests.length > 0 && (
          <table className="data-table">
            <thead><tr><th>Ref</th><th>Platform</th><th>Version</th><th>Test</th><th>Linear</th><th>Tester</th><th>Status</th><th>Images</th></tr></thead>
            <tbody>
              {tests.map(t => <UATTestRow key={t.id} t={t} upd={upd} linearIssues={linearIssues} />)}
            </tbody>
          </table>
        )}
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

// ── Display settings ──────────────────────────────────────────────────────
interface DisplaySettings { theme: 'light'|'dark'; density: 'cosy'|'compact'; nav: 'side'|'top'; }
const DISPLAY_DEFAULTS: DisplaySettings = { theme: 'light', density: 'cosy', nav: 'top' };

// ── Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [route, setRoute] = useState<Route>({ hub: '', section: '' });
  const [settings, setSettings] = useState<DisplaySettings>(DISPLAY_DEFAULTS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('relia-display');
    if (saved) { try { setSettings(JSON.parse(saved)); } catch {} }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.body.classList.toggle('theme-dark', settings.theme === 'dark');
    document.body.classList.toggle('density-compact', settings.density === 'compact');
  }, [settings, hydrated]);

  const updateSetting = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem('relia-display', JSON.stringify(next));
  };

  useEffect(() => {
    const handle = () => { setRoute(parseRoute(window.location.hash)); window.scrollTo(0,0); };
    window.addEventListener('hashchange', handle);
    handle();
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  const hub = route.hub as keyof typeof HUBS | '';
  const isLanding = !hub || !HUBS[hub as keyof typeof HUBS];
  const hubDef = hub && HUBS[hub as keyof typeof HUBS] ? HUBS[hub as keyof typeof HUBS] : null;
  const navTop = settings.nav === 'top';

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
        <button
          onClick={() => setSettingsOpen(o => !o)}
          style={{ background: settingsOpen ? 'rgba(255,255,255,0.12)' : 'transparent', border:'none', borderRadius:6, padding:'5px 8px', color:'rgba(255,255,255,0.6)', cursor:'pointer', display:'flex', alignItems:'center', marginRight:8 }}
          title="Display settings"
        >
          <Ic n="settings" size={15} />
        </button>
        <div className="nav-avatar">A</div>
      </nav>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="settings-panel">
          <h4>Display <em>settings</em></h4>
          <div className="tw-row">
            <span className="lab">Theme</span>
            <div className="seg">
              <button className={settings.theme==='light'?'on':''} onClick={() => updateSetting('theme','light')}>Light</button>
              <button className={settings.theme==='dark'?'on':''} onClick={() => updateSetting('theme','dark')}>Dark</button>
            </div>
          </div>
          <div className="tw-row">
            <span className="lab">Density</span>
            <div className="seg">
              <button className={settings.density==='cosy'?'on':''} onClick={() => updateSetting('density','cosy')}>Cosy</button>
              <button className={settings.density==='compact'?'on':''} onClick={() => updateSetting('density','compact')}>Compact</button>
            </div>
          </div>
          <div className="tw-row">
            <span className="lab">Navigation</span>
            <div className="seg">
              <button className={settings.nav==='top'?'on':''} onClick={() => updateSetting('nav','top')}>Top</button>
              <button className={settings.nav==='side'?'on':''} onClick={() => updateSetting('nav','side')}>Side</button>
            </div>
          </div>
        </div>
      )}

      {/* Shell */}
      <div className="hub-shell">
        {!isLanding && hubDef && !navTop && <HubSidebar hub={hub as keyof typeof HUBS} route={route} />}
        {!isLanding && hubDef && navTop && (
          <div style={{ position:'fixed', top:'var(--nav-h)', left:0, right:0, background:'var(--bg-card)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 24px', height:40, gap:4, zIndex:40, overflowX:'auto' }}>
            {hubDef.sections.flatMap(g => g.items).map(item => (
              <button key={item.id} onClick={() => navigate(hub, item.id)}
                style={{ fontFamily:'var(--font-body)', fontSize:12, padding:'4px 10px', borderRadius:4, border:'none', background: route.section===item.id ? 'var(--navy-deep)' : 'transparent', color: route.section===item.id ? '#fff' : 'var(--fg3)', cursor:'pointer', whiteSpace:'nowrap' }}>
                {item.label}
              </button>
            ))}
          </div>
        )}
        <div className={`hub-content${isLanding || navTop ? ' no-sidebar' : ''}`} style={ navTop ? { paddingTop:40 } : {} }>
          {renderContent()}
        </div>
      </div>

      <div className="stamp-wm"><span className="r">R</span></div>
    </>
  );
}
