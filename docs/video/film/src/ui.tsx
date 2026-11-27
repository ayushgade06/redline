import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {C, F, PEN_PATH, ease, glide} from './theme';

export type Rect = [number, number, number, number];
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Standard footage box: 16:9, centred, ends above the caption band (captions sit at y≈944).
export const FBOX: Rect = [264, 128, 1392, 783];

/** 0→1 eased progress starting at `at`. */
export const useIn = (at: number, dur = 18, easing = ease) => {
	const f = useCurrentFrame();
	return interpolate(f, [at, at + dur], [0, 1], {...clamp, easing});
};

/** 0→1→0 window: fades in at `a`, out at `b`. */
export const useWin = (a: number, b = 1e9, d = 12) => {
	const f = useCurrentFrame();
	return interpolate(f, [a, a + d, b, b + d], [0, 1, 1, 0], {...clamp, easing: glide});
};

/** Desk backgrounds: graph paper (default), a ruled paper sheet, or the night desk. */
export const Desk: React.FC<{kind?: 'grid' | 'paper' | 'night'}> = ({kind = 'grid'}) => {
	if (kind === 'night') {
		return (
			<AbsoluteFill style={{background: C.night}}>
				<AbsoluteFill
					style={{
						backgroundImage: `linear-gradient(${C.nightGrid} 1px, transparent 1px), linear-gradient(90deg, ${C.nightGrid} 1px, transparent 1px)`,
						backgroundSize: '42px 42px',
					}}
				/>
				<AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 70% at 70% 40%, rgba(255,226,170,0.13), rgba(0,0,0,0) 70%)'}} />
				<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)'}} />
			</AbsoluteFill>
		);
	}
	if (kind === 'paper') {
		return (
			<AbsoluteFill style={{background: C.paper}}>
				<AbsoluteFill style={{backgroundImage: `linear-gradient(transparent 55px, ${C.rule} 56px)`, backgroundSize: '100% 56px', opacity: 0.55}} />
				<div style={{position: 'absolute', left: 84, top: 0, bottom: 0, width: 2, background: 'rgba(214,47,47,0.22)'}} />
			</AbsoluteFill>
		);
	}
	return (
		<AbsoluteFill style={{background: C.desk}}>
			<AbsoluteFill
				style={{
					backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
					backgroundSize: '42px 42px',
					backgroundPosition: '-1px -1px',
				}}
			/>
		</AbsoluteFill>
	);
};

/** Chapter label top-left, e.g. "03 — ONE CHECK, START TO FINISH". */
export const Kicker: React.FC<{n: string; children: React.ReactNode; night?: boolean; at?: number; left?: number}> = ({n, children, night, at = 4, left = 120}) => {
	const p = useIn(at, 16);
	return (
		<div
			style={{
				position: 'absolute',
				left,
				top: 56,
				fontFamily: F.sans,
				fontWeight: 700,
				fontSize: 22,
				letterSpacing: '0.18em',
				color: night ? 'rgba(238,242,247,0.7)' : C.inkSoft,
				opacity: p,
				translate: `${(1 - p) * -16}px 0`,
				display: 'flex',
				gap: 16,
				alignItems: 'center',
			}}
		>
			<span style={{color: C.pen}}>{n}</span>
			<span style={{width: 34, height: 2, background: night ? 'rgba(238,242,247,0.3)' : C.rule}} />
			<span>{children}</span>
		</div>
	);
};

/** Source / provenance tag, top-right. */
export const Tag: React.FC<{children: React.ReactNode; night?: boolean; at?: number; right?: number; top?: number}> = ({children, night, at = 8, right = 120, top = 60}) => {
	const p = useIn(at, 16);
	return (
		<div
			style={{
				position: 'absolute',
				right,
				top,
				fontFamily: F.sans,
				fontWeight: 600,
				fontSize: 17,
				letterSpacing: '0.12em',
				color: night ? 'rgba(238,242,247,0.55)' : C.pencil,
				opacity: p,
				textAlign: 'right',
			}}
		>
			{children}
		</div>
	);
};

