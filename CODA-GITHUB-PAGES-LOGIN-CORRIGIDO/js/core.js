"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = window.CodaUtils.escapeHtml;
const { createInitialState, loadJSON, loadStudentWorkspace: loadStudentWorkspaceData, saveStudentWorkspace: saveStudentWorkspaceData } = window.CodaStateModule;
const esp32CircuitLogic = window.CodaEsp32CircuitLogic;

const courseBlueprints = [
  {id:"html",name:"HTML",symbol:"HTML",category:"Web",level:"Iniciante",color:"#ff805c",description:"Estruture páginas semânticas, acessíveis e preparadas para a web.",topics:["Como a Web e o HTML funcionam","Estrutura base de um documento","Textos, listas e links","Imagens e mídia acessível","HTML semântico","Formulários e validação","Projeto: página de portfólio"]},
  {id:"css",name:"CSS",symbol:"CSS",category:"Web",level:"Iniciante",color:"#52a8ff",description:"Transforme estruturas em interfaces responsivas, claras e modernas.",topics:["Seletores e cascata","Cores, tipografia e unidades","Box model sem mistério","Flexbox na prática","Grid responsivo","Transições e animações","Projeto: landing page adaptável"]},
  {id:"javascript",name:"JavaScript",symbol:"JS",category:"Web",level:"Iniciante",color:"#ffd84d",description:"Programe lógica, eventos, DOM e dados em aplicações interativas.",topics:["Valores e variáveis","Condições e operadores","Laços e repetição","Funções e escopo","Arrays e objetos","DOM, eventos e formulários","Projeto: lista de tarefas"]},
  {id:"typescript",name:"TypeScript",symbol:"TS",category:"Web",level:"Intermediário",color:"#4f9cff",description:"Adicione tipos e segurança aos seus projetos JavaScript.",topics:["Por que usar tipos","Tipos primitivos e inferência","Objetos, type e interface","Unions e narrowing","Funções tipadas","Generics e utilitários","Projeto: catálogo tipado"]},
  {id:"python",name:"Python",symbol:"PY",category:"Sistemas",level:"Iniciante",color:"#57d6a4",description:"Aprenda lógica, automação e dados com uma sintaxe amigável.",topics:["Primeiro programa e variáveis","Condições","Laços for e while","Funções e módulos","Listas e dicionários","Arquivos e tratamento de erros","Projeto: organizador de estudos"]},
  {id:"c",name:"C",symbol:"C",category:"Sistemas",level:"Intermediário",color:"#8fa1ff",description:"Entenda memória, ponteiros e a base dos sistemas computacionais.",topics:["Compilação e primeiro programa","Tipos e operadores","Condições e laços","Funções e cabeçalhos","Arrays e strings","Ponteiros e memória","Projeto: agenda no terminal"]},
  {id:"cplus",name:"C+",symbol:"C+",category:"Sistemas",level:"Intermediário",color:"#bd84ff",description:"Trilha comparativa para evoluir de C até recursos modernos de C++.",topics:["Revisão de C","Organização de código","Structs e dados","Ponteiros com segurança","Da struct para a classe","Entrada e saída comparadas","Projeto: cadastro evolutivo"]},
  {id:"cpp",name:"C++",symbol:"C++",category:"Sistemas",level:"Avançado",color:"#7f8fff",description:"Use orientação a objetos, STL e recursos de alto desempenho.",topics:["Sintaxe moderna e namespaces","Referências e const","Classes e encapsulamento","Herança e polimorfismo","STL: vector e map","RAII e smart pointers","Projeto: sistema de biblioteca"]},
  {id:"csharp",name:"C#",symbol:"C#",category:"Aplicações",level:"Intermediário",color:"#ad70ec",description:"Construa aplicações organizadas dentro do ecossistema .NET.",topics:["Projeto .NET e sintaxe","Classes e propriedades","Coleções e LINQ","Interfaces e injeção","Exceções e validação","Async e await","Projeto: API de tarefas"]},
  {id:"java",name:"Java",symbol:"JV",category:"Aplicações",level:"Intermediário",color:"#ff8b58",description:"Crie sistemas robustos com objetos, coleções e boas práticas.",topics:["JDK, JVM e primeiro programa","Classes e objetos","Encapsulamento","Herança e interfaces","Collections","Exceções e arquivos","Projeto: sistema escolar"]},
  {id:"react",name:"React",symbol:"⚛",category:"Aplicações",level:"Intermediário",color:"#55d8ff",description:"Construa interfaces componentizadas com estado e hooks.",topics:["Componentes e JSX","Props e composição","Estado com useState","Eventos e formulários","Listas e renderização condicional","Efeitos e consumo de API","Projeto: painel de estudos"]},
  {id:"reactnative",name:"React Native",symbol:"RN",category:"Aplicações",level:"Avançado",color:"#5abef5",description:"Transforme conhecimentos React em aplicativos para celular.",topics:["Ambiente e componentes nativos","Estilos e Flexbox mobile","Navegação entre telas","Estado e formulários","Listas com FlatList","APIs e armazenamento local","Projeto: app de hábitos"]},
  {id:"esp32",name:"ESP32",symbol:"ESP",category:"Hardware",level:"Intermediário",color:"#b9ff3b",description:"Programe sensores, LEDs e Wi-Fi com montagens visualizadas em 3D.",topics:["Conhecendo a placa e os pinos","Saída digital: LED","Entrada digital: botão","PWM e controle de brilho","Leitura de sensores","Wi-Fi e servidor web","Projeto: estação conectada"]},
  {id:"sql",name:"SQL",symbol:"SQL",category:"Sistemas",level:"Iniciante",color:"#58d6c7",description:"Consulte, filtre e organize dados estruturados em bancos relacionais.",topics:["Bancos relacionais e tabelas","SELECT e projeção de colunas","WHERE e filtros","ORDER BY e LIMIT","INSERT e novos registros","UPDATE e DELETE com segurança","Projeto: banco da escola"]}
];

const videoIds = ["UB1O30fR-EE","1PnVor36_40","W6NZfCO5SIk","BwuLxPH8IDs","kqtD5dpn9C8","KJgsSFOSQv0","vLnPwxZdW4Y","ZzaPdXTrSb8","GhQdlIFylQ8","eIrMbAQSU34","SqcY0GlETPk","0-S5a0eXPoc","xPlN_Tk3VLQ","HXV3zeQKqGY"];
const courseVideoGuides=Object.fromEntries(courseBlueprints.map((course,index)=>[course.id,{id:videoIds[index],source:"Curso completo selecionado para a trilha"}]));
function defaultVideoId(course){return courseVideoGuides[course.id]?.id||videoIds[0]}
const videoCatalog = courseBlueprints.flatMap((course,courseIndex)=>course.topics.map((topic,lessonIndex)=>({
  courseId:course.id,courseIndex,lessonIndex,category:course.category,id:defaultVideoId(course),title:topic,
  duration:1,description:`Microaula exclusiva da aula ${lessonIndex+1} de ${course.name}, com legenda, transcrição e prática.`
})));
const categoryInfo = {Web:{label:"Base da Web",color:"#ff805c"},Sistemas:{label:"Sistemas e Lógica",color:"#9c7cff"},Aplicações:{label:"Aplicações e Mobile",color:"#56b8ff"},Hardware:{label:"Hardware e IoT",color:"#b9ff3b"}};

const starters = {
  html:{file:"index.html",mode:"browser",code:`<!doctype html>\n<html lang="pt-BR">\n  <head><meta charset="utf-8"><title>Meu projeto</title></head>\n  <body>\n    <main>\n      <h1>Olá, coda!</h1>\n      <p>Minha primeira página semântica.</p>\n      <button>Explorar</button>\n    </main>\n  </body>\n</html>`},
  css:{file:"style.css",mode:"browser",code:`body {\n  min-height: 100vh;\n  margin: 0;\n  display: grid;\n  place-items: center;\n  background: #0c1321;\n  color: #f4f7fb;\n  font-family: Arial, sans-serif;\n}\n.card {\n  padding: 32px;\n  border: 1px solid #34435c;\n  border-left: 4px solid #b9ff3b;\n  border-radius: 12px;\n}`},
  javascript:{file:"script.js",mode:"browser",code:`const tecnologias = ["HTML", "CSS", "JavaScript"];\nconst lista = document.querySelector("#lista");\n\ntecnologias.forEach((nome, indice) => {\n  const item = document.createElement("li");\n  item.textContent = \`${"${indice + 1}"}. ${"${nome}"}\`;\n  lista.appendChild(item);\n});`},
  typescript:{file:"app.ts",mode:"guided",code:`type Curso = {\n  nome: string;\n  aulas: number;\n};\n\nconst curso: Curso = { nome: "TypeScript", aulas: 7 };\nconsole.log(\`${"${curso.nome}"}: ${"${curso.aulas}"} aulas\`);`},
  python:{file:"main.py",mode:"guided",code:`materias = ["Python", "Automação", "Dados"]\n\nfor indice, materia in enumerate(materias, start=1):\n    print(f"{indice}. {materia}")\n\nprint("Plano de estudos criado!")`},
  c:{file:"main.c",mode:"guided",code:`#include <stdio.h>\n\nint main(void) {\n    int aulas = 7;\n    printf("Trilha C: %d aulas\\n", aulas);\n    return 0;\n}`},
  cplus:{file:"comparativo.cpp",mode:"guided",code:`// C+ é uma trilha comparativa entre C e C++.\n#include <iostream>\n\nint main() {\n    int progresso = 1;\n    std::cout << "Evolução C para C++: " << progresso << std::endl;\n    return 0;\n}`},
  cpp:{file:"main.cpp",mode:"guided",code:`#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> notas {8, 9, 10};\n    for (const int nota : notas) std::cout << nota << " ";\n    return 0;\n}`},
  csharp:{file:"Program.cs",mode:"guided",code:`var aulas = new List<string> { "Tipos", "Classes", "LINQ" };\n\nforeach (var aula in aulas)\n{\n    Console.WriteLine($"Estudar: {aula}");\n}`},
  java:{file:"Main.java",mode:"guided",code:`public class Main {\n    public static void main(String[] args) {\n        String materia = "Java";\n        int aulas = 7;\n        System.out.println(materia + ": " + aulas + " aulas");\n    }\n}`},
  react:{file:"App.jsx",mode:"guided",code:`import { useState } from "react";\n\nexport default function App() {\n  const [aulas, setAulas] = useState(0);\n  return (\n    <main>\n      <h1>{aulas} aulas concluídas</h1>\n      <button onClick={() => setAulas(aulas + 1)}>Concluir</button>\n    </main>\n  );\n}`},
  reactnative:{file:"App.js",mode:"guided",code:`import { View, Text, Pressable } from "react-native";\n\nexport default function App() {\n  return (\n    <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>\n      <Text>Meu plano de estudos</Text>\n      <Pressable><Text>Começar aula</Text></Pressable>\n    </View>\n  );\n}`},
  esp32:{file:"projeto.ino",mode:"guided",code:`const int led = 2;\n\nvoid setup() {\n  pinMode(led, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(led, HIGH);\n  delay(500);\n  digitalWrite(led, LOW);\n  delay(500);\n}`},
  sql:{file:"consulta.sql",mode:"database",code:`SELECT id, nome, trilha\nFROM alunos\nWHERE ativo = true\nORDER BY nome;`}
};

const espProjects = [
  {id:"blink",icon:"●",title:"LED piscante",subtitle:"GPIO 2 • saída digital",pins:["GPIO2","GND"],wires:["GPIO 2 → LED interno da placa","GND → referência elétrica"],description:"Alterne o pino 2 entre ligado e desligado a cada meio segundo.",code:starters.esp32.code},
  {id:"traffic",icon:"◉",title:"Semáforo",subtitle:"GPIO 18, 19 e 21",pins:["GPIO18","GPIO19","GPIO21","GND"],wires:["GPIO 18 → LED vermelho","GPIO 19 → LED amarelo","GPIO 21 → LED verde","Cada LED usa um resistor adequado"],description:"Organize uma sequência de estados para representar um semáforo didático.",code:`const int vermelho = 18;\nconst int amarelo = 19;\nconst int verde = 21;\n\nvoid setup() {\n  pinMode(vermelho, OUTPUT);\n  pinMode(amarelo, OUTPUT);\n  pinMode(verde, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(verde, HIGH); delay(3000);\n  digitalWrite(verde, LOW);\n  digitalWrite(amarelo, HIGH); delay(1000);\n  digitalWrite(amarelo, LOW);\n  digitalWrite(vermelho, HIGH); delay(3000);\n  digitalWrite(vermelho, LOW);\n}`},
  {id:"sensor",icon:"⌁",title:"Sensor de distância",subtitle:"GPIO 5 e 18",pins:["GPIO5","GPIO18","GND","VIN"],wires:["TRIG → GPIO 5","ECHO → GPIO 18 com divisor de tensão","VCC → 5V e GND → GND"],description:"Envie um pulso ultrassônico e calcule uma distância aproximada pelo tempo do retorno.",code:`const int trig = 5;\nconst int echo = 18;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(trig, OUTPUT);\n  pinMode(echo, INPUT);\n}\n\nvoid loop() {\n  digitalWrite(trig, LOW); delayMicroseconds(2);\n  digitalWrite(trig, HIGH); delayMicroseconds(10);\n  digitalWrite(trig, LOW);\n  long tempo = pulseIn(echo, HIGH);\n  float distancia = tempo * 0.034 / 2;\n  Serial.println(distancia);\n  delay(500);\n}`},
  {id:"wifi",icon:"⌁",title:"Servidor Wi-Fi",subtitle:"Rede local • WebServer",pins:["GPIO2","3V3","GND"],wires:["A antena integrada conecta à rede","GPIO 2 indica o estado do servidor","Acesse pelo endereço exibido no monitor serial"],description:"Conecte a placa à rede e responda uma página simples no navegador.",code:`#include <WiFi.h>\n#include <WebServer.h>\n\nconst char* rede = "SUA_REDE";\nconst char* senha = "SUA_SENHA";\nWebServer servidor(80);\n\nvoid setup() {\n  Serial.begin(115200);\n  WiFi.begin(rede, senha);\n  while (WiFi.status() != WL_CONNECTED) delay(500);\n  servidor.on("/", []() {\n    servidor.send(200, "text/html", "<h1>ESP32 conectado</h1>");\n  });\n  servidor.begin();\n}\n\nvoid loop() { servidor.handleClient(); }`}
];

// Ambientes reais: navegador, compilador online e ESP32 físico.
starters.typescript.mode = "browser";
starters.python.mode = "cloud";
starters.c.mode = "cloud";
starters.cplus.mode = "cloud";
starters.cpp.mode = "cloud";
starters.csharp.mode = "cloud";
starters.csharp.code = "using System;\nusing System.Collections.Generic;\n\n" + starters.csharp.code;
starters.csharp.code = `using System;
using System.Collections.Generic;

public class Program {
    public static void Main() {
        var aulas = new List<string> { "Tipos", "Classes", "LINQ" };
        foreach (var aula in aulas) Console.WriteLine($"Estudar: {aula}");
    }
}`;
starters.java.mode = "cloud";
starters.react.mode = "browser";
starters.reactnative.mode = "browser";
Object.assign(starters.esp32, {
  file: "main.py",
  mode: "device",
  code: `from machine import Pin
from time import sleep

led = Pin(2, Pin.OUT)
for _ in range(10):
    led.on(); sleep(0.5)
    led.off(); sleep(0.5)

print("Programa finalizado")`
});
espProjects[0].code = starters.esp32.code;
espProjects[0].subtitle = "GPIO 2 • MicroPython";
espProjects[0].description = "Execute o código diretamente em uma placa ESP32 com MicroPython.";
espProjects[1].code = `from machine import Pin
from time import sleep

vermelho = Pin(18, Pin.OUT)
amarelo = Pin(19, Pin.OUT)
verde = Pin(21, Pin.OUT)

for _ in range(3):
    verde.on(); sleep(3); verde.off()
    amarelo.on(); sleep(1); amarelo.off()
    vermelho.on(); sleep(3); vermelho.off()

print("Sequência concluída")`;
espProjects[2].code = `from machine import Pin, time_pulse_us
from time import sleep_us, sleep

trig = Pin(5, Pin.OUT)
echo = Pin(18, Pin.IN)
for _ in range(10):
    trig.off(); sleep_us(2)
    trig.on(); sleep_us(10); trig.off()
    tempo = time_pulse_us(echo, 1, 30000)
    distancia = tempo * 0.0343 / 2
    print("Distância:", distancia, "cm")
    sleep(0.5)`;
espProjects[3].subtitle = "Rede local • MicroPython";
espProjects[3].code = `import network
import socket
from time import sleep

REDE = "SUA_REDE"
SENHA = "SUA_SENHA"
wifi = network.WLAN(network.STA_IF)
wifi.active(True)
wifi.connect(REDE, SENHA)
while not wifi.isconnected(): sleep(0.5)

print("IP:", wifi.ifconfig()[0])
servidor = socket.socket()
servidor.bind(("", 80)); servidor.listen(1)
cliente, _ = servidor.accept(); cliente.recv(1024)
cliente.send("HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\n<h1>ESP32 conectado</h1>")
cliente.close(); servidor.close()`;

const quizData = {
  Iniciante:[
    {topic:"HTML",q:"Qual elemento representa o conteúdo principal da página?",o:["<main>","<meta>","<style>","<script>"],a:0,e:"<main> identifica o conteúdo principal e único do documento."},
    {topic:"CSS",q:"Qual declaração ativa o Flexbox?",o:["position: flex","display: flex","layout: flex","flex: display"],a:1,e:"display: flex transforma o elemento em um contêiner flexível."},
    {topic:"JavaScript",q:"Qual palavra cria uma variável que pode receber outro valor?",o:["const","let","fixed","define"],a:1,e:"let declara uma variável reatribuível dentro do seu escopo."}
  ],
  Intermediário:[
    {topic:"Python",q:"Qual estrutura associa chaves a valores?",o:["tuple","set","dictionary","range"],a:2,e:"Um dicionário armazena pares de chave e valor."},
    {topic:"React",q:"Qual hook mantém estado local de um componente?",o:["useEffect","useState","useMemo","useId"],a:1,e:"useState guarda um valor e oferece uma função para atualizá-lo."},
    {topic:"Java",q:"Qual conceito permite que uma classe implemente um contrato?",o:["Interface","Loop","Pacote","Casting"],a:0,e:"Uma interface define operações que as classes implementadoras devem cumprir."}
  ],
  Avançado:[
    {topic:"TypeScript",q:"Qual tipo exige validação antes do uso?",o:["any","void","unknown","never"],a:2,e:"unknown recebe qualquer valor, mas força uma verificação antes de operações específicas."},
    {topic:"C++",q:"Qual conceito liga a vida de um recurso à vida de um objeto?",o:["RAII","Macro","Namespace","Overload"],a:0,e:"RAII usa construção e destruição de objetos para adquirir e liberar recursos."},
    {topic:"ESP32",q:"Qual recurso permite controlar o brilho de um LED?",o:["DNS","PWM","SQL","HTML"],a:1,e:"PWM alterna rapidamente o sinal e permite controlar a potência média aplicada."}
  ]
};

const initialPosts = [
  {id:1,author:"Bia Martins",initials:"BM",role:"Aluna",time:"há 12 min",topic:"JavaScript",title:"Por que meu map retorna undefined?",body:"Estou criando um novo array. Como identifico o erro dentro da arrow function?",likes:8,respostas:[{id:101,author:"Carlos Nunes",initials:"CN",role:"Professor",time:"há 8 min",body:"Verifique se a função do map retorna um valor em todos os casos e teste com um array pequeno."}]},
  {id:2,author:"Carlos Nunes",initials:"CN",role:"Professor",time:"há 35 min",topic:"HTML/CSS",title:"Dica: teste a navegação usando só o teclado",body:"Semântica e foco visível ajudam mais pessoas a usar seu projeto.",likes:21,respostas:[]},
  {id:3,author:"Lia Ramos",initials:"LR",role:"Profissional IoT",time:"há 1 h",topic:"ESP32",title:"Como escolher um GPIO para o sensor?",body:"Consulte a função de cada pino e confirme o nível de tensão aceito pelo módulo.",likes:13,respostas:[]}
];

let appDatabase=null;
let originalDatabase=null;
function normalizeDatabase(database){
  const safe=database&&typeof database==="object"?database:{};
  safe.meta={nome:"codaDB",versao:7,teacherAccessCode:"PROF-CODA",...(safe.meta||{})};if(safe.meta.nome==="NexoDB")safe.meta.nome="codaDB";if(safe.meta.teacherAccessCode==="PROF-NEXO")safe.meta.teacherAccessCode="PROF-CODA";
  safe.tabelas=safe.tabelas||{alunos:[],materias:[],atividades:[]};
  safe.conteudos=Array.isArray(safe.conteudos)?safe.conteudos:[];
  safe.desafiosExtras=Array.isArray(safe.desafiosExtras)?safe.desafiosExtras:[];
  safe.videos=Array.isArray(safe.videos)?safe.videos:[];
  safe.modelos3D=Array.isArray(safe.modelos3D)?safe.modelos3D:[];
  safe.recursos=Array.isArray(safe.recursos)?safe.recursos:[];
  safe.quizzes=Array.isArray(safe.quizzes)?safe.quizzes:[];
  safe.comunidade=(Array.isArray(safe.comunidade)?safe.comunidade:initialPosts).map(post=>({...post,respostas:Array.isArray(post.respostas)?post.respostas:[]}));
  return safe;
}
async function loadDatabase(){
  const local=loadJSON("nexo-database",null);
  try{const response=await fetch("banco.json",{cache:"no-store"});if(response.ok)originalDatabase=normalizeDatabase(await response.json())}catch(error){console.warn("Falha ao carregar banco JSON local:",error?.message||error)}
  originalDatabase=originalDatabase||normalizeDatabase({meta:{},tabelas:{alunos:[{id:1,nome:"Ana Souza",trilha:"HTML",ativo:true},{id:2,nome:"Bruno Lima",trilha:"Python",ativo:true}],materias:courseBlueprints.map(course=>({id:course.id,nome:course.name,categoria:course.category,aulas:7})),atividades:[]},conteudos:[],desafiosExtras:[],comunidade:initialPosts});
  appDatabase=normalizeDatabase(local||JSON.parse(JSON.stringify(originalDatabase)));
  state.posts=appDatabase.comunidade;
}
function saveDatabase(){if(!appDatabase)return;appDatabase.comunidade=state.posts;localStorage.setItem("nexo-database",JSON.stringify(appDatabase))}

let state=createInitialState(initialPosts);
function dispatchCoda(name,detail={}){document.dispatchEvent(new CustomEvent(`coda:${name}`,{detail}))}
const analytics=CodaAnalyticsModule.createAnalytics({state,courses:courseBlueprints,loadJSON,completedCount,coursePercent});
const {learningAnalytics,analyticsEmail,registerLearningUser,syncStudentSnapshot,trackLearningEvent,recordQuizResult}=analytics;
const workspaceSync=CodaWorkspaceSyncModule.createWorkspaceSync({state,courses:courseBlueprints,completedCount,saveStudentWorkspaceData, syncStudentSnapshot, showToast});
const {serverWorkspacePayload,hydrateServerWorkspace,queueServerWorkspace}=workspaceSync;
const {courseCard,applyCourseStyles}=CodaCoursesRendererModule.createCoursesRenderer({escapeHtml,coursePercent});
const {metrics:dashboardMetrics,applyProgress:applyDashboardProgress}=CodaDashboardRendererModule.createDashboardRenderer({courses:courseBlueprints,completedCount});
function loadStudentWorkspace(){loadStudentWorkspaceData(state)}
function saveStudentWorkspace(){workspaceSync.saveStudentWorkspace()}
function saveProgress(){saveStudentWorkspace();updateDashboard();renderStudentHub()}
function showToast(message){const toast=$("#toast");toast.textContent=message;toast.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove("show"),2300)}
function courseById(id){return courseBlueprints.find(course=>course.id===id)||courseBlueprints[0]}
function completedCount(courseId){return Object.keys(state.completed).filter(key=>key.startsWith(`${courseId}:`)&&state.completed[key]).length}
function coursePercent(courseId){return Math.round(completedCount(courseId)/7*100)}

const teacherSectionInfo={
  overview:{title:"Visão geral",kicker:"CENTRAL PEDAGÓGICA",description:"Acompanhe os principais números e escolha uma área para começar."},
  classes:{title:"Turmas e avisos",kicker:"GESTÃO DE TURMAS",description:"Crie turmas, compartilhe códigos de matrícula e publique comunicados."},
  students:{title:"Alunos",kicker:"ACOMPANHAMENTO",description:"Consulte rendimento, avaliações e histórico de aprendizagem de cada aluno."},
  diary:{title:"Diário, notas e frequência",kicker:"REGISTRO PEDAGÓGICO",description:"Faça a chamada, lance notas, comentários e rubricas por turma."},
  questions:{title:"Rede social das turmas",kicker:"CODA CONECTA",description:"Modere publicações, fixe conteúdos importantes e marque dúvidas como resolvidas."},
  content:{title:"Aulas e materiais",kicker:"CONTEÚDO PEDAGÓGICO",description:"Atualize aulas, vídeos e referências acadêmicas sem misturar outras ferramentas."},
  challenges:{title:"Desafios",kicker:"PRÁTICA EXTRA",description:"Crie e gerencie atividades complementares para as trilhas."},
  assessments:{title:"Avaliações",kicker:"QUIZZES E SIMULADOS",description:"Monte avaliações, edite perguntas e defina os alunos destinatários."},
  lab3d:{title:"Laboratório 3D",kicker:"PROJETOS INTERATIVOS",description:"Crie ou modifique modelos e códigos MicroPython do laboratório 3D."},
  database:{title:"Banco de dados",kicker:"DADOS DA PLATAFORMA",description:"Exporte, importe ou restaure o banco JSON local da coda."}
};
function showTeacherSection(section="overview"){
  if(state.student?.role!=="Professor")return;
  const safeSection=teacherSectionInfo[section]?section:"overview",info=teacherSectionInfo[safeSection];state.teacherSection=safeSection;
  if(safeSection==="questions"){
    $$(".view").forEach(view=>view.classList.toggle("active",view.id==="comunidade"));
    $$('[data-teacher-section]').forEach(button=>button.classList.toggle("active",button.dataset.teacherSection===safeSection));
    $("#teacherPageTitle").textContent=info.title;renderPosts();window.scrollTo({top:0,behavior:"smooth"});
    dispatchCoda("view",{view:"comunidade",section:safeSection,role:"Professor"});return;
  }
  $("#professor").dataset.activeTeacherSection=safeSection;
  $$(".view").forEach(view=>view.classList.toggle("active",view.id==="professor"));
  $$('[data-teacher-section]').forEach(button=>button.classList.toggle("active",button.dataset.teacherSection===safeSection));
  $$('[data-teacher-panel]').forEach(panel=>panel.hidden=panel.dataset.teacherPanel!==safeSection&&!(safeSection==="questions"&&panel.dataset.teacherPanel==="classes"));
  $$(".teacher-grid,.teacher-academic-grid",$("#professor")).forEach(wrapper=>wrapper.hidden=![...wrapper.querySelectorAll(":scope > [data-teacher-panel]")].some(panel=>!panel.hidden));
  $("#teacherPageTitle").textContent=info.title;$("#teacherWorkspaceTitle").textContent=info.title;$("#teacherWorkspaceKicker").textContent=info.kicker;$("#teacherWorkspaceDescription").textContent=info.description;
  $("#sidebar").classList.remove("is-open");$("#backdrop").classList.remove("is-open");window.scrollTo({top:0,behavior:"smooth"});
  if(safeSection==="students")renderTeacherAnalytics();
  window.CodaPlatform?.showTeacherSection?.(safeSection);
  dispatchCoda("view",{view:"professor",section:safeSection,role:"Professor"});
}
function goToView(view){
  if(state.student?.role==="Admin"){window.CodaAdmin?.showSection?.(view==="administrador"?state.adminSection:"overview");return}
  if(state.student?.role==="Professor"){showTeacherSection(view==="professor"?state.teacherSection:"overview");return}
  if(view==="professor"||view==="administrador"){showToast("Entre com o perfil correto para acessar esta área");return}
  $$(".view").forEach(section=>section.classList.toggle("active",section.id===view));
  $$(".nav button[data-view]").forEach(button=>button.classList.toggle("active",button.dataset.view===view||(view==="curso"&&button.dataset.view==="materias")));
  $("#sidebar").classList.remove("is-open");$("#backdrop").classList.remove("is-open");
  window.scrollTo({top:0,behavior:"smooth"});
  if(view==="materias")renderCourses();if(view==="videos")renderVideos();if(view==="laboratorio")renderLab();if(view==="esp32")renderEsp();if(view==="quiz")renderQuiz();if(view==="meu-espaco")renderStudentHub();if(view==="turmas"||view==="agenda")window.CodaPlatform?.showStudentView?.(view);
  dispatchCoda("view",{view,role:state.student?.role||""});
}

function renderCourses(){
  const term=$("#globalSearch").value.trim().toLowerCase();
  const groups=Object.keys(categoryInfo).filter(category=>state.category==="Todas"||state.category===category).map(category=>{
    const items=courseBlueprints.filter(course=>course.category===category&&`${course.name} ${course.description} ${course.topics.join(" ")}`.toLowerCase().includes(term));
    if(!items.length)return "";
    return `<section class="subject-group" data-group-color="${escapeHtml(categoryInfo[category].color)}"><div class="subject-group-head"><i></i><h2>${escapeHtml(categoryInfo[category].label)}</h2><span>${items.length} ${items.length===1?"matéria":"matérias"}</span></div><div class="course-grid">${items.map(courseCard).join("")}</div></section>`;
  }).join("");
  $("#subjectGroups").innerHTML=groups||`<div class="quiz-shell"><h2>Nenhuma matéria encontrada</h2><p>Tente outra palavra na busca.</p></div>`;
  applyCourseStyles($("#subjectGroups"));
  $$('[data-course]').forEach(button=>button.addEventListener("click",()=>openCourse(button.dataset.course)));
}


