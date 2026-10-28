import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useTrail,useSpring,animated,config} from '@react-spring/web';
const words=['스프링','물리','기반','UI'];
function App(){
  const [on,setOn]=useState(false);
  useEffect(()=>{const id=setInterval(()=>setOn(v=>!v),1600);setOn(true);return()=>clearInterval(id)},[]);
  const trail=useTrail(words.length,{config:config.wobbly,opacity:on?1:.15,y:on?0:80,scale:on?1:.6});
  const ball=useSpring({x:on?520:0,rotate:on?180:0,config:{tension:170,friction:9}});
  return <div style={{position:'absolute',left:'50%',top:'55%',transform:'translate(-50%,-50%)',width:720}}>
    <div style={{display:'flex',gap:18,marginBottom:60}}>{trail.map((s,i)=><animated.div key={i} style={{...s,transform:s.y.to((y)=>`translateY(${y}px)`),fontSize:72,fontWeight:800,letterSpacing:'-.03em',color:i%2?'#ffc15e':'#f6ece2'}}>{words[i]}</animated.div>)}</div>
    <div style={{height:200,position:'relative',borderTop:'2px solid #ffffff22'}}>
      <animated.div style={{position:'absolute',top:24,width:150,height:150,borderRadius:36,background:'linear-gradient(135deg,#ff7a3d,#e8455f)',transform:ball.x.to(x=>`translateX(${x}px)`),rotate:ball.rotate}}/>
    </div></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
