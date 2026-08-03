// Production entry point usable in Nix
// Necessary because Nix puts node packages under node_modules, and Node
// refuses to do type stripping on typescript within node_modules (will
// fail with ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING)
import { register } from "node:module";

register("amaro/strip", import.meta.url);
await import("./server.ts");
