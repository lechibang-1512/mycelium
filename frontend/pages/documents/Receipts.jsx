import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Modal, Alert, Spinner } from 'react-bootstrap';
import { receiptsAPI, warehouseAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';

// Inline formatDate (from deleted shared/utils/formatters.js)
const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  const defaultOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', ...options };
  try { return new Date(dateString).toLocaleDateString('en-US', defaultOptions); }
  catch { return 'N/A'; }
};

function Receipts() {
  const { hasPermission } = useAuth();

  // Permission checks
  const canDelete = hasPermission(PERMISSIONS.RECEIPTS_DELETE) || hasPermission(PERMISSIONS.RECEIPTS_MANAGE);

  const [receipts, setReceipts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    warehouse_id: ''
  });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseAPI.getAll();
      setWarehouses(response.data.warehouses || []);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await receiptsAPI.getAll(filters);
      const receiptsList = response.data.receipts || [];
      setReceipts(receiptsList);
      setError('');
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError('Failed to load movement records. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchWarehouses();
    fetchReceipts();
  }, [fetchReceipts]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleViewDetails = async (receipt) => {
    try {
      setLoadingDetails(true);
      setShowModal(true);
      const response = await receiptsAPI.getById(receipt.receipt_id);
      const items = response.data.items || [];
      const receiptData = response.data.receipt;
      setSelectedReceipt(receiptData);
      setReceiptItems(items);
      setError('');
    } catch (err) {
      console.error('Error fetching receipt details:', err);
      setError('Failed to load movement details');
      setShowModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDelete = async (receiptId) => {
    if (window.confirm('Are you sure you want to delete this movement record? This action cannot be undone.')) {
      try {
        await receiptsAPI.delete(receiptId);
        fetchReceipts();
        setShowModal(false);
        setError('');
      } catch (err) {
        console.error('Error deleting receipt:', err);
        setError('Failed to delete movement record');
      }
    }
  };

  const getTypeBadge = (type) => {
    const variants = {
      'incoming': 'success',
      'outgoing': 'danger',
      'transfer': 'primary',
      'bin_transfer': 'info',
      'zone_transfer_in': 'success',
      'zone_transfer_out': 'warning',
      'zone_to_bin': 'secondary',
      'bin_to_zone': 'secondary',
      'adjustment': 'info',
      'rma_return': 'warning',
      'rma_disposition': 'dark',
    };
    const labels = {
      'incoming': 'Received',
      'outgoing': 'Dispatched',
      'transfer': 'Transfer',
      'bin_transfer': 'Bin Transfer',
      'zone_transfer_in': 'Zone In',
      'zone_transfer_out': 'Zone Out',
      'zone_to_bin': 'Zone→Bin',
      'bin_to_zone': 'Bin→Zone',
      'adjustment': 'Adjustment',
      'rma_return': 'RMA Return',
      'rma_disposition': 'RMA Disposition',
    };
    return <Badge bg={variants[type] || 'secondary'}>{labels[type] || type}</Badge>;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="fas fa-exchange-alt me-2"></i>
            Stock Movement
          </h2>
          <p className="text-muted">Track inventory movements between warehouses, bins, and zones</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-light">
          <h5 className="mb-0">
            <i className="fas fa-filter me-2"></i>Filter Movements
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Movement Type</Form.Label>
                <Form.Select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                >
                  <option value="">All Types</option>
                  <option value="incoming">Received</option>
                  <option value="outgoing">Dispatched</option>
                  <option value="transfer">Transfer</option>
                  <option value="bin_transfer">Bin Transfer</option>
                  <option value="zone_transfer_in">Zone Transfer In</option>
                  <option value="zone_transfer_out">Zone Transfer Out</option>
                  <option value="adjustment">Adjustment</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Warehouse</Form.Label>
                <Form.Select
                  name="warehouse_id"
                  value={filters.warehouse_id}
                  onChange={handleFilterChange}
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map(w => (
                    <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button
                variant="outline-secondary"
                onClick={() => setFilters({ startDate: '', endDate: '', type: '', warehouse_id: '' })}
                className="mb-3"
              >
                <i className="fas fa-times me-2"></i>
                Clear
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Movements Table */}
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
          <Row className="align-items-center">
            <Col>
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Movement Records
                {receipts.length > 0 && (
                  <Badge bg="primary" className="ms-2">{receipts.length}</Badge>
                )}
              </h5>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading movements...</p>
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-exchange-alt fa-3x mb-3 opacity-50"></i>
              <h5>No movements found</h5>
              <p>Try adjusting your filters</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date & Time</th>
                    <th>Movement ID</th>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.receipt_id}>
                      <td className="small">{formatDate(receipt.transaction_date)}</td>
                      <td>
                        <code className="text-primary">{receipt.receipt_id}</code>
                      </td>
                      <td>{getTypeBadge(receipt.transaction_type || receipt.receipt_type)}</td>
                      <td>
                        <Badge bg="info" pill>{receipt.item_count || 0}</Badge>
                      </td>
                      <td>
                        <small className="text-muted" title={receipt.notes}>
                          {receipt.notes ? (receipt.notes.length > 50 ? receipt.notes.substring(0, 50) + '...' : receipt.notes) : '-'}
                        </small>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleViewDetails(receipt)}
                          title="View Details"
                          className="me-1"
                        >
                          <i className="fas fa-eye"></i>
                        </Button>
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDelete(receipt.receipt_id)}
                            title="Delete"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Movement Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            <i className="fas fa-info-circle me-2"></i>
            Movement Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingDetails ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Loading details...</p>
            </div>
          ) : selectedReceipt ? (
            <div>
              <Row className="mb-4">
                <Col md={6}>
                  <p><strong>Movement ID:</strong> <code>{selectedReceipt.receipt_id}</code></p>
                  <p><strong>Type:</strong> {getTypeBadge(selectedReceipt.receipt_type)}</p>
                  <p><strong>Date:</strong> {formatDate(selectedReceipt.transaction_date)}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Notes:</strong> {selectedReceipt.notes || '-'}</p>
                </Col>
              </Row>

              {receiptItems.length > 0 && (
                <>
                  <h6>Items Moved</h6>
                  <Table striped size="sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Warehouse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            {item.product_name || item.device_name || 'N/A'}
                            {item.device_maker && <small className="text-muted d-block">{item.device_maker}</small>}
                          </td>
                          <td>
                            <Badge bg={item.quantity > 0 ? 'success' : 'danger'}>
                              {item.quantity > 0 ? '+' : ''}{item.quantity}
                            </Badge>
                          </td>
                          <td>{item.warehouse_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
            </div>
          ) : (
            <Alert variant="warning">No movement data available</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            <i className="fas fa-times me-2"></i>Close
          </Button>
          {canDelete && selectedReceipt && (
            <Button
              variant="danger"
              onClick={() => handleDelete(selectedReceipt.receipt_id)}
            >
              <i className="fas fa-trash me-2"></i>Delete
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Receipts;
