const axios = require('axios');

const BASE_URL = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
const API_KEY = process.env.EVOLUTION_API_KEY || '';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    apikey: API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

async function createInstance(instanceName, webhookUrl) {
  try {
    const response = await client.post('/instance/create', {
      instanceName,
      token: instanceName,
      qrcode: true,
      webhook: webhookUrl,
      webhookByEvents: false,
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'CONTACTS_UPSERT', 'CONTACTS_UPDATE'],
    });
    return response.data;
  } catch (err) {
    // v1.x returns 403 "already in use", v2.x returns 409 — both mean instance exists
    if (err.response?.status === 403 || err.response?.status === 409) {
      return await getQR(instanceName);
    }
    throw new Error(`Evolution createInstance: ${err.response?.data?.message || err.message}`);
  }
}

async function getQR(instanceName) {
  try {
    const response = await client.get(`/instance/connect/${instanceName}`);
    return response.data;
  } catch (err) {
    throw new Error(`Evolution getQR: ${err.response?.data?.message || err.message}`);
  }
}

async function getConnectionState(instanceName) {
  try {
    const response = await client.get(`/instance/connectionState/${instanceName}`);
    const state = response.data?.instance?.state || response.data?.state;
    return state || 'close';
  } catch (err) {
    throw new Error(`Evolution getState: ${err.response?.data?.message || err.message}`);
  }
}

async function logoutInstance(instanceName) {
  try {
    const response = await client.delete(`/instance/logout/${instanceName}`);
    return response.data;
  } catch (err) {
    // Not a hard error — instance may already be logged out
    return null;
  }
}

async function deleteInstance(instanceName) {
  try {
    // Must logout before delete when instance is in 'open' state
    await logoutInstance(instanceName);
    await new Promise(r => setTimeout(r, 500));
    const response = await client.delete(`/instance/delete/${instanceName}`);
    return response.data;
  } catch (err) {
    throw new Error(`Evolution deleteInstance: ${err.response?.data?.message || err.message}`);
  }
}

module.exports = { createInstance, getQR, getConnectionState, deleteInstance, logoutInstance };
