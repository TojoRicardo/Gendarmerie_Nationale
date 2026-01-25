import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart3, PieChart, TrendingUp, Activity, Download, Filter, 
  RefreshCw, Eye, EyeOff, Settings, Maximize2, Minimize2,
  AlertTriangle, Clock, MapPin, UserSearch, CheckCircle, Fingerprint
} from 'lucide-react'
import {
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid,
  LineChart as RechartsLine, Line, AreaChart, Area, ComposedChart,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LabelList
} from 'recharts'
import RepartitionCamembert from './RepartitionCamembert'
import { 
  getGeographicStats, 
  getMonthlyStats, 
  getEvolutionStats, 
  getHourlyStats,
  getHourlyActivityStats
} from '../../src/services/statsService'
import reportService from '../../src/services/reportService'
import api from '../../src/services/api'

// Constantes
const PROVINCES_MADAGASCAR = [
  'Antananarivo', 'Toamasina', 'Antsiranana', 'Mahajanga', 'Fianarantsoa', 'Toliara'
]

const PROVINCE_COLORS = {
  'Antananarivo': '#2563EB',
  'Toamasina': '#EF4444',
  'Antsiranana': '#FBBF24',
  'Mahajanga': '#F97316',
  'Fianarantsoa': '#10B981',
  'Toliara': '#8B5CF6',
}

const VIEW_MODES = [
  { id: 'overview', label: "Vue d'ensemble", icon: Activity },
  { id: 'evolution', label: 'Évolution', icon: TrendingUp },
  { id: 'geographie', label: 'Géographie', icon: BarChart3 },
  { id: 'upr', label: 'UPR', icon: UserSearch }
]

const PERIODS = [
  { id: '7j', label: '7 jours' },
  { id: '30j', label: '1 mois' },
  { id: '3m', label: '3 mois (Trimestriel)' },
  { id: '6m', label: '6 mois (Semestriel)' },
  { id: '1a', label: '1 an' }
]

// Utilitaires
const formatNumber = (value, options = {}) => {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, ...options }).format(value ?? 0)
}

const getProvinceColor = (provinceName) => PROVINCE_COLORS[provinceName] || '#6B7280'

const shouldLogError = (error) => {
  const ignoredCodes = ['ERR_NETWORK', 'ERR_CONNECTION_REFUSED', 'ECONNABORTED', 'ERR_BAD_RESPONSE']
  return !ignoredCodes.includes(error.code) && 
         !error.message?.includes('timeout') && 
         error.response?.status !== 500
}

// Hook personnalisé pour les données avec polling
const useStatsData = (fetchFn, interval = 60000, dependencies = []) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const fetchFnRef = React.useRef(fetchFn)
  const intervalRef = React.useRef(null)
  const isMountedRef = React.useRef(true)

  // Mettre à jour la référence de la fonction sans recréer le callback
  // Cela évite les boucles infinies tout en gardant la fonction à jour
  React.useEffect(() => {
    fetchFnRef.current = fetchFn
  }, [fetchFn])

  useEffect(() => {
    isMountedRef.current = true
    
    const fetchData = async () => {
      if (!isMountedRef.current) return
      
      try {
        setLoading(true)
        // Utiliser fetchFnRef.current() pour appeler la dernière version de la fonction
        const result = await fetchFnRef.current()
        if (isMountedRef.current) {
          setData(Array.isArray(result) ? result : [])
        }
      } catch (error) {
        if (shouldLogError(error) && isMountedRef.current) {
          console.error('Erreur récupération données:', error)
        }
        if (isMountedRef.current) {
          setData([])
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }
    
    // Premier chargement immédiat
    fetchData()
    
    // Nettoyer l'intervalle précédent s'il existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Configurer l'intervalle seulement si l'intervalle est > 0
    if (interval > 0) {
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchData()
        }
      }, interval)
    }
    
    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, ...dependencies]) // Les dépendances déclenchent le rechargement, fetchFn est dans fetchFnRef

  return [data, loading]
}

// Hook pour l'analyse IA
const useAIAnalysis = (data, interval = 180000) => {
  const [analysis, setAnalysis] = useState(null)
  const intervalRef = React.useRef(null)
  const isMountedRef = React.useRef(true)
  const dataLength = data?.length || 0

  useEffect(() => {
    isMountedRef.current = true
    
    if (dataLength === 0) {
      setAnalysis(null)
      // Nettoyer l'intervalle si pas de données
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const fetchAnalysis = async () => {
      if (!isMountedRef.current) return
      
      try {
        const today = new Date()
        const dateFin = today.toISOString().split('T')[0]
        const dateDebut = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
        const dateDebutStr = dateDebut.toISOString().split('T')[0]
        
        const response = await reportService.getStatistiques(dateDebutStr, dateFin, 'resume_mensuel')
        if (isMountedRef.current && response?.success && response.analyse_ia) {
          setAnalysis(response.analyse_ia)
        }
      } catch (error) {
        if (shouldLogError(error) && isMountedRef.current) {
          console.error('Erreur analyse IA:', error)
        }
      }
    }

    // Nettoyer l'intervalle précédent
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Premier chargement
    fetchAnalysis()
    
    // Configurer l'intervalle seulement si > 0
    if (interval > 0) {
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchAnalysis()
        }
      }, interval)
    }

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [dataLength, interval]) // Utiliser dataLength (nombre) au lieu de data (objet) pour éviter les re-renders infinis

  return analysis
}

// Composant réutilisable pour l'analyse IA
const AIAnalysisCard = ({ analysis, title, icon: Icon }) => {
  if (!analysis) return null

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 shadow-md border border-purple-200 mt-6">
      <div className="flex items-center mb-3">
        {Icon && <Icon className="text-purple-600 mr-2" size={18} />}
        <h4 className="font-bold text-gray-900">{title}</h4>
      </div>
      {analysis.diagnostic?.insights?.length > 0 && (
        <div className="space-y-2">
          {analysis.diagnostic.insights.slice(0, 3).map((insight, i) => (
            <p key={i} className="text-sm text-gray-700">{insight}</p>
          ))}
        </div>
      )}
      {analysis.descriptive && (
        <p className="text-xs text-gray-600 mt-2">
          {analysis.descriptive.total ? `Total: ${analysis.descriptive.total} enregistrements` : ''}
          {analysis.descriptive.tendance ? ` | Tendance: ${analysis.descriptive.tendance}` : ''}
        </p>
      )}
      {analysis.predictive?.confidence && (
        <p className="text-xs text-gray-600 mt-2">
          Confiance: {Math.round(analysis.predictive.confidence * 100)}%
        </p>
      )}
    </div>
  )
}

