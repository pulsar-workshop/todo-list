import {
  Box,
  Column,
  Icon,
  Row,
  Text,
  type ColorValue,
  type GradientOptions,
  type UiChild,
  type UiNode,
} from "pulsar"
import {
  accentFrom,
  accentTo,
  borderColor,
  hoverSurfaceColor,
  onAccentColor,
  surfaceColor,
  textColor,
} from "../theme.ts"

export const accentGradient = (): GradientOptions => ({
  from: accentFrom(),
  to: accentTo(),
  direction: "horizontal",
})

export const panel = (
  options: { key?: string; gap?: number },
  ...children: UiChild[]
): UiNode =>
  Column(
    {
      gap: 10,
      padding: 14,
      radius: 18,
      color: surfaceColor(),
      borderWidth: 1,
      borderColor: borderColor(),
      fillWidth: true,
      ...options,
    },
    ...children,
  )

export const sectionTitle = (text: string): UiNode =>
  Text({
    text,
    size: 11,
    weight: "semibold",
    color: accentFrom(),
    letterSpacing: 1.4,
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
  const size = options.size ?? 42

  return Column(
    {
      key: options.key,
      width: size,
      height: size,
      radius: Math.round(size * 0.32),
      color: surfaceColor(),
      borderWidth: 1,
      borderColor: borderColor(),
      justify: "center",
      alignItems: "center",
      pressed: { scale: 0.92, color: hoverSurfaceColor() },
      transition: { duration: 90 },
      onClick: options.onClick,
    },
    Icon({
      name: options.icon,
      size: Math.round(size * 0.48),
      color: options.color ?? textColor(false),
      badge: options.badge,
      badgeColor: accentTo(),
    }),
  )
}

export const accentButton = (options: {
  label?: string
  icon?: string
  size?: number
  onClick: () => void
}): UiNode =>
  Row(
    {
      height: options.size ?? 42,
      width: options.label ? undefined : (options.size ?? 42),
      paddingX: options.label ? 18 : 0,
      radius: 14,
      gap: 6,
      gradient: accentGradient(),
      justify: options.label ? undefined : "center",
      alignItems: "center",
      pressed: { scale: 0.95 },
      transition: { duration: 90 },
      onClick: options.onClick,
    },
    options.icon
      ? Icon({ name: options.icon, size: 22, color: onAccentColor() })
      : null,
    options.label
      ? Text({
          text: options.label,
          size: 14,
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
  Box(
    {
      key: options.key,
      radius: 13,
      padding: 1,
      color: options.selected ? undefined : borderColor(),
      gradient: options.selected ? accentGradient() : undefined,
      pressed: { scale: 0.96 },
      transition: { duration: 90 },
      onClick: options.onClick,
    },
    Row(
      { radius: 12, paddingX: 14, paddingY: 7, color: surfaceColor() },
      Text({
        text: options.label,
        size: 13,
        weight: options.selected ? "semibold" : "normal",
        color: textColor(!options.selected),
      }),
    ),
  )

export const roundCheck = (options: {
  done: boolean
  size?: number
  onToggle: () => void
}): UiNode => {
  const size = options.size ?? 24

  return Column(
    {
      width: 40,
      height: 40,
      justify: "center",
      alignItems: "center",
      pressed: { scale: 0.85 },
      transition: { duration: 90 },
      onClick: options.onToggle,
    },
    Column(
      {
        width: size,
        height: size,
        radius: size / 2,
        borderWidth: options.done ? 0 : 2,
        borderColor: textColor(true),
        gradient: options.done ? accentGradient() : undefined,
        justify: "center",
        alignItems: "center",
      },
      options.done
        ? Icon({ name: "check", size: size - 8, color: onAccentColor() })
        : null,
    ),
  )
}

export const metaItem = (
  key: string,
  icon: string,
  text: string,
  color: ColorValue = textColor(true),
): UiNode =>
  Row(
    { key, gap: 3, alignItems: "center" },
    Icon({ name: icon, size: 13, color }),
    Text({ text, size: 12, color }),
  )
