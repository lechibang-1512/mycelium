import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Modal, Alert, Badge, Spinner } from 'react-bootstrap';
import { warehouseAPI } from '../../api/api';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';

function Warehouses() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Permission checks
  const canWrite = hasPermission(PERMISSIONS.WAREHOUSE_WRITE) || hasPermission(PERMISSIONS.WAREHOUSE_MANAGE);
  const canDelete = hasPermission(PERMISSIONS.WAREHOUSE_DELETE) || hasPermission(PERMISSIONS.WAREHOUSE_MANAGE);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseStats, setWarehouseStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    contact_info: {
      manager_name: '',
      contact_phone: '',
      contact_email: '',
    },
    is_active: true,
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const warehousesRes = await warehouseAPI.getAll();

      const warehouseData = warehousesRes.data.warehouses || warehousesRes.data || [];
      setWarehouses(warehouseData);

      // Fetch bin counts for each warehouse
      const statsMap = {};
      await Promise.all(warehouseData.map(async (wh) => {
        try {
          const binsRes = await warehouseAPI.getBins(wh.warehouse_id);
          const bins = binsRes.data.bins || binsRes.data || [];

          // Calculate unique columns and rows
          const columns = new Set(bins.map(b => b.column_position));
          const rows = new Set(bins.map(b => b.row_position));

          statsMap[wh.warehouse_id] = {
            columns: columns.size,
            rows: rows.size,
            bins: bins.length,
            activeBins: bins.filter(b => b.is_active).length,
          };
        } catch {
          statsMap[wh.warehouse_id] = { columns: 0, rows: 0, bins: 0, activeBins: 0 };
        }
      }));
      setWarehouseStats(statsMap);

      setError('');
    } catch (err) {
      console.error('Error fetching warehouses:', err);
      setError('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('contact_')) {
      const contactField = name.replace('contact_', '');
      setFormData({
        ...formData,
        contact_info: {
          ...formData.contact_info,
          [contactField]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert formData to match backend expectations (camelCase)
      const dataToSend = {
        name: formData.name,
        location: formData.location,
        description: formData.description,
        contactInfo: formData.contact_info, // Convert to camelCase
        isActive: formData.is_active, // Convert to camelCase
      };

      if (editingWarehouse) {
        await warehouseAPI.update(editingWarehouse.warehouse_id, dataToSend);
        setSuccess(`Warehouse "${formData.name}" updated successfully`);
      } else {
        await warehouseAPI.create(dataToSend);
        setSuccess(`Warehouse "${formData.name}" created successfully`);
      }
      fetchWarehouses();
      handleCloseModal();
      setError('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error saving warehouse:', err);
      setError(err.response?.data?.error || 'Failed to save warehouse');
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);

    let contactInfo = warehouse.contact_info;
    if (typeof contactInfo === 'string') {
      try {
        contactInfo = JSON.parse(contactInfo);
      } catch {
        contactInfo = {};
      }
    }

    setFormData({
      name: warehouse.name,
      location: warehouse.location || '',
      description: warehouse.description || '',
      contact_info: {
        manager_name: contactInfo?.manager_name || '',
        contact_phone: contactInfo?.contact_phone || '',
        contact_email: contactInfo?.contact_email || '',
      },
      is_active: warehouse.is_active !== undefined ? warehouse.is_active : true,
    });
    setShowModal(true);
  };

  const handleDelete = async (id, warehouseName) => {
    const confirmed = window.confirm(
      `⚠️ Delete Warehouse: "${warehouseName}"\n\n` +
      `This will PERMANENTLY DELETE the warehouse:\n` +
      `• Warehouse and all zones will be removed\n` +
      `• All inventory will be permanently removed\n` +
      `• This action cannot be undone\n\n` +
      `Note: Deletion will fail if the warehouse has RMA requests or stocktake records.\n\n` +
      `Do you want to proceed?`
    );

    if (confirmed) {
      try {
        setDeleting(id);
        const response = await warehouseAPI.delete(id);

        if (response.data.success) {
          setSuccess('Warehouse deleted successfully. Inventory has been removed.');
          fetchWarehouses();
          setError('');
          setTimeout(() => setSuccess(''), 5000);
        } else {
          setError(response.data.error || 'Failed to delete warehouse');
        }
      } catch (err) {
        console.error('Error deleting warehouse:', err);
        setError(err.response?.data?.error || 'Failed to delete warehouse');
      } finally {
        setDeleting(null);
      }
    }
  };

  const handleToggleActive = async (warehouse) => {
    const action = warehouse.is_active ? 'deactivate' : 'activate';
    const confirmed = window.confirm(
      `${action === 'activate' ? '✅' : '⚠️'} ${action.charAt(0).toUpperCase() + action.slice(1)} Warehouse: "${warehouse.name}"\n\n` +
      (action === 'deactivate'
        ? `This will:\n• Make the warehouse inactive\n• Prevent new inventory operations\n• Keep all existing inventory in place\n\nYou can reactivate it later.`
        : `This will:\n• Make the warehouse active again\n• Allow inventory operations\n• Restore all zones to their previous state`
      ) +
      `\n\nDo you want to proceed?`
    );

    if (confirmed) {
      try {
        setDeleting(warehouse.warehouse_id); // Reuse deleting state for loading

        if (action === 'activate') {
          await warehouseAPI.activate(warehouse.warehouse_id);
          setSuccess(`Warehouse "${warehouse.name}" activated successfully`);
        } else {
          await warehouseAPI.deactivate(warehouse.warehouse_id);
          setSuccess(`Warehouse "${warehouse.name}" deactivated successfully`);
        }

        fetchWarehouses();
        setError('');
        setTimeout(() => setSuccess(''), 5000);
      } catch (err) {
        console.error(`Error ${action}ing warehouse:`, err);
        setError(err.response?.data?.error || `Failed to ${action} warehouse`);
      } finally {
        setDeleting(null);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingWarehouse(null);
    setFormData({
      name: '',
      location: '',
      description: '',
      contact_info: {
        manager_name: '',
        contact_phone: '',
        contact_email: '',
      },
      is_active: true,
    });
  };

  const handleAddNew = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      location: '',
      description: '',
      contact_info: {
        manager_name: '',
        contact_phone: '',
        contact_email: '',
      },
      is_active: true,
    });
    setShowModal(true);
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="fas fa-warehouse me-2"></i>
            Warehouse Management
          </h2>
          <p className="text-muted">Manage warehouses, zones, and inventory distribution</p>
        </Col>
        {canWrite && (
          <Col md="auto">
            <Button
              variant="success"
              onClick={handleAddNew}
            >
              <i className="fas fa-plus me-2"></i>
              Add Warehouse
            </Button>
          </Col>
        )}
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          <i className="fas fa-check-circle me-2"></i>
          {success}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading warehouses...</p>
        </div>
      ) : warehouses.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-warehouse fa-4x text-muted mb-3"></i>
            <h4>No warehouses found</h4>
            <p className="text-muted">Get started by adding your first warehouse</p>
            <Button variant="primary" onClick={handleAddNew}>
              <i className="fas fa-plus me-2"></i>
              Add Your First Warehouse
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {warehouses.map((warehouse) => {
            const stats = warehouseStats[warehouse.warehouse_id] || { zones: 0, inventory: 0 };
            let contactInfo = warehouse.contact_info;
            if (typeof contactInfo === 'string') {
              try {
                contactInfo = JSON.parse(contactInfo);
              } catch {
                contactInfo = {};
              }
            }

            return (
              <Col key={warehouse.warehouse_id} md={6} lg={4} className="mb-4">
                <Card className="h-100 shadow-sm hover-shadow">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="flex-grow-1">
                        <h4 className="mb-1">{warehouse.name}</h4>
                        <Badge bg={warehouse.is_active ? 'success' : 'secondary'}>
                          {warehouse.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="btn-group" role="group">
                        {canWrite && (
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleEdit(warehouse)}
                            disabled={deleting === warehouse.warehouse_id}
                            title="Edit warehouse details"
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                        )}
                        {canWrite && (
                          <Button
                            size="sm"
                            variant={warehouse.is_active ? 'outline-warning' : 'outline-success'}
                            onClick={() => handleToggleActive(warehouse)}
                            disabled={deleting === warehouse.warehouse_id}
                            title={warehouse.is_active ? 'Deactivate warehouse' : 'Activate warehouse'}
                          >
                            {deleting === warehouse.warehouse_id ? (
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                              />
                            ) : (
                              <i className={`fas fa-${warehouse.is_active ? 'ban' : 'check-circle'}`}></i>
                            )}
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDelete(warehouse.warehouse_id, warehouse.name)}
                            disabled={deleting === warehouse.warehouse_id || !warehouse.is_active}
                            title={warehouse.is_active ? 'Delete warehouse - Inventory will be permanently removed' : 'Warehouse must be active to delete'}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-muted small mb-2">
                        <i className="fas fa-map-marker-alt me-2"></i>
                        {warehouse.location || 'No location specified'}
                      </div>
                      {warehouse.description && (
                        <div className="text-muted small">
                          {warehouse.description}
                        </div>
                      )}
                    </div>

                    <hr />

                    <Row className="text-center mb-3">
                      <Col xs={4}>
                        <div className="text-muted small">Columns</div>
                        <h4 className="mb-0 text-primary">{stats.columns || 0}</h4>
                      </Col>
                      <Col xs={4}>
                        <div className="text-muted small">Rows</div>
                        <h4 className="mb-0 text-info">{stats.rows || 0}</h4>
                      </Col>
                      <Col xs={4}>
                        <div className="text-muted small">Bins</div>
                        <h4 className="mb-0 text-success">{stats.bins || 0}</h4>
                      </Col>
                    </Row>

                    {contactInfo && (contactInfo.manager_name || contactInfo.contact_phone || contactInfo.contact_email) && (
                      <>
                        <hr />
                        <div className="small">
                          {contactInfo.manager_name && (
                            <div className="mb-1">
                              <i className="fas fa-user me-2 text-muted"></i>
                              {contactInfo.manager_name}
                            </div>
                          )}
                          {contactInfo.contact_phone && (
                            <div className="mb-1">
                              <i className="fas fa-phone me-2 text-muted"></i>
                              {contactInfo.contact_phone}
                            </div>
                          )}
                          {contactInfo.contact_email && (
                            <div className="mb-1">
                              <i className="fas fa-envelope me-2 text-muted"></i>
                              {contactInfo.contact_email}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <Button
                      variant="outline-primary"
                      className="w-100 mt-3"
                      onClick={() => navigate(`/warehouses/${warehouse.warehouse_id}`)}
                    >
                      <i className="fas fa-eye me-2"></i>
                      View Details
                    </Button>
                  </Card.Body>
                  <Card.Footer className="text-muted small">
                    <i className="fas fa-clock me-1"></i>
                    Created {new Date(warehouse.created_at).toLocaleDateString()}
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Warehouse Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter warehouse name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Location <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter location address"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter warehouse description (optional)"
              />
            </Form.Group>

            <hr />
            <h6 className="mb-3">Contact Information</h6>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Manager Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="contact_manager_name"
                    value={formData.contact_info.manager_name}
                    onChange={handleInputChange}
                    placeholder="Enter manager name (optional)"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Contact Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    name="contact_contact_phone"
                    value={formData.contact_info.contact_phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number (optional)"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Contact Email</Form.Label>
              <Form.Control
                type="email"
                name="contact_contact_email"
                value={formData.contact_info.contact_email}
                onChange={handleInputChange}
                placeholder="Enter email (optional)"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                label="Active"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <i className={`fas fa-${editingWarehouse ? 'save' : 'plus'} me-2`}></i>
              {editingWarehouse ? 'Update' : 'Create'} Warehouse
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default Warehouses;
