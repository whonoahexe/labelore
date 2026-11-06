#!/usr/bin/env bash
echo "run,ms" > out/latency.csv
for i in $(seq 1 "${1:-20}"); do
  curl -s -o /dev/null -w "$i,%{time_total}\n" http://kiosk.local/lookup >> out/latency.csv
done
