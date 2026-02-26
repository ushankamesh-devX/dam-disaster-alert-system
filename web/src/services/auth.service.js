import apiClient from '../lib/axios';

/**
 * POST /auth/login
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token, type, expiresIn, user }>}
 */
export const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data.data; // { token, type, expiresIn, user }
};

/**
 * POST /auth/register
 * @param {{ fullName, email, phoneNumber, password, languagePreference }} payload
 * @returns {Promise<{ token, type, expiresIn, user }>}
 */
export const register = async ({ fullName, email, phoneNumber, password, languagePreference = 'en' }) => {
    const response = await apiClient.post('/auth/register', {
        fullName,
        email,
        phoneNumber,
        password,
        languagePreference,
    });
    return response.data.data; // { token, type, expiresIn, user }
};
