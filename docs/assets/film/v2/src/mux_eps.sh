#!/bin/zsh
F=${0:A:h}; cd $F
names=(x where-do-i-start chasing-the-wrong-leads outreach-that-gets-ignored meetings-that-slip managing-blind)
for n in 1 2 3 4 5; do
  ffmpeg -loglevel error -y -i music-ep$n.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 44100 music-ep$n-n.wav
  ffmpeg -loglevel error -y -framerate 30 -i out-ep$n/f%05d.jpg -i music-ep$n-n.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 256k -shortest ep$n-${names[$((n+1))]}-1080p.mp4
  ffmpeg -loglevel error -y -i ep$n-${names[$((n+1))]}-1080p.mp4 -vf scale=1280:720:flags=lanczos -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k ep$n-${names[$((n+1))]}-720p.mp4
  ffmpeg -loglevel error -y -ss 34 -i ep$n-${names[$((n+1))]}-1080p.mp4 -frames:v 1 -q:v 3 ep$n-thumb.jpg
done
ls -la ep*-*p.mp4 | awk '{print $5/1e6 "MB", $9}'
