import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, ArrowLeft, Loader2 } from 'lucide-react'
import { useNotification } from '../context/NotificationContext'
import * as criminalFilesService from '../services/criminalFilesService'
import FormulaireFicheComplete from '../../components/fiches-criminelles/FormulaireFicheComplete'

const ModifierFicheCriminelle = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const notification = useNotification()
  const [ficheData, setFicheData] = useState(null)
  const [chargement, setChargement] = useState(true)

  // Charger les données de la fiche au montage du composant
  useEffect(() => {
    const chargerFiche = async () => {
      try {
        setChargement(true)
        const data = await criminalFilesService.getCriminalFileById(id)
        setFicheData(data)
      } catch (error) {
        console.error('Erreur chargement fiche:', error)
        notification.showError({
          title: 'Erreur de chargement',
          message: 'Impossible de charger les données de la fiche. Veuillez réessayer.'
        })
        navigate('/fiches-criminelles')
      } finally {
        setChargement(false)
      }
    }

    if (id) {
      chargerFiche()
    }
  }, [id, navigate])

  const handleSauvegarder = async (formData) => {
    try {
      // Nettoyer et formater les données avant envoi
      const cleanedData = {
        // Informations générales (obligatoires)
        nom: formData.nom?.trim() || '',
        prenom: formData.prenom?.trim() || '',
        sexe: formData.sexe || 'H',
        
        // Informations optionnelles - Envoyer les chaînes vides plutôt que null
        surnom: formData.surnom?.trim() || '',
        date_naissance: formData.date_naissance && formData.date_naissance.trim() !== '' ? formData.date_naissance : null,
        lieu_naissance: formData.lieu_naissance?.trim() || '',
        nationalite: formData.nationalite?.trim() || '',
        cin: formData.cin ? formData.cin.replace(/\s/g, '') : '',
        
        // Description physique
        corpulence: formData.corpulence || '',
        cheveux: formData.cheveux || '',
        visage: formData.visage || '',
        barbe: formData.barbe || '',
        marques_particulieres: formData.marques_particulieres?.trim() || '',
        
        // Filiation
        nom_pere: formData.nom_pere?.trim() || '',
        nom_mere: formData.nom_mere?.trim() || '',
        
        // Coordonnées
        adresse: formData.adresse?.trim() || '',
        contact: formData.contact?.trim() || '',
        
        // Informations professionnelles
        profession: formData.profession?.trim() || '',
        service_militaire: formData.service_militaire?.trim() || '',
        
        // Informations judiciaires
        motif_arrestation: formData.motif_arrestation?.trim() || '',
        date_arrestation: formData.date_arrestation && formData.date_arrestation.trim() !== '' ? formData.date_arrestation : null,
        province: formData.province?.trim() || '',
        lieu_arrestation: formData.lieu_arrestation?.trim() || '',
        unite_saisie: formData.unite_saisie?.trim() || '',
        reference_pv: formData.reference_pv?.trim() || '',
        suite_judiciaire: formData.suite_judiciaire?.trim() || '',
        peine_encourue: formData.peine_encourue?.trim() || '',
        antecedent_judiciaire: formData.antecedent_judiciaire?.trim() || '',
      }

      // Validation des champs obligatoires
      if (!cleanedData.nom || !cleanedData.prenom) {
        notification.showError({
          title: 'Champs obligatoires manquants',
          message: 'Le nom et le prénom sont obligatoires pour modifier une fiche criminelle.'
        })
        return
      }

      // Gérer les infractions (utiliser infractions_data pour le backend)
      if (formData.infractions && formData.infractions.length > 0) {
        cleanedData.infractions_data = formData.infractions
      }

      console.log('📤 Mise à jour de la fiche:', id, cleanedData)
      const result = await criminalFilesService.updateCriminalFile(id, cleanedData)
      console.log('✅ Réponse de l\'API:', result)
      
      // Message de succès amélioré avec informations détaillées
      notification.showSuccess({
        title: 'Modification réussie',
        message: `La fiche criminelle de ${cleanedData.nom} ${cleanedData.prenom} a été modifiée avec succès.\n\nLes modifications ont été enregistrées et sont maintenant visibles dans le système.`
      })
      
      // Naviguer vers la vue de la fiche après un court délai
      setTimeout(() => {
        navigate(`/fiches-criminelles/voir/${id}`)
      }, 1500)
    } catch (error) {
      console.error('❌ Erreur modification:', error)
      console.error('❌ Réponse erreur:', error.response?.data)
      
      let errorMessage = 'Erreur lors de la modification de la fiche'
      let errorTitle = 'Erreur de modification'
      
      if (error.response?.status === 400) {
        errorTitle = 'Erreur de validation'
        const errors = error.response.data
        if (typeof errors === 'object' && errors !== null) {
          const errorList = Object.entries(errors).map(([key, value]) => {
            const errorValue = Array.isArray(value) ? value.join(', ') : value
            return `• ${key}: ${errorValue}`
          }).join('\n')
          errorMessage = `Veuillez corriger les erreurs suivantes :\n\n${errorList}`
        } else if (typeof errors === 'string') {
          errorMessage = errors
        }
      } else if (error.response?.status === 500) {
        errorTitle = 'Erreur serveur'
        errorMessage = 'Une erreur serveur est survenue. Veuillez réessayer plus tard ou contacter l\'administrateur.'
      } else if (error.response?.status === 403) {
        errorTitle = 'Permission refusée'
        errorMessage = 'Vous n\'avez pas les permissions nécessaires pour modifier cette fiche.'
      } else if (error.response?.status === 404) {
        errorTitle = 'Fiche introuvable'
        errorMessage = 'La fiche que vous essayez de modifier n\'existe plus ou a été supprimée.'
      } else if (error.message) {
        errorMessage = error.message
      } else if (!error.response) {
        errorTitle = 'Erreur de connexion'
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
      }
      
      notification.showError({
        title: errorTitle,
        message: errorMessage
      })
    }
  }

  const handleAnnuler = () => {
    navigate(`/fiches-criminelles/voir/${id}`)
  }

  // Affichage du chargement
  if (chargement) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de la fiche...</p>
        </div>
      </div>
    )
  }

  // Si pas de données
  if (!ficheData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-medium">Fiche introuvable</p>
          <button
            onClick={() => navigate('/fiches-criminelles')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/fiches-criminelles/voir/${id}`)}
            className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl shadow-lg">
            <FileText className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Modifier la Fiche Criminelle</h1>
            <p className="text-gray-600 text-sm">{ficheData.numero_fiche}</p>
          </div>
        </div>
      </div>

      {/* Formulaire avec données pré-remplies */}
      <FormulaireFicheComplete 
        fiche={ficheData}
        onSauvegarder={handleSauvegarder}
        onAnnuler={handleAnnuler}
      />
    </div>
  )
}

export default ModifierFicheCriminelle


