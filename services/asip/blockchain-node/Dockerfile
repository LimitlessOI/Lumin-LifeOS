```dockerfile
# Use the official Hyperledger Besu image
FROM hyperledger/besu:latest

# Set environment variables for network configuration
ENV BESU_NETWORK=mainnet
ENV BESU_DATA_PATH=/var/lib/besu

# Expose necessary ports
EXPOSE 8545 8546 30303 30303/udp

# Create data directory
RUN mkdir -p ${BESU_DATA_PATH}

# Copy configuration files
COPY config /etc/besu

# Set entrypoint to start the Besu node
ENTRYPOINT ["besu", "--config-file=/etc/besu/besu-config.toml"]
```