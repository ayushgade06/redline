import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Card, Desk, Kicker, PenStroke, Tag, useIn} from '../ui';
import {C, F} from '../theme';
import {W} from '../timeline';

const Chip: React.FC<{at: number; children: React.ReactNode}> = ({at, children}) => {
	const p = useIn(at, 16);
	return (
		<div
			style={{
				padding: '16px 30px',
				borderRadius: 999,
				border: `3px solid ${C.ink}`,
				fontFamily: F.sans,
				fontWeight: 700,
				fontSize: 40,
				color: C.ink,
				background: '#fff',
				opacity: p,
				translate: `0 ${(1 - p) * 20}px`,
				whiteSpace: 'nowrap',
			}}
		>
			{children}
		</div>
	);
};

export const Who: React.FC = () => {
	const stroke = W('who3', 'line');
	return (
		<AbsoluteFill>
			<Desk kind="paper" />
			<Kicker n="02">WHO IT'S FOR</Kicker>
			<Tag>README · WHO IT'S FOR</Tag>

			<div style={{position: 'absolute', left: 160, right: 160, top: 160, display: 'flex', gap: 28, justifyContent: 'center'}}>
				<Chip at={W('who1', 'C') - 4}>CBSE · Class 9–12</Chip>
				<Chip at={W('who1', 'J') - 4}>JEE aspirants</Chip>
				<Chip at={W('who1', 'first-year') - 4}>First-year engineering</Chip>
			</div>

			<div style={{position: 'absolute', left: 260, right: 260, top: 330, display: 'flex', gap: 60, justifyContent: 'center'}}>
				<Card at={W('who2', 'answer') - 4} style={{width: 620, height: 250, padding: '30px 40px'}}>
					<div style={{fontFamily: F.sans, fontWeight: 700, fontSize: 22, letterSpacing: '0.18em', color: C.pencil}}>AN ANSWER KEY</div>
					<div style={{marginTop: 34, fontFamily: F.sans, fontWeight: 800, fontSize: 84, color: C.ink, letterSpacing: '-0.02em'}}>“wrong.”</div>
				</Card>
				<Card at={W('who2', 'solver') - 4} style={{width: 620, height: 250, padding: '30px 40px'}}>
					<div style={{fontFamily: F.sans, fontWeight: 700, fontSize: 22, letterSpacing: '0.18em', color: C.pencil}}>A SOLVER APP</div>
					<div style={{marginTop: 30, fontFamily: F.sans, fontWeight: 700, fontSize: 40, color: C.ink}}>“Here's my solution…”</div>
					{[0.92, 0.7, 0.82].map((w, i) => (
						<div key={i} style={{marginTop: 16, height: 14, width: `${w * 100}%`, borderRadius: 7, background: C.grid}} />
					))}
				</Card>
			</div>

			<div style={{position: 'absolute', left: 0, right: 0, top: 660, textAlign: 'center', fontFamily: F.sans, fontWeight: 800, fontSize: 72, letterSpacing: '-0.02em', color: C.ink, opacity: useIn(W('who3', 'neither') - 4, 16)}}>
				Neither points at <span style={{position: 'relative', display: 'inline-block'}}>
					the line in your work
					<PenStroke at={stroke} dur={22} style={{left: -6, right: -6, bottom: -16, height: 22, width: 'calc(100% + 12px)'}} width={5} />
				</span>
				.
			</div>
		</AbsoluteFill>
	);
};
