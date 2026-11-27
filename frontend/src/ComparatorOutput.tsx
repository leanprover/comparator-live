import { Box, Code, Heading } from "@chakra-ui/react";
import { zComparatorResult, zProcResult } from "@comparator/shared";
import { type z } from "zod";

interface ComparatorOutputProps {
  output: string;
}

function emoJudgment(judgement: "success" | "failure" | "skipped") {
  if (judgement === "skipped") return `skipped ⏩`;
  if (judgement === "success") return `returned 👍 ${judgement}`;
  return `returned ✋ ${judgement}`;
}

export default function ComparatorOutput({ output }: ComparatorOutputProps) {
  let parsed = null;
  try {
    parsed = zComparatorResult.parse(JSON.parse(output));
  } catch (e) {
    // console.log("could not parse comparator's output as JSON", e);
  }

  if (!parsed) {
    return (
      <Code as="pre" display="block" overflowX="auto" width="100%">
        {output.split("\n").map((line, n) => {
          if (
            line.match(/^(Building Challenge|Building Solution|Running .* kernel on solution)$/)
          ) {
            return (
              <span key={n} style={{ fontWeight: "bold" }}>
                {"\n" + line + "\n"}
              </span>
            );
          }
          const m = line.match(/^(.*) kernel (accepts|rejected) the solution$/);
          if (m) {
            const acc = m[2] === "accepts";
            const c = acc ? "success" : "failure";
            const emoji = acc ? "👍" : "✋";
            return (
              <span key={n} className={c} style={{ fontWeight: "bold" }}>
                {emoji + " " + line + "\n"}
              </span>
            );
          }
          return <span key={n}>{line + "\n"}</span>;
        })}
      </Code>
    );
  }

  return (
    <div className="formattedOutput">
      <ProcInform name="Resolve Dependencies" procResult={parsed.report.resolve_dependencies} />
      <ProcInform name="Challenge build" procResult={parsed.report.build_challenge} />
      <ProcInform name="Solution build" procResult={parsed.report.build_solution} />
      <ProcInform name="Export challenge" procResult={parsed.report.export_challenge} />
      <ProcInform name="Export solution" procResult={parsed.report.export_solution} />
      <ProcInform name="Compare statements" procResult={parsed.report.compare_statements} />
      <ProcInform name="Check Axioms" procResult={parsed.report.check_axioms} />
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
}) {
  const failed = procResult.judgement === "failure" && (
    <Heading size="sm" paddingTop="2" className="failure">
      {name} returned failure!
    </Heading>
  );
  const result = "str" in procResult.output && procResult.output.str.string && (
    <>
      <Heading size="sm" paddingTop="2">
        {name} output:
      </Heading>
      <Code as="pre" display="block" overflowX="auto" width="100%">
        {procResult.output.str.string}
      </Code>
    </>
  );
  const stdout = "proc" in procResult.output && procResult.output.proc.stdout && (
    <>
      <Heading size="sm" paddingTop="2">
        {name} standard output:
      </Heading>
      <Code as="pre" display="block" overflowX="auto" width="100%">
        {procResult.output.proc.stdout}
      </Code>
    </>
  );
  const stderr = "proc" in procResult.output && procResult.output.proc.stderr && (
    <>
      <Heading size="sm" paddingTop="2">
        {name} standard error:
      </Heading>
      <Code as="pre" display="block" overflowX="auto" width="100%">
        {procResult.output.proc.stderr}
      </Code>
    </>
  );
  return (
    <>
      {failed}
      {result}
      {stdout}
      {stderr}
    </>
  );
}

function ProcResult({
  name,
  procResult,
}: {
  name: string;
  procResult: z.infer<typeof zProcResult>;
}) {
  if (procResult.judgement === "skipped") return null;
  return (
    <>
      <Heading size="sm" paddingTop="2" className={procResult.judgement}>
        {name} {emoJudgment(procResult.judgement)}
      </Heading>
      {"proc" in procResult.output &&
        procResult.output.proc.stderr &&
        procResult.output.proc.stdout && (
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
      {"proc" in procResult.output &&
        !(procResult.output.proc.stderr && procResult.output.proc.stdout) &&
        (procResult.output.proc.stderr || procResult.output.proc.stdout) && (
          <Code as="pre" display="block" overflowX="auto" width="100%">
            {procResult.output.proc.stderr || procResult.output.proc.stdout}
          </Code>
        )}
      {"str" in procResult.output && procResult.output.str.string && (
        <Code as="pre" display="block" overflowX="auto" width="100%">
          {procResult.output.str.string}
        </Code>
      )}
    </>
  );
}
