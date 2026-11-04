import { Button, Chip, Sheet, Text, Wrap, type ColorValue } from "pulsar"
import { state, uiValue } from "../state.ts"
import { textColor } from "../theme.ts"
import {
  clearTagFilters,
  closeTagFilter,
  toggleFilterTag,
} from "./state.ts"

export const TagFilterSheet = (open: boolean) => {
  const filterIDs = uiValue<string[]>("filterTags", [])
  const tags = state.tags

  return Sheet(
    {
      open,
      title: "Фильтр по тегам",
      onClose: closeTagFilter,
    },
    tags.length > 0
      ? Wrap(
          { gap: 6, fillWidth: true },
          ...tags.map((tag) =>
            Chip(
              {
                variant: "outline",
                color: tag.color as ColorValue,
                selected: filterIDs.includes(tag.ID),
                selectedColor: tag.color as ColorValue,
                onClick: () => toggleFilterTag(tag.ID),
              },
              tag.name,
            ),
          ),
        )
      : Text({
          text: "Тегов пока нет.",
          size: 12,
          color: textColor(true),
        }),
    Button({ variant: "ghost", onClick: clearTagFilters }, "Сбросить теги"),
    Button({ variant: "ghost", onClick: closeTagFilter }, "Готово"),
  )
}
