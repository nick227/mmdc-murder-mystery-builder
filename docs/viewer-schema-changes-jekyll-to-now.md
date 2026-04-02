## Viewer schema notes: Jekyll run → current output

This document summarizes the *practical viewer-facing schema changes* between older runs like **“Secrets of Jekyll Island”** and the current generator output.

### Executive summary (what to key on)

- **Player key (now)**: use **`linked_character`** (string name) to group *player-owned* cards.
- **Older runs (Jekyll era)**: many player-owned groupings were **implicit by order** (no linking fields on some card types).

### Game cards (`card_type: "game_card"`)

#### Jekyll-era behavior
- No explicit owner fields on `game_card`.
- Viewer likely grouped game cards implicitly (ex: chunk by 5, by order).

#### Current behavior
- Every `game_card` includes:
  - **`linked_character`**: the owning character name (string)
  - **`game_card_type`** and **`act`** are present as before
- Owner fields are **not produced by the model**; they are attached **programmatically** in the agent.

**Viewer guidance:** group game cards by `linked_character`.

### Items (`card_type: "item"`)

#### Jekyll-era behavior
- Items were *table props* only: no owner linkage.

#### Current behavior
- Items are generated in a per-character loop and each item includes:
  - **`linked_character`**: the owning character name (string)
- Items also carry `location_ref` where applicable (or `null`), and `act`.

**Viewer guidance:** show items under player inventory using `linked_character`.

### Secrets (`card_type: "secret"`)

#### Jekyll-era behavior
- Secrets were linked by character **ID**:
  - `linked_character_id` → matches a `character.card_id`

#### Current behavior
- Secrets are standardized to match game cards/items:
  - **`linked_character`**: owning character name (string)
- No viewer logic should depend on `linked_character_id` for secrets.

**Viewer guidance:** group secrets by `linked_character`.

### Clues (`card_type: "clue"`)

- Clues are not “owned” by a player.
- Clues are associated to suspects via:
  - **`suspect_name`** (string)
- Many clue flows treat clues as shared evidence (table-visible), with suspect association used for filtering/UX.

**Viewer guidance:** treat clues as shared evidence; optionally group/filter by `suspect_name`.

### Notes on drift prevention

- **Programmatic linking**: owner fields for `game_card`, `item`, and `secret` are set in code after generation, not by the model.
- **Deterministic gates**:
  - game cards: enforce exactly 5 per `linked_character`
  - items: enforce exactly 3 per `linked_character` and de-dupe titles
  - secrets: per-character generation already loops characters; viewer should rely on `linked_character`

