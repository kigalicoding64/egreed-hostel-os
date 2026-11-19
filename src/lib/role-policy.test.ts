import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { checkRoleChange, grantableRoles } from "./role-policy";

describe("role policy", () => {
  test("blocks changing your own roles", () => {
    assert.match(checkRoleChange(["super_admin"], "a", "a", [], ["receptionist"]) ?? "", /own/);
  });
  test("general manager cannot grant super_admin", () => {
    assert.notEqual(checkRoleChange(["general_manager"], "a", "b", [], ["super_admin"]), null);
  });
  test("general manager cannot grant hotel_owner", () => {
    assert.ok(!grantableRoles(["general_manager"]).includes("hotel_owner"));
  });
  test("general manager can grant receptionist", () => {
    assert.equal(checkRoleChange(["general_manager"], "a", "b", [], ["receptionist"]), null);
  });
  test("housekeeping manager only grants housekeeping staff", () => {
    assert.deepEqual(grantableRoles(["housekeeping_manager"]), ["housekeeping_staff"]);
  });
  test("manager cannot edit someone of equal tier", () => {
    assert.notEqual(checkRoleChange(["general_manager"], "a", "b", ["hotel_owner"], ["hotel_owner", "receptionist"]), null);
  });
  test("receptionist cannot manage staff", () => {
    assert.notEqual(checkRoleChange(["receptionist"], "a", "b", [], ["cashier"]), null);
  });
});
