import React from 'react'
import { Image, FileText, Download, Pencil, Trash2 } from 'lucide-react'

const TYPE_CONFIG = {
  photo: {
    icon: Image,
    label: 'Photo',
    badge: 'bg-sky-100 text-sky-700',
  },
  document: {
    icon: FileText,
    label: 'Document',
    badge: 'bg-amber-100 text-amber-700',
  },
}

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch (error) {
    return value
  }
}

const PreuveCard = ({ preuve, onEdit, onDelete }) => {
  if (!preuve) return null

  const config = TYPE_CONFIG[preuve.type_preuve] || TYPE_CONFIG.document
  const Icon = config.icon

  const actionButtonBase =
    'flex h-10 w-10 items-center justify-center rounded-full border transition text-sm'

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-600">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{config.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {preuve.description ? preuve.description : 'Pièce enregistrée'}
            </p>
            <p className="text-sm text-slate-500">Ajoutée le {formatDate(preuve.date_ajout)}</p>
            {preuve.description ? (
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{preuve.description}</p>
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
                aria-label="Modifier la preuve"
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className={`${actionButtonBase} border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50`}
                aria-label="Supprimer la preuve"
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
            {preuve.enqueteur?.full_name || '—'}
          </p>
        </div>
        {preuve.fichier ? (
          <a
            href={preuve.fichier}
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

export default PreuveCard

