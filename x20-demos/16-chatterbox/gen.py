import os,time,torch,torchaudio as ta
from chatterbox.tts import ChatterboxTTS
lines=["Welcome to the motion library tour, part two.","Every clip you see was rendered locally on a CPU box, with no paid services.","Thanks for watching, and see you in the final cut."]
torch.set_num_threads(6)
t=time.time();m=ChatterboxTTS.from_pretrained(device="cpu");print("loaded",time.time()-t,flush=True)
for i,l in enumerate(lines):
    out=f"seg{i:02d}.wav"
    if os.path.exists(out): print("skip",out);continue
    t=time.time();w=m.generate(l);ta.save(out+".tmp.wav",w,m.sr);os.rename(out+".tmp.wav",out);print("done",out,time.time()-t,flush=True)
print("ALL_DONE")
