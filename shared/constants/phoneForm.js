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
    // Basic Information
    device_name: '',
    device_maker: '',
    device_price: '',
    total_inventory: '', // Computed from warehouses, read-only
    product_type: 'phone',
    color: '',
    water_and_dust_rating: '',

    // Processor & Performance
    processor: '',
    processor_manufacturer: '',
    process_node: '',
    cpu_cores: '',
    cpu_frequency: '',
    gpu: '',

    // Memory
    memory_type: '',
    ram: '',
    rom: '',
    expandable_memory: '',

    // Physical Dimensions
    length_mm: '',
    width_mm: '',
    thickness_mm: '',
    weight_g: '',

    // Display
    display_size: '',
    display_type: '',
    hdr_support: '',
    resolution: '',
    pixel_density: '',
    refresh_rate: '',
    brightness: '',
    display_features: '',

    // Camera - Rear
    rear_camera_main: '',
    rear_camera_ultrawide: '',
    rear_camera_telephoto: '',
    rear_camera_macro: '',
    optical_zoom: '',
    rear_camera_features: '',
    rear_video_resolution: '',

    // Camera - Front
    front_camera: '',
    front_camera_features: '',
    front_video_resolution: '',

    // Battery & Charging
    battery_capacity: '',
    battery_type: '',
    fast_charging: '',
    fast_charging_w: '',
    wireless_charging: '',
    wireless_charging_w: '',
    reverse_charging: '',
    reverse_charging_w: '',
    connector: '',

    // Security & SIM
    security_features: '',
    sim_card: '',
    nfc: '',

    // Connectivity
    network_bands: '',
    wireless_connectivity: '',
    navigation: '',

    // Audio & Video
    audio_jack: '',
    audio_playback: '',
    video_playback: '',

    // Additional Features
    sensors: '',
    operating_system: '',
    package_contents: '',

    // Warranty
    warranty_months: 12,
    warranty_type: 'MANUFACTURER',
    warranty_notes: '',

    // Status
    is_active: true,
    is_discontinued: false,
    launch_date: '',
    end_of_life_date: ''
};

/**
 * Map phone object from API to form state
 * Handles different naming conventions and missing fields
 * @param {Object} phone - Phone object from API
 * @returns {Object} Form state object
 */
export function mapPhoneToFormState(phone) {
    if (!phone) return INITIAL_PHONE_FORM_STATE;

    return {
        // Basic Information
        device_name: phone.device_name || '',
        device_maker: phone.manufacturer || phone.device_maker || '',
        device_price: phone.unit_price || phone.device_price || '',
        total_inventory: phone.quantity || phone.total_inventory || phone.staging_inventory || 0,
        product_type: phone.product_type || 'phone',
        color: phone.color || '',
        water_and_dust_rating: phone.water_and_dust_rating || '',

        // Processor & Performance
        processor: phone.processor || '',
        processor_manufacturer: phone.processor_manufacturer || phone.attributes?.processor?.manufacturer || '',
        process_node: phone.process_node || phone.attributes?.processor?.process_nm || '',
        cpu_cores: phone.cpu_cores || phone.attributes?.processor?.cores || '',
        cpu_frequency: phone.cpu_frequency || phone.attributes?.processor?.clock_speed || '',
        gpu: phone.gpu || phone.attributes?.processor?.gpu || '',

        // Memory
        memory_type: phone.memory_type || '',
        ram: (phone.ram || phone.storage || '').toString().replace(/GB/i, '').trim(),
        rom: (phone.rom || '').toString().replace(/GB/i, '').trim(),
        expandable_memory: phone.expandable_memory || '',

        // Physical Dimensions
        length_mm: phone.length_mm || '',
        width_mm: phone.width_mm || '',
        thickness_mm: phone.thickness_mm || '',
        weight_g: phone.weight_g || '',

        // Display
        display_size: phone.display_size || '',
        display_type: phone.display_type || '',
        hdr_support: phone.hdr_support || '',
        resolution: phone.resolution || '',
        pixel_density: phone.pixel_density || '',
        refresh_rate: phone.refresh_rate || '',
        brightness: phone.brightness || '',
        display_features: phone.display_features || '',

        // Camera - Rear
        rear_camera_main: phone.rear_camera_main || '',
        rear_camera_ultrawide: phone.rear_camera_ultrawide || '',
        rear_camera_telephoto: phone.rear_camera_telephoto || '',
        rear_camera_macro: phone.rear_camera_macro || '',
        optical_zoom: phone.optical_zoom || '',
        rear_camera_features: phone.rear_camera_features || '',
        rear_video_resolution: phone.rear_video_resolution || '',

        // Camera - Front
        front_camera: phone.front_camera || '',
        front_camera_features: phone.front_camera_features || '',
        front_video_resolution: phone.front_video_resolution || '',

        // Battery & Charging
        battery_capacity: phone.battery_capacity || phone.attributes?.battery?.capacity || '',
        battery_type: phone.battery_type || phone.attributes?.battery?.type || '',
        fast_charging: phone.fast_charging || '',
        fast_charging_w: phone.fast_charging_w || phone.attributes?.battery?.charging?.wired_wattage || '',
        wireless_charging: phone.wireless_charging || '',
        wireless_charging_w: phone.wireless_charging_w || phone.attributes?.battery?.charging?.wireless_wattage || '',
        reverse_charging: phone.reverse_charging || '',
        reverse_charging_w: phone.reverse_charging_w || phone.attributes?.battery?.charging?.reverse_wireless_wattage || '',
        connector: phone.connector || phone.attributes?.battery?.charging?.connector_type || '',

        // Security & SIM
        security_features: phone.security_features || '',
        sim_card: phone.sim_card || '',
        nfc: phone.nfc || '',

        // Connectivity
        network_bands: phone.network_bands || '',
        wireless_connectivity: phone.wireless_connectivity || '',
        navigation: phone.navigation || '',

        // Audio & Video
        audio_jack: phone.audio_jack || '',
        audio_playback: phone.audio_playback || '',
        video_playback: phone.video_playback || '',

        // Additional Features
        sensors: phone.sensors || '',
        operating_system: phone.operating_system || '',
        package_contents: phone.package_contents || '',

        // Warranty
        warranty_months: phone.warranty_months ?? 12,
        warranty_type: phone.warranty_type || 'MANUFACTURER',
        warranty_notes: phone.warranty_notes || '',

        // Status
        is_active: phone.is_active ?? true,
        is_discontinued: phone.is_discontinued ?? false,
        launch_date: phone.launch_date || '',
        end_of_life_date: phone.end_of_life_date || ''
    };
}

/**
 * Reset form to initial state
 * @returns {Object} Initial form state
 */
export function resetPhoneForm() {
    return { ...INITIAL_PHONE_FORM_STATE };
}
