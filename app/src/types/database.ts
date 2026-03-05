export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'converted' | 'no_show' | 'cancelled'
export type ParentReportedEnrolment = 'enrolled' | 'not_enrolled'
export type CommissionStatus = 'pending' | 'invoiced' | 'paid' | 'overdue' | 'waived'
export type RewardStatus = 'pending' | 'approved' | 'paid' | 'rejected'
export type CancelledBy = 'parent' | 'centre' | 'reschedule'
export type ReviewStatus = 'pending_approval' | 'approved' | 'rejected'
export type LevelGroup = 'primary' | 'secondary' | 'jc' | 'other'
export type CentreUserRole = 'owner' | 'staff'
export type AdminUserRole = 'admin' | 'superadmin'

export interface Subject {
  id: string
  name: string
  sort_order: number
  is_custom: boolean
  created_at: string
}

export interface Level {
  id: string
  code: string
  label: string
  level_group: LevelGroup
  sort_order: number
  created_at: string
}

export interface Parent {
  id: string
  email: string
  name: string
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Child {
  id: string
  parent_id: string
  name: string
  level_id: string
  created_at: string
  updated_at: string
}

export interface Centre {
  id: string
  name: string
  slug: string
  area: string | null
  address: string | null
  description: string | null
  teaching_style: string | null
  teacher_bio: string | null
  teacher_qualifications: string | null
  class_size: number | null
  replacement_class_policy: string | null
  makeup_class_policy: string | null
  commitment_terms: string | null
  notice_period_terms: string | null
  payment_terms: string | null
  other_policies: string | null
  parking_info: string | null
  nearest_mrt: string | null
  years_operating: number | null
  track_record: string | null
  contact_email: string | null
  image_urls: string[]
  trial_type: 'free' | 'paid'
  paynow_qr_image_url: string | null
  trial_commission_rate: number
  conversion_commission_rate: number
  draft_data: Record<string, unknown> | null
  has_pending_changes: boolean
  is_active: boolean
  is_paused: boolean
  is_trusted: boolean
  created_at: string
  updated_at: string
}

export interface CentreUser {
  id: string
  auth_user_id: string | null
  centre_id: string
  role: CentreUserRole
  email: string
  created_at: string
}

export interface AdminUser {
  id: string
  auth_user_id: string | null
  email: string
  role: AdminUserRole
  created_at: string
}

export interface TrialSlot {
  id: string
  centre_id: string
  subject_id: string
  level_id: string | null
  age_min: number | null
  age_max: number | null
  custom_level: string | null
  date: string
  start_time: string
  end_time: string
  trial_fee: number
  max_students: number
  spots_remaining: number
  is_draft: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  booking_ref: string
  trial_slot_id: string
  centre_id: string
  child_id: string
  parent_id: string
  parent_name_at_booking: string
  parent_email_at_booking: string
  parent_phone_at_booking: string | null
  child_name_at_booking: string
  child_level_at_booking: string
  trial_fee_at_booking: number
  status: BookingStatus
  acknowledged_at: string | null
  referral_source: string | null
  cancelled_by: CancelledBy | null
  cancelled_at: string | null
  cancel_reason: string | null
  rescheduled_from: string | null
  payment_screenshot_url: string | null
  is_flagged: boolean
  flag_reason: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  booking_id: string
  parent_id: string
  centre_id: string
  rating: number
  review_text: string | null
  status: ReviewStatus
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface TrialOutcome {
  id: string
  booking_id: string
  parent_reported_status: ParentReportedEnrolment | null
  reported_at: string | null
  centre_reported_status: ParentReportedEnrolment | null
  centre_reported_at: string | null
  admin_verified: boolean
  admin_verified_at: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface Commission {
  id: string
  trial_outcome_id: string
  centre_id: string
  commission_type: 'trial' | 'conversion'
  commission_amount: number
  status: CommissionStatus
  invoice_number: string | null
  invoiced_at: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Reward {
  id: string
  trial_outcome_id: string
  parent_id: string
  reward_amount: number
  status: RewardStatus
  approved_at: string | null
  paid_at: string | null
  payment_method: string | null
  payment_reference: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Status display helpers ─────────────────────────────────────

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  converted: 'Converted',
  no_show: 'No Show',
  cancelled: 'Cancelled',
}

export const BOOKING_STATUS_COLOR: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
  converted: 'bg-green-100 text-green-800',
  no_show: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> = {
  pending: 'Pending',
  invoiced: 'Invoiced',
  paid: 'Paid',
  overdue: 'Overdue',
  waived: 'Waived',
}

export const COMMISSION_STATUS_COLOR: Record<CommissionStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  invoiced: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  waived: 'bg-gray-100 text-gray-500',
}

export const REWARD_STATUS_LABEL: Record<RewardStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  paid: 'Paid',
  rejected: 'Rejected',
}

export const REWARD_STATUS_COLOR: Record<RewardStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}
