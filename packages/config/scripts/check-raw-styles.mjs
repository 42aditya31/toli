#!/usr/bin/env node
// "No screen may contain a raw colour, size, radius, shadow, easing or duration" (docs/13 rule).
// Scans apps/**/*.{ts,tsx}: raw hex / rgb(a) colours, 'px' values, cubic-bezier strings,
// Easing.bezier(...) calls, and numeric literals on size-like style keys. Throwaway spike code
// (apps/*/src/spikes/) is exempt until it is deleted.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/;
const RGB = /\brgba?\s*\(/;
const PX = /\b\d+(?:\.\d+)?px\b/;
const BEZIER = /cubic-bezier/;
const SIZE_KEY =
  /^(padding|margin)(Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?$|^(min|max)?(Width|Height)$|^(width|height|top|bottom|left|right|start|end|gap|rowGap|columnGap|fontSize|lineHeight|letterSpacing|borderWidth|borderTopWidth|borderBottomWidth|borderLeftWidth|borderRightWidth|borderRadius|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius|elevation|shadowRadius)$/;
const EXEMPT = /[\\/]src[\\/]spikes[\\/]/;

export function findRawStyles(files) {
  const hits = [];
  for (const file of files) {
    if (EXEMPT.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const at = (node, kind) => {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
      hits.push({ file, line: line + 1, kind });
    };
    const visit = (node) => {
      if (ts.isStringLiteralLike(node)) {
        const s = node.text;
        if (HEX.test(s)) at(node, 'hex');
        else if (RGB.test(s)) at(node, 'rgb');
        else if (PX.test(s)) at(node, 'px');
        else if (BEZIER.test(s)) at(node, 'cubic-bezier');
      } else if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'bezier'
      ) {
        at(node, 'bezier');
      } else if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        SIZE_KEY.test(node.name.text)
      ) {
        let init = node.initializer;
        if (ts.isPrefixUnaryExpression(init) && init.operator === ts.SyntaxKind.MinusToken)
          init = init.operand;
        if (ts.isNumericLiteral(init) && Number(init.text) !== 0)
          at(node, `number:${node.name.text}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return hits;
}

function appFiles() {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', 'apps/**/*.ts', 'apps/**/*.tsx'],
    { encoding: 'utf8' },
  );
  return out
    .split('\n')
    .filter(Boolean)
    .filter((f) => !/\.(test|spec)\.tsx?$/.test(f));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const hits = findRawStyles(appFiles());
  for (const h of hits) {
    console.error(
      `${h.file}:${h.line}  raw ${h.kind}. Use a token from @toli/design-system (docs/13).`,
    );
  }
  if (hits.length) process.exit(1);
  console.log('check-raw-styles: OK');
}
