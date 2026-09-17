import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = "docs/implementation";
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const registry = JSON.parse(read(`${directory}/registry.json`));
const contract = JSON.parse(read(`${directory}/openapi.json`));
const failures = [];
const report = (message) => failures.push(message);
const posix = (value) => value.split(path.sep).join("/");

function insideRoot(relative) {
  if (typeof relative !== "string" || path.isAbsolute(relative)) return false;
  const resolved = path.relative(root, path.resolve(root, relative));
  return resolved !== ".." && !resolved.startsWith(`..${path.sep}`);
}

function fileExists(relative) {
  return insideRoot(relative) && fs.existsSync(path.join(root, relative))
    && fs.statSync(path.join(root, relative)).isFile();
}

function walk(relative) {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true })
    .flatMap((entry) => {
      const child = `${relative}/${entry.name}`;
      if (entry.isSymbolicLink()) return [];
      return entry.isDirectory() ? walk(child) : [child];
    }).sort();
}

function validateRegistry(value) {
  const errors = [];
  const ids = new Set(value.features.map((feature) => feature.id));
  if (ids.size !== value.features.length) errors.push("Duplicate feature ID");
  const statusValues = new Set(["implemented", "partial", "demo", "planned", "deferred"]);
  for (const feature of value.features) {
    if (!/^GS-\d{3}$/.test(feature.id)) errors.push(`Invalid ID: ${feature.id}`);
    if (!statusValues.has(feature.status)) errors.push(`${feature.id}: invalid status`);
    if (!["approved", "proposed", "needs_decision"].includes(feature.decision)) {
      errors.push(`${feature.id}: invalid decision`);
    }
    for (const field of ["title", "current", "target", "next", "owner"]) {
      if (typeof feature[field] !== "string" || !feature[field].trim()) {
        errors.push(`${feature.id}: missing ${field}`);
      }
    }
    if (!feature.acceptance?.length || !feature.evidence?.length) {
      errors.push(`${feature.id}: acceptance/evidence required`);
    }
    if (!feature.verification?.level || !feature.verification?.live
      || !feature.verification?.automatedTests) {
      errors.push(`${feature.id}: separate verification required`);
    }
    for (const dependency of feature.dependencies) {
      if (!ids.has(dependency) || dependency === feature.id) {
        errors.push(`${feature.id}: invalid dependency ${dependency}`);
      }
    }
    for (const evidence of feature.evidence) {
      if (!fileExists(evidence.path)) errors.push(`${feature.id}: missing ${evidence.path}`);
      else if (evidence.anchor && !read(evidence.path).includes(evidence.anchor)) {
        errors.push(`${feature.id}: missing anchor ${evidence.anchor} in ${evidence.path}`);
      }
    }
    for (const test of feature.tests) {
      if (!fileExists(test)) errors.push(`${feature.id}: missing test ${test}`);
    }
  }
  const byId = new Map(value.features.map((feature) => [feature.id, feature]));
  const visited = new Set();
  const active = new Set();
  function visit(id) {
    if (active.has(id)) { errors.push(`Dependency cycle: ${id}`); return; }
    if (visited.has(id) || !byId.has(id)) return;
    active.add(id);
    for (const dependency of byId.get(id).dependencies) visit(dependency);
    active.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
  return errors;
}

for (const error of validateRegistry(registry)) report(error);

const routeFiles = walk("app").filter((file) => /\/(?:page\.tsx|route\.ts)$/.test(file));
function routePath(file) {
  return `/${file.replace(/^app\//, "").replace(/(?:^|\/)(?:page\.tsx|route\.ts)$/, "")}`;
}
const routes = new Set(routeFiles.map(routePath));
for (const feature of registry.features) {
  for (const route of feature.routes) {
    if (!routes.has(route)) report(`${feature.id}: missing route ${route}`);
  }
}

function checkRefs(node) {
  if (!node || typeof node !== "object") return;
  if (typeof node.$ref === "string") {
    if (!node.$ref.startsWith("#/")) report(`Nonlocal OpenAPI ref: ${node.$ref}`);
    else {
      const target = node.$ref.slice(2).split("/").reduce((value, segment) =>
        value?.[segment.replaceAll("~1", "/").replaceAll("~0", "~")], contract);
      if (!target) report(`Missing OpenAPI ref: ${node.$ref}`);
    }
  }
  for (const value of Object.values(node)) checkRefs(value);
}
checkRefs(contract);
for (const [route, item] of Object.entries(contract.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    const file = operation["x-code-path"];
    if (!fileExists(file)) report(`Missing OpenAPI handler: ${route}`);
    else if (routePath(file) !== route || !new RegExp(`export async function ${method.toUpperCase()}\\(`).test(read(file))) {
      report(`OpenAPI method/route mismatch: ${method} ${route}`);
    }
  }
}

for (const file of registry.protectedVisualFiles) {
  if (!fileExists(file.path)) { report(`Missing visual file ${file.path}`); continue; }
  const hash = createHash("sha256").update(fs.readFileSync(path.join(root, file.path)))
    .digest("hex").toUpperCase();
  if (hash !== file.sha256) report(`Visual baseline changed: ${file.path}; review approval before updating baseline`);
}

const ids = new Set(registry.features.map((feature) => feature.id));
for (const file of [...walk("app"), ...walk("lib"), ...walk("db"), ...walk("workers")]
  .filter((file) => /\.(?:ts|tsx)$/.test(file))) {
  for (const match of read(file).matchAll(/\/\/ GLI-SPEC: ([^\r\n]+)/g)) {
    for (const id of match[1].match(/GS-\d{3}/g) ?? []) {
      if (!ids.has(id)) report(`Unknown code annotation ${id}: ${file}`);
    }
  }
}

const escape = (value) => value.replaceAll("|", "\\|").replaceAll("\n", " ");
const featureText = [
  "# 기능 상태와 다음 개발 작업", "",
  `기준: ${registry.asOf}. registry.json에서 생성. 수동 수정하지 않는다.`, "",
  "코드 구현과 실제 서비스 검증은 별개다. 모든 live 상태는 현재 미검증이다.", "",
  "| ID | 기능 | 상태 | 결정 | 다음 작업 |",
  "|---|---|---|---|---|",
  ...registry.features.map((feature) => `| ${feature.id} | ${escape(feature.title)} | ${feature.status} | ${feature.decision} | ${escape(feature.next)} |`),
  "", "## 구현 순서", "",
  "1. GS-002/003/007/008/009/010/013: 출처 범위·식별·누락 필드·날짜·조건·환율 계약 정리.",
  "2. GS-004/006/012: 영구 저장, 재확인, 작업 큐와 비용 제어.",
  "3. GS-020/016/019/021/022: 독립 인증과 회원·직원 운영 여정 연결.",
  "4. GS-017/018/023: 결제·Cash·권한·관리자 CMS 연결.",
  "5. GS-025/026/032: 선택된 AWS 환경 이식, 복원, 출시 검증.",
  "6. GS-005/029: 국가별 데이터 확대. GS-030은 별도 후속 기획.", "",
  "병행 가능한 작업은 registry.dependencies를 확인한다. 위 순서는 개발 제안이며 실제 일정/예산의 확정이 아니다.", "",
  "[상세 상태·근거·완료 조건](registry.json) · [현재 동작](CURRENT-STATE.md) · [결정 이력](DECISIONS.md)", "",
].join("\n");

const routeText = [
  "# 경로 인벤토리", "",
  "app/page.tsx 및 app/api route 파일에서 생성. 경로 존재는 UI 연결 또는 운영 완료의 증거가 아니다.", "",
  "새 메뉴의 MY GLI·문의·가이드 등은 coming-soon으로 연결된다. 내부 /my 또는 /admin 구현과 별도로 검증한다.", "",
  "| 경로 | 종류/메서드 | 구현 | 기능 연결 |",
  "|---|---|---|---|",
  ...routeFiles.map((file) => {
    const route = routePath(file);
    const methods = file.endsWith("page.tsx") ? "page" :
      [...read(file).matchAll(/export async function (GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\(/g)]
        .map((match) => match[1]).join(", ");
    const featureIds = registry.features.filter((feature) => feature.routes.includes(route))
      .map((feature) => feature.id).join(", ") || "관련 상위 기능/API 코드 확인";
    return `| \`${route}\` | ${methods} | [${file}](../../${file}) | ${featureIds} |`;
  }), "", `총 ${routeFiles.length}개 route 파일.`, "",
].join("\n");

const outputs = new Map([
  [`${directory}/FEATURE-STATUS.md`, featureText],
  [`${directory}/ROUTES.md`, routeText],
]);
if (process.argv.includes("--refresh") && failures.length === 0) {
  for (const [file, content] of outputs) fs.writeFileSync(path.join(root, file), content, "utf8");
}
for (const [file, content] of outputs) {
  if (!fileExists(file) || read(file).replaceAll("\r\n", "\n") !== content) {
    report(`Generated document out of date: ${file}; run --refresh`);
  }
}

for (const file of walk(directory).filter((file) => file.endsWith(".md"))) {
  for (const match of read(file).matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(?:https?:|#)/.test(target)) continue;
    const relative = posix(path.normalize(path.join(path.dirname(file), target.split("#")[0])));
    if (!fileExists(relative)) report(`Broken document link: ${file} -> ${target}`);
  }
}

// Mutation probes ensure the guard rejects broken IDs/links rather than just parsing JSON.
if (process.argv.includes("--self-test")) {
  const mutations = [
    (copy) => { copy.features[0].dependencies.push("GS-999"); },
    (copy) => { copy.features[0].evidence[0].path = "missing-evidence.ts"; },
    (copy) => { copy.features[0].id = copy.features[1].id; },
    (copy) => { copy.features[0].status = "magic-complete"; },
    (copy) => { copy.features[0].dependencies = [copy.features[1].id]; copy.features[1].dependencies = [copy.features[0].id]; },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(registry);
    mutate(copy);
    if (validateRegistry(copy).length === 0) report("Mutation probe was not rejected");
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Development spec valid: ${registry.features.length} features, ${routeFiles.length} route files, ${registry.protectedVisualFiles.length} unchanged visual baselines. Live services not tested.`);
}
