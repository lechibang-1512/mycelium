import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Spinner, Badge, Button, Tabs, Tab, Form, InputGroup, Alert } from 'react-bootstrap';
import { repairJobsAPI, sparePartsAPI, rmaAPI } from '../../services/api';
import CustomerHistoryModal from './CustomerHistoryModal';

const RepairJobDetail = ({ repairJobId, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [spareParts, setSpareParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addingPart, setAddingPart] = useState(false);
  const [linkedRMAs, setLinkedRMAs] = useState([]);  // Official links from rma_repair_job_links table
  const [relatedRMAs, setRelatedRMAs] = useState([]); // Suggested by device identifier matching

  // Status history and customer history
  const [statusHistory, setStatusHistory] = useState([]);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [attachmentCategory, setAttachmentCategory] = useState('BEFORE_REPAIR');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');

  // Inventory feedback state
  const [inventoryMessage, setInventoryMessage] = useState(null); // { type: 'success'|'warning'|'danger', text: '...' }
  const [partInventory, setPartInventory] = useState({}); // Map of spare_part_id -> available quantity


  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      try {
        const res = await repairJobsAPI.getById(repairJobId);
        setDetail(res.data);
      } catch (e) {
        console.error('Failed to load repair job detail', e);
      } finally {
        setLoading(false);
      }
    };

    const loadSpareParts = async () => {
      try {
        const res = await sparePartsAPI.getAll();
        const parts = res.data.data || [];
        setSpareParts(parts);

        // Build inventory map: spare_part_id -> total available quantity
        const inventoryMap = {};
        for (const part of parts) {
          // Sum up quantity_on_hand from all inventory records for this part
          const totalQty = part.available_quantity || 0;
          inventoryMap[part.spare_part_id] = totalQty;
        }
        setPartInventory(inventoryMap);
      } catch (e) {
        console.error('Failed to load spare parts', e);
      }
    };

    // Load official linked RMAs from rma_repair_job_links table
    const loadLinkedRMAs = async () => {
      try {
        const res = await repairJobsAPI.getLinkedRMAs(repairJobId);
        const data = res.data?.data || res.data || [];
        setLinkedRMAs(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load linked RMAs', e);
        setLinkedRMAs([]);
      }
    };

    // Load status history
    const loadStatusHistory = async () => {
      try {
        const res = await repairJobsAPI.getStatusHistory(repairJobId);
        setStatusHistory(res.data.data || []);
      } catch (e) {
        console.error('Failed to load status history', e);
        setStatusHistory([]);
      }
    };

    // Load attachments
    const loadAttachments = async () => {
      try {
        const res = await repairJobsAPI.getAttachments(repairJobId);
        setAttachments(res.data.data || []);
      } catch (e) {
        console.error('Failed to load attachments', e);
        setAttachments([]);
      }
    };

    if (repairJobId) {
      loadDetail();
      loadSpareParts();
      loadLinkedRMAs();
      loadStatusHistory();
      loadAttachments();
    }
  }, [repairJobId]);

  // Load related/suggested RMAs by device identifier matching when detail is available
  useEffect(() => {
    const loadRelatedRMAs = async () => {
      try {
        // Search for RMAs with matching device identifiers
        const searchParams = {};
        if (detail?.device_imei) {
          searchParams.device_imei = detail.device_imei;
        } else if (detail?.device_serial_number) {
          searchParams.serial_number = detail.device_serial_number;
        } else if (detail?.device_name) {
          searchParams.device_name = detail.device_name;
        }

        if (Object.keys(searchParams).length > 0) {
          const res = await rmaAPI.getAll(searchParams);
          const rmas = Array.isArray(res.data) ? res.data : [];
          // Filter out RMAs that are already linked (to avoid duplication)
          const linkedRmaIds = new Set(linkedRMAs.map(lr => lr.rma_id));
          setRelatedRMAs(rmas.filter(r => !linkedRmaIds.has(r.rma_id)));
        } else {
          setRelatedRMAs([]);
        }
      } catch (e) {
        console.error('Failed to load related RMAs', e);
        setRelatedRMAs([]);
      }
    };

    if (detail) {
      loadRelatedRMAs();
    }
  }, [detail]); // Removed linkedRMAs to prevent infinite loop

  const handleAddPart = async () => {
    if (!selectedPart || quantity < 1) return;

    // Get part details for feedback message
    const part = spareParts.find(p => p.spare_part_id === parseInt(selectedPart));
    const availableQty = partInventory[selectedPart] || 0;

    setAddingPart(true);
    setInventoryMessage(null);

    try {
      await repairJobsAPI.addPart(repairJobId, {
        spare_part_id: selectedPart,
        quantity_used: quantity,
      });

      // Reload detail and spare parts to get updated inventory
      const [detailRes] = await Promise.all([
        repairJobsAPI.getById(repairJobId),
        sparePartsAPI.getAll().then(res => {
          const parts = res.data.data || [];
          setSpareParts(parts);
          const inventoryMap = {};
          for (const p of parts) {
            const totalQty = (p.inventory || []).reduce((sum, inv) => sum + (inv.quantity_on_hand || 0), 0);
            inventoryMap[p.spare_part_id] = totalQty;
          }
          setPartInventory(inventoryMap);
        })
      ]);

      setDetail(detailRes.data);

      // Show success message with inventory details
      const remainingQty = (partInventory[selectedPart] || availableQty) - quantity;
      setInventoryMessage({
        type: remainingQty <= 5 ? 'warning' : 'success',
        text: `✓ Part added successfully. Inventory reduced by ${quantity} unit${quantity > 1 ? 's' : ''} (${Math.max(0, remainingQty)} remaining)${remainingQty <= 5 && remainingQty > 0 ? ' - Low stock!' : ''}`
      });

      // Auto-dismiss after 5 seconds
      setTimeout(() => setInventoryMessage(null), 5000);

      setSelectedPart('');
      setQuantity(1);
    } catch (err) {
      console.error('Failed to add part', err);
      const errorMsg = err?.response?.data?.message || 'Failed to add part to repair job';
      setInventoryMessage({
        type: 'danger',
        text: `✗ ${errorMsg}`
      });
    } finally {
      setAddingPart(false);
    }
  };

  const handleRemovePart = async (usageId) => {
    // Find the part being removed for feedback
    const parts = detail.parts || detail.parts_used || detail.job?.parts_used || [];
    const partToRemove = parts.find(p => p.usage_id === usageId);

    if (!window.confirm('Remove this part from the repair job? Inventory will be restored.')) return;

    setInventoryMessage(null);

    try {
      await repairJobsAPI.removePart(repairJobId, usageId);

      // Reload detail and spare parts to get updated inventory
      const [detailRes] = await Promise.all([
        repairJobsAPI.getById(repairJobId),
        sparePartsAPI.getAll().then(res => {
          const parts = res.data.data || [];
          setSpareParts(parts);
          const inventoryMap = {};
          for (const p of parts) {
            const totalQty = (p.inventory || []).reduce((sum, inv) => sum + (inv.quantity_on_hand || 0), 0);
            inventoryMap[p.spare_part_id] = totalQty;
          }
          setPartInventory(inventoryMap);
        })
      ]);

      setDetail(detailRes.data);

      // Show success message about inventory restoration
      if (partToRemove) {
        setInventoryMessage({
          type: 'success',
          text: `✓ Part removed. Inventory restored: +${partToRemove.quantity_used} unit${partToRemove.quantity_used > 1 ? 's' : ''} of ${partToRemove.part_name}`
        });
        setTimeout(() => setInventoryMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to remove part', err);
      setInventoryMessage({
        type: 'danger',
        text: `✗ ${err?.response?.data?.message || 'Failed to remove part'}`
      });
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete repair job ${job.job_number}? This action cannot be undone.`)) {
      try {
        await repairJobsAPI.delete(repairJobId, true);
        onSaved?.();
      } catch (error) {
        console.error('Failed to delete repair job:', error);
        alert('Failed to delete repair job');
      }
    }
  };

  // Edit mode handlers
  const handleStartEdit = () => {
    const j = detail.job || detail.data || detail;
    setEditForm({
      customer_name: j.customer_name || '',
      customer_email: j.customer_email || '',
      customer_phone: j.customer_phone || '',
      customer_address: j.customer_address || '',
      device_name: j.device_name || '',
      device_serial_number: j.device_serial_number || '',
      device_imei: j.device_imei || '',
      issue_description: j.issue_description || '',
      diagnosis: j.diagnosis || '',
      repair_notes: j.repair_notes || '',
      status: j.status || 'PENDING',
      priority: j.priority || 'NORMAL',
      estimated_cost: j.estimated_cost || 0,
      labor_cost: j.labor_cost || 0,
      assigned_technician: j.assigned_technician || '',
      estimated_completion_date: j.estimated_completion_date ? j.estimated_completion_date.split('T')[0] : '',
      warranty_months: j.warranty_months || 3,
    });
    setEditError('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editForm.customer_name || !editForm.issue_description) {
      setEditError('Customer name and issue description are required');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      await repairJobsAPI.update(repairJobId, editForm);
      // Reload detail
      const res = await repairJobsAPI.getById(repairJobId);
      setDetail(res.data);
      setIsEditing(false);
      onSaved?.();
    } catch (err) {
      console.error('Failed to update repair job:', err);
      setEditError(err?.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="text-center py-4"><Spinner animation="border" /></div>;
  if (!detail) return <div className="text-center py-4 text-muted">Repair job not found</div>;

  // Handle both API response formats - newer format returns flat data with parts_used
  const job = detail.job || detail.data || detail;
  const parts = detail.parts || detail.parts_used || job.parts_used || [];

  const getStatusBadge = (status) => {
    const map = {
      PENDING: 'secondary',
      PARTS_ORDERED: 'warning',
      IN_PROGRESS: 'primary',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return map[status] || 'secondary';
  };

  const getPriorityBadge = (priority) => {
    const map = {
      LOW: 'secondary',
      MEDIUM: 'info',
      HIGH: 'warning',
      URGENT: 'danger',
    };
    return map[priority] || 'secondary';
  };

  return (
    <div>
      {editError && <Alert variant="danger" className="mb-3">{editError}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-4 p-4 bg-white rounded shadow-sm border-start border-4 border-primary">
        <div>
          <h4 className="mb-0 fw-bold text-dark">Repair Job: {job.job_number}</h4>
          <div className="text-muted small">{isEditing ? 'Editing Mode' : 'Status & Priority'}</div>
        </div>
        <div className="d-flex align-items-center gap-3">
          {isEditing ? (
            <>
              <Form.Select
                name="status"
                value={editForm.status}
                onChange={handleEditChange}
                style={{ width: 'auto' }}
                className="fw-bold"
              >
                <option value="PENDING">Pending</option>
                <option value="PARTS_ORDERED">Parts Ordered</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </Form.Select>
              <Form.Select
                name="priority"
                value={editForm.priority}
                onChange={handleEditChange}
                style={{ width: 'auto' }}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Form.Select>
              <div className="vr mx-2"></div>
              <Button variant="success" className="shadow-sm fw-bold" onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Spinner size="sm" animation="border" className="me-2" /> : <i className="fas fa-save me-2"></i>}
                Save
              </Button>
              <Button variant="secondary" className="shadow-sm" onClick={handleCancelEdit} disabled={saving}>
                <i className="fas fa-times me-2"></i>Cancel
              </Button>
            </>
          ) : (
            <>
              <Badge bg={getStatusBadge(job.status)} className="fs-6 px-3 py-2 rounded-pill shadow-sm">
                {job.status.replace(/_/g, ' ')}
              </Badge>
              <Badge bg={getPriorityBadge(job.priority)} className="fs-6 px-3 py-2 rounded-pill opacity-75">
                {job.priority}
              </Badge>
              <div className="vr mx-2"></div>
              <Button variant="primary" className="shadow-sm fw-bold" onClick={handleStartEdit}>
                <i className="fas fa-edit me-2"></i>Edit Job
              </Button>
              <Button variant="light" className="shadow-sm border fw-bold text-danger ms-2" onClick={handleDelete}>
                <i className="fas fa-trash me-2"></i>Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-3 text-primary">
                <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                  <i className="fas fa-mobile-alt fa-lg"></i>
                </div>
                <h6 className="mb-0 fw-bold text-uppercase ls-1">Device Info</h6>
              </div>

              {isEditing ? (
                <>
                  <Form.Group className="mb-2">
                    <Form.Label className="small text-muted mb-1">Device Name</Form.Label>
                    <Form.Control size="sm" name="device_name" value={editForm.device_name} onChange={handleEditChange} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label className="small text-muted mb-1">Serial Number</Form.Label>
                    <Form.Control size="sm" name="device_serial_number" value={editForm.device_serial_number} onChange={handleEditChange} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label className="small text-muted mb-1">IMEI <Badge bg="secondary" style={{ fontSize: '0.6rem' }}>Optional</Badge></Form.Label>
                    <Form.Control size="sm" name="device_imei" value={editForm.device_imei} onChange={handleEditChange} placeholder="Can be added later" />
                  </Form.Group>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <small className="text-muted d-block uppercase fw-bold" style={{ fontSize: '0.75rem' }}>DEVICE NAME</small>
                    <div className="fw-bold">{job.device_name || 'N/A'}</div>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block uppercase fw-bold" style={{ fontSize: '0.75rem' }}>SERIAL NUMBER</small>
                    <div className="font-monospace bg-light p-1 rounded d-inline-block px-2">{job.device_serial_number || 'N/A'}</div>
                  </div>
                  {job.device_imei && (
                    <div className="mb-3">
                      <small className="text-muted d-block uppercase fw-bold" style={{ fontSize: '0.75rem' }}>IMEI</small>
                      <div className="font-monospace bg-light p-1 rounded d-inline-block px-2">{job.device_imei}</div>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-3 text-info">
                <div className="bg-info bg-opacity-10 p-2 rounded-circle me-3">
                  <i className="fas fa-user fa-lg"></i>
                </div>
                <h6 className="mb-0 fw-bold text-uppercase ls-1">Customer</h6>
              </div>

              {isEditing ? (
                <>
                  <Form.Group className="mb-2">
                    <Form.Label className="small text-muted mb-1">Name *</Form.Label>
                    <Form.Control size="sm" name="customer_name" value={editForm.customer_name} onChange={handleEditChange} required />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label className="small text-muted mb-1">Email</Form.Label>
                    <Form.Control size="sm" type="email" name="customer_email" value={editForm.customer_email} onChange={handleEditChange} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label className="small text-muted mb-1">Phone</Form.Label>
                    <Form.Control size="sm" name="customer_phone" value={editForm.customer_phone} onChange={handleEditChange} />
                  </Form.Group>
                </>
              ) : (
                <>
                  <h5 className="mb-1 fw-bold">{job.customer_name}</h5>
                  <div className="d-flex align-items-center text-muted mb-1">
                    <i className="fas fa-envelope me-2 small"></i> {job.customer_email || 'N/A'}
                  </div>
                  <div className="d-flex align-items-center text-muted">
                    <i className="fas fa-phone me-2 small"></i> {job.customer_phone || 'N/A'}
                  </div>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="mt-3 w-100"
                    onClick={() => setShowCustomerHistory(true)}
                  >
                    <i className="fas fa-history me-2"></i>
                    View Customer History
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-3 text-success">
                <div className="bg-success bg-opacity-10 p-2 rounded-circle me-3">
                  <i className="fas fa-tools fa-lg"></i>
                </div>
                <h6 className="mb-0 fw-bold text-uppercase ls-1">Repair Details</h6>
              </div>

              {isEditing ? (
                <>
                  <Form.Group className="mb-2">
                    <Form.Label className="small text-muted mb-1">Estimated Cost ($)</Form.Label>
                    <Form.Control size="sm" type="number" step="0.01" name="estimated_cost" value={editForm.estimated_cost} onChange={handleEditChange} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label className="small text-muted mb-1">Labor Cost ($)</Form.Label>
                    <Form.Control size="sm" type="number" step="0.01" name="labor_cost" value={editForm.labor_cost} onChange={handleEditChange} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label className="small text-muted mb-1">Est. Completion</Form.Label>
                    <Form.Control size="sm" type="date" name="estimated_completion_date" value={editForm.estimated_completion_date} onChange={handleEditChange} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label className="small text-muted mb-1">Technician</Form.Label>
                    <Form.Control size="sm" name="assigned_technician" value={editForm.assigned_technician} onChange={handleEditChange} placeholder="Technician name" />
                  </Form.Group>
                </>
              ) : (
                <>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Estimated Cost</span>
                    <strong className="fs-5">${parseFloat(job.estimated_cost || 0).toFixed(2)}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Labor Cost</span>
                    <strong className="fs-5 text-success">${parseFloat(job.labor_cost || 0).toFixed(2)}</strong>
                  </div>
                  <hr className="my-2 opacity-10" />
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Received</span>
                    <span>{new Date(job.received_date).toLocaleDateString()}</span>
                  </div>
                  {job.assigned_technician && (
                    <div className="d-flex justify-content-between mt-2">
                      <span className="text-muted">Technician</span>
                      <span>{job.assigned_technician}</span>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="p-4">
          {isEditing ? (
            <>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Issue Description *</Form.Label>
                <Form.Control as="textarea" rows={3} name="issue_description" value={editForm.issue_description} onChange={handleEditChange} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Diagnosis</Form.Label>
                <Form.Control as="textarea" rows={2} name="diagnosis" value={editForm.diagnosis} onChange={handleEditChange} placeholder="Diagnosis findings..." />
              </Form.Group>
              <Form.Group>
                <Form.Label className="fw-bold">Repair Notes</Form.Label>
                <Form.Control as="textarea" rows={2} name="repair_notes" value={editForm.repair_notes} onChange={handleEditChange} placeholder="Notes about the repair..." />
              </Form.Group>
            </>
          ) : (
            <>
              <h6 className="text-muted fw-bold text-uppercase mb-3 small">Issue Description</h6>
              <div className="bg-light p-3 rounded text-dark">
                {job.issue_description}
              </div>
              {job.diagnosis && (
                <>
                  <h6 className="text-muted fw-bold text-uppercase mb-3 mt-4 small">Diagnosis</h6>
                  <div className="bg-light p-3 rounded text-dark">
                    {job.diagnosis}
                  </div>
                </>
              )}
              {job.repair_notes && (
                <>
                  <h6 className="text-muted fw-bold text-uppercase mb-3 mt-4 small">Repair Notes</h6>
                  <div className="bg-light p-3 rounded text-muted fst-italic">
                    {job.repair_notes}
                  </div>
                </>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      <Tabs defaultActiveKey="parts" className="mb-3">
        <Tab eventKey="parts" title={`Parts Used (${parts.length})`}>
          {/* Inventory Feedback Alert */}
          {inventoryMessage && (
            <Alert
              variant={inventoryMessage.type}
              dismissible
              onClose={() => setInventoryMessage(null)}
              className="mb-3"
            >
              <div className="d-flex align-items-center">
                <i className={`fas fa-${inventoryMessage.type === 'success' ? 'check-circle' : inventoryMessage.type === 'warning' ? 'exclamation-triangle' : 'times-circle'} me-2`}></i>
                <span>{inventoryMessage.text}</span>
              </div>
            </Alert>
          )}

          <Card>
            <Card.Header>
              <h6 className="mb-0">Add Spare Part</h6>
            </Card.Header>
            <Card.Body>
              <Row className="align-items-end">
                <Col md={6}>
                  <Form.Group className="mb-2">
                    <Form.Label>Spare Part</Form.Label>
                    <Form.Select
                      value={selectedPart}
                      onChange={(e) => setSelectedPart(e.target.value)}
                      disabled={addingPart}
                    >
                      <option value="">-- Select Part --</option>
                      {spareParts.map((p) => {
                        const availableQty = partInventory[p.spare_part_id] || 0;
                        const isOutOfStock = availableQty === 0;
                        const isLowStock = availableQty > 0 && availableQty <= 5;

                        return (
                          <option
                            key={p.spare_part_id}
                            value={p.spare_part_id}
                            disabled={isOutOfStock}
                          >
                            {p.part_code} - {p.part_name} (${parseFloat(p.unit_cost || p.unit_price || 0).toFixed(2)})
                            {isOutOfStock ? ' [OUT OF STOCK]' : isLowStock ? ` [${availableQty} left - LOW STOCK]` : ` [${availableQty} available]`}
                          </option>
                        );
                      })}
                    </Form.Select>
                    {selectedPart && (() => {
                      const availableQty = partInventory[selectedPart] || 0;
                      const isLowStock = availableQty > 0 && availableQty <= 5;
                      return isLowStock && (
                        <Form.Text className="text-warning">
                          <i className="fas fa-exclamation-triangle me-1"></i>
                          Low stock warning: Only {availableQty} unit{availableQty !== 1 ? 's' : ''} available
                        </Form.Text>
                      );
                    })()}
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-2">
                    <Form.Label>Quantity</Form.Label>
                    <Form.Control type="number" min="1" value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Button variant="success" className="w-100 mb-2" onClick={handleAddPart} disabled={addingPart || !selectedPart}>
                    <i className="fas fa-plus me-1"></i>Add Part
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Table striped bordered hover responsive size="sm" className="mt-3">
            <thead>
              <tr>
                <th>Part Code</th>
                <th>Part Name</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total</th>
                <th>Installed By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.usage_id}>
                  <td><code>{p.part_code}</code></td>
                  <td>{p.part_name}</td>
                  <td className="text-center">{p.quantity_used}</td>
                  <td>${parseFloat(p.unit_cost || p.unit_price || 0).toFixed(2)}</td>
                  <td>${(parseFloat(p.unit_cost || p.unit_price || 0) * p.quantity_used).toFixed(2)}</td>
                  <td>{p.installed_by || 'N/A'}</td>
                  <td>{p.installed_date ? new Date(p.installed_date).toLocaleString() : 'N/A'}</td>
                  <td>
                    <Button size="sm" variant="outline-danger" onClick={() => handleRemovePart(p.usage_id)}>
                      <i className="fas fa-trash"></i>
                    </Button>
                  </td>
                </tr>
              ))}
              {parts.length === 0 && (
                <tr><td colSpan={8} className="text-center text-muted">No parts used yet</td></tr>
              )}
            </tbody>
          </Table>
        </Tab>

        <Tab eventKey="rmas" title={`RMAs (${linkedRMAs.length + relatedRMAs.length})`}>
          <Card className="mb-3">
            <Card.Header className="bg-success bg-opacity-10">
              <h6 className="mb-0 text-success">
                <i className="fas fa-check-circle me-2"></i>
                Linked RMAs ({linkedRMAs.length})
              </h6>
            </Card.Header>
            <Card.Body>
              {linkedRMAs.length === 0 ? (
                <div className="text-center py-3 text-muted">
                  <i className="fas fa-unlink fa-lg mb-2"></i>
                  <p className="mb-0">No RMA requests officially linked to this repair job.</p>
                </div>
              ) : (
                <Table responsive hover size="sm">
                  <thead>
                    <tr>
                      <th>RMA Number</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Link Reason</th>
                      <th>Linked</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedRMAs.map((rma) => (
                      <tr key={rma.link_id}>
                        <td><code>{rma.rma_number}</code></td>
                        <td>
                          <div>{rma.customer_name}</div>
                          {rma.customer_email && <small className="text-muted">{rma.customer_email}</small>}
                        </td>
                        <td>
                          <Badge bg={rma.rma_status === 'completed' ? 'success' : rma.rma_status === 'pending' ? 'warning' : 'info'}>
                            {rma.rma_status?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="secondary">{rma.link_reason?.replace(/_/g, ' ') || 'linked'}</Badge>
                        </td>
                        <td><small>{new Date(rma.linked_at).toLocaleDateString()}</small></td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => window.open(`/rma/${rma.rma_id}`, '_blank')}
                          >
                            <i className="fas fa-external-link-alt me-1"></i>View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header className="bg-info bg-opacity-10">
              <h6 className="mb-0 text-info">
                <i className="fas fa-search me-2"></i>
                Related RMAs - By Device Match ({relatedRMAs.length})
              </h6>
            </Card.Header>
            <Card.Body>
              {relatedRMAs.length === 0 ? (
                <div className="text-center py-3 text-muted">
                  <i className="fas fa-search fa-lg mb-2"></i>
                  <p className="mb-1">No additional RMA requests found for this device.</p>
                  <small>
                    Searched by: {job.device_imei ? `IMEI (${job.device_imei})` :
                      job.device_serial_number ? `Serial Number (${job.device_serial_number})` :
                        job.device_name ? `Device Name (${job.device_name})` : 'No device identifiers'}
                  </small>
                </div>
              ) : (
                <div>
                  <div className="mb-2">
                    <small className="text-muted">
                      <i className="fas fa-info-circle me-1"></i>
                      Found {relatedRMAs.length} RMA request(s) matching by {job.device_imei ? 'IMEI' : job.device_serial_number ? 'serial number' : 'device name'}.
                      These are not yet linked to this repair job.
                    </small>
                  </div>
                  <Table responsive hover size="sm">
                    <thead>
                      <tr>
                        <th>RMA Number</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Reason</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatedRMAs.map((rma) => (
                        <tr key={rma.rma_id}>
                          <td><code>{rma.rma_number}</code></td>
                          <td>
                            <div>{rma.customer_name}</div>
                            {rma.customer_email && <small className="text-muted">{rma.customer_email}</small>}
                          </td>
                          <td>
                            <Badge bg={rma.status === 'completed' ? 'success' : rma.status === 'pending' ? 'warning' : 'info'}>
                              {rma.status?.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td>
                            <small className="text-muted">
                              {rma.reason_code?.replace(/_/g, ' ') || 'Not specified'}
                            </small>
                          </td>
                          <td>{new Date(rma.created_at).toLocaleDateString()}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => window.open(`/rma/${rma.rma_id}`, '_blank')}
                            >
                              <i className="fas fa-external-link-alt me-1"></i>View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* Status History Tab */}
        <Tab eventKey="status-history" title={<><i className="fas fa-history me-2"></i>Status History</>}>
          <Card>
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <i className="fas fa-clock me-2"></i>
                Status Change Timeline
              </h6>
            </Card.Header>
            <Card.Body>
              {statusHistory.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-inbox fa-3x mb-3 d-block opacity-25"></i>
                  No status changes recorded yet.
                </div>
              ) : (
                <div className="timeline">
                  {statusHistory.map((h, idx) => (
                    <div key={h.history_id} className="d-flex mb-4 pb-3 border-bottom">
                      <div className="me-3">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                          <strong>{idx + 1}</strong>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <Badge bg="secondary" className="me-2">{h.from_status}</Badge>
                            <i className="fas fa-arrow-right mx-2"></i>
                            <Badge bg="primary">{h.to_status}</Badge>
                          </div>
                          <small className="text-muted">
                            {new Date(h.changed_at).toLocaleString()}
                          </small>
                        </div>
                        <div className="text-muted small">
                          <i className="fas fa-user me-1"></i>
                          Changed by: {h.changed_by || 'System'}
                        </div>
                        {h.change_reason && (
                          <div className="mt-2 p-2 bg-light rounded">
                            <small><em><i className="fas fa-comment me-1"></i>{h.change_reason}</em></small>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* Attachments Tab */}
        <Tab eventKey="attachments" title={<><i className="fas fa-paperclip me-2"></i>Attachments</>}>
          <Card>
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <i className="fas fa-images me-2"></i>
                Photos & Documents
              </h6>
            </Card.Header>
            <Card.Body>
              <Row className="mb-4">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      value={attachmentCategory}
                      onChange={(e) => setAttachmentCategory(e.target.value)}
                    >
                      <option value="BEFORE_REPAIR">Before Repair</option>
                      <option value="DURING_REPAIR">During Repair</option>
                      <option value="AFTER_REPAIR">After Repair</option>
                      <option value="DAMAGE">Damage Documentation</option>
                      <option value="RECEIPT">Receipt/Invoice</option>
                      <option value="OTHER">Other</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={8}>
                  <Form.Group>
                    <Form.Label>Upload File</Form.Label>
                    <Form.Control
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      disabled={uploading}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setUploading(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('category', attachmentCategory);
                          await repairJobsAPI.uploadAttachment(repairJobId, formData);
                          // Reload attachments
                          const res = await repairJobsAPI.getAttachments(repairJobId);
                          setAttachments(res.data.data || []);
                          e.target.value = '';
                        } catch (err) {
                          console.error('Upload failed:', err);
                          alert('Failed to upload file');
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                    {uploading && <Spinner size="sm" animation="border" className="ms-2" />}
                  </Form.Group>
                </Col>
              </Row>

              {attachments.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-cloud-upload-alt fa-3x mb-3 d-block opacity-25"></i>
                  No attachments yet. Upload photos or documents above.
                </div>
              ) : (
                <Row className="g-3">
                  {attachments.map((att) => (
                    <Col md={3} key={att.attachment_id}>
                      <Card className="h-100">
                        {att.file_type?.startsWith('image/') ? (
                          <Card.Img
                            variant="top"
                            src={`/api/repair-jobs/${repairJobId}/attachments/${att.attachment_id}`}
                            style={{ height: '150px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="text-center py-4 bg-light">
                            <i className="fas fa-file fa-3x text-muted"></i>
                          </div>
                        )}
                        <Card.Body className="p-2">
                          <small className="d-block text-truncate">{att.original_name}</small>
                          <Badge bg="secondary" className="mt-1">{att.category}</Badge>
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="me-1"
                              onClick={() => window.open(`/api/repair-jobs/${repairJobId}/attachments/${att.attachment_id}`)}
                            >
                              <i className="fas fa-download"></i>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={async () => {
                                if (!window.confirm('Delete this attachment?')) return;
                                try {
                                  await repairJobsAPI.deleteAttachment(repairJobId, att.attachment_id);
                                  setAttachments(attachments.filter(a => a.attachment_id !== att.attachment_id));
                                } catch (err) {
                                  console.error('Delete failed:', err);
                                }
                              }}
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Customer History Modal */}
      <CustomerHistoryModal
        show={showCustomerHistory}
        onHide={() => setShowCustomerHistory(false)}
        customer={{
          name: job?.customer_name,
          email: job?.customer_email,
          phone: job?.customer_phone
        }}
      />
    </div>
  );
};

export default RepairJobDetail;
