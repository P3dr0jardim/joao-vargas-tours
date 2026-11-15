'use client'

/** Shared look for text-like controls: 48px high, visible border (3:1), clear error state. */
export const controlClass = (invalid) =>
  `min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-base text-ink placeholder:text-ink/60 ${
    invalid ? 'border-2 border-red-700' : 'border-blue-600'
  }`

/**
 * Label + control + hint + error. `children` is a render function that receives the props the
 * control needs (id, aria-describedby, aria-invalid), so label and messages are always wired up.
 */
export function Field({ name, label, optionalText, hint, error, className = '', children }) {
  const id = `field-${name}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block font-semibold text-blue-800">
        {label}
        {optionalText && <span className="ml-1 font-normal text-ink">({optionalText})</span>}
      </label>
      {hint && (
        <p id={hintId} className="mb-2 text-sm">
          {hint}
        </p>
      )}
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? 'true' : undefined,
      })}
      {error && (
        <p id={errorId} className="mt-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

/** Number input with minus/plus buttons (48px targets). Value lives in react-hook-form. */
export function Stepper({
  name,
  label,
  error,
  hint,
  value,
  min,
  max,
  register,
  onStep,
  decreaseLabel,
  increaseLabel,
}) {
  const current = Number(value) || 0
  const btn =
    'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-blue-600 bg-white text-2xl font-semibold text-blue-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <Field name={name} label={label} hint={hint} error={error}>
      {(aria) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={btn}
            aria-label={decreaseLabel}
            disabled={current <= min}
            onClick={() => onStep(name, Math.max(min, current - 1))}
          >
            <span aria-hidden="true">&minus;</span>
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            className={`${controlClass(Boolean(error))} min-w-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            {...aria}
            {...register(name)}
          />
          <button
            type="button"
            className={btn}
            aria-label={increaseLabel}
            disabled={current >= max}
            onClick={() => onStep(name, Math.min(max, current + 1))}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      )}
    </Field>
  )
}
