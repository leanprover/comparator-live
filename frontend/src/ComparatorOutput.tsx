import { Box, Code, Heading } from "@chakra-ui/react";
import { zComparatorResult, zProcResult } from "@comparator/shared";
import { type z } from "zod";

interface ComparatorOutputProps {
  output: string;
}

function emoJudgment(judgement: "success" | "failure") {
  if (judgement === "success") return `returned 👍 ${judgement}`;
  return `returned ✋ ${judgement}`;
}

export default function ComparatorOutput({ output }: ComparatorOutputProps) {
  let parsed = null;
  try {
    parsed = zComparatorResult.parse(JSON.parse(output));
  } catch (e) {
    console.log("could not parse comparator's output as JSON", e);
  }

  if (!parsed) {
    return (
      <Code as="pre" display="block" overflowX="auto" width="100%">
        {output.split("\n").map((line, n) => {
          if (
            line.match(/^(Building Challenge|Building Solution|Running .* kernel on solution)$/)
          ) {
            return <span style={{ fontWeight: "bold" }}>{"\n" + line + "\n"}</span>;
          }
          const m = line.match(/^(.*) kernel (accepts|rejected) the solution$/);
          if (m) {
            const acc = m[2] === "accepts";
            const c = acc ? "success" : "failure";
            const emoji = acc ? "👍" : "✋";
            return (
              <span className={c} style={{ fontWeight: "bold" }}>
                {emoji + " " + line + "\n"}
              </span>
            );
          }
          return <span>{line + "\n"}</span>;
        })}
      </Code>
    );
  }

  return (
    <div className="formattedOutput">
      <ProcInform informOnly name="Challenge build" procResult={parsed.report.build_challenge} />
      <ProcInform informOnly name="Solution build" procResult={parsed.report.build_solution} />
      <ProcInform
        informOnly
        name="Resolve Dependencies"
        procResult={parsed.report.resolve_dependencies}
      />
      {[...Object.entries(parsed.report.kernel_reports)].map(([key, procResult]) => (
        <ProcResult key={key} name={key} procResult={procResult} />
      ))}
      <Box marginTop="2" paddingTop="2" borderTopWidth="1px">
        (Comparator JSON output format {parsed.version})
      </Box>
    </div>
  );
}

function ProcInform({
  name,
  procResult,
}: {
  name: string;
  procResult: z.infer<typeof zProcResult>;
  informOnly?: boolean;
}) {
  const failed = procResult.judgement === "failure" && (
    <Heading size="sm" paddingTop="2">
      {name} returned failure!
    </Heading>
  );
  const stdout = procResult.output.proc.stdout && (
    <>
      <Heading size="sm" paddingTop="2">
        {name} standard output:
      </Heading>
      <Code as="pre" display="block" overflowX="auto" width="100%">
        {procResult.output.proc.stdout}
      </Code>
    </>
  );
  const stderr = procResult.output.proc.stderr && (
    <>
      <Heading size="sm" paddingTop="2">
        {name} standard output:
      </Heading>
      <Code as="pre" display="block" overflowX="auto" width="100%">
        {procResult.output.proc.stderr}
      </Code>
    </>
  );
  return (
    <>
      {failed}
      {stdout}
      {stderr}
    </>
  );
}

function ProcResult({
  name,
  procResult,
  informOnly,
}: {
  name: string;
  procResult: z.infer<typeof zProcResult>;
  informOnly?: boolean;
}) {
  return (
    <>
      <Heading size="sm" paddingTop="2" className={informOnly ? undefined : procResult.judgement}>
        {name} {!informOnly && emoJudgment(procResult.judgement)}
      </Heading>
      {procResult.output.proc.stderr && procResult.output.proc.stdout && (
        <>
          <Heading size="xs">Standard Output</Heading>
          <Code as="pre" display="block" overflowX="auto" width="100%">
            {procResult.output.proc.stdout}
          </Code>
          <Heading size="xs">Standard Error</Heading>
          <Code as="pre" display="block" overflowX="auto" width="100%">
            {procResult.output.proc.stderr}
          </Code>
        </>
      )}
      {(procResult.output.proc.stderr || procResult.output.proc.stdout) && (
        <Code as="pre" display="block" overflowX="auto" width="100%">
          {procResult.output.proc.stderr || procResult.output.proc.stdout}
        </Code>
      )}
    </>
  );
}
