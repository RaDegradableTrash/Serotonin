import type { RefObject, ReactElement } from 'react';
interface ShapeWavesProps {
 imageSourceRef?: RefObject<HTMLCanvasElement | null>;
 cellSize?:number;dotSize?:number;shapes?:'mixed'|'squares'|'circles'|'triangles';
 color?:string;hoverColor?:string;backgroundColor?:string;speed?:number;scale?:number;
 contrast?:number;brightness?:number;flow?:number;direction?:number;fade?:number;
 interactive?:boolean;splashRadius?:number;splashStrength?:number;glow?:number;
 intro?:boolean;introDuration?:number;paused?:boolean;className?:string;
 onError?:(error:Error)=>void;
}
export default function ShapeWaves(props:ShapeWavesProps):ReactElement;
