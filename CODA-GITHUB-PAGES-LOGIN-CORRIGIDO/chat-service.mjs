const environment = globalThis.process?.env || {};

export const chatModel = "Base local + pesquisa Crossref";
export const chatProviderReady = true;

const researchCache = new Map();
const stopWords = new Set(`a o as os de da do das dos e em para por com sem um uma uns umas que se no na nos nas ao aos como qual quais porque porquê sobre entre mais menos muito sua seu suas seus esse essa isso isto ser são foi eram pode podem estudo estudos artigo artigos pesquisa pesquisas resultado resultados análise analise using use based approach method methods data system systems application applications learning education educational technology technologies computer computing software program programming students student`.split(/\s+/));

function compact(value, max = 5000) {
  return String(value ?? "").replace(/\u0000/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function words(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .match(/[a-z0-9+#.-]{3,}/g)?.filter(word => !stopWords.has(word)) || [];
}

function lessonLabel(source) {
  if (!source) return "o conteúdo da Coda";
  const lesson = Number.isInteger(source.lessonIndex) ? `aula ${source.lessonIndex + 1}` : "material";
  return `${source.courseName || source.courseId || "Coda"}, ${lesson} — ${source.title || "conteúdo"}`;
}

function firstIdea(excerpt, max = 720) {
  const text = compact(excerpt, max);
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
  return sentences.slice(0, 3).join(" ").trim();
}

const languageLabels = { javascript: "JavaScript", typescript: "TypeScript", python: "Python", html: "HTML", css: "CSS", sql: "SQL", c: "C", cplus: "C+ (comparativo)", cpp: "C++", csharp: "C#", java: "Java", react: "React/JSX", reactnative: "React Native", esp32: "ESP32/Arduino", go: "Go", rust: "Rust", php: "PHP", ruby: "Ruby", swift: "Swift", kotlin: "Kotlin", dart: "Dart", r: "R", bash: "Bash/Shell", lua: "Lua" };

function canonicalLanguage(value) {
  const key = String(value || "").trim().toLowerCase().replace(/[^a-z0-9+#]/g, "");
  return ({ js: "javascript", javascript: "javascript", jsx: "react", ts: "typescript", typescript: "typescript", tsx: "typescript", py: "python", python: "python", html: "html", htm: "html", css: "css", sql: "sql", c: "c", "c+": "cplus", cplus: "cplus", "c++": "cpp", cpp: "cpp", cs: "csharp", "c#": "csharp", csharp: "csharp", java: "java", react: "react", reactjs: "react", reactnative: "reactnative", rn: "reactnative", esp32: "esp32", arduino: "esp32", ino: "esp32", go: "go", golang: "go", rust: "rust", rs: "rust", php: "php", ruby: "ruby", rb: "ruby", swift: "swift", kotlin: "kotlin", kt: "kotlin", dart: "dart", r: "r", bash: "bash", sh: "bash", shell: "bash", lua: "lua" })[key] || "";
}

function looksLikeCode(value) {
  const text = String(value || "").trim();
  if (text.length < 8) return false;
  return /[{}();]|=>|<\/?[a-z][^>]*>|#include|<\?php|^#!|\b(?:const|let|var|function|func|fn|def|class|interface|import|from|print|printf|println|puts|echo|setup|loop|SELECT|INSERT|UPDATE|DELETE|CREATE|public|private|return|if|else|for|while|package|namespace|local)\b/im.test(text);
}

function extractCodeFromMessage(message) {
  const raw = String(message || "").replace(/\r\n?/g, "\n");
  const blocks = [...raw.matchAll(/```\s*([a-z0-9+#.-]*)\s*\n?([\s\S]*?)```/gi)]
    .map(match => ({ language: canonicalLanguage(match[1]), code: String(match[2] || "").trim() }))
    .filter(item => item.code);
  if (blocks.length) return blocks.sort((a, b) => b.code.length - a.code.length)[0];
  const introduced = raw.match(/(?:meu\s+c[oó]digo|c[oó]digo|code)\s*:?\s*([\s\S]+)/i)?.[1]?.trim() || "";
  if (looksLikeCode(introduced)) return { code: introduced.slice(0, 12000), language: "" };
  if ((raw.includes("\n") || raw.length < 500) && looksLikeCode(raw)) return { code: raw.trim().slice(0, 12000), language: "" };
  return { code: "", language: "" };
}

function detectCodeLanguage(code, hint = "") {
  const hinted = canonicalLanguage(hint);
  if (hinted) return hinted;
  const value = String(code || "");
  const scores = {
    html: (/<\/?(?:html|head|body|div|main|section|article|header|footer|nav|form|label|input|button|h[1-6]|p|img|a|ul|ol|li)\b/i.test(value) ? 6 : 0) + (/<!doctype/i.test(value) ? 5 : 0),
    css: (/@media|@keyframes|(?:^|[;}])\s*[.#][\w-]+\s*\{/m.test(value) ? 5 : 0) + (/\b(?:display|color|background|margin|padding|width|height)\s*:/i.test(value) ? 3 : 0),
    javascript: (/\b(?:const|let|var)\s+\w+|=>|console\.(?:log|error)|document\.|addEventListener|\basync\s+function\b/i.test(value) ? 6 : 0),
    typescript: (/\b(?:interface|type|enum)\s+\w+|:\s*(?:string|number|boolean|unknown|never)(?:\[\])?\b|\bas\s+const\b/i.test(value) ? 9 : 0),
    python: (/^\s*(?:def|class|from|import|async\s+def)\b|\bprint\s*\(|:\s*(?:#.*)?$/m.test(value) ? 6 : 0) + (/\b(?:True|False|None|self)\b/.test(value) ? 2 : 0),
    sql: (/\b(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/i.test(value) ? 7 : 0),
    reactnative: (/from\s+["']react-native["']|\b(?:View|Text|Pressable|FlatList|StyleSheet|TextInput)\b/.test(value) ? 12 : 0),
    react: (/from\s+["']react["']|\buse(?:State|Effect|Memo|Callback|Ref)\s*\(|return\s*\(\s*</.test(value) ? 10 : 0),
    esp32: (/\b(?:void\s+setup|void\s+loop|pinMode|digitalWrite|digitalRead|analogRead|Serial\.begin|delay)\s*\(/.test(value) ? 12 : 0),
    cpp: (/#include\s*<(?:iostream|vector|string|map|memory)>|\bstd::|\b(?:cout|cin)\s*(?:<<|>>)|\bvector\s*</.test(value) ? 9 : 0),
    csharp: (/\busing\s+System\b|Console\.(?:WriteLine|ReadLine)|namespace\s+\w+|\b(?:string|bool)\s+\w+\s*=/i.test(value) ? 9 : 0),
    java: (/public\s+static\s+void\s+main|System\.out\.print|\bpublic\s+class\b|import\s+java\./.test(value) ? 9 : 0),
    c: (/#include\s*<(?:stdio|stdlib|string|math)\.h>|\b(?:printf|scanf|malloc|free)\s*\(|\bint\s+main\s*\(/.test(value) ? 7 : 0),
    go: (/^\s*package\s+\w+|\bfunc\s+\w+\s*\(|fmt\.(?:Print|Println|Printf)\s*\(/m.test(value) ? 9 : 0),
    rust: (/\bfn\s+main\s*\(|\blet\s+mut\b|println!\s*\(|use\s+std::/.test(value) ? 9 : 0),
    php: (/<\?php|\$[A-Za-z_]\w*\s*=|\becho\s+.+;/i.test(value) ? 9 : 0),
    ruby: (/\bputs\s+|^\s*require\s+["']|^\s*(?:def|class|module)\b[\s\S]*^\s*end\s*$/m.test(value) ? 8 : 0),
    swift: (/\bimport\s+(?:Foundation|SwiftUI)|\bfunc\s+\w+\s*\([^)]*\)\s*(?:->[^\{]+)?\{|\b(?:let|var)\s+\w+\s*:\s*(?:String|Int|Bool)/.test(value) ? 8 : 0),
    kotlin: (/\bfun\s+main\s*\(|\bval\s+\w+|println\s*\(|import\s+kotlin\./.test(value) ? 8 : 0),
    dart: (/\bvoid\s+main\s*\(|import\s+["']package:flutter|\bWidget\s+build\s*\(/.test(value) ? 8 : 0),
    r: (/\b(?:library|require)\s*\(|<-|\bdata\.frame\s*\(/.test(value) ? 8 : 0),
    bash: (/^#!.*\b(?:bash|sh)\b|\b(?:echo|printf)\s+\$|\b(?:fi|done|esac)\b/m.test(value) ? 8 : 0),
    lua: (/\blocal\s+\w+\s*=|\bfunction\s+\w+\s*\([^)]*\)[\s\S]*\bend\b/.test(value) ? 8 : 0)
  };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best?.[1] ? best[0] : "";
}

function lineNumber(code, expression) {
  const lines = String(code || "").split("\n");
  const index = lines.findIndex(line => { expression.lastIndex = 0; return expression.test(line); });
  return index >= 0 ? index + 1 : null;
}

function finding(code, expression, issue, suggestion, certainty = "forte") {
  return { line: lineNumber(code, expression), issue, suggestion, certainty };
}

function structuralCode(value, language = "") {
  let result = "", quote = "", lineComment = false, blockComment = false;
  const hashComments = language === "python";
  const dashComments = language === "sql";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index], next = value[index + 1];
    if (lineComment) { if (char === "\n") { lineComment = false; result += "\n"; } else result += " "; continue; }
    if (blockComment) { if (char === "*" && next === "/") { blockComment = false; result += "  "; index += 1; } else result += char === "\n" ? "\n" : " "; continue; }
    if (quote) { if (char === "\\") { result += "  "; index += 1; continue; } if (char === quote) quote = ""; result += char === "\n" ? "\n" : " "; continue; }
    if (char === "/" && next === "/") { lineComment = true; result += "  "; index += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; result += "  "; index += 1; continue; }
    if (hashComments && char === "#") { lineComment = true; result += " "; continue; }
    if (dashComments && char === "-" && next === "-") { lineComment = true; result += "  "; index += 1; continue; }
    if (["\"", "'", "`"].includes(char)) { quote = char; result += " "; continue; }
    result += char;
  }
  return result;
}

function lineAtIndex(value, index) {
  return String(value || "").slice(0, Math.max(0, index)).split("\n").length;
}

function lexicalDiagnosis(value, language) {
  const findings = [];
  let quote = "", quoteStart = 0, triple = false, lineComment = false, blockComment = false, blockStart = 0;
  const python = language === "python", sql = language === "sql";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index], next = value[index + 1], three = value.slice(index, index + 3);
    if (lineComment) { if (char === "\n") lineComment = false; continue; }
    if (blockComment) { if (char === "*" && next === "/") { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (triple && three === quote.repeat(3)) { quote = ""; triple = false; index += 2; continue; }
      if (sql && quote === "'" && char === "'" && next === "'") { index += 1; continue; }
      if (char === "\\") { index += 1; continue; }
      if (!triple && char === quote) { quote = ""; continue; }
      if (!triple && quote !== "`" && !sql && char === "\n") {
        findings.push({ line: lineAtIndex(value, quoteStart), issue: "Uma string foi iniciada, mas não foi fechada antes do fim da linha.", suggestion: `Feche a string com \`${quote}\` ou remova a abertura incorreta.`, certainty: "forte" });
        quote = "";
      }
      continue;
    }
    if (char === "/" && next === "*") { blockComment = true; blockStart = index; index += 1; continue; }
    if (char === "/" && next === "/" && !sql) { lineComment = true; index += 1; continue; }
    if (python && char === "#") { lineComment = true; continue; }
    if (sql && char === "-" && next === "-") { lineComment = true; index += 1; continue; }
    if (python && (three === "'''" || three === '\"\"\"')) { quote = char; quoteStart = index; triple = true; index += 2; continue; }
    if (["\"", "'", "`"].includes(char)) { quote = char; quoteStart = index; triple = false; }
  }
  if (blockComment) findings.push({ line: lineAtIndex(value, blockStart), issue: "Um comentário `/*` foi iniciado, mas não foi fechado.", suggestion: "Adicione `*/` ao final do comentário.", certainty: "forte" });
  if (quote) findings.push({ line: lineAtIndex(value, quoteStart), issue: triple ? "Uma string de três aspas foi iniciada, mas não foi fechada." : "Uma string foi iniciada, mas não foi fechada.", suggestion: triple ? `Feche o texto com \`${quote.repeat(3)}\`.` : `Feche a string com \`${quote}\`.`, certainty: "forte" });
  return findings.slice(0, 4);
}

function htmlDiagnosis(value) {
  const findings = [];
  const add = item => { if (item && !findings.some(current => current.issue === item.issue)) findings.push(item); };
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const optionalEndTags = new Set(["li", "dt", "dd", "p", "rt", "rp", "optgroup", "option", "thead", "tbody", "tfoot", "tr", "td", "th"]);
  const rawTextTags = new Set(["script", "style", "textarea", "title"]);
  const stack = [];
  const tagPattern = /<\s*(\/?)\s*([a-zA-Z][\w:-]*)\b([^<>]*?)(\/?)\s*>/g;
  let match;
  while ((match = tagPattern.exec(value))) {
    const closing = Boolean(match[1]), tag = match[2].toLowerCase(), attributes = match[3] || "", selfClosing = Boolean(match[4]);
    const line = lineAtIndex(value, match.index);
    if ((attributes.match(/"/g) || []).length % 2 || (attributes.match(/'/g) || []).length % 2) add({ line, issue: `A tag \`<${tag}>\` possui aspas de atributo sem fechamento.`, suggestion: "Feche o valor do atributo com o mesmo tipo de aspas usado na abertura.", certainty: "forte" });
    if (closing) {
      if (attributes.trim()) add({ line, issue: `A tag de fechamento \`</${tag}>\` contém atributos.`, suggestion: "Deixe atributos somente na tag de abertura.", certainty: "forte" });
      if (voidTags.has(tag)) { add({ line, issue: `A tag vazia \`<${tag}>\` não deve possuir fechamento \`</${tag}>\`.`, suggestion: `Remova \`</${tag}>\`; essa tag não envolve conteúdo.`, certainty: "forte" }); continue; }
      const foundIndex = stack.map(item => item.tag).lastIndexOf(tag);
      if (foundIndex < 0) {
        if (!optionalEndTags.has(tag)) add({ line, issue: `Encontrei \`</${tag}>\` sem uma tag \`<${tag}>\` aberta.`, suggestion: `Remova o fechamento extra ou adicione \`<${tag}>\` no local correto.`, certainty: "forte" });
        continue;
      }
      const top = stack.at(-1);
      if (top.tag !== tag) add({ line, issue: `O fechamento \`</${tag}>\` aparece enquanto \`<${top.tag}>\` ainda está aberta.`, suggestion: `Feche primeiro com \`</${top.tag}>\` e mantenha as tags na ordem inversa da abertura.`, certainty: "forte" });
      stack.splice(foundIndex);
      continue;
    }
    if (voidTags.has(tag) || selfClosing) continue;
    if ((tag === "form" || tag === "a") && stack.some(item => item.tag === tag)) add({ line, issue: `A tag \`<${tag}>\` foi aberta dentro de outra \`<${tag}>\`.`, suggestion: `Feche a primeira \`<${tag}>\` antes de iniciar outra.`, certainty: "forte" });
    if (optionalEndTags.has(tag) && stack.at(-1)?.tag === tag) stack.pop();
    stack.push({ tag, line });
    if (rawTextTags.has(tag)) {
      const closingPattern = new RegExp(`<\\/\\s*${tag}\\s*>`, "ig"); closingPattern.lastIndex = tagPattern.lastIndex;
      const rawClosing = closingPattern.exec(value);
      if (rawClosing) { stack.pop(); tagPattern.lastIndex = closingPattern.lastIndex; }
    }
  }
  stack.filter(item => !optionalEndTags.has(item.tag)).slice(-5).forEach(item => add({ line: item.line, issue: `A tag \`<${item.tag}>\` foi aberta, mas não foi fechada.`, suggestion: `Adicione \`</${item.tag}>\` depois do conteúdo correspondente.`, certainty: "forte" }));
  if (/<!doctype\b/i.test(value) && !/<!doctype\s+html\s*>/i.test(value)) add({ line: lineNumber(value, /<!doctype/i), issue: "A declaração DOCTYPE está incompleta ou incorreta.", suggestion: "Use `<!doctype html>` no início do documento.", certainty: "forte" });
  if (/<html\b/i.test(value)) {
    if (!/<!doctype\s+html\s*>/i.test(value)) add({ line: 1, issue: "O documento completo não possui `<!doctype html>`.", suggestion: "Adicione `<!doctype html>` na primeira linha.", certainty: "forte" });
    if (!/<head\b/i.test(value)) add({ line: lineNumber(value, /<html\b/i), issue: "O documento possui `<html>`, mas não possui `<head>`.", suggestion: "Adicione a seção `<head>` antes de `<body>`.", certainty: "forte" });
    if (!/<body\b/i.test(value)) add({ line: lineNumber(value, /<html\b/i), issue: "O documento possui `<html>`, mas não possui `<body>`.", suggestion: "Adicione a seção `<body>` para o conteúdo visível.", certainty: "forte" });
  }
  const ids = [...value.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(match => ({ id: match[1], index: match.index }));
  const duplicate = ids.find((item, index) => ids.findIndex(candidate => candidate.id === item.id) !== index);
  if (duplicate) add({ line: lineAtIndex(value, duplicate.index), issue: `O id \`${duplicate.id}\` aparece mais de uma vez.`, suggestion: "Use um id único em cada elemento e classes para estilos repetidos.", certainty: "forte" });
  const availableIds = new Set(ids.map(item => item.id));
  for (const label of value.matchAll(/<label\b[^>]*\bfor\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    if (!availableIds.has(label[1])) add({ line: lineAtIndex(value, label.index), issue: `O label aponta para o id \`${label[1]}\`, mas esse id não existe.`, suggestion: "Crie o id no campo correspondente ou corrija o valor do atributo `for`.", certainty: "forte" });
  }
  return findings;
}

function delimiterDiagnosis(value, language) {
  const findings = [];
  const structure = structuralCode(value, language);
  const stack = [];
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const openingFor = { ")": "(", "]": "[", "}": "{" };
  for (let index = 0; index < structure.length; index += 1) {
    const char = structure[index];
    if (pairs[char]) { stack.push({ char, line: lineAtIndex(structure, index) }); continue; }
    if (!openingFor[char]) continue;
    const top = stack.at(-1);
    if (!top) {
      findings.push({ line: lineAtIndex(structure, index), issue: `Encontrei \`${char}\` sem o símbolo de abertura correspondente.`, suggestion: `Adicione \`${openingFor[char]}\` no local correto ou remova o fechamento extra.`, certainty: "forte" });
      continue;
    }
    if (top.char !== openingFor[char]) {
      findings.push({ line: lineAtIndex(structure, index), issue: `O símbolo \`${char}\` fecha um bloco iniciado com \`${top.char}\`.`, suggestion: `Feche esse bloco com \`${pairs[top.char]}\` antes de usar \`${char}\`.`, certainty: "forte" });
      continue;
    }
    stack.pop();
  }
  stack.slice(-3).forEach(item => findings.push({ line: item.line, issue: `O símbolo \`${item.char}\` foi aberto, mas não foi fechado.`, suggestion: `Adicione \`${pairs[item.char]}\` depois do conteúdo correspondente.`, certainty: "forte" }));
  return findings;
}

function pythonDiagnosis(value) {
  const findings = [];
  const add = item => { if (item && !findings.some(current => current.issue === item.issue)) findings.push(item); };
  const headerWithoutColon = /^(\s*)(if|elif|else|for|while|def|class|try|except|finally|with|match|case)\b[^:\n]*$/m;
  if (headerWithoutColon.test(value)) add(finding(value, headerWithoutColon, "Uma estrutura do Python parece estar sem `:`.", "Adicione `:` no final da declaração do bloco."));
  if (/^\s*(if|elif|while)\s+[^:\n]*?(?<![=!<>])=(?!=)[^:\n]*:/m.test(value)) add(finding(value, /^\s*(if|elif|while)\b/m, "Uma condição do Python usa `=` no lugar de comparação.", "Use `==` para comparar valores."));
  if (/\t/.test(value) && /^ +\S/m.test(value)) add(finding(value, /\t/, "O arquivo mistura tabulação e espaços.", "Padronize a indentação, de preferência com quatro espaços.", "possível"));
  if (/\b(?:true|false|null)\b/.test(value)) add(finding(value, /\b(?:true|false|null)\b/, "Há um valor booleano ou nulo com a grafia de outra linguagem.", "No Python, use `True`, `False` e `None`.", "forte"));
  if (/&&|\|\||===/.test(value)) add(finding(value, /&&|\|\||===/, "A expressão usa um operador que não pertence à sintaxe do Python.", "Use `and`, `or` e `==`, conforme a intenção."));
  if (/^\s*else\s+if\b/m.test(value)) add(finding(value, /^\s*else\s+if\b/m, "Python não usa `else if`.", "Troque por `elif`."));
  if (/^\s*print\s+[^\s(][^\n]*$/m.test(value)) add(finding(value, /^\s*print\s+/m, "A chamada de `print` parece estar sem parênteses.", "No Python 3, use `print(valor)`."));
  if (/\b(?:range|len|print|input)\s*\[/.test(value)) add(finding(value, /\b(?:range|len|print|input)\s*\[/, "Uma função do Python foi chamada com colchetes.", "Use parênteses para chamar a função, por exemplo `range(10)`."));
  if (/^\s*(?:if|elif|for|while|def|class)\b[^\n]*\{\s*$/m.test(value)) add(finding(value, /^\s*(?:if|elif|for|while|def|class)\b/m, "Uma estrutura do Python termina com `{`.", "No Python, termine o cabeçalho com `:` e indente o bloco."));
  const lines = value.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)(if|elif|else|for|while|def|class|try|except|finally|with|match|case)\b.*:\s*(?:#.*)?$/);
    if (!match) continue;
    const nextIndex = lines.findIndex((line, candidate) => candidate > index && line.trim() && !/^\s*#/.test(line));
    if (nextIndex < 0 || (lines[nextIndex].match(/^\s*/)?.[0].replace(/\t/g, "    ").length || 0) <= match[1].replace(/\t/g, "    ").length) {
      add({ line: index + 1, issue: `O bloco \`${match[2]}\` não possui um corpo indentado.`, suggestion: "Indente pelo menos uma instrução abaixo do bloco; durante o rascunho, você pode usar `pass`.", certainty: "forte" });
    }
  }
  return findings;
}

function javascriptDiagnosis(value, language) {
  const findings = [];
  const add = item => { if (item && !findings.some(current => current.issue === item.issue)) findings.push(item); };
  if (/document\.getElementByID\s*\(/.test(value)) add(finding(value, /getElementByID/, "O nome do método diferencia maiúsculas de minúsculas.", "Troque `getElementByID` por `getElementById`."));
  if (/document\.queryselector\s*\(/.test(value)) add(finding(value, /queryselector/, "O método `querySelector` está com letras maiúsculas incorretas.", "Troque `queryselector` por `querySelector`."));
  if (/\.lenght\b/.test(value)) add(finding(value, /\.lenght\b/, "A propriedade `lenght` está escrita incorretamente.", "Troque por `length`."));
  if (/\bconsole\.log\s*\[/.test(value)) add(finding(value, /console\.log\s*\[/, "`console.log` foi aberto com colchete.", "Use parênteses: `console.log(valor)`."));
  if (/\belse\s+if\s*\([^)]*\)\s*:/.test(value)) add(finding(value, /\belse\s+if\b/, "A condição `else if` termina com `:` como no Python.", "Em JavaScript, abra o bloco com `{` e feche com `}`."));
  if (/\b(?:if|while)\s*\([^\n)]*?(?<![=!<>])=(?!=)[^\n)]*\)/.test(value)) add(finding(value, /\b(?:if|while)\s*\(/, "Uma condição parece atribuir com `=` em vez de comparar.", "Use `===` ou outro operador de comparação adequado.", "possível"));
  if (/\bconst\s+[A-Za-z_$][\w$]*\s*;/.test(value)) add(finding(value, /\bconst\s+[A-Za-z_$][\w$]*\s*;/, "Uma constante foi declarada sem valor inicial.", "Inicialize a constante na própria declaração ou use `let` se o valor vier depois."));
  if (/\b(?:if|while|switch)\s+(?!\()[^\n{]+\{/.test(value)) add(finding(value, /\b(?:if|while|switch)\s+(?!\()/, "Uma condição parece estar sem parênteses.", "Coloque a condição entre `(` e `)` antes de abrir o bloco com `{`."));
  if (/\bfunction\s+[A-Za-z_$][\w$]*\s*\{/.test(value)) add(finding(value, /\bfunction\s+[A-Za-z_$][\w$]*\s*\{/, "A declaração de função está sem a lista de parâmetros.", "Adicione `()` antes de `{`, mesmo quando não houver parâmetros."));
  if (/document\.(?:querySelector|getElementById)\([^)]*\)\.addEventListener/.test(value)) add(finding(value, /document\.(?:querySelector|getElementById)/, "O elemento pode não existir quando `addEventListener` for chamado.", "Guarde o elemento em uma variável e confirme que ele não é `null`.", "possível"));
  if (language === "typescript") {
    if (/:\s*number\s*=\s*["'`]/.test(value)) add(finding(value, /:\s*number\s*=/, "Uma variável `number` recebe um texto.", "Use um número sem aspas ou altere o tipo para `string`."));
    if (/:\s*boolean\s*=\s*(?:["'`]|\d)/.test(value)) add(finding(value, /:\s*boolean\s*=/, "Uma variável `boolean` recebe um valor incompatível.", "Use `true` ou `false`, sem aspas."));
    if (/\binterface\s+\w+(?:\s+extends\s+[\w, ]+)?\s*=\s*\{/.test(value)) add(finding(value, /\binterface\s+\w+/, "Uma `interface` foi declarada com `=`.", "Remova o `=`; use `interface Nome { ... }`."));
  }
  return findings;
}

function cssDiagnosis(value) {
  const findings = [];
  const add = item => { if (item && !findings.some(current => current.issue === item.issue)) findings.push(item); };
  const typo = /\b(?:backgroud|widht|heigth|colro|postion|dispay|margim|pading|font-weigth)\s*:/;
  if (typo.test(value)) add(finding(value, typo, "Uma propriedade CSS parece estar escrita incorretamente.", "Revise o nome da propriedade, como `background`, `width`, `height`, `color`, `position`, `display`, `margin`, `padding` ou `font-weight`."));
  if (/^\s*\/\//m.test(value)) add(finding(value, /^\s*\/\//m, "CSS não aceita comentários iniciados por `//`.", "Use comentários no formato `/* comentário */`."));
  if (/!\s*importante?\b/i.test(value)) add(finding(value, /!\s*importante?\b/i, "A palavra-chave de prioridade do CSS está incorreta.", "Use `!important` somente quando realmente necessário."));
  const structureLines = structuralCode(value, "css").split("\n");
  let depth = 0;
  structureLines.forEach((line, index) => {
    const startsInside = depth > 0;
    const openCount = (line.match(/\{/g) || []).length;
    const closeCount = (line.match(/\}/g) || []).length;
    const content = line.replace(/^[^{]*\{/, "").replace(/\}.*/, "").trim();
    if ((startsInside || openCount) && content) {
      content.split(";").map(part => part.trim()).filter(Boolean).forEach(part => {
        if (/^[\w-]+\s*=/.test(part)) add({ line: index + 1, issue: "Uma declaração CSS usa `=` no lugar de `:`.", suggestion: "Separe a propriedade do valor com `:`.", certainty: "forte" });
        else if (/^[\w-]+\s+[^:]+$/.test(part) && !/^@/.test(part)) add({ line: index + 1, issue: "Uma declaração CSS parece estar sem `:`.", suggestion: "Use o formato `propriedade: valor;`.", certainty: "forte" });
        else if (/^[\w-]+\s*:\s*$/.test(part)) add({ line: index + 1, issue: "Uma propriedade CSS está sem valor.", suggestion: "Informe um valor válido depois de `:` ou remova a declaração.", certainty: "forte" });
        else if (/^[\w-]+\s*:[^;{}]+\s+[\w-]+\s*:/.test(part)) add({ line: index + 1, issue: "Duas declarações CSS parecem estar sem `;` entre elas.", suggestion: "Separe cada par `propriedade: valor` com ponto e vírgula.", certainty: "forte" });
      });
    }
    depth += openCount - closeCount;
  });
  return findings;
}

function sqlDiagnosis(value) {
  const findings = [];
  const add = item => { if (item && !findings.some(current => current.issue === item.issue)) findings.push(item); };
  if (/\b(?:DELETE|UPDATE)\b/i.test(value) && !/\bWHERE\b/i.test(value)) add(finding(value, /\b(?:DELETE|UPDATE)\b/i, "A alteração SQL não possui `WHERE` e pode atingir todas as linhas.", "Teste primeiro um `SELECT` com a mesma condição e só depois altere os dados."));
  if (/\bSELECT\s+[a-z_][\w, .]*$/im.test(value) && !/\bFROM\b/i.test(value)) add(finding(value, /\bSELECT\b/i, "A consulta seleciona colunas, mas não informa uma tabela.", "Inclua `FROM nome_da_tabela`."));
  const typo = /\b(?:SELEC|FORM|WERE|UPDTE|DELET|INSER)\b/i;
  if (typo.test(value)) add(finding(value, typo, "Um comando SQL parece estar escrito incorretamente.", "Revise `SELECT`, `FROM`, `WHERE`, `UPDATE`, `DELETE` ou `INSERT`."));
  if (/==/.test(value)) add(finding(value, /==/, "SQL normalmente não usa `==` para igualdade.", "Use `=` na comparação."));
  if (/,\s*\b(?:FROM|WHERE|ORDER\s+BY|GROUP\s+BY)\b/i.test(value)) add(finding(value, /,\s*\b(?:FROM|WHERE|ORDER\s+BY|GROUP\s+BY)\b/i, "Há uma vírgula sobrando antes da próxima cláusula SQL.", "Remova a vírgula anterior a `FROM`, `WHERE`, `ORDER BY` ou `GROUP BY`."));
  if (/\bUPDATE\s+\w+(?:\s+\w+)?\s+(?!SET\b)/i.test(value)) add(finding(value, /\bUPDATE\b/i, "O comando `UPDATE` parece estar sem `SET`.", "Use `UPDATE tabela SET coluna = valor WHERE condição`."));
  if (/\bDELETE\s+(?!FROM\b)/i.test(value)) add(finding(value, /\bDELETE\b/i, "O comando `DELETE` parece estar sem `FROM`.", "Use `DELETE FROM tabela WHERE condição`."));
  if (/\bWHERE\s*(?:;|$)/im.test(value)) add(finding(value, /\bWHERE\b/i, "A cláusula `WHERE` está sem condição.", "Informe uma condição depois de `WHERE`."));
  if (/\bSELECT\s+FROM\b/i.test(value)) add(finding(value, /\bSELECT\s+FROM\b/i, "O `SELECT` está sem a lista de colunas.", "Informe as colunas ou use `SELECT * FROM tabela`."));
  const cleanedQuotes = value.replace(/''/g, "");
  if ((cleanedQuotes.match(/'/g) || []).length % 2) add({ line: lineNumber(value, /'/), issue: "Há uma string SQL com aspas simples sem fechamento.", suggestion: "Feche o texto com `'` e, para uma aspa interna, use `''`.", certainty: "forte" });
  const insert = value.match(/\bINSERT\s+INTO\s+\w+\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insert) {
    const columns = insert[1].split(",").filter(item => item.trim()).length;
    const values = insert[2].split(",").filter(item => item.trim()).length;
    if (columns !== values) add({ line: lineNumber(value, /\bINSERT\b/i), issue: `O INSERT informa ${columns} coluna(s), mas ${values} valor(es).`, suggestion: "Use a mesma quantidade e a mesma ordem de colunas e valores.", certainty: "forte" });
  }
  return findings;
}

function missingSemicolonDiagnosis(value, language) {
  const structureLines = structuralCode(value, language).split("\n");
  const findings = [];
  for (let index = 0; index < structureLines.length; index += 1) {
    const line = structureLines[index].trim();
    if (!line || line.startsWith("#") || /[;{},:]$/.test(line) || /^(?:if|else|for|while|switch|catch|try|finally|do|class|struct|enum|interface|namespace)\b/.test(line)) continue;
    const next = structureLines.slice(index + 1).find(item => item.trim())?.trim() || "";
    if (next === "{" && /\)$/.test(line)) continue;
    const statement = /^(?:return\b.*|break|continue|throw\b.*|(?:using|import|package)\s+.+|(?:(?:const|static|final|unsigned|signed|long|short|volatile|var|auto|string|String|int|float|double|char|bool|boolean|byte|size_t|[A-Z]\w*(?:<[^>]+>)?)\s+)+[*&]?\w+(?:\s*=.+)?|(?:[\w:[\].>-]+)\s*(?:\([^{}]*\)|(?:=|\+=|-=|\*=|\/=|\+\+|--).+)|(?:std::)?(?:cout|cin)\b.+)$/;
    if (statement.test(line)) findings.push({ line: index + 1, issue: "Uma instrução parece estar sem `;` no final.", suggestion: "Adicione `;` ao fim da instrução.", certainty: "forte" });
    if (findings.length >= 4) break;
  }
  return findings;
}

function cFamilyDiagnosis(value, language) {
  const findings = [];
  const add = item => { if (item && !findings.some(current => current.issue === item.issue)) findings.push(item); };
  missingSemicolonDiagnosis(value, language).forEach(add);
  if (/\b(?:if|while)\s*\([^\n)]*?(?<![=!<>])=(?!=)[^\n)]*\)/.test(value)) add(finding(value, /\b(?:if|while)\s*\(/, "Uma condição parece usar atribuição (`=`) em vez de comparação.", "Confira se a intenção era comparar com `==`.", "possível"));
  if (language === "c") {
    if (/\bprinft\s*\(/.test(value)) add(finding(value, /\bprinft\s*\(/, "A função `printf` está escrita incorretamente.", "Troque `prinft` por `printf`."));
    if (/\b(?:printf|scanf)\s*\(/.test(value) && !/#include\s*<stdio\.h>/.test(value)) add(finding(value, /\b(?:printf|scanf)\s*\(/, "O código usa entrada ou saída padrão sem incluir `stdio.h`.", "Adicione `#include <stdio.h>` no início do arquivo.", "possível"));
  }
  if (["cpp", "cplus"].includes(language)) {
    if (/\b(?:std::)?cout\s*>>/.test(value)) add(finding(value, /\b(?:std::)?cout\s*>>/, "A saída com `cout` usa o operador de entrada `>>`.", "Use `<<` para enviar valores ao `cout`."));
    if (/\b(?:std::)?cin\s*<</.test(value)) add(finding(value, /\b(?:std::)?cin\s*<</, "A entrada com `cin` usa o operador de saída `<<`.", "Use `>>` para ler valores com `cin`."));
    if (/\bstd:(?!:)\w+/.test(value)) add(finding(value, /\bstd:(?!:)\w+/, "O namespace `std` está com apenas um `:`.", "Use `std::` com dois-pontos duplos."));
    if (/\.lenght\s*\(/.test(value)) add(finding(value, /\.lenght\s*\(/, "O método `lenght` está escrito incorretamente.", "Para texto, use `.length()`; para contêineres, normalmente use `.size()`."));
  }
  if (language === "csharp") {
    if (/Console\.Writeline\s*\(/.test(value)) add(finding(value, /Console\.Writeline/, "O método diferencia maiúsculas de minúsculas.", "Troque `Console.Writeline` por `Console.WriteLine`."));
    if (/\b(?:public|private|protected)\s+(?:string|int|bool|double)\s+\w+\s*\([^)]*\)\s*:/m.test(value)) add(finding(value, /\b(?:public|private|protected)\b/, "Um método C# termina com `:` em vez de abrir um bloco.", "Troque `:` por `{` e feche o método com `}`."));
    if (/Console\.(?:WriteLine|ReadLine)\s*\[/.test(value)) add(finding(value, /Console\.(?:WriteLine|ReadLine)\s*\[/, "Um método de `Console` foi chamado com colchetes.", "Use parênteses na chamada, como `Console.WriteLine(valor)`."));
  }
  if (language === "java") {
    if (/System\.out\.printLn\s*\(/.test(value)) add(finding(value, /System\.out\.printLn/, "O método `println` está com maiúscula incorreta.", "Troque `printLn` por `println`."));
    if (/\bstring\s+\w+/.test(value)) add(finding(value, /\bstring\s+\w+/, "O tipo de texto em Java diferencia maiúsculas de minúsculas.", "Troque `string` por `String`."));
    if (/\bpublic\s+static\s+void\s+main\s*\(\s*\)/.test(value)) add(finding(value, /\bpublic\s+static\s+void\s+main/, "O método principal Java está sem o parâmetro `String[] args`.", "Use `public static void main(String[] args)`.", "forte"));
    if (/System\.out\.(?:print|println)\s*\[/.test(value)) add(finding(value, /System\.out\.(?:print|println)\s*\[/, "Um método de saída foi chamado com colchetes.", "Use parênteses, como `System.out.println(valor)`."));
  }
  if (language === "esp32") {
    if (/\b(?:pinmode|digitalwrite|digitalread|analogread|analogwrite)\s*\(/.test(value)) add(finding(value, /\b(?:pinmode|digitalwrite|digitalread|analogread|analogwrite)\s*\(/, "Uma função do Arduino/ESP32 está com letras maiúsculas incorretas.", "Use `pinMode`, `digitalWrite`, `digitalRead`, `analogRead` ou `analogWrite`."));
    if (/\bSerial\.Begin\s*\(/.test(value)) add(finding(value, /\bSerial\.Begin/, "O método serial diferencia maiúsculas de minúsculas.", "Troque `Serial.Begin` por `Serial.begin`."));
    if (/\bSerial\.(?:print|println)\s*\[/.test(value)) add(finding(value, /\bSerial\.(?:print|println)\s*\[/, "A chamada de saída serial usa colchetes.", "Use parênteses, como `Serial.println(valor)`."));
    if (!/\bvoid\s+setup\s*\(/.test(value)) add({ line: 1, issue: "O sketch não possui a função `setup()`.", suggestion: "Adicione `void setup() { ... }` para a inicialização.", certainty: "possível" });
    if (!/\bvoid\s+loop\s*\(/.test(value)) add({ line: 1, issue: "O sketch não possui a função `loop()`.", suggestion: "Adicione `void loop() { ... }`, mesmo que fique vazio.", certainty: "possível" });
  }
  return findings;
}

function jsxDiagnosis(value, language) {
  const findings = [];
  const add = item => { if (item && !findings.some(current => current.issue === item.issue)) findings.push(item); };
  htmlDiagnosis(value).forEach(add);
  if (language === "react") {
    if (/\bclass\s*=/.test(value)) add(finding(value, /\bclass\s*=/, "JSX usa `className`, não o atributo HTML `class`.", "Troque `class` por `className`."));
    if (/<label\b[^>]*\bfor\s*=/.test(value)) add(finding(value, /<label\b[^>]*\bfor\s*=/, "JSX usa `htmlFor` para associar um label ao campo.", "Troque `for` por `htmlFor`."));
    if (/\b(?:onclick|onchange|onsubmit)\s*=/.test(value)) add(finding(value, /\b(?:onclick|onchange|onsubmit)\s*=/, "Eventos JSX usam nomes em camelCase.", "Use `onClick`, `onChange` ou `onSubmit`."));
    if (/\bstyle\s*=\s*["']/.test(value)) add(finding(value, /\bstyle\s*=\s*["']/, "Em JSX, o atributo `style` não recebe uma string HTML comum.", "Passe um objeto, por exemplo `style={{ color: 'red' }}`."));
    if (/\.map\s*\([^)]*=>\s*(?:\(|)\s*<([A-Za-z][\w.]*)\b(?![^>]*\bkey\s*=)/s.test(value)) add(finding(value, /\.map\s*\(/, "Uma lista renderizada com `map` parece não informar uma `key`.", "Adicione uma `key` estável ao primeiro elemento retornado.", "possível"));
    if (/\bif\s*\([^)]*\)\s*\{[^}]*\buse(?:State|Effect|Memo|Callback)\s*\(/s.test(value)) add(finding(value, /\bif\s*\(/, "Um Hook parece ser chamado dentro de uma condição.", "Chame Hooks no topo do componente, sempre na mesma ordem.", "forte"));
  }
  if (language === "reactnative") {
    if (/<(?:div|span|p|button|input|main|section|img)\b/i.test(value)) add(finding(value, /<(?:div|span|p|button|input|main|section|img)\b/i, "O componente usa uma tag HTML que não existe no React Native.", "Use componentes nativos como `View`, `Text`, `Pressable`, `TextInput` ou `Image`."));
    if (/\bclassName\s*=/.test(value)) add(finding(value, /\bclassName\s*=/, "React Native não aplica CSS com `className` por padrão.", "Use a propriedade `style` e `StyleSheet.create`."));
    if (/\bonClick\s*=/.test(value)) add(finding(value, /\bonClick\s*=/, "Componentes do React Native normalmente não usam `onClick`.", "Em `Pressable` ou `Button`, use `onPress`."));
    if (/\bstyle\s*=\s*["']/.test(value)) add(finding(value, /\bstyle\s*=\s*["']/, "A propriedade `style` do React Native não recebe uma string CSS.", "Passe um objeto ou um estilo criado com `StyleSheet.create`."));
    if (/<Image\b(?![^>]*\bsource\s*=)[^>]*\/?\s*>/.test(value)) add(finding(value, /<Image\b/, "Um componente `Image` está sem a propriedade `source`.", "Informe `source={require(...)}` ou `source={{ uri: ... }}`."));
    if (/<View\b[^>]*>\s*[^<{\s][^<]*<\/View>/s.test(value)) add(finding(value, /<View\b/, "Há texto diretamente dentro de `View`.", "Coloque o texto dentro de um componente `<Text>`."));
  }
  return findings;
}

function codeDiagnosis(code, language = "") {
  const value = String(code || "").replace(/\r\n?/g, "\n");
  const normalizedLanguage = detectCodeLanguage(value, language);
  const findings = [];
  const add = item => { if (item && !findings.some(current => current.issue === item.issue)) findings.push(item); };
  if (/for\s*\([^;]+;\s*[^;]*<[^;]+;\s*[^)]*--/.test(value)) add(finding(value, /for\s*\(/, "O laço compara com `<`, mas diminui o contador; ele pode se afastar da condição de parada.", "Confira se a atualização deveria incrementar o contador ou se a comparação precisa mudar."));
  if ((/while\s*\(\s*true\s*\)/i.test(value) || /^\s*while\s+True\s*:/m.test(value)) && !/\bbreak\s*;?/.test(value)) add(finding(value, /while\s*(?:\(\s*true\s*\)|True\s*:)/i, "Há um laço infinito sem uma saída visível.", "Defina a condição de término ou um `break` alcançável."));
  if (/\b(?:\/|%)\s*0(?:\D|$)/.test(value)) add(finding(value, /(?:\/|%)\s*0/, "Há uma divisão ou resto por zero literal.", "Valide o divisor antes da operação e trate o caso zero."));
  if (normalizedLanguage !== "html") lexicalDiagnosis(value, normalizedLanguage).forEach(add);
  if (normalizedLanguage === "python") pythonDiagnosis(value).forEach(add);
  if (["javascript", "typescript"].includes(normalizedLanguage)) javascriptDiagnosis(value, normalizedLanguage).forEach(add);
  if (normalizedLanguage === "html") {
    if (/\bscr\s*=/.test(value)) add(finding(value, /\bscr\s*=/, "O atributo `scr` não carrega imagens.", "Troque `scr` por `src`."));
    if (/\bherf\s*=/.test(value)) add(finding(value, /\bherf\s*=/, "O atributo `herf` não cria um link.", "Troque `herf` por `href`."));
    if (/\bclas\s*=/.test(value)) add(finding(value, /\bclas\s*=/, "O atributo `clas` está escrito incorretamente.", "Troque `clas` por `class`."));
    if (/<image\b/i.test(value)) add(finding(value, /<image\b/i, "A tag HTML para imagens é `<img>`, não `<image>`.", "Troque `<image>` por `<img>` e informe `src` e `alt`."));
    if (/<img\b(?![^>]*\balt\s*=)[^>]*>/i.test(value)) add(finding(value, /<img\b/i, "Uma imagem está sem atributo `alt`.", "Adicione um texto alternativo que descreva a função da imagem."));
    htmlDiagnosis(value).forEach(add);
  }
  if (normalizedLanguage === "css") cssDiagnosis(value).forEach(add);
  if (normalizedLanguage === "sql") sqlDiagnosis(value).forEach(add);
  if (["c", "cplus", "cpp", "csharp", "java", "esp32"].includes(normalizedLanguage)) cFamilyDiagnosis(value, normalizedLanguage).forEach(add);
  if (["react", "reactnative"].includes(normalizedLanguage)) {
    javascriptDiagnosis(value, "javascript").forEach(add);
    jsxDiagnosis(value, normalizedLanguage).forEach(add);
  }
  if (normalizedLanguage !== "html") delimiterDiagnosis(value, normalizedLanguage).forEach(add);
  return { language: normalizedLanguage, findings: findings.slice(0, 10) };
}

function stripJats(value) {
  return compact(String(value || "").replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " "), 5000);
}

function articleYear(item) {
  return item?.published?.["date-parts"]?.[0]?.[0] || item?.issued?.["date-parts"]?.[0]?.[0] || item?.created?.["date-parts"]?.[0]?.[0] || null;
}

function normalizeArticle(item) {
  const title = compact(Array.isArray(item?.title) ? item.title[0] : item?.title, 260);
  if (!title) return null;
  const authorList = (Array.isArray(item.author) ? item.author : []).slice(0, 5).map(author => compact([author.given, author.family].filter(Boolean).join(" "), 100)).filter(Boolean);
  const doi = compact(item.DOI, 180);
  const abstract = stripJats(item.abstract);
  return {
    sourceType: "scientific",
    provider: "Crossref",
    title,
    authors: authorList.join(", ") || "Autores não informados",
    year: articleYear(item),
    journal: compact(Array.isArray(item["container-title"]) ? item["container-title"][0] : item["container-title"], 180) || "Periódico não informado",
    doi,
    url: doi ? `https://doi.org/${encodeURIComponent(doi).replace(/%2F/gi, "/")}` : compact(item.URL, 500),
    citations: Number(item["is-referenced-by-count"] || 0),
    abstractKeywords: words(abstract).slice(0, 120)
  };
}

function researchQuery(question) {
  const cleaned = String(question || "")
    .replace(/\b(pesquise|procure|busque|encontre|mostre|traga)\b/gi, " ")
    .replace(/\b(artigos?|estudos?|pesquisas?)\s+(cient[ií]ficos?|acad[eê]micos?)?\b/gi, " ")
    .replace(/\b(na web|na internet|no crossref|sobre)\b/gi, " ")
    .replace(/[?!.]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 220) || compact(question, 220);
}

async function fetchScientificArticles(query) {
  if (!query || environment.NODE_ENV === "test" || environment.CODA_RESEARCH_OFFLINE === "1") return [];
  const cacheKey = query.toLowerCase();
  const cached = researchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < 30 * 60_000) return cached.items;
  const url = new URL("https://api.crossref.org/v1/works");
  url.searchParams.set("query.bibliographic", query);
  url.searchParams.set("filter", "type:journal-article");
  url.searchParams.set("rows", "5");
  url.searchParams.set("sort", "relevance");
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(environment.CODA_RESEARCH_EMAIL || "")) url.searchParams.set("mailto", environment.CODA_RESEARCH_EMAIL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "CodaTutor/10.5.0 (pesquisa educacional)" }, signal: controller.signal });
    if (!response.ok) throw new Error(`Crossref respondeu ${response.status}`);
    const payload = await response.json();
    const items = (payload?.message?.items || []).map(normalizeArticle).filter(Boolean);
    researchCache.set(cacheKey, { time: Date.now(), items });
    if (researchCache.size > 50) researchCache.delete(researchCache.keys().next().value);
    return items;
  } finally {
    clearTimeout(timer);
  }
}

function recurringTopics(articles) {
  const counts = new Map();
  articles.forEach(article => {
    const unique = new Set([...words(article.title), ...(article.abstractKeywords || [])]);
    unique.forEach(word => counts.set(word, (counts.get(word) || 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).filter(([, count]) => count > 1).slice(0, 6).map(([word]) => word);
}

function scientificAnswer(query, articles) {
  if (!articles.length) return `Não consegui consultar o índice científico agora. Tente novamente quando houver internet ou reformule a busca com um tema mais específico.\n\nO Tutor Coda não inventa referências: sem registros verificáveis, ele informa a limitação em vez de apresentar uma conclusão sem fonte.`;
  const topics = recurringTopics(articles);
  const list = articles.slice(0, 3).map((article, index) => `${index + 1}. ${article.title} (${article.year || "ano não informado"}) — ${article.journal}.`).join("\n");
  const interpretation = topics.length
    ? `Nos metadados encontrados, os assuntos recorrentes foram: ${topics.join(", ")}. Isso ajuda a orientar a leitura, mas não prova sozinho uma conclusão.`
    : "Os títulos encontrados tratam o tema por abordagens diferentes; compare objetivo, método e resultados antes de adotar uma conclusão.";
  return `Pesquisa científica: “${query}”\n\nEncontrei ${articles.length} artigos de periódico no índice Crossref:\n\n${list}\n\nLeitura orientada do Tutor\n${interpretation}\n\nLimite importante\nEsta resposta organiza metadados científicos, não substitui a leitura dos artigos. Abra as fontes abaixo e confira resumo, método, amostra, resultados e data antes de usar a informação em um trabalho.`;
}

function quizAnswer(question, source, history) {
  const previous = [...(history || [])].reverse().find(item => item.role === "assistant")?.content || "";
  const topic = source?.title || "o assunto atual";
  if (/Pergunta de revis[aã]o:/i.test(previous)) {
    const expected = new Set(words(`${source?.title || ""} ${source?.excerpt || ""}`).slice(0, 30));
    const overlap = [...new Set(words(question))].filter(word => expected.has(word));
    const feedback = overlap.length >= 2
      ? `Seu raciocínio usa conceitos relacionados (${overlap.slice(0, 4).join(", ")}). A resposta está bem encaminhada.`
      : "Sua resposta ainda está geral. Tente relacionar o conceito à entrada, ao processamento e ao resultado produzido.";
    return `${feedback}\n\nPergunta de revisão: qual erro comum pode acontecer ao aplicar “${topic}” e como você testaria para encontrá-lo?`;
  }
  return `Pergunta de revisão: explique com suas palavras para que “${topic}” serve em um programa real e dê um exemplo curto. Depois eu comparo seu raciocínio com o conteúdo da aula.`;
}

function batchCodeAnswer(codes) {
  const reports = codes.slice(0, 14).map((entry, index) => {
    const hintedLanguage = canonicalLanguage(entry?.language);
    const diagnosis = codeDiagnosis(String(entry?.code || ""), hintedLanguage);
    const detected = languageLabels[diagnosis.language] || compact(entry?.language, 30) || "Linguagem não identificada";
    const label = compact(entry?.label, 100) || `${detected} • código ${index + 1}`;
    return { label, detected, diagnosis };
  });
  const withAlerts = reports.filter(report => report.diagnosis.findings.length);
  const totalAlerts = reports.reduce((sum, report) => sum + report.diagnosis.findings.length, 0);
  const details = reports.map(report => {
    if (!report.diagnosis.findings.length) return `✓ ${report.label} — nenhum erro evidente nos padrões verificados.`;
    const findings = report.diagnosis.findings.slice(0, 3).map(item => `  • ${item.line ? `Linha ${item.line}: ` : ""}${item.issue}\n    Correção: ${item.suggestion}`).join("\n");
    const hidden = report.diagnosis.findings.length > 3 ? `\n  • Mais ${report.diagnosis.findings.length - 3} alerta(s) encontrado(s). Abra esse código separadamente para ver tudo.` : "";
    return `⚠ ${report.label} — ${report.diagnosis.findings.length} alerta(s).\n${findings}${hidden}`;
  }).join("\n\n");
  return `Análise dos códigos do laboratório — sem executar\n\nResumo: ${reports.length} código(s) analisado(s), ${withAlerts.length} com alertas e ${totalAlerts} ponto(s) encontrado(s).\n\n${details}\n\nEsta é uma análise estática local: ela encontra padrões de sintaxe e erros comuns, mas não substitui o compilador, o console nem testes de execução. Para investigar um item em detalhes, abra a linguagem correspondente e use “Analisar código atual”.`;
}

function localAnswer({ message, mode, code, codes, image, sources, context, history }) {
  const question = compact(message, 4000);
  const lower = question.toLocaleLowerCase("pt-BR");
  const primary = sources?.[0];
  const secondary = sources?.[1];
  const label = lessonLabel(primary);
  const idea = firstIdea(primary?.excerpt);
  const pasted = extractCodeFromMessage(message);
  const effectiveCode = pasted.code || String(code || "").trim();
  const batchCodes = Array.isArray(codes) ? codes.filter(entry => String(entry?.code || "").trim()).slice(0, 14) : [];
  if (image) return "A versão local não interpreta imagens. Copie a mensagem de erro ou descreva o que aparece na tela; assim consigo analisar sem fingir que enxerguei o anexo.";
  if (mode === "code" || effectiveCode) {
    if (batchCodes.length) return batchCodeAnswer(batchCodes);
    if (!effectiveCode) return "Cole o código diretamente na mensagem, use “Analisar código atual” ou “Analisar os 14 códigos”. Você também pode usar três crases antes e depois do trecho. Eu separo erro provável, linha e correção sugerida.";
    const diagnosis = codeDiagnosis(effectiveCode, pasted.language || context?.language);
    const detectedLanguage = languageLabels[diagnosis.language] || "não identificada";
    if (!diagnosis.findings.length) return `Análise local do código — sem executar\n\nLinguagem provável: ${detectedLanguage}.\n\nNão encontrei um erro evidente pelos padrões verificados. Isso não confirma que o programa está correto.\n\nPróximos testes:\n1. copie a mensagem exata do console;\n2. informe a entrada usada;\n3. diga o resultado esperado e o resultado obtido;\n4. teste uma alteração por vez.\n\nFonte relacionada: ${label}.`;
    return `Análise local do código — sem executar\n\nLinguagem provável: ${detectedLanguage}.\nPontos encontrados: ${diagnosis.findings.length}.\n\n${diagnosis.findings.map((item, index) => `${index + 1}. ${item.line ? `Linha ${item.line}: ` : ""}${item.issue}\n   Correção sugerida: ${item.suggestion}\n   Confiança: ${item.certainty}.`).join("\n\n")}\n\nFaça a menor mudança possível e execute de novo. Se o console mostrar outro erro, envie a mensagem completa.`;
  }
  if (mode === "quiz") return quizAnswer(question, primary, history);
  if (mode === "hint") {
    const clue = idea ? idea.split(/[.!?]/)[0] : "identifique primeiro a entrada, o processamento e a saída";
    return `Pista 1 — ${label}\n${clue}.\n\nPista 2\nCompare o primeiro valor correto com a primeira linha em que o comportamento muda. O que essa linha deveria produzir?`;
  }
  if (/^(oi|ol[aá]|bom dia|boa tarde|boa noite)\b/.test(lower)) return "Olá! Posso explicar aulas, dar pistas, revisar respostas, analisar código por regras e buscar artigos científicos com referências verificáveis. Escolha um modo acima ou escreva sua dúvida.";
  if (/por onde|come(c|ç)ar|iniciante/.test(lower)) return "Caminho recomendado: HTML → CSS → JavaScript. Faça uma atividade curta após cada aula e use o laboratório para testar pequenas mudanças. Depois escolha Python, banco de dados ou outra trilha conforme seu projeto.";
  if (/laborat[oó]rio|executar|rodar c[oó]digo/.test(lower)) return "Abra o Laboratório, escolha a linguagem, escreva o código e execute. No Tutor, selecione “Analisar código” e use “Analisar código atual” ou “Analisar os 14 códigos”. Também é possível colar um código diretamente na conversa.";
  const previous = [...(history || [])].reverse().find(item => item.role === "assistant")?.content;
  if (/^(por qu[eê]|como assim|n[aã]o entendi|explique melhor)/.test(lower) && previous) return `Vou reorganizar a explicação anterior em três partes:\n\n1. Ideia: ${compact(previous, 260)}\n2. Teste: use um exemplo pequeno e observe uma variável por vez.\n3. Verificação: compare o resultado obtido com o esperado.\n\nQual parte ainda está confusa: conceito, código ou resultado?`;
  if (primary) {
    const secondIdea = secondary ? firstIdea(secondary.excerpt, 330) : "";
    const opinion = /opini[aã]o|o que (voc[eê] )?acha|vale a pena|melhor/.test(lower)
      ? "\n\nAnálise do Tutor\nPelo material recuperado, a melhor decisão é a que você consegue justificar com objetivo, teste e resultado; trate isso como interpretação orientada, não como fato universal."
      : "";
    return `Resposta curta\n${idea || "O conceito relaciona uma entrada, uma transformação e um resultado observável."}\n\nComo aplicar\n1. identifique a função principal;\n2. monte o menor exemplo possível;\n3. altere um elemento por vez;\n4. compare o resultado com o esperado.${secondIdea ? `\n\nOutra aula relacionada\n${secondIdea}` : ""}${opinion}\n\nFonte principal: ${label}.`;
  }
  return "Não encontrei uma aula diretamente relacionada. Informe a matéria, o objetivo e o que aconteceu de verdade. Para buscar estudos externos, selecione “Artigos” e escreva um tema específico.";
}

function suggestedActions(message, context, sources = []) {
  const lower = String(message).toLocaleLowerCase("pt-BR");
  const primary = sources.find(source => source.sourceType !== "scientific");
  const actions = [];
  if (/laborat[oó]rio|c[oó]digo|executar|erro/.test(lower)) actions.push({ type: "open_lab", label: "Abrir laboratório" });
  const courseId = context.courseId || primary?.courseId;
  const lessonIndex = Number.isInteger(context.lessonIndex) ? context.lessonIndex : primary?.lessonIndex;
  if (courseId) actions.push({ type: "open_lesson", label: "Abrir aula relacionada", courseId, lessonIndex: Number.isInteger(lessonIndex) ? lessonIndex : 0 });
  if (/professor|n[aã]o consegui|continuo com d[uú]vida/.test(lower)) actions.push({ type: "open_questions", label: "Perguntar ao professor" });
  return actions.slice(0, 2);
}

export async function answerChat(payload) {
  const mode = ["explain", "hint", "code", "quiz", "research"].includes(payload.mode) ? payload.mode : "explain";
  const wantsResearch = mode === "research" || /\b(artigo|cient[ií]fic|estudo acad[eê]mico|evid[eê]ncia|pesquisa na web)\b/i.test(payload.message || "");
  if (wantsResearch) {
    const query = researchQuery(payload.message);
    let articles = [];
    try { articles = await fetchScientificArticles(query); } catch {}
    return {
      text: scientificAnswer(query, articles), provider: "local-research", model: chatModel,
      sources: articles.map(({ abstractKeywords, ...article }) => article), actions: []
    };
  }
  const text = localAnswer({ ...payload, mode });
  return { text, provider: "local", model: chatModel, sources: payload.sources || [], actions: suggestedActions(payload.message, payload.context || {}, payload.sources || []) };
}
