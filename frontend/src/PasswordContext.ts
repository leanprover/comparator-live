import { createContext, useContext } from "react";

export const PasswordContext = createContext<string | null>(null);

/**
 * @returns The password stored in the PasswordContext
 * @throws if there's no PasswordContext active
 */
export function usePasswordContext(): string {
  const context = useContext(PasswordContext);
  if (context === null) {
    throw new Error("`usePasswordContext` hook used outside the scope of a `PasswordContext`.");
  }

  return context;
}
