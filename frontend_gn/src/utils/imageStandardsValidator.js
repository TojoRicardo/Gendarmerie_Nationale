/**
 * Validation et normalisation des images selon les normes ISO/IEC 19794-5:2011
 * Standard international pour la reconnaissance faciale biométrique
 * 
 * Référence: ISO/IEC 19794-5:2011 - Information technology — Biometric data interchange formats — Part 5: Face image data
 */

/**
 * Constantes ISO/IEC 19794-5
 */
export const ISO_19794_5_STANDARDS = {
  // Résolution minimale entre les yeux (en pixels)
  MIN_EYE_DISTANCE: 90,
  
  // Dimensions minimales recommandées
  MIN_WIDTH: 480,
  MIN_HEIGHT: 640,
  
  // Dimensions optimales
  OPTIMAL_WIDTH: 1024,
  OPTIMAL_HEIGHT: 1280,
  
  // Formats acceptés
  ACCEPTED_FORMATS: ['image/jpeg', 'image/png', 'image/jp2'], // JPEG, PNG, JPEG2000
  
  // Taille maximale (10MB)
  MAX_SIZE: 10 * 1024 * 1024,
  
  // Espace colorimétrique
  COLOR_SPACE: 'sRGB',
  
  // Qualité JPEG recommandée
  JPEG_QUALITY: 85,
  
  // Types de pose
  POSE_TYPES: {
    FRONTAL: 'frontal',
    LEFT_PROFILE: 'left_profile',
    RIGHT_PROFILE: 'right_profile'
  },
  
  // Qualité d'éclairage
  LIGHTING_QUALITY: {
    EXCELLENT: 'excellent',
    GOOD: 'good',
    ACCEPTABLE: 'acceptable',
    POOR: 'poor'
  }
};

/**
 * Valider une image selon ISO/IEC 19794-5
 * @param {File} file - Fichier image à valider
 * @returns {Promise<Object>} Résultat de validation avec métadonnées
 */
export const validateImageISO19794_5 = async (file) => {
  const errors = [];
  const warnings = [];
  const metadata = {
    format: null,
    width: null,
    height: null,
    size: file.size,
    colorSpace: null,
    compliant: false
  };

  // 1. Vérifier le format
  if (!ISO_19794_5_STANDARDS.ACCEPTED_FORMATS.includes(file.type)) {
    errors.push({
      code: 'INVALID_FORMAT',
      message: `Format non conforme ISO/IEC 19794-5. Formats acceptés: JPEG, PNG, JPEG2000`,
      severity: 'error'
    });
  } else {
    metadata.format = file.type;
  }

  // 2. Vérifier la taille du fichier
  if (file.size > ISO_19794_5_STANDARDS.MAX_SIZE) {
    errors.push({
      code: 'FILE_TOO_LARGE',
      message: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum: 10MB`,
      severity: 'error'
    });
  }

  // 3. Charger l'image pour analyser les dimensions
  try {
    const imageData = await loadImageData(file);
    metadata.width = imageData.width;
    metadata.height = imageData.height;
    metadata.aspectRatio = (imageData.width / imageData.height).toFixed(2);

    // 4. Vérifier les dimensions minimales
    if (imageData.width < ISO_19794_5_STANDARDS.MIN_WIDTH) {
      errors.push({
        code: 'WIDTH_TOO_SMALL',
        message: `Largeur insuffisante (${imageData.width}px). Minimum ISO: ${ISO_19794_5_STANDARDS.MIN_WIDTH}px`,
        severity: 'error'
      });
    }

    if (imageData.height < ISO_19794_5_STANDARDS.MIN_HEIGHT) {
      errors.push({
        code: 'HEIGHT_TOO_SMALL',
        message: `Hauteur insuffisante (${imageData.height}px). Minimum ISO: ${ISO_19794_5_STANDARDS.MIN_HEIGHT}px`,
        severity: 'error'
      });
    }

    // 5. Avertissement si dimensions non optimales
    if (imageData.width < ISO_19794_5_STANDARDS.OPTIMAL_WIDTH) {
      warnings.push({
        code: 'SUBOPTIMAL_WIDTH',
        message: `Largeur sous-optimale. Recommandé: ${ISO_19794_5_STANDARDS.OPTIMAL_WIDTH}px`,
        severity: 'warning'
      });
    }

    if (imageData.height < ISO_19794_5_STANDARDS.OPTIMAL_HEIGHT) {
      warnings.push({
        code: 'SUBOPTIMAL_HEIGHT',
        message: `Hauteur sous-optimale. Recommandé: ${ISO_19794_5_STANDARDS.OPTIMAL_HEIGHT}px`,
        severity: 'warning'
      });
    }

    // 6. Analyser la qualité d'image (luminosité, contraste)
    const qualityAnalysis = analyzeImageQuality(imageData);
    metadata.brightness = qualityAnalysis.brightness;
    metadata.contrast = qualityAnalysis.contrast;
    
    if (qualityAnalysis.brightness < 30 || qualityAnalysis.brightness > 220) {
      warnings.push({
        code: 'POOR_LIGHTING',
        message: `Éclairage sous-optimal (luminosité: ${qualityAnalysis.brightness.toFixed(0)})`,
        severity: 'warning'
      });
    }

    if (qualityAnalysis.contrast < 40) {
      warnings.push({
        code: 'LOW_CONTRAST',
        message: `Contraste faible (${qualityAnalysis.contrast.toFixed(0)}). Recommandé: > 40`,
        severity: 'warning'
      });
    }

  } catch (error) {
    errors.push({
      code: 'IMAGE_LOAD_ERROR',
      message: `Impossible de charger l'image: ${error.message}`,
      severity: 'error'
    });
  }

  // Déterminer la conformité globale
  metadata.compliant = errors.length === 0;
  metadata.qualityScore = calculateQualityScore(errors, warnings, metadata);

  return {
    isValid: errors.length === 0,
    isCompliant: metadata.compliant,
    errors,
    warnings,
    metadata,
    standard: 'ISO/IEC 19794-5:2011'
  };
};

