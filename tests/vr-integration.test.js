const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');

chai.use(chaiHttp);
const { expect } = chai;

describe('VR Integration Tests', () => {
  it('should create a VR session', (done) => {
    chai.request(server)
      .post('/api/vr/session')
      .send({ startTime: new Date() })
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body).to.have.property('id');
        done();
      });
  });

  it('should interact with AI guide', (done) => {
    chai.request(server)
      .post('/api/vr/guide')
      .send({ userInput: 'Hello AI' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('response');
        done();
      });
  });

  it('should sync real-world data', (done) => {
    chai.request(server)
      .get('/api/vr/sync')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('weather');
        expect(res.body).to.have.property('places');
        done();
      });
  });
});