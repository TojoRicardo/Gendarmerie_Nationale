import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

/**
 * Composant React pour afficher l'activité temps réel des fiches criminelles
 * 
 * Rafraîchit automatiquement toutes les 60 secondes
 * Affiche les anomalies détectées par l'IA
 */
export default function ActiviteTempsReelChart() {
  const [data, setData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_URL}/api/ai-analysis/real/activite_temps_reel/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ time_window: 24 })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      
      if (json.success) {
        // Construire les données pour Recharts
        const rows = (json.data.motif_activity || []).map(m => ({
          name: m.motif_arrestation || 'N/A',
          value: m.count || 0
        }));
        
        setData(rows);
        setAnomalies(json.data.anomalies || []);
        setLastUpdate(new Date());
      } else {
        throw new Error(json.error || 'Erreur lors de la récupération des données');
      }
    } catch (err) {
      console.error('Erreur fetch Activité Temps Réel:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Rafraîchir toutes les 60s
    return () => clearInterval(interval);
  }, []);

  if (loading && data.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Chargement des données...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', background: '#fee', borderRadius: '5px' }}>
        <strong>Erreur:</strong> {error}
        <button onClick={fetchData} style={{ marginLeft: '10px', padding: '5px 10px' }}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '20px' }}>Activité Temps Réel (24 dernières heures)</h3>
      
      {anomalies.length > 0 && (
        <div style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffc107',
          padding: '15px', 
          marginBottom: '15px',
          borderRadius: '5px'
        }}>
          <strong>{anomalies.length} anomalie(s) détectée(s):</strong>
          <ul style={{ marginTop: '10px', marginBottom: 0 }}>
            {anomalies.map((a, i) => (
              <li key={i}>
                {a.description || a.type}
                {a.severity && <span style={{ color: a.severity === 'high' ? 'red' : 'orange' }}>
                  {' '}({a.severity})
                </span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          <p>Aucune activité récente</p>
        </div>
      ) : (
        <div style={{ height: 320, marginBottom: '10px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-20} 
                textAnchor="end" 
                height={60}
                interval={0}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                name="Activité par motif" 
                stroke="#2563eb" 
                strokeWidth={2} 
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        textAlign: 'right',
        marginTop: '10px'
      }}>
        {lastUpdate && (
          <>
            Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
            {' '}
            <button 
              onClick={fetchData} 
              style={{ 
                marginLeft: '10px', 
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              disabled={loading}
            >
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

