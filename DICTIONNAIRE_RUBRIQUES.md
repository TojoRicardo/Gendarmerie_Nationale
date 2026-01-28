# Dictionnaire complet des rubriques — SGIC

Document de référence des **noms de rubriques**, **types**, **longueurs** et **correspondance backend** pour le système SGIC (criminel, enquête, utilisateur, biométrie, audit, rapports).

---

## 1. Légende

| Code | TYPE | Signification |
|------|------|----------------|
| A | Alphabétique | Lettres uniquement |
| AN | Alphanumérique | Lettres et chiffres |
| N | Numérique | Entier (IntegerField, clé primaire, FK) |
| D | Date / DateTime | Date seule (D 10) ou date + heure (D 19) |
| B | Booléen | True / False |
| T | Texte long | Texte illimité (TextField) |
| JSON | Objet / tableau JSON | Taille variable (JSONField) |
| UUID | Identifiant UUID | 36 caractères (8-4-4-4-12) |
| FICHIER | Fichier / chemin | ImageField, FileField |

**Longueur** : nombre de caractères (max_length ou équivalent). `--` = illimité ou variable.

**Formats de date** :  
- **D 10** = `JJ/MM/AAAA` (DateField)  
- **D 19** = `JJ/MM/AAAA HH:MM:SS` (DateTimeField)

---

## 2. Table principale des rubriques

Les rubriques sont en **ordre alphabétique**. La colonne **Modèle(s) backend** indique le(s) modèle(s) Django concerné(s).

