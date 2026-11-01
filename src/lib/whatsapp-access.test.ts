import { describe, expect, test } from "bun:test";
import { hasStaffAccess, safeChatText } from "./whatsapp-access";

describe("staff-only WhatsApp access", () => {
  test("guest-only accounts cannot enter", () => {
    expect(hasStaffAccess(["guest_portal"])).toBe(false);
    expect(hasStaffAccess([])).toBe(false);
  });
  test("staff accounts can enter", () => {
    expect(hasStaffAccess(["receptionist"])).toBe(true);
    expect(hasStaffAccess(["housekeeping_staff"])).toBe(true);
    expect(hasStaffAccess(["kitchen_staff"])).toBe(true);
  });
  test("login credentials are hidden from chat history", () => {
    expect(safeChatText(" LOGIN example@example.com secret")).toBe("LOGIN ••••");
    expect(safeChatText("ROOM 101")).toBe("ROOM 101");
  });
});