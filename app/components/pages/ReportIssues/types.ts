export type IssueType = 'structural' | 'water-level' | 'erosion' | 'equipment' | 'other';

export interface MediaItem {
    uri: string;
    type: 'image' | 'video';
}

export interface Report {
    id: string;
    userName: string;
    userAvatar?: string;
    damName: string;
    issueType: IssueType;
    description: string;
    mediaUris?: string[]; // Deprecated - keeping for backward compatibility
    media?: MediaItem[];
    timestamp: Date;
    status: 'pending' | 'reviewing' | 'resolved';
}

export interface IssueTypeOption {
    value: IssueType;
    label: string;
    color: string;
    icon: string;
}

export interface DamOption {
    id: string;
    name: string;
    location: string;
}
