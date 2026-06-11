import {
  CloseButton,
  Dialog,
  Em,
  Flex,
  Grid,
  GridItem,
  IconButton,
  Link,
  Menu,
  Portal,
  Select,
  Text,
} from "@chakra-ui/react";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons/faArrowUpRightFromSquare";
import { faBars } from "@fortawesome/free-solid-svg-icons/faBars";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons/faCircleInfo";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons/faPenToSquare";
import { faShield } from "@fortawesome/free-solid-svg-icons/faShield";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";

import {
  defaultProjectAtom,
  leanConfigsAtom,
  projectAtom,
  projectSelectionAtom,
} from "./store/params.ts";
import { statusClassAtom } from "./store/simpleStatus.ts";
import { LIVE_LEAN_URI } from "./utils/consts.ts";

export default function Header() {
  const defaultProject = useAtomValue(defaultProjectAtom);
  const leanConfigs = useAtomValue(leanConfigsAtom);
  const statusClass = useAtomValue(statusClassAtom);
  const [project, setProject] = useAtom(projectAtom);
  const projectSelection = useAtomValue(projectSelectionAtom);
  const [openAbout, setOpenAbout] = useState(false);

  return (
    <Grid
      templateRows={{ base: "1fr 1fr", md: "1fr" }}
      templateColumns={{
        base: "max-content 1fr max-content",
        md: "max-content 1fr 300px max-content",
      }}
    >
      <svg
        className={statusClass}
        style={{ paddingInline: "0.7rem", marginBlock: "auto", height: "1rem", width: "auto" }}
        viewBox="0 0 486 169"
        xmlns="http://www.w3.org/2000/svg"
        fill="transparent"
        strokeWidth="10"
      >
        <path
          d="M206.333 5.67949H105.667M206.333 5.67949L243.25 84.5M206.333 5.67949V84.5M243.25 84.5H317.549M243.25 84.5L279.667 163.321L280.889 163.318L317.549 84.5M206.333 84.5V163.321H5V5M206.333 84.5H105.667M317.549 84.5L353 5.67949M353 5.67949V164M353 5.67949H353.667L480.333 163.454H481V5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          color="currentColor"
        ></path>
      </svg>
      <Text marginBlock="auto" flexGrow="1" className={statusClass}>
        Comparator Live <Em>(Experimental)</Em>
      </Text>
      <GridItem colSpan={{ base: 3, md: 1 }}>
        <Flex>
          <Select.Root
            collection={leanConfigs}
            disabled={!defaultProject}
            value={[projectSelection]}
            onValueChange={(e) => {
              if (e.value.length !== 1) return;
              setProject(e.value[0]!);
            }}
          >
            <Select.HiddenSelect />
            <Select.Label hidden={true}>Select Lean Project Configuration</Select.Label>
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="Select project configuration" />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {leanConfigs.items
                    .filter((leanConfig) => {
                      if (leanConfig.value === "unknown") return projectSelection === "unknown";
                      if (leanConfig.value === "loading") return projectSelection === "loading";
                      return true;
                    })
                    .map((leanConfig) => (
                      <Select.Item item={leanConfig} key={leanConfig.value}>
                        {leanConfig.value === "unknown"
                          ? `Unsupported project "${project}"`
                          : leanConfig.label}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>
        </Flex>
      </GridItem>
      <GridItem gridArea={{ base: "1/3", md: "1/4" }}>
        <Menu.Root>
          <Menu.Trigger asChild>
            <IconButton variant="ghost">
              <FontAwesomeIcon icon={faBars} />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item value="about" onSelect={() => setOpenAbout(true)}>
                  <FontAwesomeIcon icon={faCircleInfo} /> About Comparator
                </Menu.Item>
                <Menu.Item
                  value="edit"
                  onSelect={() => {
                    window.navigation.navigate(LIVE_LEAN_URI + window.location.hash);
                  }}
                >
                  <FontAwesomeIcon icon={faPenToSquare} /> Edit in Live Lean
                </Menu.Item>
                <Menu.Item value="lean-community" asChild>
                  <a href="https://leanprover-community.github.io/" target="_blank">
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} /> Lean community
                  </a>
                </Menu.Item>
                <Menu.Item value="lean-fro" asChild>
                  <a href="https://lean-lang.org/fro/" target="_blank">
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} /> Lean FRO
                  </a>
                </Menu.Item>
                <Menu.Item value="github" asChild>
                  <a href="https://github.com/leanprover/comparator-live/" target="_blank">
                    <FontAwesomeIcon icon={faGithub} /> GitHub
                  </a>
                </Menu.Item>
                <Menu.Item value="privacy" asChild>
                  <a href="https://lean-lang.org/privacy/" target="_blank">
                    <FontAwesomeIcon icon={faShield} /> Privacy Policy
                  </a>
                </Menu.Item>
                <Menu.Item value="tos" asChild>
                  <a href="https://lean-lang.org/terms/" target="_blank">
                    <FontAwesomeIcon icon={faShield} /> Terms of use
                  </a>
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </GridItem>
      <Dialog.Root lazyMount open={openAbout} size="lg" onOpenChange={(e) => setOpenAbout(e.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
              <Dialog.Header>
                <Dialog.Title>About Comparator</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body display="flex" flexDir="column" gap="2">
                <Text>
                  Comparator Live is an online version of Lean's{" "}
                  <Link
                    href="https://github.com/leanprover/comparator"
                    target="_blank"
                    colorPalette="teal"
                  >
                    Comparator verification tool
                  </Link>
                  .
                </Text>
                <Text>
                  More details can be found in the reference manual page on{" "}
                  <Link
                    href="https://lean-lang.org/doc/reference/latest/ValidatingProofs/"
                    target="_blank"
                    colorPalette="teal"
                  >
                    Validating a Lean Proof
                  </Link>
                  .
                </Text>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Grid>
  );
}
