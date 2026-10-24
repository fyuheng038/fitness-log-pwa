import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = JSON.parse(await readFile(resolve(root, 'scripts/media-manifest.json'), 'utf8'));
let count = 0;
for (let start = 0; start < files.length; start += 4) {
  await Promise.all(files.slice(start, start + 4).map(async file => {
    const target = resolve(root, 'public/exercise-media', file.path);
    if (!target.startsWith(resolve(root, 'public/exercise-media') + '/'.replace('/', process.platform === 'win32' ? '\\' : '/'))) throw Error('Invalid path');
    let bytes;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(file.url, { signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw Error('HTTP ' + response.status);
        bytes = Buffer.from(await response.arrayBuffer());
        if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.length < 1000) throw Error('Not a JPEG');
        break;
      } catch (error) { if (attempt === 2) throw error; }
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    count++;
  }));
  console.log(`Images downloaded: ${count}/${files.length}`);
}
