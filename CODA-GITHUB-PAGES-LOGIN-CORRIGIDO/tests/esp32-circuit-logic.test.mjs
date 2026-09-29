import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCircuit, findLedLoop } from "../js/esp32-circuit-logic.js";

const resistor = { id: "r1", type: "resistor", value: 100 };
const led = { id: "led1", type: "led", pin: "GPIO2" };
const workingLoop = [
  ["ESP32:GPIO2", "r1:A"], ["r1:B", "led1:A"], ["led1:B", "ESP32:GND"]
];

test("LED simulates only on a closed GPIO → resistor → LED → GND path", () => {
  const result = evaluateCircuit({ components: [resistor, led], wires: workingLoop });
  assert.equal(result.canRun, true);
  assert.deepEqual(result.readyLedIds, ["led1"]);
  assert.equal(result.leds[0].ohms, 220);
  assert.ok(result.leds[0].currentMa < 12);
});

test("disconnected, unprotected, and reverse-polarity LEDs do not pass validation", () => {
  assert.equal(findLedLoop({ components: [resistor, led], wires: [] }, "led1").ok, false);
  assert.equal(findLedLoop({ components: [led], wires: [["ESP32:GPIO2", "led1:A"], ["led1:B", "ESP32:GND"]] }, "led1").ok, false);
  assert.equal(findLedLoop({ components: [resistor, led], wires: [["ESP32:GPIO2", "r1:A"], ["r1:B", "led1:B"], ["led1:A", "ESP32:GND"]] }, "led1").ok, false);
});

test("unsafe supply shorts and direct GPIO shorts are rejected", () => {
  assert.match(evaluateCircuit({ wires: [["ESP32:3V3", "ESP32:GND"]] }).faults[0], /Curto entre alimentação e GND/);
  assert.match(evaluateCircuit({ wires: [["ESP32:GPIO2", "ESP32:GND"]] }).faults[0], /GPIO ligado diretamente ao GND/);
  assert.match(evaluateCircuit({ wires: [["ESP32:GPIO2", "ESP32:GPIO4"]] }).faults[0], /Curto entre GPIO2 e GPIO4/);
  assert.match(evaluateCircuit({ wires: [["ESP32:GPIO2", "ESP32:GND_R"]] }).faults[0], /GPIO ligado diretamente ao GND/);
});

test("GND esquerdo e direito são contatos distintos da mesma terra", () => {
  const rightGroundLoop = workingLoop.map(([a, b]) => [a, b === "ESP32:GND" ? "ESP32:GND_R" : b]);
  const result = evaluateCircuit({ components: [resistor, led], wires: rightGroundLoop });
  assert.equal(result.canRun, true);
  assert.deepEqual(result.readyLedIds, ["led1"]);
  const button = { id: "b1", type: "button", pin: "GPIO4" };
  assert.equal(evaluateCircuit({ components: [button], wires: [["ESP32:GPIO4", "b1:1"], ["ESP32:GND_R", "b1:2"]] }).canRun, true);
});

test("GPIOs fora da placa e terminais removidos são tratados como fios inválidos", () => {
  const result = evaluateCircuit({ components: [resistor, led], wires: [["ESP32:GPIO99", "r1:A"]] });
  assert.equal(result.canRun, false);
  assert.equal(result.leds[0].ok, false);
  assert.match(result.message, /GPIO que não existe nesta placa/);
});

test("botão só conta como conectado com GPIO4 e GND ligados aos terminais corretos", () => {
  const button = { id: "b1", type: "button", pin: "GPIO4" };
  assert.equal(evaluateCircuit({ components: [button], wires: [["ESP32:GPIO4", "b1:1"], ["ESP32:GND", "b1:2"]] }).canRun, true);
  assert.equal(evaluateCircuit({ components: [button], wires: [["ESP32:GPIO4", "b1:1"]] }).canRun, false);
});
