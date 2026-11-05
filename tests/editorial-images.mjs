import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const req=createRequire(import.meta.url);
function load(path){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{exports:mod.exports,require:name=>name==='@/lib/pulso-editorial-images'?load('src/lib/pulso-editorial-images.ts'):name==='next/link'?({children,...props})=>React.createElement('a',props,children):name==='next/image'?({src,alt,width,height,style})=>React.createElement('img',{src,alt,width,height,style}):name==='next/navigation'?{useRouter:()=>({refresh(){}})}:req(name)});return mod.exports;}
const {getPulsoEditorialImage}=load('src/lib/pulso-editorial-images.ts');
const {PostCard}=load('src/app/solos/pulso/feed/feed-client.tsx');
for(const id of ['5b90beea-70e9-4f10-89e7-a2e04a0fb601','5b90beea-70e9-4f10-89e7-a2e04a0fb602','7834d67f-eab7-4b41-9e98-c56c598c03a1']){
 const media=getPulsoEditorialImage(id,'public');assert.ok(media);assert.equal(getPulsoEditorialImage(id,'limited'),null);assert.equal(getPulsoEditorialImage(id,'private'),null);
 const file='public'+media.src; const meta=await sharp(file).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,1536);assert.equal(meta.height,1024);assert.equal(meta.exif,undefined);assert.ok(fs.statSync(file).size<1048576);
 const post={id,body:'Texto original preservado',createdAt:'2026-11-02T00:00:00Z',own:false,authorName:'Luigi',handle:null,visibility:'public',topicTitle:null,imageUrl:media.src,imageAlt:media.alt,imageGenerated:true,imageBytes:null,commentsEnabled:true,original:null,reactions:{},ownReactions:[],comments:[]};
 const guest=renderToStaticMarkup(React.createElement(PostCard,{post,canInteract:false,readOnly:true}));
 const member=renderToStaticMarkup(React.createElement(PostCard,{post,canInteract:true}));
 for(const html of [guest,member]){assert.ok(html.includes(media.src));assert.ok(html.includes(media.alt));assert.ok(html.includes('Ilustração gerada por IA'));assert.ok(!html.includes('WebP privado'));assert.ok(html.includes('Texto original preservado'));assert.equal((html.match(/<img /g)||[]).length,1);assert.ok(html.indexOf('<img ')<html.indexOf('Texto original preservado'));}
}
assert.equal(getPulsoEditorialImage('unknown','public'),null);assert.equal(getPulsoEditorialImage('toString','public'),null);
console.log('PASS: three public-only reviewed assets; WebP/size/metadata; same guest/member image, alt and AI label; original text unchanged; no duplicate image or private promotion');
const {getPulsoEditorialVideo}=load('src/lib/pulso-editorial-images.ts');
const videoId='d8d5c148-70b1-4be8-95cd-0587c6b3f205';
const video=getPulsoEditorialVideo(videoId,'public');assert.ok(video);
for(const visibility of ['limited','private',undefined])assert.equal(getPulsoEditorialVideo(videoId,visibility),null);
for(const id of ['unknown','toString','7834d67f-eab7-4b41-9e98-c56c598c03a1'])assert.equal(getPulsoEditorialVideo(id,'public'),null);
const illustration=getPulsoEditorialImage(videoId,'public');assert.ok(illustration);
const videoPost={id:videoId,body:'Discussão do episódio',createdAt:'2026-11-05T00:00:00Z',own:false,authorName:'Luigi',handle:null,visibility:'public',topicTitle:null,imageUrl:illustration.src,imageAlt:illustration.alt,imageGenerated:true,imageBytes:null,commentsEnabled:true,original:null,reactions:{},ownReactions:[],comments:[]};
for(const canInteract of [false,true]){
 const html=renderToStaticMarkup(React.createElement(PostCard,{post:videoPost,canInteract}));
 assert.equal((html.match(/<video /g)||[]).length,1);assert.ok(html.includes(video.src));assert.ok(html.includes('preload="none"'));assert.ok(html.includes('controls=""'));assert.ok(!html.includes('autoPlay'));assert.ok(!html.includes('autoplay'));assert.ok(html.includes('poster="'+illustration.src+'"'));assert.ok(html.includes(video.caption));assert.equal((html.match(/<img /g)||[]).length,0);
}
const limited=renderToStaticMarkup(React.createElement(PostCard,{post:{...videoPost,visibility:'limited',imageUrl:null},canInteract:false}));
assert.ok(!limited.includes('<video '));assert.ok(!limited.includes(video.src));
console.log('PASS: commissioned video only on its public post; guest/member parity; no autoplay or eager fetch; AI poster; private/unknown IDs rejected');
