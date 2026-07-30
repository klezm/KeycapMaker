# Glossary

## body

The main volume of the keycap body.

## body_core

The base volume excluding the homing bar from the body. Used for part separation in preview / export.

## rim / key rim

A separate volume part covering the outer circumference of the keytop in the typewriter shape. Can be treated with a different color from the body.

## legend

A shape representing characters or symbols printed on the keycap.

## homing bar

A tactile marker like the F / J keys. Handled as a body-side option with a separate responsibility from the legend.

## separate volume

A design policy that retains the body / rim / legend as separate bodies so they can be handled independently in the output format and on the slicer side.

## preview

A display route for immediately checking edit results on the browser. Prioritizes response speed.

## export

A route for generating 3MF and edit data JSON. Prioritizes part structure and save contracts.

## profile

The lineage of the overall shape, such as keycap height, tilt, and top surface shape.

## preset

A definition that groups combinations of parameters, like shape JSON and sample fixtures. The current editor initial values are held in `src/data/keycap-shapes/*.json`.

## stem

The mounting shape on the back of the keycap.
