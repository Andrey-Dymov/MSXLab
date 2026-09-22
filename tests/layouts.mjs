import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const dir='/tmp/msxlab-layouts-'+Date.now();const env={...process.env,MSXLAB_USER_DATA:dir};delete env.ELECTRON_RUN_AS_NODE;let app;
async function start(){app=await electron.launch({args:['.'],env});const page=await app.firstWindow();await page.waitForSelector('.panel-disassembler tbody tr');return page;}
try{
 let page=await start();const frame=page.frames().find(f=>f.url().includes('/engine/index.html'));
 await page.locator('.panel-disassembler').getByRole('textbox',{name:'Address',exact:true}).fill('454C');await page.locator('.panel-disassembler').getByRole('textbox',{name:'Address',exact:true}).press('Enter');await page.getByRole('combobox',{name:'Listing mode'}).selectOption('procedure');
 await page.getByRole('button',{name:'Layouts…',exact:true}).click();await page.getByRole('textbox',{name:'Layout name'}).fill('Research');await page.getByRole('button',{name:'Save current layout'}).click();await page.getByRole('button',{name:'Apply layout Research',exact:true}).waitFor();await page.getByRole('button',{name:'Close layouts'}).click();
 await page.getByRole('button',{name:'Close Screen',exact:true}).click();assert.equal(await page.locator('.panel-screen').count(),0);
 await page.getByRole('button',{name:'Layouts…',exact:true}).click();await page.getByRole('textbox',{name:'Layout name'}).fill('Code');await page.getByRole('button',{name:'Save current layout'}).click();await page.getByRole('button',{name:'Apply layout Code',exact:true}).waitFor();await page.getByRole('button',{name:'Apply layout Research',exact:true}).click();assert.equal(await page.locator('.panel-screen').count(),1);assert.equal(page.frames().find(f=>f.url().includes('/engine/index.html')),frame);
 await page.getByRole('button',{name:'Apply layout Code',exact:true}).click();assert.equal(await page.locator('.panel-screen').count(),0);
 await app.close();app=null;page=await start();await page.getByRole('button',{name:'Layouts…',exact:true}).click();await page.getByRole('button',{name:'Apply layout Research',exact:true}).click();assert.equal(await page.locator('.panel-screen').count(),1);assert.equal(await page.getByRole('combobox',{name:'Listing mode'}).inputValue(),'procedure');assert.equal(await page.locator('.panel-disassembler').getByRole('textbox',{name:'Address',exact:true}).inputValue(),'454C');await page.getByRole('button',{name:'Delete layout Code',exact:true}).click();await page.getByRole('button',{name:'Apply layout Code',exact:true}).waitFor({state:'detached'});
 await page.getByRole('button',{name:'Rename layout Research',exact:true}).click();await page.getByRole('textbox',{name:'New layout name'}).fill('Graphics');await page.getByRole('button',{name:'Rename',exact:true}).click();await page.getByRole('button',{name:'Apply layout Graphics',exact:true}).waitFor();
 console.log('PASS named layouts save/apply/delete, persistence after restart, engine frame preserved');
}finally{if(app)await app.close();await fs.rm(dir,{recursive:true,force:true});}
