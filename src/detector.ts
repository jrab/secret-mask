export interface SecretRange {
  from: number;
  to: number;
}

// Deliberately local rules. Matches and note text are never persisted or logged.
const rules: { pattern: RegExp; group?: number }[] = [
  { pattern: /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----[\s\S]*?(?:-----END (?:[A-Z0-9]+ )?PRIVATE KEY-----|$)/g },
  { pattern: /\bsk-(?:proj-|ant-api\d{2}-)?[A-Za-z0-9_-]{16,}/g },
  { pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g },
  { pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g },
  { pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { pattern: /\bAIza[A-Za-z0-9_-]{20,}/g },
  { pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
  {
    pattern: /\b((?:[\w.-]*[_-])?(?:api[_-]?key|access[_-]?key|secret(?:[_-]?access[_-]?key)?|token|password|passwd|client[_-]?secret|authorization)["']?\s*[:=][ \t]*(?:["']|(?:bearer|token)[ \t]+)?)([^\s"'`,;<>]+)/gi,
    group: 2,
  },
  { pattern: /\b(bearer[ \t]+)([A-Za-z0-9._~+/-]{8,}=*)/gi, group: 2 },
];

export function findSecrets(text: string): SecretRange[] {
  const ranges: SecretRange[] = [];
  for (const { pattern, group } of rules) {
    for (const match of text.matchAll(pattern)) {
      const value = group === undefined ? match[0] : match[group];
      if (!value || value === '****') continue;
      const from = match.index + (group === undefined ? 0 : match[0].length - value.length);
      ranges.push({ from, to: from + value.length });
    }
  }
  ranges.sort((left, right) => left.from - right.from || right.to - left.to);
  const merged: SecretRange[] = [];
  for (const range of ranges) {
    const previous = merged[merged.length - 1];
    if (previous && range.from < previous.to) previous.to = Math.max(previous.to, range.to);
    else merged.push({ ...range });
  }
  return merged;
}

/** Mask the part of a text node covered by document-wide detection ranges. */
export function maskSlice(text: string, offset: number, ranges: SecretRange[]): string {
  let result = '';
  let cursor = 0;
  for (const range of ranges) {
    const from = Math.max(0, range.from - offset);
    const to = Math.min(text.length, range.to - offset);
    if (from >= to) continue;
    result += text.slice(cursor, from) + (range.from >= offset ? '****' : '');
    cursor = to;
  }
  return result + text.slice(cursor);
}

export function maskText(text: string): string {
  return maskSlice(text, 0, findSecrets(text));
}
