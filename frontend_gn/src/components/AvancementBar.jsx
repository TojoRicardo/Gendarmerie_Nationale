import React from 'react'
import { Activity, MessageSquare } from 'lucide-react'

const AvancementBar = ({ avancement }) => {
  if (!avancement) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
        Aucun avancement enregistré pour l'instant.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-500">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Progression</p>
            <h3 className="text-3xl font-bold text-slate-900">{avancement.pourcentage}%</h3>
            <p className="text-xs text-slate-500">
              Mise à jour {new Date(avancement.date_mise_a_jour).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex-1 pl-6">
          <div className="h-3 w-full rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{ width: `${avancement.pourcentage}%` }}
            />
          </div>
          {avancement.commentaire ? (
            <p className="mt-4 flex items-start gap-2 text-sm text-slate-600">
              <MessageSquare className="mt-1 h-4 w-4 text-slate-400" />
              {avancement.commentaire}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default AvancementBar

