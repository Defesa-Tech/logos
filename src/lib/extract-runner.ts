import { extractAllPages } from '../extract-script'

export const extractRunnerReady = true
export { extractAllPages }

// Trigger extract if in browser/node environment during bundle
if (typeof window !== 'undefined') {
  console.log('[extract-runner] runner mounted')
}
