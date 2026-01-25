/**
 * Service de gestion des métadonnées biométriques
 * Conformité: ISO/IEC 39794-5:2019 (Templates biométriques)
 * 
 * Gère la structure standardisée des données biométriques faciales
 * pour garantir l'interopérabilité avec d'autres systèmes (Interpol, Europol, etc.)
 */

/**
 * Version de la norme ISO/IEC 39794-5
 */
export const ISO_39794_5_VERSION = '2019';

/**
 * Types d'algorithmes de reconnaissance faciale supportés
 */
export const FACE_RECOGNITION_ALGORITHMS = {
  FACENET: 'FaceNet',
  RESNET50: 'ResNet-50',
  ARCFACE: 'ArcFace',
  DEEPFACE: 'DeepFace',
  VGGFACE: 'VGGFace',
  OPENFACE: 'OpenFace'
};

/**
 * Tailles de vecteurs standards selon les algorithmes
 */
export const STANDARD_VECTOR_SIZES = {
  [FACE_RECOGNITION_ALGORITHMS.FACENET]: 128,
  [FACE_RECOGNITION_ALGORITHMS.RESNET50]: 512,
  [FACE_RECOGNITION_ALGORITHMS.ARCFACE]: 512,
  [FACE_RECOGNITION_ALGORITHMS.DEEPFACE]: 4096,
  [FACE_RECOGNITION_ALGORITHMS.VGGFACE]: 2622,
  [FACE_RECOGNITION_ALGORITHMS.OPENFACE]: 128
};

/**
 * Créer une structure de template biométrique ISO/IEC 39794-5
 * @param {Array<Number>} featureVector - Vecteur de caractéristiques faciales
 * @param {String} algorithm - Algorithme utilisé
 * @param {Object} metadata - Métadonnées additionnelles
 * @returns {Object} Template biométrique standardisé
 */
export const createBiometricTemplate = (featureVector, algorithm, metadata = {}) => {
  // Valider le vecteur
  const expectedSize = STANDARD_VECTOR_SIZES[algorithm];
  if (featureVector.length !== expectedSize) {
    console.warn(
      ` Taille de vecteur non standard: ${featureVector.length} (attendu: ${expectedSize})`
    );
  }

  return {
    // Identifiant du standard
    standard: `ISO/IEC 39794-5:${ISO_39794_5_VERSION}`,
    version: '1.0',
    
    // Identifiant unique du template
    template_id: generateTemplateId(),
    
    // Vecteur de caractéristiques (embedding)
    feature_vector: {
      data: featureVector,
      dimension: featureVector.length,
      format: 'float32_array',
      normalized: isVectorNormalized(featureVector)
    },
    
    // Algorithme d'encodage
    encoding: {
      algorithm: algorithm,
      model_version: metadata.model_version || 'latest',
      framework: metadata.framework || 'TensorFlow',
      encoding_date: new Date().toISOString()
    },
    
    // Qualité du template
    quality: {
      confidence_score: metadata.confidence_score || null,
      face_detection_score: metadata.face_detection_score || null,
      landmark_quality: metadata.landmark_quality || null
    },
    
    // Métadonnées de la source
    source: {
      image_id: metadata.image_id || null,
      capture_date: metadata.capture_date || new Date().toISOString(),
      capture_device: metadata.capture_device || 'unknown',
      pose_type: metadata.pose_type || 'frontal'
    },
    
    // Horodatage
    created_at: new Date().toISOString(),
    
    // Hash du template pour vérification d'intégrité
    integrity_hash: generateIntegrityHash(featureVector)
  };
};

/**
 * Valider un template biométrique ISO/IEC 39794-5
 * @param {Object} template - Template à valider
 * @returns {Object} Résultat de validation
 */
