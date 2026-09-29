const boardPins = new Set([
  "3V3", "VIN", "GND", "GND_R", "GPIO2", "GPIO4", "GPIO5", "GPIO18", "GPIO19",
  "GPIO16", "GPIO17", "GPIO21", "GPIO22", "GPIO23", "GPIO25", "GPIO26", "GPIO27",
  "GPIO32", "GPIO33", "GPIO34", "GPIO35"
]);

const terminalsByType = {
  led: ["A", "B"], resistor: ["A", "B"], battery: ["+", "-"],
  button: ["1", "2"], capacitor: ["+", "-"], sensor: ["VCC", "TRIG", "ECHO", "GND"],
  temperature: ["VCC", "SIG", "GND"], potentiometer: ["VCC", "SIG", "GND"], rgb: ["R", "G", "B", "GND"],
  servo: ["VCC", "SIG", "GND"], motor: ["+", "-"], display: ["VCC", "GND", "SDA", "SCL"],
  relay: ["VCC", "SIG", "GND"], buzzer: ["SIG", "GND"]
};

function endsOf(wire) {
  return Array.isArray(wire) ? wire : [wire?.a, wire?.b];
}

// Two physical ground sockets are drawn on the board. They share one electrical net.
function electricalNode(value) {
  return value === "ESP32:GND_R" ? "ESP32:GND" : value;
}

function parseNode(value) {
  if (typeof value !== "string") return null;
  const separator = value.lastIndexOf(":");
  if (separator < 1) return null;
  return { owner: value.slice(0, separator), terminal: value.slice(separator + 1) };
}

function validNode(value, componentById) {
  const node = parseNode(value);
  if (!node) return false;
  if (node.owner === "ESP32") return boardPins.has(node.terminal);
  const component = componentById.get(node.owner);
  return !!component && (terminalsByType[component.type] || ["A", "B"]).includes(node.terminal);
}

function addEdge(graph, from, to, metadata = {}, bidirectional = true) {
  if (!graph.has(from)) graph.set(from, []);
  graph.get(from).push({ to, ...metadata });
  if (bidirectional) {
    if (!graph.has(to)) graph.set(to, []);
    graph.get(to).push({ to: from, ...metadata, reverse: true });
  }
}

function makeGraph(components, wires) {
  const componentById = new Map(components.map(item => [String(item.id), item]));
  const graph = new Map();
  const invalidWires = [];
  for (const wire of wires) {
    const [a, b] = endsOf(wire);
    if (!validNode(a, componentById) || !validNode(b, componentById) || a === b) {
      invalidWires.push(wire);
      continue;
    }
    addEdge(graph, electricalNode(a), electricalNode(b), { kind: "wire" });
  }
  for (const item of components) {
    const id = String(item.id);
    if (item.type === "resistor") addEdge(graph, `${id}:A`, `${id}:B`, { kind: "component", type: item.type, componentId: id });
    if (item.type === "led") addEdge(graph, `${id}:A`, `${id}:B`, { kind: "component", type: item.type, componentId: id }, false);
    if (item.type === "button" && item.active) addEdge(graph, `${id}:1`, `${id}:2`, { kind: "component", type: item.type, componentId: id });
  }
  return { graph, componentById, invalidWires };
}