/** "Real footage" badge. */
export const Badge: React.FC<{children: React.ReactNode; at?: number; until?: number; style?: React.CSSProperties; dot?: string}> = ({children, at = 6, until = 1e9, style, dot = C.tick}) => {
	const p = useWin(at, until);
	return (
		<div
			style={{
				position: 'absolute',
				right: 120,
				top: 50,
				fontFamily: F.sans,
				fontWeight: 700,
				fontSize: 18,
				letterSpacing: '0.12em',
				color: C.ink,
				background: '#fff',
				boxShadow: `0 0 0 1px ${C.rule}, 0 6px 18px rgba(27,42,94,0.10)`,
				padding: '9px 16px',
				borderRadius: 8,
				opacity: p,
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				...style,
			}}
		>
			<span style={{width: 10, height: 10, borderRadius: 5, background: dot}} />
			{children}
		</div>
	);
};

/** Small label under/next to footage. */
export const Label: React.FC<{children: React.ReactNode; at?: number; style?: React.CSSProperties; night?: boolean}> = ({children, at = 10, style, night}) => {
	const p = useIn(at, 16);
	return (
		<div
			style={{
				position: 'absolute',
				fontFamily: F.sans,
				fontWeight: 600,
				fontSize: 17,
				letterSpacing: '0.1em',
				color: night ? 'rgba(238,242,247,0.6)' : C.pencil,
				opacity: p,
				whiteSpace: 'nowrap',
				...style,
			}}
		>
			{children}
		</div>
	);
};

type Key = [number, Rect];
const camAt = (f: number, keys: Key[]): Rect => {
	if (f <= keys[0][0]) return keys[0][1];
	for (let i = 0; i < keys.length - 1; i++) {
		const [fa, ra] = keys[i];
		const [fb, rb] = keys[i + 1];
		if (f <= fb) {
			const t = interpolate(f, [fa, fb], [0, 1], {...clamp, easing: glide});
			return ra.map((v, j) => v + (rb[j] - v) * t) as Rect;
		}
	}
	return keys[keys.length - 1][1];
};

/**
 * Virtual camera over a source image (default 1920×1080; pass `size` for full-page captures).
 * `keys` are [frame, crop rect in source px] where the frame is the frame the camera ARRIVES there
 * (it glides from the previous key). Children are overlays in source coordinates.
 */
export const Shot: React.FC<{
	src?: string;
	size?: [number, number];
	media?: React.ReactNode;
	keys: Key[];
	box?: Rect;
	radius?: number;
	children?: React.ReactNode;
	style?: React.CSSProperties;
}> = ({src, size = [1920, 1080], media, keys, box = FBOX, radius = 16, children, style}) => {
	const f = useCurrentFrame();
	const [x, y, w, h] = camAt(f, keys);
	const [bx, by, bw, bh] = box;
	const s = Math.max(bw / w, bh / h);
	return (
		<div
			style={{
				position: 'absolute',
				left: bx,
				top: by,
				width: bw,
				height: bh,
				overflow: 'hidden',
				borderRadius: radius,
				boxShadow: `0 0 0 1px ${C.rule}, 0 30px 80px -20px rgba(27,42,94,0.35)`,
				backgroundColor: C.desk,
				...style,
			}}
		>
			<div
				style={{
					position: 'absolute',
					width: size[0],
					height: size[1],
					transformOrigin: '0 0',
					translate: `${bw / 2 - (x + w / 2) * s}px ${bh / 2 - (y + h / 2) * s}px`,
					scale: String(s),
				}}
			>
				{media ?? <Img src={staticFile(src!)} style={{width: size[0], height: size[1], display: 'block'}} />}
				{children}
			</div>
		</div>
	);
};

/** A real screen recording inside a Shot: first frame before `at`, the clip, then its last frame held. */
export const Clip: React.FC<{name: string; at: number; frames: number; trim?: number; rate?: number; hold?: string}> = ({name, at, frames, trim = 0, rate = 1, hold}) => {
	const f = useCurrentFrame();
	const len = Math.floor((frames - trim) / rate);
	const style = {position: 'absolute' as const, left: 0, top: 0, width: 1920, height: 1080, display: 'block'};
	return (
		<>
			<Img src={staticFile(f < at ? `shots/${name}_first.png` : hold ?? `shots/${name}_last.png`)} style={style} />
			<Sequence from={at} durationInFrames={len} layout="none">
				<Video src={staticFile(`clips/${name}.mp4`)} trimBefore={trim} playbackRate={rate} muted style={style} />
			</Sequence>
		</>
	);
};

