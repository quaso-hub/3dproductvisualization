/* eslint-disable */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'visual-inspection-screenshots-item2a-pbleadhighlight');
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

async function hoverLabel(page, partId) {
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-part-id="${id}"]`);
    if (!el) return;
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
  }, partId);
}

async function unhoverLabel(page, partId) {
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-part-id="${id}"]`);
    if (!el) return;
    el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerType: 'mouse' }));
  }, partId);
}

async function clickLabel(page, partId) {
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-part-id="${id}"]`);
    if (!el) return;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, partId);
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

  await clickProductSidebar(page, 'PB Lead Door');
  await new Promise((r) => setTimeout(r, 3000));
  await clickButtonByText(page, 'ASSEMBLED');
  await new Promise((r) => setTimeout(r, 2500));

  // Inspect: how many labels with data-part-id?
  const labelInfo = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-part-id]'));
    return {
      count: els.length,
      partIds: [...new Set(els.map((e) => e.dataset.partId))],
      labels: els.slice(0, 20).map((e) => ({ id: e.dataset.partId, text: (e.textContent || '').trim().slice(0, 40) })),
    };
  });
  console.log('\n=== PbLead label inventory ===');
  console.log('Total labels:', labelInfo.count);
  console.log('Unique partIds:', labelInfo.partIds);
  console.log('Sample labels:');
  labelInfo.labels.forEach((l) => console.log(`  [${l.id}] ${l.text}`));

  await page.screenshot({ path: path.join(OUT, '00-pblead-baseline.png') });
  console.log('\n00 baseline');

  // Test each unique partId
  for (const partId of labelInfo.partIds.slice(0, 6)) {
    await hoverLabel(page, partId);
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUT, `01-hover-${partId}.png`) });
    console.log(`01 hover ${partId}`);
    await unhoverLabel(page, partId);
    await new Promise((r) => setTimeout(r, 400));
  }

  // Pin one
  if (labelInfo.partIds[0]) {
    await clickLabel(page, labelInfo.partIds[0]);
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUT, `02-pinned-${labelInfo.partIds[0]}.png`) });
    console.log(`02 pinned ${labelInfo.partIds[0]}`);
  }

  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '03-after-escape.png') });
  console.log('03 after Escape');

  await browser.close();

  console.log('\n--- ERRORS ---');
  if (errors.length === 0) {
    console.log('Zero errors / pageerrors. Clean.');
  } else {
    errors.forEach((e) => console.log(`  [${e.type}] ${e.msg}`));
  }
  console.log(`\nScreenshots: ${OUT}`);
})();
