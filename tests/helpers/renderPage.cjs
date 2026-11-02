const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { transformSync } = require('next/dist/build/swc');

function loadModule(filename, dependencies) {
  const components = new Map();
  const { code } = transformSync(fs.readFileSync(path.resolve(filename), 'utf8'), {
    filename,
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' }
  });
  const pageModule = { exports: {} };
  const load = name => {
    if (dependencies[name]) return dependencies[name];
    if (name.startsWith('components/') || name.endsWith('.svg') || name === 'next/head') {
      if (!components.has(name)) components.set(name, props => React.createElement('section', null, props.children));
      return { __esModule: true, default: components.get(name) };
    }
    if (name.startsWith('react')) return require(name);
    throw new Error(`Missing page dependency: ${name}`);
  };
  new Function('require', 'module', 'exports', code)(load, pageModule, pageModule.exports);
  return { exports: pageModule.exports, components };
}

function loadPage(filename, dependencies) {
  const { exports, components } = loadModule(filename, dependencies);
  return { Page: exports.default, components };
}

module.exports = { loadModule, loadPage };
