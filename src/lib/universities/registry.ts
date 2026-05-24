// src/lib/universities/registry.ts
import type { UniConfig } from './types';

export const uniRegistry: Record<string, UniConfig> = {
    MOUAU: {
        acronym: 'MOUAU',
        receipt: {
            actionName: 'fetchReceipt',
            refLabel: 'receipt ref number',
            refPlaceholder: 'e.g. 181387930941',
            refFieldName: 'ref',
            refExtractParam: 'transaction_ref',
            matricLabel: 'Matric number',
            matricPlaceholder: 'e.g. MOUAU/PHY/25/123456',
            badgeLabel: 'MOUAU Auto-fill',
            fields: [
                { key: 'name', label: 'Name' },
                { key: 'college', label: 'College' },
                { key: 'department', label: 'Department' },
                { key: 'matricNo', label: 'Matric No' },
                { key: 'jambregNo', label: 'JAMB Reg No', mask: true, maskStart: 4, maskEnd: 3 },
                { key: 'receiptNo', label: 'Receipt No', mask: true, maskStart: 2, maskEnd: 2 },
            ]
        }   // no receipt config = no auto-fill section shown
    }
};

export function getUniConfig(acronym: string): UniConfig | null {
    return uniRegistry[acronym] ?? null;
}