set -e
# 1) normalize + trim each clip (encode)
i=0; : > list.txt
for c in "clips/11-ogl.mp4 0 3" "clips/14-gl-transitions.mp4 0 4" "clips/13-gltf-transform.mp4 0 2" "../15-obs-studio/screen-record.mp4 1 2"; do set -- $c
 ffmpeg -v error -y -ss $2 -t $3 -i $1 -vf "scale=1280:720,fps=30,format=yuv420p" -an -c:v libx264 -preset veryfast -crf 23 part$i.mp4; echo "file 'part$i.mp4'" >> list.txt; i=$((i+1)); done
# 2) concat demuxer
ffmpeg -v error -y -f concat -safe 0 -i list.txt -c copy concat.mp4
# 3) burn subtitles (18) + mix dub (16) and Tone.js SFX (17)
ffmpeg -v error -y -i concat.mp4 -i ../16-chatterbox/dub_en.wav -i ../17-tonejs/tone-sfx.wav \
 -filter_complex "[0:v]subtitles=../18-faster-whisper/dub_en.srt:force_style='FontSize=22,Outline=2'[v];[2:a]volume=0.25[s];[1:a][s]amix=inputs=2:duration=first:normalize=0,apad[a]" \
 -map "[v]" -map "[a]" -shortest -c:v libx264 -preset medium -crf 22 -c:a aac -b:a 160k -movflags +faststart final-11-20.mp4
