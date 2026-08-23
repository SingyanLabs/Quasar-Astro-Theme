import type { AstroRenderer } from 'astro';
import { type ReactVersionConfig } from './version.js';
export declare function getRenderer(reactConfig: ReactVersionConfig): AstroRenderer;
export declare function getContainerRenderer(): AstroRenderer;
