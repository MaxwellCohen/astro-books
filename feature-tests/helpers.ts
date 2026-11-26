import type { TestInfo } from '@playwright/test';

/** Record what the test used and observed; feature-tests/run.mjs copies these into results.json. */
export function note(info: TestInfo, method: string, evidence: string) {
  info.annotations.push({ type: 'method', description: method });
  info.annotations.push({ type: 'evidence', description: evidence });
}