const TONE: Record<string, string> = {ink: C.ink, pen: C.pen, marker: '#e0b800', tick: C.tick};

/** Highlight in source coordinates: dims everything else, draws a frame, optional caps label. */
export const Hl: React.FC<{at: number; until?: number; rect: Rect; tone?: keyof typeof TONE; label?: string; side?: 'top' | 'bottom'; dim?: number}> = ({
	at,
	until = 1e9,
	rect,
	tone = 'ink',
	label,
	side = 'top',
	dim = 0.38,
}) => {
	const f = useCurrentFrame();
	const p = interpolate(f, [at, at + 14, until, until + 12], [0, 1, 1, 0], {...clamp, easing: ease});
	if (p <= 0) return null;
	const [x, y, w, h] = rect;
	const grow = (1 - p) * 12;
	const color = TONE[tone];
	return (
		<div
			style={{
				position: 'absolute',
				left: x - 10 - grow,
				top: y - 10 - grow,
				width: w + 20 + grow * 2,
				height: h + 20 + grow * 2,
				borderRadius: 12,
				border: `4px solid ${color}`,
				opacity: p,
				boxShadow: `0 0 0 4000px rgba(14,21,48,${dim * p})`,
			}}
		>
			{label ? (
				<div
					style={{
						position: 'absolute',
						left: -4,
						[side === 'top' ? 'bottom' : 'top']: 'calc(100% + 10px)',
						background: color,
						color: tone === 'marker' ? C.ink : '#fff',
						fontFamily: F.sans,
						fontWeight: 800,
						fontSize: 24,
						letterSpacing: '0.08em',
						padding: '7px 14px',
						borderRadius: 6,
						whiteSpace: 'nowrap',
					}}
				>
					{label}
				</div>
			) : null}
		</div>
	);
};

/** The app's red pen stroke, drawn over `dur` frames from `at`. */
export const PenStroke: React.FC<{at: number; dur?: number; style?: React.CSSProperties; color?: string; width?: number}> = ({at, dur = 21, style, color = C.pen, width = 4.5}) => {
	const f = useCurrentFrame();
	const p = interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: Easing6});
	return (
		<svg viewBox="0 0 400 20" preserveAspectRatio="none" style={{position: 'absolute', overflow: 'visible', ...style}}>
			<path d={PEN_PATH} pathLength={100} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeDasharray="100 100" strokeDashoffset={100 - 100 * p} opacity={p > 0 ? 1 : 0} />
		</svg>
	);
};
// the app's own easing for the stroke: cubic-bezier(.6,.05,.3,1)
const Easing6 = Easing.bezier(0.6, 0.05, 0.3, 1);

/** A phone frame showing a 390×844 capture (1170×2532 at 3×). */
export const Phone: React.FC<{src: string; x: number; y: number; h: number; style?: React.CSSProperties}> = ({src, x, y, h, style}) => {
	const w = (h * 390) / 844;
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				width: w + 24,
				height: h + 24,
				borderRadius: 54,
				background: '#0b1022',
				padding: 12,
				boxSizing: 'border-box',
				boxShadow: '0 40px 90px -20px rgba(14,21,48,0.55), 0 0 0 2px #2a3560',
				...style,
			}}
		>
			<div style={{width: w, height: h, borderRadius: 42, overflow: 'hidden', background: C.desk}}>
				<Img src={staticFile(src)} style={{width: w, height: h, display: 'block'}} />
			</div>
		</div>
	);
};

/** Paper card used on light scenes. */
export const Card: React.FC<{children: React.ReactNode; style?: React.CSSProperties; at?: number; y?: number}> = ({children, style, at = 0, y = 26}) => {
	const p = useIn(at, 18);
	return (
		<div
			style={{
				background: '#fff',
				borderRadius: 16,
				boxShadow: `0 0 0 1px ${C.rule}, 0 24px 60px -24px rgba(27,42,94,0.28)`,
				opacity: p,
				translate: `0 ${(1 - p) * y}px`,
				boxSizing: 'border-box',
				...style,
			}}
		>
			{children}
		</div>
	);
};
