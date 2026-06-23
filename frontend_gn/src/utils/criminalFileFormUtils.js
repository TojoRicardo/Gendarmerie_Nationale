/**
 * Normalise les données du formulaire fiche criminelle avant envoi à l'API.
 * Utilisé à la création ET à la modification pour garantir le même mapping.
 */
export function buildCriminalFilePayload(formData) {
  return {
    // Informations générales (obligatoires)
    nom: formData.nom?.trim() || '',
    prenom: formData.prenom?.trim() || '',
    sexe: formData.sexe || 'H',

    // Informations optionnelles
    surnom: formData.surnom?.trim() || '',
    date_naissance:
      formData.date_naissance && formData.date_naissance.trim() !== ''
        ? formData.date_naissance
        : null,
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

    // Coordonnées et déplacements
    adresse: formData.adresse?.trim() || '',
    contact: formData.contact?.trim() || '',
    anciennes_adresses: formData.anciennes_adresses?.trim() || '',
    adresses_secondaires: formData.adresses_secondaires?.trim() || '',
    lieux_visites_frequemment: formData.lieux_visites_frequemment?.trim() || '',
    vehicules_associes: formData.vehicules_associes?.trim() || '',
    plaques_immatriculation: formData.plaques_immatriculation?.trim() || '',
    permis_conduire: formData.permis_conduire?.trim() || '',
    trajets_habituels: formData.trajets_habituels?.trim() || '',

    // Informations personnelles / sociales
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
    consommation_alcool: Boolean(formData.consommation_alcool),
    consommation_drogues: Boolean(formData.consommation_drogues),
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
    date_arrestation:
      formData.date_arrestation && formData.date_arrestation.trim() !== ''
        ? formData.date_arrestation
        : null,
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
}
