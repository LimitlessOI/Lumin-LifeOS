// routes/lifeos-briefing-routes.js
import { Router } from 'express';
import createDailyBriefingService from '../services/lifeos-daily-briefing.js';
import makeLifeOSUserResolver from '../utils/lifeos-user-resolver.js';
import { logger } from '../logger.js';

const createLifeOSBriefingRoutes = ({ pool, *rk, *ccm, logger }) => {
  const router = Router();

  const userIdResolver = makeLifeOSUserResolver();

  router.get('/api/v1/lifeos/briefing/today', async (req, res) => {
    const userId = userIdResolver(req.query.user);
    const briefing = await createDailyBriefingService(pool, *ccm).assembleBriefing(userId);
    res.json({ ok: true, briefing });
  });

  router.get('/api/v1/lifeos/briefing/spoken', async (req, res) => {
    const userId = userIdResolver(req.query.user);
    const briefing = await createDailyBriefingService(pool, *ccm).generateSpokenBriefing(userId);
    res.json({ ok: true, text: briefing.text, data: briefing.data });
  });

  return router;
};

export default createLifeOSBriefingRoutes;
```

```javascript
// services/lifeos-daily-briefing.js
import { pool } from '../db.js';
import { logger } from '../logger.js';

const createDailyBriefingService = ({ pool, *ccm, logger }) => {
  const assembleBriefing = async (userId) => {
    // implementation details omitted for brevity
  };

  const generateSpokenBriefing = async (userId) => {
    // implementation details omitted for brevity
  };

  return { assembleBriefing, generateSpokenBriefing };
};

export default createDailyBriefingService;
```

```javascript
// utils/lifeos-user-resolver.js
import { *rk } from '../config.js';

const makeLifeOSUserResolver = () => {
  return (user) => {
    // implementation details omitted for brevity
  };
};

export default makeLifeOSUserResolver;
```

```javascript
// logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
});

export default logger;
```

```javascript
// config.js
import { *rk } from './config.json';

export { *rk };
```

```json
// config.json
{
  "rk": {
    "key1": "value1",
    "key2": "value2"
  }
}