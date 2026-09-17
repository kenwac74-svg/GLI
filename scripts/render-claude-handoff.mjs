import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as parse5 from "parse5";

const root = process.cwd();
const sourcePath = path.join(
  root,
  "design-handoff",
  "source",
  "gli-demo.dc.html",
);
const outputDir = path.join(root, "app", "generated");
const cssPath = path.join(root, "app", "claude-design.css");
const outputPath = path.join(outputDir, "claude-static.ts");

const source = fs.readFileSync(sourcePath, "utf8");
const styleMatch = source.match(/<style>([\s\S]*?)<\/style>/);
const scriptMatch = source.match(
  /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/,
);
const markupStart = source.indexOf('<nav class="nav">');
const markupEnd = source.indexOf("</x-dc>");

if (!styleMatch || !scriptMatch || markupStart < 0 || markupEnd < 0) {
  throw new Error("Claude handoff source structure is not recognized.");
}

const rewritePublicPaths = (value) =>
  String(value)
    .replaceAll('url("public/', 'url("/')
    .replaceAll("url('public/", "url('/")
    .replaceAll("url(public/", "url(/")
    .replaceAll('src="public/', 'src="/');

const css = rewritePublicPaths(styleMatch[1]).trimStart();
const markup = source
  .slice(markupStart, markupEnd)
  .replaceAll("<sc-for", "<template data-sc-for")
  .replaceAll("</sc-for>", "</template>")
  .replaceAll("<sc-if", "<template data-sc-if")
  .replaceAll("</sc-if>", "</template>");

class DCLogic {
  setState(update) {
    const patch =
      typeof update === "function" ? update(this.state) : update;
    this.state = { ...this.state, ...patch };
  }
}

const context = vm.createContext({
  Array,
  Boolean,
  Date,
  DCLogic,
  Intl,
  JSON,
  Map,
  Math,
  Number,
  Object,
  RegExp,
  Set,
  String,
  console,
  document: {},
  window: {},
});

vm.runInContext(
  `${scriptMatch[1]}\nglobalThis.__ClaudeComponent = Component;`,
  context,
  { filename: sourcePath },
);

const component = new context.__ClaudeComponent();
const initialState = structuredClone(component.state);
let values = component.renderVals();
const fragment = parse5.parseFragment(markup);

const viewExpressions = new Map([
  ["aboutCls", "about"],
  ["landCls", "land"],
  ["homeCls", "home"],
  ["detailCls", "detail"],
  ["favCls", "fav"],
  ["planCls", "plan"],
  ["coCls", "co"],
  ["soonCls", "soon"],
  ["newsCls", "news"],
  ["articleCls", "article"],
  ["paperCls", "paper"],
  ["trustCls", "trust"],
]);

const voidTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function resolve(expression, scope) {
  const parts = expression.trim().split(".");
  let value = Object.prototype.hasOwnProperty.call(scope, parts[0])
    ? scope[parts.shift()]
    : values[parts.shift()];
  for (const part of parts) value = value?.[part];
  return value;
}

function interpolate(raw, scope, attribute = false) {
  const exact = raw.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  if (exact) {
    const value = resolve(exact[1], scope);
    if (value == null || typeof value === "function") return "";
    return String(value);
  }
  return raw.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => {
    const value = resolve(expression, scope);
    if (value == null || typeof value === "function") return "";
    return attribute ? String(value) : escapeText(value);
  });
}

function attrMap(node) {
  return new Map((node.attrs ?? []).map((attr) => [attr.name, attr.value]));
}

function renderChildren(node, scope) {
  const children = node.content?.childNodes ?? node.childNodes ?? [];
  return children.map((child) => renderNode(child, scope)).join("");
}

