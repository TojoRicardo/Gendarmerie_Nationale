"""
Module pour parser le User-Agent et extraire des informations détaillées
sur le navigateur, le système d'exploitation, etc.
"""

import re
from typing import Dict, Optional


def parse_user_agent(user_agent: Optional[str]) -> Dict[str, Optional[str]]:
    """
    Parse le User-Agent et extrait des informations détaillées.
    
    Args:
        user_agent: Chaîne User-Agent complète
        
    Returns:
        Dict avec:
        - navigateur: Nom du navigateur (ex: "Google Chrome 120.0")
        - navigateur_version: Version du navigateur
        - systeme: Système d'exploitation (ex: "Windows 11", "Linux Ubuntu 22.04", "Android 13")
        - systeme_version: Version du système
        - device: Type d'appareil (Desktop, Mobile, Tablet)
        - engine: Moteur de rendu (Blink, Gecko, WebKit)
    """
    if not user_agent:
        return {
            'navigateur': None,
            'navigateur_version': None,
            'systeme': None,
            'systeme_version': None,
            'device': None,
            'engine': None
        }
    
    ua_lower = user_agent.lower()
    result = {
        'navigateur': None,
        'navigateur_version': None,
        'systeme': None,
        'systeme_version': None,
        'device': 'Desktop',
        'engine': None
    }
    
    # Détecter le navigateur et sa version
    # Chrome
    chrome_match = re.search(r'chrome/(\d+\.\d+\.\d+\.\d+)', ua_lower)
    if chrome_match:
        version = chrome_match.group(1)
        result['navigateur'] = f'Google Chrome {version.split(".")[0]}'
        result['navigateur_version'] = version
        result['engine'] = 'Blink'
        if 'edg' in ua_lower:
            edge_match = re.search(r'edg/(\d+\.\d+\.\d+\.\d+)', ua_lower)
            if edge_match:
                version = edge_match.group(1)
                result['navigateur'] = f'Microsoft Edge {version.split(".")[0]}'
                result['navigateur_version'] = version
    
    # Firefox
    elif 'firefox' in ua_lower:
        firefox_match = re.search(r'firefox/(\d+\.\d+)', ua_lower)
        if firefox_match:
            version = firefox_match.group(1)
            result['navigateur'] = f'Mozilla Firefox {version.split(".")[0]}'
            result['navigateur_version'] = version
            result['engine'] = 'Gecko'
    
    # Safari
    elif 'safari' in ua_lower and 'chrome' not in ua_lower:
        safari_match = re.search(r'version/(\d+\.\d+\.\d+)', ua_lower)
        if safari_match:
            version = safari_match.group(1)
            result['navigateur'] = f'Safari {version.split(".")[0]}'
            result['navigateur_version'] = version
            result['engine'] = 'WebKit'
    
    # Opera
    elif 'opera' in ua_lower or 'opr' in ua_lower:
        opera_match = re.search(r'(?:opera|opr)/(\d+\.\d+)', ua_lower)
        if opera_match:
            version = opera_match.group(1)
            result['navigateur'] = f'Opera {version.split(".")[0]}'
            result['navigateur_version'] = version
            result['engine'] = 'Blink'
    
    # Navigateur par défaut si non détecté
    if not result['navigateur']:
        if 'mozilla' in ua_lower:
            result['navigateur'] = 'Mozilla'
        else:
            result['navigateur'] = 'Inconnu'
    
    # Détecter le système d'exploitation
    # Windows
    if 'windows' in ua_lower:
        # Windows 11
        if 'windows nt 10.0' in ua_lower and ('win64' in ua_lower or 'x64' in ua_lower):
            build_match = re.search(r'windows nt 10\.0; win64; x64', ua_lower)
            if build_match:
                result['systeme'] = 'Windows 11'
                result['systeme_version'] = '11'
            else:
                result['systeme'] = 'Windows 10'
                result['systeme_version'] = '10'
        elif 'windows nt 6.3' in ua_lower:
            result['systeme'] = 'Windows 8.1'
            result['systeme_version'] = '8.1'
        elif 'windows nt 6.2' in ua_lower:
            result['systeme'] = 'Windows 8'
            result['systeme_version'] = '8'
        elif 'windows nt 6.1' in ua_lower:
            result['systeme'] = 'Windows 7'
            result['systeme_version'] = '7'
        else:
            result['systeme'] = 'Windows'
            result['systeme_version'] = None
    
    # macOS
    elif 'mac os x' in ua_lower or 'macintosh' in ua_lower:
        mac_match = re.search(r'mac os x (\d+)[._](\d+)[._]?(\d+)?', ua_lower)
        if mac_match:
            major = mac_match.group(1)
            minor = mac_match.group(2)
            # Convertir version macOS
            version_map = {
                '10': '10',
                '11': '11 (Big Sur)',
                '12': '12 (Monterey)',
                '13': '13 (Ventura)',
                '14': '14 (Sonoma)',
            }
            version_name = version_map.get(major, major)
            result['systeme'] = f'macOS {version_name}'
            result['systeme_version'] = f'{major}.{minor}'
        else:
            result['systeme'] = 'macOS'
    
    # Linux
    elif 'linux' in ua_lower:
        # Détecter la distribution
        if 'ubuntu' in ua_lower:
            ubuntu_match = re.search(r'ubuntu[\/\s](\d+\.\d+)', ua_lower)
            if ubuntu_match:
                result['systeme'] = f'Linux Ubuntu {ubuntu_match.group(1)}'
                result['systeme_version'] = ubuntu_match.group(1)
            else:
                result['systeme'] = 'Linux Ubuntu'
        elif 'debian' in ua_lower:
            result['systeme'] = 'Linux Debian'
        elif 'fedora' in ua_lower:
            result['systeme'] = 'Linux Fedora'
        elif 'centos' in ua_lower:
            result['systeme'] = 'Linux CentOS'
        elif 'red hat' in ua_lower:
            result['systeme'] = 'Linux Red Hat'
        else:
            result['systeme'] = 'Linux'
    
    # Android
    elif 'android' in ua_lower:
        android_match = re.search(r'android (\d+\.\d+)', ua_lower)
        if android_match:
            version = android_match.group(1)
            # Mapper les versions Android
            version_map = {
                '14': '14',
                '13': '13',
                '12': '12',
                '11': '11',
                '10': '10',
            }
            version_name = version_map.get(version.split('.')[0], version)
            result['systeme'] = f'Android {version_name}'
            result['systeme_version'] = version
        else:
            result['systeme'] = 'Android'
        result['device'] = 'Mobile'
    
    # iOS
    elif 'iphone' in ua_lower or 'ipad' in ua_lower or 'ipod' in ua_lower:
        ios_match = re.search(r'os (\d+)[._](\d+)', ua_lower)
        if ios_match:
            major = ios_match.group(1)
            minor = ios_match.group(2)
            result['systeme'] = f'iOS {major}.{minor}'
            result['systeme_version'] = f'{major}.{minor}'
        else:
            result['systeme'] = 'iOS'
        if 'ipad' in ua_lower:
            result['device'] = 'Tablet'
        else:
            result['device'] = 'Mobile'
    
    # Détecter si c'est un mobile
    if not result['device'] or result['device'] == 'Desktop':
        if any(mobile in ua_lower for mobile in ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone']):
            result['device'] = 'Mobile'
    
    return result


def get_ip_from_request(request) -> Optional[str]:
    """
    Récupère l'adresse IP réelle du client depuis la requête.
    Prend en compte les proxies, reverse proxies et tous les headers standards.
    
    Ordre de priorité :
    1. CF-Connecting-IP (Cloudflare)
    2. X-Forwarded-For (proxies standards)
    3. X-Real-IP (Nginx reverse proxy)
    4. X-Client-IP (certains proxies)
    5. X-Forwarded (ancien standard)
    6. Forwarded-For (RFC 7239)
    7. REMOTE_ADDR (IP directe)
    
    Args:
        request: Objet requête Django
        
    Returns:
        Adresse IP du client ou None
    """
    if not request or not hasattr(request, 'META'):
        return None
    
    cf_connecting_ip = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf_connecting_ip:
        ip = cf_connecting_ip.strip()
        if ip and ip != '127.0.0.1':
            return ip
    
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # Format: "client_ip, proxy1_ip, proxy2_ip"
        ips = [ip.strip() for ip in x_forwarded_for.split(',')]
        for ip in ips:
            if ip and ip != '127.0.0.1' and not ip.startswith('192.168.') and not ip.startswith('10.'):
                return ip
        # Si toutes les IPs sont locales, prendre la première quand même
        if ips and ips[0]:
            return ips[0]
    
    x_real_ip = request.META.get('HTTP_X_REAL_IP')
    if x_real_ip:
        ip = x_real_ip.strip()
        if ip:
            return ip
    
    x_client_ip = request.META.get('HTTP_X_CLIENT_IP')
    if x_client_ip:
        ip = x_client_ip.strip()
        if ip and ip != '127.0.0.1':
            return ip
    
    x_forwarded = request.META.get('HTTP_X_FORWARDED')
    if x_forwarded:
        # Format: "for=client_ip;by=proxy_ip"
        import re
        match = re.search(r'for=([^;,\s]+)', x_forwarded)
        if match:
            ip = match.group(1).strip()
            if ip and ip != '127.0.0.1':
                return ip
    
    forwarded = request.META.get('HTTP_FORWARDED')
    if forwarded:
        import re
        match = re.search(r'for=([^;,\s]+)', forwarded)
        if match:
            ip = match.group(1).strip()
            # Enlever les guillemets si présents
            ip = ip.strip('"')
            if ip and ip != '127.0.0.1':
                return ip
    
    remote_addr = request.META.get('REMOTE_ADDR')
    if remote_addr:
        ip = remote_addr.strip()
        # En développement local, REMOTE_ADDR sera 127.0.0.1
        # C'est normal et attendu
        return ip
    
    return None


def extract_endpoint_from_request(request) -> Optional[str]:
    """
    Extrait l'endpoint (chemin) de la requête.
    
    Args:
        request: Objet requête Django
        
    Returns:
        Endpoint (ex: "/api/audit/")
    """
    if hasattr(request, 'path'):
        return request.path
    return None


def extract_method_from_request(request) -> Optional[str]:
    """
    Extrait la méthode HTTP de la requête.
    
    Args:
        request: Objet requête Django
        
    Returns:
        Méthode HTTP (GET, POST, PUT, DELETE, PATCH, etc.)
    """
    if hasattr(request, 'method'):
        return request.method
    return None

