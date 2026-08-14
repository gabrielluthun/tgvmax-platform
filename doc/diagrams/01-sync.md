# Sync SNCF → Mongo → warm cache

Toutes les 15 min, on lit d’abord `sncf_data_updated_at`. Si inchangé : **rien** (pas d’export, pas de warm). `POST /api/sync/trigger` force toujours un rebuild.

Rebuild : export SNCF → filtre J à J+30 → `replace_all` → `last_sync_at` → warm en fond (L1 vidé, L2 gzip).

Les départs déjà passés sont retirés **à la lecture** du cache, même sans warm.

Si l’API SNCF est down : erreur enregistrée, trips inchangés. Si le metadata est illisible : on fait l’export (pas de skip à l’aveugle).

```mermaid
flowchart TD
  A[metadata SNCF] --> S{timestamp inchangé<br/>et pas force ?}
  S -->|oui| SK[skip — trips et cache inchangés]
  S -->|non| B[fetch export SNCF]
  B --> C{données OK ?}
  C -->|non| E[sync_state = error<br/>trips inchangés]
  C -->|oui| D[filtre TGVMax J à J+30]
  D --> R["replace_all : DELETE trips<br/>puis INSERT par lots de 5000"]
  R --> F[nettoie les départs déjà passés aujourd'hui]
  F --> G[écrit last_sync_at = maintenant]
  G --> H[lance warm_cache en arrière-plan]
  H --> I[clear L1 mémoire]
  I --> J[recalcule chaque origine]
  J --> K[écrit L1 + L2 gzip]
  K --> L[prune L2 dont sync_at ≠ last_sync_at]
```
