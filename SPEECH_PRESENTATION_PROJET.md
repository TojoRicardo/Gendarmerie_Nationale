# Discours de présentation – Projet SGIC Gendarmerie Nationale

Ce document propose plusieurs **speeches** pour présenter votre projet, selon le public, le temps imparti et le niveau de détail souhaité.

---

## 1. Pitch court (1–2 minutes)

*Idéal : jury, investisseurs, ou présentation rapide en réunion.*

> Bonjour à tous.
>
> Je vous présente le **SGIC** — Système de Gestion de l’Information Criminelle — une plateforme numérique conçue pour la Gendarmerie Nationale.
>
> Ce système aide les enquêteurs à **centraliser les fiches criminelles**, **gérer les dossiers d’enquête** et à s’appuyer sur des outils modernes : **reconnaissance faciale**, **analyse biométrique** — empreintes, photos — et **intelligence artificielle** pour la reconnaissance et la prédiction.
>
> L’accès est **sécurisé et différencié** : administrateurs, enquêteurs, analystes et observateurs disposent chacun de droits adaptés à leur mission. Les rapports et statistiques sont générés et exportables pour appuyer les décisions.
>
> En résumé : une **solution complète**, **sécurisée** et **orientée terrain** pour renforcer l’efficacité des enquêtes criminelles.

---

## 2. Présentation standard (3–5 minutes)

*Idéal : soutenance de projet, démo client, comité de pilotage.*

> Bonjour, je vais vous présenter le **Système de Gestion de l’Information Criminelle**, ou **SGIC**, développé pour la Gendarmerie Nationale.
>
> **Constat** : les enquêtes criminelles s’appuient sur de nombreuses sources — fiches, preuves, biométrie, rapports — souvent dispersées. Le SGIC a pour objectif de **rassembler ces données** dans une seule plateforme, tout en renforçant la **sécurité** et la **traçabilité**.
>
> **Fonctionnalités principales** :
> - **Gestion des fiches criminelles** : enregistrement, modification et suivi des personnes et des infractions.
> - **Biométrie** : photos, empreintes, reconnaissance faciale avec des modèles avancés — InsightFace, FaceNet — pour identifier ou vérifier des personnes.
> - **Enquêtes** : création et suivi des dossiers, rattachement des suspects et des preuves.
> - **Intelligence artificielle** : reconnaissance faciale et outils d’analyse prédictive pour aider les enquêteurs.
> - **Rapports et statistiques** : tableaux de bord, indicateurs, export PDF/Excel pour les décideurs.
> - **Sécurité et audit** : rôles (Administrateur, Enquêteur, Analyste, Observateur), permissions fines, traçabilité des actions.
>
> **Stack technique** : backend **Django REST** avec PostgreSQL, frontend **React** avec Vite et Tailwind, plus des briques dédiées à l’IA et à la biométrie. Le tout est conçu pour être maintenu et évolutif.
>
> Ce projet illustre comment le **numérique** et l’**IA** peuvent être mis au service de la **sécurité publique** tout en respectant un cadre de droits d’accès et d’audit rigoureux.

---

## 3. Présentation technique (5–8 minutes)

*Idéal : jury technique, développeurs, chefs de projet informatique.*

