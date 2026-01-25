import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useNotification } from '../context/NotificationContext'
import * as criminalFilesService from '../services/criminalFilesService'
import FormulaireFicheComplete from '../../components/fiches-criminelles/FormulaireFicheComplete'

const CreerFicheCriminelle = () => {
  const navigate = useNavigate()
  const notification = useNotification()

  const handleSauvegarder = async (formData) => {
    try {
      console.log('📝 Données reçues du formulaire:', formData)
      
      // Nettoyer et formater les données avant envoi
      const cleanedData = {
        // Informations générales (obligatoires)
        nom: formData.nom?.trim() || '',
        prenom: formData.prenom?.trim() || '',
        sexe: formData.sexe || 'H',
        
        // Informations optionnelles - Envoyer les chaînes vides plutôt que null pour préserver les champs
        surnom: formData.surnom?.trim() || '',
        date_naissance: formData.date_naissance && formData.date_naissance.trim() !== '' ? formData.date_naissance : null,
        lieu_naissance: formData.lieu_naissance?.trim() || '',
        nationalite: formData.nationalite?.trim() || '',
        cin: formData.cin ? formData.cin.replace(/\s/g, '') : '', // Enlever les espaces du CIN
        
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
        anciennes_adresses: formData.anciennes_adresses?.trim() || '',
        adresses_secondaires: formData.adresses_secondaires?.trim() || '',
        lieux_visites_frequemment: formData.lieux_visites_frequemment?.trim() || '',
        vehicules_associes: formData.vehicules_associes?.trim() || '',
        plaques_immatriculation: formData.plaques_immatriculation?.trim() || '',
        permis_conduire: formData.permis_conduire?.trim() || '',
        trajets_habituels: formData.trajets_habituels?.trim() || '',
        
        // Informations personnelles sociales
        statut_matrimonial: formData.statut_matrimonial || '',
        partenaire_affectif: formData.partenaire_affectif?.trim() || '',
        spouse: formData.spouse?.trim() || '',
        children: formData.children?.trim() || '',
        personnes_proches: formData.personnes_proches?.trim() || '',
        dependants: formData.dependants?.trim() || '',
        facebook: formData.facebook?.trim() || '',
        instagram: formData.instagram?.trim() || '',
        tiktok: formData.tiktok?.trim() || '',
        twitter_x: formData.twitter_x?.trim() || '',
        whatsapp: formData.whatsapp?.trim() || '',
        telegram: formData.telegram?.trim() || '',
        email: formData.email?.trim() || '',
        autres_reseaux: formData.autres_reseaux?.trim() || '',
        consommation_alcool: formData.consommation_alcool || false,
        consommation_drogues: formData.consommation_drogues || false,
        frequentations_connues: formData.frequentations_connues?.trim() || '',
        endroits_frequentes: formData.endroits_frequentes?.trim() || '',
        
        // Informations professionnelles / financières
        profession: formData.profession?.trim() || '',
        service_militaire: formData.service_militaire?.trim() || '',
        emplois_precedents: formData.emplois_precedents?.trim() || '',
        sources_revenus: formData.sources_revenus?.trim() || '',
        entreprises_associees: formData.entreprises_associees?.trim() || '',
        comptes_bancaires: formData.comptes_bancaires?.trim() || '',
        biens_proprietes: formData.biens_proprietes?.trim() || '',
        dettes_importantes: formData.dettes_importantes?.trim() || '',
        transactions_suspectes: formData.transactions_suspectes?.trim() || '',
        
        // Réseau relationnel
        famille_proche: formData.famille_proche?.trim() || '',
        amis_proches: formData.amis_proches?.trim() || '',
        relations_risque: formData.relations_risque?.trim() || '',
        suspects_associes: formData.suspects_associes?.trim() || '',
        membres_reseau_criminel: formData.membres_reseau_criminel?.trim() || '',
        complices_potentiels: formData.complices_potentiels?.trim() || '',
        contacts_recurrents: formData.contacts_recurrents?.trim() || '',
        
        // Informations judiciaires
        motif_arrestation: formData.motif_arrestation?.trim() || '',
        date_arrestation: formData.date_arrestation && formData.date_arrestation.trim() !== '' ? formData.date_arrestation : null,
        province: formData.province?.trim() || '',
        region: formData.region?.trim() || '',
        district: formData.district?.trim() || '',
        lieu_arrestation: formData.lieu_arrestation?.trim() || '',
        unite_saisie: formData.unite_saisie?.trim() || '',
        reference_pv: formData.reference_pv?.trim() || '',
        suite_judiciaire: formData.suite_judiciaire?.trim() || '',
        peine_encourue: formData.peine_encourue?.trim() || '',
        antecedent_judiciaire: formData.antecedent_judiciaire?.trim() || '',
      }

      console.log('🧹 Données nettoyées:', cleanedData)

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
        console.log('⚠️ Infractions à créer:', cleanedData.infractions_data)
      }

      console.log('📤 Envoi des données à l\'API...')
      const result = await criminalFilesService.createCriminalFile(cleanedData)
      console.log('✅ Réponse de l\'API:', result)
      
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
      console.error('❌ Erreur complète:', error)
      console.error('❌ Réponse erreur:', error.response?.data)
      
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
