import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Badge, Card, Clip, Desk, Hl, Kicker, Label, Shot, Tag, useIn, useWin} from '../ui';
import {C, F} from '../theme';
import {L, W} from '../timeline';

const Layer: React.FC<{a: number; b?: number; children: React.ReactNode}> = ({a, b = 1e9, children}) => {
	const o = useWin(a, b, 12);
	if (o <= 0) return null;
	return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

// eval/results/repeat_lost-root.csv: run, first_error, ms
const RUNS = [
	['Run 1', 'line 5', 'read 13.3 s (cold start)'],
	['Run 2', 'line 5', 'read 3.8 s'],
	['Run 3', 'line 5', 'read 3.8 s'],
];

const RunRow: React.FC<{at: number; r: string[]}> = ({at, r}) => {
	const p = useIn(at, 14);
	return (
		<div style={{display: 'flex', alignItems: 'baseline', gap: 26, marginTop: 18, opacity: p, translate: `0 ${(1 - p) * 12}px`, fontFamily: F.sans}}>
			<div style={{width: 120, fontSize: 30, fontWeight: 600, color: C.inkSoft}}>{r[0]}</div>
			<div style={{fontSize: 44, fontWeight: 800, color: C.pen}}>{r[1]}</div>
			<div style={{fontSize: 24, color: C.pencil}}>{r[2]}</div>
		</div>
	);
};

export const Check: React.FC = () => {
	const clip1 = W('check3', 'edit');
	const clip2 = W('check3', 'fix');
	const rep = L('check4') - 6;
	const neq = useIn(W('check2', 'nine') - 2, 12);
	return (
		<AbsoluteFill>
			<Desk />
			<Kicker n="06">A PROOF YOU CAN CHECK BY HAND</Kicker>
			<Badge until={rep}>REAL APP · RUNNING LOCALLY · REAL TIME</Badge>
			<Tag top={108}>DEMO PAGE · RENDERED HANDWRITING</Tag>

			<Layer a={-20} b={L('check3') - 6}>
				<Shot src="shots/bi_result.png" keys={[[0, [0, 0, 1920, 1080]], [L('check2') - 12, [0, 0, 1920, 1080]], [W('check2', 'put') + 14, [840, 130, 1040, 585]]]}>
					<Hl at={W('check1', 'wrote')} until={L('check2') - 10} rect={[132, 311, 758, 42]} tone="pen" label="(x − 3)² WRITTEN AS x² − 9" side="bottom" />
					<Hl at={W('check2', 'put') - 2} rect={[1378, 330, 372, 108]} label="CHECK IT YOURSELF" side="bottom" />
					<div style={{position: 'absolute', left: 1440, top: 540, fontFamily: F.pen, fontWeight: 700, fontSize: 76, color: C.pen, opacity: neq, rotate: '-4deg'}}>
						−3 ≠ −9
					</div>
				</Shot>
			</Layer>

			{/* live re-check: typed in the real app; only /api/verify runs */}
			<Layer a={L('check3') - 6} b={clip2 - 4}>
				<Shot media={<Clip name="bi_recheck" at={clip1} frames={95} />} keys={[[0, [0, 0, 1920, 1080]]]}>
					<Hl at={W('check3', 'instantly') + 10} rect={[948, 164, 842, 86]} tone="pen" label="LINE 2 NOW FOLLOWS · RED MOVES TO LINE 3" side="bottom" />
				</Shot>
			</Layer>
			<Layer a={clip2 - 4} b={rep + 8}>
				<Shot media={<Clip name="bi_recheck2" at={clip2} frames={98} />} keys={[[0, [0, 0, 1920, 1080]]]}>
					<Hl at={W('check3', 'follows') - 2} rect={[950, 114, 838, 210]} tone="tick" label="EVERY STEP FOLLOWS · SYMPY, 63.6 ms" side="bottom" />
				</Shot>
			</Layer>
			{/* repeat consistency, redrawn from the CSV */}
			<Layer a={rep}>
				<AbsoluteFill style={{background: 'rgba(238,242,247,0.86)'}} />
				<Card at={rep} style={{position: 'absolute', left: 460, top: 200, width: 1000, padding: '40px 56px 46px'}}>
					<div style={{fontFamily: F.sans, fontWeight: 700, fontSize: 22, letterSpacing: '0.18em', color: C.pencil}}>THE SAME PAGE, READ 3 TIMES</div>
					<RunRow at={W('check4', 'three') - 6} r={RUNS[0]} />
					<RunRow at={W('check4', 'times')} r={RUNS[1]} />
					<RunRow at={W('check4', 'flagged') - 4} r={RUNS[2]} />
					<div style={{marginTop: 30, fontFamily: F.sans, fontWeight: 800, fontSize: 34, color: C.ink, opacity: useIn(W('check4', 'five') - 2, 12)}}>
						Same line every time. Same transcription too.
					</div>
				</Card>
				<Label at={rep + 10} style={{left: 462, top: 690}}>
					REDRAWN FROM eval/results/repeat_lost-root.csv · samples/lost-root.jpg
				</Label>
			</Layer>
		</AbsoluteFill>
	);
};
