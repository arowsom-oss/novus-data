import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * THE RESTRICTIONS ARE DEFINED ONCE AND SPREAD INTO EVERY BLOCK, ON PURPOSE.
 *
 * Flat config does not merge two `no-restricted-imports` entries that match
 * the same file: the later block replaces the rule outright. This file used to
 * declare the build-tool restrictions for all of src/ and then a separate
 * layer-boundary block for src/app and src/components — which silently
 * switched the build-tool restrictions OFF for exactly the pages and
 * components they existed to protect. `import 'fast-xml-parser'` in a page
 * linted clean. Every block that sets this rule now carries every restriction
 * that applies to its files.
 */

/** The website must never depend on the Beehiiv feed or the sync tooling. */
const BUILD_TOOL_PATHS = [
  {
    name: "fast-xml-parser",
    message:
      "The RSS parser belongs to scripts/sync-issues.ts. Nothing under src/ may read the feed.",
  },
  {
    name: "sanitize-html",
    message:
      "Issue HTML is sanitised once, at sync time, in scripts/. Do not re-sanitise at request time.",
  },
];

const BUILD_TOOL_PATTERNS = [
  {
    group: ["**/scripts/*", "../../../scripts/*"],
    message: "src/ must not import from scripts/. Build tools stay out of the site.",
  },
];

/** Every typed layer keeps its storage behind its public API. */
const LAYER_BOUNDARIES = [
  {
    group: ["@/lib/content/sources", "@/lib/content/sources/*"],
    message:
      "Import from '@/lib/content' instead. Pages must not know which content source is in use.",
  },
  {
    group: ["@/lib/disruptions/sources", "@/lib/disruptions/sources/*"],
    message:
      "Import from '@/lib/disruptions' instead. The register's storage stays behind its public API.",
  },
  {
    group: ["@/lib/accounts/sources", "@/lib/accounts/sources/*"],
    message:
      "Import from '@/lib/accounts' instead. Which account store is in use is not a page's business.",
  },
  {
    group: ["@/lib/live/sources", "@/lib/live/sources/*"],
    message:
      "Import from '@/lib/live' instead. Which feeds are read, and how, stays behind the live layer's API.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    // `const { contentHtml: _contentHtml, ...summary } = issue` is how a body
    // is dropped from a list payload. The discarded name is intentional.
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  {
    // The website must never depend on the Beehiiv feed. The RSS parser and
    // the sanitiser are build tools that live in scripts/ and run by hand;
    // if either is ever imported from src/ the site has quietly acquired a
    // runtime dependency on an external service. Fail the lint instead.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: BUILD_TOOL_PATHS, patterns: BUILD_TOOL_PATTERNS },
      ],
    },
  },

  {
    // Pages and components go through the content layer's public API so the
    // source of issues stays swappable.
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: BUILD_TOOL_PATHS, patterns: [...BUILD_TOOL_PATTERNS, ...LAYER_BOUNDARIES] },
      ],
    },
  },

  {
    // Components additionally may not import the live layer's index. It
    // reaches the network adapters, and three of the live components run in
    // the browser: one careless import would ship the fetch code — and the
    // place the AISStream key is read — into the client bundle. Components
    // take live data as props and import labels from '@/lib/live/types',
    // '@/lib/live/meta' and '@/lib/live/display', which are pure.
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...BUILD_TOOL_PATHS,
            {
              name: "@/lib/live",
              message:
                "Components receive live data as props. Import labels from '@/lib/live/types', '@/lib/live/meta' or '@/lib/live/display' instead.",
            },
          ],
          patterns: [...BUILD_TOOL_PATTERNS, ...LAYER_BOUNDARIES],
        },
      ],
    },
  },

  {
    // /debug/content is the one page that legitimately inspects the local
    // files directly, because reporting on them is its entire job.
    files: ["src/app/debug/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": "off" },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "preview/**",
    "experiments/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
