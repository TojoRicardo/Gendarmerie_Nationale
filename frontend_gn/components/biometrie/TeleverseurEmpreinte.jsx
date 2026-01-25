import React, { useState, useRef } from 'react';
import { Fingerprint, Upload, Check, AlertCircle, CheckCircle2, Hand } from 'lucide-react';
import Bouton from '../commun/Bouton';

const TeleverseurEmpreinte = ({ onUpload, suspectId }) => {
  const [empreintes, setEmpreintes] = useState({
    droite: {
      pouce: { id: 'pouce_droit', nom: 'Pouce', fichier: null, position: 'pouce' },
      index: { id: 'index_droit', nom: 'Index', fichier: null, position: 'index' },
      majeur: { id: 'majeur_droit', nom: 'Majeur', fichier: null, position: 'majeur' },
      annulaire: { id: 'annulaire_droit', nom: 'Annulaire', fichier: null, position: 'annulaire' },
      auriculaire: { id: 'auriculaire_droit', nom: 'Auriculaire', fichier: null, position: 'auriculaire' },
      paume: { id: 'paume_droite', nom: 'Empreinte palmaire droite', fichier: null, position: 'paume' },
      simultanee: { id: 'simultanee_droite', nom: 'Empreintes simultanées main droite', fichier: null, position: 'simultanee' },
    },
    gauche: {
      pouce: { id: 'pouce_gauche', nom: 'Pouce', fichier: null, position: 'pouce' },
      index: { id: 'index_gauche', nom: 'Index', fichier: null, position: 'index' },
      majeur: { id: 'majeur_gauche', nom: 'Majeur', fichier: null, position: 'majeur' },
      annulaire: { id: 'annulaire_gauche', nom: 'Annulaire', fichier: null, position: 'annulaire' },
      auriculaire: { id: 'auriculaire_gauche', nom: 'Auriculaire', fichier: null, position: 'auriculaire' },
      paume: { id: 'paume_gauche', nom: 'Empreinte palmaire gauche', fichier: null, position: 'paume' },
      simultanee: { id: 'simultanee_gauche', nom: 'Empreintes simultanées main gauche', fichier: null, position: 'simultanee' },
    },
    pouces: {
      gauche: { id: 'pouce_seul_gauche', nom: 'Empreinte du pouce gauche', fichier: null, position: 'pouce_gauche_seul' },
      droit: { id: 'pouce_seul_droit', nom: 'Empreinte du pouce droit', fichier: null, position: 'pouce_droit_seul' },
    }
  });

  const fileInputRefs = useRef({});
  
  const doigtsOrdre = ['pouce', 'index', 'majeur', 'annulaire', 'auriculaire'];

  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  const handleFileSelect = (main, doigt, file) => {
    if (!file) return;

    // Vérifier le format
    const formatsAcceptes = ['image/jpeg', 'image/png', 'image/bmp'];
    if (!formatsAcceptes.includes(file.type)) {
      setErreur('Format non accepté. Utilisez JPG, PNG ou BMP');
      return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErreur('L\'empreinte ne doit pas dépasser 10 MB');
      return;
    }

    setErreur('');
    setSucces('');
    
    setEmpreintes(prev => ({
      ...prev,
      [main]: {
        ...prev[main],
        [doigt]: {
          ...prev[main][doigt],
          fichier: file
        }
      }
    }));
  };

  const supprimerEmpreinte = (main, doigt) => {
    setEmpreintes(prev => ({
      ...prev,
      [main]: {
        ...prev[main],
        [doigt]: {
          ...prev[main][doigt],
          fichier: null
        }
      }
    }));
  };

  const handleUpload = async () => {
    const empreintesValides = [];
    
    Object.keys(empreintes).forEach(main => {
      Object.keys(empreintes[main]).forEach(doigt => {
        if (empreintes[main][doigt].fichier) {
          empreintesValides.push(empreintes[main][doigt]);
        }
      });
    });
    
    if (empreintesValides.length === 0) {
      setErreur('Veuillez sélectionner au moins une empreinte');
      return;
    }

    setEnCours(true);
    setErreur('');
    setSucces('');

    try {
      const formData = new FormData();
      formData.append('suspectId', suspectId);

      empreintesValides.forEach(emp => {
        formData.append(emp.id, emp.fichier);
      });

      await onUpload(formData);
      
      setSucces(`${empreintesValides.length} empreinte(s) téléversée(s) avec succès !`);
      
      // Réinitialiser après 2 secondes
      setTimeout(() => {
        setEmpreintes({
          droite: {
            pouce: { id: 'pouce_droit', nom: 'Pouce', fichier: null, position: 'pouce' },
            index: { id: 'index_droit', nom: 'Index', fichier: null, position: 'index' },
            majeur: { id: 'majeur_droit', nom: 'Majeur', fichier: null, position: 'majeur' },
            annulaire: { id: 'annulaire_droit', nom: 'Annulaire', fichier: null, position: 'annulaire' },
            auriculaire: { id: 'auriculaire_droit', nom: 'Auriculaire', fichier: null, position: 'auriculaire' },
            paume: { id: 'paume_droite', nom: 'Empreinte palmaire droite', fichier: null, position: 'paume' },
            simultanee: { id: 'simultanee_droite', nom: 'Empreintes simultanées main droite', fichier: null, position: 'simultanee' },
          },
          gauche: {
            pouce: { id: 'pouce_gauche', nom: 'Pouce', fichier: null, position: 'pouce' },
            index: { id: 'index_gauche', nom: 'Index', fichier: null, position: 'index' },
            majeur: { id: 'majeur_gauche', nom: 'Majeur', fichier: null, position: 'majeur' },
            annulaire: { id: 'annulaire_gauche', nom: 'Annulaire', fichier: null, position: 'annulaire' },
            auriculaire: { id: 'auriculaire_gauche', nom: 'Auriculaire', fichier: null, position: 'auriculaire' },
            paume: { id: 'paume_gauche', nom: 'Empreinte palmaire gauche', fichier: null, position: 'paume' },
            simultanee: { id: 'simultanee_gauche', nom: 'Empreintes simultanées main gauche', fichier: null, position: 'simultanee' },
          },
          pouces: {
            gauche: { id: 'pouce_seul_gauche', nom: 'Empreinte du pouce gauche', fichier: null, position: 'pouce_gauche_seul' },
            droit: { id: 'pouce_seul_droit', nom: 'Empreinte du pouce droit', fichier: null, position: 'pouce_droit_seul' },
          }
        });
        setSucces('');
      }, 2000);
    } catch (error) {
      setErreur(error.message || 'Erreur lors du téléversement');
    } finally {
      setEnCours(false);
    }
  };

  // Calculer le nombre total d'empreintes sélectionnées
  const nombreEmpreintesSelectionnees = Object.keys(empreintes).reduce((total, main) => {
    return total + Object.keys(empreintes[main]).filter(doigt => empreintes[main][doigt].fichier).length;
  }, 0);

  // Calculer le nombre d'empreintes par main (doigts + paume + simultanée)
  const nombreEmpreintesDroite = doigtsOrdre.filter(doigt => empreintes.droite[doigt].fichier).length;
  const nombreEmpreintesGauche = doigtsOrdre.filter(doigt => empreintes.gauche[doigt].fichier).length;
  
  // Compter les empreintes de pouces simultanées
  const nombreEmpreintesPouces = (empreintes.pouces.gauche.fichier ? 1 : 0) + (empreintes.pouces.droit.fichier ? 1 : 0);

  const renderDoigt = (main, doigt, index) => {
    const empreinte = empreintes[main][doigt];
    const refKey = `${main}_${doigt}`;
    
    // Hauteurs et largeurs différentes pour simuler la main
    const dimensions = {
      pouce: { hauteur: 'h-28', largeur: 'w-20' },
      index: { hauteur: 'h-36', largeur: 'w-16' },
      majeur: { hauteur: 'h-40', largeur: 'w-16' },
      annulaire: { hauteur: 'h-36', largeur: 'w-16' },
      auriculaire: { hauteur: 'h-32', largeur: 'w-14' }
    };

    const marginTops = {
      pouce: 'mt-10',
      index: 'mt-0',
      majeur: 'mt-0',
      annulaire: 'mt-3',
      auriculaire: 'mt-8'
    };

    return (
      <div key={doigt} className={`flex flex-col items-center ${marginTops[doigt]}`}>
        {/* Doigt clickable avec joints */}
        <div className="relative">
          <div
            onClick={() => !empreinte.fichier && fileInputRefs.current[refKey]?.click()}
            className={`
              ${dimensions[doigt].largeur} ${dimensions[doigt].hauteur} rounded-t-3xl cursor-pointer
              flex flex-col items-center justify-center
              transition-all duration-300 relative group
              ${empreinte.fichier 
                ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400 border-4 border-emerald-700 shadow-xl' 
                : 'bg-gradient-to-t from-gray-400 via-gray-300 to-gray-200 border-4 border-gray-500 hover:from-cyan-400 hover:via-cyan-300 hover:to-cyan-200 hover:border-cyan-600'
              }
            `}
          >
            {/* Joints du doigt (lignes horizontales) */}
            <div className="absolute inset-x-0 top-1/3 h-0.5 bg-gray-600 opacity-30"></div>
            <div className="absolute inset-x-0 top-2/3 h-0.5 bg-gray-600 opacity-30"></div>

            {/* Icône */}
            <div className="absolute inset-0 flex items-center justify-center">
              {empreinte.fichier ? (
                <Check className="text-white drop-shadow-lg" size={28} />
              ) : (
                <Fingerprint className="text-gray-600 group-hover:text-cyan-700 transition-colors" size={22} />
              )}
            </div>

            {/* Bouton supprimer au hover si fichier présent */}
            {empreinte.fichier && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  supprimerEmpreinte(main, doigt);
                }}
                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10 hover:bg-red-600 hover:scale-110"
              >
                <span className="text-sm font-bold">×</span>
              </button>
            )}

            {/* Input file caché */}
            <input
              ref={(el) => fileInputRefs.current[refKey] = el}
              type="file"
              accept="image/jpeg,image/png,image/bmp"
              onChange={(e) => handleFileSelect(main, doigt, e.target.files[0])}
              className="hidden"
            />
          </div>
        </div>

        {/* Label du doigt */}
        <div className={`mt-3 text-xs font-bold text-center ${empreinte.fichier ? 'text-emerald-700' : 'text-gray-700'}`}>
          {empreinte.nom}
        </div>
        {empreinte.fichier && (
          <div className="mt-1.5 text-xs text-emerald-600 flex items-center bg-emerald-50 px-2 py-1 rounded-full">
            <CheckCircle2 size={12} className="mr-1" />
            <span className="font-bold">OK</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec progression */}
      <div className="card-pro p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-lg shadow-lg">
              <Fingerprint className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Empreintes digitales et palmaires</h3>
              <p className="text-xs text-gray-600">Capture complète : empreintes individuelles, palmaires et simultanées</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-cyan-600">{nombreEmpreintesSelectionnees}/15</div>
            <p className="text-xs text-gray-500">Empreintes ajoutées</p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="relative">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all duration-500 ease-out"
              style={{ width: `${(nombreEmpreintesSelectionnees / 15) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center font-medium">
            {nombreEmpreintesSelectionnees === 15 ? ' Toutes les empreintes sont enregistrées' : 
             nombreEmpreintesSelectionnees > 0 ? `${Math.round((nombreEmpreintesSelectionnees / 15) * 100)}% complété` : 
             'Cliquez sur chaque zone pour ajouter les empreintes'}
          </p>
        </div>
      </div>

      {/* Messages d'erreur et succès */}
      {erreur && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg flex items-center animate-slideInRight">
          <AlertCircle className="text-red-600 mr-2.5 flex-shrink-0" size={20} />
          <p className="text-red-700 font-medium text-sm">{erreur}</p>
        </div>
      )}

      {succes && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r-lg flex items-center animate-slideInRight">
          <CheckCircle2 className="text-emerald-600 mr-2.5 flex-shrink-0" size={20} />
          <p className="text-emerald-700 font-medium text-sm">{succes}</p>
        </div>
      )}

      {/* Représentation visuelle des mains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main gauche */}
        <div className="card-pro p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Hand className="text-blue-600 transform scale-x-[-1]" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">Main gauche</h4>
                <p className="text-xs text-gray-600">{nombreEmpreintesGauche}/5 doigts</p>
              </div>
            </div>
            {nombreEmpreintesGauche === 5 && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="text-emerald-600" size={14} />
                <span className="text-xs font-bold text-emerald-700">Complet</span>
              </div>
            )}
          </div>

          {/* Visuel de la main gauche - Doigts */}
          <div className="flex justify-center items-end space-x-2 py-6">
            {[...doigtsOrdre].reverse().map((doigt, index) => renderDoigt('gauche', doigt, index))}
          </div>
        </div>

        {/* Main droite */}
        <div className="card-pro p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Hand className="text-blue-600" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">Main droite</h4>
                <p className="text-xs text-gray-600">{nombreEmpreintesDroite}/5 doigts</p>
              </div>
            </div>
            {nombreEmpreintesDroite === 5 && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="text-emerald-600" size={14} />
                <span className="text-xs font-bold text-emerald-700">Complet</span>
              </div>
            )}
          </div>

          {/* Visuel de la main droite - Doigts */}
          <div className="flex justify-center items-end space-x-2 py-6">
            {doigtsOrdre.map((doigt, index) => renderDoigt('droite', doigt, index))}
          </div>
        </div>
      </div>

      {/* Empreintes palmaires - 2 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Empreinte palmaire gauche */}
        <div className="card-pro p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Hand className="text-blue-600" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">Empreinte Palmaire Gauche</h4>
                <p className="text-xs text-gray-600">Paume de la main gauche complète</p>
              </div>
            </div>
            {empreintes.gauche.paume.fichier && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="text-emerald-600" size={14} />
                <span className="text-xs font-bold text-emerald-700">Enregistré</span>
              </div>
            )}
          </div>

          {empreintes.gauche.paume.fichier ? (
            <div className="relative group">
              <div className="relative h-40 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-xl border-3 border-blue-700 shadow-xl overflow-hidden cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle2 className="text-white mx-auto mb-1.5 drop-shadow-lg" size={32} />
                    <p className="text-white font-bold text-base">Palmaire gauche enregistrée</p>
                    <p className="text-white/80 text-xs mt-1">{empreintes.gauche.paume.fichier.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => supprimerEmpreinte('gauche', 'paume')}
                  className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 hover:scale-110 z-10"
                >
                  <span className="text-base font-bold">×</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRefs.current['gauche_paume']?.click()}
              className="h-40 border-3 border-dashed border-blue-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <Hand className="text-blue-400 group-hover:text-blue-600 mb-3 group-hover:scale-110 transition-all" size={48} />
              <p className="text-blue-700 font-bold text-base mb-1.5">Empreinte Palmaire Gauche</p>
              <p className="text-blue-600 text-xs">Cliquez pour téléverser</p>
              <p className="text-gray-500 text-xs mt-1.5">JPG, PNG, BMP • Max 10MB</p>
              <input
                ref={(el) => fileInputRefs.current['gauche_paume'] = el}
                type="file"
                accept="image/jpeg,image/png,image/bmp"
                onChange={(e) => handleFileSelect('gauche', 'paume', e.target.files[0])}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Empreinte palmaire droite */}
        <div className="card-pro p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Hand className="text-blue-600" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">Empreinte Palmaire Droite</h4>
                <p className="text-xs text-gray-600">Paume de la main droite complète</p>
              </div>
            </div>
            {empreintes.droite.paume.fichier && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="text-emerald-600" size={14} />
                <span className="text-xs font-bold text-emerald-700">Enregistré</span>
              </div>
            )}
          </div>

          {empreintes.droite.paume.fichier ? (
            <div className="relative group">
              <div className="relative h-40 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-xl border-3 border-blue-700 shadow-xl overflow-hidden cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle2 className="text-white mx-auto mb-1.5 drop-shadow-lg" size={32} />
                    <p className="text-white font-bold text-base">Palmaire droite enregistrée</p>
                    <p className="text-white/80 text-xs mt-1">{empreintes.droite.paume.fichier.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => supprimerEmpreinte('droite', 'paume')}
                  className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 hover:scale-110 z-10"
                >
                  <span className="text-base font-bold">×</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRefs.current['droite_paume']?.click()}
              className="h-40 border-3 border-dashed border-blue-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <Hand className="text-blue-400 group-hover:text-blue-600 mb-3 group-hover:scale-110 transition-all" size={48} />
              <p className="text-blue-700 font-bold text-base mb-1.5">Empreinte Palmaire Droite</p>
              <p className="text-blue-600 text-xs">Cliquez pour téléverser</p>
              <p className="text-gray-500 text-xs mt-1.5">JPG, PNG, BMP • Max 10MB</p>
              <input
                ref={(el) => fileInputRefs.current['droite_paume'] = el}
                type="file"
                accept="image/jpeg,image/png,image/bmp"
                onChange={(e) => handleFileSelect('droite', 'paume', e.target.files[0])}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Empreintes simultanées - 2 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Empreintes simultanées gauche */}
        <div className="card-pro p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Fingerprint className="text-blue-600" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">Empreintes Simultanées Gauche</h4>
                <p className="text-xs text-gray-600">4 doigts main gauche ensemble</p>
              </div>
            </div>
            {empreintes.gauche.simultanee.fichier && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="text-emerald-600" size={14} />
                <span className="text-xs font-bold text-emerald-700">Enregistré</span>
              </div>
            )}
          </div>

          {empreintes.gauche.simultanee.fichier ? (
            <div className="relative group">
              <div className="relative h-32 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-lg border-2 border-blue-700 shadow-md overflow-hidden cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle2 className="text-white mb-0.5 drop-shadow-lg mx-auto" size={24} />
                    <p className="text-white font-bold text-xs">Simultanées gauche</p>
                    <p className="text-white/80 text-xs mt-0.5">{empreintes.gauche.simultanee.fichier.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => supprimerEmpreinte('gauche', 'simultanee')}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-10"
                >
                  <span className="text-xs font-bold">×</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRefs.current['gauche_simultanee']?.click()}
              className="h-32 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center space-x-1 mb-1.5">
                <Fingerprint className="text-blue-400 group-hover:text-blue-600" size={16} />
                <Fingerprint className="text-blue-400 group-hover:text-blue-600" size={16} />
                <Fingerprint className="text-blue-400 group-hover:text-blue-600" size={16} />
                <Fingerprint className="text-blue-400 group-hover:text-blue-600" size={16} />
              </div>
              <p className="text-blue-700 font-bold text-xs">Simultanées Gauche</p>
              <p className="text-blue-600 text-xs">4 doigts ensemble</p>
              <p className="text-gray-500 text-xs mt-1">JPG, PNG, BMP • Max 10MB</p>
              <input
                ref={(el) => fileInputRefs.current['gauche_simultanee'] = el}
                type="file"
                accept="image/jpeg,image/png,image/bmp"
                onChange={(e) => handleFileSelect('gauche', 'simultanee', e.target.files[0])}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Empreintes simultanées droite */}
        <div className="card-pro p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Fingerprint className="text-blue-600" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">Empreintes Simultanées Droite</h4>
                <p className="text-xs text-gray-600">4 doigts main droite ensemble</p>
              </div>
            </div>
            {empreintes.droite.simultanee.fichier && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="text-emerald-600" size={14} />
                <span className="text-xs font-bold text-emerald-700">Enregistré</span>
              </div>
            )}
          </div>

          {empreintes.droite.simultanee.fichier ? (
            <div className="relative group">
              <div className="relative h-32 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-lg border-2 border-blue-700 shadow-md overflow-hidden cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle2 className="text-white mb-0.5 drop-shadow-lg mx-auto" size={24} />
                    <p className="text-white font-bold text-xs">Simultanées droite</p>
                    <p className="text-white/80 text-xs mt-0.5">{empreintes.droite.simultanee.fichier.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => supprimerEmpreinte('droite', 'simultanee')}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-10"
                >
                  <span className="text-xs font-bold">×</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRefs.current['droite_simultanee']?.click()}
              className="h-32 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center space-x-1 mb-1.5">
                <Fingerprint className="text-blue-400 group-hover:text-blue-600" size={16} />
                <Fingerprint className="text-blue-400 group-hover:text-blue-600" size={16} />
                <Fingerprint className="text-blue-400 group-hover:text-blue-600" size={16} />
                <Fingerprint className="text-blue-400 group-hover:text-blue-600" size={16} />
              </div>
              <p className="text-blue-700 font-bold text-xs">Simultanées Droite</p>
              <p className="text-blue-600 text-xs">4 doigts ensemble</p>
              <p className="text-gray-500 text-xs mt-1">JPG, PNG, BMP • Max 10MB</p>
              <input
                ref={(el) => fileInputRefs.current['droite_simultanee'] = el}
                type="file"
                accept="image/jpeg,image/png,image/bmp"
                onChange={(e) => handleFileSelect('droite', 'simultanee', e.target.files[0])}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Section Empreintes des pouces - Divisée en 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pouce Gauche */}
        <div className="card-pro p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Fingerprint className="text-blue-600" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">Pouce Gauche</h4>
                <p className="text-xs text-gray-600">Empreinte du pouce gauche seul</p>
              </div>
            </div>
            {empreintes.pouces.gauche.fichier && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="text-emerald-600" size={14} />
                <span className="text-xs font-bold text-emerald-700">Enregistré</span>
              </div>
            )}
          </div>

          {empreintes.pouces.gauche.fichier ? (
            <div className="relative group">
              <div className="relative h-32 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-xl border-3 border-blue-700 shadow-xl overflow-hidden cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle2 className="text-white mx-auto mb-1.5 drop-shadow-lg" size={32} />
                    <p className="text-white font-bold text-base">Pouce gauche enregistré</p>
                    <p className="text-white/80 text-xs mt-1">{empreintes.pouces.gauche.fichier.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => supprimerEmpreinte('pouces', 'gauche')}
                  className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 hover:scale-110 z-10"
                >
                  <span className="text-base font-bold">×</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRefs.current['pouce_gauche']?.click()}
              className="h-32 border-3 border-dashed border-blue-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <Fingerprint className="text-blue-400 group-hover:text-blue-600 group-hover:scale-110 transition-all mb-2" size={40} />
              <p className="text-blue-700 font-bold text-base mb-1">Pouce Gauche</p>
              <p className="text-blue-600 text-xs">Cliquez pour ajouter</p>
              <p className="text-gray-500 text-xs mt-1.5">JPG, PNG, BMP • Max 10MB</p>
              <input
                ref={(el) => fileInputRefs.current['pouce_gauche'] = el}
                type="file"
                accept="image/jpeg,image/png,image/bmp"
                onChange={(e) => handleFileSelect('pouces', 'gauche', e.target.files[0])}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Pouce Droit */}
        <div className="card-pro p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Fingerprint className="text-blue-600" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">Pouce Droit</h4>
                <p className="text-xs text-gray-600">Empreinte du pouce droit seul</p>
              </div>
            </div>
            {empreintes.pouces.droit.fichier && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="text-emerald-600" size={14} />
                <span className="text-xs font-bold text-emerald-700">Enregistré</span>
              </div>
            )}
          </div>

          {empreintes.pouces.droit.fichier ? (
            <div className="relative group">
              <div className="relative h-32 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-xl border-3 border-blue-700 shadow-xl overflow-hidden cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle2 className="text-white mx-auto mb-1.5 drop-shadow-lg" size={32} />
                    <p className="text-white font-bold text-base">Pouce droit enregistré</p>
                    <p className="text-white/80 text-xs mt-1">{empreintes.pouces.droit.fichier.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => supprimerEmpreinte('pouces', 'droit')}
                  className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 hover:scale-110 z-10"
                >
                  <span className="text-base font-bold">×</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRefs.current['pouce_droit']?.click()}
              className="h-32 border-3 border-dashed border-blue-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <Fingerprint className="text-blue-400 group-hover:text-blue-600 group-hover:scale-110 transition-all mb-2" size={40} />
              <p className="text-blue-700 font-bold text-base mb-1">Pouce Droit</p>
              <p className="text-blue-600 text-xs">Cliquez pour ajouter</p>
              <p className="text-gray-500 text-xs mt-1.5">JPG, PNG, BMP • Max 10MB</p>
              <input
                ref={(el) => fileInputRefs.current['pouce_droit'] = el}
                type="file"
                accept="image/jpeg,image/png,image/bmp"
                onChange={(e) => handleFileSelect('pouces', 'droit', e.target.files[0])}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="card-pro p-5 bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200">
        <div className="flex items-start space-x-2.5">
          <div className="p-2 bg-cyan-600 rounded-lg flex-shrink-0">
            <AlertCircle className="text-white" size={18} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-2 text-sm">Instructions - Norme internationale</h4>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• <span className="font-semibold">1. Doigts individuels :</span> Cliquez sur chaque doigt (10 empreintes)</li>
              <li>• <span className="font-semibold">2. Empreintes palmaires :</span> Gauche et droite séparées (2 empreintes)</li>
              <li>• <span className="font-semibold">3. Empreintes simultanées :</span> 4 doigts par main séparés (2 empreintes)</li>
              <li>• <span className="font-semibold">4. Empreintes des pouces :</span> Gauche et droit séparés (2 empreintes)</li>
              <li>• <span className="font-semibold">Total maximum :</span> 16 empreintes biométriques complètes</li>
              <li>• Conforme aux standards internationaux de capture biométrique</li>
              <li>• Formats acceptés: JPG, PNG, BMP • Taille maximum: 10MB</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end space-x-2.5">
        <button
          onClick={() => {
            if (window.confirm('Êtes-vous sûr de vouloir réinitialiser toutes les empreintes ?')) {
              setEmpreintes({
                droite: {
                  pouce: { id: 'pouce_droit', nom: 'Pouce', fichier: null, position: 'pouce' },
                  index: { id: 'index_droit', nom: 'Index', fichier: null, position: 'index' },
                  majeur: { id: 'majeur_droit', nom: 'Majeur', fichier: null, position: 'majeur' },
                  annulaire: { id: 'annulaire_droit', nom: 'Annulaire', fichier: null, position: 'annulaire' },
                  auriculaire: { id: 'auriculaire_droit', nom: 'Auriculaire', fichier: null, position: 'auriculaire' },
                  paume: { id: 'paume_droite', nom: 'Empreinte palmaire droite', fichier: null, position: 'paume' },
                  simultanee: { id: 'simultanee_droite', nom: 'Empreintes simultanées main droite', fichier: null, position: 'simultanee' },
                },
                gauche: {
                  pouce: { id: 'pouce_gauche', nom: 'Pouce', fichier: null, position: 'pouce' },
                  index: { id: 'index_gauche', nom: 'Index', fichier: null, position: 'index' },
                  majeur: { id: 'majeur_gauche', nom: 'Majeur', fichier: null, position: 'majeur' },
                  annulaire: { id: 'annulaire_gauche', nom: 'Annulaire', fichier: null, position: 'annulaire' },
                  auriculaire: { id: 'auriculaire_gauche', nom: 'Auriculaire', fichier: null, position: 'auriculaire' },
                  paume: { id: 'paume_gauche', nom: 'Empreinte palmaire gauche', fichier: null, position: 'paume' },
                  simultanee: { id: 'simultanee_gauche', nom: 'Empreintes simultanées main gauche', fichier: null, position: 'simultanee' },
                },
                pouces: {
                  simultanee: { id: 'pouces_simultanees', nom: 'Empreintes apposées des pouces', fichier: null, position: 'pouces_simultanees' },
                }
              });
            }
          }}
          className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all text-sm"
          disabled={enCours || nombreEmpreintesSelectionnees === 0}
        >
          Réinitialiser
        </button>
        <button
          onClick={handleUpload}
          disabled={nombreEmpreintesSelectionnees === 0 || enCours}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center space-x-2 shadow-md text-sm ${
            nombreEmpreintesSelectionnees === 0 || enCours
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white hover:from-cyan-700 hover:to-cyan-800 hover:scale-105'
          }`}
        >
          {enCours ? (
            <>
              <div className="animate-spin-reverse rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Téléversement...</span>
            </>
          ) : (
            <>
              <Upload size={18} />
              <span>Enregistrer ({nombreEmpreintesSelectionnees})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TeleverseurEmpreinte;

