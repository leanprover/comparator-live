import { Box, Flex, Grid, GridItem, Splitter, Text, useBreakpointValue } from "@chakra-ui/react";
import { useAtomValue } from "jotai";

import ChallengePanel from "./ChallengePanel.tsx";
import Header from "./Header.tsx";
import SolutionPanel from "./SolutionPanel.tsx";
import { interfaceDisabledAtom } from "./store/params.ts";
import { statusClassAtom } from "./store/simpleStatus.ts";
import { borderForStatus } from "./utils/style.ts";
import Verifier from "./Verifier.tsx";

export default function App() {
  const interfaceDisabled = useAtomValue(interfaceDisabledAtom);
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
          opacity={interfaceDisabled ? 0.35 : 1}
          inert={!!interfaceDisabled}
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
        {interfaceDisabled && (
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
              {interfaceDisabled.map((text, i) => (
                <Text key={i}>{text}</Text>
              ))}
            </Box>
          </Flex>
        )}
      </GridItem>
      {!interfaceDisabled && <Verifier />}
    </Grid>
  );
}
