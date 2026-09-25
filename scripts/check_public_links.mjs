#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

const baseUrl = (process.env.PULSO_BASE_URL || "https://pulso.rocks").replace(/\/$/, "");
const files = await Array.fromAsync(glob("src/**/*.{ts,tsx,js,jsx}"));
const paths = new Set();

for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/(?:href|action)=["'](\/[^"']+)["']/g)) {
    const path = match[1].split("?")[0];
    if (!path.includes("[")) paths.add(path);
  }
}

const accepted = (status) => status >= 200 && status < 400 || [401, 403, 405].includes(status);
const forbiddenCmsPaths = [
  "/admin/ghost",
  "/blog",
  "/forum",
  "/produtos/solos-heart-pass",
  "/solos/fundadores",
];
let failures = 0;

for (const path of forbiddenCmsPaths) {
  if (paths.has(path)) {
    console.error(`FAIL legacy CMS destination still referenced: ${path}`);
    failures += 1;
  }
}

for (const path of [...paths].sort()) {
  let status = 0;
  let error = "";
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(45000),
    });
    status = response.status;
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }
  const ok = !error && accepted(status);
  console.log(`${ok ? "PASS" : "FAIL"} ${error || status} ${path}`);
  if (!ok) failures += 1;
}

console.log(`Checked ${paths.size} internal destinations against ${baseUrl}.`);
if (failures) process.exitCode = 1;
