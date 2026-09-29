import test from "node:test";
import assert from "node:assert/strict";

const { answerChat } = await import(`../chat-service.mjs?code=${Date.now()}`);

async function analyze(message, context = {}) {
  return answerChat({ message, mode: "code", context, sources: [], history: [] });
}

test("Tutor analisa código Python colado diretamente na mensagem", async () => {
  const answer = await analyze("```python\nif idade = 10\n    print(idade)\n```");
  assert.match(answer.text, /Linguagem provável: Python/i);
  assert.match(answer.text, /Linha 1|comparação|sem `:`/i);
});

test("Tutor reconhece erros comuns de JavaScript, HTML, CSS e SQL", async () => {
  const javascript = await analyze("```javascript\ndocument.getElementByID('botao').addEventListener('click', iniciar);\n```");
  assert.match(javascript.text, /JavaScript/);
  assert.match(javascript.text, /getElementById/);

  const html = await analyze("```html\n<img scr=\"foto.png\"><div id=\"item\"></div><div id=\"item\"></div>\n```");
  assert.match(html.text, /atributo `scr`/);
  assert.match(html.text, /aparece mais de uma vez/);

  const css = await analyze("```css\n.card { widht: 100%; }\n```");
  assert.match(css.text, /propriedade CSS/i);

  const sql = await analyze("```sql\nUPDATE alunos SET ativo = 0;\n```");
  assert.match(sql.text, /não possui `WHERE`/i);
});

test("Tutor detecta linguagem sem bloco de crases e encontra erros lexicais", async () => {
  const c = await analyze("int main(void) {\n  printf(\"Olá);\n  return 0;\n}");
  assert.match(c.text, /Linguagem provável: C/i);
  assert.match(c.text, /string.*não foi fechada/i);

  const java = await analyze("public class Main {\n  public static void main(String[] args) {\n    System.out.println[\"Oi\"];\n  }\n}");
  assert.match(java.text, /Linguagem provável: Java/i);
  assert.match(java.text, /colchetes|parênteses/i);

  const comment = await analyze("const ativo = true;\n/* comentário sem fim");
  assert.match(comment.text, /JavaScript/i);
  assert.match(comment.text, /comentário.*não foi fechado/i);

  const rust = await analyze("fn main() {\n  println!(\"Olá\");");
  assert.match(rust.text, /Linguagem provável: Rust/i);
  assert.match(rust.text, /símbolo `\{`.*não foi fechado/i);
});

test("Tutor encontra fechamentos trocados, tags abertas e labels quebrados no HTML", async () => {
  const mismatched = await analyze("```html\n<!doctype html>\n<html>\n<head><title>Teste</title></head>\n<body>\n<div>\n  <p>Texto</div>\n<label for=\"email\">E-mail</label>\n</body>\n</html>\n```");
  assert.match(mismatched.text, /<p>.*ainda está aberta|feche primeiro com `<\/p>`/i);
  assert.match(mismatched.text, /id `email`.*não existe/i);

  const unclosed = await analyze("```html\n<main>\n  <section>Conteúdo</section>\n```");
  assert.match(unclosed.text, /tag `<main>`.*não foi fechada/i);

  const unexpected = await analyze("```html\n<main><h1>Título</h1></section></main>\n```");
  assert.match(unexpected.text, /<\/section>.*sem uma tag `<section>` aberta/i);

  const valid = await analyze("```html\n<!doctype html>\n<html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><title>Teste</title></head><body><main><h1>Olá</h1><img src=\"foto.png\" alt=\"Descrição\"><label for=\"nome\">Nome</label><input id=\"nome\"></main></body></html>\n```");
  assert.match(valid.text, /Não encontrei um erro evidente/i);
});