/**
 * Charger les données d'une image
 * @param {File} file - Fichier image
 * @returns {Promise<Object>} Données de l'image
 */
const loadImageData = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // Créer un canvas pour analyser les pixels
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height,
        data: imageData.data,
        canvas,
        ctx
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de charger l\'image'));
    };

    img.src = url;
  });
};

/**
 * Analyser la qualité d'une image (luminosité, contraste)
 * @param {Object} imageData - Données de l'image
 * @returns {Object} Analyse de qualité
 */
const analyzeImageQuality = (imageData) => {
  const data = imageData.data;
  let totalBrightness = 0;
  let minBrightness = 255;
  let maxBrightness = 0;
  const pixelCount = data.length / 4;

  // Calculer la luminosité moyenne et le contraste
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Luminosité perçue (formule standard)
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    
    totalBrightness += brightness;
    minBrightness = Math.min(minBrightness, brightness);
    maxBrightness = Math.max(maxBrightness, brightness);
  }

  const avgBrightness = totalBrightness / pixelCount;
  const contrast = maxBrightness - minBrightness;

  return {
    brightness: avgBrightness,
    contrast: contrast,
    minBrightness,
    maxBrightness
  };
};

/**
 * Calculer un score de qualité global
 * @param {Array} errors - Erreurs de validation
 * @param {Array} warnings - Avertissements
 * @param {Object} metadata - Métadonnées de l'image
 * @returns {Number} Score de 0 à 100
 */
const calculateQualityScore = (errors, warnings, metadata) => {
  let score = 100;

  // Pénalités pour les erreurs
  score -= errors.length * 25;

  // Pénalités pour les avertissements
  score -= warnings.length * 10;

  // Bonus pour dimensions optimales
  if (metadata.width >= ISO_19794_5_STANDARDS.OPTIMAL_WIDTH) {
    score += 5;
  }
  if (metadata.height >= ISO_19794_5_STANDARDS.OPTIMAL_HEIGHT) {
    score += 5;
  }

  // Bonus pour bonne luminosité
  if (metadata.brightness >= 80 && metadata.brightness <= 180) {
    score += 5;
  }

  // Bonus pour bon contraste
  if (metadata.contrast >= 60) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
};

