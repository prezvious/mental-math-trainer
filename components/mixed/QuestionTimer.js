import { useEffect, useRef, useState } from 'react';

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}.${tenths}`;
}

export default function QuestionTimer({ startedAt, hidden, frozen }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    setElapsed(0);
  }, [startedAt]);

  useEffect(() => {
    if (hidden) {
      return undefined;
    }

    if (frozen) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return undefined;
    }

    const updateElapsed = () => {
      setElapsed(Date.now() - startedAt);
    };

    updateElapsed();
    intervalRef.current = window.setInterval(updateElapsed, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startedAt, hidden, frozen]);

  if (hidden) {
    return null;
  }

  return (
    <p className='question-timer' aria-live='off' aria-label='Question timer'>
      {formatElapsed(elapsed)}
    </p>
  );
}
