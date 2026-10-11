export interface Guideline {
  id: string;
  title: string;
  description?: string;
  steps?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
}
