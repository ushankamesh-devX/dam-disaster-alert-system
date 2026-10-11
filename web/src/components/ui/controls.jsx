import { useCallback, useId } from 'react';
import { Button, IconButton, TextField, Checkbox, Radio, Chip, Skeleton, Dialog, Drawer, SvgIcon } from '@mui/material';

export function FlatIcon({ fill = 'none', width, height, sx, ...props }) {
  return <SvgIcon {...props} sx={{ fill, ...(width && { width }), ...(height && { height }), ...sx }} />;
}

export function AppButton({ iconOnly = false, className = '', children, type = 'button', ...props }) {
  const Component = iconOnly ? IconButton : Button;
  return <Component type={type} className={`md-button ${className}`} {...props}>{children}</Component>;
}

// Native input attributes stay on the input, so number/date constraints and
// existing e.target.value handlers retain their browser behaviour.
export function AppInput({ type = 'text', className = '', ref, ...props }) {
  if (type === 'checkbox' || type === 'radio') {
    const Component = type === 'checkbox' ? Checkbox : Radio;
    const { checked, onChange, disabled, value, name, id, ...inputProps } = props;
    return <Component size="small" checked={checked} onChange={onChange} disabled={disabled} value={value} name={name} id={id} inputRef={ref} className={className} slotProps={{ input: inputProps }} />;
  }
  if (['range', 'color', 'file', 'hidden'].includes(type)) {
    return <input type={type} ref={ref} className={`md-native-input ${className}`} {...props} />;
  }
  const { value, defaultValue, onChange, onBlur, onFocus, disabled, error, ...inputProps } = props;
  return <TextField type={type} size="small" value={value} defaultValue={defaultValue} onChange={onChange} onBlur={onBlur} onFocus={onFocus} disabled={disabled} error={!!error} inputRef={ref} className={`md-input ${className}`} slotProps={{ htmlInput: inputProps }} />;
}

export function AppSelect({ children, className = '', ref, ...props }) {
  const { value, defaultValue, onChange, disabled, error, ...inputProps } = props;
  return <TextField select size="small" value={value} defaultValue={defaultValue} onChange={onChange} disabled={disabled} error={!!error} inputRef={ref} className={`md-input ${className}`} slotProps={{ select: { native: true }, htmlInput: inputProps }}>{children}</TextField>;
}

export function AppTextarea({ className = '', rows = 3, ref, ...props }) {
  const { value, defaultValue, onChange, disabled, ...inputProps } = props;
  return <TextField multiline rows={rows} size="small" value={value} defaultValue={defaultValue} onChange={onChange} disabled={disabled} inputRef={ref} className={`md-input ${className}`} slotProps={{ htmlInput: inputProps }} />;
}

export function Field({ label, error, hint, children, multiline, rows = 3, className = '', ...props }) {
  const generatedId = useId();
  const { id = generatedId, min, max, step, pattern, maxLength, minLength, ...fieldProps } = props;
  return <TextField id={id} label={label} error={!!error} helperText={error || hint} fullWidth size="small" multiline={multiline} rows={multiline ? rows : undefined} select={children != null} slotProps={{ select: { native: true }, inputLabel: { shrink: children != null ? true : undefined }, htmlInput: { min, max, step, pattern, maxLength, minLength } }} className={className} {...fieldProps}>{children}</TextField>;
}

export function TextareaField(props) { return <Field multiline {...props} />; }
export function StatusChip({ children, className = '', ...props }) { return <Chip size="small" label={children} className={className} {...props} />; }
export function LoadingSkeleton({ className = '', ...props }) { return <Skeleton className={className} {...props} />; }

export function AppDialog({ children, onClose, labelledBy, ...props }) {
  const titleId = useId();
  // Dialog children mount through a portal after the parent effect phase.
  const attachContent = useCallback(element => {
    if (!element) return;
    const heading = element.querySelector('h2,h3');
    if (heading && !labelledBy) heading.id = titleId;
    requestAnimationFrame(() => {
      if (element.isConnected) element.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])')?.focus();
    });
  }, [labelledBy, titleId]);
  return <Dialog open fullWidth maxWidth="sm" onClose={onClose} aria-labelledby={labelledBy || titleId} {...props} slotProps={{ paper: { className: 'md-dialog' } }}>
    <div className="md-dialog-content" ref={attachContent}>{children}</div>
  </Dialog>;
}

export function DetailDrawer({ children, onClose, className = '' }) {
  return <Drawer open anchor="right" onClose={onClose} slotProps={{ paper: { className: `md-detail-drawer ${className}`, sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100%', borderRadius: '24px 0 0 24px' } } }}>{children}</Drawer>;
}
