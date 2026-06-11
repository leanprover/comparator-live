import {
  Box,
  Button,
  CloseButton,
  Code,
  Dialog,
  Grid,
  Portal,
  Strong,
  Text,
} from "@chakra-ui/react";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faQuestion } from "@fortawesome/free-solid-svg-icons/faQuestion";
import { FontAwesomeIcon, type FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import { useAtomValue, useSetAtom } from "jotai";
import { type JSX, useState } from "react";

import { statusClassAtom } from "./store/simpleStatus.ts";
import { recognitionStateAtom } from "./store/trusted.ts";
import {
  comparatorJobParamsAtom,
  comparatorResultAtom,
  isComparatorSyncedAtom,
} from "./store/verifier.ts";
import { oxford } from "./utils/language.tsx";

export default function Verifier() {
  const statusClass = useAtomValue(statusClassAtom);
  const isComparatorSynced = useAtomValue(isComparatorSyncedAtom);
  const comparatorResult = useAtomValue(comparatorResultAtom);
  const recognitionState = useAtomValue(recognitionStateAtom);
  const reset = useSetAtom(comparatorJobParamsAtom);
  const [isOpen, setIsOpen] = useState(false);

  let status: JSX.Element;
  let action: JSX.Element | null;
  if (
    !isComparatorSynced ||
    comparatorResult.type === "not-found" ||
    comparatorResult.type === "connection-lost"
  ) {
    if (isComparatorSynced) {
      status = (
        <Box paddingLeft="3" paddingBlock="3" marginBlock="auto">
          <Strong>Job Lost.</Strong> This can happen when the server restarts; re-running
          verification or reloading the page should help.
        </Box>
      );
    } else if (comparatorResult.type === "not-found") {
      status = (
        <Text paddingLeft="3" paddingBlock="1" marginBlock="auto">
          <Strong>Not Verified.</Strong> Press the button to request verification.
        </Text>
      );
    } else if (comparatorResult.type === "connection-lost") {
      status = (
        <Text paddingLeft="3" paddingBlock="1" marginBlock="auto">
          <Strong>Connection Lost.</Strong> Press the button to restart request.
        </Text>
      );
    }
    action = (
      <Button size="2xl" marginInline="3" marginBlock="1" onClick={() => reset()}>
        Run Verification
      </Button>
    );
  } else if (comparatorResult.type === "verification-failed") {
    status = (
      <Box paddingLeft="3" paddingBlock="1" marginBlock="auto">
        <Strong>Failed.</Strong> There are problems with this solution:{" "}
        {comparatorResult.description}
      </Box>
    );
    action = (
      <>
        <Button size="2xl" marginInline="3" marginBlock="1" onClick={(e) => setIsOpen(true)}>
          See Errors
        </Button>
        <Dialog.Root role="dialog" open={isOpen} size="xl" onOpenChange={(e) => setIsOpen(e.open)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.CloseTrigger asChild>
                  <CloseButton />
                </Dialog.CloseTrigger>
                <Dialog.Header>
                  <Dialog.Title>{comparatorResult.description}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Code as="pre" overflowX="auto" width="100%">
                    {comparatorResult.output ?? "No output generated"}
                  </Code>
                </Dialog.Body>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </>
    );
  } else {
    let icon: FontAwesomeIconProps["icon"];
    switch (comparatorResult.type) {
      case "initial-load":
      case "in-preparation":
      case "in-progress":
      case "in-queue": {
        status = (
          <Box paddingLeft="3" paddingBlock="3" marginBlock="auto">
            <Text>Verifying that the solution solves the challenge with comparator.</Text>
            {comparatorResult.type === "in-preparation" && <Text>Loading...</Text>}
            {comparatorResult.type === "in-queue" && (
              <Text>
                Waiting in queue ({comparatorResult.position === 0 && "next in line"}
                {comparatorResult.position > 0 && `#${comparatorResult.position + 1} in line`})...
              </Text>
            )}
            {comparatorResult.type === "in-progress" && <Text>Currently running...</Text>}
          </Box>
        );
        icon = faQuestion;
        break;
      }

      case "verification-ok": {
        status = (
          <Box paddingLeft="3" paddingBlock="3" marginBlock="auto">
            {comparatorResult.theoremNames.length === 0 && (
              <>
                <Strong>Internal Consistency of Solution Verified.</Strong> Lean's kernel verified
                that the solution makes sense, but there are no theorems stated in the challenge.
                Therefore, it's not possible to verify the contents of the solution against a
                challenge.
              </>
            )}
            {comparatorResult.theoremNames.length > 0 && (
              <>
                <Strong>
                  {recognitionState?.type === "none"
                    ? "Successfully validated against untrusted challenge."
                    : recognitionState?.type === "user"
                      ? "Successfully validated against locally-trusted challenge."
                      : "Success."}
                </Strong>{" "}
                Lean's kernel verified that the solution proves the claims described in the
                challenge's theorem{comparatorResult.theoremNames.length > 1 && "s"} (
                {oxford(
                  comparatorResult.theoremNames
                    .toSorted((a, b) => a.localeCompare(b))
                    .map((name) => ({
                      key: name,
                      elem: <Code>{name}</Code>,
                    })),
                )}
                )
                {recognitionState?.type === "none" &&
                  ", but it is possible that the challenge does not describe the theorems it appears to describe. This usually happens due to subtle oversights in the formalization statement, but it can also result from dishonest use of Lean's powerful syntax extensions"}
                {recognitionState?.type === "user" &&
                  `, and you have chosen to trust that this challenge correctly describes the theorem${comparatorResult.theoremNames.length > 1 ? "s" : ""} it purports to describe`}
                {recognitionState?.type === "built-in" && ", and the challenge is recognized"}.
              </>
            )}
          </Box>
        );
        icon = faCheck;
        break;
      }
    }
    action = (
      <FontAwesomeIcon
        size="3x"
        style={{ padding: "var(--chakra-spacing-3)", marginBlock: "auto" }}
        icon={icon}
        className={statusClass}
      />
    );
  }

  return (
    <Grid className={statusClass + "-bg"} templateColumns="1fr max-content">
      {status}
      {action}
    </Grid>
  );
}