test("Tutor diagnostica erros nas 14 linguagens e trilhas do laboratório", async () => {
  const cases = [
    ["javascript", "const itens = [1, 2];\nconsole.log(itens.lenght);", /length/],
    ["typescript", "const idade: number = \"dez\";", /number.*texto|número sem aspas/i],
    ["python", "if ativo\n    print(\"ok\")", /sem `:`/i],
    ["html", "<main><section>Texto</main>", /<section>.*aberta|<\/section>/i],
    ["css", ".card {\n  color red;\n}", /sem `:`|propriedade: valor/i],
    ["sql", "INSERT INTO alunos (nome, idade) VALUES ('Ana');", /2 coluna.*1 valor/i],
    ["c", "#include <stdio.h>\nint main(void) {\n  printf(\"Oi\")\n}", /sem `;`/i],
    ["cplus", "#include <iostream>\nstd::cout >> valor;", /cout.*operador de entrada|Use `<<`/i],
    ["cpp", "#include <iostream>\nint main() { std:cout << \"Oi\"; }", /std.*apenas um `:`|std::/i],
    ["csharp", "using System;\nConsole.Writeline(\"Oi\");", /WriteLine/],
    ["java", "public class Main {\n  string nome = \"Ana\";\n}", /String/],
    ["react", "import React from \"react\";\nexport default function App() { return <div class=\"card\">Oi</div>; }", /className/],
    ["reactnative", "import { View } from \"react-native\";\nexport default function App() { return <div>Oi</div>; }", /tag HTML.*React Native|componentes nativos/i],
    ["esp32", "void setup() { pinmode(2, OUTPUT); }\nvoid loop() { digitalwrite(2, HIGH); }", /pinMode|digitalWrite/]
  ];

  for (const [language, code, expected] of cases) {
    const answer = await analyze(`\`\`\`${language}\n${code}\n\`\`\``);
    assert.match(answer.text, expected, `deveria diagnosticar ${language}`);
  }
});

test("Tutor aceita exemplos corretos das linguagens de programação sem inventar erro", async () => {
  const cases = [
    ["javascript", "const dobro = valor => valor * 2;\nconsole.log(dobro(4));"],
    ["typescript", "const idade: number = 10;\nconsole.log(idade);"],
    ["python", "if True:\n    print(\"ok\")"],
    ["css", ".card {\n  color: red;\n  width: 100%;\n}"],
    ["sql", "SELECT id, nome\nFROM alunos\nWHERE ativo = true;"],
    ["c", "#include <stdio.h>\nint main(void) {\n  printf(\"Oi\");\n  return 0;\n}"],
    ["cpp", "#include <iostream>\nint main() {\n  std::cout << \"Oi\";\n  return 0;\n}"],
    ["csharp", "using System;\nConsole.WriteLine(\"Oi\");"],
    ["java", "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Oi\");\n  }\n}"],
    ["react", "import React from \"react\";\nexport default function App() {\n  return <main className=\"card\">Oi</main>;\n}"],
    ["reactnative", "import { Text, View } from \"react-native\";\nexport default function App() {\n  return <View><Text>Oi</Text></View>;\n}"],
    ["esp32", "void setup() {\n  pinMode(2, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(2, HIGH);\n}"]
  ];

  for (const [language, code] of cases) {
    const answer = await analyze(`\`\`\`${language}\n${code}\n\`\`\``);
    assert.match(answer.text, /Não encontrei um erro evidente/i, `não deveria inventar erro em ${language}`);
  }
});

test("Tutor analisa de uma vez os 14 códigos salvos nos laboratórios", async () => {
  const codes = [
    ["html", "HTML • index.html", "<main><h1>Olá</h1></main>"],
    ["css", "CSS • style.css", ".card { color red; }"],
    ["javascript", "JavaScript • script.js", "const itens = [];\nconsole.log(itens.lenght);"],
    ["typescript", "TypeScript • app.ts", "const idade: number = 10;"],
    ["python", "Python • main.py", "if True:\n    print(\"ok\")"],
    ["c", "C • main.c", "#include <stdio.h>\nint main(void) { return 0; }"],
    ["cplus", "C+ • comparativo.cpp", "std::cout << \"ok\";"],
    ["cpp", "C++ • main.cpp", "#include <iostream>\nint main() { return 0; }"],
    ["csharp", "C# • Program.cs", "using System;\nConsole.WriteLine(\"ok\");"],
    ["java", "Java • Main.java", "public class Main { public static void main(String[] args) {} }"],
    ["react", "React • App.jsx", "export default function App() { return <main>Ok</main>; }"],
    ["reactnative", "React Native • App.js", "import { Text } from \"react-native\";\nexport default function App() { return <Text>Ok</Text>; }"],
    ["esp32", "ESP32 • sketch.ino", "void setup() {}\nvoid loop() {}"],
    ["sql", "SQL • consulta.sql", "SELECT id FROM alunos;"]
  ].map(([language, label, code]) => ({ language, label, code }));

  const answer = await answerChat({ message: "Analise todos os laboratórios.", mode: "code", codes, context: {}, sources: [], history: [] });
  assert.match(answer.text, /14 código\(s\) analisado\(s\)/i);
  assert.match(answer.text, /HTML • index\.html/);
  assert.match(answer.text, /CSS • style\.css.*alerta/s);
  assert.match(answer.text, /JavaScript • script\.js.*alerta/s);
  assert.match(answer.text, /análise estática local/i);
});
