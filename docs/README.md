# docs Directory Guide

`docs/` is the set of documents for maintaining and extending the current implementation. It separates unresolved TODOs from adopted design decisions, organized for easy day-to-day reference.

## Role of Each Subdirectory

- `architecture/`: app structure, SCAD / export contracts, implementation assumptions
- `guide/`: local development steps, manual verification steps, operational procedures for updates
- `decisions/`: a chronological record of adopted decisions
- `reference/`: terminology and short reference material
- `backlog/`: unstarted or ongoing extension TODOs
- `design/`: the source-of-truth screen designs, including Pencil `.pen` files

## Recommended Reading Order

1. [architecture/overview.md](architecture/overview.md)
2. [architecture/scad-and-export.md](architecture/scad-and-export.md)
3. [architecture/project-data.md](architecture/project-data.md)
4. [guide/development.md](guide/development.md)
5. [guide/manual-verification.md](guide/manual-verification.md)
6. [decisions/decision-log.md](decisions/decision-log.md)
6. `backlog/` and `design/` as needed

## Operating Rules

- Update `architecture/` when structure or responsibilities change
- Update `guide/` when day-to-day operations or verification steps change
- Record adopted decisions in [decisions/decision-log.md](decisions/decision-log.md)
- Move future extension ideas or unresolved matters to `backlog/`
- Treat `design/` as the source of truth for screen design changes

## Reference Material

- [reference/j-stem-lp01-dimensions.md](reference/j-stem-lp01-dimensions.md): mapping between the J-STEM-LP01 drawing dimensions and the SCAD parameters
