import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Table, Modal, Badge } from 'react-bootstrap';
import { customerInvoicesAPI } from '../../api/api';

const CustomerInvoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [warrantySearch, setWarrantySearch] = useState('');
    const [warrantyInfo, setWarrantyInfo] = useState(null);

    // Form state for new invoice
    const [formData, setFormData] = useState({
        invoice_number: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        invoice_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        notes: '',
        items: []
    });

    const navigate = useNavigate();

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);

            const response = await customerInvoicesAPI.getAll(Object.fromEntries(params));
            const result = response.data;

            if (result.success) {
                setInvoices(result.data || []);
            } else {
                setError(result.error || 'Failed to load invoices');
            }
        } catch (err) {
            setError('Failed to load customer invoices');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchInvoices();
    };

    const handleWarrantySearch = async (e) => {
        e.preventDefault();
        if (!warrantySearch.trim()) return;

        try {
            const response = await customerInvoicesAPI.getWarrantyInfo(warrantySearch.trim());
            const result = response.data;

            if (result.success) {
                setWarrantyInfo(result.data);
            } else {
                setWarrantyInfo(null);
                setError(result.error || 'No warranty info found for this IMEI');
            }
        } catch (err) {
            setError('Failed to lookup warranty');
            console.error(err);
        }
    };

    const handleCreateInvoice = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await customerInvoicesAPI.create(formData);
            const result = response.data;

            if (result.success) {
                setSuccess('Customer invoice created successfully!');
                setShowModal(false);
                resetForm();
                fetchInvoices();
            } else {
                setError(result.error || 'Failed to create invoice');
            }
        } catch (err) {
            setError('Failed to create invoice');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            invoice_number: '',
            customer_name: '',
            customer_phone: '',
            customer_email: '',
            invoice_date: new Date().toISOString().split('T')[0],
            payment_method: '',
            notes: '',
            items: []
        });
    };

    const viewInvoiceDetails = async (id) => {
        try {
            const response = await customerInvoicesAPI.getById(id);
            const result = response.data;

            if (result.success) {
                setSelectedInvoice(result.data);
            }
        } catch (err) {
            console.error('Failed to load invoice details:', err);
        }
    };

    const handleEditInvoice = async (invoice) => {
        try {
            const response = await customerInvoicesAPI.getById(invoice.id);
            const result = response.data;

            if (result.success) {
                const inv = result.data;
                setEditingInvoice(inv);
                setFormData({
                    invoice_number: inv.invoice_number || '',
                    customer_name: inv.customer_name || '',
                    customer_phone: inv.customer_phone || '',
                    customer_email: inv.customer_email || '',
                    invoice_date: inv.invoice_date ? new Date(inv.invoice_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    payment_method: inv.payment_method || '',
                    notes: inv.notes || '',
                    items: inv.items || []
                });
                setShowModal(true);
            }
        } catch (err) {
            setError('Failed to load invoice for editing');
            console.error(err);
        }
    };

    const handleUpdateInvoice = async (e) => {
        e.preventDefault();
        if (!editingInvoice) return;

        setLoading(true);
        try {
            const response = await customerInvoicesAPI.update(editingInvoice.id, formData);
            const result = response.data;

            if (result.success) {
                setSuccess('Invoice updated successfully!');
                setShowModal(false);
                setEditingInvoice(null);
                resetForm();
                fetchInvoices();
            } else {
                setError(result.error || 'Failed to update invoice');
            }
        } catch (err) {
            setError('Failed to update invoice');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteInvoice = async (invoice) => {
        if (!window.confirm(`Are you sure you want to delete invoice "${invoice.invoice_number}"? This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        try {
            const response = await customerInvoicesAPI.delete(invoice.id);
            const result = response.data;

            if (result.success) {
                setSuccess('Invoice deleted successfully!');
                fetchInvoices();
            } else {
                setError(result.error || 'Failed to delete invoice');
            }
        } catch (err) {
            setError('Failed to delete invoice');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingInvoice(null);
        resetForm();
    };

    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <h2>
                        <i className="fas fa-receipt me-2"></i>
                        Customer Invoices
                    </h2>
                    <p className="text-muted">Manage retail customer invoices and warranty lookups</p>
                </Col>
                <Col md="auto">
                    <Button variant="success" onClick={() => setShowModal(true)}>
                        <i className="fas fa-plus me-2"></i>
                        New Invoice
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

            {/* Warranty Lookup Section */}
            <Card className="mb-4 border-info">
                <Card.Header className="bg-info text-white">
                    <h5 className="mb-0">
                        <i className="fas fa-shield-alt me-2"></i>
                        Warranty Lookup by IMEI
                    </h5>
                </Card.Header>
                <Card.Body>
                    <Form onSubmit={handleWarrantySearch}>
                        <Row className="align-items-end">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Device IMEI</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={warrantySearch}
                                        onChange={(e) => setWarrantySearch(e.target.value)}
                                        placeholder="Enter device IMEI to check warranty..."
                                    />
                                </Form.Group>
                            </Col>
                            <Col md="auto">
                                <Button type="submit" variant="info">
                                    <i className="fas fa-search me-2"></i>
                                    Check Warranty
                                </Button>
                            </Col>
                        </Row>
                    </Form>

                    {warrantyInfo && (
                        <div className="mt-3 p-3 bg-light rounded">
                            <Row>
                                <Col md={4}>
                                    <strong>Device:</strong> {warrantyInfo.product_name}<br />
                                    <strong>IMEI:</strong> {warrantyInfo.imei}
                                </Col>
                                <Col md={4}>
                                    <strong>Customer:</strong> {warrantyInfo.customer_name}<br />
                                    <strong>Phone:</strong> {warrantyInfo.customer_phone || 'N/A'}
                                </Col>
                                <Col md={4}>
                                    <strong>Purchase Date:</strong> {new Date(warrantyInfo.purchase_date).toLocaleDateString()}<br />
                                    <strong>Warranty Ends:</strong> {new Date(warrantyInfo.warranty_end).toLocaleDateString()}
                                    <br />
                                    {warrantyInfo.is_under_warranty ? (
                                        <Badge bg="success" className="mt-1">Under Warranty ({warrantyInfo.days_remaining} days left)</Badge>
                                    ) : (
                                        <Badge bg="danger" className="mt-1">Warranty Expired</Badge>
                                    )}
                                </Col>
                            </Row>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Invoice Search */}
            <Card className="mb-4">
                <Card.Header>
                    <Form onSubmit={handleSearch}>
                        <Row className="align-items-center">
                            <Col md={6}>
                                <Form.Control
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by customer name, phone, or invoice number..."
                                />
                            </Col>
                            <Col md="auto">
                                <Button type="submit" variant="primary">
                                    <i className="fas fa-search me-2"></i>
                                    Search
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Header>
                <Card.Body>
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                            <i className="fas fa-file-invoice fa-3x mb-3"></i>
                            <p>No customer invoices found</p>
                        </div>
                    ) : (
                        <Table striped hover responsive>
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Customer</th>
                                    <th>Date</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td><strong>{inv.invoice_number}</strong></td>
                                        <td>
                                            {inv.customer_name}
                                            {inv.customer_phone && <small className="text-muted d-block">{inv.customer_phone}</small>}
                                        </td>
                                        <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                                        <td>{inv.item_count || 0}</td>
                                        <td>{parseFloat(inv.total_amount || 0).toLocaleString()}</td>
                                        <td>
                                            <Button size="sm" variant="outline-primary" className="me-1" onClick={() => viewInvoiceDetails(inv.id)} title="View Details">
                                                <i className="fas fa-eye"></i>
                                            </Button>
                                            <Button size="sm" variant="outline-warning" className="me-1" onClick={() => handleEditInvoice(inv)} title="Edit Invoice">
                                                <i className="fas fa-edit"></i>
                                            </Button>
                                            <Button size="sm" variant="outline-danger" onClick={() => handleDeleteInvoice(inv)} title="Delete Invoice">
                                                <i className="fas fa-trash"></i>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Create/Edit Invoice Modal */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editingInvoice ? 'Edit Customer Invoice' : 'Create Customer Invoice'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={editingInvoice ? handleUpdateInvoice : handleCreateInvoice}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Invoice Number *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.invoice_number}
                                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Invoice Date *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={formData.invoice_date}
                                        onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Customer Name *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Customer Phone</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.customer_phone}
                                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Customer Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={formData.customer_email}
                                        onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Payment Method</Form.Label>
                                    <Form.Select
                                        value={formData.payment_method}
                                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="credit_card">Credit Card</option>
                                        <option value="momo">MoMo</option>
                                        <option value="other">Other</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button variant="success" type="submit" disabled={loading}>
                            {loading ? (editingInvoice ? 'Updating...' : 'Creating...') : (editingInvoice ? 'Update Invoice' : 'Create Invoice')}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Invoice Details Modal */}
            <Modal show={!!selectedInvoice} onHide={() => setSelectedInvoice(null)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Invoice Details - {selectedInvoice?.invoice_number}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedInvoice && (
                        <>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <strong>Customer:</strong> {selectedInvoice.customer_name}<br />
                                    <strong>Phone:</strong> {selectedInvoice.customer_phone || 'N/A'}<br />
                                    <strong>Email:</strong> {selectedInvoice.customer_email || 'N/A'}
                                </Col>
                                <Col md={6}>
                                    <strong>Date:</strong> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}<br />
                                    <strong>Payment:</strong> {selectedInvoice.payment_method || 'N/A'}<br />
                                    <strong>Total:</strong> {parseFloat(selectedInvoice.total_amount || 0).toLocaleString()}
                                </Col>
                            </Row>

                            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                                <Table striped size="sm">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>IMEI</th>
                                            <th>Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedInvoice.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{item.product_name || 'N/A'}</td>
                                                <td>{item.imei || 'N/A'}</td>
                                                <td>{parseFloat(item.price || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CustomerInvoices;
