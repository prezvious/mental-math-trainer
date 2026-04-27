const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let CURRICULUM_CHAPTERS;
let CURRICULUM_TOPICS;
let createCurriculumQuestion;
let checkCurriculumAnswer;
let formatCurriculumAnswer;
let computeCurriculumSessionStats;

function createSequenceRng(values) {
  let index = 0;

  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

function getTopic(topicId) {
  return CURRICULUM_TOPICS.find((topic) => topic.id === topicId);
}

function getWrongAnswer(question) {
  const correctValue = BigInt(question.canonicalAnswer);
  return (correctValue + 1n).toString();
}

test.before(async () => {
  const curriculumPractice = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/curriculumPractice.js')).href
  );

  ({
    CURRICULUM_CHAPTERS,
    CURRICULUM_TOPICS,
    createCurriculumQuestion,
    checkCurriculumAnswer,
    formatCurriculumAnswer,
    computeCurriculumSessionStats
  } = curriculumPractice);
});

test('curriculum chapter list is limited to the arithmetic chapters', () => {
  assert.deepEqual(
    CURRICULUM_CHAPTERS.map((chapter) => chapter.id),
    ['chapter-0', 'chapter-1', 'chapter-2', 'chapter-3', 'chapter-4']
  );
});

test('every curriculum topic generates an arithmetic question and accepts its canonical answer', () => {
  const chapterIds = new Set(CURRICULUM_CHAPTERS.map((chapter) => chapter.id));

  for (const topic of CURRICULUM_TOPICS) {
    const question = topic.generate(Math.random);

    assert.equal(question.topicId, topic.id);
    assert.equal(question.chapterId, topic.chapterId);
    assert.equal(chapterIds.has(question.chapterId), true);
    assert.equal(question.practiceMode, 'POSITIVE');
    assert.equal(typeof question.questionKey, 'string');
    assert.equal(question.questionKey.length > 0, true);
    assert.equal(typeof question.skill, 'string');
    assert.equal(question.skill.length > 0, true);
    assert.equal(Number.isInteger(question.leftOperand), true);
    assert.equal(Number.isInteger(question.rightOperand), true);
    assert.equal(typeof question.canonicalAnswer, 'string');
    assert.equal(/^\d+$/.test(question.canonicalAnswer), true);
    assert.equal(typeof question.methodNote, 'string');
    assert.equal(question.methodNote.length > 0, true);
    assert.equal(checkCurriculumAnswer(question, formatCurriculumAnswer(question)), true);
  }
});

test('wrong answers fail for representative chapter generators', () => {
  const sampleTopics = [
    'chapter-0-multiply-by-11',
    'chapter-1-left-to-right-addition',
    'chapter-2-two-by-one',
    'chapter-3-two-by-two',
    'chapter-4-three-by-one-division'
  ];

  sampleTopics.forEach((topicId) => {
    const question = getTopic(topicId).generate(Math.random);
    assert.equal(checkCurriculumAnswer(question, getWrongAnswer(question)), false);
  });
});

test('chapter filtering only returns questions from the selected arithmetic chapter', () => {
  for (const chapter of CURRICULUM_CHAPTERS) {
    for (let sample = 0; sample < 10; sample += 1) {
      const question = createCurriculumQuestion({
        chapterId: chapter.id
      });

      assert.equal(question.chapterId, chapter.id);
    }
  }
});

test('duplicate avoidance retries until it finds a new question key', () => {
  const firstQuestion = createCurriculumQuestion({
    chapterId: 'chapter-0',
    rng: createSequenceRng([0, 0])
  });

  const secondQuestion = createCurriculumQuestion({
    chapterId: 'chapter-0',
    excludedKeys: [firstQuestion.questionKey],
    rng: createSequenceRng([0, 0, 0, 0.02])
  });

  assert.equal(firstQuestion.topicId, 'chapter-0-multiply-by-11');
  assert.equal(secondQuestion.topicId, 'chapter-0-multiply-by-11');
  assert.notEqual(secondQuestion.questionKey, firstQuestion.questionKey);
});

test('computeCurriculumSessionStats summarizes answered, skipped, streak, and response time', () => {
  const stats = computeCurriculumSessionStats([
    { skipped: false, isCorrect: true, responseMs: 800 },
    { skipped: true, isCorrect: false, responseMs: 1200 },
    { skipped: false, isCorrect: false, responseMs: 1400 },
    { skipped: false, isCorrect: true, responseMs: 1600 },
    { skipped: false, isCorrect: true, responseMs: 2000 }
  ]);

  assert.deepEqual(stats, {
    answered: 4,
    correct: 3,
    skipped: 1,
    streak: 2,
    averageResponseMs: 1450
  });
});
