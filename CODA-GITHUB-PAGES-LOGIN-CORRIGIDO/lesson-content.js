"use strict";

// Exemplos progressivos: cada item corresponde à aula 1–7 da respectiva trilha.
window.CodaLessonExamples = {
  html: [
`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Minha primeira página</title></head>
<body><h1>A Web começa com conteúdo</h1><p>O navegador transforma HTML em uma página.</p></body></html>`,
`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Portal escolar</title></head>
<body><header>coda</header><main><h1>Portal escolar</h1></main></body></html>`,
`<main><h1>Plano de estudos</h1><ol><li>HTML</li><li>CSS</li><li>JavaScript</li></ol>
<p>Consulte também o <a href="https://developer.mozilla.org/pt-BR/">MDN</a>.</p></main>`,
`<figure><img src="foto-projeto.jpg" alt="Protótipo de uma estação meteorológica sobre a mesa">
<figcaption>Projeto desenvolvido na trilha de tecnologia.</figcaption></figure>`,
`<header><h1>Jornal da escola</h1></header><nav aria-label="Principal"><a href="#noticias">Notícias</a></nav>
<main id="noticias"><article><h2>Feira de tecnologia</h2><p>Resumo da notícia.</p></article></main><footer>2026</footer>`,
`<form><label for="nome">Nome completo</label><input id="nome" name="nome" required>
<label for="email">E-mail</label><input id="email" name="email" type="email" required>
<button type="submit">Enviar inscrição</button></form>`,
`<header><h1>Portfólio de Ana</h1></header><main><section><h2>Sobre</h2><p>Estudante de tecnologia.</p></section>
<section><h2>Projetos</h2><article><h3>Agenda escolar</h3><p>HTML semântico e acessível.</p></article></section></main>`
  ],
  css: [
`h1 { color: #315c4b; }
.destaque { color: #5b3cc4; }
#aviso { font-weight: 800; }`,
`:root { font-size: 16px; }
body { color: #24342d; font-family: Arial, sans-serif; }
h1 { font-size: 2rem; } p { line-height: 1.7; max-width: 65ch; }`,
`* { box-sizing: border-box; }
.card { width: 320px; padding: 24px; border: 2px solid #5b3cc4; margin: 16px auto; border-radius: 16px; }`,
`.barra { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.barra nav { display: flex; gap: 8px; }`,
`.painel { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.painel article { padding: 20px; border: 1px solid #d9d3e8; }`,
`.botao { transition: transform .2s, background .2s; }
.botao:hover { transform: translateY(-2px); background: #315c4b; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`,
`.pagina { width: min(1120px, 92%); margin: auto; }
.hero { display: grid; grid-template-columns: 1.2fr .8fr; gap: 32px; }
@media (max-width: 720px) { .hero { grid-template-columns: 1fr; } }`
  ],
  javascript: [
`const materia = "JavaScript";
let aulasConcluidas = 1;
console.log(materia, aulasConcluidas);`,
`const nota = 8;
const situacao = nota >= 7 ? "aprovado" : "em recuperação";
console.log(situacao);`,
`for (let aula = 1; aula <= 7; aula += 1) {
  console.log("Aula", aula);
}`,
`function calcularProgresso(concluidas, total) {
  return Math.round((concluidas / total) * 100);
}
console.log(calcularProgresso(4, 7));`,
`const aluno = { nome: "Lia", habilidades: ["HTML", "CSS"] };
aluno.habilidades.push("JavaScript");
console.log(aluno.habilidades);`,
`const formulario = document.querySelector("form");
formulario.addEventListener("submit", evento => { evento.preventDefault(); console.log("Dados validados"); });`,
`const tarefas = [];
function adicionar(titulo) { tarefas.push({ id: Date.now(), titulo, concluida: false }); }
function concluir(id) { const item = tarefas.find(t => t.id === id); if (item) item.concluida = true; }
adicionar("Revisar funções"); console.table(tarefas);`
  ],
  typescript: [
`const curso: string = "TypeScript";
const aulas: number = 7;
const publicado: boolean = true;`,
`let nivel = "iniciante";
const pontos: number = 120;
// nivel recebe tipo string por inferência.`,
`interface Aluno { nome: string; ativo: boolean; }
const aluno: Aluno = { nome: "Ravi", ativo: true };`,
`type Resultado = { ok: true; dados: string[] } | { ok: false; erro: string };
function exibir(r: Resultado) { return r.ok ? r.dados.join(", ") : r.erro; }`,
`function media(notas: number[]): number {
  return notas.reduce((soma, nota) => soma + nota, 0) / notas.length;
}`,
`function primeiro<T>(itens: T[]): T | undefined { return itens[0]; }
type Resumo = Pick<{ nome: string; email: string; senha: string }, "nome" | "email">;`,
`type Curso = { id: number; nome: string; categoria: "web" | "sistemas" };
const catalogo: Curso[] = [{ id: 1, nome: "HTML", categoria: "web" }];
const web = catalogo.filter(curso => curso.categoria === "web");`
  ],
  python: [
`materia = "Python"
aulas = 7
print(f"{materia}: {aulas} aulas")`,
`nota = float(input("Nota: "))
if nota >= 7:
    print("Aprovado")
else:
    print("Continue estudando")`,
`for numero in range(1, 8):
    print("Aula", numero)
contador = 3
while contador > 0:
    contador -= 1`,
`def calcular_media(notas):
    return sum(notas) / len(notas)
print(calcular_media([8, 9, 10]))`,
`aluno = {"nome": "Bia", "notas": [8, 9, 10]}
aluno["media"] = sum(aluno["notas"]) / len(aluno["notas"])
print(aluno)`,
`try:
    with open("plano.txt", "r", encoding="utf-8") as arquivo:
        print(arquivo.read())
except FileNotFoundError:
    print("Crie o plano antes de ler.")`,
`tarefas = []
def adicionar(titulo, materia):
    tarefas.append({"titulo": titulo, "materia": materia, "concluida": False})
adicionar("Revisar funções", "Python")
print(*tarefas, sep="\n")`
  ],
  c: [
`#include <stdio.h>
int main(void) { printf("Primeiro programa em C\n"); return 0; }`,
`#include <stdio.h>
int main(void) { int aulas = 7; float media = 8.5f; printf("%d aulas, média %.1f\n", aulas, media); return 0; }`,
`#include <stdio.h>
int main(void) { for (int i = 1; i <= 7; i++) printf("Aula %d\n", i); return 0; }`,
`#include <stdio.h>
float media(float a, float b) { return (a + b) / 2.0f; }
int main(void) { printf("%.1f\n", media(8, 10)); return 0; }`,
`#include <stdio.h>
#include <string.h>
int main(void) { char curso[20] = "Linguagem C"; printf("%s tem %zu letras\n", curso, strlen(curso)); return 0; }`,
`#include <stdio.h>
int main(void) { int nota = 9; int *ponteiro = &nota; *ponteiro = 10; printf("%d\n", nota); return 0; }`,
`#include <stdio.h>
typedef struct { char nome[40]; char telefone[20]; } Contato;
int main(void) { Contato agenda[2] = {{"Ana", "1111"}, {"Leo", "2222"}}; printf("%s\n", agenda[0].nome); return 0; }`
  ],
  cplus: [
`#include <stdio.h>
int main(void) { int progresso = 1; printf("Base em C: %d\n", progresso); return 0; }`,
`// curso.h: interface | curso.cpp: implementação
int calcularProgresso(int concluidas, int total) { return concluidas * 100 / total; }`,
`#include <iostream>
struct Aluno { std::string nome; int pontos; };
int main() { Aluno aluno{"Nina", 120}; std::cout << aluno.nome; }`,
`#include <iostream>
int main() { int valor = 10; int *p = &valor; if (p != nullptr) std::cout << *p; }`,
`#include <iostream>
class Aluno { public: explicit Aluno(std::string n): nome(n) {} std::string nome; };
int main() { Aluno aluno("Nina"); std::cout << aluno.nome; }`,
`#include <iostream>
int main() { int nota; std::cout << "Nota: "; if (std::cin >> nota) std::cout << nota; }`,
`#include <iostream>
#include <vector>
struct Aluno { std::string nome; int pontos; };
int main() { std::vector<Aluno> alunos{{"Ana", 90}, {"Leo", 110}}; for (const auto &a : alunos) std::cout << a.nome << "\n"; }`
  ],
  cpp: [
`#include <iostream>
namespace coda { void saudacao() { std::cout << "C++ moderno\n"; } }
int main() { coda::saudacao(); }`,
`#include <iostream>
void exibir(const std::string &texto) { std::cout << texto; }
int main() { const std::string curso = "C++"; exibir(curso); }`,
`#include <iostream>
class Livro { public: Livro(std::string t): titulo(t) {} std::string descricao() const { return titulo; } private: std::string titulo; };
int main() { Livro livro("Algoritmos"); std::cout << livro.descricao(); }`,
`#include <iostream>
class Notificacao { public: virtual void enviar() const = 0; virtual ~Notificacao() = default; };
class Email: public Notificacao { public: void enviar() const override { std::cout << "E-mail enviado"; } };`,
`#include <iostream>
#include <map>
#include <vector>
int main() { std::vector<int> notas{8,9,10}; std::map<int,std::string> cursos{{1,"C++"}}; std::cout << notas.size(); }`,
`#include <memory>
#include <iostream>
int main() { auto mensagem = std::make_unique<std::string>("Recurso seguro"); std::cout << *mensagem; }`,
`#include <iostream>
#include <vector>
struct Livro { int id; std::string titulo; bool emprestado; };
int main() { std::vector<Livro> acervo{{1,"C++",false}}; acervo[0].emprestado = true; std::cout << acervo[0].titulo; }`
  ],
  csharp: [
`using System;
class Program { static void Main() { Console.WriteLine("Projeto .NET iniciado"); } }`,
`class Aluno { public string Nome { get; private set; } public Aluno(string nome) { Nome = nome; } }`,
`using System.Linq;
var notas = new[] { 8, 9, 10 };
var maiores = notas.Where(nota => nota >= 9).ToList();`,
`interface IRepositorio { void Salvar(string dado); }
class Servico { private readonly IRepositorio repo; public Servico(IRepositorio repo) { this.repo = repo; } }`,
`static int LerNota(string texto) {
  if (!int.TryParse(texto, out var nota) || nota < 0 || nota > 10) throw new ArgumentException("Nota inválida");
  return nota;
}`,
`using System.Net.Http;
static async Task<string> CarregarAsync() { using var http = new HttpClient(); return await http.GetStringAsync("https://example.com"); }`,
`record Tarefa(int Id, string Titulo, bool Concluida);
var tarefas = new List<Tarefa> { new(1, "Estudar C#", false) };
var atualizada = tarefas[0] with { Concluida = true };`
  ],
  java: [
`public class Main { public static void main(String[] args) { System.out.println("JVM pronta"); } }`,
`class Aluno { String nome; Aluno(String nome) { this.nome = nome; } void apresentar() { System.out.println(nome); } }`,
`class Conta { private double saldo; public void depositar(double valor) { if (valor > 0) saldo += valor; } public double getSaldo() { return saldo; } }`,
`interface Notificacao { void enviar(String mensagem); }
class Email implements Notificacao { public void enviar(String mensagem) { System.out.println(mensagem); } }`,
`import java.util.*;
class Main { public static void main(String[] args) { List<String> cursos = new ArrayList<>(); cursos.add("Java"); System.out.println(cursos); } }`,
`import java.nio.file.*;
class Main { public static void main(String[] args) { try { System.out.println(Files.readString(Path.of("dados.txt"))); } catch (Exception e) { System.out.println("Arquivo indisponível"); } } }`,
`import java.util.*;
record Aluno(int id, String nome) {}
class Main { public static void main(String[] args) { Map<Integer,Aluno> escola = new HashMap<>(); escola.put(1,new Aluno(1,"Ana")); System.out.println(escola.get(1)); } }`
  ],
  react: [
`export default function Saudacao() { return <h1>Primeiro componente React</h1>; }`,
`function Cartao({ titulo, children }) { return <article><h2>{titulo}</h2>{children}</article>; }
export default function App() { return <Cartao titulo="HTML"><p>7 aulas</p></Cartao>; }`,
`import { useState } from "react";
export default function App() { const [progresso,setProgresso]=useState(0); return <button onClick={() => setProgresso(p => p + 1)}>{progresso} aulas</button>; }`,
`import { useState } from "react";
export default function Formulario() { const [nome,setNome]=useState(""); return <form onSubmit={e => e.preventDefault()}><input value={nome} onChange={e => setNome(e.target.value)}/><button>Salvar</button></form>; }`,
`const cursos = [{id:1,nome:"HTML"},{id:2,nome:"CSS"}];
export default function Lista() { return <ul>{cursos.map(curso => <li key={curso.id}>{curso.nome}</li>)}</ul>; }`,
`import { useEffect, useState } from "react";
export default function Status() { const [online,setOnline]=useState(false); useEffect(() => { setOnline(true); return () => setOnline(false); },[]); return <p>{online ? "Pronto" : "Carregando"}</p>; }`,
`import { useState } from "react";
function Curso({nome,onConcluir}) { return <article><h2>{nome}</h2><button onClick={onConcluir}>Concluir</button></article>; }
export default function App() { const [total,setTotal]=useState(0); return <main><p>{total} concluídas</p><Curso nome="React" onConcluir={() => setTotal(t => t+1)}/></main>; }`
  ],
  reactnative: [
`import { View, Text } from "react-native";
export default function App() { return <View><Text>Primeiro app</Text></View>; }`,
`import { StyleSheet, Text, View } from "react-native";
export default function App() { return <View style={s.tela}><Text style={s.titulo}>Plano</Text></View>; }
const s=StyleSheet.create({tela:{flex:1,justifyContent:"center",padding:24},titulo:{fontSize:24}});`,
`// Com React Navigation instalado
function Inicio({ navigation }) { return <Button title="Abrir curso" onPress={() => navigation.navigate("Curso")}/>; }`,
`import { useState } from "react";
import { TextInput, Button, View } from "react-native";
export default function App() { const [nome,setNome]=useState(""); return <View><TextInput value={nome} onChangeText={setNome}/><Button title="Salvar" onPress={() => console.log(nome)}/></View>; }`,
`import { FlatList, Text } from "react-native";
const cursos=[{id:"1",nome:"HTML"},{id:"2",nome:"CSS"}];
export default function Lista(){return <FlatList data={cursos} keyExtractor={i=>i.id} renderItem={({item})=><Text>{item.nome}</Text>}/>;}`,
`import AsyncStorage from "@react-native-async-storage/async-storage";
async function salvarPlano(plano) { await AsyncStorage.setItem("plano", JSON.stringify(plano)); }
async function carregarPlano() { return JSON.parse(await AsyncStorage.getItem("plano") || "[]"); }`,
`import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
export default function App(){const [habitos,setHabitos]=useState([{id:"1",titulo:"Estudar",feito:false}]);return <View><FlatList data={habitos} renderItem={({item})=><Pressable onPress={()=>setHabitos(lista=>lista.map(h=>h.id===item.id?{...h,feito:!h.feito}:h))}><Text>{item.feito?"✓ ":"○ "}{item.titulo}</Text></Pressable>}/></View>;}`
  ],
  esp32: [
`from machine import Pin
led = Pin(2, Pin.OUT)
print("GPIO2 configurado", led.value())`,
`from machine import Pin
from time import sleep
led = Pin(2, Pin.OUT)
for _ in range(6):
    led.toggle(); sleep(0.5)`,
`from machine import Pin
botao = Pin(4, Pin.IN, Pin.PULL_UP)
led = Pin(2, Pin.OUT)
while True:
    led.value(not botao.value())`,
`from machine import Pin, PWM
pwm = PWM(Pin(2), freq=1000)
for brilho in range(0, 65535, 4096):
    pwm.duty_u16(brilho)`,
`from machine import ADC, Pin
sensor = ADC(Pin(34))
for _ in range(10):
    print("Leitura:", sensor.read_u16())`,
`import network
wifi = network.WLAN(network.STA_IF)
wifi.active(True); wifi.connect("SUA_REDE", "SUA_SENHA")
while not wifi.isconnected(): pass
print("IP:", wifi.ifconfig()[0])`,
`import network, socket
from machine import ADC, Pin
sensor=ADC(Pin(34)); wifi=network.WLAN(network.STA_IF)
wifi.active(True); wifi.connect("SUA_REDE","SUA_SENHA")
while not wifi.isconnected(): pass
servidor=socket.socket(); servidor.bind(("",80)); servidor.listen(1)
cliente,_=servidor.accept(); cliente.recv(1024); cliente.send("HTTP/1.1 200 OK\r\n\r\nLeitura: "+str(sensor.read_u16())); cliente.close()`
  ],
  sql: [
`CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, ativo INTEGER NOT NULL DEFAULT 1);
CREATE TABLE matriculas (aluno_id INTEGER, materia TEXT, FOREIGN KEY (aluno_id) REFERENCES alunos(id));`,
`SELECT id, nome FROM alunos;`,
`SELECT id, nome FROM alunos WHERE ativo = 1 AND nome LIKE 'A%';`,
`SELECT nome, pontos FROM alunos ORDER BY pontos DESC, nome ASC LIMIT 5;`,
`INSERT INTO alunos (nome, ativo) VALUES ('Ana Souza', 1);
SELECT last_insert_rowid() AS novo_id;`,
`BEGIN TRANSACTION;
UPDATE alunos SET ativo = 0 WHERE id = 4;
DELETE FROM matriculas WHERE aluno_id = 4 AND materia = 'SQL';
COMMIT;`,
`SELECT a.nome, m.materia, m.nota
FROM alunos AS a
JOIN matriculas AS m ON m.aluno_id = a.id
WHERE a.ativo = 1
ORDER BY m.nota DESC;`
  ]
};
