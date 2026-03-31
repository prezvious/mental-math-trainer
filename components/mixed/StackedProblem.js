import { MIXED_OPERATION_META } from 'utils/mixedDifficulty';

export default function StackedProblem({ problem, answerDisplay, isCorrect }) {
  if (problem.operation === 'SQUARES') {
    return (
      <div className='stacked-problem'>
        <div className='squares-display'>
          {problem.leftOperand}<sup>2</sup>
        </div>
        <div className='stacked-problem-line' />
        <div className={`stacked-problem-answer${isCorrect ? ' correct-flash' : ''}`}>
          {answerDisplay || '\u00A0'}
        </div>
      </div>
    );
  }

  const meta = MIXED_OPERATION_META[problem.operation];
  const symbol = meta ? meta.symbol : '?';

  return (
    <div className='stacked-problem'>
      <div className='stacked-problem-row'>
        <span className='stacked-problem-op'>&nbsp;</span>
        <span>{problem.leftOperand}</span>
      </div>
      <div className='stacked-problem-row'>
        <span className='stacked-problem-op'>{symbol}</span>
        <span>{problem.rightOperand}</span>
      </div>
      <div className='stacked-problem-line' />
      <div className={`stacked-problem-answer${isCorrect ? ' correct-flash' : ''}`}>
        {answerDisplay || '\u00A0'}
      </div>
    </div>
  );
}
