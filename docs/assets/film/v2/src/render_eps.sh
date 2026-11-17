#!/bin/zsh
F=${0:A:h}; cd $F
for n in 1 2 3 4 5; do
  for i in 0 1; do a=$((i*4518)); b=$(((i+1)*4518)); node frames2.cjs $F/ep$n.html out-ep$n range $a $b > log-ep$n-$i.txt 2>&1 & done
done
wait
for n in 1 2 3 4 5; do echo ep$n $(ls out-ep$n | wc -l); done
echo ALLDONE
