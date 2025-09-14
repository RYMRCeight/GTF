
export interface Document {
    id: string;
    created_at: string;
    updated_at: string;
    title: string;
    department: string;
    sender: string;
    status: string;
    documentNumber: string;
    remarks: string | null;
    processingDays: number;
}

export interface Department {
    id: number;
    name: string;
}

export interface Status {
    id: string;
    name: string;
}

export interface SiteConfig {
    logo_url: string;
}

export interface HistoryEntry {
    id: number;
    created_at: string;
    document_id: string;
    action: string;
    department: string | null;
    status: string | null;
    received_by: string | null;
    remarks: string | null;
}