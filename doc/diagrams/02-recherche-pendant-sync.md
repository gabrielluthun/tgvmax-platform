# Recherche pendant le fetch / `replace_all`

`last_sync_at` n’a pas encore changé. Le cache est donc encore considéré à jour : on sert l’**ancienne** réponse, sans refresh.

Le trou : une origine **sans cache** lit `trips` pendant le `DELETE` + `INSERT`. La collection peut être vide ou incomplète, et ce mauvais résultat peut être écrit en cache.

```mermaid
flowchart TD
  Q[GET /search?origin=...] --> L1{L1 mémoire ?}
  L1 -->|hit| R[renvoie l'ancien résultat<br/>pas de refresh]
  L1 -->|miss| L2{L2 Mongo gzip ?}
  L2 -->|hit| R
  L2 -->|miss| C[compute sur la collection trips]
```
