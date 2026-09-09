import { isEmptyKeysym } from "./keysym-legends.js";

export const MAX_KEYCAP_LEVELS = 4;

const ONE_LEVEL = "ONE_LEVEL";
const TWO_LEVEL = "TWO_LEVEL";
const ALPHABETIC = "ALPHABETIC";
const FOUR_LEVEL = "FOUR_LEVEL";
const FOUR_LEVEL_ALPHABETIC = "FOUR_LEVEL_ALPHABETIC";
const FOUR_LEVEL_SEMIALPHABETIC = "FOUR_LEVEL_SEMIALPHABETIC";
const FOUR_LEVEL_X = "FOUR_LEVEL_X";

export function isCasePair(lowerCharacter, upperCharacter) {
  if (typeof lowerCharacter !== "string" || typeof upperCharacter !== "string") {
    return false;
  }
  if (lowerCharacter === "" || upperCharacter === "") {
    return false;
  }
  if (lowerCharacter === upperCharacter) {
    return false;
  }
  return (
    lowerCharacter.toUpperCase() === upperCharacter && upperCharacter.toLowerCase() === lowerCharacter
  );
}

function trimEmptyLevels(levels) {
  const trimmed = [...levels];
  while (trimmed.length > 0 && isEmptyKeysym(trimmed.at(-1))) {
    trimmed.pop();
  }
  return trimmed;
}

export function inferKeyType(levels, resolveCharacter) {
  const trimmed = trimEmptyLevels(levels);

  if (trimmed.length <= 1) {
    return ONE_LEVEL;
  }

  const lowerPair = isCasePair(resolveCharacter(trimmed[0]), resolveCharacter(trimmed[1]));

  if (trimmed.length === 2) {
    return lowerPair ? ALPHABETIC : TWO_LEVEL;
  }

  const upperPair =
    trimmed.length >= 4 && isCasePair(resolveCharacter(trimmed[2]), resolveCharacter(trimmed[3]));

  if (lowerPair && upperPair) {
    return FOUR_LEVEL_ALPHABETIC;
  }
  if (lowerPair) {
    return FOUR_LEVEL_SEMIALPHABETIC;
  }
  if (upperPair) {
    return FOUR_LEVEL_X;
  }
  return FOUR_LEVEL;
}

export function resolveKeyTypeName(key, resolveCharacter) {
  if (key.explicitType !== null && key.explicitType !== undefined) {
    return { typeName: key.explicitType, source: "explicit" };
  }
  if (key.typeDefault !== null && key.typeDefault !== undefined) {
    return { typeName: key.typeDefault, source: "section" };
  }
  return { typeName: inferKeyType(key.levels, resolveCharacter), source: "inferred" };
}

export function createKeyLevelResolver(keyTypes, resolveCharacter) {
  const fallbackType = keyTypes.get(FOUR_LEVEL) ?? null;

  return function resolveKey(key) {
    const { typeName, source } = resolveKeyTypeName(key, resolveCharacter);
    const definition = keyTypes.get(typeName) ?? fallbackType;
    const trimmed = trimEmptyLevels(key.levels);
    const truncated = trimmed.length > MAX_KEYCAP_LEVELS;
    const kept = trimmed.slice(0, MAX_KEYCAP_LEVELS);

    const levels = kept.map((keysym, offset) => {
      const levelDefinition = definition?.levels[offset] ?? null;
      return {
        level: offset + 1,
        keysym,
        modifierName: levelDefinition?.name ?? null,
        modifiers: levelDefinition?.modifiers ?? null,
      };
    });

    return {
      type: typeName,
      typeSource: source,
      resolvedType: definition === null ? null : definition.name,
      levels,
      truncatedLevels: truncated,
      totalLevels: trimmed.length,
    };
  };
}
