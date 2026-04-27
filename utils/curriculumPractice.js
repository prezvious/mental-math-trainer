import { parseTrainerAnswer, PRACTICE_MODES } from './mathEngine.js';

const DEFAULT_RETRY_LIMIT = 20;
const CHAPTER_FILTER_ALL = 'all';

export const CURRICULUM_CHAPTERS = Object.freeze([
  Object.freeze({
    id: 'chapter-0',
    label: 'Chapter 0',
    title: 'Quick Tricks'
  }),
  Object.freeze({
    id: 'chapter-1',
    label: 'Chapter 1',
    title: 'Mental Addition and Subtraction'
  }),
  Object.freeze({
    id: 'chapter-2',
    label: 'Chapter 2',
    title: 'Basic Multiplication'
  }),
  Object.freeze({
    id: 'chapter-3',
    label: 'Chapter 3',
    title: 'Intermediate Multiplication'
  }),
  Object.freeze({
    id: 'chapter-4',
    label: 'Chapter 4',
    title: 'Mental Division'
  })
]);

const CHAPTER_BY_ID = new Map(
  CURRICULUM_CHAPTERS.map((chapter) => [chapter.id, chapter])
);

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick(rng, values) {
  return values[randomInt(rng, 0, values.length - 1)];
}

function digitCount(value) {
  return String(Math.abs(value)).length;
}

function randomByDigits(rng, digits, minimumSingleDigit = 2) {
  if (digits <= 1) {
    return randomInt(rng, minimumSingleDigit, 9);
  }

  return randomInt(rng, 10 ** (digits - 1), 10 ** digits - 1);
}

function buildPositiveAnswer(operation, leftOperand, rightOperand) {
  const left = BigInt(leftOperand);
  const right = BigInt(rightOperand);

  switch (operation) {
    case 'ADDITION':
      return left + right;
    case 'SUBTRACTION':
      return left - right;
    case 'MULTIPLICATION':
      return left * right;
    case 'DIVISION':
      return left / right;
    case 'EXPONENTIATION':
      return left ** right;
    default:
      throw new Error(`Unsupported curriculum operation: ${operation}`);
  }
}

function buildArithmeticQuestion(
  topic,
  { operation, leftOperand, rightOperand, questionKey, methodNote }
) {
  const chapter = CHAPTER_BY_ID.get(topic.chapterId);
  const correctAnswer = buildPositiveAnswer(operation, leftOperand, rightOperand);

  return {
    topicId: topic.id,
    chapterId: topic.chapterId,
    chapterLabel: chapter.label,
    chapterTitle: chapter.title,
    skill: topic.skill,
    questionKey,
    practiceMode: PRACTICE_MODES.POSITIVE,
    operation,
    leftOperand,
    rightOperand,
    correctAnswer,
    canonicalAnswer: correctAnswer.toString(),
    methodNote
  };
}

function createTopic(id, chapterId, skill, generate) {
  return Object.freeze({
    id,
    chapterId,
    skill,
    generate
  });
}

function createExactDivisionOperands(
  rng,
  { dividendDigits, divisorDigits, quotientDigits }
) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const divisor = randomByDigits(rng, divisorDigits, 2);
    const quotient = randomByDigits(rng, quotientDigits, 2);
    const dividend = divisor * quotient;

    if (digitCount(dividend) === dividendDigits) {
      return { dividend, divisor };
    }
  }

  throw new Error('Unable to generate an exact division question for that chapter.');
}

