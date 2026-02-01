import React, { useEffect, useState } from 'react';
import { Modal, Table, Button, Form, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { sparePartsAPI } from '../../services/api';

const DeviceSparePartsManager = ({ show, onHide, productId, deviceName }) => {
  const [compatibleParts, setCompatibleParts] = useState([]);
  const [allParts, setAllParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [formData, setFormData] = useState({
    is_required: false,
    installation_complexity: 'MODERATE',
    estimated_install_time_minutes: 30,
    notes: ''
  });

  useEffect(() => {
    if (show && productId) {
      loadCompatibleParts();
      loadAllParts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, productId]);

  const loadCompatibleParts = async () => {
    setLoading(true);
    try {
      const res = await sparePartsAPI.getCompatibleForDevice(productId);
      const data = res.data?.data || res.data || [];
      setCompatibleParts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load compatible parts', err);
      setCompatibleParts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllParts = async () => {
    try {
      const res = await sparePartsAPI.getAll();
      const data = res.data?.data || res.data || [];
      setAllParts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load all parts', err);
      setAllParts([]);
    }
  };

  const handleAssignPart = () => {
    setShowAssignForm(true);
  };

  const handleSelectPart = (part) => {
    setSelectedPart(part);
    setFormData({
      is_required: false,
      installation_complexity: 'MODERATE',
      estimated_install_time_minutes: 30,
      notes: ''
    });
  };

  const handleSaveAssignment = async () => {
    if (!selectedPart) return;

    try {
      await sparePartsAPI.assignToDevice(productId, {
        spare_part_id: selectedPart.spare_part_id,
        ...formData
      });

      setShowAssignForm(false);
      setSelectedPart(null);
      loadCompatibleParts();
      alert('Spare part assigned successfully!');
    } catch (err) {
      console.error('Failed to assign part', err);
      alert(err?.response?.data?.message || 'Failed to assign spare part');
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm('Remove this spare part assignment?')) return;

    try {
      await sparePartsAPI.removeAssignment(assignmentId);
      loadCompatibleParts();
      alert('Assignment removed successfully!');
    } catch (err) {
      console.error('Failed to remove assignment', err);
      alert('Failed to remove assignment');
    }
  };

  const getComplexityBadge = (complexity) => {
    const map = {
      EASY: 'success',
      MODERATE: 'info',
      DIFFICULT: 'warning',
      EXPERT: 'danger'
    };
    return map[complexity] || 'secondary';
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-link me-2"></i>
          Spare Parts for {deviceName}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {showAssignForm ? (
          <div>
            <h6 className="mb-3">Assign New Spare Part</h6>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Select Spare Part</Form.Label>
                <Form.Select
                  value={selectedPart?.spare_part_id || ''}
                  onChange={(e) => {
                    const part = allParts.find(p => p.spare_part_id === parseInt(e.target.value));
                    handleSelectPart(part);
                  }}
                >
                  <option value="">-- Select a spare part --</option>
                  {Array.isArray(allParts) && allParts.map(part => (
                    <option key={part.spare_part_id} value={part.spare_part_id}>
                      {part.part_code} - {part.part_name} (${part.unit_price})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              {selectedPart && (
                <>
                  <div className="alert alert-info mt-3">
                    <strong>Selected:</strong> {selectedPart.part_name} ({selectedPart.part_code})
                    <br />
                    <small>Price: ${parseFloat(selectedPart.unit_price || 0).toFixed(2)}</small>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label={
                        <span>
                          <strong>Required Part</strong>
                          <small className="text-muted d-block">Essential for device operation</small>
                        </span>
                      }
                      checked={formData.is_required}
                      onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Installation Complexity <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          value={formData.installation_complexity}
                          onChange={(e) => setFormData({ ...formData, installation_complexity: e.target.value })}
                        >
                          <option value="EASY">🟢 Easy</option>
                          <option value="MODERATE">🔵 Moderate</option>
                          <option value="DIFFICULT">🟠 Difficult</option>
                          <option value="EXPERT">🔴 Expert Only</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Install Time <span className="text-danger">*</span>
                        </Form.Label>
                        <div className="input-group">
                          <Form.Control
                            type="number"
                            min="1"
                            value={formData.estimated_install_time_minutes}
                            onChange={(e) => setFormData({ ...formData, estimated_install_time_minutes: parseInt(e.target.value) })}
                          />
                          <span className="input-group-text">min</span>
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Installation Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Special instructions, tools required, compatibility notes..."
                    />
                  </Form.Group>

                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="secondary" onClick={() => {
                      setShowAssignForm(false);
                      setSelectedPart(null);
                    }}>
                      <i className="fas fa-times me-1"></i>Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveAssignment}>
                      <i className="fas fa-check me-1"></i>Save Assignment
                    </Button>
                  </div>
                </>
              )}
            </Form>
          </div>
        ) : (
          <>
            <div className="mb-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Compatible Spare Parts ({compatibleParts.length})</h6>
              <Button variant="success" size="sm" onClick={handleAssignPart}>
                <i className="fas fa-plus me-1"></i>Assign Spare Part
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
              </div>
            ) : (
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Required</th>
                    <th>Complexity</th>
                    <th>Install Time</th>
                    <th>Available</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(compatibleParts) && compatibleParts.map(part => (
                    <tr key={part.spare_part_id}>
                      <td><code>{part.part_code}</code></td>
                      <td>{part.part_name}</td>
                      <td><Badge bg="secondary">{part.part_category}</Badge></td>
                      <td className="text-center">
                        {part.is_required ? (
                          <Badge bg="danger">Required</Badge>
                        ) : (
                          <Badge bg="secondary">Optional</Badge>
                        )}
                      </td>
                      <td>
                        {part.installation_complexity && (
                          <Badge bg={getComplexityBadge(part.installation_complexity)}>
                            {part.installation_complexity}
                          </Badge>
                        )}
                      </td>
                      <td className="text-center">
                        {part.estimated_install_time_minutes ? `${part.estimated_install_time_minutes} min` : '-'}
                      </td>
                      <td className="text-center">
                        <strong className={part.available_quantity === 0 ? 'text-danger' : ''}>
                          {part.available_quantity || 0}
                        </strong>
                      </td>
                      <td>
                        <strong>${parseFloat(part.unit_price || 0).toFixed(2)}</strong>
                      </td>
                      <td>
                        {part.assignment_id && (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleRemoveAssignment(part.assignment_id)}
                          >
                            <i className="fas fa-unlink"></i>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {compatibleParts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center text-muted">
                        No spare parts assigned to this device yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeviceSparePartsManager;