// Composant pour l'indicateur de mise à jour
const UpdateIndicator = () => (
  <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
    <span className="text-xs font-semibold text-green-700">Mise à jour automatique</span>
  </div>
)

// Composant pour l'état vide
const EmptyState = ({ icon: Icon, loading, title, description }) => (
  <div className="flex items-center justify-center h-[400px] text-gray-500">
    <div className="text-center">
      {Icon && <Icon size={48} className="mx-auto mb-2 opacity-30" />}
      {loading ? (
        <>
          <p className="font-medium">Chargement des données...</p>
          <p className="text-sm">{description || 'Récupération des données'}</p>
        </>
      ) : (
        <>
          <p className="font-medium">Aucune donnée disponible</p>
          <p className="text-sm">{description || 'Les données apparaîtront ici'}</p>
        </>
      )}
    </div>
  </div>
)

// Custom Tooltip pour graphiques en barres mensuelles
const BarChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  
  // Récupérer les valeurs depuis le payload avec toutes les catégories
  const total = payload.find(p => p.dataKey === 'total')?.value ?? 0
  const resolus = payload.find(p => p.dataKey === 'resolus')?.value ?? 0
  const enAttente = payload.find(p => p.dataKey === 'enAttente')?.value ?? 0
  const enCours = payload.find(p => p.dataKey === 'enCours')?.value ?? 0
  const echeanceDepassee = payload.find(p => p.dataKey === 'echeanceDepassee')?.value ?? 0
  
  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-xl min-w-[240px]">
      <p className="font-bold text-gray-900 mb-3 text-base border-b border-gray-200 pb-2">{label || 'Période'}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#d9d9d9' }}></div>
            <span className="text-sm text-gray-600 font-medium">Total:</span>
          </div>
          <span className="font-bold text-gray-900 text-base">{total}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#28a745' }}></div>
            <span className="text-sm text-gray-600 font-medium">Résolus:</span>
          </div>
          <span className="font-bold text-base" style={{ color: '#28a745' }}>{resolus}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="text-sm text-gray-600 font-medium">En attente:</span>
          </div>
          <span className="font-bold text-base" style={{ color: '#3b82f6' }}>{enAttente}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#f28c2e' }}></div>
            <span className="text-sm text-gray-600 font-medium">En cours:</span>
          </div>
          <span className="font-bold text-base" style={{ color: '#f28c2e' }}>{enCours}</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#dc3545' }}></div>
            <span className="text-sm text-gray-600 font-medium">Échéance dépassée:</span>
          </div>
          <span className="font-bold text-base" style={{ color: '#dc3545' }}>{echeanceDepassee}</span>
        </div>
      </div>
    </div>
  )
}

