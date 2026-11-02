const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
const source = fs.readFileSync(path.join(__dirname, '../services/ai/markdown.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
vm.runInNewContext(js, { module: moduleUnderTest, exports: moduleUnderTest.exports, URL, require: name => {
  assert.equal(name, 'markdown-it'); return require('markdown-it');
} });
const { parseAnswerMarkdown: parse, safeAnswerLink } = moduleUnderTest.exports;
function all(nodes) { return nodes.flatMap(node => [node, ...all(node.children)]); }

test('headings, emphasis and nested ordered/bullet lists preserve readable structure', () => {
  const nodes = parse('# Dam update\n\n**Water** is *rising*.\n\n3. First step\n   - Nested detail\n4. Second step');
  const flattened = all(nodes);
  assert.equal(nodes[0].type, 'heading');
  assert.equal(nodes[0].tag, 'h1');
  assert.ok(flattened.some(node => node.type === 'strong'));
  assert.ok(flattened.some(node => node.type === 'em'));
  const ordered = flattened.find(node => node.type === 'ordered_list');
  assert.equal(ordered.attrs.find(([key]) => key === 'start')[1], '3');
  assert.equal(ordered.children.length, 2);
  assert.ok(all(ordered.children[0].children).some(node => node.type === 'bullet_list'));
});
test('GFM tables and strikethrough are parsed with separate header/body cells', () => {
  const nodes = parse('| Reading | Value |\n| --- | --- |\n| Water | **12 m** |\n\n~~Old reading~~');
  const flattened = all(nodes);
  assert.equal(nodes[0].type, 'table');
  assert.equal(flattened.filter(node => node.type === 'th').length, 2);
  assert.equal(flattened.filter(node => node.type === 'td').length, 2);
  assert.ok(flattened.some(node => node.type === 's'));
});
test('quotes, dividers and fenced code retain their content without executing it', () => {
  const nodes = all(parse('> A note\n\n---\n\n```js\nalert("example");\n```'));
  assert.ok(nodes.some(node => node.type === 'blockquote'));
  assert.ok(nodes.some(node => node.type === 'hr'));
  assert.equal(nodes.find(node => node.type === 'fence').content, 'alert("example");\n');
});
test('HTML stays text; remote images stay image tokens rather than executable markup', () => {
  const nodes = all(parse('<script>alert(1)</script>\n\n![Diagram](https://example.com/image.png)'));
  assert.ok(!nodes.some(node => node.type.startsWith('html')));
  assert.ok(nodes.some(node => node.type === 'text' && node.content.includes('<script>')));
  assert.equal(nodes.find(node => node.type === 'image').content, 'Diagram');
});
test('only HTTP(S) answer links are actionable', () => {
  assert.equal(safeAnswerLink('https://example.com/guide'), 'https://example.com/guide');
  for (const input of ['javascript:alert(1)', 'file:///secret', 'intent://test', 'data:text/html,hello', '//example.com', '/admin']) assert.equal(safeAnswerLink(input), null);
  assert.ok(all(parse('[Guide](https://example.com)')).some(node => node.type === 'link'));
});
