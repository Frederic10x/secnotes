# SecNotes — Règles de rédaction des fiches

Ce fichier sert de référence pour la génération de tout contenu de fiche (fiche.md, flashcards.json, quiz.json).

---

## 1. Highlights — Mise en surbrillance inline

### Syntaxe de base (couleur accent indigo)

```
==texte à mettre en évidence==
```

Rendu : fond indigo à 30 % d'opacité, texte indigo.

### Syntaxe colorée

```
==red:texte==
==green:texte==
==blue:texte==
==yellow:texte==
==orange:texte==
==purple:texte==
```

| Préfixe     | Fond               | Texte      | Usage recommandé                        |
|-------------|-------------------|------------|-----------------------------------------|
| `red:`      | rouge à 20 %      | rouge      | Erreurs, dangers, commandes destructives |
| `green:`    | vert à 20 %       | vert       | Valeurs correctes, succès               |
| `blue:`     | bleu à 20 %       | bleu       | Concepts clés, noms de protocoles       |
| `yellow:`   | jaune à 20 %      | jaune      | Avertissements légers, à retenir        |
| `orange:`   | orange à 20 %     | orange     | Paramètres importants, flags            |
| `purple:`   | violet à 20 %     | violet     | Termes de sécurité, CVE, noms d'outils  |

**Règles d'utilisation :**
- Utiliser sur des termes importants, commandes clés, valeurs critiques
- Ne pas surligner des phrases entières — cibler des mots ou courtes expressions
- Au moins 3–5 highlights par fiche sur les termes importants

---

## 2. Callouts — Blocs contextuels

### Syntaxe

```
> [!type] Titre optionnel
> Contenu du callout ligne 1
> Contenu ligne 2
```

### Types supportés

| Type        | Icône           | Couleur    | Usage                                      |
|-------------|-----------------|------------|--------------------------------------------|
| `[!info]`   | Info            | Bleu       | Informations complémentaires, contexte     |
| `[!warning]`| AlertTriangle   | Jaune      | Points d'attention, pièges courants        |
| `[!danger]` | AlertOctagon    | Rouge      | Dangers critiques, erreurs de sécurité     |
| `[!tip]`    | Lightbulb       | Vert       | Conseils pratiques, bonnes pratiques       |
| `[!note]`   | StickyNote      | Violet     | Notes, rappels, points à mémoriser         |

### Exemples

```markdown
> [!info] Contexte
> Cette commande est disponible uniquement sur les systèmes Linux depuis le kernel 4.x.

> [!warning]
> Ne jamais exécuter cette commande en tant que root sans vérifier les permissions au préalable.

> [!danger] Risque critique
> Cette vulnérabilité permet une exécution de code à distance sans authentification.

> [!tip] Bonne pratique
> Utiliser toujours `--verbose` lors du débogage pour obtenir le détail des erreurs.

> [!note]
> Mémoriser les codes de retour : 0 = succès, 1 = erreur générique, 2 = mauvaise utilisation.
```

**Règles d'utilisation :**
- Ajouter au moins un callout par fiche quand c'est pertinent (tip ou warning)
- Le titre est optionnel — s'il est absent, le type est utilisé comme titre
- Le contenu peut être multiligne (chaque ligne précédée de `> `)

---

## 3. Blocs de code

### Syntaxe

Utiliser des blocs de code délimités avec identificateur de langage :

````markdown
```bash
chmod 755 /etc/script.sh
ls -la /var/log/
```

```python
import subprocess
result = subprocess.run(['ls', '-la'], capture_output=True)
```

```sql
SELECT * FROM users WHERE role = 'admin';
```
````

### Langages courants

| Identificateur | Langage         |
|---------------|-----------------|
| `bash`        | Shell / Bash    |
| `python`      | Python          |
| `sql`         | SQL             |
| `javascript`  | JavaScript      |
| `typescript`  | TypeScript      |
| `json`        | JSON            |
| `yaml`        | YAML            |
| `xml`         | XML / HTML      |
| `text`        | Texte brut      |

**Règles :**
- Toujours spécifier le langage pour activer la coloration syntaxique
- Les blocs de code ont un bouton "Copier" au survol

---

## 4. Règles générales de rédaction

### Structure des titres

- `##` pour les sections principales (jamais `#` — réservé au titre du node)
- `###` pour les sous-sections
- Maximum 2 niveaux de titres dans une fiche

### Tableaux

Syntaxe Markdown standard :

```markdown
| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| valeur    | valeur    | valeur    |
```

### Longueur et structure

- Fiche courte et dense : 300–600 mots
- Chaque section doit couvrir un concept précis
- Terminer par une section "À retenir" ou "Points clés" quand pertinent

### Highlights — fréquence recommandée

- Commandes shell : `==chmod==`, `==sudo==`
- Valeurs numériques importantes : `==755==`, `==4096==`
- Termes techniques clés : `==SUID==`, `==sticky bit==`
- Noms d'outils : `==nmap==`, `==metasploit==`

### Flashcards

- 5 à 10 flashcards par fiche
- Questions courtes et précises
- `security_angle` : toujours préciser l'angle sécurité/offensif/défensif

### Quiz

- 3 à 5 questions QCM par fiche
- 4 options par question (A, B, C, D)
- `explanation` : expliquer pourquoi la réponse correcte est correcte
- `tag` : utiliser un tag parmi ceux existants (#pentest, #appsec, #commandes, etc.)
