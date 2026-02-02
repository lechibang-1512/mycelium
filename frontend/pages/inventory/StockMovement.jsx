import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { inventoryMovementAPI, warehouseAPI } from '../../api/api';

/**
 * StockMovement Page
 * Displays stock movement history including transfers and inbound transactions
 */
const StockMovement = () => {
    const [movements, setMovements] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [transactionType, setTransactionType] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    useEffect(() => {
        fetchWarehouses();
        fetchMovements();
    }, []);

    useEffect(() => {
        fetchMovements();
    }, [transactionType, warehouseId, startDate, endDate]);

    const fetchWarehouses = async () => {
        try {
            const response = await warehouseAPI.getAll();
            setWarehouses(response.data.warehouses || []);
        } catch (err) {
            console.error('Failed to load warehouses:', err);
        }
    };

    const fetchMovements = async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (transactionType) params.transaction_type = transactionType;
            if (warehouseId) params.warehouse_id = warehouseId;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const response = await inventoryMovementAPI.getHistory(params);
            setMovements(response.data || []);
        } catch (err) {
            console.error('Failed to load movements:', err);
            setError('Failed to load stock movements');
        } finally {
            setLoading(false);
        }
    };

    const handleClearFilters = () => {
        setTransactionType('');
        setWarehouseId('');
        setStartDate('');
        setEndDate('');
        setCurrentPage(1);
    };

    const getTypeBadge = (type) => {
        const badges = {
            'incoming': { bg: 'success', icon: 'arrow-down' },
            'outgoing': { bg: 'danger', icon: 'arrow-up' },
            'transfer': { bg: 'primary', icon: 'exchange-alt' },
            'bin_transfer': { bg: 'info', icon: 'arrows-alt-h' },
            'zone_transfer_in': { bg: 'primary', icon: 'arrow-right' },
            'zone_transfer_out': { bg: 'warning', icon: 'arrow-left' },
            'adjustment': { bg: 'secondary', icon: 'edit' },
            'rma_return': { bg: 'purple', icon: 'undo' },
        };
        const badge = badges[type] || { bg: 'secondary', icon: 'question' };
        return (
            <Badge bg={badge.bg}>
                <i className={`fas fa-${badge.icon} me-1`}></i>
                {type?.replace(/_/g, ' ')}
            </Badge>
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Pagination
    const totalPages = Math.ceil(movements.length / itemsPerPage);
    const paginatedMovements = movements.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <h2>
                        <i className="fas fa-exchange-alt me-2"></i>
                        Stock Movement
                    </h2>
                    <p className="text-muted">Track transfers and inbound stock movements</p>
                </Col>
            </Row>

            {/* Filters */}
            <Card className="mb-4">
                <Card.Header className="bg-light">
                    <i className="fas fa-filter me-2"></i>
                    Filters
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Transaction Type</Form.Label>
                                <Form.Select
                                    value={transactionType}
                                    onChange={(e) => { setTransactionType(e.target.value); setCurrentPage(1); }}
                                >
                                    <option value="">All Types</option>
                                    <option value="incoming">Incoming (Receive)</option>
                                    <option value="outgoing">Outgoing (Dispense)</option>
                                    <option value="transfer">Transfer</option>
                                    <option value="bin_transfer">Bin Transfer</option>
                                    <option value="adjustment">Adjustment</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Warehouse</Form.Label>
                                <Form.Select
                                    value={warehouseId}
                                    onChange={(e) => { setWarehouseId(e.target.value); setCurrentPage(1); }}
                                >
                                    <option value="">All Warehouses</option>
                                    {warehouses.map(wh => (
                                        <option key={wh.warehouse_id} value={wh.warehouse_id}>
                                            {wh.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-3">
                                <Form.Label>From Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-3">
                                <Form.Label>To Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2} className="d-flex align-items-end mb-3">
                            <Button variant="outline-secondary" onClick={handleClearFilters} className="w-100">
                                <i className="fas fa-times me-1"></i>
                                Clear
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Error Alert */}
            {error && (
                <Alert variant="danger" onClose={() => setError('')} dismissible>
                    {error}
                </Alert>
            )}

            {/* Movements Table */}
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <span>
                        <i className="fas fa-list me-2"></i>
                        Movement History
                    </span>
                    <Badge bg="info">{movements.length} records</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted">Loading movements...</p>
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <i className="fas fa-inbox fa-3x mb-3"></i>
                            <p>No stock movements found</p>
                        </div>
                    ) : (
                        <Table striped hover responsive className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Product</th>
                                    <th className="text-center">Qty</th>
                                    <th>Warehouse</th>
                                    <th>Zone/Bin</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedMovements.map((mov, idx) => (
                                    <tr key={mov.log_id || idx}>
                                        <td className="text-nowrap">{formatDate(mov.transaction_date)}</td>
                                        <td>{getTypeBadge(mov.transaction_type)}</td>
                                        <td>
                                            <div>
                                                <strong>{mov.product_name || mov.brand || '-'}</strong>
                                            </div>
                                            {mov.serial_number && (
                                                <small className="text-muted">
                                                    <i className="fas fa-barcode me-1"></i>
                                                    {mov.serial_number}
                                                </small>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <Badge bg={mov.quantity_changed > 0 ? 'success' : 'danger'}>
                                                {mov.quantity_changed > 0 ? '+' : ''}{mov.quantity_changed}
                                            </Badge>
                                        </td>
                                        <td>{mov.warehouse_name || '-'}</td>
                                        <td>
                                            {mov.zone_name && <span className="badge bg-light text-dark me-1">{mov.zone_name}</span>}
                                            {mov.batch_no && <small className="text-muted">Batch: {mov.batch_no}</small>}
                                        </td>
                                        <td>
                                            <small className="text-muted" style={{ maxWidth: '200px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {mov.notes || '-'}
                                            </small>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>

                {/* Pagination */}
                {totalPages > 1 && (
                    <Card.Footer className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, movements.length)} of {movements.length}
                        </small>
                        <div>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                className="me-1"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                <i className="fas fa-chevron-left"></i>
                            </Button>
                            <span className="mx-2">Page {currentPage} of {totalPages}</span>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                <i className="fas fa-chevron-right"></i>
                            </Button>
                        </div>
                    </Card.Footer>
                )}
            </Card>
        </Container>
    );
};

export default StockMovement;
