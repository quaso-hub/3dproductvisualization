#!/usr/bin/env node
/**
 * PB Lead Door & Scrub Sink Visual Inspection Script
 * 
 * Purpose: Capture and analyze visual outputs for gap analysis
 * Based on user reference images showing:
 *   - PB Lead Door: Frame/kusen disconnected, incorrect geometry
 *   - Scrub Sink: Sink separated, mirror overlap issues
 * 
 * Execution: node inspect-products.mjs
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_DIR = process.cwd();
const SCREENSHOTS_DIR = path.join(BASE_DIR, 'product-inspection-screenshots');
const REPORT_FILE = path.join(BASE_DIR, 'product-visual-inspection-report.json');

// Ensure directories exist
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Configuration
const BASE_URLS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const PRODUCTS = [
  { id: 'pb-lead-door', name: 'PB Lead Door', views: ['assembled', 'exploded'] },
  { id: 'scrub-sink', name: 'Scrub Sink 2 Bay', views: ['assembled', 'exploded'] },
];

const CAMERA_PRESETS = {
  'pb-lead-door': [
    { name: 'Isometric', position: [200, 150, 300], target: [0, 0, 0] },
    { name: 'Tampak Depan', position: [0, 0, 350], target: [0, 0, 0] },
    { name: 'Tampak Samping', position: [320, 30, 0], target: [0, 30, 0] },
    { name: 'Detail Atas', position: [80, 200, 240], target: [0, 90, 0] },
    { name: 'Detail Closer', position: [60, 160, 200], target: [-20, 110, 8] },
    { name: 'Detail Jendela', position: [60, 80, 220], target: [0, 80, 0] },
  ],
  'scrub-sink': [
    { name: 'Isometric', position: [350, 150, 400], target: [0, 78, 0] },
    { name: 'Tampak Depan', position: [0, 100, 500], target: [0, 78, 0] },
    { name: 'Tampak Samping', position: [500, 100, 0], target: [0, 78, 0] },
    { name: 'Tampak Atas', position: [0, 550, 0], target: [0, 78, 0] },
    { name: 'Exploded View', position: [400, 280, 580], target: [0, 185, 0] },
  ],
};

// Visual Gap Checklist based on reference images
const VISUAL_GAP_CHECKLIST = [
  // PB Lead Door Issues (from reference image)
  { 
    product: 'pb-lead-door',
    id: 1, 
    category: 'Frame/Kusen',
    issue: 'Kusen/frame tidak tersambung dengan proper ke wall context', 
    severity: 'critical',
    expected: 'Frame harus connected dengan wall structure dengan proper rebate/door stop',
  },
  { 
    product: 'pb-lead-door',
    id: 2, 
    category: 'Frame/Kusen',
    issue: 'Door stop molding tidak terlihat atau tidak proper', 
    severity: 'high',
    expected: 'L-shaped rebate harus visible untuk catch door leaf',
  },
  { 
    product: 'pb-lead-door',
    id: 3, 
    category: 'Door Closer',
    issue: 'Regular arm 2-piece mechanism tidak akurat', 
    severity: 'high',
    expected: 'Main arm + forearm + pivot joint harus terlihat jelas',
  },
  { 
    product: 'pb-lead-door',
    id: 4, 
    category: 'Hinges',
    issue: 'Butt hinges placement/scale tidak tepat', 
    severity: 'medium',
    expected: '3 hinges di LEFT side dengan proper knuckle dan pin',
  },
  { 
    product: 'pb-lead-door',
    id: 5, 
    category: 'Window',
    issue: 'View glass 200x300mm rounded corners tidak akurat', 
    severity: 'medium',
    expected: 'Rounded corners r=15mm dengan SS frame border',
  },
  { 
    product: 'pb-lead-door',
    id: 6, 
    category: 'Kick Plate',
    issue: 'Kick plate 260mm tidak proper atau missing screws', 
    severity: 'low',
    expected: 'SS 304 brushed dengan 6 countersunk screws',
  },
  { 
    product: 'pb-lead-door',
    id: 7, 
    category: 'Bottom Seal',
    issue: 'Door bottom seal (aluminium+rubber) tidak terlihat', 
    severity: 'medium',
    expected: 'Aluminium housing + rubber drop seal visible',
  },
  { 
    product: 'pb-lead-door',
    id: 8, 
    category: 'Handle',
    issue: 'Bar pull handle SS tidak proper mounting', 
    severity: 'medium',
    expected: 'Horizontal bar ⌀22×500mm dengan bracket dan base plate',
  },
  
  // Scrub Sink Issues (from reference image)
  { 
    product: 'scrub-sink',
    id: 9, 
    category: 'Basin',
    issue: 'Sink/basin terpisah dari countertop (floating)', 
    severity: 'critical',
    expected: 'Basin harus integrated/flush dengan countertop surface',
  },
  { 
    product: 'scrub-sink',
    id: 10, 
    category: 'Basin',
    issue: 'Basin depth/slope tidak terlihat (harus deep sloping)', 
    severity: 'high',
    expected: '200mm deep dengan coved corners dan sloping bottom',
  },
  { 
    product: 'scrub-sink',
    id: 11, 
    category: 'Mirror',
    issue: 'Mirror overlap dengan backsplash/canopy', 
    severity: 'critical',
    expected: 'Mirror harus mounted di backsplash dengan proper clearance',
  },
  { 
    product: 'scrub-sink',
    id: 12, 
    category: 'Mirror',
    issue: 'Mirror frame SS tidak terlihat proper', 
    severity: 'medium',
    expected: 'SS frame 4 bars dengan proper thickness',
  },
  { 
    product: 'scrub-sink',
    id: 13, 
    category: 'Faucet',
    issue: 'Gooseneck faucet curve tidak akurat', 
    severity: 'high',
    expected: 'CatmullRom S-curve dengan aerator di tip',
  },
  { 
    product: 'scrub-sink',
    id: 14, 
    category: 'Cabinet',
    issue: 'Hinged doors tidak proper alignment/gap', 
    severity: 'medium',
    expected: '4 doors dengan D-pull handles dan proper spacing',
  },
  { 
    product: 'scrub-sink',
    id: 15, 
    category: 'Divider',
    issue: 'Plexiglass divider tidak proper placement', 
    severity: 'medium',
    expected: '8mm plexiglass di center dengan SS channel base',
  },
  { 
    product: 'scrub-sink',
    id: 16, 
    category: 'Canopy',
    issue: 'Canopy LED/UV placement tidak akurat', 
    severity: 'medium',
    expected: 'LED strip + UV lamps di canopy housing',
  },
  { 
    product: 'scrub-sink',
    id: 17, 
    category: 'P-Trap',
    issue: 'P-trap plumbing tidak visible atau incorrect', 
    severity: 'low',
    expected: 'P-trap SS 304 di bawah basin dengan proper curve',
  },
];

// Find active port and test connectivity
async function findActivePort() {
  for (const baseUrl of BASE_URLS) {
    try {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.createBrowserContext();
      const page = await context.newPage();

      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
      await page.waitForSelector('body', { timeout: 5000 });
      
      console.log(`✓ Server found at: ${baseUrl}`);
      await browser.close();
      return baseUrl;
    } catch (e) {
      // Continue to next URL
    }
  }
  throw new Error('No active dev server found. Start with: npm run dev');
}

// Select product from sidebar
async function selectProduct(page, productId, productName) {
  await page.evaluate((id) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find(b => 
      b.textContent?.toLowerCase().includes(id.toLowerCase()) ||
      b.textContent?.toLowerCase().includes(id.replace(/-/g, ' '))
    );
    if (button instanceof HTMLButtonElement) {
      button.scrollIntoView({ block: 'center', inline: 'center' });
      button.click();
    }
  }, productId);
  
  // Wait for canvas to render
  await page.waitForTimeout(2000);
}

// Switch view (assembled/exploded)
async function switchView(page, view) {
  await page.evaluate((viewType) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find(b => 
      b.textContent?.toLowerCase().includes(viewType.toLowerCase())
    );
    if (button instanceof HTMLButtonElement) {
      button.click();
    }
  }, view);
  
  await page.waitForTimeout(1500);
}

// Capture screenshot with specific camera preset
async function captureView(page, productId, view, cameraPreset) {
  const filename = `${productId}-${view}-${cameraPreset.name.toLowerCase().replace(/\s+/g, '-')}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  → ${filename}`);

  return filepath;
}

// Main execution
async function main() {
  console.log('\n🔍 Product Visual Inspection');
  console.log('============================\n');

  console.log('📍 Step 1: Locate dev server...');
  let baseUrl;
  try {
    baseUrl = await findActivePort();
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }

  console.log('\n📸 Step 2: Capture product views...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.setViewportSize({ width: 1600, height: 1000 });

  const capturedFiles = [];
  const inspectionResults = [];

  for (const product of PRODUCTS) {
    console.log(`\n📦 Product: ${product.name} (${product.id})`);
    
    // Navigate to product
    await page.goto(`${baseUrl}/products/${product.id}`, { 
      waitUntil: 'networkidle', 
      timeout: 15000 
    });
    await page.waitForTimeout(2000);

    for (const view of product.views) {
      console.log(`\n  [${view.toUpperCase()}]`);
      
      // Switch view if needed
      if (view === 'exploded') {
        await switchView(page, 'exploded');
      } else {
        await switchView(page, 'assembled');
      }

      // Capture each camera preset
      const presets = CAMERA_PRESETS[product.id] || [];
      for (const preset of presets) {
        try {
          // Apply camera preset via button click
          await page.evaluate((presetName) => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const button = buttons.find(b => 
              b.textContent?.toLowerCase().includes(presetName.toLowerCase())
            );
            if (button instanceof HTMLButtonElement) {
              button.click();
            }
          }, preset.name);

          await page.waitForTimeout(800);
          
          const filepath = await captureView(page, product.id, view, preset);
          capturedFiles.push(filepath);

          // Analyze for visual gaps
          const gaps = await analyzeVisualGaps(page, product.id, view, preset.name);
          inspectionResults.push({
            product: product.id,
            view,
            cameraPreset: preset.name,
            screenshot: path.basename(filepath),
            gaps,
          });
        } catch (e) {
          console.error(`    ✗ Preset ${preset.name} failed: ${e.message}`);
        }
      }
    }
  }

  await browser.close();

  // Generate report
  console.log('\n📊 Step 3: Generate inspection report...\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    executedAt: baseUrl,
    products: PRODUCTS.map(p => p.id),
    totalCaptures: capturedFiles.length,
    screenshots: capturedFiles.map(f => path.basename(f)),
    visualGapChecklist: VISUAL_GAP_CHECKLIST,
    inspectionResults,
    summary: generateSummary(inspectionResults),
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✓ Report saved: ${REPORT_FILE}`);
  console.log(`✓ Screenshots: ${capturedFiles.length} files in ${SCREENSHOTS_DIR}/`);

  console.log('\n📋 Visual Gap Summary:');
  console.log(`   Total issues identified: ${report.summary.totalIssues}`);
  console.log(`   Critical: ${report.summary.critical}`);
  console.log(`   High: ${report.summary.high}`);
  console.log(`   Medium: ${report.summary.medium}`);
  console.log(`   Low: ${report.summary.low}`);

  console.log('\n✅ Visual inspection complete. Review screenshots and report.\n');
}

// Analyze visual gaps (placeholder for AI vision/OCR)
async function analyzeVisualGaps(page, productId, view, cameraPreset) {
  const gaps = [];
  
  // Get viewport info for analysis context
  const viewportInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return {
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
    };
  });

  // In real scenario, would use AI vision to analyze screenshot
  // For now, flag potential issues based on known problems
  const knownIssues = VISUAL_GAP_CHECKLIST.filter(i => i.product === productId);
  
  for (const issue of knownIssues) {
    // Placeholder: mark all as "needs manual review"
    gaps.push({
      ...issue,
      status: 'needs_manual_review',
      evidence: `Screenshot: ${productId}-${view}-${cameraPreset.toLowerCase().replace(/\s+/g, '-')}.png`,
      notes: 'Requires visual comparison with reference images',
    });
  }

  return gaps;
}

// Generate summary from inspection results
function generateSummary(results) {
  const allGaps = results.flatMap(r => r.gaps);
  
  return {
    totalIssues: allGaps.length,
    critical: allGaps.filter(g => g.severity === 'critical').length,
    high: allGaps.filter(g => g.severity === 'high').length,
    medium: allGaps.filter(g => g.severity === 'medium').length,
    low: allGaps.filter(g => g.severity === 'low').length,
  };
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
