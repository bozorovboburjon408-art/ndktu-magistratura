export type UserRole = 
  | 'talaba'
  | 'ilmiy_rahbar'
  | 'baholovchi'
  | 'kafedra_mudiri'
  | 'apellatsiya'
  | 'administrator'
  | 'auditor';

export interface User {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  role: UserRole;
  specialty?: string;
  course_year?: number;
  hemis_id?: string;
}

export interface Submission {
  id: number;
  student_id: number;
  cycle_id: number;
  artifact_type: 'taqdimot_slayd' | 'ilmiy_hisobot' | 'pedagogik_hisobot';
  file_name: string;
  sha256_hash: string;
  file_size_bytes: number;
  version_number: number;
  uploaded_at: string;
  is_frozen: boolean;
  verification_method: string;
}

export interface CalendarItem {
  id: number;
  student_id: number;
  cycle_id: number;
  category: string;
  description: string;
  planned_deadline: string;
  completed_date?: string;
  status: string;
  supervisor_confirmed: boolean;
  supervisor_comment?: string;
}

export interface FinalMark {
  id: number;
  student_id: number;
  cycle_id: number;
  research_report_score: number;
  live_presentation_score: number;
  pedagogical_report_score: number;
  slides_score: number;
  publications_score: number;
  calendar_plan_score: number;
  academic_performance_score: number;
  total_score: number;
  grade_scale: number;
  grade_label: string;
  divergence_flag: boolean;
  divergence_details?: string;
  version_number: number;
  is_active: boolean;
  rank_in_specialty?: number;
  total_in_specialty?: number;
  published_at?: string;
}

export interface RubricCriterion {
  id: number;
  component_name: string;
  criterion_number: number;
  criterion_name: string;
  source_clause: string;
  max_score: number;
  description_5?: string;
  description_3?: string;
  description_1?: string;
}

export interface Appeal {
  id: number;
  student_id: number;
  student_name?: string;
  cycle_id: number;
  final_mark_id: number;
  filed_at: string;
  grounds: string;
  target_component?: string;
  decision_deadline: string;
  remaining_hours: number;
  status: string;
  commission_members?: string;
  commission_decision_notes?: string;
  decided_at?: string;
}

export interface AuditEntry {
  id: number;
  actor_id?: number;
  action: string;
  target_type: string;
  target_id?: string;
  details: string;
  previous_hash: string;
  current_hash: string;
  timestamp: string;
}
