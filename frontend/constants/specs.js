export const SPECS = {
    DIMENSIONS: {
        height: { label: 'Height (mm)', type: 'number', unit: 'mm' },
        width: { label: 'Width (mm)', type: 'number', unit: 'mm' },
        depth: { label: 'Thickness (mm)', type: 'number', unit: 'mm' },
        weight: { label: 'Weight (g)', type: 'number', unit: 'g' },
        folded_height: { label: 'Folded Height (mm)', type: 'number', unit: 'mm' },
        folded_width: { label: 'Folded Width (mm)', type: 'number', unit: 'mm' },
        folded_depth: { label: 'Folded Thickness (mm)', type: 'number', unit: 'mm' },
    },
    BATTERY: {
        capacity: { label: 'Capacity (mAh)', type: 'number', unit: 'mAh' },
        type: { label: 'Type', type: 'select', options: ['Li-Ion', 'Li-Po', 'Graphene', 'Other'] },
        fast_charging_w: { label: 'Wired Charging (W)', type: 'number', unit: 'W' },
        wireless_charging_w: { label: 'Wireless Charging (W)', type: 'number', unit: 'W' },
        reverse_charging_w: { label: 'Reverse Charging (W)', type: 'number', unit: 'W' },
        port_type: { label: 'Port Type', type: 'select', options: ['USB-C', 'Lightning', 'Micro-USB', 'Proprietary'] },
    },
    PROCESSOR: {
        chipset: { label: 'Chipset Name', type: 'text', placeholder: 'e.g. Snapdragon 8 Gen 2' },
        manufacturer: { label: 'Manufacturer', type: 'text', placeholder: 'Qualcomm, Apple, MediaTek' },
        cores: { label: 'CPU Cores', type: 'number' },
        process_nm: { label: 'Process Node (nm)', type: 'number', unit: 'nm' },
        gpu: { label: 'GPU', type: 'text', placeholder: 'e.g. Adreno 740' },
    }
};

export const INITIAL_SPECS_STATE = {
    dimensions: {
        height: '',
        width: '',
        depth: '',
        weight: '',
        folded_height: '',
        folded_width: '',
        folded_depth: '',
    },
    battery: {
        capacity: '',
        type: 'Li-Ion',
        fast_charging_w: '',
        wireless_charging_w: '',
        reverse_charging_w: '',
        port_type: 'USB-C',
    },
    processor: {
        chipset: '',
        manufacturer: '',
        cores: '',
        process_nm: '',
        gpu: '',
    }
};
