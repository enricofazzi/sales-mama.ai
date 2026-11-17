#!/bin/zsh
F=${0:A:h}; cd $F
run() { local cut=$1 n=$2 total=$3; local step=$(( (total + n - 1) / n )); for i in $(seq 0 $((n-1))); do node frames2.cjs $F/film-$cut.html out-$cut range $((i*step)) $(((i+1)*step)) > log-$cut-$i.txt 2>&1 & done; }
run short 4 3636
run long 8 9035
wait
echo ALLDONE; ls out-short | wc -l; ls out-long | wc -l
