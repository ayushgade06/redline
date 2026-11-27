import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Desk, Kicker, Tag, clamp, useIn} from '../ui';
import {C, F, ease} from '../theme';
import {L, W} from '../timeline';

const X = [110, 462, 814, 1166, 1518];
const NW = 300;
const TOP = 300;
const NH = 330;

const Node: React.FC<{i: number; at: number; tag: string; title: string; solid?: boolean; children?: React.ReactNode}> = ({i, at, tag, title, solid, children}) => {
	const p = useIn(at, 18);
	return (
		<div
			style={{
				position: 'absolute',
				left: X[i],
				top: TOP,
				width: NW,
				height: NH,
				boxSizing: 'border-box',
				padding: '24px 26px',
				borderRadius: 18,
				background: solid ? C.ink : '#fff',
				color: solid ? '#fff' : C.ink,
				boxShadow: solid ? '0 30px 70px -20px rgba(27,42,94,0.6)' : `0 0 0 2px ${C.rule}, 0 20px 50px -24px rgba(27,42,94,0.3)`,
				opacity: p,
				translate: `0 ${(1 - p) * 30}px`,
				fontFamily: F.sans,
			}}
		>
			<div
				style={{
					display: 'inline-block',
					padding: '5px 12px',
					borderRadius: 6,
					fontWeight: 800,
					fontSize: 18,
					letterSpacing: '0.14em',
					background: solid ? 'rgba(255,255,255,0.14)' : tag === 'YOU' ? C.marker : '#e8ecf5',
					color: solid ? '#fff' : tag === 'YOU' ? C.markerInk : C.inkSoft,
				}}
			>
				{tag}
			</div>
			<div style={{marginTop: 16, fontWeight: 800, fontSize: 40, letterSpacing: '-0.02em', lineHeight: 1.05}}>{title}</div>
			<div style={{marginTop: 14, fontSize: 23, lineHeight: 1.35, fontWeight: 500, color: solid ? 'rgba(255,255,255,0.86)' : C.inkSoft}}>{children}</div>
		</div>
	);
};

const Arrow: React.FC<{i: number; at: number}> = ({i, at}) => {
	const f = useCurrentFrame();
	const p = interpolate(f, [at, at + 14], [0, 1], {...clamp, easing: ease});
	const x0 = X[i] + NW + 6;
	const len = X[i + 1] - x0 - 8;
	return (
		<div style={{position: 'absolute', left: x0, top: TOP + NH / 2 - 2, width: len * p, height: 4, background: C.ink, borderRadius: 2}}>
			<div style={{position: 'absolute', right: -2, top: -8, width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: `14px solid ${C.ink}`, opacity: p > 0.9 ? 1 : 0}} />
		</div>
	);
};

const Line: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
	const p = useIn(at, 14);
	return <div style={{opacity: p, translate: `0 ${(1 - p) * 10}px`, ...style}}>{children}</div>;
};

export const How: React.FC = () => {
	const read = W('how1', 'sonnet') - 6;
	const confirm = W('how2', 'confirm') - 4;
	const decide = W('how2', 'sim-pie') - 4;
	const explain = W('how3', 'explain') - 4;
	const head = (at: number) => useIn(at, 16);
	return (
		<AbsoluteFill>
			<Desk />
			<Kicker n="04">WHERE THE AI IS USED</Kicker>
			<Tag>backend/llm.py · backend/verify.py · eval/RESULTS.md §1, §4</Tag>

			<div style={{position: 'absolute', left: 110, top: 150, fontFamily: F.sans, fontWeight: 800, fontSize: 76, letterSpacing: '-0.03em', color: C.ink, display: 'flex', gap: 26}}>
				<span style={{opacity: head(read)}}>AI reads.</span>
				<span style={{opacity: head(decide)}}>Math decides.</span>
				<span style={{opacity: head(explain)}}>AI explains.</span>
			</div>

			<Node i={0} at={L('how1') + 4} tag="INPUT" title="Your page">
				<Img src={staticFile('pages/lost-root.jpg')} style={{width: 200, borderRadius: 8, boxShadow: `0 0 0 1px ${C.rule}`}} />
			</Node>
			<Arrow i={0} at={read - 8} />
			<Node i={1} at={read} tag="AI" title="Reads the photo">
				Claude Sonnet 5.5, a vision model
				<Line at={W('how1', 'haiku') - 4} style={{marginTop: 12, color: C.pencil}}>
					backup: Claude Haiku 5.5
				</Line>
			</Node>
			<Arrow i={1} at={confirm - 8} />
			<Node i={2} at={confirm} tag="YOU" title="Confirm">
				<span style={{background: 'rgba(255,228,92,0.6)', padding: '0 4px', borderRadius: 3}}>unsure lines</span> are highlighted; fix any misread
			</Node>
			<Arrow i={2} at={decide - 8} />
			<Node i={3} at={decide} tag="NO AI" title="SymPy decides" solid>
				every step, right or wrong
				<Line at={W('how2', 'milliseconds') - 4} style={{marginTop: 10}}>
					median 35–101 ms
				</Line>
				<Line at={W('how2', 'free') - 4}>$0 per check</Line>
			</Node>
			<Arrow i={3} at={explain - 8} />
			<Node i={4} at={explain} tag="AI" title="Explains">
				Claude Haiku 5.5 writes hints from the engine's finding
				<Line at={W('how3', 'guard') - 4} style={{marginTop: 12, padding: '8px 10px', borderRadius: 8, border: `2px solid ${C.ink}`, fontWeight: 700, fontSize: 20, color: C.ink}}>
					+ answer-leak guard (deterministic)
				</Line>
			</Node>

			{/* A1: model choice, evidence (not spoken) */}
			<Line at={W('how1', 'haiku') + 20} style={{position: 'absolute', left: 110, top: 690, width: 1000, fontFamily: F.sans, fontSize: 22, lineHeight: 1.45, color: C.inkSoft}}>
				<b style={{color: C.ink}}>Why Sonnet:</b> bake-off on the 6 demo pages: all three models read every line exactly;
				median read time Sonnet 2.6 s · Opus 3.5 s · Haiku 10.3 s (parallel run). Chosen for speed.
			</Line>
			<Line at={W('how3', 'guard') + 6} style={{position: 'absolute', right: 110, top: 690, width: 560, textAlign: 'right', fontFamily: F.sans, fontSize: 20, lineHeight: 1.45, color: C.pencil}}>
				AI calls are built to route through Prune.
				<br />
				SymPy never calls an AI.
			</Line>
		</AbsoluteFill>
	);
};
