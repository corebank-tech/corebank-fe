/** @type {import('prettier').Config} */
export default {
  semi: true,
  endOfLine: "lf",
  singleQuote: true,
  tabWidth: 2,
  trailingComma: "all",
  printWidth: 100,

  plugins: ["prettier-plugin-tailwindcss"],
  tailwindFunctions: ["cva", "cn"],
};
