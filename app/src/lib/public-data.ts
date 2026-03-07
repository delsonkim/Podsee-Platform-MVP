// Public data access layer — real Supabase queries.
// All callers (pages, components) use these types and function signatures.
// The mock-data.ts file can be kept as a fallback reference.

import { createAdminClient } from './supabase/admin'
import { unstable_cache } from 'next/cache'
import type { Centre, Subject, Level, TrialSlot, CentrePricing, CentrePolicy } from '@/types/database'

export type CentreSummary = Centre & {
  subjects: Subject[]
  levels: Level[]
  min_fee: number
  slot_count: number
}

export type SlotDetail = TrialSlot & {
  subject: Subject
  level: Level
  centre: Centre
}

export type Teacher = {
  id: string
  name: string
  role: string | null
  is_founder: boolean
  qualifications: string | null
  bio: string | null
  years_experience: number | null
  sort_order: number
}

export type PublicReview = {
  id: string
  rating: number
  review_text: string | null
  created_at: string
  parent_name: string
}

export type CentreDetail = Centre & {
  subjects: Subject[]
  levels: Level[]
  slots: SlotDetail[]
  teachers: Teacher[]
  reviews: PublicReview[]
}

export async function getCentres(): Promise<CentreSummary[]> {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('centres')
      .select(`
        *,
        centre_subjects(subjects(*)),
        centre_levels(levels(*)),
        trial_slots!left(trial_fee)
      `)
      .eq('is_active', true)
      .eq('is_paused', false)
      .gte('trial_slots.date', today)
      .gt('trial_slots.spots_remaining', 0)
      .eq('trial_slots.is_draft', false)
      .order('name')

    if (error || !data) return []

    return (data as any[]).map((c) => ({
      ...c,
      subjects: (c.centre_subjects as any[]).map((cs: any) => cs.subjects).filter(Boolean),
      levels: (c.centre_levels as any[]).map((cl: any) => cl.levels).filter(Boolean),
      min_fee:
        (c.trial_slots as any[]).length > 0
          ? Math.min(...(c.trial_slots as any[]).map((s: any) => Number(s.trial_fee)))
          : 0,
      slot_count: (c.trial_slots as any[]).length,
    }))
  } catch {
    return []
  }
}

export async function getCentreBySlug(slug: string): Promise<CentreDetail | null> {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    // First get the centre ID with a lightweight query, then parallelize everything
    const { data: idRow } = await supabase
      .from('centres')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (!idRow) return null

    // Run ALL queries in parallel
    const [{ data }, { data: reviewData }] = await Promise.all([
      supabase
        .from('centres')
        .select(`
          *,
          centre_subjects(subjects(*)),
          centre_levels(levels(*)),
          trial_slots!left(*, subjects(*), levels(*)),
          teachers(*)
        `)
        .eq('id', idRow.id)
        .gte('trial_slots.date', today)
        .gt('trial_slots.spots_remaining', 0)
        .eq('trial_slots.is_draft', false)
        .single(),
      supabase
        .from('reviews')
        .select('id, rating, review_text, created_at, parents(name)')
        .eq('centre_id', idRow.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (!data) return null

    const d = data as any
    const centre: Centre = { ...d }

    const subjects: Subject[] = (d.centre_subjects as any[])
      .map((cs: any) => cs.subjects)
      .filter(Boolean)

    const levels: Level[] = (d.centre_levels as any[])
      .map((cl: any) => cl.levels)
      .filter(Boolean)

    const slots: SlotDetail[] = (d.trial_slots as any[])
      .sort(
        (a: any, b: any) =>
          a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)
      )
      .map((s: any) => ({
        ...s,
        trial_fee: Number(s.trial_fee),
        subject: s.subjects as Subject,
        level: s.levels as Level,
        centre,
      }))

    const teachers: Teacher[] = ((d.teachers as any[]) ?? [])
      .sort((a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99))

    const reviews: PublicReview[] = ((reviewData as any[]) ?? []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      review_text: r.review_text,
      created_at: r.created_at,
      parent_name: r.parents?.name ?? 'Parent',
    }))

    return { ...centre, subjects, levels, slots, teachers, reviews }
  } catch {
    return null
  }
}

export async function getSlotById(id: string): Promise<SlotDetail | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('trial_slots')
      .select(`
        *,
        subjects(*),
        levels(*),
        centres(*)
      `)
      .eq('id', id)
      .single()

    if (error || !data) return null

    const d = data as any
    return {
      ...d,
      trial_fee: Number(d.trial_fee),
      subject: d.subjects as Subject,
      level: d.levels as Level,
      centre: d.centres as Centre,
    }
  } catch {
    return null
  }
}

export const getAllSubjects = unstable_cache(
  async (): Promise<Subject[]> => {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase.from('subjects').select('*').order('sort_order')
      if (error || !data) return []
      return data as Subject[]
    } catch {
      return []
    }
  },
  ['all-subjects'],
  { revalidate: 300 }
)

export const getAllLevels = unstable_cache(
  async (): Promise<Level[]> => {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase.from('levels').select('*').order('sort_order')
      if (error || !data) return []
      return data as Level[]
    } catch {
      return []
    }
  },
  ['all-levels'],
  { revalidate: 300 }
)

// ── Public pricing / promotions / policies ──────────────────

export async function getCentrePricing(centreId: string): Promise<(CentrePricing & { subject_name: string; level_label: string | null })[]> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('centre_pricing')
      .select('*, subjects(name), levels(label)')
      .eq('centre_id', centreId)
      .order('created_at')
    if (!data) return []
    return (data as any[]).map((r) => ({
      ...r,
      subject_name: r.subjects?.name ?? 'Unknown',
      level_label: r.levels?.label ?? null,
    }))
  } catch {
    return []
  }
}

export async function getSlotPricing(
  centreId: string,
  subjectId: string,
  levelId: string | null
): Promise<{ regular_fee: number; billing_display: string | null } | null> {
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('centre_pricing')
      .select('regular_fee, billing_display')
      .eq('centre_id', centreId)
      .eq('subject_id', subjectId)

    if (levelId) {
      query = query.eq('level_id', levelId)
    } else {
      query = query.is('level_id', null)
    }

    const { data } = await query.maybeSingle()
    return data ? { regular_fee: data.regular_fee, billing_display: data.billing_display } : null
  } catch {
    return null
  }
}

export async function getCentrePolicies(centreId: string): Promise<CentrePolicy[]> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('centre_policies')
      .select('*')
      .eq('centre_id', centreId)
      .order('sort_order')
    return (data ?? []) as CentrePolicy[]
  } catch {
    return []
  }
}
