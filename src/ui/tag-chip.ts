import { Chip, defineComponent, type ColorValue } from "pulsar"
import { textColor } from "../theme.ts"
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
      color: selected ? (tag.color as ColorValue) : textColor(true),
      selected,
      selectedColor: tag.color as ColorValue,
      onClick,
      onRemove,
    },
    tag.name,
  ),
)
