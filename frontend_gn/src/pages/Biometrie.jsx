
import { useState } from 'react'
import { Fingerprint, Camera, TrendingUp, Users, Image, Database, CheckCircle, AlertTriangle, Info, ChevronLeft, ChevronRight, User } from 'lucide-react'
import TeleverseurPhoto from '../../components/biometrie/TeleverseurPhoto'
import TeleverseurEmpreinte from '../../components/biometrie/TeleverseurEmpreinte'
import GaleriePhotos from '../../components/biometrie/GaleriePhotos'
import { usePermissions } from '../hooks/usePermissions'
import { PERMISSIONS } from '../utils/permissions'

const Biometrie = () => {
  const [ongletActif, setOngletActif] = useState('photos')
  const [photosGalerie, setPhotosGalerie] = useState([])
  const { hasPermission, displayRestrictions, isAnalyste } = usePermissions()
  
  // Vérifier les permissions d'upload
  const peutUploader = hasPermission(PERMISSIONS.BIOMETRIE_UPLOAD)

  // Fonction pour gérer l'ajout de nouvelles photos
  const handlePhotoUpload = (formData) => {
    // Simuler l'ajout des photos à la galerie
    return new Promise((resolve) => {
      setTimeout(() => {
        const nouvellesPhotos = []
        let photoId = photosGalerie.length + 1

        // Récupérer les métadonnées
        const dateCapture = formData.get('dateCapture')
        const lieu = formData.get('lieu')
        const notes = formData.get('notes')

        // Ajouter chaque photo téléversée
        if (formData.get('photo_gauche')) {
          nouvellesPhotos.push({
            id: photoId++,
            nom: formData.get('photo_gauche').name,
            url: URL.createObjectURL(formData.get('photo_gauche')),
            dateAjout: new Date().toISOString(),
            typeProfil: 'gauche',
            lieu: lieu || 'Non spécifié',
            notes: notes || ''
          })
        }

        if (formData.get('photo_face')) {
          nouvellesPhotos.push({
            id: photoId++,
            nom: formData.get('photo_face').name,
            url: URL.createObjectURL(formData.get('photo_face')),
            dateAjout: new Date().toISOString(),
            typeProfil: 'face',
            lieu: lieu || 'Non spécifié',
            notes: notes || ''
          })
        }

        if (formData.get('photo_droit')) {
          nouvellesPhotos.push({
            id: photoId++,
            nom: formData.get('photo_droit').name,
            url: URL.createObjectURL(formData.get('photo_droit')),
            dateAjout: new Date().toISOString(),
            typeProfil: 'droit',
            lieu: lieu || 'Non spécifié',
            notes: notes || ''
          })
        }

        // Ajouter les nouvelles photos à la galerie
        setPhotosGalerie(prev => [...prev, ...nouvellesPhotos])
        
        resolve({ success: true })
      }, 1000)
    })
  }

  // Fonction pour supprimer une photo
  const handlePhotoDelete = (photoId) => {
    setPhotosGalerie(prev => prev.filter(p => p.id !== photoId))
  }

  // Types de profils d'identification
  const typesProfils = [
    {
      type: 'Profil gauche',
      description: 'Photo du visage vue de côté gauche (oreille gauche visible, regard droit)',
      utilisation: 'Permet de voir la forme du nez, des pommettes, du menton du côté gauche.',
      icone: ChevronLeft,
      gradient: 'from-gendarme-blue to-gendarme-blue-dark',
      bg: 'bg-gendarme-blue/10',
      text: 'text-gendarme-blue',
      angle: '90° gauche'
    },
    {
      type: 'Profil face',
      description: 'Photo du visage de face, regard droit vers la caméra',
      utilisation: 'C\'est la photo principale d\'identification utilisée pour la reconnaissance faciale.',
      icone: User,
      gradient: 'from-gendarme-green to-gendarme-green-dark',
      bg: 'bg-gendarme-green/10',
      text: 'text-gendarme-green',
      angle: '0° frontal'
    },
    {
      type: 'Profil droit',
      description: 'Photo du visage vue de côté droit (oreille droite visible, regard droit)',
      utilisation: 'Même principe, mais de l\'autre côté — utile pour la symétrie faciale.',
      icone: ChevronRight,
      gradient: 'from-gendarme-light to-gendarme-light-hover',
      bg: 'bg-gendarme-light/10',
      text: 'text-gendarme-light',
      angle: '90° droit'
    },
  ]

  // Statistiques globales
  const statistiques = [
    {
      titre: 'Total Photos',
      valeur: '1,456',
      evolution: '+12%',
      hausse: true,
      icone: Camera,
      gradient: 'from-gendarme-blue to-gendarme-blue-dark',
      details: 'Photos enregistrées'
    },
    {
      titre: 'Empreintes',
      valeur: '892',
      evolution: '+8%',
      hausse: true,
      icone: Fingerprint,
      gradient: 'from-gendarme-light to-gendarme-light-hover',
      details: 'Empreintes digitales'
    },
    {
      titre: 'Suspects',
      valeur: '234',
      evolution: '+5%',
      hausse: true,
      icone: Users,
      gradient: 'from-gendarme-green to-gendarme-green-dark',
      details: 'Profils biométriques'
    },
    {
      titre: 'Correspondances',
      valeur: '67',
      evolution: '+15%',
      hausse: true,
      icone: CheckCircle,
      gradient: 'from-gendarme-gold to-gendarme-gold-dark',
      details: 'Matches confirmés'
    },
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Message pour Analyste Judiciaire */}
      {isAnalyste && (
        <div className="card-pro p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-600">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Info className="text-white" size={24} />
            </div>
            <div>
              <p className="font-bold text-purple-900 text-lg mb-1">Mode Analyste Judiciaire - Consultation Uniquement</p>
              <p className="text-purple-800 text-sm">
                Vous pouvez <strong>consulter</strong> toutes les données biométriques pour vos analyses.
                Vous ne pouvez <strong>pas téléverser, modifier ou supprimer</strong> de photos ou d'empreintes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques en cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statistiques.map((stat, index) => {
          const Icone = stat.icone
          return (
            <div
              key={index}
              className="stat-card group hover-lift"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* En-tête avec icône et titre */}
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icone className="text-white" size={24} />
                </div>
                <span className={`text-sm font-semibold flex items-center px-2 py-1 rounded-lg ${stat.hausse ? 'text-gendarme-green bg-gendarme-green/10' : 'text-gendarme-red bg-gendarme-red/10'}`}>
                  <TrendingUp size={16} className={`mr-1 ${!stat.hausse && 'rotate-180'}`} />
                  {stat.evolution}
                </span>
              </div>
              
              <p className="text-sm font-bold text-gendarme-dark mb-2">{stat.titre}</p>
              
              {/* Valeur */}
              <p className="text-3xl font-black text-gendarme-dark mb-2">{stat.valeur}</p>
              
              {/* Détails */}
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600">{stat.details}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Onglets modernes */}
      <div className="card-pro p-6">
        <div className="border-b-2 border-gray-100 mb-6">
          <nav className="flex space-x-2">
            <button
              onClick={() => setOngletActif('photos')}
              className={`px-6 py-3 rounded-t-xl font-semibold text-sm transition-all relative ${
                ongletActif === 'photos'
                  ? 'bg-gradient-to-r from-gendarme-blue to-gendarme-blue-dark text-white shadow-lg'
                  : 'text-gray-600 hover:text-gendarme-dark hover:bg-gendarme-gray'
              }`}
            >
              <Camera className="inline mr-2" size={18} />
              Gestion des Photos
              {ongletActif === 'photos' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gendarme-blue"></div>
              )}
            </button>
            <button
              onClick={() => setOngletActif('empreintes')}
              className={`px-6 py-3 rounded-t-xl font-semibold text-sm transition-all relative ${
                ongletActif === 'empreintes'
                  ? 'bg-gradient-to-r from-gendarme-light to-gendarme-light-hover text-white shadow-lg'
                  : 'text-gray-600 hover:text-gendarme-dark hover:bg-gendarme-gray'
              }`}
            >
              <Fingerprint className="inline mr-2" size={18} />
              Empreintes Digitales
              {ongletActif === 'empreintes' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gendarme-light"></div>
              )}
            </button>
          </nav>
        </div>

        <div>
          {ongletActif === 'photos' && (
            <div className="space-y-6">
              {/* Message lecture seule */}
              {displayRestrictions.isReadOnly && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                  <div className="flex items-center">
                    <Info className="text-blue-600 mr-3" size={20} />
                    <p className="text-sm text-blue-700">
                      <span className="font-bold">Mode consultation :</span> Vous pouvez consulter les données biométriques mais pas les modifier.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Guide des types de profils */}
              <div className="bg-gradient-to-r from-gendarme-gray to-white rounded-2xl p-6 border-2 border-gendarme-blue/20">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-br from-gendarme-blue to-gendarme-blue-dark rounded-xl shadow-lg mr-3">
                    <Info className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gendarme-dark">Types de profils d'identification</h3>
                    <p className="text-sm text-gray-600">Les 3 angles requis pour une identification complète</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {typesProfils.map((profil, index) => {
                    const Icone = profil.icone
                    return (
                      <div
                        key={index}
                        className="card-pro-hover p-5 bg-white relative overflow-hidden group"
                      >
                        {/* Badge angle */}
                        <div className="absolute top-3 right-3">
                          <span className={`px-3 py-1 ${profil.bg} ${profil.text} text-xs font-bold rounded-full`}>
                            {profil.angle}
                          </span>
                        </div>

                        {/* Icône */}
                        <div className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br ${profil.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                          <Icone className="text-white" size={36} />
                        </div>

                        {/* Type */}
                        <h4 className={`text-lg font-bold text-center mb-3 ${profil.text}`}>
                          {profil.type}
                        </h4>

                        {/* Description */}
                        <div className="space-y-3">
                          <div className="bg-gendarme-gray rounded-lg p-3">
                            <p className="text-xs text-gray-500 font-semibold mb-1">Description</p>
                            <p className="text-sm text-gray-700">{profil.description}</p>
                          </div>

                          <div className={`${profil.bg} rounded-lg p-3 border border-gray-200`}>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Utilisation</p>
                            <p className="text-sm text-gray-700">{profil.utilisation}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Note importante */}
                <div className="mt-6 bg-gendarme-gold/10 border-l-4 border-gendarme-gold p-4 rounded-r-xl">
                  <div className="flex items-center">
                    <AlertTriangle className="text-gendarme-gold-dark mr-3" size={20} />
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">Note importante :</span> Pour une identification biométrique complète, 
                      il est recommandé de capturer les trois angles (gauche, face, droit) du visage du suspect.
                    </p>
                  </div>
                </div>
              </div>

              {peutUploader && <TeleverseurPhoto onUpload={handlePhotoUpload} />}
              <GaleriePhotos 
                entityId="demo" 
                entityType="suspect" 
                photosInitiales={photosGalerie}
                onDelete={handlePhotoDelete}
              />
            </div>
          )}

          {ongletActif === 'empreintes' && (
            <div className="space-y-6">
              {/* Message lecture seule */}
              {displayRestrictions.isReadOnly && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                  <div className="flex items-center">
                    <Info className="text-blue-600 mr-3" size={20} />
                    <p className="text-sm text-blue-700">
                      <span className="font-bold">Mode consultation :</span> Vous pouvez consulter les empreintes digitales mais pas les modifier.
                    </p>
                  </div>
                </div>
              )}
              
              {peutUploader ? (
                <TeleverseurEmpreinte 
                  suspectId="demo" 
                  onUpload={(data) => console.log('Upload empreintes:', data)} 
                />
              ) : (
                <div className="card-pro p-8 text-center">
                  <Fingerprint className="mx-auto text-gray-400 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-gray-700 mb-2">Consultation uniquement</h3>
                  <p className="text-gray-600">
                    Vous n'avez pas la permission d'ajouter ou de modifier des empreintes digitales.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Biometrie

