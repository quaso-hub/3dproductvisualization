/* eslint-disable */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'visual-inspection-screenshots-pblead-audit');
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

  const errors = [];
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push({ type: 'pageerror', msg: e.message }));

  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3000));

  await clickProductSidebar(page, 'PB Lead Door');
  await new Promise((r) => setTimeout(r, 3000));

  // ASSEMBLED - all camera angles
  await clickButtonByText(page, 'ASSEMBLED');
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUT, '01-assembled-default.png') });

  for (const preset of ['ISOMETRIC', 'TAMPAK DEPAN', 'TAMPAK SAMPING', 'DETAIL ATAS', 'DETAIL CLOSER', 'DETAIL JENDELA', 'DETAIL LEAD EDGE']) {
    const ok = await clickButtonByText(page, preset);
    if (ok) {
      await new Promise((r) => setTimeout(r, 1500));
      const slug = preset.toLowerCase().replace(/\s+/g, '-');
      await page.screenshot({ path: path.join(OUT, `02-assembled-${slug}.png`) });
      console.log(`assembled ${preset}`);
    }
  }

  // EXPLODED
  await clickButtonByText(page, 'EXPLODED');
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(OUT, '10-exploded-default.png') });

  for (const preset of ['ISOMETRIC', 'TAMPAK DEPAN', 'TAMPAK SAMPING', 'DETAIL ATAS']) {
    const ok = await clickButtonByText(page, preset);
    if (ok) {
      await new Promise((r) => setTimeout(r, 1500));
      const slug = preset.toLowerCase().replace(/\s+/g, '-');
      await page.screenshot({ path: path.join(OUT, `11-exploded-${slug}.png`) });
      console.log(`exploded ${preset}`);
    }
  }

  await browser.close();
  console.log('\nErrors:', errors.length);
  errors.forEach((e) => console.log(' ', e.msg));
  console.log(`Screenshots: ${OUT}`);
})();