| NOM DE LA RUBRIQUE | DESCRIPTION | TYPE | LONG. | OBSERVATION | MODÈLE(S) BACKEND |
|--------------------|-------------|------|------|-------------|-------------------|
| **action** | Action effectuée dans le système | AN | 50 | create, update, delete, view, LOGIN, etc. | audit (50), biometrie.BiometrieHistorique (50), UPR (20) |
| **adresse** | Adresse actuelle du criminel ou de l’utilisateur | AN | 255 | Optionnel. Utilisateur : TextField (illimité) | criminel.CriminalFicheCriminelle (255), utilisateur (T) |
| **assignation_id** | Identifiant de l’assignation d’enquête | N | 6 | PK de InvestigationAssignment | criminel.InvestigationAssignment.id |
| **assignment_date** | Date et heure d’assignation | D | 19 | JJ/MM/AAAA HH:MM:SS | criminel.InvestigationAssignment.assignment_date |
| **barbe** | Description barbe / moustache | A | 50 | aucune, courte, longue, moustache, bouc | criminel.CriminalFicheCriminelle.barbe |
| **cheveux** | Description des cheveux | A | 50 | noirs, bruns, châtains, blonds, roux, gris, blancs, chauves | criminel.CriminalFicheCriminelle.cheveux |
| **cin** | Numéro Carte d’Identité Nationale | AN | 15 | Format XXX XXX XXX XXX (12 chiffres + espaces) | criminel.CriminalFicheCriminelle.cin |
| **constatateur_nom** | Nom du constatateur | AN | 200 | Optionnel si type_enquete = constatation_directe | enquete.Enquete.constatateur_nom |
| **contact** | Numéro de téléphone du criminel | AN | 100 | Optionnel | criminel.CriminalFicheCriminelle.contact |
| **corpulence** | Description de la corpulence | A | 50 | mince, normale, forte, obese | criminel.CriminalFicheCriminelle.corpulence |
| **created_by** / **cree_par** | Utilisateur créateur de la fiche / enquête / rapport | N | 6 | FK vers Utilisateur. created_by : criminel, UPR. cree_par : enquete, rapports | criminel.created_by, enquete.cree_par, rapports.Rapport.cree_par |
| **date_action** | Date et heure de l’action | D | 19 | JJ/MM/AAAA HH:MM:SS | biometrie.BiometrieHistorique.date_action, audit |
| **date_creation** | Date de création | D | 19 | JJ/MM/AAAA HH:MM:SS. Utilisateur : dateCreation (camelCase) | criminel.date_creation, rapports.date_creation, utilisateur.dateCreation |
| **date_debut** | Date de début (période / rapport) | D | 10 | JJ/MM/AAAA | Filtres / paramètres rapports |
| **date_fin** | Date de fin (période / rapport) | D | 10 | JJ/MM/AAAA | Filtres / paramètres rapports |
| **date_incident** | Date de l’incident | D | 19 | JJ/MM/AAAA HH:MM:SS (DateTimeField) | enquete.Enquete.date_incident |
| **date_infraction** | Date de l’infraction | D | 10 | JJ/MM/AAAA | criminel.CriminalInfraction.date_infraction |
| **date_modification** | Dernière modification | D | 19 | JJ/MM/AAAA HH:MM:SS | criminel, enquete, biometrie.date_mise_a_jour |
| **date_naissance** | Date de naissance du criminel | D | 10 | JJ/MM/AAAA. Utilisateur : dateNaissance | criminel.date_naissance, utilisateur.dateNaissance |
| **denonciateur_nom** | Nom du dénonciateur | AN | 200 | Optionnel si type_enquete = denonciation | enquete.Enquete.denonciateur_nom |
| **description** | Description (enquête, action, etc.) | T | -- | Texte illimité. Obligatoire pour enquête | enquete.description, biometrie.BiometrieHistorique.description |
| **description_detaillee** | Description détaillée de l’infraction | T | -- | Optionnel | criminel.CriminalInfraction.description_detaillee |
| **due_date** | Date limite de l’assignation | D | 10 | JJ/MM/AAAA | criminel.InvestigationAssignment.due_date |
| **email** | Adresse email | AN | 255 | Format email valide (RFC). AbstractUser max 254 | criminel.email, utilisateur (EmailField) |
| **embedding_512** | Embedding ArcFace 512 dimensions | JSON | -- | Tableau JSON (512 nombres) | biometrie.BiometriePhoto.embedding_512 |
| **encodage_facial** | Vecteur d’encodage facial ArcFace | JSON | -- | 512 nombres. Biometrie : JSONField ; BiometriePhoto : TextField (JSON) | biometrie.Biometrie.encodage_facial, BiometriePhoto.encodage_facial |
| **enqueteur_principal** | Enquêteur principal responsable | N | 6 | FK Utilisateur. Alias : enqueteur_responsable | enquete.Enquete.enqueteur_principal |
| **eye_color** | Couleur des yeux | AN | 50 | Optionnel | criminel.CriminalFicheCriminelle.eye_color |
| **facemesh_468** | 468 points FaceMesh 3D | JSON | -- | [[x,y,z], …] | biometrie.BiometriePhoto.facemesh_468 |
| **fichier** | Chemin / fichier généré (rapport, preuve) | FICHIER | -- | FileField, ImageField. Rapports : upload_to rapports/%Y/%m/ | rapports.Rapport.fichier |
| **format_export** | Format d’export du rapport | AN | 10 | pdf, xlsx, docx, csv. Souvent dans parametres | Paramètres rapport / anciennes migrations |
| **grade** | Grade de l’utilisateur | AN | 100 | Optionnel | utilisateur.UtilisateurModel.grade |
| **hair_color** | Couleur des cheveux | AN | 50 | Optionnel | criminel.CriminalFicheCriminelle.hair_color |
| **height** | Taille en centimètres | N | 3 | 50–250 cm | criminel.CriminalFicheCriminelle.height |
| **ip_address** | Adresse IP de l’utilisateur / session | AN | 45 | IPv4 ou IPv6 (GenericIPAddressField) | audit.AuditLog.ip_address, biometrie.BiometrieHistorique.adresse_ip |
| **is_archived** | Fiche / utilisateur archivé(e) | B | 1 | True / False | criminel.is_archived, utilisateur.is_archived |
| **landmarks_106** | 106 points faciaux | JSON | -- | [[x,y], …] | biometrie.BiometriePhoto.landmarks_106 |
| **lieu** | Lieu (infraction, incident, enquête) | AN | 255 | Obligatoire ou optionnel selon contexte | criminel.CriminalInfraction.lieu (200), enquete.lieu (255) |
| **lieu_naissance** | Lieu de naissance | AN | 255 | Optionnel | criminel.CriminalFicheCriminelle.lieu_naissance |
| **marques_particulieres** | Marques particulières | T | -- | Optionnel | criminel.CriminalFicheCriminelle.marques_particulieres |
| **matricule** | Matricule utilisateur | AN | 50 | Optionnel, unique | utilisateur.UtilisateurModel.matricule |
| **nationalite** | Nationalité du criminel | AN | 100 | Optionnel | criminel.CriminalFicheCriminelle.nationalite |
| **niveau_danger** | Niveau de dangerosité (1–5) | N | 1 | 1 Faible → 5 Extrême | criminel.CriminalFicheCriminelle.niveau_danger |
| **nom** | Nom du criminel, suspect ou utilisateur | AN | 100 | Obligatoire pour criminel | criminel.nom, utilisateur.nom |
| **numero_affaire** | Numéro d’affaire judiciaire | AN | 100 | Optionnel | criminel.CriminalInfraction.numero_affaire |
| **numero_enquete** | Numéro unique de l’enquête | AN | 50 | ENQ-YYYY-XXXX (auto-généré) | enquete.Enquete.numero_enquete |
| **numero_fiche** | Identifiant unique de la fiche criminelle | AN | 50 | XXX-CIE/2-RJ (auto-généré) | criminel.CriminalFicheCriminelle.numero_fiche |
| **numero_infraction** | Identifiant de l’infraction | N | 6 | PK CriminalInfraction. Pas de champ « numero_infraction » littéral | criminel.CriminalInfraction.id |
| **numero_passeport** | Numéro de passeport | AN | 50 | Optionnel | criminel.CriminalFicheCriminelle.numero_passeport |
| **numero_rapport** | Identifiant du rapport | UUID | 36 | Rapport : **id** (UUID). Pas de champ « numero_rapport » en base | rapports.Rapport.id (UUID) |
| **objet_id** / **object_id** | Identifiant de l’objet modifié / ressource | N | 6 | Biometrie : objet_id. Audit : object_id (PositiveIntegerField) | biometrie.BiometrieHistorique.objet_id, audit.object_id |
| **type_objet** / **resource_type** | Type d’objet / type de ressource | AN | 50 / 255 | Biometrie : type_objet (50). Audit : resource_type (255) | biometrie.type_objet, audit.resource_type |
| **password** | Mot de passe utilisateur (hash) | AN | 128 | Hash bcrypt / Django (~60–128) | AbstractUser.password |
| **photo** | Photo du criminel | FICHIER | -- | JPG, PNG, JPEG. ImageField | criminel.CriminalFicheCriminelle.photo, biometrie.BiometriePhoto.image |
| **pin_attempts** | Nombre de tentatives PIN échouées | N | 2 | 0–99 | utilisateur.UserProfile.pin_attempts |
| **pin_blocked_until** | Date/heure blocage PIN | D | 19 | JJ/MM/AAAA HH:MM:SS (DateTimeField) | utilisateur.UserProfile.pin_blocked_until |
| **pin_hash** | Hash du code PIN | AN | 128 | Hash Django | utilisateur.UserProfile.pin_hash |
| **plaignant_contact** | Contact du plaignant | AN | 100 | Optionnel | enquete.Enquete.plaignant_contact |
| **plaignant_nom** | Nom du plaignant | AN | 200 | Optionnel si type_enquete = plainte | enquete.Enquete.plaignant_nom |
| **prenom** | Prénom du criminel ou utilisateur | AN | 100 | Obligatoire pour criminel | criminel.prenom, utilisateur.prenom |
| **priorite** | Priorité (enquête, assignation) | AN | 20 | faible, normale, elevee, urgente | enquete.priorite, criminel.InvestigationAssignment.priority |
| **progression** | Progression du dossier (%) | N | 3 | 0–100 | criminel.CriminalFicheCriminelle.progression |
| **qualite** | Score qualité image (0–100) | N | 3 | 0–100 | biometrie.BiometriePhoto.qualite |
| **role** | Rôle utilisateur | AN | 100 | admin, enqueteur, analyste, etc. | utilisateur.UtilisateurModel.role, audit.user_role |
| **sexe** | Sexe du criminel | A | 1 | H / F (backend max_length=10 pour choices) | criminel.CriminalFicheCriminelle.sexe |
| **statut** | Statut (enquête, rapport, assignation) | AN | 20 | en_cours, suspendue, cloturee, en_attente, termine, etc. | enquete.statut, rapports.statut, InvestigationAssignment.status |
| **statut_affaire** | Statut de l’affaire (FK) | N | 6 | RefStatutAffaire | criminel.CriminalInfraction.statut_affaire |
| **statut_fiche** | Statut de la fiche criminelle (FK) | N | 6 | RefStatutFiche | criminel.CriminalFicheCriminelle.statut_fiche |
| **surnom** | Surnom / alias | AN | 100 | Optionnel | criminel.CriminalFicheCriminelle.surnom |
| **taille_fichier** | Taille du fichier en octets | N | 10 | Octets (10 chiffres ≈ 10 Go) | rapports.Rapport.taille_fichier, biometrie.BiometriePhoto.taille_fichier |
| **titre** | Titre (enquête, rapport) | AN | 255 | Obligatoire | enquete.Enquete.titre, rapports.Rapport.titre |
| **type_enquete_code** | Type d’enquête (code) | AN | 50 | plainte, denonciation, constatation_directe | enquete.Enquete.type_enquete_code |
| **type_infraction** | Type d’infraction (FK ou libellé) | N / AN | 6 / 200 | FK CriminalTypeInfraction ; ou CharField dans Enquete | criminel.CriminalInfraction.type_infraction (FK), enquete.type_infraction (200) |
| **type_photo** | Type de photo biométrique | AN | 50 | face, profil_gauche, plein_pied, etc. | biometrie.BiometriePhoto.type_photo |
| **type_rapport** | Type de rapport | AN | 50 | statistique, criminel, enquete, audit | rapports.Rapport.type_rapport |
| **username** | Nom d’utilisateur (login) | AN | 150 | Obligatoire, unique (AbstractUser) | utilisateur.UtilisateurModel (AbstractUser.username) |
| **utilisateur** / **user** | Utilisateur ayant effectué l’action (FK) | N | 6 | audit.user, biometrie.effectue_par, etc. | audit.AuditLog.user, biometrie.BiometrieHistorique.effectue_par |
| **uuid** | Identifiant unique universel | UUID | 36 | Format 8-4-4-4-12 avec tirets | criminel.CriminalFicheCriminelle.uuid, enquete.Enquete.id, rapports.Rapport.id |
| **visage** | Forme du visage | A | 50 | ovale, rond, carré, allongé, triangulaire | criminel.CriminalFicheCriminelle.visage |
| **weight** | Poids en kilogrammes | N | 3 | 20–300 kg | criminel.CriminalFicheCriminelle.weight |

