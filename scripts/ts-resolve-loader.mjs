/**
 * Sync ESM loader: resolve extensionless relative imports to .ts and @shared
 * path alias (for use with node --experimental-strip-types). No spawn—runs in-process.
 */
import { registerHooks } from "node:module";

function resolve(specifier, context, nextResolve) {
  let s = specifier;

  // Map @shared/* to ../shared/* (server imports from server/)
  if (s.startsWith("@shared/")) {
    s = "../shared/" + s.slice(8);
  }

  const isRelative =
    s.startsWith("./") || s.startsWith("../");
  const hasExtension = /\.[a-z0-9]+$/i.test(s);

  if (isRelative && !hasExtension) {
    for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
      try {
        return nextResolve(s + ext, context);
      } catch (e) {
        if (e?.code !== "ERR_MODULE_NOT_FOUND") throw e;
      }
    }
  }

  return nextResolve(s, context);
}

registerHooks({ resolve });
