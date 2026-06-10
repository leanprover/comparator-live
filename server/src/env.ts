import { resolve } from "node:path";

export const USE_MOCK_VERIFICATION = process.env.USE_MOCK_VERIFICATION === "true";
export const KEEP_COMPARATOR_TEMP_FILES = process.env.KEEP_COMPARATOR_TEMP_FILES === "true";
export const PROJ_ROOT = resolve(process.env.COMPARATOR_PROJECT_BASE_PATH ?? "../Projects");
export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const PORT = parseInt(process.env.PORT || "3000");

if (!IS_DEVELOPMENT && !IS_PRODUCTION) {
  console.warn(
    `NODE_ENV not set to "development" or "production": this may cause unexpected behavior!`,
  );
}
