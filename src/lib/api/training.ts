import { apiGet } from '@/lib/api/client';

export interface TrainingMaterial {
  slug: string;
  title: string;
  description?: string | null;
  slide_count?: number;
  video_url?: string | null;
  thumbnail_url?: string | null;
  status?: string;
}

interface TrainingMaterialsResponse {
  ok: boolean;
  data: TrainingMaterial[];
}

export async function listTrainingMaterials(): Promise<TrainingMaterialsResponse> {
  return apiGet<TrainingMaterialsResponse>('/training/materials');
}
