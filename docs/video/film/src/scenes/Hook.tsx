import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Desk, Kicker, Label, Tag, clamp, useIn} from '../ui';
import {C, F, ease, glide} from '../theme';
import {L, W} from '../timeline';

// The real demo page (samples/lost-root.jpg, 1200×1210). Line centres measured from the app's own bands.
const PAGE = {x: 980, y: 118, w: 640};
const PH = (PAGE.w * 1210) / 1200;
const LINES = [0.094, 0.22, 0.34, 0.463, 0.599, 0.729, 0.844];

export const Hook: React.FC = () => {
	const f = useCurrentFrame();
	const page = useIn(0, 26);
	const card = useIn(W('hook1', 'key') - 8, 20);
	const eq1 = useIn(W('hook1', 'x'), 14);
	const eq2 = useIn(W('hook1', 'or'), 14);
	const note = useIn(W('hook2', 'only'), 16);
	const q = interpolate(f, [W('hook3', 'broke'), W('hook3', 'broke') + 12], [0, 1], {...clamp, easing: ease});
	const scanA = W('hook3', 'which');
	const scan = interpolate(f, [scanA, scanA + 26], [0, 6], {...clamp, easing: glide});
	const scanO = interpolate(f, [scanA, scanA + 4, scanA + 30, scanA + 40], [0, 1, 1, 0], clamp);
	const drift = interpolate(f, [0, 386], [0, -14]);
	return (
		<AbsoluteFill>
			<Desk kind="night" />
			<Kicker n="01" night>
				THE ANSWER KEY DISAGREES
			</Kicker>
			<Tag night>DEMO PAGE · RENDERED IN A HANDWRITING FONT</Tag>

			{/* answer key */}
			<div
				style={{
					position: 'absolute',
					left: 150,
					top: 300 + drift * 0.5,
					width: 640,
					padding: '34px 44px 40px',
					background: C.paper,
					borderRadius: 14,
					rotate: '-2deg',
					boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
					opacity: card,
					translate: `0 ${(1 - card) * 30}px`,
					fontFamily: F.sans,
					color: C.ink,
				}}
			>
				<div style={{fontWeight: 700, fontSize: 22, letterSpacing: '0.2em', color: C.pencil}}>ANSWER KEY</div>
				<div style={{marginTop: 18, fontWeight: 800, fontSize: 76, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>
					<span style={{opacity: eq1}}>x = 1</span>
					<span style={{opacity: eq2, color: C.inkSoft, fontWeight: 600}}> or </span>
					<span style={{opacity: eq2}}>x = 2</span>
				</div>
			</div>

			{/* the student's page */}
			<div
				style={{
					position: 'absolute',
					left: PAGE.x,
					top: PAGE.y + drift,
					width: PAGE.w,
					height: PH,
					rotate: '1.5deg',
					opacity: page,
					translate: `0 ${(1 - page) * 24}px`,
					borderRadius: 14,
					overflow: 'hidden',
					boxShadow: '0 40px 100px rgba(0,0,0,0.55)',
				}}
			>
				<Img src={staticFile('pages/lost-root.jpg')} style={{width: PAGE.w, height: PH, display: 'block'}} />
				{LINES.map((y, i) => {
					const p = useIn(W('hook3', 'seven') + i * 4, 10);
					const lit = scanO * Math.max(0, 1 - Math.abs(scan - i));
					return (
						<div
							key={i}
							style={{
								position: 'absolute',
								left: 10,
								top: y * PH - 17,
								width: 34,
								height: 34,
								borderRadius: 17,
								background: C.ink,
								color: '#fff',
								fontFamily: F.sans,
								fontWeight: 800,
								fontSize: 18,
								display: 'grid',
								placeItems: 'center',
								opacity: p,
								scale: String(0.6 + 0.4 * p + 0.25 * lit),
								boxShadow: lit > 0.05 ? `0 0 0 ${6 * lit}px rgba(27,42,94,0.25)` : undefined,
							}}
						>
							{i + 1}
						</div>
					);
				})}
				{/* the student's own note, in pencil */}
				<div style={{position: 'absolute', left: PAGE.w * 0.42, top: LINES[6] * PH - 34, fontFamily: F.pen, fontWeight: 700, fontSize: 44, color: C.inkSoft, opacity: note, rotate: '-3deg'}}>
					← my answer
				</div>
			</div>

			{/* the question, in red pen */}
			<div
				style={{
					position: 'absolute',
					left: 1650,
					top: 360 + drift,
					fontFamily: F.pen,
					fontWeight: 700,
					fontSize: 220,
					lineHeight: 1,
					color: C.pen,
					opacity: q,
					scale: String(0.7 + 0.3 * q),
					rotate: '8deg',
				}}
			>
				?
			</div>
			<Label night at={L('hook3')} style={{left: PAGE.x, top: PAGE.y + PH + 34}}>
				samples/lost-root.jpg
			</Label>
		</AbsoluteFill>
	);
};
