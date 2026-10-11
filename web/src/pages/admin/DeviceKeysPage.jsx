import SymbolIcon from '../../components/ui/SymbolIcon';
import { FlatIcon as SvgIcon } from '../../components/ui/controls';
import { Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { AppButton, AppSelect, AppInput, AppTextarea, AppDialog } from '../../components/ui/controls';
import { useState, useEffect, useCallback } from 'react';
import {
    getAllDeviceApiKeys,
    createDeviceApiKey,
    deactivateDeviceApiKey,
    activateDeviceApiKey,
    regenerateDeviceApiKey,
    deleteDeviceApiKey,
} from '../../services/deviceKey.service';
import { getAllSensors } from '../../services/sensor.service';

export default function DeviceKeysPage() {
    const [keys, setKeys] = useState([]);
    const [sensors, setSensors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal states
    const [showCreate, setShowCreate] = useState(false);
    const [showApiKey, setShowApiKey] = useState(null); // { apiKey, name, sensorName }
    const [confirmAction, setConfirmAction] = useState(null); // { type, id, name }

    // Create form
    const [form, setForm] = useState({ sensorId: '', name: '', description: '', expiresAt: '' });
    const [creating, setCreating] = useState(false);

    const fetchKeys = useCallback(async () => {
        try {
            setLoading(true);
            const [keysData, sensorsData] = await Promise.all([
                getAllDeviceApiKeys(),
                getAllSensors(0, 200),
            ]);
            setKeys(keysData);
            setSensors(sensorsData.content || []);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load device keys');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchKeys(); }, [fetchKeys]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            setCreating(true);
            const payload = {
                sensorId: Number(form.sensorId),
                name: form.name,
                description: form.description || null,
                expiresAt: form.expiresAt || null,
            };
            const res = await createDeviceApiKey(payload);
            const created = res.data;
            setShowCreate(false);
            setForm({ sensorId: '', name: '', description: '', expiresAt: '' });
            setShowApiKey({
                apiKey: created.apiKey,
                name: created.name,
                sensorName: created.sensorName,
            });
            fetchKeys();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create API key');
        } finally {
            setCreating(false);
        }
    };

    const handleToggleActive = async (key) => {
        try {
            if (key.isActive) {
                await deactivateDeviceApiKey(key.id);
            } else {
                await activateDeviceApiKey(key.id);
            }
            fetchKeys();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update key');
        }
    };

    const handleRegenerate = async (id) => {
        try {
            const res = await regenerateDeviceApiKey(id);
            const data = res.data;
            setConfirmAction(null);
            setShowApiKey({
                apiKey: data.apiKey,
                name: data.name,
                sensorName: data.sensorName,
            });
            fetchKeys();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to regenerate key');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDeviceApiKey(id);
            setConfirmAction(null);
            fetchKeys();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete key');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    const formatDate = (d) => d ? new Date(d).toLocaleString() : '—';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Typography component="h1" variant="h1" className="text-2xl font-bold text-gray-900">Device API Keys</Typography>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage API keys for ESP32/IoT devices to submit sensor readings
                    </p>
                </div>
                <AppButton variant="contained"
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2"
                >
                    <SvgIcon aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </SvgIcon>
                    Generate API Key
                </AppButton>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Total Keys" value={keys.length} color="blue" />
                <StatCard label="Active" value={keys.filter(k => k.isActive).length} color="green" />
                <StatCard label="Inactive" value={keys.filter(k => !k.isActive).length} color="red" />
            </div>

            {/* Table */}
            <Paper variant="outlined" className="bg-white  border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="w-full text-sm">
                        <TableHead className="bg-gray-50 border-b border-gray-200">
                            <TableRow>
                                <TableCell component="th" className="px-4 py-3 text-left font-semibold text-gray-600">Name</TableCell>
                                <TableCell component="th" className="px-4 py-3 text-left font-semibold text-gray-600">Key Prefix</TableCell>
                                <TableCell component="th" className="px-4 py-3 text-left font-semibold text-gray-600">Sensor</TableCell>
                                <TableCell component="th" className="px-4 py-3 text-left font-semibold text-gray-600">Dam</TableCell>
                                <TableCell component="th" className="px-4 py-3 text-left font-semibold text-gray-600">Status</TableCell>
                                <TableCell component="th" className="px-4 py-3 text-left font-semibold text-gray-600">Last Used</TableCell>
                                <TableCell component="th" className="px-4 py-3 text-left font-semibold text-gray-600">Expires</TableCell>
                                <TableCell component="th" className="px-4 py-3 text-left font-semibold text-gray-600">Created</TableCell>
                                <TableCell component="th" className="px-4 py-3 text-right font-semibold text-gray-600">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody className="divide-y divide-gray-100">
                            {keys.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="px-4 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <SvgIcon aria-hidden="true" className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                            </SvgIcon>
                                            <p>No device API keys yet</p>
                                            <p className="text-xs">Generate a key to connect your first ESP32 device</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                keys.map((key) => (
                                    <TableRow key={key.id} className="hover:bg-gray-50/50">
                                        <TableCell className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{key.name}</div>
                                            {key.description && (
                                                <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{key.description}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{key.keyPrefix}...</code>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <div className="text-gray-900">{key.sensorName}</div>
                                            <div className="text-xs text-gray-400">{key.sensorUid}</div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-600">{key.damName}</TableCell>
                                        <TableCell className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${key.isActive
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-red-50 text-red-700'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${key.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                                {key.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-xs">{formatDate(key.lastUsedAt)}</TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-xs">
                                            {key.expiresAt ? formatDate(key.expiresAt) : <span className="text-gray-300">Never</span>}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-xs">{formatDate(key.createdAt)}</TableCell>
                                        <TableCell className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <AppButton
                                                    onClick={() => handleToggleActive(key)}
                                                    title={key.isActive ? 'Deactivate' : 'Activate'}
                                                    className={`p-1.5 rounded-lg transition-colors ${key.isActive
                                                        ? 'text-amber-600 hover:bg-amber-50'
                                                        : 'text-green-600 hover:bg-green-50'
                                                        }`}
                                                >
                                                    {key.isActive ? (
                                                        <SvgIcon aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                        </SvgIcon>
                                                    ) : (
                                                        <SvgIcon aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </SvgIcon>
                                                    )}
                                                </AppButton>
                                                <AppButton iconOnly
                                                    onClick={() => setConfirmAction({ type: 'regenerate', id: key.id, name: key.name })}
                                                    title="Regenerate key"
                                                    className=""
                                                >
                                                    <SvgIcon aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </SvgIcon>
                                                </AppButton>
                                                <AppButton iconOnly
                                                    onClick={() => setConfirmAction({ type: 'delete', id: key.id, name: key.name })}
                                                    title="Delete key"
                                                    className=""
                                                >
                                                    <SvgIcon aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </SvgIcon>
                                                </AppButton>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Paper>

            {/* ESP32 Quick Setup Guide */}
            <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-gray-200 p-6">
                <Typography component="h3" variant="h3" className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <SvgIcon aria-hidden="true" className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </SvgIcon>
                    ESP32 Quick Setup
                </Typography>
                <div className="bg-gray-900 rounded-lg p-4 text-xs font-mono text-green-400 overflow-x-auto">
                    <pre>{`// ESP32 Arduino Code Snippet
// Server buffers readings & saves mean at configured interval
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* baseUrl  = "https://YOUR_SERVER/api/v1/device";
const char* apiKey   = "ddasdk_YOUR_KEY_HERE";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi connected!");
}

void sendReading(float value, float battery, float signal) {
  HTTPClient http;
  http.begin(String(baseUrl) + "/readings");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-API-Key", apiKey);

  JsonDocument doc;
  doc["readingValue"]   = value;
  doc["unit"]           = "meters";
  doc["quality"]        = "good";
  doc["batteryLevel"]   = battery;    // 0-100 %
  doc["signalStrength"] = signal;     // dBm (-100 to 0)
  doc["status"]         = "active";

  String json;
  serializeJson(doc, json);

  int code = http.POST(json);
  // 200 = buffered, 201 = mean saved to DB
  http.end();
}

// Send as fast as you want (e.g. every 100ms)
// Server averages readings per interval set in dashboard`}</pre>
                </div>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <Modal onClose={() => setShowCreate(false)} title="Generate New Device API Key">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label htmlFor="field-DeviceKeysPage-17640" className="block text-sm font-medium text-gray-700 mb-1">Sensor *</label>
                            <AppSelect id="field-DeviceKeysPage-17640"
                                value={form.sensorId}
                                onChange={e => setForm(f => ({ ...f, sensorId: e.target.value }))}
                                required
                                className="w-full"
                            >
                                <option value="">Select a sensor...</option>
                                {sensors.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.sensorUid} — {s.name}
                                    </option>
                                ))}
                            </AppSelect>
                        </div>
                        <div>
                            <label htmlFor="field-DeviceKeysPage-18629" className="block text-sm font-medium text-gray-700 mb-1">Key Name *</label>
                            <AppInput id="field-DeviceKeysPage-18629"
                                type="text"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. Victoria Dam Water Level ESP32"
                                required
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label htmlFor="field-DeviceKeysPage-19349" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <AppTextarea id="field-DeviceKeysPage-19349"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Optional device description..."
                                rows={2}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label htmlFor="field-DeviceKeysPage-20035" className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                            <AppInput id="field-DeviceKeysPage-20035"
                                type="datetime-local"
                                value={form.expiresAt}
                                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                                className="w-full"
                            />
                            <p className="text-xs text-gray-400 mt-1">Leave empty for no expiration</p>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <AppButton
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className=""
                            >
                                Cancel
                            </AppButton>
                            <AppButton variant="contained"
                                type="submit"
                                disabled={creating}
                                className="disabled:opacity-50"
                            >
                                {creating ? 'Generating...' : 'Generate Key'}
                            </AppButton>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Show API Key Modal (once only) */}
            {showApiKey && (
                <Modal onClose={() => setShowApiKey(null)} title={<><SymbolIcon name="key" /> Your New API Key</>}>
                    <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-amber-800"><SymbolIcon name="warning" /> Copy this key now!</p>
                            <p className="text-xs text-amber-600 mt-1">This key will not be shown again. Store it safely and flash it into your ESP32 device.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Device: {showApiKey.name}</label>
                            <label className="block text-xs text-gray-400 mb-2">Sensor: {showApiKey.sensorName}</label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-gray-900 text-green-400 px-3 py-2 rounded-lg text-xs font-mono break-all select-all">
                                    {showApiKey.apiKey}
                                </code>
                                <AppButton iconOnly variant="contained"
                                    onClick={() => copyToClipboard(showApiKey.apiKey)}
                                    className="shrink-0"
                                    title="Copy to clipboard"
                                >
                                    <SvgIcon aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </SvgIcon>
                                </AppButton>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <AppButton variant="contained"
                                onClick={() => setShowApiKey(null)}
                                className=""
                            >
                                I've Copied the Key
                            </AppButton>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Confirm Action Modal */}
            {confirmAction && (
                <Modal onClose={() => setConfirmAction(null)} title={
                    confirmAction.type === 'delete' ? 'Delete API Key?' : 'Regenerate API Key?'
                }>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            {confirmAction.type === 'delete'
                                ? `This will permanently delete the API key "${confirmAction.name}". Any ESP32 device using this key will stop working immediately.`
                                : `This will invalidate the current key for "${confirmAction.name}" and generate a new one. You'll need to re-flash your ESP32 device.`
                            }
                        </p>
                        <div className="flex justify-end gap-3">
                            <AppButton
                                onClick={() => setConfirmAction(null)}
                                className=""
                            >
                                Cancel
                            </AppButton>
                            <AppButton
                                onClick={() => confirmAction.type === 'delete'
                                    ? handleDelete(confirmAction.id)
                                    : handleRegenerate(confirmAction.id)
                                }
                                className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${confirmAction.type === 'delete'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                {confirmAction.type === 'delete' ? 'Delete' : 'Regenerate'}
                            </AppButton>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ── Reusable Components ───────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        red: 'bg-red-50 text-red-700 border-red-100',
    };
    return (
        <div className={`rounded-xl border p-4 ${colors[color]}`}>
            <p className="text-xs font-medium opacity-70">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
    );
}

function Modal({ children, onClose, title }) {
    return (
        <AppDialog onClose={onClose}>

            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
                <div className="flex items-center justify-between mb-4">
                    <Typography component="h2" variant="h2" className="text-lg font-semibold text-gray-900">{title}</Typography>
                    <AppButton iconOnly aria-label="Close" onClick={onClose} className="">
                        <SvgIcon aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </SvgIcon>
                    </AppButton>
                </div>
                {children}
            </div>
        </AppDialog>
    );
}
