import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Desk, Label, PenStroke, Phone, useIn} from '../ui';
import {BRAND, C, F} from '../theme';
import {L, W} from '../timeline';

const Beat: React.FC<{at: number; children: React.ReactNode; strong?: boolean}> = ({at, children, strong}) => {
	const p = useIn(at, 14);
	return <span style={{opacity: p, color: strong ? '#fff' : 'rgba(238,242,247,0.78)', display: 'inline-block', translate: `0 ${(1 - p) * 14}px`}}>{children}</span>;
};

export const Close: React.FC = () => {
	const mark = W('close1', 'redline');
	return (
		<AbsoluteFill>
			<Desk kind="night" />
			<div style={{position: 'absolute', left: 150, top: 200}}>
				<div style={{position: 'relative', fontFamily: F.sans, fontWeight: 800, fontSize: 190, letterSpacing: '-0.04em', color: C.nightText, opacity: useIn(L('close1') - 6, 14), lineHeight: 1}}>
					{BRAND.name}
					<PenStroke at={mark + 4} dur={21} style={{left: 0, bottom: -34, width: '100%', height: 34}} width={5} />
				</div>
				<div style={{marginTop: 48, fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: 'rgba(238,242,247,0.7)', opacity: useIn(W('close1', 'built') - 4, 14)}}>
					Built this week · Nov 21–28, 2026 · Global AI Builder's Challenge
				</div>
				<div style={{marginTop: 40, fontFamily: F.sans, fontWeight: 800, fontSize: 58, letterSpacing: '-0.02em', display: 'flex', gap: 22}}>
					<Beat at={W('close2', 'reads') - 6}>AI reads.</Beat>
					<Beat at={W('close2', 'math') - 4} strong>
						Math decides.
					</Beat>
					<Beat at={W('close2', 'explains') - 6}>AI explains.</Beat>
				</div>
				<div style={{marginTop: 56, fontFamily: F.sans, fontWeight: 700, fontSize: 30, lineHeight: 1.6, color: C.nightText, opacity: useIn(W('close2', 'explains') + 8, 16)}}>
					{BRAND.repo}
					<br />
					{BRAND.url}
				</div>
			</div>
			<div style={{opacity: useIn(L('close1') + 6, 18)}}>
				<Phone src="shots/m_result_top.png" x={1390} y={110} h={740} />
				<Label night at={L('close1') + 12} style={{left: 1392, top: 886}}>
					PHONE LAYOUT · REAL CAPTURE
				</Label>
			</div>
		</AbsoluteFill>
	);
};
