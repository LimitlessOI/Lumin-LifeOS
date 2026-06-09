# Determinism Test Protocol

Use the exact intended coder model tier.

Steps:

1. run the same machine packet in at least two fresh sessions
2. keep repo state constant
3. compare produced file sets
4. compare file contents
5. if outputs differ materially, BPB failed

Do not use stronger models to certify weaker execution models.
