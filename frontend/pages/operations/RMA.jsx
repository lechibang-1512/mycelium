/**
 * RMA (Return Merchandise Authorization) Management Page
 * Comprehensive interface for managing product returns and repair job integration
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Row, Col, Button, Table, Spinner, Badge,
  Modal, Form, Card, Tabs, Tab, ButtonGroup
} from 'react-bootstrap';
import { rmaAPI } from '../../api/api';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';
import CreateRMAForm from '../../components/rma/CreateRMAForm';
import EditRMAForm from '../../components/rma/EditRMAForm';
import RMADetail from '../../components/rma/RMADetail';
import RepairJobForm from '../../components/spareparts/RepairJobForm';

// Inline formatDate (from deleted shared/utils/formatters.js)
const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  const defaultOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', ...options };
  try { return new Date(dateString).toLocaleDateString('en-US', defaultOptions); }
  catch { return 'N/A'; }
};

const RMA = () => {
  const { hasPermission } = useAuth();

  // Permission checks
  const canWrite = hasPermission(PERMISSIONS.RMA_WRITE) || hasPermission(PERMISSIONS.RMA_MANAGE);
  const canDelete = hasPermission(PERMISSIONS.RMA_DELETE) || hasPermission(PERMISSIONS.RMA_MANAGE);
  const canCreateRepair = (hasPermission(PERMISSIONS.REPAIRS_WRITE) || hasPermission(PERMISSIONS.REPAIRS_MANAGE));

  const [rmas, setRmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRMA, setSelectedRMA] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  });
  const [, setMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showCreateRepairModal, setShowCreateRepairModal] = useState(false);

  // Load RMA list
  const loadRMAs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;

      const res = await rmaAPI.getAll(params);
      // Safely extract array from response with multiple fallbacks
      let rmaData = [];
      if (res && res.data) {
        if (Array.isArray(res.data)) {
          rmaData = res.data;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          rmaData = res.data.data;
        } else if (res.data.rmas && Array.isArray(res.data.rmas)) {
          rmaData = res.data.rmas;
        }
      } else if (Array.isArray(res)) {
        rmaData = res;
      }
      setRmas(Array.isArray(rmaData) ? rmaData : []);
    } catch (e) {
      console.error('Failed to load RMAs', e);
      setRmas([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load dashboard metrics - removed (analytics feature disabled)
  const loadMetrics = useCallback(async () => {
    // Dashboard metrics endpoint removed
    // Set empty metrics
    setMetrics({
      total_rmas: 0,
      pending_rmas: 0,
      approved_rmas: 0,
      rejected_rmas: 0,
      completed_rmas: 0,
      urgent_rmas: 0,
      high_priority_rmas: 0,
      total_return_value: 0,
      total_refund_amount: 0,
      avg_processing_days: 0
    });
  }, []);

  useEffect(() => {
    loadRMAs();
    loadMetrics();
  }, [filters, loadRMAs, loadMetrics]);

  const handleViewDetail = async (rmaId) => {
    try {
      const res = await rmaAPI.getById(rmaId);
      const rmaData = res.data || {};
      // Ensure arrays exist
      rmaData.items = Array.isArray(rmaData.items) ? rmaData.items : [];
      rmaData.status_history = Array.isArray(rmaData.status_history) ? rmaData.status_history : [];
      setSelectedRMA(rmaData);
      setShowDetailModal(true);
    } catch (e) {
      console.error('Failed to load RMA details', e);
      alert('Failed to load RMA details');
    }
  };

  const handleStatusChange = async (rmaId, newStatus, reason = '') => {
    try {
      await rmaAPI.updateStatus(rmaId, { status: newStatus, reason });
      loadRMAs();
      if (selectedRMA?.rma_id === rmaId) {
        handleViewDetail(rmaId); // Refresh detail view
      }
      alert('Status updated successfully');
    } catch (e) {
      console.error('Failed to update status', e);
      alert('Failed to update status');
    }
  };

  const handleEditRMA = async (rmaId) => {
    try {
      const res = await rmaAPI.getById(rmaId);
      const rmaData = res.data || {};
      // Ensure arrays exist
      rmaData.items = Array.isArray(rmaData.items) ? rmaData.items : [];
      setSelectedRMA(rmaData);
      setShowEditModal(true);
    } catch (e) {
      console.error('Failed to load RMA for editing', e);
      alert('Failed to load RMA details');
    }
  };

  const handleDeleteRMA = async (rmaId, rmaNumber) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete RMA ${rmaNumber}?\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      await rmaAPI.delete(rmaId);
      alert('RMA deleted successfully');
      loadRMAs();
      if (selectedRMA?.rma_id === rmaId) {
        setShowDetailModal(false);
        setSelectedRMA(null);
      }
    } catch (e) {
      console.error('Failed to delete RMA', e);
      alert(e.response?.data?.error || 'Failed to delete RMA');
    }
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    const map = {
      pending: 'secondary',
      awaiting_return: 'warning',
      processing: 'primary',
      resolved: 'success',
      closed: 'dark'
    };
    return map[status] || 'secondary';
  };

  const getPriorityBadge = (priority) => {
    const map = {
      low: 'secondary',
      medium: 'info',
      high: 'warning',
      urgent: 'danger'
    };
    return map[priority] || 'secondary';
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-1 fw-bold text-dark">
            <i className="fas fa-undo-alt me-2 text-primary opacity-75"></i>
            RMA Management
          </h2>
          <p className="text-muted mb-0">Return Merchandise Authorization & Reverse Logistics</p>
        </Col>
        <Col md="auto" className="d-flex align-items-center">
          {canWrite && (
            <Button variant="primary" size="lg" className="shadow-sm rounded-pill px-4" onClick={() => setShowCreateModal(true)}>
              <i className="fas fa-plus me-2"></i>
              Create RMA
            </Button>
          )}
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        {/* List Tab */}
        <Tab eventKey="list" title={<span><i className="fas fa-list me-1"></i>RMA List</span>}>
          {/* Filters */}
          <Card className="mb-4 glass-card border-0 shadow-lg">
            <Card.Body className="p-4">
              <Row className="g-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="modern-form-label">Status</Form.Label>
                    <Form.Select
                      className="border-2 rounded-3"
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                      <option key="all-statuses" value="">All Statuses</option>
                      <option key="pending" value="pending">Pending</option>
                      <option key="awaiting_return" value="awaiting_return">Awaiting Return</option>
                      <option key="processing" value="processing">Processing</option>
                      <option key="resolved" value="resolved">Resolved</option>
                      <option key="closed" value="closed">Closed</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="modern-form-label">Priority</Form.Label>
                    <Form.Select
                      className="border-2 rounded-3"
                      value={filters.priority}
                      onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    >
                      <option key="all-priorities" value="">All Priorities</option>
                      <option key="low" value="low">Low</option>
                      <option key="medium" value="medium">Medium</option>
                      <option key="high" value="high">High</option>
                      <option key="urgent" value="urgent">Urgent</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="modern-form-label">Search</Form.Label>
                    <div className="search-container">
                      <i className="fas fa-search search-icon"></i>
                      <Form.Control
                        type="text"
                        className="modern-form-control"
                        placeholder="Search by RMA number, customer name, email..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      />
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* RMA Table */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            <Card>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>RMA Number</th>
                      <th>Customer</th>
                      <th>Warehouse</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Items</th>
                      <th>Total Value</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!Array.isArray(rmas) || rmas.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center text-muted">
                          No RMAs found
                        </td>
                      </tr>
                    ) : (
                      rmas.map((rma) => (
                        <tr key={rma.rma_id}>
                          <td>
                            <strong>{rma.rma_number}</strong>
                            <br />
                            <small className="text-muted">{rma.rma_id}</small>
                          </td>
                          <td>
                            {rma.customer_name || '-'}
                            {rma.customer_email && (
                              <>
                                <br />
                                <small className="text-muted">{rma.customer_email}</small>
                              </>
                            )}
                          </td>
                          <td>
                            <div>
                              <strong>{rma.warehouse_name || '-'}</strong>
                              {rma.warehouse_location && (
                                <>
                                  <br />
                                  <small className="text-muted">
                                    <i className="fas fa-map-marker-alt me-1"></i>
                                    {rma.warehouse_location}
                                  </small>
                                </>
                              )}
                              {rma.quarantine_zone_name && (
                                <>
                                  <br />
                                  <Badge bg="secondary" className="mt-1">
                                    {rma.quarantine_zone_name}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <Badge bg={getStatusBadge(rma.status)}>
                              {rma.status.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={getPriorityBadge(rma.priority)}>
                              {rma.priority.toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            {rma.items_count || 0} items
                            <br />
                            <small className="text-muted">
                              {rma.total_quantity_requested || 0} qty
                            </small>
                          </td>
                          <td>{formatCurrency(rma.total_value)}</td>
                          <td>{formatDate(rma.created_at)}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                variant="light"
                                size="sm"
                                className="text-primary shadow-sm border"
                                onClick={() => handleViewDetail(rma.rma_id)}
                                title="View Details"
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                              {canWrite && (
                                <Button
                                  variant="light"
                                  size="sm"
                                  className="text-dark shadow-sm border"
                                  onClick={() => handleEditRMA(rma.rma_id)}
                                  title="Edit RMA"
                                  disabled={rma.status === 'closed'}
                                >
                                  <i className="fas fa-edit"></i>
                                </Button>
                              )}
                              {canCreateRepair && ['awaiting_return', 'processing'].includes(rma.status) && (
                                <Button
                                  variant="light"
                                  size="sm"
                                  className="text-success shadow-sm border"
                                  onClick={async () => {
                                    try {
                                      const res = await rmaAPI.getById(rma.rma_id);
                                      const rmaData = res.data || {};
                                      rmaData.items = Array.isArray(rmaData.items) ? rmaData.items : [];
                                      setSelectedRMA(rmaData);
                                      setShowCreateRepairModal(true);
                                    } catch (e) {
                                      console.error('Failed to load RMA for repair job', e);
                                      alert('Failed to load RMA details');
                                    }
                                  }}
                                  title="Create Repair Job from this RMA"
                                >
                                  <i className="fas fa-wrench"></i>
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="light"
                                  size="sm"
                                  className="text-danger shadow-sm border"
                                  onClick={() => handleDeleteRMA(rma.rma_id, rma.rma_number)}
                                  title="Delete RMA"
                                  disabled={rma.status === 'completed'}
                                >
                                  <i className="fas fa-trash"></i>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </Tab>
      </Tabs>

      {/* Create RMA Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New RMA</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CreateRMAForm
            onSuccess={() => {
              setShowCreateModal(false);
              loadRMAs();
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal.Body>
      </Modal>

      {/* Edit RMA Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit RMA: {selectedRMA?.rma_number}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRMA && (
            <EditRMAForm
              rma={selectedRMA}
              onSuccess={() => {
                setShowEditModal(false);
                loadRMAs();
                if (showDetailModal && selectedRMA) {
                  handleViewDetail(selectedRMA.rma_id);
                }
              }}
              onCancel={() => setShowEditModal(false)}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* RMA Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            RMA Details: {selectedRMA?.rma_number}
            <div className="float-end">
              <ButtonGroup size="sm" className="ms-3">
                {canWrite && (
                  <Button
                    variant="warning"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEditRMA(selectedRMA.rma_id);
                    }}
                    disabled={selectedRMA?.status === 'completed' || selectedRMA?.status === 'cancelled'}
                  >
                    <i className="fas fa-edit me-1"></i>Edit
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="danger"
                    onClick={() => handleDeleteRMA(selectedRMA.rma_id, selectedRMA.rma_number)}
                    disabled={selectedRMA?.status === 'completed'}
                  >
                    <i className="fas fa-trash me-1"></i>Delete
                  </Button>
                )}
              </ButtonGroup>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRMA && (
            <RMADetail
              rma={selectedRMA}
              onStatusChange={handleStatusChange}
              onUpdate={() => {
                loadRMAs();
                if (selectedRMA) handleViewDetail(selectedRMA.rma_id);
              }}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Create Repair Job Modal from RMA List */}
      <RepairJobForm
        show={showCreateRepairModal}
        onHide={() => {
          setShowCreateRepairModal(false);
          setSelectedRMA(null);
        }}
        initialRMA={selectedRMA}
        onSaved={() => {
          setShowCreateRepairModal(false);
          setSelectedRMA(null);
          loadRMAs();
          alert('Repair job created successfully from RMA');
        }}
      />
    </Container>
  );
};

export default RMA;
