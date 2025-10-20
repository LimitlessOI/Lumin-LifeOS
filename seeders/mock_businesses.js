const faker = require('faker');
const OutreachLead = require('../models/outreachLead');

const generateMockBusinesses = async () => {
  const mockBusinesses = [];
  for (let i = 0; i < 100; i++) {
    mockBusinesses.push({
      name: faker.company.companyName(),
      address: faker.address.streetAddress(),
      phone: faker.phone.phoneNumber(),
      website: faker.internet.url(),
    });
  }
  await OutreachLead.bulkCreate(mockBusinesses);
};

module.exports = generateMockBusinesses;
