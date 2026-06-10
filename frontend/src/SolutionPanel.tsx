import { Grid, GridItem, Splitter, Text, Textarea } from "@chakra-ui/react";
import { faX } from "@fortawesome/free-solid-svg-icons/faX";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAtom, useAtomValue } from "jotai";

import { solutionAtom } from "./store/params.ts";
import { statusClassAtom } from "./store/simpleStatus.ts";
import { comparatorResultAtom, isComparatorSyncedAtom } from "./store/verifier.ts";

export default function SolutionPanel() {
  const [solution, setSolution] = useAtom(solutionAtom);
  const statusClass = useAtomValue(statusClassAtom);
  const isComparatorSynced = useAtomValue(isComparatorSyncedAtom);
  const comparatorResult = useAtomValue(comparatorResultAtom);

  return (
    <Splitter.Panel id="solution" display="grid" gridTemplateRows="max-content 1fr">
      <Text
        className={statusClass}
        fontWeight="bold"
        paddingInline="var(--chakra-spacing-3)"
        paddingBlock="var(--chakra-spacing-1)"
      >
        Candidate Solution
      </Text>
      <Grid>
        {isComparatorSynced && comparatorResult.type === "verification-failed" && (
          <GridItem gridArea="1/1" zIndex={0}>
            <FontAwesomeIcon
              style={{
                paddingTop: "var(--chakra-spacing-3)",
                marginTop: "var(--chakra-spacing-3)",
              }}
              icon={faX}
              color="oklch(0.8086 0.151 27.77)"
              size="10x"
            />
          </GridItem>
        )}{" "}
        <GridItem gridArea="1/1" zIndex="1" display="grid">
          <Textarea
            size="xs"
            resize="none"
            fontFamily="monospace"
            border="none"
            value={solution}
            onChange={(e) => {
              setSolution(e.target.value);
            }}
          ></Textarea>
        </GridItem>
      </Grid>
    </Splitter.Panel>
  );
}
