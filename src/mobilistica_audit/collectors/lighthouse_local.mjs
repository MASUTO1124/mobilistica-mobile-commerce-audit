// collectors/lighthouse_local.mjs — Node-only, fully optional tier.
// Only used when a `lighthouse` install is reachable via dynamic import;
// otherwise returns {available:false} and the pipeline falls back to the
// HTML collector. Never a hard dependency (PROJECT_BRIEF: ランタイム依存ゼロ).

let cachedAvailability;

/**
 * @returns {Promise<boolean>}
 */
export async function isLighthouseAvailable() {
  if (typeof cachedAvailability === 'boolean') return cachedAvailability;
  try {
    await import('lighthouse');
    cachedAvailability = true;
  } catch {
    cachedAvailability = false;
  }
  return cachedAvailability;
}

/**
 * Runs a local Lighthouse audit if the `lighthouse` package is installed.
 * Always resolves (never throws) so callers can treat it as an optional
 * best-effort collector tier.
 *
 * @param {string} url
 * @param {{strategy?:'mobile'|'desktop', timeoutMs?:number}} [options]
 */
export async function runLighthouseLocal(url, options = {}) {
  const { strategy = 'mobile' } = options;

  const available = await isLighthouseAvailable();
  if (!available) {
    return { available: false };
  }

  try {
    const mod = await import('lighthouse');
    const lighthouse = mod.default || mod;
    const chromeLauncherAvailable = await tryImport('chrome-launcher');
    if (!chromeLauncherAvailable) {
      return { available: false, reason: 'chrome_launcher_not_installed' };
    }

    const chromeLauncher = await import('chrome-launcher');
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
    try {
      const flags = {
        port: chrome.port,
        formFactor: strategy === 'desktop' ? 'desktop' : 'mobile',
        screenEmulation: strategy === 'desktop' ? { disabled: true } : undefined,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      };
      const runnerResult = await lighthouse(url, flags);
      return { available: true, ok: true, raw: runnerResult.lhr };
    } finally {
      await chrome.kill();
    }
  } catch (e) {
    return { available: true, ok: false, error: 'lighthouse_run_failed', detail: String(e && e.message ? e.message : e) };
  }
}

async function tryImport(specifier) {
  try {
    await import(specifier);
    return true;
  } catch {
    return false;
  }
}
