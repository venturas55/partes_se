import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const logoPath = path.join(__dirname, '../public/img/logo-APV.svg');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');

const defaultOptions = {
  format: 'A4',
  printBackground: false,
  displayHeaderFooter: true,
    headerTemplate: `
    <div style="font-size:0; height:0;"></div>
  `,
  footerTemplate: `
    <div style="
      width:100%;
      font-size:12px;
      padding:0 15mm;
      box-sizing:border-box;
    ">
      <div style="
        width:100%;
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
      ">
        <span>SISTEMAS de AYUDA a la NAVEGACIÓN</span>

        <img src="data:image/svg+xml;base64,${logoBase64}" 
             style="height:14px;">

        <span>
          Página <span class="pageNumber"></span> de 
          <span class="totalPages"></span>
        </span>
      </div>
    </div>
  `,
  margin: {
    top: '5mm',
    bottom: '20mm',   // IMPORTANTE
    left: '5mm',
    right: '5mm'
  }
};

let browser;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu']
    });
  }
  return browser;
}
async function htmlTopdf(html, options = {}) {
  const browser = await getBrowser();
  let page;

  const timeoutMs = options.timeout || 30000; // 30s por defecto

  // helper timeout
  const withTimeout = (promise, ms) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout PDF (${ms}ms)`)), ms)
      )
    ]);
  };

  try {
    page = await browser.newPage();

    console.log("➡️ Cargando HTML en Puppeteer...");

    await withTimeout(
      page.setContent(html, {
        waitUntil: 'domcontentloaded', // 🔥 clave
        timeout: 15000
      }),
      timeoutMs
    );

    // pequeño delay para asegurar render
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log("🖨️ Generando PDF...");

    const pdfData = await withTimeout(
      page.pdf({
        ...defaultOptions,
        printBackground: true,
        timeout: 15000
      }),
      timeoutMs
    );

    const pdf = Buffer.from(pdfData);

    console.log("✅ PDF generado:", pdf.length, "bytes");

    return pdf;

  } catch (error) {
    console.error("❌ Error en htmlTopdf:", error);
    throw error;

  } finally {
    if (page && !page.isClosed()) {
      try {
        await page.close();
      } catch (e) {
        console.warn("⚠️ Error cerrando página:", e.message);
      }
    }
  }
}
export default htmlTopdf;