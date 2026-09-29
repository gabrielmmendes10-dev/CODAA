import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const data = JSON.parse(readFileSync(new URL("dados.json", root), "utf8"));
const script = readFileSync(new URL("js/core.js", root), "utf8");

test("catálogo contém 14 matérias e 98 aulas sequenciais", () => {
  assert.equal(data.materias.length, 14);
  assert.ok(data.materias.every(course => course.aulas.length === 7));
  const lessons = data.materias.flatMap(course => course.aulas.map((title, index) => `${course.id}:${index}:${title}`));
  assert.equal(lessons.length, 98);
  assert.equal(new Set(lessons).size, 98);
  assert.equal(data.recursos.videos, 98);
  assert.equal(data.recursos.atividades, 98);
});

test("as 98 aulas possuem exemplos de código realmente diferentes", () => {
  const sandbox = { window: {} };
  runInNewContext(readFileSync(new URL("lesson-content.js", root), "utf8"), sandbox);
  const catalog = sandbox.window.CodaLessonExamples;
  assert.deepEqual(Object.keys(catalog), data.materias.map(course => course.id));
  assert.ok(Object.values(catalog).every(examples => examples.length === 7));
  const examples = Object.values(catalog).flat().map(example => String(example).trim());
  assert.equal(examples.length, 98);
  assert.equal(new Set(examples).size, 98);
  assert.ok(examples.every(example => example.length >= 20));
});

test("microvideoaulas incluem conteúdo próprio, legenda, transcrição e alternativa", () => {
  const match = script.match(/const videoIds = (\[[^;]+\]);/);
  assert.ok(match);
  assert.equal(JSON.parse(match[1]).length, 14);
  assert.match(script, /function microVideoSlides\(course,index\)/);
  assert.match(script, /const topic=lessonTitle\(course,index\)/);
  assert.match(script, /course\.name/);
  assert.match(script, /durationSeconds:60/);
  assert.match(script, /transcript=slides\.map/);
  assert.match(script, /Transcrição e legenda completa/);
  assert.match(script, /Alternativa: curso completo/);
});

test("exercício final e progressão fazem parte do fluxo de cada aula", () => {
  assert.match(script, /EXERCÍCIO FINAL COM CORREÇÃO AUTOMÁTICA/);
  assert.match(script, /state\.lessonChecks\[key\]/);
  assert.match(script, /function lessonUnlocked/);
  assert.match(script, /requirementsReady=Boolean\(state\.activities\[key\]&&state\.lessonChecks\[key\]\)/);
});
