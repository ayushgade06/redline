import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Desk, Kicker, Tag, clamp, useIn} from '../ui';
import {C, F, ease} from '../theme';
import {L, W} from '../timeline';

// Every number here is from eval/RESULTS.md §1–2 and eval/results/set_inj.csv.
const ROW_Y = [168, 418, 668];
const ROW_H = 226;
const COL = {claim: [110, 400], ev: [540, 880], ver: [1450, 360]} as const;

const Row: React.FC<{i: number; at: number; next?: number; claim: string; children: React.ReactNode; verdict: React.ReactNode; vAt: number}> = ({i, at, next = 1e9, claim, children, verdict, vAt}) => {
	const f = useCurrentFrame();
	const p = useIn(at, 18);
	const dim = interpolate(f, [next, next + 14], [1, 0.42], {...clamp, easing: ease});
	const v = interpolate(f, [vAt, vAt + 10], [0, 1], {...clamp, easing: ease});
	const y = ROW_Y[i];
	return (
		<div style={{position: 'absolute', left: 0, top: y, width: 1920, height: ROW_H, opacity: p * dim, translate: `0 ${(1 - p) * 24}px`}}>
			<div style={{position: 'absolute', left: COL.claim[0], top: 0, width: COL.claim[1], height: ROW_H, display: 'flex', alignItems: 'center', fontFamily: F.sans, fontWeight: 800, fontSize: 40, lineHeight: 1.12, letterSpacing: '-0.01em', color: C.ink}}>
				{claim}
			</div>
			<div style={{position: 'absolute', left: COL.claim[0] + COL.claim[1] + 6, top: ROW_H / 2 - 20, fontSize: 40, color: C.pencil}}>→</div>
			<div style={{position: 'absolute', left: COL.ev[0], top: 0, width: COL.ev[1], height: ROW_H, boxSizing: 'border-box', padding: '22px 30px', background: '#fff', borderRadius: 16, boxShadow: `0 0 0 1px ${C.rule}, 0 18px 40px -24px rgba(27,42,94,0.3)`}}>
				{children}
			</div>
			<div style={{position: 'absolute', left: COL.ev[0] + COL.ev[1] + 6, top: ROW_H / 2 - 20, fontSize: 40, color: C.pencil, opacity: v}}>→</div>
			<div
				style={{
					position: 'absolute',
					left: COL.ver[0],
					top: 28,
					width: COL.ver[1],
					height: ROW_H - 56,
					boxSizing: 'border-box',
					border: `4px solid ${C.ink}`,
					borderRadius: 14,
					padding: '18px 22px',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					fontFamily: F.sans,
					color: C.ink,
					opacity: v,
					scale: String(1.25 - 0.25 * v),
					rotate: '-2deg',
					background: C.paper,
				}}
			>
				{verdict}
			</div>
		</div>
	);
};

const Bar: React.FC<{at: number; label: string; value: string; strong?: boolean}> = ({at, label, value, strong}) => {
	const f = useCurrentFrame();
	const p = interpolate(f, [at, at + 22], [0, 1], {...clamp, easing: ease});
	return (
		<div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, fontFamily: F.sans, opacity: Math.min(1, p * 3)}}>
			<div style={{width: 300, fontSize: 23, fontWeight: strong ? 800 : 600, color: strong ? C.ink : C.inkSoft, whiteSpace: 'nowrap'}}>{label}</div>
			<div style={{flex: 1, height: 22, borderRadius: 11, background: '#e8ecf5'}}>
				<div style={{width: `${p * 100}%`, height: 22, borderRadius: 11, background: strong ? C.ink : C.pencil}} />
			</div>
			<div style={{width: 80, fontSize: 24, fontWeight: 800, color: C.ink}}>{value}</div>
		</div>
	);
};

const Fact: React.FC<{at: number; big: string; small: string}> = ({at, big, small}) => {
	const p = useIn(at, 14);
	return (
		<div style={{opacity: p, translate: `0 ${(1 - p) * 10}px`, fontFamily: F.sans}}>
			<div style={{fontWeight: 800, fontSize: 38, color: C.ink, letterSpacing: '-0.01em'}}>{big}</div>
			<div style={{fontSize: 20, color: C.inkSoft, marginTop: 2}}>{small}</div>
		</div>
	);
};

