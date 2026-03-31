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
  const rafRef = useRef(null);

  useEffect(() => {
    if (hidden || frozen) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      setElapsed(Date.now() - startedAt);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [startedAt, hidden, frozen]);

  useEffect(() => {
    setElapsed(0);
  }, [startedAt]);

  if (hidden) {
    return null;
  }

  return (
    <p className='question-timer' aria-live='off' aria-label='Question timer'>
      {formatElapsed(elapsed)}
    </p>
  );
}
