#!/usr/bin/env node
// "No number holds money" (docs/07 §13 #9, D-028). Exempt: **/data/money-codec.ts and tests.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const MONEY_NAME = /(minor|amount|balance|price|cost|owed|paid)$|^(amount|balance)/i;
const EXEMPT = /(^|[\\/])data[\\/]money-codec\.ts$|\.test\.tsx?$|\.spec\.tsx?$/;

const isNumber = (t) => (t.flags & ts.TypeFlags.NumberLike) !== 0;

export function findMoneyNumbers(files) {
  const wanted = new Set(files.map((f) => path.resolve(f)));
  const program = ts.createProgram(files, {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    skipLibCheck: true,
    allowImportingTsExtensions: true,
  });
  const checker = program.getTypeChecker();
  const hits = [];
  for (const sf of program.getSourceFiles()) {
    if (!wanted.has(path.resolve(sf.fileName)) || EXEMPT.test(sf.fileName)) continue;
    const visit = (node) => {
      if (
        (ts.isVariableDeclaration(node) ||
          ts.isParameter(node) ||
          ts.isPropertyDeclaration(node) ||
          ts.isPropertySignature(node)) &&
        node.name &&
        ts.isIdentifier(node.name) &&
        MONEY_NAME.test(node.name.text)
      ) {
        const type = checker.getNonNullableType(checker.getTypeAtLocation(node.name));
        if (isNumber(type) || (type.isUnion() && type.types.some(isNumber))) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
          hits.push({ file: sf.fileName, line: line + 1, name: node.name.text });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return hits;
}

function sourceFiles() {
  const out = execFileSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      'apps/**/*.ts',
      'apps/**/*.tsx',
      'packages/**/*.ts',
      'packages/**/*.tsx',
      'supabase/functions/**/*.ts',
    ],
    { encoding: 'utf8' },
  );
  return out
    .split('\n')
    .filter(Boolean)
    .filter((f) => !f.includes('/fixtures/'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const hits = findMoneyNumbers(sourceFiles());
  for (const h of hits) {
    console.error(
      `${h.file}:${h.line}  '${h.name}' is money typed as number. Use Minor (bigint); only data/money-codec.ts may convert.`,
    );
  }
  if (hits.length) process.exit(1);
  console.log('check-money-types: OK');
}
