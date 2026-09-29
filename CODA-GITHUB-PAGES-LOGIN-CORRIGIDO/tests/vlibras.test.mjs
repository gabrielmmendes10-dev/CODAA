import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [core, html, server, manifest] = await Promise.all([read("js/core.js"), read("index.html"), read("server.mjs"), read("style.css")]);

test("VLibras usa a marcação e o carregamento oficiais", () => {
  assert.match(html, /<div vw class="enabled" aria-label="Tradutor de Libras"><div vw-access-button class="active"><\/div><div vw-plugin-wrapper>/);
  assert.doesNotMatch(html, /hidden><div vw-access-button/);
  assert.match(core, /function loadVLibrasWhenIdle\(\)/);
  assert.match(core, /function preloadVLibrasApp\(\)/);
  assert.match(core, /function preloadVLibrasUnity\(\)/);
  assert.match(core, /playerweb\.data\.unityweb\?v=7\.6\.0/);
  assert.match(core, /playerweb\.wasm\.code\.unityweb\?v=7\.6\.0/);
  assert.match(core, /playerweb\.wasm\.framework\.unityweb\?v=7\.6\.0/);
  assert.match(core, /rel="modulepreload"/);
  assert.match(core, /rel="preload"/);
  assert.match(core, /pointerover/);
  assert.match(core, /pointerdown/);
  assert.match(core, /focusin/);
  assert.match(core, /new window\.VLibras\.Widget\("https:\/\/vlibras\.gov\.br\/app"\)/);
  assert.match(html, /rel="preconnect" href="https:\/\/vlibras\.gov\.br"/);
  assert.doesNotMatch(core, /repairVLibrasHost|watchVLibrasHost|vlibrasNonce|data-coda-vlibras-style|#vlibras-popup/);
  assert.doesNotMatch(manifest, /components\/vlibras\.css/);
});

test("CSP permite o style element oficial sem liberar scripts inline", () => {
  assert.match(server, /style-src 'self' 'unsafe-inline' https:\/\/fonts\.googleapis\.com/);
  assert.match(server, /font-src 'self' data: https:\/\/fonts\.gstatic\.com https:\/\/vlibras\.gov\.br/);
  const scriptPolicy = server.match(/script-src 'self'[^;]+/)?.[0] || "";
  assert.match(scriptPolicy, /script-src 'self' 'nonce-\$\{nonce\}'/);
  assert.doesNotMatch(scriptPolicy, /unsafe-inline/);
});
