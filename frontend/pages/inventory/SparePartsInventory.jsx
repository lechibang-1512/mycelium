import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Badge, Modal, InputGroup, Spinner, Alert, Pagination } from 'react-bootstrap';
import { sparePartsAPI, serializedInventoryAPI } from '../../services/api';
import { useStocktake } from '../../contexts/StocktakeContext';
import LockdownOverlay from '../../components/layout/LockdownOverlay';
import SparePartForm from '../../components/spareparts/SparePartForm';

/**
 * Spare Parts Inventory Management Page
 * Displays all spare parts with serial number tracking
 */
const SparePartsInventory = () => {
    const { isLocked } = useStocktake();
    const [spareParts, setSpareParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedPart, setSelectedPart] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [stats, setStats] = useState(null);

    // Status update modal
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [statusNotes, setStatusNotes] = useState('');
    const [updating, setUpdating] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [limit] = useState(50);

    // Create/Edit form modal
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingPart, setEditingPart] = useState(null);

    const fetchSpareParts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: ((page - 1) * limit).toString()
            });

            if (searchQuery) params.append('search', searchQuery);
            if (statusFilter) params.append('status', statusFilter);

            if (statusFilter) params.append('status', statusFilter);

            // Use getInventoryList for paginated inventory search
            const response = await sparePartsAPI.getInventoryList(Object.fromEntries(params));
            const data = response.data;

            if (data.success) {
                setSpareParts(data.data || []);
            } else {
                setError(data.error || 'Failed to load spare parts');
            }
        } catch (err) {
            setError('Failed to connect to server');
            console.error('Error fetching spare parts:', err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, statusFilter, page, limit]);

    const fetchStats = async () => {
        try {
            const response = await serializedInventoryAPI.getStats();
            const data = response.data;
            if (data.success) {
                setStats(data.data);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    useEffect(() => {
        fetchSpareParts();
        fetchStats();
    }, [fetchSpareParts]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchSpareParts();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, statusFilter]);

    const handleViewPart = (part) => {
        setSelectedPart(part);
        setShowDetailModal(true);
    };

    const handleStatusChange = (part) => {
        setSelectedPart(part);
        setNewStatus(part.status);
        setStatusNotes('');
        setShowStatusModal(true);
    };

    const submitStatusChange = async () => {
        if (!selectedPart || !newStatus) return;

        setUpdating(true);
        try {
            // Updated to use the correct updateInventory endpoint (without /status suffix)
            const response = await sparePartsAPI.updateInventory(selectedPart.inventory_id, {
                status: newStatus,
                notes: statusNotes
            });

            const data = await response.json();
            if (data.success) {
                setShowStatusModal(false);
                fetchSpareParts();
                fetchStats();
            } else {
                alert(data.error || 'Failed to update status');
            }
        } catch (err) {
            alert('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    const getStatusBadge = (status) => {
        const variants = {
            'available': 'success',
            'reserved': 'warning',
            'used': 'secondary',
            'in_repair': 'info',
            'disposed': 'danger'
        };
        return <Badge bg={variants[status] || 'secondary'}>{status?.replace('_', ' ')}</Badge>;
    };

    const getConditionBadge = (condition) => {
        const variants = {
            'new': 'primary',
            'used': 'info',
            'refurbished': 'warning',
            'tested': 'success'
        };
        return <Badge bg={variants[condition?.toLowerCase()] || 'secondary'}>{condition}</Badge>;
    };

    return (
        <Container fluid className="py-4">
            {isLocked && <LockdownOverlay />}

            <Row className="mb-4">
                <Col>
                    <h2><i className="fas fa-cogs me-2"></i>Spare Parts Inventory</h2>
                    <p className="text-muted">Manage spare parts with serial number tracking</p>
                </Col>
                <Col xs="auto">
                    <Button
                        variant="primary"
                        onClick={() => { setEditingPart(null); setShowFormModal(true); }}
                        disabled={isLocked}
                    >
                        <i className="fas fa-plus me-2"></i>Create New Spare Part
                    </Button>
                </Col>
            </Row>

            {/* Stats Cards */}
            {stats && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="border-secondary">
                            <Card.Body className="text-center">
                                <h3 className="mb-0">{stats.spareParts || 0}</h3>
                                <small className="text-muted">Total Spare Parts</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-success">
                            <Card.Body className="text-center">
                                <h3 className="mb-0 text-success">{stats.byStatus?.available || 0}</h3>
                                <small className="text-muted">Available</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-warning">
                            <Card.Body className="text-center">
                                <h3 className="mb-0 text-warning">{stats.byStatus?.reserved || 0}</h3>
                                <small className="text-muted">Reserved</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-info">
                            <Card.Body className="text-center">
                                <h3 className="mb-0 text-info">{stats.byCondition?.new || 0}</h3>
                                <small className="text-muted">New Condition</small>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Search and Filters */}
            <Card className="mb-4">
                <Card.Body>
                    <Row>
                        <Col md={6}>
                            <InputGroup>
                                <InputGroup.Text><i className="fas fa-search"></i></InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search by serial number, part name, or category..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <Button variant="outline-secondary" onClick={() => setSearchQuery('')}>
                                        <i className="fas fa-times"></i>
                                    </Button>
                                )}
                            </InputGroup>
                        </Col>
                        <Col md={3}>
                            <Form.Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="available">Available</option>
                                <option value="reserved">Reserved</option>
                                <option value="used">Used</option>
                                <option value="in_repair">In Repair</option>
                                <option value="disposed">Disposed</option>
                            </Form.Select>
                        </Col>
                        <Col md={3} className="text-end">
                            <Button variant="outline-primary" onClick={fetchSpareParts}>
                                <i className="fas fa-sync-alt me-1"></i> Refresh
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Error Alert */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    <i className="fas fa-exclamation-triangle me-2"></i>{error}
                </Alert>
            )}

            {/* Spare Parts Table */}
            <Card>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted">Loading spare parts...</p>
                        </div>
                    ) : spareParts.length === 0 ? (
                        <div className="text-center py-5">
                            <i className="fas fa-cogs fa-3x text-muted mb-3"></i>
                            <p className="text-muted">No spare parts found</p>
                        </div>
                    ) : (
                        <Table responsive hover className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Serial Number</th>
                                    <th>Part Name</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Condition</th>
                                    <th>Location</th>
                                    <th>Received</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {spareParts.map((part) => (
                                    <tr key={part.inventory_id || part.spare_part_uuid}>
                                        <td>
                                            <code
                                                className="text-primary"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => copyToClipboard(part.serial_number)}
                                                title="Click to copy"
                                            >
                                                {part.serial_number || '—'}
                                            </code>
                                        </td>
                                        <td>
                                            <strong>{part.product_name || 'Unknown Part'}</strong>
                                        </td>
                                        <td>
                                            <small className="text-muted">{part.category || 'Uncategorized'}</small>
                                        </td>
                                        <td>{getStatusBadge(part.status)}</td>
                                        <td>{getConditionBadge(part.condition_grade)}</td>
                                        <td>
                                            <small>
                                                {part.warehouse_name || 'Unknown'}
                                                {part.bin_code && ` - ${part.bin_code}`}
                                            </small>
                                        </td>
                                        <td>
                                            <small className="text-muted">
                                                {part.created_at ? new Date(part.created_at).toLocaleDateString() : '—'}
                                            </small>
                                        </td>
                                        <td>
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="me-1"
                                                onClick={() => handleViewPart(part)}
                                                title="View Details"
                                            >
                                                <i className="fas fa-eye"></i>
                                            </Button>
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                className="me-1"
                                                onClick={() => { setEditingPart(part); setShowFormModal(true); }}
                                                title="Edit Part"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </Button>
                                            <Button
                                                variant="outline-warning"
                                                size="sm"
                                                onClick={() => handleStatusChange(part)}
                                                title="Change Status"
                                            >
                                                <i className="fas fa-exchange-alt"></i>
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                className="ms-1"
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this spare part? This will mark it as disposed.')) {
                                                        const deletePart = async () => {
                                                            try {
                                                                const response = await sparePartsAPI.delete(part.spare_part_uuid);
                                                                const data = response.data;
                                                                if (data.success) {
                                                                    fetchSpareParts();
                                                                    fetchStats();
                                                                } else {
                                                                    alert(data.error || 'Failed to delete');
                                                                }
                                                            } catch (e) {
                                                                alert('Error deleting part');
                                                            }
                                                        };
                                                        deletePart();
                                                    }
                                                }}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>

                {/* Pagination */}
                {spareParts.length > 0 && (
                    <Card.Footer>
                        <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                                Showing {spareParts.length} spare parts (Page {page})
                            </small>
                            <Pagination size="sm" className="mb-0">
                                <Pagination.Prev
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                />
                                <Pagination.Item active>{page}</Pagination.Item>
                                <Pagination.Next
                                    disabled={spareParts.length < limit}
                                    onClick={() => setPage(p => p + 1)}
                                />
                            </Pagination>
                        </div>
                    </Card.Footer>
                )}
            </Card>

            {/* Part Detail Modal */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-cog me-2"></i>
                        Spare Part Details
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPart && (
                        <div>
                            <Row>
                                <Col md={6}>
                                    <h6 className="text-muted">Serial Number</h6>
                                    <p><code className="fs-5">{selectedPart.serial_number || '—'}</code></p>
                                </Col>
                                <Col md={6}>
                                    <h6 className="text-muted">Part Name</h6>
                                    <p>{selectedPart.product_name || 'Unknown'}</p>
                                </Col>
                            </Row>
                            <hr />
                            <Row>
                                <Col md={4}>
                                    <h6 className="text-muted">Category</h6>
                                    <p>{selectedPart.category || 'Uncategorized'}</p>
                                </Col>
                                <Col md={4}>
                                    <h6 className="text-muted">Status</h6>
                                    <p>{getStatusBadge(selectedPart.status)}</p>
                                </Col>
                                <Col md={4}>
                                    <h6 className="text-muted">Condition</h6>
                                    <p>{getConditionBadge(selectedPart.condition_grade)}</p>
                                </Col>
                            </Row>
                            <hr />
                            <Row>
                                <Col md={6}>
                                    <h6 className="text-muted">Location</h6>
                                    <p>
                                        <i className="fas fa-warehouse me-1"></i>
                                        {selectedPart.warehouse_name || 'Unknown'}
                                        {selectedPart.bin_code && <span className="mx-2">›</span>}
                                        {selectedPart.bin_code && <><i className="fas fa-box me-1"></i>{selectedPart.bin_code}</>}
                                    </p>
                                </Col>
                                <Col md={6}>
                                    <h6 className="text-muted">Received Date</h6>
                                    <p>{selectedPart.created_at ? new Date(selectedPart.created_at).toLocaleString() : '—'}</p>
                                </Col>
                            </Row>
                            {selectedPart.notes && (
                                <>
                                    <hr />
                                    <Row>
                                        <Col>
                                            <h6 className="text-muted">Notes</h6>
                                            <p>{selectedPart.notes}</p>
                                        </Col>
                                    </Row>
                                </>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                        Close
                    </Button>
                    <Button variant="warning" onClick={() => {
                        setShowDetailModal(false);
                        handleStatusChange(selectedPart);
                    }}>
                        <i className="fas fa-exchange-alt me-1"></i> Change Status
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Status Change Modal */}
            <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Change Part Status</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPart && (
                        <>
                            <p>
                                <strong>Part:</strong> {selectedPart.product_name || 'Unknown'}
                                <br />
                                <strong>Serial:</strong> <code>{selectedPart.serial_number || '—'}</code>
                            </p>
                            <Form.Group className="mb-3">
                                <Form.Label>New Status</Form.Label>
                                <Form.Select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                >
                                    <option value="available">Available</option>
                                    <option value="reserved">Reserved</option>
                                    <option value="used">Used</option>
                                    <option value="in_repair">In Repair</option>
                                    <option value="disposed">Disposed</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group>
                                <Form.Label>Notes (optional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={statusNotes}
                                    onChange={(e) => setStatusNotes(e.target.value)}
                                    placeholder="Reason for status change..."
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowStatusModal(false)} disabled={updating}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={submitStatusChange} disabled={updating}>
                        {updating ? <Spinner size="sm" animation="border" /> : 'Update Status'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Create/Edit Spare Part Form Modal */}
            <SparePartForm
                show={showFormModal}
                onHide={() => { setShowFormModal(false); setEditingPart(null); }}
                onSaved={() => { setShowFormModal(false); setEditingPart(null); fetchSpareParts(); }}
                part={editingPart}
            />
        </Container>
    );
};

export default SparePartsInventory;
