import {
  createListCollection,
  Flex,
  Grid,
  GridItem,
  Portal,
  Select,
  Splitter,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { faWarning } from "@fortawesome/free-solid-svg-icons/faWarning";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAtom, useAtomValue } from "jotai";
import { Suspense, useState } from "react";

import { ChallengeTrust } from "./ChallengeTrust.tsx";
import { challengeExamples } from "./examples.ts";
import { challengeAtom } from "./store/params.ts";
import { statusClassAtom } from "./store/simpleStatus.ts";
import { recognitionStateAtom } from "./store/trusted.ts";

const challenges = createListCollection({
  items: [
    { label: "⚠️ No challenge", value: "none" },
    ...Object.entries(challengeExamples).map(([value, { label }]) => ({ label, value })),
  ],
});

export default function ChallengePanel() {
  const [challenge, setChallenge] = useAtom(challengeAtom);
  const statusClass = useAtomValue(statusClassAtom);
  const recognitionState = useAtomValue(recognitionStateAtom);
  const [challengeSelection, setChallengeSelection] = useState<string[]>(
    challenge.trim() === "" ? ["none"] : [],
  );

  return (
    <Splitter.Panel
      id="challenge"
      display="grid"
      gridTemplateRows="max-content max-content 1fr max-content"
    >
      <Text className={statusClass} fontWeight="bold" paddingInline={3} paddingBlock={1}>
        Challenge
      </Text>
      <Select.Root
        collection={challenges}
        defaultValue={[]}
        value={challengeSelection}
        onValueChange={(e) => {
          setChallengeSelection(e.value);

          const newSelection = challengeExamples[e.value.join("!")];
          if (e.value.length === 1 && e.value[0] === "none") {
            setChallenge("");
          } else if (!newSelection) {
            console.error("invalid challenge selection", e.value);
          } else {
            setChallenge(newSelection.contents.trim());
          }
        }}
      >
        <Select.HiddenSelect />
        <Select.Label hidden={true}>SelectChallenge</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select a pre-defined challenge" />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content>
              {challenges.items
                // Only show "custom" in the dropdown when it's selected
                .filter((_, i) => i !== 1 || challengeSelection[0] === "custom")
                .map((challenge) => (
                  <Select.Item item={challenge} key={challenge.value}>
                    {challenge.label}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
      <Grid>
        {challenge.trim() === "" && (
          <GridItem gridArea="1/1" zIndex={0}>
            <Grid templateColumns="min-content 1fr">
              <FontAwesomeIcon
                className="fa-background"
                icon={faWarning}
                color="oklch(0.8804 0.1662 91.97)"
                size="10x"
              />
              <Flex
                flexDirection="column"
                paddingTop="var(--chakra-spacing-6)"
                paddingRight="var(--chakra-spacing-3)"
              >
                <Text fontSize="2rem" fontWeight="bold">
                  No Challenge
                </Text>
                <Text>
                  For full verification, paste a challenge here or select one from the menu above.
                </Text>
              </Flex>
            </Grid>
          </GridItem>
        )}
        {recognitionState?.type === "none" && (
          <GridItem gridArea="1/1" zIndex={0}>
            <FontAwesomeIcon
              icon={faWarning}
              className="fa-background failure-fa-background"
              size="10x"
            />
          </GridItem>
        )}
        <GridItem gridArea="1/1" zIndex="1" display="grid">
          <Textarea
            size="xs"
            resize="none"
            fontFamily="monospace"
            border="none"
            value={challenge}
            onChange={(e) => {
              setChallengeSelection(e.target.value.trim() === "" ? ["none"] : []);
              setChallenge(e.target.value);
            }}
          ></Textarea>
        </GridItem>
      </Grid>
      <Suspense>
        <ChallengeTrust />
      </Suspense>
    </Splitter.Panel>
  );
}
