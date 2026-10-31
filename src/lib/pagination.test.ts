import { describe, expect, it } from "vitest";
import { pageNumbers, paginate, parsePerPage } from "./pagination";

describe("paginate", () => {
  it("slices the right items", () => {
    expect(paginate(40, 2, 16)).toEqual({ page: 2, pages: 3, start: 16, end: 32 });
    expect(paginate(40, 3, 16)).toEqual({ page: 3, pages: 3, start: 32, end: 40 });
  });

  it("snaps impossible pages to a real one", () => {
    expect(paginate(40, 99, 16).page).toBe(3);
    expect(paginate(40, -2, 16).page).toBe(1);
    expect(paginate(40, "abc", 16).page).toBe(1);
    expect(paginate(0, 1, 16)).toEqual({ page: 1, pages: 1, start: 0, end: 0 });
  });

  it("only allows the offered page sizes", () => {
    expect(parsePerPage("32")).toBe(32);
    expect(parsePerPage("1000")).toBe(16);
    expect(parsePerPage(undefined)).toBe(16);
  });
});

describe("pageNumbers", () => {
  it("lists every page when there are only a few", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("skips the middle of long runs", () => {
    expect(pageNumbers(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
    expect(pageNumbers(1, 20)).toEqual([1, 2, "gap", 20]);
    expect(pageNumbers(20, 20)).toEqual([1, "gap", 19, 20]);
  });

  it("never hides a single page behind a gap", () => {
    expect(pageNumbers(4, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
  });
});
