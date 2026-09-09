const XML_ENTITIES = Object.freeze({
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
});

function decodeXmlText(value) {
  return value.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (match, entity) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return Object.hasOwn(XML_ENTITIES, entity) ? XML_ENTITIES[entity] : match;
  });
}

function extractBlocks(source, tag) {
  const openPattern = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g");
  const closeTag = `</${tag}>`;
  const blocks = [];
  let match = openPattern.exec(source);

  while (match !== null) {
    const bodyStart = match.index + match[0].length;
    let depth = 1;
    let cursor = bodyStart;

    while (depth > 0) {
      const nextClose = source.indexOf(closeTag, cursor);
      if (nextClose === -1) {
        throw new Error(`unterminated <${tag}> in registry xml`);
      }
      const nestedPattern = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g");
      nestedPattern.lastIndex = cursor;
      const nested = nestedPattern.exec(source);
      if (nested !== null && nested.index < nextClose) {
        depth += 1;
        cursor = nested.index + nested[0].length;
        continue;
      }
      depth -= 1;
      cursor = nextClose + closeTag.length;
      if (depth === 0) {
        blocks.push(source.slice(bodyStart, nextClose));
      }
    }

    openPattern.lastIndex = cursor;
    match = openPattern.exec(source);
  }

  return blocks;
}

function extractFirstValue(source, tag) {
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const match = pattern.exec(source);
  return match === null ? null : decodeXmlText(match[1]).trim();
}

function extractAllValues(source, tag) {
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  const values = [];
  let match = pattern.exec(source);
  while (match !== null) {
    values.push(decodeXmlText(match[1]).trim());
    match = pattern.exec(source);
  }
  return values;
}

function parseConfigItem(source) {
  const configItems = extractBlocks(source, "configItem");
  if (configItems.length === 0) {
    return null;
  }
  const configItem = configItems[0];

  return {
    name: extractFirstValue(configItem, "name"),
    description: extractFirstValue(configItem, "description"),
    shortDescription: extractFirstValue(configItem, "shortDescription"),
    countries: extractAllValues(configItem, "iso3166Id"),
    languages: extractAllValues(configItem, "iso639Id"),
  };
}

function parseVariants(layoutSource) {
  const variantLists = extractBlocks(layoutSource, "variantList");
  if (variantLists.length === 0) {
    return [];
  }

  return extractBlocks(variantLists[0], "variant")
    .map((variantSource) => parseConfigItem(variantSource))
    .filter((variant) => variant !== null && variant.name !== null);
}

export function parseRegistryXml(source) {
  const modelLists = extractBlocks(source, "modelList");
  const layoutLists = extractBlocks(source, "layoutList");
  const optionLists = extractBlocks(source, "optionList");

  const models = modelLists.flatMap((modelList) =>
    extractBlocks(modelList, "model").map((modelSource) => {
      const configItem = parseConfigItem(modelSource);
      const configItems = extractBlocks(modelSource, "configItem");
      return {
        name: configItem?.name ?? null,
        description: configItem?.description ?? null,
        vendor: configItems.length > 0 ? extractFirstValue(configItems[0], "vendor") : null,
      };
    }),
  );

  const layouts = layoutLists.flatMap((layoutList) =>
    extractBlocks(layoutList, "layout").map((layoutSource) => {
      const configItem = parseConfigItem(layoutSource);
      return { ...configItem, variants: parseVariants(layoutSource) };
    }),
  );

  const optionGroups = optionLists.flatMap((optionList) =>
    extractBlocks(optionList, "group").map((groupSource) => {
      const configItem = parseConfigItem(groupSource);
      const options = extractBlocks(groupSource, "option")
        .map((optionSource) => parseConfigItem(optionSource))
        .filter((option) => option !== null && option.name !== null)
        .map((option) => ({ name: option.name, description: option.description }));
      return { name: configItem?.name ?? null, description: configItem?.description ?? null, options };
    }),
  );

  return {
    models: models.filter((model) => model.name !== null),
    layouts: layouts.filter((layout) => layout.name !== null),
    optionGroups: optionGroups.filter((group) => group.name !== null),
  };
}

export function mergeRegistries(registries) {
  const models = new Map();
  const layouts = new Map();
  const optionGroups = new Map();

  for (const registry of registries) {
    for (const model of registry.models) {
      if (!models.has(model.name)) {
        models.set(model.name, model);
      }
    }

    for (const layout of registry.layouts) {
      const existing = layouts.get(layout.name);
      if (existing === undefined) {
        layouts.set(layout.name, { ...layout, variants: [...layout.variants] });
        continue;
      }
      const seenVariants = new Set(existing.variants.map((variant) => variant.name));
      for (const variant of layout.variants) {
        if (!seenVariants.has(variant.name)) {
          existing.variants.push(variant);
          seenVariants.add(variant.name);
        }
      }
    }

    for (const group of registry.optionGroups) {
      const existing = optionGroups.get(group.name);
      if (existing === undefined) {
        optionGroups.set(group.name, { ...group, options: [...group.options] });
        continue;
      }
      const seenOptions = new Set(existing.options.map((option) => option.name));
      for (const option of group.options) {
        if (!seenOptions.has(option.name)) {
          existing.options.push(option);
          seenOptions.add(option.name);
        }
      }
    }
  }

  return {
    models: [...models.values()].sort((left, right) => left.name.localeCompare(right.name)),
    layouts: [...layouts.values()].sort((left, right) => left.name.localeCompare(right.name)),
    optionGroups: [...optionGroups.values()].sort((left, right) => left.name.localeCompare(right.name)),
  };
}
