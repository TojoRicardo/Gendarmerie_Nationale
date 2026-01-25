import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ListeRoles from '../../components/roles/ListeRoles'
import { 
  TrendingUp, Users, Lock, Key, ShieldCheck
} from 'lucide-react'
import { MESSAGES } from '../utils/notifications'
import { useNotification } from '../context/NotificationContext'
import { getUsers } from '../services/authService'

const Roles = () => {
  const navigate = useNavigate()
  const notification = useNotification()
  const [totalUtilisateurs, setTotalUtilisateurs] = useState(0)

  useEffect(() => {
    // Charger le nombre total d'utilisateurs
    const chargerUtilisateurs = async () => {
      try {
        const response = await getUsers();
        const utilisateurs = Array.isArray(response) ? response : [];
        setTotalUtilisateurs(utilisateurs.length);
      } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        setTotalUtilisateurs(0);
      }
    };
    chargerUtilisateurs();
  }, []);

  // Statistiques globales
  const statistiques = [
    {
      titre: 'Total Rôles',
      valeur: '4',
      evolution: '0%',
      hausse: true,
      icone: ShieldCheck,
      couleur: 'blue',
      details: 'Rôles définis'
    },
    {
      titre: 'Utilisateurs',
      valeur: totalUtilisateurs.toString(),
      evolution: '+5%',
      hausse: true,
      icone: Users,
      couleur: 'blue',
      details: 'Comptes assignés'
    },
    {
      titre: 'Permissions',
      valeur: '24',
      evolution: '0%',
      hausse: true,
      icone: Key,
      couleur: 'blue',
      details: 'Permissions disponibles'
    },
    {
      titre: 'Accès Restreints',
      valeur: '3',
      evolution: '0%',
      hausse: true,
      icone: Lock,
      couleur: 'blue',
      details: 'Rôles avec restrictions'
    },
  ]

  const handleCreer = () => {
    navigate('/roles/creer')
  }

  const handleModifier = (role) => {
    // Utiliser le nom du rôle encodé dans l'URL au lieu de l'ID
    // Priorité: nom > code > id (mais id ne devrait jamais être utilisé)
    if (!role.nom && !role.code) {
      console.error('Rôle sans nom ni code:', role)
      notification.showError('Impossible de modifier ce rôle: nom ou code manquant')
      return
    }
    const roleName = encodeURIComponent(role.nom || role.code)
    navigate(`/roles/modifier/${roleName}`)
  }

  const handleSupprimer = async (role) => {
    const confirmed = await notification.showConfirm(MESSAGES.CONFIRM_DELETE_ROLE)
    if (confirmed) {
      console.log('Supprimer rôle:', role)
      notification.showSuccess(MESSAGES.SUCCESS_ROLE_DELETED)
    }
  }

  const handleVoir = (role) => {
    // Utiliser le nom du rôle encodé dans l'URL au lieu de l'ID
    // Priorité: nom > code > id (mais id ne devrait jamais être utilisé)
    if (!role.nom && !role.code) {
      console.error('Rôle sans nom ni code:', role)
      notification.showError('Impossible de voir ce rôle: nom ou code manquant')
      return
    }
    const roleName = encodeURIComponent(role.nom || role.code)
    navigate(`/roles/voir/${roleName}`)
  }

  return (
    <div className="space-y-6">
      {/* Statistiques en cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statistiques.map((stat, index) => {
          const Icone = stat.icone
          return (
            <div
              key={index}
              className="stat-card group"
            >
              {/* En-tête avec icône et titre */}
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-3 rounded-xl bg-${stat.couleur}-100`}>
                  <Icone className={`text-${stat.couleur}-600`} size={24} />
                </div>
                <p className="text-sm font-bold text-gray-700">{stat.titre}</p>
              </div>
              
              {/* Valeur */}
              <div className="mb-2">
                <p className="text-3xl font-bold text-gray-900">{stat.valeur}</p>
              </div>
              
              {/* Détails */}
              <p className="text-xs text-gray-500">{stat.details}</p>
            </div>
          )
        })}
      </div>

      {/* Liste des rôles */}
      <div className="card-pro p-6">
        <ListeRoles
          onCreer={handleCreer}
          onModifier={handleModifier}
          onSupprimer={handleSupprimer}
          onVoir={handleVoir}
        />
      </div>
    </div>
  )
}

export default Roles

