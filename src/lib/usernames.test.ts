import { describe, expect, it } from "vitest";
import { normaliseUsername, usernameFromName, usernameProblem } from "./usernames";

describe("usernames", () => {
  it("tidies what people type", () => {
    expect(normaliseUsername("  @Lerato_M ")).toBe("lerato_m");
  });

  it("accepts sensible usernames", () => {
    expect(usernameProblem("lerato_m")).toBeNull();
    expect(usernameProblem("old_school_b2b")).toBeNull();
    expect(usernameProblem("ab1")).toBeNull();
  });

  it("explains what's wrong", () => {
    expect(usernameProblem("ab")).toMatch(/at least 3/);
    expect(usernameProblem("a".repeat(21))).toMatch(/20 characters/);
    expect(usernameProblem("_lerato")).toMatch(/starting with a letter/);
    expect(usernameProblem("lerato m")).toMatch(/lower-case letters/);
    expect(usernameProblem("admin")).toMatch(/reserved/);
  });

  it("suggests one from a name", () => {
    expect(usernameFromName("Lerato Mokoena")).toBe("lerato_mokoena");
    expect(usernameFromName("Lion's Head Marketing (demo)")).toBe("lion_s_head_mar");
    expect(usernameFromName("Zoë")).toMatch(/^zoe$/);
    expect(usernameFromName("Al")).toMatch(/^al_\d{4}$/);
    expect(usernameFromName("!!!")).toMatch(/^user_\d{4}$/);
    for (const n of ["Lerato Mokoena", "Al", "Lion's Head Marketing (demo)", "Ünïcødé Näme Here Long"]) {
      expect(usernameProblem(usernameFromName(n))).toBeNull();
    }
  });
});
