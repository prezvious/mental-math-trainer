import {
  create,
  absDependencies,
  addDependencies,
  bignumberDependencies,
  ceilDependencies,
  cosDependencies,
  divideDependencies,
  eDependencies,
  evaluateDependencies,
  expDependencies,
  floorDependencies,
  formatDependencies,
  fractionDependencies,
  logDependencies,
  modDependencies,
  multiplyDependencies,
  parseDependencies,
  piDependencies,
  powDependencies,
  roundDependencies,
  sinDependencies,
  sqrtDependencies,
  subtractDependencies,
  tanDependencies,
  typeOfDependencies,
  unaryMinusDependencies,
  unaryPlusDependencies
} from 'mathjs';

const MATHJS_DEPENDENCIES = {
  absDependencies,
  addDependencies,
  bignumberDependencies,
  ceilDependencies,
  cosDependencies,
  divideDependencies,
  eDependencies,
  evaluateDependencies,
  expDependencies,
  floorDependencies,
  formatDependencies,
  fractionDependencies,
  logDependencies,
  modDependencies,
  multiplyDependencies,
  parseDependencies,
  piDependencies,
  powDependencies,
  roundDependencies,
  sinDependencies,
  sqrtDependencies,
  subtractDependencies,
  tanDependencies,
  typeOfDependencies,
  unaryMinusDependencies,
  unaryPlusDependencies
};

const fractionMath = create(MATHJS_DEPENDENCIES, {
  number: 'Fraction'
});

const decimalMath = create(MATHJS_DEPENDENCIES, {
  number: 'BigNumber',
  precision: 64,
  relTol: 1e-60,
  absTol: 1e-63
});

const ALLOWED_OPERATORS = new Set(['+', '-', '*', '/', '^']);
const ALLOWED_FUNCTION_ARITY = Object.freeze({
  sqrt: [1],
  abs: [1],
  mod: [2],
  log: [1, 2],
  exp: [1],
  sin: [1],
  cos: [1],
  tan: [1],
  floor: [1],
  ceil: [1],
  round: [1, 2]
});
const ALLOWED_FUNCTIONS = new Set(Object.keys(ALLOWED_FUNCTION_ARITY));
const ALLOWED_CONSTANTS = new Set(['pi', 'e']);

function isNumericConstantNode(node) {
  const valueType = decimalMath.typeOf(node.value);
  return valueType === 'number' || valueType === 'BigNumber';
}

function getNodeExpression(node) {
  // Fraction's literal parser does not accept scientific notation.
  return node.toString({
    handler: child => child.type === 'ConstantNode'
      ? decimalMath.format(child.value, { notation: 'fixed' }) : undefined
  }).replace(/\s+/g, ' ').trim();
}

