import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const docs = dirname(fileURLToPath(import.meta.url));
const root = resolve(docs, "..");
const sourcePath = join(docs, "workshop-monitoring-foundry.src.html");
const outputPath = join(docs, "workshop-monitoring-foundry.html");
const queryPath = join(root, "queries", "foundry-native-usage-cost.kql");
let source = readFileSync(sourcePath, "utf8");
const query = readFileSync(queryPath, "utf8").replace(/\r\n/g, "\n").trimEnd() + "\n";

async function offlineFonts() {
  const cssPath = join(docs, "assets", "workshop-fonts.css");
  const licensePaths = [
    join(docs, "assets", "ibm-plex-sans-OFL.txt"),
    join(docs, "assets", "ibm-plex-mono-OFL.txt"),
  ];
  if ([cssPath, ...licensePaths].every(existsSync)) {
    return { css: readFileSync(cssPath, "utf8"), licenses: licensePaths.map((path) => readFileSync(path, "utf8")) };
  }
  console.log("Embedding licensed IBM Plex Latin fonts for offline use.");
  const url = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" } });
  if (!response.ok) throw new Error(`Font stylesheet download failed: HTTP ${response.status}`);
  const css = await response.text();
  const faces = [...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/g)].map((m) => m[1]);
  if (!faces.length) throw new Error("Cannot identify the Latin font subsets.");
  let bundled = faces.join("\n");
  const urls = [...new Set([...bundled.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
  if (!urls.length) throw new Error("No font binaries were found.");
  const binaries = await Promise.all(urls.map(async (fontUrl) => {
    const font = await fetch(fontUrl);
    if (!font.ok) throw new Error(`Font download failed: HTTP ${font.status}`);
    return [fontUrl, Buffer.from(await font.arrayBuffer()).toString("base64")];
  }));
  for (const [fontUrl, base64] of binaries) bundled = bundled.split(fontUrl).join(`data:font/woff2;base64,${base64}`);
  const licenses = await Promise.all(["ibmplexsans", "ibmplexmono"].map(async (family) => {
    const license = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`);
    if (!license.ok) throw new Error(`Font license download failed: HTTP ${license.status}`);
    const text = await license.text();
    if (!text.includes("SIL OPEN FONT LICENSE")) throw new Error(`Missing OFL license for ${family}`);
    return text;
  }));
  writeFileSync(cssPath, bundled, "utf8");
  licensePaths.forEach((path, index) => writeFileSync(path, licenses[index], "utf8"));
  return { css: bundled, licenses };
}

function jsonSection(id) {
  const found = source.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)<\\/script>`));
  if (!found) throw new Error(`Missing JSON section: ${id}`);
  return JSON.parse(found[1]);
}

function replaceOnce(text, from, to) {
  if (!text.includes(from) || text.indexOf(from) !== text.lastIndexOf(from)) {
    throw new Error(`Expected exactly one KQL marker: ${from.slice(0, 100)}`);
  }
  return text.replace(from, to);
}

function datatable(name) {
  const found = query.match(new RegExp(`let ${name}\\s*=\\s*datatable\\(([\\s\\S]*?)\\)\\s*\\[([\\s\\S]*?)\\];`));
  if (!found) throw new Error(`Cannot locate datatable ${name}`);
  const columns = [...found[1].matchAll(/(\w+)\s*:\s*(\w+)/g)].map((m) => ({ name: m[1], type: m[2] }));
  const pattern = /"(?:\\.|[^"\\])*"|real\(null\)|-?\d+(?:\.\d+)?/g;
  const tokens = found[2].match(pattern) ?? [];
  if (found[2].replace(pattern, "").replace(/[\s,]/g, "")) {
    throw new Error(`Unsupported literal in ${name}; update the workshop parser explicitly.`);
  }
  if (tokens.length % columns.length !== 0) throw new Error(`Invalid row width in ${name}`);
  const values = tokens.map((v) => v === "real(null)" ? null : v.startsWith('"') ? JSON.parse(v) : Number(v));
  const rows = [];
  for (let i = 0; i < values.length; i += columns.length) {
    rows.push(Object.fromEntries(columns.map((c, j) => [c.name, values[i + j]])));
  }
  return { columns, rows };
}

function projectedColumns(text) {
  const start = text.lastIndexOf("\n| project ");
  if (start < 0) throw new Error("Cannot locate final KQL projection.");
  const nextOperator = text.indexOf("\n| ", start + 1);
  return text.slice(start + "\n| project ".length, nextOperator < 0 ? text.length : nextOperator)
    .split(",").map((v) => v.trim().split("=")[0].trim());
}

const compactMarker = "\n// Compact dashboard output only.";
const compactStart = query.indexOf(compactMarker);
if (compactStart < 0 || compactStart !== query.lastIndexOf(compactMarker)) {
  throw new Error("Expected exactly one compact dashboard projection marker.");
}
const fullOutputQuery = query.slice(0, compactStart).trimEnd() + "\n";
const outputColumns = projectedColumns(fullOutputQuery);
const summaryColumns = projectedColumns(query);
if (new Set(summaryColumns).size !== summaryColumns.length
    || summaryColumns.some((name) => !outputColumns.includes(name))) {
  throw new Error("Compact dashboard columns must be unique columns from the full output.");
}
const columnDefinitions = jsonSection("column-definitions");
const missing = outputColumns.filter((name) => !columnDefinitions[name]);
const extra = Object.keys(columnDefinitions).filter((name) => !outputColumns.includes(name));
if (missing.length || extra.length) {
  throw new Error(`Column documentation drift. Missing: ${missing.join(", ")}; extra: ${extra.join(", ")}`);
}
const schemas = Object.fromEntries(
  ["DeploymentInventoryInput", "PriceInput", "RequestCallerMetadataInput"].map((name) => [name, datatable(name)])
);
const inputDefinitions = jsonSection("input-definitions");
for (const [table, schema] of Object.entries(schemas)) {
  const undocumented = schema.columns.filter((c) => !inputDefinitions[table]?.[c.name]);
  if (undocumented.length) throw new Error(`Undocumented input fields in ${table}: ${undocumented.map((c) => c.name).join(", ")}`);
}
const blocks = jsonSection("block-definitions").map((block) => {
  const start = query.indexOf(block.start);
  const end = block.end === null ? query.length : query.indexOf(block.end, start + block.start.length);
  if (start < 0 || end < start) throw new Error(`KQL block boundary is invalid: ${block.id}`);
  const code = query.slice(start, end).trimEnd();
  const firstLine = query.slice(0, start).split("\n").length;
  return { ...block, code, firstLine, lastLine: firstLine + code.split("\n").length - 1 };
});

let filteredQuery = replaceOnce(query, "let WindowEnd = now();\nlet WindowStart = WindowEnd - 24h;\n", "");
filteredQuery = replaceOnce(filteredQuery,
  "| where TimeGenerated >= WindowStart and TimeGenerated < WindowEnd",
  "| where TimeGenerated {TimeRange:query}");
filteredQuery = replaceOnce(filteredQuery,
  '| where ResourceProvider =~ "MICROSOFT.COGNITIVESERVICES"',
  '| where ResourceProvider =~ "MICROSOFT.COGNITIVESERVICES"\n'
  + "| where '{RgFilter:escape}' == '_all_' or ResourceGroup =~ '{RgFilter:escape}'\n"
  + "| where '{FoundryFilter:escape}' == '_all_' or Resource =~ '{FoundryFilter:escape}'");
filteredQuery = replaceOnce(filteredQuery,
  "| lookup kind=leftouter RequestCallerMetadata on ResourceKey, RequestKey",
  "| lookup kind=leftouter RequestCallerMetadata on ResourceKey, RequestKey\n"
  + "| where '{ModelFilter:escape}' == '_all_' or Model =~ '{ModelFilter:escape}'\n"
  + "| where '{ProjectFilter:escape}' == '_all_'\n"
  + "    or ('{ProjectFilter:escape}' == '_unknown_' and isempty(ProjectTercatat))\n"
  + "    or ProjectTercatat =~ '{ProjectFilter:escape}'");
if (/\bWindow(Start|End)\b/.test(filteredQuery)) throw new Error("Filtered query retains an unbound time variable.");

const fonts = await offlineFonts();
const payload = {
  query,
  detailQuery: replaceOnce(fullOutputQuery, "let ShowTransactions = false;", "let ShowTransactions = true;"),
  filteredQuery,
  sha256: createHash("sha256").update(query).digest("hex"),
  queryLines: query.trimEnd().split("\n").length,
  outputColumns,
  summaryColumns,
  blocks,
  schemas,
  checkedOn: "18 November 2026",
  fontLicenses: fonts.licenses,
};
const payloadMarker = /<script type="application\/json" id="workshop-payload">[\s\S]*?<\/script>/;
if (!payloadMarker.test(source)) throw new Error("Missing workshop payload marker.");
source = source.replace(payloadMarker,
  `<script type="application/json" id="workshop-payload">${JSON.stringify(payload).replace(/</g, "\\u003c")}</script>`);
const fontMarker = /<style id="offline-fonts">[\s\S]*?<\/style>/;
if (!fontMarker.test(source)) throw new Error("Missing offline font marker.");
source = source.replace(fontMarker, () => `<style id="offline-fonts">${fonts.css}</style>`);

for (const [id, filename] of [
  ["diagnostic", "foundry-diagnostic-settings.png"],
  ["workbook", "foundry-workbook-log-query.png"],
]) {
  const image = readFileSync(join(docs, "assets", filename));
  if (image.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`Not a PNG: ${filename}`);
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width < 1 || height < 1) throw new Error(`Invalid image dimensions: ${filename}`);
  const pattern = new RegExp(`<img data-asset="${id}"[^>]*>`);
  const found = source.match(pattern);
  if (!found) throw new Error(`Missing screenshot element: ${id}`);
  let tag = found[0].replace(/src="[^"]*"/, `src="data:image/png;base64,${image.toString("base64")}"`);
  tag = tag.replace(/width="\d+"/, `width="${width}"`).replace(/height="\d+"/, `height="${height}"`);
  tag = tag.replace(/loading="[^"]*"/, 'loading="eager"');
  source = source.replace(pattern, () => tag);
}

writeFileSync(sourcePath, source, "utf8");
console.log(`Canonical KQL: ${payload.queryLines} lines; ${summaryColumns.length} summary / ${outputColumns.length} detail columns; hash ${payload.sha256.slice(0, 16)}`);
console.log(`Configuration fields: ${Object.values(schemas).reduce((n, table) => n + table.columns.length, 0)}`);
const rendered = source.replace(/<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>/gi, "");
writeFileSync(outputPath, rendered, "utf8");
console.log("Offline package complete: fonts, screenshots, scripts and KQL embedded.");
