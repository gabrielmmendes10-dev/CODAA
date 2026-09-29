import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const launcher = await readFile(new URL("../INICIAR-CODA.bat", import.meta.url), "utf8");
const help = await readFile(new URL("../LEIA-SE-O-WINDOWS-BLOQUEAR.txt", import.meta.url), "utf8");

test("iniciador do Windows não instala programas automaticamente", () => {
  assert.doesNotMatch(launcher, /winget\s+(?:install|upgrade)/i);
  assert.doesNotMatch(launcher, /powershell|ExecutionPolicy/i);
  assert.match(launcher, /where node/i);
  assert.match(launcher, /node:sqlite/i);
  assert.match(launcher, /\/api\/health/);
  assert.match(launcher, /LEIA-SE-O-WINDOWS-BLOQUEAR\.txt/);
});

test("ajuda respeita bloqueios de computadores administrados", () => {
  assert.match(help, /Nao tente contornar/i);
  assert.match(help, /administrador/i);
  assert.match(help, /Propriedades/i);
});
