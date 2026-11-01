import apiClient from '../lib/axios';

/** Admin SMS switch. Off after every API restart: credits are limited. */
export const getSmsSettings = async () => (await apiClient.get('/api/v1/sms/settings')).data;

export const setSmsSendingAllowed = async (sendingAllowed) =>
    (await apiClient.put('/api/v1/sms/settings', { sendingAllowed })).data;

/** Queue one alert's SMS for every registered user with a phone number. */
export const sendAlertSms = async (alertId) =>
    (await apiClient.post(`/api/v1/sms/alerts/${alertId}/send`)).data;
