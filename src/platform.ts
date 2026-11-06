import { platform } from "pulsar"

export const isAndroid = (): boolean => {
  return platform().os === "android"
}

export const isMac = (): boolean => {
  return platform().os === "darwin"
}
