```python
import ray
from ray import tune

def training_function(config):
    for i in range(10):
        intermediate_score = i * config["factor"]
        tune.report(score=intermediate_score)

if __name__ == "__main__":
    ray.init()
    tune.run(
        training_function,
        config={"factor": tune.grid_search([0.1, 0.2, 0.3])}
    )
```