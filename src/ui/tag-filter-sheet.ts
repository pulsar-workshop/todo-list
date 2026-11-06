import { Button, Chip, Sheet, Text, Wrap, component, type ColorValue } from "pulsar"
import { activeTags, state, ui } from "../state.ts"
import { textColor } from "../theme.ts"
import {
  clearTagFilters,
  closeTagFilter,
  toggleFilterTag,
} from "./state.ts"
import { tr } from "../i18n.ts"

export const TagFilterSheet = component(() => {
  const filterIDs = activeTags.get()
  const tags = state.tags

  return Sheet(
    {
      open: ui.tagFilterOpen,
      title: tr("Фильтр по тегам"),
      onClose: closeTagFilter,
    },
    tags.length > 0
      ? Wrap(
          { gap: 6, fillWidth: true },
          ...tags.map((tag) =>
            Chip(
              {
                key: tag.ID,
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
          text: tr("Тегов пока нет."),
          size: 12,
          color: textColor(true),
        }),
    Button({ variant: "ghost", onClick: clearTagFilters }, tr("Сбросить теги")),
    Button({ variant: "ghost", onClick: closeTagFilter }, tr("Готово")),
  )
})
