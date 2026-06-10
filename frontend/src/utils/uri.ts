/**
 * Escape more characters in URL
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent#encoding_for_rfc3986
 */
export function fixedEncodeURIComponent(str: string) {
  return encodeURIComponent(str).replace(
    // /[!'()*]/g, // this is the one recommended on MDN
    /[()]/g, // this is the exact one used on Live Lean
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
