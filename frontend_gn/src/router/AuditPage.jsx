import { memo, useState } from 'react'
import FiltreAudit from '../../components/audit/FiltreAudit'
import TableauAudit from '../../components/audit/TableauAudit'
import OllamaManager from '../../components/audit/OllamaManager'

const AuditPage = memo(function AuditPage() {
  const [filtresAudit, setFiltresAudit] = useState({})
  const [showOllamaManager, setShowOllamaManager] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm">
          <FiltreAudit
            onFiltrer={setFiltresAudit}
            onReinitialiser={() => {
              setFiltresAudit({})
            }}
            onToggleOllama={() => setShowOllamaManager(!showOllamaManager)}
          />
        </div>

        {showOllamaManager && (
          <div className="bg-white rounded-xl shadow-sm">
            <OllamaManager />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm">
          <TableauAudit filtres={filtresAudit} />
        </div>
      </div>
    </div>
  )
})

export default AuditPage
