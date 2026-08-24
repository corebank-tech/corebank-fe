import { accountHandlers } from "@/mocks/handlers/account"
import { authHandlers } from "@/mocks/handlers/auth"

export const handlers = [...accountHandlers, ...authHandlers]
