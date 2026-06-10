import { beforeEach, describe, expect, it } from "vitest";

import { Queue } from "./queue.ts";

describe("queue iterator", () => {
  let q: Queue<string>;
  beforeEach(() => {
    q = new Queue();
  });

  it("should work if everything is on the back queue", () => {
    q.enq("A");
    q.enq("B");
    q.enq("C");
    q.enq("D");
    expect([...q]).toStrictEqual(["A", "B", "C", "D"]);
  });

  it("should work if everything is on the front queue", () => {
    q.enq("X");
    q.enq("A");
    q.enq("B");
    q.enq("C");
    q.enq("D");
    expect(q.deq()).toEqual("X");
    expect([...q]).toStrictEqual(["A", "B", "C", "D"]);
  });

  it("should work if everything is split between queues", () => {
    q.enq("X");
    q.enq("A");
    q.enq("B");
    expect(q.deq()).toEqual("X");
    q.enq("C");
    q.enq("D");
    expect([...q]).toStrictEqual(["A", "B", "C", "D"]);
  });
});
