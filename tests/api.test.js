```javascript
const request = require('supertest');
const app = require('../main'); // Assuming FastAPI app is exported

describe("GET /status", () => {
    it("should return running status", async () => {
        const response = await request(app).get("/status");
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("running");
    });
});
```