function findLedLoop({ components = [], wires = [] }, ledId) {
  const { graph, componentById, invalidWires } = makeGraph(components, wires);
  const led = componentById.get(String(ledId));
  if (!led || led.type !== "led") return { ok: false, reason: "LED não encontrado" };
  if (invalidWires.length) return { ok: false, reason: "Há um GPIO que não existe nesta placa ou um terminal inválido" };

  const sources = [`ESP32:${led.pin}`];
  for (const battery of components.filter(item => item.type === "battery")) sources.push(`${battery.id}:+`);
  const sinks = ["ESP32:GND", ...components.filter(item => item.type === "battery").map(item => `${item.id}:-`)];
  const queue = [];
  for (const source of sources) queue.push({ node: source, usedLed: false, resistorId: null, path: [] });
  const seen = new Set();

  while (queue.length) {
    const current = queue.shift();
    const key = `${current.node}|${current.usedLed}|${current.resistorId || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (sinks.includes(current.node) && current.usedLed && current.resistorId) {
      const resistor = componentById.get(current.resistorId);
      const voltage = sources.some(source => source.startsWith("ESP32:")) ? 3.3 : 3.3 * Number(components.find(item => item.type === "battery")?.value ?? 100) / 100;
      const ohms = Math.max(1, Math.round(220 * Number(resistor?.value ?? 100) / 100));
      const currentMa = Math.max(0, (voltage - 2.0) / ohms * 1000);
      const powerW = (currentMa * currentMa * ohms) / 1_000_000;
      const issues = [];
      if (currentMa > 12) issues.push(`corrente de ${currentMa.toFixed(1)} mA acima de 12 mA`);
      if (powerW > 0.25) issues.push("resistor acima de 1/4 W");
      return { ok: issues.length === 0, reason: issues.join("; "), ledId: String(ledId), resistorId: current.resistorId, voltage, ohms, currentMa, powerW, path: current.path };
    }
    for (const edge of graph.get(current.node) || []) {
      const usedLed = current.usedLed || edge.componentId === String(ledId);
      const resistorId = edge.type === "resistor" ? edge.componentId : current.resistorId;
      queue.push({ node: edge.to, usedLed, resistorId, path: [...current.path, { from: current.node, to: edge.to, ...edge }] });
    }
  }
  return { ok: false, reason: "Feche o caminho GPIO → resistor → ânodo do LED → cátodo → GND" };
}

function directShorts(wires) {
  const graph = new Map();
  for (const [a, b] of wires.map(endsOf)) {
    if (typeof a !== "string" || typeof b !== "string") continue;
    addEdge(graph, electricalNode(a), electricalNode(b), { kind: "wire" });
  }
  const seen = new Set();
  const faults = [];
  for (const start of graph.keys()) {
    if (seen.has(start)) continue;
    const stack = [start], pins = new Set();
    seen.add(start);
    while (stack.length) {
      const node = stack.pop();
      const parsed = parseNode(node);
      if (parsed?.owner === "ESP32") pins.add(parsed.terminal);
      for (const edge of graph.get(node) || []) if (!seen.has(edge.to)) { seen.add(edge.to); stack.push(edge.to); }
    }
    if ((pins.has("3V3") || pins.has("VIN")) && pins.has("GND")) faults.push("Curto entre alimentação e GND");
    const gpios = [...pins].filter(pin => pin.startsWith("GPIO"));
    if (gpios.length > 1) faults.push(`Curto entre ${gpios.join(" e ")}`);
    if (gpios.length && (pins.has("3V3") || pins.has("VIN"))) faults.push(`GPIO ligado diretamente à alimentação (${gpios[0]})`);
    if (gpios.length && pins.has("GND")) faults.push(`GPIO ligado diretamente ao GND (${gpios[0]})`);
  }
  return [...new Set(faults)];
}

function evaluateCircuit({ components = [], wires = [] } = {}) {
  const { componentById, invalidWires } = makeGraph(components, wires);
  const faults = [...directShorts(wires)];
  if (invalidWires.length) faults.push("Há um GPIO que não existe nesta placa ou um terminal inválido; reconecte esse fio");
  const leds = components.filter(item => item.type === "led").map(item => findLedLoop({ components, wires }, item.id));
  const readyLedIds = leds.filter(item => item.ok).map(item => item.ledId);
  const hasWire = (component, terminal, pin) => wires.some(wire => {
    const [a, b] = endsOf(wire);
    return (a === `${component.id}:${terminal}` && electricalNode(b) === `ESP32:${pin}`) || (b === `${component.id}:${terminal}` && electricalNode(a) === `ESP32:${pin}`);
  });
  const hasAnyWire = (component, terminal, pins) => pins.some(pin => hasWire(component, terminal, pin));
  const activeConnected = components.filter(item => {
    const pin = String(item.pin || "").match(/GPIO\d+/)?.[0];
    if (item.type === "button") return pin && hasWire(item, "1", pin) && hasWire(item, "2", "GND");
    if (["sensor"].includes(item.type)) return hasAnyWire(item, "VCC", ["VIN", "3V3"]) && hasWire(item, "GND", "GND") && hasWire(item, "TRIG", "GPIO5") && hasWire(item, "ECHO", "GPIO18");
    if (["temperature", "potentiometer"].includes(item.type)) return pin && hasAnyWire(item, "VCC", ["3V3", "VIN"]) && hasWire(item, "GND", "GND") && hasWire(item, "SIG", pin);
    if (["servo", "relay"].includes(item.type)) return pin && hasAnyWire(item, "VCC", ["3V3", "VIN"]) && hasWire(item, "GND", "GND") && hasWire(item, "SIG", pin);
    if (item.type === "buzzer") return pin && hasWire(item, "SIG", pin) && hasWire(item, "GND", "GND");
    if (item.type === "display") return hasAnyWire(item, "VCC", ["3V3", "VIN"]) && hasWire(item, "GND", "GND") && hasWire(item, "SDA", "GPIO21") && hasWire(item, "SCL", "GPIO22");
    if (item.type === "rgb") {
      const base = Number(pin?.replace("GPIO", ""));
      return Number.isFinite(base) && hasWire(item, "R", `GPIO${base}`) && hasWire(item, "G", `GPIO${base + 1}`) && hasWire(item, "B", `GPIO${base + 2}`) && hasWire(item, "GND", "GND");
    }
    return false;
  });
  const canRun = faults.length === 0 && (readyLedIds.length > 0 || activeConnected.length > 0);
  const message = faults[0] || (canRun ? "Circuito conectado e pronto para simular" : leds.length ? leds[0].reason : "Conecte um componente aos pinos do ESP32 antes de testar");
  return { canRun, faults, leds, readyLedIds, activeConnectedIds: activeConnected.map(item => String(item.id)), message, componentById };
}

export { evaluateCircuit, findLedLoop };
globalThis.CodaEsp32CircuitLogic = { evaluateCircuit, findLedLoop };
