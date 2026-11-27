import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Badge, Clip, Desk, FBOX, Hl, Kicker, Label, Phone, Shot, Tag, useIn, useWin} from '../ui';
import {L, W} from '../timeline';

/** A layer that crossfades in at `a` and out at `b`. */
const Layer: React.FC<{a: number; b?: number; children: React.ReactNode}> = ({a, b = 1e9, children}) => {
	const o = useWin(a, b, 12);
	if (o <= 0) return null;
	return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

const HERO_BOX: [number, number, number, number] = [110, 150, 1240, 698];

export const Flow: React.FC = () => {
	const reads = W('flow1', 'reads') - 6;
	const confirm = W('flow2', 'confirm') - 6;
	const check = W('flow3', 'check');
	const res = L('flow4') - 2;
	const hints = L('flow7') - 8;
	const hindi = L('flow10') - 6;
	const blurA = W('flow2', 'anything') - 4;
	const phone = useIn(W('flow1', 'photograph') - 8, 20);
	const phoneOut = useWin(0, reads - 4, 12);

	return (
		<AbsoluteFill>
			<Desk />
			<Kicker n="03">ONE CHECK, START TO FINISH</Kicker>
			<Badge>REAL APP · RUNNING LOCALLY · REAL TIME</Badge>
			<Tag top={108}>DEMO PAGE · RENDERED HANDWRITING</Tag>

			{/* 1 · the landing page: the app's own pen stroke animating on the demo page */}
			<Layer a={-20} b={reads}>
				<Shot box={HERO_BOX} media={<Clip name="hero" at={8} frames={38} trim={3} />} keys={[[30, [0, 0, 1920, 1080]], [reads, [880, 110, 980, 551]]]} />
				<div style={{opacity: phone * phoneOut, translate: `${(1 - phone) * 60}px 0`}}>
					<Phone src="shots/m_hero.png" x={1450} y={128} h={720} />
					<Label at={W('flow1', 'photograph')} style={{left: 1452, top: 884}}>
						PHONE · 390 PX
					</Label>
				</div>
			</Layer>

			{/* 2 · reading, then confirm what was read */}
			<Layer a={reads} b={confirm}>
				<Shot src="shots/lr_reading.png" keys={[[reads, [0, 0, 1920, 1080]], [confirm, [60, 40, 1800, 1013]]]} />
			</Layer>
			<Layer a={confirm} b={check}>
				<Shot src="shots/lr_confirm.png" keys={[[confirm, [60, 40, 1800, 1013]], [check, [0, 0, 1920, 1080]]]}>
					<Hl at={W('flow2', 'confirm')} until={blurA - 6} rect={[948, 168, 560, 54]} label="CHECK WHAT WE READ" />
				</Shot>
			</Layer>
			{/* cut-in: a different demo page, blurred on purpose: the real confidence gate */}
			<Layer a={blurA} b={L('flow3') - 4}>
				<AbsoluteFill style={{background: 'rgba(14,21,48,0.45)'}} />
				<Shot src="shots/blur_confirm.png" box={[400, 200, 1120, 630]} keys={[[blurA, [0, 0, 1920, 1080]], [L('flow3'), [80, 60, 1800, 1013]]]}>
					<Hl at={W('flow2', 'highlighted') - 12} rect={[1025, 518, 640, 236]} tone="marker" label="UNSURE · 60% AND 55% CONFIDENT" dim={0.2} />
				</Shot>
				<Label at={blurA + 4} style={{left: 400, top: 146, color: '#fff', fontSize: 20, background: '#0e1530', padding: '8px 14px', borderRadius: 6}}>
					ANOTHER DEMO PAGE, BLURRED ON PURPOSE · REAL RUN
				</Label>
			</Layer>

			{/* 3 · "Check my work": the real click and the app's own red pen stroke */}
			<Layer a={check - 2} b={res + 10}>
				<Shot media={<Clip name="lr_check" at={check} frames={41} />} keys={[[0, [0, 0, 1920, 1080]]]} />
			</Layer>

			{/* 4–6 · the verdict, the engine's receipt, the photo link: one camera over the full page */}
			<Layer a={res} b={hints}>
				<Shot
					src="shots/lr_result_full.png"
					size={[1920, 1894]}
					keys={[
						[res, [0, 0, 1920, 1080]],
						[W('flow4', 'line'), [0, 0, 1920, 1080]],
						[W('flow4', 'solutions'), [840, 110, 1040, 585]],
						[L('flow5') + 2, [840, 110, 1040, 585]],
						[L('flow5') + 40, [840, 1300, 1040, 585]],
						[W('flow5', 'dividing') - 4, [840, 1300, 1040, 585]],
						[W('flow5', 'dividing') + 24, [840, 110, 1040, 585]],
						[L('flow6') - 8, [840, 110, 1040, 585]],
						[L('flow6') + 22, [60, 330, 1040, 585]],
					]}
				>
					<Hl at={W('flow4', 'line')} until={W('flow4', 'solutions') - 8} rect={[948, 166, 842, 86]} tone="pen" label="THE FIRST WRONG LINE" side="bottom" />
					<Hl at={W('flow4', 'solutions')} until={L('flow5') + 6} rect={[1370, 286, 420, 118]} tone="pen" label="{1, 2} → {1}" side="bottom" />
					<Hl at={L('flow5') + 36} until={W('flow5', 'dividing') - 8} rect={[944, 1572, 404, 92]} label="SYMPY DECIDES · NO AI" />
					<Hl at={W('flow5', 'dividing') + 22} until={E6()} rect={[980, 426, 780, 76]} label="WHY: DIVIDED BY (x − 2)" side="bottom" />
					<Hl at={W('flow6', 'red') - 2} rect={[132, 602, 758, 52]} tone="pen" label="LINE 5 · ON YOUR PHOTO" side="bottom" />
				</Shot>
			</Layer>

			{/* 7–8 · the hint ladder */}
			<Layer a={hints} b={hindi}>
				<Shot
					src="shots/lr_hints_full.png"
					size={[1920, 2455]}
					keys={[
						[hints, [840, 520, 1100, 619]],
						[L('flow8') - 6, [840, 520, 1100, 619]],
						[L('flow8') + 20, [840, 790, 1100, 619]],
					]}
				>
					<Hl at={W('flow7', 'nudge') - 8} until={L('flow8') - 4} rect={[948, 640, 838, 192]} label="1 · A NUDGE" side="bottom" />
					<Hl at={W('flow8', 'rule') - 4} until={W('flow8', 'only') - 8} rect={[948, 848, 838, 228]} label="2 · THE RULE" side="bottom" />
					<Hl at={W('flow8', 'only') - 2} rect={[948, 1093, 838, 190]} label="3 · FROM THE MATHS ENGINE" />
				</Shot>
			</Layer>

			{/* 9 · guarded hints, in Hindi too (a second real pass on the same page) */}
			<Layer a={hindi}>
				<Shot src="shots/lr_hint1_hi.png" keys={[[hindi, [820, 380, 1100, 619]]]}>
					<Hl at={W('flow10', 'checked') - 4} until={W('flow10', 'hindi') - 10} rect={[1018, 744, 648, 34]} label="CHECKED: CAN'T REVEAL THE ANSWER" side="bottom" />
					<Hl at={W('flow10', 'hindi') - 4} rect={[950, 574, 838, 222]} label="हिंदी · A REAL AI HINT" />
				</Shot>
			</Layer>
		</AbsoluteFill>
	);
};

// end of the "why" highlight: just before the camera leaves the card for the photo
const E6 = () => L('flow6') - 6;
