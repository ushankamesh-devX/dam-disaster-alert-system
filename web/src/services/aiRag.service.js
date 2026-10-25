import apiClient from '../lib/axios';

/**
 * Helper to unwrap Spring Boot ApiResponse { success, message, data }
 */
const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

/**
 * Operational SOP RAG Assistant and Document Management APIs
 */

/** POST /ai/chat -> Grounded conversational operational inquiry */
export const askAiChat = async (query, damId = null, userRole = null) => {
    const payload = { query };
    if (damId != null && damId !== '') {
        payload.damId = Number(damId);
        payload.dam_id = Number(damId);
    }
    if (userRole) {
        payload.userRole = userRole;
        payload.user_role = userRole;
    }
    const res = await apiClient.post('/ai/chat', payload, { timeout: 60000 });
    return unwrap(res);
};

/** GET /admin/ai/documents -> List indexed operational manuals & SOPs */
export const getAiDocuments = async (params = {}) => {
    const res = await apiClient.get('/admin/ai/documents', { params });
    return unwrap(res);
};

/** POST /admin/ai/documents -> Index a new or revised operational manual */
export const uploadAiDocument = async (payload) => {
    const body = {
        title: payload.title,
        category: payload.category || 'sop',
        content: payload.content,
        dam_id: payload.damId != null && payload.damId !== '' ? Number(payload.damId) : null,
        doc_id: payload.docId || null,
        metadata: payload.metadata || {},
    };
    const res = await apiClient.post('/admin/ai/documents', body);
    return unwrap(res);
};

/** DELETE /admin/ai/documents/{id} -> Soft delete / deactivate document from retrieval */
export const deleteAiDocument = async (docId) => {
    const res = await apiClient.delete(`/admin/ai/documents/${docId}`);
    return unwrap(res);
};

