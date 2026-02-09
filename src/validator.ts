import type {
  JsonObject,
  JsonValue,
  ValidationError,
  ValidationRule,
  ValidationRuleCheck,
} from './types.js'

export function validateContent(data: JsonObject, rules: ValidationRule[]): ValidationError[] {
  if (rules.length === 0) return []
  const errors: ValidationError[] = []
  walk(data, '', rules, errors)
  return errors
}

function walk(
  value: JsonValue,
  path: string,
  rules: ValidationRule[],
  errors: ValidationError[],
): void {
  if (value === null || value === undefined) return

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walk(value[i], `${path}[${i}]`, rules, errors)
    }
    return
  }

  if (typeof value === 'object') {
    walkObject(value, path, rules, errors)
    return
  }

  if (typeof value === 'string' && value !== '') {
    validateLeaf(value, path, rules, errors)
  }
}

function walkObject(
  obj: JsonObject,
  path: string,
  rules: ValidationRule[],
  errors: ValidationError[],
): void {
  for (const [key, child] of Object.entries(obj)) {
    if (child === undefined) continue
    const childPath = path ? `${path}.${key}` : key
    walk(child, childPath, rules, errors)
  }
}

function validateLeaf(
  value: string,
  path: string,
  rules: ValidationRule[],
  errors: ValidationError[],
): void {
  for (const rule of rules) {
    if (!matchesRulePath(path, rule.match)) continue
    if (!checkRule(value, rule.rule)) {
      errors.push({ path, value, reason: rule.message })
    }
  }
}

function matchesRulePath(path: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\[\*\]/g, '\\[\\d+\\]')
    .replace(/\*\*/g, '.*')
  return new RegExp(`(^|\\.)${regexStr}$`).test(path)
}

function checkRule(value: string, rule: ValidationRuleCheck): boolean {
  if ('startsWith' in rule) {
    const prefixes = Array.isArray(rule.startsWith) ? rule.startsWith : [rule.startsWith]
    return prefixes.some((p) => value.startsWith(p))
  }
  if ('pattern' in rule) {
    return new RegExp(rule.pattern).test(value)
  }
  if ('oneOf' in rule) {
    return rule.oneOf.includes(value)
  }
  if ('custom' in rule) {
    return rule.custom(value)
  }
  return true
}
