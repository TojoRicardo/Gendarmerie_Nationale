import React from 'react'
import { FileSignature, Download, Pencil, Trash2 } from 'lucide-react'

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch (error) {
    return value
  }
}

const RapportCard = ({ rapport, onEdit, onDelete }) => {
  if (!rapport) return null

  const actionButtonBase =
    'flex h-10 w-10 items-center justify-center rounded-full border transition text-sm'

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-600">
            <FileSignature className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Rapport</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {rapport.titre || 'Rapport d\'enquête'}
            </p>
            <p className="text-sm text-slate-500">
              {rapport.date_creation 
                ? `Créé le ${formatDate(rapport.date_creation)}`
                : rapport.date_ajout 
                ? `Ajouté le ${formatDate(rapport.date_ajout)}`
                : '—'}
            </p>
            {rapport.contenu ? (
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{rapport.contenu}</p>
            ) : null}
            {rapport.statut ? (
              <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                rapport.statut === 'finalise' || rapport.statut === 'finalisé'
                  ? 'bg-green-100 text-green-700'
                  : rapport.statut === 'brouillon'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {rapport.statut}
              </span>
            ) : null}
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2 self-start">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className={`${actionButtonBase} border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50`}
                aria-label="Modifier le rapport"
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className={`${actionButtonBase} border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50`}
                aria-label="Supprimer le rapport"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Enquêteur</p>
          <p className="text-sm font-semibold text-slate-900">
            {rapport.enqueteur?.full_name || rapport.enqueteur?.username || rapport.cree_par?.username || '—'}
          </p>
        </div>
        {rapport.fichier ? (
          <a
            href={rapport.fichier}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <Download className="h-4 w-4" />
            Télécharger
          </a>
        ) : null}
      </div>
    </div>
  )
}

export default RapportCard

