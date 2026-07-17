import type { ComponentProps } from 'react';
import type { FontAwesome6 } from '@expo/vector-icons';

import type { ActiveSubscription } from '@/lib/api/subscription';

type IconName = ComponentProps<typeof FontAwesome6>['name'];

// Ported from sql-skreenit/dashboard/js/premium-features.js (catalogData +
// industryPacks) so the mobile Browse Assessments screen matches the real
// web app's industry-filtered catalog. Both the 58 individual tests AND the
// 12 bundle packs are real, separately purchasable `pricing_plans` rows —
// individual tests use service_type='applicant_plan' with `dbId` as the
// actual plan id (see mac-skreenit pricing_plans table), bundles use
// service_type='assessment_bundle' with `planId` (see migration 014).
export interface IndustryPack {
  value: string;
  label: string;
  icon: IconName;
  color: string;
  bg: string;
  count: number;
  price: number;
  planId: string;
  desc: string;
}

export interface CatalogItem {
  id: string;
  dbId: string;
  industry: string;
  industryLabel: string;
  name: string;
  desc: string;
  skills: string;
  price: number;
}

export const INDUSTRIES: IndustryPack[] = [
  { value: 'it', label: 'IT & Software', icon: 'laptop-code', color: '#dc2626', bg: '#fee2e2', count: 8, price: 299, planId: 'SINBDLIT_001', desc: 'Coding, Algorithms, Debugging, System Design, SQL, React, JS & more' },
  { value: 'bpo', label: 'BPO / Customer Support', icon: 'headset', color: '#0284c7', bg: '#dbeafe', count: 6, price: 199, planId: 'SINBDLBPO001', desc: 'Versant Pro, Accent Neutralization, Customer Handling, Objection Handling & more' },
  { value: 'finance', label: 'Banking & Finance', icon: 'building-columns', color: '#0369a1', bg: '#e0f2fe', count: 6, price: 149, planId: 'SINBDLFIN001', desc: 'Financial Reasoning, KYC/AML, RM Simulation, Insurance Knowledge & more' },
  { value: 'sales', label: 'Sales & Marketing', icon: 'chart-line', color: '#ca8a04', bg: '#fef9c3', count: 6, price: 169, planId: 'SINBDLSAL001', desc: 'Sales Pitch, Objection Handling, Digital Marketing MCQ, Lead Conversion & more' },
  { value: 'healthcare', label: 'Healthcare', icon: 'heart-pulse', color: '#dc2626', bg: '#fee2e2', count: 4, price: 119, planId: 'SINBDLHC_001', desc: 'Medical Terminology, Patient Communication, Ethics, Case Handling' },
  { value: 'retail', label: 'Retail & Hospitality', icon: 'bell-concierge', color: '#7e22ce', bg: '#f3e8ff', count: 4, price: 119, planId: 'SINBDLRET001', desc: 'Customer Interaction Video, Service Etiquette, Complaint Handling, POS Knowledge' },
  { value: 'manufacturing', label: 'Manufacturing', icon: 'industry', color: '#475569', bg: '#f1f5f9', count: 4, price: 99, planId: 'SINBDLMFG001', desc: 'Safety Compliance, Process Understanding, Machine Operation, Quality Control' },
  { value: 'logistics', label: 'Logistics & Supply Chain', icon: 'truck', color: '#c2410c', bg: '#ffedd5', count: 4, price: 99, planId: 'SINBDLLOG001', desc: 'Inventory Management, Route Optimization, Warehouse Safety, Documentation' },
  { value: 'telecom', label: 'Telecom', icon: 'tower-broadcast', color: '#4338ca', bg: '#e0e7ff', count: 4, price: 99, planId: 'SINBDLTEL001', desc: 'Network Basics, Troubleshooting Simulation, Tech Support, Field Safety' },
  { value: 'aviation', label: 'Aviation', icon: 'plane', color: '#0369a1', bg: '#e0f2fe', count: 4, price: 119, planId: 'SINBDLAV_001', desc: 'Cabin Crew Communication, Safety Protocol, Passenger Handling, Terminology' },
  { value: 'construction', label: 'Construction', icon: 'hard-hat', color: '#ca8a04', bg: '#fef3c7', count: 4, price: 99, planId: 'SINBDLCON001', desc: 'Site Safety, Blueprint Reading, Material Knowledge, Project Coordination' },
  { value: 'education', label: 'Education & Training', icon: 'chalkboard-user', color: '#7e22ce', bg: '#f3e8ff', count: 4, price: 119, planId: 'SINBDLEDU001', desc: 'Teaching Demo Video, Subject Knowledge, Classroom Management, Delivery' },
];

