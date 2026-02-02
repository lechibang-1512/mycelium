import React, { useState, useEffect } from 'react';
import { Modal, Table, Card, Badge, Row, Col, Spinner } from 'react-bootstrap';
import { repairJobsAPI } from '../../api/api';

const CustomerHistoryModal = ({ show, onHide, customer }) => {
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && customer) {
            loadHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, customer]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const res = await repairJobsAPI.getCustomerHistory({
                customer_name: customer.name,
                customer_email: customer.email,
                customer_phone: customer.phone
            });
            setHistory(res.data.data);
        } catch (error) {
            console.error('Failed to load customer history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            PENDING: 'secondary',
            PARTS_ORDERED: 'warning',
            IN_PROGRESS: 'primary',
            COMPLETED: 'success',
            CANCELLED: 'danger',
        };
        return map[status] || 'secondary';
    };

    return (
        <Modal show={show} onHide={onHide} size="xl">
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="fas fa-user-clock me-2"></i>
                    Customer Repair History
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2 text-muted">Loading customer history...</p>
                    </div>
                ) : history ? (
                    <>
                        <Card className="mb-4 border-0 shadow-sm">
                            <Card.Body>
                                <Row>
                                    <Col md={12} className="mb-3">
                                        <h5 className="mb-0">
                                            <i className="fas fa-user me-2 text-primary"></i>
                                            {history.customer.name}
                                        </h5>
                                    </Col>
                                    <Col md={4}>
                                        <div className="text-muted small">Email</div>
                                        <div className="fw-bold">{history.customer.email || 'N/A'}</div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="text-muted small">Phone</div>
                                        <div className="fw-bold">{history.customer.phone || 'N/A'}</div>
                                    </Col>
                                </Row>
                                <hr />
                                <Row className="text-center">
                                    <Col md={3}>
                                        <div className="p-3 bg-primary bg-opacity-10 rounded">
                                            <h3 className="mb-0 text-primary">{history.stats?.total_jobs || 0}</h3>
                                            <div className="small text-muted mt-1">Total Jobs</div>
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="p-3 bg-success bg-opacity-10 rounded">
                                            <h3 className="mb-0 text-success">{history.stats?.completed_jobs || 0}</h3>
                                            <div className="small text-muted mt-1">Completed</div>
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="p-3 bg-info bg-opacity-10 rounded">
                                            <h3 className="mb-0 text-info">${(history.stats?.total_spent || 0).toFixed(2)}</h3>
                                            <div className="small text-muted mt-1">Total Spent</div>
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="p-3 bg-warning bg-opacity-10 rounded">
                                            <h3 className="mb-0 text-warning">{(history.stats?.avg_repair_days || 0).toFixed(1)}</h3>
                                            <div className="small text-muted mt-1">Avg Repair Days</div>
                                        </div>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        <h6 className="mb-3">
                            <i className="fas fa-history me-2"></i>
                            Past Repairs ({history.jobs.length})
                        </h6>
                        {history.jobs.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="fas fa-inbox fa-3x mb-3 d-block opacity-25"></i>
                                No repair history found
                            </div>
                        ) : (
                            <Table striped bordered hover responsive>
                                <thead className="bg-light">
                                    <tr>
                                        <th>Job #</th>
                                        <th>Device</th>
                                        <th>Issue</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Received Date</th>
                                        <th>Completed Date</th>
                                        <th>Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.jobs.map(job => (
                                        <tr key={job.repair_job_id}>
                                            <td className="fw-bold">{job.job_number}</td>
                                            <td>{job.device_name || 'N/A'}</td>
                                            <td>
                                                <div className="text-truncate" style={{ maxWidth: '200px' }}>
                                                    {job.issue_description || 'N/A'}
                                                </div>
                                            </td>
                                            <td>
                                                <Badge bg={getStatusBadge(job.status)}>
                                                    {job.status}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge bg={job.priority === 'URGENT' ? 'danger' : job.priority === 'HIGH' ? 'warning' : 'info'}>
                                                    {job.priority}
                                                </Badge>
                                            </td>
                                            <td>{new Date(job.received_date).toLocaleDateString()}</td>
                                            <td>{job.completion_date ? new Date(job.completion_date).toLocaleDateString() : '-'}</td>
                                            <td className="fw-bold">${job.customer_charge || job.final_cost || job.estimated_cost || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </>
                ) : null}
            </Modal.Body>
        </Modal>
    );
};

export default CustomerHistoryModal;
