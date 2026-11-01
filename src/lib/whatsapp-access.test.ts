import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { hasStaffAccess, safeChatText } from "./whatsapp-access";

describe("staff-only WhatsApp access", () => {
  test("guest-only accounts cannot enter", () => {
    assert.equal(hasStaffAccess(["guest_portal"]), false);
    assert.equal(hasStaffAccess([]), false);
  });
  test("staff accounts can enter", () => {
    assert.equal(hasStaffAccess(["receptionist"]), true);
    assert.equal(hasStaffAccess(["housekeeping_staff"]), true);
    assert.equal(hasStaffAccess(["kitchen_staff"]), true);
  });
  test("login credentials are hidden from chat history", () => {
    assert.equal(safeChatText(" LOGIN example@example.com secret"), "LOGIN ••••");
    assert.equal(safeChatText("ROOM 101"), "ROOM 101");
  });
});