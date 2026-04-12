const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let AI_AUTO_CYCLE_OPERATION_ORDER;
let buildAiCycleBlueprints;
let formatAiCycleBlueprintLabel;

test.before(async () => {
  const aiCycle = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/aiCycle.js')).href
  );

  ({
    AI_AUTO_CYCLE_OPERATION_ORDER,
    buildAiCycleBlueprints,
    formatAiCycleBlueprintLabel
  } = aiCycle);
});

test('buildAiCycleBlueprints starts from addition and includes the full sweep', () => {
  const blueprints = buildAiCycleBlueprints({
    operation: 'DIVISION',
    leftDigits: 4,
    rightDigits: 2,
    maxBase: 5,
    roundSize: 21
  });

  assert.deepEqual(AI_AUTO_CYCLE_OPERATION_ORDER, [
    'ADDITION',
    'SUBTRACTION',
    'MULTIPLICATION',
    'DIVISION',
    'EXPONENTIATION'
  ]);
  assert.equal(blueprints[0].operation, 'ADDITION');
  assert.equal(blueprints[0].leftDigits, 1);
  assert.equal(blueprints[0].rightDigits, 1);
  assert.equal(blueprints[0].roundSize, 21);
  assert.equal(blueprints[63].operation, 'ADDITION');
  assert.equal(blueprints[63].leftDigits, 8);
  assert.equal(blueprints[63].rightDigits, 8);
  assert.equal(blueprints[64].operation, 'SUBTRACTION');
  assert.equal(blueprints.at(-1).operation, 'EXPONENTIATION');
  assert.equal(blueprints.at(-1).maxBase, 5);
});

test('buildAiCycleBlueprints preserves valid ordered subtraction and division pairs', () => {
  const blueprints = buildAiCycleBlueprints({
    operation: 'MULTIPLICATION',
    leftDigits: 2,
    rightDigits: 2,
    maxBase: 3,
    roundSize: 7
  });
  const subtractionBlueprints = blueprints.filter(
    (blueprint) => blueprint.operation === 'SUBTRACTION'
  );
  const divisionBlueprints = blueprints.filter(
    (blueprint) => blueprint.operation === 'DIVISION'
  );

  assert.equal(subtractionBlueprints.length, 36);
  assert.equal(divisionBlueprints.length, 36);
  assert.equal(
    subtractionBlueprints.every(
      (blueprint) => blueprint.rightDigits <= blueprint.leftDigits
    ),
    true
  );
  assert.equal(
    divisionBlueprints.every(
      (blueprint) => blueprint.rightDigits <= blueprint.leftDigits
    ),
    true
  );
});

test('formatAiCycleBlueprintLabel formats digit and exponentiation blueprints clearly', () => {
  assert.equal(
    formatAiCycleBlueprintLabel({
      operation: 'ADDITION',
      leftDigits: 3,
      rightDigits: 2,
      maxBase: 10,
      roundSize: 10
    }),
    'Addition · 3x2 digits'
  );

  assert.equal(
    formatAiCycleBlueprintLabel({
      operation: 'EXPONENTIATION',
      leftDigits: 1,
      rightDigits: 1,
      maxBase: 7,
      roundSize: 10
    }),
    'Exponentiation · Max base 7'
  );
});
