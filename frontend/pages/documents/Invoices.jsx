import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { invoicesAPI, suppliersAPI, reportsAPI } from '../../api/api';
import { sparePartsAPI } from '../../api/api/spare-parts';
import { useLocation } from 'react-router-dom';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [spareParts, setSpareParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // UI state
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [importMode, setImportMode] = useState(true);
    const [selectedFile, setSelectedFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importSuccess, setImportSuccess] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        invoice_number: '',
        pattern_number: '01GTKT0/001',
        serial_number: 'AA/24P',
        supplier_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        subtotal: 0,
        tax_rate: 10,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        currency: 'VND',
        payment_method: 'Cash/Transfer',
        notes: '',
        items: []
    });

    const location = useLocation();

    useEffect(() => {
        fetchData();
        fetchProducts();
        fetchSpareParts();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const uuid = params.get('uuid');
        if (uuid) {
            handleViewDetail({ uuid });
        }
    }, [location.search]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invRes, supRes] = await Promise.all([
                invoicesAPI.getInvoices(),
                suppliersAPI.getAll({ status: 'active' })
            ]);
            setInvoices(invRes.data.data || []);
            setSuppliers(supRes.data.suppliers || []);
        } catch (err) {
            setError('Failed to fetch data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await reportsAPI.getProducts();
            setProducts(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch products', err);
        }
    };

    const fetchSpareParts = async () => {
        try {
            const res = await sparePartsAPI.getAll();
            setSpareParts(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch spare parts', err);
        }
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, {
                item_type: 'product',
                product_id: '',
                spare_part_id: '',
                description: '',
                unit: 'Unit',
                quantity: 1,
                unit_price: 0,
                total_price: 0,
                tax_rate: formData.tax_rate,
                discount_rate: 0
            }]
        });
    };

    const handleRemoveItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        calculateTotals(newItems);
    };

    const calculateTotals = (items, taxRate = formData.tax_rate, discountAmount = formData.discount_amount) => {
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const taxAmount = (subtotal * taxRate) / 100;
        const totalAmount = subtotal + taxAmount - discountAmount;

        setFormData({
            ...formData,
            items,
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount
        });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        // Handle item type change
        if (field === 'item_type') {
            newItems[index].product_id = '';
            newItems[index].spare_part_id = '';
            newItems[index].description = '';
            newItems[index].unit_price = 0;
        }

        // If product is selected, auto-fill description and price if empty
        if (field === 'product_id' && value) {
            const product = products.find(p => p.product_id === value);
            if (product) {
                newItems[index].product_uuid = product.product_uuid;
                if (!newItems[index].description) newItems[index].description = `${product.device_maker} ${product.device_name}`;
                if (!newItems[index].unit_price) newItems[index].unit_price = product.device_price;
            }
        }

        // If spare part is selected, auto-fill description and price
        if (field === 'spare_part_id' && value) {
            const sparePart = spareParts.find(sp => sp.spare_part_id === parseInt(value));
            if (sparePart) {
                if (!newItems[index].description) newItems[index].description = sparePart.part_name;
                if (!newItems[index].unit_price) newItems[index].unit_price = sparePart.unit_price || 0;
                newItems[index].unit = 'Unit';
            }
        }

        // Calculate item total price
        newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;

        calculateTotals(newItems);
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
        setImportSuccess(null);
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        try {
            setImporting(true);
            setError('');
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await invoicesAPI.importInvoice(formData);
            setImportSuccess(res.data);
            fetchData();
            // Optional: Show success message for a bit then close or redirect
            setTimeout(() => {
                setShowModal(false);
                setSelectedFile(null);
                setImportSuccess(null);
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to import invoice');
        } finally {
            setImporting(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                invoice_date: formData.invoice_date || null,
                due_date: formData.due_date || null,
                notes: formData.notes || null,
                items: formData.items.map(item => ({
                    ...item,
                    product_id: item.item_type === 'product' ? (item.product_id || null) : null,
                    product_uuid: item.item_type === 'product' ? (item.product_uuid || null) : null,
                    spare_part_id: item.item_type === 'spare_part' ? (item.spare_part_id || null) : null
                }))
            };
            await invoicesAPI.createInvoice(payload);
            setShowModal(false);
            setFormData({
                invoice_number: '',
                pattern_number: '01GTKT0/001',
                serial_number: 'AA/24P',
                supplier_id: '',
                invoice_date: new Date().toISOString().split('T')[0],
                due_date: '',
                subtotal: 0,
                tax_rate: 10,
                tax_amount: 0,
                discount_amount: 0,
                total_amount: 0,
                currency: 'VND',
                payment_method: 'Cash/Transfer',
                notes: '',
                items: []
            });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create invoice');
        }
    };

    const handleViewDetail = async (invoice) => {
        try {
            setDetailLoading(true);
            setShowDetailModal(true);
            const res = await invoicesAPI.getInvoiceDetail(invoice.uuid);
            setSelectedInvoiceData(res.data.data);
        } catch (err) {
            console.error('Failed to fetch invoice details', err);
            setSelectedInvoiceData(invoice); // Fallback to list data
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDeleteInvoice = async (invoice) => {
        if (!window.confirm(`Are you sure you want to delete invoice "${invoice.invoice_number}"? This action cannot be undone.`)) {
            return;
        }
        try {
            await invoicesAPI.deleteInvoice(invoice.uuid);
            setSuccess('Invoice deleted successfully');
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete invoice');
        }
    };



    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <h2><i className="fas fa-file-invoice-dollar me-2"></i>Invoices</h2>
                </Col>
                <Col md="auto">
                    <Button variant="success" onClick={() => { setImportMode(true); setShowModal(true); }}>
                        <i className="fas fa-file-import me-2"></i>Import Invoice
                    </Button>
                </Col>
            </Row>

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

            <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Invoice Number</th>
                                <th>Supplier</th>
                                <th>Invoice Date</th>
                                <th>Due Date</th>
                                <th>Total Amount</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-4"><Spinner animation="border" size="sm" /> Loading...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-4">No invoices found</td></tr>
                            ) : invoices.map(invoice => (
                                <tr key={invoice.uuid}>
                                    <td className="fw-bold">{invoice.invoice_number}</td>
                                    <td>{invoice.supplier_name}</td>
                                    <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                                    <td>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</td>
                                    <td>${Number(invoice.total_amount).toLocaleString()}</td>
                                    <td>
                                        <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleViewDetail(invoice)} title="View Detail">
                                            <i className="fas fa-eye"></i>
                                        </Button>
                                        <Button variant="outline-danger" size="sm" onClick={() => handleDeleteInvoice(invoice)} title="Delete Invoice">
                                            <i className="fas fa-trash"></i>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Detail Modal */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="xl">
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="text-muted small">Invoice Detail: {selectedInvoiceData?.invoice_number}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    {detailLoading ? (
                        <div className="text-center py-5"><Spinner animation="border" variant="success" /></div>
                    ) : selectedInvoiceData && (
                        <div className="invoice-container p-5 bg-white mx-auto" style={{ maxWidth: '1000px', border: '1px solid #dee2e6' }}>
                            {/* Header Section */}
                            <Row className="mb-4">
                                <Col xs={4}>
                                    <div className="text-center">
                                        {/* Placeholder for QR Code */}
                                        <div style={{ width: '80px', height: '80px', border: '1px solid #000', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                            QR CODE
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={4} className="text-center">
                                    <h4 className="fw-bold mb-0" style={{ color: '#c00' }}>VAT INVOICE</h4>
                                    <p className="mb-0">Date {new Date(selectedInvoiceData.invoice_date).getDate()} Month {new Date(selectedInvoiceData.invoice_date).getMonth() + 1} Year {new Date(selectedInvoiceData.invoice_date).getFullYear()}</p>
                                </Col>
                                <Col xs={4} className="text-end">
                                    <p className="mb-0 small"><strong>Pattern:</strong> {selectedInvoiceData.pattern_number || '01GTKT0/001'}</p>
                                    <p className="mb-0 small"><strong>Serial:</strong> {selectedInvoiceData.serial_number || 'AA/24P'}</p>
                                    <p className="mb-0 small"><strong>No:</strong> <span className="text-danger fw-bold fs-5">{selectedInvoiceData.invoice_number}</span></p>
                                </Col>
                            </Row>

                            <hr style={{ borderTop: '2px solid #000' }} />

                            {/* Seller Section (Supplier) */}
                            <div className="mb-3">
                                <p className="mb-1"><strong>Seller:</strong> <span className="text-uppercase fw-bold">{selectedInvoiceData.supplier_name}</span></p>
                                <p className="mb-1"><strong>Tax ID:</strong> {selectedInvoiceData.supplier_tax_id || 'N/A'}</p>
                                <p className="mb-1"><strong>Address:</strong> {selectedInvoiceData.supplier_address || 'N/A'}</p>
                                <p className="mb-1"><strong>Phone:</strong> {selectedInvoiceData.supplier_phone || 'N/A'}</p>
                            </div>

                            <hr />

                            {/* Buyer Section (Mycelium) */}
                            <div className="mb-4">
                                <p className="mb-1"><strong>Buyer:</strong> <span className="text-uppercase fw-bold">MYCELIUM TECHNOLOGY CO., LTD</span></p>
                                <p className="mb-1"><strong>Tax ID:</strong> 0123456789</p>
                                <p className="mb-1"><strong>Address:</strong> 10th Floor, ABC Building, District 1, Ho Chi Minh City, Vietnam</p>
                                <div className="d-flex justify-content-between">
                                    <p className="mb-1"><strong>Payment Method:</strong> {selectedInvoiceData.payment_method || 'Cash/Transfer'}</p>
                                    <p className="mb-1"><strong>Currency:</strong> {selectedInvoiceData.currency || 'VND'}</p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <Table responsive bordered className="mb-0 border-dark text-center">
                                <thead className="border-dark align-middle">
                                    <tr>
                                        <th style={{ width: '50px' }}>No</th>
                                        <th>Description of Goods/Services</th>
                                        <th style={{ width: '80px' }}>Unit</th>
                                        <th style={{ width: '80px' }}>Quantity</th>
                                        <th style={{ width: '120px' }}>Unit Price</th>
                                        <th style={{ width: '140px' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="border-dark">
                                    {selectedInvoiceData.items && selectedInvoiceData.items.length > 0 ? (
                                        selectedInvoiceData.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{idx + 1}</td>
                                                <td className="text-start">
                                                    <div><strong>{item.product_name || item.description}</strong></div>
                                                    {item.product_name && <small className="text-muted d-block">{item.description}</small>}
                                                </td>
                                                <td>{item.unit || 'Unit'}</td>
                                                <td>{item.quantity}</td>
                                                <td className="text-end">{Number(item.unit_price).toLocaleString()}</td>
                                                <td className="text-end">{Number(item.total_amount || item.total_price || (item.quantity * item.unit_price)).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="py-4">No item data available</td></tr>
                                    )}
                                </tbody>
                            </Table>

                            {/* Summary Section */}
                            <div className="d-flex justify-content-end">
                                <Table bordered className="mb-0 border-top-0 border-dark" style={{ width: '100%', tableLayout: 'fixed' }}>
                                    <tbody>
                                        <tr>
                                            <td colSpan={5} className="text-end fw-bold py-2" style={{ borderRight: '1px solid black' }}>Subtotal:</td>
                                            <td className="text-end fw-bold py-2">{Number(selectedInvoiceData.subtotal || selectedInvoiceData.total_amount / 1.1).toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={5} className="text-end fw-bold py-2" style={{ borderRight: '1px solid black' }}>Tax Rate: {selectedInvoiceData.tax_rate || 10}% - Tax Amount:</td>
                                            <td className="text-end fw-bold py-2">{Number(selectedInvoiceData.tax_amount || selectedInvoiceData.total_amount - (selectedInvoiceData.subtotal || selectedInvoiceData.total_amount / 1.1)).toLocaleString()}</td>
                                        </tr>
                                        {selectedInvoiceData.discount_amount > 0 && (
                                            <tr>
                                                <td colSpan={5} className="text-end fw-bold py-2" style={{ borderRight: '1px solid black' }}>Discount:</td>
                                                <td className="text-end fw-bold py-2">{Number(selectedInvoiceData.discount_amount).toLocaleString()}</td>
                                            </tr>
                                        )}
                                        <tr className="bg-light">
                                            <td colSpan={5} className="text-end fw-bold py-2 fs-5 text-danger" style={{ borderRight: '1px solid black' }}>GRAND TOTAL:</td>
                                            <td className="text-end fw-bold py-2 fs-5 text-danger">{Number(selectedInvoiceData.total_amount).toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </div>

                            {/* Signature Section */}
                            <Row className="mt-5 pt-3">
                                <Col xs={6} className="text-center">
                                    <p className="fw-bold mb-5">BUYER</p>
                                    <small className="text-muted">(Signature, Full Name)</small>
                                </Col>
                                <Col xs={6} className="text-center">
                                    <p className="fw-bold mb-5">SELLER</p>
                                    <small className="text-muted">(Signature, Stamp, Full Name)</small>
                                </Col>
                            </Row>

                            <div className="mt-5 text-center small text-muted font-italic">
                                (Please check and compare when issuing or receiving invoices)
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>
                    <Button variant="primary" onClick={() => window.print()}><i className="fas fa-print me-2"></i>Print Invoice</Button>
                </Modal.Footer>
            </Modal>

            {/* Create/Import Modal */}
            <Modal show={showModal} onHide={() => { setShowModal(false); setImportSuccess(null); }} size="xl">
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>
                        <i className={importMode ? "fas fa-file-import me-2" : "fas fa-plus-circle me-2"}></i>
                        {importMode ? "Import VAT Invoice (XML)" : "Create New VAT Invoice Manual"}
                    </Modal.Title>
                </Modal.Header>
                <div className="bg-light p-3 border-bottom d-flex justify-content-center">
                    <Button
                        variant={importMode ? "success" : "outline-success"}
                        className="me-2"
                        onClick={() => setImportMode(true)}
                        size="sm"
                    >
                        <i className="fas fa-magic me-1"></i> XML Import (Recommended)
                    </Button>
                    <Button
                        variant={!importMode ? "success" : "outline-success"}
                        onClick={() => setImportMode(false)}
                        size="sm"
                    >
                        <i className="fas fa-keyboard me-1"></i> Manual Entry
                    </Button>
                </div>

                {importMode ? (
                    <Form onSubmit={handleImport}>
                        <Modal.Body className="bg-light py-5">
                            <Container>
                                <Row className="justify-content-center">
                                    <Col md={8}>
                                        <Card className="shadow-sm border-0 text-center p-5">
                                            <div className="mb-4">
                                                <i className="fas fa-file-code fa-4x text-success opacity-50"></i>
                                            </div>
                                            <h4>Upload T-VAN XML Invoice</h4>
                                            <p className="text-muted">Select the Vietnam e-invoice XML file to automatically parse and import data.</p>

                                            <Form.Group controlId="formFile" className="mb-4 mt-4">
                                                <Form.Control
                                                    type="file"
                                                    accept=".xml"
                                                    onChange={handleFileChange}
                                                    required
                                                    disabled={importing || !!importSuccess}
                                                />
                                            </Form.Group>

                                            {importing && (
                                                <div className="py-3">
                                                    <Spinner animation="border" variant="success" className="me-2" />
                                                    <span>Parsing and importing data...</span>
                                                </div>
                                            )}

                                            {importSuccess && (
                                                <Alert variant="success" className="mt-3">
                                                    <i className="fas fa-check-circle me-2"></i>
                                                    {importSuccess.message || `Invoice ${importSuccess.invoiceUuid || 'successfully'} imported!`}
                                                    {importSuccess.invoiceUuid && (
                                                        <div className="mt-1 small opacity-75">
                                                            ID: {importSuccess.invoiceUuid}
                                                        </div>
                                                    )}
                                                </Alert>
                                            )}

                                            {error && (
                                                <Alert variant="danger" className="mt-3">
                                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                                    {error}
                                                </Alert>
                                            )}
                                        </Card>
                                    </Col>
                                </Row>
                            </Container>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                            <Button
                                variant="success"
                                type="submit"
                                disabled={!selectedFile || importing || !!importSuccess}
                                className="px-5"
                            >
                                <i className="fas fa-upload me-2"></i>
                                {importing ? "Importing..." : "Start Import"}
                            </Button>
                        </Modal.Footer>
                    </Form>
                ) : (
                    <Form onSubmit={handleCreate}>
                        <Modal.Body className="bg-light">
                            <Card className="shadow-sm border-0 mb-4">
                                <Card.Body>
                                    <h5 className="mb-3 text-success border-bottom pb-2">Invoice Information</h5>
                                    <Row>
                                        <Col md={2}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold small">Invoice # *</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    type="text"
                                                    value={formData.invoice_number}
                                                    onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                                                    required
                                                    placeholder="9160970"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={2}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold small">Pattern</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    type="text"
                                                    value={formData.pattern_number}
                                                    onChange={e => setFormData({ ...formData, pattern_number: e.target.value })}
                                                    placeholder="01GTKT0/001"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={2}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold small">Serial</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    type="text"
                                                    value={formData.serial_number}
                                                    onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                                                    placeholder="AA/24P"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={3}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold small">Supplier *</Form.Label>
                                                <Form.Select
                                                    size="sm"
                                                    value={formData.supplier_id}
                                                    onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Select...</option>
                                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={3}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold small">Payment Method</Form.Label>
                                                <Form.Select
                                                    size="sm"
                                                    value={formData.payment_method}
                                                    onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                                                >
                                                    <option value="Cash/Transfer">Cash/Transfer</option>
                                                    <option value="Cash">Cash</option>
                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col md={2}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold small">Invoice Date</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    type="date"
                                                    value={formData.invoice_date}
                                                    onChange={e => setFormData({ ...formData, invoice_date: e.target.value })}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={2}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold small">Due Date</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    type="date"
                                                    value={formData.due_date}
                                                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={2}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold small">Currency</Form.Label>
                                                <Form.Select
                                                    size="sm"
                                                    value={formData.currency}
                                                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                                >
                                                    <option value="VND">VND</option>
                                                    <option value="USD">USD</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold small">Notes</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    type="text"
                                                    value={formData.notes}
                                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                                    placeholder="Additional notes..."
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            <Card className="shadow-sm border-0 mb-4">
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                                        <h5 className="mb-0 text-success">Invoice Items</h5>
                                        <Button variant="outline-success" size="sm" onClick={handleAddItem}>
                                            <i className="fas fa-plus me-1"></i>Add Item
                                        </Button>
                                    </div>

                                    {formData.items.length > 0 ? (
                                        <Table responsive borderless hover size="sm">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '12%' }}>Type</th>
                                                    <th style={{ width: '20%' }}>Item</th>
                                                    <th>Description</th>
                                                    <th style={{ width: '8%' }}>Unit</th>
                                                    <th style={{ width: '6%' }}>Qty</th>
                                                    <th style={{ width: '12%' }}>Price</th>
                                                    <th style={{ width: '12%' }}>Total</th>
                                                    <th style={{ width: '4%' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.items.map((item, index) => (
                                                    <tr key={index} className="align-middle">
                                                        <td>
                                                            <Form.Select
                                                                value={item.item_type}
                                                                onChange={e => handleItemChange(index, 'item_type', e.target.value)}
                                                                className="form-control-sm"
                                                            >
                                                                <option value="product">Product</option>
                                                                <option value="spare_part">Spare Part</option>
                                                            </Form.Select>
                                                        </td>
                                                        <td>
                                                            {item.item_type === 'product' ? (
                                                                <Form.Select
                                                                    value={item.product_id}
                                                                    onChange={e => handleItemChange(index, 'product_id', e.target.value)}
                                                                    className="form-control-sm"
                                                                >
                                                                    <option value="">Select Product...</option>
                                                                    {products.map(p => (
                                                                        <option key={p.product_id} value={p.product_id}>
                                                                            {p.device_maker} {p.device_name}
                                                                        </option>
                                                                    ))}
                                                                </Form.Select>
                                                            ) : (
                                                                <Form.Select
                                                                    value={item.spare_part_id}
                                                                    onChange={e => handleItemChange(index, 'spare_part_id', e.target.value)}
                                                                    className="form-control-sm"
                                                                >
                                                                    <option value="">Select Spare Part...</option>
                                                                    {spareParts.map(sp => (
                                                                        <option key={sp.spare_part_id} value={sp.spare_part_id}>
                                                                            {sp.part_code} - {sp.part_name}
                                                                        </option>
                                                                    ))}
                                                                </Form.Select>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <Form.Control
                                                                type="text"
                                                                value={item.description}
                                                                onChange={e => handleItemChange(index, 'description', e.target.value)}
                                                                placeholder="Item description"
                                                                className="form-control-sm"
                                                            />
                                                        </td>
                                                        <td>
                                                            <Form.Control
                                                                type="text"
                                                                value={item.unit}
                                                                onChange={e => handleItemChange(index, 'unit', e.target.value)}
                                                                placeholder="Unit"
                                                                className="form-control-sm"
                                                            />
                                                        </td>
                                                        <td>
                                                            <Form.Control
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                                                min="1"
                                                                className="form-control-sm"
                                                            />
                                                        </td>
                                                        <td>
                                                            <Form.Control
                                                                type="number"
                                                                step="0.01"
                                                                value={item.unit_price}
                                                                onChange={e => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                                placeholder="0.00"
                                                                className="form-control-sm text-end"
                                                            />
                                                        </td>
                                                        <td>
                                                            <Form.Control
                                                                type="text"
                                                                value={(item.total_price || 0).toLocaleString()}
                                                                readOnly
                                                                className="form-control-sm text-end bg-light fw-bold"
                                                            />
                                                        </td>
                                                        <td className="text-center">
                                                            <Button variant="link" className="text-danger p-0" onClick={() => handleRemoveItem(index)}>
                                                                <i className="fas fa-trash-alt"></i>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    ) : (
                                        <div className="text-center p-4 bg-light rounded text-muted">
                                            <i className="fas fa-box-open fa-3x mb-3 d-block"></i>
                                            No items added yet. Click "Add Item" to start building your invoice.
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>

                            <Row>
                                <Col md={12}>
                                    <Card className="shadow-sm border-0 bg-light">
                                        <Card.Body className="py-2">
                                            <Row className="align-items-center">
                                                <Col md={2} className="text-end">
                                                    <small className="text-muted">Subtotal:</small>
                                                </Col>
                                                <Col md={2}>
                                                    <strong>{formData.subtotal.toLocaleString()} {formData.currency}</strong>
                                                </Col>
                                                <Col md={1} className="text-end">
                                                    <small className="text-muted">Tax:</small>
                                                </Col>
                                                <Col md={1}>
                                                    <Form.Control
                                                        type="number"
                                                        value={formData.tax_rate}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setFormData(prev => ({ ...prev, tax_rate: val }));
                                                            calculateTotals(formData.items, val, formData.discount_amount);
                                                        }}
                                                        size="sm"
                                                        className="text-end"
                                                    />
                                                </Col>
                                                <Col md={1}>
                                                    <small className="text-danger fw-bold">{formData.tax_amount.toLocaleString()}</small>
                                                </Col>
                                                <Col md={1} className="text-end">
                                                    <small className="text-muted">Discount:</small>
                                                </Col>
                                                <Col md={1}>
                                                    <Form.Control
                                                        type="number"
                                                        value={formData.discount_amount}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setFormData(prev => ({ ...prev, discount_amount: val }));
                                                            calculateTotals(formData.items, formData.tax_rate, val);
                                                        }}
                                                        size="sm"
                                                        className="text-end"
                                                    />
                                                </Col>
                                                <Col md={1} className="text-end">
                                                    <strong className="text-success">TOTAL:</strong>
                                                </Col>
                                                <Col md={2}>
                                                    <h5 className="mb-0 fw-bold text-success">{formData.total_amount.toLocaleString()} {formData.currency}</h5>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Modal.Body>
                        <Modal.Footer className="bg-white">
                            <Button variant="outline-secondary" onClick={() => setShowModal(false)} className="px-4">
                                Cancel
                            </Button>
                            <Button variant="success" type="submit" disabled={formData.items.length === 0} className="px-4">
                                <i className="fas fa-save me-2"></i>Create Invoice
                            </Button>
                        </Modal.Footer>
                    </Form>
                )}
            </Modal>
        </Container>
    );
};

export default Invoices;
