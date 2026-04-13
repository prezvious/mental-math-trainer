import IconLabel from 'components/IconLabel.js';
import HotkeyHint from 'components/HotkeyHint.js';

export default function HotkeyActionContent({
  hotkey = '',
  icon: Icon = null,
  children,
  className = '',
  iconLabelClassName = '',
  iconClassName = '',
  labelClassName = '',
  hintClassName = ''
}) {
  return (
    <span className={`hotkey-action-content ${className}`.trim()}>
      {Icon ? (
        <IconLabel
          icon={Icon}
          className={iconLabelClassName}
          iconClassName={iconClassName}
          labelClassName={labelClassName}
        >
          {children}
        </IconLabel>
      ) : (
        <span className={`hotkey-action-text ${labelClassName}`.trim()}>{children}</span>
      )}
      <HotkeyHint label={hotkey} className={hintClassName} />
    </span>
  );
}
