import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Shield, Camera } from 'lucide-react';
import ChampTexte from '../commun/ChampTexte';
import Select from '../commun/Select';
import Bouton from '../commun/Bouton';

const FormulaireUtilisateur = ({ utilisateur, onSauvegarder, onAnnuler }) => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    matricule: '',
    roleId: '',
    statut: 'actif',
    motDePasse: '',
    confirmerMotDePasse: '',
    photo: null,
  });

  const [erreurs, setErreurs] = useState({});
  const [chargement, setChargement] = useState(false);
  const [roles, setRoles] = useState([]);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => {
    if (utilisateur) {
      setFormData({
        ...utilisateur,
        motDePasse: '',
        confirmerMotDePasse: '',
      });
      setPreviewPhoto(utilisateur.photo);
    }
    chargerRoles();
  }, [utilisateur]);

  const chargerRoles = async () => {
    try {
      const response = await fetch('/api/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.map(role => ({ value: role.id, label: role.nom })));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Effacer l'erreur pour ce champ
    if (erreurs[name]) {
      setErreurs(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validerFormulaire = () => {
    const nouvellesErreurs = {};

    if (!formData.nom.trim()) nouvellesErreurs.nom = 'Le nom est requis';
    if (!formData.prenom.trim()) nouvellesErreurs.prenom = 'Le prénom est requis';
    if (!formData.email.trim()) {
      nouvellesErreurs.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nouvellesErreurs.email = 'Email invalide';
    }
    if (!formData.matricule.trim()) nouvellesErreurs.matricule = 'Le matricule est requis';
    if (!formData.roleId) nouvellesErreurs.roleId = 'Le rôle est requis';

    // Validation du mot de passe (seulement pour nouveau utilisateur ou si renseigné)
    if (!utilisateur || formData.motDePasse) {
      if (!formData.motDePasse) {
        nouvellesErreurs.motDePasse = 'Le mot de passe est requis';
      } else if (formData.motDePasse.length < 8) {
        nouvellesErreurs.motDePasse = 'Le mot de passe doit contenir au moins 8 caractères';
      }

      if (formData.motDePasse !== formData.confirmerMotDePasse) {
        nouvellesErreurs.confirmerMotDePasse = 'Les mots de passe ne correspondent pas';
      }
    }

    setErreurs(nouvellesErreurs);
    return Object.keys(nouvellesErreurs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validerFormulaire()) return;

    setChargement(true);

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });

      await onSauvegarder(formDataToSend);
    } catch (error) {
      setErreurs({ general: error.message });
    } finally {
      setChargement(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {erreurs.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {erreurs.general}
        </div>
      )}

      {/* Photo de profil */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {previewPhoto ? (
              <img src={previewPhoto} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-gray-400" />
            )}
          </div>
          <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700">
            <Camera size={16} className="text-white" />
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-sm text-gray-500 mt-2">Photo de profil</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChampTexte
          label="Nom"
          name="nom"
          value={formData.nom}
          onChange={handleChange}
          erreur={erreurs.nom}
          icone={User}
          required
        />

        <ChampTexte
          label="Prénom"
          name="prenom"
          value={formData.prenom}
          onChange={handleChange}
          erreur={erreurs.prenom}
          icone={User}
          required
        />

        <ChampTexte
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          erreur={erreurs.email}
          icone={Mail}
          required
        />

        <ChampTexte
          label="Téléphone"
          name="telephone"
          value={formData.telephone}
          onChange={handleChange}
          erreur={erreurs.telephone}
          icone={Phone}
        />

        <ChampTexte
          label="Matricule"
          name="matricule"
          value={formData.matricule}
          onChange={handleChange}
          erreur={erreurs.matricule}
          required
        />

        <Select
          label="Rôle"
          name="roleId"
          value={formData.roleId}
          onChange={handleChange}
          options={roles}
          erreur={erreurs.roleId}
          required
        />

        <Select
          label="Statut"
          name="statut"
          value={formData.statut}
          onChange={handleChange}
          options={[
            { value: 'actif', label: 'Actif' },
            { value: 'inactif', label: 'Inactif' },
            { value: 'suspendu', label: 'Suspendu' },
          ]}
        />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-medium mb-4">
          {utilisateur ? 'Changer le mot de passe (optionnel)' : 'Mot de passe'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChampTexte
            label="Mot de passe"
            name="motDePasse"
            type="password"
            value={formData.motDePasse}
            onChange={handleChange}
            erreur={erreurs.motDePasse}
            icone={Lock}
            required={!utilisateur}
          />

          <ChampTexte
            label="Confirmer le mot de passe"
            name="confirmerMotDePasse"
            type="password"
            value={formData.confirmerMotDePasse}
            onChange={handleChange}
            erreur={erreurs.confirmerMotDePasse}
            icone={Lock}
            required={!utilisateur}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Bouton
          type="button"
          variant="secondary"
          onClick={onAnnuler}
        >
          Annuler
        </Bouton>
        <Bouton
          type="submit"
          variant="primary"
          chargement={chargement}
        >
          {utilisateur ? 'Mettre à jour' : 'Créer'}
        </Bouton>
      </div>
    </form>
  );
};

export default FormulaireUtilisateur;

