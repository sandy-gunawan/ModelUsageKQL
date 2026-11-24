import React from 'react';
import { AbsoluteFill, Composition, Img, Series, registerRoot, staticFile } from 'remotion';
import { z } from 'zod';
import { fps, height, scenes, totalFrames, width } from './scenes.mjs';

const sceneSchema = z.object({
  image: z.string().regex(/^[a-z0-9-]+\.png$/),
  heading: z.string(),
  caption: z.string(),
  frames: z.number().int().positive(),
});
const schema = z.object({ scenes: z.array(sceneSchema).min(1) });

function Screen({ scene, index, length }) {
  return (
    <AbsoluteFill style={{ display: 'grid', gridTemplateRows: '54px minmax(0, 1fr) 116px', gap: 7, backgroundColor: '#020617', color: '#f8fafc', fontFamily: '"Segoe UI", Arial, sans-serif', padding: '22px 64px 32px' }}>
      <header style={{ height: 54, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 31, fontWeight: 650 }}>
        <span>{scene.heading}</span>
        <span style={{ color: '#98a9be', fontSize: 24 }}>{index + 1} / {length}</span>
      </header>
      <Img src={staticFile(scene.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      <footer style={{ borderTop: '3px solid #61e493', display: 'grid', alignContent: 'center', whiteSpace: 'pre-line', textAlign: 'center', fontSize: 38, fontWeight: 600, lineHeight: 1.13 }}>
        {scene.caption}
      </footer>
    </AbsoluteFill>
  );
}

function Video({ scenes: sequence }) {
  return <Series>{sequence.map((scene, index) => (
    <Series.Sequence key={scene.image} durationInFrames={scene.frames}>
      <Screen scene={scene} index={index} length={sequence.length} />
    </Series.Sequence>
  ))}</Series>;
}

registerRoot(() => (
  <Composition id="ApimFoundry" component={Video} schema={schema}
    defaultProps={{ scenes }} durationInFrames={totalFrames(scenes)}
    calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props.scenes) })}
    fps={fps} width={width} height={height} />
));
