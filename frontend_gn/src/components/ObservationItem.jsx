import React from 'react'
import { StickyNote, Clock, User, Pencil, Trash2 } from 'lucide-react'

const ObservationItem = ({ observation, onEdit, onDelete }) => {
  if (!observation) return null

  const actionButtonBase =
    'flex h-9 w-9 items-center justify-center rounded-full border transition text-xs'

  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-600">
        <StickyNote className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {observation.enqueteur?.full_name || '—'}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {new Date(observation.date).toLocaleString()}
          </div>
          {(onEdit || onDelete) && (
            <div className="ml-auto flex items-center gap-2">
              {onEdit ? (
                <button
                  type="button"
                  onClick={onEdit}
                  className={`${actionButtonBase} border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50`}
                  aria-label="Modifier l'observation"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  className={`${actionButtonBase} border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50`}
                  aria-label="Supprimer l'observation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{observation.texte}</p>
      </div>
    </div>
  )
}

export default ObservationItem