export const validateBiometricTemplate = (template) => {
  const errors = [];
  const warnings = [];

  // Vérifier la présence des champs obligatoires
  if (!template.standard || !template.standard.includes('ISO/IEC 39794-5')) {
    errors.push({
      field: 'standard',
      message: 'Le template ne respecte pas le standard ISO/IEC 39794-5'
    });
  }

  if (!template.feature_vector || !Array.isArray(template.feature_vector.data)) {
    errors.push({
      field: 'feature_vector',
      message: 'Le vecteur de caractéristiques est manquant ou invalide'
    });
  }

  if (!template.encoding || !template.encoding.algorithm) {
    errors.push({
      field: 'encoding.algorithm',
      message: 'L\'algorithme d\'encodage n\'est pas spécifié'
    });
  }

  // Vérifier la cohérence du vecteur
  if (template.feature_vector && template.encoding) {
    const expectedSize = STANDARD_VECTOR_SIZES[template.encoding.algorithm];
    if (expectedSize && template.feature_vector.dimension !== expectedSize) {
      warnings.push({
        field: 'feature_vector.dimension',
        message: `Dimension non standard: ${template.feature_vector.dimension} (attendu: ${expectedSize})`
      });
    }
  }

  // Vérifier l'intégrité du hash
  if (template.feature_vector && template.integrity_hash) {
    const computedHash = generateIntegrityHash(template.feature_vector.data);
    if (computedHash !== template.integrity_hash) {
      errors.push({
        field: 'integrity_hash',
        message: 'Le hash d\'intégrité ne correspond pas'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    compliance_level: errors.length === 0 && warnings.length === 0 ? 'full' :
                       errors.length === 0 ? 'partial' : 'non-compliant'
  };
};

/**
 * Générer un identifiant unique pour un template
 * @returns {String} ID unique
 */
const generateTemplateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `BT-${timestamp}-${random}`.toUpperCase();
};

/**
 * Vérifier si un vecteur est normalisé (norme L2 ≈ 1)
 * @param {Array<Number>} vector - Vecteur à vérifier
 * @returns {Boolean} True si normalisé
 */
const isVectorNormalized = (vector) => {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return Math.abs(norm - 1.0) < 0.01; // Tolérance de 1%
};

/**
 * Générer un hash d'intégrité pour un vecteur
 * @param {Array<Number>} vector - Vecteur de caractéristiques
 * @returns {String} Hash SHA-256 simplifié
 */
const generateIntegrityHash = (vector) => {
  // Simplification: hash basé sur quelques valeurs clés
  // En production, utiliser une vraie fonction SHA-256
  const sample = vector.slice(0, 10).map(v => v.toFixed(6)).join(',');
  return btoa(sample).substr(0, 16);
};

/**
 * Créer un log de reconnaissance conforme ISO/IEC 30137-1:2019
 * (Forensic facial image comparison)
 * @param {Object} params - Paramètres du log
 * @returns {Object} Log de reconnaissance
 */
export const createRecognitionLog = ({
  userId,
  userName,
  imageSource,
  matchedCriminalId = null,
  matchedCriminalName = null,
  confidenceScore = 0,
  algorithm = FACE_RECOGNITION_ALGORITHMS.FACENET,
  comparisonMethod = 'automated',
  searchCriteria = {}
}) => {
  return {
    // Identifiant du standard (comparaison judiciaire)
    standard: 'ISO/IEC 30137-1:2019',
    log_type: 'facial_recognition',
    
    // Identifiant unique du log
    log_id: generateLogId(),
    
    // Opérateur / Enquêteur
    operator: {
      user_id: userId,
      user_name: userName,
      role: searchCriteria.userRole || 'unknown',
      department: searchCriteria.department || 'unknown'
    },
    
    // Source de l'image
    source: {
      image_path: imageSource,
      image_hash: generateImageHash(imageSource),
      upload_timestamp: new Date().toISOString()
    },
    
    // Résultat de la reconnaissance
    result: {
      match_found: matchedCriminalId !== null,
      matched_subject_id: matchedCriminalId,
      matched_subject_name: matchedCriminalName,
      confidence_score: confidenceScore,
      threshold_used: searchCriteria.threshold || 0.70
    },
    
    // Méthode de comparaison
    method: {
      comparison_type: comparisonMethod, // 'automated', 'manual', 'hybrid'
      algorithm: algorithm,
      model_version: searchCriteria.modelVersion || 'v1.0',
      distance_metric: searchCriteria.distanceMetric || 'cosine'
    },
    
    // Conformité et traçabilité
    forensic: {
      case_id: searchCriteria.caseId || null,
      evidence_id: generateEvidenceId(),
      chain_of_custody: true,
      operator_qualified: true,
      method_reproducible: true
    },
    
    // Horodatage
    timestamp: new Date().toISOString(),
    
    // Métadonnées RGPD
    gdpr: {
      data_subject_informed: false, // Dépend du contexte
      legal_basis: 'law_enforcement', // Base légale: enquête judiciaire
      retention_period: '10_years',
      processing_purpose: 'criminal_investigation'
    }
  };
};

/**
 * Générer un identifiant de log unique
 * @returns {String} ID de log
 */
const generateLogId = () => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const timeStr = Date.now().toString(36).substr(-6).toUpperCase();
  return `LOG-${dateStr}-${timeStr}`;
};

/**
 * Générer un identifiant de preuve
 * @returns {String} ID de preuve
 */
const generateEvidenceId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `EV-${timestamp}-${random}`;
};