const Dots: React.FC<{at: number; n: number; bad: number; label: string}> = ({at, n, bad, label}) => {
	const f = useCurrentFrame();
	return (
		<div style={{fontFamily: F.sans}}>
			<div style={{fontSize: 22, fontWeight: 700, color: C.inkSoft}}>{label}</div>
			<div style={{display: 'flex', gap: 7, marginTop: 10}}>
				{Array.from({length: n}).map((_, k) => {
					const p = interpolate(f, [at + k * 1.2, at + k * 1.2 + 6], [0, 1], clamp);
					const isBad = k < bad;
					return (
						<div
							key={k}
							style={{
								width: 30,
								height: 30,
								borderRadius: 15,
								background: isBad ? C.pen : C.ink,
								opacity: p,
								scale: String(0.5 + 0.5 * p),
								color: '#fff',
								fontSize: 18,
								fontWeight: 800,
								display: 'grid',
								placeItems: 'center',
							}}
						>
							{isBad ? '✗' : '✓'}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export const Proof: React.FC = () => {
	const r2 = W('proof4', 'our') - 4;
	const r3 = L('proof5') - 4;
	return (
		<AbsoluteFill>
			<Desk />
			<Kicker n="05">CLAIM → EVIDENCE → VERDICT</Kicker>
			<Tag>eval/RESULTS.md §1–2 · eval/results/set_inj.csv</Tag>
			<div style={{position: 'absolute', left: 0, top: 118, width: 1920, fontFamily: F.sans, fontWeight: 700, fontSize: 18, letterSpacing: '0.18em', color: C.pencil, opacity: useIn(6, 14)}}>
				<span style={{position: 'absolute', left: COL.claim[0]}}>CLAIM</span>
				<span style={{position: 'absolute', left: COL.ev[0]}}>EVIDENCE</span>
				<span style={{position: 'absolute', left: COL.ver[0]}}>VERDICT</span>
			</div>

			<Row
				i={0}
				at={L('proof2')}
				next={r2}
				claim="Finds the first wrong line"
				vAt={W('proof3', 'edge') - 4}
				verdict={
					<>
						<div style={{fontWeight: 900, fontSize: 46, letterSpacing: '0.02em'}}>TIE</div>
						<div style={{fontSize: 23, fontWeight: 600, marginTop: 4, lineHeight: 1.25}}>Accuracy is not our edge.</div>
					</>
				}
			>
				<div style={{fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.inkSoft}}>254 typed derivations · first-error exact · 0 false alarms</div>
				<Bar at={W('proof2', 'sim-pie') - 4} label="Redline (SymPy)" value="100%" strong />
				<Bar at={W('proof3', 'well-prompted')} label="AI-only · Sonnet 5.5" value="100%" />
				<Bar at={W('proof3', 'checker')} label="AI-only · Haiku 5.5" value="100%" />
			</Row>

			<Row
				i={1}
				at={r2}
				next={r3}
				claim="What Redline adds"
				vAt={W('proof4', 'free') + 2}
				verdict={
					<div style={{fontWeight: 900, fontSize: 30, lineHeight: 1.2, letterSpacing: '0.02em'}}>
						PROOF.
						<br />
						REPEATABLE.
						<br />
						FREE RE-CHECKS.
					</div>
				}
			>
				<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 14, columnGap: 30}}>
					<Fact at={W('proof4', 'proof') - 4} big="149 / 149" small="errors with a hand-checkable proof" />
					<Fact at={W('proof4', 'same') - 4} big="Same answer" small="every time, by construction" />
					<Fact at={W('proof4', 'forty') - 4} big="35 ms vs 1.4–2.2 s" small="median, set A · about 40× faster" />
					<Fact at={W('proof4', 'free') - 4} big="$0 per re-check" small="vs $0.00013–$0.0026 per AI check" />
				</div>
			</Row>

			<Row
				i={2}
				at={r3}
				claim="Points at the right line on your photo"
				vAt={W('proof5', 'twenty') + 4}
				verdict={<div style={{fontWeight: 900, fontSize: 30, lineHeight: 1.2, letterSpacing: '0.02em'}}>LINE NUMBERS MATCH YOUR PAGE.</div>}
			>
				<Dots at={W('proof5', 'checker')} n={16} bad={9} label="AI-only on 16 pages with injected text: wrong line number on 9" />
				<div style={{height: 16}} />
				<Dots at={W('proof5', 'redline')} n={20} bad={0} label="Redline on all 20 pages: exact" />
			</Row>

			<div style={{position: 'absolute', left: 110, top: 908, fontFamily: F.sans, fontSize: 17, color: C.pencil, opacity: useIn(L('proof2') + 20, 16)}}>
				Synthetic sets, ground truth known by construction. AI-only = the same Claude model asked to find the first wrong line, task stated, default effort.
			</div>
		</AbsoluteFill>
	);
};
