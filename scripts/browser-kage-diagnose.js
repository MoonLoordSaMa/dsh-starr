return {
  errors: globalThis.kageErrors,
  console: globalThis.kageConsole,
  view: await tabbit.observe({ frames: "none", maxChars: 3000 }),
};
