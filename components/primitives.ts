import { tv } from 'tailwind-variants'

export const title = tv({
  base: 'tracking-tight inline font-semibold',
  variants: {
    color: {
      violet: 'text-violet-700 dark:text-violet-300',
      yellow: 'text-amber-700 dark:text-amber-300',
      blue: 'text-blue-700 dark:text-blue-300',
      cyan: 'text-cyan-700 dark:text-cyan-300',
      green: 'text-emerald-700 dark:text-emerald-300',
      pink: 'text-rose-700 dark:text-rose-300',
      foreground: 'text-foreground',
    },
    size: {
      sm: 'text-3xl lg:text-4xl',
      md: 'text-[2.3rem] lg:text-5xl',
      lg: 'text-4xl lg:text-6xl',
    },
    fullWidth: {
      true: 'w-full block',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

export const subtitle = tv({
  base: 'w-full md:w-1/2 my-2 text-lg lg:text-xl text-muted block max-w-full',
  variants: {
    fullWidth: {
      true: '!w-full',
    },
  },
  defaultVariants: {
    fullWidth: true,
  },
})
