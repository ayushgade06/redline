import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Card, Desk, Kicker, Tag, clamp, useIn} from '../ui';
import {C, F, ease} from '../theme';
import {L, W} from '../timeline';

const Item: React.FC<{at: number; k: string; children: React.ReactNode}> = ({at, k, children}) => {
	const p = useIn(at, 16);
	return (
		<div style={{marginTop: 38, opacity: p, translate: `0 ${(1 - p) * 16}px`, fontFamily: F.sans}}>
			<div style={{fontWeight: 700, fontSize: 20, letterSpacing: '0.18em', color: C.pencil}}>{k}</div>
			<div style={{marginTop: 8, fontWeight: 800, fontSize: 38, lineHeight: 1.18, color: C.ink, letterSpacing: '-0.01em'}}>{children}</div>
		</div>
	);
};

export const Limits: React.FC = () => {
	const f = useCurrentFrame();
	const st = W('lim2', 'changed') - 4;
	const stamp = interpolate(f, [st, st + 10], [0, 1], {...clamp, easing: ease});
	return (
		<AbsoluteFill>
			<Desk kind="paper" />
			<Kicker n="08">LIMITS, AND HOW IT WAS BUILT</Kicker>
			<Tag>README · LIMITATIONS · eval/RESULTS.md §6–7 · docs/ai-dev-log.md</Tag>

			<div style={{position: 'absolute', left: 150, top: 150, width: 800}}>
				<div style={{fontFamily: F.sans, fontWeight: 800, fontSize: 64, letterSpacing: '-0.02em', color: C.ink, opacity: useIn(L('lim1'), 14)}}>When not to trust it</div>
				<Item at={W('lim1', 'no') - 4} k="WON'T CHECK">
					Geometry · word problems · proofs · integrals
				</Item>
				<Item at={W('lim1', 'only') - 6} k="ONLY AS GOOD AS THE READING">
					Unsure lines are highlighted. Every line is editable.
				</Item>
				<Item at={W('lim1', 'real-handwriting') - 6} k="NOT YET MEASURED">
					Accuracy on real handwriting
				</Item>
			</div>

			<Card at={L('lim2') - 4} style={{position: 'absolute', left: 1040, top: 170, width: 760, padding: '36px 44px 40px'}}>
				<div style={{fontFamily: F.sans, fontWeight: 700, fontSize: 20, letterSpacing: '0.16em', color: C.pencil}}>AI DEV LOG · ENTRY 5</div>
				<div style={{marginTop: 12, fontFamily: F.sans, fontWeight: 800, fontSize: 34, color: C.ink}}>Built with Claude Code</div>
				<div
					style={{
						marginTop: 22,
						paddingLeft: 22,
						borderLeft: `4px solid ${C.rule}`,
						fontFamily: F.sans,
						fontSize: 27,
						lineHeight: 1.4,
						color: C.inkSoft,
						opacity: useIn(W('lim2', 'guard') - 6, 14),
					}}
				>
					“The guard didn't know the true solution. It forbade the student's final answer, not the correct one, so <b style={{color: C.ink}}>“So x = 2”</b> passed.”
				</div>
				<div style={{marginTop: 18, fontFamily: F.sans, fontSize: 23, color: C.pencil, opacity: useIn(W('lim2', 'test') - 4, 12)}}>Caught by hand-written tests in backend/test_app.py</div>
				<div
					style={{
						display: 'inline-block',
						marginTop: 24,
						border: `4px solid ${C.ink}`,
						borderRadius: 10,
						padding: '10px 18px',
						fontFamily: F.sans,
						fontWeight: 900,
						fontSize: 26,
						letterSpacing: '0.06em',
						color: C.ink,
						opacity: stamp,
						scale: String(1.25 - 0.25 * stamp),
						rotate: '-2deg',
					}}
				>
					DECISION: CHANGED · it now forbids the true solutions
				</div>
			</Card>
		</AbsoluteFill>
	);
};
