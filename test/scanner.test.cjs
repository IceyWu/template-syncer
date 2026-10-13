const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { Git } = require('../lib/utils/git');
const { Scanner } = require('../lib/utils/scanner');
const { Merger } = require('../lib/utils/merger');

async function createWorkspace(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'template-syncer-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('compares added, changed, and ignored files with language-neutral paths', async t => {
  const root = await createWorkspace(t);
  const template = path.join(root, 'template');
  const current = path.join(root, 'current');
  await fs.mkdir(path.join(template, '.cache'), { recursive: true });
  await fs.mkdir(current, { recursive: true });
  await fs.writeFile(path.join(template, 'Cargo.toml'), '[package]\nname = "new"\n');
  await fs.writeFile(path.join(template, 'src.rs'), 'fn main() {}\n');
  await fs.writeFile(path.join(template, '.cache', 'generated.json'), '{}');
  await fs.writeFile(path.join(current, 'src.rs'), 'fn main() { println!("local"); }\n');
  await fs.writeFile(path.join(current, 'local.py'), 'print("keep")\n');

  const changes = await new Scanner().compare(template, current, true);
  assert.deepEqual(changes.map(({ path: file, status }) => [file, status]), [
    ['Cargo.toml', 'new'],
    ['local.py', 'deleted'],
    ['src.rs', 'modified']
  ]);
});

test('uses ignore globs for caller-provided directories and local overrides', async t => {
  const root = await createWorkspace(t);
  const template = path.join(root, 'template');
  const current = path.join(root, 'current');
  await fs.mkdir(path.join(template, 'config'), { recursive: true });
  await fs.mkdir(path.join(current, 'config'), { recursive: true });
  await fs.writeFile(path.join(template, 'config', 'app.local.yaml'), 'secret: template');
  await fs.writeFile(path.join(current, 'config', 'app.local.yaml'), 'secret: local');
  await fs.writeFile(path.join(template, 'config', 'app.yaml'), 'port: 1');
  await fs.writeFile(path.join(current, 'config', 'app.yaml'), 'port: 2');

  const changes = await new Scanner(['**/*.local.yaml']).compare(template, current);
  assert.deepEqual(changes.map(change => change.path), ['config/app.yaml']);
});

test('streams comparisons of large files without treating identical contents as changes', async t => {
  const root = await createWorkspace(t);
  const template = path.join(root, 'template');
  const current = path.join(root, 'current');
  await fs.mkdir(template);
  await fs.mkdir(current);
  const content = Buffer.alloc(12 * 1024 * 1024, 0x61);
  await fs.writeFile(path.join(template, 'archive.dat'), content);
  await fs.writeFile(path.join(current, 'archive.dat'), content);

  assert.deepEqual(await new Scanner().compare(template, current), []);
});

test('smart JSON merge preserves project values while accepting template updates', async t => {
  const root = await createWorkspace(t);
  const template = path.join(root, 'template.json');
  const current = path.join(root, 'current.json');
  const target = path.join(root, 'result', 'config.json');
  await fs.writeFile(template, JSON.stringify({ port: 8000, feature: { enabled: true, mode: 'new' } }));
  await fs.writeFile(current, JSON.stringify({ port: 9000, feature: { enabled: false, local: true } }));

  const result = await new Merger({ 'config.json': 'smart' }).merge(template, current, target);
  assert.equal(result.success, true);
  assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), {
    port: 8000,
    feature: { enabled: true, local: true, mode: 'new' }
  });
});

test('disables global line-ending conversion when cloning templates', () => {
  const git = new Git();
  const commands = [];
  git.exec = args => commands.push(args);
  git.clone('https://example.invalid/template.git', 'template');
  assert.deepEqual(commands, [[
    'clone', '--config', 'core.autocrlf=false', '--',
    'https://example.invalid/template.git', 'template'
  ]]);
});