function lessonUnlocked(courseId,index){return index===0||Boolean(state.completed[`${courseId}:${index-1}`])}
function openCourse(id,lesson=0){state.currentCourse=id;if(!lessonUnlocked(id,lesson)){lesson=Array.from({length:7},(_,index)=>index).find(index=>!state.completed[`${id}:${index}`])??6;showToast("Conclua a aula anterior para avançar") }state.currentLesson=lesson;trackLearningEvent("aula_aberta",{courseId:id,lesson});renderCourse();goToView("curso")}
function renderCourse(){
  const course=courseById(state.currentCourse),done=completedCount(course.id),progress=coursePercent(course.id);
  $("#courseHero").style.setProperty("--course",course.color);
  $("#courseHero").innerHTML=`<span class="course-symbol">${escapeHtml(course.symbol)}</span><div><span class="kicker">TRILHA • ${escapeHtml(course.category.toUpperCase())}</span><h1>${escapeHtml(course.name)}</h1><p>${escapeHtml(course.description)}</p></div><div class="course-hero-meta"><span>7 aulas</span><span>7 práticas</span><span>${progress}% concluído</span></div>`;
  $("#lessonProgressText").textContent=`${done}/7`;
  $("#lessonList").innerHTML=course.topics.map((topic,index)=>{const complete=state.completed[`${course.id}:${index}`],unlocked=lessonUnlocked(course.id,index);return `<button class="lesson-link ${index===state.currentLesson?"active":""} ${complete?"done":""} ${unlocked?"":"locked"}" data-lesson="${index}" ${unlocked?"":"disabled"}><span>${complete?"✓":unlocked?index+1:"⌁"}</span><div><strong>${escapeHtml(lessonTitle(course,index))}</strong><small>${complete?"Concluída":unlocked?(index===6?"Projeto guiado":"Aula + atividade"):"Conclua a etapa anterior"}</small></div><i>${index===state.currentLesson?"›":""}</i></button>`}).join("");
  $$('[data-lesson]').forEach(button=>button.addEventListener("click",()=>{state.currentLesson=Number(button.dataset.lesson);renderCourse();window.scrollTo({top:0,behavior:"smooth"})}));
  renderLesson();
}
function totalLessons(){return courseBlueprints.reduce((total,course)=>total+course.topics.length,0)}
function lessonOverride(courseId,index){return appDatabase?.conteudos?.find(item=>item.courseId===courseId&&Number(item.lesson)===Number(index))||null}
function lessonTitle(course,index){return lessonOverride(course.id,index)?.title||course.topics[index]}
function lessonCode(course,index){
  const progressive=window.CodaLessonExamples?.[course.id]?.[index];
  if(progressive)return progressive;
  const base=starters[course.id].code;
  const comments={html:"<!-- Aula prática coda -->",css:"/* Aula prática coda */",python:"# Aula prática coda",c:"// Aula prática coda",cplus:"// Aula comparativa C+",cpp:"// Aula prática coda",csharp:"// Aula prática coda",java:"// Aula prática coda",react:"// Aula prática coda",reactnative:"// Aula prática mobile",typescript:"// Aula prática coda",javascript:"// Aula prática coda",esp32:"# Aula prática ESP32",sql:"-- Aula prática SQL"};
  return `${comments[course.id]||"// Prática"}\n${base}`;
}
function lessonText(course,index){
  const topic=course.topics[index];
  return `Nesta aula você vai entender <strong>${escapeHtml(topic.toLowerCase())}</strong> construindo uma parte pequena de um projeto. Observe o exemplo, altere um valor e compare o resultado. O objetivo não é decorar cada comando, mas reconhecer o padrão e saber quando usá-lo.`;
}
const languageExplanations={
  html:{title:"A estrutura das páginas da web",text:"HTML é a linguagem de marcação que organiza o conteúdo de uma página. Títulos, parágrafos, imagens, links, formulários e seções são representados por elementos que dão significado e estrutura ao documento.",use:"Você usa HTML como a base de sites e aplicações web. Um bom documento também melhora a acessibilidade, ajuda mecanismos de busca e facilita o trabalho conjunto com CSS e JavaScript."},
  css:{title:"A aparência e o layout da interface",text:"CSS é a linguagem de estilos da web. Ela controla cores, fontes, espaçamentos, tamanhos, animações e a posição dos elementos definidos no HTML.",use:"Com seletores, propriedades, Flexbox, Grid e media queries, a mesma página pode se adaptar a celulares e computadores sem perder clareza ou identidade visual."},
  javascript:{title:"Interatividade no navegador",text:"JavaScript é uma linguagem de programação usada para reagir às ações do usuário, alterar páginas, validar dados, fazer cálculos e conversar com serviços pela internet.",use:"Ela funciona diretamente no navegador e também pode ser usada no servidor. Variáveis, funções, condições, eventos e arrays formam a base para criar experiências interativas."},
  typescript:{title:"JavaScript com tipos",text:"TypeScript amplia JavaScript com um sistema de tipos. Ele ajuda o editor a encontrar erros antes da execução e torna mais claros os dados esperados por funções, objetos e componentes.",use:"O código TypeScript é convertido para JavaScript antes de chegar ao navegador. É muito usado em projetos grandes, APIs e aplicações React por melhorar manutenção e colaboração."},
  python:{title:"Programação clara e versátil",text:"Python é uma linguagem conhecida pela sintaxe legível. Ela permite aprender lógica com menos símbolos e é usada em automação, ciência de dados, inteligência artificial, web e scripts.",use:"Blocos são definidos por indentação. Variáveis, listas, condições, laços e funções permitem dividir problemas maiores em etapas pequenas, testáveis e reutilizáveis."},
  c:{title:"Fundamentos próximos do computador",text:"C é uma linguagem compilada que oferece controle direto sobre memória e recursos do sistema. Muitos sistemas operacionais, ferramentas e dispositivos embarcados têm componentes escritos em C.",use:"Estudar tipos, ponteiros, funções e estruturas em C ajuda a entender como os dados são armazenados e como programas se comunicam com o hardware."},
  cplus:{title:"Uma ponte didática entre C e C++",text:"Nesta trilha, C+ é usado como etapa comparativa para praticar a evolução de programas escritos em C antes de avançar aos recursos completos de C++.",use:"Você revê funções, estruturas e organização de código, observando quais ideias permanecem e quais abstrações tornam projetos maiores mais fáceis de manter."},
  cpp:{title:"Desempenho com múltiplos estilos",text:"C++ evoluiu a partir de C e adicionou recursos como classes, templates e a biblioteca padrão. É usado quando desempenho, controle e organização precisam caminhar juntos.",use:"Jogos, motores gráficos, sistemas, aplicações de alto desempenho e dispositivos usam C++. A linguagem aceita programação procedural, orientada a objetos e genérica."},
  csharp:{title:"Aplicações no ecossistema .NET",text:"C# é uma linguagem moderna e fortemente tipada criada para a plataforma .NET. Ela oferece classes, interfaces, tratamento de erros e recursos que deixam o código expressivo e seguro.",use:"É usada em APIs, sistemas empresariais, aplicações desktop, serviços em nuvem e jogos com Unity. O compilador ajuda a identificar incompatibilidades antes da execução."},
  java:{title:"Portabilidade e orientação a objetos",text:"Java é uma linguagem compilada para uma máquina virtual, o que permite executar o mesmo programa em diferentes sistemas. Ela valoriza tipos, classes e organização em pacotes.",use:"É comum em sistemas corporativos, serviços de servidor e aplicações Android existentes. Objetos reúnem dados e comportamentos para representar partes de um problema."},
  react:{title:"Interfaces construídas com componentes",text:"React é uma biblioteca JavaScript para criar interfaces por meio de componentes reutilizáveis. Cada componente recebe dados e descreve a parte da tela que deve aparecer.",use:"Estado, propriedades, eventos e hooks permitem atualizar apenas o necessário quando os dados mudam. JSX combina marcação e JavaScript de forma organizada."},
  reactnative:{title:"Aplicativos móveis com React",text:"React Native usa conceitos de React para desenvolver aplicativos para Android e iOS. Em vez de elementos HTML, a interface utiliza componentes nativos como View, Text e Pressable.",use:"Componentes, propriedades, estado e navegação organizam as telas. O projeto pode compartilhar grande parte da lógica entre plataformas e acessar recursos do aparelho."},
  esp32:{title:"Código conectado ao mundo físico",text:"ESP32 é uma placa com microcontrolador, Wi-Fi e Bluetooth. O programa lê sensores, controla LEDs e motores e pode enviar dados para outros dispositivos ou para a internet.",use:"Entradas e saídas usam pinos identificados por GPIO. O ciclo do programa configura o hardware, lê sinais e atualiza as saídas repetidamente, sempre respeitando a tensão e a ligação indicadas no projeto."}
  ,sql:{title:"Consultas para organizar informação",text:"SQL é a linguagem usada para consultar e modificar dados organizados em tabelas. Comandos como SELECT, WHERE e ORDER BY permitem responder perguntas sem percorrer cada registro manualmente.",use:"Bancos relacionais aparecem em sistemas escolares, lojas, hospitais e aplicativos. Nesta trilha, as consultas funcionam em um banco JSON educativo dentro do navegador, sem instalar servidor."}
};
const academicLessonTheory={
  html:["A Web entrega documentos por HTTP, e o navegador interpreta o HTML como uma árvore de objetos chamada DOM. A estrutura correta permite que estilos, scripts e tecnologias assistivas compreendam o conteúdo.","Um documento HTML começa com a declaração do tipo, define idioma, metadados e corpo. Essa organização não é decorativa: ela estabelece como o navegador analisa caracteres, título e conteúdo.","Títulos formam uma hierarquia; listas agrupam itens relacionados; links conectam recursos por endereço. A escolha do elemento deve representar o significado do conteúdo, não apenas sua aparência.","Imagens precisam de texto alternativo conforme sua função. Áudio e vídeo devem oferecer controles e alternativas para que informação visual ou sonora não seja o único caminho de compreensão.","Elementos como header, nav, main, article e footer descrevem regiões do documento. A semântica melhora navegação por teclado, leitores de tela, manutenção e indexação.","Formulários associam label e campo, usam tipos adequados e validam restrições. A validação do navegador ajuda o usuário, mas sistemas reais também validam no servidor.","Um portfólio reúne arquitetura semântica, mídia, navegação e formulário. O projeto deve funcionar sem CSS antes de receber identidade visual e interatividade."],
  css:["A cascata combina origem, importância, especificidade e ordem para decidir qual regra vence. Entender esse algoritmo evita o uso excessivo de !important.","Cores devem manter contraste; tipografia organiza hierarquia; unidades relativas favorecem adaptação. rem, em, porcentagem e viewport respondem de maneiras diferentes ao contexto.","Todo elemento é representado por conteúdo, preenchimento, borda e margem. box-sizing controla como largura e altura incluem essas partes.","Flexbox organiza itens em um eixo principal e outro transversal. É indicado para barras, grupos de botões e alinhamentos em uma dimensão.","Grid modela linhas e colunas ao mesmo tempo. Áreas, frações e minmax permitem layouts que mudam sem depender de posições fixas.","Transições interpolam valores entre estados; animações definem etapas. Movimento deve comunicar mudança e respeitar a preferência por redução de animações.","Uma landing page acadêmica combina grade fluida, tipografia escalável, pontos de quebra e teste em diferentes tamanhos, mantendo conteúdo prioritário acessível."],
  javascript:["Valores têm tipos e variáveis guardam referências. const impede nova atribuição ao nome, mas não torna objetos internos imutáveis.","Condições transformam expressões em decisões. Comparações estritas evitam conversões implícitas que tornam regras difíceis de prever.","Laços descrevem repetição e precisam de condição de término. Métodos de arrays frequentemente expressam transformação com mais clareza que índices manuais.","Funções criam abstrações: recebem parâmetros, produzem retorno e isolam responsabilidades. Escopo define onde nomes podem ser acessados.","Arrays preservam ordem; objetos associam chaves a valores. Escolher a estrutura certa reduz buscas, duplicação e conversões desnecessárias.","Eventos ligam ações do usuário ao programa. O DOM deve ser consultado, validado e atualizado sem apagar acessibilidade ou estado importante.","Uma lista de tarefas integra entrada, modelo de dados, renderização e armazenamento. Separar essas camadas permite testar a lógica sem depender da interface."],
  typescript:["TypeScript verifica tipos antes da execução e depois gera JavaScript. Tipos não substituem testes em tempo de execução para dados recebidos de usuários ou APIs.","Inferência deduz tipos a partir de valores; anotações registram contratos quando a intenção não está clara. Tipos amplos demais reduzem a ajuda do compilador.","type e interface descrevem formatos de objetos. Propriedades opcionais e somente leitura comunicam regras que outros módulos precisam respeitar.","Unions representam alternativas possíveis; narrowing usa verificações para descobrir qual alternativa está presente em cada caminho do programa.","Parâmetros, retorno e callbacks podem ser tipados. Uma assinatura clara funciona como documentação executável entre quem cria e quem usa a função.","Generics preservam relações entre tipos sem recorrer a any. Eles são úteis em coleções, respostas de API e componentes reutilizáveis.","Um catálogo tipado define domínio, valida transformações e trata estados de carregamento, sucesso e erro sem confundir formatos incompatíveis."],
  python:["O interpretador executa instruções e associa nomes a objetos. A indentação delimita blocos, tornando a estrutura do algoritmo visível.","if, elif e else selecionam caminhos. Expressões booleanas devem representar regras simples que possam ser testadas separadamente.","for percorre iteráveis; while repete enquanto uma condição for verdadeira. range gera sequências sem armazenar todos os valores antecipadamente.","Funções reduzem repetição e módulos organizam responsabilidades. Parâmetros e retornos tornam dependências explícitas.","Listas mantêm sequências mutáveis; dicionários indexam valores por chaves. Compreensões são úteis quando continuam legíveis.","Arquivos exigem abertura, leitura ou escrita e fechamento seguro. Exceções tratam falhas esperadas sem esconder erros de programação.","Um organizador de estudos modela tarefas, persiste dados, valida entradas e produz relatórios, reunindo lógica, funções e coleções."],
  c:["O compilador transforma código-fonte em programa executável. Cabeçalhos declaram interfaces e a função main marca o início da execução.","Tipos determinam representação e operações possíveis. Conversões e limites numéricos precisam ser considerados para evitar resultados inesperados.","Condições e laços controlam o fluxo, mas cada caminho deve manter variáveis inicializadas e limites válidos.","Funções recebem argumentos por valor e podem usar cabeçalhos para separar interface de implementação. Essa divisão permite compilar módulos independentes.","Arrays ocupam posições contíguas; strings terminam com caractere nulo. O programa precisa respeitar capacidade e índices válidos.","Ponteiros armazenam endereços e permitem acesso indireto. Inicialização, tempo de vida e liberação de memória fazem parte da correção do programa.","Uma agenda no terminal combina estruturas, arrays, arquivos e funções, com limites explícitos e mensagens de erro verificáveis."],
  cplus:["A revisão de C estabelece tipos, funções e controle de fluxo antes de introduzir abstrações de C++. Comparar versões mostra quais problemas cada recurso resolve.","Arquivos de cabeçalho, implementação e compilação separada reduzem dependências. Uma interface pequena torna alterações locais mais seguras.","Structs agrupam dados relacionados e podem representar entidades do domínio. Invariantes ainda precisam ser protegidas por funções responsáveis.","Ponteiros dão acesso indireto, mas referências e contêineres modernos podem expressar intenção com menos estados inválidos.","Uma classe combina estado e operações, controla visibilidade e mantém regras válidas desde a construção do objeto.","Streams tratam entrada e saída como fluxos tipados. Validar o estado do fluxo evita continuar com dados incompletos.","O cadastro evolutivo permite comparar uma solução procedural com outra orientada a objetos, avaliando clareza, segurança e facilidade de extensão."],
  cpp:["C++ moderno combina controle de recursos com abstrações de alto nível. Namespaces evitam conflitos e a biblioteca padrão reduz implementações manuais.","Referências expressam alias válidos e const registra ausência de modificação. Essas escolhas influenciam cópias, desempenho e segurança da interface.","Classes escondem representação interna e publicam operações. Construtores estabelecem invariantes antes que o objeto seja usado.","Herança modela substituição apenas quando existe relação adequada; composição costuma ser mais simples. Polimorfismo exige destrutores virtuais em bases usadas dinamicamente.","vector gerencia sequência dinâmica; map organiza pares por chave. Algoritmos e iteradores separam operação da estrutura que armazena dados.","RAII vincula o recurso ao tempo de vida do objeto. Smart pointers tornam a propriedade explícita e evitam liberações manuais dispersas.","Um sistema de biblioteca usa entidades, índices, regras de empréstimo e persistência, exercitando modelagem, contêineres e gerenciamento de recursos."],
  csharp:["Um projeto .NET organiza código, referências e configuração. O compilador produz código intermediário executado pelo runtime.","Classes definem comportamento; propriedades controlam leitura e escrita. Construtores devem criar objetos em estado válido.","Coleções genéricas preservam tipos e LINQ descreve consultas por composição de operações, mantendo a fonte separada da transformação.","Interfaces registram capacidades e permitem trocar implementações. Injeção fornece dependências externamente e melhora testes.","Exceções representam falhas que interrompem o fluxo normal. Validação deve impedir dados inválidos antes de operações mais caras.","async e await coordenam operações sem bloquear a thread durante espera. Cancelamento e tratamento de falhas fazem parte do contrato assíncrono.","Uma API de tarefas separa rotas, regras, dados e respostas HTTP, incluindo validação e códigos de estado coerentes."],
  java:["O compilador produz bytecode e a JVM o executa em diferentes sistemas. Pacotes organizam nomes e responsabilidades.","Classes descrevem tipos e objetos guardam estado individual. Métodos devem representar operações coerentes com a entidade.","Encapsulamento protege campos e oferece operações que mantêm regras válidas, em vez de expor alterações sem controle.","Herança permite especialização, enquanto interfaces definem contratos. Composição reduz acoplamento quando não existe relação de substituição.","List, Set e Map atendem necessidades diferentes de ordem, unicidade e busca por chave. Generics preservam o tipo dos elementos.","Exceções e arquivos exigem liberação de recursos; try-with-resources fecha fluxos mesmo quando ocorre falha.","Um sistema escolar modela alunos, turmas, matrículas e notas, aplicando objetos, coleções, validação e persistência."],
  react:["Componentes são funções que descrevem interface a partir de dados. JSX é transformado em chamadas JavaScript e precisa manter estrutura previsível.","Props transportam dados do componente pai; composição combina elementos sem criar dependências rígidas entre implementações.","Estado representa informação que muda e provoca nova renderização. Atualizações devem criar novos valores em vez de alterar estruturas existentes.","Eventos recebem funções, e formulários controlados conectam valor visual ao estado. Validação deve ocorrer perto da regra de negócio.","Listas precisam de chaves estáveis para preservar identidade. Renderização condicional deve representar claramente carregamento, vazio, erro e sucesso.","Efeitos sincronizam o componente com sistemas externos. Dependências corretas e limpeza evitam execuções antigas ou recursos abertos.","Um painel de estudos reúne componentes, estado, efeitos e acessibilidade, mantendo dados separados da apresentação."],
  reactnative:["React Native converte componentes em controles da plataforma móvel. View, Text e Pressable substituem elementos HTML.","O layout usa Flexbox com padrões móveis. Dimensões flexíveis e áreas seguras evitam interfaces cortadas em aparelhos diferentes.","Navegação organiza telas e parâmetros. Cada tela deve declarar os dados que recebe e tratar rotas inexistentes.","Estado e formulários seguem ideias do React, mas teclado, toque e feedback precisam considerar o contexto móvel.","FlatList renderiza apenas itens necessários e exige chaves estáveis. Otimização deve ser medida antes de adicionar complexidade.","APIs podem falhar ou ficar lentas; armazenamento local precisa de esquema, migração e cuidado com dados sensíveis.","Um aplicativo de hábitos combina navegação, formulários, lista, persistência e estados offline, com interface acessível ao toque."],
  esp32:["O ESP32 combina processador, memória, periféricos e rádio. Cada pino possui funções e restrições que devem ser conferidas na documentação da placa.","Uma saída digital alterna entre níveis lógicos. LED externo precisa de resistor e GPIO do ESP32 trabalha em 3,3 V.","Entrada digital lê estados; pull-up ou pull-down evita sinal flutuante. Botões também podem exigir tratamento de oscilações mecânicas.","PWM varia o ciclo de trabalho de pulsos para controlar potência média, brilho ou posição, sem produzir tensão analógica contínua.","ADC converte tensão em número. Resolução, atenuação, ruído e referência influenciam a interpretação do sensor.","A conexão Wi-Fi possui estados, tempo de espera e falhas. Um servidor local deve informar endereço e continuar responsivo.","Uma estação conectada integra sensores, filtragem, rede e painel, separando aquisição, processamento e comunicação."],
  sql:["Um banco relacional organiza entidades em tabelas e liga registros por chaves. O modelo deve reduzir duplicação sem dificultar consultas essenciais.","SELECT escolhe colunas e FROM identifica a origem. Projetar apenas os campos necessários diminui transferência e torna intenção explícita.","WHERE filtra linhas por predicados. Valores nulos exigem IS NULL, pois não se comportam como igualdade comum.","ORDER BY define ordenação e LIMIT reduz o resultado. Sem ordem explícita, o banco não garante sequência estável.","INSERT adiciona linhas respeitando tipos, chaves e restrições. Transações impedem que uma operação composta fique parcialmente aplicada.","UPDATE e DELETE precisam de condição cuidadosamente revisada. Uma consulta SELECT equivalente deve ser conferida antes da alteração.","Um banco escolar modela alunos, disciplinas e matrículas, usando chaves, restrições e consultas para produzir relatórios consistentes."]
};
const academicResources={
  html:[{type:"Curso aberto",title:"Aprendendo desenvolvimento web — HTML",author:"MDN Web Docs",url:"https://developer.mozilla.org/pt-BR/docs/Learn_web_development",note:"Leia a parte de estruturação de conteúdo e compare os exemplos com a semântica usada na aula."},{type:"Especificação",title:"HTML Living Standard",author:"WHATWG",url:"https://html.spec.whatwg.org/",note:"Use como referência acadêmica para conferir o significado e o comportamento oficial dos elementos."}],
  css:[{type:"Curso aberto",title:"Aprendendo desenvolvimento web — CSS",author:"MDN Web Docs",url:"https://developer.mozilla.org/pt-BR/docs/Learn_web_development",note:"Revise cascata, box model, Flexbox e Grid conforme o tema da aula."},{type:"Artigo técnico",title:"CSS Snapshot",author:"W3C",url:"https://www.w3.org/TR/CSS/",note:"Consulte o panorama das especificações que formam o CSS moderno."}],
  javascript:[{type:"Livro aberto",title:"Eloquent JavaScript",author:"Marijn Haverbeke",url:"https://eloquentjavascript.net/",note:"Leia o capítulo relacionado ao tema e refaça um exemplo sem copiar a solução."},{type:"Curso aberto",title:"Guia JavaScript",author:"MDN Web Docs",url:"https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide",note:"Use como consulta para sintaxe, objetos, funções e controle de fluxo."}],
  typescript:[{type:"Livro digital",title:"TypeScript Handbook",author:"Microsoft",url:"https://www.typescriptlang.org/pt/docs/handbook/",note:"Leia a seção correspondente e teste os tipos no Playground oficial."},{type:"Documentação",title:"TypeScript para novos programadores",author:"Microsoft",url:"https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html",note:"Relacione tipos estáticos ao comportamento JavaScript executado no navegador."}],
  python:[{type:"Curso universitário",title:"Introduction to CS and Programming Using Python",author:"MIT OpenCourseWare",url:"https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/",note:"Use notas e exercícios como estudo complementar; tente resolver antes de consultar exemplos."},{type:"Documentação",title:"Tutorial oficial do Python",author:"Python Software Foundation",url:"https://docs.python.org/pt-br/3/tutorial/",note:"Consulte a seção da aula e execute os exemplos no laboratório."}],
  c:[{type:"Livro aberto",title:"Beej's Guide to C Programming",author:"Brian Hall",url:"https://beej.us/guide/bgc/",note:"Leia tipos, funções, arrays e ponteiros na ordem do curso."},{type:"Curso universitário",title:"CS50 — C",author:"Harvard University",url:"https://cs50.harvard.edu/x/notes/1/",note:"Compare a organização dos exemplos com o programa desenvolvido na aula."}],
  cplus:[{type:"Livro aberto",title:"Beej's Guide to C Programming",author:"Brian Hall",url:"https://beej.us/guide/bgc/",note:"Use como base C antes de comparar as abstrações modernas."},{type:"Curso universitário",title:"Standard C++ Programming",author:"Stanford University",url:"https://web.stanford.edu/class/archive/cs/cs106l/cs106l.1256/",note:"Observe como structs, classes, streams e referências evoluem a solução."}],
  cpp:[{type:"Curso universitário",title:"CS106L — Standard C++ Programming",author:"Stanford University",url:"https://web.stanford.edu/class/archive/cs/cs106l/cs106l.1256/",note:"Consulte slides e course reader referentes ao tópico da aula."},{type:"PDF",title:"CS106L Lecture PDFs",author:"Stanford University",url:"https://web.stanford.edu/class/cs106l/lectures/",note:"Escolha o PDF de tipos, classes, contêineres ou RAII conforme a aula atual."}],
  csharp:[{type:"Documentação",title:"Guia do C# e .NET",author:"Microsoft Learn",url:"https://learn.microsoft.com/pt-br/dotnet/csharp/",note:"Siga a trilha de fundamentos e consulte a especificação quando houver dúvida de comportamento."},{type:"Curso aberto",title:"Tour of C#",author:"Microsoft Learn",url:"https://learn.microsoft.com/pt-br/dotnet/csharp/tour-of-csharp/",note:"Execute os exemplos e registre diferenças entre classes, coleções e tarefas assíncronas."}],
  java:[{type:"Curso aberto",title:"Learn Java",author:"Oracle / Dev.java",url:"https://dev.java/learn/",note:"Leia classes, herança, coleções e exceções de acordo com a aula."},{type:"Documentação",title:"Java Language Basics",author:"Oracle",url:"https://docs.oracle.com/javase/tutorial/java/nutsandbolts/",note:"Use como referência de sintaxe e controle de fluxo."}],
  react:[{type:"Livro digital",title:"React — Learn",author:"React Team",url:"https://react.dev/learn",note:"Leia o capítulo ligado à aula e reproduza o exemplo com dados diferentes."},{type:"Artigo técnico",title:"Thinking in React",author:"React Team",url:"https://react.dev/learn/thinking-in-react",note:"Aplique o processo de dividir a interface em componentes e definir a fonte do estado."}],
  reactnative:[{type:"Documentação",title:"React Native — Introduction",author:"React Native Team",url:"https://reactnative.dev/docs/getting-started",note:"Relacione os componentes nativos ao conceito React estudado na aula."},{type:"Artigo técnico",title:"Core Components and Native Components",author:"React Native Team",url:"https://reactnative.dev/docs/intro-react-native-components",note:"Compare View, Text e controles móveis com elementos da Web."}],
  esp32:[{type:"Documentação",title:"ESP-IDF Programming Guide",author:"Espressif Systems",url:"https://docs.espressif.com/projects/esp-idf/en/stable/esp32/",note:"Confira pinagem, periféricos e limites antes de montar o circuito físico."},{type:"PDF",title:"MicroPython Documentation",author:"MicroPython Project",url:"https://docs.micropython.org/en/latest/micropython-docs.pdf",note:"Pesquise Pin, ADC, PWM e network conforme o projeto da aula."}],
  sql:[{type:"Livro aberto",title:"Database Design — 2nd Edition",author:"BC Open Textbook Project",url:"https://opentextbc.ca/dbdesign01/",note:"Leia modelagem, chaves e normalização antes de escrever consultas maiores."},{type:"Documentação",title:"PostgreSQL Tutorial",author:"PostgreSQL Global Development Group",url:"https://www.postgresql.org/docs/current/tutorial.html",note:"Compare o SQL educativo do laboratório com um banco relacional completo."}]
};
function resourcesForLesson(courseId,lesson){const custom=(appDatabase?.recursos||[]).filter(item=>item.courseId===courseId&&(Number(item.lesson)===-1||Number(item.lesson)===Number(lesson)));return [...(academicResources[courseId]||[]),...custom]}
const lessonSystemExamples={
  html:["portal de notícias com cabeçalho, conteúdo e rodapé","documento inicial de um sistema escolar","central de ajuda com títulos, listas e links","catálogo de produtos com imagens e descrições acessíveis","portal acadêmico organizado por áreas semânticas","formulário de matrícula com campos obrigatórios","portfólio profissional reunindo projetos e contatos"],
  css:["folha de estilos compartilhada por um portal","aplicativo de leitura com tipografia confortável","cartões de produtos com espaçamento consistente","painel de estudos alinhado com Flexbox","dashboard administrativo responsivo com Grid","botões com feedback visual e transições","landing page que se adapta ao celular"],
  javascript:["carrinho de compras que atualiza valores","controle de acesso que verifica condições","lista paginada processada por repetição","calculadora organizada em funções","estoque representado por arrays e objetos","cadastro que reage a eventos do formulário","gerenciador de tarefas com criação e conclusão"],
  typescript:["contrato de dados de uma API escolar","cadastro bancário com tipos definidos","perfil de usuário descrito por interface","painel que trata estados diferentes com unions","serviço de cálculo com funções tipadas","biblioteca reutilizável com generics","catálogo de cursos validado por tipos"],
  python:["script que gera um plano de estudos","sistema de acesso baseado em regras","processador de registros com laços","gerador de relatórios dividido em funções","diário de notas usando listas e dicionários","importador de arquivos com tratamento de erros","organizador de estudos executado no terminal"],
  c:["utilitário compilado para o terminal","firmware que trabalha com tipos numéricos","controlador que repete leituras de sensores","biblioteca dividida em funções e cabeçalhos","buffer de mensagens armazenado em arrays","programa que gerencia endereços de memória","agenda de contatos para linha de comando"],
  cplus:["programa legado analisado antes da modernização","módulos separados para reduzir repetição","cadastro estruturado com registros","rotina que acessa dados por ponteiros","modelo que evolui de struct para classe","console comparando estilos de entrada e saída","cadastro evolutivo preparado para C++"],
  cpp:["motor de jogo organizado com namespaces","simulador que evita cópias usando referências","sistema de biblioteca modelado com classes","aplicação de pagamentos com polimorfismo","estoque rápido usando vector e map","driver que libera recursos automaticamente","sistema completo de empréstimos de livros"],
  csharp:["aplicação de console criada com .NET","CRM organizado em classes e propriedades","relatório que consulta coleções com LINQ","serviço de pagamento definido por interfaces","cadastro com validação e tratamento de exceções","cliente de API que usa async e await","API de tarefas com operações de cadastro"],
  java:["programa escolar executado pela JVM","cadastro de usuários com classes e objetos","conta protegida por encapsulamento","sistema de avisos usando interfaces","catálogo mantido em Collections","importador de arquivos com exceções","sistema escolar com alunos, turmas e notas"],
  react:["perfil de aluno dividido em componentes","cartão de curso configurado por props","contador de progresso controlado por estado","formulário de login reagindo a eventos","lista de matérias renderizada por dados","painel que carrega informações de uma API","dashboard completo de estudos por componentes"],
  reactnative:["tela inicial usando View e Text","aplicativo adaptado com Flexbox mobile","fluxo de login e conteúdo por navegação","formulário de cadastro com estado","feed de aulas eficiente com FlatList","aplicativo que salva dados no aparelho","controle de hábitos para Android e iOS"],
  esp32:["painel que identifica pinos e funções da placa","indicador luminoso controlado por saída digital","botão físico usado como entrada do sistema","controle de brilho de LED usando PWM","estação que lê temperatura e umidade","servidor web local conectado por Wi-Fi","estação conectada com sensor e painel web"],
  sql:["cadastro escolar separado em tabelas","relatório que seleciona apenas colunas necessárias","lista de alunos filtrada por situação","ranking de notas ordenado e limitado","matrícula adicionada com INSERT","cadastro atualizado com regra de segurança","banco escolar consultado por diferentes relatórios"]
};
function lessonContextData(course,index){
  const override=lessonOverride(course.id,index),topic=lessonTitle(course,index),system=override?.system||lessonSystemExamples[course.id][index];
  const stages=[
    "Esta aula apresenta a base necessária para compreender como a tecnologia participa de um projeto maior.",
    "Agora você transforma o conceito inicial em uma regra que o computador consegue interpretar.",
    "Nesta etapa, vários dados ou elementos começam a trabalhar em conjunto dentro do programa.",
    "O foco passa a ser organização: separar responsabilidades evita repetição e facilita testes.",
    "Você combina os conceitos anteriores para representar dados de uma situação real.",
    "A aula aproxima o código do uso cotidiano, incluindo interação, comunicação ou tratamento de falhas.",
    "O projeto final reúne toda a trilha em uma entrega que pode entrar no seu portfólio."
  ];
  return {system,context:override?.context||`${stages[index]} Em ${course.name}, o tema “${topic}” ajuda a construir um ${system}.`,requests:[`Localizar no exemplo onde “${topic}” aparece.`,`Modificar uma parte do sistema e prever o novo resultado.`,`Executar o código no laboratório e explicar o que mudou.`]};
}
function lessonDeepDiveData(course,index){
  const override=lessonOverride(course.id,index),topic=lessonTitle(course,index),system=override?.system||lessonSystemExamples[course.id][index];
  const progression=[
    "Comece identificando o vocabulário principal e a função de cada parte. Antes de escrever, descreva com suas palavras qual entrada será recebida e qual resultado deverá aparecer.",
    "Observe a regra de sintaxe usada para representar o conceito. Compare um exemplo válido com outro incompleto e procure a diferença que altera o comportamento.",
    "Acompanhe os dados durante a execução. Anote o valor inicial, o que cada etapa modifica e qual valor chega ao resultado final.",
    "Divida a solução em responsabilidades pequenas. Uma parte recebe dados, outra processa e a última apresenta o resultado, facilitando teste e manutenção.",
    "Modele uma situação real com nomes claros e estruturas adequadas. O formato escolhido deve tornar o sistema fácil de entender e ampliar.",
    "Teste também situações inesperadas: campo vazio, valor incorreto, conexão ausente ou resposta atrasada. Um sistema confiável explica o erro e permite tentar novamente.",
    "Planeje o projeto em etapas, implemente a menor versão funcional e evolua com testes. Ao final, registre as escolhas técnicas e o que você melhoraria."
  ];
  const commonByArea={Web:["usar elementos apenas pela aparência e esquecer o significado","sobrescrever estilos sem entender a cascata","alterar o DOM sem validar os dados","ignorar os tipos que o editor informa"],Sistemas:["executar sem prever os valores intermediários","misturar muitas responsabilidades na mesma função","acessar dados sem conferir limites ou tipos","alterar registros sem usar um filtro seguro"],Aplicações:["colocar toda a lógica em um único componente","modificar estado diretamente em vez de criar uma atualização","não tratar carregamento, vazio e erro","acoplar a interface aos detalhes dos dados"],Hardware:["mudar fios com o circuito energizado","usar um GPIO inadequado para o componente","ignorar que os pinos trabalham em 3,3 V","testar tudo de uma vez sem isolar cada sinal"]};
  const errors=commonByArea[course.category]||commonByArea.Sistemas;
  const theory=academicLessonTheory[course.id]?.[index];return {explanation:override?.explanation||`${theory||progression[index]} ${progression[index]} O exemplo será um ${system}; por isso, cada parte precisa ter uma responsabilidade que você consiga explicar e testar.`,commonError:override?.commonError||`Erro comum: ${errors[index%errors.length]}. Para evitar isso, execute uma mudança por vez, observe a saída e compare com o resultado esperado.`,checkpoint:`Ao terminar, você deve conseguir explicar “${topic}”, localizar esse conceito no código e adaptar o exemplo para outro sistema sem copiar a solução inteira.`};
}
function enhancedLessonData(course,index){
  const topic=lessonTitle(course,index),previous=index?lessonTitle(course,index-1):null,system=lessonSystemExamples[course.id][index];
  const actionSets=[
    ["identificar as partes essenciais","explicar o fluxo com suas palavras","executar o exemplo inicial"],
    ["comparar uma solução válida com outra incompleta","aplicar a sintaxe em uma nova situação","justificar cada escolha"],
    ["acompanhar os dados durante a execução","organizar diferentes casos de entrada","confirmar o resultado com testes"],
    ["separar responsabilidades","criar uma parte reutilizável","avaliar clareza e manutenção"],
    ["modelar dados de um cenário real","escolher estruturas adequadas","validar estados importantes"],
    ["tratar falhas e entradas inesperadas","comunicar erros de forma útil","testar caminhos alternativos"],
    ["planejar uma versão mínima funcional","integrar os conceitos da trilha","apresentar e avaliar o projeto"]
  ];
  const actions=actionSets[index];
  const objectives=[`Definir “${topic}” e ${actions[0]}.`,`Aplicar “${topic}” em um ${system} e ${actions[1]}.`,`Produzir uma evidência de funcionamento ao ${actions[2]}.`];
  const prerequisites=previous?[`Compreender a aula anterior: ${previous}.`,`Saber abrir, alterar e executar o código-base de ${course.name}.`]:[`Reconhecer o problema que ${course.name} resolve.`,`Saber usar o editor e observar a saída do laboratório.`];
  const mastery=[`Explica “${topic}” sem depender do exemplo pronto.`,`Modifica o ${system} e prevê o efeito antes de executar.`,`Testa um caso comum e um caso inesperado, registrando a evidência.`];
  const practice=[`Execute o modelo e registre a saída inicial.`,`Localize a parte responsável por “${topic}” e descreva sua função.`,`Altere um dado do ${system}, preveja o resultado e execute.`,`Crie um segundo caso de teste e compare as saídas.`];
  const extension=`Amplie o ${system} com uma regra adicional relacionada a “${topic}”. Documente a decisão, o teste realizado e uma limitação que ainda permaneceria em um produto real.`;
  const formative={question:`Qual evidência demonstra melhor que você dominou “${topic}” nesta aula?`,options:[`Explicar a ideia, adaptar o ${system} e apresentar testes.`,`Copiar o código sem alterar o comportamento.`,`Ler o título e memorizar somente a sintaxe.`,`Executar uma vez sem observar a saída.`],answer:0,explanation:`Domínio exige compreensão, aplicação e evidência. Ao adaptar o ${system} e testar resultados, você demonstra mais do que memorização.`};
  return {objectives,prerequisites,mastery,practice,extension,formative};
}
function extractYouTubeId(value){const text=String(value||"").trim();const match=text.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/i);return match?.[1]||(/^[\w-]{11}$/.test(text)?text:null)}
function videoOverride(courseId,index){return appDatabase?.videos?.find(item=>item.courseId===courseId&&Number(item.lesson)===Number(index))||null}
function conciseVideoText(value,limit=185){const text=String(value||"").replace(/\s+/g," ").trim();return text.length>limit?`${text.slice(0,limit).replace(/\s+\S*$/,"")}…`:text}
function microVideoSlides(course,index){const topic=lessonTitle(course,index),theory=academicLessonTheory[course.id]?.[index]||lessonText(course,index),deep=lessonDeepDiveData(course,index),context=lessonContextData(course,index);return [
  {eyebrow:`${course.name} • AULA ${index+1}`,title:topic,text:`Nesta microaula você vai compreender ${topic.toLowerCase()} e reconhecer esse conceito em um projeto real.`},
  {eyebrow:"IDEIA CENTRAL",title:"Entenda o conceito",text:conciseVideoText(theory)},
  {eyebrow:"NO PROJETO",title:context.system,text:conciseVideoText(context.context)},
  {eyebrow:"PRATIQUE",title:"Produza uma evidência",text:conciseVideoText(deep.checkpoint)}
]}
function lessonVideoData(course,index,mode="short"){
  const override=videoOverride(course.id,index),id=extractYouTubeId(override?.url)||defaultVideoId(course),url=override?.url||`https://www.youtube.com/watch?v=${id}`,slides=microVideoSlides(course,index),transcript=slides.map((slide,slideIndex)=>`${slideIndex+1}. ${slide.title}. ${slide.text}`).join(" ");
  if(mode==="full"||override)return {kind:"youtube",id,url,title:`${course.name} — ${lessonTitle(course,index)}`,duration:20,minutes:20,start:0,end:null,label:override?"VÍDEO DO PROFESSOR":"CURSO COMPLETO",note:override?.note||`Observe como “${lessonTitle(course,index)}” aparece no curso completo e compare com o exemplo da aula.`,transcript};
  return {kind:"micro",id:`${course.id}-${index+1}`,courseId:course.id,lessonIndex:index,url,title:`${course.name} — ${lessonTitle(course,index)}`,duration:1,minutes:1,durationSeconds:60,label:"MICROAULA EXCLUSIVA",note:`Assista à explicação curta de “${lessonTitle(course,index)}”, acompanhe a legenda e depois faça a atividade.`,slides,transcript};
}
function youtubeEmbedUrl(video){const query=new URLSearchParams({rel:"0",modestbranding:"1"});if(video.start)query.set("start",String(video.start));if(video.end)query.set("end",String(video.end));return `https://www.youtube-nocookie.com/embed/${video.id}?${query}`}
function microVideoMarkup(video){const first=video.slides[0];return `<div class="micro-video" data-micro-video data-course="${video.courseId}" data-lesson="${video.lessonIndex}" role="region" aria-label="Microaula: ${escapeHtml(video.title)}"><div class="micro-video-stage"><span class="micro-video-symbol">&lt;/&gt;</span><div class="micro-video-copy"><small data-micro-eyebrow>${escapeHtml(first.eyebrow)}</small><h4 data-micro-title>${escapeHtml(first.title)}</h4><p data-micro-caption aria-live="polite">${escapeHtml(first.text)}</p></div><span class="micro-video-count" data-micro-count>1/${video.slides.length}</span></div><div class="micro-video-controls"><button type="button" data-micro-toggle aria-label="Reproduzir microaula">▶ Reproduzir</button><div class="micro-video-track"><i data-micro-progress></i></div><time data-micro-time>00:00 / 01:00</time><button type="button" data-micro-speak>🔊 Ouvir</button></div><details class="video-transcript"><summary>Transcrição e legenda completa</summary><p>${escapeHtml(video.transcript)}</p></details></div>`}
let activeMicroVideoTimer=null;
function activateMicroVideos(root=document){$$('[data-micro-video]',root).forEach(player=>{const video=lessonVideoData(courseById(player.dataset.course),Number(player.dataset.lesson),"short"),toggle=$("[data-micro-toggle]",player),speak=$("[data-micro-speak]",player);let elapsed=0,running=false;const time=value=>`${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`;const paint=()=>{const slideIndex=Math.min(video.slides.length-1,Math.floor(elapsed/(video.durationSeconds/video.slides.length))),slide=video.slides[slideIndex];$("[data-micro-eyebrow]",player).textContent=slide.eyebrow;$("[data-micro-title]",player).textContent=slide.title;$("[data-micro-caption]",player).textContent=slide.text;$("[data-micro-count]",player).textContent=`${slideIndex+1}/${video.slides.length}`;$("[data-micro-progress]",player).style.width=`${elapsed/video.durationSeconds*100}%`;$("[data-micro-time]",player).textContent=`${time(elapsed)} / ${time(video.durationSeconds)}`};const stop=()=>{running=false;clearInterval(activeMicroVideoTimer);toggle.textContent=elapsed>=video.durationSeconds?"↻ Rever":"▶ Continuar";toggle.setAttribute("aria-label",elapsed>=video.durationSeconds?"Rever microaula":"Continuar microaula")};toggle.onclick=()=>{if(running){stop();return}if(elapsed>=video.durationSeconds)elapsed=0;clearInterval(activeMicroVideoTimer);running=true;toggle.textContent="Ⅱ Pausar";activeMicroVideoTimer=setInterval(()=>{elapsed++;paint();if(elapsed>=video.durationSeconds)stop()},1000)};speak.onclick=()=>{if(!("speechSynthesis" in window)){showToast("Leitura por voz indisponível");return}speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(video.transcript);utterance.lang="pt-BR";utterance.rate=.95;speechSynthesis.speak(utterance);showToast("Transcrição sendo lida")};paint()})}
function renderLesson(){
  const course=courseById(state.currentCourse),index=state.currentLesson,topic=lessonTitle(course,index),code=lessonCode(course,index),key=`${course.id}:${index}`,complete=!!state.completed[key],requirementsReady=Boolean(state.activities[key]&&state.lessonChecks[key]),explanation=languageExplanations[course.id],video=lessonVideoData(course,index),context=lessonContextData(course,index),deep=lessonDeepDiveData(course,index),enhanced=enhancedLessonData(course,index),resources=resourcesForLesson(course.id,index);
  $("#lessonReader").style.setProperty("--course",course.color);
  $("#lessonReader").innerHTML=`
    <div class="lesson-topline"><span class="lesson-breadcrumb">${escapeHtml(course.name.toUpperCase())} / AULA ${String(index+1).padStart(2,"0")}</span><div class="lesson-tools"><button id="bookmarkLesson" class="${state.bookmarks[key]?"saved":""}">${state.bookmarks[key]?"★ Salva":"☆ Salvar aula"}</button><button id="focusLesson">${document.body.classList.contains("lesson-focus")?"Sair do foco":"Modo foco"}</button></div></div>
    <h2>${escapeHtml(topic)}</h2>
    <p class="lesson-lead">${lessonText(course,index)}</p>
    <div class="lesson-goals">
      <div><small>OBJETIVOS</small><strong>3 resultados verificáveis</strong></div>
      <div><small>TEMPO ESTIMADO</small><strong>${28+index*3} minutos</strong></div>
      <div><small>FORMATO</small><strong>Teoria + prática + verificação</strong></div>
    </div>
    <section class="lesson-roadmap"><div><span>ANTES</span><h3>Pré-requisitos</h3>${enhanced.prerequisites.map(item=>`<p>✓ ${escapeHtml(item)}</p>`).join("")}</div><div><span>AO FINAL</span><h3>Objetivos de aprendizagem</h3>${enhanced.objectives.map((item,itemIndex)=>`<p><b>${itemIndex+1}</b>${escapeHtml(item)}</p>`).join("")}</div></section>
    <section class="language-explainer">
      <span class="explainer-kicker">SOBRE ${escapeHtml(course.name.toUpperCase())}</span>
      <h3>${escapeHtml(explanation.title)}</h3>
      <p>${escapeHtml(explanation.text)}</p>
      <p>${escapeHtml(explanation.use)}</p>
      <div class="lesson-context"><b>Contexto da aula:</b> ${escapeHtml(context.context)}</div>
    </section>
    <section class="lesson-deep-dive"><div><span>01</span><div><small>COMO FUNCIONA</small><h3>Entenda o conceito por dentro</h3><p>${escapeHtml(deep.explanation)}</p></div></div><div><span>02</span><div><small>ATENÇÃO</small><h3>Erro comum e como corrigir</h3><p>${escapeHtml(deep.commonError)}</p></div></div><div><span>03</span><div><small>CHECKPOINT</small><h3>O que você precisa dominar</h3><p>${escapeHtml(deep.checkpoint)}</p></div></div></section>
    <section class="system-example-card">
      <div class="system-example-title"><span>▦</span><div><small>EXEMPLO DE SISTEMA</small><h3>${escapeHtml(context.system)}</h3></div></div>
      <p>Use este sistema como referência durante a aula. Ele mostra onde o conteúdo aparece fora de um exercício isolado e ajuda você a tomar decisões parecidas com as de um projeto real.</p>
      <div class="lesson-request"><strong>O que esta aula pede</strong>${context.requests.map((item,itemIndex)=>`<span><b>${itemIndex+1}</b>${escapeHtml(item)}</span>`).join("")}</div>
    </section>
    <h3>1. Entenda a ideia</h3>
    <p>Todo recurso técnico resolve um problema. Primeiro identifique a entrada, depois a transformação e, por fim, o resultado esperado. Em ${escapeHtml(course.name)}, isso aparece no modo como você organiza e executa o código.</p>
    <section class="lesson-video-embed">
      <div class="lesson-video-heading"><span>▶</span><div><small>VIDEOAULA DE APOIO</small><strong>${escapeHtml(video.title)}</strong><p>Assista, anote uma ideia importante e retorne ao exemplo prático.</p></div></div>
      <div class="video-study-note"><b>Antes de assistir:</b> ${escapeHtml(video.note)}</div>
      <div class="video-frame-wrap">${video.kind==="micro"?microVideoMarkup(video):`<iframe class="lesson-video-frame" loading="lazy" src="${youtubeEmbedUrl(video)}" title="${escapeHtml(video.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`}</div>
      <div class="video-duration"><span>${escapeHtml(video.label)} • ${video.minutes} minuto(s) • com legenda</span><a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">Alternativa: curso completo ↗</a></div>
    </section>
    <section class="academic-resources"><div class="academic-resource-head"><div><span class="explainer-kicker">BIBLIOGRAFIA E LEITURA COMPLEMENTAR</span><h3>Materiais acadêmicos desta aula</h3><p>Referências públicas, abertas ou oficiais. Leia a orientação e registre uma ideia com suas palavras.</p></div><span>${resources.length} referências</span></div><div class="academic-resource-grid">${resources.map((item,itemIndex)=>`<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" data-resource-link="${itemIndex}"><span>${escapeHtml(item.type)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.author)}</small><p>${escapeHtml(item.note)}</p><b>Abrir material ↗</b></a>`).join("")}</div></section>
    <div class="code-example"><header><span>${starters[course.id].file}</span><button id="copyCode">COPIAR CÓDIGO</button></header><pre><code>${escapeHtml(code)}</code></pre></div>
    <h3>2. Faça uma pequena mudança</h3>
    <p>Leia o exemplo linha a linha. Troque textos, números ou nomes e tente prever o que acontece antes de executar. Essa comparação transforma leitura passiva em aprendizado ativo.</p>
    <div class="activity-card"><span class="activity-tag">◇ ATIVIDADE NO MEIO DA AULA</span><h3>Desafio ${index+1}: modifique e teste</h3><p>${escapeHtml(activityInstruction(course,index))}</p><div class="activity-steps"><span><b>1</b>Abra o modelo no laboratório.</span><span><b>2</b>Faça a alteração pedida no desafio.</span><span><b>3</b>Execute e use “Verificar atividade”.</span></div><button class="primary" id="openActivity">Abrir atividade no laboratório →</button></div>
    <section class="guided-practice"><div class="guided-practice-head"><span>▣</span><div><small>PRÁTICA GUIADA</small><h3>Da observação à evidência</h3></div></div><div>${enhanced.practice.map((item,itemIndex)=>`<article><b>${itemIndex+1}</b><p>${escapeHtml(item)}</p></article>`).join("")}</div></section>
    <section class="formative-check ${state.lessonChecks[key]?"mastered":""}"><span class="explainer-kicker">EXERCÍCIO FINAL COM CORREÇÃO AUTOMÁTICA</span><h3>${escapeHtml(enhanced.formative.question)}</h3><div id="formativeOptions">${enhanced.formative.options.map((option,optionIndex)=>`<label><input type="radio" name="formative-${course.id}-${index}" value="${optionIndex}" ${state.lessonChecks[key]&&optionIndex===enhanced.formative.answer?"checked":""}><span>${escapeHtml(option)}</span></label>`).join("")}</div><button id="checkFormative">${state.lessonChecks[key]?"✓ Exercício dominado":"Corrigir exercício"}</button><p id="formativeFeedback" ${state.lessonChecks[key]?"class=\"correct\"":"hidden"}>${state.lessonChecks[key]?`✓ Correto. ${escapeHtml(enhanced.formative.explanation)}`:""}</p></section>
    <section class="mastery-rubric"><div><span class="kicker">CRITÉRIOS DE DOMÍNIO</span><h3>Antes de avançar, confirme:</h3>${enhanced.mastery.map(item=>`<p>□ ${escapeHtml(item)}</p>`).join("")}</div><div><span class="kicker">DESAFIO DE EXTENSÃO</span><h3>Vá além do modelo</h3><p>${escapeHtml(enhanced.extension)}</p></div></section>
    <h3>3. Revise com suas palavras</h3>
    <p>Explique o conceito em uma frase e registre um exemplo de uso. Se algo não funcionar, compare a mensagem do console com a linha alterada e teste uma hipótese por vez.</p>
    <section class="lesson-notes"><div><span>✎</span><div><small>MINHAS ANOTAÇÕES</small><strong>Registre o que você entendeu</strong></div><em id="notesStatus">Salvo neste navegador</em></div><textarea id="lessonNotes" rows="5" maxlength="2000" placeholder="Escreva um resumo, uma dúvida ou um exemplo com suas palavras...">${escapeHtml(state.notes[key]||"")}</textarea></section>
    <section class="lesson-unlock-status ${requirementsReady||complete?"ready":""}"><strong>${requirementsReady||complete?"✓ Etapa pronta para conclusão":"Conclua os dois requisitos para avançar"}</strong><span class="${state.activities[key]?"done":""}">${state.activities[key]?"✓":"○"} Atividade prática</span><span class="${state.lessonChecks[key]?"done":""}">${state.lessonChecks[key]?"✓":"○"} Exercício final</span></section>
    <div class="lesson-nav"><button id="previousLesson" ${index===0?"disabled":""}>← Aula anterior</button><button class="complete" id="completeLesson" ${!complete&&!requirementsReady?"disabled":""}>${complete?"✓ Aula concluída":requirementsReady?"Concluir e liberar próxima":"Complete os requisitos"}</button><button id="nextLesson" ${index===6||!complete?"disabled":""}>Próxima aula →</button></div>`;
  activateMicroVideos($("#lessonReader"));
  $("#copyCode").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(code);showToast("Código copiado") }catch{showToast("Selecione o código para copiar")}});
  $("#openActivity").addEventListener("click",()=>openActivity(course,index,code));
  $("#checkFormative").addEventListener("click",()=>{const selected=$(`input[name="formative-${course.id}-${index}"]:checked`),feedback=$("#formativeFeedback");if(!selected){showToast("Escolha uma alternativa antes de verificar");return}const correct=Number(selected.value)===enhanced.formative.answer;feedback.hidden=false;feedback.className=correct?"correct":"incorrect";feedback.textContent=`${correct?"✓ Resposta correta.":"△ Ainda não. Releia a explicação e tente novamente."} ${enhanced.formative.explanation}`;if(correct){state.lessonChecks[key]=true;saveProgress();$(".formative-check").classList.add("mastered");$("#checkFormative").textContent="✓ Exercício dominado";if(state.activities[key]){$("#completeLesson").disabled=false;$("#completeLesson").textContent="Concluir e liberar próxima";$(".lesson-unlock-status").classList.add("ready");$(".lesson-unlock-status strong").textContent="✓ Etapa pronta para conclusão"}}trackLearningEvent("verificacao_formativa",{courseId:course.id,lesson:index,correct})});
  $$('[data-resource-link]').forEach(link=>link.addEventListener("click",()=>trackLearningEvent("material_aberto",{courseId:course.id,lesson:index,title:resources[Number(link.dataset.resourceLink)]?.title})));
  $("#previousLesson").addEventListener("click",()=>{if(index>0){state.currentLesson--;renderCourse()}});
  $("#nextLesson").addEventListener("click",()=>{if(index<6){state.currentLesson++;renderCourse()}});
  $("#bookmarkLesson").addEventListener("click",()=>{state.bookmarks[key]=!state.bookmarks[key];saveStudentWorkspace();renderLesson();showToast(state.bookmarks[key]?"Aula salva para revisar":"Aula removida dos salvos")});
  $("#focusLesson").addEventListener("click",()=>{document.body.classList.toggle("lesson-focus");renderLesson()});
  $("#lessonNotes").addEventListener("input",event=>{state.notes[key]=event.target.value;$("#notesStatus").textContent="Salvando...";clearTimeout(renderLesson.noteTimer);renderLesson.noteTimer=setTimeout(()=>{saveStudentWorkspace();$("#notesStatus").textContent="Salvo neste navegador"},450)});
  $("#completeLesson").addEventListener("click",()=>{const wasComplete=!!state.completed[key];if(!wasComplete&&!state.activities[key]){showToast("Conclua primeiro a atividade prática");return}if(!wasComplete&&!state.lessonChecks[key]){showToast("Responda corretamente ao exercício final");return}state.completed[key]=!wasComplete;if(!wasComplete){addStudyMinutes(15);state.bookmarks[key]=false;trackLearningEvent("aula_concluida",{courseId:course.id,lesson:index,title:topic})}saveProgress();renderCourse();showToast(state.completed[key]?"Aula concluída e próxima etapa liberada!":"Conclusão removida")});
  dispatchCoda("lesson",{courseId:course.id,courseName:course.name,lesson:index,title:topic,complete,progress:coursePercent(course.id)});
}
function activityInstruction(course,index){const override=lessonOverride(course.id,index);if(override?.activity)return override.activity;const topic=lessonTitle(course,index),system=lessonSystemExamples[course.id][index],tasks=[`identifique no código os três elementos essenciais de “${topic}” e altere um deles sem quebrar a estrutura`,`crie dois casos de entrada para “${topic}”, um esperado e outro que exija uma decisão diferente`,`adicione um novo dado ao ${system} e faça esse dado aparecer claramente no resultado`,`extraia a parte responsável por “${topic}” para uma unidade reutilizável e dê a ela um nome que explique sua função`,`represente um segundo registro do ${system}, mantendo nomes, tipos e estrutura consistentes`,`valide uma entrada inválida antes de processá-la e apresente uma mensagem que ajude a corrigir o problema`,`entregue uma versão mínima do ${system} que integre os conceitos das seis aulas anteriores`];return `No ${system}, ${tasks[index]}. Antes de executar, escreva o resultado esperado. Depois, teste um caso comum e um caso inesperado e registre a diferença observada.`}
function openActivityLegacy(course,index,code){state.activity={courseId:course.id,lesson:index,instruction:activityInstruction(course,index)};state.labLanguage=course.id;state.labCode[course.id]=code;renderLab();goToView("laboratorio");showToast(`Atividade de ${course.name} carregada`)}

function visibleVideos(){const term=state.videoSearch.trim().toLowerCase();return videoCatalog.map((item,index)=>{const course=courseById(item.courseId),video=lessonVideoData(course,item.lessonIndex,state.videoLength);return {...item,...video,index,course,title:lessonTitle(course,item.lessonIndex),description:`${state.videoLength==="short"?"Microaula exclusiva com legenda":"Curso completo alternativo"} ${item.lessonIndex+1}: conceito, exemplo e prática de ${lessonTitle(course,item.lessonIndex)}.`}}).filter(item=>(state.videoCategory==="Todas"||item.category===state.videoCategory)&&(state.videoCourse==="Todas"||item.courseId===state.videoCourse)&&(!term||`${item.course.name} ${item.title} ${item.description}`.toLowerCase().includes(term)))}
function renderVideoFilters(){const categories=["Todas","Web","Sistemas","Aplicações","Hardware"];$("#videoFilters").innerHTML=categories.map(item=>`<button class="${state.videoCategory===item?"active":""}" data-video-category="${item}">${item}</button>`).join("");$$('[data-video-category]').forEach(button=>button.addEventListener("click",()=>{state.videoCategory=button.dataset.videoCategory;const first=visibleVideos()[0];if(first)state.currentVideo=first.index;renderVideos()}))}
function renderVideos(){
  renderVideoFilters();
  $$('[data-video-length]').forEach(button=>button.classList.toggle("active",button.dataset.videoLength===state.videoLength));
  if($("#videoCourseSelect").options.length===1)$("#videoCourseSelect").insertAdjacentHTML("beforeend",courseBlueprints.map(course=>`<option value="${course.id}">${course.name}</option>`).join(""));
  $("#videoCourseSelect").value=state.videoCourse;$("#videoSearch").value=state.videoSearch;
  const visible=visibleVideos();if(visible.length&&!visible.some(item=>item.index===state.currentVideo))state.currentVideo=visible[0].index;
  const base=videoCatalog[state.currentVideo]||videoCatalog[0],course=courseById(base.courseId),video=lessonVideoData(course,base.lessonIndex,state.videoLength),current={...base,...video,title:lessonTitle(course,base.lessonIndex)};
  const playerFrame=$(".player-frame");playerFrame.innerHTML='<iframe id="videoFrame" title="Videoaula selecionada" loading="lazy" allowfullscreen></iframe><div class="video-placeholder" id="videoPlaceholder"><button id="loadVideo">▶</button><span>Carregar videoaula</span></div>';
  $("#videoPlaceholder span").textContent=state.videoLength==="short"?"Reproduzir microaula exclusiva com legenda":"Carregar curso completo alternativo";
  $("#videoResultCount").textContent=`${visible.length} ${visible.length===1?"aula":"aulas"}`;$("#videoCatalogCount").textContent=videoCatalog.length;
  const deep=lessonDeepDiveData(course,current.lessonIndex);$("#videoLearningStrip").innerHTML=`<div><small>ANTES</small><strong>Ative o conhecimento</strong><p>${escapeHtml(current.note)}</p></div><div><small>DURANTE</small><strong>Procure o conceito</strong><p>Identifique onde “${escapeHtml(current.title)}” aparece no exemplo.</p></div><div><small>DEPOIS</small><strong>Pratique imediatamente</strong><p>${escapeHtml(deep.checkpoint)}</p></div>`;
  $("#playerInfo").innerHTML=`<div class="player-copy"><small>${escapeHtml(course.name.toUpperCase())} • AULA ${String(current.lessonIndex+1).padStart(2,"0")}</small><strong>${escapeHtml(current.title)}</strong><p>${escapeHtml(current.description)}</p></div><div class="player-actions"><span>${escapeHtml(current.label)} • ${current.minutes} MIN</span><button id="openVideoLesson">Abrir aula e atividade →</button><a href="${escapeHtml(current.url)}" target="_blank" rel="noopener noreferrer">Ver fonte completa ↗</a></div>`;
  $("#videoQueue").innerHTML=visible.length?visible.map(item=>`<button class="${item.index===state.currentVideo?"active":""}" data-video="${item.index}"><span>${String(item.lessonIndex+1).padStart(2,"0")}</span><span><strong>${escapeHtml(item.course.name)}: ${escapeHtml(item.title)}</strong><small>${escapeHtml(item.label.toLowerCase())} • ${item.minutes} min • Aula ${item.lessonIndex+1} de 7</small></span><i>▶</i></button>`).join(""):`<div class="video-empty"><b>Nenhuma videoaula encontrada</b><span>Altere a busca ou os filtros.</span></div>`;
  $$('[data-video]').forEach(button=>button.addEventListener("click",()=>{state.currentVideo=Number(button.dataset.video);renderVideos()}));
  $("#loadVideo").onclick=()=>{if(current.kind==="micro"){playerFrame.innerHTML=microVideoMarkup(current);activateMicroVideos(playerFrame)}else{$("#videoFrame").src=youtubeEmbedUrl(current);$("#videoPlaceholder").hidden=true}trackLearningEvent("video_aberto",{courseId:current.courseId,lesson:current.lessonIndex,title:current.title,mode:state.videoLength})};
  $("#openVideoLesson").onclick=()=>openCourse(current.courseId,current.lessonIndex);
}

function languageOptions(){return courseBlueprints.map(course=>`<option value="${course.id}" ${state.labLanguage===course.id?"selected":""}>${course.name}</option>`).join("")}
function renderLabLegacy(){
  $("#labLanguage").innerHTML=languageOptions();const lang=state.labLanguage,starter=starters[lang];if(!state.labCode[lang])state.labCode[lang]=starter.code;
  $("#labFilename").textContent=starter.file;$("#runtimeBadge").textContent=starter.mode==="browser"?"EXECUÇÃO NO NAVEGADOR":"VERIFICAÇÃO GUIADA";
  $("#codeEditor").value=state.labCode[lang];updateLines();
  if(state.activity){const course=courseById(state.activity.courseId);$("#challengeStrip").innerHTML=`<span>◇</span><div><small>ATIVIDADE • ${course.name} • AULA ${state.activity.lesson+1}</small><strong>${escapeHtml(state.activity.instruction)}</strong></div><button id="verifyActivity">Verificar atividade</button>`}else{$("#challengeStrip").innerHTML=`<span>◇</span><div><small>DESAFIO LIVRE</small><strong>Escolha uma linguagem e experimente o código inicial.</strong></div><button id="verifyActivity">Verificar atividade</button>`}
  $("#verifyActivity").onclick=verifyActivity;
  $("#labSupport").innerHTML=`<article><small>AMBIENTE</small><strong>${starter.mode==="browser"?"Executável aqui":"Editor e análise guiada"}</strong><p>${starter.mode==="browser"?"O navegador monta o resultado sem instalar programas.":"Para compilar de verdade, use o ambiente oficial da linguagem no seu computador."}</p></article><article><small>DICA</small><strong>Faça uma mudança por vez</strong><p>Execute depois de cada alteração para encontrar erros com mais facilidade.</p></article><article><small>ATALHO</small><strong>Tab cria indentação</strong><p>Use Ctrl + Enter para executar e mantenha o código organizado.</p></article>`;
  runLab();
}
function updateLines(){const editor=$("#codeEditor"),count=Math.max(24,editor.value.split("\n").length);$("#lineNumbers").innerHTML=Array.from({length:count},(_,i)=>`<span>${i+1}</span>`).join("")}
function runLabLegacy(){
  const lang=state.labLanguage,code=$("#codeEditor").value;state.labCode[lang]=code;
  $("#codePreview").hidden=false;$("#consoleOutput").hidden=true;$$('[data-output]').forEach((b,i)=>b.classList.toggle("active",i===0));
  if(lang==="html")$("#codePreview").srcdoc=code;
  else if(lang==="css")$("#codePreview").srcdoc=`<!doctype html><html><head><style${inlineCspNonce()}>${code}</style></head><body><section class="card"><h1>Prévia CSS</h1><p>Edite as regras para transformar este cartão.</p><button>Testar estilo</button></section></body></html>`;
  else if(lang==="javascript")$("#codePreview").srcdoc=`<!doctype html><html><body style="font-family:Arial;padding:25px"><h1>Lista de tecnologias</h1><ul id="lista"></ul><script${inlineCspNonce()}>try{${code}}catch(error){document.body.innerHTML+='<pre style="color:#d33">'+error.message+'</pre>'}<\/script></body></html>`;
  else{showConsole(simulateOutput(lang,code));}
}
function showConsole(text){$("#codePreview").hidden=true;$("#consoleOutput").hidden=false;$("#consoleOutput").textContent=text;$$('[data-output]').forEach(button=>button.classList.toggle("active",button.dataset.output==="console"))}
function simulateOutput(lang,code){
  const checks={typescript:[/type|interface/,/console\.log/],python:[/print\s*\(/,/for|if|def/],c:[/#include/,/int\s+main/],cplus:[/#include/,/std::|printf/],cpp:[/#include/,/int\s+main/],csharp:[/Console\./,/var|class|record/],java:[/class\s+\w+/,/public\s+static\s+void\s+main/],react:[/function|=>/,/return\s*\(/],reactnative:[/View|Text/,/export\s+default/],esp32:[/void\s+setup/,/void\s+loop/]};
  const rules=checks[lang]||[];const passed=rules.filter(rule=>rule.test(code)).length;const course=courseById(lang);
  return `coda • ANÁLISE GUIADA DE ${course.name.toUpperCase()}\n\n✓ Arquivo carregado: ${starters[lang].file}\n✓ ${code.split("\n").length} linhas analisadas\n${passed===rules.length?"✓":"△"} Estrutura essencial: ${passed}/${rules.length} verificações\n\n${passed===rules.length?"Seu código tem a estrutura inicial esperada.\nUse o compilador oficial da linguagem para executar o programa completo.":"Revise os blocos principais do modelo antes de continuar."}\n\nEsta saída é uma verificação educativa local, não uma compilação real.`;
}
function verifyActivityLegacy(){const code=$("#codeEditor").value.trim(),starter=starters[state.labLanguage].code.trim();if(code.length<20){showToast("Adicione mais código antes de verificar");return}const changed=code!==starter&&(!state.activity||code!==lessonCode(courseById(state.activity.courseId),state.activity.lesson));if(state.activity&&changed){const key=`${state.activity.courseId}:${state.activity.lesson}`;state.activities[key]=true;saveProgress();showToast("Atividade verificada! +10 XP")}else if(state.activity){showToast("Faça uma alteração no código para concluir")}else{showToast("Código pronto para continuar experimentando")}}

// Laboratório 2.0: execução real, trilhas ordenadas e conexão serial.
let compilerCatalog = null;
let espSerialPort = null;
let espSerialReader = null;
let espReading = false;
const remoteLanguageNames = {python:"Python",c:"C",cplus:"C++",cpp:"C++",csharp:"C#",java:"Java"};
const runtimeLabels = {browser:"EXECUÇÃO NO NAVEGADOR",cloud:"COMPILAÇÃO REAL • INTERNET",device:"EXECUÇÃO NO ESP32 • USB",database:"BANCO JSON • EXECUÇÃO LOCAL"};

function setRunStatus(label,kind="ready"){
  const status=$(".output-tabs span");
  status.textContent=label;
  status.className=kind;
}

function activitySpec(course,index,providedCode){
  const code=providedCode||lessonCode(course,index);
  const checks={
    html:[/<[a-z][\s\S]*>/i],
    css:[/{[\s\S]*}/],
    javascript:[/const|let|function|=>/],
    typescript:[/type|interface|:/],
    python:[/print|for|if|def/],
    c:[/#include/,/main\s*\(/],
    cplus:[/#include/,/main\s*\(/],
    cpp:[/#include/,/main\s*\(/],
    csharp:[/Console\./],
    java:[/class\s+Main/,/static\s+void\s+main/],
    react:[/function\s+App|const\s+App/,/return\s*\(/],
    reactnative:[/View|Text/,/export\s+default/],
    esp32:[/from\s+machine|import\s+machine/,/Pin\s*\(/],
    sql:[/\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b/i,/\bFROM\b|\bINTO\b|\bSET\b/i]
  };
  return {courseId:course.id,lesson:index,title:lessonTitle(course,index),instruction:activityInstruction(course,index),initialCode:code,checks:checks[course.id]||[]};
}

function firstPendingLesson(courseId){
  const index=Array.from({length:7},(_,i)=>i).find(i=>!state.activities[`${courseId}:${i}`]);
  return index===undefined?6:index;
}

function selectActivity(courseId,index,providedCode){
  const first=firstPendingLesson(courseId);
  const alreadyDone=!!state.activities[`${courseId}:${index}`];
  if(index>first&&!alreadyDone){showToast(`Conclua primeiro a atividade ${first+1}`);index=first;providedCode=undefined}
  const course=courseById(courseId);
  state.labMode="activity";
  state.activityCourse=courseId;
  state.activityLesson=index;
  state.activity=activitySpec(course,index,providedCode);
  state.labLanguage=courseId;
  state.labCode[courseId]=state.activity.initialCode;
  renderLab();
}

function openActivity(course,index,code){
  selectActivity(course.id,index,code);
  goToView("laboratorio");
  showToast(`Atividade ${index+1} de ${course.name} carregada`);
}

function renderActivityNavigator(){
  $("#activityCourse").innerHTML=courseBlueprints.map(course=>`<option value="${course.id}" ${course.id===state.activityCourse?"selected":""}>${course.name}</option>`).join("");
  const course=courseById(state.activityCourse);
  $("#activityCourseTitle").textContent=`${course.name} • 7 atividades em ordem`;
  const first=firstPendingLesson(course.id);
  $("#activityOrder").innerHTML=course.topics.map((topic,index)=>{
    const done=!!state.activities[`${course.id}:${index}`];
    const locked=index>first&&!done;
    return `<button class="${done?"done":""} ${state.activityLesson===index?"active":""}" data-activity-lesson="${index}" ${locked?"disabled":""}><strong>A${index+1} • ${escapeHtml(topic)}</strong><small>${done?"Concluída":locked?"Bloqueada":"Disponível"}</small></button>`;
  }).join("");
  $$('[data-activity-lesson]').forEach(button=>button.addEventListener("click",()=>selectActivity(course.id,Number(button.dataset.activityLesson))));
  renderCustomChallengeList();
}

function renderCustomChallengeList(){
  const target=$("#customChallengeList");if(!target)return;
  const challenges=(appDatabase?.desafiosExtras||[]).filter(item=>item.courseId===state.activityCourse);
  target.innerHTML=challenges.length?`<small>DESAFIOS EXTRAS DO PROFESSOR</small>${challenges.map(item=>`<button data-custom-challenge="${item.id}"><strong>${escapeHtml(item.title)}</strong><span>Prática extra →</span></button>`).join("")}`:`<small>Nenhum desafio extra nesta matéria.</small>`;
  $$('[data-custom-challenge]',target).forEach(button=>button.onclick=()=>selectCustomChallenge(Number(button.dataset.customChallenge)));
}
function selectCustomChallenge(id){
  const item=appDatabase?.desafiosExtras?.find(challenge=>challenge.id===id);if(!item)return;
  state.labMode="activity";state.activityCourse=item.courseId;state.labLanguage=item.courseId;state.activityLesson=0;
  state.activity={courseId:item.courseId,lesson:0,customId:item.id,title:item.title,instruction:item.instruction,initialCode:item.code,checks:activitySpec(courseById(item.courseId),0,item.code).checks};
  state.labCode[item.courseId]=item.code;renderLab();showToast("Desafio extra carregado");
}

function runtimeDescription(lang){
  const mode=starters[lang].mode;
  if(mode==="database")return '<strong>Banco JSON educativo.</strong> Execute SELECT, INSERT, UPDATE e DELETE nas tabelas locais. As alterações ficam salvas somente neste navegador.';
  if(mode==="cloud")return '<strong>Compilação real pela internet.</strong> Ao executar, somente o código do editor é enviado ao serviço de compilação Wandbox. Nenhuma informação pessoal é enviada.';
  if(lang==="esp32")return '<strong>ESP32 físico com MicroPython.</strong> Use Chrome ou Edge em localhost/HTTPS, conecte a placa por USB e mantenha as montagens em 3,3 V. A placa precisa estar com MicroPython instalado.';
  if(lang==="reactnative")return '<strong>Prévia mobile no navegador.</strong> Componentes básicos são executados em uma camada visual compatível. Recursos nativos de câmera, GPS e Android/iOS precisam do Expo ou Android Studio.';
  if(lang==="react")return '<strong>React real no navegador.</strong> React e Babel são carregados pela internet dentro de uma área isolada.';
  if(lang==="typescript")return '<strong>TypeScript real.</strong> O compilador TypeScript é carregado no navegador, verifica e transforma o código antes da execução.';
  return '<strong>Execução local e isolada.</strong> O resultado é criado dentro do navegador e o código não sai do computador.';
}

function renderLab(){
  $("#labLanguage").innerHTML=languageOptions();
  const lang=state.labLanguage,starter=starters[lang];
  if(!state.labCode[lang])state.labCode[lang]=starter.code;
  $$('#labModeTabs [data-lab-mode]').forEach(button=>button.classList.toggle("active",button.dataset.labMode===state.labMode));
  $("#activityNavigator").hidden=state.labMode!=="activity";
  $("#labLanguage").disabled=state.labMode==="activity";
  $("#pendingActivities").textContent=Math.max(0,totalLessons()-Object.keys(state.activities).filter(key=>!key.startsWith("custom:")&&state.activities[key]).length);
  if(state.labMode==="activity"){
    if(!state.activity||!state.activity.initialCode||state.activity.courseId!==state.activityCourse||state.activity.lesson!==state.activityLesson){
      state.activity=activitySpec(courseById(state.activityCourse),state.activityLesson);
      state.labLanguage=state.activityCourse;
      state.labCode[state.labLanguage]=state.activity.initialCode;
    }
    renderActivityNavigator();
  }
  $("#labFilename").textContent=starters[state.labLanguage].file;
  $("#runtimeBadge").textContent=runtimeLabels[starters[state.labLanguage].mode];
  $("#codeEditor").value=state.labCode[state.labLanguage];
  updateLines();
  const isActivity=state.labMode==="activity"&&state.activity;
  $("#challengeStrip").innerHTML=isActivity
    ?`<span>◇</span><div><small>${state.activity.customId?"DESAFIO EXTRA":"ATIVIDADE "+(state.activity.lesson+1)+" DE 7"} • ${courseById(state.activity.courseId).name}</small><strong>${escapeHtml(state.activity.instruction)}</strong></div><button id="verifyActivity">Executar e verificar</button>`
    :'<span>&lt;/&gt;</span><div><small>PROGRAMAÇÃO LIVRE</small><strong>Crie seu próprio programa. Nada será marcado como atividade.</strong></div><button id="verifyActivity" hidden>Verificar atividade</button>';
  if(isActivity)$("#verifyActivity").onclick=verifyActivity;
  $("#espDeviceBar").hidden=state.labLanguage!=="esp32";
  $("#serialCommandBar").hidden=state.labLanguage!=="esp32";
  $("#stdinInput").disabled=!["cloud"].includes(starters[state.labLanguage].mode);
  $("#runtimeNote").className=`runtime-note ${starters[state.labLanguage].mode}`;
  $("#runtimeNote").innerHTML=runtimeDescription(state.labLanguage);
  $("#labSupport").innerHTML=`<article><small>EXECUÇÃO</small><strong>${runtimeLabels[starters[state.labLanguage].mode]}</strong><p>O console mostra a saída real e os erros encontrados.</p></article><article><small>ATIVIDADES</small><strong>Uma etapa por vez</strong><p>Conclua A1 para liberar A2, seguindo a mesma ordem das aulas.</p></article><article><small>ATALHO</small><strong>Ctrl + Enter executa</strong><p>Use Tab para identar e execute depois de cada alteração.</p></article>`;
  $("#codePreview").hidden=false;
  $("#consoleOutput").hidden=true;
  $("#codePreview").srcdoc='<!doctype html><html><body style="font-family:Arial;padding:32px;color:#42506a"><h2>Pronto para executar</h2><p>Edite o código e pressione Executar de verdade.</p></body></html>';
  setRunStatus("● PRONTO","ready");
  setLabTestResult(0,0,"Testes aguardando execução");
  updateEspControls();
  dispatchCoda("lab",{language:state.labLanguage,mode:state.labMode,activity:state.activity});
}

function setLabTestResult(passed,total,message){const box=$("#labTestResults");if(!box)return;box.className=`lab-test-results ${total&&passed===total?"passed":total?"failed":""}`;box.innerHTML=`<span>${total&&passed===total?"✓":total?"!":"○"}</span><div><strong>${escapeHtml(message)}</strong><small>${total?`${passed} de ${total} verificações aprovadas.`:"Execute ou verifique uma atividade para ver os resultados."}</small></div>`}

function compilerScore(compiler,language){
  const name=(compiler.name||"").toLowerCase();
  if(language==="Python"&&/cpython-3/.test(name))return 10;
  if(language==="C"&&/gcc.*-c$/.test(name))return 10;
  if(language==="C++"&&/gcc/.test(name))return 9;
  if(language==="C#"&&/mono|dotnet/.test(name))return 10;
  if(language==="Java"&&/openjdk|java/.test(name))return 9;
  return 1;
}

async function executeRemote(lang,code){
  if(!navigator.onLine)throw new Error("Sem internet para acessar o compilador desta linguagem.");
  if(!compilerCatalog){
    const response=await fetch("https://wandbox.org/api/list.json");
    if(!response.ok)throw new Error("O catálogo de compiladores não respondeu.");
    compilerCatalog=await response.json();
  }
  const language=remoteLanguageNames[lang];
  const candidates=compilerCatalog.filter(item=>(item.language||"").toLowerCase()===language.toLowerCase()).sort((a,b)=>compilerScore(b,language)-compilerScore(a,language));
  if(!candidates.length)throw new Error(`Nenhum compilador de ${language} está disponível agora.`);
  const response=await fetch("https://wandbox.org/api/compile.json",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,compiler:candidates[0].name,stdin:$("#stdinInput").value,save:false})});
  if(!response.ok)throw new Error("O compilador online recusou a execução.");
  const result=await response.json();
  const errors=[result.compiler_error,result.program_error,result.signal].filter(Boolean).join("\n");
  const output=[result.compiler_message,result.program_message,result.program_output].filter(Boolean).join("\n");
  showConsole((errors||output||"Programa executado sem saída.").trim());
  return {success:!errors,output:output||errors};
}

function inlineCspNonce(){const nonce=document.querySelector('meta[name="csp-nonce"]')?.content||"";return nonce?` nonce="${escapeHtml(nonce)}"`:""}
function browserDocument(code,lang){
  if(lang==="html")return code;
  if(lang==="css")return `<!doctype html><html><head><style${inlineCspNonce()}>${code}</style></head><body><section class="card"><h1>Prévia CSS</h1><p>Este resultado usa seu CSS.</p><button>Interagir</button></section></body></html>`;
  return `<!doctype html><html><body style="font-family:Arial;padding:25px"><h1>Saída JavaScript</h1><ul id="lista"></ul><pre id="erro" style="color:#c33"></pre><script${inlineCspNonce()}>try{${code}}catch(error){document.querySelector('#erro').textContent=error.stack||error.message}<\/script></body></html>`;
}

function loadExternalScript(src,globalName){
  if(globalName&&window[globalName])return Promise.resolve();
  return new Promise((resolve,reject)=>{const script=document.createElement("script");script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error("Não foi possível carregar o ambiente de execução."));document.head.appendChild(script)});
}

async function executeTypeScript(code){
  await loadExternalScript("https://cdn.jsdelivr.net/npm/typescript@5.9.3/lib/typescript.js","ts");
  const result=window.ts.transpileModule(code,{compilerOptions:{target:window.ts.ScriptTarget.ES2020},reportDiagnostics:true});
  const diagnostics=result.diagnostics||[];
  if(diagnostics.length){
    showConsole(diagnostics.map(item=>window.ts.flattenDiagnosticMessageText(item.messageText,"\n")).join("\n"));
    return {success:false};
  }
  $("#codePreview").hidden=false;$("#consoleOutput").hidden=true;
  $("#codePreview").srcdoc=browserDocument(result.outputText,"javascript");
  return {success:true};
}

function reactDocument(code,isNative){
  let prepared=code.replace(/^import[^;]+;?/gm,"").replace(/export\s+default\s+function\s+App/,"function App").replace(/export\s+default\s+App\s*;?/g,"");
  if(isNative)prepared=prepared.replace(/<View/g,"<div").replace(/<\/View>/g,"</div>").replace(/<Text/g,"<span").replace(/<\/Text>/g,"</span>").replace(/<Pressable/g,"<button").replace(/<\/Pressable>/g,"</button>");
  return `<!doctype html><html><head><meta charset="utf-8"><script crossorigin src="https://unpkg.com/react@19/umd/react.development.js"><\/script><script crossorigin src="https://unpkg.com/react-dom@19/umd/react-dom.development.js"><\/script><script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script><style${inlineCspNonce()}>body{font-family:Arial;background:#f3f6fb;padding:24px}#root{max-width:420px;margin:auto;background:white;border-radius:18px;padding:24px;box-shadow:0 18px 50px #1d294022}button{padding:10px 14px;margin:8px;border:0;border-radius:8px;background:#b9ff3b}</style></head><body><div id="root"></div><pre id="error" style="color:#c33"></pre><script${inlineCspNonce()} type="text/babel">const {useState,useEffect,useMemo,useRef}=React;try{${prepared};ReactDOM.createRoot(document.getElementById('root')).render(<App/>)}catch(error){document.getElementById('error').textContent=error.stack||error.message}<\/script></body></html>`;
}

const reactDocumentBase = reactDocument;
reactDocument = (code,isNative) => reactDocumentBase(code,isNative)
  .replace("react@19/", "react@18.3.1/")
  .replace("react-dom@19/", "react-dom@18.3.1/");

function sqlValue(raw){const value=raw.trim();if(/^'.*'$|^".*"$/.test(value))return value.slice(1,-1);if(/^true$/i.test(value))return true;if(/^false$/i.test(value))return false;if(/^null$/i.test(value))return null;if(!Number.isNaN(Number(value)))return Number(value);return value}
function sqlWhere(rows,clause){if(!clause)return rows;const match=clause.match(/^([\wÀ-ÿ]+)\s*(=|!=|>=|<=|>|<)\s*(.+)$/i);if(!match)throw new Error("Use um filtro simples, como: WHERE ativo = true");const [,field,operator,raw]=match,target=sqlValue(raw);return rows.filter(row=>({"=":row[field]===target,"!=":row[field]!==target,">":row[field]>target,"<":row[field]<target,">=":row[field]>=target,"<=":row[field]<=target}[operator]))}
function sqlTableDocument(rows,message){
  const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))];
  return `<!doctype html><html><head><meta charset="utf-8"><style${inlineCspNonce()}>body{font:16px Arial;padding:24px;color:#172033}h2{font-size:18px}table{border-collapse:collapse;width:100%}th,td{padding:10px;border:1px solid #ccd5e3;text-align:left}th{background:#14233b;color:#fff}tr:nth-child(even){background:#f3f7fb}.empty{padding:24px;background:#f3f7fb}</style></head><body><h2>${escapeHtml(message)}</h2>${rows.length?`<table><thead><tr>${columns.map(column=>`<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(column=>`<td>${escapeHtml(row[column]??"")}</td>`).join("")}</tr>`).join("")}</tbody></table>`:'<div class="empty">Nenhum registro encontrado.</div>'}</body></html>`;
}
function executeSQL(code){
  const query=code.trim().replace(/;\s*$/,"");const tables=appDatabase.tabelas;
  if(/^SHOW\s+TABLES$/i.test(query)){const rows=Object.keys(tables).map(nome=>({tabela:nome,registros:tables[nome].length}));$("#codePreview").hidden=false;$("#consoleOutput").hidden=true;$("#codePreview").srcdoc=sqlTableDocument(rows,"Tabelas disponíveis");return {success:true}}
  let match=query.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/is);
  if(match){const [,fields,table,where,order,direction,limit]=match;if(!Array.isArray(tables[table]))throw new Error(`Tabela “${table}” não encontrada. Use SHOW TABLES.`);let rows=sqlWhere([...tables[table]],where);if(order)rows.sort((a,b)=>String(a[order]??"").localeCompare(String(b[order]??""),"pt-BR",{numeric:true})*(direction?.toUpperCase()==="DESC"?-1:1));if(limit)rows=rows.slice(0,Number(limit));if(fields.trim()!=="*"){const selected=fields.split(",").map(item=>item.trim());rows=rows.map(row=>Object.fromEntries(selected.map(field=>[field,row[field]])))}$("#codePreview").hidden=false;$("#consoleOutput").hidden=true;$("#codePreview").srcdoc=sqlTableDocument(rows,`${rows.length} registro(s) em ${table}`);return {success:true}}
  match=query.match(/^INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/is);
  if(match){const [,table,fieldText,valueText]=match;if(!Array.isArray(tables[table]))throw new Error(`Tabela “${table}” não encontrada.`);const fields=fieldText.split(",").map(item=>item.trim()),values=valueText.split(",").map(sqlValue);if(fields.length!==values.length)throw new Error("A quantidade de colunas e valores precisa ser igual.");tables[table].push(Object.fromEntries(fields.map((field,index)=>[field,values[index]])));saveDatabase();showConsole(`1 registro inserido em ${table}.`);return {success:true}}
  match=query.match(/^UPDATE\s+(\w+)\s+SET\s+(\w+)\s*=\s*(.+?)\s+WHERE\s+(.+)$/is);
  if(match){const [,table,field,value,where]=match;if(!Array.isArray(tables[table]))throw new Error(`Tabela “${table}” não encontrada.`);const matches=sqlWhere(tables[table],where);matches.forEach(row=>row[field]=sqlValue(value));saveDatabase();showConsole(`${matches.length} registro(s) atualizado(s) em ${table}.`);return {success:true}}
  match=query.match(/^DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)$/is);
  if(match){const [,table,where]=match;if(!Array.isArray(tables[table]))throw new Error(`Tabela “${table}” não encontrada.`);const remove=new Set(sqlWhere(tables[table],where)),before=tables[table].length;tables[table]=tables[table].filter(row=>!remove.has(row));saveDatabase();showConsole(`${before-tables[table].length} registro(s) removido(s) de ${table}.`);return {success:true}}
  throw new Error("Comando não reconhecido. Tente SHOW TABLES ou SELECT * FROM alunos;");
}

