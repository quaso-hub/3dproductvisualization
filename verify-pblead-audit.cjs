/* eslint-disable */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'visual-inspection-screenshots-pblead-audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:4180';

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

  const ok = await clickProductSidebar(page, 'PB Lead Door');
  console.log('Sidebar click:', ok);
  await new Promise((r) => setTimeout(r, 3000));

  await clickButtonByText(page, 'ASSEMBLED');
  await new Promise((r) => setTimeout(r, 2500));

  for (const preset of ['ISOMETRIC', 'TAMPAK DEPAN', 'TAMPAK SAMPING', 'CLOSER DETAIL', 'OPEN 90°']) {
    if (await clickButtonByText(page, preset)) {
      await new Promise((r) => setTimeout(r, 2000));
      await page.screenshot({ path: path.join(OUT, `assembled-${preset.toLowerCase().replace(/\s+/g, '-').replace(/°/, 'deg')}.png`) });
    }
  }

  await clickButtonByText(page, 'EXPLODED');
  await new Promise((r) => setTimeout(r, 3000));
  for (const preset of ['ISOMETRIC', 'TAMPAK DEPAN', 'TAMPAK SAMPING']) {
    if (await clickButtonByText(page, preset)) {
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(OUT, `exploded-${preset.toLowerCase().replace(/\s+/g, '-')}.png`) });
    }
  }

  await browser.close();
  console.log('Done:', OUT);
})();
