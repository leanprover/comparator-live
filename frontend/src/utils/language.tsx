import { Span } from "@chakra-ui/react";
import type { JSX } from "react";

/**
 * Oxford-comma-separate a sequence of elements. Must be nonempty.
 *
 * @throws on an empty list.
 */
export function oxford(list: { key: string; elem: JSX.Element }[]): JSX.Element {
  if (list.length === 1) {
    return list[0]!.elem;
  }

  if (list.length === 2) {
    return (
      <>
        {list[0]!.elem} and {list[1]!.elem}
      </>
    );
  }

  const final = list.pop()!;
  return (
    <>
      {list.map(({ key, elem }) => (
        <Span key={key}>{elem}, </Span>
      ))}{" "}
      and {final.elem}
    </>
  );
}