---

## 3. Correspondance nom de rubrique ↔ champ backend

Pour éviter les confusions entre **nom métier** et **nom technique** :

| Rubrique (dictionnaire) | Champ backend | Module | Remarque |
|-------------------------|---------------|--------|----------|
| **type_objet** | `type_objet` | biometrie | BiometrieHistorique : type d’objet (photo, empreinte, etc.) |
| | `resource_type` | audit | Même sémantique : type de ressource. max_length=255 |
| **objet_id** | `objet_id` | biometrie | BiometrieHistorique |
| | `object_id` | audit | AuditLog (PositiveIntegerField) |
| **created_by** | `created_by` | criminel, UPR, face_recognition | FK Utilisateur |
| **cree_par** | `cree_par` | enquete, rapports | FK Utilisateur, même sémantique |
| **date_naissance** | `date_naissance` | criminel | DateField |
| | `dateNaissance` | utilisateur | UtilisateurModel : camelCase |
| **date_creation** | `date_creation` | criminel, enquete, rapports | DateTimeField |
| | `dateCreation` | utilisateur | UtilisateurModel : camelCase |
| **numero_rapport** | `id` (UUID) | rapports.Rapport | Pas de champ « numero_rapport » ; clé = id UUID |
| **utilisateur** | `user` | audit | AuditLog.user |
| | `effectue_par` | biometrie | BiometrieHistorique.effectue_par |

