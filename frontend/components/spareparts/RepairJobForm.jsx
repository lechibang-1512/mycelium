import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Badge, Card } from 'react-bootstrap';
import { repairJobsAPI, inventoryAPI, deviceSearchAPI, rmaAPI, warehouseAPI } from '../../api/api';

/**
 * Repair Job Form Component - Enhanced
 * 
 * Includes all fields from smartphone_repair_jobs table matching CreateRMAForm layout:
 * - Customer: name, email, phone, address
 * - Device: product_id, device_name, serial, IMEI
 * - Context: issue_description, diagnosis, priority, status
 * - Logistics: warehouse, estimated_completion_date, assigned_technician
 * - Costs: estimated_cost, labor_cost, warranty_months
 */
const RepairJobForm = ({ show, onHide, onSaved, job, initialRMA }) => {
  const [form, setForm] = useState({
    job_number: '',
    product_id: '',
    device_serial_number: '',
    device_name: '',
    device_imei: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    issue_description: '',
    diagnosis: '',
    repair_notes: '',
    estimated_cost: 0,
    labor_cost: 0,
    priority: 'NORMAL',
    status: 'PENDING',
    warehouse_id: '',
    assigned_technician: '',
    estimated_completion_date: '',
    warranty_months: 3,
  });
  const [devices, setDevices] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [relatedRMAs, setRelatedRMAs] = useState([]);
  const [showRMAAlert, setShowRMAAlert] = useState(false);



  // Helper function to prefill form from RMA data
  const prefillFromRMA = async (rmaData) => {
    try {
      let rma = rmaData;
      if (!rmaData.items || !Array.isArray(rmaData.items)) {
        const res = await rmaAPI.getById(rmaData.rma_id);
        rma = res.data;
      }

      const repairItems = rma.items?.filter(i => i.disposition === 'repair') || [];
      const itemsToConsider = repairItems.length > 0 ? repairItems : (rma.items || []);
      const firstItem = itemsToConsider.length > 0 ? itemsToConsider[0] : {};

      let devName = firstItem.device_name ||
        (firstItem.product_maker && firstItem.product_name ?
          `${firstItem.product_maker} ${firstItem.product_name}` : '') ||
        rma.device_name || '';
      let prodId = firstItem.product_id || rma.product_id || '';
      let serial = firstItem.serial_number || rma.serial_number || rma.device_serial_number || '';
      let imei = firstItem.device_imei || rma.device_imei || '';

      let issueDescription = '';
      if (rma.reason_description) {
        issueDescription += `Return Reason: ${rma.reason_description}\n`;
      }
      if (rma.reason_code) {
        issueDescription += `Code: ${rma.reason_code.replace(/_/g, ' ')}\n`;
      }
      if (itemsToConsider.length > 0) {
        issueDescription += '\nItem Details:\n';
        itemsToConsider.forEach((item, idx) => {
          if (itemsToConsider.length > 1) {
            issueDescription += `\nItem ${idx + 1}: ${item.device_name || item.product_name || 'Unknown'}\n`;
          }
          if (item.notes) {
            issueDescription += `- ${item.notes}\n`;
          }
        });
      }
      if (rma.notes) {
        issueDescription += `\nRMA Notes: ${rma.notes}`;
      }

      setForm({
        job_number: `RJ-${Date.now()}`,
        customer_name: rma.customer_name || '',
        customer_email: rma.customer_email || '',
        customer_phone: rma.customer_phone || '',
        customer_address: '',
        device_name: devName,
        product_id: prodId,
        issue_description: issueDescription.trim() || 'Repair needed (from RMA)',
        diagnosis: '',
        repair_notes: '',
        device_serial_number: serial,
        device_imei: imei,
        status: 'PENDING',
        priority: rma.priority === 'urgent' ? 'URGENT' :
          rma.priority === 'high' ? 'HIGH' : 'NORMAL',
        estimated_cost: 0,
        labor_cost: 0,
        warehouse_id: rma.warehouse_id || '',
        assigned_technician: '',
        estimated_completion_date: rma.expected_return_date || '',
        warranty_months: 3,
        rma_id: rma.rma_id,
        rma_item_id: firstItem.item_id || null,
        rma_number: rma.rma_number,
      });
    } catch (e) {
      console.error('Failed to prefill from RMA', e);
    }
  };

  useEffect(() => {
    if (show) {
      loadDevices();
      loadWarehouses();
    }

    if (job) {
      setForm({
        job_number: job.job_number || '',
        product_id: job.product_id || '',
        device_serial_number: job.device_serial_number || '',
        device_name: job.device_name || '',
        device_imei: job.device_imei || '',
        customer_name: job.customer_name || '',
        customer_phone: job.customer_phone || '',
        customer_email: job.customer_email || '',
        customer_address: job.customer_address || '',
        issue_description: job.issue_description || '',
        diagnosis: job.diagnosis || '',
        repair_notes: job.repair_notes || '',
        estimated_cost: job.estimated_cost || 0,
        labor_cost: job.labor_cost || 0,
        priority: job.priority || 'NORMAL',
        status: job.status || 'PENDING',
        warehouse_id: job.warehouse_id || '',
        assigned_technician: job.assigned_technician || '',
        estimated_completion_date: job.estimated_completion_date ? job.estimated_completion_date.split('T')[0] : '',
        warranty_months: job.warranty_months || 3,
      });
    } else if (initialRMA && show) {
      prefillFromRMA(initialRMA);
    } else if (!job && show) {
      setForm({
        job_number: `RJ-${Date.now()}`,
        product_id: '',
        device_serial_number: '',
        device_name: '',
        device_imei: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        customer_address: '',
        issue_description: '',
        diagnosis: '',
        repair_notes: '',
        estimated_cost: 0,
        labor_cost: 0,
        priority: 'NORMAL',
        status: 'PENDING',
        warehouse_id: '',
        assigned_technician: '',
        estimated_completion_date: '',
        warranty_months: 3,
      });
    }
  }, [job, show, initialRMA]);

  const loadDevices = async () => {
    try {
      const res = await inventoryAPI.getProducts();
      setDevices(res.data.products || res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to load devices', err);
      setDevices([]);
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await warehouseAPI.getAll();
      const data = res.data;
      let warehouseData = [];
      if (data) {
        if (Array.isArray(data)) {
          warehouseData = data.filter(w => w.is_active);
        } else if (data.warehouses && Array.isArray(data.warehouses)) {
          warehouseData = data.warehouses.filter(w => w.is_active);
        } else if (data.data && Array.isArray(data.data)) {
          warehouseData = data.data.filter(w => w.is_active);
        }
      }
      setWarehouses(warehouseData);
    } catch (err) {
      console.error('Failed to load warehouses', err);
      setWarehouses([]);
    }
  };



  const handleDeviceSelect = (e) => {
    const productId = e.target.value;
    const device = devices.find(d => d.product_id == productId);

    if (device) {
      setForm(prev => ({
        ...prev,
        product_id: productId,
        device_name: device.device_name || ''
      }));
    } else {
      setForm(prev => ({
        ...prev,
        product_id: productId,
        device_name: ''
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));

    // Search for related RMAs when device identifiers are entered
    if ((name === 'device_imei' || name === 'device_serial_number') && value.length >= 3) {
      searchRelatedRMAs(value, name);
    } else if ((name === 'device_imei' || name === 'device_serial_number') && value.length < 3) {
      setRelatedRMAs([]);
      setShowRMAAlert(false);
    }
  };

  const searchRelatedRMAs = async (value, field) => {
    try {
      const res = await deviceSearchAPI.search(value, field === 'device_imei' ? 'imei' : 'serial');
      const searchData = res.data || {};
      const rmas = searchData.rma_items || [];
      setRelatedRMAs(rmas);
      setShowRMAAlert(rmas.length > 0);
    } catch (error) {
      console.error('Failed to search RMAs:', error);
      setRelatedRMAs([]);
      setShowRMAAlert(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    if (!form.product_id) {
      setErrors({ product_id: 'Please select a device from your catalog' });
      setSaving(false);
      return;
    }
    if (!form.customer_name) {
      setErrors({ customer_name: 'Customer name is required' });
      setSaving(false);
      return;
    }
    if (!form.issue_description) {
      setErrors({ issue_description: 'Issue description is required' });
      setSaving(false);
      return;
    }

    try {
      if (job && job.repair_job_id) {
        await repairJobsAPI.update(job.repair_job_id, form);
      } else {
        await repairJobsAPI.create(form);
      }
      onSaved && onSaved();
    } catch (err) {
      console.error('Failed saving repair job', err.response || err);
      alert(err?.response?.data?.message || 'Failed to save repair job');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} backdrop="static" size="xl">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            <i className="fas fa-wrench me-2"></i>
            {job ? 'Edit Repair Job' : 'Create Repair Job'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {!job && initialRMA && (
            <Alert variant="info" className="mb-3">
              <strong>Auto-filled from RMA #{initialRMA.rma_number}</strong>
              <p className="mb-0 small mt-1">Customer and device information has been pre-filled from the RMA.</p>
            </Alert>
          )}



          <h6 className="mb-3">Customer Information</h6>
          <Row className="mb-4">
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Customer Name <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  name="customer_name"
                  value={form.customer_name}
                  onChange={handleChange}
                  required
                  isInvalid={!!errors.customer_name}
                  placeholder="Enter customer name"
                />
                <Form.Control.Feedback type="invalid">{errors.customer_name}</Form.Control.Feedback>
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="customer_email"
                      value={form.customer_email}
                      onChange={handleChange}
                      placeholder="email@example.com"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="tel"
                      name="customer_phone"
                      value={form.customer_phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group>
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="customer_address"
                  value={form.customer_address}
                  onChange={handleChange}
                  placeholder="Customer address..."
                />
              </Form.Group>
            </Col>
          </Row>

          <h6 className="mb-3 mt-4">Device Information</h6>
          <Row className="mb-4">
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Select Device from Catalog <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  name="product_id"
                  value={form.product_id}
                  onChange={handleDeviceSelect}
                  required
                  isInvalid={!!errors.product_id}
                >
                  <option value="">-- Select device --</option>
                  {Array.isArray(devices) && devices.map(device => (
                    <option key={device.product_id} value={device.product_id}>
                      {device.device_maker} {device.device_name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.product_id}</Form.Control.Feedback>
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Serial Number</Form.Label>
                    <Form.Control
                      name="device_serial_number"
                      value={form.device_serial_number}
                      onChange={handleChange}
                      placeholder="Device serial number"
                    />
                    <Form.Text className="text-muted">Primary identifier for device tracking</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>IMEI Number <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.65rem' }}>Optional</Badge></Form.Label>
                    <Form.Control
                      name="device_imei"
                      value={form.device_imei}
                      onChange={handleChange}
                      placeholder="15-digit IMEI (can be added later)"
                    />
                    <Form.Text className="text-muted">Can be added or updated later</Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group>
                <Form.Label>Device Name</Form.Label>
                <Form.Control
                  name="device_name"
                  value={form.device_name}
                  onChange={handleChange}
                  placeholder="e.g., iPhone 13 Pro"
                />
              </Form.Group>
            </Col>
          </Row>

          {showRMAAlert && relatedRMAs.length > 0 && (
            <Alert variant="warning" className="mb-3">
              Found {relatedRMAs.length} related RMA(s) for this device.
              <Button variant="link" size="sm" onClick={() => setShowRMAAlert(false)}>Dismiss</Button>
            </Alert>
          )}

          <h6 className="mb-3 mt-4">Logistics</h6>
          <Row className="mb-4">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Warehouse</Form.Label>
                <Form.Select
                  name="warehouse_id"
                  value={form.warehouse_id}
                  onChange={handleChange}
                >
                  <option value="">Select Warehouse</option>
                  {Array.isArray(warehouses) && warehouses.map((wh) => (
                    <option key={wh.warehouse_id} value={wh.warehouse_id}>
                      {wh.name} {wh.location ? `- ${wh.location}` : ''}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Assigned Technician</Form.Label>
                <Form.Control
                  name="assigned_technician"
                  value={form.assigned_technician}
                  onChange={handleChange}
                  placeholder="Technician name"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Est. Completion</Form.Label>
                <Form.Control
                  type="date"
                  name="estimated_completion_date"
                  value={form.estimated_completion_date}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <h6 className="mb-3 mt-4">Issue & Repair Details</h6>
          <div className="mb-4">
            <Form.Group className="mb-3">
              <Form.Label>Issue Description <span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="issue_description"
                value={form.issue_description}
                onChange={handleChange}
                required
                isInvalid={!!errors.issue_description}
                placeholder="Describe the issue with the device..."
              />
              <Form.Control.Feedback type="invalid">{errors.issue_description}</Form.Control.Feedback>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Diagnosis</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="diagnosis"
                    value={form.diagnosis}
                    onChange={handleChange}
                    placeholder="Technical diagnosis..."
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Repair Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="repair_notes"
                    value={form.repair_notes}
                    onChange={handleChange}
                    placeholder="Additional repair notes..."
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority</Form.Label>
                  <Form.Select name="priority" value={form.priority} onChange={handleChange}>
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="status" value={form.status} onChange={handleChange}>
                    <option value="PENDING">Pending</option>
                    <option value="PARTS_ORDERED">Parts Ordered</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Est. Cost ($)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    name="estimated_cost"
                    value={form.estimated_cost}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Labor Cost ($)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    name="labor_cost"
                    value={form.labor_cost}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Warranty (Mo.)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="warranty_months"
                    value={form.warranty_months}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Saving...
              </>
            ) : (
              job ? 'Update Repair Job' : 'Create Repair Job'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RepairJobForm;
