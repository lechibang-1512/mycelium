/**
 * Phone Form Constants
 * Centralized form state definitions to eliminate duplication
 */

/**
 * Initial state for phone form with all 49 fields
 * This is used across the Phones component to avoid repeating
 * the same 72-line object 4 times
 */
export const INITIAL_PHONE_FORM_STATE = {
    // Top-level fields
    device_name: '',
    device_maker: '',
    device_price: '',
    total_inventory: '', // Read-only
    product_type: 'phone', // internal discriminator
    // device_type enum is handled by backend default or specific logic if needed

    // Status & Dates (Top level in Schema)
    is_active: true,
    is_discontinued: false,
    launch_date: '',
    end_of_life_date: '',

    // User-facing specs (Mapped to attributes.Mixed)
    attributes: {
        body: {
            color: '',
            water_resistance: ''
        },
        processor: {
            name: '',
            manufacturer: '',
            process_nm: '',
            cores: '',
            clock_speed: '',
            gpu: ''
        },
        memory: {
            ram: '',
            rom: '',
            type: '',
            expandable: ''
        },
        display: {
            size: '',
            type: '',
            resolution: '',
            refresh_rate: '',
            hdr: '',
            features: ''
        },
        camera: {
            rear: {
                main: '',
                ultrawide: '',
                telephoto: '',
                optical_zoom: '',
                features: ''
            },
            front: {
                main: '',
                features: ''
            }
        },
        battery: {
            capacity: '',
            type: '',
            fast_charging_support: '',
            charging: {
                wired_wattage: '',
                wireless_wattage: '',
                reverse_wireless_wattage: '',
                connector_type: ''
            }
        },
        connectivity: {
            sim: '',
            nfc: '',
            wireless: ''
        },
        dimensions: {
            length: '',
            width: '',
            thickness: '',
            weight: ''
        },
        software: {
            os: ''
        },
        features: {
            security: '',
            sensors: ''
        },
        package_contents: '',

    },

    // Warranty (Top level in Schema)
    warranty_months: 12,
    warranty_type: 'MANUFACTURER',
    warranty_notes: ''
};

/**
 * Map phone object from API to form state
 * @param {Object} phone - Phone object from API
 * @returns {Object} Form state object with nested attributes
 */
export function mapPhoneToFormState(phone) {
    if (!phone) return INITIAL_PHONE_FORM_STATE;

    const attrs = phone.attributes || {};

    return {
        // Top Level
        device_name: phone.device_name || '',
        device_maker: phone.manufacturer || phone.device_maker || '',
        device_price: phone.unit_price ?? phone.device_price ?? phone.base_price ?? '',
        total_inventory: phone.quantity ?? phone.total_inventory ?? phone.staging_inventory ?? 0,
        product_type: phone.product_type || 'phone',

        is_active: phone.is_active ?? true,
        is_discontinued: phone.is_discontinued ?? false,
        launch_date: phone.launch_date ? new Date(phone.launch_date).toISOString().split('T')[0] : '',
        end_of_life_date: phone.end_of_life_date ? new Date(phone.end_of_life_date).toISOString().split('T')[0] : '',

        warranty_months: phone.warranty_months ?? 12,
        warranty_type: phone.warranty_type || 'MANUFACTURER',
        warranty_notes: phone.warranty_notes || '',

        // Nested Attributes (merge with defaults to ensure shapes exist)
        attributes: {
            body: {
                color: phone.color || attrs.body?.color || '',
                water_resistance: phone.water_and_dust_rating || attrs.body?.water_resistance || ''
            },
            processor: {
                name: phone.processor || attrs.processor?.name || '',
                manufacturer: phone.processor_manufacturer || attrs.processor?.manufacturer || '',
                process_nm: phone.process_node || attrs.processor?.process_nm || '',
                cores: phone.cpu_cores || attrs.processor?.cores || '',
                clock_speed: phone.cpu_frequency || attrs.processor?.clock_speed || '',
                gpu: phone.gpu || attrs.processor?.gpu || ''
            },
            memory: {
                ram: (phone.ram || attrs.memory?.ram || '').toString().replace(/GB/i, '').trim(),
                rom: (phone.rom || attrs.memory?.rom || '').toString().replace(/GB/i, '').trim(),
                type: phone.memory_type || attrs.memory?.type || '',
                expandable: phone.expandable_memory || attrs.memory?.expandable || ''
            },
            display: {
                size: phone.display_size || attrs.display?.size || '',
                type: phone.display_type || attrs.display?.type || '',
                resolution: phone.resolution || attrs.display?.resolution || '',
                refresh_rate: phone.refresh_rate || attrs.display?.refresh_rate || '',
                hdr: phone.hdr_support || attrs.display?.hdr || '',
                features: phone.display_features || attrs.display?.features || ''
            },
            camera: {
                rear: {
                    main: phone.rear_camera_main || attrs.camera?.rear?.main || '',
                    ultrawide: phone.rear_camera_ultrawide || attrs.camera?.rear?.ultrawide || '',
                    telephoto: phone.rear_camera_telephoto || attrs.camera?.rear?.telephoto || '',
                    optical_zoom: phone.optical_zoom || attrs.camera?.rear?.optical_zoom || '',
                    features: phone.rear_camera_features || attrs.camera?.rear?.features || ''
                },
                front: {
                    main: phone.front_camera || attrs.camera?.front?.main || '',
                    features: phone.front_camera_features || attrs.camera?.front?.features || ''
                }
            },
            battery: {
                capacity: phone.battery_capacity || attrs.battery?.capacity || '',
                type: phone.battery_type || attrs.battery?.type || '',
                fast_charging_support: phone.fast_charging || attrs.battery?.fast_charging_support || '',
                charging: {
                    wired_wattage: phone.fast_charging_w || attrs.battery?.charging?.wired_wattage || '',
                    wireless_wattage: phone.wireless_charging_w || attrs.battery?.charging?.wireless_wattage || '',
                    reverse_wireless_wattage: phone.reverse_charging_w || attrs.battery?.charging?.reverse_wireless_wattage || '',
                    connector_type: phone.connector || attrs.battery?.charging?.connector_type || ''
                }
            },
            connectivity: {
                sim: phone.sim_card || attrs.connectivity?.sim || '',
                nfc: phone.nfc || attrs.connectivity?.nfc || '',
                wireless: phone.wireless_connectivity || attrs.connectivity?.wireless || ''
            },
            dimensions: {
                length: phone.length_mm || attrs.dimensions?.length || '',
                width: phone.width_mm || attrs.dimensions?.width || '',
                thickness: phone.thickness_mm || attrs.dimensions?.thickness || '',
                weight: phone.weight_g || attrs.dimensions?.weight || ''
            },
            software: {
                os: phone.operating_system || attrs.software?.os || ''
            },
            features: {
                security: phone.security_features || attrs.features?.security || '',
                sensors: phone.sensors || attrs.features?.sensors || ''
            },
            package_contents: phone.package_contents || attrs.package_contents || ''
        }
    };
}

/**
 * Reset form to initial state
 * @returns {Object} Initial form state
 */
export function resetPhoneForm() {
    return { ...INITIAL_PHONE_FORM_STATE };
}