**Convention** : le dictionnaire privilégie le **snake_case** (type_objet, created_by, date_creation) et indique les alias backend (cree_par, dateNaissance, resource_type, object_id) dans cette table.

---

## 4. Conventions types et longueurs

| Convention | Signification |
|------------|----------------|
| **D 10** | Date seule → `JJ/MM/AAAA` (DateField). |
| **D 19** | Date + heure → `JJ/MM/AAAA HH:MM:SS` (DateTimeField). |
| **T / --** | Texte long (TextField), longueur non limitée. |
| **JSON / --** | JSONField (ou TextField contenant du JSON), taille variable. |
| **N 6** | Entier typique pour clé primaire ou FK (IntegerField). |
| **UUID 36** | Chaîne UUID avec tirets (36 caractères). |

---

## 5. Modèles backend de référence

| Module | Fichier | Modèles principaux |
|--------|---------|---------------------|
| Criminel | `backend_gn/criminel/models.py` | CriminalFicheCriminelle, CriminalInfraction, InvestigationAssignment, RefStatutFiche, RefStatutAffaire, RefTypeInfraction, CriminalTypeInfraction |
| Enquête | `backend_gn/enquete/models.py` | Enquete, TypeEnquete |
| Utilisateur | `backend_gn/utilisateur/models.py` | UtilisateurModel (AbstractUser), UserProfile |
| Biométrie | `backend_gn/biometrie/models.py` | Biometrie, BiometriePhoto, BiometrieHistorique, BiometrieEmpreinte, … |
| Audit | `backend_gn/audit/models.py` | AuditLog, UserSession |
| Rapports | `backend_gn/rapports/models.py` | Rapport |

---

*Dictionnaire aligné avec l’état des modèles Django du projet (criminel, enquete, utilisateur, biometrie, audit, rapports). Dernière reprise complète : refonte totale du document.*
