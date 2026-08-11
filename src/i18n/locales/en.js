const en = Object.freeze({
  language: {
    label: "LANGUAGE",
    ariaLabel: "Choose display language",
    listLabel: "Language options",
    options: {
    keysetLayout: {
      "iso-105": "ISO 105-key (full size)",
      "ansi-104": "ANSI 104-key (full size)",
    },
    keysetLanguage: {
      de: "German",
      us: "English (US)",
      gb: "English (UK)",
      fr: "French",
      es: "Spanish",
      it: "Italian",
      ru: "Russian",
      gr: "Greek",
      il: "Hebrew",
    },
      ja: "日本語",
      en: "English",
      zh: "中文",
      ko: "한국어",
    },
  },
  theme: {
    ariaLabel: "Choose display mode",
    options: {
      light: "Light mode",
      dark: "Dark mode",
    },
  },
  navigation: {
    label: "Workspace sections",
    project: "Project",
    design: "Design",
    export: "Export",
    keyset: "Keyset",
  },
  actions: {
    back: "Back",
    close: "Close",
    choose: "Choose",
    copy: "Copy",
    copied: "Copied",
    on: "On",
    off: "Off",
    saving: "Saving...",
  },
  dropOverlay: {
    title: "Drop a project / JSON / font",
    body: "Load a project, saved editor data, compatible JSON, or a TTF / OTF font.",
    chip: "ZIP / JSON / TTF / OTF",
  },
  importReport: {
    title: "JSON Import Report",
    unboundBody: "{count} parameters in {fileName} could not be applied to the current shape and were skipped.",
    unboundListLabel: "Skipped parameters",
    expand: "Expand JSON import report",
    collapse: "Collapse JSON import report",
    more: "{count} more",
    deleteParam: "Remove {path} from JSON",
  },
  panels: {
    project: {
      title: "Project",
      body: "Keep multiple keycaps together and switch the current edit target from the list.",
    },
    design: {
      title: "Design",
      body: "Adjust the selected keycap shape and legend while the preview updates automatically on the right.",
    },
    export: {
      title: "Export",
      body: "Save 3MF / STEP / STL print data and JSON editor data for resuming edits later.",
    },
    keyset: {
      title: "Keyset",
      body: "Render a whole keyboard's worth of keycaps at once, in one or two languages, and export the set as a single 3MF.",
    },
  },
  keyset: {
    settingsTitle: "Layout and languages",
    buildTitle: "Build",
    exportTitle: "Export",
    layout: {
      label: "Keyboard layout",
      hint: "Physical key arrangement to generate.",
    },
    primaryLanguage: {
      label: "Primary language",
      hint: "Main legend on each keycap.",
    },
    secondaryLanguage: {
      label: "Secondary language",
      hint: "Smaller legend in the lower-right corner, for a second script.",
    },
    secondaryNone: "None",
    shineThrough: {
      label: "Shine-through legends",
      hint: "Cut legends through the top so a backlight shines through. Print the inserts in a translucent material.",
    },
    build: "Build keyset",
    cancel: "Cancel",
    exportBody: "Exports the keycaps already rendered above, so there is no second wait.",
    exportBoard: "3MF (keyboard layout)",
    exportGrid: "3MF (print plate)",
    statusPreparing: "Preparing {count} keycaps...",
    statusRendering: "Rendering {done} of {total} parts...",
    statusReady: "Ready: {count} keycaps ({summary}).",
    statusCancelled: "Build cancelled.",
    statusFailed: "Build failed.",
    statusStale: "Settings changed. Build the keyset to see it.",
    statusExported: "Exported {count} keycaps.",
  },
  mobileInspector: {
    hide: "Move design card up",
    show: "Restore design card",
  },
  exportPanel: {
    jsonChip: "Editable JSON",
    jsonTitle: "Save Editor Data",
    jsonBody: "Save the shape, dimensions, colors, and legend as JSON. You can load it again later by dragging and dropping it.",
    saveJson: "Save JSON",
    threeMfChip: "Printable 3MF",
    threeMfTitle: "Save 3MF Data",
    threeMfBody: "Save print-ready 3MF data containing the body, homing mark, and legend.",
    saveThreeMf: "Save 3MF",
    stepChip: "CAD STEP",
    stepTitle: "Save STEP",
    stepBody: "Save the single shape as a STEP/AP214 faceted B-rep. Colors, legends, and part separation are not included. Use it when CAD handoff or manufacturing requirements need STEP.",
    saveStep: "Save STEP",
    optionsTitle: "Options",
    optionsBody: "3MF is recommended for normal print data. Use STEP for CAD handoff, or STL when you only need a simple mesh.",
    optionsExpand: "Expand options",
    optionsCollapse: "Collapse options",
    stlChip: "Single-color STL",
    stlTitle: "Save STL",
    stlBody: "Save a single-material, single-mesh STL. Colors and legends are ignored, and only the shape is exported. Save as 3MF when you need colors or legends.",
    saveStl: "Save STL",
  },
  project: {
    nameTitle: "Project Name",
    nameLabel: "Project Name",
    nameHint: "Used for the ZIP root directory and project manifest name",
    keycapsTitle: "Keycaps",
    keycapsCount: "{count} items",
    empty: "No keycaps yet.",
    addCurrent: "Add a Copy of the Editing Keycap",
    recapturePreview: "Recapture preview for {name}",
    previewRecaptured: "Preview recaptured",
    reorderKeycap: "Change display order for {name}",
    selectKeycap: "Edit {name}",
    activeKeycap: "Editing",
    exportAction: "Export",
    exportKeycap: "Export {name}",
    exportChip: "Keycap Export",
    exportTitle: "Export {name}",
    designAction: "Design",
    designKeycap: "Design for {name}",
    designChip: "Keycap Design",
    designTitle: "Design for {name}",
    deleteChip: "Delete",
    deleteTitle: "Delete Keycap",
    deleteBody: "Remove this keycap from the project list.",
    deleteLastBody: "This keycap cannot be deleted because a project must contain at least one keycap.",
    deleteAction: "Delete",
    save: "Save Project",
    edited: "Project is being edited",
    added: "Added {name} to the project",
    deleted: "Removed {name} from the project",
    reordered: "Changed the keycap list display order",
    loadedKeycap: "Switched to {name}",
    loaded: "Loaded project {name} ({count} items)",
    saving: "Saving project",
    saved: "Saved project",
    saveFailed: "Failed to save project: {message}",
    directoryNotWritable: "This directory is not writable.",
    previewDecodeFailed: "Could not convert the preview image for saving.",
    invalidPath: "Invalid project path: {path}",
    missingProjectFile: "Project file was not found: {path}",
  },
  nameGroup: {
    title: "Name",
    description: "This name is used for 3MF, STEP, STL, and editor-data JSON files, and it remains when the data is loaded again.",
  },
  parameterGroupCaptions: {
    name: "Export file name",
    top: "Surface and tilt",
    topHat: "Added keytop",
    legend: "Text and position",
  },
  unitBasis: {
    title: "1u Conversion",
    description: "Displaying 1u as {unitBase} mm.",
    fieldLabel: "1u Basis",
    fieldHint: "For narrow-pitch conversion. Model dimensions do not change",
    readout: "Current size: width {widthUnits}u / depth {depthUnits}u",
  },
  fieldGroup: {
    expand: "Expand {title}",
    collapse: "Collapse {title}",
  },
  legendCards: {
    center: "Center Legend",
    rightTop: "Upper Right Legend",
    rightBottom: "Lower Right Legend",
    leftTop: "Upper Left Legend",
    leftBottom: "Lower Left Legend",
    keytop: "Keytop",
    sidewall: "{side} Sidewall",
  },
  stemCards: {
    clearance: "Clearance",
  },
  shapeProfiles: {
    "custom-shell": {
      label: "Custom Shell",
      fieldGroups: {
        shape: {
          title: "Keycap Shape",
          description: "Adjust the overall keycap size, top center height, taper, top edge radius, and body shoulder radius. Width and depth are each converted using {unitBase} mm as 1u.",
        },
        top: {
          title: "Keytop",
          description: "Switch the top surface between flat, cylindrical, and spherical, and adjust front/back or left/right tilt. Edge-height input is normalized internally to pitch / roll.",
        },
        topHat: {
          title: "Top Hat",
          description: "Adjust the added keytop above the existing surface: enabled state, top / bottom dimensions, radii, height, and shoulder angle.",
        },
        legend: {
          title: "Legend",
          description: "Adjust legend text, typeface, appearance, position, and height across multiple keytop positions and sidewalls. Multi-character legends can be entered as-is.",
        },
        homing: {
          title: "Homing Mark",
          description: "Adjust a tactile bump like the one on F and J keys. It can be configured separately from the legend.",
        },
        stem: {
          title: "Mount",
        },
      },
    },
    typewriter: {
      label: "Typewriter",
      fieldGroups: {
        shape: {
          title: "Keycap Shape",
          description: "Adjust a thin typewriter-style keytop outline and thickness. Width and depth are each converted using {unitBase} mm as 1u; a larger R makes it rounder, and a smaller R makes it more square.",
        },
        top: {
          title: "Keytop",
          description: "Edit front/back and left/right tilt by angle or edge height. Edge-height input is normalized internally to pitch / roll.",
        },
        legend: {
          title: "Legend",
          description: "Adjust legend text, typeface, appearance, position, and height across multiple keytop positions and sidewalls. Multi-character legends can be entered as-is.",
        },
        homing: {
          title: "Homing Mark",
          description: "Adjust a tactile bump like the one on F and J keys. It can be configured separately from the legend.",
        },
        stem: {
          title: "Mount",
        },
      },
    },
    "jis-enter": {
      label: "JIS Enter",
      fieldGroups: {
        shape: {
          title: "Keycap Shape",
          description: "Adjust the overall size, top center height, lower-left notch, top edge radius, and body shoulder radius from a common JIS / ISO-style tall Enter footprint. Width and depth are each converted using {unitBase} mm as 1u.",
        },
        top: {
          title: "Keytop",
          description: "Like Custom Shell, this can edit the flat / cylindrical / spherical surface and front/back or left/right tilt.",
        },
        topHat: {
          title: "Top Hat",
          description: "Adjust the added surface inset from the JIS Enter keytop outline: enabled state, radii, height, and shoulder angle.",
        },
        legend: {
          title: "Legend",
          description: "Adjust legend text, typeface, appearance, position, and height across multiple keytop positions and sidewalls. Multi-character legends can be entered as-is.",
        },
        homing: {
          title: "Homing Mark",
          description: "Adjust a tactile bump like the one on F and J keys. It can be configured separately from the legend.",
        },
        stem: {
          title: "Mount",
        },
      },
    },
    "typewriter-jis-enter": {
      label: "Typewriter JIS Enter",
      fieldGroups: {
        shape: {
          title: "Keycap Shape",
          description: "Adjust a thin typewriter-style JIS Enter footprint, including overall size, keytop thickness, lower-left notch, and R. Width and depth are each converted using {unitBase} mm as 1u.",
        },
        top: {
          title: "Keytop",
          description: "Like Typewriter, this can edit the rim, front/back or left/right tilt, and mount reference height.",
        },
        legend: {
          title: "Legend",
          description: "Adjust legend text, typeface, appearance, position, and height across multiple keytop positions and sidewalls. Multi-character legends can be entered as-is.",
        },
        homing: {
          title: "Homing Mark",
          description: "Adjust a tactile bump like the one on F and J keys. It can be configured separately from the legend.",
        },
        stem: {
          title: "Mount",
        },
      },
    },
  },
  fieldGroups: {
    shapeDescriptionShell: "Adjust the overall keycap size, top center height, taper, top edge radius, and body shoulder radius. Width and depth are each converted using {unitBase} mm as 1u.",
    shapeDescriptionTypewriter: "Adjust a thin typewriter-style keytop outline and thickness. Width and depth are each converted using {unitBase} mm as 1u; a larger R makes it rounder, and a smaller R makes it more square.",
    topDescription: "Edit front/back and left/right tilt by angle or edge height. Edge-height input is normalized internally to pitch / roll.",
  },
  fields: {
    name: {
      label: "Name",
      hint: "Used as the file name for 3MF, STEP, STL, and editor-data JSON exports",
    },
    shapeProfile: {
      label: "Base Shape",
      hint: "Choose the base shape to use",
    },
    keyWidth: {
      label: "Width",
      hint: "Width and key size are linked. {unitBase} mm = 1u.",
      secondaryLabel: "Key Size",
      miniLabel: "Width",
    },
    keyDepth: {
      label: "Depth",
      hint: "Depth and depth size are linked. {unitBase} mm = 1u.",
      secondaryLabel: "Depth Size",
      miniLabel: "Depth",
    },
    wallThickness: {
      label: "Thickness",
      hint: "Set sidewall and keytop material thickness separately",
      primaryMiniLabel: "Sidewall",
      secondaryLabel: "Keytop",
    },
    topThickness: {
      label: "Keytop Thickness",
      hint: "The material thickness left under the keytop surface",
    },
    typewriterCornerRadius: {
      label: "R",
      hint: "{maxRadius} is fully round; values near 0 mm make the corners sharper.",
    },
    topCornerRadius: {
      label: "Top Radius",
      hint: "Rounds all four corners of the keytop surface together. Current maximum: {maxRadius}.",
    },
    topCornerRadiusIndividualEnabled: {
      label: "Individual",
      hint: "Turn on to adjust each corner radius separately.",
    },
    topCornerRadiusLeftTop: {
      label: "Top-Left Radius",
    },
    topCornerRadiusRightTop: {
      label: "Top-Right Radius",
    },
    topCornerRadiusRightBottom: {
      label: "Bottom-Right Radius",
    },
    topCornerRadiusLeftBottom: {
      label: "Bottom-Left Radius",
    },
    jisEnterNotchWidth: {
      label: "Notch Width",
      hint: "Horizontal width of the lower-left notch. Maximum: {maxWidth}.",
    },
    jisEnterNotchDepth: {
      label: "Notch Depth",
      hint: "Front-to-back depth of the lower-left notch. Maximum: {maxDepth}.",
    },
    topScale: {
      label: "Top Taper",
      hint: "Lower numbers narrow the top face while keeping width and depth at the same ratio",
    },
    keycapEdgeRadius: {
      label: "Top Edge Radius",
      hint: "Rounds the transition between the keytop and sidewall. 0 mm keeps the current faceted edge. Current maximum: {maxRadius}.",
    },
    keycapShoulderRadius: {
      label: "Shoulder Radius",
      hint: "Rounds the keycap body's shoulder: 0 keeps a faceted shoulder, positive values bulge it outward, and negative values recess it. Current range: {minRadius} to {maxRadius}.",
    },
    bodyColor: {
      label: "Body Color",
      hint: "Enter a color code directly or use the color picker",
    },
    topCenterHeight: {
      label: "Top Center Height",
      typewriterLabel: "Keytop Thickness",
      hint: "The keytop center before adding the dish. Current center surface: {height}.",
      typewriterHint: "The thickness from the bottom of the thin keytop to the top surface",
    },
    topOffset: {
      label: "Keytop Center Offset",
      hint: "Move only the keytop center left/right or front/back without moving the mount",
    },
    topOffsetX: {
      label: "Left-Right Offset",
      hint: "Move the keytop center left or right without moving the mount",
    },
    topOffsetY: {
      label: "Front-Back Offset",
      hint: "Move the keytop center forward or backward without moving the mount",
    },
    typewriterMountHeight: {
      label: "Top-Referenced Height",
      hint: "Distance from the keytop body top center to the lower end of the mount. Current minimum: {minHeight}.",
    },
    topSurfaceShape: {
      label: "Keytop Surface",
      hint: "Flat is planar, cylindrical curves in one direction, and spherical curves in all directions",
    },
    dishDepth: {
      label: "Depth",
      cylindricalHint: "Current range: {minDepth} to {maxDepth}. Positive values recess in one direction; negative values raise the surface.",
      sphericalHint: "Current range: {minDepth} to {maxDepth}. Positive values form a bowl-shaped recess; negative values form a spherical crown.",
      flatHint: "This has no effect when flat is selected.",
    },
    topHatEnabled: {
      label: "Add Top Hat",
      hint: "Add a smaller independently shaped keytop above the existing keytop.",
    },
    topHatSeparateColorEnabled: {
      label: "Separate From Body",
      hint: "Export the top hat as a separate part and give it its own color.",
    },
    topHatColor: {
      label: "Top Hat Color",
      hint: "Enter a color code directly or use the color picker",
    },
    topHatSurfaceShape: {
      label: "Top Hat Surface",
      hint: "Shape only for the top-hat surface, independent from the main keytop surface.",
    },
    topHatDishDepth: {
      label: "Top Hat Depth",
      cylindricalHint: "Current range: {minDepth} to {maxDepth}. Positive values recess the top hat in one direction; negative values raise it.",
      sphericalHint: "Current range: {minDepth} to {maxDepth}. Positive values form a bowl-shaped recess; negative values form a spherical crown.",
      flatHint: "This has no effect when flat is selected.",
    },
    topHatTopWidth: {
      label: "Top Width",
      hint: "Width of the added keytop's top surface. Current maximum: {maxWidth}.",
      secondaryLabel: "Top Size",
      miniLabel: "Width",
    },
    topHatTopDepth: {
      label: "Top Depth",
      hint: "Front-to-back size of the added keytop's top surface. Current maximum: {maxDepth}.",
      secondaryLabel: "Top Depth Size",
      miniLabel: "Depth",
    },
    topHatBottomWidth: {
      label: "Bottom Width",
      hint: "Width of the added keytop's bottom surface. Current maximum: {maxWidth}.",
      secondaryLabel: "Bottom Size",
      miniLabel: "Width",
    },
    topHatBottomDepth: {
      label: "Bottom Depth",
      hint: "Front-to-back size of the added keytop's bottom surface. Current maximum: {maxDepth}.",
      secondaryLabel: "Bottom Depth Size",
      miniLabel: "Depth",
    },
    topHatInset: {
      label: "Top Inset",
      hint: "Inset from the Enter keytop outline to the added top surface. Current maximum: {maxInset}.",
    },
    topHatTopRadius: {
      label: "Top Radius",
      hint: "Corner radius of the added keytop's top surface. Current maximum: {maxRadius}.",
    },
    topHatBottomRadius: {
      label: "Bottom Radius",
      hint: "Corner radius of the added keytop's bottom surface. Current maximum: {maxRadius}.",
    },
    topHatBottomRadiusIndividualEnabled: {
      label: "Individual",
      hint: "Turn on to adjust each corner radius of the added keytop bottom separately.",
    },
    topHatBottomRadiusLeftTop: {
      label: "Bottom Surface Top-Left Radius",
    },
    topHatBottomRadiusRightTop: {
      label: "Bottom Surface Top-Right Radius",
    },
    topHatBottomRadiusRightBottom: {
      label: "Bottom Surface Bottom-Right Radius",
    },
    topHatBottomRadiusLeftBottom: {
      label: "Bottom Surface Bottom-Left Radius",
    },
    topHatTopRadiusIndividualEnabled: {
      label: "Individual",
      hint: "Turn on to adjust each corner radius of the added keytop separately.",
    },
    topHatTopRadiusLeftTop: {
      label: "Top-Left Radius",
    },
    topHatTopRadiusRightTop: {
      label: "Top-Right Radius",
    },
    topHatTopRadiusRightBottom: {
      label: "Bottom-Right Radius",
    },
    topHatTopRadiusLeftBottom: {
      label: "Bottom-Left Radius",
    },
    topHatHeight: {
      label: "Height",
      hint: "Height from the existing keytop surface to the added top surface. Negative values recess it. Current range: {minHeight} to {maxHeight}.",
    },
    topHatShoulderAngle: {
      label: "Shoulder Angle",
      hint: "Angle of the shoulder falling away from the added top. Higher values make it steeper.",
    },
    topHatShoulderRadius: {
      label: "Shoulder Radius",
      hint: "0 keeps a faceted shoulder; positive values bulge into a round shoulder, negative values recess it. Current range: {minRadius} to {maxRadius}.",
    },
    rimEnabled: {
      label: "Add Key Rim",
      hint: "Cover the keytop perimeter as a separate part",
    },
    rimWidth: {
      label: "Key Rim Width",
      hint: "The band width when viewing the keytop from the front. {maxWidth} expands it to the full surface.",
    },
    rimHeightUp: {
      label: "Upward Height",
      hint: "0 is flush with the top surface. Positive values extend upward.",
    },
    rimHeightDown: {
      label: "Downward Height",
      hint: "0 is flush with the bottom surface. Positive values extend downward.",
    },
    rimColor: {
      label: "Key Rim Color",
      hint: "Enter a color code directly or use the color picker",
    },
    topSlopeInputMode: {
      label: "Tilt Input Method",
      hint: "Choose whether to enter tilt by angle or by edge height",
    },
    topPitchDeg: {
      label: "Front-to-Back Tilt",
      hint: "Positive values raise the back. Current: front {front} / back {back}.",
    },
    topRollDeg: {
      label: "Left-to-Right Tilt",
      hint: "Positive values raise the right side. Current: left {left} / right {right}.",
    },
    topFrontHeight: {
      label: "Front Height",
      hint: "Front height of the top reference plane. Center height is fixed; current pitch is {pitch}.",
    },
    topBackHeight: {
      label: "Back Height",
      hint: "Back height of the top reference plane. Center height is fixed; current pitch is {pitch}.",
    },
    topLeftHeight: {
      label: "Left Height",
      hint: "Left height of the top reference plane. Center height is fixed; current roll is {roll}.",
    },
    topRightHeight: {
      label: "Right Height",
      hint: "Right height of the top reference plane. Center height is fixed; current roll is {roll}.",
    },
    legendEnabled: {
      label: "Add Keytop Legend",
      hint: "Turn this off to omit text geometry",
    },
    legendPrintNotice: "Depending on printer and slicer accuracy, you may need to adjust text size or weight.",
    legendText: {
      label: "Legend Text",
      hint: "Multiple characters can be entered as-is",
      placeholder: "A / Shift / あ",
    },
    legendContentType: {
      label: "Legend Content",
      hint: "Choose whether this legend uses text or an icon.",
    },
    legendIconSet: {
      label: "Icon Set",
      hint: "Choose the icon set used for the legend.",
    },
    legendIconName: {
      label: "Icon",
      hint: "Search {count} {set} icons.",
    },
    legendIconFill: {
      label: "Fill Icon",
      hint: "Switch between outlined and filled variants when the selected icon supports it.",
    },
    legendFontKey: {
      label: "Typeface",
      staticHint: "Search with the magnifying glass",
      variableHint: "Search with the magnifying glass. Choose the supported style on the right.",
      userHint: "Uses a My Font added in this browser",
      missingHint: "Add the referenced My Font again",
    },
    legendFontStyleKey: {
      label: "Font Style",
      selectableHint: "Use a built-in style",
      defaultHint: "Use the font's default style",
    },
    legendUnderlineEnabled: {
      label: "Add Underline",
      hint: "Underline position and thickness come from the font file. They are not replaced with an arbitrary look.",
    },
    legendSize: {
      label: "Legend Size",
      hint: "Change the size of the legend text or icon.",
    },
    legendOutlineDelta: {
      label: "Weight Adjustment",
      hint: "0 keeps the original outline. Positive values thicken it; negative values thin it.",
    },
    legendHeight: {
      label: "Text Height",
      hint: "0 is flush. Positive values raise the text; negative values recess it below the surface.",
    },
    legendEmbed: {
      label: "Inward Embed",
      hint: "How far the base of raised text enters the keytop. When height is 0, it automatically embeds through most of the top shell.",
    },
    legendColor: {
      label: "Legend Color",
      hint: "Enter a color code directly or use the color picker",
    },
    legendOffsetX: {
      label: "Horizontal Position",
      hint: "Move the text left or right",
    },
    legendOffsetY: {
      label: "Front-to-Back Position",
      hint: "Move the text forward or backward",
    },
    sideLegend: {
      enabled: {
        label: "Add {side} Sidewall Legend",
        hint: "Turn this off to omit text geometry on the {side} side",
      },
      color: {
        label: "{side} Legend Color",
        hint: "Enter a color code directly or use the color picker",
      },
      text: {
        label: "{side} Legend Text",
        hint: "Multiple characters can be entered as-is",
      },
      contentType: {
        label: "{side} Legend Content",
        hint: "Choose whether this side legend uses text or an icon.",
      },
      iconSet: {
        label: "{side} Icon Set",
        hint: "Choose the icon set used for the legend.",
      },
      iconName: {
        label: "{side} Icon",
      },
      iconFill: {
        label: "Fill {side} Icon",
        hint: "Switch between outlined and filled variants when the selected icon supports it.",
      },
      fontKey: {
        label: "{side} Typeface",
      },
      fontStyleKey: {
        label: "{side} Font Style",
      },
      underlineEnabled: {
        label: "Add {side} Underline",
        hint: "Underline position and thickness come from the font file. They are not replaced with an arbitrary look.",
      },
      size: {
        label: "{side} Legend Size",
        hint: "Change the size of sidewall legend text or icon.",
      },
      outlineDelta: {
        label: "{side} Weight Adjustment",
      },
      height: {
        label: "{side} Text Height",
        hint: "0 is flush with the sidewall. Positive values raise it outward; negative values recess it inward.",
      },
      offsetX: {
        label: "{side} Horizontal Position",
        hint: "Move the text left or right on the sidewall",
      },
      offsetY: {
        label: "{side} Vertical Position",
        hint: "Move the text up or down on the sidewall",
      },
    },
    homingBarEnabled: {
      label: "Add Homing Mark",
      hint: "Makes the key easier to locate by touch",
    },
    homingBarLength: {
      label: "Homing Mark Length",
      hint: "How far it extends left and right",
    },
    homingBarWidth: {
      label: "Homing Mark Width",
      hint: "The visible thickness of the homing mark",
    },
    homingBarHeight: {
      label: "Homing Mark Height",
      hint: "How far it protrudes from the surface",
    },
    homingBarChamfer: {
      label: "Homing Mark Chamfer",
      hint: "Small values lightly round the top edge; larger values approach a half-round ridge.",
    },
    homingBarOffsetY: {
      label: "Homing Mark Y Position",
      hint: "Move the homing mark forward or backward",
    },
    homingBarColor: {
      label: "Homing Mark Color",
      hint: "Enter a color code directly or use the color picker",
    },
    stemType: {
      label: "Mount Type",
      hint: "Choose the switch type this keycap should fit",
    },
    jStemLp01PreviewColor: {
      label: "Preview Color",
      hint: "Choose the display color for the J-STEM-LP01 reference part",
    },
    stemOuterDelta: {
      label: "Outer Adjustment",
      hint: "0 is standard. Positive values thicken the outer circle; negative values thin it.",
    },
    stemCrossMargin: {
      label: "Fit Clearance",
      mxHint: "0 is standard. Positive values widen the cross hole; negative values tighten it.",
      chocV1Hint: "0 is standard. Positive values make the two prongs thinner and looser; negative values make them thicker and tighter.",
      alpsHint: "0 is standard. Positive values make the insert thinner and looser; negative values make it thicker and tighter.",
      jStemLp01Hint: "The initial value is 0.1 mm. If the real part is too tight, increase it; if it is loose, decrease it in 0.02 mm steps.",
      disabledHint: "Unused when no mount is generated",
    },
    stemCrossChamfer: {
      label: "Entry Chamfer",
      hint: "0 is standard. Increase the value to widen only the cross-hole entry.",
      disabledHint: "Unused for non-cross mounts",
    },
    stemInsetDelta: {
      label: "Mount Start Offset",
      hint: "0 is standard. Positive values raise the start position from the bottom; negative values extend it downward.",
      jStemLp01Hint: "0 is standard. Increase the value to deepen the LP01 receiver recess.",
      disabledHint: "Unused when no mount is generated",
    },
  },
  options: {
    stemType: {
      none: "None",
      mx: "MX Compatible",
      choc_v1: "Choc v1",
      choc_v2: "Choc v2",
      alps: "Alps / Matias",
      j_stem_lp01: "J-STEM-LP01 (Experimental)",
    },
    jStemLp01PreviewColor: {
      clear: "Clear",
      white: "White",
      orange: "Orange",
    },
    topSurfaceShape: {
      flat: "Flat",
      cylindrical: "Cylindrical",
      spherical: "Spherical",
    },
    topSlopeInputMode: {
      angle: "Adjust by Angle",
      "edge-height": "Adjust by Edge Height",
    },
    legendContentType: {
      text: "Text",
      icon: "Icon",
    },
    legendIconSet: {
      lucide: "Lucide",
      "material-symbols": "Material Symbols",
      "font-awesome": "Font Awesome Free Solid",
      "remix-icon": "Remix Icon",
    },
  },
  stemDescriptions: {
    none: "No mount is generated. Use this when you only want to inspect the outer shape or legend.",
    mx: "A Cherry MX-compatible cross shape. Fits common mechanical keyboard switches such as Cherry, Gateron, and Kailh BOX.",
    choc_v1: "A two-prong mount for Kailh Choc v1. Fits low-profile keyboards using Choc v1 switches.",
    alps: "An insert shape for Alps / Matias switches. Fits compatible Alps-family switches.",
    choc_v2: "A cross shape for Kailh Choc v2. Generates a mount that fits Choc v2 switches.",
    j_stem_lp01: "Cuts an LP01 top-face receiver into the underside stem mounting area so the keycap can be used with J-STEM-LP01. This setting is experimental.",
  },
  sideLabels: {
    front: "Front",
    back: "Back",
    left: "Left",
    right: "Right",
  },
  font: {
    defaultStyleLabel: "Use Font Default",
    searchAriaLabel: "Search fonts",
    searchDialogLabel: "Font Search",
    searchPlaceholder: "Search by font name",
    segmentControlLabel: "Font source",
    builtinFontsSegment: "Built-in Fonts",
    myFontsSegment: "My Fonts",
    noResults: "No matching fonts",
    variableMeta: "Variable / named style",
    staticMeta: "Static face",
    userMeta: "My Font",
    remoteMeta: "CDN Font",
    missingMeta: "My Font not loaded",
    addLocalFont: "Add Local Font",
    addLocalFontHint: "Choose TTF / OTF",
    addCdnFont: "Add from CDN / embed",
    addCdnFontHint: "Google Fonts, CSS, or TTF / OTF URL",
    cdnFontUrlLabel: "Add from CDN / embed",
    sourceModeLabel: "Input type",
    sourceModes: {
      googleFonts: "Google Fonts",
      cssUrl: "CSS URL",
      fontFace: "@font-face",
      fontFile: "TTF / OTF URL",
    },
    sourcePlaceholders: {
      googleFonts: "@import url(\"https://fonts.googleapis.com/css2?family=Bangers&display=swap\");",
      cssUrl: "https://fonts.googleapis.com/css2?family=Bangers&display=swap",
      fontFace: "@font-face {\n  font-family: \"My Font\";\n  src: url(\"https://example.com/fonts/MyFont-Regular.ttf\") format(\"truetype\");\n}",
      fontFile: "https://example.com/fonts/MyFont-Regular.ttf",
    },
    sourceHints: {
      googleFonts: "Paste a Google Fonts @import or <link> snippet.",
      cssUrl: "Paste a CSS file URL that returns font-face rules.",
      fontFace: "Paste @font-face CSS. The src should resolve to TTF / OTF.",
      fontFile: "Paste a direct TTF / OTF file URL that allows CORS fetch.",
    },
    addMissingLocalFont: "Add Same Font",
    noLocalFontFile: "No TTF / OTF font file was found.",
    noFontSourceUrl: "Enter a CDN / embed URL.",
    unsupportedLocalFont: "{fileName} is not a supported font format. Choose a TTF / OTF file.",
    emptyLocalFont: "{fileName} is an empty font file.",
    localTitle: "Local Font",
    localBody: "Using {fileName}{byteLength} in this browser. The font file is not bundled into project ZIP or JSON.",
    remoteTitle: "CDN Font",
    remoteBody: "Source: {source}",
    missingTitle: "My Font Is Not Loaded",
    missingBody: "This saved data references a font file that is not in this browser. Add the same TTF / OTF to restore it.",
    deleteLocalFont: "Delete",
    localFontMultipleLabel: "{count} My Fonts",
    localFontAdded: "Added {font} to My Fonts",
    localFontsAdded: "Added {count} My Fonts",
    localFontDeleted: "Deleted {font} from My Fonts",
    remoteFontAdded: "Added {font} from CDN to My Fonts",
    localFontLoadLabel: "My Font Add",
    localFontLoadNote: "Added {font} to browser-local My Fonts",
    localFontLoadFailed: "Failed to add My Font",
    localFontLoadFailedLabel: "My Font Add Failed",
    remoteFontLoadLabel: "CDN Font Add",
    remoteFontLoadNote: "Added {font} from {source}",
    remoteFontLoadFailed: "Failed to add CDN Font",
    remoteFontLoadFailedLabel: "CDN Font Add Failed",
    landingPageLinkLabel: "Open Font Page",
    landingPageLinkAriaLabel: "Open {page} for {font} in a new tab",
    attributionTitle: "Copyright and License Notice",
    attributions: {
      "kurobara-cinderella-regular": [
        "Font used: 黒薔薇シンデレラ Version 1.00.20180805",
        "Copyright notice: Copyright(c) 2017 M+ FONTS PROJECT/MODI",
        "License notice: This font is free software. Unlimited permission is granted to use, copy, and distribute it, with or without modification, either commercially or noncommercially. THIS FONT IS PROVIDED \"AS IS\" WITHOUT WARRANTY.",
        "Base license: SIL Open Font License, Version 1.1",
        "Distribution page: https://modi.jpn.org/font_kurobara-cinderella.php"
      ],
    },
  },
  icons: {
    searchAriaLabel: "Search icons",
    searchDialogLabel: "Icon Search",
    searchPlaceholder: "Search by icon name",
    noResults: "No matching icons",
    recommendedLabel: "Keycap picks",
    searchResultsLabel: "Search results",
    attributionTitle: "Icon copyright and license notice",
    openCatalog: "Browse {set}",
    attributions: {
      lucide: [
        "Lucide Icons: ISC License",
        "Source: https://lucide.dev/",
        "Icon data package CDN: https://cdn.jsdelivr.net/npm/@lucide/icons@latest/dist/esm/lucide-icons.mjs"
      ],
      "material-symbols": [
        "Material Symbols by Google: Apache License 2.0",
        "Source: https://fonts.google.com/icons",
        "Icon data package: @iconify-json/material-symbols",
        "Icon data package CDN: https://cdn.jsdelivr.net/npm/@iconify-json/material-symbols@latest/icons.json"
      ],
      "font-awesome": [
        "Font Awesome Free Solid Icons: CC BY 4.0",
        "Code package: MIT License",
        "Source: https://fontawesome.com/",
        "Icon data package CDN: https://cdn.jsdelivr.net/npm/@fortawesome/free-solid-svg-icons@latest/index.mjs",
        "Downloaded Font Awesome Free files include attribution comments; do not remove upstream notices from redistributed files."
      ],
      "remix-icon": [
        "Remix Icon: Remix Icon License v1.0",
        "Source: https://remixicon.com/",
        "Icon data package CDN: https://cdn.jsdelivr.net/npm/remixicon@latest/fonts/remixicon.symbol.svg",
        "Permitted for functional or decorative use in larger works; do not sell as a standalone icon pack or use icons as logos/trademarks."
      ],
    },
  },
  partLabels: {
    body: "Body",
    topHat: "Top Hat",
    rim: "Key Rim",
    legend: "Legend",
    topLegend: "{position}",
    sideLegend: "{side} Side Legend",
    homing: "Homing Mark",
    jStemLp01: "J-STEM-LP01",
  },
  preview: {
    placeholder: "No preview yet. Change the design to automatically update the latest shape.",
    running: "Updating preview",
    successSingle: "Preview updated. Showing {parts}.",
    successMultiple: "Preview updated. Showing {parts} separated by color.",
    failed: "Failed to update preview",
    summary: "{elapsedMs} ms / {objectCount} objects / {vertexCount} vertices / {faceCount} triangles",
  },
  status: {
    notGenerated: "Not generated",
    dirty: "Waiting to apply input",
    loadedDirty: "Waiting to apply loaded editor data",
  },
  importExport: {
    loaded: "Loaded editor data ({fileName})",
    loadLabel: "Editor Data Load",
    loadNote: "Applied {fileName} to the current editor state",
    loadNoteWithUnbound: "Applied {fileName} to the current editor state. Showing {count} skipped parameters.",
    noJsonFile: "No JSON file was found.",
    loadFailed: "Failed to load editor data",
    loadFailedLabel: "Editor Data Load Failed",
    preparing: "Preparing save data",
    savedEditorData: "Saved editor data ({byteLength} bytes)",
    editorDataLabel: "Editor Data JSON",
    editorDataNote: "Saved the on-screen editable parameters as JSON",
    savedThreeMf: "Saved 3MF data ({byteLength} bytes / {partCount} parts)",
    threeMfLabel: "3MF Data",
    threeMfNote: "Saved {parts} together as 3MF data",
    savedStep: "Saved STEP ({byteLength} bytes)",
    stepLabel: "Single-shape STEP",
    stepNote: "Saved the single shape as STEP faceted B-rep ({faceCount} faces)",
    savedStl: "Saved STL ({byteLength} bytes)",
    stlLabel: "Single-color STL",
    stlNote: "Saved the shape as a single mesh without colors or legends",
    saveFailed: "Failed to save",
    saveFailedLabel: "Save Failed",
    unsupportedExport: "Unsupported export format: {format}",
  },
  errors: {
    appRootMissing: "#app was not found.",
    colorisLoadFailed: "Failed to load Coloris.",
    unsupportedOffPurpose: "Unsupported OFF job purpose: {purpose}",
  },
  format: {
    listSeparator: ", ",
  },
});

export default en;
