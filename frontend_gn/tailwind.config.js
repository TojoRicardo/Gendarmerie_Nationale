/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Tailles de police standardisées SGIC
      fontSize: {
        'title': ['22px', { lineHeight: '1.3', fontWeight: '600' }], // Titre principal
        'subtitle': ['18px', { lineHeight: '1.4', fontWeight: '600' }], // Sous-titre
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }], // Texte normal
        'body-sm': ['15px', { lineHeight: '1.5', fontWeight: '400' }], // Texte normal alternatif
        'secondary': ['14px', { lineHeight: '1.4', fontWeight: '400' }], // Texte secondaire
        'secondary-sm': ['13px', { lineHeight: '1.4', fontWeight: '400' }], // Texte secondaire alternatif
        // Rétrocompatibilité
        'h1': ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        'h2': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'h3': ['16px', { lineHeight: '1.5', fontWeight: '600' }],
        'label': ['14px', { lineHeight: '1.4', fontWeight: '500' }],
        'label-sm': ['13px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      // Espacements standardisés SGIC
      spacing: {
        'page-h': '24px', // Marges horizontales pages
        'section': '32px', // Espacement entre sections
        'element': '16px', // Espacement entre éléments
        'element-sm': '12px', // Espacement réduit
      },
      // Hauteurs standardisées SGIC
      height: {
        'btn': '44px', // Hauteur boutons standard
        'input': '44px', // Hauteur inputs standard
        'table-row': '48px', // Hauteur lignes tableaux
        'criminal-profile': '450px', // Hauteur images profil criminel
        'criminal-profile-w': '350px', // Largeur images profil criminel
        'criminal-thumb': '96px', // Miniature liste criminels
        'evidence-img': '480px', // Max hauteur images preuves
        'pdf-preview': '600px', // Max hauteur aperçu PDF
        'fingerprint': '450px', // Hauteur empreintes digitales
        'fingerprint-w': '350px', // Largeur empreintes digitales
        'evidence-icon': '32px', // Icônes preuves
      },
      maxWidth: {
        'page': '1280px', // Largeur max pages (container-xl)
        'login': '420px', // Largeur page connexion
        'evidence-img': '480px', // Max largeur images preuves
        'card-standard': '360px', // Largeur cartes standardisées
      },
      maxHeight: {
        'pdf-preview': '600px', // Max hauteur aperçu PDF
        'evidence-img': '480px', // Max hauteur images preuves
      },
      minHeight: {
        'screen': '100vh', // Hauteur minimale écran
        'btn': '44px', // Hauteur minimale boutons
        'input': '44px', // Hauteur minimale inputs
        'card-standard': '220px', // Hauteur minimale cartes standardisées
      },
      width: {
        'criminal-profile': '350px', // Largeur images profil criminel
        'criminal-thumb': '96px', // Miniature liste criminels
        'fingerprint': '350px', // Largeur empreintes digitales
        'evidence-icon': '32px', // Icônes preuves
        'card-standard': '360px', // Largeur cartes standardisées
      },
      borderRadius: {
        'box': '12px', // Arrondis boxes
        'btn': '10px', // Arrondis boutons
      },
      colors: {
        // Palette officielle de la Gendarmerie Malagasy - VERSION MODERNE
        gendarme: {
          // Bleu institutionnel - Couleur principale officielle
          blue: '#002382',
          'blue-light': '#1A3A9A',
          'blue-dark': '#001660',
          
          // Bleu clair - Moderne et dynamique
          light: '#17A6E6',
          'light-hover': '#3DB8F0',
          'light-dark': '#0E8BC7',
          
          // Vert opérationnel - Validation et succès
          green: '#077E1B',
          'green-light': '#099922',
          'green-dark': '#056314',
          
          // Rouge principal - Alertes et urgences
          red: '#FF0000',
          'red-light': '#FF3333',
          'red-dark': '#CC0000',
          
          // Gris clair - Arrière-plan des sections
          gray: '#F4F4F4',
          'gray-light': '#FAFAFA',
          'gray-dark': '#E8E8E8',
          
          // Gris texte - Texte secondaire
          dark: '#555555',
          'dark-light': '#757575',
          'dark-dark': '#353535',
          
          // Doré (conservé pour les insignes)
          gold: '#F0C75E',
          'gold-light': '#F5D98B',
          'gold-dark': '#E8BF45',
        },
        
        // Maintien de la compatibilité avec l'ancien système
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2984D1', // Couleur principale personnalisée
          600: '#2984D1',
          700: '#2984D1',
          800: '#1f6ba8',
          900: '#15527f',
        },
        // Couleur bleue personnalisée #2984D1
        blue: {
          50: '#e6f2ff',
          100: '#cce5ff',
          200: '#99cbff',
          300: '#66b1ff',
          400: '#3397ff',
          500: '#2984D1',
          600: '#2984D1',
          700: '#2984D1',
          800: '#1f6ba8',
          900: '#15527f',
        },
      },
      animation: {
        'spin-reverse': 'spin-reverse 1s linear infinite',
      },
      keyframes: {
        'spin-reverse': {
          'from': { transform: 'rotate(360deg)' },
          'to': { transform: 'rotate(0deg)' },
        },
      },
      // Icônes standardisées
      iconSize: {
        'standard': '20px',
        'standard-lg': '24px',
      },
      // Container standardisé
      container: {
        center: true,
        padding: {
          DEFAULT: '24px',
          sm: '16px',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
        },
      },
    },
  },
  plugins: [],
}

