import * as React from "react"
import type { Decorator, Preview } from "@storybook/react-vite"
import "../src/globals.css"

const WithTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === "dark" ? "dark" : "light"

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  return (
    <div className="bg-surface-elevated p-6 text-ink">
      <Story />
    </div>
  )
}

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
  globalTypes: {
    theme: {
      description: "CoreBank 색상 테마",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [WithTheme],
}

export default preview
