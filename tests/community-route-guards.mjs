import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(file, deps) {
 const mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports:mod.exports,process:{env:{}},require:name=>name in deps?deps[name]:require(name)});
 return mod.exports;
}
const guard={hasTrustedMutationOrigin:()=>true,exceedsRequestSize:()=>false,isRateLimited:()=>false,requestIp:()=> 'test'};
const auth={createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'session-user',email_confirmed_at:'2026-11-02'}}})}})};
const limits={consumePulsoRateLimit:async()=>({allowed:true})};
for (const record of [{status:'locked',age_band:'adult'},{status:'deleted',age_band:'adult'},{status:'pending',age_band:'young_teen'},{status:'pending',age_band:'child'}]) {
 let writes=0;
 const route=load('src/app/api/solos/pulso/safety-profile/route.ts',{
  '@/lib/request-guard':guard,'@/lib/supabase/server':auth,'@/lib/pulso-rate-limit':limits,
  '@/lib/supabase/admin':{createAdminClient:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:record})})}),upsert:async()=>{writes++;return{}}})})},
 });
 const response=await route.POST(new Request('https://pulso.rocks/api/solos/pulso/safety-profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adultConfirmed:true,policyAccepted:true})}));
 assert.equal(response.status,403);assert.equal((await response.json()).error,'account_restricted');assert.equal(writes,0);
}
let rpcArgs;
const enroll=load('src/app/api/solos/pulso/community/enroll/route.ts',{
 '@/lib/request-guard':guard,'@/lib/supabase/server':auth,'@/lib/pulso-rate-limit':limits,
 '@/lib/pulso-alpha':{isPulsoAlphaRuntimeEnabled:()=>true},'@/lib/pulso-community-policy':{COMMUNITY_NOTICE_HASH:'test-notice'},
 '@/lib/supabase/admin':{createAdminClient:()=>({rpc:async(name,args)=>{rpcArgs=args;return{data:{status:'active'}}}})},
});
const request=body=>new Request('https://pulso.rocks/api/solos/pulso/community/enroll',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
assert.equal((await enroll.POST(request({accepted:false,independentAge:true}))).status,400);assert.equal(rpcArgs,undefined);
assert.equal((await enroll.POST(request({accepted:true,independentAge:true,userId:'someone-else'}))).status,200);
assert.equal(rpcArgs.p_user_id,'session-user');
console.log('PASS: locked/deleted/known-young profiles cannot be overwritten; enrollment requires consent and binds to authenticated user, not supplied ID');
