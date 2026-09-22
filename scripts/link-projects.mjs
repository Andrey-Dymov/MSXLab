import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const privateRoot = path.resolve(process.argv[2] || path.join(root, '../MSXProjects'));
for (const relative of ['projects', 'work', 'docs/reference', 'engines/webmsx-6.0.8', 'resources/environments/msxdos1']) {
  const source = path.join(privateRoot, relative), target = path.join(root, relative);
  await fs.access(source);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const existing = await fs.lstat(target).catch(e => { if (e.code !== 'ENOENT') throw e; });
  if (existing) {
    if (existing.isSymbolicLink() && await fs.realpath(target) === await fs.realpath(source)) continue;
    throw new Error(`Path already exists; left untouched: ${target}`);
  }
  await fs.symlink(path.relative(path.dirname(target), source), target, 'dir');
}
console.log('Private projects and local runtime materials connected.');
