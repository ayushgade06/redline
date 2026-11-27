import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {TL} from './timeline';
import {BRAND, C, F} from './theme';

const phrases = TL.lines.flatMap((l) =>
	l.phrases.map((p) => ({text: p.text, from: l.from + Math.round(p.start * TL.fps), to: l.from + Math.round(p.end * TL.fps) + 4})),
);

const NAME = new RegExp(`\\b(${BRAND.name})\\b`, 'g');

/** Burned-in captions, phrase by phrase, timed from edge-tts word boundaries. */
export const Captions: React.FC = () => {
	const f = useCurrentFrame();
	const cur = phrases.find((p) => f >= p.from && f < p.to);
	if (!cur) return null;
	const o = interpolate(f, [cur.from, cur.from + 4, cur.to - 3, cur.to], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const parts = cur.text.split(NAME);
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 944, display: 'flex', justifyContent: 'center', opacity: o}}>
			<div
				style={{
					maxWidth: 1500,
					padding: '11px 28px 14px',
					borderRadius: 12,
					background: 'rgba(14,21,48,0.88)',
					fontFamily: F.sans,
					fontWeight: 600,
					fontSize: 40,
					lineHeight: 1.2,
					color: C.nightText,
					textAlign: 'center',
					whiteSpace: 'nowrap',
				}}
			>
				{parts.map((p, i) =>
					i % 2 ? (
						<span key={i} style={{borderBottom: `4px solid ${C.pen}`, paddingBottom: 1}}>
							{p}
						</span>
					) : (
						<React.Fragment key={i}>{p}</React.Fragment>
					),
				)}
			</div>
		</div>
	);
};
