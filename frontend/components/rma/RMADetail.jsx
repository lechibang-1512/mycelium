import React, { useState } from 'react';
import { Modal, Badge, Button, Row, Col, Card, Table, Spinner, Tabs, Tab, Alert } from 'react-bootstrap';
// formatDate and formatCurrency defined locally below
// rmaAPI and getAvailableTransitions not currently used
import RepairJobsTab from './RepairJobsTab';
import RepairJobForm from '../spareparts/RepairJobForm';

const RMADetail = ({ rma, onStatusChange, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [showRepairForm, setShowRepairForm] = useState(false);

    const getStatusBadge = (status) => {
        const map = {
            pending: 'secondary',
            awaiting_receipt: 'warning',
            received: 'info',
            inspecting: 'primary',
            approved: 'success',
            rejected: 'danger',
            completed: 'success',
            cancelled: 'dark'
        };
        return map[status] || 'secondary';
    };

    const getDispositionBadge = (disposition) => {
        const map = {
            return_to_stock: 'success',
            repair: 'warning',
            scrap: 'danger',
            return_to_vendor: 'info',
            warranty_claim: 'primary',
            pending: 'secondary'
        };
        return map[disposition] || 'secondary';
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('en-US');
    };

    return (
        <div>
            {/* Top Actions Toolbar */}
            <div className="d-flex justify-content-between align-items-center mb-4 p-4 bg-white rounded shadow-sm border-start border-4 border-primary">
                <div className="d-flex align-items-center gap-3">
                    <div>
                        <h4 className="mb-0 fw-bold text-dark">{rma.rma_number}</h4>
                        <div className="text-muted small">Status & Priority</div>
                    </div>
                    <div className="vr mx-2"></div>
                    <Badge bg={getStatusBadge(rma.status)} className="fs-6 px-3 py-2 rounded-pill shadow-sm">
                        {rma.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                    <Badge bg={rma.priority === 'urgent' ? 'danger' : rma.priority === 'high' ? 'warning' : 'info'} className="fs-6 px-3 py-2 rounded-pill opacity-75">
                        {rma.priority.toUpperCase()}
                    </Badge>
                </div>

                <div className="d-flex gap-2">
                    {rma.status === 'pending' && (
                        <Button
                            size="sm"
                            variant="primary"
                            className="shadow-sm rounded-pill px-3"
                            onClick={() => onStatusChange(rma.rma_number, 'awaiting_receipt')}
                        >
                            <i className="fas fa-clock me-2"></i>Mark Awaiting Receipt
                        </Button>
                    )}
                    {rma.status === 'awaiting_receipt' && (
                        <Button
                            size="sm"
                            variant="success"
                            className="shadow-sm rounded-pill px-3"
                            onClick={() => onStatusChange(rma.rma_number, 'received')}
                        >
                            <i className="fas fa-box-open me-2"></i>Mark Received
                        </Button>
                    )}
                    {rma.status === 'received' && (
                        <Button
                            size="sm"
                            variant="primary"
                            className="shadow-sm rounded-pill px-3"
                            onClick={() => onStatusChange(rma.rma_number, 'inspecting')}
                        >
                            <i className="fas fa-microscope me-2"></i>Start Inspection
                        </Button>
                    )}
                    {rma.status === 'inspecting' && (
                        <div className="d-flex gap-2 bg-light p-1 rounded-pill border">
                            <Button
                                variant="success"
                                size="sm"
                                className="rounded-pill px-3 fw-bold"
                                onClick={() => onStatusChange(rma.rma_number, 'approved')}
                            >
                                <i className="fas fa-check me-2"></i>Approve
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                className="rounded-pill px-3 fw-bold"
                                onClick={() => onStatusChange(rma.rma_number, 'rejected')}
                            >
                                <i className="fas fa-times me-2"></i>Reject
                            </Button>
                        </div>
                    )}
                    {(rma.status === 'approved' || rma.status === 'rejected') && (
                        <Button
                            size="sm"
                            variant="dark"
                            className="shadow-sm rounded-pill px-3"
                            onClick={() => onStatusChange(rma.rma_number, 'completed')}
                        >
                            <i className="fas fa-flag-checkered me-2"></i>Mark Completed
                        </Button>
                    )}
                    {!['completed', 'cancelled'].includes(rma.status) && (
                        <div className="vr mx-2"></div>
                    )}
                    {!['completed', 'cancelled'].includes(rma.status) && (
                        <Button
                            size="sm"
                            variant="primary"
                            className="shadow-sm rounded-pill px-3"
                            onClick={() => setShowRepairForm(true)}
                        >
                            <i className="fas fa-wrench me-2"></i>Create Repair Job
                        </Button>
                    )}
                    {!['completed', 'cancelled'].includes(rma.status) && (
                        <Button
                            size="sm"
                            variant="outline-danger"
                            className="rounded-pill px-3 border-0 bg-light"
                            onClick={() => onStatusChange(rma.rma_number, 'cancelled')}
                            title="Cancel RMA"
                        >
                            <i className="fas fa-ban me-1"></i> Cancel
                        </Button>
                    )}
                </div>
            </div>

            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4 border-bottom-0">
                <Tab eventKey="overview" title="Overview">
                    <Row className="g-4 mb-4">
                        {/* Customer Card */}
                        <Col md={4}>
                            <Card className="h-100 border-0 shadow-sm">
                                <Card.Body className="p-4">
                                    <div className="d-flex align-items-center mb-3 text-primary">
                                        <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                                            <i className="fas fa-user fa-lg"></i>
                                        </div>
                                        <h6 className="mb-0 fw-bold text-uppercase ls-1">Customer</h6>
                                    </div>
                                    <h5 className="mb-1">{rma.customer_name || 'N/A'}</h5>
                                    <p className="mb-1 text-muted small">{rma.customer_email}</p>
                                    <p className="mb-0 text-muted small">{rma.customer_phone}</p>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Warehouse Card */}
                        <Col md={4}>
                            <Card className="h-100 border-0 shadow-sm">
                                <Card.Body>
                                    <div className="d-flex align-items-center mb-3 text-info">
                                        <div className="bg-info bg-opacity-10 p-2 rounded-circle me-3">
                                            <i className="fas fa-warehouse fa-lg"></i>
                                        </div>
                                        <h6 className="mb-0 fw-bold text-uppercase ls-1">Location</h6>
                                    </div>
                                    <h5 className="mb-1 fw-bold">{rma.warehouse_name}</h5>
                                    <p className="mb-1 text-muted small">{rma.warehouse_location}</p>
                                    {rma.quarantine_zone_name && (
                                        <Badge bg="warning" text="dark" className="mt-2 text-wrap">
                                            Zone: {rma.quarantine_zone_name}
                                        </Badge>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Financials Card */}
                        <Col md={4}>
                            <Card className="h-100 border-0 shadow-sm">
                                <Card.Body className="p-4">
                                    <div className="d-flex align-items-center mb-3 text-success">
                                        <div className="bg-success bg-opacity-10 p-2 rounded-circle me-3">
                                            <i className="fas fa-dollar-sign fa-lg"></i>
                                        </div>
                                        <h6 className="mb-0 fw-bold text-uppercase ls-1">Financials</h6>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Total Value:</span>
                                        <strong>{formatCurrency(rma.total_value)}</strong>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Refund Amount:</span>
                                        <strong className="text-success">{formatCurrency(rma.refund_amount)}</strong>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span>Items:</span>
                                        <span>{rma.total_items}</span>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <h6 className="text-muted mb-3">Return Details</h6>
                            <Row>
                                <Col md={6}>
                                    <p><strong>Reason:</strong> <Badge bg="info">{rma.reason_code.replace(/_/g, ' ')}</Badge></p>
                                    {rma.reason_description && (
                                        <div className="mb-3">
                                            <strong>Description:</strong>
                                            <p className="text-muted bg-light p-2 rounded mt-1">{rma.reason_description}</p>
                                        </div>
                                    )}
                                </Col>
                                <Col md={6}>
                                    <p><strong>Created:</strong> {formatDate(rma.created_at)}</p>
                                    <p><strong>Last Updated:</strong> {formatDate(rma.updated_at)}</p>
                                    {rma.expected_return_date && (
                                        <p>
                                            <strong>Expected Return:</strong>{' '}
                                            <Badge bg="warning" text="dark" className="ms-1">
                                                <i className="fas fa-calendar-alt me-1"></i>
                                                {new Date(rma.expected_return_date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </Badge>
                                        </p>
                                    )}
                                    <p><strong>Assigned To:</strong> {rma.assigned_to_name || 'Unassigned'}</p>
                                </Col>
                            </Row>
                            {rma.notes && (
                                <div className="mt-2 pt-3 border-top">
                                    <strong>Internal Notes:</strong>
                                    <p className="text-muted fst-italic mt-1">{rma.notes}</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Tab>


                <Tab eventKey="items" title={`Items (${rma.items?.length || 0})`}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-0">
                            <Table responsive hover className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4">Product</th>
                                        <th>Device Info</th>
                                        <th>Identifiers</th>
                                        <th>Qty</th>
                                        <th>Disposition</th>
                                        <th>Location</th>
                                        <th>Inspection</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(rma.items) && rma.items.length > 0 ? (
                                        rma.items.map((item) => (
                                            <tr key={item.item_id}>
                                                <td className="ps-4">
                                                    <div className="fw-bold">{item.product_name || `Product ${item.product_id}`}</div>
                                                    <div className="small text-muted">{item.product_manufacturer}</div>
                                                    {item.unit_price > 0 && (
                                                        <div className="small text-success fw-bold">
                                                            ${parseFloat(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {item.device_name && (
                                                        <div className="mb-1">
                                                            <i className="fas fa-mobile-alt me-1 text-primary"></i>
                                                            <span className="fw-semibold">{item.device_name}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        {item.color && <Badge bg="light" text="dark" className="me-1 border">{item.color}</Badge>}
                                                        {item.ram && item.rom && <Badge bg="light" text="dark" className="border">{item.ram}/{item.rom}</Badge>}
                                                    </div>
                                                </td>
                                                <td>
                                                    {item.serial_number && (
                                                        <div className="small mb-1">
                                                            <strong>S/N:</strong> <span className="font-monospace text-primary">{item.serial_number}</span>
                                                        </div>
                                                    )}
                                                    {item.device_imei && (
                                                        <div className="small mb-1">
                                                            <strong>IMEI:</strong> <span className="font-monospace text-info">{item.device_imei}</span>
                                                        </div>
                                                    )}
                                                    {item.batch_no && (
                                                        <div className="small">
                                                            <strong>Batch:</strong> <span className="font-monospace">{item.batch_no}</span>
                                                        </div>
                                                    )}
                                                    {!item.serial_number && !item.device_imei && !item.batch_no && <span className="text-muted">-</span>}
                                                </td>
                                                <td>
                                                    <div className="fw-bold">{item.quantity_requested}</div>
                                                    {item.quantity_received > 0 && (
                                                        <div className="small text-success">Rec: {item.quantity_received}</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <Badge bg={getDispositionBadge(item.disposition)} className="status-badge">
                                                        {item.disposition.replace(/_/g, ' ')}
                                                    </Badge>
                                                    {item.problem_description && (
                                                        <div className="small text-muted mt-1" style={{ maxWidth: '150px' }}>
                                                            {item.problem_description.substring(0, 50)}{item.problem_description.length > 50 ? '...' : ''}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {item.current_location_id ? (
                                                        <div className="small">
                                                            <div>{item.warehouse_name}</div>
                                                            <div className="text-muted">{item.zone_name}</div>
                                                            {item.bin_location && <Badge bg="info">{item.bin_location}</Badge>}
                                                        </div>
                                                    ) : (
                                                        <small className="text-muted">Not stored</small>
                                                    )}
                                                </td>
                                                <td>
                                                    <Badge bg={item.inspection_result === 'pass' ? 'success' : item.inspection_result === 'fail' ? 'danger' : 'secondary'}>
                                                        {item.inspection_result || 'Pending'}
                                                    </Badge>
                                                    {item.inspection_notes && (
                                                        <div className="small text-muted mt-1" style={{ maxWidth: '120px' }}>
                                                            {item.inspection_notes.substring(0, 40)}{item.inspection_notes.length > 40 ? '...' : ''}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="text-center py-4 text-muted">
                                                No items found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="history" title="Status History">
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>From Status</th>
                                        <th>To Status</th>
                                        <th>Changed By</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(rma.status_history) && rma.status_history.length > 0 ? (
                                        rma.status_history.map((history) => (
                                            <tr key={history.history_id}>
                                                <td>{formatDate(history.changed_at)}</td>
                                                <td>{history.from_status || '-'}</td>
                                                <td><Badge bg={getStatusBadge(history.to_status)}>{history.to_status}</Badge></td>
                                                <td>{history.changed_by_name}</td>
                                                <td>{history.change_reason || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted">
                                                No status history found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="repair-jobs" title="Repair Jobs">
                    <RepairJobsTab rmaNumber={rma.rma_number} items={rma.items} onUpdate={onUpdate} />
                </Tab>
            </Tabs>


            <RepairJobForm
                show={showRepairForm}
                onHide={() => setShowRepairForm(false)}
                initialRMA={rma}
                onSaved={() => {
                    setShowRepairForm(false);
                    // Refresh if needed, e.g. switch to repair jobs tab
                    setActiveTab('repair-jobs');
                    onUpdate && onUpdate();
                }}
            />
        </div >
    );
};

export default RMADetail;
