/**
 * Parser User-Agent pour extraire des informations détaillées
 * Compatible avec le parser backend
 */

export const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return {
      navigateur: null,
      navigateur_version: null,
      systeme: null,
      systeme_version: null,
      device: 'Desktop',
      engine: null
    };
  }

  const ua = userAgent.toLowerCase();
  const result = {
    navigateur: null,
    navigateur_version: null,
    systeme: null,
    systeme_version: null,
    device: 'Desktop',
    engine: null
  };

  // Détecter le navigateur
  // Chrome
  const chromeMatch = ua.match(/chrome\/(\d+\.\d+\.\d+\.\d+)/);
  if (chromeMatch) {
    const version = chromeMatch[1];
    const majorVersion = version.split('.')[0];
    
    // Vérifier si c'est Edge (Edge utilise aussi Chrome)
    if (ua.includes('edg')) {
      const edgeMatch = ua.match(/edg\/(\d+\.\d+\.\d+\.\d+)/);
      if (edgeMatch) {
        const edgeVersion = edgeMatch[1];
        result.navigateur = `Microsoft Edge ${edgeVersion.split('.')[0]}`;
        result.navigateur_version = edgeVersion;
      } else {
        result.navigateur = 'Microsoft Edge';
      }
    } else {
      result.navigateur = `Google Chrome ${majorVersion}`;
      result.navigateur_version = version;
    }
    result.engine = 'Blink';
  }
  // Firefox
  else if (ua.includes('firefox')) {
    const firefoxMatch = ua.match(/firefox\/(\d+\.\d+)/);
    if (firefoxMatch) {
      const version = firefoxMatch[1];
      result.navigateur = `Mozilla Firefox ${version.split('.')[0]}`;
      result.navigateur_version = version;
    } else {
      result.navigateur = 'Mozilla Firefox';
    }
    result.engine = 'Gecko';
  }
  // Safari
  else if (ua.includes('safari') && !ua.includes('chrome')) {
    const safariMatch = ua.match(/version\/(\d+\.\d+\.\d+)/);
    if (safariMatch) {
      const version = safariMatch[1];
      result.navigateur = `Safari ${version.split('.')[0]}`;
      result.navigateur_version = version;
    } else {
      result.navigateur = 'Safari';
    }
    result.engine = 'WebKit';
  }
  // Opera
  else if (ua.includes('opera') || ua.includes('opr')) {
    const operaMatch = ua.match(/(?:opera|opr)\/(\d+\.\d+)/);
    if (operaMatch) {
      const version = operaMatch[1];
      result.navigateur = `Opera ${version.split('.')[0]}`;
      result.navigateur_version = version;
    } else {
      result.navigateur = 'Opera';
    }
    result.engine = 'Blink';
  }
  // Navigateur par défaut
  else {
    if (ua.includes('mozilla')) {
      result.navigateur = 'Mozilla';
    } else {
      result.navigateur = 'Inconnu';
    }
  }

  // Détecter le système d'exploitation
  // Windows
  if (ua.includes('windows')) {
    if (ua.includes('windows nt 10.0') && (ua.includes('win64') || ua.includes('x64'))) {
      // Windows 11 (build 22000+)
      result.systeme = 'Windows 11';
      result.systeme_version = '11';
    } else if (ua.includes('windows nt 10.0')) {
      result.systeme = 'Windows 10';
      result.systeme_version = '10';
    } else if (ua.includes('windows nt 6.3')) {
      result.systeme = 'Windows 8.1';
      result.systeme_version = '8.1';
    } else if (ua.includes('windows nt 6.2')) {
      result.systeme = 'Windows 8';
      result.systeme_version = '8';
    } else if (ua.includes('windows nt 6.1')) {
      result.systeme = 'Windows 7';
      result.systeme_version = '7';
    } else {
      result.systeme = 'Windows';
    }
  }
  // macOS
  else if (ua.includes('mac os x') || ua.includes('macintosh')) {
    const macMatch = ua.match(/mac os x (\d+)[._](\d+)[._]?(\d+)?/);
    if (macMatch) {
      const major = macMatch[1];
      const minor = macMatch[2];
      const versionMap = {
        '10': '10',
        '11': '11 (Big Sur)',
        '12': '12 (Monterey)',
        '13': '13 (Ventura)',
        '14': '14 (Sonoma)',
      };
      const versionName = versionMap[major] || major;
      result.systeme = `macOS ${versionName}`;
      result.systeme_version = `${major}.${minor}`;
    } else {
      result.systeme = 'macOS';
    }
  }
  // Linux
  else if (ua.includes('linux')) {
    if (ua.includes('ubuntu')) {
      const ubuntuMatch = ua.match(/ubuntu[\/\s](\d+\.\d+)/);
      if (ubuntuMatch) {
        result.systeme = `Linux Ubuntu ${ubuntuMatch[1]}`;
        result.systeme_version = ubuntuMatch[1];
      } else {
        result.systeme = 'Linux Ubuntu';
      }
    } else if (ua.includes('debian')) {
      result.systeme = 'Linux Debian';
    } else if (ua.includes('fedora')) {
      result.systeme = 'Linux Fedora';
    } else if (ua.includes('centos')) {
      result.systeme = 'Linux CentOS';
    } else if (ua.includes('red hat')) {
      result.systeme = 'Linux Red Hat';
    } else {
      result.systeme = 'Linux';
    }
  }
  // Android
  else if (ua.includes('android')) {
    const androidMatch = ua.match(/android (\d+\.\d+)/);
    if (androidMatch) {
      const version = androidMatch[1];
      const versionMap = {
        '14': '14',
        '13': '13',
        '12': '12',
        '11': '11',
        '10': '10',
      };
      const versionName = versionMap[version.split('.')[0]] || version;
      result.systeme = `Android ${versionName}`;
      result.systeme_version = version;
    } else {
      result.systeme = 'Android';
    }
    result.device = 'Mobile';
  }
  // iOS
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    const iosMatch = ua.match(/os (\d+)[._](\d+)/);
    if (iosMatch) {
      const major = iosMatch[1];
      const minor = iosMatch[2];
      result.systeme = `iOS ${major}.${minor}`;
      result.systeme_version = `${major}.${minor}`;
    } else {
      result.systeme = 'iOS';
    }
    if (ua.includes('ipad')) {
      result.device = 'Tablet';
    } else {
      result.device = 'Mobile';
    }
  }

  // Détecter si c'est un mobile
  if (result.device === 'Desktop') {
    const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
    if (mobileKeywords.some(keyword => ua.includes(keyword))) {
      result.device = 'Mobile';
    }
  }

  return result;
};

