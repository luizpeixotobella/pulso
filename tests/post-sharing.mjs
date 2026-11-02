import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { createRequire } from 'node:module';
const req=createRequire(import.meta.url);
function load(path,deps={},globals={}) {const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{exports:mod.exports,...globals,require:name=>Object.hasOwn(deps,name)?deps[name]:req(name)});return mod.exports;}
const id='5b90beea-70e9-4f10-89e7-a2e04a0fb601';
let states=[],cursor=0,shared=[],copied=[];
const navigator={clipboard:{writeText:async text=>{copied.push(text)}},share:async data=>shared.push(data)};
const hooks={...React,useId:()=> 'share-panel',useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],value=>states[i]=typeof value==='function'?value(states[i]):value]}};
const {PostShare,postPermalink}=load('src/app/solos/pulso/feed/feed-client.tsx',{'react':hooks,'next/navigation':{useRouter:()=>({refresh(){}})},'next/link':()=>null,'next/image':()=>null},{navigator});
function render(isPublic=true){cursor=0;return PostShare({id,isPublic});}
function all(node,type){if(!node)return[];if(Array.isArray(node))return node.flatMap(n=>all(n,type));if(typeof node!=='object')return[];return [...(node.type===type?[node]:[]),...all(node.props?.children,type)];}
function button(tree,label){return all(tree,'button').find(n=>n.props.children===label)}
let tree=render();assert.equal(shared.length,0);await all(tree,'button')[0].props.onClick();tree=render();
const url='https://pulso.rocks/p/'+id;
const links=all(tree,'a');assert.equal(links.length,5);for(const a of links){assert.equal(a.props.target,'_blank');assert.match(a.props.rel,/noopener/);const u=new URL(a.props.href);assert.ok([...u.searchParams.values()].some(v=>v.includes(url)));}
await button(tree,'Copiar link').props.onClick();assert.equal(copied[0],url);assert.match(states[1],/copiado/);
await button(tree,'Mais aplicativos…').props.onClick();assert.equal(shared[0].url,url);assert.equal(shared[0].text,'Entre na conversa no Pulso');
navigator.share=async()=>{throw {name:'AbortError'}};await button(tree,'Mais aplicativos…').props.onClick();assert.equal(states[1],'');
navigator.clipboard.writeText=async()=>{throw Error('denied')};await button(tree,'Copiar link').props.onClick();tree=render();assert.match(states[1],/manualmente/);assert.equal(all(tree,'input')[0].props.value,url);
states=[];tree=render(false);await all(tree,'button')[0].props.onClick();tree=render(false);assert.equal(all(tree,'a').length,0);assert.ok(!button(tree,'Mais aplicativos…'));assert.match(all(tree,'input')[0].props.value,/feed\?post=.*#post-/);assert.equal(postPermalink(id,true),'/p/'+id);

const publicId=id,privateId='11111111-1111-4111-8111-111111111111',pendingId='22222222-2222-4222-8222-222222222222',adultId='33333333-3333-4333-8333-333333333333';
const rows=[{id:publicId,status:'published',moderation_status:'allowed',visibility:'public',audience:'general',media_type:'text',repost_of:null,body:'Public text',author_id:'public-author',agent_id:null,comments_enabled:true,created_at:'2026-11-02T00:00:00Z'},{id:privateId,status:'published',moderation_status:'allowed',visibility:'limited',audience:'adult',media_type:'text',body:'PRIVATE SECRET'},{id:pendingId,status:'hidden',moderation_status:'review',visibility:'public',audience:'general',media_type:'text',body:'PENDING SECRET'},{id:adultId,status:'published',moderation_status:'allowed',visibility:'public',audience:'adult',media_type:'text',body:'ADULT SECRET'}];
let calls=0,scopeCalls=0;
function query(table){let data=table==='pulso_posts'?[...rows]:[];const q={select(){return q},eq(k,v){data=data.filter(r=>r[k]===v);return q},in(){return q},order(){return q},limit(n){data=data.slice(0,n);return q},or(scope){assert.equal(scope,'and(visibility.eq.public,audience.eq.general,media_type.eq.text,repost_of.is.null)');scopeCalls++;data=data.filter(r=>r.visibility==='public'&&r.audience==='general'&&r.media_type==='text'&&r.repost_of===null);return q},then(resolve){return Promise.resolve({data,error:null}).then(resolve)}};return q;}
const scope=load('src/lib/pulso-feed-scope.ts');
const publicData=load('src/lib/pulso-public.ts',{'react':{cache:f=>f},'@/lib/pulso-editorial-images':{getPulsoEditorialImage:()=>null},'@/lib/pulso-feed-scope':scope,'@/lib/supabase/admin':{createAdminClient:()=>{calls++;return{from:query}}}});
assert.equal((await publicData.getPublicPulsoPost(publicId)).id,publicId);
for(const secret of [privateId,pendingId,adultId])assert.equal(await publicData.getPublicPulsoPost(secret),null);
const before=calls;assert.equal(await publicData.getPublicPulsoPost('not-a-uuid'),null);assert.equal(calls,before);assert.equal(scopeCalls,4);
const page=load('src/app/p/[id]/page.tsx',{'next/link':()=>null,'next/navigation':{notFound(){throw Error('notfound')}},'@/lib/pulso-public':publicData,'@/lib/supabase/server':{},'@/lib/pulso-alpha':{},'@/components/pulso-single-post':()=>null});
for(const secret of [privateId,pendingId,adultId]){const meta=await page.generateMetadata({params:Promise.resolve({id:secret})});assert.equal(meta.robots.index,false);assert.ok(!JSON.stringify(meta).includes('SECRET'));assert.equal(meta.openGraph.images.length,0);}
const meta=await page.generateMetadata({params:Promise.resolve({id:publicId})});assert.equal(meta.alternates.canonical,'/p/'+publicId);assert.match(meta.openGraph.title,/Public text/);
console.log('PASS: canonical links, 5 opt-in network intents, native share/cancel, clipboard failure/manual fallback, private copy-only; single-post queries and metadata reject private/pending/adult/invalid records');
