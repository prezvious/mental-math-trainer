const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['AC', '0', 'DEL'],
  ['SUBMIT']
];

export default function Keypad({ onDigit, onClear, onDelete, onSubmit, disabled }) {
  const handlePointerDown = (event, key) => {
    event.preventDefault();

    if (disabled) {
      return;
    }

    if (key === 'AC') {
      onClear();
    } else if (key === 'DEL') {
      onDelete();
    } else if (key === 'SUBMIT') {
      onSubmit();
    } else {
      onDigit(key);
    }
  };

  return (
    <div className='keypad' role='group' aria-label='Numeric keypad'>
      {KEYS.flat().map((key) => {
        const isAction = key === 'AC' || key === 'DEL' || key === 'SUBMIT';
        return (
          <button
            key={key}
            type='button'
            className={`keypad-button${isAction ? ' action' : ''}${key === 'SUBMIT' ? ' submit' : ''}`}
            onPointerDown={(event) => handlePointerDown(event, key)}
            disabled={disabled}
            aria-label={
              key === 'AC'
                ? 'Clear all'
                : key === 'DEL'
                  ? 'Delete last digit'
                  : key === 'SUBMIT'
                    ? 'Submit answer'
                    : key
            }
            tabIndex={-1}
          >
            {key === 'SUBMIT' ? 'Submit' : key}
          </button>
        );
      })}
    </div>
  );
}
