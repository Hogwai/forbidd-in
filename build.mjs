#!/usr/bin/env node
// Generates the userscripts at the repository root from the approach sources.
//
//   node build.mjs          regenerate the files
//   node build.mjs --check  exit 1 if a generated file is missing or outdated
//

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CHECK = process.argv.includes('--check');

const TARGETS = [
    {
        output: 'forbidd-in.user.js',
        source: 'approaches/main-world/main.js',
        meta: {
            name: 'forbidd-in',
            version: '0.1.0',
            description: 'Prevents LinkedIn from scanning and fingerprinting browser extensions',
        },
    },
    {
        output: 'forbidd-in-fetch-intercept.user.js',
        source: 'approaches/fetch-intercept/main.js',
        meta: {
            name: 'forbidd-in (fetch intercept)',
            version: '0.1.0',
            description: 'Prevents LinkedIn from probing browser extensions by blocking chrome-extension:// fetch requests',
        },
    },
    {
        output: 'forbidd-in-webpack-intercept.user.js',
        source: 'approaches/webpack-intercept/main.js',
        meta: {
            name: 'forbidd-in (webpack intercept)',
            version: '0.2.0',
            description: 'Prevents LinkedIn from detecting browser extensions by neutralizing its webpack extension-detection module, whatever chunk/module IDs the current deploy uses',
        },
    },
];

function header(meta) {
    return [
        '// ==UserScript==',
        `// @name        ${meta.name}`,
        '// @namespace   https://github.com/Hogwai/forbidd-in',
        `// @version     ${meta.version}`,
        `// @description ${meta.description}`,
        '// @author      Hogwai',
        '// @match       https://www.linkedin.com/*',
        '// @run-at      document-start',
        '// @grant       none',
        '// ==/UserScript==',
        '',
        '',
    ].join('\n');
}

function generate(body, meta) {
    // Keep the repository normalised to LF regardless of the working copy.
    return header(meta) + body.replace(/\r\n/g, '\n');
}

function sameContent(a, b) {
    return a.replace(/\r\n/g, '\n').trimEnd() === b.replace(/\r\n/g, '\n').trimEnd();
}

let failures = 0;

for (const target of TARGETS) {
    const sourcePath = path.join(ROOT, target.source);
    const outputPath = path.join(ROOT, target.output);

    const body = await readFile(sourcePath, 'utf8');
    const expected = generate(body, target.meta);

    if (CHECK) {
        let current = '';
        try {
            current = await readFile(outputPath, 'utf8');
        } catch {
            failures++;
            console.error(`missing   ${target.output}`);
            continue;
        }

        if (sameContent(current, expected)) {
            console.log(`ok        ${target.output}`);
        } else {
            failures++;
            console.error(`outdated  ${target.output}`);
        }
    } else {
        await writeFile(outputPath, expected);
        console.log(`wrote     ${target.output}`);
    }
}

if (CHECK && failures > 0) {
    console.error(`\n${failures} userscript(s) out of date. Run: node build.mjs`);
    process.exit(1);
}
