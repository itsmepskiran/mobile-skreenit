import type { FontAwesome6 } from '@/components/scoped';
import type { CandidateRates } from '@/lib/api/service-rates';

// Mobile twin of the web dashboard's "Premium Services" view: one card per paid candidate
// service, each showing its live price from the pricing table.
export type Service = {
  icon: import('react').ComponentProps<typeof FontAwesome6>['name'];
  title: string;
  description: string;
  rate?: keyof CandidateRates;
  href: string;
  note?: string;
};

export const COLORS: Record<string, readonly [string, string]> = {
  'pen-nib': ['#6366f1', '#8b5cf6'],
  'file-contract': ['#0ea5e9', '#06b6d4'],
  'brain': ['#ec4899', '#f43f5e'],
  'video': ['#f59e0b', '#f97316'],
  'chart-line': ['#10b981', '#14b8a6'],
  'tags': ['#8b5cf6', '#d946ef'],
  'coins': ['#eab308', '#f59e0b'],
};

export const SERVICES: Service[] = [
  {
    icon: 'pen-nib',
    title: 'AI Resume Writing',
    description: 'Improve an existing resume or build one from scratch with AI.',
    rate: 'resume_writing',
    note: 'Unlimited with Career Pass.',
    href: '/(candidate)/resume-writing',
  },
  {
    icon: 'file-contract',
    title: 'Employability Report',
    description: "A complete PDF snapshot combining your resume analysis and every assessment you've completed.",
    rate: 'employability_report',
    note: 'Unlimited with Career Pass.',
    href: '/(candidate)/employability-report',
  },
  {
    icon: 'brain',
    title: 'Intro Video Analysis',
    description:
      'Answer an introduction question plus questions drawn from your resume on video, and get a report on your pace, filler words, eye contact, confidence and content.',
    rate: 'video_analysis',
    note: 'Unlimited with Career Pass.',
    href: '/(candidate)/intro-video-analysis',
  },
  {
    icon: 'video',
    title: 'Mock Interview Practice',
    description:
      'Practise with AI-written questions for your target role, answer on video, and get feedback on your speaking, confidence and content. Every interview includes a downloadable report.',
    rate: 'mock_interview',
    href: '/(candidate)/mock-interview',
  },
  {
    icon: 'chart-line',
    title: 'Practice',
    description: 'Every mock interview and intro analysis in one place, with your score trend.',
    href: '/(candidate)/practice',
  },
  {
    icon: 'tags',
    title: 'Plans',
    description: 'Compare Career Pass and the Mock Interview plans side by side.',
    href: '/(candidate)/plans',
  },
  {
    icon: 'coins',
    title: 'My Purchases',
    description: 'See your Career Pass status, coin balance and purchase history — and top up coins or get Career Pass.',
    href: '/(candidate)/my-purchases',
  },
];
