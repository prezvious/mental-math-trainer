const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const STYLE_FILES = ['globals.css', 'redesign.css'];
const SAFE_COLOR_VALUE =
  /^(?:inherit|transparent|var\(--(?:text-(?:main|subtle|accent|danger)|header-text(?:-accent|-subtle)?|button-(?:strong|quiet|danger)-text|not-found-text)\)|color-mix\(in srgb, var\(--text-(?:main|subtle)\) \d+%, var\(--text-(?:main|subtle)\)\))$/;

test('foreground colors use contrast-validated semantic text tokens', () => {
  for (const fileName of STYLE_FILES) {
    const filePath = path.resolve(__dirname, `../styles/${fileName}`);
    const css = fs.readFileSync(filePath, 'utf8');
    const declarations = [...css.matchAll(/^\s*color\s*:\s*([^;]+);/gm)];

    assert.ok(
      declarations.length > 0,
      `${fileName} should declare text colors`
    );

    for (const declaration of declarations) {
      const value = declaration[1].trim();
      assert.match(
        value,
        SAFE_COLOR_VALUE,
        `${fileName} foreground color should use a validated semantic token: ${value}`
      );
    }
  }
});
