import { isVictoriaDemo } from './victoriaGeography';

export default function VictoriaReferenceNotice({ dam }) {
    if (!isVictoriaDemo(dam)) return null;
    return <p className="px-4 py-2 text-xs text-gray-600 bg-blue-50">
        Victoria Dam, reservoir shoreline and mapped downstream river: <a className="underline" href="https://www.openstreetmap.org/relation/3553743" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> (6 October 2026).
        {' '}Danger Levels 1–3, equipment, shelters and water levels are illustrative demo data. Shelters are outside the demo zones; they are not verified evacuation sites.
    </p>;
}
