import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useNotification } from '../context/NotificationContext'
import * as criminalFilesService from '../services/criminalFilesService'
import FormulaireFicheComplete from '../../components/fiches-criminelles/FormulaireFicheComplete'
import { buildCriminalFilePayload } from '../utils/criminalFileFormUtils'

const CreerFicheCriminelle = () => {
  const navigate = useNavigate()
  const notification = useNotification()

  const handleSauvegarder = async (formData) => {
    try {
      console.log('Données reçues du formulaire:', formData)
      
      const cleanedData = buildCriminalFilePayload(formData)

      console.log('Données nettoyées:', cleanedData)

      // Envoyer tous les champs, même vides (Django gère les blank=True, null=True)
      // Les champs obligatoires (nom, prenom, sexe) ne doivent JAMAIS être vides
      if (!cleanedData.nom || !cleanedData.prenom) {
        notification.showError({
          title: 'Champs obligatoires manquants',
          message: 'Le nom et le prénom sont obligatoires pour créer une fiche criminelle.'
        })
        return
      }

      // Gérer les infractions (utiliser infractions_data pour le backend)
      if (formData.infractions && formData.infractions.length > 0) {
        cleanedData.infractions_data = formData.infractions
        console.log('[ATTENTION] Infractions à créer:', cleanedData.infractions_data)
      }

      console.log('Envoi des données à l\'API...')
      const result = await criminalFilesService.createCriminalFile(cleanedData)
      console.log('[OK] Réponse de l\'API:', result)
      
      // Message de succès
      notification.showCreate({
        title: 'Fiche criminelle créée',
        message: 'La fiche a été enregistrée avec succès.'
      })
      
      // Naviguer vers la liste après un court délai pour laisser le temps de voir le message
      setTimeout(() => {
        navigate('/fiches-criminelles')
      }, 1500)
      
    } catch (error) {
      console.error('[ERREUR] Erreur complète:', error)
      console.error('[ERREUR] Réponse erreur:', error.response?.data)
      
      let errorMessage = 'Erreur lors de la création de la fiche'
      
      if (error.response?.status === 400) {
        const errors = error.response.data
        if (typeof errors === 'object' && errors !== null) {
          const errorList = Object.entries(errors).map(([key, value]) => {
            const errorValue = Array.isArray(value) ? value.join(', ') : value
            return `${key}: ${errorValue}`
          }).join('\n')
          errorMessage = `Erreur de validation:\n${errorList}`
        } else if (typeof errors === 'string') {
          errorMessage = errors
        }
      } else if (error.response?.status === 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'
      } else if (error.message) {
        errorMessage = error.message
      } else if (!error.response) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.'
      }
      
      notification.showError({
        title: 'Erreur de création',
        message: errorMessage
      })
    }
  }

  const handleAnnuler = () => {
    navigate('/fiches-criminelles')
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
          <FileText className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Créer une Fiche Criminelle Complète</h1>
          <p className="text-gray-600 text-sm">Enregistrer un nouveau dossier criminel avec toutes les informations</p>
        </div>
      </div>

      {/* Formulaire complet */}
      <FormulaireFicheComplete 
        onSauvegarder={handleSauvegarder}
        onAnnuler={handleAnnuler}
      />
    </div>
  )
}

export default CreerFicheCriminelle