// Custom Tooltip générique
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-xl">
      <p className="font-semibold text-gray-900 mb-2">{label || 'Province'}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="text-sm font-medium">
          <span className="text-gray-600">Cas: </span>
          <span className="font-bold" style={{ color: entry.color }}>{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

const GraphiquesAvances = ({ 
  data = {}, 
  theme = 'light',
  showControls = true,
  enableAnimations = true,
  defaultView = 'overview'
}) => {
  const [viewMode, setViewMode] = useState(defaultView)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('30j')
  const [animationEnabled, setAnimationEnabled] = useState(enableAnimations)
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  
  // Détecter le changement d'année et mettre à jour automatiquement les dates
  useEffect(() => {
    const checkYearChange = () => {
      const now = new Date()
      const newYear = now.getFullYear()
      
      // Si l'année a changé, forcer une mise à jour complète
      if (newYear !== currentYear) {
        setCurrentYear(newYear)
        setRefreshKey(prev => prev + 1) // Forcer le rechargement des données
        console.log(`🔄 Nouvelle année détectée: ${newYear}. Mise à jour automatique des dates.`)
      }
    }
    
    // Vérifier immédiatement
    checkYearChange()
    
    // Vérifier toutes les heures pour détecter le changement d'année
    const intervalId = setInterval(checkYearChange, 3600000) // Toutes les heures
    
    return () => clearInterval(intervalId)
  }, [currentYear])
  
  // Calculer le nombre de mois selon la période
  const months = useMemo(() => {
    const periodMap = { 
      '7j': 0.23,   // 7 jours ≈ 0.23 mois
      '30j': 1,     // 30 jours = 1 mois
      '3m': 3,      // 3 mois (Trimestriel)
      '6m': 6,      // 6 mois (Semestriel)
      '1a': 12,     // 1 an = 12 mois
      // Alias pour compatibilité avec l'ancien code
      'trim': 3,    // Trimestriel = 3 mois
      'sem': 6      // Semestriel = 6 mois
    }
    const calculatedMonths = periodMap[selectedPeriod] || 1
    // Validation : s'assurer que le nombre de mois est valide (entre 0.23 et 12)
    return Math.max(0.23, Math.min(12, calculatedMonths))
  }, [selectedPeriod])

  // Fonction pour récupérer les données géographiques
  const fetchGeographicData = useCallback(async () => {
    const stats = await getGeographicStats()
    const statsMap = new Map()
    
    if (Array.isArray(stats) && stats.length > 0) {
      stats.forEach(item => {
        const province = (item.province || item.ville || item.city || item.location || '').trim()
        if (province) {
          const cas = Number(item.nombre_de_cas || item.cas || item.count || item.cases || item.value || 0)
          statsMap.set(province, isNaN(cas) ? 0 : Math.max(0, cas))
        }
      })
    }
    
    const formatted = PROVINCES_MADAGASCAR.map(province => {
      const cas = statsMap.get(province) || 0
      return { ville: province, province, city: province, location: province, cas, count: cas, cases: cas, value: cas, nombre_de_cas: cas }
    })
    
    const maxCas = Math.max(...formatted.map(p => p.cas), 1)
    formatted.forEach(p => p.normalized = p.cas / maxCas)
    formatted.sort((a, b) => b.cas - a.cas)
    
    return formatted.length > 0 ? formatted : PROVINCES_MADAGASCAR.map(p => ({
      ville: p, province: p, city: p, location: p, cas: 0, count: 0, cases: 0, value: 0, nombre_de_cas: 0, normalized: 0
    }))
  }, [])

  // Données géographiques - intervalle de 120 secondes (augmenté pour réduire la charge)
  const [geographicData, isLoadingGeographic] = useStatsData(
    fetchGeographicData,
    120000,
    [refreshKey]
  )

  // Fonction pour récupérer les données mensuelles avec la période actuelle
  const fetchMonthlyData = useCallback(async () => {
    return await getMonthlyStats(months)
  }, [months])

  // Fonction pour récupérer les données d'évolution avec la période actuelle
  const fetchEvolutionData = useCallback(async () => {
    return await getEvolutionStats(months)
  }, [months])

  // Données mensuelles - intervalle de 120 secondes, se recharge quand la période change
  const [monthlyData, isLoadingMonthly] = useStatsData(
    fetchMonthlyData,
    120000, // 2 minutes pour réduire la charge
    [months, refreshKey]
  )

  // Données d'évolution - intervalle de 120 secondes, se recharge quand la période change
  const [evolutionData, isLoadingEvolution] = useStatsData(
    fetchEvolutionData,
    120000, // 2 minutes pour réduire la charge
    [months, refreshKey]
  )

  // Fonction pour récupérer les données horaires d'activité
  const fetchHourlyActivity = useCallback(async () => {
    return await getHourlyActivityStats()
  }, [])

  // Données horaires d'activité réelle (audit) - intervalle de 5 secondes pour temps réel
  const [hourlyData, isLoadingHourly] = useStatsData(
    fetchHourlyActivity,
    5000, // 5 secondes pour un vrai temps réel
    [refreshKey]
  )

  // S'assurer que toutes les heures sont présentes (00h-23h) - calculé au niveau du composant
  const completeHourlyData = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) {
      // Générer un tableau complet de 24 heures avec count = 0
      return Array.from({ length: 24 }, (_, i) => ({
        hour: `${String(i).padStart(2, '0')}h`,
        heure: `${String(i).padStart(2, '0')}h`,
        count: 0,
        activite: 0
      }))
    }
    
    // Créer un Map pour faciliter la recherche
    const dataMap = new Map()
    hourlyData.forEach(item => {
      const hour = item.heure || item.hour || ''
      const count = item.count || item.activite || 0
      dataMap.set(hour, count)
    })
    
    // Générer un tableau complet de 24 heures
    return Array.from({ length: 24 }, (_, i) => {
      const hour = `${String(i).padStart(2, '0')}h`
      const count = dataMap.get(hour) || 0
      return {
        hour,
        heure: hour,
        count,
        activite: count
      }
    })
  }, [hourlyData])

  // Analyses IA
  const aiAnalysisOverview = useAIAnalysis(monthlyData)
  const aiAnalysisEvolution = useAIAnalysis(evolutionData)
  const aiAnalysisGeographic = useAIAnalysis(geographicData, 60000)
  const aiAnalysisHourly = useAIAnalysis(hourlyData)

  const refreshData = () => setRefreshKey(prev => prev + 1)

  // Vue d'ensemble
  const renderOverview = () => {
    // Préparer les données avec toutes les catégories - normaliser les champs depuis les assignations
    const chartData = monthlyData.map(item => {
      // Mapping depuis les statuts d'assignations : pending, in_progress, closed, overdue
      // Support de multiples formats de noms de champs
      // closed = résolus (assignations clôturées)
      const resolus = Number(
        item.closed || 
        item.resolus || 
        item.resolved || 
        item.resolus_count || 
        item.cloture || 
        item.clotures ||
        0
      ) || 0
      
      const enAttente = Number(
        item.pending || 
        item.enAttente || 
        item.en_attente || 
        item.waiting || 
        item.attente ||
        0
      ) || 0
      
      const enCours = Number(
        item.in_progress || 
        item.inProgress || 
        item.enCours || 
        item.en_cours ||
        0
      ) || 0
      
      const echeanceDepassee = Number(
        item.overdue || 
        item.echeanceDepassee || 
        item.echeance_depassee || 
        item.retard ||
        0
      ) || 0
      
      // Le backend devrait maintenant fournir un total cohérent avec les catégories
      // Récupérer le total depuis les données (le backend calcule déjà la cohérence)
      const cas = Number(item.cas || item.total || item.count || item.value || 0) || 0
      
      // Recalculer le total à partir de la somme des catégories pour vérifier la cohérence
      const totalCalculated = resolus + enAttente + enCours + echeanceDepassee
      
      // Le backend devrait garantir que total = somme des catégories
      // Utiliser le total du backend comme source de vérité, mais vérifier la cohérence
      // Si les deux diffèrent, utiliser le maximum pour garantir l'affichage correct
      let total = cas
      if (totalCalculated > 0 && Math.abs(total - totalCalculated) > 0) {
        // Si le backend n'a pas ajusté correctement, utiliser la somme calculée
        total = totalCalculated
      } else if (total === 0 && totalCalculated === 0) {
        // Si les deux sont à 0, garder 0
        total = 0
      }
      
      return {
        mois: item.mois || item.month || item.periode || '',
        total: total,
        resolus: resolus,
        enAttente: enAttente,
        enCours: enCours,
        echeanceDepassee: echeanceDepassee
      }
    }).filter(item => item.mois) // Filtrer les items sans mois

    // Calculer les totaux pour affichage
    const totalResolus = chartData.reduce((sum, item) => sum + (item.resolus || 0), 0)
    const totalEnAttente = chartData.reduce((sum, item) => sum + (item.enAttente || 0), 0)
    const totalEnCours = chartData.reduce((sum, item) => sum + (item.enCours || 0), 0)
    const totalEcheanceDepassee = chartData.reduce((sum, item) => sum + (item.echeanceDepassee || 0), 0)
    const totalCas = chartData.reduce((sum, item) => sum + (item.total || 0), 0)

    return (
    <div className="space-y-6 w-full">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <BarChart3 className="mr-2 text-gendarme-blue" size={20} />
            Évolution mensuelle
          </h3>
        </div>
          {chartData.length > 0 && <UpdateIndicator />}
        </div>
        {chartData.length > 0 ? (
            <div className="w-full">
          <ResponsiveContainer width="100%" height={450}>
                <RechartsBar 
                  data={chartData} 
                  margin={{ top: 30, right: 30, left: 20, bottom: 60 }}
                  barCategoryGap="15%"
                  barGap={4}
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d9d9d9" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#d9d9d9" stopOpacity={0.7}/>
                    </linearGradient>
                    <linearGradient id="colorResolus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#28a745" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#28a745" stopOpacity={0.85}/>
                    </linearGradient>
                    <linearGradient id="colorEnAttente" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.85}/>
                    </linearGradient>
                    <linearGradient id="colorEnCours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f28c2e" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#f28c2e" stopOpacity={0.85}/>
                    </linearGradient>
                    <linearGradient id="colorEcheanceDepassee" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#dc3545" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#c82333" stopOpacity={0.85}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} vertical={false} />
                  <XAxis 
                    dataKey="mois" 
                    stroke="#6b7280" 
                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                    axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                    tickLine={{ stroke: '#d1d5db' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                    tickLine={{ stroke: '#d1d5db' }}
                    label={{ value: 'Nombre de cas', angle: -90, position: 'insideLeft', fill: '#6b7280', style: { textAnchor: 'middle', fontSize: 13 } }}
                    domain={[0, (dataMax) => Math.max(dataMax * 1.1, 1)]}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    content={<BarChartTooltip />} 
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} 
                    animationDuration={200}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px', paddingBottom: '10px' }}
                    iconType="rect"
                    iconSize={14}
                    formatter={(value) => <span style={{ color: '#374151', fontSize: '13px', fontWeight: 500, marginLeft: '8px' }}>{value}</span>}
                    align="center"
                    verticalAlign="bottom"
                  />
                  {/* Barre Total */}
                  <Bar 
                    dataKey="total" 
                    fill="url(#colorTotal)" 
                    name="Total" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={animationEnabled ? 1000 : 0}
                    animationBegin={0}
                  >
                    <LabelList 
                      dataKey="total" 
                      position="center" 
                      fill="#374151" 
                      fontSize={12}
                      fontWeight="700"
                      formatter={(value) => value !== null && value !== undefined ? value : '0'}
                      style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
                    />
                  </Bar>
                  {/* Barre Résolus */}
                  <Bar 
                    dataKey="resolus" 
                    fill="url(#colorResolus)" 
                    name="Résolus" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={animationEnabled ? 1000 : 0}
                    animationBegin={150}
                  >
                    <LabelList 
                      dataKey="resolus" 
                      position="center" 
                      fill="#ffffff" 
                      fontSize={12}
                      fontWeight="700"
                      formatter={(value) => value !== null && value !== undefined ? value : '0'}
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                    />
                  </Bar>
                  {/* Barre En attente */}
                  <Bar 
                    dataKey="enAttente" 
                    fill="url(#colorEnAttente)" 
                    name="En attente" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={animationEnabled ? 1000 : 0}
                    animationBegin={300}
                  >
                    <LabelList 
                      dataKey="enAttente" 
                      position="center" 
                      fill="#ffffff" 
                      fontSize={12}
                      fontWeight="700"
                      formatter={(value) => value !== null && value !== undefined ? value : '0'}
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                    />
                  </Bar>
                  {/* Barre En cours */}
                  <Bar 
                    dataKey="enCours" 
                    fill="url(#colorEnCours)" 
                    name="En cours" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={animationEnabled ? 1000 : 0}
                    animationBegin={450}
                  >
                    <LabelList 
                      dataKey="enCours" 
                      position="center" 
                      fill="#ffffff" 
                      fontSize={12}
                      fontWeight="700"
                      formatter={(value) => value !== null && value !== undefined ? value : '0'}
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                    />
                  </Bar>
                  {/* Barre Échéance dépassée */}
                  <Bar 
                    dataKey="echeanceDepassee" 
                    fill="url(#colorEcheanceDepassee)" 
                    name="Échéance dépassée" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={animationEnabled ? 1000 : 0}
                    animationBegin={600}
                  >
                    <LabelList 
                      dataKey="echeanceDepassee" 
                      position="center" 
                      fill="#ffffff" 
                      fontSize={12}
                      fontWeight="700"
                      formatter={(value) => value !== null && value !== undefined ? value : '0'}
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                    />
                  </Bar>
            </RechartsBar>
          </ResponsiveContainer>
            </div>
        ) : (
            <EmptyState icon={BarChart3} loading={isLoadingMonthly} description="Récupération des statistiques mensuelles" />
        )}
          <AIAnalysisCard analysis={aiAnalysisOverview} title="Analyse IA - Évolution Mensuelle" icon={BarChart3} />
      </div>
    </div>
  )
  }

  // Fonction pour formater les dates en format court (Nov 2025, Déc 2025, etc.)
  const formatDateShort = (dateString) => {
    if (!dateString) return ''
    
    try {
      // Gérer différents formats de dates
      let date
      if (typeof dateString === 'string') {
        // Si c'est déjà formaté comme "Nov 2025", le retourner tel quel
        if (dateString.match(/^[A-Za-z]{3}\s\d{4}$/)) {
          return dateString
        }
        // Essayer de parser la date
        date = new Date(dateString)
      } else {
        date = dateString
      }
      
      if (isNaN(date.getTime())) {
        // Si la date n'est pas valide, essayer de parser comme mois/année
        const parts = dateString.split(/[-/]/)
        if (parts.length >= 2) {
          const month = parseInt(parts[0] || parts[1]) - 1
          const year = parseInt(parts[1] || parts[0] || new Date().getFullYear())
          date = new Date(year, month, 1)
        } else {
          return dateString // Retourner tel quel si on ne peut pas parser
        }
      }
      
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      return `${month} ${year}`
    } catch (error) {
      return dateString // Retourner tel quel en cas d'erreur
    }
  }

  // Vue évolution
  const renderEvolution = () => {
    // Normaliser et formater les données depuis l'API
    // Les données proviennent de l'endpoint /api/criminel/fiches-criminelles/evolution-stats/
    // qui récupère les données RÉELLES depuis la base de données (CriminalFicheCriminelle)
    const displayData = evolutionData
      .map(item => {
        // Extraire la date depuis différents formats possibles de l'API
        const dateRaw = item.date || item.mois || item.periode || item.month || item.created_at || item.assignment_date || ''
        // item.total provient directement de la base de données (Count('id') sur CriminalFicheCriminelle)
        const valeur = Number(item.total || item.cas || item.count || item.value || 0) || 0
        
        // Formater la date pour l'affichage
        const periodeFormatted = formatDateShort(dateRaw)
        
        return {
          date: dateRaw,
          dateFormatted: periodeFormatted,
          valeur: valeur,
          periode: periodeFormatted || dateRaw // Pour compatibilité avec l'axe X
        }
      })
      .filter(item => {
        // Filtrer les valeurs nulles et les items sans date valide
        return item.valeur !== null && 
               item.valeur !== undefined && 
               item.periode && 
               item.periode !== ''
      })
      .sort((a, b) => {
        // Trier par date pour avoir une courbe chronologique
        try {
          // Essayer de parser les dates
          const dateA = new Date(a.date)
          const dateB = new Date(b.date)
          
          // Si les dates sont valides, les comparer
          if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
            return dateA.getTime() - dateB.getTime()
          }
          
          // Sinon, comparer les strings formatées
          return a.periode.localeCompare(b.periode)
        } catch {
          // En cas d'erreur, garder l'ordre original
          return 0
        }
      })

    const totalCas = displayData.reduce((sum, item) => sum + (item.valeur || 0), 0)
    const variation = displayData.length >= 2
      ? ((displayData[displayData.length - 1].valeur - displayData[displayData.length - 2].valeur) /
          Math.max(1, displayData[displayData.length - 2].valeur)) * 100
        : 0
    const fluctuationAmplitude = displayData.length > 0
      ? Math.max(...displayData.map(p => p.valeur)) - Math.min(...displayData.map(p => p.valeur))
        : 0
    
    return (
      <div className="space-y-6 w-full">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 w-full">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              Évolution du nombre de cas
            </h3>
            {evolutionData.length > 0 && (
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-blue-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Données en temps réel
                </span>
              </div>
            )}
          </div>
          {displayData.length === 0 ? (
            <EmptyState icon={TrendingUp} loading={isLoadingEvolution} description="Récupération depuis la base de données" />
          ) : displayData.length === 1 ? (
            // Visualisation professionnelle pour un seul point de données
            <div className="relative">
              {/* Carte principale avec design moderne */}
              <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-200/60 shadow-2xl">
                {/* Fond avec pattern subtil */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                
                <div className="relative z-10 p-8">
                  {/* En-tête */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur-lg opacity-50"></div>
                        <div className="relative p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl">
                          <TrendingUp className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Point de données unique</h3>
                        <p className="text-sm text-gray-500 mt-1">Visualisation de la donnée disponible</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-blue-700 tracking-wide">ACTIF</span>
                    </div>
                  </div>

                  {/* Grille de métriques */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Métrique principale - Nombre de cas */}
                    <div className="lg:col-span-2 relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                      <div className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl p-8 shadow-2xl border border-blue-400/20">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <p className="text-sm font-semibold text-blue-100 uppercase tracking-widest mb-2">Nombre de cas</p>
                            <p className="text-6xl font-black text-white leading-none mb-2">{displayData[0].valeur || 0}</p>
                            <p className="text-sm text-blue-100/80 font-medium">
                              cas enregistré{displayData[0].valeur > 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <Activity className="w-12 h-12 text-white" strokeWidth={2} />
                          </div>
                        </div>
                        {/* Barre de progression visuelle */}
                        <div className="mt-6">
                          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-lg"
                              style={{ width: '100%' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Métrique secondaire - Période */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl border border-gray-200/60 shadow-lg group-hover:shadow-xl transition-shadow"></div>
                      <div className="relative p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-slate-100 rounded-xl">
                            <Clock className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Période</p>
                          </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mb-2">{displayData[0].periode || 'N/A'}</p>
                        <p className="text-sm text-gray-500">Date de référence</p>
                      </div>
                    </div>
                  </div>

                  {/* Visualisation graphique moderne */}
                  <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-gray-200/60 p-8 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-1">Représentation visuelle</h4>
                        <p className="text-sm text-gray-500">Indicateur de données unique</p>
                      </div>
                      <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                        <span className="text-xs font-semibold text-indigo-700">Vue unique</span>
                      </div>
                    </div>
                    
                    {/* Graphique en aires adapté à l'évolution du nombre de cas */}
                    <div className="flex items-center justify-center py-8">
                      <ResponsiveContainer width="100%" height={450}>
                        <AreaChart 
                          data={[{
                            periode: displayData[0].periode || 'N/A',
                            valeur: displayData[0].valeur || 0,
                            date: displayData[0].date || displayData[0].periode,
                            // Données réelles depuis la base de données
                            total: displayData[0].valeur || 0,
                            cas: displayData[0].valeur || 0
                          }]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <defs>
                            <linearGradient id="areaGradientEvolutionSingle" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.8} />
                              <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="lineGradientEvolutionSingle" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#1E40AF" />
                              <stop offset="100%" stopColor="#2563EB" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="#E5E7EB" 
                            opacity={0.6}
                            vertical={false}
                          />
                          <XAxis 
                            dataKey="periode"
                            stroke="#6B7280"
                            tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
                            axisLine={{ stroke: '#D1D5DB', strokeWidth: 1.5 }}
                            tickLine={{ stroke: '#D1D5DB', strokeWidth: 1.5 }}
                            tickMargin={10}
                          />
                          <YAxis 
                            stroke="#6B7280"
                            tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
                            axisLine={{ stroke: '#D1D5DB', strokeWidth: 1.5 }}
                            tickLine={{ stroke: '#D1D5DB', strokeWidth: 1.5 }}
                            label={{ 
                              value: 'Nombre de cas', 
                              angle: -90, 
                              position: 'insideLeft', 
                              fill: '#6B7280', 
                              style: { textAnchor: 'middle', fontFamily: 'Inter, sans-serif', fontWeight: 500 } 
                            }}
                            domain={[0, 'auto']}
                            tickMargin={10}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                const valeurReelle = data.valeur || data.total || data.cas || 0
                                return (
                                  <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                                    <p className="text-sm font-semibold text-gray-900 mb-2">{data.periode || 'N/A'}</p>
                                    <p className="text-2xl font-bold text-blue-600">{valeurReelle} cas</p>
                                    <p className="text-xs text-gray-500 mt-1">Évolution du nombre de cas</p>
                                    {data.date && (
                                      <p className="text-xs text-gray-400 mt-1">Date: {data.date}</p>
                                    )}
                                  </div>
                                )
                              }
                              return null
                            }}
                            cursor={{ stroke: '#2563EB', strokeWidth: 2, strokeDasharray: '5 5', opacity: 0.5 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="valeur"
                            stroke="url(#lineGradientEvolutionSingle)"
                            strokeWidth={3}
                            fill="url(#areaGradientEvolutionSingle)"
                            dot={{ r: 8, fill: '#2563EB', stroke: '#1E40AF', strokeWidth: 2 }}
                            activeDot={{ r: 10, fill: '#2563EB', stroke: '#1E40AF', strokeWidth: 3 }}
                            name="Nombre de cas"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={450}>
              <RechartsLine data={displayData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="lineGradientEvolution" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1E40AF" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#DADBDD" opacity={0.8} vertical={false} />
                <XAxis 
                  dataKey="periode" 
                  stroke="#E5E7EB"
                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter, sans-serif' }} 
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={{ stroke: '#E5E7EB' }}
                  interval={displayData.length > 12 ? 1 : 0}
                  angle={displayData.length > 8 ? -45 : 0}
                  textAnchor={displayData.length > 8 ? 'end' : 'middle'}
                  height={displayData.length > 8 ? 60 : 30}
                />
                <YAxis 
                  stroke="#E5E7EB"
                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter, sans-serif' }} 
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={{ stroke: '#E5E7EB' }}
                  label={{ value: 'Nombre de cas', angle: -90, position: 'insideLeft', fill: '#6B7280', style: { textAnchor: 'middle', fontFamily: 'Inter, sans-serif' } }}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                          <p className="text-gray-900 font-semibold mb-2 text-sm">{data.periode || label}</p>
                          <p className="text-gray-900 font-bold text-lg">{payload[0].value || 0} cas</p>
                        </div>
                      )
                    }
                    return null
                  }}
                  cursor={{ stroke: '#1E40AF', strokeWidth: 1, strokeDasharray: '5 5', opacity: 0.3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="valeur" 
                  stroke="url(#lineGradientEvolution)" 
                  strokeWidth={3}
                  dot={{ r: 6, fill: '#2563EB', stroke: '#1E40AF', strokeWidth: 2, style: { filter: 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.3))' } }} 
                  activeDot={{ r: 8, fill: '#2563EB', stroke: '#1E40AF', strokeWidth: 3, style: { filter: 'drop-shadow(0 4px 8px rgba(37, 99, 235, 0.5))', transition: 'all 0.2s ease' } }} 
                  animationDuration={animationEnabled ? 1500 : 0}
                  name="Nombre de cas"
                  connectNulls={true}
                  isAnimationActive={animationEnabled}
                />
              </RechartsLine>
            </ResponsiveContainer>
          )}
          {displayData.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Variation récente</p>
              <p className={`text-2xl font-bold ${variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">par rapport au point précédent</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Amplitude des fluctuations</p>
                <p className="text-2xl font-bold text-gendarme-blue">{fluctuationAmplitude.toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-1">écart max/min</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cas cumulés</p>
              <p className="text-2xl font-bold text-gendarme-blue">{totalCas}</p>
              <p className="text-xs text-gray-500 mt-1">sur la période affichée</p>
            </div>
          </div>
        )}
          <AIAnalysisCard analysis={aiAnalysisEvolution} title="Analyse IA - Évolution Détaillée" icon={TrendingUp} />
      </div>
    </div>
    )
  }

  // Vue géographie
  const renderGeographie = () => {
    const totalCas = geographicData.reduce((sum, r) => sum + r.cas, 0)
    
    return (
      <div className="space-y-6 w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 w-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="mr-2 text-gendarme-red" size={24} />
              Répartition géographique par province
            </h3>
            {geographicData.length > 0 && <UpdateIndicator />}
              </div>
          {geographicData.length > 0 ? (
                <div className="bg-gradient-to-b from-white to-blue-50 rounded-2xl border border-blue-100 p-6 shadow-inner w-full max-w-full">
                  <h4 className="text-lg font-semibold text-gray-700 mb-6 uppercase tracking-wide text-center">Répartition % (Camembert)</h4>
                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
                    <div className="flex-1 flex justify-center">
                      <ResponsiveContainer width="100%" height={400}>
                        <RechartsPie>
                          <Pie
                        data={geographicData.filter(item => item.cas > 0)}
                            dataKey="cas"
                            nameKey="ville"
                            cx="50%"
                            cy="50%"
                            outerRadius={140}
                            innerRadius={60}
                            paddingAngle={4}
                            labelLine={true}
                            label={({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                          if (percent < 0.05) return null
                              const RADIAN = Math.PI / 180
                              const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                              const x = cx + radius * Math.cos(-midAngle * RADIAN)
                              const y = cy + radius * Math.sin(-midAngle * RADIAN)
                              return (
                            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                              {formatNumber(percent * 100, { maximumFractionDigits: 1 })}%
                                </text>
                              )
                            }}
                          >
                        {geographicData.filter(item => item.cas > 0).map((entry) => (
                              <Cell key={`cell-${entry.ville}`} fill={getProvinceColor(entry.ville)} />
                            ))}
                          </Pie>
                      <Tooltip formatter={(value) => [`${formatNumber(value)} cas`, '']} contentStyle={{ borderRadius: 12, borderColor: '#e0e7ff' }} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 w-full lg:w-auto min-w-[220px]">
                      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm h-full">
                        <h5 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Détails par Province</h5>
                        <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
                      {geographicData.map((item) => {
                            const pourcentage = totalCas > 0 ? (item.cas / totalCas) * 100 : 0
                            const isActive = item.cas > 0
                            return (
                          <div key={item.ville} className={`flex items-center justify-between p-1.5 rounded-md transition-colors ${isActive ? 'bg-gray-50 hover:bg-gray-100' : 'opacity-60'}`}>
                                <span className="flex items-center gap-2 flex-1">
                              <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getProvinceColor(item.ville) }} />
                              <span className={`text-xs font-semibold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{item.ville}</span>
                                </span>
                                <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>{formatNumber(item.cas)} cas</span>
                                  <span className={`text-xs font-bold min-w-[45px] text-right ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {formatNumber(pourcentage, { maximumFractionDigits: 1 })}%
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
          ) : (
            <EmptyState icon={BarChart3} loading={isLoadingGeographic} description="Récupération des statistiques géographiques" />
          )}
          <AIAnalysisCard analysis={aiAnalysisGeographic} title="Analyse IA - Répartition Géographique" icon={BarChart3} />
              </div>
      </div>
    )
  }

  // État pour les statistiques UPR
  const [uprStats, setUprStats] = useState(null)
  const [loadingUprStats, setLoadingUprStats] = useState(true)

  // Charger les statistiques UPR
  useEffect(() => {
    const fetchUprStats = async () => {
      try {
        setLoadingUprStats(true)
        const response = await api.get('/upr/statistics/')
        setUprStats(response.data)
      } catch (error) {
        console.error('Erreur chargement statistiques UPR:', error)
        setUprStats(null)
      } finally {
        setLoadingUprStats(false)
      }
    }

    if (viewMode === 'upr') {
      fetchUprStats()
      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(fetchUprStats, 30000)
      return () => clearInterval(interval)
    }
  }, [viewMode])

  // Vue UPR (remplace temps réel)
  const renderUPR = () => {
    if (loadingUprStats) {
      return (
        <div className="space-y-6 w-full">
          <EmptyState icon={UserSearch} loading={true} description="Chargement des statistiques UPR..." />
        </div>
      )
    }

    if (!uprStats) {
      return (
        <div className="space-y-6 w-full">
          <EmptyState icon={UserSearch} loading={false} description="Impossible de charger les statistiques UPR" />
        </div>
      )
    }

    const {
      total_upr = 0,
      resolved_upr = 0,
      unresolved_upr = 0,
      upr_with_embedding = 0,
      upr_with_fingerprint = 0,
      total_matches = 0,
      strict_matches = 0,
      upr_this_month = 0,
      resolution_rate = 0,
      evolution = [],
      status_distribution = [],
      matches_by_type = []
    } = uprStats

    return (
      <div className="space-y-6 w-full">
        {/* En-tête simple */}
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserSearch className="text-blue-600" size={24} />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Statistiques UPR</h2>
                <p className="text-sm text-gray-600">Unidentified Person Registry</p>
              </div>
            </div>
            {evolution.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-medium text-green-700">Actif</span>
              </div>
            )}
          </div>
        </div>

        {/* Statistiques principales - design simple */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total UPR */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Total UPR</h4>
              <UserSearch className="text-blue-500" size={18} />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{total_upr}</p>
            <p className="text-xs text-gray-500">{upr_this_month} créés ce mois</p>
          </div>

          {/* Résolus */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Résolus</h4>
              <CheckCircle className="text-green-500" size={18} />
            </div>
            <p className="text-3xl font-bold text-green-600 mb-1">{resolved_upr}</p>
            <p className="text-xs text-gray-500">{resolution_rate.toFixed(1)}% taux de résolution</p>
          </div>

          {/* Non résolus */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Non résolus</h4>
              <Clock className="text-amber-500" size={18} />
            </div>
            <p className="text-3xl font-bold text-amber-600 mb-1">{unresolved_upr}</p>
            <p className="text-xs text-gray-500">En attente d'identification</p>
          </div>

          {/* Correspondances */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Correspondances</h4>
              <AlertTriangle className="text-purple-500" size={18} />
            </div>
            <p className="text-3xl font-bold text-purple-600 mb-1">{total_matches}</p>
            <p className="text-xs text-gray-500">{strict_matches} correspondances strictes</p>
          </div>
        </div>

        {/* Graphique d'évolution - Design professionnel */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 overflow-hidden relative">
          {/* En-tête avec style professionnel */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-200">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                  <TrendingUp className="text-white" size={22} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Évolution des UPR</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Analyse sur les 30 derniers jours</p>
                </div>
              </div>
              {/* Métriques rapides */}
              <div className="flex items-center gap-6 mt-4 ml-12">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Total: <span className="font-semibold text-gray-900">{total_upr}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Ce mois: <span className="font-semibold text-gray-900">{upr_this_month}</span></span>
                </div>
              </div>
            </div>
            {evolution.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-emerald-700">Mise à jour automatique</span>
              </div>
            )}
          </div>

          {/* Graphique principal */}
          {evolution.length > 0 ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={420}>
                <ComposedChart data={evolution} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25}/>
                      <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#E5E7EB" 
                    vertical={false}
                    strokeOpacity={0.6}
                  />
                  <XAxis 
                    dataKey="label" 
                    stroke="#6B7280" 
                    tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} 
                    axisLine={{ stroke: '#D1D5DB', strokeWidth: 1.5 }} 
                    tickLine={{ stroke: '#D1D5DB', strokeWidth: 1.5 }}
                    tickMargin={10}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} 
                    axisLine={{ stroke: '#D1D5DB', strokeWidth: 1.5 }} 
                    tickLine={{ stroke: '#D1D5DB', strokeWidth: 1.5 }}
                    tickMargin={10}
                    label={{ 
                      value: 'Nombre d\'UPR', 
                      angle: -90, 
                      position: 'insideLeft', 
                      fill: '#374151', 
                      style: { fontWeight: 600, fontSize: 12 },
                      offset: 10
                    }}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const value = payload[0].value || 0;
                        return (
                          <div className="bg-white border-2 border-blue-200 rounded-xl shadow-2xl p-4 min-w-[160px]">
                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                              <div>
                                <p className="text-2xl font-bold text-gray-900">{value}</p>
                                <p className="text-xs text-gray-500 mt-0.5">UPR créé{value > 1 ? 's' : ''}</p>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }} 
                    cursor={{ 
                      stroke: '#3B82F6', 
                      strokeWidth: 2, 
                      strokeDasharray: '5 5', 
                      opacity: 0.5,
                      fill: 'rgba(59, 130, 246, 0.05)'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    fill="url(#areaGradient)" 
                    stroke="none"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="url(#lineGradient)" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ 
                      r: 6, 
                      fill: '#2563EB', 
                      stroke: '#1E40AF', 
                      strokeWidth: 2,
                      style: { filter: 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.3))' }
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[420px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
              <div className="p-4 bg-white rounded-full shadow-lg mb-4">
                <TrendingUp className="w-12 h-12 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">Aucune donnée disponible</h4>
              <p className="text-sm text-gray-500 text-center max-w-md">
                Les statistiques d'évolution apparaîtront ici une fois que des UPR seront créés dans le système.
              </p>
            </div>
          )}
        </div>

        {/* Graphiques en ligne - design simple */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          {/* Correspondances par type */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="text-purple-600" size={20} />
              Correspondances par type
            </h3>
            {matches_by_type.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBar data={matches_by_type}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} correspondance${value > 1 ? 's' : ''}`, '']} />
                  <Bar dataKey="value" fill="#8B5CF6">
                    {matches_by_type.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#8B5CF6'} />
                    ))}
                  </Bar>
                </RechartsBar>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} loading={false} description="Aucune correspondance enregistrée" />
            )}
          </div>
        </div>

        {/* Informations biométriques - design simple */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="text-indigo-600" size={20} />
            Données biométriques disponibles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Embeddings faciaux */}
            <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">Embeddings faciaux</p>
                  <p className="text-2xl font-bold text-blue-600">{upr_with_embedding}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {total_upr > 0 ? ((upr_with_embedding / total_upr) * 100).toFixed(1) : 0}% des UPR
                  </p>
                </div>
                <UserSearch className="text-blue-400" size={32} />
              </div>
            </div>
            {/* Empreintes digitales */}
            <div className="bg-cyan-50 rounded-lg p-5 border border-cyan-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-cyan-900 mb-1">Empreintes digitales</p>
                  <p className="text-2xl font-bold text-cyan-600">{upr_with_fingerprint}</p>
                  <p className="text-xs text-cyan-700 mt-1">
                    {total_upr > 0 ? ((upr_with_fingerprint / total_upr) * 100).toFixed(1) : 0}% des UPR
                  </p>
                </div>
                <Fingerprint className="text-cyan-400" size={32} />
              </div>
            </div>
          </div>
              </div>
      </div>
    )
  }

  // Vue temps réel
  const renderTempsReel = () => {
    // Calculer les statistiques
    const totalActivites = completeHourlyData.reduce((sum, item) => sum + (item.count || 0), 0)
    const activiteMax = Math.max(...completeHourlyData.map(item => item.count || 0), 0)
    const heurePointe = activiteMax > 0 
      ? completeHourlyData.find(item => item.count === activiteMax)?.hour || 'N/A'
      : 'N/A'
    const heureActuelle = new Date().getHours()
    const activiteActuelle = completeHourlyData[heureActuelle]?.count || 0
    
    return (
      <div className="space-y-6 w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Activity className="text-white animate-pulse" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Activité en temps réel</h3>
                <p className="text-xs text-gray-500 mt-0.5">Utilisation de l'application par heure (00h - 23h)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-green-700">Mise à jour automatique (5s)</span>
              </div>
              {completeHourlyData.length > 0 && <UpdateIndicator />}
          </div>
          </div>
          
              {isLoadingHourly ? (
            <EmptyState icon={Activity} loading={true} description="Récupération de l'activité en temps réel" />
              ) : (
                <>
              {/* Message informatif si aucune activité */}
              {totalActivites === 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Activity className="text-blue-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">Aucune activité enregistrée aujourd'hui</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Les activités de l'application (connexions, créations, modifications, etc.) seront affichées ici au fur et à mesure qu'elles se produisent.
                      </p>
                    </div>
            </div>
          </div>
        )}
        
              {/* Graphique LineChart */}
              <ResponsiveContainer width="100%" height={450}>
                <RechartsLine data={completeHourlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#6B7280" 
                    tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'Inter, sans-serif' }} 
                    axisLine={{ stroke: '#E5E7EB' }} 
                    tickLine={{ stroke: '#E5E7EB' }}
                    interval={0}
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'Inter, sans-serif' }} 
                    axisLine={{ stroke: '#E5E7EB' }} 
                    tickLine={{ stroke: '#E5E7EB' }}
                    label={{ value: 'Nombre d\'activités', angle: -90, position: 'insideLeft', fill: '#6B7280', style: { textAnchor: 'middle', fontFamily: 'Inter, sans-serif' } }}
                    domain={[0, Math.max(activiteMax, 1)]}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const value = payload[0].value || 0
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                            <p className="text-gray-900 font-semibold mb-1 text-sm">{label}</p>
                            <p className="text-blue-600 font-bold text-lg">{value} activité{value > 1 ? 's' : ''}</p>
            </div>
                        )
                      }
                      return null
                    }} 
                    cursor={{ stroke: '#2563EB', strokeWidth: 1, strokeDasharray: '5 5', opacity: 0.3 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#2563EB" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#2563EB', stroke: '#2563EB', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#2563EB', stroke: '#2563EB', strokeWidth: 3 }}
                    animationDuration={animationEnabled ? 800 : 0}
                    name="Activités"
                  />
                </RechartsLine>
              </ResponsiveContainer>
              
              {/* Statistiques */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total activités (24h)</p>
                  <p className="text-2xl font-bold text-blue-600">{totalActivites}</p>
                  <p className="text-xs text-gray-500 mt-1">sur les dernières 24 heures</p>
              </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Heure de pointe</p>
                  <p className="text-2xl font-bold text-blue-600">{heurePointe}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activiteMax > 0 ? `${activiteMax} activité${activiteMax > 1 ? 's' : ''}` : 'Aucune activité'}
                  </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Heure actuelle</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {completeHourlyData[heureActuelle]?.hour || `${String(heureActuelle).padStart(2, '0')}h`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activiteActuelle} activité{activiteActuelle > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </>
            )}
          </div>
        {completeHourlyData.length > 0 && totalActivites > 0 && (
          <AIAnalysisCard analysis={aiAnalysisHourly} title="Analyse IA - Activité en Temps Réel" icon={Activity} />
        )}
      </div>
    )
  }

  const renderCurrentView = () => {
    switch (viewMode) {
      case 'overview': return renderOverview()
      case 'evolution': return renderEvolution()
      case 'geographie': return renderGeographie()
      case 'geographie-camembert': return <div className="space-y-6"><RepartitionCamembert /></div>
      case 'upr': return renderUPR()
      default: return renderOverview()
    }
  }

  return (
    <div className={`w-full space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : 'px-0'}`}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-gendarme-blue to-gendarme-blue-dark rounded-xl shadow-lg">
              <Activity className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Graphiques Avancés</h2>
              <p className="text-sm text-gray-600">Visualisations interactives et analyses en temps réel</p>
            </div>
          </div>

          {showControls && (
            <div className="w-full flex flex-wrap items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">PÉRIODE D'ANALYSE</label>
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => {
                    const newPeriod = e.target.value
                    setSelectedPeriod(newPeriod)
                    // Le changement de selectedPeriod déclenchera automatiquement le recalcul de months
                    // qui déclenchera le rechargement des données via les dépendances des hooks useStatsData
                    setRefreshKey(prev => prev + 1) // Forcer le rechargement immédiat
                  }} 
                  disabled={isLoadingMonthly || isLoadingEvolution}
                  className="appearance-none px-4 py-2 rounded-xl border-2 border-blue-500 bg-white text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 shadow-sm hover:border-blue-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                  style={{ minWidth: '140px' }}
                >
                    {PERIODS.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                {(isLoadingMonthly || isLoadingEvolution) && (
                  <div className="absolute inset-y-0 right-10 flex items-center">
                    <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
              </div>
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:border-gendarme-blue transition-all">
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                {isFullscreen ? 'Réduire' : 'Plein écran'}
              </button>
              <button onClick={refreshData} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:border-gendarme-blue transition-all">
                <RefreshCw size={16} className="text-gendarme-blue" />
                Rafraîchir
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 border-b border-gray-200">
          <nav className="flex flex-wrap gap-2 overflow-x-auto">
            {VIEW_MODES.map((mode) => {
              const Icone = mode.icon
              return (
                <button key={mode.id} onClick={() => setViewMode(mode.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${viewMode === mode.id ? 'bg-gradient-to-r from-gendarme-blue to-gendarme-blue-dark text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:text-gray-900 hover:border-gendarme-blue'}`}>
                  <Icone size={16} />
                  <span>{mode.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <div key={refreshKey}>{renderCurrentView()}</div>
    </div>
  )
}

export default GraphiquesAvances
