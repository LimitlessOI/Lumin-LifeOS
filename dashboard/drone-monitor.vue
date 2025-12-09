```vue
<template>
    <div id="drone-monitor">
        <h1>Drone Monitoring Dashboard</h1>
        <ul>
            <li v-for="drone in drones" :key="drone.id">
                {{ drone.model }} - {{ drone.status }}
            </li>
        </ul>
    </div>
</template>

<script>
import io from 'socket.io-client';

export default {
    data() {
        return {
            drones: []
        };
    },
    created() {
        const socket = io('http://localhost:3000');
        socket.on('update', (data) => {
            this.drones = data.drones;
        });
    }
};
</script>

<style>
#drone-monitor {
    font-family: Arial, sans-serif;
    margin: 20px;
}
</style>
```