async function runLab(){
  const lang=state.labLanguage,code=$("#codeEditor").value;
  state.labCode[lang]=code;
  setRunStatus("● EXECUTANDO","running");
  $("#runLab").disabled=true;
  try{
    let result={success:true};
    if(lang==="javascript")new Function(code);
    if(lang==="css"&&(code.split("{").length!==code.split("}").length))throw new Error("Há uma chave de abertura ou fechamento faltando no CSS.");
    if(["html","css","javascript"].includes(lang)){
      $("#codePreview").hidden=false;$("#consoleOutput").hidden=true;$("#codePreview").srcdoc=browserDocument(code,lang);
    }else if(lang==="sql")result=executeSQL(code);
    else if(lang==="typescript")result=await executeTypeScript(code);
    else if(lang==="react"||lang==="reactnative"){
      $("#codePreview").hidden=false;$("#consoleOutput").hidden=true;$("#codePreview").srcdoc=reactDocument(code,lang==="reactnative");
    }else if(lang==="esp32"){
      if(!espSerialPort){showConsole("Conecte uma placa ESP32 por USB antes de executar.\n\nRequisitos:\n• Chrome ou Edge\n• Página aberta com Live Server/localhost ou HTTPS\n• MicroPython instalado na placa\n• Cabo USB de dados");result={success:false}}
      else result=await sendEspCode();
    }else result=await executeRemote(lang,code);
    setRunStatus(result.success?"● EXECUTADO":"● REVISE OS ERROS",result.success?"ready":"error");setLabTestResult(result.success?1:0,1,result.success?"Execução concluída":"Execução com erro");trackLearningEvent("laboratorio_executado",{courseId:lang,success:!!result.success,activity:state.activity?.lesson??null});
    return result;
  }catch(error){
    showConsole(`ERRO DE EXECUÇÃO\\n\\n${error.message}\\n\\nSe a linguagem usa compilação online, confirme sua conexão com a internet.`);
    setRunStatus("● ERRO","error");setLabTestResult(0,1,"Corrija o erro indicado na saída");
    return {success:false,error};
  }finally{$("#runLab").disabled=false}
}

