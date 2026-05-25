/* eslint-disable */
// Item 1 baseline: capture hermetic door assembled + exploded BEFORE any change.
// Click sidebar entry "Hermetic Door" since URL params not supported.

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'visual-inspection-screenshots-item1-baseline');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const BASE = 'http://127.0.0.1:4180';

async function clickProduct(page, name) {
  await page.evaluate((n) => {
    const btns = Array.from(document.querySelectorAll('button, [role="button"], div'));
    const target = btns.find((b) => b.textContent && b.textContent.trim().startsWith(n));
    if (target) (target.closest('button') || target).click();
  }, name);
  await new Promise((r) => setTimeout(r, 1500));
}

async function clickViewTab(page, name) {
  await page.evaluate((n) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find((b) => b.textContent && b.textContent.trim().toUpperCase() === n.toUpperCase());
    if (target) target.click();
  }, name);
  await new Promise((r) => setTimeout(r, 1500));
}

async function clickPreset(page, name) {
  await page.evaluate((n) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find((b) => b.textContent && b.textContent.trim().toUpperCase().includes(n.toUpperCase()));
    if (target) target.click();
  }, name);
  await new Promise((r) => setTimeout(r, 1200));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1600, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const errors = [];
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push({ type: 'pageerror', msg: e.message }));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push({ type: 'consoleerror', msg: m.text() });
  });

  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  // Open Pintu & Partisi accordion if collapsed
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, [role="button"], div'));
    const acc = els.find((e) => e.textContent && e.textContent.trim().toUpperCase().includes('PINTU & PARTISI'));
    if (acc) (acc.closest('button') || acc).click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Click Hermetic Door
  await clickProduct(page, 'Hermetic Door');

  // 1. Assembled - default view
  await clickViewTab(page, 'ASSEMBLED');
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '01-hermetic-assembled-iso.png') });
  console.log('01-hermetic-assembled-iso.png');

  // 2. Side view (Tampak Samping) - to see wall depth
  await clickPreset(page, 'Side Detail');
  await page.screenshot({ path: path.join(OUT, '02-hermetic-assembled-side.png') });
  console.log('02-hermetic-assembled-side.png');

  // 3. Top view
  await clickPreset(page, 'Top View');
  await page.screenshot({ path: path.join(OUT, '03-hermetic-assembled-top.png') });
  console.log('03-hermetic-assembled-top.png');

  // 4. Switch to Exploded
  await clickViewTab(page, 'EXPLODED');
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT, '04-hermetic-exploded-iso.png') });
  console.log('04-hermetic-exploded-iso.png');

  // 5. Exploded side view
  await clickPreset(page, 'Side Detail');
  await page.screenshot({ path: path.join(OUT, '05-hermetic-exploded-side.png') });
  console.log('05-hermetic-exploded-side.png');

  await browser.close();

  console.log('\n--- ERRORS ---');
  if (errors.length === 0) {
    console.log('Zero errors / pageerrors. Clean.');
  } else {
    errors.forEach((e) => console.log(`  [${e.type}] ${e.msg}`));
  }
  console.log(`\nScreenshots: ${OUT}`);
})();
