/* eslint-disable */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'visual-inspection-screenshots-item1-after');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const BASE = 'http://127.0.0.1:4180';

async function clickProductSidebar(page, productName) {
  return await page.evaluate((name) => {
    const span = Array.from(document.querySelectorAll('span')).find((s) => s.textContent && s.textContent.trim() === name);
    if (!span) return false;
    const btn = span.closest('button');
    if (!btn) return false;
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  }, productName);
}

async function clickButtonByText(page, txt) {
  return await page.evaluate((t) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find((b) => b.textContent && b.textContent.trim().toUpperCase() === t.toUpperCase());
    if (!target) return false;
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  }, txt);
}

async function getCurrentTitle(page) {
  return await page.evaluate(() => {
    const h = document.querySelector('h2');
    return h ? h.textContent.trim() : '';
  });
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
  await new Promise((r) => setTimeout(r, 3000));

  const ok = await clickProductSidebar(page, 'Hermetic Door');
  console.log('clicked Hermetic:', ok);
  await new Promise((r) => setTimeout(r, 2500));
  console.log('Title:', await getCurrentTitle(page));

  // ─ ASSEMBLED ─
  await clickButtonByText(page, 'ASSEMBLED');
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT, '01-hermetic-assembled-iso-NOWALL.png') });
  console.log('01 assembled iso (no wall) | title:', await getCurrentTitle(page));

  await clickButtonByText(page, 'TAMPAK SAMPING');
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '02-hermetic-assembled-side-NOWALL.png') });
  console.log('02 assembled side');

  await clickButtonByText(page, 'TAMPAK ATAS');
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '03-hermetic-assembled-top-NOWALL.png') });
  console.log('03 assembled top');

  await clickButtonByText(page, 'TAMPAK DEPAN');
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '04-hermetic-assembled-front.png') });
  console.log('04 assembled front');

  // ─ EXPLODED ─
  const explodedClicked = await clickButtonByText(page, 'EXPLODED');
  console.log('EXPLODED click:', explodedClicked);
  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(OUT, '05-hermetic-exploded-iso.png') });
  console.log('05 exploded iso | title:', await getCurrentTitle(page));

  await clickButtonByText(page, 'TAMPAK DEPAN');
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '06-hermetic-exploded-front.png') });
  console.log('06 exploded front');

  await clickButtonByText(page, 'TAMPAK SAMPING');
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '07-hermetic-exploded-side.png') });
  console.log('07 exploded side');

  await clickButtonByText(page, 'TAMPAK ATAS');
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '08-hermetic-exploded-top.png') });
  console.log('08 exploded top');

  await browser.close();

  console.log('\n--- ERRORS ---');
  if (errors.length === 0) {
    console.log('Zero errors / pageerrors. Clean.');
  } else {
    errors.forEach((e) => console.log(`  [${e.type}] ${e.msg}`));
  }
  console.log(`\nScreenshots: ${OUT}`);
})();
