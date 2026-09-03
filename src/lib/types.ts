// LeaderSmart database types
// Matches the schema in Supabase project oisrzurefglwiaeqedyp

// Role naming lives at two layers:
//   - Legacy: 'senior_pastor' | 'pastor' | 'department_leader' | 'admin'
//   - Current: 'owner' | 'admin_pastor' | 'department_head' | 'fire_kids_coordinator'
// The DB enum carries all eight values during Phase 2 transition. Every
// existing user was migrated to a current-name value; the legacy names
// remain in the enum only so a rollback path exists (dropped in a later
// cleanup migration). Auth checks group both via ADMIN_ROLES etc. in
// src/lib/roles.ts — do not gate on individual role strings elsewhere.
export type UserRole =
  | 'owner'
  | 'admin_pastor'
  | 'department_head'
  | 'fire_kids_coordinator'
  | 'senior_pastor'
  | 'pastor'
  | 'department_leader'
  | 'admin';
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

// Churches and ministries share one table and one wizard; this decides
// which vocabulary and which steps a tenant sees. Column added in Phase 2,
// defaults to 'church' so pre-split tenants keep their behaviour.
export type OrganizationType = 'church' | 'ministry';

export interface Church {
  id: string;
  name: string;
  organization_type: OrganizationType;
  country: string | null;
  city: string | null;
  language: AppLanguage;
  timezone: string;
  currency: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  church_id: string;
  name: string;
  /** ISO 3166-1 alpha-2, matching src/lib/countries.ts. */
  country_code: string;
  city: string | null;
  /** At most one per church — enforced by the branches_hq_uniq index. */
  is_headquarters: boolean;
  coordinator_user_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Zone {
  id: string;
  /** Tenancy is reached through the parent branch, which carries church_id. */
  branch_id: string;
  name: string;
  coordinator_user_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Fixed 5-level development programme; current_level is CHECKed 1..5. */
export const LEADER_LEVELS = [1, 2, 3, 4, 5] as const;
export const MAX_LEADER_LEVEL = 5;

export interface LeaderDevelopment {
  id: string;
  church_id: string;
  user_id: string;
  current_level: number;
  started_at: string;
  last_level_change_at: string;
  /** Soft removal — the row stays for history. */
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type MaterialType = 'book' | 'course' | 'video' | 'article' | 'other';
export const MATERIAL_TYPES: MaterialType[] = [
  'book',
  'course',
  'video',
  'article',
  'other',
];

export type RequirementType = 'competency' | 'material' | 'milestone';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';
export const PROGRESS_STATUSES: ProgressStatus[] = [
  'not_started',
  'in_progress',
  'completed',
];

export interface LevelDefinition {
  id: string;
  church_id: string;
  level: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface LevelCompetency {
  id: string;
  level_definition_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface LevelMaterial {
  id: string;
  level_definition_id: string;
  title: string;
  material_type: MaterialType;
  url: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface LevelMilestone {
  id: string;
  level_definition_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface LeaderProgress {
  id: string;
  leader_development_id: string;
  requirement_type: RequirementType;
  /** Polymorphic — points at a competency, material or milestone, so it
      carries no FK. AFTER DELETE triggers on those tables clean up. */
  requirement_id: string;
  status: ProgressStatus;
  completed_at: string | null;
  notes: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'needs_review';

/** The five narrative sections of a branch's monthly report. Deliberately
    about execution and coordination — not congregation attendance or
    giving, which is ChurchSmart's domain. */
export const REPORT_SECTIONS = [
  'activities',
  'leadership_updates',
  'wins',
  'challenges',
  'prayer_requests',
] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

export const REPORT_SECTION_MAX = 2000;
export const REPORT_SECTION_WARN = 1800;

export interface BranchReport {
  id: string;
  branch_id: string;
  /** First day of the reported month, e.g. 2026-09-01. */
  report_month: string;
  status: ReportStatus;
  activities: string | null;
  leadership_updates: string | null;
  wins: string | null;
  challenges: string | null;
  prayer_requests: string | null;
  reviewer_comment: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ChurchService {
  id: string;
  church_id: string;
  name: string;
  /** 0 = Sunday … 6 = Saturday, matching JS getDay(). */
  day_of_week: number;
  /** Postgres `time`, returned as HH:MM:SS. */
  start_time: string;
  volunteer_arrival_offset_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
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
  // Set once the owner finishes (or skips through) the setup wizard.
  // Null for everyone else — invited users never enter the wizard.
  onboarding_completed_at: string | null;
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
