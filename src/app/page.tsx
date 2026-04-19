'use client';
import { useState, useEffect, useRef, createContext, useContext, useMemo } from 'react';
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
    desc: 'In-flight issues, user stories, requirements, UAT, and activity log.',
    sections: [
      { group: 'Overview', items: [{ id: '', label: 'Overview' }] },
      { group: 'Work', items: [
        { id: 'inflight',    label: 'In flight' },
        { id: 'activity',   label: 'Activity' },
      ]},
      { group: 'Product', items: [
        { id: 'stories',      label: 'User stories' },
        { id: 'requirements', label: 'Requirements' },
      ]},
      { group: 'Quality', items: [
        { id: 'uat', label: 'UAT' },
      ]},
    ],
    overviewCards: [
      { n: '01', id: 'inflight',     title: 'In flight',      desc: 'Live Linear issues — list and activity views.' },
      { n: '02', id: 'stories',      title: 'User stories',   desc: 'As a tradie, I want to… — BDD stories linked to Linear and requirements.' },
      { n: '03', id: 'requirements', title: 'Requirements',   desc: 'FR/NFR with MoSCoW priority, platform, developer, and story link.' },
      { n: '04', id: 'uat',          title: 'UAT',            desc: 'User acceptance tests with image uploads and Linear linking.' },
      { n: '05', id: 'activity',     title: 'Activity',       desc: 'Everything that happened across the team.' },
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
const REQS_SEED: Req[] = [
  // ── MVP 1 · Functional ──────────────────────────────────────────────────
  { ref:'FR-001', phase:'MVP 1', type:'functional', category:'Voice',        priority:'must_have',   status:'implemented', linear_id:'REL-5',   developer:'jon',   platform:'ios',     user_story:'US-001', title:'Integrate iOS Speech Framework for voice capture' },
  { ref:'FR-002', phase:'MVP 1', type:'functional', category:'Voice',        priority:'must_have',   status:'implemented', linear_id:'REL-6',   developer:'jon',   platform:'ios',     user_story:'US-001', title:'Real-time streaming transcription UI' },
  { ref:'FR-003', phase:'MVP 1', type:'functional', category:'Voice',        priority:'must_have',   status:'implemented', linear_id:'REL-8',   developer:'jon',   platform:'ios',     user_story:'US-001', title:'Editable transcript after voice recording' },
  { ref:'FR-004', phase:'MVP 1', type:'functional', category:'Voice',        priority:'must_have',   status:'implemented', linear_id:'REL-9',   developer:'jon',   platform:'ios',     user_story:'US-001', title:'Mic permissions request and error states' },
  { ref:'FR-005', phase:'MVP 1', type:'functional', category:'Voice',        priority:'must_have',   status:'implemented', linear_id:'REL-88',  developer:'jon',   platform:'ios',     user_story:'US-002', title:'Voice-to-text using native iOS AI' },
  { ref:'FR-006', phase:'MVP 1', type:'functional', category:'AI',           priority:'must_have',   status:'implemented', linear_id:'REL-99',  developer:'jon',   platform:'backend', user_story:'US-003', title:'OpenAI AI implementation for material extraction' },
  { ref:'FR-007', phase:'MVP 1', type:'functional', category:'AI',           priority:'must_have',   status:'implemented', linear_id:'REL-12',  developer:'jon',   platform:'backend', user_story:'US-003', title:'Job templates table and seed data for AI context' },
  { ref:'FR-008', phase:'MVP 1', type:'functional', category:'AI',           priority:'must_have',   status:'implemented', linear_id:'REL-78',  developer:'jon',   platform:'ios',     user_story:'US-004', title:'Confidence scoring UI — flag low-confidence materials' },
  { ref:'FR-009', phase:'MVP 1', type:'functional', category:'AI',           priority:'must_have',   status:'implemented', linear_id:'REL-106', developer:'jon',   platform:'backend', user_story:'US-004', title:'AI extraction feedback capture (correction_events)' },
  { ref:'FR-010', phase:'MVP 1', type:'functional', category:'AI',           priority:'must_have',   status:'implemented', linear_id:'REL-105', developer:'jon',   platform:'ios',     user_story:'US-003', title:'End-to-end: voice → materials → cost → PDF → DB' },
  { ref:'FR-011', phase:'MVP 1', type:'functional', category:'Pricing',      priority:'must_have',   status:'implemented', linear_id:'REL-109', developer:'jon',   platform:'ios',     user_story:'US-006', title:'Manual price entry for unpriced materials' },
  { ref:'FR-012', phase:'MVP 1', type:'functional', category:'Pricing',      priority:'must_have',   status:'implemented', linear_id:'REL-80',  developer:'jon',   platform:'ios',     user_story:'US-005', title:'MaterialPricingProvider abstraction + BunningsPricingProvider' },
  { ref:'FR-013', phase:'MVP 1', type:'functional', category:'Quoting',      priority:'must_have',   status:'implemented', linear_id:'REL-103', developer:'jon',   platform:'ios',     user_story:'US-003', title:'Capture labour as explicit step before Cost Summary' },
  { ref:'FR-014', phase:'MVP 1', type:'functional', category:'Quoting',      priority:'must_have',   status:'implemented', linear_id:'REL-69',  developer:'jon',   platform:'ios',     user_story:'US-035', title:'GST calculation (registered and non-registered tradies)' },
  { ref:'FR-015', phase:'MVP 1', type:'functional', category:'Quoting',      priority:'must_have',   status:'implemented', linear_id:'REL-67',  developer:'jon',   platform:'ios',     user_story:'US-007', title:'Document type selector: Quote vs Estimate + PDF labelling' },
  { ref:'FR-016', phase:'MVP 1', type:'functional', category:'Quoting',      priority:'must_have',   status:'implemented', linear_id:'REL-114', developer:'jon',   platform:'ios',     user_story:'US-007', title:'Real PDF generation — single source of truth' },
  { ref:'FR-017', phase:'MVP 1', type:'functional', category:'Estimates',    priority:'must_have',   status:'implemented', linear_id:'REL-65',  developer:'jon',   platform:'ios',     user_story:'US-009', title:'Home screen estimate list backed by Supabase CRUD' },
  { ref:'FR-018', phase:'MVP 1', type:'functional', category:'Estimates',    priority:'must_have',   status:'implemented', linear_id:'REL-107', developer:'jon',   platform:'ios',     user_story:'US-009', title:'View saved estimate from Home Screen (PDF preview mode)' },
  { ref:'FR-019', phase:'MVP 1', type:'functional', category:'Profile',      priority:'must_have',   status:'implemented', linear_id:'REL-81',  developer:'jon',   platform:'ios',     user_story:'US-014', title:'Trade selection + business details Phase 1 onboarding' },
  { ref:'FR-020', phase:'MVP 1', type:'functional', category:'Profile',      priority:'must_have',   status:'implemented', linear_id:'REL-64',  developer:'jon',   platform:'ios',     user_story:'US-014', title:'Business profile backed by Supabase profiles table' },
  { ref:'FR-021', phase:'MVP 1', type:'functional', category:'Profile',      priority:'must_have',   status:'implemented', linear_id:'REL-108', developer:'jon',   platform:'ios',     user_story:'US-014', title:'Edit trades from Settings (TradesPicker + TradesEditScreen)' },
  { ref:'FR-022', phase:'MVP 1', type:'functional', category:'Auth',         priority:'must_have',   status:'implemented', linear_id:'REL-63',  developer:'jon',   platform:'ios',     user_story:'US-011', title:'Apple Sign-In + Supabase Auth integration' },
  { ref:'FR-023', phase:'MVP 1', type:'functional', category:'Auth',         priority:'must_have',   status:'approved',    linear_id:'REL-86',  developer:'jon',   platform:'ios',     user_story:'US-011', title:'Account deletion flow (App Store requirement)' },
  { ref:'FR-024', phase:'MVP 1', type:'functional', category:'Infrastructure',priority:'must_have',  status:'implemented', linear_id:'REL-60',  developer:'jon',   platform:'backend', user_story:'',       title:'estimates table with outcome-tracking schema + RLS' },
  { ref:'FR-025', phase:'MVP 1', type:'functional', category:'Infrastructure',priority:'must_have',  status:'implemented', linear_id:'REL-59',  developer:'jon',   platform:'backend', user_story:'',       title:'profiles table + Row Level Security policy' },
  { ref:'FR-026', phase:'MVP 1', type:'functional', category:'Infrastructure',priority:'must_have',  status:'implemented', linear_id:'REL-58',  developer:'jon',   platform:'backend', user_story:'',       title:'Edge Functions runtime bootstrap and environment secrets' },
  // ── MVP 2 · Functional ──────────────────────────────────────────────────
  { ref:'FR-027', phase:'MVP 2', type:'functional', category:'Sharing',      priority:'must_have',   status:'approved',    linear_id:'REL-115', developer:'jon',   platform:'ios',     user_story:'US-016', title:'Share token + customer web page (Cloudflare Pages + Supabase API)' },
  { ref:'FR-028', phase:'MVP 2', type:'functional', category:'Sharing',      priority:'must_have',   status:'approved',    linear_id:'REL-116', developer:'jon',   platform:'web',     user_story:'US-017', title:'Customer accept/decline on web quote page + tradie email notification' },
  { ref:'FR-029', phase:'MVP 2', type:'functional', category:'Estimates',    priority:'should_have', status:'approved',    linear_id:'REL-117', developer:'jon',   platform:'ios',     user_story:'US-012', title:'Estimate lifecycle status UI + manual transitions' },
  { ref:'FR-030', phase:'MVP 2', type:'functional', category:'Location',     priority:'should_have', status:'approved',    linear_id:'REL-113', developer:'jon',   platform:'ios',     user_story:'US-012', title:'Capture location as part of every estimation/quotation' },
  { ref:'FR-031', phase:'MVP 2', type:'functional', category:'Photos',       priority:'should_have', status:'approved',    linear_id:'REL-71',  developer:'jon',   platform:'ios',     user_story:'US-008', title:'Photo capture UI in estimate flow' },
  { ref:'FR-032', phase:'MVP 2', type:'functional', category:'Photos',       priority:'should_have', status:'draft',       linear_id:'REL-72',  developer:'jon',   platform:'backend', user_story:'US-008', title:'Supabase Storage bucket + RLS for photos' },
  { ref:'FR-033', phase:'MVP 2', type:'functional', category:'Photos',       priority:'should_have', status:'draft',       linear_id:'REL-75',  developer:'jon',   platform:'ios',     user_story:'US-008', title:'Embed photos in generated PDF' },
  { ref:'FR-034', phase:'MVP 2', type:'functional', category:'Analytics',    priority:'must_have',   status:'approved',    linear_id:'REL-50',  developer:'nhung', platform:'all',     user_story:'US-027', title:'Analytics integration — PostHog' },
  { ref:'FR-035', phase:'MVP 2', type:'functional', category:'Pricing',      priority:'should_have', status:'approved',    linear_id:'REL-121', developer:'jon',   platform:'backend', user_story:'US-005', title:'Build Bunnings-Scraper material provider' },
  { ref:'FR-036', phase:'MVP 2', type:'functional', category:'Pricing',      priority:'should_have', status:'approved',    linear_id:'REL-98',  developer:'jon',   platform:'backend', user_story:'US-005', title:'MaterialPricingProvider — getOffer(sku) + checkAvailability(sku)' },
  { ref:'FR-037', phase:'MVP 2', type:'functional', category:'App Store',    priority:'must_have',   status:'in_progress', linear_id:'REL-31',  developer:'nhung', platform:'ios',     user_story:'US-018', title:'Apple Developer account (company enrollment + D-U-N-S)' },
  { ref:'FR-038', phase:'MVP 2', type:'functional', category:'App Store',    priority:'must_have',   status:'approved',    linear_id:'REL-32',  developer:'nhung', platform:'ios',     user_story:'US-018', title:'App Store Connect — create app listing' },
  { ref:'FR-039', phase:'MVP 2', type:'functional', category:'App Store',    priority:'must_have',   status:'draft',       linear_id:'REL-37',  developer:'nhung', platform:'ios',     user_story:'US-018', title:'App name, subtitle, description & keywords' },
  { ref:'FR-040', phase:'MVP 2', type:'functional', category:'App Store',    priority:'must_have',   status:'draft',       linear_id:'REL-38',  developer:'nhung', platform:'ios',     user_story:'US-018', title:'App Store screenshots (6.7" and 6.1")' },
  { ref:'FR-041', phase:'MVP 2', type:'functional', category:'Legal',        priority:'must_have',   status:'in_progress', linear_id:'REL-77',  developer:'nhung', platform:'all',     user_story:'US-013', title:'Privacy policy + T&Cs language — legal review' },
  { ref:'FR-042', phase:'MVP 2', type:'functional', category:'Legal',        priority:'must_have',   status:'approved',    linear_id:'REL-34',  developer:'nhung', platform:'web',     user_story:'US-013', title:'Privacy policy URL live at reliaplatform.io/privacy' },
  { ref:'FR-043', phase:'MVP 2', type:'functional', category:'Legal',        priority:'must_have',   status:'approved',    linear_id:'REL-35',  developer:'nhung', platform:'web',     user_story:'US-013', title:'Terms of service URL live at reliaplatform.io/terms' },
  { ref:'FR-044', phase:'MVP 2', type:'functional', category:'Landing',      priority:'must_have',   status:'in_progress', linear_id:'REL-44',  developer:'nhung', platform:'web',     user_story:'US-015', title:'Wire up landing page waitlist form to Supabase' },
  { ref:'FR-045', phase:'MVP 2', type:'functional', category:'Landing',      priority:'must_have',   status:'in_progress', linear_id:'REL-119', developer:'nhung', platform:'web',     user_story:'US-015', title:'Finalise MVP1 landing page' },
  // ── MVP 3+ · Functional ─────────────────────────────────────────────────
  { ref:'FR-046', phase:'MVP 3+', type:'functional', category:'Follow-up',   priority:'must_have',   status:'draft',       linear_id:'',        developer:'',      platform:'backend', user_story:'US-018', title:'Automated chase emails at day 2 and day 5 post-quote' },
  { ref:'FR-047', phase:'MVP 3+', type:'functional', category:'Subscription',priority:'must_have',   status:'draft',       linear_id:'REL-24',  developer:'',      platform:'ios',     user_story:'US-022', title:'RevenueCat integration + paywall' },
  { ref:'FR-048', phase:'MVP 3+', type:'functional', category:'Invoicing',   priority:'should_have', status:'draft',       linear_id:'',        developer:'',      platform:'ios',     user_story:'US-023', title:'Convert accepted quote to invoice' },
  { ref:'FR-049', phase:'MVP 3+', type:'functional', category:'Platform',    priority:'could_have',  status:'draft',       linear_id:'REL-30',  developer:'',      platform:'web',     user_story:'US-031', title:'Web app deployment (Flutter web build)' },
  // ── MVP 1 · Non-Functional ──────────────────────────────────────────────
  { ref:'NFR-001', phase:'MVP 1', type:'non_functional', category:'Performance', priority:'must_have',  status:'implemented', linear_id:'', developer:'jon',   platform:'ios',     user_story:'', title:'App loads in under 2 seconds on 4G' },
  { ref:'NFR-002', phase:'MVP 1', type:'non_functional', category:'Performance', priority:'must_have',  status:'implemented', linear_id:'', developer:'jon',   platform:'ios',     user_story:'', title:'Voice capture works offline — no network required' },
  { ref:'NFR-003', phase:'MVP 1', type:'non_functional', category:'Performance', priority:'must_have',  status:'approved',    linear_id:'', developer:'jon',   platform:'ios',     user_story:'', title:'PDF generation completes in under 5 seconds' },
  { ref:'NFR-004', phase:'MVP 1', type:'non_functional', category:'Security',    priority:'must_have',  status:'implemented', linear_id:'', developer:'jon',   platform:'backend', user_story:'', title:'All data encrypted at rest and in transit (Supabase)' },
  { ref:'NFR-005', phase:'MVP 1', type:'non_functional', category:'Security',    priority:'must_have',  status:'implemented', linear_id:'', developer:'jon',   platform:'backend', user_story:'', title:'Row Level Security enforced on all Supabase tables' },
  { ref:'NFR-006', phase:'MVP 1', type:'non_functional', category:'Compliance',  priority:'must_have',  status:'approved',    linear_id:'', developer:'nhung', platform:'ios',     user_story:'', title:'App Store Review Guidelines compliance' },
  { ref:'NFR-007', phase:'MVP 1', type:'non_functional', category:'Compliance',  priority:'must_have',  status:'approved',    linear_id:'REL-89', developer:'jon', platform:'backend', user_story:'', title:'PII redacted from transcripts before AI processing' },
  { ref:'NFR-008', phase:'MVP 1', type:'non_functional', category:'AI',          priority:'must_have',  status:'approved',    linear_id:'', developer:'jon',   platform:'backend', user_story:'', title:'End-to-end voice→materials latency under 15 seconds' },
  // ── MVP 2+ · Non-Functional ─────────────────────────────────────────────
  { ref:'NFR-009', phase:'MVP 2', type:'non_functional', category:'Performance', priority:'should_have', status:'draft',      linear_id:'', developer:'',      platform:'web',     user_story:'', title:'Customer web quote page loads in under 3 seconds' },
  { ref:'NFR-010', phase:'MVP 2', type:'non_functional', category:'Availability',priority:'should_have', status:'draft',      linear_id:'', developer:'',      platform:'backend', user_story:'', title:'99.5% uptime SLA on Supabase + Cloudflare Workers' },
  { ref:'NFR-011', phase:'MVP 2', type:'non_functional', category:'AI',          priority:'should_have', status:'draft',      linear_id:'', developer:'jon',   platform:'backend', user_story:'', title:'AI extraction accuracy >90% on common trade jobs' },
  { ref:'NFR-012', phase:'MVP 3+', type:'non_functional', category:'Compliance', priority:'could_have',  status:'draft',      linear_id:'', developer:'',      platform:'all',     user_story:'', title:'WCAG 2.1 AA accessibility on all web surfaces' },
];

// UAT_SEED removed — data now lives in uat_tests table (see migration 20260419040000_uat_seed.sql)

// ── Pill component ────────────────────────────────────────────────────────
const STATUS_MAP: Record<string,string> = { todo:'p-todo', prog:'p-prog', review:'p-review', done:'p-done', block:'p-block', draft:'p-draft', active:'p-active', prospect:'p-prospect', passed:'p-passed', failed:'p-failed', in_progress:'p-prog', must_have:'p-must', should_have:'p-should', could_have:'p-could', wont_have:'p-wont', implemented:'p-done', approved:'p-review', closed_won:'p-done', trial:'p-review', qualified:'p-prog' };
const STATUS_LABEL: Record<string,string> = { todo:'To do', prog:'In progress', review:'In review', done:'Done', block:'Blocked', draft:'Draft', active:'Active', prospect:'Prospect', passed:'Passed', failed:'Failed', in_progress:'In progress', must_have:'Must', should_have:'Should', could_have:'Could', wont_have:'Won\'t', implemented:'Live', approved:'Approved', closed_won:'Won', trial:'Trial', qualified:'Qualified' };
function Pill({ s, label }: { s: string; label?: string }) {
  return <span className={`pill ${STATUS_MAP[s] ?? 'p-draft'}`}><span className="dot" />{label ?? STATUS_LABEL[s] ?? s}</span>;
}

// ── Linear sync to Supabase ───────────────────────────────────────────────
interface StoredIssue { id: string; linear_id: string; identifier: string; title: string; status: string; priority: number; project: string | null; labels: string[]; linear_url: string; synced_at: string; updated_at: string; }

async function syncLinearToSupabase(apiKey: string, forceFullSync = false): Promise<{ count: number; error?: string }> {
  const supabase = createClient();

  // Find most recent sync time for incremental update
  let since = new Date(0).toISOString();
  if (!forceFullSync) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('linear_issues').select('synced_at').order('synced_at', { ascending: false }).limit(1);
    if (data?.[0]?.synced_at) since = data[0].synced_at;
  }

  const filter = forceFullSync ? '' : `, filter: { updatedAt: { gte: "${since}" } }`;
  const query = `{ issues(first: 250, orderBy: updatedAt${filter}) { nodes { id identifier title description state { name type } priority assignee { displayName } team { name } labels { nodes { name } } url updatedAt } } }`;

  try {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
      body: JSON.stringify({ query }),
    });
    const json = await res.json() as { data?: { issues?: { nodes: Array<{ id: string; identifier: string; title: string; description: string; state: { name: string; type: string }; priority: number; assignee: { displayName: string } | null; team: { name: string } | null; labels: { nodes: { name: string }[] }; url: string; updatedAt: string }> } } };
    const issues = json.data?.issues?.nodes ?? [];
    const now = new Date().toISOString();

    for (const i of issues) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('linear_issues').upsert({
        linear_id:  i.id,
        identifier: i.identifier,
        title:      i.title,
        description: i.description ?? null,
        status:     i.state.type === 'completed' ? 'done' : i.state.type === 'cancelled' ? 'cancelled' : i.state.type === 'started' ? 'in_progress' : i.state.type === 'backlog' ? 'backlog' : 'todo',
        priority:   i.priority,
        project:    i.team?.name ?? null,
        labels:     i.labels.nodes.map((l: { name: string }) => l.name),
        linear_url: i.url,
        synced_at:  now,
        updated_at: i.updatedAt,
      }, { onConflict: 'linear_id' });
    }
    return { count: issues.length };
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : 'Sync failed' };
  }
}