async function verifyActivity(){
  if(!state.activity)return;
  const code=$("#codeEditor").value.trim();
  if(code===state.activity.initialCode.trim()){showToast("Faça a alteração pedida antes de verificar");return}
  const missing=state.activity.checks.filter(rule=>!rule.test(code));
  setLabTestResult(state.activity.checks.length-missing.length,state.activity.checks.length,"Estruturas essenciais da atividade");
  if(missing.length){showToast("Ainda falta uma estrutura importante no código");return}
  const result=await runLab();
  if(!result.success){showToast("Corrija o erro de execução antes de concluir");return}
  const key=state.activity.customId?`custom:${state.activity.customId}`:`${state.activity.courseId}:${state.activity.lesson}`;
  state.activities[key]=true;trackLearningEvent("atividade_concluida",{courseId:state.activity.courseId,lesson:state.activity.lesson??null,customId:state.activity.customId||null});saveProgress();renderActivityNavigator();
  $("#pendingActivities").textContent=Math.max(0,totalLessons()-Object.keys(state.activities).filter(key=>!key.startsWith("custom:")&&state.activities[key]).length);
  showToast("Atividade executada e concluída! +10 XP");
}

function updateEspControls(){
  const connected=!!espSerialPort;
  const baud=$("#espBaudRate")?.value||"115200";
  $("#espStatusDot").classList.toggle("connected",connected);
  $("#espStatusText").textContent=connected?`ESP32 conectado a ${baud} baud`:"Nenhuma placa conectada";
  $("#connectEsp").textContent=connected?"Trocar placa":"Conectar ESP32";
  $("#sendEsp").disabled=!connected;
  $("#stopEsp").disabled=!connected;
  $("#sendSerialCommand").disabled=!connected;
}

async function connectEsp(){
  if(!("serial" in navigator)){showToast("Use Chrome ou Edge com Live Server para conectar por USB");return}
  try{
    if(espSerialPort){try{await espSerialReader?.cancel()}catch(error){console.warn("Falha ao cancelar leitura serial:",error?.message||error)}try{await espSerialPort.close()}catch(error){console.warn("Falha ao fechar porta serial:",error?.message||error)}}
    espSerialPort=await navigator.serial.requestPort();
    await espSerialPort.open({baudRate:Number($("#espBaudRate").value||115200)});
    updateEspControls();
    showConsole("ESP32 conectado. Aguardando comandos do MicroPython...\n");
    readEspSerial();
    showToast("ESP32 conectado por USB");
  }catch(error){if(error.name!=="NotFoundError")showToast(`Falha na conexão: ${error.message}`)}
}

async function readEspSerial(){
  if(!espSerialPort?.readable||espReading)return;
  espReading=true;
  const decoder=new TextDecoder();
  try{
    while(espSerialPort?.readable){
      espSerialReader=espSerialPort.readable.getReader();
      try{
        while(true){
          const {value,done}=await espSerialReader.read();
          if(done)break;
          $("#consoleOutput").textContent+=decoder.decode(value,{stream:true});
          $("#consoleOutput").scrollTop=$("#consoleOutput").scrollHeight;
        }
      }finally{espSerialReader.releaseLock();espSerialReader=null}
    }
  }catch(error){$("#consoleOutput").textContent+=`\\nConexão encerrada: ${error.message}`}
  finally{espReading=false}
}

async function writeEsp(bytes){
  const writer=espSerialPort.writable.getWriter();
  try{await writer.write(bytes)}finally{writer.releaseLock()}
}

async function sendEspCode(){
  if(!espSerialPort?.writable)throw new Error("ESP32 não conectado.");
  const code=$("#codeEditor").value.replace(/\r\n/g,"\n");
  showConsole("Enviando código para o ESP32...\n");
  await writeEsp(new Uint8Array([3,3]));
  await new Promise(resolve=>setTimeout(resolve,120));
  await writeEsp(new Uint8Array([5]));
  await new Promise(resolve=>setTimeout(resolve,120));
  await writeEsp(new TextEncoder().encode(code+"\n"));
  await writeEsp(new Uint8Array([4]));
  showToast("Código executando no ESP32");
  return {success:true};
}

async function stopEsp(){
  if(!espSerialPort?.writable)return;
  await writeEsp(new Uint8Array([3,3]));
  showConsole("Programa interrompido no ESP32.\n");
  showToast("Execução interrompida");
}

async function sendSerialCommand(){const text=$("#serialCommand").value;if(!text.trim()||!espSerialPort?.writable)return;await writeEsp(new TextEncoder().encode(text+"\r\n"));$("#serialCommand").value="";showToast("Comando enviado pelo serial")}

function bindLabV2(){
  $$('#labModeTabs [data-lab-mode]').forEach(button=>button.addEventListener("click",()=>{
    state.labMode=button.dataset.labMode;
    if(state.labMode==="free"){state.activity=null}
    else selectActivity(state.activityCourse,firstPendingLesson(state.activityCourse));
    renderLab();
  }));
  $("#activityCourse").addEventListener("change",event=>selectActivity(event.target.value,firstPendingLesson(event.target.value)));
  $("#resetLab").onclick=()=>{
    const resetCode=state.labMode==="activity"&&state.activity?state.activity.initialCode:starters[state.labLanguage].code;
    state.labCode[state.labLanguage]=resetCode;$("#codeEditor").value=resetCode;saveStudentWorkspace();updateLines();showToast("Código restaurado");
  };
  $("#connectEsp").onclick=connectEsp;
  $("#sendEsp").onclick=sendEspCode;
  $("#stopEsp").onclick=stopEsp;
  $("#sendSerialCommand").onclick=sendSerialCommand;
  $("#serialCommand").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();sendSerialCommand()}});
}

const base3DTemplates=[
  {id:"3d-led",title:"Luz de estado",type:"led",description:"Controle um LED virtual e depois teste o mesmo código no GPIO 2.",pin:"GPIO2",color:"#b9ff3b",code:`from machine import Pin\nfrom time import sleep\n\nled = Pin(2, Pin.OUT)\nwhile True:\n    led.value(not led.value())\n    sleep(0.5)`},
  {id:"3d-button",title:"Botão de comando",type:"button",description:"Leia uma entrada digital e altere o estado do sistema.",pin:"GPIO4",color:"#56b8ff",code:`from machine import Pin\nfrom time import sleep\n\nbotao = Pin(4, Pin.IN, Pin.PULL_UP)\nwhile True:\n    print("pressionado" if not botao.value() else "livre")\n    sleep(0.1)`},
  {id:"3d-pot",title:"Controle analógico",type:"potentiometer",description:"Mude um valor entre 0 e 4095 usando uma entrada ADC.",pin:"GPIO34",color:"#ff9d52",code:`from machine import ADC, Pin\nfrom time import sleep\n\npot = ADC(Pin(34))\nwhile True:\n    print(pot.read())\n    sleep(0.2)`},
  {id:"3d-servo",title:"Posição com servo",type:"servo",description:"Controle o ângulo de um servo virtual usando PWM.",pin:"GPIO18",color:"#9c7cff",code:`from machine import Pin, PWM\nfrom time import sleep\n\nservo = PWM(Pin(18), freq=50)\nfor pulso in (26, 77, 128, 77):\n    servo.duty(pulso)\n    sleep(1)\nservo.deinit()`},
  {id:"3d-display",title:"Painel de dados",type:"display",description:"Represente um display que recebe dados do ESP32 por I2C.",pin:"GPIO21",color:"#48d7c3",code:`from machine import Pin, I2C\n\ni2c = I2C(0, scl=Pin(22), sda=Pin(21))\nprint("Dispositivos I2C:", i2c.scan())`},
  {id:"3d-sensor",title:"Leitor ambiental",type:"sensor",description:"Simule uma leitura de sensor e acompanhe o valor no console.",pin:"GPIO35",color:"#ff667a",code:`from machine import ADC, Pin\nfrom time import sleep\n\nsensor = ADC(Pin(35))\nwhile True:\n    print("Leitura:", sensor.read())\n    sleep(1)`},
  {id:"3d-buzzer",title:"Alerta sonoro",type:"buzzer",description:"Gere um aviso curto com PWM e desligue a saída ao terminar.",pin:"GPIO25",color:"#ffd05a",code:`from machine import Pin, PWM\nfrom time import sleep\n\nbuzzer = PWM(Pin(25), freq=880, duty=220)\nsleep(0.3)\nbuzzer.deinit()`},
  {id:"3d-rgb",title:"Iluminação RGB",type:"rgb",description:"Misture três canais PWM para criar cores e sinalizações.",pin:"GPIO16",color:"#ff4fa3",code:`from machine import Pin, PWM\nfrom time import sleep\n\nvermelho = PWM(Pin(16), freq=1000)\nverde = PWM(Pin(17), freq=1000)\nazul = PWM(Pin(18), freq=1000)\nfor cor in ((1023,0,0),(0,1023,0),(0,0,1023)):\n    vermelho.duty(cor[0]); verde.duty(cor[1]); azul.duty(cor[2])\n    sleep(1)`},
  {id:"3d-temperature",title:"Estação de temperatura",type:"temperature",description:"Acompanhe uma leitura ambiental e use limites no seu programa.",pin:"GPIO35",color:"#ff7a59",code:`from machine import ADC, Pin\nfrom time import sleep\n\nsensor = ADC(Pin(35))\nwhile True:\n    temperatura = 10 + sensor.read() * 30 / 4095\n    print("Temperatura:", round(temperatura, 1), "C")\n    sleep(1)`},
  {id:"3d-relay",title:"Automação com relé",type:"relay",description:"Acione uma carga simulada por uma saída digital.",pin:"GPIO23",color:"#56b8ff",code:`from machine import Pin\nfrom time import sleep\n\nrele = Pin(23, Pin.OUT)\nrele.on(); sleep(2)\nrele.off()`},
  {id:"3d-motor",title:"Controle de motor",type:"motor",description:"Altere a velocidade de um motor virtual usando PWM.",pin:"GPIO19",color:"#9c7cff",code:`from machine import Pin, PWM\nfrom time import sleep\n\nmotor = PWM(Pin(19), freq=1000)\nfor velocidade in range(0, 1024, 128):\n    motor.duty(velocidade)\n    sleep(0.4)\nmotor.deinit()`}
];
function all3DTemplates(){const edits=appDatabase?.modelos3D||[],map=new Map(base3DTemplates.map(item=>[item.id,{...item}]));edits.forEach(item=>map.set(item.id,{...(map.get(item.id)||{}),...item}));return [...map.values()]}
const componentNames={led:"LED",rgb:"LED RGB",button:"Botão",resistor:"Resistor",capacitor:"Capacitor",battery:"Bateria",potentiometer:"Potenciômetro",sensor:"Sensor",temperature:"Sensor de temperatura",servo:"Servo",motor:"Motor",display:"Display",relay:"Relé",buzzer:"Buzzer"};

