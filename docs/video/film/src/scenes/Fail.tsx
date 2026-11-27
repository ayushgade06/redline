import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Badge, Clip, Desk, Hl, Kicker, Label, Shot, Tag, useWin} from '../ui';
import {C} from '../theme';
import {L, W} from '../timeline';

const Layer: React.FC<{a: number; b?: number; children: React.ReactNode}> = ({a, b = 1e9, children}) => {
	const o = useWin(a, b, 12);
	if (o <= 0) return null;
	return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const Fail: React.FC = () => {
	const typing = W('fail3', 'type');
	const typed = W('fail3', 'every') - 4;
	const inj = L('fail4') - 6;
	// fail_typing.mp4: the first 4.5 s of the real typing run (later frames jump as the page grows), at 1.5×
	const clipLen = Math.floor(135 / 1.5);
	return (
		<AbsoluteFill>
			<Desk />
			<Kicker n="07">WHEN THINGS FAIL</Kicker>
			<Badge until={inj - 4} dot={C.pen}>
				REAL RUN · LLM_TIMEOUT=0.5
			</Badge>
			<Badge at={inj + 8}>REAL APP · RUNNING LOCALLY · REAL TIME</Badge>
			<Tag top={108}>DEMO PAGE · RENDERED HANDWRITING</Tag>

			<Layer a={-20} b={L('fail3') - 4}>
				<Shot src="shots/fail_panel.png" keys={[[0, [0, 0, 1920, 1080]], [L('fail2') - 4, [860, 96, 1040, 585]]]}>
					<Hl at={W('fail1', 'failure')} until={L('fail2') - 10} rect={[1028, 200, 488, 52]} tone="pen" label="A REAL TIMEOUT, NOT A MOCK" />
					<Hl at={W('fail2', 'sonnet') - 2} until={W('fail2', 'plainly') - 8} rect={[1030, 382, 690, 60]} label="SONNET ×2, THEN HAIKU · ALL TIMED OUT" side="bottom" />
					<Hl at={W('fail2', 'plainly') - 4} rect={[1030, 460, 712, 62]} label="THE MATHS CHECK DOESN'T NEED THE AI" side="bottom" />
				</Shot>
			</Layer>

			<Layer a={L('fail3') - 4} b={typed}>
				<Shot media={<Clip name="fail_typing" at={typing} frames={135} rate={1.5} hold="shots/fail_typing_45.png" />} keys={[[0, [0, 0, 1920, 1080]]]} />
				<Badge at={typing} until={typing + clipLen} style={{top: 140}} dot={C.marker}>
					1.5× SPEED
				</Badge>
			</Layer>

			{/* the typed lines, verified: two crops of the same real result page */}
			<Layer a={typed} b={inj}>
				<Shot src="shots/fail_result_full.png" size={[1920, 2383]} box={[264, 190, 1392, 140]} keys={[[0, [940, 160, 870, 88]]]} radius={12} />
				<Shot src="shots/fail_result_full.png" size={[1920, 2383]} box={[264, 420, 1392, 300]} keys={[[0, [930, 2040, 880, 190]]]}>
					<Hl at={typed + 10} rect={[1388, 2094, 310, 36]} tone="tick" label="TYPED LINES · NO AI USED" dim={0.15} />
				</Shot>
				<Label at={typed + 4} style={{left: 266, top: 750}}>
					SAME APP, AFTER TYPING THE 7 LINES · CHECKED BY SYMPY ONLY
				</Label>
			</Layer>

			<Layer a={inj}>
				<Shot src="shots/inj_result.png" keys={[[inj, [0, 0, 1920, 1080]], [W('fail4', 'ignore') + 10, [60, 90, 1780, 1001]]]}>
					<Hl at={W('fail4', 'ignore') - 2} until={W('fail4', 'line') - 8} rect={[950, 168, 838, 184]} label="SHOWN AS TEXT, NOT OBEYED" side="bottom" />
					<Hl at={W('fail4', 'line') - 2} rect={[132, 507, 758, 42]} tone="pen" label="LINE 2 · STILL WRONG" side="bottom" />
				</Shot>
			</Layer>
		</AbsoluteFill>
	);
};
