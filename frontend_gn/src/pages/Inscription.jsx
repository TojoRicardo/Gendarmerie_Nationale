import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Eye, EyeOff, UserPlus, Mail, Lock, AlertCircle, CheckCircle2
} from 'lucide-react';
import '../styles/inscription.css';

const Inscription = () => {
  const navigate = useNavigate();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);

  const [formulaire, setFormulaire] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    matricule: '',
    grade: '',
    unite: '',
    motDePasse: '',
    confirmMotDePasse: ''
  });

  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [afficherConfirmation, setAfficherConfirmation] = useState(false);
  const [erreursValidation, setErreursValidation] = useState({});
  const [rememberMe, setRememberMe] = useState(false);

  // Validation des champs
  const validerChamp = (nom, valeur) => {
    const erreurs = { ...erreursValidation };

    switch (nom) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeur)) {
          erreurs.email = 'Email invalide';
        } else {
          delete erreurs.email;
        }
        break;

      case 'telephone':
        if (!/^(\+261|0)[23][0-9]{9}$/.test(valeur.replace(/\s/g, ''))) {
          erreurs.telephone = 'Numéro invalide';
        } else {
          delete erreurs.telephone;
        }
        break;

      case 'matricule':
        const matriculeSansEspace = valeur.replace(/\s/g, '');
        if (matriculeSansEspace.length !== 5) {
          erreurs.matricule = 'Le matricule doit contenir 5 chiffres';
        } else if (!/^[0-9]{5}$/.test(matriculeSansEspace)) {
          erreurs.matricule = 'Le matricule doit contenir uniquement des chiffres';
        } else {
          delete erreurs.matricule;
        }
        break;

      case 'motDePasse':
        if (valeur.length < 8) {
          erreurs.motDePasse = 'Minimum 8 caractères';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(valeur)) {
          erreurs.motDePasse = 'Doit contenir majuscule, minuscule et chiffre';
        } else {
          delete erreurs.motDePasse;
        }
        if (formulaire.confirmMotDePasse && valeur !== formulaire.confirmMotDePasse) {
          erreurs.confirmMotDePasse = 'Les mots de passe ne correspondent pas';
        } else {
          delete erreurs.confirmMotDePasse;
        }
        break;

      case 'confirmMotDePasse':
        if (valeur !== formulaire.motDePasse) {
          erreurs.confirmMotDePasse = 'Les mots de passe ne correspondent pas';
        } else {
          delete erreurs.confirmMotDePasse;
        }
        break;

      default:
        if (!valeur.trim()) {
          erreurs[nom] = 'Ce champ est requis';
        } else {
          delete erreurs[nom];
        }
    }

    setErreursValidation(erreurs);
  };

  const formatTelephone = (value) => {
    const numbers = value.replace(/\D/g, '');
    let formatted = '+261 ';
    let digits = numbers;
    if (numbers.startsWith('261')) {
      digits = numbers.substring(3);
    } else if (numbers.startsWith('0')) {
      digits = numbers.substring(1);
    }
    if (digits.length > 0) {
      formatted += digits.substring(0, 2);
    }
    if (digits.length > 2) {
      formatted += ' ' + digits.substring(2, 5);
    }
    if (digits.length > 5) {
      formatted += ' ' + digits.substring(5, 7);
    }
    return formatted;
  };

  const formatMatricule = (value) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.substring(0, 5);
    if (limited.length <= 2) {
      return limited;
    } else {
      return limited.substring(0, 2) + ' ' + limited.substring(2);
    }
  };

  const handleTelephoneChange = (e) => {
    const { value } = e.target;
    const formatted = formatTelephone(value);
    setFormulaire(prev => ({ ...prev, telephone: formatted }));
    validerChamp('telephone', formatted);
  };

  const handleMatriculeChange = (e) => {
    const { value } = e.target;
    const formatted = formatMatricule(value);
    setFormulaire(prev => ({ ...prev, matricule: formatted }));
    validerChamp('matricule', formatted);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'telephone') {
      handleTelephoneChange(e);
      return;
    }
    
    if (name === 'matricule') {
      handleMatriculeChange(e);
      return;
    }
    
    setFormulaire(prev => ({ ...prev, [name]: value }));
    validerChamp(name, value);
  };

  const validerFormulaire = () => {
    const erreurs = {};

    if (!formulaire.nom.trim()) erreurs.nom = 'Nom requis';
    if (!formulaire.prenom.trim()) erreurs.prenom = 'Prénom requis';
    if (!formulaire.email.trim()) erreurs.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulaire.email)) {
      erreurs.email = 'Email invalide';
    }
    if (!formulaire.telephone.trim()) erreurs.telephone = 'Téléphone requis';
    else if (!/^(\+261|0)[23][0-9]{8}$/.test(formulaire.telephone.replace(/\s/g, ''))) {
      erreurs.telephone = 'Numéro invalide';
    }
    if (!formulaire.matricule.trim()) {
      erreurs.matricule = 'Matricule requis';
    } else {
      const matriculeSansEspace = formulaire.matricule.replace(/\s/g, '');
      if (matriculeSansEspace.length !== 5) {
        erreurs.matricule = 'Le matricule doit contenir 5 chiffres';
      } else if (!/^[0-9]{5}$/.test(matriculeSansEspace)) {
        erreurs.matricule = 'Le matricule doit contenir uniquement des chiffres';
      }
    }
    if (!formulaire.grade.trim()) erreurs.grade = 'Grade requis';
    if (!formulaire.unite.trim()) erreurs.unite = 'Unité requise';
    if (!formulaire.motDePasse) erreurs.motDePasse = 'Mot de passe requis';
    else if (formulaire.motDePasse.length < 8) {
      erreurs.motDePasse = 'Minimum 8 caractères';
    }
    if (!formulaire.confirmMotDePasse) erreurs.confirmMotDePasse = 'Confirmation requise';
    else if (formulaire.motDePasse !== formulaire.confirmMotDePasse) {
      erreurs.confirmMotDePasse = 'Les mots de passe ne correspondent pas';
    }

    setErreursValidation(erreurs);
    return Object.keys(erreurs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validerFormulaire()) return;

    setChargement(true);
    setErreur('');

    try {
      // MODE DÉVELOPPEMENT - Simulation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simuler une inscription réussie
      setSucces(true);
      
      // Rediriger après 3 secondes
      setTimeout(() => {
        navigate('/connexion');
      }, 3000);

    } catch (error) {
      setErreur(error.message || 'Erreur lors de l\'inscription');
    } finally {
      setChargement(false);
    }
  };

  const grades = [
    { value: '', label: 'Sélectionner un grade' },
    { value: 'GCA', label: 'GCA' },
    { value: 'GD', label: 'GD' },
    { value: 'GB', label: 'GB' },
    { value: 'Col', label: 'Col' },
    { value: 'LtCol', label: 'LtCol' },
    { value: 'CEN', label: 'CEN' },
    { value: 'CNE', label: 'CNE' },
    { value: 'Ltn', label: 'Ltn' },
    { value: 'SLTN', label: 'SLTN' },
    { value: 'Gpce', label: 'Gpce' },
    { value: 'Ghpc', label: 'Ghpc' },
    { value: 'Gp1c', label: 'Gp1c' },
    { value: 'Gp2c', label: 'Gp2c' },
    { value: 'GHC', label: 'GHC' },
    { value: 'G1C', label: 'G1C' },
    { value: 'G2C', label: 'G2C' },
    { value: 'Gst', label: 'Gst' }
  ];

  if (succes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-orange-50 to-amber-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Inscription réussie !
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Votre compte a été créé avec succès. Vous allez être redirigé vers la page de connexion.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-orange-50 to-amber-100 py-12 px-4 sm:px-6 lg:px-8">
      <form className="form" onSubmit={handleSubmit}>
        {/* Nom et Prénom */}
        <div className="flex-column">
          <label>Nom complet</label>
        </div>
        <div className="inputForm">
          <svg height="20" viewBox="0 0 32 32" width="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 16a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm0 2c-4.418 0-8 1.791-8 4v2h16v-2c0-2.209-3.582-4-8-4z" fill="#9ca3af"/>
          </svg>
          <input
            type="text"
            className="input"
            placeholder="Nom"
            name="nom"
            value={formulaire.nom}
            onChange={handleChange}
            required
          />
        </div>
        {erreursValidation.nom && (
          <p className="text-xs text-red-600 mt-1">{erreursValidation.nom}</p>
        )}

        <div className="inputForm">
          <svg height="20" viewBox="0 0 32 32" width="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 16a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm0 2c-4.418 0-8 1.791-8 4v2h16v-2c0-2.209-3.582-4-8-4z" fill="#9ca3af"/>
          </svg>
          <input
            type="text"
            className="input"
            placeholder="Prénom"
            name="prenom"
            value={formulaire.prenom}
            onChange={handleChange}
            required
          />
        </div>
        {erreursValidation.prenom && (
          <p className="text-xs text-red-600 mt-1">{erreursValidation.prenom}</p>
        )}

        {/* Email */}
        <div className="flex-column">
          <label>Email</label>
        </div>
        <div className="inputForm">
          <svg height="20" viewBox="0 0 32 32" width="20" xmlns="http://www.w3.org/2000/svg">
            <g id="Layer_3" data-name="Layer 3">
              <path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z" fill="#9ca3af"/>
            </g>
          </svg>
          <input
            type="email"
            className="input"
            placeholder="Enter your Email"
            name="email"
            value={formulaire.email}
            onChange={handleChange}
            required
          />
        </div>
        {erreursValidation.email && (
          <p className="text-xs text-red-600 mt-1">{erreursValidation.email}</p>
        )}

        {/* Téléphone */}
        <div className="flex-column">
          <label>Téléphone</label>
        </div>
        <div className="inputForm">
          <svg height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="#9ca3af"/>
          </svg>
          <input
            type="text"
            className="input"
            placeholder="+261 __ ___ __"
            name="telephone"
            value={formulaire.telephone}
            onChange={handleChange}
            onFocus={(e) => {
              if (!e.target.value) {
                setFormulaire(prev => ({ ...prev, telephone: '+261 ' }));
              }
            }}
            required
          />
        </div>
        {erreursValidation.telephone && (
          <p className="text-xs text-red-600 mt-1">{erreursValidation.telephone}</p>
        )}

        {/* Matricule */}
        <div className="flex-column">
          <label>Matricule</label>
        </div>
        <div className="inputForm">
          <svg height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" fill="#9ca3af"/>
          </svg>
          <input
            type="text"
            className="input"
            placeholder="00 000"
            name="matricule"
            value={formulaire.matricule}
            onChange={handleChange}
            maxLength={6}
            required
          />
        </div>
        {erreursValidation.matricule && (
          <p className="text-xs text-red-600 mt-1">{erreursValidation.matricule}</p>
        )}

        {/* Grade */}
        <div className="flex-column">
          <label>Grade</label>
        </div>
        <div className="inputForm">
          <svg height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="#9ca3af"/>
          </svg>
          <select
            className="input"
            name="grade"
            value={formulaire.grade}
            onChange={handleChange}
            required
            style={{ background: 'transparent', appearance: 'none', cursor: 'pointer' }}
          >
            {grades.map(grade => (
              <option key={grade.value} value={grade.value}>
                {grade.label}
              </option>
            ))}
          </select>
        </div>
        {erreursValidation.grade && (
          <p className="text-xs text-red-600 mt-1">{erreursValidation.grade}</p>
        )}

        {/* Unité */}
        <div className="flex-column">
          <label>Unité / Service</label>
        </div>
        <div className="inputForm">
          <svg height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" fill="#9ca3af"/>
          </svg>
          <input
            type="text"
            className="input"
            placeholder="Ex: Brigade d'Antananarivo"
            name="unite"
            value={formulaire.unite}
            onChange={handleChange}
            required
          />
        </div>
        {erreursValidation.unite && (
          <p className="text-xs text-red-600 mt-1">{erreursValidation.unite}</p>
        )}

        {/* Password */}
        <div className="flex-column">
          <label>Password</label>
        </div>
        <div className="inputForm">
          <svg height="20" viewBox="-64 0 512 512" width="20" xmlns="http://www.w3.org/2000/svg">
            <path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0" fill="#9ca3af"/>
            <path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0" fill="#9ca3af"/>
          </svg>
          <input
            type={afficherMotDePasse ? 'text' : 'password'}
            className="input"
            placeholder="Enter your Password"
            name="motDePasse"
            value={formulaire.motDePasse}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            onClick={() => setAfficherMotDePasse(!afficherMotDePasse)}
            className="cursor-pointer"
          >
            {afficherMotDePasse ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <svg viewBox="0 0 576 512" height="1em" xmlns="http://www.w3.org/2000/svg">
                <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z" fill="#9ca3af"/>
              </svg>
            )}
          </button>
        </div>
        {erreursValidation.motDePasse && (
          <p className="text-xs text-red-600 mt-1">{erreursValidation.motDePasse}</p>
        )}

        {/* Confirm Password */}
        <div className="flex-column">
          <label>Confirm Password</label>
        </div>
        <div className="inputForm">
          <svg height="20" viewBox="-64 0 512 512" width="20" xmlns="http://www.w3.org/2000/svg">
            <path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0" fill="#9ca3af"/>
            <path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0" fill="#9ca3af"/>
          </svg>
          <input
            type={afficherConfirmation ? 'text' : 'password'}
            className="input"
            placeholder="Confirm your Password"
            name="confirmMotDePasse"
            value={formulaire.confirmMotDePasse}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            onClick={() => setAfficherConfirmation(!afficherConfirmation)}
            className="cursor-pointer"
          >
            {afficherConfirmation ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <svg viewBox="0 0 576 512" height="1em" xmlns="http://www.w3.org/2000/svg">
                <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z" fill="#9ca3af"/>
              </svg>
            )}
          </button>
        </div>
        {erreursValidation.confirmMotDePasse && (
          <p className="text-xs text-red-600 mt-1">{erreursValidation.confirmMotDePasse}</p>
        )}

        {/* Message d'erreur */}
        {erreur && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border-2 border-red-400 text-red-900">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold mb-1 text-sm">Erreur d'inscription</p>
                <p className="text-sm">{erreur}</p>
              </div>
            </div>
          </div>
        )}

        {/* Remember me et Forgot password */}
        <div className="flex-row">
          <div>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mr-2"
            />
            <label>Remember me</label>
          </div>
          <span className="span">Forgot password?</span>
        </div>

        {/* Bouton Submit */}
        <button
          type="submit"
          disabled={chargement}
          className="button-submit"
        >
          {chargement ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          ) : (
            <UserPlus className="h-5 w-5 mr-2" />
          )}
          {chargement ? 'Inscription...' : 'Sign Up'}
        </button>

        {/* Lien vers connexion */}
        <p className="p">
          Have an account? <Link to="/connexion" className="span">Sign In</Link>
        </p>

        {/* Séparateur */}
        <p className="p line">Or With</p>

        {/* Boutons Google et Apple */}
        <div className="flex-row">
          <button type="button" className="btn google">
            <svg version="1.1" width="20" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style={{enableBackground: 'new 0 0 512 512'}} xmlSpace="preserve">
              <path style={{fill: '#FBBB00'}} d="M113.47,309.408L95.648,375.94l-65.139,1.378C11.042,341.211,0,299.9,0,256
                c0-42.451,10.324-82.483,28.624-117.732h0.014l57.992,10.632l25.404,57.644c-5.317,15.501-8.215,32.141-8.215,49.456
                C103.821,274.792,107.225,292.797,113.47,309.408z"/>
              <path style={{fill: '#518EF8'}} d="M507.527,208.176C510.467,223.662,512,239.655,512,256c0,18.328-1.927,36.206-5.598,53.451
                c-12.462,58.683-45.025,109.925-90.134,146.187l-0.014-0.014l-73.044-3.727l-10.338-64.535
                c29.932-17.554,53.324-45.025,65.646-77.911h-136.89V208.176h138.887L507.527,208.176L507.527,208.176z"/>
              <path style={{fill: '#28B446'}} d="M416.253,455.624l0.014,0.014C372.396,490.901,316.666,512,256,512
                c-97.491,0-182.252-54.491-225.491-134.681l82.961-67.91c21.619,57.698,77.278,98.771,142.53,98.771
                c28.047,0,54.323-7.582,76.87-20.818L416.253,455.624z"/>
              <path style={{fill: '#F14336'}} d="M419.404,58.936l-82.933,67.896c-23.335-14.586-50.919-23.012-80.471-23.012
                c-66.729,0-123.429,42.957-143.965,102.724l-83.397-68.276h-0.014C71.23,56.123,157.06,0,256,0
                C318.115,0,375.068,22.126,419.404,58.936z"/>
            </svg>
            Google
          </button>

          <button type="button" className="btn apple">
            <svg version="1.1" height="20" width="20" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 22.773 22.773" style={{enableBackground: 'new 0 0 22.773 22.773'}} xmlSpace="preserve">
              <g>
                <g>
                  <path d="M15.769,0c0.053,0,0.106,0,0.162,0c0.13,1.606-0.483,2.806-1.228,3.675c-0.731,0.863-1.732,1.7-3.351,1.573 c-0.108-1.583,0.506-2.694,1.25-3.561C13.292,0.879,14.557,0.16,15.769,0z" fill="#000000"/>
                  <path d="M20.67,16.716c0,0.016,0,0.03,0,0.045c-0.455,1.378-1.104,2.559-1.896,3.655c-0.723,0.995-1.609,2.334-3.191,2.334 c-1.367,0-2.275-0.879-3.676-0.903c-1.482-0.024-2.297,0.735-3.652,0.926c-0.155,0-0.31,0-0.462,0 c-0.995-0.144-1.798-0.932-2.383-1.642c-1.725-2.098-3.058-4.808-3.306-8.276c0-0.34,0-0.679,0-1.019 c0.105-2.482,1.311-4.5,2.914-5.478c0.846-0.52,2.009-0.963,3.304-0.765c0.555,0.086,1.122,0.276,1.619,0.464 c0.471,0.181,1.06,0.502,1.618,0.485c0.378-0.011,0.754-0.208,1.135-0.347c1.116-0.403,2.21-0.865,3.652-0.648 c1.733,0.262,2.963,1.032,3.723,2.22c-1.466,0.933-2.625,2.339-2.427,4.74C17.818,14.688,19.086,15.964,20.67,16.716z" fill="#000000"/>
                </g>
              </g>
            </svg>
            Apple
          </button>
        </div>
      </form>
    </div>
  );
};

export default Inscription;
