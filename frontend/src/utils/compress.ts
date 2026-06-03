import LZString from "lz-string";

/**
 * Wrap LZ compression to get a base64 string suitable for inclusion as a hash
 * parameter. Removes the trailing `=` that get added by default: these mess
 * up the argument parsing and isn't needed for LZ decoding anyway.
 */
export function toLZCompressedString(str: string) {
  return LZString.compressToBase64(str).replace(/=*$/, "");
}
