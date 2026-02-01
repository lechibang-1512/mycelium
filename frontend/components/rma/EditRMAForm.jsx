import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Alert, Spinner, Card, Badge, InputGroup } from 'react-bootstrap';
import { rmaAPI, warehouseAPI, reportsAPI } from '../../services/api';

const EditRMAForm = ({ rma, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        customer_name: rma.customer_name || '',
        customer_email: rma.customer_email || '',
        customer_phone: rma.customer_phone || '',
        reason_code: rma.reason_code || 'other',
        reason_description: rma.reason_description || '',
        priority: rma.priority || 'medium',
        warehouse_id: rma.warehouse_id || '',
        quarantine_bin_id: rma.quarantine_bin_id || '',
        expected_return_date: rma.expected_return_date || '',
        notes: rma.notes || ''
    });
    const [items, setItems] = useState(
        Array.isArray(rma.items) && rma.items.length > 0
            ? rma.items.map(item => ({
                item_id: item.item_id,
                product_id: item.product_id || '',
                quantity_requested: item.quantity_requested || 1,
                unit_price: item.unit_price || 0,
                notes: item.notes || '',
                disposition: item.disposition || 'pending',
                serial_number: item.serial_number || '',
                device_imei: item.device_imei || '',
                device_name: item.device_name || '',
                batch_no: item.batch_no || '',
                product_info: null
            }))
            : [{
                product_id: '',
                quantity_requested: 1,
                unit_price: 0,
                notes: '',
                disposition: 'pending',
                serial_number: '',
                device_imei: '',
                device_name: '',
                batch_no: '',
                product_info: null
            }]
    );
    const [warehouses, setWarehouses] = useState([]);
    const [bins, setBins] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

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
            disposition: 'pending',
            serial_number: '',
            device_imei: '',
            device_name: '',
            batch_no: '',
            product_info: null
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

        if (field === 'product_id') {
            const originalProduct = products.find(p => p.product_id == value);
            if (originalProduct) {
                newItems[index][field] = originalProduct.product_id;
                newItems[index].product_info = originalProduct;
                if (originalProduct.device_price) {
                    newItems[index].unit_price = parseFloat(originalProduct.device_price);
                }
                if (originalProduct.device_name) {
                    newItems[index].device_name = `${originalProduct.device_maker || ''} ${originalProduct.device_name}`.trim();
                }
            } else {
                newItems[index][field] = value;
            }
        } else {
            newItems[index][field] = value;
        }

        setItems(newItems);
    };

    const calculateTotalValue = () => {
        return items.reduce((sum, item) => {
            const qty = parseInt(item.quantity_requested) || 0;
            const price = parseFloat(item.unit_price) || 0;
            return sum + (qty * price);
        }, 0);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.customer_name.trim()) {
            newErrors.customer_name = 'Customer name is required';
        }

        if (formData.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email)) {
            newErrors.customer_email = 'Invalid email format';
        }

        if (!formData.warehouse_id) {
            newErrors.warehouse_id = 'Warehouse is required';
        }

        items.forEach((item, index) => {
            if (!item.product_id) {
                newErrors[`item_${index}_product`] = 'Product is required';
            }
            if (!item.quantity_requested || item.quantity_requested < 1) {
                newErrors[`item_${index}_quantity`] = 'Quantity must be at least 1';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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
            const updateData = {
                ...formData,
                items: items.map(item => ({
                    item_id: item.item_id, // Include for existing items
                    product_id: item.product_id,
                    quantity_requested: parseInt(item.quantity_requested) || 1,
                    unit_price: parseFloat(item.unit_price) || 0,
                    notes: item.notes || '',
                    disposition: item.disposition || 'pending',
                    serial_number: item.serial_number || '',
                    device_imei: item.device_imei || '',
                    device_name: item.device_name || '',
                    batch_no: item.batch_no || ''
                }))
            };
            await rmaAPI.update(rma.rma_id, updateData);
            alert('RMA updated successfully');
            onSuccess();
        } catch (e) {
            console.error('Failed to update RMA', e);
            const errorMsg = e.response?.data?.error || e.message || 'Failed to update RMA';
            alert('Error: ' + errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Form onSubmit={handleSubmit}>
            <div className="mb-3">
                <small className="text-muted">Editing RMA: <strong>{rma.rma_number}</strong></small>
            </div>

            <h5>Customer Information</h5>
            <Row>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label>Customer Name *</Form.Label>
                        <Form.Control
                            type="text"
                            required
                            value={formData.customer_name}
                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            isInvalid={!!errors.customer_name}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.customer_name}
                        </Form.Control.Feedback>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label>Customer Email</Form.Label>
                        <Form.Control
                            type="email"
                            value={formData.customer_email}
                            onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                            isInvalid={!!errors.customer_email}
                            placeholder="customer@example.com"
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.customer_email}
                        </Form.Control.Feedback>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label>Customer Phone</Form.Label>
                        <Form.Control
                            type="tel"
                            value={formData.customer_phone}
                            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                            placeholder="0123456789"
                        />
                    </Form.Group>
                </Col>
            </Row>

            <h5 className="mt-4">Warehouse & Processing</h5>
            <Row>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label>Warehouse *</Form.Label>
                        <Form.Select
                            required
                            value={formData.warehouse_id}
                            onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value, quarantine_bin_id: '' })}
                            isInvalid={!!errors.warehouse_id}
                        >
                            <option value="">Select Warehouse</option>
                            {warehouses.map(w => (
                                <option key={w.warehouse_id} value={w.warehouse_id}>
                                    {w.name || w.warehouse_name} {w.location || w.warehouse_location ? `(${w.location || w.warehouse_location})` : ''}
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
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label>Quarantine Bin</Form.Label>
                        <Form.Select
                            value={formData.quarantine_bin_id}
                            onChange={(e) => setFormData({ ...formData, quarantine_bin_id: e.target.value })}
                            disabled={!formData.warehouse_id || bins.length === 0}
                        >
                            <option value="">Auto-assign or select bin</option>
                            {bins.map(bin => (
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
                <Col md={4}>
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
                                                <option value="pending">Pending</option>
                                                <option value="return_to_stock">Return to Stock</option>
                                                <option value="repair">Repair</option>
                                                <option value="scrap">Scrap</option>
                                                <option value="return_to_vendor">Return to Vendor</option>
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
                                                placeholder="Device Name"
                                                value={item.device_name || ''}
                                                onChange={(e) => handleItemChange(index, 'device_name', e.target.value)}
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
                                </Row>

                                <Row className="mt-2">
                                    <Col md={12}>
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

            <h5 className="mt-4">Return Details</h5>
            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Reason Code *</Form.Label>
                        <Form.Select
                            required
                            value={formData.reason_code}
                            onChange={(e) => setFormData({ ...formData, reason_code: e.target.value })}
                        >
                            <option key="defective" value="defective">Defective - Product Failure</option>
                            <option key="damaged_shipping" value="damaged_shipping">Damaged in Shipping</option>
                            <option key="wrong_item" value="wrong_item">Wrong Item Sent</option>
                            <option key="customer_remorse" value="customer_remorse">Customer Remorse</option>
                            <option key="warranty_claim" value="warranty_claim">Warranty Claim</option>
                            <option key="upgrade_return" value="upgrade_return">Upgrade Return</option>
                            <option key="other" value="other">Other Reason</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Expected Return Date</Form.Label>
                        <Form.Control
                            type="date"
                            value={formData.expected_return_date}
                            onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })}
                        />
                    </Form.Group>
                </Col>
            </Row>
            <Form.Group className="mb-3">
                <Form.Label>Reason Description</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.reason_description}
                    onChange={(e) => setFormData({ ...formData, reason_description: e.target.value })}
                    placeholder="Detailed description of the return reason..."
                />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Additional Notes</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes or special instructions..."
                />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 mt-4">
                <Button variant="secondary" onClick={onCancel} disabled={submitting}>
                    Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Updating...
                        </>
                    ) : (
                        'Save Changes'
                    )}
                </Button>
            </div>
        </Form>
    );
};

export default EditRMAForm;
