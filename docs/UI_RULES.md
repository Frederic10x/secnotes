# SecNotes — UI Rules & Design System

## Design Tokens — Immutables

```ts
colors: {
  background: '#0A0C14',  // page background
  surface:    '#141624',  // cards, panels, inputs
  border:     '#1E2235',  // all borders
  accent:     '#6366F1',  // indigo — primary action, active states
  text:       '#E2E8F0',  // primary text
  muted:      '#64748B',  // secondary text, placeholders
  success:    '#22C55E',  // correct, lu, streak
  warning:    '#F59E0B',  // timer, amber accents
  danger:     '#EF4444',  // incorrect, angle sécurité, À revoir
  teal:       '#14B8A6',  // Facile button
  orange:     '#F97316',  // flashcards dues badges
}
fonts: {
  body: 'Inter',
  code: 'JetBrains Mono',
}
```

---

## Langue

- Tout le texte UI en **FRANÇAIS** sans exception
- Boutons, labels, placeholders, tooltips, empty states : FRANÇAIS
- Termes techniques acceptés en anglais : noms de commandes shell, tags (#pentest, #appsec), contenu dans les blocs de code, slugs

---

## Sidebar — Loi Fondamentale

Fichier unique : `@/components/layout/Sidebar.tsx`  
Jamais recréé, jamais modifié par les pages enfants.

Structure stricte et non négociable :

```
[Logo SecNotes]
─────────────────
ESPACES
  > Linux (expandable)
      Fundamentals
      Permissions  ← active highlight
  > HTTP
  > AppSec
─────────────────
TAGS
  ● #pentest      (red dot)
  ● #appsec       (indigo dot)
  ● #commandes    (blue dot)
  ● #exploitation (orange dot)
─────────────────
[🔍 Rechercher    ⌘K]
[⚙  Paramètres      ]
```

### Règles sidebar

- PAS de séparateur visuel entre Rechercher et Paramètres
- PAS d'item hors structure (no Overview, no Documentation, no Flashcards, no Cheat Sheets, no New Note, no KNOWLEDGE BASE)
- Route active : fond `#1E2235` + indigo left border 3px
- Hover : fond `#141624` + transition 150ms
- Largeur fixe : 220px, non redimensionnable en V1
- Tree récursif : composant NodeTree qui se rend lui-même pour les sous-dossiers

---

## Composants — Specs Strictes

### Badge flashcards dues
```
✅ Cercle orange #F97316, diamètre 20px, chiffre uniquement, Inter 11px bold
❌ Jamais de texte "X FLASHCARDS DUES" dans un pill
```

### Progress bars
- Height : 4px
- Border-radius : rounded-full
- Couleur : `#6366F1` toujours
- Background track : `#1E2235`

### Cards (dossiers, thèmes)
- Background : `#141624`
- Border : `1px solid #1E2235`
- Border-radius : `rounded-xl` (12px)
- Hover : `translateY(-2px)` + `shadow-lg`, transition 200ms
- Padding : 20px

### Tag pills
- Border-radius : `rounded-full`
- Padding : `2px 8px`
- Background : couleur à 15% d'opacité
- Texte : couleur à 100% d'opacité
- Font-size : `11px Inter medium`

### Boutons primaires
- Background : `#6366F1`
- Hover : `#4F46E5`
- Border-radius : `rounded-lg`
- Padding : `10px 20px`
- Font : `Inter 14px medium`

### Boutons secondaires (outlined)
- Background : transparent
- Border : `1px solid #6366F1`
- Texte : `#6366F1`
- Hover : background `#6366F115`

### Boutons de difficulté (flashcards)
| Label | Couleur border/texte | Background hover |
|-------|---------------------|------------------|
| À revoir | `#EF4444` | `#EF444415` |
| Difficile | `#F59E0B` | `#F59E0B15` |
| Bien | `#22C55E` filled | — |
| Facile | `#14B8A6` | `#14B8A615` |

---

## Markdown Highlights (Highlightr Obsidian)

Mapper exactement ces couleurs — pas d'approximation :

```css
.highlight-red    { background: rgba(255, 85, 130, 0.3); border-radius: 2px; padding: 0 2px; }
.highlight-blue   { background: rgba(173, 204, 255, 0.3); border-radius: 2px; padding: 0 2px; }
.highlight-green  { background: rgba(187, 250, 187, 0.3); border-radius: 2px; padding: 0 2px; }
.highlight-yellow { background: rgba(255, 243, 163, 0.3); border-radius: 2px; padding: 0 2px; }
```

Mapping dans MarkdownRenderer.tsx :
```ts
// <mark style="background: #FF5582A6"> → <span class="highlight-red">
// <mark style="background: #ADCCFFA6"> → <span class="highlight-blue">
// <mark style="background: #BBFABBA6"> → <span class="highlight-green">
// <mark style="background: #FFF3A3A6"> → <span class="highlight-yellow">
```

---

## Callouts (Obsidian Style)

```tsx
// >[!info]    → border-left: 4px solid #6366F1,  bg: #6366F115
// >[!danger]  → border-left: 4px solid #EF4444,  bg: #EF444415
// >[!warning] → border-left: 4px solid #F59E0B,  bg: #F59E0B15

// Structure HTML rendue :
<div className="callout callout-{type}">
  <div className="callout-header">
    <Icon size={16} />
    <span className="callout-title">{title}</span>
  </div>
  <div className="callout-body">{content}</div>
</div>
```

```css
.callout { border-radius: 6px; padding: 12px 16px; margin: 16px 0; }
.callout-header { display: flex; align-items: center; gap: 8px; font-weight: 600; margin-bottom: 6px; }
.callout-body { font-size: 14px; color: #94A3B8; line-height: 1.6; }
```

---

## Empty States — Obligatoires Sur Toutes les Listes

```tsx
// Pattern standard :
<div className="flex flex-col items-center justify-center py-16 gap-4">
  <Icon className="w-12 h-12 text-muted opacity-40" />
  <p className="text-muted text-sm text-center">{message}</p>
  <Button variant="primary">{cta}</Button>
</div>
```

| Contexte | Message | CTA |
|----------|---------|-----|
| /themes vide | "Aucun thème créé" | "Créer votre premier thème" |
| Dossier vide | "Ce dossier est vide" | "Ajouter une fiche" |
| Flashcards dues = 0 | "Aucune carte à réviser aujourd'hui" | "Voir les thèmes" |
| Quiz = 0 questions | "Aucun quiz disponible" | "Générer des questions" |
| Recherche = 0 résultats | "Aucun résultat pour « {query} »" | — |
| /practice vide | "Vous êtes à jour !" | "Voir les thèmes" |

---

## États Interactifs — Règles Globales

- Tous les éléments cliquables : `cursor-pointer`
- Focus visible : `ring-2 ring-accent ring-offset-2` (accessibilité)
- Disabled : `opacity-40 cursor-not-allowed pointer-events-none`
- Loading skeleton : `bg-surface animate-pulse rounded` sur les zones de données async
- Transitions hover : `150ms ease`
- Transitions apparitions : `200ms ease`

---

## Incohérences des Maquettes Stitch à Ignorer

Les maquettes sont des références visuelles, pas des specs pixel-perfect.
Corriger systématiquement :

| Incohérence dans les maquettes | Règle à appliquer |
|-------------------------------|-------------------|
| Texte en anglais (Overview, Settings, Search...) | Traduire en français |
| Sidebar avec items non définis | Utiliser uniquement la structure définie ci-dessus |
| Séparateur entre Search et Settings | Supprimer |
| Badge "X FLASHCARDS DUES" en pill texte | Remplacer par cercle chiffre uniquement |
| Sidebar "KNOWLEDGE BASE", "Documentation" | Ne pas reproduire |
| Bouton "+ New Note" dans sidebar | Ne pas reproduire |
| version "v2.4.8" dans le logo | Ne pas reproduire |

---

## Référence des Maquettes

| Fichier | Écran de référence |
|---------|-------------------|
| 01-dashboard.png | Dashboard principal |
| 02-tous-les-themes.png | Grille tous les thèmes |
| 03-page-dossier.png | Page thème / sous-thème |
| 04-page-fiche.png | Lecture fiche + onglets |
| 05-flashcards.png | Session flashcards |
| 06-quiz-question.png | Quiz — question en cours |
| 07-quiz-resultats.png | Quiz — résultats |
| 08-command-palette.png | Recherche globale ⌘K |
