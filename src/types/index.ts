// Shared types for Pipeline Brain CRM

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  source: string | null;
  stage: string;
  value: number | null;
  notes: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Touch {
  id: string;
  leadId: string;
  channel: string;
  summary: string;
  createdAt: string;
}
