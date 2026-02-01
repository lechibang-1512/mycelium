import React, { useState, useEffect, useCallback } from 'react';
import { Button, Spinner, Accordion, ListGroup, Row, Col, Badge, Alert, Toast, ToastContainer } from 'react-bootstrap';
import { rmaAPI } from '../../services/api';
import RepairJobForm from '../spareparts/RepairJobForm';

/**
 * Toast notification system for user feedback
 * Uses a module-level state that components can subscribe to
 */
let toastListeners = [];
let toastQueue = [];

const toast = {
    _notify(type, msg) {
        const notification = { id: Date.now(), type, message: msg };
        toastQueue.push(notification);
        toastListeners.forEach(listener => listener([...toastQueue]));
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toastQueue = toastQueue.filter(t => t.id !== notification.id);
            toastListeners.forEach(listener => listener([...toastQueue]));
        }, 5000);
    },
    success: (msg) => toast._notify('success', msg),
    error: (msg) => toast._notify('danger', msg),
    warning: (msg) => toast._notify('warning', msg),
    info: (msg) => toast._notify('info', msg),
    subscribe: (listener) => {
        toastListeners.push(listener);
        return () => { toastListeners = toastListeners.filter(l => l !== listener); };
    }
};

// Toast display component
const ToastNotifications = () => {
    const [toasts, setToasts] = useState([]);
    
    useEffect(() => {
        return toast.subscribe(setToasts);
    }, []);
    
    return (
        <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
            {toasts.map(t => (
                <Toast key={t.id} bg={t.type} autohide delay={5000}>
                    <Toast.Body className={t.type === 'success' || t.type === 'danger' ? 'text-white' : ''}>
                        {t.type === 'success' && '✓ '}
                        {t.type === 'danger' && '✗ '}
                        {t.type === 'warning' && '⚠ '}
                        {t.type === 'info' && 'ℹ '}
                        {t.message}
                    </Toast.Body>
                </Toast>
            ))}
        </ToastContainer>
    );
};

/**
 * RepairJobsTab component - displays linked repair jobs for RMA items
 * Updated for unified rma table with JSON items
 */