> Bonjour, je vais détailler l’**architecture** et les **choix techniques** du SGIC — Système de Gestion de l’Information Criminelle pour la Gendarmerie Nationale.
>
> **1. Contexte et objectifs**
>
> Le SGIC est une application web full-stack qui centralise les données criminelles, la biométrie, les enquêtes et les rapports, avec une forte exigence de **sécurité**, **traçabilité** et **performance**.
>
> **2. Architecture**
>
> - **Backend** : Django 4.2, Django REST Framework, JWT (Simple JWT) pour l’authentification, PostgreSQL comme base de données.
> - **Frontend** : React 18, Vite 6, Tailwind CSS, Recharts pour les graphiques, React Quill pour l’édition de texte riche.
> - **API** : REST, documentation Swagger/OpenAPI (drf-spectacular, drf-yasg).
> - **Sécurité Django** : CSRF (CsrfViewMiddleware), protection contre le clickjacking (XFrameOptionsMiddleware), SecurityMiddleware ; requêtes via l’ORM pour limiter les injections SQL ; côté frontend, React échappe le texte par défaut (limitation XSS). Voir section 6 pour le détail.
>
> **3. Modules métier**
>
> - **criminel** : fiches criminelles, suspects, preuves.
> - **biometrie** : modèles pour photos, empreintes, encodages (FaceNet, InsightFace), vérification d’identité.
> - **enquete** : dossiers d’enquête, workflow, assignation aux enquêteurs.
> - **intelligence_artificielle** : services de reconnaissance faciale, analyse prédictive, intégration avec les modèles IA.
> - **rapports** : génération de rapports (ReportLab, WeasyPrint), export PDF/Excel.
> - **sgic_statistics** : indicateurs, courbes, tableaux de bord.
> - **utilisateur** : comptes, rôles, permissions (RBAC), 2FA (PyOTP).
> - **audit** : journalisation des actions sensibles.
>
> **4. Sécurité et droits**
>
> - Rôles : Administrateur, Enquêteur Principal, Enquêteur, Enquêteur Junior, Analyste, Observateur.
> - Permissions par ressource (fiches, biométrie, enquêtes, rapports, IA). Référence officielle dans `ROLES_ACCES.md`.
>
> **5. IA et biométrie**
>
> - PyTorch, InsightFace/ArcFace, FaceNet pour les encodages faciaux.
> - OpenCV, Pillow, scikit-image pour le traitement d’images.
> - Pipelines de détection, vérification et recherche de similarité.
>
> **6. Infra et déploiement**
>
> - Celery + Redis pour les tâches asynchrones.
> - Recherche full-text (Django Haystack, Whoosh).
> - Service multi-caméras (UPR) pour les flux vidéo.
>
> L’ensemble est pensé pour être **maintenable**, **documenté** et **évolutif** dans un contexte institutionnel exigeant.

---

## 4. Présentation grand public / journalistes (2–3 minutes)

*Idéal : communication externe, presse, partenaires non techniques.*

> Bonjour,
>
> Le **SGIC** est un **système informatique** développé pour aider la Gendarmerie Nationale dans son travail quotidien sur les **enquêtes criminelles**.
>
> Concrètement, il permet de :
> - **Centraliser** les informations sur les dossiers et les personnes impliquées.
> - **Utiliser la biométrie** — photos et empreintes — de manière structurée et contrôlée.
> - **Assister les enquêteurs** avec des outils de **reconnaissance faciale** et d’**analyse**, tout en gardant la décision humaine au cœur du processus.
> - **Produire des rapports et des statistiques** pour mieux piloter les enquêtes et rendre compte.
>
> La **sécurité** et le **respect des droits** sont au centre du projet : chaque utilisateur n’accède qu’aux fonctions autorisées pour son rôle, et les actions importantes sont tracées.
>
> L’objectif est simple : **mettre la technologie au service des enquêteurs** pour des enquêtes plus rapides, mieux documentées et plus cohérentes, dans un cadre strict et auditable.

---

## 5. Ouverture / Remerciements (30 secondes – 1 minute)

*Idéal : fin de soutenance, clôture de réunion.*

> Pour conclure, le **SGIC** montre qu’il est possible de construire une **plateforme criminelle moderne** — biométrie, IA, rapports, gestion des enquêtes — tout en garantissant **sécurité**, **traçabilité** et **respect des rôles**.
>
> Je reste à votre disposition pour toute question ou démonstration. Merci de votre attention.

---

## 6. Sécurité intégrée Django – Ce que vous utilisez réellement

Réponse à la question : **« Est-ce que j’ai utilisé la sécurité intégrée de Django (protection contre injections, CSRF, XSS) ? »**