function normalizeSupportedAliases(expression) {
  return expression.replace(/\bln(?=\s*\()/g, 'log');
}

function normalizeExpressionText(expression) {
  return normalizeSupportedAliases(expression).replace(/\s+/g, ' ').trim();
}

function assertSupportedScalar(value, formatter) {
  const valueType = formatter.typeOf(value);
  if (valueType === 'Fraction' || valueType === 'BigNumber' || valueType === 'number') {
    return valueType;
  }

  throw new Error(`AI MODE does not support ${valueType} results.`);
}

function validateExpressionNode(rootNode) {
  rootNode.traverse((node, _path, parent) => {
    switch (node.type) {
      case 'ConstantNode':
        if (!isNumericConstantNode(node)) {
          throw new Error('Only numeric constants are allowed in AI MODE.');
        }
        return;
      case 'ParenthesisNode':
        return;
      case 'OperatorNode':
        if (!ALLOWED_OPERATORS.has(node.op)) {
          throw new Error(`The operator "${node.op}" is not allowed in AI MODE.`);
        }
        return;
      case 'FunctionNode': {
        const functionName = node.fn?.name;
        if (!ALLOWED_FUNCTIONS.has(functionName)) {
          throw new Error(`The function "${functionName || 'unknown'}" is not allowed in AI MODE.`);
        }
        if (!ALLOWED_FUNCTION_ARITY[functionName].includes(node.args.length)) {
          throw new Error(`The function "${functionName}" received an unsupported number of arguments.`);
        }
        return;
      }
      case 'SymbolNode':
        if (ALLOWED_CONSTANTS.has(node.name)) {
          return;
        }
        if (parent?.type === 'FunctionNode' && ALLOWED_FUNCTIONS.has(node.name)) {
          return;
        }
        throw new Error(`The symbol "${node.name}" is not allowed in AI MODE.`);
      default:
        throw new Error(`The syntax "${node.type}" is not allowed in AI MODE.`);
    }
  });
}

function isIntegerFractionValue(value) {
  if (typeof value?.d === 'bigint') {
    return value.d === 1n;
  }

  if (typeof value?.d === 'number') {
    return value.d === 1;
  }

  return !fractionMath.format(value, { fraction: 'ratio' }).includes('/');
}

function isExactCapable(node) {
  switch (node.type) {
    case 'ConstantNode':
      return true;
    case 'ParenthesisNode':
      return isExactCapable(node.content);
    case 'OperatorNode': {
      const argsAreExact = node.args.every((arg) => isExactCapable(arg));
      if (!argsAreExact) {
        return false;
      }

      if (node.op !== '^') {
        return true;
      }

      const exponentValue = fractionMath.evaluate(getNodeExpression(node.args[1]));
      return isIntegerFractionValue(exponentValue);
    }
    default:
      return false;
  }
}

function formatBigNumber(value) {
  return decimalMath.format(value, {
    precision: 64,
    lowerExp: -64,
    upperExp: 64
  });
}

function formatExactFractionDecimal(value) {
  let denominator = BigInt(value.d);
  let twos = 0;
  let fives = 0;
  while (denominator % 2n === 0n) {
    denominator /= 2n;
    twos += 1;
  }
  while (denominator % 5n === 0n) {
    denominator /= 5n;
    fives += 1;
  }
  if (denominator !== 1n) {
    return fractionMath.format(value, { fraction: 'decimal' });
  }

  const scale = Math.max(twos, fives);
  const numerator = BigInt(value.n) *
    2n ** BigInt(scale - twos) * 5n ** BigInt(scale - fives);
  const sign = BigInt(value.s) < 0n && numerator !== 0n ? '-' : '';
  if (!scale) return `${sign}${numerator}`;
  const digits = numerator.toString().padStart(scale + 1, '0');
  return `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

function buildExactResult(parsedNode) {
  const value = fractionMath.evaluate(getNodeExpression(parsedNode));
  assertSupportedScalar(value, fractionMath);

  const exactRatioText = fractionMath.format(value, { fraction: 'ratio' });
  const decimalText = formatExactFractionDecimal(value);
  const isInteger = isIntegerFractionValue(value);
  const exactText = isInteger ? decimalText : exactRatioText;

  return {
    kind: isInteger ? 'integer' : 'fraction',
    exactText,
    decimalText
  };
}

function buildDecimalResult(expressionText) {
  const value = decimalMath.evaluate(expressionText);
  assertSupportedScalar(value, decimalMath);

  const exactText = formatBigNumber(value);

  return {
    kind: 'decimal',
    exactText,
    decimalText: exactText
  };
}

export function solveAiExpression(expression) {
  const trimmedExpression = typeof expression === 'string' ? expression.trim() : '';
  if (!trimmedExpression) {
    throw new Error('Enter a mathematical expression to solve.');
  }

  const normalizedExpression = normalizeExpressionText(trimmedExpression);

  let parsedNode;
  try {
    parsedNode = decimalMath.parse(normalizedExpression);
  } catch (_error) {
    throw new Error('The expression could not be parsed.');
  }

  validateExpressionNode(parsedNode);

  const result = isExactCapable(parsedNode)
    ? buildExactResult(parsedNode)
    : buildDecimalResult(normalizedExpression);

  return {
    normalizedExpression,
    ...result
  };
}