const wiringPins=["3V3","VIN","GND","GPIO2","GPIO4","GPIO5","GPIO18","GPIO19","GPIO21","GPIO25","GPIO26","GPIO27"];
const circuitLayouts={
  blink:[{id:"R1",type:"resistor",label:"Resistor 220 Ω",terminals:["A","B"]},{id:"LED1",type:"led",label:"LED",terminals:["A","K"]}],
  traffic:[{id:"R1",type:"resistor",label:"Resistor vermelho",terminals:["A","B"]},{id:"LEDR",type:"led red",label:"LED vermelho",terminals:["A","K"]},{id:"R2",type:"resistor",label:"Resistor amarelo",terminals:["A","B"]},{id:"LEDY",type:"led yellow",label:"LED amarelo",terminals:["A","K"]},{id:"R3",type:"resistor",label:"Resistor verde",terminals:["A","B"]},{id:"LEDG",type:"led green",label:"LED verde",terminals:["A","K"]}],
  sensor:[{id:"HC1",type:"sensor",label:"HC-SR04",terminals:["VCC","TRIG","ECHO","GND"]},{id:"R1",type:"resistor",label:"Divisor 1 kΩ",terminals:["A","B"]},{id:"R2",type:"resistor",label:"Divisor 2 kΩ",terminals:["A","B"]}],
  wifi:[{id:"R1",type:"resistor",label:"Resistor 220 Ω",terminals:["A","B"]},{id:"LED1",type:"led blue",label:"LED de conexão",terminals:["A","K"]},{id:"BTN1",type:"button",label:"Botão de controle",terminals:["1","2"]}]
};
const circuitPresets={
  blink:[["PIN:GPIO2","R1:A"],["R1:B","LED1:A"],["LED1:K","PIN:GND"]],
  traffic:[["PIN:GPIO18","R1:A"],["R1:B","LEDR:A"],["LEDR:K","PIN:GND"],["PIN:GPIO19","R2:A"],["R2:B","LEDY:A"],["LEDY:K","PIN:GND"],["PIN:GPIO21","R3:A"],["R3:B","LEDG:A"],["LEDG:K","PIN:GND"]],
  sensor:[["PIN:VIN","HC1:VCC"],["PIN:GPIO5","HC1:TRIG"],["HC1:ECHO","R1:A"],["R1:B","PIN:GPIO18"],["R1:B","R2:A"],["R2:B","PIN:GND"],["HC1:GND","PIN:GND"]],
  wifi:[["PIN:GPIO2","R1:A"],["R1:B","LED1:A"],["LED1:K","PIN:GND"],["PIN:GPIO4","BTN1:1"],["BTN1:2","PIN:GND"]]
};
const wireColors=["#ff5f6d","#ffd84d","#56b8ff","#b9ff3b","#bd84ff","#ff9d52"];
function createPins(){const left=["3V3","GND","GPIO15","GPIO2","GPIO4","GPIO16","GPIO17","GPIO5","GPIO18","GPIO19"],right=["VIN","GND","GPIO13","GPIO12","GPIO14","GPIO27","GPIO26","GPIO25","GPIO33","GPIO21"];$("#leftPins").innerHTML=left.map(pin=>`<i data-pin="${pin}"></i>`).join("");$("#rightPins").innerHTML=right.map(pin=>`<i data-pin="${pin}"></i>`).join("")}
function currentProject(){return espProjects[state.espProject]}
function wiringStorageId(){return currentProject().id}
function currentWires(){const id=wiringStorageId();if(!Array.isArray(state.wiringByProject[id]))state.wiringByProject[id]=[];state.wiringByProject[id]=state.wiringByProject[id].filter(edge=>Array.isArray(edge)&&edge.length===2&&edge.every(endpoint=>typeof endpoint==="string"));return state.wiringByProject[id]}
function wiringSnapshot(){return {wires:structuredClone(currentWires()),custom:structuredClone(customWiring())}}
function pushWiringHistory(){state.wiringHistory=[...(state.wiringHistory||[]).slice(-9),wiringSnapshot()];state.wiringRedo=[]}
function restoreWiringSnapshot(snapshot){if(!snapshot)return;state.wiringByProject[wiringStorageId()]=structuredClone(snapshot.wires||[]);saveCustomWiring(structuredClone(snapshot.custom||[]));localStorage.setItem("nexo-wiring",JSON.stringify(state.wiringByProject));state.wiringSelected=null;renderWiringWorkbench()}
function edgeKey(edge){return [...edge].sort().join("|")}
function componentVisual(item){if(item.type.includes("led"))return `<div class="part-led"><i></i></div>`;if(item.type==="resistor")return `<div class="part-resistor"><i></i><b></b></div>`;if(item.type==="battery")return `<div class="part-battery"><i>+</i><b>−</b></div>`;if(item.type==="capacitor")return `<div class="part-capacitor"><i></i><b></b></div>`;if(item.type==="sensor")return `<div class="part-sensor"><span>HC-SR04</span><i></i><i></i></div>`;return `<div class="part-button"><i></i></div>`}
function terminalLabel(id){const [part,terminal]=id.split(":");return part==="PIN"?terminal:`${part} ${terminal}`}
const customWiringTypes={resistor:{label:"Resistor 220 Ω",terminals:["A","B"]},led:{label:"LED",terminals:["A","K"]},battery:{label:"Bateria 3,3 V",terminals:["+","-"]},button:{label:"Chave",terminals:["1","2"]},capacitor:{label:"Capacitor 100 µF",terminals:["+","-"]},sensor:{label:"Sensor HC-SR04",terminals:["VCC","TRIG","ECHO","GND"]}};
function customWiring(){try{const value=JSON.parse(localStorage.getItem("nexo-wiring-components")||"[]");return Array.isArray(value)?value:[]}catch{return []}}
function saveCustomWiring(items){localStorage.setItem("nexo-wiring-components",JSON.stringify(items))}
function renderWiringWorkbench(){
  const project=currentProject(),components=[...circuitLayouts[project.id],...customWiring()];
  $("#wiringPinBank").innerHTML=wiringPins.map(pin=>`<button class="${pin==="GND"||pin==="3V3"||pin==="VIN"?"power":"digital"}" data-terminal="PIN:${pin}"><i></i><span>${pin}</span></button>`).join("");
  $("#circuitComponents").innerHTML=components.map(item=>`<article class="circuit-component ${item.type}" data-part="${item.id}" ${item.custom?`data-custom="true" draggable="true" style="left:${item.x||12}%;top:${item.y||12}%"`:``}>${componentVisual(item)}<strong>${item.label}</strong><small>${item.id}</small><div class="component-terminals">${item.terminals.map(terminal=>`<button data-terminal="${item.id}:${terminal}"><i></i>${terminal}</button>`).join("")}</div></article>`).join("");
  $$('[data-terminal]',$("#wiringBoard")).forEach(button=>button.addEventListener("click",()=>{if(button.dataset.skipClick){delete button.dataset.skipClick;return}selectWireTerminal(button.dataset.terminal)}));
  bindTerminalWireDrag();
  bindWiringDrag();
  state.wiringSelected=null;updateWiringSelection();renderWirePaths();renderCircuitResult();
}
function bindTerminalWireDrag(){const board=$("#wiringBoard"),svg=$("#wireLayer");if(!board||!svg)return;let active=null;$$('[data-terminal]',board).forEach(terminal=>{terminal.onpointerdown=event=>{if(event.button!==0)return;active={source:terminal,pointerId:event.pointerId};terminal.setPointerCapture?.(event.pointerId);terminal.classList.add("dragging-terminal");const sourceRect=terminal.getBoundingClientRect(),boardRect=board.getBoundingClientRect();svg.insertAdjacentHTML("beforeend",`<path class="wire-preview" data-preview-wire d="M ${sourceRect.left+sourceRect.width/2-boardRect.left} ${sourceRect.top+sourceRect.height/2-boardRect.top} L ${sourceRect.left+sourceRect.width/2-boardRect.left} ${sourceRect.top+sourceRect.height/2-boardRect.top}" stroke="#56b8ff"/>`)};terminal.onpointermove=event=>{if(!active)return;const boardRect=board.getBoundingClientRect(),sourceRect=active.source.getBoundingClientRect(),preview=$("[data-preview-wire]",svg);if(preview)preview.setAttribute("d",`M ${sourceRect.left+sourceRect.width/2-boardRect.left} ${sourceRect.top+sourceRect.height/2-boardRect.top} L ${event.clientX-boardRect.left} ${event.clientY-boardRect.top}`)};terminal.onpointerup=event=>{if(!active)return;const source=active.source,target=document.elementFromPoint(event.clientX,event.clientY)?.closest?.("[data-terminal]");$("[data-preview-wire]",svg)?.remove();source.classList.remove("dragging-terminal");active=null;if(target&&target!==source){source.dataset.skipClick="1";target.dataset.skipClick="1";selectWireTerminal(source.dataset.terminal);selectWireTerminal(target.dataset.terminal)}}})}
function bindWiringDrag(){const board=$("#wiringBoard"),bench=$("#circuitComponents");if(!board||!bench)return;$$('[data-wiring-view]').forEach(button=>button.onclick=()=>{const view=button.dataset.wiringView;$$('[data-wiring-view]').forEach(item=>item.classList.toggle("active",item===button));board.classList.toggle("wiring-board-3d",view==="3d");board.classList.toggle("wiring-board-2d",view!=="3d");requestAnimationFrame(renderWirePaths)});$$('[data-add-component]',$('#wiringPalette')).forEach(button=>{button.ondragstart=event=>event.dataTransfer.setData("component-type",button.dataset.addComponent);button.onclick=()=>addWiringComponent(button.dataset.addComponent)});board.ondragover=event=>{if(event.dataTransfer?.types?.length){event.preventDefault();board.classList.add("drop-target")}};board.ondragleave=()=>board.classList.remove("drop-target");board.ondrop=event=>{event.preventDefault();board.classList.remove("drop-target");const type=event.dataTransfer.getData("component-type");if(type){const rect=bench.getBoundingClientRect();addWiringComponent(type,Math.max(4,Math.min(82,(event.clientX-rect.left)/rect.width*100)),Math.max(8,Math.min(84,(event.clientY-rect.top)/rect.height*100)));return}};board.onkeydown=event=>{if(event.key!=="Delete"&&event.key!=="Backspace")return;const selected=$(".circuit-component.selected",bench);if(!selected)return;const id=selected.dataset.part;if(!confirm(`Remover ${selected.querySelector("strong")?.textContent||"este componente"}?`))return;pushWiringHistory();saveCustomWiring(customWiring().filter(item=>item.id!==id));state.wiringByProject[wiringStorageId()]=currentWires().filter(edge=>!edge.some(endpoint=>endpoint.startsWith(`${id}:`)));localStorage.setItem("nexo-wiring",JSON.stringify(state.wiringByProject));renderWiringWorkbench();showToast("Componente removido")};$$('[data-custom="true"]',bench).forEach(card=>{const item=customWiring().find(row=>row.id===card.dataset.part);if(!item)return;card.onpointerdown=event=>{if(event.target.closest("[data-terminal]"))return;event.preventDefault();const rect=bench.getBoundingClientRect(),startX=event.clientX,startY=event.clientY,originX=item.x,originY=item.y;card.setPointerCapture(event.pointerId);card.classList.add("dragging");const move=moveEvent=>{item.x=Math.max(3,Math.min(88,originX+(moveEvent.clientX-startX)/rect.width*100));item.y=Math.max(7,Math.min(87,originY+(moveEvent.clientY-startY)/rect.height*100));card.style.left=`${item.x}%`;card.style.top=`${item.y}%`;renderWirePaths()};const end=()=>{card.classList.remove("dragging");card.releasePointerCapture?.(event.pointerId);card.removeEventListener("pointermove",move);card.removeEventListener("pointerup",end);saveCustomWiring(customWiring())};card.addEventListener("pointermove",move);card.addEventListener("pointerup",end)};card.onclick=()=>{$$('[data-custom="true"]',bench).forEach(node=>node.classList.remove("selected"));card.classList.add("selected");state.wiringSelected=null;updateWiringSelection()}})}
function addWiringComponent(type,x=12,y=12){const definition=customWiringTypes[type];if(!definition)return;pushWiringHistory();const existing=customWiring(),number=existing.filter(item=>item.type===type).length+1;existing.push({id:`${type.toUpperCase()}${number}`,type,label:definition.label,terminals:definition.terminals,custom:true,x,y});saveCustomWiring(existing);renderWiringWorkbench();showToast(`${definition.label} adicionado à bancada`)}
function selectWireTerminal(terminal){
  if(!state.wiringSelected){state.wiringSelected=terminal;updateWiringSelection();renderWirePaths();return}
  if(state.wiringSelected===terminal){state.wiringSelected=null;updateWiringSelection();renderWirePaths();return}
  const edge=[state.wiringSelected,terminal],wires=currentWires(),firstPart=edge[0].split(":")[0],secondPart=edge[1].split(":")[0];
  if(firstPart==="PIN"&&secondPart==="PIN"){showToast("Escolha um componente para completar o circuito");state.wiringSelected=null;updateWiringSelection();return}
  if(firstPart===secondPart){showToast("Não é possível ligar um componente a ele mesmo");state.wiringSelected=null;updateWiringSelection();return}
  if(!wires.some(item=>edgeKey(item)===edgeKey(edge))){pushWiringHistory();wires.push(edge);localStorage.setItem("nexo-wiring",JSON.stringify(state.wiringByProject));showToast(`Fio ligado: ${terminalLabel(edge[0])} → ${terminalLabel(edge[1])}`)}
  state.wiringSelected=null;updateWiringSelection();renderWirePaths();renderCircuitResult(circuitIsComplete());
}
function updateWiringSelection(){const selected=state.wiringSelected,box=$("#wiringSelection");box.classList.toggle("active",!!selected);box.innerHTML=selected?`<span>2</span><strong>${terminalLabel(selected)} selecionado</strong><small>Agora escolha o terminal de destino.</small>`:`<span>1</span><strong>Selecione o primeiro terminal</strong><small>O próximo clique completará o fio.</small>`;$$('[data-terminal]',$("#wiringBoard")).forEach(el=>el.classList.toggle("selected",el.dataset.terminal===selected))}
function terminalElement(id){return $$('[data-terminal]',$("#wiringBoard")).find(el=>el.dataset.terminal===id)}
function renderWirePaths(){
  const svg=$("#wireLayer"),board=$("#wiringBoard");if(!svg||!board)return;const area=board.getBoundingClientRect();svg.setAttribute("viewBox",`0 0 ${area.width} ${area.height}`);
  svg.innerHTML=currentWires().map((edge,index)=>{const a=terminalElement(edge[0]),b=terminalElement(edge[1]);if(!a||!b)return "";const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),x1=ar.left+ar.width/2-area.left,y1=ar.top+ar.height/2-area.top,x2=br.left+br.width/2-area.left,y2=br.top+br.height/2-area.top,mx=(x1+x2)/2;return `<path d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" stroke="${wireColors[index%wireColors.length]}"/><circle cx="${x1}" cy="${y1}" r="4" fill="${wireColors[index%wireColors.length]}"/><circle cx="${x2}" cy="${y2}" r="4" fill="${wireColors[index%wireColors.length]}"/>`}).join("");
}
function circuitIsComplete(){const actual=new Set(currentWires().map(edgeKey));return circuitPresets[currentProject().id].every(edge=>actual.has(edgeKey(edge)))}
function renderCircuitResult(powered=false){const box=$("#circuitResult"),count=currentWires().length,total=circuitPresets[currentProject().id].length,complete=circuitIsComplete();$$('.circuit-component',$("#circuitComponents")).forEach(el=>el.classList.toggle("powered",powered&&complete));box.className=`circuit-result ${complete?"complete":""} ${powered&&complete?"powered":""}`;box.innerHTML=complete?`<span>${powered?"⚡":"✓"}</span><div><strong>${powered?"Circuito energizado na simulação":"Montagem completa"}</strong><p>${powered?"Os componentes responderam conforme o projeto. Agora compare com o código no laboratório.":"Todas as ligações esperadas foram encontradas. Clique em Testar circuito."}</p></div>`:`<span>${count}</span><div><strong>${count} de ${total} ligações esperadas</strong><p>Continue conectando os terminais ou carregue o exemplo para estudar o circuito completo.</p></div>`}
function loadWiringExample(){pushWiringHistory();state.wiringByProject[wiringStorageId()]=circuitPresets[currentProject().id].map(edge=>[...edge]);localStorage.setItem("nexo-wiring",JSON.stringify(state.wiringByProject));state.wiringSelected=null;updateWiringSelection();renderWirePaths();renderCircuitResult(true);showToast("Exemplo de ligação carregado")}
function renderEspMode(){
  $$('[data-esp-mode]').forEach(button=>button.classList.toggle("active",button.dataset.espMode===state.espMode));
  const model=$("#espModelPanel"), wiring=$("#espWiringPanel"), program=$("#espProgramPanel"), ar=$("#espARPanel"), mobileAr=$("#espMobileARPanel");
  if(model)model.hidden=state.espMode!=="model";
  if(wiring)wiring.hidden=state.espMode!=="wiring";
  if(program)program.hidden=state.espMode!=="program";
  if(ar)ar.hidden=state.espMode!=="ar";
  if(mobileAr)mobileAr.hidden=state.espMode!=="mobilear";
  $(".scene-controls").hidden=state.espMode!=="model";
  if(state.espMode==="wiring")requestAnimationFrame(renderWirePaths);
  if(state.espMode==="program")render3DProgrammer();
  if(state.espMode==="ar")window.CodaAR?.activate?.();
  if(state.espMode==="mobilear")window.CodaAR?.activateMobile?.();
}
function save3DPrototype(){localStorage.setItem("nexo-3d-prototype",JSON.stringify(state.threeDComponents));localStorage.setItem("nexo-3d-wires",JSON.stringify(state.threeDWires||[]))}
const prototypePins=["3V3","VIN","GND","GPIO2","GPIO4","GPIO5","GPIO16","GPIO17","GPIO18","GPIO19","GPIO21","GPIO22","GPIO23","GPIO25","GPIO26","GPIO27","GPIO32","GPIO34","GPIO35"],prototypePinSides={left:["3V3","GND","GPIO2","GPIO4","GPIO5","GPIO16","GPIO17","GPIO18","GPIO19","GPIO21"],right:["VIN","GND_R","GPIO22","GPIO23","GPIO25","GPIO26","GPIO27","GPIO32","GPIO34","GPIO35"]};
function prototypeTerminalLabel(id){const [part,pin]=String(id).split(":");return part==="ESP32"?(pin==="GND_R"?"GND (direita)":pin):`${state.threeDComponents.find(item=>String(item.id)===part)?.label||"Componente"} ${pin}`}
function prototypeWireEnds(wire){return Array.isArray(wire)?wire:[wire?.a,wire?.b]}
function prototypeWireKey(edge){return prototypeWireEnds(edge).filter(Boolean).sort().join("|")}
function prototypeTerminalElement(id){return $$('[data-prototype-terminal]').find(node=>node.dataset.prototypeTerminal===id)}
function renderPrototypeWires(){const svg=$("#prototypeWireLayer"),stage=$("#prototypeStage");if(!svg||!stage)return;const rect=stage.getBoundingClientRect();svg.setAttribute("viewBox",`0 0 ${rect.width} ${rect.height}`);svg.innerHTML=(state.threeDWires||[]).map((wire,index)=>{const edge=prototypeWireEnds(wire),a=prototypeTerminalElement(edge[0]),b=prototypeTerminalElement(edge[1]);if(!a||!b)return "";const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),x1=ar.left+ar.width/2-rect.left,y1=ar.top+ar.height/2-rect.top,x2=br.left+br.width/2-rect.left,y2=br.top+br.height/2-rect.top,m=(x1+x2)/2,color=wire.color||wireColors[index%wireColors.length];return `<path data-prototype-wire-index="${index}" d="M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}" stroke="${color}"/><circle cx="${x1}" cy="${y1}" r="4" fill="${color}"/><circle cx="${x2}" cy="${y2}" r="4" fill="${color}"/>`}).join("");$$('[data-prototype-wire-index]',svg).forEach(path=>path.onclick=event=>{event.stopPropagation();state.threeDSelectedWire=Number(path.dataset.prototypeWireIndex);render3DProgrammer();showToast("Fio selecionado — escolha uma nova cor no inspetor")})}
function connectPrototypeTerminals(source,target){if(!source||!target||source===target)return;if(source.split(":")[0]===target.split(":")[0]){showToast("Não é possível ligar dois terminais do mesmo componente");return}const edge=[source,target];if((state.threeDWires||[]).some(wire=>prototypeWireKey(wire)===prototypeWireKey(edge))){showToast("Esses terminais já estão conectados");return}const candidate=[...(state.threeDWires||[]),{a:source,b:target}];const evaluation=esp32CircuitLogic.evaluateCircuit({components:state.threeDComponents,wires:candidate});if(evaluation.faults.length){showToast(evaluation.faults[0]);const output=$("#prototypeOutput");if(output)output.textContent=`Ligação recusada: ${evaluation.faults[0]}`;return}state.threeDWires.push({a:source,b:target,color:$("#prototypeWireColor")?.value||"#ff5f6d"});save3DPrototype();render3DProgrammer();showToast(`Fio ligado: ${prototypeTerminalLabel(source)} → ${prototypeTerminalLabel(target)}`)}
function bindPrototypeWireDrag(){const stage=$("#prototypeStage"),svg=$("#prototypeWireLayer");if(!stage||!svg)return;let active=null;$$('[data-prototype-terminal]').forEach(node=>{node.onclick=event=>{event.stopPropagation();if(node.dataset.skipClick){delete node.dataset.skipClick;return}const chosen=node.dataset.prototypeTerminal;if(!state.threeDWireSelection){state.threeDWireSelection=chosen;node.classList.add("selected");showToast(`${prototypeTerminalLabel(chosen)} selecionado — escolha o terminal de destino`);const output=$("#prototypeOutput");if(output)output.textContent=`Origem: ${prototypeTerminalLabel(chosen)} • escolha o terminal de destino.`;return}const first=state.threeDWireSelection;state.threeDWireSelection=null;$$('[data-prototype-terminal]').forEach(item=>item.classList.remove("selected"));if(first!==chosen)connectPrototypeTerminals(first,chosen)};node.onpointerdown=event=>{event.preventDefault();event.stopPropagation();active={source:node};node.setPointerCapture?.(event.pointerId);node.classList.add("dragging-terminal");const r=node.getBoundingClientRect(),s=stage.getBoundingClientRect();svg.insertAdjacentHTML("beforeend",`<path class="prototype-wire-preview" data-prototype-preview d="M ${r.left+r.width/2-s.left} ${r.top+r.height/2-s.top} L ${r.left+r.width/2-s.left} ${r.top+r.height/2-s.top}" stroke="#56b8ff"/>`)};node.onpointermove=event=>{if(!active)return;const r=active.source.getBoundingClientRect(),s=stage.getBoundingClientRect(),preview=$("[data-prototype-preview]",svg);if(preview)preview.setAttribute("d",`M ${r.left+r.width/2-s.left} ${r.top+r.height/2-s.top} L ${event.clientX-s.left} ${event.clientY-s.top}`)};node.onpointerup=event=>{if(!active)return;const source=active.source,target=document.elementFromPoint(event.clientX,event.clientY)?.closest?.("[data-prototype-terminal]");$("[data-prototype-preview]",svg)?.remove();source.classList.remove("dragging-terminal");active=null;if(target&&target!==source){source.dataset.skipClick="1";connectPrototypeTerminals(source.dataset.prototypeTerminal,target.dataset.prototypeTerminal)}}})}
function loadPrototypeExample(){
  if(state.threeDComponents.length&&!confirm("O exemplo vai substituir os componentes e fios atuais. Quer continuar?"))return;
  state.threeDSimulating=false;clearInterval(state.threeDTimer);state.threeDTimer=null;state.threeDComponents=[];state.threeDWires=[];state.threeDSelected=null;state.threeDSelectedWire=null;
  create3DComponent("resistor",{label:"Resistor 220 Ω",pin:"GPIO2",x:22,y:72,color:"#e7b56d",value:100});
  create3DComponent("led",{label:"LED verde",pin:"GPIO2",x:78,y:72,color:"#b9ff3b",active:false});
  const resistor=state.threeDComponents.find(item=>item.type==="resistor"),led=state.threeDComponents.find(item=>item.type==="led");
  state.threeDWires=[{a:"ESP32:GPIO2",b:`${resistor.id}:A`,color:"#ffd84d"},{a:`${resistor.id}:B`,b:`${led.id}:A`,color:"#ff9d52"},{a:`${led.id}:B`,b:"ESP32:GND",color:"#71808a"}];
  state.threeDSelected=led.id;state.threeDTemplateCode="";save3DPrototype();render3DProgrammer();showToast("Exemplo carregado: GPIO2 → resistor → LED → GND");
}
function create3DComponent(type,settings={}){
  const number=state.threeDComponents.length+1,pins={led:"GPIO2",rgb:"GPIO16",button:"GPIO4",resistor:"GPIO2 ↔ GND",capacitor:"3V3 ↔ GND",battery:"3V3 ↔ GND",potentiometer:"GPIO34",sensor:"GPIO35",temperature:"GPIO35",servo:"GPIO18",motor:"GPIO19",display:"GPIO21",relay:"GPIO23",buzzer:"GPIO25"};
  const defaults={resistor:100,battery:100,potentiometer:2048,sensor:1800,temperature:24,servo:90,motor:0,display:"Olá, coda!"};
  const slot=number-1,defaultX=slot%2===0?20:80,defaultY=68+Math.floor(slot/2)%3*10;
  const item={id:Date.now()+Math.random(),type,label:settings.label||`${componentNames[type]} ${number}`,pin:settings.pin||pins[type]||"GPIO2",color:settings.color||"#b9ff3b",x:settings.x??defaultX,y:settings.y??defaultY,rotation:settings.rotation??-8,scale:settings.scale??1,active:settings.active??false,value:settings.value??defaults[type]??0};
  state.threeDComponents.push(item);state.threeDSelected=item.id;state.threeDTemplateCode=settings.code||"";save3DPrototype();render3DProgrammer();
}
function prototypeTerminalDisplay(type,pin){return type==="led"?(pin==="A"?"A +":"K −"):pin}
function prototypeComponentTerminals(type){return type==="sensor"?["VCC","TRIG","ECHO","GND"]:type==="rgb"?["R","G","B","GND"]:type==="button"?["1","2"]:type==="display"?["VCC","GND","SDA","SCL"]:type==="battery"?["+","-"]:type==="capacitor"?["+","-"]:type==="temperature"||type==="potentiometer"?["VCC","SIG","GND"]:type==="servo"||type==="relay"?["VCC","SIG","GND"]:type==="buzzer"?["SIG","GND"]:type==="motor"?["+","-"]:["A","B"]}
function load3DTemplate(id){const item=all3DTemplates().find(template=>template.id===id);if(!item)return;state.threeDComponents=[];state.threeDWires=[];create3DComponent(item.type,{label:item.title,pin:item.pin,color:item.color,x:64,y:49,rotation:-8,scale:1.15,code:item.code});showToast(`Projeto 3D “${item.title}” carregado`)}
function generated3DCode(){
  if(state.threeDTemplateCode&&state.threeDComponents.length===1)return state.threeDTemplateCode;
  const evaluation=esp32CircuitLogic.evaluateCircuit({components:state.threeDComponents,wires:state.threeDWires||[]});
  if(!evaluation.canRun)return `# Circuito não liberado: ${evaluation.message}\n# Conecte e valide os componentes no Circuit Lab antes de executar.`;
  const allowed=new Set([...evaluation.readyLedIds,...evaluation.activeConnectedIds]);
  evaluation.leds.filter(item=>item.ok).forEach(item=>item.path.forEach(edge=>{if(edge.componentId)allowed.add(edge.componentId)}));
  const imports=new Set(["from machine import Pin"]),setup=[],loop=[];
  state.threeDComponents.filter(item=>allowed.has(String(item.id))).forEach((item,index)=>{
    const pin=Number(String(item.pin).replace(/\D/g,""))||2,name=`item_${index+1}`,label=String(item.label).replace(/["\\]/g," ");
    if(["led","relay"].includes(item.type)){setup.push(`${name} = Pin(${pin}, Pin.OUT)`);loop.push(`${name}.value(not ${name}.value())`)}
    else if(item.type==="rgb"){imports.add("from machine import PWM");setup.push(`${name}_r = PWM(Pin(${pin}), freq=1000)\n${name}_g = PWM(Pin(${pin+1}), freq=1000)\n${name}_b = PWM(Pin(${pin+2}), freq=1000)`);loop.push(`${name}_r.duty(1023); ${name}_g.duty(250); ${name}_b.duty(700)`)}
    else if(item.type==="button"){setup.push(`${name} = Pin(${pin}, Pin.IN, Pin.PULL_UP)`);loop.push(`print("${label}:", ${name}.value())`)}
    else if(["sensor","potentiometer","temperature"].includes(item.type)){imports.add("from machine import ADC");setup.push(`${name} = ADC(Pin(${pin}))`);loop.push(`print("${label}:", ${name}.read())`)}
    else if(["servo","buzzer","motor"].includes(item.type)){imports.add("from machine import PWM");setup.push(`${name} = PWM(Pin(${pin}), freq=${item.type==="servo"?50:item.type==="buzzer"?880:1000})`);loop.push(`${name}.duty(${item.type==="servo"?77:item.type==="buzzer"?220:640})`)}
    else if(item.type==="display"){imports.add("from machine import I2C");setup.push(`${name} = I2C(0, scl=Pin(22), sda=Pin(${pin}))`);loop.push(`print("I2C:", ${name}.scan())`)}
  });
  return `${[...imports].join("\n")}\nfrom time import sleep\n\n${setup.join("\n")}\n\nwhile True:\n${(loop.length?loop:["print('Adicione componentes ao projeto')"]).map(line=>`    ${line}`).join("\n")}\n    sleep(0.5)`;
}
function componentInteraction(selected){
  if(["led","rgb","button","relay","buzzer"].includes(selected.type))return `<div class="component-live-control"><small>INTERAÇÃO</small><button type="button" id="interact3DButton">${selected.active?"Desativar":"Ativar"} ${escapeHtml(componentNames[selected.type])}</button></div>`;
  if(selected.type==="display")return `<div class="component-live-control"><small>TEXTO DO DISPLAY</small><input id="interact3DText" maxlength="40" value="${escapeHtml(String(selected.value||""))}"></div>`;
  const ranges={resistor:[0,100,1,"Resistência (%)"],battery:[0,100,1,"Tensão da fonte (%)"],potentiometer:[0,4095,1,"Leitura ADC"],sensor:[0,4095,1,"Leitura simulada"],temperature:[-10,60,.5,"Temperatura (°C)"],servo:[0,180,1,"Ângulo (°)"],motor:[0,100,1,"Velocidade (%)"]},config=ranges[selected.type];
  if(!config)return "";
  const suffix=selected.type==="resistor"?`<span class="electrical-value">${resistorOhms(selected.value)} Ω</span>`:selected.type==="battery"?`<span class="electrical-value">${(3.3*Number(selected.value||0)/100).toFixed(2)} V</span>`:selected.type==="battery"?`<span class="electrical-value">${(3.3*Number(selected.value||0)/100).toFixed(2)} V</span>`:`<b>${Number(selected.value)}${selected.type==="temperature"?" °C":selected.type==="servo"?"°":selected.type==="motor"?"%":""}</b>`;
  return `<div class="component-live-control"><small>${config[3]}</small><input id="interact3DRange" type="range" min="${config[0]}" max="${config[1]}" step="${config[2]}" value="${Number(selected.value)}"><div class="live-reading"><b>${Number(selected.value)}${selected.type==="resistor"?"%":""}</b>${suffix}</div></div>`;
}
function resistorOhms(percent){return Math.max(1,Math.round(220*(Number(percent||0)/100)))}
function electricalAnalysis(){
  const result=esp32CircuitLogic.evaluateCircuit({components:state.threeDComponents,wires:state.threeDWires||[]});
  if(result.faults.length)return `⚠ ${result.faults.join("; ")}`;
  const loop=result.leds.find(item=>item.ok);
  if(loop)return `Caminho fechado • ${loop.voltage.toFixed(1)} V • R ${loop.ohms} Ω • I ${loop.currentMa.toFixed(1)} mA • P ${loop.powerW.toFixed(3)} W • ${result.readyLedIds.length} LED(s) com circuito seguro`;
  if(result.leds.length)return `⚠ LED apagado: ${result.leds[0].reason}`;
  return result.canRun?"Pinos e ligações compatíveis • simulação liberada":result.message;
}
function simulationSummary(){
  if(!state.threeDComponents.length)return "Alimentação lógica: 3,3 V • Adicione componentes para iniciar.";
  const evaluation=esp32CircuitLogic.evaluateCircuit({components:state.threeDComponents,wires:state.threeDWires||[]});
  const parts=state.threeDComponents.map(item=>{if(item.type==="resistor")return `${item.label}: ${resistorOhms(item.value)} Ω`;if(item.type==="battery")return `${item.label}: ${(3.3*Number(item.value??100)/100).toFixed(2)} V`;if(item.type==="display")return `${item.label}: “${item.value||""}”`;if(["potentiometer","sensor","temperature","servo","motor"].includes(item.type))return `${item.label}: ${item.value}${item.type==="temperature"?" °C":item.type==="servo"?"°":item.type==="motor"?"%":""}`;if(item.type==="led")return `${item.label}: ${evaluation.readyLedIds.includes(String(item.id))?(item.active?"aceso":"apagado"):"sem caminho elétrico"}`;return `${item.label}: ${item.active?"ativo":"inativo"}`});
  return `${electricalAnalysis()} • ${parts.join(" • ")}`;
}
function set3DSimulation(running){
  if(running&&!state.threeDComponents.length){showToast("Adicione pelo menos um componente antes de testar");return}
  const evaluation=esp32CircuitLogic.evaluateCircuit({components:state.threeDComponents,wires:state.threeDWires||[]});
  if(running&&!evaluation.canRun){showToast(evaluation.message);$("#prototypeOutput").textContent=evaluation.message;return}
  state.threeDSimulating=running;clearInterval(state.threeDTimer);state.threeDTimer=null;
  if(running){let phase=false,tick=0;state.threeDTimer=setInterval(()=>{const live=esp32CircuitLogic.evaluateCircuit({components:state.threeDComponents,wires:state.threeDWires||[]});if(!live.canRun){set3DSimulation(false);showToast(live.message);return}const readyLedIds=new Set(live.readyLedIds),readyIds=new Set(live.activeConnectedIds);phase=!phase;tick++;state.threeDComponents.forEach(item=>{if(item.type==="led")item.active=readyLedIds.has(String(item.id))&&phase;if(item.type==="rgb")item.active=readyIds.has(String(item.id))&&phase;if(item.type==="sensor"&&readyIds.has(String(item.id)))item.value=Math.round(1800+Math.sin(tick/2)*800);if(item.type==="temperature"&&readyIds.has(String(item.id)))item.value=(24+Math.sin(tick/4)*2).toFixed(1);if(item.type==="motor"&&readyIds.has(String(item.id))&&Number(item.value)>0)item.rotation=(Number(item.rotation)+22)%360});save3DPrototype();render3DProgrammer()},900)}
  render3DProgrammer();
}
let prototypeTopView=false;
function prototypeComponentTransform(item){return `--component-rotation:${item.rotation}deg;--component-scale:${item.scale}`}
function updatePrototypeView(){
  const stage=$("#prototypeStage"),button=$("#prototypeViewToggle");if(!stage||!button)return;
  stage.classList.toggle("top-view",prototypeTopView);button.setAttribute("aria-pressed",String(prototypeTopView));button.textContent=prototypeTopView?"Vista 3D":"Vista superior";
}
function bindPrototypeDrag(button,item){
  button.onpointerdown=event=>{
    if(event.button!==0)return;const stage=$("#prototypeStage"),wrap=button.closest(".prototype-component-wrap"),area=stage.getBoundingClientRect();let startX=event.clientX,startY=event.clientY,moved=false;
    button.setPointerCapture(event.pointerId);button.classList.add("dragging");
    button.onpointermove=move=>{const dx=move.clientX-startX,dy=move.clientY-startY;if(Math.hypot(dx,dy)<4&&!moved)return;moved=true;item.x=Math.max(8,Math.min(92,item.x+dx/area.width*100));item.y=Math.max(20,Math.min(86,item.y+dy/area.height*100));wrap.style.setProperty("--component-x",`${item.x}%`);wrap.style.setProperty("--component-y",`${item.y}%`);startX=move.clientX;startY=move.clientY;renderPrototypeWires()};
    button.onpointerup=()=>{button.classList.remove("dragging");button.onpointermove=null;button.onpointerup=null;if(moved){state.threeDSelected=item.id;state.threeDTemplateCode="";save3DPrototype();render3DProgrammer()}};
  };
}
function render3DProgrammer(){
  if(!$("#prototypeComponents"))return;const selected=state.threeDComponents.find(item=>item.id===state.threeDSelected);
  const circuitEvaluation=esp32CircuitLogic.evaluateCircuit({components:state.threeDComponents,wires:state.threeDWires||[]});
  if(state.threeDSimulating&&!circuitEvaluation.canRun){state.threeDSimulating=false;clearInterval(state.threeDTimer);state.threeDTimer=null}
  const readyLedIds=new Set(circuitEvaluation.readyLedIds),readyActiveIds=new Set(circuitEvaluation.activeConnectedIds);
  let clearedInvalidActiveState=false;
  state.threeDComponents.forEach(item=>{const controlled=["led","rgb","button","relay","buzzer"].includes(item.type);const ready=item.type==="led"?readyLedIds.has(String(item.id)):controlled?readyActiveIds.has(String(item.id)):true;if(item.active&&!ready){item.active=false;clearedInvalidActiveState=true}});
  if(clearedInvalidActiveState)save3DPrototype();
  $("#prototypeEmpty").hidden=state.threeDComponents.length>0;
  const hasCircuit=state.threeDComponents.length>0;
  const output=$("#prototypeOutput");
  $("#prototypeIoBank").innerHTML="";$(".prototype-pin-bank-left").innerHTML=prototypePinSides.left.map(pin=>`<button type="button" class="prototype-board-terminal ${pin.startsWith("GND")?"power":""}" data-prototype-terminal="ESP32:${pin}" aria-label="${pin==="GND_R"?"GND direito":pin}">${pin==="GND_R"?"GND":pin}</button>`).join("");$(".prototype-pin-bank-right").innerHTML=prototypePinSides.right.map(pin=>`<button type="button" class="prototype-board-terminal ${pin.startsWith("GND")?"power":""}" data-prototype-terminal="ESP32:${pin}" aria-label="${pin==="GND_R"?"GND direito":pin}">${pin==="GND_R"?"GND":pin}</button>`).join("");
  $("#prototypeComponents").innerHTML=state.threeDComponents.map(item=>`<div class="prototype-component-wrap" data-prototype-wrap="${item.id}" style="--component-x:${item.x}%;--component-y:${item.y}%;"><button aria-label="Selecionar e mover ${escapeHtml(item.label)}" class="prototype-component type-${item.type} ${item.active?"active":""} ${state.threeDSimulating?"simulating":""} ${item.id===state.threeDSelected?"selected":""}" data-prototype-id="${item.id}" style="--component-color:${item.color};${prototypeComponentTransform(item)}"><i></i><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.pin)}</small><em>${escapeHtml(componentNames[item.type]||item.type)}</em></button><div class="prototype-terminals">${prototypeComponentTerminals(item.type).map(pin=>`<button type="button" data-prototype-terminal="${item.id}:${pin}" aria-label="${item.type==="led"?(pin==="A"?"Ânodo do LED":"Cátodo do LED"):pin}"><i></i>${prototypeTerminalDisplay(item.type,pin)}</button>`).join("")}</div></div>`).join("");
  $$('[data-prototype-id]').forEach(button=>{const item=state.threeDComponents.find(entry=>String(entry.id)===button.dataset.prototypeId);button.onclick=()=>{state.threeDSelected=Number(button.dataset.prototypeId);render3DProgrammer()};button.ondblclick=()=>{if(item&&["led","rgb","button","relay","buzzer"].includes(item.type)){const evaluation=esp32CircuitLogic.evaluateCircuit({components:state.threeDComponents,wires:state.threeDWires||[]});const ready=item.type==="led"?evaluation.readyLedIds.includes(String(item.id)):evaluation.activeConnectedIds.includes(String(item.id));if(!ready){showToast("Esse componente ainda não tem as ligações necessárias");return}item.active=!item.active;save3DPrototype();render3DProgrammer()}};if(item)bindPrototypeDrag(button,item)});bindPrototypeWireDrag();requestAnimationFrame(renderPrototypeWires);
  $("#componentInspector").innerHTML=selected?`<span class="kicker">PROPRIEDADES E INTERAÇÃO</span><h3>${escapeHtml(selected.label)}</h3><p class="inspector-tip">Dê dois cliques no objeto para ativar ou use o controle abaixo.</p><label>Nome<input data-3d-property="label" value="${escapeHtml(selected.label)}"></label>${["resistor","capacitor","battery"].includes(selected.type)?`<p class="inspector-tip">As ligações desta peça são definidas pelos fios.</p>`:`<label>GPIO<input data-3d-property="pin" value="${escapeHtml(selected.pin)}"></label>`}<label>Cor<input data-3d-property="color" type="color" value="${selected.color}"></label><label>Posição horizontal<input data-3d-property="x" type="range" min="12" max="88" value="${selected.x}"></label><label>Posição vertical<input data-3d-property="y" type="range" min="16" max="84" value="${selected.y}"></label><label>Rotação<input data-3d-property="rotation" type="range" min="-180" max="180" value="${selected.rotation}"></label><label>Tamanho<input data-3d-property="scale" type="range" min="0.6" max="1.8" step="0.05" value="${selected.scale}"></label>${componentInteraction(selected)}<button class="danger" id="remove3DComponent">Remover componente</button>`:`<span class="kicker">GUIA DA BANCADA</span><h3>Selecione um componente</h3><p class="inspector-tip">Use a biblioteca para adicionar peças. Depois, selecione um componente para editar GPIO, posição, tamanho e valores simulados.</p><ol class="inspector-steps"><li><b>Adicione</b><span>Comece por LED + resistor.</span></li><li><b>Conecte</b><span>GPIO2 → resistor → LED → GND.</span></li><li><b>Teste</b><span>O LED deve acender sem sobrecorrente.</span></li></ol><div class="gpio-legend"><strong>Legenda dos pinos</strong><span><i class="gpio-power"></i>Alimentação e GND</span><span><i class="gpio-signal"></i>Sinal digital / PWM</span><span><i class="gpio-analog"></i>Entrada analógica ADC</span></div>`;
  if(Number.isInteger(state.threeDSelectedWire)&&(state.threeDWires[state.threeDSelectedWire])){$("#componentInspector").insertAdjacentHTML("beforeend",`<div class="wire-inspector"><span class="kicker">FIO SELECIONADO</span><label>Cor do fio<input id="prototypeWireColor" type="color" value="${state.threeDWires[state.threeDSelectedWire].color||wireColors[state.threeDSelectedWire%wireColors.length]}"></label><button type="button" class="danger" id="remove3DWire">Remover fio</button></div>`);$("#prototypeWireColor").oninput=event=>{state.threeDWires[state.threeDSelectedWire].color=event.target.value;save3DPrototype();renderPrototypeWires()};$("#remove3DWire").onclick=()=>{state.threeDWires.splice(state.threeDSelectedWire,1);state.threeDSelectedWire=null;save3DPrototype();render3DProgrammer()}}
  $$('[data-3d-property]').forEach(input=>{input.oninput=()=>{const prop=input.dataset['3dProperty'];selected[prop]=["x","y","rotation","scale"].includes(prop)?Number(input.value):input.value;const node=$(`[data-prototype-id="${selected.id}"]`),wrap=$(`[data-prototype-wrap="${selected.id}"]`);if(node){wrap?.style.setProperty("--component-x",`${selected.x}%`);wrap?.style.setProperty("--component-y",`${selected.y}%`);node.style.setProperty("--component-rotation",`${selected.rotation}deg`);node.style.setProperty("--component-scale",selected.scale);node.style.setProperty("--component-color",selected.color);$("strong",node).textContent=selected.label;$("small",node).textContent=selected.pin}state.threeDTemplateCode="";save3DPrototype()};input.onchange=render3DProgrammer});
  if($("#interact3DButton"))$("#interact3DButton").onclick=()=>{const evaluation=esp32CircuitLogic.evaluateCircuit({components:state.threeDComponents,wires:state.threeDWires||[]});const ready=selected.type==="led"?evaluation.readyLedIds.includes(String(selected.id)):evaluation.activeConnectedIds.includes(String(selected.id));if(!ready){showToast("Esse componente ainda não tem as ligações necessárias");return}selected.active=!selected.active;save3DPrototype();render3DProgrammer()};
  if($("#interact3DRange"))$("#interact3DRange").oninput=event=>{selected.value=Number(event.target.value);save3DPrototype();render3DProgrammer()};
  if($("#interact3DText"))$("#interact3DText").oninput=event=>{selected.value=event.target.value;save3DPrototype();$("#prototypeOutput").textContent=simulationSummary()};
  if($("#remove3DComponent"))$("#remove3DComponent").onclick=()=>{state.threeDComponents=state.threeDComponents.filter(item=>item.id!==selected.id);state.threeDWires=(state.threeDWires||[]).filter(wire=>!prototypeWireEnds(wire).some(endpoint=>endpoint?.startsWith(`${selected.id}:`)));state.threeDSelected=state.threeDComponents[0]?.id||null;state.threeDTemplateCode="";save3DPrototype();render3DProgrammer()};
  $("#prototypeStage").onkeydown=event=>{if(!selected||(event.key!=="Delete"&&event.key!=="Backspace"))return;state.threeDComponents=state.threeDComponents.filter(item=>item.id!==selected.id);state.threeDWires=(state.threeDWires||[]).filter(wire=>!prototypeWireEnds(wire).some(endpoint=>endpoint?.startsWith(`${selected.id}:`)));state.threeDSelected=state.threeDComponents[0]?.id||null;state.threeDTemplateCode="";save3DPrototype();render3DProgrammer();showToast("Componente removido do protótipo")};
  $("#prototypeComponentCount").textContent=`${state.threeDComponents.length} ${state.threeDComponents.length===1?"componente":"componentes"} • ${(state.threeDWires||[]).length} fios`;$("#prototypeSimulationStatus").textContent=state.threeDSimulating?"Simulação em execução":circuitEvaluation.canRun?"Circuito pronto":state.threeDComponents.length?"Faltam ligações":"Simulação parada";$("#prototypeSimulationStatus").classList.toggle("active",state.threeDSimulating);$("#prototypeEspLed").classList.toggle("active",state.threeDSimulating);if(output){const heading=state.threeDSimulating?"Simulação em execução":circuitEvaluation.faults.length?"Ligação incorreta":circuitEvaluation.canRun?"Circuito pronto":hasCircuit?"Faltam ligações":"Pronto para começar";const detail=hasCircuit?(circuitEvaluation.canRun?electricalAnalysis():circuitEvaluation.message):"Adicione componentes ou carregue o exemplo guiado.";output.innerHTML=`<b>${escapeHtml(heading)}</b><span>${escapeHtml(detail)}</span>`;}
  $("#play3DSimulation").textContent=state.threeDSimulating?"■ Parar simulação":"▶ Testar circuito";$("#play3DSimulation").disabled=state.threeDSimulating?false:!circuitEvaluation.canRun;$("#play3DSimulation").onclick=()=>set3DSimulation(!state.threeDSimulating);$("#loadPrototypeExample").onclick=loadPrototypeExample;$("#loadPrototypeExampleToolbar").onclick=loadPrototypeExample;$("#reset3DPrototype").onclick=()=>{if(!state.threeDComponents.length||confirm("Limpar todos os componentes deste protótipo?")){set3DSimulation(false);state.threeDComponents=[];state.threeDWires=[];state.threeDSelected=null;state.threeDTemplateCode="";save3DPrototype();render3DProgrammer()}};
  $("#prototypeViewToggle").onclick=()=>{prototypeTopView=!prototypeTopView;updatePrototypeView();requestAnimationFrame(renderPrototypeWires)};updatePrototypeView();
  $("#threeDTemplates").innerHTML=`<div><span class="kicker">PROJETOS CONFIGURADOS PELO PROFESSOR</span><h3>Carregue um modelo pronto</h3></div><div>${all3DTemplates().map(item=>`<button data-3d-template="${item.id}" style="--template-color:${item.color}"><i></i><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.pin)} • ${componentNames[item.type]}</small></span></button>`).join("")}</div>`;$$('[data-3d-template]').forEach(button=>button.onclick=()=>load3DTemplate(button.dataset['3dTemplate']));
  $("#componentPalette").onclick=event=>{const button=event.target.closest("[data-component-type]");if(button)create3DComponent(button.dataset.componentType)};$("#openGenerated3DCode").onclick=()=>{const evaluation=esp32CircuitLogic.evaluateCircuit({components:state.threeDComponents,wires:state.threeDWires||[]});if(!evaluation.canRun){showToast(evaluation.message);return}state.labLanguage="esp32";state.labMode="free";state.activity=null;state.labCode.esp32=generated3DCode();trackLearningEvent("projeto_3d_programado",{courseId:"esp32",components:state.threeDComponents.length});renderLab();goToView("laboratorio");showToast("Código gerado a partir do circuito conectado")};
}
function renderEsp(){createPins();const project=currentProject();$("#espProjects").innerHTML=espProjects.map((item,index)=>`<button class="${index===state.espProject?"active":""}" data-esp="${index}"><i>${item.icon}</i><span><strong>${item.title}</strong><small>${item.subtitle}</small></span></button>`).join("");$$('[data-esp]').forEach(button=>button.addEventListener("click",()=>{state.espProject=Number(button.dataset.esp);state.wiringSelected=null;renderEsp()}));$$(".pin-row i").forEach(pin=>pin.classList.toggle("active",project.pins.includes(pin.dataset.pin)));$("#wiringCard").innerHTML=`<h3>${project.title}</h3><p>${project.description}</p>${project.wires.map(wire=>`<span>${wire}</span>`).join("")}`;$("#userLed").classList.toggle("on",project.id==="blink"||project.id==="traffic");$("#sensorPulse").classList.toggle("active",project.id==="sensor");$("#openEspLab").onclick=()=>{state.labLanguage="esp32";state.labCode.esp32=project.code;state.activity={courseId:"esp32",lesson:Math.min(state.espProject+1,6),instruction:`Personalize o projeto ${project.title} e teste uma alteração.`};renderLab();goToView("laboratorio")};renderWiringWorkbench();render3DProgrammer();renderEspMode();dispatchCoda("esp32",{projectId:project.id,title:project.title,mode:state.espMode})}
let boardX=52,boardZ=-23,boardScale=1,dragging=false,lastX=0,lastY=0;
function updateBoard(){$("#espBoard").style.transform=`translate(-50%,-50%) rotateX(${boardX}deg) rotateZ(${boardZ}deg) scale(${boardScale})`}

