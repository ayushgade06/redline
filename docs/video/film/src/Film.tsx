import React from 'react';
import {AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {wipe} from '@remotion/transitions/wipe';
import {TL} from './timeline';
import {Captions} from './Captions';
import {C} from './theme';
import {Hook} from './scenes/Hook';
import {Who} from './scenes/Who';
import {Flow} from './scenes/Flow';
import {How} from './scenes/How';
import {Proof} from './scenes/Proof';
import {Check} from './scenes/Check';
import {Fail} from './scenes/Fail';
import {Limits} from './scenes/Limits';
import {Close} from './scenes/Close';

const SCENES: Record<string, React.FC> = {hook: Hook, who: Who, flow: Flow, how: How, proof: Proof, check: Check, fail: Fail, limits: Limits, close: Close};

// Wipes only at the story's turns: into the paper "who" scene and into the evidence scene.
const INTO: Record<string, 'fade' | 'wipe'> = {who: 'wipe', proof: 'wipe'};

const FadeOut: React.FC = () => {
	const f = useCurrentFrame();
	const o = interpolate(f, [TL.total - 24, TL.total - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return <AbsoluteFill style={{background: '#000', opacity: o}} />;
};

export const Film: React.FC<{captions: boolean}> = ({captions}) => {
	const timing = linearTiming({durationInFrames: TL.transition});
	return (
		<AbsoluteFill style={{backgroundColor: C.desk}}>
			<TransitionSeries>
				{TL.scenes.flatMap((s, i) => {
					const Scene = SCENES[s.id];
					if (!Scene) throw new Error(`No component registered for scene "${s.id}" in Film.tsx`);
					const seq = (
						<TransitionSeries.Sequence key={s.id} name={s.id} durationInFrames={s.dur}>
							<Scene />
						</TransitionSeries.Sequence>
					);
					if (i === 0) return [seq];
					const kind = INTO[s.id] ?? 'fade';
					return [
						<TransitionSeries.Transition
							key={`t-${s.id}`}
							presentation={(kind === 'wipe' ? wipe({direction: 'from-left'}) : fade()) as ReturnType<typeof fade>}
							timing={timing}
						/>,
						seq,
					];
				})}
			</TransitionSeries>

			{captions ? <Captions /> : null}
			<FadeOut />

			{TL.lines.map((l) => (
				<Sequence key={l.id} name={`vo ${l.id}`} from={l.from} durationInFrames={l.dur + 14} layout="none">
					<Audio src={staticFile(l.src)} />
				</Sequence>
			))}
			<Audio name="music + sfx" src={staticFile('audio/bed.wav')} />
		</AbsoluteFill>
	);
};
