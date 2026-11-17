#!/bin/zsh
F=${0:A:h}; cd $F
for n in 1 2; do
  N=$(python3 -c "import json,math;print(math.ceil(json.load(open('timeline-bench$n.json'))['duration']*30))")
  for i in 0 1 2; do a=$((i*N/3)); b=$(((i+1)*N/3)); [ $i -eq 2 ] && b=$N; node frames2.cjs $F/bench$n.html out-bench$n range $a $b > log-bench$n-$i.txt 2>&1 & done
done
python3 music3.py timeline-bench1.json music-bench1.wav > log-music1.txt 2>&1 &
python3 music3.py timeline-bench2.json music-bench2.wav > log-music2.txt 2>&1 &
wait
for n in 1 2; do echo bench$n $(ls out-bench$n | wc -l); done
echo ALLDONE