export const CATALOG: CatalogItem[] = [
  // IT & Software
  { id: 'it_adv_coding', dbId: 'SINIT_26060301', industry: 'it', industryLabel: 'IT & Software', name: 'Advanced Coding Challenge', desc: 'Evaluates hands-on programming ability through medium- to high-difficulty coding problems similar to real software engineering hiring screens.', skills: 'Data structures, algorithms, code correctness, optimization, complexity awareness.', price: 59 },
  { id: 'it_algorithmic_thinking', dbId: 'SINIT_26060302', industry: 'it', industryLabel: 'IT & Software', name: 'Algorithmic Thinking Test', desc: 'Measures how well a candidate reasons through computational problems before or alongside writing code.', skills: 'Recursion, dynamic programming, greedy logic, graph reasoning, pattern recognition.', price: 45 },
  { id: 'it_debugging', dbId: 'SINIT_26060303', industry: 'it', industryLabel: 'IT & Software', name: 'Debugging Simulator', desc: 'Evaluates how effectively a candidate can identify, analyze, and fix issues in existing code.', skills: 'Bug detection, runtime error diagnosis, code reading, execution tracing.', price: 49 },
  { id: 'it_system_design_lite', dbId: 'SINIT_26060304', industry: 'it', industryLabel: 'IT & Software', name: 'System Design Lite', desc: 'Beginner-friendly assessment for evaluating foundational low-level software design ability.', skills: 'Object-oriented design, class relationships, modular thinking, APIs, clean structures.', price: 79 },
  { id: 'it_system_design_pro', dbId: 'SINIT_26060305', industry: 'it', industryLabel: 'IT & Software', name: 'System Design Pro', desc: 'Evaluates whether a candidate can design scalable, reliable, and efficient production-grade systems.', skills: 'Service decomposition, database selection, caching, load balancing, fault tolerance.', price: 119 },
  { id: 'it_sql_pro', dbId: 'SINIT_26060306', industry: 'it', industryLabel: 'IT & Software', name: 'SQL Query Pro Test', desc: 'Evaluates practical SQL ability using real-world relational database tasks.', skills: 'SELECT queries, joins, filtering, aggregation, subqueries, window functions.', price: 45 },
  { id: 'it_react_skills', dbId: 'SINIT_26060307', industry: 'it', industryLabel: 'IT & Software', name: 'React Skills Test', desc: 'Measures practical front-end development ability within the React ecosystem.', skills: 'Components, props, state, hooks, routing, form handling, API integration.', price: 39 },
  { id: 'it_js_pro', dbId: 'SINIT_26060308', industry: 'it', industryLabel: 'IT & Software', name: 'JavaScript Pro Challenge', desc: 'Measures deep JavaScript proficiency beyond basic syntax structures.', skills: 'Closures, scope, hoisting, prototypes, promises, async loop orchestration.', price: 29 },
  // BPO / Customer Support
  { id: 'bpo_versant_pro', dbId: 'SINBPO26060309', industry: 'bpo', industryLabel: 'BPO / Customer Support', name: 'Versant Pro Test', desc: 'Evaluates spoken English proficiency for customer-facing voice roles.', skills: 'Speaking, listening, pronunciation, fluency, reading comprehension.', price: 59 },
  { id: 'bpo_accent_neutral', dbId: 'SINBPO26060310', industry: 'bpo', industryLabel: 'BPO / Customer Support', name: 'Accent Neutralization Trainer', desc: 'Helps assess how clearly a candidate can neutralize regional influence in speech frameworks.', skills: 'Pronunciation clarity, stress patterns, pacing, articulation, accent adaptability.', price: 39 },
  { id: 'bpo_cust_handling', dbId: 'SINBPO26060311', industry: 'bpo', industryLabel: 'BPO / Customer Support', name: 'Customer Handling Simulation', desc: 'Evaluates how candidates respond to difficult customer situations in realistic service scenarios.', skills: 'Empathy, listening, de-escalation, problem solving, policy-based communication.', price: 75 },
  { id: 'bpo_objection_handling', dbId: 'SINBPO26060312', industry: 'bpo', industryLabel: 'BPO / Customer Support', name: 'Objection Handling Test', desc: 'Measures how effectively a candidate can address and overcome customer objections during live interactions.', skills: 'Persuasion, composure, active listening, rebuttal quality, confidence parameters.', price: 39 },
  { id: 'bpo_chat_email_etiquette', dbId: 'SINBPO26060313', industry: 'bpo', industryLabel: 'BPO / Customer Support', name: 'Chat & Email Etiquette Test', desc: 'Evaluates written communication quality in digital customer service channels.', skills: 'Grammar, tone, clarity, sentence structure, professional digital etiquette.', price: 29 },
  { id: 'bpo_call_quality', dbId: 'SINBPO26060314', industry: 'bpo', industryLabel: 'BPO / Customer Support', name: 'Call Quality Scorecard', desc: 'Scorecard-based assessment measures the quality of customer interactions in voice-based support roles.', skills: 'Empathy, clarity, call control, issue resolution, adherence to service standards.', price: 55 },
  // Banking & Finance
  { id: 'fin_reasoning', dbId: 'SINFIN26060315', industry: 'finance', industryLabel: 'Banking & Finance', name: 'Financial Reasoning Test', desc: "Measures a candidate's ability to interpret and solve finance-related numerical problems.", skills: 'EMI calculation, interest computation, ratios, percentages, financial decisions.', price: 29 },
  { id: 'fin_awareness', dbId: 'SINFIN26060316', industry: 'finance', industryLabel: 'Banking & Finance', name: 'Banking Awareness Test', desc: 'Evaluates awareness of essential banking concepts, institutions, and regulatory frameworks.', skills: 'RBI guidelines, NBFC concepts, KYC norms, banking products, sector terminology.', price: 29 },
  { id: 'fin_kyc_aml', dbId: 'SINFIN26060317', industry: 'finance', industryLabel: 'Banking & Finance', name: 'KYC/AML Compliance Test', desc: 'Measures understanding of compliance processes used to prevent fraud, money laundering, and identity risks.', skills: 'KYC verification, AML red flags, suspicious activity identification, compliance judgment.', price: 39 },
  { id: 'fin_rm_simulation', dbId: 'SINFIN26060318', industry: 'finance', industryLabel: 'Banking & Finance', name: 'Relationship Manager Simulation', desc: 'Evaluates how well a candidate manages client relationships while identifying relevant product opportunities.', skills: 'Customer profiling, needs analysis, cross-selling, financial conversation, trust building.', price: 75 },
  { id: 'fin_integrity', dbId: 'SINFIN26060319', industry: 'finance', industryLabel: 'Banking & Finance', name: 'Financial Integrity Test', desc: 'Evaluates ethical judgment and trustworthiness in finance-sensitive operational environments.', skills: 'Integrity levels, compliance metrics, conflict-of-interest indicators, ethics validation.', price: 29 },
  { id: 'fin_insurance_product', dbId: 'SINFIN26060320', industry: 'finance', industryLabel: 'Banking & Finance', name: 'Insurance Product Knowledge Test', desc: 'Measures understanding of common insurance products and customer suitability considerations.', skills: 'Life insurance, health insurance, policy structures, benefits, exclusions, customer-fit.', price: 29 },
  // Sales & Marketing
  { id: 'sales_video_pitch', dbId: 'SINSAL26060321', industry: 'sales', industryLabel: 'Sales & Marketing', name: 'Sales Pitch Video Analyzer', desc: 'Evaluates how effectively a candidate presents and delivers a sales pitch in a simulated format.', skills: 'Persuasion, verbal clarity, product positioning, confidence, structural stability.', price: 75 },
  { id: 'sales_objection_sim', dbId: 'SINSAL26060322', industry: 'sales', industryLabel: 'Sales & Marketing', name: 'Objection Handling Simulator', desc: 'Tests how well a candidate handles buyer concerns and resistance during the sales process.', skills: 'Rebuttal quality, confidence, negotiation, active listening, value articulation.', price: 39 },
  { id: 'sales_creativity', dbId: 'SINSAL26060323', industry: 'sales', industryLabel: 'Sales & Marketing', name: 'Marketing Creativity Challenge', desc: 'Evaluates creative thinking in brand messaging and campaign idea generation tasks.', skills: 'Ad copy writing, slogan creation, campaign creativity, originality, audience metrics.', price: 29 },
  { id: 'sales_digital_mcq', dbId: 'SINSAL26060324', industry: 'sales', industryLabel: 'Sales & Marketing', name: 'Digital Marketing MCQ Pro', desc: 'Evaluates knowledge of core digital marketing concepts and channel tracking strategies.', skills: 'SEO, SEM, social media metrics, paid campaigns, web analytic funnels.', price: 29 },
  { id: 'sales_lead_conv', dbId: 'SINSAL26060325', industry: 'sales', industryLabel: 'Sales & Marketing', name: 'Lead Conversion Simulation', desc: 'Measures how effectively a candidate converts interest into qualified sales opportunities.', skills: 'Lead qualification, persuasion, need discovery, follow-up logic, closing alignment.', price: 59 },
  { id: 'sales_empathy', dbId: 'SINSAL26060326', industry: 'sales', industryLabel: 'Sales & Marketing', name: 'Customer Empathy Test', desc: 'Evaluates how well a candidate understands customer perspective and emotional cues.', skills: 'Emotional intelligence, listening validation, patience thresholds, situational matching.', price: 29 },
  // Healthcare
  { id: 'hc_terminology', dbId: 'SINHC_26060327', industry: 'healthcare', industryLabel: 'Healthcare', name: 'Medical Terminology Test', desc: "Evaluates a candidate's understanding of essential medical and clinical vocabulary parameters.", skills: 'Medical terminology, abbreviations, anatomy-related terms, application accuracy.', price: 29 },
  { id: 'hc_communication', dbId: 'SINHC_26060328', industry: 'healthcare', industryLabel: 'Healthcare', name: 'Patient Communication Assessment', desc: 'Measures how effectively a candidate communicates with patients in sensitive care settings.', skills: 'Empathy, clarity, reassurance, listening accuracy, respectful communication layers.', price: 59 },
  { id: 'hc_ethics', dbId: 'SINHC_26060329', industry: 'healthcare', industryLabel: 'Healthcare', name: 'Healthcare Ethics Test', desc: 'Evaluates ethical decision-making in healthcare-related structural situations.', skills: 'Confidentiality rules, consent awareness, patient rights, compliance metrics.', price: 29 },
  { id: 'hc_case_handling', dbId: 'SINHC_26060330', industry: 'healthcare', industryLabel: 'Healthcare', name: 'Case Handling Simulation', desc: 'Assesses how candidates respond to realistic patient-care scenarios requiring judgment and communication.', skills: 'Situation monitoring, prioritization algorithms, empathy vectors, coordination actions.', price: 59 },
  // Retail & Hospitality
  { id: 'retail_video_test', dbId: 'SINRET26060331', industry: 'retail', industryLabel: 'Retail & Hospitality', name: 'Customer Interaction Video Test', desc: 'Evaluates service behavior and communication style in customer-facing retail and hospitality environments.', skills: 'Greeting etiquette, service orientation, posture, attentiveness, interaction metrics.', price: 59 },
  { id: 'retail_etiquette', dbId: 'SINRET26060332', industry: 'retail', industryLabel: 'Retail & Hospitality', name: 'Service Etiquette Test', desc: 'Measures professional etiquette and service standards in hospitality-oriented environments.', skills: 'Grooming awareness, politeness thresholds, situational conduct, standard protocol.', price: 29 },
  { id: 'retail_complaint', dbId: 'SINRET26060333', industry: 'retail', industryLabel: 'Retail & Hospitality', name: 'Complaint Handling Simulation', desc: 'Evaluates how candidates manage unhappy customers while protecting service quality benchmarks.', skills: 'De-escalation mechanics, patience testing, problem mapping, brand restoration.', price: 59 },
  { id: 'retail_pos_knowledge', dbId: 'SINRET26060334', industry: 'retail', industryLabel: 'Retail & Hospitality', name: 'POS System Knowledge Test', desc: 'Measures familiarity with basic point-of-sale operations used in retail environments.', skills: 'Billing operations, data routing, return parsing, transaction logs accuracy.', price: 29 },
  // Manufacturing
  { id: 'mfg_safety', dbId: 'SINMFG26060335', industry: 'manufacturing', industryLabel: 'Manufacturing', name: 'Safety Compliance Test', desc: 'Evaluates understanding of essential workplace safety practices in manufacturing environments.', skills: 'Hazard identification, PPE metrics, safe handling pathways, accident avoidance logic.', price: 29 },
  { id: 'mfg_process', dbId: 'SINMFG26060336', industry: 'manufacturing', industryLabel: 'Manufacturing', name: 'Process Understanding Test', desc: 'Measures how well a candidate understands standard operating procedures and workflow discipline.', skills: 'SOP tracking precision, checklist execution, procedural sequence mapping.', price: 29 },
  { id: 'mfg_machine_op', dbId: 'SINMFG26060337', industry: 'manufacturing', industryLabel: 'Manufacturing', name: 'Machine Operation Knowledge Test', desc: 'Evaluates knowledge of basic machine operation principles used in industrial settings.', skills: 'Equipment verification, tolerance baselines, component instrumentation metrics.', price: 29 },
  { id: 'mfg_qc', dbId: 'SINMFG26060338', industry: 'manufacturing', industryLabel: 'Manufacturing', name: 'Quality Control Assessment', desc: "Measures a candidate's ability to identify quality issues and maintain production standards.", skills: 'Defect discovery analytics, inspection logic, structural attention to detail parameters.', price: 39 },
  // Logistics & Supply Chain
  { id: 'log_inventory', dbId: 'SINLOG26060339', industry: 'logistics', industryLabel: 'Logistics & Supply Chain', name: 'Inventory Management Test', desc: 'Evaluates how well a candidate understands stock control and inventory accuracy principles.', skills: 'Stock tracking structures, auditing logs, verification precision, variance checks.', price: 29 },
  { id: 'log_route', dbId: 'SINLOG26060340', industry: 'logistics', industryLabel: 'Logistics & Supply Chain', name: 'Route Optimization Test', desc: "Measures a candidate's ability to plan efficient delivery or travel routes matrix.", skills: 'Time calculation variables, sequence mapping allocation, route resource control.', price: 29 },
  { id: 'log_safety', dbId: 'SINLOG26060341', industry: 'logistics', industryLabel: 'Logistics & Supply Chain', name: 'Warehouse Safety Test', desc: 'Evaluates awareness of safety practices required in warehouses and distribution centers.', skills: 'Material distribution layouts, forklift perimeter guidelines, safe load balancing.', price: 29 },
  { id: 'log_documentation', dbId: 'SINLOG26060342', industry: 'logistics', industryLabel: 'Logistics & Supply Chain', name: 'Documentation Accuracy Test', desc: 'Measures how accurately a candidate handles shipment and logistics documentation pipelines.', skills: 'Form verification loops, compliance scanning, data line discrepancy mapping.', price: 29 },
  // Telecom
  { id: 'tel_network', dbId: 'SINTEL26060343', industry: 'telecom', industryLabel: 'Telecom', name: 'Network Basics Test', desc: 'Evaluates foundational knowledge of telecom networking concepts architecture.', skills: 'IP configurations, packet routing, architectural layer metrics, standard gateway nodes.', price: 29 },
  { id: 'tel_troubleshoot', dbId: 'SINTEL26060344', industry: 'telecom', industryLabel: 'Telecom', name: 'Troubleshooting Simulation', desc: 'Assesses how effectively a candidate diagnoses and resolves telecom-related issues.', skills: 'Root-cause diagnostics, network loop analysis, topology defect structural mapping.', price: 39 },
  { id: 'tel_tech_support', dbId: 'SINTEL26060345', industry: 'telecom', industryLabel: 'Telecom', name: 'Customer Tech Support Test', desc: "Evaluates a candidate's ability to support customers with technical telecom queries.", skills: 'Technical routing diagnostics translation, step explanation sequences.', price: 29 },
  { id: 'tel_field_safety', dbId: 'SINTEL26060346', industry: 'telecom', industryLabel: 'Telecom', name: 'Field Operations Safety Test', desc: 'Measures safety awareness for technicians working in on-site telecom field configurations.', skills: 'High-elevation safe routines, line management checks, current safety loops.', price: 29 },
  // Aviation
  { id: 'av_cabin_comm', dbId: 'SINAV_26060347', industry: 'aviation', industryLabel: 'Aviation', name: 'Cabin Crew Communication Test', desc: 'Evaluates communication quality and service readiness for cabin crew and passenger-facing aviation roles.', skills: 'Verbal parsing accuracy, flight management etiquette, structural composure loops.', price: 59 },
  { id: 'av_safety', dbId: 'SINAV_26060348', industry: 'aviation', industryLabel: 'Aviation', name: 'Safety Protocol Test', desc: 'Measures understanding of aviation safety rules and emergency response fundamentals.', skills: 'Emergency systems allocation, cabin depressurization rules, evacuation mapping.', price: 29 },
  { id: 'av_passenger', dbId: 'SINAV_26060349', industry: 'aviation', industryLabel: 'Aviation', name: 'Passenger Handling Simulation', desc: 'Evaluates how candidates respond to difficult passenger situations while maintaining service standards.', skills: 'Conflict diversion mapping, disruption routing responses, cabin service guidelines.', price: 59 },
  { id: 'av_terminology', dbId: 'SINAV_26060350', industry: 'aviation', industryLabel: 'Aviation', name: 'Aviation Terminology Test', desc: 'Measures familiarity with commonly used aviation terms, abbreviations, and operational language.', skills: 'IATA/ICAO tracking protocols, structural code designations, jargon parsing.', price: 29 },
  // Construction
  { id: 'con_site_safety', dbId: 'SINCON26060351', industry: 'construction', industryLabel: 'Construction', name: 'Site Safety Test', desc: 'Evaluates knowledge of essential construction-site safety practices.', skills: 'OSHA baseline configurations, hazard containment, fall-protection structures.', price: 29 },
  { id: 'con_blueprint', dbId: 'SINCON26060352', industry: 'construction', industryLabel: 'Construction', name: 'Blueprint Reading Test', desc: 'Measures how well a candidate can interpret engineering drawings and construction plans.', skills: 'Geometric tolerance maps, layout reading accuracy, symbol allocation indexing.', price: 39 },
  { id: 'con_material', dbId: 'SINCON26060353', industry: 'construction', industryLabel: 'Construction', name: 'Material Knowledge Test', desc: 'Evaluates familiarity with key construction materials and their basic use cases.', skills: 'Stress tolerance grading tracking, concrete hydration ratios, material selection.', price: 29 },
  { id: 'con_project_coord', dbId: 'SINCON26060354', industry: 'construction', industryLabel: 'Construction', name: 'Project Coordination Assessment', desc: 'Measures how effectively a candidate coordinates tasks, timelines, and communication on construction projects.', skills: 'Critical path calculations, material dispatch scheduling, site timeline control.', price: 39 },
  // Education & Training
  { id: 'edu_teaching_demo', dbId: 'SINEDU26060355', industry: 'education', industryLabel: 'Education & Training', name: 'Teaching Demo Video Analysis', desc: 'Evaluates teaching delivery quality through demo-based presentation analysis frameworks.', skills: 'Concept parsing, articulation cadence, class retention management hooks.', price: 59 },
  { id: 'edu_subject_knowledge', dbId: 'SINEDU26060356', industry: 'education', industryLabel: 'Education & Training', name: 'Subject Knowledge Test', desc: "Measures a candidate's command over the subject area they are expected to teach or train.", skills: 'Conceptual parsing depth, structural academic domain validation variables.', price: 29 },
  { id: 'edu_classroom_mgmt', dbId: 'SINEDU26060357', industry: 'education', industryLabel: 'Education & Training', name: 'Classroom Management Test', desc: 'Evaluates how well a candidate can maintain order, engagement, and discipline in a learning environment.', skills: 'Behavior optimization paths, focus metrics tracking, disruption isolation strategies.', price: 29 },
  { id: 'edu_delivery', dbId: 'SINEDU26060358', industry: 'education', industryLabel: 'Education & Training', name: 'Communication & Delivery Assessment', desc: 'Measures how effectively a candidate communicates ideas during instruction or training delivery.', skills: 'Cadence control, dynamic feedback listening metrics, structural concept breakdown.', price: 39 },
];

