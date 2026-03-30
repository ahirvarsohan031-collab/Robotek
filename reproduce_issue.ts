const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function reproduce() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Set viewport to see full page
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message));

  // Construct a realistic URL (replace userId with a real one if known)
  // I'll try with no userId first to see if it crashes when user is missing
  const url = 'http://localhost:3000/score?print=true&userId=NONE&from=2026-03-01&to=2026-03-31&type=month';
  console.log(`Navigating to ${url}...`);

  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    console.log('Page loaded (load event). Status:', response.status());
    
    // Wait a bit for SWR and other stuff
    await new Promise(r => setTimeout(r, 5000));

    const content = await page.content();
    if (content.includes('Application error') || content.includes('client-side exception')) {
        console.log('DETECTED APPLICATION ERROR ON PAGE');
    } else {
        console.log('No application error detected in HTML content');
    }

    // Take screenshot to see what's happening
    await page.screenshot({ path: path.join(__dirname, 'reproduce_screenshot.png'), fullPage: true });
    console.log('Screenshot saved to reproduce_screenshot.png');

  } catch (e) {
    console.log('Navigation failed:', e.message);
  }

  await browser.close();
}

reproduce();
