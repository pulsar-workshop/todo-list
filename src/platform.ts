export const isAndroid = (): boolean => {
  return typeof Bun === "undefined";
};

export const isMac = (): boolean => {
  return typeof process !== "undefined" && process.platform === "darwin";
};
