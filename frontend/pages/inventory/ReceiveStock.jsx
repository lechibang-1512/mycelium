import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup, Modal, Badge } from 'react-bootstrap';
import { inventoryAPI, suppliersAPI, invoicesAPI, warehouseAPI, inventoryTransactionAPI, binsAPI, sparePartsAPI } from '../../api/api';

import { useStocktake } from '../../contexts/StocktakeContext';
import LockdownOverlay from '../../components/layout/LockdownOverlay';
import StockReceiptForm from '../../components/documents/StockReceiptForm';
import DeviceEntryList from '../../components/inventory/DeviceEntryList';
import { validateIMEI } from '../../components/inventory/DeviceEntryCard';

const ReceiveStock = () => {
  const { isLocked } = useStocktake();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [bins, setBins] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedRow, setSelectedRow] = useState('');
  const [selectedBin, setSelectedBin] = useState('');
  const [hierarchicalBins, setHierarchicalBins] = useState({});
  const [quantity, setQuantity] = useState('');
  const [condition, setCondition] = useState('NEW');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [fetchingManifest, setFetchingManifest] = useState(false);
  const [selectedManifestItem, setSelectedManifestItem] = useState(null);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [receivingProgress, setReceivingProgress] = useState(null);
  const [serialNumbers, setSerialNumbers] = useState('');
  const [deviceEntries, setDeviceEntries] = useState([]);
  const [useInvoiceReceiving, setUseInvoiceReceiving] = useState(true);
  const [resetting, setResetting] = useState(false);

  const [spareParts, setSpareParts] = useState([]);
  const [selectedSparePart, setSelectedSparePart] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchWarehouses();
    fetchSpareParts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Get products from catalog (specs_db) for device information
      const response = await fetch('/api/reports/products', {
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        setProducts(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch products');
      }
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    }
  };

  const fetchSpareParts = async (invoiceId = null) => {
    try {
      if (invoiceId) {
        // Fetch spare parts from selected invoice
        const response = await fetch(`/api/invoices/${invoiceId}/spare-parts`);
        const result = await response.json();
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

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll({ status: 'active' });
      setSuppliers(response.data.suppliers || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      // Don't show error, supplier is optional
    }
  };

  const fetchInvoices = async () => {
    try {
      // Fetch ALL invoices for receiving (no supplier filter)
      const response = await fetch('/api/receiving/invoices', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        // Ensure data is an array before mapping
        const invoiceData = Array.isArray(result.data) ? result.data : [];
        // Map all invoices with supplier info included
        setInvoices(invoiceData.map(inv => ({
          uuid: inv.uuid,
          invoice_number: inv.invoice_number,
          supplier_id: inv.supplier_id,
          supplier_name: inv.supplier_name,
          total_amount: inv.total_amount,
          currency: inv.currency,
          receiving_status: inv.receiving_status,
          item_count: inv.item_count || 0
        })));
        setPendingInvoices(invoiceData);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  };

  // Fetch invoices on component mount
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Auto-set supplier when invoice is selected
  useEffect(() => {
    if (selectedInvoice) {
      const invoice = invoices.find(inv => inv.uuid === selectedInvoice);
      if (invoice && invoice.supplier_id) {
        setSelectedSupplier(String(invoice.supplier_id));
      }

    }
  }, [selectedInvoice, invoices]);

  const fetchManifest = async (docId) => {
    if (!docId) return;

    setFetchingManifest(true);
    try {
      // Use receiving manifest API to get proper item_id for receiving
      const response = await fetch(`/api/receiving/invoices/${docId}/manifest`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.invoice && result.items) {
        setManifest({
          invoice: {
            invoice_number: result.invoice.invoice_number,
            supplier_name: result.invoice.supplier_name,
            total_amount: result.invoice.total_amount,
            currency: result.invoice.currency || 'VND',
            supplier_id: result.invoice.supplier_id
          },
          items: result.items || [],
          summary: result.summary || {
            total_items: result.items?.length || 0,
            receiving_progress: 0
          }
        });
      }
    } catch (err) {
      console.error('Failed to load manifest:', err);
      setError('Failed to load invoice manifest');
    } finally {
      setFetchingManifest(false);
    }
  };

  useEffect(() => {
    const docId = selectedInvoice;
    if (docId) {
      fetchInvoiceDetails(docId);
    } else {
      setManifest(null);
    }
  }, [selectedInvoice]);

  // Simplified function to fetch invoice details
  const fetchInvoiceDetails = async (invoiceId) => {
    try {
      // Get basic invoice information
      await fetchManifest(invoiceId);
    } catch (err) {
      console.error('Failed to load invoice details:', err);
      setError('Failed to load invoice details');
    }
  };

  const handleManifestItemSelect = (item) => {
    setSelectedManifestItem(item);
    // Use resolved product_uuid (backend now auto-resolves products)
    setSelectedProduct(item.product_uuid || item.product_id || '');
    // Ensure quantity is always a string to avoid controlled/uncontrolled input warning
    const qty = useInvoiceReceiving ? item.quantity_remaining : item.quantity;
    setQuantity(qty !== undefined && qty !== null ? String(qty) : '');
    setCondition('NEW'); // Default for invoice items

    // Reset device entries for new manifest item
    setDeviceEntries([]);
    setSerialNumbers('');

    // If this item has expected serials, pre-populate device entries
    if (useInvoiceReceiving && item.expected_serials && item.expected_serials.length > 0) {
      const pendingSerials = item.expected_serials.filter(s => !s.is_received);
      // Create device entries from expected serials
      const entries = pendingSerials.map(s => ({
        imei_1: s.expected_serial || '',
        imei_2: '',
        condition: 'NEW',
        serial_number: ''
      }));
      setDeviceEntries(entries);
    }
  };

  // Reset receiving for an item (allows re-receiving)
  const handleResetReceiving = async (item, e) => {
    e.stopPropagation(); // Prevent selecting the item
    if (!window.confirm(`Reset receiving for ${item.product_name || item.invoice_product_name}? This will clear receiving tracking and allow you to receive again.`)) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch(`/api/receiving/invoices/${selectedInvoice}/reset-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.item_id,
          productUuid: item.product_uuid || item.original_product_uuid
        })
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(`Reset receiving: ${result.message}`);
        // Refresh manifest
        await fetchManifest(selectedInvoice);
      } else {
        setError(result.error || 'Failed to reset receiving');
      }
    } catch (err) {
      console.error('Error resetting receiving:', err);
      setError('Failed to reset receiving');
    } finally {
      setResetting(false);
    }
  };

  // Helper to get resolution badge
  const getResolutionBadge = (item) => {
    if (!item.is_product_resolved) {
      return <span className="badge bg-warning text-dark ms-2">Unresolved</span>;
    }
    if (item.resolution_method === 'UUID_MATCH') {
      return <span className="badge bg-success ms-2">Auto-matched</span>;
    }
    if (item.resolution_method === 'NAME_MATCH') {
      return <span className="badge bg-info ms-2">Matched by name</span>;
    }
    return null;
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseAPI.getAll();
      setWarehouses(response.data.warehouses || []);
      // Auto-select if only one warehouse
      if (response.data.warehouses?.length === 1) {
        setSelectedWarehouse(response.data.warehouses[0].warehouse_id);
      }
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  // Fetch bins when warehouse changes
  useEffect(() => {
    if (selectedWarehouse) {
      fetchBinsHierarchical(selectedWarehouse);
    } else {
      setBins([]);
      setHierarchicalBins({});
      setSelectedColumn('');
      setSelectedRow('');
      setSelectedBin('');
    }
  }, [selectedWarehouse]);

  // Reset row when column changes
  useEffect(() => {
    setSelectedRow('');
    setSelectedBin('');
  }, [selectedColumn]);

  // Reset bin when row changes
  useEffect(() => {
    setSelectedBin('');
  }, [selectedRow]);

  const fetchBinsHierarchical = async (warehouseId) => {
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
      console.error('Failed to load bins:', err);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Debug: log all selection values
      console.log('Submit values:', { selectedInvoice, selectedWarehouse, selectedBin, selectedManifestItem, bins: bins.length });

      // Validate warehouse and invoice selection
      if (!selectedWarehouse) {
        setError('Please select a receiving warehouse.');
        setLoading(false);
        return;
      }

      if (!selectedInvoice) {
        setError('Please select an invoice to receive.');
        setLoading(false);
        return;
      }

      // For invoice receiving flow, require manifest item selection
      if (useInvoiceReceiving && !selectedManifestItem) {
        setError('Please select an item from the invoice manifest to receive.');
        setLoading(false);
        return;
      }

      // Require bin selection
      if (!selectedBin) {
        setError('Please select a bin to store the received items.');
        setLoading(false);
        return;
      }

      let response;

      if (useInvoiceReceiving && selectedInvoice && selectedManifestItem) {
        // Determine if this is a phone/device that requires IMEI
        const isPhone = selectedManifestItem.category === 'Mobile Phone' ||
          selectedManifestItem.product_type === 'Mobile Phone' ||
          selectedManifestItem.product_type === 'phone' ||
          selectedManifestItem.device_name;
        const requiresImei = selectedManifestItem.requires_serial_tracking || isPhone;

        // Validate device entries if IMEI is required (phones/devices)
        if (requiresImei) {
          const validDevices = deviceEntries.filter(d => d.imei_1 && validateIMEI(d.imei_1).valid);
          if (validDevices.length !== parseInt(quantity)) {
            setError(`Please enter valid IMEI 1 for all ${quantity} devices. Currently ${validDevices.length} valid.`);
            setLoading(false);
            return;
          }
        }

        // Build devices array for the API
        const devicesPayload = requiresImei
          ? deviceEntries.map(d => ({
            imei_1: d.imei_1 || null,
            imei_2: d.imei_2 || null,
            condition: d.condition || 'NEW',
            serial_number: d.serial_number || null
          }))
          : null;

        const requestBody = {
          warehouseId: selectedWarehouse,
          binId: selectedBin || null,
          userId: 1, // TODO: Get from auth context
          notes: `Received from invoice ${manifest?.invoice?.invoice_number || selectedInvoice}`,
          items: [{
            itemId: selectedManifestItem.item_id,
            productUuid: selectedManifestItem.product_uuid || selectedManifestItem.resolved_product_id || selectedManifestItem.product_id,
            quantityReceived: parseInt(quantity),
            devices: devicesPayload,
            unitCost: selectedManifestItem.unit_price,
            notes: `Received via invoice ${selectedInvoice}`
          }]
        };
        console.log('Receiving request:', requestBody);

        response = await fetch('/api/receiving/invoices/' + selectedInvoice + '/receive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.details || responseData.error || 'Failed to receive stock via invoice API');
        }

        response = { data: responseData };
      } else if (selectedManifestItem?.product_type === 'SPARE_PART') {
        // Spare parts receiving via invoice manifest - now requires serial numbers
        // Validate device entries for spare parts (serial tracking is now required)
        if (selectedManifestItem.requires_serial_tracking) {
          // For spare parts, we validate serial_number instead of IMEI
          const validDevices = deviceEntries.filter(d => d.serial_number && d.serial_number.trim());
          if (validDevices.length !== parseInt(quantity)) {
            setError(`Please enter a serial number for all ${quantity} spare parts. Currently ${validDevices.length} entered.`);
            setLoading(false);
            return;
          }
        }

        // Build devices array with serial numbers for spare parts
        const devicesPayload = selectedManifestItem.requires_serial_tracking
          ? deviceEntries.map(d => ({
            serial_number: d.serial_number || d.imei_1 || null,
            imei_1: d.serial_number || d.imei_1 || null, // Backend checks imei_1 as fallback
            imei_2: null,
            condition: d.condition || 'NEW'
          }))
          : null;

        const requestBody = {
          warehouseId: selectedWarehouse,
          binId: selectedBin || null,
          userId: 1, // TODO: Get from auth context
          notes: `Received spare parts from invoice ${manifest?.invoice?.invoice_number || selectedInvoice}`,
          items: [{
            itemId: selectedManifestItem.item_id,
            productUuid: selectedManifestItem.spare_part_uuid || selectedManifestItem.product_uuid || selectedManifestItem.resolved_product_id,
            quantityReceived: parseInt(quantity),
            devices: devicesPayload,
            unitCost: selectedManifestItem.unit_price,
            notes: `Spare part received via invoice ${selectedInvoice}`
          }]
        };
        console.log('Spare part receiving request:', requestBody);

        response = await fetch('/api/receiving/invoices/' + selectedInvoice + '/receive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.details || responseData.error || 'Failed to receive spare parts via invoice API');
        }

        response = { data: responseData };
      } else {
        response = await inventoryTransactionAPI.receiveStock({
          items: [{
            product_id: selectedProduct,
            quantity: parseInt(quantity),
            unit_cost: 0,
            tax_amount: 0,
            condition: condition
          }],
          supplier_id: selectedSupplier || null,
          warehouse_id: selectedWarehouse,
          bin_id: selectedBin || null,
          notes: 'Traditional receiving',
          po_id: null,
          invoice_id: selectedInvoice || null,
          item_conditions: { [selectedProduct]: condition }
        });
      }

      setSuccess('Stock received successfully!');

      // Try to fetch receipt details for printing
      if (response.data?.receipt_id || response.data?.transaction_group_id) {
        try {
          const receiptId = response.data.receipt_id || response.data.transaction_group_id;
          const receiptResponse = await inventoryAPI.getReceiptDetails(receiptId);
          setReceiptData(receiptResponse.data);
          setShowPrintModal(true);
        } catch (err) {
          console.error('Failed to load receipt details:', err);
        }
      }

      // Reset form and refresh manifest
      setSelectedProduct('');
      setSelectedSupplier('');
      setSelectedSparePart('');
      setQuantity('');
      setSerialNumbers(''); // Clear serial numbers
      setDeviceEntries([]); // Clear device entries
      setSelectedManifestItem(null); // Clear selected manifest item
      // Keep warehouse/zone/bin selected for convenience when receiving multiple items

      // Refresh manifest to show updated quantities
      if (selectedInvoice) {
        await fetchManifest(selectedInvoice);
      }

    } catch (err) {
      setError(err.message || 'Failed to receive stock');
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
              <i className="fas fa-plus-circle me-2"></i>
              Receive Stock
            </h2>
            <p className="text-muted">Add incoming inventory to warehouse</p>
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
                <h5 className="mb-0">Stock Receipt Form</h5>
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

                <Alert variant="info" className="mb-3">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Enhanced Invoice Receiving:</strong> This system integrates with invoices for comprehensive tracking including serial numbers, manifest validation, and automated receipt generation.
                </Alert>

                <Form onSubmit={handleSubmit}>





                  {/* Invoice Selection - FIRST */}
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-file-invoice me-2 text-primary"></i>
                      Select Invoice *
                    </Form.Label>
                    <Form.Select
                      value={selectedInvoice}
                      onChange={(e) => {
                        setSelectedInvoice(e.target.value);
                        setManifest(null);
                        setSelectedManifestItem(null);
                        // Reset location selections when invoice changes
                        setSelectedWarehouse('');
                        setSelectedBin('');
                      }}
                      required
                      className="border-primary"
                    >
                      <option value="">Choose an invoice to receive...</option>
                      {Array.isArray(invoices) && invoices.map((inv) => (
                        <option key={inv.uuid} value={inv.uuid}>
                          {inv.invoice_number} - {inv.supplier_name}
                          {inv.receiving_status && ` (${inv.receiving_status})`}
                          {inv.total_amount && ` | ${parseFloat(inv.total_amount).toLocaleString('vi-VN')} ${inv.currency || 'VND'}`}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Select an invoice to view items and begin receiving
                    </Form.Text>
                  </Form.Group>

                  {/* Warehouse Selection - Only show after invoice selected */}
                  {selectedInvoice && (
                    <Form.Group className="mb-3">
                      <Form.Label>Receiving Warehouse *</Form.Label>
                      <Form.Select
                        value={selectedWarehouse}
                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                        required
                      >
                        <option value="">Select Warehouse...</option>
                        {Array.isArray(warehouses) && warehouses.map(w => (
                          <option key={w.warehouse_id} value={w.warehouse_id}>
                            {w.name} {w.location && `(${w.location})`}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  )}

                  {/* Column Selection - Only show after warehouse selected */}
                  {selectedInvoice && selectedWarehouse && getAvailableColumns().length > 0 && (
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

                  {/* Row Selection - Only show after column selected */}
                  {selectedInvoice && selectedWarehouse && selectedColumn && getAvailableRows().length > 0 && (
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

                  {/* Bin Selection - Only show after row selected */}
                  {selectedInvoice && selectedWarehouse && selectedColumn && selectedRow && getAvailableBins().length > 0 && (
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

                  {receivingProgress !== null && (
                    <Alert variant="info" className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span><i className="fas fa-chart-line me-2"></i>Receiving Progress</span>
                        <strong>{receivingProgress}%</strong>
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{ width: `${receivingProgress}%` }}
                        ></div>
                      </div>
                    </Alert>
                  )}

                  {/* Invoice Summary - Only show when invoice is selected */}
                  {manifest && manifest.invoice && selectedInvoice && (
                    <div className="mb-4">
                      <Card className="border-success bg-light">
                        <Card.Header className="bg-success text-white py-2">
                          <h6 className="mb-0">
                            <i className="fas fa-file-invoice me-2"></i>
                            Invoice Summary
                          </h6>
                        </Card.Header>
                        <Card.Body className="py-3">
                          <Row className="align-items-center">
                            <Col md={4}>
                              <div className="text-center">
                                <h5 className="text-primary mb-1">{manifest.invoice.invoice_number}</h5>
                                <small className="text-muted">Invoice Number</small>
                              </div>
                            </Col>
                            <Col md={4}>
                              <div className="text-center">
                                <h5 className="text-info mb-1">{manifest.invoice.supplier_name}</h5>
                                <small className="text-muted">Supplier</small>
                              </div>
                            </Col>
                            <Col md={2}>
                              <div className="text-center">
                                <h5 className="text-warning mb-1">{manifest.items?.length || 0}</h5>
                                <small className="text-muted">Devices</small>
                              </div>
                            </Col>
                            <Col md={2}>
                              <div className="text-center">
                                <h5 className="text-success mb-1">
                                  {new Intl.NumberFormat('vi-VN').format(manifest.invoice.total_amount || 0)}
                                </h5>
                                <small className="text-muted">{manifest.invoice.currency || 'VND'}</small>
                              </div>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </div>
                  )}

                  {fetchingManifest && (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      <span>Loading manifest items...</span>
                    </div>
                  )}

                  {manifest && manifest.items && manifest.items.length > 0 && (
                    <Card className="mb-3 border-primary shadow-sm text-start">
                      <Card.Header className="bg-primary text-white py-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-0">
                              <i className="fas fa-file-invoice me-2"></i>
                              {manifest.invoice ? manifest.invoice.invoice_number : 'Document Items'}
                            </h6>
                            {manifest.invoice && (
                              <small className="opacity-75">
                                Supplier: {manifest.invoice.supplier_name} |
                                Total: {parseFloat(manifest.invoice.total_amount || 0).toLocaleString('vi-VN')} {manifest.invoice.currency || 'VND'}
                              </small>
                            )}
                          </div>
                          <span className="badge bg-light text-primary">
                            {Array.isArray(manifest.items) ? manifest.items.filter(i => i.is_product_resolved).length : 0}/{Array.isArray(manifest.items) ? manifest.items.length : 0} resolved
                          </span>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <div className="list-group list-group-flush" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                          {Array.isArray(manifest.items) && manifest.items
                            .map((item, idx) => {
                              const isSelected = selectedManifestItem && (selectedManifestItem.item_id === item.item_id);
                              const isComplete = item.receiving_complete;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`list-group-item list-group-item-action border-0 py-2 ${isSelected ? 'bg-light fw-bold text-primary' : ''} ${isComplete ? 'text-muted' : ''}`}
                                  onClick={() => handleManifestItemSelect(item)}
                                >
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div style={{ textAlign: 'left', flex: 1 }}>
                                      <div className="d-flex align-items-center">
                                        <span className="small text-truncate" style={{ maxWidth: '250px' }}>
                                          {item.product_name || item.invoice_product_name || item.description}
                                        </span>
                                        {getResolutionBadge(item)}
                                        {isComplete && <span className="badge bg-secondary ms-2">Received</span>}
                                      </div>
                                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        {item.device_maker && item.device_name && (
                                          <span className="me-2 text-info">
                                            <i className="fas fa-mobile-alt me-1"></i>
                                            {item.device_maker} {item.device_name}
                                          </span>
                                        )}
                                        {item.brand && <span className="me-2">{item.brand}</span>}
                                        <span className="me-2">
                                          Remaining: <strong>{item.quantity_remaining}/{item.quantity}</strong>
                                        </span>
                                        <span>
                                          Price: <strong>{new Intl.NumberFormat().format(item.unit_price || item.unit_cost)}</strong>
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-end d-flex align-items-center">
                                      {isSelected && <i className="fas fa-check-circle text-primary me-2"></i>}
                                      {item.requires_serial_tracking && (
                                        <i className="fas fa-barcode text-muted me-2" title="Requires serial tracking"></i>
                                      )}
                                      {(item.quantity_remaining < item.quantity) && (
                                        <Button
                                          variant="outline-warning"
                                          size="sm"
                                          onClick={(e) => handleResetReceiving(item, e)}
                                          disabled={resetting}
                                          title="Reset receiving to allow re-receiving"
                                          className="py-0 px-1"
                                        >
                                          <i className="fas fa-undo"></i>
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </Card.Body>
                      <Card.Footer className="py-1 bg-white border-top text-center">
                        <small className="text-muted">
                          <i className="fas fa-info-circle me-1"></i>
                          Products are auto-resolved from invoice data. Click an item to receive.
                        </small>
                      </Card.Footer>
                    </Card>
                  )}

                  {/* Product Selection - Always show as resolved when manifest item selected */}
                  {selectedManifestItem && (
                    <Card className="mb-3 border-success bg-light">
                      <Card.Body className="py-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="d-flex align-items-center">
                              <i className="fas fa-check-circle text-success me-2"></i>
                              <strong>Product Resolved</strong>
                              <span className="badge bg-success ms-2">Auto-matched</span>
                            </div>
                            <div className="mt-1">
                              <span className="fw-bold">{selectedManifestItem.product_name || selectedManifestItem.invoice_product_name || selectedManifestItem.description}</span>
                              {selectedManifestItem.brand && (
                                <span className="text-muted ms-2">({selectedManifestItem.brand})</span>
                              )}
                            </div>
                            <small className="text-muted">
                              Type: {selectedManifestItem.product_type || 'Device'} |
                              Category: {selectedManifestItem.category || 'Mobile Phone'}
                              {selectedManifestItem.requires_serial_tracking ? (
                                <span className="ms-2"><i className="fas fa-barcode"></i> Serial tracking</span>
                              ) : null}
                              {selectedManifestItem.device_maker && selectedManifestItem.device_name && (
                                <span className="ms-2">| Device: {selectedManifestItem.device_maker} {selectedManifestItem.device_name}</span>
                              )}
                            </small>
                          </div>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedManifestItem(null);
                              setSelectedProduct('');
                              setQuantity('');
                              setSerialNumbers('');
                            }}
                          >
                            <i className="fas fa-times me-1"></i>Clear
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  )}

                  <Form.Group className="mb-3">
                    <Form.Label>Condition</Form.Label>
                    <Form.Select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                    >
                      <option value="NEW">New</option>
                      <option value="USED">Used</option>
                      <option value="REFURBISHED">Refurbished</option>
                      <option value="TESTING">Testing</option>
                      <option value="DEFECTIVE">Defective</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Quantity *</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      required
                    />
                  </Form.Group>

                  {/* Device IMEI Entry - Per-device cards */}
                  {/* Show IMEI entry for: phones/devices (by category or product_type) OR items with requires_serial_tracking */}
                  {(() => {
                    const isPhone = selectedManifestItem?.category === 'Mobile Phone' ||
                      selectedManifestItem?.product_type === 'Mobile Phone' ||
                      selectedManifestItem?.product_type === 'phone' ||
                      selectedManifestItem?.device_name; // Has device info from specs_db
                    const isSparePartItem = selectedManifestItem?.product_type === 'SPARE_PART';
                    const requiresSerialEntry = selectedManifestItem?.requires_serial_tracking || isPhone;

                    if (selectedManifestItem && parseInt(quantity) > 0 && (requiresSerialEntry || isSparePartItem)) {
                      return (
                        <DeviceEntryList
                          quantity={parseInt(quantity) || 0}
                          devices={deviceEntries}
                          onChange={setDeviceEntries}
                          showSerial={false}
                          isSpareProduct={isSparePartItem}
                        />
                      );
                    } else if (selectedManifestItem && !requiresSerialEntry && !isSparePartItem) {
                      return (
                        <Form.Group className="mb-3">
                          <Form.Label>Serial Numbers (Optional)</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={serialNumbers}
                            onChange={(e) => setSerialNumbers(e.target.value)}
                            placeholder="Optional: Enter serial numbers if applicable"
                          />
                          <Form.Text className="text-muted">
                            This product does not require serial tracking. Leave empty for bulk inventory.
                          </Form.Text>
                        </Form.Group>
                      );
                    }
                    return null;
                  })()}









                  <div className="d-grid gap-2">
                    <Button
                      variant="success"
                      type="submit"
                      size="lg"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check me-2"></i>
                          Receive Stock
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

      </Container>

      {/* Print Receipt Modal */}
      <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Stock Receipt</Modal.Title>
        </Modal.Header>
        <Modal.Body className="print-modal-body">
          {receiptData && <StockReceiptForm receipt={receiptData} />}
        </Modal.Body>
        <Modal.Footer className="no-print">
          <Button variant="secondary" onClick={() => {
            setShowPrintModal(false);
            navigate('/inventory');
          }}>
            Close & Continue
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            <i className="fas fa-print me-2"></i>
            Print Receipt
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
    </>
  );
};

export default ReceiveStock;

