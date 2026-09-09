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

test('settings dropdown options use theme-aware foreground and surface tokens', () => {
  const filePath = path.resolve(__dirname, '../styles/redesign.css');
  const css = fs.readFileSync(filePath, 'utf8');
  const optionRule = css.match(
    /\.settings-form\s+select\s+option,\s*\.settings-form\s+select\s+optgroup\s*\{([^}]+)\}/
  );

  assert.ok(optionRule, 'settings dropdown options should have a shared style');
  assert.match(
    optionRule[1],
    /color\s*:\s*var\(--text-main\)/,
    'settings dropdown option text should follow the active theme'
  );
  assert.match(
    optionRule[1],
    /background\s*:\s*var\(--surface-input\)/,
    'settings dropdown option surfaces should follow the active theme'
  );
});

test('utility drawer hotkeys use adaptive header contrast tokens', () => {
  const filePath = path.resolve(__dirname, '../styles/redesign.css');
  const css = fs.readFileSync(filePath, 'utf8');
  const drawerHotkeyRule = css.match(
    /\.utility-drawer-shell\s+\.hotkey-hint\s*\{([^}]+)\}/
  );

  assert.ok(drawerHotkeyRule, 'drawer hotkeys should have a scoped style');
  assert.match(
    drawerHotkeyRule[1],
    /border-color\s*:\s*var\(--header-control-border\)/,
    'drawer hotkey borders should adapt to the drawer palette'
  );
  assert.match(
    drawerHotkeyRule[1],
    /background\s*:\s*var\(--header-control-surface\)/,
    'drawer hotkey surfaces should adapt to the drawer palette'
  );
  assert.match(
    drawerHotkeyRule[1],
    /color\s*:\s*var\(--header-text\)/,
    'drawer hotkey labels should remain readable in every resolved mode'
  );
});