const CURRICULUM_TOPIC_DEFINITIONS = [
  createTopic(
    'chapter-0-multiply-by-11',
    'chapter-0',
    'Multiply by 11',
    (rng) => {
      const value = randomInt(rng, 12, 98);

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-0-multiply-by-11'),
        {
          operation: 'MULTIPLICATION',
          leftOperand: value,
          rightOperand: 11,
          questionKey: `chapter-0-multiply-by-11:${value}`,
          methodNote:
            'Add the two digits and place that sum in the middle, carrying if the middle total reaches 10.'
        }
      );
    }
  ),
  createTopic(
    'chapter-0-square-ending-in-5',
    'chapter-0',
    'Square Ending in 5',
    (rng) => {
      const stem = randomInt(rng, 1, 19);
      const value = stem * 10 + 5;

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-0-square-ending-in-5'),
        {
          operation: 'EXPONENTIATION',
          leftOperand: value,
          rightOperand: 2,
          questionKey: `chapter-0-square-ending-in-5:${value}`,
          methodNote:
            'Multiply the part before the 5 by the next integer, then attach 25.'
        }
      );
    }
  ),
  createTopic(
    'chapter-0-same-tens-product',
    'chapter-0',
    'Same-Tens Product',
    (rng) => {
      const tens = randomInt(rng, 2, 9);
      const firstOnes = randomInt(rng, 1, 9);
      const secondOnes = 10 - firstOnes;
      const left = tens * 10 + firstOnes;
      const right = tens * 10 + secondOnes;

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-0-same-tens-product'),
        {
          operation: 'MULTIPLICATION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-0-same-tens-product:${left}:${right}`,
          methodNote:
            'Multiply the shared tens digit by the next integer for the front, then multiply the ones digits for the back.'
        }
      );
    }
  ),
  createTopic(
    'chapter-0-bridge-subtraction',
    'chapter-0',
    'Bridge Subtraction',
    (rng) => {
      const base = pick(rng, [100, 1000]);
      const up = base === 100 ? randomInt(rng, 2, 9) : randomInt(rng, 3, 29);
      const down = base === 100 ? randomInt(rng, 2, 18) : randomInt(rng, 3, 99);
      const left = base + up;
      const right = base - down;

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-0-bridge-subtraction'),
        {
          operation: 'SUBTRACTION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-0-bridge-subtraction:${left}:${right}`,
          methodNote:
            'Use the nearby base and combine the small distance above it with the small distance below it.'
        }
      );
    }
  ),
  createTopic(
    'chapter-1-left-to-right-addition',
    'chapter-1',
    'Left-to-Right Addition',
    (rng) => {
      const digits = pick(rng, [2, 3, 4]);
      const left = randomByDigits(rng, digits);
      const right = randomByDigits(rng, digits);

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-1-left-to-right-addition'),
        {
          operation: 'ADDITION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-1-left-to-right-addition:${left}:${right}`,
          methodNote:
            'Add the biggest place values first, then finish the tens and ones.'
        }
      );
    }
  ),
  createTopic(
    'chapter-1-bridge-addition',
    'chapter-1',
    'Bridge Addition',
    (rng) => {
      const base = pick(rng, [100, 1000, 10000]);
      const gap = base === 100 ? randomInt(rng, 2, 14) : randomInt(rng, 3, 90);
      const overshoot = base === 100 ? randomInt(rng, gap + 2, 70) : randomInt(rng, gap + 3, 260);
      const left = base - gap;
      const right = overshoot;

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-1-bridge-addition'),
        {
          operation: 'ADDITION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-1-bridge-addition:${left}:${right}`,
          methodNote:
            'Jump to the nearby hundred or thousand first, then add the leftover amount.'
        }
      );
    }
  ),
  createTopic(
    'chapter-1-left-to-right-subtraction',
    'chapter-1',
    'Left-to-Right Subtraction',
    (rng) => {
      const digits = pick(rng, [2, 3, 4]);
      const minimum = 10 ** (digits - 1);
      const left = randomInt(rng, minimum + 1, 10 ** digits - 1);
      const right = randomInt(rng, minimum, left - 1);

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-1-left-to-right-subtraction'),
        {
          operation: 'SUBTRACTION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-1-left-to-right-subtraction:${left}:${right}`,
          methodNote:
            'Subtract the largest place values first, then clean up the tens and ones.'
        }
      );
    }
  ),
  createTopic(
    'chapter-1-rounding-subtraction',
    'chapter-1',
    'Rounding Subtraction',
    (rng) => {
      const base = pick(rng, [100, 1000]);
      const left =
        base + (base === 100 ? randomInt(rng, 35, 220) : randomInt(rng, 80, 420));
      const right =
        base - (base === 100 ? randomInt(rng, 2, 18) : randomInt(rng, 3, 95));

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-1-rounding-subtraction'),
        {
          operation: 'SUBTRACTION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-1-rounding-subtraction:${left}:${right}`,
          methodNote:
            'Subtract the nearby round number first, then add back the small difference.'
        }
      );
    }
  ),
  createTopic(
    'chapter-2-two-by-one',
    'chapter-2',
    '2-by-1 Multiplication',
    (rng) => {
      const left = randomByDigits(rng, 2);
      const right = randomByDigits(rng, 1, 2);

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-2-two-by-one'),
        {
          operation: 'MULTIPLICATION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-2-two-by-one:${left}:${right}`,
          methodNote:
            'Break the two-digit number into tens and ones, then distribute the one-digit factor.'
        }
      );
    }
  ),
  createTopic(
    'chapter-2-three-by-one',
    'chapter-2',
    '3-by-1 Multiplication',
    (rng) => {
      const left = randomByDigits(rng, 3);
      const right = randomByDigits(rng, 1, 2);

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-2-three-by-one'),
        {
          operation: 'MULTIPLICATION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-2-three-by-one:${left}:${right}`,
          methodNote:
            'Multiply hundreds, tens, and ones separately, then combine the partial products.'
        }
      );
    }
  ),
  createTopic(
    'chapter-2-two-digit-square',
    'chapter-2',
    '2-Digit Square',
    (rng) => {
      const value = randomInt(rng, 12, 49);

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-2-two-digit-square'),
        {
          operation: 'EXPONENTIATION',
          leftOperand: value,
          rightOperand: 2,
          questionKey: `chapter-2-two-digit-square:${value}`,
          methodNote:
            'Use a nearby multiple of 10 and adjust with the square of the offset.'
        }
      );
    }
  ),
  createTopic(
    'chapter-2-times-multiple-of-10',
    'chapter-2',
    'Multiply by a Multiple of 10',
    (rng) => {
      const left = randomByDigits(rng, 2);
      const right = pick(rng, [10, 20, 30, 40, 50, 60, 70, 80, 90]);

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-2-times-multiple-of-10'),
        {
          operation: 'MULTIPLICATION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-2-times-multiple-of-10:${left}:${right}`,
          methodNote:
            'Multiply by the non-zero digit first, then place the zero at the end.'
        }
      );
    }
  ),
  createTopic(
    'chapter-3-two-by-two',
    'chapter-3',
    '2-by-2 Multiplication',
    (rng) => {
      const left = randomByDigits(rng, 2);
      const right = randomByDigits(rng, 2);

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-3-two-by-two'),
        {
          operation: 'MULTIPLICATION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-3-two-by-two:${left}:${right}`,
          methodNote:
            'Split one factor into tens and ones, then add the partial products.'
        }
      );
    }
  ),
  createTopic(
    'chapter-3-three-by-two',
    'chapter-3',
    '3-by-2 Multiplication',
    (rng) => {
      const left = randomByDigits(rng, 3);
      const right = randomByDigits(rng, 2);

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-3-three-by-two'),
        {
          operation: 'MULTIPLICATION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-3-three-by-two:${left}:${right}`,
          methodNote:
            'Keep the hundreds separate, then add the tens and ones partial products.'
        }
      );
    }
  ),
  createTopic(
    'chapter-3-three-digit-square',
    'chapter-3',
    '3-Digit Square',
    (rng) => {
      const base = pick(rng, [100, 200, 300, 500]);
      let offset = randomInt(rng, -24, 24);

      while (offset === 0) {
        offset = randomInt(rng, -24, 24);
      }

      const value = base + offset;

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-3-three-digit-square'),
        {
          operation: 'EXPONENTIATION',
          leftOperand: value,
          rightOperand: 2,
          questionKey: `chapter-3-three-digit-square:${value}`,
          methodNote:
            'Square the nearby base, double the base-offset product, then add the offset square.'
        }
      );
    }
  ),
  createTopic(
    'chapter-3-close-to-base-product',
    'chapter-3',
    'Close-to-Base Product',
    (rng) => {
      const base = pick(rng, [100, 1000]);
      let leftOffset = randomInt(rng, -18, 18);
      let rightOffset = randomInt(rng, -18, 18);

      while (leftOffset === 0) {
        leftOffset = randomInt(rng, -18, 18);
      }
      while (rightOffset === 0) {
        rightOffset = randomInt(rng, -18, 18);
      }

      const left = base + leftOffset;
      const right = base + rightOffset;

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-3-close-to-base-product'),
        {
          operation: 'MULTIPLICATION',
          leftOperand: left,
          rightOperand: right,
          questionKey: `chapter-3-close-to-base-product:${left}:${right}`,
          methodNote:
            'Shift to the nearby base, adjust by the offsets, then add the offset product.'
        }
      );
    }
  ),
  createTopic(
    'chapter-4-three-by-one-division',
    'chapter-4',
    '3-by-1 Division',
    (rng) => {
      const { dividend, divisor } = createExactDivisionOperands(rng, {
        dividendDigits: 3,
        divisorDigits: 1,
        quotientDigits: 2
      });

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-4-three-by-one-division'),
        {
          operation: 'DIVISION',
          leftOperand: dividend,
          rightOperand: divisor,
          questionKey: `chapter-4-three-by-one-division:${dividend}:${divisor}`,
          methodNote:
            'Split the dividend into place values that divide cleanly by the one-digit divisor.'
        }
      );
    }
  ),
  createTopic(
    'chapter-4-three-by-two-division',
    'chapter-4',
    '3-by-2 Division',
    (rng) => {
      const { dividend, divisor } = createExactDivisionOperands(rng, {
        dividendDigits: 3,
        divisorDigits: 2,
        quotientDigits: 1
      });

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-4-three-by-two-division'),
        {
          operation: 'DIVISION',
          leftOperand: dividend,
          rightOperand: divisor,
          questionKey: `chapter-4-three-by-two-division:${dividend}:${divisor}`,
          methodNote:
            'Estimate the quotient from the leading digits, then confirm it lands exactly.'
        }
      );
    }
  ),
  createTopic(
    'chapter-4-four-by-one-division',
    'chapter-4',
    '4-by-1 Division',
    (rng) => {
      const { dividend, divisor } = createExactDivisionOperands(rng, {
        dividendDigits: 4,
        divisorDigits: 1,
        quotientDigits: 3
      });

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-4-four-by-one-division'),
        {
          operation: 'DIVISION',
          leftOperand: dividend,
          rightOperand: divisor,
          questionKey: `chapter-4-four-by-one-division:${dividend}:${divisor}`,
          methodNote:
            'Work left to right, keeping each partial dividend divisible by the one-digit divisor.'
        }
      );
    }
  ),
  createTopic(
    'chapter-4-four-by-two-division',
    'chapter-4',
    '4-by-2 Division',
    (rng) => {
      const { dividend, divisor } = createExactDivisionOperands(rng, {
        dividendDigits: 4,
        divisorDigits: 2,
        quotientDigits: 2
      });

      return buildArithmeticQuestion(
        CURRICULUM_TOPIC_MAP.get('chapter-4-four-by-two-division'),
        {
          operation: 'DIVISION',
          leftOperand: dividend,
          rightOperand: divisor,
          questionKey: `chapter-4-four-by-two-division:${dividend}:${divisor}`,
          methodNote:
            'Use the first one or two digits to pin down the quotient, then verify the product matches exactly.'
        }
      );
    }
  )
];

