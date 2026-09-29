import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.env.CODA_PACKAGE_OUT || resolve(root, "..", `${basename(root)}-distribuicao.zip`));
const excludedDirectories = new Set(["data", ".git", "node_modules"]);
const excludedFiles = new Set([basename(output)]);

function isExcluded(relativePath, entryName) {
  const segments = relativePath.split(/[\\/]/);
  return segments.some(segment => excludedDirectories.has(segment)) || excludedFiles.has(entryName) || /\.log$/i.test(entryName) || /\.sqlite(?:-|$)/i.test(entryName);
}

async function collectFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (isExcluded(relativePath, entry.name) || entry.isSymbolicLink()) continue;
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolutePath, relativePath));
    else if (entry.isFile()) files.push({ path: relativePath, data: await readFile(absolutePath) });
  }
  return files;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function localHeader(name, checksum, size) {
  const nameBuffer = Buffer.from(name, "utf8");
  const header = Buffer.alloc(30 + nameBuffer.length);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(size, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);
  nameBuffer.copy(header, 30);
  return header;
}

function centralHeader(name, checksum, size, offset) {
  const nameBuffer = Buffer.from(name, "utf8");
  const header = Buffer.alloc(46 + nameBuffer.length);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(size, 20);
  header.writeUInt32LE(size, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  nameBuffer.copy(header, 46);
  return header;
}

function endOfCentralDirectory(count, centralSize, centralOffset) {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(count, 8);
  record.writeUInt16LE(count, 10);
  record.writeUInt32LE(centralSize, 12);
  record.writeUInt32LE(centralOffset, 16);
  record.writeUInt16LE(0, 20);
  return record;
}

const files = await collectFiles(root);
const parts = [];
const centralParts = [];
let offset = 0;
for (const file of files) {
  const checksum = crc32(file.data);
  const local = localHeader(file.path, checksum, file.data.length);
  parts.push(local, file.data);
  centralParts.push(centralHeader(file.path, checksum, file.data.length, offset));
  offset += local.length + file.data.length;
}
const central = Buffer.concat(centralParts);
const archive = Buffer.concat([...parts, central, endOfCentralDirectory(files.length, central.length, offset)]);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, archive);
console.log(`Pacote criado: ${output}`);
console.log(`Arquivos incluídos: ${files.length}`);
