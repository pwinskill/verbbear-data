# verbbear-data

French content for [VerbBear](https://github.com/pwinskill/verbbear) — fetched live by every installed copy of the app at launch.

This repo intentionally contains no app code. Just two JSON files and a validator.

## Files

- **`verbs.json`** — 100 verb entries. Regulars declare a pattern (`regular_er` / `regular_ir` / `regular_re`) and the app expands them at load. Irregulars carry their full conjugation tables explicitly.
- **`sentences.json`** — 720 sentence entries: `{ id, verb, tense, person, fr, en, answer }`. Sentence IDs must remain stable across edits — they are the lookup key for per-card user progress in the app.
- **`validate.js`** — pure-Node, zero-dep schema validator. Run by CI on every push and PR. Branch protection on `main` requires it to pass.

## How edits reach users

1. Open a PR with the JSON change.
2. CI (`.github/workflows/validate.yml`) runs `validate.js`. Must be green.
3. Merge to `main`.
4. Every running copy of the app refetches on next launch. GitHub's CDN takes ~5 minutes to propagate the new content.

The app validates the JSON shape again at runtime and falls back to its bundled snapshot if anything looks wrong — so even a malformed merge to `main` won't brick users.

## Editing

Sentence:
```json
{ "id": 123, "verb": "parler", "tense": "present", "person": "je", "fr": "Je ___ français.", "en": "I speak French.", "answer": "parle" }
```

Regular verb:
```json
{ "inf": "parler", "en": "to speak", "aux": "avoir", "pattern": "regular_er", "rank": 15 }
```

Irregular verb:
```json
{
  "inf": "être", "en": "to be", "aux": "avoir", "pattern": "irregular", "rank": 1,
  "tenses": {
    "present":       ["suis", "es", "est", "sommes", "êtes", "sont"],
    "passe_compose": ["ai été", "as été", "a été", "avons été", "avez été", "ont été"],
    "imparfait":     ["étais", "étais", "était", "étions", "étiez", "étaient"],
    "futur":         ["serai", "seras", "sera", "serons", "serez", "seront"]
  }
}
```

`futur_proche` (aller-present + infinitive) and `conditionnel` (futur stem + imparfait endings) are derived programmatically by the app — never enter them here.

## Running the validator locally

```sh
node validate.js
```

Exits 0 on success, 1 with a list of errors on failure. Works on Windows/macOS/Linux with any Node 18+.
