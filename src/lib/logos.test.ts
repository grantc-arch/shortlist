import { describe, expect, it } from "vitest";
import { companyInitials, detectLogoType, initialsSvg, tileColour } from "./logos";

const bytes = (...b: number[]) => new Uint8Array([...b, ...Array(16).fill(0)]);

describe("detectLogoType", () => {
  it("recognises PNG, JPEG and WebP", () => {
    expect(detectLogoType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(detectLogoType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectLogoType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
  });
  it("rejects SVG, HTML and anything else", () => {
    expect(detectLogoType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(detectLogoType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(detectLogoType(new Uint8Array())).toBeNull();
  });
});

describe("companyInitials", () => {
  it("takes the first letters of the first two words", () => {
    expect(companyInitials("Old School")).toBe("OS");
    expect(companyInitials("Braamfontein Digital (demo)")).toBe("BD");
    expect(companyInitials("Lion's Head Marketing")).toBe("LH");
  });
  it("skips filler words and handles one word", () => {
    expect(companyInitials("The Bakery")).toBe("BA");
    expect(companyInitials("Woolworths")).toBe("WO");
    expect(companyInitials("")).toBe("?");
  });
});

describe("initials tile", () => {
  it("is stable per company and escapes the name", () => {
    expect(tileColour("abc")).toBe(tileColour("abc"));
    expect(initialsSvg("<b>&", "x")).not.toContain("<b>");
  });
});
