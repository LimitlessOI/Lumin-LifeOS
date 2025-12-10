```markdown
# Integrating Auth Generator with Express.js

1. Install necessary packages:
   ```bash
   npm install express bcryptjs jsonwebtoken
   ```

2. Use the generated routes in your Express app:
   ```javascript
   const authRoutes = require('./generated/authRoutes');
   app.use('/auth', authRoutes);
   ```

3. Configure your environment variables for JWT and other secrets.
```