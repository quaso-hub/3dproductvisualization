/* eslint-disable */
// Item 2A pilot verify: highlight system di HermeticDoorAssembled3D.
// Test: hover label "Lead Glass Pb 5mm" -> kapture screenshot.
//       hover label "Handle SS" -> kapture screenshot (different highlight).
//       click label "Electric Motor Housing" -> pinned screenshot.

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'visual-inspection-screenshots-item2a-highlight');
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

async function findLabel(page, labelText) {
  return await page.evaluate((t) => {
    const labels = Array.from(document.querySelectorAll('[data-part-id]'));
    const target = labels.find((l) => l.textContent && l.textContent.trim().toUpperCase().includes(t.toUpperCase()));
    if (!target) return null;
    const r = target.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, partId: target.dataset.partId, text: target.textContent.trim() };
  }, labelText);
}

async function dispatchPointerEvent(page, target, eventType, x, y) {
  await page.evaluate(({ tt, et, cx, cy }) => {
    let target;
    if (tt.startsWith('label:')) {
      const id = tt.slice(6);
      target = document.querySelector(`[data-part-id="${id}"]`);
    } else if (tt === 'canvas') {
      target = document.querySelector('canvas');
    }
    if (!target) return;
    const evt = new PointerEvent(et, {
      bubbles: true,
      cancelable: true,
      clientX: cx,
      clientY: cy,
      pointerType: 'mouse',
    });
    target.dispatchEvent(evt);
  }, { tt: target, et: eventType, cx: x, cy: y });
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

  await clickProductSidebar(page, 'Hermetic Door');
  await new Promise((r) => setTimeout(r, 2500));
  await clickButtonByText(page, 'ASSEMBLED');
  await new Promise((r) => setTimeout(r, 2000));

  // 0. Baseline (no highlight)
  await page.screenshot({ path: path.join(OUT, '00-baseline-no-highlight.png') });
  console.log('00 baseline');

  // 1. Hover label "Lead Glass" → mesh should highlight, others should dim
  const leadGlassLabel = await findLabel(page, 'Lead Glass');
  if (leadGlassLabel) {
    console.log('Found label:', leadGlassLabel);
    await dispatchPointerEvent(page, `label:${leadGlassLabel.partId}`, 'pointerenter', leadGlassLabel.x, leadGlassLabel.y);
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUT, '01-hover-leadglass.png') });
    console.log('01 hover lead-glass label');
    await dispatchPointerEvent(page, `label:${leadGlassLabel.partId}`, 'pointerleave', leadGlassLabel.x, leadGlassLabel.y);
    await new Promise((r) => setTimeout(r, 500));
  } else {
    console.log('!! lead-glass label NOT FOUND');
  }

  // 2. Hover label "Handle"
  const handleLabel = await findLabel(page, 'Handle');
  if (handleLabel) {
    console.log('Found label:', handleLabel);
    await dispatchPointerEvent(page, `label:${handleLabel.partId}`, 'pointerenter', handleLabel.x, handleLabel.y);
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUT, '02-hover-handle.png') });
    console.log('02 hover handle label');
    await dispatchPointerEvent(page, `label:${handleLabel.partId}`, 'pointerleave', handleLabel.x, handleLabel.y);
    await new Promise((r) => setTimeout(r, 500));
  }

  // 3. Click label "Motor Housing" → pin
  const housingLabel = await findLabel(page, 'Motor Housing');
  if (housingLabel) {
    console.log('Found label:', housingLabel);
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-part-id="${id}"]`);
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, housingLabel.partId);
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUT, '03-pinned-housing.png') });
    console.log('03 pinned housing label');
  }

  // 4. Press Escape → unpin
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '04-after-escape.png') });
  console.log('04 after Escape');

  // 5. Inspect computed styles on labels to verify state
  const labelStates = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('[data-part-id]'));
    return labels.map((l) => ({
      partId: l.dataset.partId,
      text: (l.textContent || '').trim().slice(0, 30),
      state: l.getAttribute('data-highlight-state') || 'idle',
      classes: l.className,
    }));
  });
  console.log('\nLabel states after Escape:');
  labelStates.forEach((s) => console.log(`  [${s.state}] ${s.partId} → "${s.text}"`));

  await browser.close();

  console.log('\n--- ERRORS ---');
  if (errors.length === 0) {
    console.log('Zero errors / pageerrors. Clean.');
  } else {
    errors.forEach((e) => console.log(`  [${e.type}] ${e.msg}`));
  }
  console.log(`\nScreenshots: ${OUT}`);
})();
