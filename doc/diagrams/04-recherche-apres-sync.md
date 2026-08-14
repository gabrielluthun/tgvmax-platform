# Recherche après sync (warm terminé)

Cas normal entre deux syncs.

L1 (mémoire, 5 min) → sinon L2 gzip → sinon calcul depuis `trips`. On ajoute labels et URLs SNCF à la lecture. Le rate limit (10/min/IP) ne s’applique qu’au calcul à froid.

```mermaid
flowchart TD
  Q[GET /search?origin=...] --> K[clé metro: ou norm:]
  K --> L1{L1 mémoire<br/>TTL 5 min, 200 entrées}
  L1 -->|hit et sync_at = last_sync_at| E[enrichit labels + URLs SNCF]
  L1 -->|miss| L2[L2 Mongo : décompresse payload_gz]
  L2 -->|hit| M[copie en L1 puis enrichit]
  L2 -->|miss| RL{rate limit IP}
  RL -->|ok| C[compute trips + 1 correspondance]
  C --> S[stocke L1 + L2 gzip]
  E --> R[200 SearchResponse]
  M --> R
  S --> R
```
