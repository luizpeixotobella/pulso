import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
function load(file,deps={}) {
 const mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports:mod.exports,Buffer,Response,process:{env:{}},require:name=>name in deps?deps[name]:require(name)});
 return mod.exports;
}
const support=load('src/lib/support.ts');
let trusted=true,allowed=true,unavailable=false,writes=0,hash,storedTicket,requestedHash,rpcCalls=0;
const query={
 select(){return this;}, eq(col,value){if(col==='access_hash')requestedHash=value;return this;}, order(){return this;},
 single:async()=>({data:{id:'11111111-1111-4111-8111-111111111111'}}),
 maybeSingle:async()=>({data:storedTicket && requestedHash===hash?storedTicket:null}),
 then(resolve){resolve({data:[{id:'message',author:'operator',body:'Resposta privada',created_at:'2026-11-02'}]});},
};
const route=load('src/app/api/atendimento/route.ts',{
 '@/lib/support':support,
 '@/lib/request-guard':{hasTrustedMutationOrigin:()=>trusted,exceedsRequestSize:()=>false},
 '@/lib/pulso-rate-limit':{consumePulsoRateLimit:async()=>({allowed,unavailable}),consumePulsoRateLimitForKey:async()=>({allowed,unavailable})},
 '@/lib/supabase/admin':{createAdminClient:()=>({from:()=>({...query,insert(data){writes++;hash=data.access_hash;return query;}}),rpc:async()=>{rpcCalls++;return{};}})},
});
const req=body=>new Request('https://pulso.rocks/api/atendimento',{method:'POST',body:typeof body==='string'?body:JSON.stringify(body)});
const create={action:'create',email:'person@example.invalid',topic:'problema',message:'Uma dúvida de teste sem envio de email.'};
trusted=false;assert.equal((await route.POST(req(create))).status,403);assert.equal(writes,0);trusted=true;
for(const bad of [null,[],{...create,email:{}},{...create,topic:'toString'},{...create,website:'spam'},'{bad']) assert.equal((await route.POST(req(bad))).status,400);
assert.equal((await route.POST(req('x'.repeat(16001)))).status,413);assert.equal(writes,0);
allowed=false;assert.equal((await route.POST(req(create))).status,429);unavailable=true;assert.equal((await route.POST(req(create))).status,503);allowed=true;unavailable=false;
const response=await route.POST(req(create));assert.equal(response.status,201);assert.match(response.headers.get('cache-control'),/no-store/);
const receipt=await response.json();assert.equal(receipt.key.length,48);assert.equal(hash.length,64);assert.notEqual(hash,receipt.key);
storedTicket={id:receipt.id,topic:'problema',status:'open',message:'Privada'};
assert.equal((await route.POST(req({action:'lookup',id:receipt.id,key:'0'.repeat(48)}))).status,404);
const thread=await route.POST(req({action:'lookup',...receipt}));assert.equal(thread.status,200);const body=await thread.json();assert.equal(body.message,'Privada');assert.equal(body.email,undefined);assert.equal(body.access_hash,undefined);assert.equal(body.messages[0].body,'Resposta privada');
assert.equal((await route.POST(req({action:'followup',...receipt,message:'Continuando'}))).status,200);assert.equal(rpcCalls,1);
assert.equal((await route.POST(req({action:'followup',...receipt,key:'0'.repeat(48),message:'Intruso'}))).status,404);assert.equal(rpcCalls,1);
let adminCreated=false;
const actions=load('src/app/admin/pulso/atendimento/actions.ts',{
 'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:()=>{throw Error('redirect');}},'@/lib/support':support,
 '@/lib/admin-auth':{requirePulsoOperatorMfa:async()=>{throw Error('MFA required');}},
 '@/lib/supabase/admin':{createAdminClient:()=>{adminCreated=true;return{};}},
});
await assert.rejects(()=>actions.replyToSupport(new FormData()),/MFA required/);assert.equal(adminCreated,false);
const {renderToStaticMarkup}=require('react-dom/server');
const Center=load('src/app/ajuda/support-center.tsx',{'@/lib/support':support}).default;
const html=renderToStaticMarkup(require('react').createElement(Center));
assert.match(html,/Não precisa criar conta/);assert.match(html,/https:\/\/wa.me\/5511951518438/);assert.match(html,/mailto:contato@luiz-bella-artes.net/);assert.match(html,/sem.*plantão|não há plantão/i);assert.doesNotMatch(html,/atendimento humano 24/i);
console.log('PASS support: same-origin/body validation, rate limits fail closed, hashed key, wrong-key privacy, follow-up continuity, MFA before operator access, contact and no false live-service promises');
