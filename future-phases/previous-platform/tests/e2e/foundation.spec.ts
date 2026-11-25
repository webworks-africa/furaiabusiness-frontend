import {test,expect} from '@playwright/test';
for(const [surface,port,base,identifier,title,secondScope] of [
 ['ops',5173,'/ops','operator@staff.sandbox','Operations workspace','Furaia Sandbox Entity'],
 ['customer',5174,'/app','customer@customer.sandbox','Your workspace','Kamau Studio'],
 ['partner',5175,'/partners','developer@partner.sandbox','Integration workspace','Acacia Labs'],
] as const){
 test(`${surface}: auth boundary, scope switch, environment denial and logout`,async({page})=>{
  await page.goto(`http://localhost:${port}${base}`);
  await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
  await page.getByLabel('Sign-in identifier').fill(surface==='ops'?'developer@partner.sandbox':'operator@staff.sandbox');
  await page.getByLabel('Verification challenge').fill('246810');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('could not be verified');
  await page.getByLabel('Sign-in identifier').fill(identifier);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await page.getByLabel('Active scope').selectOption({label:secondScope});
  await expect(page.locator('.page-heading')).toContainText(secondScope);
  await page.getByLabel('Environment', {exact:true}).selectOption('production');
  await expect(page.getByRole('alert')).toContainText('not granted');
  await expect(page.getByLabel('Environment',{exact:true})).toHaveValue('sandbox');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 });
}
test('customer mobile navigation and table remain usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:5174/app');
 await page.getByLabel('Sign-in identifier').fill('customer@customer.sandbox');await page.getByLabel('Verification challenge').fill('246810');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your workspace'})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Account holder mobile navigation'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Toggle navigation'}).click();await expect(page.getByRole('navigation',{name:'Account Holder navigation'})).toBeVisible();
 await page.getByRole('button',{name:'Toggle navigation'}).click();
 await page.screenshot({path:'test-results/customer-mobile.png',fullPage:true});
});
test('keyboard sign-in and foundation pending routes stay explicit',async({page})=>{
 await page.goto('http://localhost:5173/ops');await page.getByLabel('Sign-in identifier').focus();await page.keyboard.type('operator@staff.sandbox');await page.keyboard.press('Tab');await page.keyboard.type('246810');await page.keyboard.press('Tab');await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Operations workspace'})).toBeVisible();await page.screenshot({path:'test-results/operations-desktop.png',fullPage:true});
 await page.getByRole('link',{name:'Reconciliation exceptions',exact:true}).click();await expect(page.getByText('The navigation entry does not count as frontend completion.')).toBeVisible();
 await page.goto('http://localhost:5173/partners');await expect(page.getByRole('alert')).toContainText('outside the application boundary');
});

test('expired session clears the workspace and rejects missing CSRF',async({page})=>{
 await page.goto('http://localhost:5173/ops');await page.getByLabel('Sign-in identifier').fill('operator@staff.sandbox');await page.getByLabel('Verification challenge').fill('246810');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Operations workspace'})).toBeVisible();
 const blocked=await page.evaluate(async()=>{const r=await fetch('/ops/v1/sessions',{method:'DELETE'});return r.status;});expect(blocked).toBe(403);
 await page.evaluate(async()=>{const session=await (await fetch('/ops/v1/sessions')).json() as {csrf_token:string};await fetch('/ops/v1/sessions',{method:'DELETE',headers:{'X-CSRF-Token':session.csrf_token}});});
 await page.getByRole('button',{name:'Refresh workspace'}).click();await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();await expect(page.getByText('Authorized contexts')).toHaveCount(0);
});

test('partner layout fits small screens and enlarged text',async({page})=>{
 await page.setViewportSize({width:720,height:900});await page.goto('http://localhost:5175/partners');await page.getByLabel('Sign-in identifier').fill('developer@partner.sandbox');await page.getByLabel('Verification challenge').fill('246810');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Integration workspace'})).toBeVisible();
 await page.evaluate(()=>{document.documentElement.style.fontSize='32px';});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Sign out'})).toBeVisible();
 await page.evaluate(()=>{document.documentElement.style.fontSize='16px';});await page.screenshot({path:'test-results/partner-small-screen.png',fullPage:true});
});
