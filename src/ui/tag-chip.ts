import { Chip, defineComponent, type ColorValue } from "pulsar"
import type { Tag } from "../types.ts"

export const TagChip = defineComponent<{
  tag: Tag
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
}>(({ tag, selected, onClick, onRemove }) =>
  Chip(
    {
      variant: "outline",
      color: tag.color as ColorValue,
      textColor: tag.color as ColorValue,
      selected,
      selectedColor: tag.color as ColorValue,
      onClick,
      onRemove,
    },
    tag.name,
  ),
)
