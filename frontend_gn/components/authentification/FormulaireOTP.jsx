import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import Bouton from '../commun/Bouton';
import { envoyerCodeOTP, verifierCodeOTP } from '../../src/services/otpService';
import { showSuccess, showError } from '../../src/utils/notifications';

const FormulaireOTP = ({ onVerificationReussie, userEmail }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [codeEnvoye, setCodeEnvoye] = useState(false);
  const inputsRef = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Envoyer automatiquement le code au chargement
    handleEnvoyerCode();
  }, []);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, [codeEnvoye]);

  const handleChange = (index, value) => {
    // Accepter seulement les chiffres
    if (!/^\d*$/.test(value)) return;

    const nouveauCode = [...code];
    nouveauCode[index] = value;
    setCode(nouveauCode);
    setErreur('');

    // Passer au champ suivant automatiquement
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pasteData)) return;

    const nouveauCode = [...code];
    for (let i = 0; i < pasteData.length && i < 6; i++) {
      nouveauCode[i] = pasteData[i];
    }
    setCode(nouveauCode);
    
    const nextIndex = Math.min(pasteData.length, 5);
    inputsRef.current[nextIndex]?.focus();
  };

  const handleEnvoyerCode = async () => {
    try {
      setChargement(true);
      const result = await envoyerCodeOTP();
      if (result.success) {
        setCodeEnvoye(true);
        showSuccess(result.message || 'Code envoyé par email');
      }
    } catch (error) {
      showError(error.message || 'Erreur lors de l\'envoi du code');
      setErreur(error.message || 'Erreur lors de l\'envoi du code');
    } finally {
      setChargement(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const codeComplet = code.join('');
    if (codeComplet.length !== 6) {
      setErreur('Veuillez entrer le code complet à 6 chiffres');
      return;
    }

    setChargement(true);

    try {
      const result = await verifierCodeOTP(codeComplet);
      
      if (result.success) {
        showSuccess(result.message || 'Code vérifié avec succès');
        onVerificationReussie?.(result);
        navigate('/dashboard');
      }
    } catch (error) {
      setErreur(error.message || 'Code invalide ou expiré. Veuillez réessayer.');
      setCode(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Retour
        </button>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Mail className="text-white" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Vérification par Code OTP
          </h2>
          <p className="text-gray-600 mt-2">
            {codeEnvoye 
              ? `Un code à 6 chiffres a été envoyé à ${userEmail || 'votre email'}`
              : 'Envoi du code en cours...'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Code valide pendant 5 minutes
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center space-x-3 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={!codeEnvoye}
                className={`
                  w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${erreur ? 'border-red-500' : 'border-gray-300'}
                  ${!codeEnvoye ? 'bg-gray-100' : ''}
                `}
              />
            ))}
          </div>

          {erreur && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center mb-6">
              {erreur}
            </div>
          )}

          <Bouton
            type="submit"
            variant="primary"
            taille="large"
            chargement={chargement}
            disabled={!codeEnvoye}
            className="w-full mb-4"
          >
            Vérifier le code
          </Bouton>

          <div className="text-center">
            <button
              type="button"
              onClick={handleEnvoyerCode}
              disabled={chargement}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Renvoyer le code
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <Mail size={16} className="flex-shrink-0 mt-0.5" />
            <p>
              Si vous ne recevez pas le code, vérifiez vos spams ou contactez l'administrateur système.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormulaireOTP;

