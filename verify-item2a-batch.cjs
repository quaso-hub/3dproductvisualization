/* eslint-disable */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'visual-inspection-screenshots-item2a-batch');
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

async function inspectAndHoverFirst(page, productLabel, fileSlug) {
  const info = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-part-id]'));
    return {
      count: els.length,
      partIds: [...new Set(els.map((e) => e.dataset.partId))],
    };
  });
  console.log(`\n=== ${productLabel} ===`);
  console.log(`Total labels: ${info.count}, unique partIds: ${info.partIds.length}`);
  console.log(`PartIds: ${info.partIds.join(', ')}`);

  await page.screenshot({ path: path.join(OUT, `${fileSlug}-00-baseline.png`) });
  console.log(`  ${fileSlug}-00-baseline.png`);

  // hover the first partId
  const firstId = info.partIds[0];
  if (firstId) {
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-part-id="${id}"]`);
      if (el) el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
    }, firstId);
    await new Promise((r) => setTimeout(r, 700));
    await page.screenshot({ path: path.join(OUT, `${fileSlug}-01-hover-${firstId}.png`) });
    console.log(`  ${fileSlug}-01-hover-${firstId}.png`);

    // unhover
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-part-id="${id}"]`);
      if (el) el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerType: 'mouse' }));
    }, firstId);
    await new Promise((r) => setTimeout(r, 400));
  }
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

  // ScrubSink
  await clickProductSidebar(page, 'Scrub Sink 2 Bay');
  await new Promise((r) => setTimeout(r, 3000));
  await clickButtonByText(page, 'ASSEMBLED');
  await new Promise((r) => setTimeout(r, 2500));
  await inspectAndHoverFirst(page, 'ScrubSink Assembled', 'scrubsink');

  // Curving
  await clickProductSidebar(page, 'Curving R40');
  await new Promise((r) => setTimeout(r, 2500));
  await clickButtonByText(page, 'ASSEMBLED');
  await new Promise((r) => setTimeout(r, 2500));
  await inspectAndHoverFirst(page, 'Curving Assembled', 'curving');

  // PacsCabinet
  await clickProductSidebar(page, 'PACS Cabinet');
  await new Promise((r) => setTimeout(r, 2500));
  await clickButtonByText(page, 'ASSEMBLED');
  await new Promise((r) => setTimeout(r, 2500));
  await inspectAndHoverFirst(page, 'PacsCabinet Assembled', 'pacs');

  // PassBox
  await clickProductSidebar(page, 'Pass Box SUS 304');
  await new Promise((r) => setTimeout(r, 2500));
  await clickButtonByText(page, 'ASSEMBLED');
  await new Promise((r) => setTimeout(r, 2500));
  await inspectAndHoverFirst(page, 'PassBox Assembled', 'passbox');

  await browser.close();

  console.log('\n--- ERRORS ---');
  if (errors.length === 0) {
    console.log('Zero errors / pageerrors. Clean.');
  } else {
    errors.forEach((e) => console.log(`  [${e.type}] ${e.msg}`));
  }
  console.log(`\nScreenshots: ${OUT}`);
})();
