/**
 * Centralized sanitization service for data validation and type conversion
 */
class SanitizationService {
    /**
     * Convert empty strings, null, or undefined to null
     * @param {*} value - The value to parse
     * @returns {string|null} The sanitized string or null
     */
    static parseString(value) {
        return (value === '' || value === null || value === undefined) ? null : String(value);
    }

    /**
     * Convert a value to a float, returns null for invalid values
     * @param {*} value - The value to parse
     * @returns {number|null} The parsed float or null
     */
    static parseNumeric(value) {
        if (value === '' || value === null || value === undefined) return null;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Convert a value to an integer, returns null for invalid values
     * @param {*} value - The value to parse
     * @returns {number|null} The parsed integer or null
     */
    static parseInteger(value) {
        if (value === '' || value === null || value === undefined) return null;
        const parsed = parseInt(value);
        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Convert BigInt values to numbers recursively in objects and arrays
     * @param {*} obj - The object or value to convert
     * @returns {*} The converted value
     */
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

    /**
     * Sanitize phone input data
     * @param {Object} data - The phone data to sanitize
     * @returns {Object} Sanitized phone data
     */
    static sanitizePhoneInput(data) {
        return {
            device_name: this.parseString(data.device_name || data.sm_name),
            device_maker: this.parseString(data.device_maker || data.sm_maker),
            device_price: this.parseNumeric(data.device_price || data.sm_price),
            device_inventory: this.parseInteger(data.device_inventory || data.sm_inventory) || 0,
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

    /**
     * Sanitize supplier input data
     * @param {Object} data - The supplier data to sanitize
     * @returns {Object} Sanitized supplier data
     */
    static sanitizeSupplierInput(data) {
        return {
            name: this.parseString(data.name),
            contact_person: this.parseString(data.contact_person),
            email: this.parseString(data.email),
            phone: this.parseString(data.phone),
            address: this.parseString(data.address),
            is_active: data.is_active === undefined ? true : Boolean(data.is_active)
        };
    }
}

module.exports = SanitizationService;
