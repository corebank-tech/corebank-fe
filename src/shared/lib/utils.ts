import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Register custom font-size utilities (from the --text-* theme tokens) so
// tailwind-merge classifies them as font sizes and never confuses them with
// text-color utilities like `text-primary-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["page", "h2"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
