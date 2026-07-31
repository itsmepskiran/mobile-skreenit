import type { ComponentProps } from 'react';
import type { FontAwesome6 } from '@expo/vector-icons';

import type { CatalogEntry } from '@/lib/api/assessments';

type IconName = ComponentProps<typeof FontAwesome6>['name'];

// Shapes the Browse Assessments screen and dashboard renders. Populated at runtime
// from GET /premium/catalog (see getAssessmentCatalog() + buildCatalog() below) —
// nothing is hardcoded here anymore. Matches sql-skreenit/dashboard/js/premium-features.js,
// which reads the same pricing_plans-backed endpoint.
export interface IndustryPack {
  value: string;
  label: string;
  icon: IconName;
  color: string;
  bg: string;
  count: number;
  desc: string;
}

export interface CatalogItem {
  id: string;
  industry: string;
  industryLabel: string;
  name: string;
  desc: string;
  skills: string;
}

// pricing_plans.icon_class stores a FontAwesome *web* class, e.g. "fas fa-laptop-code"
// or "fab fa-react" — FontAwesome6 (the RN icon set used here) wants just "laptop-code"
// / "react", so strip the style prefix ("fas"/"far"/"fab"/...) and the leading "fa-".
function toIconName(iconClass: string | null | undefined): IconName | undefined {
  if (!iconClass) return undefined;
  const last = iconClass.trim().split(/\s+/).pop();
  if (!last) return undefined;
  return last.replace(/^fa-/, '') as IconName;
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
}

export function buildCatalog(byIndustry: Record<string, CatalogEntry[]>): {
  catalogData: CatalogItem[];
  industryPacks: IndustryPack[];
} {
  const catalogData: CatalogItem[] = [];
  const industryPacks: IndustryPack[] = [];

  for (const [industryLabel, items] of Object.entries(byIndustry)) {
    if (industryLabel === 'General') continue; // free/general assessments render separately

    const individual = items.filter((i) => i.service_type === 'applicant_plan');
    const bundle = items.find((i) => i.service_type === 'assessment_bundle');
    const industryKey = bundle?.industry_key || individual[0]?.industry_key || slugify(industryLabel);

    individual.forEach((item) => {
      catalogData.push({
        id: item.service_key,
        industry: industryKey,
        industryLabel,
        name: item.name,
        desc: item.description ?? '',
        skills: item.skills_measured ?? '',
      });
    });

    if (bundle && individual.length) {
      industryPacks.push({
        value: industryKey,
        label: industryLabel,
        icon: toIconName(bundle.icon_class) ?? 'briefcase',
        color: bundle.icon_color ?? '#6366f1',
        bg: bundle.icon_bg ?? '#f1f5f9',
        count: individual.length,
        desc: bundle.description ?? '',
      });
    }
  }

  return { catalogData, industryPacks };
}
