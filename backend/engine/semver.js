'use strict';

// WHY a micro semver module instead of the npm package:
// The full semver package is 50 KB+ and pulls in several deps.
// We only need two operations: parse a version string and check
// whether a version satisfies a simple range like ">=1.0.0 <3.0.0".
// This covers every practical engine-version constraint a plugin would use.

function parse(version) {
  const m = String(version).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

// Compare returns -1, 0, or 1
function compare(a, b) {
  const va = parse(a);
  const vb = parse(b);
  if (!va || !vb) throw new Error(`Invalid version string: "${a}" or "${b}"`);
  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return 0;
}

function valid(version) { return parse(version) !== null; }

// Supports: >=X.Y.Z, >X.Y.Z, <=X.Y.Z, <X.Y.Z, =X.Y.Z, X.Y.Z, *
// Multiple space-separated clauses are ANDed together.
function satisfies(version, range) {
  if (!range || range.trim() === '*') return true;
  return range.trim().split(/\s+/).every((clause) => {
    const m = clause.match(/^(>=|>|<=|<|=|)?(.+)$/);
    if (!m) return false;
    const op  = m[1] || '=';
    const ver = m[2];
    const cmp = compare(version, ver);
    switch (op) {
      case '>=': return cmp >= 0;
      case '>':  return cmp >  0;
      case '<=': return cmp <= 0;
      case '<':  return cmp <  0;
      case '=':
      default:   return cmp === 0;
    }
  });
}

module.exports = { parse, compare, valid, satisfies };