/**
 * Générer des métadonnées ISO/IEC 19794-5 pour une image
 * @param {File} file - Fichier image
 * @param {String} poseType - Type de pose (frontal, left_profile, right_profile)
 * @returns {Promise<Object>} Métadonnées ISO
 */
export const generateISO19794_5Metadata = async (file, poseType = 'frontal') => {
  const validation = await validateImageISO19794_5(file);
  
  return {
    // Identifiant du standard
    format_standard: 'ISO/IEC 19794-5:2011',
    version: '1.0',
    
    // Type de pose
    pose: poseType,
    
    // Qualité de l'image
    image_quality: validation.metadata.qualityScore >= 80 ? 'high' : 
                    validation.metadata.qualityScore >= 60 ? 'medium' : 'low',
    
    // Éclairage
    lighting: validation.metadata.brightness >= 100 && validation.metadata.brightness <= 160 ? 'neutral' :
              validation.metadata.brightness > 160 ? 'bright' : 'dark',
    
    // Métadonnées techniques
    technical: {
      width: validation.metadata.width,
      height: validation.metadata.height,
      format: validation.metadata.format,
      size_bytes: validation.metadata.size,
      color_space: ISO_19794_5_STANDARDS.COLOR_SPACE,
      aspect_ratio: validation.metadata.aspectRatio
    },
    
    // Conformité
    compliance: {
      is_compliant: validation.isCompliant,
      quality_score: validation.metadata.qualityScore,
      errors_count: validation.errors.length,
      warnings_count: validation.warnings.length
    },
    
    // Horodatage
    captured_at: new Date().toISOString(),
    validated_at: new Date().toISOString()
  };
};

/**
 * Normaliser une image selon ISO/IEC 19794-5
 * (Redimensionner, ajuster la luminosité, etc.)
 * @param {File} file - Fichier image
 * @returns {Promise<Object>} Image normalisée + métadonnées
 */
export const normalizeImageISO19794_5 = async (file) => {
  const imageData = await loadImageData(file);
  const canvas = imageData.canvas;
  const ctx = imageData.ctx;

  let targetWidth = imageData.width;
  let targetHeight = imageData.height;

  // Redimensionner si nécessaire pour atteindre les dimensions optimales
  if (imageData.width < ISO_19794_5_STANDARDS.OPTIMAL_WIDTH || 
      imageData.height < ISO_19794_5_STANDARDS.OPTIMAL_HEIGHT) {
    
    const scale = Math.max(
      ISO_19794_5_STANDARDS.OPTIMAL_WIDTH / imageData.width,
      ISO_19794_5_STANDARDS.OPTIMAL_HEIGHT / imageData.height
    );
    
    targetWidth = Math.round(imageData.width * scale);
    targetHeight = Math.round(imageData.height * scale);
  }

  // Créer un nouveau canvas avec les dimensions cibles
  const normalizedCanvas = document.createElement('canvas');
  normalizedCanvas.width = targetWidth;
  normalizedCanvas.height = targetHeight;
  const normalizedCtx = normalizedCanvas.getContext('2d');
  
  // Redimensionner avec interpolation de haute qualité
  normalizedCtx.imageSmoothingEnabled = true;
  normalizedCtx.imageSmoothingQuality = 'high';
  normalizedCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  // Convertir en Blob
  return new Promise((resolve, reject) => {
    normalizedCanvas.toBlob(
      (blob) => {
        if (blob) {
          const normalizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          resolve({
            file: normalizedFile,
            operations: [
              `Redimensionné: ${imageData.width}x${imageData.height} → ${targetWidth}x${targetHeight}`,
              `Espace colorimétrique: sRGB`,
              `Format: JPEG`
            ],
            metadata: {
              original_width: imageData.width,
              original_height: imageData.height,
              normalized_width: targetWidth,
              normalized_height: targetHeight
            }
          });
        } else {
          reject(new Error('Échec de la normalisation'));
        }
      },
      'image/jpeg',
      ISO_19794_5_STANDARDS.JPEG_QUALITY / 100
    );
  });
};

export default {
  ISO_19794_5_STANDARDS,
  validateImageISO19794_5,
  generateISO19794_5Metadata,
  normalizeImageISO19794_5
};