const CURRICULUM_TOPIC_MAP = new Map();

CURRICULUM_TOPIC_DEFINITIONS.forEach((topic) => {
  CURRICULUM_TOPIC_MAP.set(topic.id, topic);
});

export const CURRICULUM_TOPICS = Object.freeze(CURRICULUM_TOPIC_DEFINITIONS);

function normalizeChapterId(chapterId) {
  if (!chapterId || chapterId === CHAPTER_FILTER_ALL) {
    return null;
  }

  return chapterId;
}

function normalizeSubmittedAnswer(rawAnswer) {
  if (typeof rawAnswer !== 'string') {
    return '';
  }

  return rawAnswer.replace(/,/g, '').trim();
}

export function createCurriculumQuestion({
  chapterId = CHAPTER_FILTER_ALL,
  excludedKeys = [],
  rng = Math.random
} = {}) {
  const normalizedChapterId = normalizeChapterId(chapterId);
  const eligibleTopics = CURRICULUM_TOPICS.filter((topic) =>
    normalizedChapterId ? topic.chapterId === normalizedChapterId : true
  );

  if (!eligibleTopics.length) {
    throw new Error('No curriculum topics are available for that chapter filter.');
  }

  const excludedKeySet = excludedKeys instanceof Set ? excludedKeys : new Set(excludedKeys);
  let fallbackQuestion = null;

  for (let attempt = 0; attempt < DEFAULT_RETRY_LIMIT; attempt += 1) {
    const topic = pick(rng, eligibleTopics);
    const question = topic.generate(rng);

    if (!fallbackQuestion) {
      fallbackQuestion = question;
    }

    if (!excludedKeySet.has(question.questionKey)) {
      return question;
    }
  }

  return fallbackQuestion || pick(rng, eligibleTopics).generate(rng);
}

