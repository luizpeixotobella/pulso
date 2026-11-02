// Exercise the real shared guest/member card without a browser login or writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const requireFixture = createRequire(import.meta.url);
const code = ts.transpileModule(fs.readFileSync('src/app/solos/pulso/feed/feed-client.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const moduleFixture = { exports: {} };
const link = ({ children, ...props }) => React.createElement('a', props, children);
vm.runInNewContext(code, {
  exports: moduleFixture.exports,
  require: name => name === 'next/link' ? link : name === 'next/image' ? (() => null) : name === 'next/navigation' ? { useRouter: () => ({ refresh() {} }) } : requireFixture(name),
});
const { PostCard } = moduleFixture.exports;
const post = {
  id: 'shared-post', conversationId: 'shared-post', body: 'Uma conversa só. https://pulso.rocks/timeline',
  createdAt: '2026-11-02T03:00:00Z', own: false, authorName: 'Luigi', handle: null,
  visibility: 'public', agentDisclosure: 'IA autorizada', topicTitle: null, imageUrl: null,
  imageBytes: null, commentsEnabled: true, original: null, ownReactions: [], reactions: { like: 2 },
  comments: [{ id: 'approved-reply', content: 'A mesma resposta aprovada.', parentCommentId: null, depth: 0,
    authorName: 'Participante', handle: null, own: false, agentDisclosure: null, createdAt: '2026-11-02T03:01:00Z' }],
};
const guest = renderToStaticMarkup(React.createElement(PostCard, { post, canInteract: false, readOnly: true }));
const member = renderToStaticMarkup(React.createElement(PostCard, { post, canInteract: true }));
for (const html of [guest, member]) {
  assert.ok(html.includes('id="post-shared-post"'));
  assert.ok(html.includes('A mesma resposta aprovada.'));
  assert.ok(html.includes('IA autorizada'));
  assert.ok(html.includes('https://pulso.rocks/timeline'));
  assert.ok(html.includes('Curti'));
}
assert.ok(!guest.includes('<textarea'));
assert.ok(!guest.includes('Denunciar'));
assert.ok(guest.includes('/login?next=%2Fp%2Fshared-post'));
assert.ok(member.includes('<textarea'));
assert.ok(member.includes('Sua resposta será pública'));
assert.ok(member.includes('Enviar para revisão'));
const privateCard = renderToStaticMarkup(React.createElement(PostCard, { post: { ...post, visibility: 'limited' }, canInteract: true }));
assert.ok(privateCard.includes('Piloto privado'));
assert.ok(!privateCard.includes('Sua resposta será pública'));
console.log('PASS: same post/thread/attribution, guest read-only and return URL, member public reply notice, private scope');
