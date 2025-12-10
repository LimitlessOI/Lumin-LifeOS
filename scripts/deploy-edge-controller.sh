```bash
#!/bin/bash

# Script to deploy edge controllers on Raspberry Pi/Arduino

echo "Starting deployment of edge controllers..."

# Example commands for deployment
ssh pi@raspberrypi.local 'sudo apt-get update && sudo apt-get upgrade -y'
scp ./controller.js pi@raspberrypi.local:/home/pi/controllers/
ssh pi@raspberrypi.local 'node /home/pi/controllers/controller.js'

echo "Deployment completed successfully."
```