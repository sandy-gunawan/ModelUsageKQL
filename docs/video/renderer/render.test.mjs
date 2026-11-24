import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { inspectImages } from './render.mjs';
import { scenes } from './scenes.mjs';

test('requires each Portal and Web App capture from its source directory', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'pamadigi-video-test-'));
  try {
    const portal = join(folder, 'apim-foundry-portal');
    await mkdir(portal);
    await writeFile(join(portal, 'main-07.png'), 'Not a screenshot');
    await writeFile(join(portal, 'main-browser.png'), 'Wrong source directory');
    const issues = await inspectImages(folder);
    for (const id of ['main', 'x', 'y']) {
      assert.ok(issues.some((issue) => issue.startsWith(`${id}-07.png:`)));
      assert.ok(issues.includes(`${id}-browser.png: file belum ada.`));
    }
    assert.ok(issues.some((issue) => issue.includes('bukan PNG')));
    assert.ok(issues.some((issue) => issue.startsWith('18-workbook-native-requests.png:')));
    assert.ok(issues.some((issue) => issue.startsWith('19-workbook-apim-requests.png:')));
    assert.ok(issues.some((issue) => issue.startsWith('20-kql-foundry-caller.png:')));
    assert.ok(!issues.some((issue) => issue.startsWith('architecture.png:')));
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test('all overlay text is short, with no special placeholder sources in the final sequence', () => {
  assert.equal(new Set(scenes.map(({ image }) => image)).size, scenes.length);
  for (const { image, caption } of scenes) {
    const lines = caption.split('\n');
    assert.ok(lines.length <= 2 && lines.every((line) => [...line].length <= 42), image);
  }
});
