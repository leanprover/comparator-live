import { Box, Flex, Grid, GridItem, Splitter, Text, useBreakpointValue } from "@chakra-ui/react";
import { useAtomValue } from "jotai";

import ChallengePanel from "./ChallengePanel.tsx";
import Header from "./Header.tsx";
import SolutionPanel from "./SolutionPanel.tsx";
import { projectAtom, projectSelectionAtom } from "./store/params.ts";
import { statusClassAtom } from "./store/simpleStatus.ts";
import { borderForStatus } from "./utils/style.ts";
import Verifier from "./Verifier.tsx";

export default function App() {
  const project = useAtomValue(projectAtom);
  const projectSelection = useAtomValue(projectSelectionAtom);
  const statusClass = useAtomValue(statusClassAtom);
  const orientation = useBreakpointValue<"horizontal" | "vertical">({
    base: "vertical",
    md: "horizontal",
  });

  return (
    <Grid h="100vh" templateRows={"min-content 1fr max-content"}>
      <Header />
      <GridItem position="relative">
        <Box
          position="relative"
          width="100%"
          height="100%"
          opacity={projectSelection === "unknown" ? 0.35 : 1}
          inert={projectSelection === "unknown"}
        >
          <Splitter.Root
            orientation={orientation}
            style={{ borderBlock: borderForStatus(statusClass) }}
            panels={[{ id: "challenge" }, { id: "solution" }]}
          >
            <ChallengePanel />
            <Splitter.ResizeTrigger id="challenge:solution">
              <Splitter.ResizeTriggerSeparator className={statusClass + "-bg"} />
              <Splitter.ResizeTriggerIndicator className={statusClass + "-bg"} />
            </Splitter.ResizeTrigger>
            <SolutionPanel />
          </Splitter.Root>
        </Box>
        {projectSelection === "unknown" && (
          <Flex position="absolute" inset="0" align="center" justify="center" pointerEvents="none">
            <Box
              pointerEvents="auto"
              bg="bg.panel"
              borderWidth="1px"
              borderColor="border"
              borderRadius="lg"
              shadow="lg"
              padding="6"
            >
              <Text>The project "{project}" is not supported</Text>
              <Text>Select a different project from the header menu to continue.</Text>
            </Box>
          </Flex>
        )}
      </GridItem>
      {projectSelection !== "unknown" && <Verifier />}
    </Grid>
  );
}
