import React from 'react';
import {Composition} from 'remotion';
import {Film} from './Film';
import {TL} from './timeline';
import './theme';

export const Root: React.FC = () => (
	<Composition id="Film" component={Film} durationInFrames={TL.total} fps={TL.fps} width={1920} height={1080} defaultProps={{captions: true}} />
);
