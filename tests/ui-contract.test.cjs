const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('every referenced interface element exists in the page',()=>{
  const root=path.join(__dirname,'..');
  const script=fs.readFileSync(path.join(root,'game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const referenced=[...script.matchAll(/\$\('([^']+)'\)/g)].map(match=>match[1]);
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
  for(const id of referenced)assert.ok(ids.has(id),`Missing element: ${id}`);
});
