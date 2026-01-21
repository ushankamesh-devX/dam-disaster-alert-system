import { Report, IssueTypeOption, DamOption } from './types';

export const ISSUE_TYPES: IssueTypeOption[] = [
    {
        value: 'structural',
        label: 'Structural',
        color: '#DC2626',
        icon: 'alert-octagon',
    },
    {
        value: 'water-level',
        label: 'Water Level',
        color: '#2563EB',
        icon: 'waves',
    },
    {
        value: 'erosion',
        label: 'Erosion',
        color: '#D97706',
        icon: 'terrain',
    },
    {
        value: 'equipment',
        label: 'Equipment',
        color: '#7C3AED',
        icon: 'cog',
    },
    {
        value: 'other',
        label: 'Other',
        color: '#6B7280',
        icon: 'information',
    },
];

export const DAMS: DamOption[] = [
    { id: '1', name: 'Mullaperiyar Dam', location: 'Kerala-Tamil Nadu Border' },
    { id: '2', name: 'Idukki Dam', location: 'Idukki, Kerala' },
    { id: '3', name: 'Bhakra Dam', location: 'Himachal Pradesh' },
    { id: '4', name: 'Tehri Dam', location: 'Uttarakhand' },
    { id: '5', name: 'Sardar Sarovar Dam', location: 'Gujarat' },
    { id: '6', name: 'Nagarjuna Sagar Dam', location: 'Telangana' },
    { id: '7', name: 'Hirakud Dam', location: 'Odisha' },
    { id: '8', name: 'Koyna Dam', location: 'Maharashtra' },
];

export const MOCK_REPORTS: Report[] = [
    {
        id: '1',
        userName: 'Rajesh Kumar',
        damName: 'Mullaperiyar Dam',
        issueType: 'structural',
        description: 'Noticed visible cracks on the eastern wall of the dam. The cracks appear to be expanding and need immediate attention.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'pending',
    },
    {
        id: '2',
        userName: 'Priya Sharma',
        damName: 'Idukki Dam',
        issueType: 'water-level',
        description: 'Water level has risen significantly after recent rainfall. Currently at 95% capacity and still rising.',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        status: 'reviewing',
    },
    {
        id: '3',
        userName: 'Arun Menon',
        damName: 'Mullaperiyar Dam',
        issueType: 'erosion',
        description: 'Soil erosion observed near the spillway area. Heavy rainfall has washed away protective vegetation.',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        status: 'reviewing',
    },
    {
        id: '4',
        userName: 'Lakshmi Nair',
        damName: 'Bhakra Dam',
        issueType: 'equipment',
        description: 'Sluice gate #3 is not operating properly. Manual override required for operation.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'resolved',
    },
    {
        id: '5',
        userName: 'Vikram Singh',
        damName: 'Tehri Dam',
        issueType: 'other',
        description: 'Unusual vibrations felt near the turbine hall. Locals have reported hearing strange noises.',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        status: 'pending',
    },
    {
        id: '6',
        userName: 'Meera Patel',
        damName: 'Sardar Sarovar Dam',
        issueType: 'water-level',
        description: 'Downstream water flow appears irregular. Possible blockage in the discharge channel.',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        status: 'resolved',
    },
    {
        id: '7',
        userName: 'Suresh Reddy',
        damName: 'Nagarjuna Sagar Dam',
        issueType: 'structural',
        description: 'Concrete spalling observed on the dam face. Reinforcement bars are exposed in some areas.',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        status: 'reviewing',
    },
    {
        id: '8',
        userName: 'Anjali Das',
        damName: 'Hirakud Dam',
        issueType: 'erosion',
        description: 'Significant bank erosion downstream of the dam. Local villages are at risk.',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        status: 'pending',
    },
];
