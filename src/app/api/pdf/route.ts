import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { cookies } from "next/headers";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, filename } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Pass the current cookies to Puppeteer for authentication
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Convert Next.js cookies to Puppeteer cookies
    const puppeteerCookies = allCookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: new URL(url).hostname,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax' as const
    }));

    await page.setCookie(...puppeteerCookies);

    // Set a large viewport for better rendering
    await page.setViewport({ width: 1440, height: 900 });

    // Navigate to the target print URL
    await page.goto(url, { waitUntil: "networkidle0" });

    // Wait for the specific print container to appear and data to load
    // We wait for the 'Loading Real-Time Scores' text to disappear if it exists
    try {
      await page.waitForFunction(
        () => !document.body.innerText.includes("Loading Real-Time Scores"),
        { timeout: 15000 }
      );
    } catch (e) {
      console.warn("Wait for loader timeout, proceeding anyway");
    }

    // Wait an extra second for SVG animations to settle
    await new Promise(r => setTimeout(r, 1000));

    // Generate the PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      displayHeaderFooter: false,
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename || 'report.pdf'}"`,
      },
    });

  } catch (error: any) {
    console.error("Puppeteer PDF Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