export function checkCurriculumAnswer(question, rawAnswer) {
  if (!question || typeof rawAnswer !== 'string') {
    return false;
  }

  const parsedAnswer = parseTrainerAnswer(
    normalizeSubmittedAnswer(rawAnswer),
    question.practiceMode || PRACTICE_MODES.POSITIVE
  );

  return parsedAnswer !== null && parsedAnswer === question.correctAnswer;
}

export function formatCurriculumAnswer(question) {
  return question?.canonicalAnswer || '';
}

export function computeCurriculumSessionStats(attempts) {
  const normalizedAttempts = Array.isArray(attempts) ? attempts : [];
  const answeredAttempts = normalizedAttempts.filter((attempt) => !attempt.skipped);
  const correct = answeredAttempts.filter((attempt) => attempt.isCorrect).length;
  const skipped = normalizedAttempts.filter((attempt) => attempt.skipped).length;
  const averageResponseMs =
    answeredAttempts.length > 0
      ? Math.round(
          answeredAttempts.reduce((total, attempt) => total + attempt.responseMs, 0) /
            answeredAttempts.length
        )
      : 0;

  let streak = 0;
  normalizedAttempts.forEach((attempt) => {
    if (!attempt.skipped && attempt.isCorrect) {
      streak += 1;
      return;
    }

    streak = 0;
  });

  return {
    answered: answeredAttempts.length,
    correct,
    skipped,
    streak,
    averageResponseMs
  };
}
