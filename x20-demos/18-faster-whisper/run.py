import os,time
from faster_whisper import WhisperModel
if os.path.exists('dub_en.srt'): print('skip');raise SystemExit
t=time.time();m=WhisperModel('small',device='cpu',compute_type='int8',download_root='models')
import subprocess,numpy as np
raw=subprocess.run(['ffmpeg','-v','error','-i','../16-chatterbox/dub_en.wav','-ac','1','-ar','16000','-f','f32le','-'],capture_output=True).stdout
segs,info=m.transcribe(np.frombuffer(raw,np.float32),language='en',word_timestamps=False)
f=lambda s:'%02d:%02d:%02d,%03d'%(s//3600,s%3600//60,s%60,(s%1)*1000)
out=''.join(f"{i+1}\n{f(s.start)} --> {f(s.end)}\n{s.text.strip()}\n\n" for i,s in enumerate(segs))
open('dub_en.srt.tmp','w').write(out);os.rename('dub_en.srt.tmp','dub_en.srt');print(out,'secs',time.time()-t)
