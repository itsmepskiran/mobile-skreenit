import type { CertificationEntry, EducationEntry, ExperienceEntry } from '@/lib/api/applicant';

// One flat form-state object spanning all 6 steps — simpler to reason about
// than per-step react-hook-form instances given how many fields there are,
// and it's all submitted in a single POST /applicant/profile call anyway.
export interface WizardValues {
  // Step 1 — Personal
  phone: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  current_address: string;
  current_city: string;
  current_state: string;
  current_country: string;
  sameAsCurrent: boolean;
  permanent_address: string;
  permanent_city: string;
  permanent_state: string;
  permanent_country: string;

  // Step 2 — Professional
  current_salary: string;
  expected_salary: string;
  notice_period_days: string;
  highest_qualification: string;
  linkedin_url: string;
  portfolio_url: string;
  personal_projects: string;
  personal_blogs: string;
  summary: string;

  // Step 3 — Education
  schooling: string;
  schooling_year: string;
  schooling_percentage: string;
  pre_university: string;
  pre_university_year: string;
  pre_university_percentage: string;
  graduation: string;
  graduation_year: string;
  graduation_percentage: string;
  post_graduation: string;
  post_graduation_year: string;
  post_graduation_percentage: string;
  education: EducationEntry[];
  certifications: CertificationEntry[];

  // Step 4 — Skills & Languages
  skills: string[];
  spoken_languages: string[];

  // Step 5 — Experience
  current_company: string;
  current_designation: string;
  current_doj: string;
  current_dol: string;
  experience: ExperienceEntry[];
}

export const EMPTY_WIZARD_VALUES: WizardValues = {
  phone: '',
  date_of_birth: '',
  gender: '',
  marital_status: '',
  current_address: '',
  current_city: '',
  current_state: '',
  current_country: '',
  sameAsCurrent: false,
  permanent_address: '',
  permanent_city: '',
  permanent_state: '',
  permanent_country: '',
  current_salary: '',
  expected_salary: '',
  notice_period_days: '',
  highest_qualification: '',
  linkedin_url: '',
  portfolio_url: '',
  personal_projects: '',
  personal_blogs: '',
  summary: '',
  schooling: '',
  schooling_year: '',
  schooling_percentage: '',
  pre_university: '',
  pre_university_year: '',
  pre_university_percentage: '',
  graduation: '',
  graduation_year: '',
  graduation_percentage: '',
  post_graduation: '',
  post_graduation_year: '',
  post_graduation_percentage: '',
  education: [],
  certifications: [],
  skills: [],
  spoken_languages: ['english'],
  current_company: '',
  current_designation: '',
  current_doj: '',
  current_dol: '',
  experience: [],
};

export interface StepProps {
  values: WizardValues;
  setValue: <K extends keyof WizardValues>(key: K, value: WizardValues[K]) => void;
}

export const LANGUAGE_OPTIONS = ['english', 'hindi', 'kannada', 'tamil', 'telugu', 'marathi'];

export const QUALIFICATION_OPTIONS = [
  { label: 'High School (10th)', value: 'high-school' },
  { label: 'Pre-University (12th/PUC)', value: 'pre-university' },
  { label: 'Diploma', value: 'diploma' },
  { label: "Bachelor's Degree", value: 'bachelors' },
  { label: "Master's Degree/PG", value: 'masters' },
  { label: 'PhD/Doctorate', value: 'phd' },
];

export const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

export const MARITAL_STATUS_OPTIONS = [
  { label: 'Single', value: 'single' },
  { label: 'Married', value: 'married' },
  { label: 'Divorced', value: 'divorced' },
  { label: 'Widowed', value: 'widowed' },
];

export const NOTICE_PERIOD_OPTIONS = [
  { label: 'Immediate Joiner', value: '0' },
  { label: '15 Days', value: '15' },
  { label: '30 Days', value: '30' },
  { label: '60 Days', value: '60' },
  { label: '90 Days', value: '90' },
  { label: '120+ Days', value: '120' },
];
