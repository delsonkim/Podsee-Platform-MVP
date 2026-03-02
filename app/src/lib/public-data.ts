// Public data access layer — real Supabase queries.
// All callers (pages, components) use these types and function signatures.
// The mock-data.ts file can be kept as a fallback reference.

import { createAdminClient } from './supabase/admin'
import type { Centre, Subject, Level, TrialSlot } from '@/types/database'

export type CentreSummary = Centre & {
  subjects: Subject[]
  levels: Level[]
  min_fee: number
}

export type SlotDetail = TrialSlot & {
  subject: Subject
  level: Level
  centre: Centre
}

export type CentreDetail = Centre & {
  subjects: Subject[]
  levels: Level[]
  slots: SlotDetail[]
}

export async function getCentres(): Promise<CentreSummary[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('centres')
      .select(`
        *,
        centre_subjects(subjects(*)),
        centre_levels(levels(*)),
        trial_slots(trial_fee)
      `)
      .eq('is_active', true)
      .eq('is_paused', false)
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
    }))
  } catch {
    return []
  }
}

export async function getCentreBySlug(slug: string): Promise<CentreDetail | null> {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('centres')
      .select(`
        *,
        centre_subjects(subjects(*)),
        centre_levels(levels(*)),
        trial_slots(*, subjects(*), levels(*))
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    const d = data as any
    const centre: Centre = { ...d }

    const subjects: Subject[] = (d.centre_subjects as any[])
      .map((cs: any) => cs.subjects)
      .filter(Boolean)

    const levels: Level[] = (d.centre_levels as any[])
      .map((cl: any) => cl.levels)
      .filter(Boolean)

    const slots: SlotDetail[] = (d.trial_slots as any[])
      .filter((s: any) => s.date >= today && s.spots_remaining > 0)
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

    return { ...centre, subjects, levels, slots }
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

export async function getAllSubjects(): Promise<Subject[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('subjects').select('*').order('sort_order')
    if (error || !data) return []
    return data as Subject[]
  } catch {
    return []
  }
}

export async function getAllLevels(): Promise<Level[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('levels').select('*').order('sort_order')
    if (error || !data) return []
    return data as Level[]
  } catch {
    return []
  }
}