export interface SubscribedAssessment extends CatalogItem {
  subscriptionId: string;
  planName: string;
  status: string;
  expiryDate: string | null;
}

function parseFeatureKeys(features: ActiveSubscription['features']): string[] {
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Ported from sql-skreenit/dashboard/js/candidate-dashboard.js's renderAssessments():
// each active/trial subscription unlocks either one assessment directly (an
// individual test purchase) or a whole industry pack's worth (a bundle
// purchase) — expand and dedupe both into the catalog items they unlock.
//
// Individual purchases are matched on plan_id (pricing_plans' primary key),
// NOT service_key: live backend data has several individual plans whose
// service_key doesn't match this catalog's naming (e.g. DB has
// "it_algorithmic"/"it_sys_design_lite", catalog has
// "it_algorithmic_thinking"/"it_system_design_lite") while plan_id — what
// create-order/create-subscription actually key off — always lines up with
// dbId. Bundle purchases' `features` array does use this catalog's naming
// (verified against the live pricing_plans rows), so those still resolve by key.
export function resolveSubscribedAssessments(subscriptions: ActiveSubscription[]): SubscribedAssessment[] {
  const byId = new Map(CATALOG.map((item) => [item.id, item]));
  const byDbId = new Map(CATALOG.map((item) => [item.dbId, item]));
  const resolved = new Map<string, SubscribedAssessment>();

  const add = (item: CatalogItem | undefined, sub: ActiveSubscription) => {
    if (!item || resolved.has(item.id)) return;
    resolved.set(item.id, {
      ...item,
      subscriptionId: sub.subscription_id,
      planName: sub.plan_name,
      status: sub.status,
      expiryDate: sub.expiry_date,
    });
  };

  for (const sub of subscriptions) {
    for (const key of parseFeatureKeys(sub.features)) {
      add(byId.get(key), sub);
    }
    add(byDbId.get(sub.plan_id), sub);
  }

  return Array.from(resolved.values());
}
