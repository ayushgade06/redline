import {Easing, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';

// Redline's own identity, taken from frontend/src/index.css and the app's fonts.
export const BRAND = {
	name: 'Redline',
	url: 'redline-maths.vercel.app',
	repo: 'github.com/ayushgade06/redline',
};

loadFont({family: 'Schibsted', url: staticFile('fonts/SchibstedGrotesk.ttf'), weight: '400 900'});
loadFont({family: 'Caveat', url: staticFile('fonts/Caveat.ttf'), weight: '400 700'});

export const C = {
	desk: '#eef2f7', // graph-paper blue-grey desk
	grid: '#dce4ee',
	paper: '#fbfcfe',
	ink: '#1b2a5e', // ballpoint navy
	inkSoft: '#3d4a76',
	pencil: '#6b7488',
	rule: '#d5dce8',
	pen: '#d62f2f', // red pen: errors only
	penSoft: '#fdecec',
	marker: '#ffe45c', // highlighter: unsure lines only
	markerInk: '#5c4a00',
	tick: '#2e7d5b',
	tickSoft: '#e6f3ec',
	night: '#0e1530', // the night-before-the-test desk (hook + close)
	nightGrid: 'rgba(220,228,238,0.05)',
	nightText: '#eef2f7',
};

export const F = {
	sans: 'Schibsted, "Segoe UI", sans-serif',
	pen: 'Caveat, "Segoe Print", cursive',
};

// one easing family across the film
export const ease = Easing.bezier(0.16, 1, 0.3, 1); // entrances
export const glide = Easing.bezier(0.65, 0, 0.35, 1); // camera moves

// The app's own pen-stroke path (frontend Workspace.jsx / Capture.jsx)
export const PEN_PATH = 'M4 12 C 80 5, 160 16, 240 9 S 360 6, 396 11';
