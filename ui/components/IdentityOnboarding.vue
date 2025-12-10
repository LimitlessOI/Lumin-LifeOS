```vue
<template>
  <div>
    <h2>Identity Onboarding</h2>
    <input v-model="userId" placeholder="Enter User ID" />
    <button @click="startOnboarding">Start Onboarding</button>
    <p v-if="sessionToken">Session Token: {{ sessionToken }}</p>
  </div>
</template>

<script>
import IdentitySDK from '../../clients/IdentitySDK';

export default {
  data() {
    return {
      userId: '',
      sessionToken: null,
    };
  },
  methods: {
    async startOnboarding() {
      const sdk = new IdentitySDK(process.env.API_BASE_URL);
      const { sessionToken } = await sdk.startVerification(this.userId);
      this.sessionToken = sessionToken;
    },
  },
};
</script>