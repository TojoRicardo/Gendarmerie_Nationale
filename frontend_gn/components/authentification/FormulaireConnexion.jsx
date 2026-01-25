import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield, CheckCircle, ArrowRight, Sparkles, UserPlus, Users, Copy, Check } from 'lucide-react';
import { useAuth } from '../../src/context/AuthContext';

const FormulaireConnexion = () => {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [chargement, setChargement] = useState(false);
  const [compteCopie, setCompteCopie] = useState(null);
  const navigate = useNavigate();
  const { connexion } = useAuth();

  const validerFormulaire = () => {
    const nouvellesErreurs = {};

    if (!email) {
      nouvellesErreurs.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      nouvellesErreurs.email = 'Email invalide';
    }

    if (!motDePasse) {
      nouvellesErreurs.motDePasse = 'Le mot de passe est requis';
    } else if (motDePasse.length < 6) {
      nouvellesErreurs.motDePasse = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setErreurs(nouvellesErreurs);
    return Object.keys(nouvellesErreurs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validerFormulaire()) return;

    setChargement(true);
    setErreurs({});

    try {
      const result = await connexion(email, motDePasse);
      
      if (result.requiresMFA) {
        navigate('/mfa');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      // Extraire le message d'erreur selon le type
      let errorMessage = "Une erreur inattendue s'est produite. Veuillez réessayer.";
      
      if (error.message) {
        const message = error.message.toLowerCase();
        
        // Vérifier si c'est une erreur réseau
        if (error.message.includes('Network') || error.message.includes('ERR_NETWORK')) {
          errorMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion internet.";
        }
        // Vérifier si le compte est suspendu
        else if (message.includes('suspendu') || message.includes('suspend')) {
          errorMessage = "Votre compte a été suspendu. Veuillez contacter l'administrateur pour réactiver votre compte.";
        }
        // Vérifier si l'email est incorrect ou n'existe pas
        else if (message.includes('aucun compte') || message.includes("n'existe") || (message.includes('email') && (message.includes('incorrect') || message.includes('invalide')))) {
          errorMessage = "Aucun compte n'existe avec cet email. Vérifiez votre adresse email.";
        }
        // Vérifier si le mot de passe est incorrect
        else if (message.includes('mot de passe') && message.includes('incorrect')) {
          errorMessage = "Mot de passe incorrect. Veuillez réessayer.";
        }
        // Vérifier si le compte est désactivé
        else if (message.includes('désactivé') || message.includes('inactif')) {
          errorMessage = "Votre compte est désactivé. Veuillez contacter l'administrateur.";
        }
        // Sinon, utiliser le message d'erreur tel quel
        else {
          errorMessage = error.message;
        }
      }
      
      setErreurs({ general: errorMessage });
    } finally {
      setChargement(false);
    }
  };

  // Compte de démonstration unique
  const comptesDemo = [
    {
      username: 'admin',
      email: 'admin@gendarmerie.mg',
      password: 'admin',
      role: 'Administrateur',
      color: 'from-blue-600 to-blue-800',
      icon: '‍'
    }
  ];

  const utiliserCompteDemo = (compte) => {
    setEmail(compte.email);
    setMotDePasse(compte.password);
  };

  const copierIdentifiants = (compte) => {
    const texte = `Email: ${compte.email}\nMot de passe: ${compte.password}`;
    navigator.clipboard.writeText(texte);
    setCompteCopie(compte.username);
    setTimeout(() => setCompteCopie(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -top-20 -left-20 animate-float" />
        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-20 -right-20 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column - Branding */}
          <div className="text-white space-y-8 animate-fadeIn">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-2xl animate-float">
                  <Shield size={48} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold">Gendarmerie Nationale</h1>
                  <p className="text-blue-300 text-lg flex items-center mt-1">
                    <Sparkles size={16} className="mr-2" />
                    Système de Gestion Criminelle
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-effect-dark p-8 rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-300">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Shield className="mr-3 text-blue-400" size={28} />
                Système Sécurisé
              </h2>
              <div className="space-y-5">
                <div className="flex items-start space-x-4 group">
                  <div className="p-2.5 bg-emerald-500/20 rounded-xl group-hover:scale-110 transition-transform">
                    <CheckCircle className="text-emerald-400" size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Authentification sécurisée</p>
                    <p className="text-sm text-gray-400 mt-1">Protocoles de sécurité avancés</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 group">
                  <div className="p-2.5 bg-blue-500/20 rounded-xl group-hover:scale-110 transition-transform">
                    <CheckCircle className="text-blue-400" size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Gestion des permissions</p>
                    <p className="text-sm text-gray-400 mt-1">Contrôle d'accès basé sur les rôles</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 group">
                  <div className="p-2.5 bg-purple-500/20 rounded-xl group-hover:scale-110 transition-transform">
                    <CheckCircle className="text-purple-400" size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Traçabilité complète</p>
                    <p className="text-sm text-gray-400 mt-1">Audit de toutes les actions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <div className="animate-slideInUp">
            <div className="glass-effect rounded-3xl p-8 lg:p-10 shadow-pro-2xl border border-gray-200">
              <div className="mb-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Connexion</h2>
                <p className="text-gray-600 flex items-center">
                  <Lock size={16} className="mr-2" />
                  Accédez à votre espace sécurisé
                </p>
              </div>

              {erreurs.general && (
                <div className={`mb-6 p-4 border-l-4 rounded-xl animate-slideInRight ${
                  erreurs.general.toLowerCase().includes('suspendu') 
                    ? 'bg-orange-50 border-orange-500' 
                    : erreurs.general.toLowerCase().includes('mot de passe') || erreurs.general.toLowerCase().includes('password')
                      ? 'bg-red-50 border-red-500'
                      : 'bg-red-50 border-red-500'
                }`}>
                  <div className="flex items-start">
                    {erreurs.general.toLowerCase().includes('suspendu') ? (
                      <Shield className="text-orange-600 mr-3 mt-0.5" size={20} />
                    ) : (
                      <AlertCircle className="text-red-500 mr-3 mt-0.5" size={20} />
                    )}
                    <div className="flex-1">
                      <p className={`font-bold mb-1.5 text-sm ${
                        erreurs.general.toLowerCase().includes('suspendu') 
                          ? 'text-orange-900' 
                          : 'text-red-900'
                      }`}>
                        {erreurs.general.toLowerCase().includes('suspendu') 
                          ? '⚠️ Compte suspendu' 
                          : erreurs.general.toLowerCase().includes('mot de passe') || erreurs.general.toLowerCase().includes('password')
                            ? '❌ Mot de passe incorrect'
                            : erreurs.general.toLowerCase().includes('aucun compte') || erreurs.general.toLowerCase().includes("n'existe")
                              ? '❌ Email incorrect'
                              : '❌ Erreur de connexion'}
                      </p>
                      <p className={`text-sm leading-relaxed ${
                        erreurs.general.toLowerCase().includes('suspendu') 
                          ? 'text-orange-800' 
                          : 'text-red-800'
                      }`}>
                        {erreurs.general}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Adresse Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className={`transition-colors ${erreurs.email ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} size={20} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`input-pro w-full pl-12 ${erreurs.email ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                      placeholder="votre.email@gendarmerie.dz"
                    />
                  </div>
                  {erreurs.email && (
                    <p className="mt-2 text-sm text-red-600 flex items-center animate-slideInRight">
                      <AlertCircle size={14} className="mr-1" />
                      {erreurs.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <Lock className={`h-5 w-5 transition-colors ${erreurs.motDePasse ? 'text-red-500' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                    </div>
                    <input
                      type={afficherMotDePasse ? 'text' : 'password'}
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      className={`input-pro w-full pl-12 pr-12 ${erreurs.motDePasse ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setAfficherMotDePasse(!afficherMotDePasse)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                      aria-label={afficherMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {afficherMotDePasse ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {erreurs.motDePasse && (
                    <p className="mt-2 text-sm text-red-600 flex items-center animate-slideInRight">
                      <AlertCircle size={14} className="mr-1" />
                      {erreurs.motDePasse}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={chargement}
                  className="w-full btn-primary-pro py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                  {chargement ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin mr-2"></span>
                      Connexion en cours...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      Se connecter
                      <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </form>

              {/* Lien vers inscription */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Pas encore de compte ?{' '}
                  <Link 
                    to="/inscription" 
                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline inline-flex items-center transition-colors"
                  >
                    <UserPlus size={16} className="mr-1" />
                    Créer un compte
                  </Link>
                </p>
              </div>

              {/* Comptes de démonstration */}
              <div className="mt-8 border-t pt-6">
                <div className="flex items-center justify-center mb-4">
                  <Users className="text-blue-600 mr-2" size={20} />
                  <h3 className="text-sm font-bold text-gray-700">Comptes de démonstration</h3>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {comptesDemo.map((compte) => (
                    <div
                      key={compte.username}
                      className="group p-3 bg-gradient-to-r hover:shadow-md transition-all duration-200 rounded-xl border border-gray-200 hover:border-blue-300 cursor-pointer"
                      onClick={() => utiliserCompteDemo(compte)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-10 h-10 bg-gradient-to-br ${compte.color} rounded-lg flex items-center justify-center text-xl shadow-md group-hover:scale-110 transition-transform`}>
                            {compte.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{compte.role}</p>
                            <p className="text-xs text-gray-500">{compte.username}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copierIdentifiants(compte);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Copier les identifiants"
                        >
                          {compteCopie === compte.username ? (
                            <Check className="text-green-600" size={16} />
                          ) : (
                            <Copy className="text-gray-400 group-hover:text-blue-600" size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-800 text-center">
                     <span className="font-semibold">Développement uniquement</span> - Cliquez sur un compte pour remplir le formulaire
                  </p>
                </div>
              </div>

              {/* Information sécurité */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 flex items-center justify-center">
                  <Shield size={16} className="mr-2 text-blue-600" />
                  Système sécurisé - Accès réservé au personnel autorisé
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormulaireConnexion;
