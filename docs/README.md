# docs Directory Guide

`docs/` contains a set of documents for maintaining and extending the current implementation. It separates unresolved TODOs from adopted design decisions, organized in a way that is easy to reference daily.

## Subdirectory Roles

- `architecture/`: App structure, SCAD / export contracts, implementation assumptions
- `guide/`: Local development procedures, manual verification procedures, update operations
- `decisions/`: Chronological records of adopted decisions
- `reference/`: Terminology and short reference materials
- `backlog/`: Unstarted or continuously considered extension TODOs
- `design/`: Source of truth for screen design, including Pencil `.pen` files

## Recommended Reading Order

1. [architecture/overview.md](architecture/overview.md)
2. [architecture/scad-and-export.md](architecture/scad-and-export.md)
3. [architecture/project-data.md](architecture/project-data.md)
4. [guide/development.md](guide/development.md)
5. [guide/manual-verification.md](guide/manual-verification.md)
6. [decisions/decision-log.md](decisions/decision-log.md)
7. `backlog/` and `design/` as necessary

## Operation Rules

- Update `architecture/` when structure or responsibilities change
- Update `guide/` when daily operations or verification procedures change
- Record adopted decisions in [decisions/decision-log.md](decisions/decision-log.md)
- Consolidate future extension ideas and unresolved matters in `backlog/`
- Treat `design/` as the source of truth for screen design changes

## Reference Materials

- [reference/j-stem-lp01-dimensions.md](reference/j-stem-lp01-dimensions.md): Correspondence table between J-STEM-LP01 drawing dimensions and SCAD parameters
