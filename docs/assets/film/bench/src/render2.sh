#!/bin/zsh
F=${0:A:h}; cd $F
N=$(python3 -c "import json,math;print(math.ceil(json.load(open('timeline-bench2.json'))['duration']*30))")
for i in 0 1 2 3; do a=$((i*N/4)); b=$(((i+1)*N/4)); [ $i -eq 3 ] && b=$N; node frames2.cjs $F/bench2.html out-bench2b range $a $b > log-bench2b-$i.txt 2>&1 & done
python3 music3.py timeline-bench2.json music-bench2b.wav > log-music2b.txt 2>&1 &
wait
echo frames $(ls out-bench2b | wc -l)
ffmpeg -loglevel error -y -i music-bench2b.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 44100 music-bench2b-n.wav
ffmpeg -loglevel error -y -framerate 30 -i out-bench2b/f%05d.jpg -i music-bench2b-n.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 256k -shortest sales-harness-bench-2-how-1080p.mp4
ffmpeg -loglevel error -y -i sales-harness-bench-2-how-1080p.mp4 -vf scale=1280:720:flags=lanczos -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k sales-harness-bench-2-how-720p.mp4
ffmpeg -loglevel error -y -ss 34 -i sales-harness-bench-2-how-1080p.mp4 -frames:v 1 -q:v 3 bench2-thumb.jpg
ls -la sales-harness-bench-2-how-*.mp4
echo ALLDONE
