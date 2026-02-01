import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Modal, Badge } from 'react-bootstrap';
import { warehouseAPI, inventoryTransactionAPI, invoicesAPI, receiptsAPI, inventoryAPI, sparePartsAPI, binsAPI, lotsAPI } from '../../services/api';
import StockIssueSlip from '../../components/documents/StockIssueSlip';
import StockDistributionForm from '../../components/documents/StockDistributionForm';
import '../../components/documents/StockIssueSlip.css';

import { useStocktake } from '../../contexts/StocktakeContext';
import LockdownOverlay from '../../components/layout/LockdownOverlay';

const DispenseStock = () => {
  const { isLocked } = useStocktake();
  // Warehouse and bin state
  const [warehouses, setWarehouses] = useState([]);
  const [bins, setBins] = useState([]);
  const [binProducts, setBinProducts] = useState([]);
  const [serializedItems, setSerializedItems] = useState([]);
  const [selectedSerialItems, setSelectedSerialItems] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedRow, setSelectedRow] = useState('');
  const [selectedBin, setSelectedBin] = useState('');
  const [hierarchicalBins, setHierarchicalBins] = useState({});

  // Product and form state
  const [selectedProduct, setSelectedProduct] = useState('');
  const [currentStock, setCurrentStock] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [quantity, setQuantity] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');

  // Circular 99 fields
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryPerson, setDeliveryPerson] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invoices, setInvoices] = useState([]);
  /* Removed duplicate declaration */
  // const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [customerInvoice, setCustomerInvoice] = useState('');

  // Printing state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);

  // Product type toggle (device vs spare_part)
  const [productType, setProductType] = useState('device');
  const [spareParts, setSpareParts] = useState([]);
  const [selectedSparePart, setSelectedSparePart] = useState('');
  const [fifoLots, setFifoLots] = useState([]);
  const [loadingFIFO, setLoadingFIFO] = useState(false);


  const navigate = useNavigate();

  // Fetch warehouses on mount
  useEffect(() => {
    fetchWarehouses();
    fetchInvoices();
    fetchSpareParts();
  }, []);

  // Fetch spare parts from invoice when invoice and spare_part type selected
  useEffect(() => {
    if (productType === 'spare_part' && selectedInvoice) {
      fetchSpareParts(selectedInvoice);
      setSelectedSparePart(''); // Reset spare part selection
    }
  }, [selectedInvoice, productType]);

  // Fetch FIFO lots when spare part and quantity are selected
  useEffect(() => {
    if (productType === 'spare_part' && selectedSparePart && selectedWarehouse && quantity) {
      fetchFIFOLots();
    } else {
      setFifoLots([]);
    }
  }, [selectedSparePart, selectedWarehouse, quantity, productType]);

  const fetchInvoices = async () => {
    try {
      const invRes = await invoicesAPI.getInvoices({});
      setInvoices(invRes.data.data || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  };

  const fetchSpareParts = async (invoiceId = null) => {
    try {
      if (invoiceId) {
        // Fetch spare parts from selected invoice
        const response = await invoicesAPI.getSpareParts(invoiceId);
        const result = response.data;
        if (result.success && result.data.length > 0) {
          setSpareParts(result.data || []);
          return;
        }
      }
      // Fallback to all spare parts if no invoice or invoice has no spare parts
      const response = await sparePartsAPI.getAll();
      setSpareParts(response.data.spare_parts || response.data || []);
    } catch (err) {
      console.error('Failed to load spare parts:', err);
    }
  };

  const fetchFIFOLots = async () => {
    setLoadingFIFO(true);
    try {
      const response = await lotsAPI.getFIFOAllocation({
        spare_part_id: parseInt(selectedSparePart),
        warehouse_id: selectedWarehouse,
        quantity_needed: parseInt(quantity)
      });
      const result = response.data;
      if (result.success) {
        setFifoLots(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch FIFO lots:', err);
    } finally {
      setLoadingFIFO(false);
    }
  };

  // Fetch bins when warehouse is selected
  useEffect(() => {
    if (selectedWarehouse) {
      fetchBins(selectedWarehouse);
      // Reset dependent selections
      setSelectedBin('');
      setBinProducts([]);
      setSelectedProduct('');
      setCurrentStock(0);
    } else {
      setBins([]);
      setBinProducts([]);
    }
  }, [selectedWarehouse]);

  // Fetch bin products when bin is selected
  useEffect(() => {
    if (selectedWarehouse && selectedBin) {
      fetchBinProducts(selectedBin);
      // Reset product selection
      setSelectedProduct('');
      setCurrentStock(0);
    } else {
      setBinProducts([]);
    }
  }, [selectedWarehouse, selectedBin]);

  // Update current stock when product is selected
  useEffect(() => {
    if (selectedProduct && binProducts.length > 0) {
      const product = binProducts.find(p => String(p.product_id) === String(selectedProduct));
      setCurrentStock(product ? (product.available_quantity || product.quantity) : 0);
      setUnitPrice(product ? (parseFloat(product.device_price) || 0) : 0);
    } else {
      setCurrentStock(0);
      setUnitPrice(0);
    }
  }, [selectedProduct, binProducts]);

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseAPI.getAll();
      setWarehouses(response.data.warehouses || []);
    } catch (err) {
      setError('Failed to load warehouses');
      console.error(err);
    }
  };

  const fetchBins = async (warehouseId) => {
    try {
      const response = await warehouseAPI.getColumns(warehouseId);
      const columns = response.data.columns || {};
      const flatBins = (response.data.bins || []).filter(b => b.is_active);
      setBins(flatBins);
      setHierarchicalBins(columns);
      setSelectedColumn('');
      setSelectedRow('');
      setSelectedBin('');
    } catch (err) {
      setError('Failed to load bins');
      console.error(err);
    }
  };

  // Reset row when column changes
  useEffect(() => {
    setSelectedRow('');
    setSelectedBin('');
  }, [selectedColumn]);

  // Reset bin when row changes
  useEffect(() => {
    setSelectedBin('');
  }, [selectedRow]);

  // Get available columns from hierarchical data
  const getAvailableColumns = () => {
    return Object.keys(hierarchicalBins).sort((a, b) => Number(a) - Number(b));
  };

  // Get available rows for selected column
  const getAvailableRows = () => {
    if (!selectedColumn || !hierarchicalBins[selectedColumn]) return [];
    return Object.keys(hierarchicalBins[selectedColumn].rows || {}).sort((a, b) => Number(a) - Number(b));
  };

  // Get available bins for selected column and row
  const getAvailableBins = () => {
    if (!selectedColumn || !selectedRow || !hierarchicalBins[selectedColumn]) return [];
    return hierarchicalBins[selectedColumn].rows?.[selectedRow]?.bins || [];
  };

  const fetchBinProducts = async (binId) => {
    setLoadingProducts(true);
    try {
      console.log('Fetching products for bin:', binId);
      const response = await binsAPI.getContents(binId);
      console.log('Bin contents response:', response);

      // API returns contents.aggregate_items and contents.serialized_items
      const contents = response.data?.contents || {};
      const aggregateItems = contents.aggregate_items || [];
      const serialItems = contents.serialized_items || [];

      console.log('Aggregate items:', aggregateItems);
      console.log('Serialized items:', serialItems);

      setBinProducts(aggregateItems);
      setSerializedItems(serialItems);
      setSelectedSerialItems([]);

      if (aggregateItems.length === 0 && serialItems.length === 0) {
        setError('No products available in this bin');
      }
    } catch (err) {
      setError('Failed to load products for this bin');
      console.error('Detailed error:', err.response || err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Handle product selection from clickable list
  const handleProductSelect = (product) => {
    setSelectedProduct(String(product.product_id));
    setCurrentStock(product.available_quantity || product.quantity || 0);
    setUnitPrice(parseFloat(product.device_price) || 0);
    setQuantity('1'); // Default to 1
  };

  // Get selected bin code for display
  const getSelectedBinCode = () => {
    const bin = getAvailableBins().find(b => b.bin_id === selectedBin);
    return bin ? bin.bin_code : '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const qty = parseInt(quantity);

    // Validation
    if (!selectedWarehouse || !selectedBin) {
      setError('Please select both warehouse and bin');
      setLoading(false);
      return;
    }

    // Validate product type specific fields
    if (productType === 'spare_part' && !selectedSparePart) {
      setError('Please select a spare part to dispense');
      setLoading(false);
      return;
    }

    if (productType === 'device' && !selectedProduct) {
      setError('Please select a product to dispense');
      setLoading(false);
      return;
    }

    if (productType === 'device' && qty > currentStock) {
      setError(`Insufficient stock. Only ${currentStock} units available in this bin.`);
      setLoading(false);
      return;
    }

    try {
      // Call NEW transactional endpoint
      const currentQty = parseInt(quantity);
      const currentTaxRate = parseFloat(taxRate) || 0;
      const subtotal = unitPrice * currentQty;
      const taxAmount = (subtotal * currentTaxRate) / 100;

      let response;

      if (productType === 'spare_part') {
        // Spare parts dispensing with FIFO lot selection
        response = await inventoryTransactionAPI.dispenseStock({
          items: [{
            spare_part_id: parseInt(selectedSparePart),
            quantity: currentQty,
            unit_price: 0,
            tax_amount: 0,
            fifo_lots: fifoLots  // Pass FIFO allocation to backend
          }],
          warehouse_id: selectedWarehouse,
          bin_id: selectedBin,
          customer_name: customerName || null,
          customer_address: customerAddress || null,
          delivery_person: deliveryPerson || null,
          notes: notes || 'Spare part dispensing',
          invoice_id: selectedInvoice || null,
          customer_invoice: customerInvoice || null
        });
      } else {
        // Device dispensing (original flow)
        response = await inventoryTransactionAPI.dispenseStock({
          items: [{
            product_id: selectedProduct,
            quantity: currentQty,
            unit_price: unitPrice,
            tax_amount: taxAmount
          }],
          warehouse_id: selectedWarehouse,
          bin_id: selectedBin,
          customer_name: customerName || null,
          customer_address: customerAddress || null,
          delivery_person: deliveryPerson || null,
          notes,
          invoice_id: selectedInvoice || null,
          customer_invoice: customerInvoice || null
        });
      }

      const receiptId = response.data.receipt_id || response.data.transaction_group_id;

      // Fetch full receipt details for printing
      try {
        const receiptDetails = await inventoryAPI.getReceiptDetails(receiptId);
        setCreatedReceipt(receiptDetails.data);
        setShowPrintModal(true);
      } catch (fetchErr) {
        console.error("Could not fetch receipt details for printing", fetchErr);
        setSuccess('Stock dispensed successfully from warehouse zone!');
        setTimeout(() => {
          navigate('/inventory');
        }, 2000);
      }

      // Clear form logic moved to Modal close or after print decision

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dispense stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isLocked && <LockdownOverlay />}
      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <h2>
              <i className="fas fa-minus-circle me-2"></i>
              Dispense Stock
            </h2>
            <p className="text-muted">Remove inventory from warehouse zones</p>
          </Col>
          <Col md="auto">
            <Button variant="outline-secondary" onClick={() => navigate('/inventory')}>
              <i className="fas fa-arrow-left me-2"></i>
              Back to Inventory
            </Button>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Stock Dispensation Form</h5>
              </Card.Header>
              <Card.Body>
                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert variant="success">
                    <i className="fas fa-check-circle me-2"></i>
                    {success}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  {/* Warehouse Selection */}
                  <Form.Group className="mb-3">
                    <Form.Label>Warehouse *</Form.Label>
                    <Form.Select
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                      required
                    >
                      <option value="">Select warehouse...</option>
                      {Array.isArray(warehouses) && warehouses.map((warehouse) => (
                        <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                          {warehouse.name} - {warehouse.location}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Select the warehouse where stock is located
                    </Form.Text>
                  </Form.Group>

                  {/* Column Selection */}
                  {selectedWarehouse && getAvailableColumns().length > 0 && (
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="fas fa-columns me-2 text-primary"></i>
                        Column *
                      </Form.Label>
                      <Form.Select
                        value={selectedColumn}
                        onChange={(e) => setSelectedColumn(e.target.value)}
                        required
                      >
                        <option value="">Select Column...</option>
                        {getAvailableColumns().map(col => (
                          <option key={col} value={col}>
                            Column {col}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  )}

                  {/* Row Selection */}
                  {selectedWarehouse && selectedColumn && getAvailableRows().length > 0 && (
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="fas fa-grip-lines me-2 text-info"></i>
                        Row *
                      </Form.Label>
                      <Form.Select
                        value={selectedRow}
                        onChange={(e) => setSelectedRow(e.target.value)}
                        required
                      >
                        <option value="">Select Row...</option>
                        {getAvailableRows().map(row => (
                          <option key={row} value={row}>
                            Row {row}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  )}

                  {/* Bin Selection */}
                  {selectedWarehouse && selectedColumn && selectedRow && getAvailableBins().length > 0 && (
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="fas fa-box me-2 text-success"></i>
                        Bin *
                      </Form.Label>
                      <Form.Select
                        value={selectedBin}
                        onChange={(e) => setSelectedBin(e.target.value)}
                        required
                      >
                        <option value="">Select Bin...</option>
                        {getAvailableBins().map(b => (
                          <option key={b.bin_id} value={b.bin_id}>
                            {b.bin_code} (Position B{b.bin_position})
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        <i className="fas fa-map-marker-alt me-1"></i>
                        Location: C{selectedColumn}-R{selectedRow}
                      </Form.Text>
                    </Form.Group>
                  )}

                  {/* Clickable Product List - shows available products in selected bin */}
                  {selectedBin && !loadingProducts && binProducts.length > 0 && (
                    <Card className="mb-3 border-primary shadow-sm">
                      <Card.Header className="bg-primary text-white py-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <h6 className="mb-0">
                            <i className="fas fa-box-open me-2"></i>
                            Products in Bin {getSelectedBinCode()}
                          </h6>
                          <span className="badge bg-light text-primary">
                            {binProducts.length} item{binProducts.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <div className="list-group list-group-flush" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                          {binProducts.map((product) => {
                            const isSelected = String(selectedProduct) === String(product.product_id);
                            const availableQty = product.available_quantity || product.quantity || 0;
                            const isLowStock = availableQty < 5;
                            return (
                              <button
                                key={product.product_id}
                                type="button"
                                className={`list-group-item list-group-item-action border-0 py-2 ${isSelected ? 'bg-success bg-opacity-10 border-start border-success border-3' : ''}`}
                                onClick={() => handleProductSelect(product)}
                              >
                                <div className="d-flex justify-content-between align-items-start">
                                  <div style={{ flex: 1 }}>
                                    <div className="d-flex align-items-center">
                                      {isSelected && <i className="fas fa-check-circle text-success me-2"></i>}
                                      <span className={`${isSelected ? 'fw-bold text-success' : ''}`}>
                                        {product.device_maker} {product.device_name}
                                      </span>
                                      {isLowStock && (
                                        <span className="badge bg-warning text-dark ms-2">Low Stock</span>
                                      )}
                                    </div>
                                    <div className="text-muted small mt-1">
                                      <span className="me-3">
                                        <i className="fas fa-cubes me-1"></i>
                                        Available: <strong className={isLowStock ? 'text-warning' : 'text-success'}>{availableQty}</strong>
                                      </span>
                                      {product.device_price > 0 && (
                                        <span>
                                          <i className="fas fa-tag me-1"></i>
                                          ${Number(product.device_price || 0).toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-end">
                                    <span className={`badge ${availableQty > 10 ? 'bg-success' : availableQty > 0 ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                      {availableQty} units
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </Card.Body>
                      <Card.Footer className="py-1 bg-white border-top text-center">
                        <small className="text-muted">
                          <i className="fas fa-hand-pointer me-1"></i>
                          Click a product to select it for dispensing
                        </small>
                      </Card.Footer>
                    </Card>
                  )}

                  {/* Loading state */}
                  {selectedBin && loadingProducts && (
                    <div className="text-center py-3 mb-3">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      <span>Loading products in this bin...</span>
                    </div>
                  )}

                  {/* Empty bin message */}
                  {selectedBin && !loadingProducts && binProducts.length === 0 && serializedItems.length === 0 && (
                    <Alert variant="warning" className="mb-3">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      No products available in this bin. Please select a different bin.
                    </Alert>
                  )}

                  {/* Serialized Items List (Phones/Devices with IMEI) */}
                  {selectedBin && !loadingProducts && serializedItems.length > 0 && (
                    <Card className="mb-3 border-info shadow-sm">
                      <Card.Header className="bg-info text-white py-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <h6 className="mb-0">
                            <i className="fas fa-mobile-alt me-2"></i>
                            Serialized Items (IMEI/Serial)
                          </h6>
                          <span className="badge bg-light text-info">
                            {serializedItems.length} device{serializedItems.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <div className="list-group list-group-flush" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                          {serializedItems.map((item) => {
                            const isSelected = selectedSerialItems.includes(item.serial_id || item.uuid);
                            return (
                              <button
                                key={item.serial_id || item.uuid}
                                type="button"
                                className={`list-group-item list-group-item-action border-0 py-2 ${isSelected ? 'bg-danger bg-opacity-10 border-start border-danger border-3' : ''}`}
                                onClick={() => {
                                  const itemId = item.serial_id || item.uuid;
                                  if (isSelected) {
                                    setSelectedSerialItems(prev => prev.filter(id => id !== itemId));
                                  } else {
                                    setSelectedSerialItems(prev => [...prev, itemId]);
                                  }
                                }}
                              >
                                <div className="d-flex justify-content-between align-items-start">
                                  <div style={{ flex: 1 }}>
                                    <div className="d-flex align-items-center">
                                      {isSelected && <i className="fas fa-check-circle text-danger me-2"></i>}
                                      <span className={`${isSelected ? 'fw-bold text-danger' : ''}`}>
                                        {item.device_maker || item.brand} {item.device_name || item.product_name}
                                      </span>
                                      <Badge bg="secondary" className="ms-2">{item.status || 'available'}</Badge>
                                    </div>
                                    <div className="text-muted small mt-1">
                                      {item.imei_1 && (
                                        <span className="me-3">
                                          <i className="fas fa-barcode me-1"></i>
                                          IMEI: <strong>{item.imei_1}</strong>
                                        </span>
                                      )}
                                      {item.serial_number && (
                                        <span className="me-3">
                                          <i className="fas fa-hashtag me-1"></i>
                                          S/N: <strong>{item.serial_number}</strong>
                                        </span>
                                      )}
                                      {item.condition_grade && (
                                        <span>
                                          <i className="fas fa-star me-1"></i>
                                          {item.condition_grade}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-end">
                                    <i className={`fas ${isSelected ? 'fa-check-square' : 'fa-square'} ${isSelected ? 'text-danger' : 'text-muted'}`}></i>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </Card.Body>
                      <Card.Footer className="py-1 bg-white border-top text-center">
                        <small className="text-muted">
                          <i className="fas fa-hand-pointer me-1"></i>
                          Click devices to select for dispensing ({selectedSerialItems.length} selected)
                        </small>
                      </Card.Footer>
                    </Card>
                  )}

                  {/* Selected product confirmation card */}
                  {selectedProduct && (
                    <Card className="mb-3 border-success bg-light">
                      <Card.Body className="py-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="d-flex align-items-center">
                              <i className="fas fa-check-circle text-success me-2"></i>
                              <strong>Selected Product</strong>
                            </div>
                            <div className="mt-1">
                              <span className="fw-bold">
                                {binProducts.find(p => String(p.product_id) === String(selectedProduct))?.device_maker}{' '}
                                {binProducts.find(p => String(p.product_id) === String(selectedProduct))?.device_name}
                              </span>
                            </div>
                            <small className="text-muted">
                              Available: <strong>{currentStock}</strong> units |
                              Unit Price: <strong>${Number(unitPrice || 0).toFixed(2)}</strong>
                            </small>
                          </div>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct('');
                              setQuantity('');
                              setCurrentStock(0);
                              setUnitPrice(0);
                            }}
                          >
                            <i className="fas fa-times me-1"></i>Clear
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  )}

                  <Form.Group className="mb-3">
                    <Form.Label>Quantity *</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      max={currentStock}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      required
                      disabled={!selectedProduct}
                    />
                    {quantity && parseInt(quantity) > currentStock && (
                      <Form.Text className="text-danger">
                        Quantity exceeds available stock!
                      </Form.Text>
                    )}
                  </Form.Group>

                  {/* Tax Rate Selection */}
                  <Form.Group className="mb-3">
                    <Form.Label>Tax Rate (%)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && (val < 0 || val > 100)) return;
                        setTaxRate(e.target.value);
                      }}
                      placeholder="Enter tax rate (e.g. 10)"
                      disabled={!selectedProduct}
                    />
                  </Form.Group>

                  {/* Price Totals Display */}
                  {selectedProduct && quantity && (
                    <Card className="mb-3 bg-light">
                      <Card.Body className="py-2">
                        <div className="d-flex justify-content-between mb-1">
                          <span>Subtotal:</span>
                          <strong>${(unitPrice * parseInt(quantity)).toFixed(2)}</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span>Tax ({taxRate || 0}%):</span>
                          <strong>${((unitPrice * parseInt(quantity)) * (parseFloat(taxRate) || 0) / 100).toFixed(2)}</strong>
                        </div>
                        <hr className="my-1" />
                        <div className="d-flex justify-content-between text-success">
                          <strong>Total:</strong>
                          <strong className="fs-5">${((unitPrice * parseInt(quantity)) * (1 + (parseFloat(taxRate) || 0) / 100)).toFixed(2)}</strong>
                        </div>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Customer Information - Circular 99 Compliance */}
                  <div className="border-top pt-3 mt-3">
                    <h6 className="mb-3"><i className="fas fa-user me-2"></i>Recipient Information (Phiếu Xuất Kho)</h6>

                    <Form.Group className="mb-3">
                      <Form.Label>Customer/Recipient Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer or recipient name..."
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Customer Address/Department</Form.Label>
                      <Form.Control
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Enter address or department..."
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Delivery Person</Form.Label>
                      <Form.Control
                        type="text"
                        value={deliveryPerson}
                        onChange={(e) => setDeliveryPerson(e.target.value)}
                        placeholder="Person delivering/receiving goods..."
                      />
                    </Form.Group>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label>Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes about this dispensation..."
                    />
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button
                      variant="danger"
                      type="submit"
                      size="lg"
                      disabled={loading || !selectedProduct}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check me-2"></i>
                          Dispense Stock
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={() => navigate('/inventory')}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Modal show={showPrintModal} onHide={() => navigate('/inventory')} size="xl" backdrop="static" keyboard={false}>
          <Modal.Header>
            <Modal.Title className="text-danger">
              <i className="fas fa-check-circle me-2"></i>
              Stock Distribution Successful!
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="print-modal-body">
            {createdReceipt && <StockDistributionForm distribution={createdReceipt} />}
          </Modal.Body>
          <Modal.Footer className="no-print">
            <Button variant="secondary" onClick={() => navigate('/inventory')}>
              <i className="fas fa-arrow-right me-2"></i>
              Done & Return to Inventory
            </Button>
            <Button variant="primary" onClick={() => window.print()} size="lg">
              <i className="fas fa-print me-2"></i>
              Print Distribution Form
            </Button>
          </Modal.Footer>
        </Modal>

        <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-modal-body {
            padding: 0 !important;
          }
        }
      `}</style>

      </Container>
    </>
  );
};

export default DispenseStock;
