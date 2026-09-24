const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');

const root=__dirname;
const port=4173;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};

http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const target=path.resolve(root,relative);
  if(!target.startsWith(root+path.sep)){
    response.writeHead(403);response.end('Forbidden');return;
  }
  fs.readFile(target,(error,data)=>{
    if(error){response.writeHead(error.code==='ENOENT'?404:500);response.end('Not found');return;}
    response.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(data);
  });
}).listen(port,'127.0.0.1',()=>console.log(`Глубины астрала: http://127.0.0.1:${port}`));
