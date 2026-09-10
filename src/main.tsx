import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router"
import { AppProviders } from "@/app/providers/app-providers"
import { router } from "@/app/routes"
import "@/globals.css"

const enableMocking = async (): Promise<void> => {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW !== "true") return
  const { worker } = await import("@/mocks/browser")
  await worker.start({ onUnhandledRequest: "bypass" })
}

const root = ReactDOM.createRoot(document.getElementById("root")!)

enableMocking().then(() => {
  root.render(
    <React.StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </React.StrictMode>,
  )
})
