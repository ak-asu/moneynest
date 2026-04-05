import { cn } from '@/lib/utils/cn'

interface MoneyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  placeholder?: string
  required?: boolean
  error?: string
}

export function MoneyInput({
  label,
  placeholder,
  required,
  error,
  className,
  ...rest
}: MoneyInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-default-foreground">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <div
        className={cn(
          'clay-input flex items-center gap-2 px-4 py-3 border transition-colors',
          'focus-within:border-accent',
          error ? 'border-danger' : 'border-default',
          className
        )}
      >
        <span className="text-muted text-sm shrink-0">$</span>
        <input
          type="number"
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          {...rest}
        />
      </div>
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  )
}
