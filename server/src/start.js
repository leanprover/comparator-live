import { register } from "node:module";

register("amaro/strip", import.meta.url);
await import("./server.ts");