function renderNode(node, scope) {
  if (node.nodeName === "#text") return interpolate(node.value, scope);
  if (node.nodeName === "#comment") return "";
  if (!node.tagName) return renderChildren(node, scope);

  const attrs = attrMap(node);
  if (node.tagName === "template" && attrs.has("data-sc-for")) {
    const expression = (attrs.get("list") ?? "").replace(/^\{\{|\}\}$/g, "").trim();
    const list = resolve(expression, scope);
    const alias = attrs.get("as") ?? "item";
    return Array.isArray(list)
      ? list.map((item) => renderChildren(node, { ...scope, [alias]: item })).join("")
      : "";
  }

  if (node.tagName === "template" && attrs.has("data-sc-if")) {
    const expression = (attrs.get("value") ?? "").replace(/^\{\{|\}\}$/g, "").trim();
    return resolve(expression, scope) ? renderChildren(node, scope) : "";
  }

  if (node.tagName === "template") return "";

  const renderedAttrs = [];
  for (const attr of node.attrs ?? []) {
    const event = attr.name.match(/^on(click|input|keydown|change|submit)$/);
    if (event) {
      const action = attr.value.replace(/^\{\{|\}\}$/g, "").trim();
      const dataName = event[1] === "click" ? "data-action" : `data-action-${event[1]}`;
      renderedAttrs.push(`${dataName}="${escapeAttribute(action)}"`);
      continue;
    }

    if (attr.name === "class") {
      const exact = attr.value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
      const view = exact ? viewExpressions.get(exact[1]) : null;
      if (view) {
        renderedAttrs.push(`data-view="${view}"`);
        continue;
      }
    }

    let value = interpolate(attr.value, scope, true);
    value = rewritePublicPaths(value).replace(/^public\//, "/");
    if ((attr.name === "checked" || attr.name === "selected") && value === "false") {
      continue;
    }
    renderedAttrs.push(`${attr.name}="${escapeAttribute(value)}"`);
  }

  const open = `<${node.tagName}${renderedAttrs.length ? ` ${renderedAttrs.join(" ")}` : ""}>`;
  if (voidTags.has(node.tagName)) return open;
  return `${open}${renderChildren(node, scope)}</${node.tagName}>`;
}

const assetIds = [
  "GLI-KH-101",
  "GLI-KH-102",
  "GLI-KH-103",
  "GLI-KH-104",
  "GLI-KH-105",
  "GLI-KH-004",
  "GLI-KH-005",
  "GLI-KH-106",
  "GLI-PT-VN-501",
  "GLI-PT-VN-503",
  "GLI-PT-PH-506",
  "GLI-PT-PH-507",
  "GLI-PT-MY-509",
  "GLI-PT-MY-510",
  "GLI-PT-MY-511",
  "GLI-PT-MY-512",
  "GLI-PJ-KH-901",
  "GLI-PJ-PH-902",
  "GLI-PJ-KH-903",
  "GLI-PJ-MY-904",
];

const approvedVisibleOverrides = [
  ["GLI TRUST SCORE", "GLI TRUST GRADE"],
  ["Trust Score 상위 자산", "검증 등급 상위 자산"],
  ["게재 자산 Trust Score", "게재 자산 Trust 등급"],
  ["Trust Score는 어떻게 산출되나요?", "Trust 등급은 어떻게 산정되나요?"],
  ["Trust Score와", "Trust 등급과"],
  ["가격과 Trust Score,", "가격과 Trust 등급,"],
  ["Trust Score는", "Trust 등급은"],
  ["Trust Score에", "Trust 등급에"],
  ["Trust Score를", "Trust 등급을"],
  ["Trust 높은순", "Trust 등급 높은순"],
  [">Trust <b>", ">Trust 등급 <b>"],
  ["80 이상 A, 65 이상 B, 그 외 C 등급입니다.", "확인 범위와 자료 일치도를 기준으로 S부터 D까지 8단계로 표시합니다."],
  ["점수로 환산한 값입니다.", "등급으로 정리한 결과입니다."],
  ["확인되지 않은 항목은 점수를 깎는 대신", "확인되지 않은 항목은"],
  ["질문은 Claude가 해석해", "질문은 GLI AI가 해석해"],
];

function applyApprovedVisibleOverrides(html) {
  return approvedVisibleOverrides.reduce(
    (output, [before, after]) => output.replaceAll(before, after),
    html,
  );
}

function viewExpression(node) {
  if (!node?.tagName) return null;
  const classAttr = (node.attrs ?? []).find((attr) => attr.name === "class");
  const exact = classAttr?.value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  return exact?.[1] ?? null;
}

const viewNodes = new Map();
let headerNode = null;
let footerNode = null;
for (const node of fragment.childNodes ?? []) {
  if (node.tagName === "nav" && !headerNode) headerNode = node;
  if (node.tagName === "footer") footerNode = node;
  const expression = viewExpression(node);
  const view = expression ? viewExpressions.get(expression) : null;
  if (view) viewNodes.set(view, node);
}

if (!headerNode || !footerNode || viewNodes.size < 11) {
  throw new Error("Claude handoff views could not be separated.");
}

function renderWithState(node, patch = {}) {
  component.state = { ...structuredClone(initialState), ...patch };
  values = component.renderVals();
  return applyApprovedVisibleOverrides(renderNode(node, {}));
}

const headerHtml = renderWithState(headerNode);
const footerHtml = renderWithState(footerNode);
const views = {};
for (const [view, node] of viewNodes) {
  views[view] = renderWithState(node, { view });
}

const detailViews = Object.fromEntries(
  assetIds.map((id, asset) => [
    id,
    Object.fromEntries(
      Array.from({ length: 5 }, (_, tier) => [
        String(tier),
        renderWithState(viewNodes.get("detail"), { view: "detail", asset, tier }),
      ]),
    ),
  ]),
);

const articleViews = Object.fromEntries(
  Array.from({ length: 9 }, (_, article) => [
    String(article),
    renderWithState(viewNodes.get("article"), { view: "article", article }),
  ]),
);

component.state = structuredClone(initialState);
values = component.renderVals();
const docIds = (values.docNav ?? []).map((doc) => doc.id);
const paperViews = Object.fromEntries(
  docIds.map((doc) => [
    doc,
    renderWithState(viewNodes.get("paper"), { view: "paper", doc }),
  ]),
);

const planViews = Object.fromEntries(
  ["monthly", "yearly"].map((cycle) => [
    cycle,
    renderWithState(viewNodes.get("plan"), { view: "plan", cycle }),
  ]),
);

const checkoutViews = Object.fromEntries(
  ["explore", "investor", "private"].map((plan) => [
    plan,
    Object.fromEntries(
      ["monthly", "yearly"].map((cycle) => [
        cycle,
        Object.fromEntries(
          [false, true].map((paid) => [
            paid ? "paid" : "pending",
            renderWithState(viewNodes.get("co"), { view: "co", plan, cycle, paid }),
          ]),
        ),
      ]),
    ),
  ]),
);

const soonViews = Object.fromEntries(
  ["fav", "about", "contact", "guide", "partners", "notice", "news", "paper", "membership", "my", "consult", "community", "game", "lang"].map((soon) => [
    soon,
    renderWithState(viewNodes.get("soon"), { view: "soon", soon }),
  ]),
);

const reactFidelityCss = `
/* Neutralize legacy React globals so the frozen HTML keeps browser-native control metrics. */
.hookrow input{line-height:normal}
.ncard{font-size:13.3333px;line-height:normal;word-break:normal;overflow-wrap:normal}
.nav img{max-width:none}
footer img{display:inline}
[data-view="home"] main .panel>.min{display:none}
.statedemo{display:none!important}
.btn.is-searching svg{animation:gli-search-spin 1s linear infinite}
@keyframes gli-search-spin{to{transform:rotate(360deg)}}
.search-loading{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:18px}
.search-skeleton{display:flex;flex-direction:column;gap:13px;padding:14px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.search-skeleton-photo,.search-skeleton-line{display:block;background:linear-gradient(90deg,#E8ECE9 25%,#F5F7F5 50%,#E8ECE9 75%);background-size:200% 100%;animation:gli-search-shimmer 1.4s ease-in-out infinite}
.search-skeleton-photo{height:190px;margin:-14px -14px 4px}
.search-skeleton-line{height:16px;border-radius:4px;width:68%}
.search-skeleton-line.wide{width:92%;height:20px}
.search-skeleton-line.short{width:44%}
@keyframes gli-search-shimmer{to{background-position:-200% 0}}
.fw{display:flex;flex-direction:column;gap:11px;margin-top:0;padding:20px 0 0;border-top:1px solid var(--line)}
.fw-label{font-size:14px;font-weight:700;color:var(--ink-2)}
.fw-row{display:flex;align-items:stretch;gap:12px}
.fw-row textarea{flex:1;min-width:0;min-height:56px;max-height:168px;padding:15px 16px;font-family:var(--f);font-size:17px;line-height:1.55;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:var(--r);resize:none;overflow-y:auto;overflow-wrap:anywhere;outline:none}
.fw-row textarea::placeholder{color:#9A968C}
.fw-row textarea:focus{border-color:var(--green);background:var(--surface);box-shadow:0 0 0 3px rgba(31,106,86,.16)}
.fw-row textarea:disabled{background:#F3F1EB;color:var(--ink-2);cursor:default}
.fw-send{flex:none;min-height:56px;padding:0 24px}
.fw-send:focus-visible{outline:2px solid var(--forest);outline-offset:2px}
.fw-send[disabled]{opacity:.45;cursor:default;background:var(--lime);border-color:var(--lime)}
.fw-status{font-size:14px;color:var(--ink-2);display:flex;align-items:center;gap:9px;margin:0}
.fw:not(.is-loading):not(.is-error) .fw-status{display:none}
.fw.is-error .fw-status{color:var(--red)}
.fw.is-error .fw-row textarea{border-color:var(--red)}
.fw-dots{display:inline-flex;gap:4px}
.fw-dots i{width:6px;height:6px;border-radius:999px;background:var(--green);animation:bl 1s infinite}
.fw-dots i:nth-child(2){animation-delay:.15s}
.fw-dots i:nth-child(3){animation-delay:.3s}
@media(prefers-reduced-motion:reduce){.btn.is-searching svg,.search-skeleton-photo,.search-skeleton-line,.fw-dots i{animation:none}}
@media(max-width:768px){.search-loading{grid-template-columns:1fr}.search-skeleton:nth-child(n+2){display:none}}
@media(max-width:560px){.fw{padding-bottom:env(safe-area-inset-bottom)}.fw-row{flex-direction:column}.fw-row textarea{font-size:16px;min-height:62px}.fw-send{width:100%;min-height:52px}}
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(cssPath, `${css}\n${reactFidelityCss}`, "utf8");
fs.writeFileSync(
  outputPath,
  [
    "// Generated from design-handoff/source/gli-demo.dc.html. Do not edit by hand.",
    `export const CLAUDE_HEADER_HTML = ${JSON.stringify(headerHtml)};`,
    `export const CLAUDE_FOOTER_HTML = ${JSON.stringify(footerHtml)};`,
    `export const CLAUDE_VIEWS = ${JSON.stringify(views)} as const;`,
    `export const CLAUDE_DETAIL_VIEWS = ${JSON.stringify(detailViews)} as const;`,
    `export const CLAUDE_ARTICLE_VIEWS = ${JSON.stringify(articleViews)} as const;`,
    `export const CLAUDE_PAPER_VIEWS = ${JSON.stringify(paperViews)} as const;`,
    `export const CLAUDE_PLAN_VIEWS = ${JSON.stringify(planViews)} as const;`,
    `export const CLAUDE_CHECKOUT_VIEWS = ${JSON.stringify(checkoutViews)} as const;`,
    `export const CLAUDE_SOON_VIEWS = ${JSON.stringify(soonViews)} as const;`,
    `export const CLAUDE_ASSET_IDS = ${JSON.stringify(assetIds)} as const;`,
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Generated ${path.relative(root, cssPath)} and ${path.relative(root, outputPath)}.`);
