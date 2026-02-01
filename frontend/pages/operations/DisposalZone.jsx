import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Table, Modal, Badge } from 'react-bootstrap';
import { disposalAPI } from '../../services/api';

const DisposalZone = () => {
    const [pendingItems, setPendingItems] = useState([]);
    const [disposalHistory, setDisposalHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showDisposeModal, setShowDisposeModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Form state for move to disposal
    const [moveForm, setMoveForm] = useState({
        item_type: 'device', // device, spare_part
        item_id: '',
        reason: '',
        notes: ''
    });

    // Form state for permanent disposal
    const [disposeForm, setDisposeForm] = useState({
        disposal_method: '',
        disposal_notes: ''
    });

    const navigate = useNavigate();

    useEffect(() => {
        fetchPendingDisposal();
        fetchDisposalHistory();
    }, []);

    const fetchPendingDisposal = async () => {
        setLoading(true);
        try {
            const response = await disposalAPI.getPending();
            const result = response.data;

            if (result.success) {
                setPendingItems(result.data || []);
            }
        } catch (err) {
            console.error('Failed to load pending disposals:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDisposalHistory = async () => {
        try {
            const response = await disposalAPI.getHistory({ limit: 50 });
            const result = response.data;

            if (result.success) {
                setDisposalHistory(result.data || []);
            }
        } catch (err) {
            console.error('Failed to load disposal history:', err);
        }
    };

    const handleMoveToDisposal = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await disposalAPI.moveToDisposal({
                item_type: moveForm.item_type,
                item_id: parseInt(moveForm.item_id),
                reason: moveForm.reason,
                notes: moveForm.notes,
                user_id: 1 // TODO: Get from auth context
            });
            const result = response.data;

            if (result.success) {
                setSuccess('Item moved to disposal zone successfully!');
                setShowMoveModal(false);
                setMoveForm({ item_type: 'device', item_id: '', reason: '', notes: '' });
                fetchPendingDisposal();
            } else {
                setError(result.error || 'Failed to move item');
            }
        } catch (err) {
            setError('Failed to move item to disposal');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePermanentDispose = async (e) => {
        e.preventDefault();
        if (!selectedItem) return;

        setLoading(true);

        try {
            const response = await disposalAPI.completeDisposal({
                disposal_id: selectedItem.id,
                disposal_method: disposeForm.disposal_method,
                notes: disposeForm.disposal_notes,
                user_id: 1 // TODO: Get from auth context
            });
            const result = response.data;

            if (result.success) {
                setSuccess('Item permanently disposed!');
                setShowDisposeModal(false);
                setSelectedItem(null);
                setDisposeForm({ disposal_method: '', disposal_notes: '' });
                fetchPendingDisposal();
                fetchDisposalHistory();
            } else {
                setError(result.error || 'Failed to dispose item');
            }
        } catch (err) {
            setError('Failed to dispose item');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return <Badge bg="warning">Pending</Badge>;
            case 'approved': return <Badge bg="info">Approved</Badge>;
            case 'disposed': return <Badge bg="danger">Disposed</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <h2>
                        <i className="fas fa-trash-alt me-2"></i>
                        Disposal Zone Management
                    </h2>
                    <p className="text-muted">Manage damaged, defective, or expired inventory for disposal</p>
                </Col>
                <Col md="auto">
                    <Button variant="warning" onClick={() => setShowMoveModal(true)}>
                        <i className="fas fa-arrow-right me-2"></i>
                        Move Item to Disposal
                    </Button>
                    <Button variant="outline-secondary" onClick={() => navigate('/inventory')} className="ms-2">
                        <i className="fas fa-arrow-left me-2"></i>
                        Back
                    </Button>
                </Col>
            </Row>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            {/* Pending Disposal Items */}
            <Card className="mb-4 border-warning">
                <Card.Header className="bg-warning text-dark">
                    <h5 className="mb-0">
                        <i className="fas fa-clock me-2"></i>
                        Pending Disposal ({pendingItems.length})
                    </h5>
                </Card.Header>
                <Card.Body>
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-warning" role="status"></div>
                        </div>
                    ) : pendingItems.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                            <i className="fas fa-check-circle fa-3x mb-3 text-success"></i>
                            <p>No items pending disposal</p>
                        </div>
                    ) : (
                        <Table striped hover responsive>
                            <thead>
                                <tr>
                                    <th>Item Type</th>
                                    <th>Item Details</th>
                                    <th>Reason</th>
                                    <th>Moved By</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <Badge bg={item.item_type === 'device' ? 'primary' : 'info'}>
                                                {item.item_type === 'device' ? (
                                                    <><i className="fas fa-mobile-alt me-1"></i> Device</>
                                                ) : (
                                                    <><i className="fas fa-cogs me-1"></i> Spare Part</>
                                                )}
                                            </Badge>
                                        </td>
                                        <td>
                                            <strong>{item.item_name || `#${item.item_id}`}</strong>
                                            {item.imei && <small className="text-muted d-block">IMEI: {item.imei}</small>}
                                        </td>
                                        <td>{item.reason}</td>
                                        <td>{item.moved_by_name || 'Unknown'}</td>
                                        <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                        <td>{getStatusBadge(item.status)}</td>
                                        <td>
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setShowDisposeModal(true);
                                                }}
                                            >
                                                <i className="fas fa-trash me-1"></i>
                                                Dispose
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Disposal History */}
            <Card className="border-secondary">
                <Card.Header className="bg-secondary text-white">
                    <h5 className="mb-0">
                        <i className="fas fa-history me-2"></i>
                        Disposal History
                    </h5>
                </Card.Header>
                <Card.Body>
                    {disposalHistory.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                            <i className="fas fa-archive fa-3x mb-3"></i>
                            <p>No disposal history</p>
                        </div>
                    ) : (
                        <Table striped size="sm" responsive>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Reason</th>
                                    <th>Method</th>
                                    <th>Disposed By</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {disposalHistory.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            {item.item_name || `#${item.item_id}`}
                                            {item.imei && <small className="text-muted d-block">{item.imei}</small>}
                                        </td>
                                        <td>{item.reason}</td>
                                        <td>{item.disposal_method || 'N/A'}</td>
                                        <td>{item.disposed_by_name || 'Unknown'}</td>
                                        <td>{new Date(item.disposed_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Move to Disposal Modal */}
            <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Move Item to Disposal Zone</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleMoveToDisposal}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Item Type *</Form.Label>
                            <Form.Select
                                value={moveForm.item_type}
                                onChange={(e) => setMoveForm({ ...moveForm, item_type: e.target.value })}
                                required
                            >
                                <option value="device">Device</option>
                                <option value="spare_part">Spare Part</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Item ID *</Form.Label>
                            <Form.Control
                                type="number"
                                value={moveForm.item_id}
                                onChange={(e) => setMoveForm({ ...moveForm, item_id: e.target.value })}
                                placeholder="Enter item/asset ID"
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Reason for Disposal *</Form.Label>
                            <Form.Select
                                value={moveForm.reason}
                                onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })}
                                required
                            >
                                <option value="">Select reason...</option>
                                <option value="damaged">Damaged</option>
                                <option value="defective">Defective</option>
                                <option value="expired">Expired</option>
                                <option value="obsolete">Obsolete</option>
                                <option value="customer_return">Customer Return (Unrepairable)</option>
                                <option value="other">Other</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={moveForm.notes}
                                onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })}
                                placeholder="Additional details..."
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowMoveModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="warning" type="submit" disabled={loading}>
                            {loading ? 'Moving...' : 'Move to Disposal'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Permanent Disposal Modal */}
            <Modal show={showDisposeModal} onHide={() => setShowDisposeModal(false)}>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        Confirm Permanent Disposal
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handlePermanentDispose}>
                    <Modal.Body>
                        <Alert variant="danger">
                            <strong>Warning:</strong> This action is irreversible. The item will be permanently removed from inventory.
                        </Alert>

                        {selectedItem && (
                            <div className="mb-3 p-3 bg-light rounded">
                                <strong>Item:</strong> {selectedItem.item_name || `#${selectedItem.item_id}`}<br />
                                <strong>Reason:</strong> {selectedItem.reason}
                            </div>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label>Disposal Method *</Form.Label>
                            <Form.Select
                                value={disposeForm.disposal_method}
                                onChange={(e) => setDisposeForm({ ...disposeForm, disposal_method: e.target.value })}
                                required
                            >
                                <option value="">Select method...</option>
                                <option value="recycled">Recycled</option>
                                <option value="scrapped">Scrapped</option>
                                <option value="donated">Donated</option>
                                <option value="sold_salvage">Sold for Salvage</option>
                                <option value="returned_manufacturer">Returned to Manufacturer</option>
                                <option value="destroyed">Destroyed</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Disposal Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={disposeForm.disposal_notes}
                                onChange={(e) => setDisposeForm({ ...disposeForm, disposal_notes: e.target.value })}
                                placeholder="Any additional notes about the disposal..."
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowDisposeModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="danger" type="submit" disabled={loading}>
                            {loading ? 'Disposing...' : 'Permanently Dispose'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default DisposalZone;
