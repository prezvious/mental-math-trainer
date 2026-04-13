export default function IconLabel({
  icon: Icon,
  children,
  className = '',
  iconClassName = '',
  labelClassName = ''
}) {
  return (
    <span className={`icon-label ${className}`.trim()}>
      {Icon ? (
        <Icon
          className={`icon-label-icon ${iconClassName}`.trim()}
          aria-hidden='true'
          focusable='false'
        />
      ) : null}
      <span className={labelClassName || undefined}>{children}</span>
    </span>
  );
}
