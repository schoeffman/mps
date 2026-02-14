import { describe, it, expect } from "vitest";
import { scheduleIssues, type JiraIssue, type Assignment } from "./gantt-scheduler";

function makeIssue(key: string, opts?: Partial<JiraIssue>): JiraIssue {
  return {
    key,
    summary: `Summary for ${key}`,
    status: "To Do",
    statusColor: "blue-gray",
    assignee: null,
    storyPoints: null,
    ...opts,
  };
}

function makeAssignment(
  name: string,
  ranges: { start: string; end: string }[]
): Assignment {
  return {
    user: { id: 1, fullName: name },
    dateRanges: ranges,
  };
}

describe("scheduleIssues", () => {
  it("returns empty when no assignments", () => {
    const issues = [makeIssue("PROJ-1")];
    const result = scheduleIssues(issues, []);
    expect(result.scheduled).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(1);
  });

  it("excludes done (green) issues", () => {
    const issues = [
      makeIssue("PROJ-1", { statusColor: "green" }),
      makeIssue("PROJ-2"),
    ];
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-06", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled).toHaveLength(1);
    expect(result.scheduled[0].id).toBe("PROJ-2");
  });

  it("schedules a single issue for 3 business days", () => {
    const issues = [makeIssue("PROJ-1")];
    // Mon Jan 6 to Fri Jan 31
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-06", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled).toHaveLength(1);
    expect(result.unscheduled).toHaveLength(0);
    const task = result.scheduled[0];
    expect(task.start).toBe("2025-01-06"); // Monday
    expect(task.end).toBe("2025-01-08"); // Wednesday (3 business days: Mon, Tue, Wed)
    expect(task.assignee).toBe("Alice");
    expect(task.progress).toBe(0);
  });

  it("skips weekends", () => {
    const issues = [makeIssue("PROJ-1")];
    // Thu Jan 2 2025
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-02", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    const task = result.scheduled[0];
    // Thu Jan 2, Fri Jan 3, skip Sat/Sun, Mon Jan 6
    expect(task.start).toBe("2025-01-02");
    expect(task.end).toBe("2025-01-06");
  });

  it("distributes issues across multiple team members", () => {
    const issues = [makeIssue("PROJ-1"), makeIssue("PROJ-2")];
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-06", end: "2025-01-31" }]),
      makeAssignment("Bob", [{ start: "2025-01-06", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled).toHaveLength(2);
    const assignees = result.scheduled.map((t) => t.assignee).sort();
    expect(assignees).toEqual(["Alice", "Bob"]);
    // Both should start on the same day since they have the same earliest date
    expect(result.scheduled[0].start).toBe("2025-01-06");
    expect(result.scheduled[1].start).toBe("2025-01-06");
  });

  it("sequences issues for same team member", () => {
    const issues = [makeIssue("PROJ-1"), makeIssue("PROJ-2")];
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-06", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled).toHaveLength(2);
    // First task: Mon-Wed, second task: Thu-Mon (skip weekend)
    expect(result.scheduled[0].start).toBe("2025-01-06");
    expect(result.scheduled[0].end).toBe("2025-01-08");
    expect(result.scheduled[1].start).toBe("2025-01-09");
    expect(result.scheduled[1].end).toBe("2025-01-13");
  });

  it("handles gaps between date ranges", () => {
    const issues = [makeIssue("PROJ-1"), makeIssue("PROJ-2")];
    // First range: Jan 6-8 (Mon-Wed, exactly 3 days), then gap, then Jan 20+
    // Jan 20 2025 is MLK Day, so second task starts Jan 21
    const assignments = [
      makeAssignment("Alice", [
        { start: "2025-01-06", end: "2025-01-08" },
        { start: "2025-01-20", end: "2025-01-31" },
      ]),
    ];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled).toHaveLength(2);
    expect(result.scheduled[0].end).toBe("2025-01-08");
    expect(result.scheduled[1].start).toBe("2025-01-21");
  });

  it("marks excess issues as unscheduled", () => {
    const issues = [makeIssue("PROJ-1"), makeIssue("PROJ-2"), makeIssue("PROJ-3")];
    // Only room for 1 task (3 business days)
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-06", end: "2025-01-08" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled).toHaveLength(1);
    expect(result.unscheduled).toHaveLength(2);
  });

  it("assigns different task types per team member", () => {
    const issues = [makeIssue("PROJ-1"), makeIssue("PROJ-2")];
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-06", end: "2025-01-31" }]),
      makeAssignment("Bob", [{ start: "2025-01-06", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    const types = result.scheduled.map((t) => t.type);
    expect(types[0]).not.toBe(types[1]);
  });

  it("truncates long summaries", () => {
    const issues = [
      makeIssue("PROJ-1", {
        summary: "This is a very long summary that should be truncated to fit",
      }),
    ];
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-06", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled[0].text.length).toBeLessThanOrEqual(
      "PROJ-1: ".length + 40
    );
    expect(result.scheduled[0].text).toContain("...");
  });

  it("handles assignment with no date ranges", () => {
    const issues = [makeIssue("PROJ-1")];
    const assignments = [makeAssignment("Alice", [])];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(1);
  });

  it("assigns to earliest available team member", () => {
    const issues = [makeIssue("PROJ-1")];
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-13", end: "2025-01-31" }]),
      makeAssignment("Bob", [{ start: "2025-01-06", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled[0].assignee).toBe("Bob");
    expect(result.scheduled[0].start).toBe("2025-01-06");
  });

  it("skips start date that falls on weekend", () => {
    const issues = [makeIssue("PROJ-1")];
    // Jan 4 2025 is a Saturday
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-04", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled[0].start).toBe("2025-01-06"); // Monday
  });

  it("uses story points as duration (1 point = 1 day)", () => {
    const issues = [makeIssue("PROJ-1", { storyPoints: 5 })];
    // Mon Jan 6 to Fri Jan 31
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-06", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled).toHaveLength(1);
    const task = result.scheduled[0];
    expect(task.start).toBe("2025-01-06"); // Monday
    expect(task.end).toBe("2025-01-10"); // Friday (5 business days)
  });

  it("uses 1 story point for a single-day task", () => {
    const issues = [makeIssue("PROJ-1", { storyPoints: 1 })];
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-06", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    const task = result.scheduled[0];
    expect(task.start).toBe("2025-01-06");
    expect(task.end).toBe("2025-01-06"); // same day
  });

  it("sequences tasks with different story points", () => {
    const issues = [
      makeIssue("PROJ-1", { storyPoints: 2 }),
      makeIssue("PROJ-2", { storyPoints: 1 }),
    ];
    const assignments = [
      makeAssignment("Alice", [{ start: "2025-01-06", end: "2025-01-31" }]),
    ];
    const result = scheduleIssues(issues, assignments);
    expect(result.scheduled[0].start).toBe("2025-01-06");
    expect(result.scheduled[0].end).toBe("2025-01-07"); // 2 days: Mon-Tue
    expect(result.scheduled[1].start).toBe("2025-01-08"); // Wed
    expect(result.scheduled[1].end).toBe("2025-01-08"); // 1 day: Wed
  });
});
