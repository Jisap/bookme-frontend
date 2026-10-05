import { describe, it, expect } from "vitest";
import {
  isSlotOverlapping,
  getSlotsForDay,
  formatTime,
  defaultSlot,
} from "../pages/AvailabilityPage";

describe("isSlotOverlapping", () => {
  const slots = [
    { startTime: "09:00", endTime: "10:00" },
    { startTime: "11:00", endTime: "12:00" },
  ];

  it("detects overlap inside existing slot", () => {
    expect(
      isSlotOverlapping(slots, { startTime: "09:30", endTime: "09:45" }, 2)
    ).toBe(true);
  });

  it("allows adjacent slot (end == start)", () => {
    expect(
      isSlotOverlapping(slots, { startTime: "10:00", endTime: "11:00" }, 2)
    ).toBe(false);
  });

  it("ignores the slot being edited", () => {
    expect(isSlotOverlapping(slots, slots[0], 0)).toBe(false);
  });

  it("detects partial overlap", () => {
    expect(
      isSlotOverlapping(slots, { startTime: "09:30", endTime: "11:30" }, 2)
    ).toBe(true);
  });
});

describe("getSlotsForDay", () => {
  it("returns saved slots when day exists", () => {
    const items = [{ dayOfWeek: 1, slots: [{ startTime: "08:00", endTime: "09:00" }] }];
    expect(getSlotsForDay(items, 1)).toEqual([{ startTime: "08:00", endTime: "09:00" }]);
  });

  it("returns default slot when day has no slots", () => {
    expect(getSlotsForDay([], 3)).toEqual([defaultSlot]);
    expect(getSlotsForDay([{ dayOfWeek: 3, slots: [] }], 3)).toEqual([defaultSlot]);
  });
});

describe("formatTime", () => {
  it("converts 24h to 12h", () => {
    expect(formatTime("14:30")).toBe("02:30 PM");
    expect(formatTime("09:00")).toBe("09:00 AM");
    expect(formatTime("00:15")).toBe("12:15 AM");
  });

  it("returns empty string for falsy input", () => {
    expect(formatTime("")).toBe("");
    expect(formatTime(null)).toBe("");
  });
});
