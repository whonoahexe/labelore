#!/usr/bin/env bash
n="${1:-500}"
seq 1 "$n" > /tmp/loans.txt
tar -czf /tmp/bundle.tgz /tmp/loans.txt
sha256sum /tmp/bundle.tgz
