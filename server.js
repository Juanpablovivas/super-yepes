const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');
const html=fs.readFileSync(path.join(__dirname,'public','index.html'));
const srv=http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(html)});
const wss=new WebSocketServer({server:srv,path:'/ws',maxPayload:16384});
const rooms=new Map();
wss.on('connection',(ws,req)=>{
  const code=(new URL(req.url,'http://x').searchParams.get('room')||'sala1').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12)||'sala1';
  if(!rooms.has(code))rooms.set(code,new Map());
  const room=rooms.get(code);
  if(room.size>=8){ws.close();return}
  const id=Math.random().toString(36).slice(2,10);
  ws.p={};room.set(id,ws);
  ws.send(JSON.stringify({t:'hi',id}));
  room.forEach((o,k)=>{if(k!==id)ws.send(JSON.stringify({t:'s',id:k,p:o.p}))});
  ws.on('message',buf=>{
    let m;try{m=JSON.parse(buf)}catch{return}
    if(m.t!=='p'||!m.d||typeof m.d!=='object')return;
    for(const k in m.d){if(m.d[k]===null)delete ws.p[k];else ws.p[k]=m.d[k]}
    const out=JSON.stringify({t:'s',id,p:ws.p});
    room.forEach((o,k)=>{if(k!==id&&o.readyState===1)o.send(out)});
  });
  ws.on('close',()=>{
    room.delete(id);
    const out=JSON.stringify({t:'l',id});
    room.forEach(o=>{if(o.readyState===1)o.send(out)});
    if(!room.size)rooms.delete(code);
  });
});
srv.listen(process.env.PORT||3000,()=>console.log('Servidor listo'));
