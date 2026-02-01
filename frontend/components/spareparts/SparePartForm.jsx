import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Row, Col, Accordion } from 'react-bootstrap';
import { sparePartsAPI, inventoryAPI, suppliersAPI } from '../../services/api';

/**
 * Spare Part Form Component - Full Specifications
 * 
 * Includes all fields from the smartphone_spare_parts database schema
 * organized into logical accordion sections.
 */
const SparePartForm = ({ show, onHide, onSaved, part }) => {
  const [form, setForm] = useState({
    // Basic Info
    part_name: '',
    part_code: '',
    part_category: 'DISPLAY',
    part_type: '',
    description: '',
    is_active: true,

    // Physical Specs
    dimensions: '',
    weight_g: '',
    color_variants: '',

    // Device Compatibility
    compatible_product_id: '',
    compatible_device_category: '',
    compatible_brands: '',
    compatible_models: '',

    // Quality & Warranty
    manufacturer: '',
    manufacturer_part_number: '',
    quality_grade: 'STANDARD',
    warranty_months: 3,

    // Pricing
    unit_cost: 0,
    unit_price: 0,
    currency: 'USD',

    // Inventory Settings
    minimum_stock_level: 5,
    max_stock_level: 50,
    reorder_point: 10,
    reorder_quantity: 20,
    lead_time_days: '',
    default_supplier_id: '',

    // Tracking
    is_hazardous: false,
    requires_serial_tracking: false,
    notes: '',
  });

  const [devices, setDevices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableBrands, setAvailableBrands] = useState([]);

  useEffect(() => {
    if (show) {
      loadDevices();
      loadBrands();
      loadSuppliers();
    }

    if (part) {
      setForm({
        part_name: part.part_name || '',
        part_code: part.part_code || '',
        part_category: part.part_category || 'DISPLAY',
        part_type: part.part_type || '',
        description: part.description || '',
        is_active: part.is_active !== undefined ? Boolean(part.is_active) : true,

        dimensions: part.dimensions || '',
        weight_g: part.weight_g || '',
        color_variants: Array.isArray(part.color_variants) ? part.color_variants.join(', ') : (part.color_variants || ''),

        compatible_product_id: part.compatible_product_id || '',
        compatible_device_category: part.compatible_device_category || '',
        compatible_brands: Array.isArray(part.compatible_brands) ? part.compatible_brands.join(', ') : (part.compatible_brands || ''),
        compatible_models: Array.isArray(part.compatible_models) ? part.compatible_models.join(', ') : (part.compatible_models || ''),

        manufacturer: part.manufacturer || '',
        manufacturer_part_number: part.manufacturer_part_number || '',
        quality_grade: part.quality_grade || 'STANDARD',
        warranty_months: part.warranty_months || 3,

        unit_cost: part.unit_cost || 0,
        unit_price: part.unit_price || 0,
        currency: part.currency || 'USD',

        minimum_stock_level: part.minimum_stock_level || 5,
        max_stock_level: part.max_stock_level || 50,
        reorder_point: part.reorder_point || 10,
        reorder_quantity: part.reorder_quantity || 20,
        lead_time_days: part.lead_time_days || '',
        default_supplier_id: part.default_supplier_id || '',

        is_hazardous: Boolean(part.is_hazardous),
        requires_serial_tracking: Boolean(part.requires_serial_tracking),
        notes: part.notes || '',
      });
    } else {
      // Reset form for new part
      setForm({
        part_name: '',
        part_code: '',
        part_category: 'DISPLAY',
        part_type: '',
        description: '',
        is_active: true,
        dimensions: '',
        weight_g: '',
        color_variants: '',
        compatible_product_id: '',
        compatible_device_category: '',
        compatible_brands: '',
        compatible_models: '',
        manufacturer: '',
        manufacturer_part_number: '',
        quality_grade: 'STANDARD',
        warranty_months: 3,
        unit_cost: 0,
        unit_price: 0,
        currency: 'USD',
        minimum_stock_level: 5,
        max_stock_level: 50,
        reorder_point: 10,
        reorder_quantity: 20,
        lead_time_days: '',
        default_supplier_id: '',
        is_hazardous: false,
        requires_serial_tracking: false,
        notes: '',
      });
    }
  }, [part, show]);

  const loadDevices = async () => {
    try {
      const res = await inventoryAPI.getProducts();
      setDevices(res.data.products || res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to load devices', err);
      setDevices([]);
    }
  };

  const loadBrands = async () => {
    try {
      const res = await suppliersAPI.getBrands();
      setAvailableBrands(res.data.brands || []);
    } catch (err) {
      console.error('Failed to load brands', err);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await suppliersAPI.getAll();
      setSuppliers(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to load suppliers', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((s) => ({
      ...s,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    // Validation
    if (!form.compatible_product_id) {
      setErrors({ compatible_product_id: 'Please select a compatible device' });
      setSaving(false);
      return;
    }

    try {
      // Convert comma-separated strings to arrays for JSON fields
      const submitData = {
        ...form,
        color_variants: form.color_variants ? form.color_variants.split(',').map(s => s.trim()).filter(Boolean) : null,
        compatible_brands: form.compatible_brands ? form.compatible_brands.split(',').map(s => s.trim()).filter(Boolean) : null,
        compatible_models: form.compatible_models ? form.compatible_models.split(',').map(s => s.trim()).filter(Boolean) : null,
        weight_g: form.weight_g ? parseFloat(form.weight_g) : null,
        lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null,
        default_supplier_id: form.default_supplier_id || null,
        is_active: form.is_active ? 1 : 0,
        is_hazardous: form.is_hazardous ? 1 : 0,
        requires_serial_tracking: form.requires_serial_tracking ? 1 : 0,
      };

      if (part && (part.spare_part_uuid || part.uuid)) {
        await sparePartsAPI.update(part.spare_part_uuid || part.uuid, submitData);
      } else {
        await sparePartsAPI.create(submitData);
      }
      onSaved && onSaved();
    } catch (err) {
      console.error('Failed saving part', err.response || err);
      alert(err?.response?.data?.message || 'Failed to save spare part');
    } finally {
      setSaving(false);
    }
  };

  // Part type suggestions based on category
  const getPartTypeSuggestions = () => {
    const suggestions = {
      DISPLAY: ['LCD', 'OLED', 'AMOLED', 'Super AMOLED', 'IPS LCD', 'TFT'],
      BATTERY: ['Li-Ion', 'Li-Po', 'Original', 'High Capacity'],
      CAMERA_REAR: ['Single', 'Dual', 'Triple', 'Quad', 'Wide', 'Telephoto', 'Macro'],
      CAMERA_FRONT: ['Single', 'Wide', 'Pop-up'],
      CHARGING_PORT: ['USB-C', 'Lightning', 'Micro USB', 'Wireless Charging Coil'],
      SPEAKER: ['Earpiece', 'Loudspeaker', 'Stereo Set'],
      MOTHERBOARD: ['Main Board', 'Logic Board', 'Charging Board'],
    };
    return suggestions[form.part_category] || [];
  };

  return (
    <Modal show={show} onHide={onHide} backdrop="static" size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas ${part ? 'fa-edit' : 'fa-plus-circle'} me-2`}></i>
            {part ? 'Edit Spare Part' : 'Create Spare Part'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Accordion defaultActiveKey={['0', '1']} alwaysOpen>
            {/* Basic Information */}
            <Accordion.Item eventKey="0">
              <Accordion.Header>
                <i className="fas fa-info-circle me-2"></i>
                Basic Information
              </Accordion.Header>
              <Accordion.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Part Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control name="part_name" value={form.part_name} onChange={handleChange} required placeholder="e.g., iPhone 14 Pro Display Assembly" />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Part Code</Form.Label>
                      <Form.Control name="part_code" value={form.part_code} onChange={handleChange} placeholder="Auto-generated" />
                      <Form.Text className="text-muted">Leave blank to auto-generate</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Status</Form.Label>
                      <Form.Select name="is_active" value={form.is_active.toString()} onChange={(e) => setForm(s => ({ ...s, is_active: e.target.value === 'true' }))}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Category</Form.Label>
                      <Form.Select name="part_category" value={form.part_category} onChange={handleChange}>
                        <option value="DISPLAY">Display</option>
                        <option value="BATTERY">Battery</option>
                        <option value="MOTHERBOARD">Motherboard</option>
                        <option value="CAMERA_REAR">Rear Camera</option>
                        <option value="CAMERA_FRONT">Front Camera</option>
                        <option value="CHARGING_PORT">Charging Port</option>
                        <option value="SPEAKER">Speaker</option>
                        <option value="MICROPHONE">Microphone</option>
                        <option value="BUTTON">Button</option>
                        <option value="CASE">Case/Housing</option>
                        <option value="ANTENNA">Antenna</option>
                        <option value="FLEX_CABLE">Flex Cable</option>
                        <option value="OTHER">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Part Type</Form.Label>
                      <Form.Control
                        name="part_type"
                        value={form.part_type}
                        onChange={handleChange}
                        list="part-type-options"
                        placeholder="e.g., OLED, Li-Ion, etc."
                      />
                      <datalist id="part-type-options">
                        {getPartTypeSuggestions().map(type => (
                          <option key={type} value={type} />
                        ))}
                      </datalist>
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-2">
                  <Form.Label>Description</Form.Label>
                  <Form.Control as="textarea" rows={2} name="description" value={form.description} onChange={handleChange} placeholder="Detailed specifications, resolution, etc." />
                </Form.Group>
              </Accordion.Body>
            </Accordion.Item>

            {/* Device Compatibility */}
            <Accordion.Item eventKey="1">
              <Accordion.Header>
                <i className="fas fa-mobile-alt me-2"></i>
                Device Compatibility
              </Accordion.Header>
              <Accordion.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Compatible Device <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="compatible_product_id"
                        value={form.compatible_product_id}
                        onChange={handleChange}
                        required
                        isInvalid={!!errors.compatible_product_id}
                      >
                        <option value="">-- Select a device --</option>
                        {Array.isArray(devices) && devices.map(device => (
                          <option key={device.product_id} value={device.product_id}>
                            {device.device_maker} {device.device_name}
                            {(device.rom || device.ram || device.color) && ` (${[device.rom, device.ram, device.color].filter(Boolean).join(' / ')})`}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">{errors.compatible_product_id}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Device Category</Form.Label>
                      <Form.Control name="compatible_device_category" value={form.compatible_device_category} onChange={handleChange} placeholder="e.g., Flagship, Mid-range" />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Compatible Brands</Form.Label>
                      <Form.Control name="compatible_brands" value={form.compatible_brands} onChange={handleChange} placeholder="Apple, Samsung, Xiaomi (comma-separated)" />
                      <Form.Text className="text-muted">Comma-separated list</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Compatible Models</Form.Label>
                      <Form.Control name="compatible_models" value={form.compatible_models} onChange={handleChange} placeholder="iPhone 14, iPhone 14 Pro (comma-separated)" />
                      <Form.Text className="text-muted">Comma-separated list</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>

            {/* Physical Specifications */}
            <Accordion.Item eventKey="2">
              <Accordion.Header>
                <i className="fas fa-ruler-combined me-2"></i>
                Physical Specifications
              </Accordion.Header>
              <Accordion.Body>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Dimensions</Form.Label>
                      <Form.Control name="dimensions" value={form.dimensions} onChange={handleChange} placeholder="e.g., 6.1 inch or 155x71mm" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Weight (g)</Form.Label>
                      <Form.Control type="number" step="0.01" name="weight_g" value={form.weight_g} onChange={handleChange} placeholder="Weight in grams" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Color Variants</Form.Label>
                      <Form.Control name="color_variants" value={form.color_variants} onChange={handleChange} placeholder="Black, White, Silver" />
                      <Form.Text className="text-muted">Comma-separated</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>

            {/* Quality & Warranty */}
            <Accordion.Item eventKey="3">
              <Accordion.Header>
                <i className="fas fa-award me-2"></i>
                Quality & Warranty
              </Accordion.Header>
              <Accordion.Body>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Manufacturer</Form.Label>
                      <Form.Control
                        name="manufacturer"
                        value={form.manufacturer}
                        onChange={handleChange}
                        list="brand-options"
                        placeholder="Select or type..."
                      />
                      <datalist id="brand-options">
                        {Array.isArray(availableBrands) && availableBrands.map(brand => (
                          <option key={brand} value={brand} />
                        ))}
                      </datalist>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Manufacturer Part #</Form.Label>
                      <Form.Control name="manufacturer_part_number" value={form.manufacturer_part_number} onChange={handleChange} placeholder="OEM part number" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Quality Grade</Form.Label>
                      <Form.Select name="quality_grade" value={form.quality_grade} onChange={handleChange}>
                        <option value="OEM">OEM (Original Equipment)</option>
                        <option value="ORIGINAL">Original</option>
                        <option value="PREMIUM">Premium Aftermarket</option>
                        <option value="STANDARD">Standard</option>
                        <option value="ECONOMY">Economy</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Warranty (months)</Form.Label>
                      <Form.Control type="number" name="warranty_months" value={form.warranty_months} onChange={handleChange} />
                    </Form.Group>
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>

            {/* Pricing */}
            <Accordion.Item eventKey="4">
              <Accordion.Header>
                <i className="fas fa-dollar-sign me-2"></i>
                Pricing
              </Accordion.Header>
              <Accordion.Body>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Unit Cost</Form.Label>
                      <Form.Control type="number" step="0.01" name="unit_cost" value={form.unit_cost} onChange={handleChange} />
                      <Form.Text className="text-muted">Your purchase price</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Unit Price</Form.Label>
                      <Form.Control type="number" step="0.01" name="unit_price" value={form.unit_price} onChange={handleChange} />
                      <Form.Text className="text-muted">Selling price</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Currency</Form.Label>
                      <Form.Select name="currency" value={form.currency} onChange={handleChange}>
                        <option value="USD">USD</option>
                        <option value="VND">VND</option>
                        <option value="EUR">EUR</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>

            {/* Inventory Settings */}
            <Accordion.Item eventKey="5">
              <Accordion.Header>
                <i className="fas fa-boxes me-2"></i>
                Inventory Settings
              </Accordion.Header>
              <Accordion.Body>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Min Stock Level</Form.Label>
                      <Form.Control type="number" name="minimum_stock_level" value={form.minimum_stock_level} onChange={handleChange} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Max Stock Level</Form.Label>
                      <Form.Control type="number" name="max_stock_level" value={form.max_stock_level} onChange={handleChange} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Reorder Point</Form.Label>
                      <Form.Control type="number" name="reorder_point" value={form.reorder_point} onChange={handleChange} />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Reorder Quantity</Form.Label>
                      <Form.Control type="number" name="reorder_quantity" value={form.reorder_quantity} onChange={handleChange} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Lead Time (days)</Form.Label>
                      <Form.Control type="number" name="lead_time_days" value={form.lead_time_days} onChange={handleChange} placeholder="Supplier delivery time" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Default Supplier</Form.Label>
                      <Form.Select name="default_supplier_id" value={form.default_supplier_id} onChange={handleChange}>
                        <option value="">-- Select supplier --</option>
                        {Array.isArray(suppliers) && suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>

            {/* Tracking & Notes */}
            <Accordion.Item eventKey="6">
              <Accordion.Header>
                <i className="fas fa-clipboard-list me-2"></i>
                Tracking & Notes
              </Accordion.Header>
              <Accordion.Body>
                <Row>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      id="is_hazardous"
                      name="is_hazardous"
                      label="Hazardous Material"
                      checked={form.is_hazardous}
                      onChange={handleChange}
                      className="mb-2"
                    />
                    <Form.Text className="text-muted d-block mb-3">Mark if part requires special handling (batteries, etc.)</Form.Text>
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      id="requires_serial_tracking"
                      name="requires_serial_tracking"
                      label="Requires Serial Tracking"
                      checked={form.requires_serial_tracking}
                      onChange={handleChange}
                      className="mb-2"
                    />
                    <Form.Text className="text-muted d-block mb-3">Enable for high-value parts requiring individual tracking</Form.Text>
                  </Col>
                </Row>
                <Form.Group className="mb-2">
                  <Form.Label>Notes</Form.Label>
                  <Form.Control as="textarea" rows={3} name="notes" value={form.notes} onChange={handleChange} placeholder="Additional notes, installation instructions, etc." />
                </Form.Group>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : 'Save Spare Part'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default SparePartForm;