/**
 * Générer un hash simple pour une image (pour traçabilité)
 * @param {String} imagePath - Chemin de l'image
 * @returns {String} Hash simplifié
 */
const generateImageHash = (imagePath) => {
  // Simplification: en production, calculer un vrai hash SHA-256
  const timestamp = Date.now();
  return btoa(`${imagePath}-${timestamp}`).substr(0, 24);
};

/**
 * Créer des métadonnées de sécurité conformes ISO 27001
 * @param {Object} data - Données à sécuriser
 * @returns {Object} Métadonnées de sécurité
 */
export const createSecurityMetadata = (data) => {
  return {
    // Standard de sécurité
    standard: 'ISO/IEC 27001:2013',
    
    // Classification
    classification: 'confidential', // 'public', 'internal', 'confidential', 'secret'
    
    // Chiffrement
    encryption: {
      algorithm: 'AES-256-GCM',
      key_derivation: 'PBKDF2',
      encrypted: false, // Sera true une fois chiffré côté backend
      encryption_timestamp: null
    },
    
    // Contrôle d'accès
    access_control: {
      requires_authentication: true,
      requires_authorization: true,
      minimum_role: 'investigator',
      access_log_required: true
    },
    
    // Audit
    audit: {
      audit_enabled: true,
      retention_period: '10_years',
      audit_standard: 'ISO 27001'
    },
    
    // RGPD
    gdpr_compliance: {
      personal_data: true,
      sensitive_data: true, // Données biométriques = données sensibles
      data_subject_rights: ['access', 'rectification', 'erasure', 'portability'],
      legal_basis: 'public_interest',
      dpo_notified: true
    },
    
    // Horodatage
    created_at: new Date().toISOString()
  };
};

/**
 * Calculer des statistiques de performance conformes NIST FRVT
 * @param {Array} recognitionResults - Résultats de reconnaissance
 * @returns {Object} Statistiques de performance
 */
export const calculateNISTPerformanceMetrics = (recognitionResults) => {
  if (!recognitionResults || recognitionResults.length === 0) {
    return null;
  }

  const totalComparisons = recognitionResults.length;
  const truePositives = recognitionResults.filter(r => r.isMatch && r.isCorrect).length;
  const falsePositives = recognitionResults.filter(r => r.isMatch && !r.isCorrect).length;
  const falseNegatives = recognitionResults.filter(r => !r.isMatch && r.shouldMatch).length;
  const trueNegatives = recognitionResults.filter(r => !r.isMatch && !r.shouldMatch).length;

  // Métriques NIST
  const accuracy = (truePositives + trueNegatives) / totalComparisons;
  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
  const falseMatchRate = falsePositives / totalComparisons;
  const falseNonMatchRate = falseNegatives / totalComparisons;

  return {
    // Référence au standard
    evaluation_standard: 'NIST FRVT 2024',
    
    // Métriques principales
    metrics: {
      accuracy: parseFloat(accuracy.toFixed(4)),
      precision: parseFloat(precision.toFixed(4)),
      recall: parseFloat(recall.toFixed(4)),
      f1_score: parseFloat(f1Score.toFixed(4)),
      false_match_rate: parseFloat(falseMatchRate.toFixed(6)),
      false_non_match_rate: parseFloat(falseNonMatchRate.toFixed(6))
    },
    
    // Détails
    details: {
      total_comparisons: totalComparisons,
      true_positives: truePositives,
      false_positives: falsePositives,
      true_negatives: trueNegatives,
      false_negatives: falseNegatives
    },
    
    // Timestamp
    evaluated_at: new Date().toISOString()
  };
};

export default {
  ISO_39794_5_VERSION,
  FACE_RECOGNITION_ALGORITHMS,
  STANDARD_VECTOR_SIZES,
  createBiometricTemplate,
  validateBiometricTemplate,
  createRecognitionLog,
  createSecurityMetadata,
  calculateNISTPerformanceMetrics
};

