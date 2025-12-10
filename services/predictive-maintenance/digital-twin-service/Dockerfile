```dockerfile
# Use a base image for simulations
FROM ubuntu:20.04

# Install essential simulation tools
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /simulation

# Copy simulation scripts
COPY . /simulation

# Command to run the simulation
CMD ["./run_simulation.sh"]
```