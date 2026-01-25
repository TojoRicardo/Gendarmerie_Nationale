/**
 * Données géographiques de Madagascar
 * Province (Historique) → Région → Districts
 */

export const madagascarGeography = {
  'Antananarivo': {
    'Analamanga': [
      'Ambohidratrimo',
      'Andramasina',
      'Anjozorobe',
      'Ankazobe',
      'Antananarivo I',
      'Antananarivo II',
      'Antananarivo III',
      'Antananarivo IV',
      'Antananarivo V',
      'Antananarivo VI',
      'Antananarivo Atsimondrano',
      'Antananarivo Avaradrano',
      'Manjakandriana'
    ],
    'Itasy': [
      'Arivonimamo',
      'Miarinarivo',
      'Soavinandriana'
    ],
    'Vakinankaratra': [
      'Ambatolampy',
      'Antanifotsy',
      'Antsirabe I',
      'Antsirabe II',
      'Faratsiho',
      'Mandoto'
    ],
    'Bongolava': [
      'Fenoarivo Be',
      'Tsiroanomandidy'
    ]
  },
  'Antsiranana': {
    'Diana': [
      'Ambanja',
      'Ambilobe',
      'Antsiranana I',
      'Antsiranana II',
      'Nosy Be'
    ],
    'Sava': [
      'Andapa',
      'Antalaha',
      'Sambava',
      'Vohemar'
    ]
  },
  'Fianarantsoa': {
    'Haute Matsiatra': [
      'Ambalavao',
      'Ambohimahasoa',
      'Fianarantsoa I',
      'Fianarantsoa II',
      'Ikalamavony',
      'Isandra',
      'Lalangina',
      'Vohibato'
    ],
    'Amoron\'i Mania': [
      'Ambatofinandrahana',
      'Ambohidratrimo',
      'Fandriana',
      'Manandriana'
    ],
    'Ihorombe': [
      'Iakora',
      'Ihosy',
      'Ivohibe'
    ],
    'Fitovinany': [
      'Ikongo',
      'Manakara',
      'Vohipeno'
    ],
    'Vatovavy': [
      'Ifanadiana',
      'Mananjary',
      'Nosy Varika'
    ],
    'Atsimo-Atsinanana': [
      'Befotaka',
      'Farafangana',
      'Midongy-Atsimo',
      'Vangaindrano',
      'Vondrozo'
    ]
  },
  'Mahajanga': {
    'Boeny': [
      'Ambato-Boeny',
      'Mahajanga I',
      'Mahajanga II',
      'Marovoay',
      'Mitsinjo',
      'Soalala'
    ],
    'Betsiboka': [
      'Kandreho',
      'Maevatanana',
      'Tsaratanana'
    ],
    'Sofia': [
      'Analalava',
      'Antsohihy',
      'Bealanana',
      'Befandriana-Nord',
      'Boriziny (Port-Bergé)',
      'Mampikony',
      'Mandritsara'
    ],
    'Melaky': [
      'Ambatomainty',
      'Antsalova',
      'Besalampy',
      'Maintirano',
      'Morafenobe'
    ]
  },
  'Toamasina': {
    'Atsinanana': [
      'Antanambao Manampotsy',
      'Toamasina I',
      'Toamasina II',
      'Vatomandry',
      'Mahanoro',
      'Marolambo',
      'Brickaville (Vohibinany)'
    ],
    'Analanjirofo': [
      'Ambatondrazaka',
      'Amparafaravola',
      'Andilamena',
      'Anosibe An\'ala'
    ],
    'Alaotra-Mangoro': [
      'Ambatondrazaka',
      'Amparafaravola',
      'Andilamena',
      'Anosibe An\'ala'
    ]
  },
  'Toliara': {
    'Atsimo-Andrefana': [
      'Ampanihy',
      'Ankazoabo',
      'Benenitra',
      'Betioky-Atsimo',
      'Beroroha',
      'Morombe',
      'Sakaraha',
      'Toliara I',
      'Toliara II',
      'Tsihombe'
    ],
    'Menabe': [
      'Belo sur Tsiribihina',
      'Mahabo',
      'Manja',
      'Miandrivazo',
      'Morondava'
    ],
    'Androy': [
      'Ambovombe-Androy',
      'Bekily',
      'Beloha',
      'Tsiombe'
    ],
    'Anôsy': [
      'Amboasary-Atsimo',
      'Betroka',
      'Tolagnaro (Fort-Dauphin)'
    ]
  }
}

/**
 * Obtenir toutes les provinces
 */
export const getProvinces = () => {
  return Object.keys(madagascarGeography).sort()
}

/**
 * Obtenir les régions d'une province
 */
export const getRegions = (province) => {
  if (!province || !madagascarGeography[province]) {
    return []
  }
  return Object.keys(madagascarGeography[province]).sort()
}

/**
 * Obtenir les districts d'une région dans une province
 */
export const getDistricts = (province, region) => {
  if (!province || !region || !madagascarGeography[province] || !madagascarGeography[province][region]) {
    return []
  }
  return madagascarGeography[province][region].sort()
}

