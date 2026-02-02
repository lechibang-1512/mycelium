import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Badge, Modal, InputGroup, Spinner, Alert, Pagination } from 'react-bootstrap';
import { serializedInventoryAPI } from '../../api/api';
import { useStocktake } from '../../contexts/StocktakeContext';
import LockdownOverlay from '../../components/layout/LockdownOverlay';

/**
 * Device Inventory Management Page
 * Displays all devices (phones/smartphones) with IMEI tracking
 */
const DeviceInventory = () => {
    const { isLocked } = useStocktake();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedDevice, setSelectedDevice] = useState(null);
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

    const fetchDevices = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: ((page - 1) * limit).toString()
            });

            if (searchQuery) params.append('search', searchQuery);
            if (statusFilter) params.append('status', statusFilter);

            if (statusFilter) params.append('status', statusFilter);

            const response = await serializedInventoryAPI.getDevices(Object.fromEntries(params));
            const data = response.data;

            if (data.success) {
                setDevices(data.data || []);
            } else {
                setError(data.error || 'Failed to load devices');
            }
        } catch (err) {
            setError('Failed to connect to server');
            console.error('Error fetching devices:', err);
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
        fetchDevices();
        fetchStats();
    }, [fetchDevices]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchDevices();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, statusFilter]);

    const handleViewDevice = (device) => {
        setSelectedDevice(device);
        setShowDetailModal(true);
    };

    const handleStatusChange = (device) => {
        setSelectedDevice(device);
        setNewStatus(device.status);
        setStatusNotes('');
        setShowStatusModal(true);
    };

    const submitStatusChange = async () => {
        if (!selectedDevice || !newStatus) return;

        setUpdating(true);
        try {
            const response = await serializedInventoryAPI.updateStatus(selectedDevice.tracking_id, {
                status: newStatus,
                notes: statusNotes
            });

            const data = response.data;
            if (data.success) {
                setShowStatusModal(false);
                fetchDevices();
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
            'sold': 'secondary',
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
            'testing': 'secondary'
        };
        return <Badge bg={variants[condition?.toLowerCase()] || 'secondary'}>{condition}</Badge>;
    };

    return (
        <Container fluid className="py-4">
            {isLocked && <LockdownOverlay />}

            <Row className="mb-4">
                <Col>
                    <h2><i className="fas fa-mobile-alt me-2"></i>Device Inventory</h2>
                    <p className="text-muted">Manage smartphones and devices with IMEI tracking</p>
                </Col>
            </Row>

            {/* Stats Cards */}
            {stats && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="border-primary">
                            <Card.Body className="text-center">
                                <h3 className="mb-0">{stats.devices || 0}</h3>
                                <small className="text-muted">Total Devices</small>
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
                                <h3 className="mb-0 text-info">{stats.byStatus?.in_repair || 0}</h3>
                                <small className="text-muted">In Repair</small>
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
                                    placeholder="Search by IMEI, serial number, or model..."
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
                                <option value="sold">Sold</option>
                                <option value="in_repair">In Repair</option>
                                <option value="disposed">Disposed</option>
                            </Form.Select>
                        </Col>
                        <Col md={3} className="text-end">
                            <Button variant="outline-primary" onClick={fetchDevices}>
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

            {/* Devices Table */}
            <Card>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted">Loading devices...</p>
                        </div>
                    ) : devices.length === 0 ? (
                        <div className="text-center py-5">
                            <i className="fas fa-mobile-alt fa-3x text-muted mb-3"></i>
                            <p className="text-muted">No devices found</p>
                        </div>
                    ) : (
                        <Table responsive hover className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>IMEI 1</th>
                                    <th>IMEI 2</th>
                                    <th>Model</th>
                                    <th>Color</th>
                                    <th>RAM/ROM</th>
                                    <th>Status</th>
                                    <th>Condition</th>
                                    <th>Location</th>
                                    <th>Received</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map((device) => (
                                    <tr key={device.tracking_id}>
                                        <td>
                                            <code
                                                className="text-primary"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => copyToClipboard(device.imei_1)}
                                                title="Click to copy"
                                            >
                                                {device.imei_1}
                                            </code>
                                        </td>
                                        <td>
                                            {device.imei_2 ? (
                                                <code
                                                    className="text-info"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => copyToClipboard(device.imei_2)}
                                                    title="Click to copy"
                                                >
                                                    {device.imei_2}
                                                </code>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                        <td>
                                            <strong>{device.model_name || 'Unknown'}</strong>
                                            {device.manufacturer && <small className="text-muted d-block">{device.manufacturer}</small>}
                                        </td>
                                        <td>
                                            {device.color ? (
                                                <Badge bg="light" text="dark" className="border">{device.color}</Badge>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                        <td>
                                            {(device.ram || device.rom) ? (
                                                <small>
                                                    {device.ram && <span>{device.ram}</span>}
                                                    {device.ram && device.rom && <span> / </span>}
                                                    {device.rom && <span>{device.rom}</span>}
                                                </small>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                        <td>{getStatusBadge(device.status)}</td>
                                        <td>{getConditionBadge(device.condition_grade)}</td>
                                        <td>
                                            <small>
                                                {device.warehouse_name || 'Unknown'}
                                                {device.zone_name && ` › ${device.zone_name}`}
                                                {device.bin_name && ` › ${device.bin_name}`}
                                            </small>
                                        </td>
                                        <td>
                                            <small className="text-muted">
                                                {device.created_at ? new Date(device.created_at).toLocaleDateString() : '—'}
                                            </small>
                                        </td>
                                        <td>
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="me-1"
                                                onClick={() => handleViewDevice(device)}
                                            >
                                                <i className="fas fa-eye"></i>
                                            </Button>
                                            <Button
                                                variant="outline-warning"
                                                size="sm"
                                                onClick={() => handleStatusChange(device)}
                                            >
                                                <i className="fas fa-exchange-alt"></i>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>

                {/* Pagination */}
                {devices.length > 0 && (
                    <Card.Footer>
                        <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                                Showing {devices.length} devices (Page {page})
                            </small>
                            <Pagination size="sm" className="mb-0">
                                <Pagination.Prev
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                />
                                <Pagination.Item active>{page}</Pagination.Item>
                                <Pagination.Next
                                    disabled={devices.length < limit}
                                    onClick={() => setPage(p => p + 1)}
                                />
                            </Pagination>
                        </div>
                    </Card.Footer>
                )}
            </Card>

            {/* Device Detail Modal */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-mobile-alt me-2"></i>
                        Device Details
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedDevice && (
                        <div>
                            <Row>
                                <Col md={6}>
                                    <h6 className="text-muted">IMEI 1</h6>
                                    <p><code className="fs-5">{selectedDevice.imei_1}</code></p>
                                </Col>
                                <Col md={6}>
                                    <h6 className="text-muted">IMEI 2</h6>
                                    <p><code className="fs-5">{selectedDevice.imei_2 || '—'}</code></p>
                                </Col>
                            </Row>
                            <hr />
                            <Row>
                                <Col md={6}>
                                    <h6 className="text-muted">Model</h6>
                                    <p><strong>{selectedDevice.model_name || 'Unknown'}</strong></p>
                                </Col>
                                <Col md={6}>
                                    <h6 className="text-muted">Manufacturer</h6>
                                    <p>{selectedDevice.manufacturer || '—'}</p>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={4}>
                                    <h6 className="text-muted">Color</h6>
                                    <p>{selectedDevice.color || '—'}</p>
                                </Col>
                                <Col md={4}>
                                    <h6 className="text-muted">RAM</h6>
                                    <p>{selectedDevice.ram || '—'}</p>
                                </Col>
                                <Col md={4}>
                                    <h6 className="text-muted">ROM</h6>
                                    <p>{selectedDevice.rom || '—'}</p>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <h6 className="text-muted">Serial Number</h6>
                                    <p><code>{selectedDevice.serial_number || '—'}</code></p>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={4}>
                                    <h6 className="text-muted">Status</h6>
                                    <p>{getStatusBadge(selectedDevice.status)}</p>
                                </Col>
                                <Col md={4}>
                                    <h6 className="text-muted">Condition</h6>
                                    <p>{getConditionBadge(selectedDevice.condition_grade)}</p>
                                </Col>
                                <Col md={4}>
                                    <h6 className="text-muted">Received</h6>
                                    <p>{selectedDevice.created_at ? new Date(selectedDevice.created_at).toLocaleString() : '—'}</p>
                                </Col>
                            </Row>
                            <hr />
                            <Row>
                                <Col>
                                    <h6 className="text-muted">Location</h6>
                                    <p>
                                        <i className="fas fa-warehouse me-1"></i>
                                        {selectedDevice.warehouse_name || 'Unknown'}
                                        {selectedDevice.zone_name && <span className="mx-2">›</span>}
                                        {selectedDevice.zone_name && <><i className="fas fa-layer-group me-1"></i>{selectedDevice.zone_name}</>}
                                        {selectedDevice.bin_code && <span className="mx-2">›</span>}
                                        {selectedDevice.bin_code && <><i className="fas fa-box me-1"></i>{selectedDevice.bin_code}</>}
                                    </p>
                                </Col>
                            </Row>
                            <hr />
                            <h6 className="text-muted mb-3"><i className="fas fa-file-invoice me-1"></i> Traceability</h6>
                            <Row>
                                <Col md={4}>
                                    <h6 className="text-muted">Invoice</h6>
                                    <p>{selectedDevice.invoice_number || '—'}</p>
                                </Col>
                                <Col md={4}>
                                    <h6 className="text-muted">Invoice Date</h6>
                                    <p>{selectedDevice.invoice_date ? new Date(selectedDevice.invoice_date).toLocaleDateString() : '—'}</p>
                                </Col>
                                <Col md={4}>
                                    <h6 className="text-muted">Supplier</h6>
                                    <p>{selectedDevice.supplier_name || '—'}</p>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                        Close
                    </Button>
                    <Button variant="warning" onClick={() => {
                        setShowDetailModal(false);
                        handleStatusChange(selectedDevice);
                    }}>
                        <i className="fas fa-exchange-alt me-1"></i> Change Status
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Status Change Modal */}
            <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Change Device Status</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedDevice && (
                        <>
                            <p>
                                <strong>Device:</strong> {selectedDevice.product_name || 'Unknown'}
                                <br />
                                <strong>IMEI:</strong> <code>{selectedDevice.imei_1}</code>
                            </p>
                            <Form.Group className="mb-3">
                                <Form.Label>New Status</Form.Label>
                                <Form.Select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                >
                                    <option value="available">Available</option>
                                    <option value="reserved">Reserved</option>
                                    <option value="sold">Sold</option>
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
        </Container>
    );
};

export default DeviceInventory;
