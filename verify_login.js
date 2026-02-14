const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/admin/login.html');
  await page.evaluate(() => sessionStorage.setItem('key_cleared', 'true'));
  await page.reload();
  await page.screenshot({ path: 'login_local.png' });
  await browser.close();
})();
