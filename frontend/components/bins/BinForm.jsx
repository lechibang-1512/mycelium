import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Button, Alert, Badge } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * Unified BinForm component for creating/editing warehouse bins.
 * Uses hierarchical Column-Row-Bin structure.
 */
function BinForm({
  bin = null,
  warehouseId = null,
  onSubmit,
  onCancel,
  prefilledPositions = null
}) {
  const [formData, setFormData] = useState({
    bin_code: '',
    is_active: true,
    max_capacity: '',
    product_type: 'smartphone',
    // Hierarchical positions (Column → Row → Bin)
    column_position: '',
    row_position: '',
    bin_position: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Initialize form on mount and when bin changes
  useEffect(() => {
    if (bin) {
      // Editing existing bin
      setFormData({
        bin_code: bin.bin_code || '',
        is_active: bin.is_active !== undefined ? bin.is_active : true,
        max_capacity: bin.max_capacity || '',
        product_type: bin.product_type || 'smartphone',
        column_position: bin.column_position || '',
        row_position: bin.row_position || '',
        bin_position: bin.bin_position || '',
        notes: bin.notes || ''
      });
    } else {
      // Creating new bin
      setFormData({
        bin_code: '',
        is_active: true,
        max_capacity: '',
        product_type: 'smartphone',
        column_position: prefilledPositions?.column || prefilledPositions?.column_position || '',
        row_position: prefilledPositions?.row || prefilledPositions?.row_position || '',
        bin_position: prefilledPositions?.bin || prefilledPositions?.bin_position || '',
        notes: ''
      });
    }
    setErrors({});
  }, [bin, prefilledPositions]);

  // Auto-generate bin code when positions change
  useEffect(() => {
    if (formData.column_position && formData.row_position && formData.bin_position) {
      const autoCode = `C${formData.column_position}-R${formData.row_position}-B${formData.bin_position}`;
      if (!formData.bin_code || formData.bin_code.startsWith('C')) {
        setFormData(prev => ({ ...prev, bin_code: autoCode }));
      }
    }
  }, [formData.column_position, formData.row_position, formData.bin_position]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.bin_code?.trim()) {
      newErrors.bin_code = 'Bin code is required';
    }

    if (!formData.column_position?.trim()) {
      newErrors.column_position = 'Column position is required';
    }

    if (!formData.row_position?.trim()) {
      newErrors.row_position = 'Row position is required';
    }

    if (!formData.bin_position?.trim()) {
      newErrors.bin_position = 'Bin position is required';
    }

    if (!formData.product_type) {
      newErrors.product_type = 'Product type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm() && onSubmit) {
      // Clean up form data - remove empty strings for optional fields
      const cleanData = {
        ...formData,
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity, 10) : null,
        notes: formData.notes?.trim() || null
      };
      console.log('BinForm submitting:', cleanData);
      onSubmit(cleanData);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {/* Hierarchical Position Section */}
      <div className="mb-4">
        <div className="d-flex align-items-center mb-3">
          <h6 className="mb-0 me-2">
            <i className="fas fa-th-large me-1"></i>
            Bin Position (Column-Row-Bin)
          </h6>
          <Badge bg="primary" className="small">Required</Badge>
        </div>
        <p className="text-muted small mb-3">
          Organize bins using the hierarchical grid structure: Column → Row → Bin
        </p>

        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Column <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="column_position"
                value={formData.column_position}
                onChange={handleInputChange}
                placeholder="e.g., 1, 2, A"
                isInvalid={!!errors.column_position}
              />
              <Form.Control.Feedback type="invalid">
                {errors.column_position}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Row <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="row_position"
                value={formData.row_position}
                onChange={handleInputChange}
                placeholder="e.g., 1, 2, A"
                isInvalid={!!errors.row_position}
              />
              <Form.Control.Feedback type="invalid">
                {errors.row_position}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Bin <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="bin_position"
                value={formData.bin_position}
                onChange={handleInputChange}
                placeholder="e.g., 1, 2, A"
                isInvalid={!!errors.bin_position}
              />
              <Form.Control.Feedback type="invalid">
                {errors.bin_position}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
      </div>

      {/* Bin Details Section */}
      <div className="mb-4">
        <h6 className="mb-3">
          <i className="fas fa-info-circle me-1"></i>
          Bin Details
        </h6>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Bin Code <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="bin_code"
                value={formData.bin_code}
                onChange={handleInputChange}
                placeholder="Auto-generated from position"
                isInvalid={!!errors.bin_code}
              />
              <Form.Control.Feedback type="invalid">
                {errors.bin_code}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Auto-generated based on position, or enter custom code
              </Form.Text>
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Product Type <span className="text-danger">*</span></Form.Label>
              <Form.Select
                name="product_type"
                value={formData.product_type}
                onChange={handleInputChange}
                isInvalid={!!errors.product_type}
              >
                <option value="smartphone">Smartphones</option>
                <option value="spare_part">Spare Parts</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {errors.product_type}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Max Capacity</Form.Label>
              <Form.Control
                type="number"
                name="max_capacity"
                value={formData.max_capacity}
                onChange={handleInputChange}
                placeholder="Optional"
                min="1"
              />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3 pt-4">
              <Form.Check
                type="checkbox"
                name="is_active"
                label="Active"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Notes</Form.Label>
          <Form.Control
            as="textarea"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={2}
            placeholder="Optional notes about this bin"
          />
        </Form.Group>
      </div>

      {Object.keys(errors).length > 0 && (
        <Alert variant="danger" className="mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Please correct the errors above before submitting.
        </Alert>
      )}

      <div className="d-flex justify-content-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button variant="primary" type="submit">
          <i className="fas fa-save me-1"></i>
          {bin ? 'Update Bin' : 'Create Bin'}
        </Button>
      </div>
    </Form>
  );
}

BinForm.propTypes = {
  bin: PropTypes.object,
  warehouseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  prefilledPositions: PropTypes.object
};

export default BinForm;
