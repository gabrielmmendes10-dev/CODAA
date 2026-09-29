import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
await import(`../js/utils.js?test=${Date.now()}`);
const escapeHtml = globalThis.CodaUtils.escapeHtml;
const core = await read("js/core.js");
const courses = await read("js/render/courses.js");

test("payload editável de curso ou aula é renderizado como texto literal", () => {
  const payload = '<img src=x onerror=alert(1)>';
  const renderedCourseName = `<h3>${escapeHtml(payload)}</h3>`;
  const renderedLessonTitle = `<h2>${escapeHtml(payload)}</h2>`;
  assert.equal(renderedCourseName, "<h3>&lt;img src=x onerror=alert(1)&gt;</h3>");
  assert.equal(renderedLessonTitle, "<h2>&lt;img src=x onerror=alert(1)&gt;</h2>");
  assert.doesNotMatch(renderedCourseName, /<img[^>]*>/);
  assert.doesNotMatch(renderedLessonTitle, /<img[^>]*>/);
  assert.match(core, /const escapeHtml = window\.CodaUtils\.escapeHtml/);
  assert.match(core, /<h2>\$\{escapeHtml\(topic\)\}<\/h2>/);
  assert.match(courses, /<h3>\$\{escapeHtml\(course\.name\)\}<\/h3>/);
});

test("styles/legacy.css não ultrapassa o tamanho de referência", async () => {
  const file = await stat(new URL("../styles/legacy.css", import.meta.url));
  assert.ok(file.size <= 202265, `styles/legacy.css cresceu para ${file.size} bytes`);
});
