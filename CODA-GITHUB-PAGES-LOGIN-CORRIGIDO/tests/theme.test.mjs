import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const css = await readFile(new URL("themes/light.css", root), "utf8");
const legacy = await readFile(new URL("styles/legacy.css", root), "utf8");
const styleModules = await Promise.all((await Promise.all([readdir(new URL("components/", root)), readdir(new URL("pages/", root))]))
  .flatMap((files, group) => files.filter(file => file.endsWith(".css")).map(file => readFile(new URL(`${group ? "pages" : "components"}/${file}`, root), "utf8"))));

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map(value => Number.parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("tema claro final usa superfícies suaves e mantém contraste legível", () => {
  const blocks = [...css.matchAll(/\[data-theme="light"\]\s*\{([^}]+)\}/g)];
  const finalBlock = blocks.at(-1)?.[1] || "";
  const tokens = Object.fromEntries([...finalBlock.matchAll(/--([\w-]+)\s*:\s*(#[a-f\d]{6})/gi)].map(match => [match[1], match[2]]));

  assert.equal(tokens.bg, "#ede9e2");
  assert.equal(tokens.surface, "#f7f4ee");
  assert.notEqual(tokens.surface.toLowerCase(), "#ffffff");
  assert.notEqual(tokens.bg.toLowerCase(), tokens.surface.toLowerCase());
  assert.ok(contrast(tokens.text, tokens.surface) >= 4.5);
  assert.ok(contrast(tokens.muted, tokens.surface) >= 4.5);
  assert.ok(contrast(tokens["muted-2"], tokens["surface-3"]) >= 4.5);
  assert.ok(contrast(tokens.lime, tokens.surface) >= 4.5);
  for (const color of ["blue", "purple", "orange", "red", "brand"]) {
    assert.ok(contrast(tokens[color], tokens.surface) >= 4.5, `${color} precisa ter contraste AA sobre surface`);
    assert.ok(contrast("#ffffff", tokens[color]) >= 4.5, `texto branco precisa ter contraste AA sobre ${color}`);
  }
  assert.ok(contrast("#ffffff", tokens.lime) >= 4.5);
});

test("regras do tema claro ficam centralizadas no arquivo oficial", () => {
  assert.doesNotMatch(legacy, /\[data-theme="light"\]/);
  for (const moduleCss of styleModules) assert.doesNotMatch(moduleCss, /\[data-theme="light"\]/);
});

test("tema claro preserva IDE escura, ESP32 legível e alto contraste correto", () => {
  assert.match(css, /:is\(\.code-example,\.lab-app\)\{color-scheme:dark;background:#090e18/);
  assert.match(css, /\.lab-app \.code-wrap textarea\{color-scheme:dark;background:#090e18/);
  assert.match(css, /\.esp-scene\{background:radial-gradient/);
  assert.match(css, /body\.high-contrast\{/);
});
