// Shared browser launcher for every check script: finds a Chrome/Chromium on Windows, macOS or Linux.
// Order: $CHROME_PATH -> well-known install paths -> playwright's "chrome" channel -> playwright's own Chromium
// (`npx playwright-core install chromium` downloads that one if the machine has no Chrome).
import { chromium } from 'playwright-core';
import fs from 'fs';

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
];

export async function launchBrowser(opts = {}) {
  const tried = [];
  const exe = [process.env.CHROME_PATH, ...CANDIDATES].find((p) => p && fs.existsSync(p));
  if (exe) return chromium.launch({ ...opts, executablePath: exe });
  for (const attempt of [{ channel: 'chrome' }, {}]) {
    try {
      return await chromium.launch({ ...opts, ...attempt });
    } catch (e) {
      tried.push(String(e.message).split('\n')[0]);
    }
  }
  throw new Error('No Chrome/Chromium found. Install Google Chrome, set CHROME_PATH, or run: npx playwright-core install chromium\n' + tried.join('\n'));
}
