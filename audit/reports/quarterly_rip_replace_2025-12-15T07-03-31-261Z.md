# Quarterly Rip-and-Replace Audit
- id: quarterly_rip_replace_2025-12-15T07-03-31-261Z
- timestamp: 2025-12-15T07:03:31.262Z

## Current Models
- ollama_llama (role: general, cost: free)
- ollama_deepseek_coder_v2 (role: code, cost: free)
- openai_gpt4o (role: oversight, cost: paid)

## Cost Hotspots
- oversight: openai_gpt4o (est: 120)

## Latency Hotspots
- long_context: openai_gpt4o (p95: 9000 ms)

## Open-Source Alternatives
- replace openai_gpt4o -> ollama_llama_3_3_70b (Use locally when oversight is non-critical.)

## Mandatory Justifications for NOT Switching
- openai_gpt4o: Needed for edge cases; keeping until local eval matches parity.