
class SanitizationService {
    /**
     * Sanitize a single string value (basic HTML escaping)
     * @param {string} value - Value to sanitize
     * @returns {string|null} - Sanitized value
     */
    static sanitize(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/`/g, '&#x60;');
    }

    /**
     * Sanitize an object of values
     * @param {Object} obj - Object with values to sanitize
     * @returns {Object} - Object with sanitized values
     */
    static sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return {};
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) {
                sanitized[key] = null;
            } else if (typeof value === 'string') {
                sanitized[key] = this.sanitize(value);
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    static parseString(value) {
        return (value === '' || value === null || value === undefined) ? null : String(value);
    }


    static parseNumeric(value) {
        if (value === '' || value === null || value === undefined) return null;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }


    static parseInteger(value) {
        if (value === '' || value === null || value === undefined) return null;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
    }


    static convertBigIntToNumber(obj) {
        if (obj === null || obj === undefined) return obj;

        if (typeof obj === 'bigint') {
            return Number(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(SanitizationService.convertBigIntToNumber);
        }

        if (obj instanceof Date) {
            return obj;
        }

        if (typeof obj === 'object') {
            const converted = {};
            for (const [key, value] of Object.entries(obj)) {
                converted[key] = SanitizationService.convertBigIntToNumber(value);
            }
            return converted;
        }

        return obj;
    }


    static safeJSONStringify(value, options = {}, space) {
        const bigintHandling = options.bigintHandling || 'string';

        const replacer = (key, val) => {
            if (typeof val === 'bigint') {
                if (bigintHandling === 'number') {
                    // Convert to number (may lose precision)
                    return Number(val);
                }
                // Default: convert to string to preserve value
                return val.toString();
            }
            return val;
        };

        return JSON.stringify(value, replacer, space);
    }


    static sanitizePhoneInput(data) {
        return {
            device_name: this.parseString(data.device_name || data.device_name),
            device_maker: this.parseString(data.device_maker || data.device_maker),
            device_price: this.parseNumeric(data.device_price || data.device_price),
            quantity: this.parseInteger(data.quantity || data.device_inventory) || 0,
            color: this.parseString(data.color),
            water_and_dust_rating: this.parseString(data.water_and_dust_rating),
            processor: this.parseString(data.processor),
            process_node: this.parseString(data.process_node),
            cpu_cores: this.parseString(data.cpu_cores),
            cpu_frequency: this.parseString(data.cpu_frequency),
            gpu: this.parseString(data.gpu),
            memory_type: this.parseString(data.memory_type),
            ram: this.parseString(data.ram),
            rom: this.parseString(data.rom),
            expandable_memory: this.parseString(data.expandable_memory),
            length_mm: this.parseNumeric(data.length_mm),
            width_mm: this.parseNumeric(data.width_mm),
            thickness_mm: this.parseNumeric(data.thickness_mm),
            weight_g: this.parseNumeric(data.weight_g),
            display_size: this.parseNumeric(data.display_size),
            resolution: this.parseString(data.resolution),
            pixel_density: this.parseString(data.pixel_density),
            refresh_rate: this.parseString(data.refresh_rate),
            brightness: this.parseString(data.brightness),
            display_features: this.parseString(data.display_features),
            rear_camera_main: this.parseString(data.rear_camera_main),
            rear_camera_macro: this.parseString(data.rear_camera_macro),
            rear_camera_features: this.parseString(data.rear_camera_features),
            rear_video_resolution: this.parseString(data.rear_video_resolution),
            front_camera: this.parseString(data.front_camera),
            front_camera_features: this.parseString(data.front_camera_features),
            front_video_resolution: this.parseString(data.front_video_resolution),
            battery_capacity: this.parseString(data.battery_capacity),
            fast_charging: this.parseString(data.fast_charging),
            connector: this.parseString(data.connector),
            security_features: this.parseString(data.security_features),
            sim_card: this.parseString(data.sim_card),
            nfc: this.parseString(data.nfc),
            network_bands: this.parseString(data.network_bands),
            wireless_connectivity: this.parseString(data.wireless_connectivity),
            navigation: this.parseString(data.navigation),
            audio_jack: this.parseString(data.audio_jack),
            audio_playback: this.parseString(data.audio_playback),
            video_playback: this.parseString(data.video_playback),
            sensors: this.parseString(data.sensors),
            operating_system: this.parseString(data.operating_system),
            package_contents: this.parseString(data.package_contents)
        };
    }


    static sanitizeSupplierInput(data) {
        // Handle is_active checkbox: '1' = true, '0' or undefined = false
        let isActive = true; // Default to true for new suppliers
        if (data.is_active !== undefined) {
            isActive = data.is_active === '1' || data.is_active === 1 || data.is_active === true;
        }

        return {
            name: this.parseString(data.name),
            category: this.parseString(data.category),
            contact_person: this.parseString(data.contact_person),
            contact_position: this.parseString(data.contact_position),
            contact_email: this.parseString(data.contact_email),
            email: this.parseString(data.email),
            phone: this.parseString(data.phone),
            website: this.parseString(data.website),
            address: this.parseString(data.address),
            notes: this.parseString(data.notes),
            is_active: isActive ? 1 : 0
        };
    }
}

module.exports = SanitizationService;
