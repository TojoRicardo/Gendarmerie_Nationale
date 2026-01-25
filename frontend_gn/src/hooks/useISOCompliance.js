/**
 * Hook personnalisé pour gérer la conformité aux normes ISO
 * 
 * Normes supportées:
 * - ISO/IEC 19794-5:2011 (Format d'images faciales)
 * - ISO/IEC 39794-5:2019 (Templates biométriques)
 * - ISO/IEC 30137-1:2019 (Comparaison judiciaire)
 * - ISO/IEC 27001:2013 (Sécurité de l'information)
 * - RGPD (Protection des données biométriques)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  validateImageISO19794_5, 
  generateISO19794_5Metadata,
  normalizeImageISO19794_5 
} from '../utils/imageStandardsValidator';
import { 
  createBiometricTemplate,
  validateBiometricTemplate,
  createRecognitionLog,
  createSecurityMetadata 
} from '../utils/biometricMetadataService';

/**
 * Hook principal pour la gestion de conformité ISO
 * @returns {Object} Méthodes et états de conformité
 */
export const useISOCompliance = () => {
  const [validationResults, setValidationResults] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const validationCache = useRef(new Map());

  /**
   * Valider une image selon ISO/IEC 19794-5
   */
  const validateImage = useCallback(async (file) => {
    setIsValidating(true);
    setErrors([]);
    setWarnings([]);

    try {
      // Vérifier le cache
      const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
      if (validationCache.current.has(cacheKey)) {
        const cached = validationCache.current.get(cacheKey);
        setValidationResults(cached);
        setIsValidating(false);
        return cached;
      }

      // Valider l'image
      const validation = await validateImageISO19794_5(file);
      
      setValidationResults(validation);
      setErrors(validation.errors || []);
      setWarnings(validation.warnings || []);

      // Mettre en cache
      validationCache.current.set(cacheKey, validation);

      return validation;
    } catch (error) {
      const errorObj = {
        code: 'VALIDATION_ERROR',
        message: error.message,
        severity: 'error'
      };
      setErrors([errorObj]);
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Générer des métadonnées ISO/IEC 19794-5
   */
  const generateMetadata = useCallback(async (file, poseType = 'frontal') => {
    try {
      const metadata = await generateISO19794_5Metadata(file, poseType);
      return metadata;
    } catch (error) {
      console.error('Erreur génération métadonnées ISO:', error);
      throw error;
    }
  }, []);

  /**
   * Normaliser une image selon ISO/IEC 19794-5
   */
  const normalizeImage = useCallback(async (file) => {
    try {
      const normalized = await normalizeImageISO19794_5(file);
      return normalized;
    } catch (error) {
      console.error('Erreur normalisation ISO:', error);
      throw error;
    }
  }, []);

  /**
   * Créer un template biométrique ISO/IEC 39794-5
   */
  const createTemplate = useCallback((featureVector, algorithm, metadata = {}) => {
    try {
      const template = createBiometricTemplate(featureVector, algorithm, metadata);
      return template;
    } catch (error) {
      console.error('Erreur création template:', error);
      throw error;
    }
  }, []);

  /**
   * Valider un template biométrique
   */
  const validateTemplate = useCallback((template) => {
    try {
      const validation = validateBiometricTemplate(template);
      return validation;
    } catch (error) {
      console.error('Erreur validation template:', error);
      throw error;
    }
  }, []);

  /**
   * Créer un log de reconnaissance ISO/IEC 30137-1
   */
  const createLog = useCallback((params) => {
    try {
      const log = createRecognitionLog(params);
      return log;
    } catch (error) {
      console.error('Erreur création log:', error);
      throw error;
    }
  }, []);

  /**
   * Créer des métadonnées de sécurité ISO 27001
   */
  const createSecurity = useCallback((data) => {
    try {
      const security = createSecurityMetadata(data);
      return security;
    } catch (error) {
      console.error('Erreur création métadonnées sécurité:', error);
      throw error;
    }
  }, []);

  /**
   * Vérifier la conformité globale
   */
  const checkCompliance = useCallback((validationResult) => {
    if (!validationResult) return null;

    return {
      isCompliant: validationResult.isCompliant,
      qualityScore: validationResult.metadata?.qualityScore || 0,
      standard: validationResult.standard,
      errorsCount: validationResult.errors?.length || 0,
      warningsCount: validationResult.warnings?.length || 0,
      status: validationResult.isCompliant ? 'compliant' : 
              validationResult.isValid ? 'partial' : 'non-compliant'
    };
  }, []);

  /**
   * Effacer le cache de validation
   */
  const clearCache = useCallback(() => {
    validationCache.current.clear();
  }, []);

  /**
   * Réinitialiser l'état
   */
  const reset = useCallback(() => {
    setValidationResults(null);
    setErrors([]);
    setWarnings([]);
    setIsValidating(false);
  }, []);

  return {
    // États
    validationResults,
    isValidating,
    errors,
    warnings,

    // Méthodes ISO/IEC 19794-5 (Images faciales)
    validateImage,
    generateMetadata,
    normalizeImage,

    // Méthodes ISO/IEC 39794-5 (Templates biométriques)
    createTemplate,
    validateTemplate,

    // Méthodes ISO/IEC 30137-1 (Logs judiciaires)
    createLog,

    // Méthodes ISO 27001 (Sécurité)
    createSecurity,

    // Utilitaires
    checkCompliance,
    clearCache,
    reset
  };
};

/**
 * Hook simplifié pour validation d'image uniquement
 * @returns {Object} Méthodes de validation d'image
 */
export const useImageValidation = () => {
  const { 
    validateImage, 
    validationResults, 
    isValidating, 
    errors, 
    warnings,
    reset
  } = useISOCompliance();

  return {
    validateImage,
    validationResults,
    isValidating,
    errors,
    warnings,
    isValid: validationResults?.isValid || false,
    isCompliant: validationResults?.isCompliant || false,
    qualityScore: validationResults?.metadata?.qualityScore || 0,
    reset
  };
};

/**
 * Hook pour logs de reconnaissance
 * @param {Object} user - Informations utilisateur
 * @returns {Object} Méthodes de gestion des logs
 */
export const useRecognitionLogs = (user) => {
  const [logs, setLogs] = useState([]);
  const { createLog } = useISOCompliance();

  const addLog = useCallback((params) => {
    const log = createLog({
      userId: user?.id,
      userName: user?.username || user?.name,
      ...params
    });

    setLogs(prev => [log, ...prev]);
    return log;
  }, [createLog, user]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const exportLogs = useCallback(() => {
    // Convertir les logs en CSV
    if (logs.length === 0) return null;

    const headers = ['ID', 'Timestamp', 'Opérateur', 'Résultat', 'Confiance', 'Standard'];
    const rows = logs.map(log => [
      log.log_id,
      log.timestamp,
      log.operator?.user_name,
      log.result?.match_found ? 'Correspondance' : 'Aucune',
      log.result?.confidence_score || 0,
      log.standard
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    
    return blob;
  }, [logs]);

  return {
    logs,
    addLog,
    clearLogs,
    exportLogs,
    logsCount: logs.length
  };
};

/**
 * Hook pour statistiques de conformité
 * @param {Array} images - Liste d'images validées
 * @returns {Object} Statistiques
 */
export const useComplianceStats = (images = []) => {
  const [stats, setStats] = useState({
    total: 0,
    compliant: 0,
    nonCompliant: 0,
    avgQuality: 0,
    complianceRate: 0
  });

  const calculateStats = useCallback((imageList) => {
    if (!imageList || imageList.length === 0) {
      setStats({
        total: 0,
        compliant: 0,
        nonCompliant: 0,
        avgQuality: 0,
        complianceRate: 0
      });
      return;
    }

    const total = imageList.length;
    const compliant = imageList.filter(img => img.isCompliant).length;
    const nonCompliant = total - compliant;
    const avgQuality = imageList.reduce((sum, img) => sum + (img.qualityScore || 0), 0) / total;
    const complianceRate = (compliant / total) * 100;

    setStats({
      total,
      compliant,
      nonCompliant,
      avgQuality: Math.round(avgQuality),
      complianceRate: Math.round(complianceRate)
    });
  }, []);

  // Recalculer quand la liste d'images change
  useEffect(() => {
    calculateStats(images);
  }, [images, calculateStats]);

  return {
    stats,
    calculateStats
  };
};

export default useISOCompliance;