const subjectQuizData={
  html:[{l:"Iniciante",q:"Qual elemento representa o conteúdo principal único da página?",o:["<main>","<meta>","<aside>","<style>"],a:0,e:"main identifica o conteúdo principal do documento."},{l:"Intermediário",q:"Qual associação torna um campo de formulário mais acessível?",o:["placeholder e div","label com for e input com id","span e class","title e style"],a:1,e:"for e id criam uma relação programática entre rótulo e campo."},{l:"Avançado",q:"Por que semântica não deve ser escolhida apenas pela aparência?",o:["Porque todos os elementos têm a mesma aparência","Porque significado auxilia acessibilidade, manutenção e indexação","Porque CSS deixa de funcionar","Porque o navegador bloqueia div"],a:1,e:"O significado estrutural é consumido por navegadores, ferramentas e tecnologias assistivas."}],
  css:[{l:"Iniciante",q:"Qual declaração ativa um contêiner Flexbox?",o:["layout:flex","display:flex","position:flex","flex:true"],a:1,e:"display: flex muda o modelo de layout dos filhos."},{l:"Intermediário",q:"No box model padrão, o que é somado à largura declarada?",o:["Somente margem","Padding e borda","Somente conteúdo","Nada"],a:1,e:"Sem border-box, padding e borda aumentam o tamanho final."},{l:"Avançado",q:"Qual fator participa da cascata CSS?",o:["Nome do arquivo apenas","Especificidade e ordem das regras","Velocidade da rede","Texto do HTML"],a:1,e:"Origem, importância, especificidade e ordem determinam a regra aplicada."}],
  javascript:[{l:"Iniciante",q:"Qual declaração permite reatribuir o valor da variável?",o:["const","let","fixed","define"],a:1,e:"let cria uma ligação que pode receber outro valor."},{l:"Intermediário",q:"O que map deve retornar em cada iteração?",o:["Um novo valor para a posição","Apenas true","Um evento DOM","Nenhum valor"],a:0,e:"map constrói um novo array com os valores retornados."},{l:"Avançado",q:"Qual é uma boa separação para uma lista de tarefas?",o:["Entrada, dados e renderização","Tudo dentro de um clique","Somente HTML","Uma variável global por linha"],a:0,e:"Separar modelo, entrada e apresentação facilita testes e manutenção."}],
  typescript:[{l:"Iniciante",q:"Quando os tipos do TypeScript são verificados?",o:["Principalmente antes da execução","Somente depois de publicar","Dentro do CSS","Pelo banco SQL"],a:0,e:"O compilador verifica tipos e gera JavaScript."},{l:"Intermediário",q:"Qual recurso representa duas alternativas de tipo?",o:["Union com |","Loop for","Namespace HTML","Promise.all"],a:0,e:"Uma union descreve valores que podem pertencer a tipos diferentes."},{l:"Avançado",q:"Por que generic pode ser melhor que any?",o:["Remove todo JavaScript","Preserva relações entre tipos","Executa mais rápido sempre","Impede funções"],a:1,e:"Generics mantêm informação de tipo entre entrada, saída e estruturas."}],
  python:[{l:"Iniciante",q:"Como Python delimita os blocos de código?",o:["Por indentação","Por XML","Por ponto final","Por cores"],a:0,e:"A indentação faz parte da sintaxe de blocos."},{l:"Intermediário",q:"Qual estrutura associa chaves a valores?",o:["tuple","dictionary","range","generator"],a:1,e:"Dicionários armazenam pares de chave e valor."},{l:"Avançado",q:"Qual prática fecha um arquivo mesmo quando ocorre erro?",o:["Usar with open(...) ","Usar print","Criar um while infinito","Converter para lista"],a:0,e:"O gerenciador de contexto fecha o recurso automaticamente."}],
  c:[{l:"Iniciante",q:"Qual função marca o início de um programa C comum?",o:["main","start","initWeb","runCss"],a:0,e:"A execução do programa começa em main."},{l:"Intermediário",q:"Como uma string C indica seu final?",o:["Com caractere nulo","Com espaço","Com vírgula","Com tamanho automático obrigatório"],a:0,e:"A convenção usa o byte '\\0' após o último caractere."},{l:"Avançado",q:"O que um ponteiro armazena?",o:["Um endereço de memória","Sempre um texto","Uma regra CSS","Um arquivo inteiro"],a:0,e:"Ponteiros representam endereços e permitem acesso indireto."}],
  cplus:[{l:"Iniciante",q:"Qual objetivo da trilha comparativa C+?",o:["Comparar a evolução de C para C++","Criar outra linguagem oficial","Substituir Java","Ensinar somente HTML"],a:0,e:"C+ é uma ponte didática, não uma linguagem padronizada."},{l:"Intermediário",q:"Qual recurso agrupa campos relacionados em C?",o:["struct","stylesheet","package.json","query"],a:0,e:"struct representa registros com campos relacionados."},{l:"Avançado",q:"Qual vantagem uma classe acrescenta ao modelo?",o:["Encapsular estado e operações","Eliminar todo tipo","Transformar código em CSS","Impedir construção"],a:0,e:"Classes controlam acesso e podem preservar invariantes."}],
  cpp:[{l:"Iniciante",q:"Qual contêiner padrão representa uma sequência dinâmica?",o:["std::vector","std::page","std::gpio","std::query"],a:0,e:"vector gerencia armazenamento dinâmico de elementos."},{l:"Intermediário",q:"O que const comunica em uma interface?",o:["Ausência de modificação permitida naquele contexto","Memória infinita","Execução assíncrona","Herança obrigatória"],a:0,e:"const registra uma restrição de modificação."},{l:"Avançado",q:"Qual ideia vincula recurso ao tempo de vida de um objeto?",o:["RAII","DOM","PWM","SQL"],a:0,e:"RAII adquire no construtor e libera no destrutor."}],
  csharp:[{l:"Iniciante",q:"Em qual plataforma C# é normalmente executado?",o:[".NET","CSSOM","ESP-IDF","SQLite apenas"],a:0,e:"C# é uma linguagem central do ecossistema .NET."},{l:"Intermediário",q:"Qual recurso consulta coleções de forma declarativa?",o:["LINQ","GPIO","Flexbox","JVM"],a:0,e:"LINQ compõe operações de consulta sobre fontes de dados."},{l:"Avançado",q:"O que await evita durante uma operação de espera?",o:["Bloquear desnecessariamente a thread","Criar objetos","Usar exceções","Declarar interfaces"],a:0,e:"await suspende o método até a operação terminar sem bloquear a thread de forma síncrona."}],
  java:[{l:"Iniciante",q:"O que a JVM executa?",o:["Bytecode Java","CSS","SQL puro","Somente HTML"],a:0,e:"O compilador gera bytecode para a máquina virtual."},{l:"Intermediário",q:"Qual coleção não aceita elementos duplicados pelo contrato?",o:["Set","List","ArrayList","StringBuilder"],a:0,e:"Set representa um conjunto de elementos únicos."},{l:"Avançado",q:"Qual recurso fecha streams automaticamente?",o:["try-with-resources","switch","extends","record apenas"],a:0,e:"try-with-resources encerra objetos AutoCloseable."}],
  react:[{l:"Iniciante",q:"O que um componente React descreve?",o:["Uma parte da interface","Uma tabela SQL apenas","Um firmware","Um arquivo PDF"],a:0,e:"Componentes descrevem UI a partir de propriedades e estado."},{l:"Intermediário",q:"Por que listas precisam de key estável?",o:["Para preservar a identidade dos itens","Para mudar a cor","Para acessar Wi-Fi","Para compilar C"],a:0,e:"Keys ajudam o React a reconciliar itens entre renderizações."},{l:"Avançado",q:"Quando um effect é adequado?",o:["Para sincronizar com sistema externo","Para calcular qualquer soma","Para substituir props","Para criar HTML estático"],a:0,e:"Effects conectam o componente a recursos fora do processo de renderização."}],
  reactnative:[{l:"Iniciante",q:"Qual componente substitui uma div em muitos layouts React Native?",o:["View","table","main","canvas HTML"],a:0,e:"View é um contêiner nativo básico."},{l:"Intermediário",q:"Qual componente é adequado para listas longas?",o:["FlatList","Meta","StyleSheet apenas","Alert"],a:0,e:"FlatList virtualiza itens e evita renderizar tudo ao mesmo tempo."},{l:"Avançado",q:"Qual estado deve ser tratado ao consumir uma API móvel?",o:["Carregamento, sucesso, vazio e erro","Somente sucesso","Somente cor","Apenas rotação"],a:0,e:"A rede pode atrasar ou falhar, então a interface precisa representar cada estado."}],
  esp32:[{l:"Iniciante",q:"Qual nível lógico típico dos GPIOs do ESP32?",o:["3,3 V","12 V","110 V","24 V"],a:0,e:"Os GPIOs trabalham em 3,3 V e exigem montagem compatível."},{l:"Intermediário",q:"Para que PWM é usado no controle de LED?",o:["Variar o brilho médio","Criar banco SQL","Trocar HTML","Aumentar a tensão para 12 V"],a:0,e:"O ciclo de trabalho controla a potência média entregue."},{l:"Avançado",q:"Qual fator influencia uma leitura ADC?",o:["Resolução, atenuação e ruído","Nome do CSS","Tamanho do monitor","Versão do HTML"],a:0,e:"A conversão analógica depende das características elétricas e da configuração."}],
  sql:[{l:"Iniciante",q:"Qual comando consulta registros?",o:["SELECT","STYLE","PRINT","IMPORT"],a:0,e:"SELECT projeta dados de uma ou mais fontes."},{l:"Intermediário",q:"Como testar valores nulos?",o:["IS NULL","= NULL sempre","LIKE false","ORDER NULL"],a:0,e:"NULL representa ausência e usa IS NULL ou IS NOT NULL."},{l:"Avançado",q:"O que revisar antes de UPDATE ou DELETE?",o:["Um SELECT com a mesma condição","A cor da tabela","O navegador","Somente o LIMIT de outra consulta"],a:0,e:"Conferir o conjunto afetado reduz alterações acidentais."}]
};
const mockExamDefinitions=[{id:"fundamentos",title:"Fundamentos de Programação",description:"Lógica, estruturas de dados, funções e segurança básica de código.",courses:["javascript","python","c","java","sql"],duration:35},{id:"web",title:"Desenvolvimento Web Integrado",description:"HTML, CSS, JavaScript, TypeScript, React e aplicações móveis.",courses:["html","css","javascript","typescript","react","reactnative"],duration:40},{id:"sistemas",title:"Sistemas, Orientação a Objetos e IoT",description:"C, C++, C#, Java, banco de dados e ESP32.",courses:["c","cplus","cpp","csharp","java","sql","esp32"],duration:45}];
function assignedQuizzes(){const email=analyticsEmail();return (appDatabase?.quizzes||[]).filter(quiz=>quiz.active!==false&&(quiz.target==="todos"||String(quiz.target).toLowerCase()===email))}
function assessmentQuestionsByDifficulty(courseId){const difficulty=$("#quizDifficulty")?.value||"Todas";return (subjectQuizData[courseId]||[]).filter(item=>difficulty==="Todas"||item.l===difficulty)}
function setAssessmentMode(mode){clearInterval(state.mockTimer);state.quizMode=mode;state.quizSubject=null;state.quizQuestions=[];state.quizId=null;state.quizIndex=0;state.quizAnswer=null;renderQuiz()}
function startAssessment({id,title,questions,courseId,type="quiz",duration=0}){clearInterval(state.mockTimer);state.quizId=id;state.quizTitle=title;state.quizQuestions=questions.map(item=>({...item}));state.quizSubject=courseId;state.quizIndex=0;state.quizScore=0;state.quizAnswer=null;state.quizAnswers=[];state.quizStartedAt=Date.now();state.quizResultSaved=false;state.mockRemaining=duration*60;if(duration){state.mockTimer=setInterval(()=>{state.mockRemaining--;updateAssessmentHead();if(state.mockRemaining<=0){clearInterval(state.mockTimer);state.quizIndex=state.quizQuestions.length;renderQuiz()}},1000)}trackLearningEvent("avaliacao_iniciada",{id,title,courseId,type});renderQuiz()}
function startSubjectQuiz(courseId){const course=courseById(courseId),questions=assessmentQuestionsByDifficulty(courseId).map(item=>({...item,courseId}));if(!questions.length){showToast("Não há questões neste nível");return}startAssessment({id:`subject-${courseId}`,title:`Quiz de ${course.name}`,questions,courseId,type:"quiz"})}
function startMockExam(id){const exam=mockExamDefinitions.find(item=>item.id===id);if(!exam)return;const questions=exam.courses.flatMap(courseId=>(subjectQuizData[courseId]||[]).slice(0,2).map(item=>({...item,courseId})));startAssessment({id:`mock-${exam.id}`,title:exam.title,questions,courseId:"integrado",type:"simulado",duration:exam.duration})}
function startAssignedQuiz(id){const quiz=(appDatabase?.quizzes||[]).find(item=>String(item.id)===String(id));if(!quiz)return;startAssessment({id:`assigned-${quiz.id}`,title:quiz.title,questions:quiz.questions||[],courseId:quiz.courseId,type:quiz.type||"quiz",duration:quiz.type==="simulado"?Number(quiz.duration||20):0})}
function updateAssessmentHead(){const head=$("#quizActiveHead");if(!head||!state.quizQuestions.length)return;const course=state.quizSubject==="integrado"?"Conteúdo integrado":courseById(state.quizSubject).name,time=state.mockRemaining?`${String(Math.floor(state.mockRemaining/60)).padStart(2,"0")}:${String(state.mockRemaining%60).padStart(2,"0")}`:"Sem limite de tempo";head.innerHTML=`<button id="leaveAssessment">← Sair</button><div><small>${escapeHtml(course)}</small><strong>${escapeHtml(state.quizTitle)}</strong></div><span>${time}</span>`;$("#leaveAssessment").onclick=resetQuiz}
function renderQuizHome(){
  const active=state.quizQuestions.length>0;$("#subjectQuizPanel").hidden=active||state.quizMode!=="subjects";$("#mockExamPanel").hidden=active||state.quizMode!=="mock";$("#assignedQuizPanel").hidden=active||state.quizMode!=="assigned";$("#quizActiveHead").hidden=!active;$$('[data-assessment-mode]').forEach(button=>button.classList.toggle("active",button.dataset.assessmentMode===state.quizMode));
  $("#quizSubjectGrid").innerHTML=courseBlueprints.map(course=>`<button data-start-subject="${escapeHtml(course.id)}" data-quiz-course-color="${escapeHtml(course.color)}"><span>${course.symbol}</span><div><strong>${escapeHtml(course.name)}</strong><small>${subjectQuizData[course.id]?.length||0} questões • 3 níveis</small></div><i>→</i></button>`).join("");
  $("#mockExamList").innerHTML=mockExamDefinitions.map(exam=>`<article><span>⌁</span><div><small>SIMULADO • ${exam.duration} MIN</small><h3>${escapeHtml(exam.title)}</h3><p>${escapeHtml(exam.description)}</p><b>${exam.courses.length} áreas • ${exam.courses.length*2} questões</b></div><button data-start-mock="${exam.id}">Iniciar prova →</button></article>`).join("");
  const assigned=assignedQuizzes();$("#assignedQuizCount").textContent=assigned.length;$("#assignedQuizList").innerHTML=assigned.length?assigned.map(quiz=>`<article><span>${quiz.type==="simulado"?"⌁":"?"}</span><div><small>${escapeHtml(courseById(quiz.courseId).name.toUpperCase())} • ${(quiz.questions||[]).length} QUESTÕES</small><h3>${escapeHtml(quiz.title)}</h3><p>Enviada por ${escapeHtml(quiz.author||"Professor coda")} • ${quiz.target==="todos"?"turma":"avaliação individual"}</p></div><button data-start-assigned="${escapeHtml(quiz.id)}">Responder →</button></article>`).join(""):`<div class="assessment-empty"><span>◎</span><strong>Nenhuma avaliação pendente</strong><p>As atividades direcionadas pelo professor aparecerão aqui.</p></div>`;
  $$('[data-start-subject]').forEach(button=>{button.style.setProperty("--quiz-course",button.dataset.quizCourseColor);button.onclick=()=>startSubjectQuiz(button.dataset.startSubject)});$$('[data-start-mock]').forEach(button=>button.onclick=()=>startMockExam(button.dataset.startMock));$$('[data-start-assigned]').forEach(button=>button.onclick=()=>startAssignedQuiz(button.dataset.startAssigned));
  const history=learningAnalytics.quizResults.filter(item=>item.email===analyticsEmail()).slice(0,6);$("#quizHistory").innerHTML=history.length?`<div class="assessment-section-head"><div><span class="kicker">MEU HISTÓRICO</span><h2>Resultados recentes</h2></div></div><div>${history.map(item=>`<article><span>${Math.round(item.score/item.total*100)}%</span><div><strong>${escapeHtml(item.title)}</strong><small>${new Date(item.createdAt).toLocaleDateString("pt-BR")} • ${item.score}/${item.total}</small></div></article>`).join("")}</div>`:"";
}
function finishAssessment(){clearInterval(state.mockTimer);const total=state.quizQuestions.length,score=state.quizScore,percent=Math.round(score/Math.max(1,total)*100);if(!state.quizResultSaved){recordQuizResult({assessmentId:state.quizId,title:state.quizTitle,courseId:state.quizSubject,type:state.quizId?.startsWith("mock-")?"simulado":"quiz",score,total,percent,durationSeconds:Math.round((Date.now()-state.quizStartedAt)/1000),answers:state.quizAnswers});state.quizResultSaved=true}$("#quizShell").innerHTML=`<div class="quiz-result"><span>${percent>=70?"✓":"↻"}</span><h2>${percent>=70?"Bom domínio do conteúdo":"Revise os pontos indicados"}</h2><p>Você acertou ${score} de ${total} questões (${percent}%).</p><div class="result-band"><b>${percent}%</b><span><i data-result-progress="${percent}"></i></span></div><button class="primary" id="restartQuiz">Voltar às avaliações</button></div>`;$("#restartQuiz").onclick=resetQuiz;renderQuizHome();$("#quizShell [data-result-progress]")?.style.setProperty("width",`${percent}%`)}
function renderQuiz(){renderQuizHome();if(!state.quizQuestions.length){$("#quizShell").innerHTML="";return}updateAssessmentHead();const list=state.quizQuestions,index=state.quizIndex;  if(index>=list.length){finishAssessment();return}const item=list[index];$("#quizShell").innerHTML=`<div class="quiz-progress"><span><i data-quiz-progress="${(index+1)/list.length*100}"></i></span><b>${index+1} / ${list.length}</b></div><div class="quiz-tag">${escapeHtml(courseById(item.courseId||state.quizSubject).name).toUpperCase()} • ${(item.l||"PROFESSOR").toUpperCase()}</div><h2>${escapeHtml(item.q)}</h2><div class="quiz-options">${item.o.map((option,i)=>{let cls="";if(state.quizAnswer!==null)cls=i===Number(item.a)?"correct":i===state.quizAnswer?"wrong":"disabled";return `<button class="${cls}" data-answer="${i}" ${state.quizAnswer!==null?"disabled":""}><span>${String.fromCharCode(65+i)}</span>${escapeHtml(option)}</button>`}).join("")}</div>${state.quizAnswer!==null?`<div class="quiz-feedback"><strong>${state.quizAnswer===Number(item.a)?"Resposta correta!":"Vale revisar este ponto."}</strong><p>${escapeHtml(item.e)}</p><button id="nextQuestion">${index===list.length-1?"Ver resultado":"Próxima pergunta"} →</button></div>`:""}`;$("[data-quiz-progress]")?.style.setProperty("width",`${Number($("[data-quiz-progress]").dataset.quizProgress)||0}%`);$$('[data-answer]').forEach(button=>button.onclick=()=>{state.quizAnswer=Number(button.dataset.answer);const correct=state.quizAnswer===Number(item.a);if(correct)state.quizScore++;state.quizAnswers.push({question:index,answer:state.quizAnswer,correct});trackLearningEvent("questao_respondida",{assessmentId:state.quizId,courseId:state.quizSubject,question:index,correct});renderQuiz()});if($("#nextQuestion"))$("#nextQuestion").onclick=()=>{state.quizIndex++;state.quizAnswer=null;renderQuiz()}}
function resetQuiz(){clearInterval(state.mockTimer);state.quizIndex=0;state.quizScore=0;state.quizAnswer=null;state.quizQuestions=[];state.quizId=null;state.quizAnswers=[];state.mockRemaining=0;renderQuiz()}

function renderPosts(){
  state.posts=state.posts.map(post=>({...post,respostas:Array.isArray(post.respostas)?post.respostas:[],fixed:Boolean(post.fixed),solved:Boolean(post.solved)}));
  const canModerate=["Professor","Admin"].includes(state.student?.role),filtered=state.communityTopic==="Todos"?state.posts:state.posts.filter(post=>post.topic===state.communityTopic),list=[...filtered].sort((a,b)=>Number(b.fixed)-Number(a.fixed));
  $("#postList").innerHTML=list.map(post=>`<article class="post ${post.fixed?"social-fixed":""} ${post.solved?"social-solved":""}">${post.fixed?`<div class="social-status">✦ FIXADA PELO PROFESSOR</div>`:""}<span class="post-avatar">${escapeHtml(post.initials)}</span><div><div class="post-meta"><strong>${escapeHtml(post.author)} <span>• ${escapeHtml(post.role)}</span></strong><small>${escapeHtml(post.time)}</small></div><div class="post-topic">${escapeHtml(post.topic).toUpperCase()} ${post.solved?"• ✓ RESOLVIDA":""}</div><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.body)}</p><div class="post-actions"><button data-like="${post.id}">♡ ${post.likes}</button><span>□ ${post.respostas.length} ${post.respostas.length===1?"resposta":"respostas"}</span><button data-reply-open="${post.id}">Responder →</button>${canModerate?`<button data-social-fix="${post.id}">${post.fixed?"Desafixar":"Fixar"}</button><button data-social-solve="${post.id}">${post.solved?"Reabrir":"Marcar resolvida"}</button><button class="social-danger" data-social-remove="${post.id}">Remover</button>`:""}</div><div class="post-replies">${post.respostas.map(reply=>`<div class="community-reply ${reply.role==="Professor"?"professor-reply":""}"><span>${escapeHtml(reply.initials)}</span><div><small>${escapeHtml(reply.author)} • ${escapeHtml(reply.role)} • ${escapeHtml(reply.time)}</small><p>${escapeHtml(reply.body)}</p></div></div>`).join("")}</div><form class="reply-form" data-reply-form="${post.id}" hidden><textarea required maxlength="500" rows="3" placeholder="Escreva uma resposta clara e respeitosa..."></textarea><div><small>Você responderá como ${escapeHtml(state.student?.role||"Aluno")}</small><button class="primary" type="submit">Enviar resposta</button></div></form></div></article>`).join("")||`<div class="quiz-shell"><h2>Nenhuma publicação neste tema</h2><p>Faça a primeira publicação.</p></div>`;
  $$('[data-like]').forEach(button=>button.onclick=()=>{const post=state.posts.find(item=>item.id===Number(button.dataset.like));post.likes++;saveDatabase();renderPosts()});
  $$('[data-reply-open]').forEach(button=>button.onclick=()=>{const form=$(`[data-reply-form="${button.dataset.replyOpen}"]`);form.hidden=!form.hidden;if(!form.hidden)$("textarea",form).focus()});
  $$('[data-reply-form]').forEach(form=>form.onsubmit=event=>{event.preventDefault();const post=state.posts.find(item=>item.id===Number(form.dataset.replyForm)),body=$("textarea",form).value.trim();if(!body)return;const author=state.student?.name||"Aluno coda";post.respostas.push({id:Date.now(),author,initials:studentInitials(author),role:state.student?.role||"Aluno",time:"agora",body});saveDatabase();renderPosts();renderTeacherArea();showToast("Resposta publicada")});
  $$('[data-social-fix]').forEach(button=>button.onclick=()=>{const post=state.posts.find(item=>item.id===Number(button.dataset.socialFix));post.fixed=!post.fixed;saveDatabase();renderPosts();showToast(post.fixed?"Publicação fixada":"Publicação desafixada")});
  $$('[data-social-solve]').forEach(button=>button.onclick=()=>{const post=state.posts.find(item=>item.id===Number(button.dataset.socialSolve));post.solved=!post.solved;saveDatabase();renderPosts();showToast(post.solved?"Discussão marcada como resolvida":"Discussão reaberta")});
  $$('[data-social-remove]').forEach(button=>button.onclick=()=>{if(!confirm("Remover esta publicação da rede social?"))return;state.posts=state.posts.filter(item=>item.id!==Number(button.dataset.socialRemove));saveDatabase();renderPosts();showToast("Publicação removida pela moderação")});
}

function localDateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
function addStudyMinutes(minutes){const key=localDateKey();state.studyMinutes[key]=(state.studyMinutes[key]||0)+minutes;saveStudentWorkspace()}
function lessonFromKey(key){const [courseId,lessonText]=key.split(":");const course=courseById(courseId),lesson=Number(lessonText);return {course,lesson,topic:course.topics[lesson]||course.topics[0]}}
function studyStreak(){let streak=0,date=new Date();if(!(state.studyMinutes[localDateKey(date)]>0))date.setDate(date.getDate()-1);while(state.studyMinutes[localDateKey(date)]>0){streak++;date.setDate(date.getDate()-1)}return streak}
function renderStudentHub(){
  if(!state.student)return;const first=state.student.name.split(/\s+/)[0],today=state.studyMinutes[localDateKey()]||0,goal=Math.max(15,state.dailyGoal),percent=Math.min(100,Math.round(today/goal*100));
  $("#studentSpaceTitle").textContent=`Seu espaço, ${first}`;$("#dailyGoal").value=String(goal);$("#goalMinutes").textContent=today;$("#goalRing").style.setProperty("--goal",`${percent*3.6}deg`);$("#goalRing small").textContent=`de ${goal} min`;
  const now=new Date(),day=(now.getDay()+6)%7,monday=new Date(now);monday.setDate(now.getDate()-day);const labels=["S","T","Q","Q","S","S","D"];
  $("#weekDays").innerHTML=labels.map((label,index)=>{const date=new Date(monday);date.setDate(monday.getDate()+index);const minutes=state.studyMinutes[localDateKey(date)]||0,isToday=localDateKey(date)===localDateKey();return `<div class="${minutes?"studied":""} ${isToday?"today":""}"><span>${label}</span><b>${minutes?"✓":"·"}</b><small>${minutes?`${minutes}m`:date.getDate()}</small></div>`}).join("");
  const activeDays=Array.from({length:7},(_,index)=>{const date=new Date(monday);date.setDate(monday.getDate()+index);return state.studyMinutes[localDateKey(date)]>0}).filter(Boolean).length;$("#weekSummary").textContent=activeDays?`Você estudou em ${activeDays} ${activeDays===1?"dia":"dias"} nesta semana.`:"Comece uma aula para registrar seu primeiro dia.";
  const lessons=Object.values(state.completed).filter(Boolean).length,activities=Object.values(state.activities).filter(Boolean).length,tracks=courseBlueprints.filter(course=>completedCount(course.id)>0).length;
  const achievements=[{icon:"✓",name:"Primeiro passo",done:lessons>=1},{icon:"◇",name:"Mão no código",done:activities>=1},{icon:"7",name:"Uma trilha de aulas",done:lessons>=7},{icon:"◈",name:"Explorador",done:tracks>=3}];
  $("#achievementList").innerHTML=achievements.map(item=>`<div class="${item.done?"unlocked":""}"><span>${item.icon}</span><strong>${item.name}</strong><small>${item.done?"Conquistada":"Bloqueada"}</small></div>`).join("");
  const saved=Object.keys(state.bookmarks).filter(key=>state.bookmarks[key]);$("#savedLessonsList").innerHTML=saved.length?saved.map(key=>{const item=lessonFromKey(key);return `<button data-hub-course="${item.course.id}" data-hub-lesson="${item.lesson}"><span data-item-color="${escapeHtml(item.course.color)}">${escapeHtml(item.course.symbol)}</span><div><small>${item.course.name} • AULA ${item.lesson+1}</small><strong>${escapeHtml(item.topic)}</strong></div><i>→</i></button>`}).join(""):`<div class="student-empty"><span>☆</span><strong>Nenhuma aula salva</strong><p>Use “Salvar aula” durante a leitura para criar sua lista de revisão.</p></div>`;
  const notes=Object.entries(state.notes).filter(([,text])=>text.trim()).reverse().slice(0,6);$("#recentNotesList").innerHTML=notes.length?notes.map(([key,text])=>{const item=lessonFromKey(key);return `<button data-hub-course="${item.course.id}" data-hub-lesson="${item.lesson}"><small>${escapeHtml(item.course.name)} • ${escapeHtml(item.topic)}</small><p>${escapeHtml(text.slice(0,150))}${text.length>150?"…":""}</p></button>`}).join(""):`<div class="student-empty"><span>✎</span><strong>Suas notas aparecerão aqui</strong><p>Registre resumos e dúvidas dentro de cada aula.</p></div>`;
  const areas=Object.entries(categoryInfo).map(([category,info])=>{const courses=courseBlueprints.filter(course=>course.category===category),keys=courses.flatMap(course=>course.topics.map((_,index)=>`${course.id}:${index}`)),done=keys.reduce((sum,key)=>sum+Number(Boolean(state.completed[key]))+Number(Boolean(state.activities[key]))+Number(Boolean(state.lessonChecks[key])),0),total=keys.length*3,score=total?Math.round(done/total*100):0;return {category,label:info.label,score,done,total}});
  $("#studentCompetencyGrid").innerHTML=areas.map(item=>`<article><header><strong>${escapeHtml(item.label)}</strong><b>${item.score}%</b></header><div><i data-competency-progress="${item.score}"></i></div><p>${item.done} de ${item.total} evidências registradas</p></article>`).join("");$$('[data-item-color]',$('#savedLessonsList')).forEach(item=>item.style.setProperty('--item-color',item.dataset.itemColor));$$('[data-competency-progress]').forEach(item=>item.style.width=`${Number(item.dataset.competencyProgress)||0}%`);
  const cardMap={goals:".daily-goal-card",timer:".focus-timer-card",week:".week-card",achievements:".achievement-card"};Object.entries(cardMap).forEach(([key,selector])=>{const card=$(selector);if(card)card.hidden=state.dashboardCards[key]===false});$$('[data-dashboard-card]').forEach(input=>{input.checked=state.dashboardCards[input.dataset.dashboardCard]!==false});
  $$('[data-hub-course]').forEach(button=>button.onclick=()=>openCourse(button.dataset.hubCourse,Number(button.dataset.hubLesson)));updateTimerDisplay();
  dispatchCoda("student-hub",{student:state.student,summary:serverWorkspacePayload().summary});
}
function updateTimerDisplay(){const minutes=Math.floor(state.timerSeconds/60),seconds=state.timerSeconds%60;$("#focusTimer").textContent=`${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;$("#toggleTimer").textContent=state.timerRunning?"Ⅱ Pausar":"▶ Começar"}
function toggleStudyTimer(){if(state.timerRunning){clearInterval(state.timerId);state.timerRunning=false;updateTimerDisplay();return}state.timerRunning=true;state.timerId=setInterval(()=>{state.timerSeconds--;updateTimerDisplay();if(state.timerSeconds<=0){clearInterval(state.timerId);state.timerRunning=false;state.timerSeconds=1500;addStudyMinutes(25);renderStudentHub();showToast("Sessão concluída. Faça uma pausa curta!")}},1000);updateTimerDisplay()}
function resetStudyTimer(){clearInterval(state.timerId);state.timerRunning=false;state.timerSeconds=1500;updateTimerDisplay()}
function exportStudentProgress(){const data={plataforma:"coda",aluno:state.student?.name,exportadoEm:new Date().toISOString(),aulasConcluidas:state.completed,atividades:state.activities,exerciciosFinais:state.lessonChecks,aulasSalvas:state.bookmarks,anotacoes:state.notes,minutosDeEstudo:state.studyMinutes,metaDiaria:state.dailyGoal};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="meu-progresso-coda.json";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
function downloadCurrentCode(){const code=$("#codeEditor").value,filename=starters[state.labLanguage].file,blob=new Blob([code],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500);showToast(`${filename} baixado`)}
function updateDashboard(){if(state.student?.role!=="Aluno"){$("#profileXp").textContent=state.student?.role==="Admin"?"Administrador • Instituição":"Professor • Gestão";return}const {lessons,activities,checks,tracks,xp}=dashboardMetrics(state);$("#metricLessons").textContent=lessons;$("#metricActivities").textContent=activities;$("#metricTracks").textContent=tracks;$("#topXp").textContent=`⚡ ${xp} XP`;$("#profileXp").textContent=`${xp} XP • ${xp>=300?"Construtor":"Explorador"}`;const streak=studyStreak(),card=$(".streak-card");$("strong",card).textContent=`${streak} ${streak===1?"dia":"dias"} praticando`;$("p",card).textContent=streak?"Continue estudando no seu ritmo.":"Faça uma atividade hoje para começar.";const active=courseBlueprints.find(course=>completedCount(course.id)<7&&completedCount(course.id)>0);if(active){$("#continueTitle").textContent=`Continue ${active.name}`;$("#continuePercent").textContent=`${coursePercent(active.id)}%`;applyDashboardProgress(document,"#continueBar",coursePercent(active.id));$("#continueButton").textContent="Continuar trilha →";$("#continueButton").onclick=()=>openCourse(active.id,Math.min(completedCount(active.id),6))}else{$("#continueButton").onclick=()=>goToView("materias")}}

function teacherSelectOptions(selected="html"){return courseBlueprints.map(course=>`<option value="${course.id}" ${course.id===selected?"selected":""}>${course.name}</option>`).join("")}
function renderTeacherVideoPreview(){const id=extractYouTubeId($("#teacherVideoUrl").value);$("#teacherVideoPreview").innerHTML=id?`<iframe title="Prévia do vídeo" src="https://www.youtube-nocookie.com/embed/${id}?rel=0" loading="lazy" allowfullscreen></iframe>`:`<p>Cole um link válido do YouTube para visualizar o vídeo.</p>`}
function fillTeacherLessonEditor(){const course=courseById($("#teacherCourse").value),index=Number($("#teacherLesson").value||0),override=lessonOverride(course.id,index),context=lessonContextData(course,index),deep=lessonDeepDiveData(course,index),video=lessonVideoData(course,index);$("#teacherLessonStatus").value=override?.status||"published";$("#teacherObjectives").value=(override?.objectives||enhancedLessonData(course,index).objectives).join("\n");$("#teacherPrerequisites").value=(override?.prerequisites||enhancedLessonData(course,index).prerequisites).join("\n");$("#teacherCheckpoints").value=(override?.checkpoints||enhancedLessonData(course,index).mastery).join("\n");$("#teacherLessonTitle").value=lessonTitle(course,index);$("#teacherContext").value=context.context;$("#teacherExplanation").value=deep.explanation;$("#teacherSystem").value=context.system;$("#teacherCommonError").value=deep.commonError.replace(/^Erro comum:\s*/i,"");$("#teacherActivity").value=activityInstruction(course,index);$("#teacherVideoUrl").value=video.url;$("#teacherVideoNote").value=video.note;renderTeacherVideoPreview()}
function renderTeacherResourceEditor(){
  const courseSelect=$("#resourceCourse"),selected=courseSelect.value||"html";courseSelect.innerHTML=teacherSelectOptions(selected);
  const course=courseById(courseSelect.value),lessonSelect=$("#resourceLesson"),lesson=lessonSelect.value||"-1";lessonSelect.innerHTML=`<option value="-1">Todas as aulas</option>${course.topics.map((topic,index)=>`<option value="${index}">Aula ${index+1} — ${escapeHtml(lessonTitle(course,index))}</option>`).join("")}`;lessonSelect.value=[...lessonSelect.options].some(option=>option.value===lesson)?lesson:"-1";
  const list=$("#teacherResourceList"),resources=appDatabase.recursos||[];list.innerHTML=resources.length?resources.slice().reverse().map(item=>`<article><div><small>${escapeHtml(courseById(item.courseId).name)} • ${Number(item.lesson)===-1?"todas as aulas":`aula ${Number(item.lesson)+1}`}</small><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.type)} • ${escapeHtml(item.author)}</span></div><button type="button" data-delete-resource="${item.id}">Remover</button></article>`).join(""):`<p>Nenhum material personalizado publicado.</p>`;
  $$('[data-delete-resource]',list).forEach(button=>button.onclick=()=>{appDatabase.recursos=appDatabase.recursos.filter(item=>String(item.id)!==button.dataset.deleteResource);saveDatabase();renderTeacherResourceEditor();if($("#curso").classList.contains("active"))renderLesson();showToast("Material removido")});
}
function teacherStudentOptions(selected="todos"){const students=Object.values(learningAnalytics.users);return `<option value="todos">Todos os alunos</option>${students.map(student=>`<option value="${escapeHtml(student.email)}" ${student.email===selected?"selected":""}>${escapeHtml(student.name)} — ${escapeHtml(student.email)}</option>`).join("")}`}
function clearTeacherQuizFields(){
  delete $("#quizEditor").dataset.questionIndex;$("#teacherQuizSelect").value="new";$("#teacherQuizTitle").value="";$("#teacherQuizType").value="quiz";$("#teacherQuizTarget").value="todos";$("#teacherQuizDuration").value="20";$("#teacherQuizQuestion").value="";for(let index=0;index<4;index++)$("#teacherQuizOption"+index).value="";$("#teacherQuizCorrect").value="0";$("#teacherQuizDifficulty").value="Iniciante";$("#teacherQuizExplanation").value="";
}
function fillTeacherQuizEditor(){
  delete $("#quizEditor").dataset.questionIndex;const id=$("#teacherQuizSelect").value;if(id==="new"){clearTeacherQuizFields();return}const quiz=appDatabase.quizzes.find(item=>String(item.id)===id);if(!quiz)return;$("#teacherQuizCourse").value=quiz.courseId;$("#teacherQuizType").value=quiz.type||"quiz";$("#teacherQuizTitle").value=quiz.title;$("#teacherQuizTarget").value=quiz.target||"todos";$("#teacherQuizDuration").value=quiz.duration||20;$("#teacherQuizQuestion").value="";for(let index=0;index<4;index++)$("#teacherQuizOption"+index).value="";$("#teacherQuizCorrect").value="0";$("#teacherQuizExplanation").value="";showToast("Avaliação carregada. Adicione uma nova pergunta ou altere os dados.")
}
function renderTeacherQuizEditor(){
  const selectedQuiz=$("#teacherQuizSelect").value||"new",selectedCourse=$("#teacherQuizCourse").value||"html",selectedTarget=$("#teacherQuizTarget").value||"todos";
  $("#teacherQuizSelect").innerHTML=`<option value="new">+ Nova avaliação</option>${appDatabase.quizzes.map(quiz=>`<option value="${quiz.id}">${escapeHtml(quiz.title)}</option>`).join("")}`;$("#teacherQuizSelect").value=[...$("#teacherQuizSelect").options].some(option=>option.value===selectedQuiz)?selectedQuiz:"new";
  $("#teacherQuizCourse").innerHTML=teacherSelectOptions(selectedCourse);$("#teacherQuizTarget").innerHTML=teacherStudentOptions(selectedTarget);if([...$("#teacherQuizTarget").options].some(option=>option.value===selectedTarget))$("#teacherQuizTarget").value=selectedTarget;
  const list=$("#teacherQuizList");list.innerHTML=appDatabase.quizzes.length?appDatabase.quizzes.slice().reverse().map(quiz=>`<article class="${quiz.active===false?"inactive":""}"><div><small>${escapeHtml(courseById(quiz.courseId).name)} • ${(quiz.type||"quiz").toUpperCase()}</small><strong>${escapeHtml(quiz.title)}</strong><span>${(quiz.questions||[]).length} questões • ${quiz.target==="todos"?"toda a turma":escapeHtml(learningAnalytics.users[quiz.target]?.name||quiz.target)}</span><div class="teacher-question-buttons">${(quiz.questions||[]).map((question,index)=>`<button type="button" data-edit-quiz-question="${quiz.id}" data-question-index="${index}">P${index+1}: ${escapeHtml(question.q)}</button>`).join("")}</div></div><div><button type="button" data-edit-quiz="${quiz.id}">Editar dados</button><button type="button" data-toggle-quiz="${quiz.id}">${quiz.active===false?"Ativar":"Pausar"}</button><button class="danger" type="button" data-delete-quiz="${quiz.id}">Remover</button></div></article>`).join(""):`<p>Nenhuma avaliação criada pelo professor.</p>`;
  $$('[data-edit-quiz]',list).forEach(button=>button.onclick=()=>{$("#teacherQuizSelect").value=button.dataset.editQuiz;fillTeacherQuizEditor();$("#teacherQuizTitle").focus()});
  $$('[data-edit-quiz-question]',list).forEach(button=>button.onclick=()=>{const quiz=appDatabase.quizzes.find(item=>String(item.id)===button.dataset.editQuizQuestion),index=Number(button.dataset.questionIndex),question=quiz?.questions?.[index];if(!question)return;$("#teacherQuizSelect").value=String(quiz.id);fillTeacherQuizEditor();$("#quizEditor").dataset.questionIndex=String(index);$("#teacherQuizQuestion").value=question.q;question.o.forEach((option,optionIndex)=>$("#teacherQuizOption"+optionIndex).value=option);$("#teacherQuizCorrect").value=String(question.a);$("#teacherQuizDifficulty").value=question.l||"Iniciante";$("#teacherQuizExplanation").value=question.e;$("#teacherQuizQuestion").focus();showToast(`Editando a pergunta ${index+1}`)});
  $$('[data-toggle-quiz]',list).forEach(button=>button.onclick=()=>{const quiz=appDatabase.quizzes.find(item=>String(item.id)===button.dataset.toggleQuiz);quiz.active=quiz.active===false;saveDatabase();renderTeacherQuizEditor();showToast(quiz.active?"Avaliação ativada":"Avaliação pausada")});
  $$('[data-delete-quiz]',list).forEach(button=>button.onclick=()=>{appDatabase.quizzes=appDatabase.quizzes.filter(item=>String(item.id)!==button.dataset.deleteQuiz);saveDatabase();renderTeacherQuizEditor();renderQuiz();showToast("Avaliação removida")});
}
function eventLabel(event){const labels={login:"Entrou na plataforma",aula_aberta:"Abriu uma aula",aula_concluida:"Concluiu uma aula",material_aberto:"Consultou material acadêmico",video_aberto:"Abriu uma videoaula",laboratorio_executado:"Executou código no laboratório",atividade_concluida:"Concluiu uma atividade",avaliacao_iniciada:"Iniciou uma avaliação",questao_respondida:"Respondeu uma questão",avaliacao_concluida:"Concluiu uma avaliação",projeto_3d_programado:"Gerou código de um protótipo 3D"};return labels[event.type]||event.type.replaceAll("_"," ")}
function renderTeacherAnalytics(){
  const users=Object.values(learningAnalytics.users),studentSelect=$("#analyticsStudent"),selected=studentSelect.value||users[0]?.email||"";studentSelect.innerHTML=users.length?users.map(user=>`<option value="${escapeHtml(user.email)}">${escapeHtml(user.name)} — ${escapeHtml(user.email)}</option>`).join(""):`<option value="">Nenhum aluno registrado</option>`;if(users.some(user=>user.email===selected))studentSelect.value=selected;
  const courseSelect=$("#analyticsCourse"),selectedCourse=courseSelect.value||"Todas";courseSelect.innerHTML=`<option value="Todas">Todas as matérias</option>${teacherSelectOptions()}`;courseSelect.value=selectedCourse;
  const email=studentSelect.value,user=learningAnalytics.users[email],courseId=courseSelect.value,snapshot=user?.snapshot||{},courseSnapshot=courseId==="Todas"?null:snapshot.courses?.[courseId];let results=learningAnalytics.quizResults.filter(item=>item.email===email);let events=learningAnalytics.events.filter(item=>item.email===email);if(courseId!=="Todas"){results=results.filter(item=>item.courseId===courseId);events=events.filter(item=>item.data?.courseId===courseId)}
  const average=results.length?Math.round(results.reduce((sum,item)=>sum+Number(item.percent??item.score/item.total*100),0)/results.length):null;
  $("#studentPerformance").innerHTML=user?`<article><small>AULAS CONCLUÍDAS</small><strong>${courseSnapshot?.lessons??snapshot.lessons??0}</strong><p>${courseId==="Todas"?"em todas as trilhas":`de 7 em ${escapeHtml(courseById(courseId).name)}`}</p></article><article><small>ATIVIDADES</small><strong>${courseSnapshot?.activities??snapshot.activities??0}</strong><p>práticas verificadas</p></article><article><small>MÉDIA</small><strong>${average===null?"—":average+"%"}</strong><p>${results.length} avaliações filtradas</p></article><article><small>TEMPO DE ESTUDO</small><strong>${snapshot.studyMinutes||0} min</strong><p>registrado neste navegador</p></article>`:`<div class="analytics-empty">Entre primeiro com um perfil de aluno para gerar dados de acompanhamento.</div>`;
  $("#studentQuizResults").innerHTML=results.length?results.slice(0,30).map(item=>`<article><span>${item.percent??Math.round(item.score/item.total*100)}%</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.courseId==="integrado"?"Conteúdo integrado":courseById(item.courseId).name)} • ${item.score}/${item.total} • ${new Date(item.createdAt).toLocaleString("pt-BR")}</small></div></article>`).join(""):`<p class="analytics-empty">Nenhum resultado neste filtro.</p>`;
  $("#studentActivityLog").innerHTML=events.length?events.slice(0,60).map(item=>`<article><span>•</span><div><strong>${escapeHtml(eventLabel(item))}</strong><small>${item.data?.courseId?escapeHtml(courseById(item.data.courseId).name)+" • ":""}${new Date(item.createdAt).toLocaleString("pt-BR")}</small></div></article>`).join(""):`<p class="analytics-empty">Nenhuma ação neste filtro.</p>`;
  const allResults=learningAnalytics.quizResults;$("#teacherStudentCount").textContent=users.length;$("#teacherQuizAverage").textContent=allResults.length?Math.round(allResults.reduce((sum,item)=>sum+Number(item.percent??item.score/item.total*100),0)/allResults.length)+"%":"—";$("#teacherQuizCount").textContent=appDatabase.quizzes.length;
}
function renderTeacherArea(){
  if(!appDatabase)return;
  const selected=$("#teacherCourse").value||"html",challengeSelected=$("#challengeCourse").value||selected;
  $("#teacherCourse").innerHTML=teacherSelectOptions(selected);$("#challengeCourse").innerHTML=teacherSelectOptions(challengeSelected);
  const course=courseById(selected),lessonValue=Number($("#teacherLesson").value||0);$("#teacherLesson").innerHTML=course.topics.map((topic,index)=>`<option value="${index}" ${index===lessonValue?"selected":""}>Aula ${index+1} — ${escapeHtml(lessonTitle(course,index))}</option>`).join("");
  fillTeacherLessonEditor();
  $("#teacherEditCount").textContent=appDatabase.conteudos.length;$("#teacherChallengeCount").textContent=appDatabase.desafiosExtras.length;$("#teacherReplyCount").textContent=state.posts.flatMap(post=>post.respostas||[]).filter(reply=>reply.role==="Professor").length;
  $("#challengeCode").value=$("#challengeCode").value||starters[challengeSelected].code;
  $("#teacherChallengeList").innerHTML=appDatabase.desafiosExtras.length?appDatabase.desafiosExtras.map(item=>`<article><div><small>${escapeHtml(courseById(item.courseId).name)}</small><strong>${escapeHtml(item.title)}</strong></div><button type="button" data-delete-challenge="${item.id}">Remover</button></article>`).join(""):`<p>Nenhum desafio extra publicado.</p>`;
  $$('[data-delete-challenge]').forEach(button=>button.onclick=()=>{appDatabase.desafiosExtras=appDatabase.desafiosExtras.filter(item=>item.id!==Number(button.dataset.deleteChallenge));saveDatabase();renderTeacherArea();renderCustomChallengeList();showToast("Desafio removido")});
  renderTeacher3DEditor();renderTeacherResourceEditor();renderTeacherQuizEditor();renderTeacherAnalytics();
}
function fillTeacher3DEditor(){const id=$("#teacher3DProject").value;if(id==="new"){$("#teacher3DTitle").value="";$("#teacher3DDescription").value="";$("#teacher3DType").value="led";$("#teacher3DPin").value="GPIO2";$("#teacher3DColor").value="#b9ff3b";$("#teacher3DCode").value=base3DTemplates[0].code;$("#delete3DProject").disabled=true;return}const item=all3DTemplates().find(template=>template.id===id)||all3DTemplates()[0];$("#teacher3DTitle").value=item.title;$("#teacher3DDescription").value=item.description;$("#teacher3DType").value=item.type;$("#teacher3DPin").value=item.pin;$("#teacher3DColor").value=item.color;$("#teacher3DCode").value=item.code;$("#delete3DProject").disabled=false}
function renderTeacher3DEditor(){const select=$("#teacher3DProject"),selected=select.value||all3DTemplates()[0]?.id||"new";select.innerHTML=`<option value="new">+ Novo projeto 3D</option>${all3DTemplates().map(item=>`<option value="${item.id}" ${item.id===selected?"selected":""}>${escapeHtml(item.title)}</option>`).join("")}`;if(![...select.options].some(option=>option.value===selected))select.value="new";fillTeacher3DEditor()}
function downloadJSON(data,filename){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
function bindTeacherArea(){
  $("#teacherCourse").onchange=()=>renderTeacherArea();$("#teacherLesson").onchange=fillTeacherLessonEditor;
  $("#resourceCourse").onchange=renderTeacherResourceEditor;
  $("#resourceEditor").onsubmit=async event=>{event.preventDefault();let parsed;try{parsed=new URL($("#resourceUrl").value.trim())}catch{showToast("Informe um link público válido");return}if(!["http:","https:"].includes(parsed.protocol)){showToast("Use um link HTTP ou HTTPS");return}const item={id:`resource-${Date.now()}`,courseId:$("#resourceCourse").value,lesson:Number($("#resourceLesson").value),type:$("#resourceType").value,author:$("#resourceAuthor").value.trim(),title:$("#resourceTitle").value.trim(),url:parsed.href,note:$("#resourceNote").value.trim(),status:"published",createdAt:new Date().toISOString(),authorName:state.student?.name};try{await CodaAPI.addMaterial(item);appDatabase.recursos.push(item);saveDatabase();const courseId=item.courseId;event.target.reset();$("#resourceCourse").value=courseId;renderTeacherResourceEditor();if($("#curso").classList.contains("active"))renderLesson();showToast("Material acadêmico publicado no servidor")}catch(error){showToast(error.message)}};
  $("#teacherQuizSelect").onchange=fillTeacherQuizEditor;$("#newTeacherQuiz").onclick=()=>{clearTeacherQuizFields();$("#teacherQuizTitle").focus()};
  $("#quizEditor").onsubmit=event=>{event.preventDefault();const current=$("#teacherQuizSelect").value,courseId=$("#teacherQuizCourse").value,question={courseId,l:$("#teacherQuizDifficulty").value,q:$("#teacherQuizQuestion").value.trim(),o:[0,1,2,3].map(index=>$("#teacherQuizOption"+index).value.trim()),a:Number($("#teacherQuizCorrect").value),e:$("#teacherQuizExplanation").value.trim()};let quiz=current==="new"?null:appDatabase.quizzes.find(item=>String(item.id)===current);if(!quiz){quiz={id:`quiz-${Date.now()}`,title:$("#teacherQuizTitle").value.trim(),courseId,type:$("#teacherQuizType").value,target:$("#teacherQuizTarget").value,duration:Number($("#teacherQuizDuration").value||20),active:true,author:state.student?.name||"Professor coda",createdAt:new Date().toISOString(),questions:[]};appDatabase.quizzes.push(quiz)}else{Object.assign(quiz,{title:$("#teacherQuizTitle").value.trim(),courseId,type:$("#teacherQuizType").value,target:$("#teacherQuizTarget").value,duration:Number($("#teacherQuizDuration").value||20),updatedAt:new Date().toISOString()})}quiz.questions=Array.isArray(quiz.questions)?quiz.questions:[];const editIndex=Number(event.currentTarget.dataset.questionIndex),editing=event.currentTarget.dataset.questionIndex!==undefined&&Number.isInteger(editIndex)&&editIndex>=0&&editIndex<quiz.questions.length;if(editing)quiz.questions[editIndex]=question;else quiz.questions.push(question);delete event.currentTarget.dataset.questionIndex;saveDatabase();renderTeacherArea();$("#teacherQuizSelect").value=String(quiz.id);$("#teacherQuizQuestion").value="";for(let index=0;index<4;index++)$("#teacherQuizOption"+index).value="";$("#teacherQuizExplanation").value="";renderQuiz();showToast(`${editing?"Pergunta atualizada":"Nova pergunta salva"} em “${quiz.title}”`)};
  $("#analyticsStudent").onchange=renderTeacherAnalytics;$("#analyticsCourse").onchange=renderTeacherAnalytics;
  $("#exportClassReport").onclick=()=>{downloadJSON({plataforma:"coda",tipo:"relatorio-pedagogico-local",geradoEm:new Date().toISOString(),aviso:"Dados registrados apenas neste navegador; senhas, notas privadas e conversas não estão incluídas.",alunos:Object.values(learningAnalytics.users),resultados:learningAnalytics.quizResults,acoesDeAprendizagem:learningAnalytics.events},"relatorio-pedagogico-coda.json");showToast("Relatório pedagógico exportado")};
  $("#challengeCourse").onchange=event=>{$("#challengeCode").value=starters[event.target.value].code};
  $("#teacherVideoUrl").oninput=renderTeacherVideoPreview;
  $("#contentEditor").onsubmit=async event=>{event.preventDefault();const courseId=$("#teacherCourse").value,lesson=Number($("#teacherLesson").value),url=$("#teacherVideoUrl").value.trim();if(!extractYouTubeId(url)){showToast("Use um link válido do YouTube");return}const content={courseId,lesson,title:$("#teacherLessonTitle").value.trim(),status:$("#teacherLessonStatus").value,objectives:$("#teacherObjectives").value.split("\n").map(item=>item.trim()).filter(Boolean),prerequisites:$("#teacherPrerequisites").value.split("\n").map(item=>item.trim()).filter(Boolean),checkpoints:$("#teacherCheckpoints").value.split("\n").map(item=>item.trim()).filter(Boolean),context:$("#teacherContext").value.trim(),explanation:$("#teacherExplanation").value.trim(),system:$("#teacherSystem").value.trim(),commonError:$("#teacherCommonError").value.trim(),activity:$("#teacherActivity").value.trim(),videoUrl:url,videoNote:$("#teacherVideoNote").value.trim(),updatedAt:new Date().toISOString(),updatedBy:state.student?.name};try{await CodaAPI.saveLesson(content);const existing=appDatabase.conteudos.findIndex(item=>item.courseId===courseId&&Number(item.lesson)===lesson);if(existing>=0)appDatabase.conteudos[existing]=content;else appDatabase.conteudos.push(content);const video={courseId,lesson,url,note:content.videoNote,updatedAt:new Date().toISOString()};const videoIndex=appDatabase.videos.findIndex(item=>item.courseId===courseId&&Number(item.lesson)===lesson);if(videoIndex>=0)appDatabase.videos[videoIndex]=video;else appDatabase.videos.push(video);saveDatabase();renderTeacherArea();renderCourses();renderVideos();if(state.currentCourse===courseId&&state.currentLesson===lesson)renderCourse();showToast(`Aula salva como ${content.status==="published"?"publicada":content.status}`)}catch(error){showToast(error.message)}};
  $("#challengeEditor").onsubmit=async event=>{event.preventDefault();const challenge={classId:$("#challengeClass").value||null,courseId:$("#challengeCourse").value,title:$("#challengeTitle").value.trim(),instruction:$("#challengeInstruction").value.trim(),code:$("#challengeCode").value,status:$("#challengeStatus").value,dueAt:$("#challengeDueAt").value||null};try{await CodaAPI.addChallenge(challenge);event.target.reset();$("#challengeCourse").innerHTML=teacherSelectOptions();$("#challengeCode").value=starters.html.code;await window.CodaPlatform?.refreshChallenges?.();showToast("Desafio salvo no servidor")}catch(error){showToast(error.message)}};
  $("#teacher3DProject").onchange=fillTeacher3DEditor;$("#new3DProject").onclick=()=>{$("#teacher3DProject").value="new";fillTeacher3DEditor();$("#teacher3DTitle").focus()};
  $("#model3DEditor").onsubmit=event=>{event.preventDefault();const current=$("#teacher3DProject").value,id=current==="new"?`3d-custom-${Date.now()}`:current,item={id,title:$("#teacher3DTitle").value.trim(),description:$("#teacher3DDescription").value.trim(),type:$("#teacher3DType").value,pin:$("#teacher3DPin").value.trim(),color:$("#teacher3DColor").value,code:$("#teacher3DCode").value,updatedAt:new Date().toISOString(),updatedBy:state.student?.name};const index=appDatabase.modelos3D.findIndex(model=>model.id===id);if(index>=0)appDatabase.modelos3D[index]=item;else appDatabase.modelos3D.push(item);saveDatabase();renderTeacherArea();render3DProgrammer();$("#teacher3DProject").value=id;fillTeacher3DEditor();showToast("Projeto 3D publicado")};
  $("#delete3DProject").onclick=()=>{const id=$("#teacher3DProject").value;if(id==="new")return;appDatabase.modelos3D=appDatabase.modelos3D.filter(item=>item.id!==id);saveDatabase();renderTeacherArea();render3DProgrammer();showToast("Personalização 3D removida")};
  $("#exportDatabase").onclick=()=>{downloadJSON(appDatabase,"banco-coda.json");showToast("Banco JSON exportado")};
  $("#importDatabase").onchange=async event=>{const file=event.target.files[0];if(!file)return;try{appDatabase=normalizeDatabase(JSON.parse(await file.text()));state.posts=appDatabase.comunidade;saveDatabase();renderTeacherArea();renderPosts();renderCourses();renderLab();showToast("Banco JSON importado")}catch{showToast("O arquivo JSON não é válido")}event.target.value=""};
  $("#resetDatabase")?.addEventListener("click",()=>{if(!confirm("Restaurar o banco original? As edições locais de conteúdo e comunidade serão substituídas."))return;appDatabase=normalizeDatabase(JSON.parse(JSON.stringify(originalDatabase)));state.posts=appDatabase.comunidade;saveDatabase();renderTeacherArea();renderPosts();renderCourses();renderLab();showToast("Banco original restaurado")});
}

function loadStudent(){try{return JSON.parse(localStorage.getItem("nexo-student")||sessionStorage.getItem("nexo-student-session")||"null")}catch{return null}}
function studentInitials(name){return name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()||"AL"}
let loginMode="login";
function portalButtonText(role){return role==="Admin"?"Entrar no painel do administrador →":role==="Professor"?"Entrar no painel do professor →":loginMode==="register"?"Criar minha conta →":"Entrar como aluno →"}
function setLoginMode(mode){loginMode=mode==="register"&&$("#loginRole").value==="Aluno"?"register":"login";setLoginPortal($("#loginRole").value)}
function setLoginPortal(role){
  const teacher=role==="Professor",admin=role==="Admin",managed=teacher||admin;if(managed)loginMode="login";const registering=!managed&&loginMode==="register";
  const copy=admin?{kicker:"PORTAL DO ADMINISTRADOR",title:"Entrar como administrador",description:"Use seu próprio e-mail, sua senha e o código de administrador.",environment:"AMBIENTE DO ADMINISTRADOR",hero:"Organize a instituição.<br><em>Acompanhe tudo com clareza.</em>",text:"Gerencie acessos, turmas, indicadores, identidade, LGPD e backups em uma interface limpa.",features:["✓ Gestão institucional","✓ Usuários e acessos","✓ Banco SQLite local"]}:teacher?{kicker:"PORTAL DO PROFESSOR",title:"Entrar como professor",description:"Use seu próprio e-mail, sua senha e o código de professor.",environment:"AMBIENTE DO PROFESSOR",hero:"Ensine, acompanhe e<br><em>transforme o conteúdo.</em>",text:"Gerencie alunos, aulas, materiais, avaliações, desafios e projetos 3D em espaços separados.",features:["✓ Painel exclusivo","✓ Ferramentas separadas","✓ Acompanhamento de alunos"]}:registering?{kicker:"CADASTRO DO ALUNO",title:"Criar conta de aluno",description:"Preencha seus dados uma única vez para acessar a Coda.",environment:"NOVO PERFIL DE ALUNO",hero:"Seu estudo começa<br><em>com um perfil só seu.</em>",text:"Cadastre-se para salvar progresso, entrar em turmas e usar o Tutor Coda.",features:["✓ Cadastro separado","✓ Matrícula identificada","✓ Progresso individual"]}:{kicker:"PORTAL DO ALUNO",title:"Entrar na coda",description:"Use o e-mail e a senha do seu cadastro.",environment:"AMBIENTE DO ALUNO",hero:"Seu estudo, seus projetos,<br><em>seu progresso.</em>",text:"Entre para acessar 14 trilhas, 98 aulas, laboratórios de código, vídeos e a bancada interativa do ESP32.",features:["✓ Aulas com contexto","✓ Prática no laboratório","✓ Progresso sincronizado"]};
  $("#loginRole").value=role;$("#loginModeSwitch").hidden=managed;$("#loginNameRow").hidden=!registering;$("#studentRegistrationRow").hidden=!registering;$("#loginConfirmPasswordRow").hidden=!registering;$("#teacherCodeRow").hidden=!managed;$("#loginName").required=registering;$("#studentRegistration").required=registering;$("#loginConfirmPassword").required=registering;$("#teacherCode").required=managed;$("#accessCodeLabel").textContent=admin?"Código local do administrador":"Código local do professor";$("#loginPassword").autocomplete=registering?"new-password":"current-password";$("#loginHelp").textContent=managed?"Se o e-mail ainda não existir, a Coda cria a conta com a senha informada. Depois, use sempre os mesmos dados e o código.":registering?"Use seu e-mail real. O domínio @coda.local fica reservado apenas para as contas internas.":"Ainda não tem cadastro? Escolha “Criar conta”.";
  $$('[data-login-mode]').forEach(button=>button.classList.toggle("active",button.dataset.loginMode===loginMode));$$('[data-login-portal]').forEach(button=>button.classList.toggle("active",button.dataset.loginPortal===role));$(".login-kicker").textContent=copy.kicker;$("#loginTitle").textContent=copy.title;$("#loginDescription").textContent=copy.description;$("#loginSubmit").textContent=portalButtonText(role);$("#loginEnvironment").innerHTML=`<i></i> ${copy.environment}`;$("#loginHeroTitle").innerHTML=copy.hero;$("#loginHeroText").textContent=copy.text;$("#loginFeatures").innerHTML=copy.features.map(item=>`<span>${item}</span>`).join("");document.body.classList.toggle("teacher-login",teacher);document.body.classList.toggle("admin-login",admin)
}
async function applyStudent(student){
  student.role=student.role||"Aluno";state.student=student;const teacher=student.role==="Professor",admin=student.role==="Admin",studentMode=!teacher&&!admin;
  document.body.dataset.portal=student.role.toLowerCase();
  if(studentMode){loadStudentWorkspace();await hydrateServerWorkspace()}registerLearningUser(student);trackLearningEvent("login",{});
  const first=student.name.trim().split(/\s+/)[0];$("#profileName").textContent=student.name;$("#profileAvatar").textContent=studentInitials(student.name);$("#studentGreeting").textContent=teacher?`Olá, Prof. ${first}`:admin?`Olá, ${first}`:`Olá, ${first}`;$("#profileXp").textContent=teacher?"Professor • Gestão":admin?"Administrador • Instituição":"0 XP • Explorador";
  $("#loginScreen").classList.add("hidden");$("#appShell").classList.remove("is-locked");document.body.classList.remove("login-open","teacher-login","admin-login");document.body.classList.toggle("is-teacher",teacher);document.body.classList.toggle("is-admin",admin);
  $$(".teacher-navigation").forEach(item=>item.hidden=!teacher);$$(".admin-navigation").forEach(item=>item.hidden=!admin);$$(".student-navigation").forEach(item=>item.hidden=!studentMode);
  if(admin){await window.CodaAdmin?.boot?.(student);dispatchCoda("user",{user:student});return}
  if(teacher){renderTeacherArea();showTeacherSection("overview");await window.CodaPlatform?.boot?.(student);dispatchCoda("user",{user:student});return}
  updateDashboard();renderStudentHub();renderCourses();renderPosts();goToView("inicio");await window.CodaPlatform?.boot?.(student);await bootTutor();if($("#curso").classList.contains("active"))renderCourse();dispatchCoda("user",{user:student});
}
function lockStudentArea(){$("#loginScreen").classList.remove("hidden");$("#appShell").classList.add("is-locked");document.body.classList.add("login-open");setTimeout(()=>(loginMode==="register"?$("#loginName"):$("#loginEmail")).focus(),80)}
async function bindStudentAccess(){
  let activeUser=null;try{activeUser=(await CodaAPI.me()).user}catch{showToast("Abra a coda pelo INICIAR-CODA.bat para conectar ao servidor.")}
  if(activeUser)await applyStudent(activeUser);else{lockStudentArea();setLoginPortal("Aluno")}
  $$('[data-login-portal]').forEach(button=>button.onclick=()=>setLoginPortal(button.dataset.loginPortal));
  $$('[data-login-mode]').forEach(button=>button.onclick=()=>setLoginMode(button.dataset.loginMode));
  $("#studentLogin").addEventListener("submit",async event=>{event.preventDefault();const role=$("#loginRole").value,button=$("#loginSubmit"),registering=role==="Aluno"&&loginMode==="register",code=$("#teacherCode").value;button.disabled=true;button.textContent=registering?"Criando conta...":"Conectando...";try{const base={email:$("#loginEmail").value.trim(),password:$("#loginPassword").value,remember:$("#loginRemember").checked};const result=registering?await CodaAPI.registerStudent({...base,name:$("#loginName").value.trim(),registrationCode:$("#studentRegistration").value.trim(),confirmPassword:$("#loginConfirmPassword").value}):await CodaAPI.login({...base,role,teacherCode:role==="Professor"?code:"",adminCode:role==="Admin"?code:""});await applyStudent(result.user);showToast(`${registering||result.created?"Conta criada":"Bem-vindo"}, ${result.user.name.split(/\s+/)[0]}!`);$("#loginPassword").value="";$("#loginConfirmPassword").value="";$("#teacherCode").value=""}catch(error){showToast(error.message)}finally{button.disabled=false;button.textContent=portalButtonText(role)}});
  $("#logoutButton").addEventListener("click",async()=>{resetStudyTimer();set3DSimulation(false);try{await CodaAPI.logout()}catch(error){console.warn("Falha ao encerrar sessão no servidor:",error?.message||error)}state.student=null;state.teacherSection="overview";state.adminSection="overview";state.tutor={conversationId:null,mode:"explain",busy:false,booted:false,provider:"local",model:"Base local + pesquisa Crossref",image:null};clearTutorView();window.CodaPlatform?.reset?.();window.CodaAdmin?.reset?.();document.body.classList.remove("lesson-focus","is-teacher","is-admin");delete document.body.dataset.portal;$$(".teacher-navigation,.admin-navigation").forEach(item=>item.hidden=true);$$(".student-navigation").forEach(item=>item.hidden=false);$("#studentLogin").reset();$("#loginRemember").checked=true;loginMode="login";setLoginPortal("Aluno");goToView("inicio");lockStudentArea();dispatchCoda("logout")});
}

function renderGlobalSearch(){
  const input=$("#globalSearch"),box=$("#globalSearchResults"),term=input.value.trim().toLowerCase();if(!term){box.hidden=true;input.setAttribute("aria-expanded","false");return}
  const results=courseBlueprints.flatMap(course=>course.topics.map((topic,lesson)=>({course,topic,lesson}))).filter(item=>`${item.course.name} ${item.course.description} ${item.topic}`.toLowerCase().includes(term)).slice(0,8);
  box.innerHTML=results.length?`<div class="search-result-head"><span>RESULTADOS</span><b>${results.length}${results.length===8?"+":""}</b></div>${results.map(item=>`<button data-search-course="${item.course.id}" data-search-lesson="${item.lesson}"><span data-result-color="${escapeHtml(item.course.color)}">${escapeHtml(item.course.symbol)}</span><div><strong>${escapeHtml(item.topic)}</strong><small>${escapeHtml(item.course.name)} • Aula ${item.lesson+1}</small></div><i>→</i></button>`).join("")}`:`<div class="search-no-result"><strong>Nada encontrado</strong><span>Tente buscar “variáveis”, “Flexbox” ou “ESP32”.</span></div>`;
  $$('[data-result-color]',box).forEach(item=>item.style.setProperty('--result-color',item.dataset.resultColor));box.hidden=false;input.setAttribute("aria-expanded","true");$$('[data-search-course]',box).forEach(button=>button.onclick=()=>{input.value="";box.hidden=true;openCourse(button.dataset.searchCourse,Number(button.dataset.searchLesson))});
}
function applyAccessibility(){const settings=state.accessibility;document.documentElement.dataset.fontSize=settings.fontSize||"normal";document.documentElement.dataset.colorVision=settings.colorVision||"default";document.body.classList.toggle("high-contrast",!!settings.highContrast);document.body.classList.toggle("reduce-motion",!!settings.reduceMotion);$$('[data-font-size]').forEach(button=>button.classList.toggle("active",button.dataset.fontSize===settings.fontSize));$("#colorVision").value=settings.colorVision||"default";$("#highContrast").setAttribute("aria-checked",String(!!settings.highContrast));$("#reduceMotion").setAttribute("aria-checked",String(!!settings.reduceMotion));localStorage.setItem("nexo-accessibility",JSON.stringify(settings))}
function setAccessibilityPanel(open){$("#accessibilityPanel").hidden=!open;$("#accessibilityButton").setAttribute("aria-expanded",String(open));$("#loginAccessibilityButton").setAttribute("aria-expanded",String(open));if(open)setTimeout(()=>$("[data-font-size]",$("#accessibilityPanel")).focus(),30)}
function registerOfflineSupport(){if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(error=>console.warn("Falha ao registrar service worker:",error?.message||error))}
const vlibrasUnityAssets=["playerweb.data.unityweb?v=7.6.0","playerweb.wasm.code.unityweb?v=7.6.0","playerweb.wasm.framework.unityweb?v=7.6.0"];
function preloadVLibrasApp(){
  if(document.querySelector('link[data-coda-vlibras-app-preload]'))return;
  const link=document.createElement("link");link.rel="modulepreload";link.href="https://vlibras.gov.br/app/vlibras-plugin-app.js?v=7.6.0";link.crossOrigin="anonymous";link.dataset.codaVlibrasAppPreload="true";document.head.appendChild(link)
}
function preloadVLibrasUnity(){
  vlibrasUnityAssets.forEach(asset=>{
    if(document.querySelector(`link[data-coda-vlibras-unity-preload="${asset}"]`))return;
    const link=document.createElement("link");link.rel="preload";link.as="fetch";link.href=`https://vlibras.gov.br/app/unity/${asset}`;link.crossOrigin="anonymous";link.dataset.codaVlibrasUnityPreload=asset;document.head.appendChild(link)
  })
}
function bindVLibrasIntent(){
  const warm=event=>{
    const path=event.composedPath?.()||[];
    if(!path.some(node=>node?.id==="vlibras-access-wrapper"))return;
    preloadVLibrasUnity();document.removeEventListener("pointerover",warm,true);document.removeEventListener("pointerdown",warm,true);document.removeEventListener("focusin",warm,true)
  };
  document.addEventListener("pointerover",warm,true);document.addEventListener("pointerdown",warm,true);document.addEventListener("focusin",warm,true)
}
function loadVLibrasWhenIdle(){
  const root=document.querySelector("[vw]");if(!root||root.dataset.vlibrasState)return;
  const load=()=>{
    if(root.dataset.vlibrasState)return;root.dataset.vlibrasState="loading";preloadVLibrasApp();
    const plugin=document.createElement("script");plugin.src="https://vlibras.gov.br/app/vlibras-plugin.js";plugin.async=true;plugin.dataset.codaVlibras="true";
    const fail=error=>{if(error)console.warn("Falha ao carregar o VLibras:",error?.message||error);if(root.dataset.vlibrasState!=="loading")return;root.dataset.vlibrasState="unavailable";root.hidden=true;document.documentElement.classList.add("vlibras-unavailable")};
    const timeout=setTimeout(()=>fail(new Error("tempo limite excedido")),12000);
    plugin.onload=()=>{clearTimeout(timeout);if(root.dataset.vlibrasState!=="loading")return;try{if(!window.VLibras?.Widget)throw new Error("VLibras indisponível");root.hidden=false;new window.VLibras.Widget("https://vlibras.gov.br/app");root.dataset.vlibrasState="ready";bindVLibrasIntent()}catch(error){fail(error)}};
    plugin.onerror=()=>{clearTimeout(timeout);fail(new Error("script externo indisponível"))};document.head.appendChild(plugin)
  };
  const schedule=()=>{"requestIdleCallback" in window?window.requestIdleCallback(load,{timeout:2500}):setTimeout(load,700)};
  if(document.readyState==="complete")schedule();else window.addEventListener("load",schedule,{once:true})
}
function bindCollapsibleSections(root=document){$$('.platform-card',root).forEach(card=>{if(card.dataset.collapsibleBound)return;const head=$(':scope > .platform-card-head',card);if(!head||card.children.length<2)return;card.dataset.collapsibleBound="true";const button=document.createElement("button");button.type="button";button.className="section-collapse";button.setAttribute("aria-expanded","true");button.textContent="Recolher";button.onclick=()=>{const collapsed=card.classList.toggle("is-collapsed");button.textContent=collapsed?"Mostrar":"Recolher";button.setAttribute("aria-expanded",String(!collapsed))};head.appendChild(button)})}