const RepairJobsTab = ({ rmaNumber, items, onUpdate }) => {
    const [repairJobs, setRepairJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [rmaData, setRmaData] = useState(null);

    useEffect(() => {
        if (rmaNumber) {
            loadRepairJobs();
            loadRMAData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rmaNumber]);

    const loadRMAData = async () => {
        try {
            const response = await rmaAPI.getById(rmaNumber);
            setRmaData(response.data || response);
        } catch (error) {
            console.error('Failed to load RMA data:', error);
        }
    };

    const loadRepairJobs = async () => {
        try {
            setLoading(true);
            const response = await rmaAPI.getRepairJobs(rmaNumber);
            // Ensure we have an array
            let data = [];
            if (response && response.data) {
                data = Array.isArray(response.data) ? response.data : [];
            } else if (Array.isArray(response)) {
                data = response;
            }
            setRepairJobs(data);
        } catch (error) {
            console.error('Failed to load repair jobs:', error);
            setRepairJobs([]);
            toast?.error?.('Failed to load repair jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleUnlinkRepairJob = async (itemId) => {
        if (!confirm('Are you sure you want to unlink this repair job?')) return;

        try {
            await rmaAPI.unlinkRepairJob(rmaNumber, itemId);
            toast.success('Repair job unlinked successfully');
            loadRepairJobs();
            onUpdate?.();
        } catch (error) {
            console.error('Failed to unlink repair job:', error);
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to unlink repair job');
        }
    };

    const getRepairStatusBadge = (status) => {
        const normalizedStatus = status?.toUpperCase();
        const map = {
            PENDING: 'secondary',
            PARTS_ORDERED: 'warning',
            IN_PROGRESS: 'primary',
            COMPLETED: 'success',
            CANCELLED: 'danger'
        };
        return map[normalizedStatus] || 'secondary';
    };

    const getRepairPriorityBadge = (priority) => {
        const normalizedPriority = priority?.toUpperCase();
        const map = {
            LOW: 'info',
            NORMAL: 'secondary',
            HIGH: 'warning',
            URGENT: 'danger'
        };
        return map[normalizedPriority] || 'secondary';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('en-US');
    };

    // Group repair jobs by RMA item_id (from flattened response)
    const jobsByItem = Array.isArray(repairJobs)
        ? repairJobs.reduce((acc, job) => {
            const itemId = job.item_id;
            if (!acc[itemId]) acc[itemId] = [];
            acc[itemId].push(job);
            return acc;
        }, {})
        : {};

    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" />
                <p className="mt-2">Loading repair jobs...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                    <i className="fas fa-tools me-2"></i>
                    Linked Repair Jobs ({repairJobs.length})
                </h5>
            </div>

            {items && items.length > 0 ? (
                <Accordion defaultActiveKey="0">
                    {items.map((item, idx) => {
                        const itemJobs = jobsByItem[item.item_id] || [];
                        const canCreateRepair = item.disposition === 'repair';

                        return (
                            <Accordion.Item eventKey={String(idx)} key={item.item_id || idx}>
                                <Accordion.Header>
                                    <div className="d-flex w-100 align-items-center justify-content-between pe-3">
                                        <div>
                                            <strong>{item.device_name || item.product_name || `Product ${item.product_id}`}</strong>
                                            {item.device_identifier && (
                                                <span className="ms-2 text-muted">
                                                    <small>ID: {item.device_identifier}</small>
                                                </span>
                                            )}
                                            {item.batch_no && (
                                                <span className="ms-2 text-muted">
                                                    <small>Batch: {item.batch_no}</small>
                                                </span>
                                            )}
                                        </div>
                                        <Badge bg={itemJobs.length > 0 ? 'success' : 'secondary'}>
                                            {itemJobs.length} {itemJobs.length === 1 ? 'job' : 'jobs'}
                                        </Badge>
                                    </div>
                                </Accordion.Header>
                                <Accordion.Body>
                                    {itemJobs.length > 0 ? (
                                        <ListGroup className="mb-3">
                                            {itemJobs.map((job) => (
                                                <ListGroup.Item key={job.repair_job_id}>
                                                    <Row>
                                                        <Col md={8}>
                                                            <div className="d-flex align-items-center mb-2">
                                                                <h6 className="mb-0 me-2">{job.job_number || `Job #${job.repair_job_id}`}</h6>
                                                                <Badge bg={getRepairStatusBadge(job.status)} className="me-2">
                                                                    {job.status?.replace(/_/g, ' ')}
                                                                </Badge>
                                                                <Badge bg={getRepairPriorityBadge(job.priority)}>
                                                                    {job.priority}
                                                                </Badge>
                                                            </div>
                                                            <p className="mb-1">
                                                                <strong>Device:</strong> {job.device_name || '-'}
                                                                {job.device_imei && <span className="ms-2 text-muted">IMEI: {job.device_imei}</span>}
                                                            </p>
                                                            {job.assigned_technician && (
                                                                <p className="mb-1">
                                                                    <small>
                                                                        <i className="fas fa-user me-1"></i>
                                                                        Assigned to: {job.assigned_technician}
                                                                    </small>
                                                                </p>
                                                            )}
                                                            <p className="mb-0">
                                                                <small className="text-muted">
                                                                    <i className="fas fa-calendar me-1"></i>
                                                                    Created: {formatDate(job.created_at)}
                                                                    {job.link_reason && (
                                                                        <span className="ms-2">
                                                                            | Link: {job.link_reason.replace(/_/g, ' ')}
                                                                        </span>
                                                                    )}
                                                                </small>
                                                            </p>
                                                        </Col>
                                                        <Col md={4} className="text-end">
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleUnlinkRepairJob(job.item_id)}
                                                            >
                                                                <i className="fas fa-unlink me-1"></i>
                                                                Unlink
                                                            </Button>
                                                        </Col>
                                                    </Row>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : (
                                        <Alert variant="info">
                                            <i className="fas fa-info-circle me-2"></i>
                                            No repair jobs linked to this item yet.
                                        </Alert>
                                    )}

                                    {canCreateRepair && (
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedItem(item);
                                                setShowCreateModal(true);
                                            }}
                                        >
                                            <i className="fas fa-plus me-1"></i>
                                            Create Repair Job for This Item
                                        </Button>
                                    )}
                                    {!canCreateRepair && (
                                        <Alert variant="secondary" className="mt-2 mb-0">
                                            <small>
                                                <i className="fas fa-info-circle me-1"></i>
                                                Set disposition to "repair" to create repair jobs
                                            </small>
                                        </Alert>
                                    )}
                                </Accordion.Body>
                            </Accordion.Item>
                        );
                    })}
                </Accordion>
            ) : (
                <Alert variant="warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    No items found in this RMA.
                </Alert>
            )}


            {/* Create Repair Job using unified form */}
            {selectedItem && rmaData && (
                <RepairJobForm
                    show={showCreateModal}
                    onHide={() => setShowCreateModal(false)}
                    onSaved={() => {
                        setShowCreateModal(false);
                        loadRepairJobs();
                        onUpdate?.();
                    }}
                    initialRMA={{
                        ...rmaData,
                        items: [selectedItem]
                    }}
                />
            )}


        </div>
    );
};

export default RepairJobsTab;
