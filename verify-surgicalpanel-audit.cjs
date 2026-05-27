/* eslint-disable */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'visual-inspection-screenshots-surgicalpanel-audit');
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
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  }, txt);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1600, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3000));

  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, [role="button"], div'));
    const acc = els.find((e) => e.textContent && e.textContent.trim().toUpperCase().includes('PERALATAN KONTROL'));
    if (acc) (acc.closest('button') || acc).click();
  });
  await new Promise((r) => setTimeout(r, 500));

  await clickProductSidebar(page, 'Surgical Panel');
  await new Promise((r) => setTimeout(r, 3000));
  await clickButtonByText(page, 'ASSEMBLED');
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUT, '01-assembled-default.png') });

  for (const preset of ['ISOMETRIC', 'TAMPAK DEPAN', 'TAMPAK SAMPING']) {
    if (await clickButtonByText(page, preset)) {
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(OUT, `02-assembled-${preset.toLowerCase().replace(/\s+/g, '-')}.png`) });
    }
  }

  await clickButtonByText(page, 'EXPLODED');
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(OUT, '10-exploded-default.png') });

  for (const preset of ['ISOMETRIC', 'TAMPAK DEPAN']) {
    if (await clickButtonByText(page, preset)) {
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(OUT, `11-exploded-${preset.toLowerCase().replace(/\s+/g, '-')}.png`) });
    }
  }

  await browser.close();
  console.log(`Screenshots: ${OUT}`);
})();
