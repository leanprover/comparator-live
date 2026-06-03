import trustedDemos from "../../../trusted/demos.json";
import trustedLeanEval from "../../../trusted/lean-eval.json";

export const builtInTrusted: {
  [key: string]: {
    name: string;
    sources: string[];
  };
} = { ...trustedLeanEval, ...trustedDemos };
