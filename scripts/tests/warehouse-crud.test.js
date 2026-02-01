const chai = require('chai');
const axios = require('axios');
const { connectTestDB } = require('./setup');
const { Warehouse } = require('../../backend/models');

const expect = chai.expect;

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';

describe('Warehouse CRUD Integration Tests', function () {
  this.timeout(20000);

  let createdWarehouseId = null;
  let createdZoneId = null;

  before(async () => {
    // Ensure MongoDB connection is ready
    await connectTestDB();
  });

  after(async () => {
    // Cleanup any created test data using MongoDB
    try {
      if (createdWarehouseId) {
        await Warehouse.deleteOne({ warehouse_id: createdWarehouseId });
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  });

  it('should create a warehouse', async () => {
    const payload = {
      name: `TEST WAREHOUSE ${Date.now()}`,
      location: 'Test Location',
      description: 'Created by automated test',
      contactInfo: { manager_name: 'CI Tester' },
      isActive: true
    };

    const res = await axios.post(`${SERVER_URL}/api/warehouses`, payload);

    expect(res.status).to.equal(200);
    expect(res.data).to.have.property('success', true);
    expect(res.data).to.have.property('warehouseId');
    createdWarehouseId = res.data.warehouseId;
  });

  it('should fetch the created warehouse', async () => {
    const res = await axios.get(`${SERVER_URL}/api/warehouses/${createdWarehouseId}`);

    expect(res.status).to.equal(200);
    expect(res.data).to.have.property('warehouse');
    expect(res.data.warehouse.warehouse_id).to.equal(createdWarehouseId);
  });

  it('should update the warehouse', async () => {
    const newName = `UPDATED TEST ${Date.now()}`;
    const res = await axios.put(`${SERVER_URL}/api/warehouses/${createdWarehouseId}`, { name: newName });

    expect(res.status).to.equal(200);
    expect(res.data).to.have.property('success', true);

    const getRes = await axios.get(`${SERVER_URL}/api/warehouses/${createdWarehouseId}`);

    expect(getRes.data.warehouse.name).to.equal(newName);
  });

  it('should create a zone for the warehouse', async () => {
    const payload = {
      name: `TEST ZONE ${Date.now()}`,
      description: 'Zone for integration test',
      zone_type: 'storage',
      capacity_limit: null,
      is_active: true
    };

    const res = await axios.post(`${SERVER_URL}/api/warehouses/${createdWarehouseId}/zones`, payload);

    expect(res.status).to.equal(200);
    expect(res.data).to.have.property('success', true);
    expect(res.data).to.have.property('zoneId');
    createdZoneId = res.data.zoneId;
  });

  it('should deactivate then activate the zone', async () => {
    const deactivateRes = await axios.put(`${SERVER_URL}/api/warehouses/${createdWarehouseId}/zones/${createdZoneId}/deactivate`);

    expect(deactivateRes.status).to.equal(200);
    expect(deactivateRes.data).to.have.property('success', true);

    const activateRes = await axios.put(`${SERVER_URL}/api/warehouses/${createdWarehouseId}/zones/${createdZoneId}/activate`);

    expect(activateRes.status).to.equal(200);
    expect(activateRes.data).to.have.property('success', true);
  });

  it('should deactivate then activate the warehouse', async () => {
    const deactivateRes = await axios.put(`${SERVER_URL}/api/warehouses/${createdWarehouseId}/deactivate`);

    expect(deactivateRes.status).to.equal(200);
    expect(deactivateRes.data).to.have.property('success', true);

    const activateRes = await axios.put(`${SERVER_URL}/api/warehouses/${createdWarehouseId}/activate`);

    expect(activateRes.status).to.equal(200);
    expect(activateRes.data).to.have.property('success', true);
  });

  it('should delete (soft) the warehouse', async () => {
    const res = await axios.delete(`${SERVER_URL}/api/warehouses/${createdWarehouseId}`);

    expect(res.status).to.equal(200);
    expect(res.data).to.have.property('success', true);
  });
});
