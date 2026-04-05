import { Button } from '@heroui/react'

interface OptionButtonProps {
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
}

export function OptionButton({ selected, onSelect, children }: OptionButtonProps) {
  return (
    <Button
      type="button"
      variant={selected ? 'primary' : 'outline'}
      className="flex-1 clay-btn"
      onPress={onSelect}
    >
      {children}
    </Button>
  )
}
