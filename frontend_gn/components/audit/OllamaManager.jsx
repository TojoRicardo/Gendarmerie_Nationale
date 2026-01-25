import React, { useState } from 'react'
import { testerOllama } from '../../src/services/auditService'

/**
 * Composant pour gérer et tester Ollama (génération de récits narratifs)
 */
const OllamaManager = () => {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('llama2')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleTest = async () => {
    if (!prompt.trim()) {
      setError('Veuillez saisir un prompt')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await testerOllama(prompt, model)
      setResult(response)
    } catch (err) {
      setError(err.message || 'Erreur lors du test Ollama')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Gestionnaire Ollama
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Testez la génération de récits narratifs avec Ollama
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modèle
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="llama2">Llama 2</option>
            <option value="llama3">Llama 3</option>
            <option value="mistral">Mistral</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Saisissez votre prompt pour tester Ollama..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleTest}
          disabled={loading || !prompt.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Test en cours...' : 'Tester Ollama'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h4 className="font-semibold text-green-800 mb-2">Résultat :</h4>
            <pre className="text-sm text-green-700 whitespace-pre-wrap">
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default OllamaManager

