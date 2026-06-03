import { Box, Button, Em, Grid, Link, Span, Text } from "@chakra-ui/react";
import { faWarning } from "@fortawesome/free-solid-svg-icons/faWarning";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { produce } from "immer";
import { useAtom, useAtomValue } from "jotai";

import { challengeAtom } from "./store/params.ts";
import { challengeHashAtom, locallyTrustedAtom, recognitionAtom } from "./store/trusted.ts";
import { borderForStatus, type SimpleStatus } from "./utils/style.ts";

export function ChallengeTrust() {
  const recognition = useAtomValue(recognitionAtom);
  const challenge = useAtomValue(challengeAtom);
  const challengeHash = useAtomValue(challengeHashAtom);
  const [locallyTrusted, setLocallyTrusted] = useAtom(locallyTrustedAtom);

  // Nothing to say for an empty challenge
  if (recognition.type === "empty") return null;

  const recognitionStatus: SimpleStatus =
    recognition.type === "built-in"
      ? "neutral"
      : recognition.type === "user"
        ? "warning"
        : "failure";

  return (
    <Grid templateColumns={"1fr max-content"} borderTop={borderForStatus(recognitionStatus)}>
      <Box
        className={`${recognitionStatus}-bg popsup`}
        paddingInline="3"
        paddingBlock="1"
        overflow="hidden"
      >
        {recognition.type === "none" && (
          <Text fontSize="sm">
            <FontAwesomeIcon icon={faWarning} size="sm" className={recognitionStatus} /> Not a
            known, trusted challenge!{" "}
            <Em>It is critical to check for misleading or deceptive content in the challenge.</Em>
          </Text>
        )}
        {recognition.type === "built-in" && (
          <Text fontSize="sm">
            Known challenge: "{recognition.name}"
            {recognition.sources.map((href, i) => (
              <Span key={i}>
                {" ["}
                {
                  <Link href={href} target="_blank" colorPalette="teal">
                    {i + 1}
                  </Link>
                }
                {"]"}
              </Span>
            ))}
          </Text>
        )}
        {recognition.type === "user" && (
          <Text fontSize="sm">
            You have previously chosen to trust this challenge in this browser (SHA256{" "}
            {challengeHash})
          </Text>
        )}
      </Box>
      {recognition.type === "none" && (
        <Box
          className={`${recognitionStatus}-bg popsup`}
          height="100%"
          paddingRight="3"
          paddingBlock="1"
        >
          <Button
            className="appears"
            onClick={() => {
              const newLocallyTrusted = produce(locallyTrusted, (draft) => {
                draft[challengeHash] = challenge;
              });
              setLocallyTrusted(newLocallyTrusted);
              alert("Trusting challenge with hash " + challengeHash);
            }}
          >
            I trust this challenge
          </Button>
        </Box>
      )}
    </Grid>
  );
}
