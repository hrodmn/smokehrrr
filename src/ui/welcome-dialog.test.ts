import { describe, expect, it } from "vitest";
import { shouldShowWelcome, WELCOME_DISMISSED_KEY } from "./WelcomeDialog";

function storageWith(value: string | null) {
  return {
    getItem: (key: string) => (key === WELCOME_DISMISSED_KEY ? value : null),
    setItem: () => undefined,
  };
}

describe("shouldShowWelcome", () => {
  it("shows until the welcome dialog has been dismissed", () => {
    expect(shouldShowWelcome(storageWith(null))).toBe(true);
    expect(shouldShowWelcome(storageWith("true"))).toBe(false);
  });
});
