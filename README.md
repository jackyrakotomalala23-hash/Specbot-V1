# Specbot — Assistant Avant-Vente Technique & Commercial (ADM Value × ManoMano)

> **Outil ADM Value · Conçu par Jacky Rakotomalala (CSO) pour ManoMano**  
> **URL de production :** [https://specbot-assistant.vercel.app/](https://specbot-assistant.vercel.app/)  
> **Projet Vercel :** [specbot-assistant](https://vercel.com/jackyrakotomalala23-3047s-projects/specbot-assistant)  
> **Dépôt GitHub :** [Specbot-V1](https://github.com/jackyrakotomalala23-hash/Specbot-V1)  
> **Projet Google Cloud :** `my-project-synthese`

---

## 1. Présentation & Objectif Opérationnel

**Specbot** est une application web d'assistance technique et commerciale conçue pour les conseillers BPO de l'opération **ManoMano** chez **ADM Value**. Elle permet de traiter rapidement les demandes pré-vente (analyse de lien produit ou référence ManoMano, questions qualificatives ouvertes, suggestions alternatives, cross-sell hiérarchisé `🔴 OBLIGATOIRE` / `🟠 ACCESSOIRES` / `🟢 INSPIRATION`, arguments clés, points forts ManoMano et spécifications techniques).

---

## 2. Ce Qui a Été Réalisé (Technique & Opérationnel)

### A. Architecture applicative et sécurité (Serverless Vercel)
* **Authentification Google OAuth 2.0 (`api/auth/config.js`, `api/auth/google.js`, `api/auth/me.js`, `api/auth/logout.js`) :**
  * Récupération dynamique de `GOOGLE_CLIENT_ID` via `/api/auth/config` sans exposition superflue côté frontend.
  * Vérification cryptographique du jeton ID Google côté serveur via `OAuth2Client.verifyIdToken` (`google-auth-library`) avec contrôle strict de `email_verified`.
  * Contrôle d'accès par liste blanche (`ALLOWED_EMAILS` + `ADMIN_EMAIL`) : tout compte Google non listé est rejeté (`403`).
  * Signature de session en HMAC-SHA256 (`SESSION_SECRET`) dans un cookie `HttpOnly`, `SameSite=Lax` (et `Secure` en HTTPS), vérifié par `crypto.timingSafeEqual`.
* **Moteur conversationnel (`api/chat.js`) :**
  * Vérification systématique de la session utilisateur avant tout appel LLM (`401` si non connecté).
  * Injection du prompt système **Specbot**, de la langue choisie (`FR`, `EN`, `ES`, `IT`, `DE`) et du **Skill** actif (`full_presales`, `qualification`, `objections`, `specs`).
  * Appel à l'API Gemini (`gemini-2.5-flash`) via `GEMINI_API_KEY` stockée côté serveur.

### B. Interface utilisateur et expérience opérateur (`index.html`)
* **Écran d'entrée sécurisé :** connexion Google obligatoire avant d'accéder à l'espace de travail.
* **Interface moderne et fluide :** thèmes **Sombre** et **Clair** avec mémorisation (`specbot_theme`), animations douces et révélation progressive des réponses (`streaming` visuel avec curseur animé).
* **Rendu structuré & copie rapide :** interprétation Markdown sécurisée (`marked` + `DOMPurify`), mise en forme des titres, listes, tableaux et blocs de citation (`>`), plus boutons dédiés pour copier la réponse complète ou uniquement le script client.
* **Panneau latéral repliable (`☰`) :** possibilité de masquer/afficher la barre latérale à tout moment (`specbot_sidebar_collapsed`).
* **Historique des discussions :** sauvegarde locale par utilisateur (`specbot_sessions_<email>`) avec reprise de discussion, suppression unitaire et bouton **+ Nouvelle discussion**.
* **Mise en veille après 5 heures d'inactivité :** détection de l'activité utilisateur (`5h`) avec déconnexion automatique (`/api/auth/logout`) et obligation de reconnexion Google.
* **Insigne institutionnel :** mention en bas d'écran précisant que l'outil est un outil **ADM Value**, conçu par **Jacky Rakotomalala (CSO)** pour **ManoMano**.

---

## 3. Configuration Google Cloud Platform

1. **Projet :** `my-project-synthese`.
2. **Client OAuth 2.0 (`Specbot Vercel`) :** `999515616209-ke7vrf6guuobp2n7e8hpp576bqlpt9qj.apps.googleusercontent.com`.
3. **Origines JavaScript autorisées :** renseigner l'URL exacte de l'application (`https://specbot-assistant.vercel.app`, sans barre oblique finale `/`).
4. **Mode Test & Utilisateurs tests :** tant que l'application OAuth est en statut *Test* dans **Google Auth Platform > Audience**, chaque adresse Google autorisée doit être ajoutée dans **Utilisateurs tests** (limite de 100 utilisateurs en mode Test).

---

## 4. Variables d'Environnement Vercel (`specbot-assistant`)

À configurer dans **Vercel > specbot-assistant > Settings > Environment Variables** :

* **`GEMINI_API_KEY` :**
  `Sensitive information`
* **`GOOGLE_CLIENT_ID` :**
  `Sensitive information`
* **`SESSION_SECRET` :**
  `lhd9zVhiJ9c352lhAU0+LQHCAwKn68fHTU/3SM5s3P1NcUfx68XP1GXlObqZAWLV`
* **`ADMIN_EMAIL` :**
  `jacky.rakotomalala23@gmail.com`
* **`ALLOWED_EMAILS` :**
  `Sensitive information`

---

## 5. Procédures de Gestion & Exploitation Quotidienne

### Procédure 1 — Ajouter ou retirer un utilisateur autorisé
1. **Sur Google Cloud (`my-project-synthese`) :** aller dans **Google Auth Platform > Audience > Utilisateurs tests** et cliquer sur **Add users** pour ajouter l'adresse Google (ou la retirer si nécessaire).
2. **Sur Vercel (`specbot-assistant`) :** aller dans **Settings > Environment Variables**, modifier **`ALLOWED_EMAILS`** (liste séparée par des virgules, sans espace superflu), enregistrer, puis déclencher un **Redeploy** dans **Deployments** pour que la nouvelle liste soit prise en compte côté serveur.

### Procédure 2 — Donner les droits à un responsable pour gérer les utilisateurs tests (GCP)
1. Ouvrir **Google Cloud Console** sur le projet **`my-project-synthese`** > **IAM et administration > IAM**.
2. Cliquer sur **Accorder l'accès**, renseigner l'adresse e-mail du responsable et lui attribuer le rôle **Éditeur de configuration OAuth** (*OAuth Config Editor*) — ou **Propriétaire** si accès complet requis.
3. Enregistrer : le responsable peut désormais gérer la liste des utilisateurs tests dans **Google Auth Platform > Audience**.

### Procédure 3 — Donner l'accès aux responsables pour modifier le prompt (`api/chat.js`) sur GitHub
* **Lien du dépôt / invitation :** [https://github.com/jackyrakotomalala23-hash/Specbot-V1](https://github.com/jackyrakotomalala23-hash/Specbot-V1) (et [https://github.com/jackyrakotomalala23-hash/Specbot-V1/invitations](https://github.com/jackyrakotomalala23-hash/Specbot-V1/invitations) pour accepter l'invitation).
1. Dans **[Specbot-V1](https://github.com/jackyrakotomalala23-hash/Specbot-V1)**, aller dans **Settings > Collaborators > Add people** et inviter le responsable avec son compte GitHub ou son e-mail GitHub.
2. Le responsable accepte l'invitation (via son mail ou directement sur GitHub via le lien d'invitation).
3. Il ouvre `api/chat.js`, clique sur l'icône **crayon** (*Edit this file*), met à jour `BASE_SPECBOT_PROMPT` ou `SKILL_ADDONS`, puis clique sur **Commit changes...** sur `main`.
4. **Règle de sécurité syntaxique :** éviter tout caractère backtick (`` ` ``) non échappé à l'intérieur des chaînes de caractères JavaScript de `api/chat.js` afin de ne pas provoquer d'erreur de build Vercel.

### Procédure 4 — Continuité de service, veille (5h) et dépannage rapide
* **Veille / reconnexion :** après 5 heures d'inactivité, l'application déconnecte automatiquement la session et renvoie à l'écran de connexion Google ; l'agent
