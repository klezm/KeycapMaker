# Glossary

## body

The main volume of the keycap body.

## body_core

The base volume with the homing bar removed from the body. Used for part separation in preview / export.

## rim / key rim

A separate-volume part covering the outer edge of the keytop in the typewriter shape. Can be handled in a different color from the body.

## legend

The shape representing the printed text or symbol on the keycap.

## homing bar

A tactile marker like the one found on the F / J keys. Handled as a separate responsibility from legend, as an optional feature on the body side.

## separate volume / separate-volume approach

A design approach where body / rim / legend are each kept as separate bodies, so they can be handled independently in the output format and by the slicer.

## preview

The display pathway for immediately checking edit results in the browser. Prioritizes responsiveness.

## export

The pathway that generates 3MF or editor data JSON. Prioritizes part structure and the save contract.

## profile

The overall family of shape settings, such as the keycap's height, tilt, and top-surface form.

## preset

A definition that bundles a combination of parameters, such as shape JSON or a sample fixture. The current editor's initial values live in `src/data/keycap-shapes/*.json`.

## stem

The mounting shape on the underside of the keycap.
</content>
</invoke>
