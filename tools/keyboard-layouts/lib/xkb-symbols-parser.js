const SECTION_PATTERN = /xkb_symbols\s+"([^"]*)"\s*\{/g;
const INCLUDE_PATTERN = /\b(include|augment|override|replace)\s+"([^"]+)"/g;
const KEY_PATTERN = /\bkey\s+<([A-Za-z0-9_+-]+)>\s*\{/g;
const KEY_TYPE_DEFAULT_PATTERN = /\bkey\.type(?:\[\s*[Gg]roup(\d+)\s*\])?\s*=\s*"([^"]+)"/g;
const GROUP_NAME_PATTERN = /\bname\s*\[\s*[Gg]roup(\d+)\s*\]\s*=\s*"([^"]*)"/g;
const KEY_TYPE_PATTERN = /\btype(?:\s*\[\s*[Gg]roup(\d+)\s*\])?\s*=\s*"([^"]+)"/;
const GROUP_SYMBOLS_PATTERN = /\bsymbols\s*\[\s*[Gg]roup(\d+)\s*\]\s*=\s*\[/g;

export function stripComments(source) {
  let result = "";
  let index = 0;
  let inString = false;

  while (index < source.length) {
    const character = source[index];

    if (inString) {
      result += character;
      if (character === "\\" && index + 1 < source.length) {
        result += source[index + 1];
        index += 2;
        continue;
      }
      if (character === '"') {
        inString = false;
      }
      index += 1;
      continue;
    }

    if (character === '"') {
      inString = true;
      result += character;
      index += 1;
      continue;
    }

    if (character === "/" && source[index + 1] === "/") {
      const lineEnd = source.indexOf("\n", index);
      index = lineEnd === -1 ? source.length : lineEnd;
      continue;
    }

    if (character === "/" && source[index + 1] === "*") {
      const blockEnd = source.indexOf("*/", index + 2);
      index = blockEnd === -1 ? source.length : blockEnd + 2;
      result += " ";
      continue;
    }

    result += character;
    index += 1;
  }

  return result;
}

function readBalancedBody(source, openIndex) {
  let depth = 1;
  let index = openIndex + 1;
  let inString = false;

  while (index < source.length) {
    const character = source[index];

    if (inString) {
      if (character === "\\") {
        index += 2;
        continue;
      }
      if (character === '"') {
        inString = false;
      }
      index += 1;
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return { body: source.slice(openIndex + 1, index), endIndex: index };
      }
    }

    index += 1;
  }

  throw new Error("unterminated block in symbols file");
}

function readBracketGroup(source, openIndex) {
  let depth = 1;
  let index = openIndex + 1;

  while (index < source.length) {
    const character = source[index];
    if (character === "[") {
      depth += 1;
    } else if (character === "]") {
      depth -= 1;
      if (depth === 0) {
        return { body: source.slice(openIndex + 1, index), endIndex: index };
      }
    }
    index += 1;
  }

  throw new Error("unterminated symbol list in symbols file");
}

function splitKeysyms(body) {
  return body
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function parseKeyBody(body) {
  const typeMatch = KEY_TYPE_PATTERN.exec(body);
  const explicitType = typeMatch === null ? null : typeMatch[2];
  const explicitTypeGroup = typeMatch === null || typeMatch[1] === undefined ? 1 : Number(typeMatch[1]);

  GROUP_SYMBOLS_PATTERN.lastIndex = 0;
  let groupSymbols = GROUP_SYMBOLS_PATTERN.exec(body);
  while (groupSymbols !== null) {
    if (Number(groupSymbols[1]) === 1) {
      const bracket = readBracketGroup(body, GROUP_SYMBOLS_PATTERN.lastIndex - 1);
      return {
        levels: splitKeysyms(bracket.body),
        explicitType: explicitTypeGroup === 1 ? explicitType : null,
      };
    }
    groupSymbols = GROUP_SYMBOLS_PATTERN.exec(body);
  }

  const bareBracketIndex = body.indexOf("[");
  if (bareBracketIndex === -1) {
    return { levels: [], explicitType: explicitTypeGroup === 1 ? explicitType : null };
  }

  const bracket = readBracketGroup(body, bareBracketIndex);
  return {
    levels: splitKeysyms(bracket.body),
    explicitType: explicitTypeGroup === 1 ? explicitType : null,
  };
}

function parseSectionBody(body) {
  const includes = [];
  INCLUDE_PATTERN.lastIndex = 0;
  let includeMatch = INCLUDE_PATTERN.exec(body);
  while (includeMatch !== null) {
    includes.push({ mode: includeMatch[1], target: includeMatch[2], index: includeMatch.index });
    includeMatch = INCLUDE_PATTERN.exec(body);
  }

  let keyTypeDefault = null;
  KEY_TYPE_DEFAULT_PATTERN.lastIndex = 0;
  let keyTypeMatch = KEY_TYPE_DEFAULT_PATTERN.exec(body);
  while (keyTypeMatch !== null) {
    if (keyTypeMatch[1] === undefined || Number(keyTypeMatch[1]) === 1) {
      keyTypeDefault = keyTypeMatch[2];
    }
    keyTypeMatch = KEY_TYPE_DEFAULT_PATTERN.exec(body);
  }

  let groupName = null;
  GROUP_NAME_PATTERN.lastIndex = 0;
  let groupNameMatch = GROUP_NAME_PATTERN.exec(body);
  while (groupNameMatch !== null) {
    if (Number(groupNameMatch[1]) === 1 && groupName === null) {
      groupName = groupNameMatch[2];
    }
    groupNameMatch = GROUP_NAME_PATTERN.exec(body);
  }

  const keys = [];
  KEY_PATTERN.lastIndex = 0;
  let keyMatch = KEY_PATTERN.exec(body);
  while (keyMatch !== null) {
    const openIndex = KEY_PATTERN.lastIndex - 1;
    const block = readBalancedBody(body, openIndex);
    const parsed = parseKeyBody(block.body);
    keys.push({ keycode: keyMatch[1], index: keyMatch.index, ...parsed });
    KEY_PATTERN.lastIndex = block.endIndex + 1;
    keyMatch = KEY_PATTERN.exec(body);
  }

  return { includes, keys, keyTypeDefault, groupName };
}

export function parseSymbolsFile(source) {
  const stripped = stripComments(source);
  const sections = [];

  SECTION_PATTERN.lastIndex = 0;
  let sectionMatch = SECTION_PATTERN.exec(stripped);
  while (sectionMatch !== null) {
    const openIndex = SECTION_PATTERN.lastIndex - 1;
    const block = readBalancedBody(stripped, openIndex);
    const preamble = stripped.slice(Math.max(0, sectionMatch.index - 120), sectionMatch.index);

    sections.push({
      name: sectionMatch[1],
      isDefault: /\bdefault\b/.test(preamble),
      ...parseSectionBody(block.body),
    });

    SECTION_PATTERN.lastIndex = block.endIndex + 1;
    sectionMatch = SECTION_PATTERN.exec(stripped);
  }

  return sections;
}

export function parseIncludeTarget(target) {
  const match = /^([^()]+?)\s*(?:\(\s*([^()]*?)\s*\))?$/.exec(target.trim());
  if (match === null) {
    return null;
  }
  return { file: match[1], section: match[2] ?? null };
}
