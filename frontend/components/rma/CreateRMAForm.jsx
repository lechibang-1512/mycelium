import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card, Spinner, Alert, Badge, InputGroup } from 'react-bootstrap';
import { rmaAPI, warehouseAPI, reportsAPI } from '../../services/api';

const CreateRMAForm = ({ onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        reason_code: 'other',
        reason_description: '',
        priority: 'medium',
        warehouse_id: '',
        quarantine_bin_id: '',
        expected_return_date: '',
        notes: ''
    });
    const [items, setItems] = useState([
        {
            product_id: '',
            quantity_requested: 1,
            unit_price: 0,
            notes: '',
            product_info: null,
            disposition: 'pending',
            serial_number: '',
            device_imei: '',
            device_name: '',
            batch_no: ''
        }
    ]);
    const [warehouses, setWarehouses] = useState([]);
    const [bins, setBins] = useState([]);
    const [products, setProducts] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        loadWarehouses();
        loadProducts();
    }, []);

    useEffect(() => {
        // Load bins when warehouse is selected
        if (formData.warehouse_id) {
            loadWarehouseBins(formData.warehouse_id);
        } else {
            setBins([]);
            setFormData(prev => ({ ...prev, quarantine_bin_id: '' }));
        }
    }, [formData.warehouse_id]);

    const loadWarehouses = async () => {
        try {
            const res = await warehouseAPI.getAll();
            const data = res.data;

            let warehouseData = [];
            if (data) {
                if (Array.isArray(data)) {
                    warehouseData = data.filter(w => w.is_active);
                } else if (data.warehouses && Array.isArray(data.warehouses)) {
                    warehouseData = data.warehouses.filter(w => w.is_active);
                } else if (data.data && Array.isArray(data.data)) {
                    warehouseData = data.data.filter(w => w.is_active);
                }
            }

            setWarehouses(warehouseData);
        } catch (e) {
            console.error('Failed to load warehouses', e);
            setWarehouses([]);
        }
    };

    const loadWarehouseBins = async (warehouseId) => {
        try {
            const res = await warehouseAPI.getBins(warehouseId);
            const data = res.data;

            let binsData = [];
            if (data && Array.isArray(data)) {
                binsData = data;
            } else if (data && data.bins && Array.isArray(data.bins)) {
                binsData = data.bins;
            } else if (data && data.data && Array.isArray(data.data)) {
                binsData = data.data;
            }

            setBins(binsData);
        } catch (e) {
            console.error('Failed to load bins', e);
            setBins([]);
        }
    };

    const loadProducts = async () => {
        setLoadingProducts(true);
        try {
            const res = await reportsAPI.getProducts();
            const data = res.data;

            let productsData = [];
            if (data) {
                if (Array.isArray(data)) {
                    productsData = data;
                } else if (data.products && Array.isArray(data.products)) {
                    productsData = data.products;
                } else if (data.data && Array.isArray(data.data)) {
                    productsData = data.data;
                }
            }

            setProducts(productsData);
        } catch (e) {
            console.error('Failed to load products', e);
            setProducts([]);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleAddItem = () => {
        setItems([...items, {
            product_id: '',
            quantity_requested: 1,
            unit_price: 0,
            notes: '',
            product_info: null,
            disposition: 'pending',
            serial_number: '',
            device_imei: '',
            device_name: ''
        }]);
    };

    const handleRemoveItem = (index) => {
        if (items.length === 1) {
            alert('At least one item is required for an RMA');
            return;
        }
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];

        // Handle type conversion for product_id to match the source data
        if (field === 'product_id') {
            // Check if the original ID was a number
            const originalProduct = products.find(p => p.product_id == value);
            if (originalProduct) {
                newItems[index][field] = originalProduct.product_id; // Keep original type (number/string)

                newItems[index].product_info = originalProduct;
                // Auto-fill unit price if available (use device_price from specs_db schema)
                if (originalProduct.device_price) {
                    newItems[index].unit_price = parseFloat(originalProduct.device_price);
                }
                // Auto-fill device_name from product if not already set
                if (originalProduct.device_name) {
                    newItems[index].device_name = `${originalProduct.device_maker || ''} ${originalProduct.device_name}`.trim();
                }
            } else {
                newItems[index][field] = value; // Fallback
            }
        } else {
            newItems[index][field] = value;
        }

        setItems(newItems);
    };

    const validateForm = () => {
        const newErrors = {};

        // Customer validation
        if (!formData.customer_name.trim()) {
            newErrors.customer_name = 'Customer name is required';
        }

        if (formData.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email)) {
            newErrors.customer_email = 'Invalid email format';
        }

        // Warehouse validation
        if (!formData.warehouse_id) {
            newErrors.warehouse_id = 'Warehouse is required';
        }

        // Items validation
        items.forEach((item, idx) => {
            // Check specifically for null, undefined, or empty string to allow ID 0 if it exists
            if (item.product_id === '' || item.product_id === null || item.product_id === undefined) {
                newErrors[`item_${idx}_product`] = `Product is required for item ${idx + 1}`;
            }
            if (item.quantity_requested < 1) {
                newErrors[`item_${idx}_quantity`] = `Quantity must be at least 1 for item ${idx + 1}`;
            }
            if (item.unit_price < 0) {
                newErrors[`item_${idx}_price`] = `Unit price cannot be negative for item ${idx + 1}`;
            }
        });

        // Check for duplicate products
        const productIds = items.map(item => item.product_id).filter(id => id !== '' && id !== null && id !== undefined);
        const duplicates = productIds.filter((id, index) => productIds.indexOf(id) !== index);
        if (duplicates.length > 0) {
            newErrors.duplicate_products = 'Duplicate products detected. Please combine quantities.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const calculateTotalValue = () => {
        return items.reduce((sum, item) => {
            return sum + (item.quantity_requested * item.unit_price);
        }, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            alert('Please fix the errors in the form before submitting');
            return;
        }

        setSubmitting(true);
        setErrors({});

        try {
            const response = await rmaAPI.create({
                rmaData: {
                    ...formData,
                    total_value: calculateTotalValue()
                },
                items: items.map(item => ({
                    product_id: item.product_id,
                    quantity_requested: item.quantity_requested,
                    unit_price: parseFloat(item.unit_price) || 0,
                    total_price: (item.quantity_requested * parseFloat(item.unit_price || 0)),
                    disposition: item.disposition || 'pending',
                    serial_number: item.serial_number || null,
                    device_imei: item.device_imei || null,
                    device_name: item.device_name || null,
                    batch_no: item.batch_no || null,
                    notes: item.notes
                }))
            });
            alert('RMA created successfully: ' + (response.data?.rma_number || 'New RMA'));
            onSuccess();
        } catch (e) {
            console.error('Failed to create RMA', e);
            const errorMsg = e.response?.data?.error || e.message || 'Failed to create RMA';
            alert('Error: ' + errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Form onSubmit={handleSubmit}>
            {errors.duplicate_products && (
                <Alert variant="warning" className="mb-3">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {errors.duplicate_products}
                </Alert>
            )}

            <h5 className="mb-3">Customer Information</h5>
            <Row className="mb-4">
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label>Customer Name *</Form.Label>
                        <Form.Control
                            type="text"
                            required
                            value={formData.customer_name}
                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            isInvalid={!!errors.customer_name}
                            placeholder="Enter customer name"
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.customer_name}
                        </Form.Control.Feedback>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            type="email"
                            value={formData.customer_email}
                            onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                            isInvalid={!!errors.customer_email}
                            placeholder="email@example.com"
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.customer_email}
                        </Form.Control.Feedback>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label>Phone</Form.Label>
                        <Form.Control
                            type="tel"
                            value={formData.customer_phone}
                            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                            placeholder="+1 (555) 000-0000"
                        />
                    </Form.Group>
                </Col>
            </Row>

            <h5 className="mb-3 mt-4">Return Details</h5>
            <Row className="mb-4">
                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label>Reason Code *</Form.Label>
                        <Form.Select
                            required
                            value={formData.reason_code}
                            onChange={(e) => setFormData({ ...formData, reason_code: e.target.value })}
                        >
                            <option key="defective" value="defective">Defective</option>
                            <option key="damaged" value="damaged">Damaged in Transit</option>
                            <option key="wrong_item" value="wrong_item">Wrong Item Shipped</option>
                            <option key="customer_remorse" value="customer_remorse">Customer Changed Mind</option>
                            <option key="warranty" value="warranty">Warranty Claim</option>
                            <option key="other" value="other">Other Reason</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label>Priority *</Form.Label>
                        <Form.Select
                            required
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        >
                            <option key="low" value="low">Low</option>
                            <option key="medium" value="medium">Medium</option>
                            <option key="high" value="high">High</option>
                            <option key="urgent" value="urgent">Urgent</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label>Expected Return Date</Form.Label>
                        <Form.Control
                            type="date"
                            value={formData.expected_return_date}
                            onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label>Reason Description</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={1}
                            value={formData.reason_description}
                            onChange={(e) => setFormData({ ...formData, reason_description: e.target.value })}
                            placeholder="Brief description..."
                        />
                    </Form.Group>
                </Col>
            </Row>

            <h5 className="mb-3 mt-4">Warehouse & Logistics</h5>
            <Row className="mb-4">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Destination Warehouse *</Form.Label>
                        <Form.Select
                            required
                            value={formData.warehouse_id}
                            onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                            isInvalid={!!errors.warehouse_id}
                        >
                            <option value="">Select Warehouse</option>
                            {Array.isArray(warehouses) && warehouses.map((wh) => (
                                <option key={wh.warehouse_id} value={wh.warehouse_id}>
                                    {wh.name} {wh.location ? `- ${wh.location}` : ''}
                                </option>
                            ))}
                        </Form.Select>
                        {warehouses.length === 0 && (
                            <Form.Text className="text-danger">
                                No active warehouses found.
                            </Form.Text>
                        )}
                        <Form.Control.Feedback type="invalid">
                            {errors.warehouse_id}
                        </Form.Control.Feedback>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Quarantine Bin</Form.Label>
                        <Form.Select
                            value={formData.quarantine_bin_id}
                            onChange={(e) => setFormData({ ...formData, quarantine_bin_id: e.target.value })}
                            disabled={!formData.warehouse_id || bins.length === 0}
                        >
                            <option value="">Auto-assign or select bin</option>
                            {Array.isArray(bins) && bins.map((bin) => (
                                <option key={bin.bin_id} value={bin.bin_id}>
                                    {bin.bin_code || `C${bin.column_position}-R${bin.row_position}-B${bin.bin_position}`}
                                </option>
                            ))}
                        </Form.Select>
                        {formData.warehouse_id && bins.length === 0 && (
                            <Form.Text className="text-warning">
                                No bins found in this warehouse.
                            </Form.Text>
                        )}
                    </Form.Group>
                </Col>
            </Row>

            <h5 className="mb-3 mt-4">Items to Return ({items.length})</h5>
            <div className="text-end mb-2">
                <span className="text-muted me-2">Total Value:</span>
                <strong>${calculateTotalValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>

            {loadingProducts ? (
                <div className="text-center py-5 bg-light rounded">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted">Loading product catalog...</p>
                </div>
            ) : (
                <>
                    {Array.isArray(items) && items.map((item, index) => (
                        <Card key={index} className="mb-3 border">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <strong>Item {index + 1}</strong>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="text-danger"
                                        onClick={() => handleRemoveItem(index)}
                                        disabled={items.length === 1}
                                    >
                                        Remove
                                    </Button>
                                </div>

                                <Row className="g-3">
                                    <Col md={5}>
                                        <Form.Group>
                                            <Form.Label className="small text-muted">Product *</Form.Label>
                                            <Form.Select
                                                required
                                                value={item.product_id}
                                                onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                                                isInvalid={!!errors[`item_${index}_product`]}
                                            >
                                                <option value="">Select Product...</option>
                                                {Array.isArray(products) && products.map((product) => (
                                                    <option key={product.product_id} value={product.product_id}>
                                                        {product.device_maker} {product.device_name}
                                                        {product.ram && product.rom ? ` - ${product.ram}/${product.rom}` : ''}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                            {item.product_info && (
                                                <div className="mt-1 small text-info">
                                                    {item.product_info.product_type} | {item.product_info.processor}
                                                </div>
                                            )}
                                            <Form.Control.Feedback type="invalid">
                                                {errors[`item_${index}_product`]}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>

                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label className="small text-muted">Quantity *</Form.Label>
                                            <Form.Control
                                                type="number"
                                                required
                                                min="1"
                                                value={item.quantity_requested}
                                                onChange={(e) => handleItemChange(index, 'quantity_requested', parseInt(e.target.value) || 1)}
                                                isInvalid={!!errors[`item_${index}_quantity`]}
                                            />
                                        </Form.Group>
                                    </Col>

                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label className="small text-muted">Unit Price ($)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={item.unit_price}
                                                onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                            />
                                        </Form.Group>
                                    </Col>

                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="small text-muted">Disposition</Form.Label>
                                            <Form.Select
                                                value={item.disposition || 'pending'}
                                                onChange={(e) => handleItemChange(index, 'disposition', e.target.value)}
                                            >
                                                <option key="pending" value="pending">Pending</option>
                                                <option key="return_to_stock" value="return_to_stock">Return to Stock</option>
                                                <option key="repair" value="repair">Repair</option>
                                                <option key="scrap" value="scrap">Scrap</option>
                                                <option key="return_to_vendor" value="return_to_vendor">Return to Vendor</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>

                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Control
                                                size="sm"
                                                type="text"
                                                placeholder="Serial Number"
                                                value={item.serial_number || ''}
                                                onChange={(e) => handleItemChange(index, 'serial_number', e.target.value)}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Control
                                                size="sm"
                                                type="text"
                                                placeholder="IMEI"
                                                value={item.device_imei || ''}
                                                onChange={(e) => handleItemChange(index, 'device_imei', e.target.value)}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Control
                                                size="sm"
                                                type="text"
                                                placeholder="Batch No."
                                                value={item.batch_no || ''}
                                                onChange={(e) => handleItemChange(index, 'batch_no', e.target.value)}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Control
                                                size="sm"
                                                type="text"
                                                placeholder="Item Notes..."
                                                value={item.notes}
                                                onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    ))}

                    <div className="d-grid gap-2 mb-4">
                        <Button variant="outline-primary" onClick={handleAddItem} className="border-dashed">
                            <i className="fas fa-plus-circle me-2"></i>Add Another Item
                        </Button>
                    </div>
                </>
            )}

            <Form.Group className="mb-4 mt-4">
                <Form.Label>Internal Notes</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes for internal use..."
                />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                <Button variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting || loadingProducts}>
                    {submitting ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Creating...
                        </>
                    ) : (
                        'Create RMA'
                    )}
                </Button>
            </div>
        </Form>
    );
};

export default CreateRMAForm;
