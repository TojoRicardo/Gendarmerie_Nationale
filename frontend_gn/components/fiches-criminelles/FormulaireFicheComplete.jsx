import React, { useState, useEffect } from 'react';
import { User, Calendar, MapPin, Briefcase, Scale, UserCheck, FileText, Save, AlertTriangle, Plus, Trash2, Loader2, Users, Heart, Car, Building2, Network } from 'lucide-react';
import { getProvinces, getRegions, getDistricts } from '../../src/constants/madagascar-geography';

const FormulaireFicheComplete = ({ onSauvegarder, onAnnuler, fiche }) => {
  const [formData, setFormData] = useState({
    // Informations générales
    nom: fiche?.nom || '',
    prenom: fiche?.prenom || '',
    surnom: fiche?.surnom || '',
    sexe: fiche?.sexe || 'H',
    date_naissance: fiche?.date_naissance || '',
    lieu_naissance: fiche?.lieu_naissance || '',
    nationalite: fiche?.nationalite || '',
    cin: fiche?.cin || '',
    
    // Description physique
    corpulence: fiche?.corpulence || '',
    cheveux: fiche?.cheveux || '',
    visage: fiche?.visage || '',
    barbe: fiche?.barbe || '',
    marques_particulieres: fiche?.marques_particulieres || '',
    
    // Filiation
    nom_pere: fiche?.nom_pere || '',
    nom_mere: fiche?.nom_mere || '',
    
    // Coordonnées
    adresse: fiche?.adresse || '',
    contact: fiche?.contact && fiche.contact.startsWith('+261') ? fiche.contact : (fiche?.contact ? `+261 ${fiche.contact.replace(/[^\d]/g, '').slice(0, 9).replace(/(\d{2})(\d{2})(\d{3})(\d{2})/, '$1 $2 $3 $4')}` : '+261 '),
    anciennes_adresses: fiche?.anciennes_adresses || '',
    adresses_secondaires: fiche?.adresses_secondaires || '',
    lieux_visites_frequemment: fiche?.lieux_visites_frequemment || '',
    vehicules_associes: fiche?.vehicules_associes || '',
    plaques_immatriculation: fiche?.plaques_immatriculation || '',
    permis_conduire: fiche?.permis_conduire || '',
    trajets_habituels: fiche?.trajets_habituels || '',
    
    // Informations personnelles sociales
    statut_matrimonial: fiche?.statut_matrimonial || '',
    partenaire_affectif: fiche?.partenaire_affectif || '',
    spouse: fiche?.spouse || '',
    children: fiche?.children || '',
    personnes_proches: fiche?.personnes_proches || '',
    dependants: fiche?.dependants || '',
    facebook: fiche?.facebook || '',
    instagram: fiche?.instagram || '',
    tiktok: fiche?.tiktok || '',
    twitter_x: fiche?.twitter_x || '',
    whatsapp: fiche?.whatsapp || '',
    telegram: fiche?.telegram || '',
    email: fiche?.email || '',
    autres_reseaux: fiche?.autres_reseaux || '',
    consommation_alcool: fiche?.consommation_alcool ?? false,
    consommation_drogues: fiche?.consommation_drogues ?? false,
    frequentations_connues: fiche?.frequentations_connues || '',
    endroits_frequentes: fiche?.endroits_frequentes || '',
    
    // Informations professionnelles
    profession: fiche?.profession || '',
    service_militaire: fiche?.service_militaire || '',
    emplois_precedents: fiche?.emplois_precedents || '',
    sources_revenus: fiche?.sources_revenus || '',
    entreprises_associees: fiche?.entreprises_associees || '',
    comptes_bancaires: fiche?.comptes_bancaires || '',
    biens_proprietes: fiche?.biens_proprietes || '',
    dettes_importantes: fiche?.dettes_importantes || '',
    transactions_suspectes: fiche?.transactions_suspectes || '',
    
    // Réseau relationnel
    famille_proche: fiche?.famille_proche || '',
    amis_proches: fiche?.amis_proches || '',
    relations_risque: fiche?.relations_risque || '',
    suspects_associes: fiche?.suspects_associes || '',
    membres_reseau_criminel: fiche?.membres_reseau_criminel || '',
    complices_potentiels: fiche?.complices_potentiels || '',
    contacts_recurrents: fiche?.contacts_recurrents || '',
    
    // Informations judiciaires
    motif_arrestation: fiche?.motif_arrestation || '',
    date_arrestation: fiche?.date_arrestation || '',
    province: fiche?.province || '',
    region: fiche?.region || '',
    district: fiche?.district || '',
    lieu_arrestation: fiche?.lieu_arrestation || '',
    unite_saisie: fiche?.unite_saisie || '',
    reference_pv: fiche?.reference_pv || '',
    suite_judiciaire: fiche?.suite_judiciaire || '',
    peine_encourue: fiche?.peine_encourue || '',
    antecedent_judiciaire: fiche?.antecedent_judiciaire || '',
  });

  // État pour gérer les infractions
  const [infractions, setInfractions] = useState([
    { type: '', date: '', lieu: '', description: '' }
  ]);

  const [typesInfractions, setTypesInfractions] = useState([]);
  const [erreurs, setErreurs] = useState({});
  const [chargement, setChargement] = useState(false);

  // Charger les types d'infractions disponibles
  useEffect(() => {
    const chargerTypesInfractions = async () => {
      try {
        // Types d'infractions courants
        setTypesInfractions([
          'Vol',
          'Vol qualifié',
          'Vol à main armée',
          'Agression',
          'Homicide',
          'Tentative d\'homicide',
          'Trafic de drogue',
          'Port d\'arme illégal',
          'Fraude',
          'Escroquerie',
          'Corruption',
          'Viol',
          'Kidnapping',
          'Cambriolage',
          'Vandalisme',
          'Autre'
        ]);
      } catch (error) {
        console.error('Erreur chargement types infractions:', error);
      }
    };
    chargerTypesInfractions();
  }, []);

  // Mettre à jour le formulaire quand les données de la fiche changent (mode édition)
  useEffect(() => {
    if (fiche && Object.keys(fiche).length > 0) {
      setFormData({
        // Informations générales
        nom: fiche.nom || '',
        prenom: fiche.prenom || '',
        surnom: fiche.surnom || '',
        sexe: fiche.sexe || 'H',
        date_naissance: fiche.date_naissance || '',
        lieu_naissance: fiche.lieu_naissance || '',
        nationalite: fiche.nationalite || '',
        cin: fiche.cin || '',
        
        // Description physique
        corpulence: fiche.corpulence || '',
        cheveux: fiche.cheveux || '',
        visage: fiche.visage || '',
        barbe: fiche.barbe || '',
        marques_particulieres: fiche.marques_particulieres || '',
        
        // Filiation
        nom_pere: fiche.nom_pere || '',
        nom_mere: fiche.nom_mere || '',
        
        // Coordonnées
        adresse: fiche.adresse || '',
        contact: fiche.contact && fiche.contact.startsWith('+261') ? fiche.contact : (fiche.contact ? `+261 ${fiche.contact.replace(/[^\d]/g, '').slice(0, 9).replace(/(\d{2})(\d{2})(\d{3})(\d{2})/, '$1 $2 $3 $4')}` : '+261 '),
        anciennes_adresses: fiche.anciennes_adresses || '',
        adresses_secondaires: fiche.adresses_secondaires || '',
        lieux_visites_frequemment: fiche.lieux_visites_frequemment || '',
        vehicules_associes: fiche.vehicules_associes || '',
        plaques_immatriculation: fiche.plaques_immatriculation || '',
        permis_conduire: fiche.permis_conduire || '',
        trajets_habituels: fiche.trajets_habituels || '',
        
        // Informations personnelles sociales
        statut_matrimonial: fiche.statut_matrimonial || '',
        partenaire_affectif: fiche.partenaire_affectif || '',
        spouse: fiche.spouse || '',
        children: fiche.children || '',
        personnes_proches: fiche.personnes_proches || '',
        dependants: fiche.dependants || '',
        facebook: fiche.facebook || '',
        instagram: fiche.instagram || '',
        tiktok: fiche.tiktok || '',
        twitter_x: fiche.twitter_x || '',
        whatsapp: fiche.whatsapp || '',
        telegram: fiche.telegram || '',
        email: fiche.email || '',
        autres_reseaux: fiche.autres_reseaux || '',
        consommation_alcool: fiche.consommation_alcool ?? false,
        consommation_drogues: fiche.consommation_drogues ?? false,
        frequentations_connues: fiche.frequentations_connues || '',
        endroits_frequentes: fiche.endroits_frequentes || '',
        
        // Informations professionnelles
        profession: fiche.profession || '',
        service_militaire: fiche.service_militaire || '',
        emplois_precedents: fiche.emplois_precedents || '',
        sources_revenus: fiche.sources_revenus || '',
        entreprises_associees: fiche.entreprises_associees || '',
        comptes_bancaires: fiche.comptes_bancaires || '',
        biens_proprietes: fiche.biens_proprietes || '',
        dettes_importantes: fiche.dettes_importantes || '',
        transactions_suspectes: fiche.transactions_suspectes || '',
        
        // Réseau relationnel
        famille_proche: fiche.famille_proche || '',
        amis_proches: fiche.amis_proches || '',
        relations_risque: fiche.relations_risque || '',
        suspects_associes: fiche.suspects_associes || '',
        membres_reseau_criminel: fiche.membres_reseau_criminel || '',
        complices_potentiels: fiche.complices_potentiels || '',
        contacts_recurrents: fiche.contacts_recurrents || '',
        
        // Informations judiciaires
        motif_arrestation: fiche.motif_arrestation || '',
        date_arrestation: fiche.date_arrestation || '',
        province: fiche.province || '',
        region: fiche.region || '',
        district: fiche.district || '',
        lieu_arrestation: fiche.lieu_arrestation || '',
        unite_saisie: fiche.unite_saisie || '',
        reference_pv: fiche.reference_pv || '',
        suite_judiciaire: fiche.suite_judiciaire || '',
        peine_encourue: fiche.peine_encourue || '',
        antecedent_judiciaire: fiche.antecedent_judiciaire || '',
      });
    }
  }, [fiche]);

  // Charger les infractions existantes si en mode édition
  useEffect(() => {
    if (fiche?.infractions && fiche.infractions.length > 0) {
      const infractionsChargees = fiche.infractions.map(inf => ({
        type: inf.type_infraction_libelle || inf.type || '',
        date: inf.date_infraction || '',
        lieu: inf.lieu || '',
        description: inf.description || ''
      }));
      setInfractions(infractionsChargees);
    }
  }, [fiche]);

  // Fonction pour gérer le changement du contact avec préfixe +261 fixe
  const handleContactChange = (e) => {
    let value = e.target.value;
    
    // Supprimer tous les caractères non numériques sauf les espaces
    value = value.replace(/[^\d\s]/g, '');
    
    // Limiter à 9 chiffres (format: XX XX XXX XX)
    value = value.replace(/\D/g, '').slice(0, 9);
    
    // Formater avec espaces: XX XX XXX XX
    let formatted = '';
    if (value.length > 0) {
      formatted = value.slice(0, 2);
      if (value.length > 2) {
        formatted += ' ' + value.slice(2, 4);
        if (value.length > 4) {
          formatted += ' ' + value.slice(4, 7);
          if (value.length > 7) {
            formatted += ' ' + value.slice(7, 9);
          }
        }
      }
    }
    
    // Ajouter le préfixe +261 fixe
    setFormData(prev => ({
      ...prev,
      contact: formatted ? `+261 ${formatted}` : '+261 '
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Formater le CIN avec des espaces (XXX XXX XXX XXX)
    if (name === 'cin') {
      const chiffres = value.replace(/\D/g, '').slice(0, 12);
      let cinFormate = '';
      for (let i = 0; i < chiffres.length; i++) {
        if (i > 0 && i % 3 === 0) {
          cinFormate += ' ';
        }
        cinFormate += chiffres[i];
      }
      setFormData(prev => ({ ...prev, [name]: cinFormate }));
    } else {
      // Convertir les valeurs vides en chaînes vides plutôt qu'en null
      const finalValue = value === null || value === undefined ? '' : value;
      
      // Gérer les dépendances géographiques
      if (name === 'province') {
        // Si la province change, réinitialiser région et district
        setFormData(prev => ({ 
          ...prev, 
          [name]: finalValue,
          region: '',
          district: ''
        }));
      } else if (name === 'region') {
        // Si la région change, réinitialiser le district
        setFormData(prev => ({ 
          ...prev, 
          [name]: finalValue,
          district: ''
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: finalValue }));
      }
    }
    
    if (erreurs[name]) {
      setErreurs(prev => ({ ...prev, [name]: null }));
    }
  };

  const validerFormulaire = () => {
    const nouvellesErreurs = {};

    // Validation du nom (obligatoire)
    if (!formData.nom || !formData.nom.trim()) {
      nouvellesErreurs.nom = 'Le nom est requis';
    }

    // Validation du prénom (obligatoire)
    if (!formData.prenom || !formData.prenom.trim()) {
      nouvellesErreurs.prenom = 'Le prénom est requis';
    }

    // Validation du sexe (obligatoire)
    if (!formData.sexe) {
      nouvellesErreurs.sexe = 'Le sexe est requis';
    } else if (formData.sexe !== 'H' && formData.sexe !== 'F') {
      nouvellesErreurs.sexe = 'Le sexe doit être H ou F';
    }

    // Validation du CIN (optionnel, mais si fourni doit être valide)
    if (formData.cin && formData.cin.trim()) {
      const cinSansEspace = formData.cin.replace(/\s/g, '');
      if (!/^\d{12}$/.test(cinSansEspace)) {
        nouvellesErreurs.cin = 'Le CIN doit contenir exactement 12 chiffres';
      }
    }

    // Validation des dates (si fournies, doivent être valides)
    if (formData.date_naissance && formData.date_naissance.trim()) {
      // Parser la date en local
      const dateNaissanceStr = formData.date_naissance.trim();
      const [year, month, day] = dateNaissanceStr.split('-').map(Number);
      const dateNaissance = new Date(year, month - 1, day); // month - 1 car les mois commencent à 0
      const aujourd_hui = new Date();
      aujourd_hui.setHours(0, 0, 0, 0); // Mettre à minuit pour comparer seulement les dates
      
      if (isNaN(dateNaissance.getTime())) {
        nouvellesErreurs.date_naissance = 'La date de naissance n\'est pas valide';
      } else {
        // Comparer les dates (seulement la partie date, pas l'heure)
        const dateNaissanceOnly = new Date(dateNaissance.getFullYear(), dateNaissance.getMonth(), dateNaissance.getDate());
        const aujourdHuiOnly = new Date(aujourd_hui.getFullYear(), aujourd_hui.getMonth(), aujourd_hui.getDate());
        
        if (dateNaissanceOnly > aujourdHuiOnly) {
          nouvellesErreurs.date_naissance = 'La date de naissance ne peut pas être dans le futur. Veuillez saisir une date passée ou aujourd\'hui.';
        }
        // Vérifier que la personne n'a pas plus de 150 ans
        const age = aujourd_hui.getFullYear() - dateNaissance.getFullYear();
        if (age > 150) {
          nouvellesErreurs.date_naissance = 'La date de naissance semble incorrecte (âge supérieur à 150 ans)';
        }
        // Vérifier que la personne a au moins 0 ans (date pas trop dans le futur)
        if (age < 0) {
          nouvellesErreurs.date_naissance = 'La date de naissance ne peut pas être dans le futur';
        }
      }
    }

    if (formData.date_arrestation && formData.date_arrestation.trim()) {
      // Parser la date en local
      const dateArrestationStr = formData.date_arrestation.trim();
      const [year, month, day] = dateArrestationStr.split('-').map(Number);
      const dateArrestation = new Date(year, month - 1, day); // month - 1 car les mois commencent à 0
      const aujourd_hui = new Date();
      aujourd_hui.setHours(0, 0, 0, 0); // Mettre à minuit pour comparer seulement les dates
      
      if (isNaN(dateArrestation.getTime())) {
        nouvellesErreurs.date_arrestation = 'La date d\'arrestation n\'est pas valide';
      } else {
        // Comparer les dates (seulement la partie date, pas l'heure)
        const dateArrestationOnly = new Date(dateArrestation.getFullYear(), dateArrestation.getMonth(), dateArrestation.getDate());
        const aujourdHuiOnly = new Date(aujourd_hui.getFullYear(), aujourd_hui.getMonth(), aujourd_hui.getDate());
        
        if (dateArrestationOnly > aujourdHuiOnly) {
          nouvellesErreurs.date_arrestation = 'La date d\'arrestation ne peut pas être dans le futur. Veuillez saisir une date passée ou aujourd\'hui.';
        }
      }
    }

    setErreurs(nouvellesErreurs);
    
    // Retourner le résultat et les erreurs pour le logging
    const isValid = Object.keys(nouvellesErreurs).length === 0;
    return { isValid, erreurs: nouvellesErreurs };
  };

  // Gestion des infractions
  const ajouterInfraction = () => {
    setInfractions([...infractions, { type: '', date: '', lieu: '', description: '' }]);
  };

  const supprimerInfraction = (index) => {
    if (infractions.length > 1) {
      const nouvelles = infractions.filter((_, i) => i !== index);
      setInfractions(nouvelles);
    }
  };

  const handleInfractionChange = (index, field, value) => {
    const nouvelles = [...infractions];
    nouvelles[index][field] = value;
    setInfractions(nouvelles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Valider le formulaire
    const { isValid, erreurs: erreursValidation } = validerFormulaire();
    
    if (!isValid) {
      // Afficher un message d'erreur global en haut du formulaire
      const champsErreurs = Object.keys(erreursValidation);
      const messagesErreurs = champsErreurs.map(champ => {
        const label = {
          'nom': 'Nom',
          'prenom': 'Prénom',
          'sexe': 'Sexe',
          'cin': 'CIN',
          'date_naissance': 'Date de naissance',
          'date_arrestation': 'Date d\'arrestation'
        }[champ] || champ;
        return `• ${label}: ${erreursValidation[champ]}`;
      }).join('\n');
      
      setErreurs(prev => ({
        ...prev,
        general: `Veuillez corriger les erreurs suivantes :\n${messagesErreurs}`
      }));
      
      // Scroll vers le haut pour voir les erreurs
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      return;
    }

    // Nettoyer l'erreur générale si elle existe
    setErreurs(prev => ({ ...prev, general: null }));

    setChargement(true);

    try {
      // Inclure les infractions avec les données de la fiche
      const dataAvecInfractions = {
        ...formData,
        infractions: infractions.filter(inf => inf.type && inf.type.trim() !== '')
      };
      
      await onSauvegarder(dataAvecInfractions);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErreurs(prev => ({ ...prev, general: error.message || 'Une erreur est survenue lors de la sauvegarde' }));
    } finally {
      setChargement(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {erreurs.general && (
        <div className="bg-red-50 border-2 border-red-400 text-red-800 px-4 py-3 rounded-lg mb-4 animate-fadeIn">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-red-900 mb-1">Erreurs de validation</p>
              <p className="text-sm whitespace-pre-line">{erreurs.general}</p>
            </div>
          </div>
        </div>
      )}

      {/* Afficher le numéro de fiche si c'est une édition */}
      {fiche?.numero_fiche && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <FileText className="text-blue-600" size={18} />
            <div>
              <p className="text-xs text-gray-600 font-medium">Numéro de fiche</p>
              <p className="text-base font-bold text-blue-800">{fiche.numero_fiche}</p>
            </div>
          </div>
        </div>
      )}

      {/* Message pour la création automatique */}
      {!fiche && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <FileText className="text-green-600" size={18} />
            <p className="text-xs text-green-800">
              <span className="font-semibold">Numéro de dossier :</span> Sera généré automatiquement au format <span className="font-mono font-bold">XXX-CIE/2-RJ</span>
            </p>
          </div>
        </div>
      )}

      {/* Conteneur principal en colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* COLONNE GAUCHE */}
        <div className="space-y-4">
          {/* IDENTIFICATION */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center border-b pb-2">
          <User className="mr-2 text-blue-600" size={18} />
          Identification
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              className={`w-full px-2 py-1 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${erreurs.nom ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Nom"
              required
            />
            {erreurs.nom && <p className="mt-0.5 text-xs text-red-600">{erreurs.nom}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="prenom"
              value={formData.prenom}
              onChange={handleChange}
              className={`w-full px-2 py-1 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${erreurs.prenom ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Prénom"
              required
            />
            {erreurs.prenom && <p className="mt-0.5 text-xs text-red-600">{erreurs.prenom}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Surnom / Alias
            </label>
            <input
              type="text"
              name="surnom"
              value={formData.surnom}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Surnom"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Sexe <span className="text-red-500">*</span>
            </label>
            <select
              name="sexe"
              value={formData.sexe}
              onChange={handleChange}
              className={`w-full px-2 py-1 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${erreurs.sexe ? 'border-red-500' : 'border-gray-300'}`}
              required
            >
              <option value="H">Homme</option>
              <option value="F">Femme</option>
            </select>
            {erreurs.sexe && <p className="mt-0.5 text-xs text-red-600">{erreurs.sexe}</p>}
          </div>
        </div>
      </div>

      {/* NAISSANCE ET NATIONALITE */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center border-b pb-2">
          <Calendar className="mr-2 text-purple-600" size={18} />
          Naissance et Nationalité
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Date de naissance
            </label>
            <input
              type="date"
              name="date_naissance"
              value={formData.date_naissance}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Lieu de naissance
            </label>
            <input
              type="text"
              name="lieu_naissance"
              value={formData.lieu_naissance}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ville, Pays"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Nationalité
            </label>
            <input
              type="text"
              name="nationalite"
              value={formData.nationalite}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Malagasy"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              CIN
            </label>
            <input
              type="text"
              name="cin"
              value={formData.cin}
              onChange={handleChange}
              className={`w-full px-2 py-1 text-xs border rounded-md font-mono tracking-wider text-center focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${erreurs.cin ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="XXX XXX XXX XXX"
              maxLength="15"
            />
            {erreurs.cin && <p className="mt-0.5 text-xs text-red-600">{erreurs.cin}</p>}
          </div>
        </div>
      </div>

      {/* DESCRIPTION PHYSIQUE */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center border-b pb-2">
          <UserCheck className="mr-2 text-indigo-600" size={18} />
          Description Physique
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Corpulence
            </label>
            <select
              name="corpulence"
              value={formData.corpulence}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">-- Sélectionner --</option>
              <option value="mince">Mince</option>
              <option value="normale">Normale</option>
              <option value="forte">Forte</option>
              <option value="obese">Obèse</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Cheveux
            </label>
            <select
              name="cheveux"
              value={formData.cheveux}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">-- Sélectionner --</option>
              <option value="noirs">Noirs</option>
              <option value="bruns">Bruns</option>
              <option value="chatains">Châtains</option>
              <option value="blonds">Blonds</option>
              <option value="roux">Roux</option>
              <option value="gris">Gris</option>
              <option value="blancs">Blancs</option>
              <option value="chauves">Chauves</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Visage
            </label>
            <select
              name="visage"
              value={formData.visage}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">-- Sélectionner --</option>
              <option value="ovale">Ovale</option>
              <option value="rond">Rond</option>
              <option value="carre">Carré</option>
              <option value="allonge">Allongé</option>
              <option value="triangulaire">Triangulaire</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Barbe / Moustache
            </label>
            <select
              name="barbe"
              value={formData.barbe}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">-- Sélectionner --</option>
              <option value="aucune">Aucune</option>
              <option value="courte">Courte</option>
              <option value="longue">Longue</option>
              <option value="moustache">Moustache</option>
              <option value="bouc">Bouc</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Marque(s) particulière(s)
            </label>
            <textarea
              name="marques_particulieres"
              value={formData.marques_particulieres}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder="Tatouages, cicatrices, signes distinctifs..."
            />
          </div>
        </div>
      </div>

      {/* FILIATION */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center border-b pb-2">
          <User className="mr-2 text-green-600" size={18} />
          Filiation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Fils de (Père)
            </label>
            <input
              type="text"
              name="nom_pere"
              value={formData.nom_pere}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
              placeholder="Nom du père"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Et de (Mère)
            </label>
            <input
              type="text"
              name="nom_mere"
              value={formData.nom_mere}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
              placeholder="Nom de la mère"
            />
          </div>
        </div>
      </div>

      {/* COORDONNEES */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center border-b pb-2">
          <MapPin className="mr-2 text-red-600" size={18} />
          Coordonnées
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Adresse actuelle
            </label>
            <input
              type="text"
              name="adresse"
              value={formData.adresse}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500"
              placeholder="Adresse complète"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Contact
            </label>
            <div className="flex items-center">
              <span className="px-2 py-1 text-xs border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-gray-700 font-medium">
                +261
              </span>
              <input
                type="tel"
                name="contact"
                value={formData.contact ? formData.contact.replace('+261 ', '') : ''}
                onChange={handleContactChange}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded-r-md focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="XX XX XXX XX"
                maxLength={13}
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Anciennes adresses
            </label>
            <textarea
              name="anciennes_adresses"
              value={formData.anciennes_adresses}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none"
              placeholder="Liste des anciennes adresses connues (une par ligne)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Adresses secondaires
            </label>
            <textarea
              name="adresses_secondaires"
              value={formData.adresses_secondaires}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none"
              placeholder="Autres adresses (domiciles secondaires, etc.)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Lieux visités fréquemment
            </label>
            <textarea
              name="lieux_visites_frequemment"
              value={formData.lieux_visites_frequemment}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none"
              placeholder="Lieux régulièrement fréquentés"
            />
          </div>
        </div>
      </div>

      {/* DÉPLACEMENTS ET MOBILITÉ */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center border-b pb-2">
          <Car className="mr-2 text-orange-600" size={18} />
          Déplacements et Mobilité
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Véhicules associés
            </label>
            <textarea
              name="vehicules_associes"
              value={formData.vehicules_associes}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
              placeholder="Description des véhicules connus (marque, modèle, couleur, etc.)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Plaques d'immatriculation
            </label>
            <textarea
              name="plaques_immatriculation"
              value={formData.plaques_immatriculation}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
              placeholder="Plaques d'immatriculation des véhicules"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Permis de conduire
            </label>
            <input
              type="text"
              name="permis_conduire"
              value={formData.permis_conduire}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Numéro de permis de conduire"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Trajets habituels
            </label>
            <textarea
              name="trajets_habituels"
              value={formData.trajets_habituels}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
              placeholder="Itinéraires fréquemment empruntés"
            />
          </div>
        </div>
      </div>

      {/* RÉSEAU RELATIONNEL */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center border-b pb-2">
          <Network className="mr-2 text-purple-600" size={18} />
          Réseau Relationnel
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Partenaire affectif
            </label>
            <input
              type="text"
              name="partenaire_affectif"
              value={formData.partenaire_affectif}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Partenaire affectif actuel"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Famille proche
            </label>
            <textarea
              name="famille_proche"
              value={formData.famille_proche}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
              placeholder="Membres de la famille proche (parents, frères, sœurs)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Amis proches
            </label>
            <textarea
              name="amis_proches"
              value={formData.amis_proches}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
              placeholder="Amis proches identifiés"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Relations à risque
            </label>
            <textarea
              name="relations_risque"
              value={formData.relations_risque}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
              placeholder="Relations identifiées comme potentiellement à risque"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Suspects associés
            </label>
            <textarea
              name="suspects_associes"
              value={formData.suspects_associes}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
              placeholder="Autres suspects avec qui il/elle est associé(e)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Membres d'un réseau criminel
            </label>
            <textarea
              name="membres_reseau_criminel"
              value={formData.membres_reseau_criminel}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
              placeholder="Membres identifiés d'un réseau criminel"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Complices potentiels
            </label>
            <textarea
              name="complices_potentiels"
              value={formData.complices_potentiels}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
              placeholder="Complices potentiels identifiés"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Contacts récurrents
            </label>
            <textarea
              name="contacts_recurrents"
              value={formData.contacts_recurrents}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
              placeholder="Contacts récurrents identifiés"
            />
          </div>
        </div>
      </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="space-y-4">
          {/* INFORMATIONS PERSONNELLES / SOCIALES */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center border-b pb-2">
              <Users className="mr-2 text-pink-600" size={18} />
              Informations Personnelles / Sociales
            </h3>
            <div className="space-y-4">
              {/* Situation familiale / affective */}
              <div>
                <h4 className="text-sm font-medium text-gray-800 mb-2">Situation familiale / affective</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Statut matrimonial
                    </label>
                    <select
                      name="statut_matrimonial"
                      value={formData.statut_matrimonial}
                      onChange={handleChange}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                    >
                      <option value="">-- Sélectionner --</option>
                      <option value="celibataire">Célibataire</option>
                      <option value="marie">Marié(e)</option>
                      <option value="divorce">Divorcé(e)</option>
                      <option value="veuf">Veuf(ve)</option>
                      <option value="concubinage">En concubinage</option>
                      <option value="pacs">PACS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Partenaire / Conjoint(e)
                    </label>
                    <input
                      type="text"
                      name="spouse"
                      value={formData.spouse}
                      onChange={handleChange}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="Nom du conjoint ou de la conjointe"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Enfants (si pertinent)
                    </label>
                    <textarea
                      name="children"
                      value={formData.children}
                      onChange={handleChange}
                      rows={1}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500 resize-none"
                      placeholder="Liste des enfants (noms, dates de naissance)"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Personnes proches significatives
                    </label>
                    <textarea
                      name="personnes_proches"
                      value={formData.personnes_proches}
                      onChange={handleChange}
                      rows={1}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500 resize-none"
                      placeholder="Personnes proches importantes (famille, amis proches)"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Dépendants
                    </label>
                    <textarea
                      name="dependants"
                      value={formData.dependants}
                      onChange={handleChange}
                      rows={1}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500 resize-none"
                      placeholder="Personnes à charge"
                    />
                  </div>
                </div>
              </div>

              {/* Réseaux sociaux */}
              <div>
                <h4 className="text-sm font-medium text-gray-800 mb-2">Réseaux sociaux</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Facebook
                    </label>
                    <input
                      type="text"
                      name="facebook"
                      value={formData.facebook}
                      onChange={handleChange}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="URL ou nom d'utilisateur Facebook"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Instagram
                    </label>
                    <input
                      type="text"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleChange}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="Nom d'utilisateur Instagram"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      TikTok
                    </label>
                    <input
                      type="text"
                      name="tiktok"
                      value={formData.tiktok}
                      onChange={handleChange}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="Nom d'utilisateur TikTok"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      X (Twitter)
                    </label>
                    <input
                      type="text"
                      name="twitter_x"
                      value={formData.twitter_x}
                      onChange={handleChange}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="Nom d'utilisateur X"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      WhatsApp (n° associé)
                    </label>
                    <input
                      type="text"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="Numéro WhatsApp"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Telegram
                    </label>
                    <input
                      type="text"
                      name="telegram"
                      value={formData.telegram}
                      onChange={handleChange}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="Nom d'utilisateur Telegram"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Adresse e-mail
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Autres plateformes
                    </label>
                    <textarea
                      name="autres_reseaux"
                      value={formData.autres_reseaux}
                      onChange={handleChange}
                      rows={1}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500 resize-none"
                      placeholder="Autres réseaux sociaux ou plateformes"
                    />
                  </div>
                </div>
              </div>

              {/* Habitudes / modes de vie */}
              <div>
                <h4 className="text-sm font-medium text-gray-800 mb-2">Habitudes / modes de vie</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="consommation_alcool"
                      checked={Boolean(formData.consommation_alcool)}
                      onChange={(e) => setFormData(prev => ({ ...prev, consommation_alcool: Boolean(e.target.checked) }))}
                      className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                    />
                    <label className="text-xs font-medium text-gray-700">
                      Consommation d'alcool
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="consommation_drogues"
                      checked={Boolean(formData.consommation_drogues)}
                      onChange={(e) => setFormData(prev => ({ ...prev, consommation_drogues: Boolean(e.target.checked) }))}
                      className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                    />
                    <label className="text-xs font-medium text-gray-700">
                      Consommation de drogues
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Fréquentations connues
                    </label>
                    <textarea
                      name="frequentations_connues"
                      value={formData.frequentations_connues}
                      onChange={handleChange}
                      rows={1}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500 resize-none"
                      placeholder="Personnes avec qui il/elle fréquente régulièrement"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Endroits fréquentés
                    </label>
                    <textarea
                      name="endroits_frequentes"
                      value={formData.endroits_frequentes}
                      onChange={handleChange}
                      rows={1}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500 resize-none"
                      placeholder="Bars, quartiers, villes fréquentés"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* INFORMATIONS PROFESSIONNELLES / FINANCIÈRES */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center border-b pb-2">
              <Building2 className="mr-2 text-amber-600" size={18} />
              Informations Professionnelles / Financières
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Emploi actuel
                </label>
                <input
                  type="text"
                  name="profession"
                  value={formData.profession}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Profession"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Service militaire
                </label>
                <input
                  type="text"
                  name="service_militaire"
                  value={formData.service_militaire}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Effectué / Non effectué"
                />
              </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Emplois précédents
            </label>
            <textarea
              name="emplois_precedents"
              value={formData.emplois_precedents}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
              placeholder="Historique des emplois précédents"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Sources de revenus
            </label>
            <textarea
              name="sources_revenus"
              value={formData.sources_revenus}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
              placeholder="Sources de revenus identifiées"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Entreprises associées
            </label>
            <textarea
              name="entreprises_associees"
              value={formData.entreprises_associees}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
              placeholder="Entreprises où il/elle a travaillé ou est associé(e)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Comptes bancaires (si enquête)
            </label>
            <textarea
              name="comptes_bancaires"
              value={formData.comptes_bancaires}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
              placeholder="Informations sur les comptes bancaires (si enquête autorisée)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Biens ou propriétés
            </label>
            <textarea
              name="biens_proprietes"
              value={formData.biens_proprietes}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
              placeholder="Biens immobiliers, véhicules, etc."
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Dettes importantes
            </label>
            <textarea
              name="dettes_importantes"
              value={formData.dettes_importantes}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
              placeholder="Dettes connues ou significatives"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Transactions suspectes (si existantes)
            </label>
            <textarea
              name="transactions_suspectes"
              value={formData.transactions_suspectes}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
              placeholder="Transactions financières suspectes identifiées"
            />
          </div>
        </div>
          </div>

          {/* INFORMATIONS JUDICIAIRES */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center border-b pb-1.5">
          <Scale className="mr-1 text-orange-600" size={16} />
          Informations Judiciaires
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Motif de l'arrestation
            </label>
            <textarea
              name="motif_arrestation"
              value={formData.motif_arrestation}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
              placeholder="Description du motif..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Date d'arrestation
            </label>
            <input
              type="date"
              name="date_arrestation"
              value={formData.date_arrestation}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Province (Historique)
            </label>
            <select
              name="province"
              value={formData.province}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">-- Sélectionner --</option>
              {getProvinces().map(province => (
                <option key={province} value={province}>{province}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Région
            </label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
              disabled={!formData.province}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- Sélectionner une région --</option>
              {getRegions(formData.province).map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              District
            </label>
            <select
              name="district"
              value={formData.district}
              onChange={handleChange}
              disabled={!formData.province || !formData.region}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- Sélectionner un district --</option>
              {getDistricts(formData.province, formData.region).map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Lieu d'arrestation
            </label>
            <input
              type="text"
              name="lieu_arrestation"
              value={formData.lieu_arrestation}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Ville spécifique"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Unité saisie
            </label>
            <input
              type="text"
              name="unite_saisie"
              value={formData.unite_saisie}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Nom de l'unité"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Référence P.V
            </label>
            <input
              type="text"
              name="reference_pv"
              value={formData.reference_pv}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Numéro PV"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Suite judiciaire
            </label>
            <textarea
              name="suite_judiciaire"
              value={formData.suite_judiciaire}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
              placeholder="Détails..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Peine encourue
            </label>
            <input
              type="text"
              name="peine_encourue"
              value={formData.peine_encourue}
              onChange={handleChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Ex: 5 ans"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Antécédent judiciaire
            </label>
            <textarea
              name="antecedent_judiciaire"
              value={formData.antecedent_judiciaire}
              onChange={handleChange}
              rows={1}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
              placeholder="Historique..."
            />
          </div>
        </div>
          </div>

          {/* INFRACTIONS */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="mr-2 text-red-600" size={18} />
            Infractions Commises
          </h3>
          <button
            type="button"
            onClick={ajouterInfraction}
            className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium text-xs hover:from-red-700 hover:to-red-800 transition-all flex items-center space-x-1 shadow-sm"
          >
            <Plus size={14} />
            <span>Ajouter</span>
          </button>
        </div>

        <div className="space-y-4">
          {infractions.map((infraction, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
              <div className="absolute top-2 right-2">
                <button
                  type="button"
                  onClick={() => supprimerInfraction(index)}
                  disabled={infractions.length === 1}
                  className={`p-1.5 rounded-lg transition-all ${
                    infractions.length === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                  title="Supprimer cette infraction"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-10">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Type d'infraction <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={infraction.type}
                    onChange={(e) => handleInfractionChange(index, 'type', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    required={index === 0}
                  >
                    <option value="">-- Sélectionner --</option>
                    {typesInfractions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Date de l'infraction
                  </label>
                  <input
                    type="date"
                    value={infraction.date}
                    onChange={(e) => handleInfractionChange(index, 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Lieu de l'infraction
                  </label>
                  <input
                    type="text"
                    value={infraction.lieu}
                    onChange={(e) => handleInfractionChange(index, 'lieu', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    placeholder="Ville, Quartier"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Description
                  </label>
                  <textarea
                    value={infraction.description}
                    onChange={(e) => handleInfractionChange(index, 'description', e.target.value)}
                    rows={1}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none"
                    placeholder="Détails de l'infraction..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {infractions.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm italic">
            Aucune infraction ajoutée. Cliquez sur "Ajouter" pour en créer une.
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
        <button
          type="button"
          onClick={onAnnuler}
          className="px-5 py-2 bg-white border border-gray-300 rounded-lg font-medium text-sm text-gray-700 hover:bg-gray-50 transition-all"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={chargement}
          className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-blue-800 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {chargement ? (
            <>
              <Loader2 className="animate-spin h-4 w-4" />
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>{fiche ? 'Mettre à jour' : 'Créer la fiche'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default FormulaireFicheComplete;

