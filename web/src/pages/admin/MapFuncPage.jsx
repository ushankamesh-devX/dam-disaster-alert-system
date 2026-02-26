import React, { useState } from 'react';
import { Cpu } from 'lucide-react';
import GeomanMap from '../../components/map/GeomanMap';

export default function MapFuncPage() {
    const [currentGeoJSON, setCurrentGeoJSON] = useState(null);

    const handleMapChange = (geojson) => {
        setCurrentGeoJSON(geojson);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] gap-6">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3">
                        Map Functionality Test
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 pl-4 flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        Testing dynamic map editing (Draw, Edit, Drag, Delete GeoJSON)
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Map Section */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col min-h-[500px]">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Interactive Map</h2>
                    <div className="flex-1 w-full rounded border border-gray-300 overflow-hidden isolate relative z-0">
                        <GeomanMap
                            onMapChange={handleMapChange}
                            height="100%"
                        />
                    </div>
                </div>

                {/* Data Output Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col p-4 overflow-hidden">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Generated GeoJSON</h2>
                    <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto font-mono text-xs text-gray-700 border border-gray-200">
                        {currentGeoJSON ? (
                            <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(currentGeoJSON), null, 2)}</pre>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 italic text-center">
                                Draw shapes on the map using the controls on the left to see the output here.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
