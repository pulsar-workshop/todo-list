import { Chip, defineComponent, type ColorValue } from "pulsar";
import type { Tag } from "../types.ts";

export const TagChip = defineComponent<{
  tag: Tag;
  selected?: boolean;
  onClick?: () => void;
}>(({ tag, selected, onClick }) =>
  Chip(
    {
      variant: "outline",
      color: tag.color as ColorValue,
      textColor: tag.color as ColorValue,
      selected,
      selectedColor: tag.color as ColorValue,
      onClick,
    },
    tag.name,
  ),
);
