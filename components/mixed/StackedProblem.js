import { MIXED_OPERATION_META } from 'utils/mixedDifficulty.js';

export default function StackedProblem({
  problem,
  answerDisplay,
  isCorrect,
  showAnswerDisplay = true
}) {
  const problemClassName = `stacked-problem${!showAnswerDisplay && isCorrect ? ' is-correct-flash' : ''}`;
  const answerClassName = `stacked-problem-answer${isCorrect ? ' correct-flash' : ''}`;

  if (problem.operation === 'EXPONENTIATION') {
    return (
      <div className={problemClassName}>
        <div className='stacked-problem-stack'>
          <div className='squares-display'>
            {problem.leftOperand}<sup>{problem.rightOperand}</sup>
          </div>
          <div className='stacked-problem-line' />
          {showAnswerDisplay ? (
            <div className={answerClassName}>{answerDisplay || '\u00A0'}</div>
          ) : null}
        </div>
      </div>
    );
  }

  const meta = MIXED_OPERATION_META[problem.operation];
  const symbol = meta ? meta.symbol : '?';

  return (
    <div className={problemClassName}>
      <div className='stacked-problem-stack'>
        <div className='stacked-problem-row'>
          <span className='stacked-problem-op'>&nbsp;</span>
          <span>{problem.leftOperand}</span>
        </div>
        <div className='stacked-problem-row'>
          <span className='stacked-problem-op'>{symbol}</span>
          <span>{problem.rightOperand}</span>
        </div>
        <div className='stacked-problem-line' />
        {showAnswerDisplay ? (
          <div className={answerClassName}>{answerDisplay || '\u00A0'}</div>
        ) : null}
      </div>
    </div>
  );
}
