function clampPercentage(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

export default function ProgressBar({
  current,
  total,
  label,
  secondaryLabel = '',
  progressValue = null,
  animatedDurationMs = 0
}) {
  const percentage = clampPercentage(
    typeof progressValue === 'number'
      ? progressValue
      : total > 0
      ? (current / total) * 100
      : 0
  );
  const resolvedLabel =
    label ??
    (Number.isFinite(current) && Number.isFinite(total)
      ? `Question ${Math.min(current + 1, total)} / ${total}`
      : '');

  return (
    <div className='progress-shell'>
      <div className='progress-meta'>
        {resolvedLabel && <p>{resolvedLabel}</p>}
        {secondaryLabel && <p>{secondaryLabel}</p>}
      </div>
      <div
        className={`progress-track${animatedDurationMs ? ' is-animated' : ''}`}
        aria-hidden='true'
        style={
          animatedDurationMs
            ? { '--progress-duration': `${animatedDurationMs}ms` }
            : undefined
        }
      >
        <span style={animatedDurationMs ? undefined : { width: `${percentage}%` }} />
      </div>
    </div>
  );
}
