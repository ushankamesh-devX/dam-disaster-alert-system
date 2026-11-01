import apiClient from '../lib/axios';

/** Admin SMS switch. Off after every API restart: credits are limited. */
export const getSmsSettings = async () => (await apiClient.get('/api/v1/sms/settings')).data;

export const setSmsSendingAllowed = async (sendingAllowed) =>
    (await apiClient.put('/api/v1/sms/settings', { sendingAllowed })).data;

/** Registered users with a phone number: [{ id, name, phone (masked) }] */
export const getSmsRecipients = async () => (await apiClient.get('/api/v1/sms/recipients')).data;

/** Ready-to-send text for an alert with the dam's live values. */
export const composeAlertSms = async (alertId) =>
    (await apiClient.get('/api/v1/sms/compose', { params: { alertId } })).data.message;

/** Send a custom SMS now. Returns { sent: [names], failed: [names] }. */
export const sendCustomSms = async (userIds, message) =>
    (await apiClient.post('/api/v1/sms/send', { userIds, message })).data;

/** Queue one alert's SMS for every registered user with a phone number. */
export const sendAlertSms = async (alertId) =>
    (await apiClient.post(`/api/v1/sms/alerts/${alertId}/send`)).data;