async function loadLinearFromSupabase(): Promise<StoredIssue[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('linear_issues').select('*').order('identifier', { ascending: false });
  return (data ?? []).sort((a: StoredIssue, b: StoredIssue) => {
    const na = parseInt(a.identifier.replace('REL-',''));
    const nb = parseInt(b.identifier.replace('REL-',''));
    return nb - na;
  });
}

// ── Linear issue search ───────────────────────────────────────────────────
function LinearSearch({ value, onChange, issues, placeholder = 'Search issues…' }: {
  value: string;
  onChange: (id: string, identifier: string) => void;
  issues: Array<{ id: string; identifier: string; title: string }>;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? issues.filter(i => `${i.identifier} ${i.title}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : issues.slice(0, 8);

  const clear = () => { setQuery(''); onChange('', ''); setOpen(false); };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:0 }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ fontFamily:'var(--font-body)', fontSize:13, color:'var(--fg1)', background:'var(--bg-page)', border:'1px solid var(--border)', borderRadius: value ? '4px 0 0 4px' : 4, padding:'7px 10px', outline:'none', width:'100%', transition:'border-color 0.1s' }}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery(value); } }}
        />
        {(query || value) && (
          <button onClick={clear} style={{ border:'1px solid var(--border)', borderLeft:'none', borderRadius:'0 4px 4px 0', background:'var(--bg-page)', color:'var(--fg3)', padding:'7px 8px', cursor:'pointer', fontSize:12 }}>✕</button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:6, boxShadow:'var(--shadow-lg)', zIndex:200, marginTop:2, maxHeight:260, overflowY:'auto' }}>
          {filtered.map(i => (
            <div key={i.id}
              style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'baseline' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onMouseDown={e => { e.preventDefault(); onChange(i.id, i.identifier); setQuery(`${i.identifier} — ${i.title}`); setOpen(false); }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--navy)', letterSpacing:'0.06em', flexShrink:0 }}>{i.identifier}</span>
              <span style={{ fontSize:13, color:'var(--fg1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{i.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
const NOTE_TYPES = ['standup','decision','planning','retro','feature request','bug','other'];

function NotesView() {
  const [notes, setNotes] = useState(NOTES_DATA);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title:'', type:'standup', body:'', tags:'' });
  const upd = (id: string, f: string, v: string) => setNotes(ns => ns.map(n => n.id === id ? {...n, [f]: v} : n));
  const del = (id: string) => setNotes(ns => ns.filter(n => n.id !== id));

  const add = () => {
    const today = new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'}).toUpperCase();
    setNotes(ns => [{ id: String(Date.now()), date: today, title: form.title, type: form.type, body: form.body, tags: form.tags ? form.tags.split(',').map(t=>t.trim()).filter(Boolean) : [form.type] }, ...ns]);
    setForm({ title:'', type:'standup', body:'', tags:'' });
    setAdding(false);
  };

  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>#II</span><span className="sep">·</span><b>Ops</b><span className="sep">·</span><b>Notes & decisions</b></div>
      <div className="section-head">
        <h2>Notes <em>&amp; decisions</em></h2>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)}><Ic n="plus" />{adding?'Cancel':'Add note'}</button>
      </div>

      {adding && (
        <div className="uat-form" style={{ marginBottom:16 }}>
          <div className="form-grid">
            <div className="form-field"><label>Title</label><input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Standup — Mon, Pricing decision…" /></div>
            <div className="form-field"><label>Type</label>
              <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                {NOTE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-field full"><label>Content</label><textarea value={form.body} onChange={e => setForm(f=>({...f,body:e.target.value}))} placeholder="What was discussed, decided, or requested?" /></div>
            <div className="form-field full"><label>Tags (comma separated, optional)</label><input value={form.tags} onChange={e => setForm(f=>({...f,tags:e.target.value}))} placeholder="weekly, ios, pricing" /></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={add} disabled={!form.title}>Add note</button>
          </div>
        </div>
      )}

      {notes.length === 0 && !adding && <div style={{ padding:'40px 0', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>No notes yet. Add your first above.</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 }}>
        {notes.map(n => (
          <div key={n.id} className="data-card" style={{ padding:'18px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <EF value={n.title} onSave={v => upd(n.id,'title',v)} className="fw600" />
              <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0, marginLeft:8 }}>
                <span className="mono">{n.date}</span>
                <button onClick={() => del(n.id)} style={{ background:'none', border:'none', color:'var(--fg3)', cursor:'pointer', fontSize:12, padding:0 }} title="Delete">✕</button>
              </div>
            </div>
            <EF value={n.body} onSave={v => upd(n.id,'body',v)} multi className="mt8" />
            <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
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

// ── Dev dashboard ─────────────────────────────────────────────────────────
function DevDashboard() {
  const { stories, reqs, tests } = useAppData();
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [urgentIssues, setUrgentIssues] = useState<StoredIssue[]>([]);
  const [tab, setTab] = useState<'overview'|'timeline'>('overview');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_LINEAR_API_KEY ?? '';
    if (!key) return;
    fetch('https://api.linear.app/graphql', { method:'POST', headers:{'Content-Type':'application/json','Authorization':key},
      body: JSON.stringify({ query:`{ cycles(first:10, orderBy:updatedAt) { nodes { id name number startsAt endsAt completedAt progress issues { nodes { id identifier title state { name type } priority assignee { name displayName } team { name } labels { nodes { name color } } url } } } } }` }) })
      .then(r=>r.json()).then((d:{data?:{cycles?:{nodes:LinearCycle[]}}}) => {
        const sorted = [...(d.data?.cycles?.nodes??[])].sort((a,b)=>b.number-a.number);
        setCycles(sorted);
        // Default to the cycle containing today's date (current cycle by time)
        const now = Date.now();
        const current = sorted.find(c => !c.completedAt && new Date(c.startsAt).getTime() <= now && new Date(c.endsAt).getTime() >= now);
        const fallback = sorted.find(c => !c.completedAt) ?? sorted[0];
        const chosen = current ?? fallback;
        if (chosen) setSelectedCycleId(chosen.id);
      });
    // Urgent issues from Supabase cache, fallback populated after cycles load
    loadLinearFromSupabase().then(all => { if (all.length > 0) setUrgentIssues(all.filter(i => i.priority <= 2 && i.status !== 'done' && i.status !== 'cancelled')); });
  }, []);

  // Stats
  const mvp1 = stories.filter(s => s.mvp === 'MVP 1');
  const mvp1Done = mvp1.filter(s => s.status === 'done').length;
  const uatPassed = tests.filter(t => t.status === 'passed').length;
  const uatFailed = tests.filter(t => t.status === 'failed').length;
  const totalTests = tests.length;
  const reqsApproved = reqs.filter(r => r.status === 'implemented' || r.status === 'approved').length;
  const activeCycle = cycles.find(c => !c.completedAt);
  const selectedCycle = cycles.find(c => c.id === selectedCycleId) ?? activeCycle;

  // Derive urgent issues from all cycle issues if Supabase cache is empty
  const urgentFromCycles = cycles
    .flatMap(c => c.issues.nodes)
    .filter(i => i.priority <= 2 && i.state.type !== 'completed' && i.state.type !== 'cancelled')
    .filter((i, idx, arr) => arr.findIndex(x => x.id === i.id) === idx) // dedupe
    .sort((a, b) => a.priority - b.priority);

  const urgentDisplay = urgentIssues.length > 0
    ? urgentIssues
    : urgentFromCycles.map(i => ({ id: i.id, linear_id: i.id, identifier: i.identifier, title: i.title, priority: i.priority, status: i.state.type, project: i.team?.name ?? null, labels: i.labels.nodes.map((l: { name: string }) => l.name), linear_url: i.url, synced_at:'', updated_at:'' } satisfies StoredIssue));
  const urgentCount = (urgentIssues.length > 0 ? urgentIssues : urgentFromCycles).filter(i => i.priority === 1).length;

  // Timeline helpers
  const cyclesWithDates = cycles.filter(c => c.startsAt && c.endsAt);
  const timelineStart = cyclesWithDates.length ? new Date(Math.min(...cyclesWithDates.map(c => new Date(c.startsAt).getTime()))) : new Date();
  const timelineEnd   = cyclesWithDates.length ? new Date(Math.max(...cyclesWithDates.map(c => new Date(c.endsAt).getTime()))) : new Date();
  const totalMs = Math.max(timelineEnd.getTime() - timelineStart.getTime(), 1);

  // Generate month headers
  const months: Date[] = [];
  if (cyclesWithDates.length) {
    const cur = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
    while (cur <= timelineEnd) { months.push(new Date(cur)); cur.setMonth(cur.getMonth()+1); }
  }

  const barLeft  = (iso: string) => Math.max(0, ((new Date(iso).getTime() - timelineStart.getTime()) / totalMs) * 100);
  const barWidth = (start: string, end: string) => Math.min(100 - barLeft(start), ((new Date(end).getTime() - new Date(start).getTime()) / totalMs) * 100);
  const cycleColor = (c: LinearCycle) => c.completedAt ? 'var(--slate-deep)' : !c.completedAt && new Date(c.endsAt) > new Date() ? 'var(--navy)' : 'var(--navy-soft)';

  const failedTests = tests.filter(t => t.status === 'failed');
  const blockedIssues = urgentIssues.filter(i => i.status === 'cancelled' || i.priority === 1);

  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>Dev</span><span className="sep">·</span><b>Dashboard</b></div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 className="page-heading">Dev <em>overview</em></h1>
          <p style={{ fontSize:13, color:'var(--fg3)', marginTop:4 }}>MVP 1 progress, active cycle, and things that need attention.</p>
        </div>
        <div className="tab-bar" style={{ marginBottom:0 }}>
          <button className={`tab-btn${tab==='overview'?' active':''}`} onClick={()=>setTab('overview')}>Overview</button>
          <button className={`tab-btn${tab==='timeline'?' active':''}`} onClick={()=>setTab('timeline')}>Timeline</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="stat-row" style={{ marginBottom:14 }}>
        <div className="stat-card accent">
          <div className="stat-label">MVP 1 stories</div>
          <div className="stat-value">{mvp1Done}<small>/{mvp1.length}</small></div>
          <div style={{ marginTop:8, height:4, background:'rgba(255,255,255,0.15)', borderRadius:999 }}>
            <div style={{ width:`${mvp1.length ? (mvp1Done/mvp1.length)*100 : 0}%`, height:'100%', background:'var(--butter)', borderRadius:999, transition:'width 0.4s' }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">UAT passing</div>
          <div className="stat-value" style={{ color: uatFailed > 0 ? 'var(--red)' : 'var(--bottle)' }}>{totalTests ? `${Math.round((uatPassed/totalTests)*100)}` : '—'}{totalTests ? <small>%</small> : null}</div>
          <div className="stat-delta" style={{ color:'var(--fg3)' }}>{uatPassed} passed · <span style={{ color:'var(--red)' }}>{uatFailed} failed</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Urgent issues</div>
          <div className="stat-value" style={{ color: urgentCount > 0 ? 'var(--red)' : 'var(--bottle)' }}>{urgentCount}</div>
          <div className="stat-delta">{urgentDisplay.length} high priority total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Requirements</div>
          <div className="stat-value">{reqsApproved}<small>/{reqs.length}</small></div>
          <div className="stat-delta">approved or live</div>
        </div>
      </div>

      {tab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:12 }}>
          {/* Left column */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

            {/* Urgent & blocked */}
            <div className="data-card">
              <div className="data-card-head">
                <h3>🔴 Needs attention</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('dev','inflight')}>All issues →</button>
              </div>
              {urgentDisplay.length === 0 && failedTests.length === 0
                ? <div style={{ padding:'20px', color:'var(--bottle)', fontSize:13, textAlign:'center' }}>Nothing urgent. Good.</div>
                : <div>
                    {urgentDisplay.slice(0,5).map(i => (
                      <div key={i.linear_id} style={{ display:'grid', gridTemplateColumns:'64px 1fr auto', gap:12, alignItems:'center', padding:'10px 20px', borderBottom:'1px solid var(--border)' }}>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--fg3)', letterSpacing:'0.06em' }}>{i.identifier}</span>
                        <span style={{ fontSize:13, fontWeight:500, color:'var(--fg1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{i.title}</span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:9, padding:'3px 7px', borderRadius:3, background: i.priority===1?'var(--red-soft)':'var(--butter-soft)', color: i.priority===1?'var(--red-deep)':'var(--butter-deep)', letterSpacing:'0.08em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{i.priority===1?'Urgent':'High'}</span>
                      </div>
                    ))}
                    {failedTests.map(t => (
                      <div key={t.id} style={{ display:'grid', gridTemplateColumns:'64px 1fr auto', gap:12, alignItems:'center', padding:'10px 20px', borderBottom:'1px solid var(--border)' }}>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--fg3)', letterSpacing:'0.06em' }}>{t.ref}</span>
                        <span style={{ fontSize:13, fontWeight:500, color:'var(--fg1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:9, padding:'3px 7px', borderRadius:3, background:'var(--red-soft)', color:'var(--red-deep)', letterSpacing:'0.08em', textTransform:'uppercase' }}>UAT Failed</span>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Cycle picker + issues */}
            {cycles.length > 0 && selectedCycle && (
              <div className="data-card">
                <div className="data-card-head">
                  <select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)}
                    style={{ fontFamily:'var(--font-body)', fontSize:13, fontWeight:600, background:'transparent', border:'none', color:'var(--fg1)', cursor:'pointer', outline:'none', padding:0 }}>
                    {cycles.map(c => (
                      <option key={c.id} value={c.id}>{c.name ?? `Cycle ${c.number}`}{!c.completedAt ? ' ●' : ''}</option>
                    ))}
                  </select>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {!selectedCycle.completedAt && <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--bottle)', letterSpacing:'0.08em', textTransform:'uppercase' }}>● Active</span>}
                    {selectedCycle.completedAt && <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--fg3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Complete</span>}
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--fg3)' }}>
                      {new Date(selectedCycle.startsAt).toLocaleDateString('en-AU',{day:'numeric',month:'short'})} – {new Date(selectedCycle.endsAt).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}
                    </span>
                  </div>
                </div>
                <div style={{ padding:'12px 20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:12, color:'var(--fg3)' }}>{selectedCycle.issues.nodes.length} issues</span>
                    <span style={{ fontFamily:'var(--font-body)', fontSize:13, fontWeight:700, color:'var(--bottle)' }}>{Math.round(selectedCycle.progress)}%</span>
                  </div>
                  <div style={{ height:5, background:'var(--slate)', borderRadius:999, marginBottom:12 }}>
                    <div style={{ width:`${selectedCycle.progress}%`, height:'100%', background:'var(--bottle)', borderRadius:999 }} />
                  </div>
                  {selectedCycle.issues.nodes.slice(0,6).map(i => (
                    <div key={i.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                      <span style={{ color:'var(--fg1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, marginRight:10 }}>{i.title}</span>
                      <Pill s={linearStatusToPill(i.state.type)} label={i.state.name} />
                    </div>
                  ))}
                  {selectedCycle.issues.nodes.length > 6 && (
                    <button onClick={() => navigate('dev','inflight')} style={{ display:'block', width:'100%', padding:'8px 0', fontSize:12, color:'var(--fg3)', background:'none', border:'none', cursor:'pointer', textAlign:'center' }}>
                      +{selectedCycle.issues.nodes.length-6} more → view all
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

            {/* MVP 1 story progress */}
            <div className="data-card">
              <div className="data-card-head">
                <h3>MVP 1 stories</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('dev','stories')}>All →</button>
              </div>
              <div style={{ padding:'8px 20px' }}>
                {mvp1.map(s => (
                  <div key={s.ref} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background: s.status==='done'?'var(--bottle)':s.status==='in_progress'?'var(--butter)':'var(--slate-deep)', flexShrink:0 }} />
                    <span style={{ fontSize:12, color: s.status==='done'?'var(--fg3)':'var(--fg1)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration: s.status==='done'?'line-through':undefined }}>{s.i_want_to}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:'0.08em', textTransform:'uppercase', color: s.status==='done'?'var(--bottle)':s.status==='in_progress'?'var(--butter-deep)':'var(--fg3)', flexShrink:0 }}>{s.status.replace('_',' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="data-card">
              <div className="data-card-head"><h3>Quick links</h3></div>
              <div style={{ padding:'8px 0' }}>
                {[
                  { label:'Add UAT test',        icon:'plus',   action: () => navigate('dev','uat') },
                  { label:'Add requirement',      icon:'plus',   action: () => navigate('dev','requirements') },
                  { label:'View user stories',    icon:'wiki',   action: () => navigate('dev','stories') },
                  { label:'Activity feed',        icon:'log',    action: () => navigate('dev','activity') },
                ].map(l => (
                  <button key={l.label} onClick={l.action} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 20px', width:'100%', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--fg2)', textAlign:'left', borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='var(--slate-soft)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                    <span style={{ color:'var(--red)' }}><Ic n={l.icon} size={14} /></span>
                    {l.label}
                    <span style={{ marginLeft:'auto', color:'var(--fg3)', fontSize:16, fontFamily:'var(--font-display)', fontStyle:'italic' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline tab */}
      {tab === 'timeline' && (
        <div className="data-card">
          <div className="data-card-head"><h3>Cycle timeline</h3><span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--fg3)' }}>{cycles.length} cycles</span></div>
          {cyclesWithDates.length === 0
            ? <div style={{ padding:'32px 20px', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>No cycle date data available — sync Linear to populate.</div>
            : (
              <div style={{ padding:'20px', overflowX:'auto' }}>
                {/* Month headers */}
                <div style={{ display:'grid', gridTemplateColumns:`180px repeat(${months.length}, 1fr)`, gap:0, marginBottom:8 }}>
                  <div />
                  {months.map(m => (
                    <div key={m.getTime()} style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color: m.getMonth()===new Date().getMonth()&&m.getFullYear()===new Date().getFullYear()?'var(--navy)':'var(--fg3)', textAlign:'center', padding:'0 2px', borderLeft:'1px solid var(--border)', paddingBottom:8, fontWeight: m.getMonth()===new Date().getMonth()&&m.getFullYear()===new Date().getFullYear()?700:400 }}>
                      {m.toLocaleDateString('en-AU',{month:'short',year:'2-digit'})}
                    </div>
                  ))}
                </div>
                {/* Cycle rows */}
                {[...cyclesWithDates].sort((a,b)=>a.number-b.number).map(c => (
                  <div key={c.id} style={{ display:'grid', gridTemplateColumns:`180px 1fr`, gap:0, marginBottom:6, alignItems:'center' }}>
                    <div style={{ paddingRight:16 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:'var(--fg1)' }}>{c.name ?? `Cycle ${c.number}`}</div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color: c.completedAt?'var(--fg3)':!c.completedAt?'var(--bottle)':'var(--fg3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{c.completedAt?'Complete':'Active'}</div>
                    </div>
                    <div style={{ position:'relative', height:28, background:'var(--slate)', borderRadius:4 }}>
                      {/* Current month marker */}
                      {(() => {
                        const now = new Date();
                        const nowPct = ((now.getTime()-timelineStart.getTime())/totalMs)*100;
                        return nowPct>0&&nowPct<100 ? <div style={{ position:'absolute', left:`${nowPct}%`, top:0, bottom:0, width:1.5, background:'var(--red)', opacity:0.6, zIndex:2 }} /> : null;
                      })()}
                      <div style={{ position:'absolute', left:`${barLeft(c.startsAt)}%`, width:`${barWidth(c.startsAt,c.endsAt)}%`, height:'100%', background:cycleColor(c), borderRadius:4, display:'flex', alignItems:'center', paddingLeft:8, minWidth:4, overflow:'hidden', transition:'width 0.3s' }}>
                        {barWidth(c.startsAt,c.endsAt) > 8 && <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'rgba(255,255,255,0.8)', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{Math.round(c.progress)}%</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:12, display:'flex', gap:16, fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--fg3)' }}>
                  <span><span style={{ display:'inline-block', width:10, height:10, background:'var(--navy)', borderRadius:2, marginRight:4 }} />Active</span>
                  <span><span style={{ display:'inline-block', width:10, height:10, background:'var(--slate-deep)', borderRadius:2, marginRight:4 }} />Complete</span>
                  <span><span style={{ display:'inline-block', width:2, height:10, background:'var(--red)', marginRight:4 }} />Today</span>
                </div>
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}

// ── DEV sections ──────────────────────────────────────────────────────────
function InflightView() {
  const [tab] = useState<'list'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [error, setError] = useState('');
  const apiKey = process.env.NEXT_PUBLIC_LINEAR_API_KEY ?? '';

  const loadFromSupabase = async () => {
    const stored = await loadLinearFromSupabase();
    if (stored.length > 0) {
      // Map StoredIssue to LinearIssue shape for display
      setIssues(stored.map(s => ({
        id: s.linear_id, identifier: s.identifier, title: s.title,
        state: { name: s.status, type: s.status === 'done' ? 'completed' : s.status === 'in_progress' ? 'started' : s.status === 'backlog' ? 'backlog' : 'unstarted' },
        priority: s.priority, assignee: null, team: s.project ? { name: s.project } : null,
        labels: { nodes: (s.labels ?? []).map((l: string) => ({ name: l, color: '#999' })) },
        url: s.linear_url,
      })));
      return true;
    }
    return false;
  };

  const doSync = async (force = false) => {
    if (!apiKey) return;
    setSyncing(true); setSyncMsg('');
    const result = await syncLinearToSupabase(apiKey, force);
    if (result.error) { setSyncMsg(`Sync failed: ${result.error}`); }
    else { setSyncMsg(`Synced ${result.count} issues`); setTimeout(() => setSyncMsg(''), 3000); }
    await loadFromSupabase();
    setSyncing(false);
  };

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_LINEAR_API_KEY;
    if (!key) { setLoading(false); return; }
    // Load from Supabase first, sync from Linear for cycles (cycles stay live)
    Promise.all([
      loadFromSupabase(),
      fetch('https://api.linear.app/graphql', { method:'POST', headers:{'Content-Type':'application/json','Authorization':key}, body: JSON.stringify({ query: `{ cycles(first:10, orderBy:updatedAt) { nodes { id name number startsAt endsAt completedAt progress issues { nodes { id identifier title state { name type } priority assignee { name displayName } team { name } labels { nodes { name color } } url } } } } }` }) }).then(r=>r.json())
    ]).then(async ([hasData, cycleData]: [boolean, { data?: { cycles?: { nodes: LinearCycle[] } } }]) => {
      const fetchedCycles = cycleData?.data?.cycles?.nodes ?? [];
      const sorted = [...fetchedCycles].sort((a,b) => b.number - a.number);
      setCycles(sorted);
      // Default to the cycle containing today's date
      const now = Date.now();
      const current = sorted.find(c => !c.completedAt && new Date(c.startsAt).getTime() <= now && new Date(c.endsAt).getTime() >= now);
      const chosen = current ?? sorted.find(c => !c.completedAt) ?? sorted[0];
      if (chosen) setCycleFilter(chosen.id);
      // If Supabase is empty, do a full sync
      if (!hasData) await doSync(true);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [search, setSearch] = useState('');
  const activeCycles = cycles.filter(c => !c.completedAt);

  const shownIssues = (() => {
    let pool = issues;
    if (cycleFilter !== 'all') {
      const cyc = cycles.find(c => c.id === cycleFilter);
      pool = cyc ? cyc.issues.nodes : [];
    }
    if (statusFilter !== 'all') pool = pool.filter(i => linearStatusToPill(i.state.type) === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      pool = pool.filter(i => i.identifier.toLowerCase().includes(q) || i.title.toLowerCase().includes(q));
    }
    return pool;
  })();

  const statusLabels: Record<string,string> = { all:'All', todo:'To do', prog:'In progress', review:'Triage', done:'Done', block:'Cancelled' };

  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>Dev</span><span className="sep">·</span><b>In flight</b></div>
      <div className="section-head">
        <h2>In <em>flight</em></h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span className="meta">{loading ? 'Loading…' : `${issues.length} issues · Supabase cache`}</span>
          {syncMsg && <span style={{fontSize:11,color:'var(--bottle)',fontFamily:'var(--font-mono)'}}>{syncMsg}</span>}
          <button className="btn btn-ghost btn-sm" onClick={() => doSync(false)} disabled={syncing}>{syncing ? 'Syncing…' : '↻ Sync'}</button>
          {error && <span style={{fontSize:11,color:'var(--red)'}}>{error}</span>}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <div className="tab-bar" style={{ marginBottom:0 }}>
          <button className="tab-btn active">Issues</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('dev','activity')}>Activity feed →</button>
      </div>

      {tab === 'list' && <>
        {/* Search */}
        <div style={{ position:'relative', marginBottom:14 }}>
          <div style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--fg3)', pointerEvents:'none' }}>
            <Ic n="search" size={14} />
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by REL number or title…"
            style={{ width:'100%', padding:'8px 12px 8px 36px', fontFamily:'var(--font-body)', fontSize:14, color:'var(--fg1)', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', outline:'none' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--fg3)', cursor:'pointer', fontSize:14 }}>✕</button>}
        </div>

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

// ── User stories seed — full product backlog ──────────────────────────────
const STORIES_SEED = [
  // ── MVP 1 ─────────────────────────────────────────────────────────────
  // Voice
  { id:'us1',  ref:'US-001', mvp:'MVP 1', persona:'tradie',        platform:'ios',     priority:1, status:'done',        developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'describe a job by voice in under 60 seconds',              so_that:'I can create a quote without stopping to type mid-job',                     linear_ids:['REL-5','REL-6','REL-8','REL-9','REL-88'],           acceptance_criteria:'Voice captured; transcript editable; mic errors handled gracefully; works offline' },
  { id:'us2',  ref:'US-002', mvp:'MVP 1', persona:'tradie',        platform:'ios',     priority:2, status:'in_progress', developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'have trade-specific vocabulary recognised accurately',      so_that:'I don\'t have to correct "downlights" every time',                         linear_ids:['REL-79'],                                          acceptance_criteria:'Trade vocab seeded per trade; confidence scores shown; user corrections recorded' },
  // AI extraction
  { id:'us3',  ref:'US-003', mvp:'MVP 1', persona:'tradie',        platform:'backend', priority:1, status:'done',        developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'have materials automatically extracted from my description', so_that:'I don\'t have to build a materials list from scratch',                     linear_ids:['REL-10','REL-11','REL-13','REL-105'],               acceptance_criteria:'Materials list generated in <5s; >90% accuracy on common jobs; user can add/remove/edit' },
  { id:'us4',  ref:'US-004', mvp:'MVP 1', persona:'tradie',        platform:'ios',     priority:2, status:'done',        developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'see confidence scores on extracted materials',              so_that:'I know which items to double-check before sending',                         linear_ids:['REL-78','REL-106'],                                 acceptance_criteria:'Low-confidence items flagged; corrections saved for model improvement' },
  // Pricing
  { id:'us5',  ref:'US-005', mvp:'MVP 1', persona:'tradie',        platform:'ios',     priority:2, status:'in_progress', developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'see live Bunnings pricing on my materials list',             so_that:'my quote reflects real costs without manual lookups',                       linear_ids:['REL-16','REL-17','REL-80','REL-98','REL-120','REL-121'], acceptance_criteria:'Prices from Bunnings API; fallback to manual if unavailable; stock status shown' },
  { id:'us6',  ref:'US-006', mvp:'MVP 1', persona:'tradie',        platform:'ios',     priority:2, status:'done',        developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'manually enter prices when live pricing isn\'t available',  so_that:'I can complete a quote even when the API is down',                          linear_ids:['REL-109'],                                          acceptance_criteria:'Any material price manually overridable; override persists on save' },
  // PDF & quote generation
  { id:'us7',  ref:'US-007', mvp:'MVP 1', persona:'tradie',        platform:'ios',     priority:1, status:'done',        developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'generate a professional PDF quote',                         so_that:'I can send a branded, compliant document to my customer',                  linear_ids:['REL-114','REL-67','REL-21'],                         acceptance_criteria:'PDF: tradie details, line items, labour, GST, total; labelled Quote or Estimate' },
  { id:'us8',  ref:'US-008', mvp:'MVP 1', persona:'tradie',        platform:'ios',     priority:3, status:'in_progress', developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'include site photos in my quote PDF',                       so_that:'customers can see the scope of work',                                       linear_ids:['REL-71','REL-72','REL-73','REL-74','REL-75'],        acceptance_criteria:'Photos captured in-app; compressed; stored in Supabase; embedded in PDF output' },
  // Estimate management
  { id:'us9',  ref:'US-009', mvp:'MVP 1', persona:'tradie',        platform:'ios',     priority:1, status:'done',        developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'see all my estimates in one list',                          so_that:'I can track what\'s been sent, accepted, and paid',                        linear_ids:['REL-65','REL-107'],                                 acceptance_criteria:'Home screen lists all estimates from Supabase; filterable by status' },
  { id:'us10', ref:'US-010', mvp:'MVP 1', persona:'tradie',        platform:'ios',     priority:2, status:'in_progress', developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'manually update the status of an estimate',                 so_that:'I can track jobs agreed verbally or outside the app',                       linear_ids:['REL-117'],                                          acceptance_criteria:'Status transitions: Draft→Sent→Accepted→In Progress→Invoiced→Paid' },
  // Auth & profile
  { id:'us11', ref:'US-011', mvp:'MVP 1', persona:'tradie',        platform:'ios',     priority:1, status:'done',        developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'sign in with Apple',                                        so_that:'I don\'t need another password',                                            linear_ids:['REL-63','REL-85'],                                  acceptance_criteria:'Apple Sign-In works; Supabase auth linked; account deletion flow available' },
  { id:'us12', ref:'US-012', mvp:'MVP 1', persona:'tradie',        platform:'ios',     priority:2, status:'done',        developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'set my trade and business details once',                    so_that:'every quote is pre-filled with my info',                                    linear_ids:['REL-81','REL-64'],                                  acceptance_criteria:'Business name, ABN, trade, contact saved; applied to all new quotes' },
  // Legal & App Store (operational — relia_team)
  { id:'us13', ref:'US-013', mvp:'MVP 1', persona:'relia_team',    platform:'all',     priority:1, status:'in_progress', developer:'nhung', cycle_id:'',  linear_identifier:'', i_want_to:'have published privacy policy, T&Cs, and support URLs',     so_that:'we meet App Store requirements and are legally covered',                    linear_ids:['REL-77','REL-34','REL-35','REL-36'],                acceptance_criteria:'Pages live at reliaplatform.io/privacy, /terms, /support; linked from app and listing' },
  { id:'us14', ref:'US-014', mvp:'MVP 1', persona:'relia_team',    platform:'ios',     priority:1, status:'in_progress', developer:'nhung', cycle_id:'',  linear_identifier:'', i_want_to:'submit the app to the App Store',                           so_that:'tradies can find and download Relia',                                       linear_ids:['REL-31','REL-32','REL-33','REL-37','REL-38','REL-41','REL-42','REL-43'], acceptance_criteria:'Apple Dev account enrolled; listing complete; screenshots; review passed' },
  { id:'us15', ref:'US-015', mvp:'MVP 1', persona:'relia_team',    platform:'ios',     priority:1, status:'in_progress', developer:'nhung', cycle_id:'',  linear_identifier:'', i_want_to:'have the landing page live and collecting waitlist signups', so_that:'we can build an audience before launch',                                    linear_ids:['REL-44','REL-119'],                                 acceptance_criteria:'Landing page live; waitlist form submits to Supabase; email confirmation sent' },
  // ── MVP 2+ ────────────────────────────────────────────────────────────
  // Customer sharing & acceptance
  { id:'us16', ref:'US-016', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:1, status:'in_progress', developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'share a quote with a customer via a unique link',            so_that:'they can view it on any device without needing the app',                    linear_ids:['REL-115'],                                          acceptance_criteria:'Share token generated; web page renders quote; token expires after 30 days' },
  { id:'us17', ref:'US-017', mvp:'MVP 2+', persona:'end_customer', platform:'web',     priority:1, status:'in_progress', developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'accept or decline a quote online',                          so_that:'I don\'t have to call the tradie to confirm',                               linear_ids:['REL-116'],                                          acceptance_criteria:'Accept/decline on web page; tradie notified by email; status updates in app' },
  { id:'us18', ref:'US-018', mvp:'MVP 2+', persona:'tradie',       platform:'backend', priority:2, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'automatically chase customers who haven\'t responded',       so_that:'I don\'t have to manually follow up every quote',                           linear_ids:[],                                                   acceptance_criteria:'Auto-chase email at day 2 and day 5; tradie can disable per quote; tracked in estimate status' },
  { id:'us19', ref:'US-019', mvp:'MVP 2+', persona:'end_customer', platform:'web',     priority:3, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'enter my job details via a guided web form',                so_that:'the tradie receives a pre-scoped job without me calling',                   linear_ids:[],                                                   acceptance_criteria:'AI bot guides customer through job scoping; details sent to tradie\'s dashboard; photos uploaded' },
  { id:'us20', ref:'US-020', mvp:'MVP 2+', persona:'tradie',       platform:'web',     priority:3, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'request a private review from a customer after a job',      so_that:'I can build a track record',                                                linear_ids:['REL-118'],                                          acceptance_criteria:'Review request sent post-job; ratings private to tradie; aggregated score shown in app' },
  // Notifications
  { id:'us21', ref:'US-021', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:2, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'get a push notification when a customer opens or accepts my quote', so_that:'I can follow up at the right moment',                               linear_ids:[],                                                   acceptance_criteria:'Push notification on quote open and on accept/decline; deep links to that estimate' },
  // Subscription
  { id:'us22', ref:'US-022', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:2, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'subscribe monthly or yearly',                               so_that:'I can access premium features like live pricing and unlimited quotes',      linear_ids:['REL-24','REL-25'],                                  acceptance_criteria:'RevenueCat paywall after free trial; monthly and yearly plans; subscription enforced in app' },
  // Invoice & payments
  { id:'us23', ref:'US-023', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:3, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'convert an accepted quote into an invoice',                 so_that:'I don\'t have to re-enter anything to bill the customer',                   linear_ids:[],                                                   acceptance_criteria:'One-tap convert; invoice PDF generated with payment terms; invoice number auto-assigned' },
  { id:'us24', ref:'US-024', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:3, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'mark a quote as paid',                                      so_that:'I can track which jobs have been settled',                                  linear_ids:[],                                                   acceptance_criteria:'Paid status on estimate; payment date recorded; filter by paid/unpaid on home screen' },
  // Scheduling
  { id:'us25', ref:'US-025', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:3, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'get a suggested booking time when a quote is accepted',      so_that:'I can schedule the job without a back-and-forth',                           linear_ids:[],                                                   acceptance_criteria:'Suggested times based on tradie\'s calendar availability; customer confirms via web link' },
  // Analytics
  { id:'us26', ref:'US-026', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:3, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'see my win rate, average quote value, and busiest trade',   so_that:'I can understand how my business is performing',                            linear_ids:['REL-113'],                                          acceptance_criteria:'Dashboard shows win rate, avg quote, quotes sent this month, top trade types' },
  { id:'us27', ref:'US-027', mvp:'MVP 2+', persona:'relia_team',   platform:'backend', priority:2, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'track how tradies use the quoting flow',                    so_that:'we can identify drop-off points and improve conversion',                    linear_ids:['REL-50'],                                           acceptance_criteria:'PostHog integrated; key events tracked: voice start, materials confirmed, quote sent, accepted' },
  // AI improvement
  { id:'us28', ref:'US-028', mvp:'MVP 2+', persona:'relia_team',   platform:'backend', priority:2, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'continuously improve AI extraction accuracy',               so_that:'the model gets better the more it\'s used',                                 linear_ids:['REL-96','REL-95','REL-94','REL-111'],               acceptance_criteria:'Correction events logged; fine-tuning triggered at ≥500 corrections; accuracy tracked in eval harness' },
  { id:'us29', ref:'US-029', mvp:'MVP 2+', persona:'relia_team',   platform:'backend', priority:3, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'A/B test prompts per trade and region',                     so_that:'we can find the best extraction approach for each use case',                linear_ids:['REL-97'],                                           acceptance_criteria:'Prompt variants assignable per trade/region; results tracked in eval harness; winner promoted' },
  // Materials ordering
  { id:'us30', ref:'US-030', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:3, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'auto-order materials when a quote is accepted',             so_that:'I don\'t have to make a separate Bunnings run',                              linear_ids:[],                                                   acceptance_criteria:'One-tap order via Bunnings API; order confirmation sent to tradie; materials status tracked' },
  // Web app
  { id:'us31', ref:'US-031', mvp:'MVP 2+', persona:'tradie',       platform:'web',     priority:3, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'access Relia from a desktop browser',                       so_that:'I can manage quotes from my computer as well as my phone',                  linear_ids:['REL-30'],                                           acceptance_criteria:'Flutter web build deployed; full quoting flow available in browser; syncs with mobile' },
  // Multi-trade
  { id:'us32', ref:'US-032', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:3, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'quote across multiple trades in one job',                   so_that:'builders and project managers can handle combined-trade jobs',              linear_ids:[],                                                   acceptance_criteria:'Multiple trade types selectable per estimate; materials list organised by trade; PDF shows breakdown' },
  // Offline
  { id:'us33', ref:'US-033', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:4, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'create a quote when I have no internet connection',          so_that:'I can still work on a remote site',                                         linear_ids:['REL-27'],                                           acceptance_criteria:'Quote saved locally when offline; auto-synced when connection restored; no data loss' },
  // Team accounts
  { id:'us34', ref:'US-034', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:4, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'add employees who can create quotes on my behalf',          so_that:'I can scale my business without doing every quote myself',                  linear_ids:[],                                                   acceptance_criteria:'Invite by email; employee quotes linked to business account; owner can review before send' },
  // GST & compliance
  { id:'us35', ref:'US-035', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:2, status:'draft',       developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'have GST correctly calculated and shown on my quotes',       so_that:'I stay compliant without doing tax calculations myself',                    linear_ids:['REL-69','REL-68'],                                  acceptance_criteria:'GST auto-applied for registered tradies; non-GST option available; state contract thresholds warned' },
  // CSV & export
  { id:'us36', ref:'US-036', mvp:'MVP 2+', persona:'tradie',       platform:'ios',     priority:4, status:'draft',       developer:'',      cycle_id:'',  linear_identifier:'', i_want_to:'export my quotes to CSV for my accountant',                 so_that:'I can hand off financial records easily',                                   linear_ids:['REL-66'],                                           acceptance_criteria:'CSV export of all estimates for date range; includes tradie, customer, total, status, date' },
  // Localisation
  { id:'us37', ref:'US-037', mvp:'MVP 2+', persona:'relia_team',   platform:'ios',     priority:3, status:'draft',       developer:'jon',   cycle_id:'',  linear_identifier:'', i_want_to:'support multiple Australian states and regions',             so_that:'pricing and compliance rules are correct everywhere in AU',                 linear_ids:['REL-90'],                                           acceptance_criteria:'State selected at onboarding; contract thresholds and GST rules per state; material pricing by region' },
];

type UserStory = typeof STORIES_SEED[0];
type Req = { ref: string; type: string; category: string; title: string; priority: string; status: string; linear_id: string; developer?: string; platform?: string; user_story?: string; phase?: string };
type UATTest = { id: string; ref: string; req_ref: string; title: string; status: string; tester: string; date: string; linear_id: string; notes: string; platform: string; version: string; cycle?: string };

// ── Shared data context ────────────────────────────────────────────────────
interface AppDataCtx {
  stories: UserStory[];
  reqs: Req[];
  tests: UATTest[];
  setStories: React.Dispatch<React.SetStateAction<UserStory[]>>;
  setReqs: React.Dispatch<React.SetStateAction<Req[]>>;
  setTests: React.Dispatch<React.SetStateAction<UATTest[]>>;
  focusId: string;
  setFocusId: (id: string) => void;
}
const AppData = createContext<AppDataCtx>({
  stories: STORIES_SEED, reqs: [], tests: [],
  setStories: () => {}, setReqs: () => {}, setTests: () => {},
  focusId: '', setFocusId: () => {},
});
const useAppData = () => useContext(AppData);

// ── LinkedPanel — cross-reference display ─────────────────────────────────
function LinkedPanel({ storyRef, reqRef, testId, linearId }: { storyRef?: string; reqRef?: string; testId?: string; linearId?: string }) {
  const { stories, reqs, tests } = useAppData();

  const linkedStory  = storyRef ? stories.find(s => s.ref === storyRef) : undefined;
  const linkedReqs   = reqRef   ? reqs.filter(r => r.ref === reqRef)
                      : storyRef ? reqs.filter(r => r.user_story === storyRef) : [];
  const linkedTests  = reqRef   ? tests.filter(t => t.req_ref === reqRef)
                      : storyRef ? tests.filter(t => { const r = reqs.find(r2 => r2.ref === t.req_ref); return r?.user_story === storyRef; }) : [];
  const linkedLinear = linearId ? [linearId] : [];

  const hasLinks = linkedStory || linkedReqs.length || linkedTests.length || linkedLinear.length;
  if (!hasLinks) return null;

  const statusBg: Record<string,string> = { done:'var(--bottle-soft)', in_progress:'var(--butter-soft)', passed:'var(--bottle-soft)', failed:'var(--red-soft)', draft:'var(--slate)', todo:'var(--slate)', implemented:'var(--bottle-soft)', approved:'var(--blue-soft)' };
  const statusFg: Record<string,string> = { done:'var(--bottle-deep)', in_progress:'var(--butter-deep)', passed:'var(--bottle-deep)', failed:'var(--red-deep)', draft:'var(--fg3)', todo:'var(--fg3)', implemented:'var(--bottle-deep)', approved:'var(--blue-hover)' };

  return (
    <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)' }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--fg3)', marginBottom:10 }}>Linked to</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>

        {linkedStory && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 6px', borderRadius:2, background:'var(--navy)', color:'#fff', flexShrink:0, width:68, textAlign:'center' }}>Story</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--navy)', fontWeight:600, flexShrink:0 }}>{linkedStory.ref}</span>
            <span style={{ fontSize:12, color:'var(--fg1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>I want to {linkedStory.i_want_to}</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, padding:'2px 6px', borderRadius:3, background:statusBg[linkedStory.status]??'var(--slate)', color:statusFg[linkedStory.status]??'var(--fg3)', flexShrink:0 }}>{linkedStory.status.replace('_',' ')}</span>
          </div>
        )}

        {linkedReqs.map(r => (
          <div key={r.ref} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 6px', borderRadius:2, background:'var(--blue-soft)', color:'var(--blue-hover)', flexShrink:0, width:68, textAlign:'center' }}>Req</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--navy)', fontWeight:600, flexShrink:0 }}>{r.ref}</span>
            <span style={{ fontSize:12, color:'var(--fg1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{r.title}</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, padding:'2px 6px', borderRadius:3, background:statusBg[r.status]??'var(--slate)', color:statusFg[r.status]??'var(--fg3)', flexShrink:0 }}>{r.status}</span>
          </div>
        ))}

        {linkedTests.map(t => (
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 6px', borderRadius:2, background:'var(--butter-soft)', color:'var(--butter-deep)', flexShrink:0, width:68, textAlign:'center' }}>UAT</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--navy)', fontWeight:600, flexShrink:0 }}>{t.ref}</span>
            <span style={{ fontSize:12, color:'var(--fg1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{t.title}</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, padding:'2px 6px', borderRadius:3, background:statusBg[t.status]??'var(--slate)', color:statusFg[t.status]??'var(--fg3)', flexShrink:0 }}>{t.status.replace('_',' ')}</span>
          </div>
        ))}

        {linkedLinear.map(id => (
          <div key={id} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 6px', borderRadius:2, background:'var(--blue-soft)', color:'var(--blue-hover)', flexShrink:0, width:68, textAlign:'center' }}>Linear</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--navy)', fontWeight:600 }}>{id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PERSONAS   = ['tradie','end_customer','relia_team','admin'] as const;
const PLATFORMS  = ['ios','android','web','backend','all'] as const;
const STORY_STATUSES = ['draft','ready','in_progress','done','deferred'] as const;
const PRIORITY_LABELS = ['','Urgent','High','Medium','Low'] as const;
const PRIORITY_COLORS = ['var(--fg3)','var(--red)','var(--butter-deep)','var(--navy-soft)','var(--fg3)'] as const;
const LINEAR_TEAM_ID = '7b65c41c-554e-4a8f-9aa2-27e8b55da254';

function UserStoriesView() {
  const { stories, setStories } = useAppData();
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<string|null>(null);
  const [filterPersona, setFilterPersona] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMvp, setFilterMvp] = useState('all');
  const [linearIssues, setLinearIssues] = useState<LinearIssue[]>([]);
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [creating, setCreating] = useState<string|null>(null);
  const [form, setForm] = useState({ mvp:'MVP 1', persona:'tradie', platform:'ios', priority:2, i_want_to:'', so_that:'', acceptance_criteria:'', developer:'', linear_ids:'' });
  const apiKey = process.env.NEXT_PUBLIC_LINEAR_API_KEY ?? '';

  useEffect(() => {
    if (!apiKey) return;
    fetch('https://api.linear.app/graphql', { method:'POST', headers:{'Content-Type':'application/json','Authorization':apiKey},
      body: JSON.stringify({ query:`{ issues(first:150) { nodes { id identifier title state { name type } priority team { name } labels { nodes { name color } } url assignee { name displayName } } } cycles(first:10, orderBy:updatedAt) { nodes { id name number startsAt endsAt completedAt progress issues { nodes { id identifier title state { name type } priority assignee { name displayName } team { name } labels { nodes { name color } } url } } } }` }) })
      .then(r=>r.json()).then((d:{data?:{issues?:{nodes:LinearIssue[]};cycles?:{nodes:LinearCycle[]}}}) => {
        setLinearIssues(d.data?.issues?.nodes??[]);
        setCycles([...( d.data?.cycles?.nodes??[])].sort((a,b)=>b.number-a.number));
      });
  }, []);

  const add = () => {
    const nextRef = `US-${String(stories.length+1).padStart(3,'0')}`;
    setStories(ss => [...ss, { id: String(Date.now()), ref: nextRef, status:'draft', cycle_id:'', linear_identifier:'', ...form, linear_ids: form.linear_ids.split(',').map(s=>s.trim()).filter(Boolean) }]);
    setForm({ mvp:'MVP 1', persona:'tradie', platform:'ios', priority:2, i_want_to:'', so_that:'', acceptance_criteria:'', developer:'', linear_ids:'' });
    setAdding(false);
  };

  const upd = (id: string, f: string, v: string | string[] | number) => setStories(ss => ss.map(s => s.id===id ? {...s,[f]:v} : s));

  const createInLinear = async (s: UserStory) => {
    if (!apiKey) return;
    setCreating(s.id);
    const title = `As a ${s.persona.replace('_',' ')}, I want to ${s.i_want_to}`;
    const description = `**So that** ${s.so_that}\n\n**Acceptance criteria:**\n${s.acceptance_criteria || '—'}\n\n**User story:** ${s.ref}`;
    const mutation = `mutation { issueCreate(input: { teamId: "${LINEAR_TEAM_ID}", title: ${JSON.stringify(title)}, description: ${JSON.stringify(description)}, priority: ${s.priority}${s.cycle_id ? `, cycleId: "${s.cycle_id}"` : ''} }) { success issue { id identifier url } } }`;
    const res = await fetch('https://api.linear.app/graphql', { method:'POST', headers:{'Content-Type':'application/json','Authorization':apiKey}, body: JSON.stringify({ query: mutation }) });
    const data = await res.json() as { data?: { issueCreate?: { success: boolean; issue?: { identifier: string; url: string } } } };
    const created = data.data?.issueCreate?.issue;
    if (created) {
      upd(s.id, 'linear_identifier', created.identifier);
      upd(s.id, 'linear_ids', [...(Array.isArray(s.linear_ids)?s.linear_ids:[]), created.identifier]);
    }
    setCreating(null);
  };

  const filtered = stories.filter(s => {
    if (filterPersona !== 'all' && s.persona !== filterPersona) return false;
    if (filterPlatform !== 'all' && s.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterMvp !== 'all' && s.mvp !== filterMvp) return false;
    return true;
  });

  const personaColor: Record<string,string> = { tradie:'var(--navy)', end_customer:'var(--bottle-deep)', relia_team:'var(--butter-deep)', admin:'var(--red)' };
  const statusColor: Record<string,[string,string]> = { draft:['var(--slate)','var(--fg3)'], ready:['var(--blue-soft)','var(--blue-hover)'], in_progress:['var(--butter-soft)','var(--butter-deep)'], done:['var(--bottle-soft)','var(--bottle-deep)'], deferred:['var(--red-soft)','var(--red-deep)'] };
  const activeCycle = cycles.find(c=>!c.completedAt);

  const mvp1Count = stories.filter(s=>s.mvp==='MVP 1').length;
  const mvp1Done  = stories.filter(s=>s.mvp==='MVP 1'&&s.status==='done').length;

  return (
    <div className="hub-page">
      <div className="breadcrumb"><span>Dev</span><span className="sep">·</span><b>User stories</b></div>
      <div className="section-head">
        <h2>User <em>stories</em></h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span className="meta">{filtered.length} shown · {stories.length} total</span>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(a=>!a)}><Ic n="plus" />{adding?'Cancel':'Add story'}</button>
        </div>
      </div>

      {/* MVP 1 progress bar */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'14px 20px',marginBottom:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--fg3)'}}>MVP 1 progress</span>
          <span style={{fontFamily:'var(--font-body)',fontSize:13,fontWeight:600,color:'var(--bottle)'}}>{mvp1Done}/{mvp1Count} done</span>
        </div>
        <div style={{height:6,background:'var(--slate)',borderRadius:999}}>
          <div style={{width:`${(mvp1Done/mvp1Count)*100}%`,height:'100%',background:'var(--bottle)',borderRadius:999,transition:'width 0.4s'}} />
        </div>
      </div>

      {/* Editor's note */}
      <div className="editors-note" style={{marginBottom:20}}>
        <p>Stories tagged <b>relia_team</b> are operational (legal, App Store, marketing). Use "Create in Linear" to push any untracked story directly to your Linear backlog and assign it to a cycle.</p>
      </div>

      {adding && (
        <div className="uat-form" style={{marginBottom:20}}>
          <div className="form-grid">
            <div className="form-field"><label>Scope</label><select value={form.mvp} onChange={e=>setForm(f=>({...f,mvp:e.target.value}))}><option>MVP 1</option><option>MVP 2+</option></select></div>
            <div className="form-field"><label>Priority</label><select value={form.priority} onChange={e=>setForm(f=>({...f,priority:Number(e.target.value)}))}>{[1,2,3,4].map(p=><option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}</select></div>
            <div className="form-field"><label>Persona</label><select value={form.persona} onChange={e=>setForm(f=>({...f,persona:e.target.value}))}>{PERSONAS.map(p=><option key={p} value={p}>{p.replace('_',' ')}</option>)}</select></div>
            <div className="form-field"><label>Platform</label><select value={form.platform} onChange={e=>setForm(f=>({...f,platform:e.target.value}))}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
            <div className="form-field full"><label>I want to…</label><input value={form.i_want_to} onChange={e=>setForm(f=>({...f,i_want_to:e.target.value}))} placeholder="describe the goal" /></div>
            <div className="form-field full"><label>So that…</label><input value={form.so_that} onChange={e=>setForm(f=>({...f,so_that:e.target.value}))} placeholder="the benefit or outcome" /></div>
            <div className="form-field full"><label>Acceptance criteria</label><textarea value={form.acceptance_criteria} onChange={e=>setForm(f=>({...f,acceptance_criteria:e.target.value}))} placeholder="When… then…" /></div>
            <div className="form-field"><label>Developer</label><input value={form.developer} onChange={e=>setForm(f=>({...f,developer:e.target.value}))} placeholder="jon, nhung…" /></div>
            <div className="form-field"><label>Linked issues (comma separated)</label><input value={form.linear_ids} onChange={e=>setForm(f=>({...f,linear_ids:e.target.value}))} placeholder="REL-5, REL-6" /></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={()=>setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={add} disabled={!form.i_want_to||!form.so_that}>Add story</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        {['all','MVP 1','MVP 2+'].map(m=>(
          <button key={m} className={`filter-chip${filterMvp===m?' on':''}`} onClick={()=>setFilterMvp(m)}>{m==='all'?'All scope':m}</button>
        ))}
        <div style={{width:1,height:20,background:'var(--border)',margin:'0 4px'}} />
        <select value={filterPersona} onChange={e=>setFilterPersona(e.target.value)} style={{fontFamily:'var(--font-body)',fontSize:12,padding:'4px 10px',borderRadius:'var(--radius-md)',border:'1px solid var(--border)',background:'var(--bg-card)',color:filterPersona==='all'?'var(--fg3)':'var(--fg1)',cursor:'pointer',outline:'none'}}>
          <option value="all">All personas</option>{PERSONAS.map(p=><option key={p} value={p}>{p.replace('_',' ')}</option>)}
        </select>
        <select value={filterPlatform} onChange={e=>setFilterPlatform(e.target.value)} style={{fontFamily:'var(--font-body)',fontSize:12,padding:'4px 10px',borderRadius:'var(--radius-md)',border:'1px solid var(--border)',background:'var(--bg-card)',color:filterPlatform==='all'?'var(--fg3)':'var(--fg1)',cursor:'pointer',outline:'none'}}>
          <option value="all">All platforms</option>{PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{fontFamily:'var(--font-body)',fontSize:12,padding:'4px 10px',borderRadius:'var(--radius-md)',border:'1px solid var(--border)',background:'var(--bg-card)',color:filterStatus==='all'?'var(--fg3)':'var(--fg1)',cursor:'pointer',outline:'none'}}>
          <option value="all">All statuses</option>{STORY_STATUSES.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        {(filterPersona!=='all'||filterPlatform!=='all'||filterStatus!=='all'||filterMvp!=='all') && <button className="btn btn-ghost btn-sm" onClick={()=>{setFilterPersona('all');setFilterPlatform('all');setFilterStatus('all');setFilterMvp('all');}}>Clear</button>}
        <span className="mono" style={{marginLeft:'auto'}}>{filtered.length} stories</span>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:1,background:'var(--border)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
        {filtered.map(s => (
          <div key={s.id}>
            <div style={{display:'grid',gridTemplateColumns:'72px 60px 1fr auto auto',gap:12,alignItems:'center',padding:'11px 20px',background:'var(--bg-card)',cursor:'pointer',transition:'background 0.1s'}}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--slate-soft)')}
              onMouseLeave={e=>(e.currentTarget.style.background='var(--bg-card)')}
              onClick={()=>setExpanded(e=>e===s.id?null:s.id)}>
              {/* Ref + MVP badge */}
              <div>
                <span className="mono" style={{fontSize:10,display:'block'}}>{s.ref}</span>
                <span style={{fontFamily:'var(--font-mono)',fontSize:8,letterSpacing:'0.08em',textTransform:'uppercase',padding:'1px 4px',borderRadius:2,background:s.mvp==='MVP 1'?'var(--bottle-soft)':'var(--butter-soft)',color:s.mvp==='MVP 1'?'var(--bottle-deep)':'var(--butter-deep)'}}>{s.mvp}</span>
              </div>
              {/* Priority */}
              <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.06em',color:PRIORITY_COLORS[s.priority]??'var(--fg3)',textTransform:'uppercase'}}>{PRIORITY_LABELS[s.priority]}</span>
              {/* Story text */}
              <div>
                <span style={{fontSize:13,color:'var(--fg2)'}}>As a <b style={{color:personaColor[s.persona]??'var(--navy)'}}>{s.persona.replace('_',' ')}</b>, I want to </span>
                <span style={{fontSize:13,fontWeight:500,color:'var(--fg1)'}}>{s.i_want_to}</span>
                <span style={{fontSize:12,color:'var(--fg3)',display:'block',marginTop:1}}>So that {s.so_that}</span>
              </div>
              {/* Linear IDs */}
              <div style={{display:'flex',gap:3,alignItems:'center'}}>
                {s.linear_identifier && <span style={{fontFamily:'var(--font-mono)',fontSize:9,padding:'2px 5px',borderRadius:3,background:'var(--bottle-soft)',color:'var(--bottle-deep)'}}>{s.linear_identifier}</span>}
                {(Array.isArray(s.linear_ids)?s.linear_ids:[]).slice(0,2).map(id=>(
                  <span key={id} style={{fontFamily:'var(--font-mono)',fontSize:9,padding:'2px 5px',borderRadius:3,background:'var(--blue-soft)',color:'var(--blue-hover)'}}>{id}</span>
                ))}
                {(Array.isArray(s.linear_ids)?s.linear_ids:[]).length > 2 && <span style={{fontSize:10,color:'var(--fg3)'}}>+{(Array.isArray(s.linear_ids)?s.linear_ids:[]).length-2}</span>}
              </div>
              {/* Status */}
              <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.08em',textTransform:'uppercase',padding:'4px 8px',borderRadius:3,background:statusColor[s.status]?.[0]??'var(--slate)',color:statusColor[s.status]?.[1]??'var(--fg3)',whiteSpace:'nowrap'}}>{s.status.replace('_',' ')}</span>
            </div>

            {expanded===s.id && (
              <div style={{padding:'16px 20px',background:'var(--slate-soft)',borderTop:'1px solid var(--border)'}} onClick={e=>e.stopPropagation()}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:20}}>
                  {/* Left: criteria */}
                  <div>
                    <div className="mono" style={{marginBottom:6}}>Acceptance criteria</div>
                    <EF value={s.acceptance_criteria||''} onSave={v=>upd(s.id,'acceptance_criteria',v)} multi />
                    <LinkedPanel storyRef={s.ref} />
                  </div>
                  {/* Right: controls */}
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div className="form-field">
                      <label>Status</label>
                      <select value={s.status} onChange={e=>upd(s.id,'status',e.target.value)} style={{fontFamily:'var(--font-body)',fontSize:13,padding:'5px 8px',borderRadius:4,border:'1px solid var(--border)',background:'var(--bg-card)',cursor:'pointer',outline:'none',width:'100%'}}>
                        {STORY_STATUSES.map(st=><option key={st} value={st}>{st.replace('_',' ')}</option>)}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Priority</label>
                      <select value={s.priority} onChange={e=>upd(s.id,'priority',Number(e.target.value))} style={{fontFamily:'var(--font-body)',fontSize:13,padding:'5px 8px',borderRadius:4,border:'1px solid var(--border)',background:'var(--bg-card)',cursor:'pointer',outline:'none',width:'100%'}}>
                        {[1,2,3,4].map(p=><option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Assign to cycle</label>
                      <select value={s.cycle_id} onChange={e=>upd(s.id,'cycle_id',e.target.value)} style={{fontFamily:'var(--font-body)',fontSize:13,padding:'5px 8px',borderRadius:4,border:'1px solid var(--border)',background:'var(--bg-card)',cursor:'pointer',outline:'none',width:'100%'}}>
                        <option value="">No cycle</option>
                        {cycles.map(c=><option key={c.id} value={c.id}>{c.name??`Cycle ${c.number}`}{!c.completedAt?' ●':''}</option>)}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Developer</label>
                      <EF value={s.developer||''} onSave={v=>upd(s.id,'developer',v)} />
                    </div>
                    <div className="form-field">
                      <label>Scope</label>
                      <select value={s.mvp} onChange={e=>upd(s.id,'mvp',e.target.value)} style={{fontFamily:'var(--font-body)',fontSize:13,padding:'5px 8px',borderRadius:4,border:'1px solid var(--border)',background:'var(--bg-card)',cursor:'pointer',outline:'none',width:'100%'}}>
                        <option>MVP 1</option><option>MVP 2+</option>
                      </select>
                    </div>
                    {!s.linear_identifier ? (
                      <button className="btn btn-primary" style={{marginTop:4}} onClick={()=>createInLinear(s)} disabled={creating===s.id}>
                        {creating===s.id ? 'Creating…' : '+ Create in Linear'}
                      </button>
                    ) : (
                      <div style={{padding:'8px 10px',background:'var(--bottle-soft)',borderRadius:6,fontSize:12,color:'var(--bottle-deep)',textAlign:'center'}}>
                        ✓ In Linear as <b>{s.linear_identifier}</b>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RequirementsView() {
  const { reqs, setReqs } = useAppData();
  const [filter, setFilter] = useState<'all'|'functional'|'non_functional'>('all');
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<string|null>(null);
  const [linearIssues, setLinearIssues] = useState<LinearIssue[]>([]);
  const [form, setForm] = useState({ type:'functional', category:'', title:'', description:'', priority:'must_have', linear_id:'' });

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_LINEAR_API_KEY;
    if (!key) return;
    fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': key },
    });
    loadLinearFromSupabase().then(stored => setLinearIssues(stored.map(s => ({ id: s.linear_id, identifier: s.identifier, title: s.title, state: { name: s.status, type: s.status }, priority: s.priority, assignee: null, team: null, labels: { nodes: [] }, url: s.linear_url }))));
  }, []);

  const [phaseFilter, setPhaseFilter] = useState('all');
  const shown = reqs.filter(r => {
    if (filter !== 'all' && r.type !== filter) return false;
    if (phaseFilter !== 'all' && r.phase !== phaseFilter) return false;
    return true;
  });
  const phases = ['MVP 1','MVP 2','MVP 3+'];
  const upd = (ref: string, f: string, v: string) => setReqs(rs => rs.map(r => r.ref === ref ? {...r, [f]: v} : r));

  const addReq = () => {
    const prefix = form.type === 'functional' ? 'FR' : 'NFR';
    const count = reqs.filter(r => r.type === form.type).length;
    const ref = `${prefix}-${String(count + 1).padStart(3,'0')}`;
    const newReq = { ref, type: form.type, category: form.category, title: form.title, priority: form.priority, status: 'draft', linear_id: form.linear_id, developer: (form as { developer?: string }).developer ?? '', platform: (form as { platform?: string }).platform ?? 'all', user_story: (form as { user_story?: string }).user_story ?? '' };
    setReqs(rs => [...rs, newReq]);
    setForm({ type:'functional', category:'', title:'', description:'', priority:'must_have', linear_id:'' });
    setAdding(false);
  };

  return (
    <div className="hub-page-wide">
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

      {/* Phase filter */}
      <div style={{ display:'flex', gap:6, marginBottom:10 }}>
        {['all',...phases].map(p => (
          <button key={p} className={`filter-chip${phaseFilter===p?' on':''}`} onClick={() => setPhaseFilter(p)}>
            {p==='all'?'All phases':p}
            {p!=='all' && <span style={{ marginLeft:5, fontFamily:'var(--font-mono)', fontSize:9 }}>({reqs.filter(r=>r.phase===p).length})</span>}
          </button>
        ))}
      </div>

      <div className="tab-bar">
        {(['all','functional','non_functional'] as const).map(f => (
          <button key={f} className={`tab-btn${filter===f?' active':''}`} onClick={() => setFilter(f)}>
            {f==='all'?`All (${shown.length})`:f==='functional'?`Functional (${shown.filter(r=>r.type==='functional').length})`:`Non-functional (${shown.filter(r=>r.type==='non_functional').length})`}
          </button>
        ))}
      </div>

      <div className="data-card">
        <div className="data-card-scroll">
        <table className="data-table">
          <thead><tr><th>Ref</th><th>Phase</th><th>Category</th><th>Title</th><th>Platform</th><th>Developer</th><th>Priority</th><th>Status</th><th>Linear</th><th></th></tr></thead>
          <tbody>
            {shown.map(r => (
              <>
              <tr key={r.ref} style={{ cursor:'pointer' }} onClick={() => setExpanded(e => e===r.ref ? null : r.ref)}>
                <td><span className="mono" style={{ fontSize:12 }}>{r.ref}</span></td>
                <td>
                  <select value={(r as Req).phase ?? 'MVP 1'} onChange={e => upd(r.ref,'phase',e.target.value)}
                    style={{ fontFamily:'var(--font-mono)', fontSize:12, letterSpacing:'0.04em', background:'transparent', border:'none', cursor:'pointer', padding:0, fontWeight:600,
                      color:(r as Req).phase==='MVP 1'?'var(--bottle-deep)':(r as Req).phase==='MVP 2'?'var(--navy)':'var(--fg3)' }}>
                    {phases.map(p=><option key={p}>{p}</option>)}
                  </select>
                </td>
                <td>
                  <select value={r.category} onChange={e => upd(r.ref,'category',e.target.value)} style={{ fontFamily:'var(--font-body)', fontSize:13, background:'transparent', border:'none', color:'var(--fg2)', cursor:'pointer', padding:0, width:'100%' }}>
                    {['Voice Capture','Quoting','Follow-up','Onboarding','Materials','Performance','Security','Availability','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                    {!['Voice Capture','Quoting','Follow-up','Onboarding','Materials','Performance','Security','Availability','Other'].includes(r.category) && <option value={r.category}>{r.category}</option>}
                  </select>
                </td>
                <td className="fw600"><EF value={r.title} onSave={v => upd(r.ref,'title',v)} /></td>
                <td>
                  <select value={(r as { platform?: string }).platform ?? 'all'} onChange={e => upd(r.ref,'platform',e.target.value)} style={{ fontFamily:'var(--font-mono)', fontSize:12, background:'transparent', border:'none', color:'var(--fg2)', cursor:'pointer', padding:0 }}>
                    {['all','ios','android','web','backend'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td><EF value={(r as { developer?: string }).developer ?? ''} onSave={v => upd(r.ref,'developer',v)} /></td>
                <td>
                  <select value={r.priority} onChange={e => upd(r.ref,'priority',e.target.value)} style={{ fontFamily:'var(--font-body)', fontSize:13, background:'transparent', border:'none', color:'var(--fg2)', cursor:'pointer', padding:0 }}>
                    {['must_have','should_have','could_have','wont_have'].map(p => <option key={p} value={p}>{p.replace('_',' ')}</option>)}
                  </select>
                </td>
                <td>
                  <select value={r.status} onChange={e => upd(r.ref,'status',e.target.value)} style={{ fontFamily:'var(--font-body)', fontSize:13, background:'transparent', border:'none', color:'var(--fg2)', cursor:'pointer', padding:0 }}>
                    {['draft','approved','implemented','deprecated'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <select value={r.linear_id} onChange={e => upd(r.ref,'linear_id',e.target.value)} style={{ fontFamily:'var(--font-mono)', fontSize:12, background:'transparent', border:'none', color: r.linear_id ? 'var(--navy)' : 'var(--fg3)', cursor:'pointer', padding:0 }}>
                    <option value="">—</option>
                    {linearIssues.map(i => <option key={i.id} value={i.identifier}>{i.identifier}</option>)}
                    {r.linear_id && !linearIssues.find(i => i.identifier === r.linear_id) && <option value={r.linear_id}>{r.linear_id}</option>}
                  </select>
                </td>
                <td style={{ color:'var(--fg3)', fontSize:13 }}>{expanded===r.ref ? '▲' : '▼'}</td>
              </tr>
              {expanded===r.ref && (
                <tr key={`${r.ref}-linked`}>
                  <td colSpan={10} style={{ padding:0 }}>
                    <div style={{ padding:'14px 20px', background:'var(--slate-soft)', borderBottom:'1px solid var(--border)' }}>
                      <LinkedPanel storyRef={(r as Req).user_story} reqRef={r.ref} linearId={r.linear_id || undefined} />
                    </div>
                  </td>
                </tr>
              )}
              </>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

interface UATAttachment { id: string; file_name: string; storage_path: string; url: string; linear_issue_id: string; caption: string; }

function UATTestRow({ t, upd, linearIssues }: {
  t: UATTest;
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

  const platformIcon: Record<string,string> = { ios:'📱', android:'🤖', web:'🌐', all:'·' };
  const cycleColors: Record<string,{bg:string,fg:string}> = {
    'Cycle 1':{bg:'var(--bottle-soft)',fg:'var(--bottle-deep)'},
    'Cycle 2':{bg:'var(--blue-soft)',fg:'var(--blue-hover)'},
    'Cycle 3':{bg:'var(--butter-soft)',fg:'var(--butter-deep)'},
  };
  const cc = t.cycle ? (cycleColors[t.cycle] ?? {bg:'var(--slate)',fg:'var(--fg3)'}) : {bg:'var(--slate)',fg:'var(--fg3)'};
  const statusPill: Record<string,{bg:string,fg:string,label:string}> = {
    passed:      {bg:'var(--bottle-soft)',fg:'var(--bottle-deep)',label:'PASS'},
    failed:      {bg:'var(--red-soft)',fg:'var(--red)',label:'FAIL'},
    in_progress: {bg:'var(--butter-soft)',fg:'var(--butter-deep)',label:'IN PROG'},
    draft:       {bg:'var(--slate)',fg:'var(--fg3)',label:'DRAFT'},
    ready:       {bg:'var(--blue-soft)',fg:'var(--blue-hover)',label:'READY'},
    blocked:     {bg:'var(--red-soft)',fg:'var(--red)',label:'BLOCKED'},
  };
  const sp = statusPill[t.status] ?? statusPill['draft']!;
  const initials = t.tester ? t.tester.slice(0,2).toUpperCase() : '?';
  const testerColors = ['var(--navy)','var(--bottle-deep)','var(--red)','var(--butter-deep)'];
  const testerColor = testerColors[t.tester.charCodeAt(0) % testerColors.length];

  return (
    <>
      <tr style={{ cursor:'pointer' }} onClick={handleExpand}>
        <td><span className="mono" style={{ fontSize:11 }}>{t.ref}</span></td>
        <td>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.06em', padding:'3px 7px', borderRadius:3, background:cc.bg, color:cc.fg, whiteSpace:'nowrap', fontWeight:600 }}>
            {t.cycle ?? '—'}
          </span>
        </td>
        <td onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:13 }}>{platformIcon[t.platform ?? 'all']}</span>
            <select value={t.platform ?? 'all'} onChange={e => upd(t.id,'platform',e.target.value)}
              style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.06em', background:'transparent', border:'none', cursor:'pointer', padding:0, color:'var(--fg2)' }}>
              <option value="all">All</option>
              <option value="ios">iPhone</option>
              <option value="android">Android</option>
              <option value="web">Web App</option>
            </select>
          </div>
        </td>
        <td onClick={e => e.stopPropagation()}><EF value={t.version ?? ''} onSave={v => upd(t.id,'version',v)} /></td>
        <td style={{ maxWidth:360 }}>
          <div style={{ fontWeight:600, fontSize:13 }}><EF value={t.title} onSave={v => upd(t.id,'title',v)} /></div>
          {t.notes && <div style={{ fontSize:11, color:'var(--fg3)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:340 }}>{t.notes}</div>}
        </td>
        <td onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:testerColor, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{initials}</div>
            <EF value={t.tester} onSave={v => upd(t.id,'tester',v)} />
          </div>
        </td>
        <td onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, fontWeight:700, letterSpacing:'0.08em', padding:'3px 8px', borderRadius:3, background:sp.bg, color:sp.fg }}>{sp.label}</span>
            <select value={t.status} onChange={e => upd(t.id,'status',e.target.value)} style={{ fontFamily:'var(--font-body)', fontSize:10, background:'transparent', border:'none', color:'var(--fg3)', cursor:'pointer', padding:0 }}>
              {['draft','ready','in_progress','passed','failed','blocked'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
        </td>
        <td><span style={{ fontSize:11, color:'var(--fg3)' }}>{expanded ? '▲' : '▼'}{attachments.length > 0 ? ` ${attachments.length}` : ''}</span></td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} style={{ padding:0, background:'var(--slate-soft)', borderBottom:'1px solid var(--border)' }}>
            <div style={{ padding:'16px 20px' }}>
              {/* Notes — editable inline */}
              <div style={{ marginBottom:16, padding:'10px 14px', background:'var(--bg-card)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)', display:'flex', gap:12, alignItems:'flex-start' }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--fg3)', paddingTop:4, flexShrink:0 }}>Notes</span>
                <div style={{ flex:1, fontSize:13, color:'var(--fg1)', lineHeight:1.5 }}>
                  <EF value={t.notes || ''} onSave={v => upd(t.id,'notes',v)} />
                </div>
              </div>
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
                    <LinearSearch value={attachLinear} issues={linearIssues} onChange={(_id, identifier) => setAttachLinear(identifier)} placeholder="Search issues…" />
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
              {/* Cross-references */}
              <LinkedPanel reqRef={t.req_ref || undefined} linearId={t.linear_id || undefined} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function UATView() {
  const { tests, setTests } = useAppData();
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title:'', req_ref:'', tester:'', linear_id:'', notes:'', platform:'all', version:'' });
  const [linearIssues, setLinearIssues] = useState<LinearIssue[]>([]);
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowToTest = (r: any): UATTest => ({
    id: r.id, ref: r.ref, title: r.title ?? '', notes: r.notes ?? '',
    status: r.status ?? 'draft', cycle: r.cycle ?? undefined,
    tester: r.tester ?? '', req_ref: r.req_ref ?? '',
    linear_id: r.linear_id ?? '', platform: r.platform ?? 'all',
    version: r.version ?? '', date: r.date ?? '',
  });

  const loadTests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[UAT] auth uid:', user?.id ?? 'NOT AUTHENTICATED');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('uat_tests').select('*').order('ref', { ascending: true });
    console.log('[UAT] rows:', data?.length ?? 'null', 'error:', error?.message ?? 'none');
    if (error) console.error('[UAT] loadTests error:', error);
    if (data) setTests(data.map(rowToTest));
    setLoading(false);
  };

  const upd = async (id: string, f: string, v: string) => {
    setTests(ts => ts.map(t => t.id === id ? {...t, [f]: v} : t));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('uat_tests').update({ [f]: v, updated_at: new Date().toISOString() }).eq('id', id);
  };

  useEffect(() => {
    loadTests();
    loadLinearFromSupabase().then(stored => setLinearIssues(stored.map(s => ({ id: s.linear_id, identifier: s.identifier, title: s.title, state: { name: s.status, type: s.status }, priority: s.priority, assignee: null, team: null, labels: { nodes: [] }, url: s.linear_url }))));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTest = async () => {
    const nextRef = `UAT-${String(tests.length + 1).padStart(3,'0')}`;
    const payload = { ref: nextRef, status: 'draft', date: new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'}), ...form };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('uat_tests').insert(payload).select().single();
    if (data) setTests(ts => [...ts, rowToTest(data)]);
    setForm({ title:'', req_ref:'', tester:'', linear_id:'', notes:'', platform:'all', version:'' });
    setAdding(false);
  };

  const [cycleFilter, setCycleFilter] = useState('all');
  const uatCycles = [...new Set(tests.map(t => t.cycle).filter(Boolean))].sort() as string[];
  const filteredTests = cycleFilter === 'all' ? tests : tests.filter(t => t.cycle === cycleFilter);
  const summary = { passed: filteredTests.filter(t=>t.status==='passed').length, failed: filteredTests.filter(t=>t.status==='failed').length, in_progress: filteredTests.filter(t=>t.status==='in_progress').length, draft: filteredTests.filter(t=>t.status==='draft'||t.status==='ready').length };

  return (
    <div className="hub-page-wide">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:32 }}>
        <div>
          <div className="breadcrumb" style={{ marginBottom:8 }}><span>Dev</span><span className="sep">·</span><b>UAT</b></div>
          <h2 style={{ fontFamily:'var(--font-display)', fontWeight:400, fontSize:'clamp(32px,3.5vw,48px)', lineHeight:1.05, letterSpacing:'-0.025em', color:'var(--fg1)', margin:0 }}>User acceptance<br /><em style={{ fontStyle:'italic', color:'var(--red)' }}>testing</em></h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)} style={{ marginTop:8 }}><Ic n="plus" />{adding ? 'Cancel' : 'Add test'}</button>
      </div>
      <div className="stat-row" style={{ marginBottom:32 }}>
        <div className="stat-card" style={{ position:'relative' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div className="stat-label">Passed</div>
            <span style={{ width:28, height:28, borderRadius:'50%', background:'var(--bottle-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✓</span>
          </div>
          <div className="stat-value" style={{ color:'var(--bottle)', marginBottom:6 }}>{summary.passed}</div>
          <div className="stat-delta up">{summary.passed > 0 ? 'All verified green' : 'No passing tests yet'}</div>
        </div>
        <div className="stat-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div className="stat-label">Failed</div>
            <span style={{ width:28, height:28, borderRadius:'50%', background:'var(--red-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✕</span>
          </div>
          <div className="stat-value" style={{ color:'var(--red)', marginBottom:6 }}>{summary.failed}</div>
          <div className="stat-delta dn">{summary.failed > 0 ? 'High priority fixes required' : 'No failures — nice'}</div>
        </div>
        <div className="stat-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div className="stat-label">In progress</div>
            <span style={{ width:28, height:28, borderRadius:'50%', background:'var(--butter-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>↻</span>
          </div>
          <div className="stat-value" style={{ color:'var(--butter-deep)', marginBottom:6 }}>{summary.in_progress}</div>
          <div className="stat-delta">Currently under review</div>
        </div>
        <div className="stat-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div className="stat-label">Draft / Ready</div>
            <span style={{ width:28, height:28, borderRadius:'50%', background:'var(--slate)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>◇</span>
          </div>
          <div className="stat-value" style={{ color:'var(--fg3)', marginBottom:6 }}>{summary.draft}</div>
          <div className="stat-delta">Awaiting test run</div>
        </div>
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
            <div className="form-field"><label>Linear issue</label>
              <LinearSearch value={form.linear_id} issues={linearIssues} onChange={(_id, identifier) => setForm(f => ({...f, linear_id: identifier}))} />
            </div>
            <div className="form-field"><label>Tester</label><input value={form.tester} onChange={e => setForm(f => ({...f, tester: e.target.value}))} placeholder="Name" /></div>
            <div className="form-field"><label>Notes</label><input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Optional" /></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={addTest} disabled={!form.title}>Add test</button>
          </div>
        </div>
      )}
      {/* Cycle tab bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)', marginBottom:0 }}>
        <div style={{ display:'flex', gap:0 }}>
          {[{label:'All Cycles', val:'all', count:tests.length}, ...uatCycles.map(c=>({label:c, val:c, count:tests.filter(t=>t.cycle===c).length}))].map(tab => (
            <button key={tab.val} onClick={()=>setCycleFilter(tab.val)} style={{
              background:'none', border:'none', cursor:'pointer', padding:'10px 18px', fontSize:13,
              color: cycleFilter===tab.val ? 'var(--fg1)' : 'var(--fg3)',
              fontWeight: cycleFilter===tab.val ? 600 : 400,
              borderBottom: cycleFilter===tab.val ? '2px solid var(--navy)' : '2px solid transparent',
              marginBottom:-1, transition:'color 0.15s',
            }}>
              {tab.label} <span style={{ opacity:0.5, fontSize:11 }}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, paddingBottom:8 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', color:'var(--fg3)', padding:'4px 10px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', gap:4 }}>
            ⊟ FILTER
          </span>
        </div>
      </div>

      <div className="data-card">
        {loading && <div style={{ padding:'32px 20px', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>Loading…</div>}
        {!loading && filteredTests.length === 0 && !adding && <div style={{ padding:'32px 20px', color:'var(--fg3)', fontSize:13, textAlign:'center' }}>{tests.length === 0 ? 'No UAT tests yet. Add your first above.' : 'No tests in this cycle.'}</div>}
        {!loading && filteredTests.length > 0 && (
          <table className="data-table">
            <thead><tr><th>REF</th><th>CYCLE</th><th>PLATFORM</th><th>VERSION</th><th>TEST</th><th>TESTER</th><th>STATUS</th><th></th></tr></thead>
            <tbody>
              {filteredTests.map(t => <UATTestRow key={t.id} t={t} upd={upd} linearIssues={linearIssues} />)}
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
  // Shared data state — lifted so all views can cross-reference
  const [sharedStories, setSharedStories] = useState<UserStory[]>(STORIES_SEED);
  const [sharedReqs, setSharedReqs] = useState<Req[]>(REQS_SEED as Req[]);
  const [sharedTests, setSharedTests] = useState<UATTest[]>([]);
  const [focusId, setFocusId] = useState('');
  const appDataValue = useMemo(() => ({ stories: sharedStories, reqs: sharedReqs, tests: sharedTests, setStories: setSharedStories, setReqs: setSharedReqs, setTests: setSharedTests, focusId, setFocusId }), [sharedStories, sharedReqs, sharedTests, focusId]);

  return (
    <AppData.Provider value={appDataValue}>
      <AppInner />
    </AppData.Provider>
  );
}

function AppInner() {
  const [route, setRoute] = useState<Route>({ hub: '', section: '' });
  const [settings, setSettings] = useState<DisplaySettings>(DISPLAY_DEFAULTS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [userInitial, setUserInitial] = useState('?');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('relia-display');
    if (saved) { try { setSettings(JSON.parse(saved)); } catch {} }
    setHydrated(true);
    // Try to get real user from Supabase
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? '';
      const name = data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? '';
      const display = name || email;
      if (display) {
        setUserEmail(email);
        setUserInitial(display.charAt(0).toUpperCase());
      }
    });
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
    if (!route.section && hub === 'dev') return <DevDashboard />;
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
      if (route.section === 'stories')      return <UserStoriesView />;
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
          style={{ background: settingsOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, padding:'6px 12px', color: settingsOpen ? '#fff' : 'rgba(255,255,255,0.75)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:12, fontFamily:'var(--font-body)', marginRight:8, transition:'all 0.15s' }}
          title="Display settings"
        >
          <Ic n="settings" size={14} />
          Settings
        </button>
        <div className="nav-avatar" title={userEmail} style={{ cursor:'default' }}>{userInitial}</div>
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
