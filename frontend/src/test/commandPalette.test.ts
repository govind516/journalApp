import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setCommandPalette, useCommandPalette } from "@/lib/commandPalette";

describe("command palette store", () => {
  it("opens and closes, notifying subscribers", () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current).toBe(false);
    act(() => setCommandPalette(true));
    expect(result.current).toBe(true);
    act(() => setCommandPalette(false));
    expect(result.current).toBe(false);
  });
});
