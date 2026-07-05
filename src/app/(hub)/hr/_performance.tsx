'use client'

import { useState } from 'react'
import { IconStar } from '@tabler/icons-react'
import { StaffMember, fmtDate } from '../team/_shared'
import { PerformanceReview, loadReviews } from './_shared'
import { Avatar, Badge } from './_ui'

export function PerformanceTab({ staff: _staff }: { staff: StaffMember[] }) {
  const [reviews] = useState<PerformanceReview[]>(loadReviews)
  const [selected, setSelected] = useState<string | null>(reviews[0]?.id ?? null)
  const review = reviews.find(r => r.id === selected) ?? null

  return (
    <div className="flex h-full min-h-0 gap-5 p-6">
      <div className="w-72 shrink-0 overflow-y-auto space-y-2">
        {reviews.length === 0 && (
          <div className="py-12 text-center"><p className="text-sm text-gray-400">No performance reviews yet</p></div>
        )}
        {reviews.map(r => {
          const isSel = r.id === selected
          const [firstName = '', lastName = ''] = r.staffName.split(' ')
          return (
            <button key={r.id} type="button" onClick={() => setSelected(r.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${isSel ? 'border-[#6BA3D6] bg-[#6BA3D6]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <Avatar firstName={firstName} lastName={lastName} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{r.staffName}</p>
                <p className="text-xs text-gray-500">{r.period}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <IconStar key={i} size={11} strokeWidth={1.5} className={i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                    ))}
                  </div>
                  {r.completedDate ? <Badge label="Complete" color="#15803d" bg="#dcfce7" /> : <Badge label="In Progress" color="#854d0e" bg="#fef9c3" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!review ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">Select a review</div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">{review.staffName} — {review.period}</h2>
                {review.completedDate && <p className="text-xs text-gray-400">Completed {fmtDate(review.completedDate)}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <IconStar key={i} size={22} strokeWidth={1.5} className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                  ))}
                </div>
                <p className="text-xs text-gray-400">{review.rating}/5</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Self Assessment</p>
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed">{review.selfAssessment}</div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Manager Notes</p>
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed">{review.managerNotes}</div>
            </div>
            {review.actionItems.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Action Items</p>
                <div className="space-y-2">
                  {review.actionItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                      <div className="mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 bg-[#6BA3D6]" />
                      <p className="text-sm text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
