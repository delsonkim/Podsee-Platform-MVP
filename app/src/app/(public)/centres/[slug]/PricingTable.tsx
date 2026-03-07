'use client'

import { useState, useMemo } from 'react'
import type { CentrePricing } from '@/types/database'

type PricingRow = CentrePricing & { subject_name: string; level_label: string | null }

export default function PricingTable({
  rows,
  promotionsText,
  additionalFees,
}: {
  rows: PricingRow[]
  promotionsText: string | null
  additionalFees: string | null
}) {
  const [levelFilter, setLevelFilter] = useState('')

  // Unique levels for the filter dropdown
  const levels = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of rows) {
      if (r.level_label && r.level_id) seen.set(r.level_id, r.level_label)
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }))
  }, [rows])

  // Filter rows
  const filtered = levelFilter
    ? rows.filter((r) => r.level_id === levelFilter)
    : rows

  // Group by subject
  const bySubject = useMemo(() => {
    const map = new Map<string, PricingRow[]>()
    for (const row of filtered) {
      const key = row.subject_name
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    return map
  }, [filtered])

  if (rows.length === 0 && !promotionsText) return null

  return (
    <>
      {/* Pricing table */}
      {rows.length > 0 && (
        <section className="px-6 py-6 border-b border-linen bg-white">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest">
              Fees & Pricing
            </p>
            {levels.length > 1 && (
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="text-xs border border-linen rounded-lg px-3 py-1.5 text-forest bg-paper font-display focus:outline-none focus:ring-1 focus:ring-fern"
              >
                <option value="">All levels</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {bySubject.size > 0 ? (
            <div className="space-y-4">
              {Array.from(bySubject.entries()).map(([subject, subjectRows]) => (
                <div key={subject}>
                  <p className="font-display font-bold text-forest text-sm mb-2">{subject}</p>
                  <div className="bg-paper border border-linen rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-linen text-left">
                          <th className="px-4 py-2.5 font-display font-semibold text-sage text-xs">
                            Level
                          </th>
                          <th className="px-4 py-2.5 font-display font-semibold text-sage text-xs">
                            Regular Fee
                          </th>
                          <th className="px-4 py-2.5 font-display font-semibold text-sage text-xs">
                            Trial
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectRows.map((row) => (
                          <tr key={row.id} className="border-b border-linen last:border-0">
                            <td className="px-4 py-2.5 text-forest">
                              {row.level_label ?? 'All levels'}
                              {row.stream && (
                                <span className="text-sage text-xs ml-1">({row.stream})</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-forest font-medium">
                              S${row.regular_fee}
                              {row.billing_display && (
                                <span className="text-sage text-xs ml-1">
                                  /{row.billing_display}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {row.trial_type === 'free' ? (
                                <span className="text-fern font-display font-semibold">Free</span>
                              ) : (
                                <span className="text-forest font-medium">S${row.trial_fee}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-sage italic">
              No pricing found for the selected level.
            </p>
          )}

          {additionalFees && (
            <div className="mt-3 text-xs text-sage bg-paper border border-linen rounded-lg px-4 py-2.5">
              <span className="font-display font-semibold">Additional fees:</span> {additionalFees}
            </div>
          )}
        </section>
      )}

      {/* Promotions */}
      {promotionsText && (
        <section className="px-6 py-4 border-b border-linen">
          <div className="bg-amber/5 border border-amber/20 rounded-xl px-5 py-4">
            <p className="text-xs font-display font-semibold text-amber uppercase tracking-widest mb-2">
              Current Promotions
            </p>
            <p className="text-sm text-sage leading-relaxed whitespace-pre-line">{promotionsText}</p>
          </div>
        </section>
      )}
    </>
  )
}