function tutorWords(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().match(/[a-z0-9+#.]{2,}/g)||[]}
function tutorKnowledge(query){
  const terms=new Set(tutorWords(query)),activeCourse=state.currentCourse,activeLesson=state.currentLesson;
  return courseBlueprints.flatMap(course=>course.topics.map((topic,lessonIndex)=>{
    const context=lessonContextData(course,lessonIndex),deep=lessonDeepDiveData(course,lessonIndex),enhanced=enhancedLessonData(course,lessonIndex),override=lessonOverride(course.id,lessonIndex);
    const excerpt=[override?.context||context.context,override?.explanation||deep.explanation,override?.commonError||deep.commonError,override?.activity||activityInstruction(course,lessonIndex),(override?.objectives||enhanced.objectives||[]).join(" ")].filter(Boolean).join(" ").replace(/\s+/g," ").slice(0,2200);
    const searchable=tutorWords(`${course.name} ${course.category} ${topic} ${excerpt}`),matches=searchable.reduce((score,word)=>score+(terms.has(word)?1:0),0),activeBonus=course.id===activeCourse?(lessonIndex===activeLesson?5:2):0;
    return {courseId:course.id,courseName:course.name,title:lessonTitle(course,lessonIndex),lessonIndex,excerpt,score:matches+activeBonus};
  })).sort((a,b)=>b.score-a.score).filter((item,index)=>item.score>0||index===0).slice(0,4).map(({score,...item})=>item)
}
function currentTutorContext(){
  let courseId=state.currentCourse,lessonIndex=state.currentLesson;
  if($("#laboratorio")?.classList.contains("active")){courseId=state.activity?.courseId||state.activityCourse||courseId;lessonIndex=Number.isInteger(state.activity?.lesson)?state.activity.lesson:state.activityLesson}
  const course=courseById(courseId),summary=serverWorkspacePayload().summary;
  return {courseId:course.id,courseName:course.name,lessonIndex:Number.isInteger(lessonIndex)?lessonIndex:0,language:state.labLanguage,progress:summary}
}
function updateTutorContext(){const context=currentTutorContext(),node=$("#chatContextText"),starter=starters[state.labLanguage],course=courseById(state.labLanguage);if(node)node.textContent=`${context.courseName} • Aula ${context.lessonIndex+1}`;if($("#chatLabCodeLabel"))$("#chatLabCodeLabel").textContent=`Laboratório atual: ${course.name} • ${starter.file}`}
function currentLabEditorCode(){const editor=$("#codeEditor");if(editor&&state.labLanguage)state.labCode[state.labLanguage]=editor.value;return String(editor?.value||state.labCode[state.labLanguage]||"").slice(0,12000)}
function tutorCode(force=false){if(!force&&!$("#chatIncludeCode")?.checked)return "";return currentLabEditorCode()}
function tutorLabCodes(){currentLabEditorCode();return courseBlueprints.map(course=>({language:course.id,label:`${course.name} • ${starters[course.id].file}`,code:String(state.labCode[course.id]||starters[course.id].code||"").slice(0,12000)})).filter(item=>item.code.trim()).slice(0,14)}
function pastedTutorCode(message){const raw=String(message||"").replace(/\r\n?/g,"\n"),blocks=[...raw.matchAll(/```\s*([a-z0-9+#.-]*)\s*\n?([\s\S]*?)```/gi)].map(match=>({language:match[1],code:String(match[2]||"").trim()})).filter(item=>item.code);if(blocks.length)return blocks.sort((a,b)=>b.code.length-a.code.length)[0];const introduced=raw.match(/(?:meu\s+c[oó]digo|c[oó]digo|code)\s*:?\s*([\s\S]+)/i)?.[1]?.trim()||"",looksLikeCode=value=>/[{}();]|=>|<\/?[a-z][^>]*>|#include|\b(?:const|let|var|function|def|class|interface|import|from|print|printf|setup|loop|SELECT|INSERT|UPDATE|DELETE|CREATE|public|private|return|if|else|for|while)\b/i.test(value);if(looksLikeCode(introduced))return {code:introduced.slice(0,12000),language:""};if((raw.includes("\n")||raw.length<500)&&looksLikeCode(raw))return {code:raw.trim().slice(0,12000),language:""};return {code:"",language:""}}
function tutorProviderLabel(provider){return provider==="local-research"?"Fontes científicas • Crossref":"Base local da Coda"}
function addMessage(kind,text,meta={}){
  const row=document.createElement("div");row.className=`message ${kind}`;if(meta.pending)row.classList.add("pending");
  if(kind!=="user"){const avatar=document.createElement("span");avatar.textContent="TC";row.appendChild(avatar)}
  const body=document.createElement("div");body.className="message-body";const paragraph=document.createElement("p");
  if(meta.pending){const dots=document.createElement("span");dots.className="typing-dots";dots.innerHTML="<i></i><i></i><i></i>";paragraph.append("Pensando ",dots)}else if(meta.animate&&!state.accessibility.reduceMotion){paragraph.textContent="";const parts=String(text).split(/(\s+)/),step=()=>{paragraph.textContent+=parts.splice(0,4).join("");$("#messages").scrollTop=$("#messages").scrollHeight;if(parts.length)requestAnimationFrame(step)};requestAnimationFrame(step)}else paragraph.textContent=text;
  body.appendChild(paragraph);
  if(kind!=="user"&&!meta.pending){
    if(meta.sources?.length){const sources=document.createElement("div");sources.className="chat-sources";meta.sources.slice(0,5).forEach(source=>{if(source.sourceType==="scientific"){const link=document.createElement("a");link.className="scientific-source";link.href=source.url;link.target="_blank";link.rel="noopener noreferrer";const strong=document.createElement("strong");strong.textContent=source.title;const small=document.createElement("small");small.textContent=`${source.authors||"Autores não informados"} • ${source.year||"s.d."} • ${source.journal||"Periódico"}`;const tag=document.createElement("b");tag.textContent=source.doi?`DOI ${source.doi}`:"Abrir registro científico";link.append(strong,small,tag);sources.appendChild(link)}else{const button=document.createElement("button");button.type="button";button.textContent=`${source.courseName||source.courseId} • Aula ${Number(source.lessonIndex)+1}`;button.title=source.title||"Abrir fonte";button.onclick=()=>openCourse(source.courseId,Number(source.lessonIndex)||0);sources.appendChild(button)}});body.appendChild(sources)}
    if(meta.actions?.length){const actions=document.createElement("div");actions.className="chat-actions";meta.actions.forEach(action=>{const button=document.createElement("button");button.type="button";button.textContent=action.label;button.onclick=()=>runTutorAction(action);actions.appendChild(button)});body.appendChild(actions)}
    const footer=document.createElement("div");footer.className="chat-message-meta";const provider=document.createElement("span");provider.className=`chat-provider ${meta.provider==="local-research"?"research":""}`;provider.textContent=tutorProviderLabel(meta.provider);footer.appendChild(provider);
    if(meta.id){const feedback=document.createElement("span");feedback.className="chat-feedback";[-1,1].forEach(value=>{const button=document.createElement("button");button.type="button";button.textContent=value===1?"Útil":"Melhorar";if(Number(meta.feedback)===value)button.classList.add("selected");button.onclick=async()=>{try{await CodaAPI.rateChatMessage(meta.id,value);$$('button',feedback).forEach(item=>item.classList.remove("selected"));button.classList.add("selected")}catch{showToast("Não foi possível registrar a avaliação")}};feedback.appendChild(button)});footer.appendChild(feedback)}
    body.appendChild(footer)
  }
  row.appendChild(body);$("#messages").appendChild(row);$("#messages").scrollTop=$("#messages").scrollHeight;return row
}
function runTutorAction(action){if(action.type==="open_lab")goToView("laboratorio");if(action.type==="open_lesson")openCourse(action.courseId,Number(action.lessonIndex)||0);if(action.type==="open_questions")goToView("turmas");$("#chat").classList.remove("open")}
function offlineTutorReply(question,sources,code,image){
  const primary=sources[0],label=primary?`${primary.courseName}, aula ${Number(primary.lessonIndex)+1}`:"a trilha atual";
  if(image&&!code)return `Esta versão local não interpreta imagens. Copie a mensagem de erro ou descreva o que aparece. A fonte mais próxima é ${label}.`;
  if(code)return "A análise detalhada do código não ficou disponível porque a comunicação com o servidor local falhou. Mantenha a janela preta do servidor aberta, atualize a página e envie o código novamente; assim o Tutor evita informar incorretamente que não há erro.";
  if(state.tutor.mode==="quiz")return `Vamos testar ${primary?.title||"a aula atual"}: explique com suas palavras para que esse conceito serve. Depois eu comparo seu raciocínio com o conteúdo da Coda.`;
  if(state.tutor.mode==="hint")return `Pista inicial baseada em ${label}: ${primary?.excerpt?.split(/[.!?]/)[0]||"identifique primeiro a entrada, o processamento e a saída"}. Qual é a primeira linha em que o resultado fica diferente do esperado?`;
  return primary?`Com base em ${label} — ${primary.title}:\n\n${primary.excerpt.slice(0,800)}\n\nQuer um exemplo pequeno ou uma pergunta de revisão?`:"Posso explicar uma aula, dar uma pista, revisar para prova ou analisar o código do laboratório. Diga o que você esperava e o que aconteceu."
}
async function sendTutorMessage(question,options={}){
  const text=String(question||"").trim();if(!text||state.tutor.busy)return;
  const codes=Array.isArray(options.codes)?options.codes.slice(0,14):[];state.tutor.busy=true;$("#chatSend").disabled=true;if($("#chatAnalyzeCurrent"))$("#chatAnalyzeCurrent").disabled=true;if($("#chatAnalyzeAll"))$("#chatAnalyzeAll").disabled=true;addMessage("user",text);const pending=addMessage("bot","",{pending:true}),sources=tutorKnowledge(text),pasted=pastedTutorCode(text);if((pasted.code||codes.length||options.forceLabCode)&&state.tutor.mode!=="code")selectTutorMode("code");const context=currentTutorContext(),code=pasted.code||tutorCode(Boolean(options.forceLabCode));if(pasted.language)context.language=pasted.language;
  try{
    const result=await CodaAPI.sendChatMessage({conversationId:state.tutor.conversationId,message:text,mode:state.tutor.mode,code,codes,sources,context});
    state.tutor.conversationId=result.conversationId;state.tutor.provider=result.provider;state.tutor.model=result.model;pending.remove();addMessage("bot",result.message.content,{...result.message,provider:result.provider,model:result.model,animate:true});
    $("#chatStatus").innerHTML=`<i></i> ${escapeHtml(tutorProviderLabel(result.provider,result.model))}`
  }catch(error){pending.remove();addMessage("bot",offlineTutorReply(text,sources,code||codes.length,""),{sources,provider:"local",model:"Modo offline",animate:true});showToast(error.status?error.message:"Servidor indisponível: resposta local ativada")}
  finally{state.tutor.busy=false;$("#chatSend").disabled=false;if($("#chatAnalyzeCurrent"))$("#chatAnalyzeCurrent").disabled=false;if($("#chatAnalyzeAll"))$("#chatAnalyzeAll").disabled=false;$("#chatInput").focus();$("#messages").scrollTop=$("#messages").scrollHeight}
}
function clearTutorView(){$("#messages").innerHTML=""}
function welcomeTutor(){addMessage("bot","Olá! Posso consultar as aulas da Coda, manter o contexto da conversa, revisar os 14 códigos do laboratório ou código colado de outras linguagens e buscar artigos científicos verificáveis. Escolha um modo acima ou descreva sua dúvida.",{provider:state.tutor.provider,model:state.tutor.model})}
async function newTutorConversation(){state.tutor.conversationId=null;clearTutorView();$("#chatHistory").hidden=true;welcomeTutor();updateTutorContext();$("#chatInput").focus()}
async function loadTutorConversation(id){
  try{const data=await CodaAPI.chatMessages(id);state.tutor.conversationId=Number(id);clearTutorView();data.messages.forEach(message=>addMessage(message.role==="assistant"?"bot":"user",message.content,{...message,provider:"saved",model:"Histórico"}));$("#chatHistory").hidden=true;if(!data.messages.length)welcomeTutor()}catch(error){showToast(error.message)}
}
async function renderTutorHistory(){
  const panel=$("#chatHistory"),list=$("#chatConversationList");panel.hidden=false;list.innerHTML='<p class="chat-empty">Carregando conversas...</p>';
  try{const data=await CodaAPI.chatConversations();list.innerHTML="";if(!data.conversations.length){list.innerHTML='<p class="chat-empty">Nenhuma conversa salva ainda.</p>';return}data.conversations.forEach(conversation=>{const row=document.createElement("div");row.className="chat-conversation";const open=document.createElement("button");open.type="button";const strong=document.createElement("strong");strong.textContent=conversation.title;const small=document.createElement("small");small.textContent=`${conversation.message_count} mensagens • ${conversation.mode}`;open.append(strong,small);open.onclick=()=>loadTutorConversation(conversation.id);const remove=document.createElement("button");remove.type="button";remove.className="delete-chat";remove.textContent="×";remove.title="Excluir conversa";remove.onclick=async()=>{if(!confirm("Excluir esta conversa do Tutor Coda?"))return;try{await CodaAPI.deleteChatConversation(conversation.id);if(state.tutor.conversationId===conversation.id)await newTutorConversation();await renderTutorHistory()}catch(error){showToast(error.message)}};row.append(open,remove);list.appendChild(row)})}catch(error){list.innerHTML=`<p class="chat-empty">${escapeHtml(error.message)}</p>`}
}
async function bootTutor(){
  if(state.student?.role!=="Aluno"||state.tutor.booted)return;state.tutor.booted=true;updateTutorContext();
    try{const [status,history]=await Promise.all([CodaAPI.chatStatus(),CodaAPI.chatConversations()]);state.tutor.provider=status.provider;state.tutor.model=status.model;$("#chatStatus").innerHTML="<i></i> Base local + artigos científicos";if(history.conversations?.[0])await loadTutorConversation(history.conversations[0].id);else welcomeTutor()}catch{$("#chatStatus").innerHTML="<i></i> Base local offline";welcomeTutor()}
}
const tutorModeHints={explain:"Explicação clara usando a aula atual e o seu progresso.",hint:"Pistas em etapas, sem entregar a solução pronta.",code:"Analise o laboratório atual, os 14 códigos de uma vez ou cole código de qualquer linguagem.",quiz:"Uma pergunta por vez, com feedback baseado na aula.",research:"Busca artigos na web pelo Crossref e mostra DOI, autores e ano."};
function selectTutorMode(mode){state.tutor.mode=mode;$$('[data-chat-mode]').forEach(item=>item.classList.toggle("active",item.dataset.chatMode===mode));$("#chatModeHint").textContent=tutorModeHints[mode]||tutorModeHints.explain;$("#chatInput").placeholder=mode==="code"?"Cole qualquer código aqui ou use os botões do laboratório...":"Escreva sua dúvida com o máximo de contexto...";if($("#chatCodeTools"))$("#chatCodeTools").hidden=mode!=="code";updateTutorContext()}
function bindTutorEvents(){
  $("#chatButton").onclick=()=>{$("#chat").classList.toggle("open");updateTutorContext();if($("#chat").classList.contains("open"))$("#chatInput").focus()};$("#closeChat").onclick=()=>$("#chat").classList.remove("open");
  $("#chatHistoryButton").onclick=renderTutorHistory;$("#closeChatHistory").onclick=()=>$("#chatHistory").hidden=true;$("#newChatButton").onclick=newTutorConversation;
  $$('[data-chat-mode]').forEach(button=>button.onclick=()=>selectTutorMode(button.dataset.chatMode));
  $("#chatAnalyzeCurrent").onclick=()=>{selectTutorMode("code");$("#chatIncludeCode").checked=true;const course=courseById(state.labLanguage);sendTutorMessage(`Analise o código atual do laboratório de ${course.name}.`,{forceLabCode:true})};
  $("#chatAnalyzeAll").onclick=()=>{selectTutorMode("code");sendTutorMessage("Analise todos os 14 códigos salvos nos laboratórios e mostre um resumo por linguagem.",{codes:tutorLabCodes()})};
  $$('[data-question]').forEach(button=>button.addEventListener("click",()=>{if(button.dataset.useCode){$("#chatIncludeCode").checked=true;selectTutorMode("code")}if(button.dataset.useResearch)selectTutorMode("research");sendTutorMessage(button.dataset.question)}));
  $("#chatForm").addEventListener("submit",event=>{event.preventDefault();const input=$("#chatInput"),text=input.value.trim();if(!text)return;input.value="";input.style.height="auto";sendTutorMessage(text)});
  $("#chatInput").addEventListener("input",event=>{event.target.style.height="auto";event.target.style.height=`${Math.min(140,event.target.scrollHeight)}px`});$("#chatInput").addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();$("#chatForm").requestSubmit()}})
}

function bindEvents(){
  $$('[data-view]').forEach(button=>button.addEventListener("click",()=>goToView(button.dataset.view)));
  $$('[data-teacher-section]').forEach(button=>button.addEventListener("click",()=>showTeacherSection(button.dataset.teacherSection)));
  $$('[data-admin-section]').forEach(button=>button.addEventListener("click",()=>{state.adminSection=button.dataset.adminSection;window.CodaAdmin?.showSection?.(state.adminSection)}));
  $$('[data-open-teacher-section]').forEach(button=>button.addEventListener("click",()=>showTeacherSection(button.dataset.openTeacherSection)));
  $$('[data-category]').forEach(button=>button.addEventListener("click",()=>{state.category=button.dataset.category;goToView("materias");$$('#courseFilters [data-category]').forEach(item=>item.classList.toggle("active",item.dataset.category===state.category));renderCourses()}));
  $$('#courseFilters [data-category]').forEach(button=>button.addEventListener("click",()=>{$$('#courseFilters [data-category]').forEach(item=>item.classList.remove("active"));button.classList.add("active");state.category=button.dataset.category;renderCourses()}));
  $("#globalSearch").addEventListener("input",renderGlobalSearch);
  $("#videoSearch").addEventListener("input",event=>{state.videoSearch=event.target.value;const first=visibleVideos()[0];if(first)state.currentVideo=first.index;renderVideos()});
  $("#videoCourseSelect").addEventListener("change",event=>{state.videoCourse=event.target.value;const first=visibleVideos()[0];if(first)state.currentVideo=first.index;renderVideos()});
  $$('[data-video-length]').forEach(button=>button.addEventListener("click",()=>{state.videoLength=button.dataset.videoLength;renderVideos();showToast(state.videoLength==="short"?"Vídeos curtos ativados":"Videoaulas completas ativadas")}));
  document.addEventListener("keydown",event=>{if(event.key==="Escape"){state.wiringSelected=null;state.threeDWireSelection=null;$$("[data-terminal].selected,[data-prototype-terminal].selected").forEach(item=>item.classList.remove("selected"));if($("#wiringSelection"))updateWiringSelection();showToast("Modo de conexão cancelado")}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"&&state.student?.role==="Aluno"){event.preventDefault();$("#globalSearch").focus()}if((event.ctrlKey||event.metaKey)&&event.key==="Enter"&&$("#laboratorio").classList.contains("active"))runLab();if(event.key==="Escape"){$("#globalSearchResults").hidden=true;setAccessibilityPanel(false);if(document.body.classList.contains("lesson-focus")){document.body.classList.remove("lesson-focus");renderLesson()}}if(event.key==="Enter"&&document.activeElement===$("#globalSearch")){const first=$("[data-search-course]",$("#globalSearchResults"));if(first){event.preventDefault();first.click()}}});
  document.addEventListener("click",event=>{if(!event.target.closest(".search-wrap"))$("#globalSearchResults").hidden=true;if(!event.target.closest("#accessibilityPanel")&&!event.target.closest("#accessibilityButton")&&!event.target.closest("#loginAccessibilityButton"))setAccessibilityPanel(false)});
  $("#menuButton").onclick=()=>{$("#sidebar").classList.add("is-open");$("#backdrop").classList.add("is-open")};$("#backdrop").onclick=()=>{$("#sidebar").classList.remove("is-open");$("#backdrop").classList.remove("is-open")};
  $("#themeToggle").onclick=()=>{const theme=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=theme;localStorage.setItem("nexo-theme",theme)};
  $("#accessibilityButton").onclick=()=>setAccessibilityPanel($("#accessibilityPanel").hidden);$("#loginAccessibilityButton").onclick=()=>setAccessibilityPanel($("#accessibilityPanel").hidden);$("#closeAccessibility").onclick=()=>setAccessibilityPanel(false);
  $$('[data-font-size]').forEach(button=>button.onclick=()=>{state.accessibility.fontSize=button.dataset.fontSize;applyAccessibility()});$("#colorVision").onchange=event=>{state.accessibility.colorVision=event.target.value;applyAccessibility();showToast("Perfil de cores aplicado")};$("#highContrast").onclick=()=>{state.accessibility.highContrast=!state.accessibility.highContrast;applyAccessibility()};$("#reduceMotion").onclick=()=>{state.accessibility.reduceMotion=!state.accessibility.reduceMotion;applyAccessibility()};$("#resetAccessibility").onclick=()=>{state.accessibility={fontSize:"normal",colorVision:"default",highContrast:false,reduceMotion:false};applyAccessibility();showToast("Acessibilidade restaurada")};
  $("#readCurrentPage").onclick=()=>{if(!("speechSynthesis" in window)){showToast("Leitura por voz indisponível neste navegador");return}speechSynthesis.cancel();const active=$(".view.active")||$("#loginScreen"),text=active.innerText.replace(/\s+/g," ").slice(0,12000),utterance=new SpeechSynthesisUtterance(text);utterance.lang="pt-BR";utterance.rate=.95;utterance.onend=()=>{$("#stopReading").disabled=true};$("#stopReading").disabled=false;speechSynthesis.speak(utterance);showToast("Leitura do conteúdo iniciada")};
  $("#stopReading").onclick=()=>{speechSynthesis.cancel();$("#stopReading").disabled=true;showToast("Leitura interrompida")};
  $("#dailyGoal").onchange=event=>{state.dailyGoal=Number(event.target.value);saveStudentWorkspace();renderStudentHub();showToast("Meta diária atualizada")};$("#toggleTimer").onclick=toggleStudyTimer;$("#resetTimer").onclick=resetStudyTimer;$("#exportProgress").onclick=exportStudentProgress;
  $("#customizeDashboard").onclick=()=>{const panel=$("#dashboardPreferences"),open=panel.hidden;panel.hidden=!open;$("#customizeDashboard").setAttribute("aria-expanded",String(open))};$$('[data-dashboard-card]').forEach(input=>input.onchange=()=>{state.dashboardCards[input.dataset.dashboardCard]=input.checked;localStorage.setItem("nexo-dashboard-cards",JSON.stringify(state.dashboardCards));renderStudentHub()});
  $("#labLanguage").addEventListener("change",event=>{state.labCode[state.labLanguage]=$("#codeEditor").value;state.labLanguage=event.target.value;state.activity=null;renderLab();updateTutorContext()});
  $("#codeEditor").addEventListener("input",event=>{state.labCode[state.labLanguage]=event.target.value;clearTimeout(bindEvents.labSaveTimer);bindEvents.labSaveTimer=setTimeout(saveStudentWorkspace,500);updateLines();const pos=event.target.selectionStart,before=event.target.value.slice(0,pos).split("\n");$("#cursorInfo").textContent=`LIN ${before.length}, COL ${before.at(-1).length+1}`});
  $("#codeEditor").addEventListener("keydown",event=>{if(event.key==="Tab"){event.preventDefault();const el=event.target,start=el.selectionStart,end=el.selectionEnd;el.value=el.value.slice(0,start)+"  "+el.value.slice(end);el.selectionStart=el.selectionEnd=start+2;state.labCode[state.labLanguage]=el.value;updateLines()}});
  $("#runLab").onclick=runLab;$("#downloadCode").onclick=downloadCurrentCode;$("#resetLab").onclick=()=>{state.labCode[state.labLanguage]=starters[state.labLanguage].code;state.activity=null;saveStudentWorkspace();renderLab();showToast("Código inicial restaurado")};
  $("#formatCode").onclick=()=>{const editor=$("#codeEditor");editor.value=editor.value.split("\n").map(line=>line.replace(/\s+$/g,"")).join("\n").replace(/\n{3,}/g,"\n\n");state.labCode[state.labLanguage]=editor.value;updateLines();showToast("Espaços e linhas organizados")};
  $("#copyLabCode").onclick=async()=>{try{await navigator.clipboard.writeText($("#codeEditor").value);showToast("Código copiado")}catch{showToast("Não foi possível copiar automaticamente")}};
  $("#clearOutput").onclick=()=>{showConsole("Saída limpa. Execute o código para gerar um novo resultado.");setLabTestResult(0,0,"Testes aguardando execução")};
  $$('[data-output]').forEach(button=>button.addEventListener("click",()=>{const consoleTab=button.dataset.output==="console";$("#codePreview").hidden=consoleTab;$("#consoleOutput").hidden=!consoleTab;$$('[data-output]').forEach(item=>item.classList.toggle("active",item===button))}));
  $$('[data-rotate]').forEach(button=>button.addEventListener("click",()=>{const action=button.dataset.rotate;if(action==="left")boardZ-=12;if(action==="right")boardZ+=12;if(action==="up")boardX=Math.min(78,boardX+8);if(action==="down")boardX=Math.max(8,boardX-8);if(action==="reset"){boardX=52;boardZ=-23;boardScale=1}updateBoard()}));
  $$('[data-esp-mode]').forEach(button=>button.addEventListener("click",()=>{
    state.espMode=button.dataset.espMode;
    renderEspMode();
    // Um único clique no ícone 🥽 já solicita a sessão immersive-ar.
    // O próprio clique funciona como gesto exigido pelos navegadores XR.
    if(state.espMode==="ar") window.CodaAR?.enterAR?.({mode:"view",device:"headset"});
    if(state.espMode==="mobilear") window.CodaAR?.enterMobileAR?.();
  }));
  $("#loadWiringExample").onclick=loadWiringExample;
  $("#undoWire").onclick=()=>{const previous=(state.wiringHistory||[]).pop();if(!previous){showToast("Nada para desfazer");return}state.wiringRedo=[...(state.wiringRedo||[]),wiringSnapshot()];restoreWiringSnapshot(previous);showToast("Última ação da bancada desfeita")};
  $("#clearWires").onclick=()=>{if(!confirm("Limpar todos os fios e componentes adicionados?"))return;pushWiringHistory();state.wiringByProject[wiringStorageId()]=[];state.wiringSelected=null;localStorage.setItem("nexo-wiring",JSON.stringify(state.wiringByProject));updateWiringSelection();renderWirePaths();renderCircuitResult();showToast("Bancada limpa")};
  $("#powerCircuit").onclick=()=>{renderCircuitResult(true);showToast(circuitIsComplete()?"Circuito funcionando na simulação":"Complete as ligações antes de testar")};
  let simDigitalHigh=false;const updateSignal=()=>{const value=Number($("#simAnalog").value);$("#simAnalogValue").textContent=value;$("#simVoltage").textContent=`${(value/4095*3.3).toFixed(2)} V`;$("#simDigital").textContent=`${simDigitalHigh?"● DIGITAL HIGH":"○ DIGITAL LOW"}`;$("#simDigital").classList.toggle("active",simDigitalHigh);$("#espScene").classList.toggle("sim-high",simDigitalHigh&&$("#simGpio").value==="GPIO2")};
  $("#simAnalog").oninput=updateSignal;$("#simGpio").onchange=updateSignal;$("#simDigital").onclick=()=>{simDigitalHigh=!simDigitalHigh;updateSignal();showToast(`${$("#simGpio").value} em ${simDigitalHigh?"HIGH":"LOW"}`)};updateSignal();
  const scene=$("#espScene");scene.addEventListener("pointerdown",event=>{dragging=true;lastX=event.clientX;lastY=event.clientY;scene.setPointerCapture(event.pointerId)});scene.addEventListener("pointermove",event=>{if(!dragging)return;boardZ+=(event.clientX-lastX)*.35;boardX=Math.max(5,Math.min(82,boardX-(event.clientY-lastY)*.25));lastX=event.clientX;lastY=event.clientY;updateBoard()});scene.addEventListener("pointerup",()=>dragging=false);scene.addEventListener("wheel",event=>{event.preventDefault();boardScale=Math.max(.7,Math.min(1.35,boardScale-event.deltaY*.001));updateBoard()},{passive:false});
  $$('[data-level]').forEach(button=>button.addEventListener("click",()=>{$$('[data-level]').forEach(item=>item.classList.remove("active"));button.classList.add("active");state.quizLevel=button.dataset.level;resetQuiz()}));
  $$('[data-assessment-mode]').forEach(button=>button.addEventListener("click",()=>setAssessmentMode(button.dataset.assessmentMode)));$("#quizDifficulty").addEventListener("change",()=>{if(state.quizMode==="subjects")renderQuiz()});
  $$('[data-topic]').forEach(button=>button.addEventListener("click",()=>{$$('[data-topic]').forEach(item=>item.classList.remove("active"));button.classList.add("active");state.communityTopic=button.dataset.topic;renderPosts()}));
  $("#postForm").addEventListener("submit",event=>{event.preventDefault();const author=state.student?.name||"Aluno coda";state.posts.unshift({id:Date.now(),author,initials:studentInitials(author),role:state.student?.role||"Aluno",time:"agora",topic:$("#postTopic").value,title:$("#postTitle").value.trim(),body:$("#postBody").value.trim(),likes:0,respostas:[]});saveDatabase();event.target.reset();state.communityTopic="Todos";renderPosts();showToast("Pergunta publicada")});
  bindTutorEvents();
}

window.CodaCore={
  courses:courseBlueprints.map(course=>({id:course.id,name:course.name,category:course.category,topics:[...course.topics]})),
  showToast,
  openCourse,
  navigate:goToView,
  showTeacherSection,
  getCurrentUser:()=>state.student,
  getLearningContext(){const course=courseById(state.currentCourse),key=`${course.id}:${state.currentLesson}`;return {student:state.student,courseId:course.id,courseName:course.name,lesson:state.currentLesson,lessonTitle:lessonTitle(course,state.currentLesson),progress:coursePercent(course.id),completed:{...state.completed},activities:{...state.activities},lessonChecks:{...state.lessonChecks},adaptiveResults:{...state.adaptiveResults},currentKey:key,language:state.labLanguage,currentCode:currentLabEditorCode(),lessonCode:lessonCode(course,state.currentLesson),activity:state.activity}},
  markAdaptiveResult(courseId,lesson,result){const key=`${courseId}:${lesson}`,previous=state.adaptiveResults[key]||{};state.adaptiveResults[key]={...previous,...result,attempts:Number(previous.attempts||0)+1,updatedAt:new Date().toISOString()};saveStudentWorkspace();trackLearningEvent("exercicio_adaptativo",{courseId,lesson,correct:Boolean(result.correct)});return state.adaptiveResults[key]},
  sendTutorMessage,
  selectTutorMode,
  getLabSnapshot:()=>({language:state.labLanguage,code:currentLabEditorCode(),activity:state.activity}),
  trackLearningEvent,
  saveStudentWorkspace,
  renderStudentHub,
  renderCourse,
  getLessonVideoData(courseId,lesson,mode="short"){const course=courseById(courseId),index=Math.max(0,Math.min(6,Number(lesson)||0));return lessonVideoData(course,index,mode)},
  getLessonEditorData(courseId,lesson){const course=courseById(courseId),index=Math.max(0,Math.min(6,Number(lesson)||0)),override=lessonOverride(course.id,index),context=lessonContextData(course,index),deep=lessonDeepDiveData(course,index),enhanced=enhancedLessonData(course,index),video=lessonVideoData(course,index,"full");return {courseId:course.id,lesson:index,title:lessonTitle(course,index),status:override?.status||"published",context:context.context,explanation:deep.explanation,system:context.system,commonError:deep.commonError.replace(/^Erro comum:\s*/i,""),activity:activityInstruction(course,index),objectives:override?.objectives||enhanced.objectives,prerequisites:override?.prerequisites||enhanced.prerequisites,checkpoints:override?.checkpoints||enhanced.mastery,videoUrl:video.url,videoNote:video.note}},
  refreshTeacher:()=>renderTeacherArea(),
  applyServerContent(payload){
    if(!appDatabase)return;
    (payload.lessons||[]).forEach(row=>{const content={courseId:row.course_id,lesson:Number(row.lesson_index),title:row.title,status:row.status,context:row.context,explanation:row.explanation,system:row.system_example,commonError:row.common_error,activity:row.activity,objectives:row.objectives||[],prerequisites:row.prerequisites||[],checkpoints:row.checkpoints||[],updatedAt:row.updated_at};const index=appDatabase.conteudos.findIndex(item=>item.courseId===content.courseId&&Number(item.lesson)===content.lesson);if(index>=0)appDatabase.conteudos[index]=content;else appDatabase.conteudos.push(content);if(row.video_url){const video={courseId:row.course_id,lesson:Number(row.lesson_index),url:row.video_url,note:row.video_note,updatedAt:row.updated_at},videoIndex=appDatabase.videos.findIndex(item=>item.courseId===video.courseId&&Number(item.lesson)===video.lesson);if(videoIndex>=0)appDatabase.videos[videoIndex]=video;else appDatabase.videos.push(video)}});
    (payload.materials||[]).forEach(row=>{if(appDatabase.recursos.some(item=>String(item.serverId)===String(row.id)))return;appDatabase.recursos.push({serverId:row.id,id:`server-resource-${row.id}`,courseId:row.course_id,lesson:Number(row.lesson_index),type:row.material_type,author:row.author,title:row.title,url:row.url,note:row.note,status:row.status,createdAt:row.created_at})});
    renderCourses();renderVideos();if($("#curso").classList.contains("active"))renderCourse();if(state.student?.role==="Professor")renderTeacherArea();
  },
  applyServerChallenges(rows=[]){
    if(!appDatabase)return;
    appDatabase.desafiosExtras=appDatabase.desafiosExtras.filter(item=>!item.serverId);
    rows.forEach(row=>appDatabase.desafiosExtras.push({serverId:Number(row.id),id:Number(row.id),classId:row.class_id,courseId:row.course_id,title:row.title,instruction:row.instruction,code:row.starter_code||starters[row.course_id]?.code||"",status:row.status,dueAt:row.due_at,createdAt:row.created_at}));
    renderCustomChallengeList();
    const count=$("#teacherChallengeCount");if(count)count.textContent=rows.length;
  }
};

async function init(){document.documentElement.dataset.theme=localStorage.getItem("nexo-theme")||"light";applyAccessibility();courseBlueprints.forEach(course=>{state.labCode[course.id]=starters[course.id].code});await loadDatabase();await bindStudentAccess();bindEvents();bindLabV2();bindTeacherArea();renderCourses();renderVideos();renderLab();renderEsp();renderQuiz();renderPosts();updateDashboard();renderStudentHub();updateBoard();bindCollapsibleSections();registerOfflineSupport();loadVLibrasWhenIdle();window.addEventListener("resize",()=>requestAnimationFrame(renderWirePaths));dispatchCoda("ready",{user:state.student})}
init();
