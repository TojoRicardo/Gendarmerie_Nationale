# Rôles et droits d'accès – SGIC (référence officielle)

Document de référence aligné sur le projet. Les noms de rôles et les droits ci‑dessous correspondent à l’implémentation (backend + frontend).

---

## 1. Administrateur (Administrateur Système)

**Rôle technique :** `Administrateur Système` ou `admin`.

| Capacité | Détail |
|----------|--------|
| Gérer les comptes utilisateurs | Création, modification, suppression, consultation |
| Attribuer les rôles et les droits d’accès | Gestion des rôles et permissions |
| Superviser l’ensemble du système | Accès complet à toutes les fonctionnalités |
| Assurer la sécurité et la maintenance de la plateforme | Paramètres, audit, sauvegarde |

**Permissions :** toutes (`*`).

---

## 2. Enquêteur

Le projet distingue trois niveaux. Ta fiche « Enquêteur » couvre **Enquêteur Principal** et **Enquêteur**. **Enquêteur Junior** est en consultation seule.

### 2.1 Enquêteur Principal

| Capacité | Détail |
|----------|--------|
| S’authentifier au système | Connexion sécurisée |
| Créer et gérer les dossiers d’enquête | Toutes les enquêtes ; création, modification, clôture |
| Enregistrer les fiches criminelles et les preuves | Création, modification, suppression ; gestion des preuves |
| Suivre l’évolution des enquêtes | Consultation + pilotage |

**Droits :** fiches (CRUD), biométrie (view, add, edit), rapports, IA (reconnaissance + prédiction), enquêtes (CRUD), suspects, preuves, analytics.

### 2.2 Enquêteur

| Capacité | Détail |
|----------|--------|
| S’authentifier au système | Connexion sécurisée |
| Créer et gérer les dossiers d’enquête | Uniquement les enquêtes qui lui sont assignées |
| Enregistrer les fiches criminelles et les preuves | Création/modification des fiches assignées ; pas de suppression |
| Suivre l’évolution des enquêtes | Consultation des enquêtes |

**Droits :** fiches (view, create, edit), biométrie (view, add), rapports (view, create), IA (view, reconnaissance), enquêtes (view). Modifications limitées aux éléments assignés.

### 2.3 Enquêteur Junior

| Capacité | Détail |
|----------|--------|
| S’authentifier au système | Connexion sécurisée |
| Consulter les dossiers et rapports | Lecture seule |
| Suivre l’évolution des enquêtes | Consultation uniquement |

**Droits :** consultation uniquement (dashboard, fiches, biométrie, rapports, IA, enquêtes, notifications). Aucune création, modification ou suppression.

---

## 3. Analyste

**Rôle technique :** `Analyste`.

| Capacité | Détail |
|----------|--------|
| Consulter les données criminelles | Fiches, biométrie, preuves (lecture) |
| Analyser les informations et produire des rapports | Génération et export de rapports |
| Appuyer la prise de décision | Analyse prédictive IA, analytics |
| Exploiter les statistiques et indicateurs | Tableaux de bord, indicateurs, audit de ses propres actions |

**Droits :** pas de modification des enquêtes, fiches ou preuves. Consultation + rapports + IA prédictive + analytics.

---

## 4. Observateur

**Rôle technique :** `Observateur`.

| Capacité | Détail |
|----------|--------|
| Accéder aux informations en lecture seule | Consultation et export de rapports uniquement |
| Consulter les dossiers et rapports | Fiches, biométrie, enquêtes, suspects, preuves |
| Suivre l’évolution des enquêtes | Consultation des enquêtes |
| Garantir la transparence des opérations | Pas de création ni de modification |

**Droits :** uniquement consultation (dashboard, fiches, biométrie, rapports, export, enquêtes, suspects, preuves, IA résultats, notifications).

---

## Synthèse des corrections effectuées

- **Enquêteur Junior** : retiré des logiques de modification et d’archivage (backend : `criminel`, `enquete`). Reste en **consultation seule**.
- **Frontend** : `isAnalyste` / `isObservateur` reconnaissent les rôles `Analyste` et `Observateur` (en plus des libellés « Analyste Judiciaire » / « Observateur Externe »). `Enquêteur` et `Enquêteur Junior` ajoutés dans `ROLE_PERMISSIONS`. Mode lecture seule pour **Enquêteur Junior** uniquement.
- **Document** : le présent `ROLES_ACCES.md` sert de **référence officielle** pour les accès utilisateur.

---

*Dernière mise à jour : alignée sur `backend_gn/utilisateur/permissions.py`, `criminel/permissions.py`, `enquete/permissions.py` et `frontend_gn/src/constants/permissions.js`.*
