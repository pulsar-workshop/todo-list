import {
  Column,
  Icon,
  Row,
  Text,
  type ColorValue,
  type UiChild,
  type UiNode,
} from "pulsar"
import {
  accentColor,
  borderColor,
  hoverSurfaceColor,
  onAccentColor,
  textColor,
} from "../theme.ts"

export const section = (
  options: { key?: string; gap?: number; paddingTop?: number },
  ...children: UiChild[]
): UiNode => Column({ gap: 8, fillWidth: true, ...options }, ...children)

export const sectionTitle = (text: string): UiNode =>
  Text({
    text,
    size: 10,
    weight: "medium",
    color: textColor(true),
    letterSpacing: 1.2,
  })

export const iconTile = (options: {
  key?: string
  icon: string
  tooltip?: string
  color?: ColorValue
  badge?: number
  size?: number
  onClick: () => void
}): UiNode => {
  const size = options.size ?? 36

  return Column(
    {
      key: options.key,
      width: size,
      height: size,
      radius: 8,
      a11yLabel: options.tooltip,
      justify: "center",
      alignItems: "center",
      pressed: { color: hoverSurfaceColor() },
      transition: { duration: 80 },
      onClick: options.onClick,
    },
    Icon({
      name: options.icon,
      size: 20,
      color: options.color ?? textColor(true),
      badge: options.badge,
      badgeColor: accentColor(),
    }),
  )
}

export const accentButton = (options: {
  label?: string
  icon?: string
  onClick: () => void
}): UiNode =>
  Row(
    {
      height: 36,
      width: options.label ? undefined : 36,
      paddingX: options.label ? 14 : 0,
      radius: 8,
      color: accentColor(),
      justify: options.label ? undefined : "center",
      alignItems: "center",
      pressed: { opacity: 0.8 },
      transition: { duration: 80 },
      onClick: options.onClick,
    },
    options.icon
      ? Icon({ name: options.icon, size: 20, color: onAccentColor() })
      : null,
    options.label
      ? Text({
          text: options.label,
          size: 13,
          weight: "semibold",
          color: onAccentColor(),
        })
      : null,
  )

export const pill = (options: {
  key: string
  label: string
  selected: boolean
  onClick: () => void
}): UiNode =>
  Row(
    {
      key: options.key,
      radius: 8,
      paddingX: 10,
      paddingY: 5,
      borderWidth: 1,
      borderColor: options.selected ? accentColor() : borderColor(),
      pressed: { color: hoverSurfaceColor() },
      transition: { duration: 80 },
      onClick: options.onClick,
    },
    Text({
      text: options.label,
      size: 12,
      weight: options.selected ? "medium" : "normal",
      color: textColor(!options.selected),
    }),
  )

export const squareCheck = (options: {
  done: boolean
  onToggle: () => void
}): UiNode =>
  Column(
    {
      width: 40,
      height: 40,
      justify: "center",
      alignItems: "center",
      onClick: options.onToggle,
    },
    Column(
      {
        width: 20,
        height: 20,
        radius: 4,
        borderWidth: options.done ? 0 : 1,
        borderColor: textColor(true),
        color: options.done ? accentColor() : "transparent",
        justify: "center",
        alignItems: "center",
      },
      options.done
        ? Icon({ name: "check", size: 16, color: onAccentColor() })
        : null,
    ),
  )

export const metaItem = (
  key: string,
  icon: string,
  text: string,
  color: ColorValue = textColor(true),
): UiNode =>
  Row(
    { key, gap: 3, alignItems: "center" },
    Icon({ name: icon, size: 12, color }),
    Text({ text, size: 11, color }),
  )
