import { Input, Row, component, signal } from "pulsar"
import { accentFrom, surfaceColor, textColor } from "../theme.ts"
import { accentButton } from "./kit.ts"

export const Composer = component<{
  placeholder: string
  autoFocus?: boolean
  onBlur?: () => void
  onSubmit: (text: string) => void
}>((props) => {
  const text = signal("")

  const submit = (): void => {
    const value = text.peek().trim()

    if (!value) return

    props.onSubmit(value)
    text.set("")
  }

  return () => {
    return Row(
      {
        gap: 6,
        padding: 6,
        radius: 20,
        color: surfaceColor(),
        borderWidth: 1,
        borderColor: accentFrom(),
        elevation: 3,
        shadowColor: accentFrom(),
        fillWidth: true,
        alignItems: "center",
      },
      Input({
        value: text.get(),
        placeholder: props.placeholder,
        variant: "outline",
        borderColor: "transparent",
        focusBorderColor: "transparent",
        textColor: textColor(false),
        expand: true,
        autoFocus: props.autoFocus,
        onInput: (value) => text.set(value),
        onSubmitted: submit,
        onBlur: props.onBlur,
      }),
      accentButton({ icon: "arrow_upward", onClick: submit }),
    )
  }
})
