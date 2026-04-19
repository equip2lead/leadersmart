// LeaderSmart database types
// Matches the schema in Supabase project oisrzurefglwiaeqedyp

export type UserRole = 'senior_pastor' | 'pastor' | 'department_leader' | 'admin';
export type AppLanguage = 'en' | 'fr';
export type AssignmentStatus = 'upcoming' | 'active' | 'completed';
export type ScheduleStatus = 'draft' | 'published';
export type ConfirmationResponse = 'pending' | 'yes' | 'no';
export type CheckinStatus = 'active' | 'picked_up' | 'emergency';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
export type OverallRecommendation = 'excellent' | 'good' | 'needs_improvement';
export type TaskCategory =
  | 'leadership'
  | 'senior_leadership'
  | 'department_oversight'
  | 'spiritual_followup'
  | 'communication'
  | 'service_organization'
  | 'evangelism'
  | 'report_clarity';

export interface Church {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  language: AppLanguage;
  timezone: string;
  currency: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  church_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  role: UserRole;
  preferred_language: AppLanguage;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  church_id: string;
  name: string;
  icon: string | null;
  description: string | null;
  leader_user_id: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  department_id: string;
  full_name: string;
  phone: string;
  photo_url: string | null;
  role_in_team: string | null;
  joined_date: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PastorAssignment {
  id: string;
  church_id: string;
  pastor_user_id: string;
  assignment_month: string;
  status: AssignmentStatus;
  handover_to_user_id: string | null;
  handover_acknowledged_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SundayChecklist {
  id: string;
  pastor_assignment_id: string;
  service_date: string;
  items_checked: Record<string, boolean>;
  attendance_count: number | null;
  new_visitors_count: number | null;
  offering_total: number | null;
  issues_text: string | null;
  photo_urls: string[];
  is_draft: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyExecutionTask {
  id: string;
  pastor_assignment_id: string;
  week_number: number;
  task_text: string;
  task_description: string | null;
  category: TaskCategory;
  is_complete: boolean;
  completed_at: string | null;
  notes: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyReport {
  id: string;
  pastor_assignment_id: string;
  criterion_1_data: Record<string, unknown>;
  criterion_2_data: Record<string, unknown>;
  criterion_3_data: Record<string, unknown>;
  criterion_4_data: Record<string, unknown>;
  criterion_5_data: Record<string, unknown>;
  criterion_6_data: Record<string, unknown>;
  criterion_7_data: Record<string, unknown>;
  criterion_8_data: Record<string, unknown>;
  financial_summary: Record<string, unknown>;
  recommendations: string | null;
  handover_notes: string | null;
  supporting_documents: string[];
  is_draft: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  pastor_assignment_id: string;
  evaluator_user_id: string;
  ratings: Record<string, number>;
  criterion_comments: Record<string, string>;
  strengths_text: string | null;
  development_areas_text: string | null;
  action_plan_text: string | null;
  overall_score: number | null;
  overall_recommendation: OverallRecommendation | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}
