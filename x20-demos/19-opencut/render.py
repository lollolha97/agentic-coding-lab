import json,subprocess
T=json.load(open('timeline.json'));v=T['video'];x=T['xfade'];W,H=T['size']
args=[];fc=[]
for i,c in enumerate(v):
    args+=['-i',c['src']];fc.append(f"[{i}:v]trim={c['in']}:{c['out']},setpts=PTS-STARTPTS,scale={W}:{H},fps={T['fps']},format=yuv420p,drawtext=text='{c['label']}':x=w-tw-30:y=h-60:fontsize=32:fontcolor=white:box=1:boxcolor=black@0.5[v{i}]")
prev='v0';off=0
for i in range(1,len(v)):
    off+= (v[i-1]['out']-v[i-1]['in'])-x; fc.append(f"[{prev}][v{i}]xfade=transition=fade:duration={x}:offset={off}[x{i}]");prev=f"x{i}"
t=T['text'][0];fc.append(f"[{prev}]drawtext=text='{t['text']}':x=30:y=30:fontsize=40:fontcolor=yellow:enable='between(t,{t['t0']},{t['t1']})'[vo]")
a=T['audio'][0];args+=['-i',a['src']];fc.append(f"[{len(v)}:a]volume={a['gain']},apad[ao]")
subprocess.run(['ffmpeg','-v','error','-y',*args,'-filter_complex',';'.join(fc),'-map','[vo]','-map','[ao]','-shortest','-c:v','libx264','-preset','veryfast','-c:a','aac','timeline-edit.mp4'],check=True)
