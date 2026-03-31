export default function ProgressBar({ current, total }) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div>
      <div className='progress-meta'>
        <p>
          Question {current + 1} / {total}
        </p>
      </div>
      <div className='progress-track' aria-hidden='true'>
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
