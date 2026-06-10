import "./style.css";

import { ChakraProvider, createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";
import { getDefaultStore } from "jotai";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { initializeStore } from "./store/initialize.ts";

const config = defineConfig({});

export const system = createSystem(defaultConfig, config);

initializeStore(getDefaultStore());
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <App />
    </ChakraProvider>
  </StrictMode>,
);