| Protection | Utilisé dans le projet ? | Détail |
|------------|--------------------------|--------|
| **CSRF** | **Oui** | `django.middleware.csrf.CsrfViewMiddleware` est dans `MIDDLEWARE` (`backend_gn/settings.py`). Les en-têtes CORS incluent `x-csrftoken`, et `CSRF_TRUSTED_ORIGINS` est défini pour le frontend (localhost, 127.0.0.1, 172.29.131.157). Les vues API n’utilisent pas `@csrf_exempt`. |
| **Injections SQL** | **Oui** | La quasi-totalité des accès à la base passe par l’**ORM Django** (modèles, filtres, `annotate`, etc.), ce qui évite les injections par construction. Les rares `cursor.execute()` utilisent des **requêtes paramétrées** (`%s`, `[user_id]`) et pas de concaténation de saisie utilisateur. Les noms de tables viennent de `_meta.db_table` (valeur interne Django). |
| **XSS (côté Django)** | **Partiel** | L’application est surtout une **SPA React** ; Django sert peu de templates HTML. Pour les templates Django, l’échappement automatique est actif par défaut. |
| **XSS (côté frontend)** | **Partiel** | **React** échappe le contenu affiché dans `{variable}` par défaut, ce qui limite fortement le XSS. **DOMPurify** est dans `package.json` (`dompurify: ^3.1.7`) mais n’est **pas importé ni utilisé** dans le code source actuel. Pour tout affichage de HTML riche généré par l’utilisateur (ex. contenu React Quill), il est recommandé de passer ce contenu par DOMPurify avant un éventuel `dangerouslySetInnerHTML`. |
| **Clickjacking** | **Oui** | `django.middleware.clickjacking.XFrameOptionsMiddleware` est activé dans `MIDDLEWARE`. |
| **SecurityMiddleware** | **Oui** | `django.middleware.security.SecurityMiddleware` est le deuxième middleware de la pile. |
| **HTTPS / proxy** | **Oui** | `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` est défini pour derrière un reverse proxy en HTTPS. |

**En résumé pour votre présentation** : vous utilisez bien les **protections Django contre CSRF et clickjacking**, le **SecurityMiddleware**, et vous limitez les **injections SQL** grâce à l’ORM et aux requêtes paramétrées. Pour le **XSS**, la combinaison **templates Django + React** avec l’échappement par défaut couvre la plupart des cas ; DOMPurify est disponible mais pas encore branché dans l’app pour le HTML riche. Vous pouvez donc dire en toute franchise : *« Nous nous appuyons sur la sécurité intégrée de Django : CSRF, protection contre le clickjacking, SecurityMiddleware, et utilisation systématique de l’ORM pour éviter les injections SQL. Côté affichage, React et les templates Django échappent le contenu par défaut ; DOMPurify est prévu pour renforcer la sanitisation du HTML riche si besoin. »*

---

## 7. Réponses types pour les questions fréquentes

| Question | Réponse type |
|----------|--------------|
| *« Pourquoi Django et React ? »* | Django permet de structurer rapidement un backend sécurisé (auth, admin, ORM). React offre une interface réactive et maintenable. Le couple est éprouvé en contexte professionnel. |
| *« La sécurité Django (CSRF, XSS, injections) ? »* | Oui : CSRF via CsrfViewMiddleware, SecurityMiddleware et XFrameOptionsMiddleware ; injections SQL limitées par l’ORM et les requêtes paramétrées ; React et les templates Django échappent le contenu par défaut (XSS). DOMPurify est disponible côté frontend pour renforcer la sanitisation du HTML riche si besoin. |
| *« Les données biométriques sont-elles protégées ? »* | Oui : authentification JWT, rôles et permissions par ressource, audit des accès. Les encodages et données sensibles sont gérés dans un cadre contrôlé. |
| *« Quelle place pour l’IA ? »* | L’IA assiste (reconnaissance faciale, analyses), mais ne remplace pas l’enquêteur. Les résultats sont consultables et interprétables par les utilisateurs habilités. |
| *« Le système peut-il évoluer ? »* | Oui : architecture modulaire (Django apps, APIs REST), documentation (Swagger, ROLES_ACCES, gitUnion), et séparation frontend/backend facilitent l’ajout de nouveaux modules. |

---

## Conseils pour la présentation orale

1. **Adapter le discours** au public (technique, décideurs, grand public) et au temps disponible.
2. **Montrer une démo** si possible : connexion, création d’une fiche, consultation d’un rapport ou d’un tableau de bord.
3. **Préparer 2–3 chiffres ou faits** : nombre de modules, de rôles, types de rapports, technologies clés.
4. **Anticiper les questions** sur la biométrie, l’IA et la conformité (RGPD, droits d’accès).
5. **Terminer par une phrase claire** sur la valeur du projet : « Plus d’efficacité pour les enquêteurs, plus de contrôle et de transparence pour l’institution. »

---

*Document généré pour le projet Gendarmerie Nationale – SGIC. À adapter selon le contexte de chaque présentation.*
