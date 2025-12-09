```python
import random
import logging

def run_ab_test():
    try:
        # Simulate A/B testing setup
        group_a, group_b = [], []

        for _ in range(100):
            if random.random() > 0.5:
                group_a.append(random.random())
            else:
                group_b.append(random.random())

        # Analyze results
        a_avg = sum(group_a) / len(group_a)
        b_avg = sum(group_b) / len(group_b)
        
        logging.info(f'Group A Avg: {a_avg}, Group B Avg: {b_avg}')
    except Exception as e:
        logging.error(f"Error running A/B test: {e}")

run_ab_test()
```