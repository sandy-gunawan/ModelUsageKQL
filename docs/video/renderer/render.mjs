import { spawnSync } from 'node:child_process';
import { constants, existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scenes } from './scenes.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const diagram = resolve(root, '..', '..', 'diagrams', 'apim-foundry-lab.png');
const output = resolve(root, '..', 'apim-foundry-demo.mp4');
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function imagePath(directory, scene) {
  if (scene.image === 'architecture.png') return diagram;
  return join(directory, scene.source === 'webapp' ? 'apim-foundry-webapps' : 'apim-foundry-portal', scene.image);
}

export async function inspectImages(directory) {
  const issues = [];
  for (const scene of scenes) {
    const { image } = scene;
    const path = imagePath(directory, scene);
    try {
      const handle = await open(path, 'r');
      try {
        const bytes = Buffer.alloc(24);
        const { bytesRead } = await handle.read(bytes);
        if (bytesRead !== 24 || !bytes.subarray(0, 8).equals(signature) ||
            bytes.toString('ascii', 12, 16) !== 'IHDR' ||
            Math.min(bytes.readUInt32BE(16), bytes.readUInt32BE(20)) < 240) {
          issues.push(`${image}: bukan PNG yang valid atau crop terlalu kecil (min. 240 px).`);
        }
      } finally {
        await handle.close();
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      issues.push(`${image}: file belum ada.`);
    }
  }
  return issues;
}

async function main(args) {
  const check = args[0] === '--check';
  const folder = check ? args[1] : args[0];
  if (!folder || (check ? args.length !== 2 : args.length > 2)) {
    throw new Error('Gunakan npm run check -- "<folder-aset>" atau npm run render -- "<folder-aset>" ["<hasil.mp4>"].');
  }
  const source = resolve(folder);
  const destination = !check && args[1] ? resolve(args[1]) : output;
  const issues = await inspectImages(source);
  if (issues.length) throw new Error(`${issues.length} aset belum siap:\n${issues.join('\n')}`);
  if (check) {
    console.log(`PNG siap dibaca untuk ${scenes.length} adegan. Periksa sumber screenshot dan redaksi sebelum render.`);
    return;
  }
  if (existsSync(destination)) throw new Error('MP4 tujuan sudah ada. Gunakan path lain agar tidak ditimpa.');
  const temporary = await mkdtemp(join(tmpdir(), 'pamadigi-video-'));
  try {
    const assets = join(temporary, 'assets');
    await mkdir(assets);
    for (const scene of scenes) {
      await copyFile(imagePath(source, scene), join(assets, scene.image));
    }
    const cli = resolve(root, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
    const stagedVideo = join(temporary, 'demo.mp4');
    const result = spawnSync(process.execPath, [cli, 'render', 'index.jsx', 'ApimFoundry', stagedVideo,
      `--public-dir=${assets}`, '--muted', '--codec=h264'], { cwd: root, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0 || !existsSync(stagedVideo)) throw new Error('Render MP4 tidak selesai.');
    await copyFile(stagedVideo, destination, constants.COPYFILE_EXCL);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
