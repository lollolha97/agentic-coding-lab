import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
const font = 'Pretendard, "Noto Sans KR", sans-serif';
const Bars: React.FC = () => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const vals = [0.45, 0.8, 0.6, 0.95, 0.7];
  return <div style={{position:'absolute',right:200,bottom:200,display:'flex',gap:28,alignItems:'flex-end',height:460}}>
    {vals.map((v,i)=>{const s=spring({frame:f-i*5,fps,config:{damping:12}});
      return <div key={i} style={{width:90,height:460*v*s,borderRadius:20,background:i%2?'#e8455f':'#ff7a3d'}}/>;})}
  </div>;
};
export const Demo: React.FC = () => {
  const f = useCurrentFrame(); const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame:f, fps, config:{damping:200}});
  const out = interpolate(f,[durationInFrames-20,durationInFrames],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const counter = Math.round(interpolate(f,[20,110],[0,180],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}));
  return <AbsoluteFill style={{background:'radial-gradient(1200px 700px at 70% 40%,#3a2216,#17110d 70%)',fontFamily:font,color:'#f6ece2',opacity:out}}>
    <div style={{position:'absolute',left:160,top:150,fontSize:34,fontWeight:600,letterSpacing:'.08em',color:'#ff7a3d',opacity:enter}}>01 · REMOTION</div>
    <div style={{position:'absolute',left:160,top:230,fontSize:150,fontWeight:800,letterSpacing:'-.04em',transform:`translateY(${(1-enter)*80}px)`,opacity:enter}}>React로 영상</div>
    <Sequence from={25}>
      <div style={{position:'absolute',left:164,top:420,fontSize:44,opacity:.8}}>useCurrentFrame · spring · Sequence → MP4</div>
    </Sequence>
    <div style={{position:'absolute',left:160,bottom:180,fontSize:200,fontWeight:800,color:'#ffc15e',fontVariantNumeric:'tabular-nums'}}>{counter}<span style={{fontSize:60,color:'#b9a89a'}}> 프레임</span></div>
    <Sequence from={40}><Bars/></Sequence>
  </AbsoluteFill>;
};
