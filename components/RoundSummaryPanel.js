import { formatDuration } from 'utils/mathEngine.js';

export default function RoundSummaryPanel({
  title = 'Round Summary',
  badgeLabel = '',
  badgeClassName = 'mode-pill-manual',
  round,
  saveStatus = '',
  primaryAction = null,
  secondaryAction = null,
  className = '',
  children = null
}) {
  if (!round) {
    return null;
  }

  return (
    <section className={`summary-panel appear-up round-summary-panel ${className}`.trim()}>
      <div className='panel-title-row'>
        <h2>{title}</h2>
        {badgeLabel && <span className={`mode-pill ${badgeClassName}`}>{badgeLabel}</span>}
      </div>
      <div className='summary-grid'>
        <article>
          <h3>Accuracy</h3>
          <p className='summary-metric-value'>{round.accuracy.toFixed(1)}%</p>
        </article>
        <article>
          <h3>Correct Answers</h3>
          <div className='summary-count-stack' aria-label={`${round.correct} out of ${round.total}`}>
            <span className='summary-count-primary'>{round.correct}</span>
            <span className='summary-count-divider'>/</span>
            <span className='summary-count-secondary'>{round.total}</span>
          </div>
        </article>
        <article>
          <h3>Avg Response</h3>
          <p className='summary-metric-value'>{formatDuration(round.averageResponseMs)}</p>
        </article>
        <article>
          <h3>Total Time</h3>
          <p className='summary-metric-value'>{formatDuration(round.totalResponseMs)}</p>
        </article>
      </div>
      {children}
      {saveStatus && <p className='save-status'>{saveStatus}</p>}
      {primaryAction && secondaryAction && (
        <div className='summary-actions'>
          <button
            type='button'
            className='button button-strong'
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </button>
          <button
            type='button'
            className='button button-quiet'
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </button>
        </div>
      )}
    </section>
  );
}
