import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Table, Button, Form,
  Modal, Alert, Badge, Spinner, ProgressBar
} from 'react-bootstrap';
import { warehouseAPI, binsAPI } from '../../api/api';
import BinCard from '../../components/bins/BinCard';
import BinForm from '../../components/bins/BinForm';
import '../../styles/hierarchical-warehouse.css';

function WarehouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [warehouse, setWarehouse] = useState(null);
  const [bins, setBins] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState(null);

  // Modals
  const [showBinModal, setShowBinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBinDetailModal, setShowBinDetailModal] = useState(false);

  // Bin form
  const [editingBin, setEditingBin] = useState(null);

  // Bin detail view
  const [selectedBinDetail, setSelectedBinDetail] = useState(null);
  const [loadingBinDetail, setLoadingBinDetail] = useState(false);

  // Transfer form
  const [transferForm, setTransferForm] = useState({
    productId: '',
    sparePartId: '',
    fromBinId: '',
    toBinId: '',
    quantity: '',
    reason: '',
    itemType: '', // 'product', 'spare_part', or 'serialized'
  });

  // Source bin contents for transfer preview
  const [sourceBinContents, setSourceBinContents] = useState(null);
  const [loadingSourceBin, setLoadingSourceBin] = useState(false);

  // Destination bin contents for product type validation
  const [destBinContents, setDestBinContents] = useState(null);
  const [transferTypeConflict, setTransferTypeConflict] = useState(null);

  // Edit warehouse form
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    description: '',
    contact_info: {
      manager_name: '',
      contact_phone: '',
      contact_email: '',
    },
    is_active: true,
  });

  const fetchWarehouseDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [warehouseRes, binsRes, inventoryRes, statsRes] = await Promise.all([
        warehouseAPI.getById(id),
        binsAPI.getByWarehouse(id),
        warehouseAPI.getInventoryByLocation(id),
        warehouseAPI.getStatistics(id),
      ]);

      const warehouseData = warehouseRes.data.warehouse || warehouseRes.data;
      setWarehouse(warehouseData);
      setBins(binsRes.data || []);
      setInventory(inventoryRes.data.inventory || []);

      // Use statistics from the new endpoint
      const statistics = statsRes.data.statistics || {};
      setStats({
        totalBins: binsRes.data?.length || 0,
        activeBins: (binsRes.data || []).filter(b => b.is_active).length,
        totalProducts: statistics.unique_products || 0,
        totalSpareParts: statistics.unique_spare_parts || 0,
        totalItems: statistics.total_items || 0,
        availableItems: statistics.total_items || 0,
        reservedItems: 0,
      });

      setError('');
    } catch (err) {
      console.error('Error fetching warehouse details:', err);
      setError('Failed to load warehouse details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWarehouseDetails();
  }, [fetchWarehouseDetails]);

  // Bin CRUD handlers
  const handleBinSubmit = async (formData) => {
    console.log('WarehouseDetail handleBinSubmit received:', formData);
    try {
      const payload = editingBin
        ? formData
        : { ...formData, warehouse_id: id };
      console.log('Sending to API:', payload);

      if (editingBin) {
        await binsAPI.update(editingBin.bin_id, payload);
        setSuccess('Bin updated successfully');
      } else {
        await binsAPI.create(payload);
        setSuccess('Bin created successfully');
      }

      setShowBinModal(false);
      setEditingBin(null);
      fetchWarehouseDetails();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error saving bin:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to save bin');
    }
  };

  const handleEditBin = (bin) => {
    setEditingBin(bin);
    setShowBinModal(true);
  };

  const handleDeleteBin = async (bin) => {
    const confirmed = window.confirm(
      `⚠️ Delete Bin: "${bin.bin_code}"?\n\nThis will fail if the bin contains inventory.`
    );

    if (confirmed) {
      try {
        await binsAPI.delete(bin.bin_id);
        setSuccess(`Bin "${bin.bin_code}" deleted successfully`);
        fetchWarehouseDetails();
        setTimeout(() => setSuccess(''), 5000);
      } catch (err) {
        console.error('Error deleting bin:', err);
        setError(err.response?.data?.error || 'Failed to delete bin');
      }
    }
  };

  // View bin contents handler
  const handleViewBinContents = async (bin) => {
    try {
      setLoadingBinDetail(true);
      setShowBinDetailModal(true);
      const response = await binsAPI.getContents(bin.bin_id);
      setSelectedBinDetail({
        bin: response.data.bin,
        contents: response.data.contents
      });
    } catch (err) {
      console.error('Error fetching bin contents:', err);
      setError(err.response?.data?.error || 'Failed to fetch bin contents');
      setShowBinDetailModal(false);
    } finally {
      setLoadingBinDetail(false);
    }
  };

  // Edit warehouse handlers
  const handleEditWarehouse = () => {
    let contactInfo = warehouse.contact_info;
    if (typeof contactInfo === 'string') {
      try {
        contactInfo = JSON.parse(contactInfo);
      } catch {
        contactInfo = {};
      }
    }

    setEditForm({
      name: warehouse.name,
      location: warehouse.location || '',
      description: warehouse.description || '',
      contact_info: {
        manager_name: contactInfo?.manager_name || '',
        contact_phone: contactInfo?.contact_phone || '',
        contact_email: contactInfo?.contact_email || '',
      },
      is_active: warehouse.is_active !== undefined ? warehouse.is_active : true,
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('contact_')) {
      const contactField = name.replace('contact_', '');
      setEditForm({
        ...editForm,
        contact_info: {
          ...editForm.contact_info,
          [contactField]: value,
        },
      });
    } else {
      setEditForm({
        ...editForm,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await warehouseAPI.update(id, {
        name: editForm.name,
        location: editForm.location,
        description: editForm.description,
        contactInfo: editForm.contact_info,
        isActive: editForm.is_active,
      });
      setSuccess(`Warehouse "${editForm.name}" updated successfully`);
      setShowEditModal(false);
      fetchWarehouseDetails();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error updating warehouse:', err);
      setError(err.response?.data?.error || 'Failed to update warehouse');
    }
  };

  // Transfer handlers
  const handleTransferFormChange = async (e) => {
    const { name, value } = e.target;
    setTransferForm(prev => ({ ...prev, [name]: value }));

    // If source bin changed, fetch its contents
    if (name === 'fromBinId' && value) {
      try {
        setLoadingSourceBin(true);
        const response = await binsAPI.getContents(value);
        setSourceBinContents(response.data.contents);
      } catch (err) {
        console.error('Error fetching source bin contents:', err);
        setSourceBinContents(null);
      } finally {
        setLoadingSourceBin(false);
      }
    } else if (name === 'fromBinId' && !value) {
      setSourceBinContents(null);
    }

    // If destination bin changed, fetch its contents for type validation
    if (name === 'toBinId' && value) {
      try {
        const response = await binsAPI.getContents(value);
        setDestBinContents(response.data.contents);
        // Check for product type conflict will happen in effect
      } catch (err) {
        console.error('Error fetching dest bin contents:', err);
        setDestBinContents(null);
      }
    } else if (name === 'toBinId' && !value) {
      setDestBinContents(null);
      setTransferTypeConflict(null);
    }
  };

  // Check for product type conflict when item or destination changes
  useEffect(() => {
    if (!destBinContents || !transferForm.itemType) {
      setTransferTypeConflict(null);
      return;
    }

    const hasProducts = (destBinContents.aggregate_items?.filter(i => i.product_id && !i.spare_part_id).length || 0) > 0;
    const hasSpareParts = (destBinContents.aggregate_items?.filter(i => i.spare_part_id).length || 0) > 0;
    const hasDevices = (destBinContents.serialized_items?.length || 0) > 0;

    if (transferForm.itemType === 'spare_part') {
      if (hasProducts || hasDevices) {
        setTransferTypeConflict('Cannot transfer spare part to this bin: it contains products/devices.');
      } else {
        setTransferTypeConflict(null);
      }
    } else if (transferForm.itemType === 'product' || transferForm.itemType === 'serialized') {
      if (hasSpareParts) {
        setTransferTypeConflict('Cannot transfer product/device to this bin: it contains spare parts.');
      } else {
        setTransferTypeConflict(null);
      }
    } else {
      setTransferTypeConflict(null);
    }
  }, [destBinContents, transferForm.itemType]);

  // Handle item selection from the source bin
  const handleSelectTransferItem = (item) => {
    const isSparepart = item.item_type === 'spare_part' || item.spare_part_id;
    const isSerialized = item.item_type === 'serialized';

    setTransferForm(prev => ({
      ...prev,
      productId: item.product_id || '',
      sparePartId: item.spare_part_id || '',
      itemType: isSerialized ? 'serialized' : (isSparepart ? 'spare_part' : 'product'),
      quantity: isSerialized ? '1' : String(item.quantity || 1),
    }));
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    try {
      await binsAPI.transfer({
        productId: transferForm.productId || null,
        sparePartId: transferForm.sparePartId || null,
        warehouseId: id,
        fromBinId: transferForm.fromBinId,
        toBinId: transferForm.toBinId,
        quantity: parseInt(transferForm.quantity),
        reason: transferForm.reason,
      });

      setSuccess(`Successfully transferred ${transferForm.quantity} unit(s) between bins`);
      setShowTransferModal(false);
      setTransferForm({ productId: '', sparePartId: '', fromBinId: '', toBinId: '', quantity: '', reason: '', itemType: '' });
      setSourceBinContents(null);
      fetchWarehouseDetails();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error transferring inventory:', err);
      setError(err.response?.data?.error || 'Failed to transfer inventory');
    }
  };

  // Group bins by column and row
  const groupBinsByPosition = () => {
    const grouped = {};
    bins.forEach(bin => {
      const col = bin.column_position || 'Unassigned';
      const row = bin.row_position || 'Unassigned';
      if (!grouped[col]) grouped[col] = {};
      if (!grouped[col][row]) grouped[col][row] = [];
      grouped[col][row].push(bin);
    });
    return grouped;
  };

  const getBinInventory = (binId) => {
    return inventory.filter(item => item.bin_id === binId);
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading warehouse details...</p>
        </div>
      </Container>
    );
  }

  if (!warehouse) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">Warehouse not found</Alert>
        <Button onClick={() => navigate('/warehouses')}>
          <i className="fas fa-arrow-left me-2"></i>
          Back to Warehouses
        </Button>
      </Container>
    );
  }

  let contactInfo = warehouse.contact_info;
  if (typeof contactInfo === 'string') {
    try {
      contactInfo = JSON.parse(contactInfo);
    } catch {
      contactInfo = {};
    }
  }

  const groupedBins = groupBinsByPosition();

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-3 align-items-center">
        <Col>
          <Button
            variant="link"
            onClick={() => navigate('/warehouses')}
            className="p-0 mb-2 text-decoration-none"
          >
            <i className="fas fa-arrow-left me-2"></i>Back to Warehouses
          </Button>
          <div className="d-flex align-items-center gap-3">
            <h2 className="mb-0">
              <i className="fas fa-warehouse me-2 text-primary"></i>
              {warehouse.name}
            </h2>
            <Badge bg={warehouse.is_active ? 'success' : 'secondary'}>
              {warehouse.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="text-muted small mt-1">
            <i className="fas fa-map-marker-alt me-1"></i>
            {warehouse.location}
            {contactInfo?.manager_name && (
              <span className="ms-3">
                <i className="fas fa-user me-1"></i>
                {contactInfo.manager_name}
              </span>
            )}
          </div>
        </Col>
        <Col md="auto">
          <Button
            size="sm"
            variant="outline-primary"
            onClick={handleEditWarehouse}
          >
            <i className="fas fa-edit me-1"></i>Edit
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')} className="mb-3">
          <i className="fas fa-check-circle me-2"></i>
          {success}
        </Alert>
      )}

      {/* Main Content */}
      <Row className="mb-4">
        <Col lg={8}>
          {/* Bin Grid Layout */}
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-th me-2 text-primary"></i>
                  Bin Locations (Column-Row-Bin)
                </h5>
                <div className="d-flex gap-2">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => setShowTransferModal(true)}
                  >
                    <i className="fas fa-exchange-alt me-1"></i>
                    Transfer Items
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setEditingBin(null);
                      setShowBinModal(true);
                    }}
                  >
                    <i className="fas fa-plus me-1"></i>
                    Add Bin
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {bins.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-box fa-4x text-muted mb-3"></i>
                  <h5>No bins configured</h5>
                  <p className="text-muted">Add your first bin to organize inventory</p>
                  <Button variant="primary" onClick={() => { setEditingBin(null); setShowBinModal(true); }}>
                    <i className="fas fa-plus me-2"></i>
                    Add First Bin
                  </Button>
                </div>
              ) : (
                <div className="p-3">
                  {Object.keys(groupedBins).sort().map(column => (
                    <div key={column} className="mb-4">
                      <h6 className="text-primary mb-2">
                        <i className="fas fa-columns me-2"></i>
                        Column {column}
                      </h6>
                      {Object.keys(groupedBins[column]).sort().map(row => (
                        <div key={`${column}-${row}`} className="ms-3 mb-3">
                          <small className="text-muted">
                            <i className="fas fa-grip-lines me-1"></i>
                            Row {row}
                          </small>
                          <div className="d-flex flex-wrap gap-2 mt-1">
                            {groupedBins[column][row].map(bin => {
                              const binInv = getBinInventory(bin.bin_id);
                              const usedCapacity = binInv.reduce((sum, i) => sum + (i.quantity || 0), 0);
                              const capacityPercent = bin.max_capacity ? (usedCapacity / bin.max_capacity) * 100 : 0;

                              return (
                                <Card key={bin.bin_id} className="bin-card" style={{ width: '180px' }}>
                                  <Card.Body className="p-2">
                                    <div className="d-flex justify-content-between align-items-start">
                                      <div>
                                        <strong>{bin.bin_code}</strong>
                                        <Badge
                                          bg={bin.is_active ? 'success' : 'secondary'}
                                          className="ms-1"
                                          style={{ fontSize: '0.65rem' }}
                                        >
                                          {bin.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                      </div>
                                      <div className="btn-group btn-group-sm">
                                        <Button
                                          size="sm"
                                          variant="outline-info"
                                          onClick={() => handleViewBinContents(bin)}
                                          style={{ padding: '0.1rem 0.3rem' }}
                                          title="View Contents"
                                        >
                                          <i className="fas fa-eye" style={{ fontSize: '0.7rem' }}></i>
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline-primary"
                                          onClick={() => handleEditBin(bin)}
                                          style={{ padding: '0.1rem 0.3rem' }}
                                        >
                                          <i className="fas fa-edit" style={{ fontSize: '0.7rem' }}></i>
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline-danger"
                                          onClick={() => handleDeleteBin(bin)}
                                          style={{ padding: '0.1rem 0.3rem' }}
                                        >
                                          <i className="fas fa-trash" style={{ fontSize: '0.7rem' }}></i>
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="mt-2">
                                      <small className="text-muted d-block">
                                        Position: B{bin.bin_position || '-'}
                                      </small>
                                      <small
                                        className="text-primary d-block"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleViewBinContents(bin)}
                                      >
                                        <i className="fas fa-box-open me-1"></i>
                                        Items: {bin.items?.length || 0} | Qty: {bin.current_quantity || usedCapacity}
                                      </small>
                                      {bin.max_capacity && (
                                        <ProgressBar
                                          now={Math.min(100, capacityPercent)}
                                          variant={
                                            capacityPercent >= 90 ? 'danger' :
                                              capacityPercent >= 75 ? 'warning' : 'success'
                                          }
                                          style={{ height: '4px', marginTop: '4px' }}
                                        />
                                      )}
                                    </div>
                                  </Card.Body>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Warehouse Stats Sidebar */}
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <i className="fas fa-chart-bar me-2"></i>
                Warehouse Overview
              </h6>
            </Card.Header>
            <Card.Body>
              {stats && (
                <div className="stats-grid">
                  <div className="stat-item mb-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Total Bins</span>
                      <Badge bg="primary">{stats.totalBins}</Badge>
                    </div>
                  </div>
                  <div className="stat-item mb-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Active Bins</span>
                      <Badge bg="success">{stats.activeBins}</Badge>
                    </div>
                  </div>
                  <div className="stat-item mb-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Products</span>
                      <Badge bg="info">{stats.totalProducts}</Badge>
                    </div>
                  </div>
                  <div className="stat-item mb-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Spare Parts</span>
                      <Badge bg="warning">{stats.totalSpareParts}</Badge>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Total Units</span>
                      <span className="fw-bold">{stats.totalItems.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Quick Actions */}
          <Card>
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <i className="fas fa-bolt me-2"></i>
                Quick Actions
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button
                  variant="success"
                  onClick={() => navigate('/inventory/receive')}
                >
                  <i className="fas fa-plus-circle me-2"></i>
                  Receive Stock
                </Button>
                <Button
                  variant="warning"
                  onClick={() => navigate('/inventory/dispense')}
                >
                  <i className="fas fa-minus-circle me-2"></i>
                  Dispense Stock
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => setShowTransferModal(true)}
                >
                  <i className="fas fa-exchange-alt me-2"></i>
                  Transfer Between Bins
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Bin Modal */}
      <Modal show={showBinModal} onHide={() => { setShowBinModal(false); setEditingBin(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingBin ? 'Edit Bin' : 'Add New Bin'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BinForm
            bin={editingBin}
            warehouseId={id}
            onSubmit={handleBinSubmit}
            onCancel={() => { setShowBinModal(false); setEditingBin(null); }}
          />
        </Modal.Body>
      </Modal>

      {/* Edit Warehouse Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Warehouse</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={editForm.name}
                onChange={handleEditFormChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Control
                type="text"
                name="location"
                value={editForm.location}
                onChange={handleEditFormChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="description"
                value={editForm.description}
                onChange={handleEditFormChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Manager Name</Form.Label>
              <Form.Control
                type="text"
                name="contact_manager_name"
                value={editForm.contact_info.manager_name}
                onChange={handleEditFormChange}
              />
            </Form.Group>
            <Form.Check
              type="checkbox"
              label="Active"
              name="is_active"
              checked={editForm.is_active}
              onChange={handleEditFormChange}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Changes
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Transfer Modal */}
      <Modal show={showTransferModal} onHide={() => { setShowTransferModal(false); setSourceBinContents(null); setDestBinContents(null); setTransferTypeConflict(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-exchange-alt me-2"></i>
            Transfer Between Bins
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleTransferSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>From Bin *</Form.Label>
                  <Form.Select
                    name="fromBinId"
                    value={transferForm.fromBinId}
                    onChange={handleTransferFormChange}
                    required
                  >
                    <option value="">Select source bin...</option>
                    {bins.filter(b => b.is_active).map(bin => (
                      <option key={bin.bin_id} value={bin.bin_id}>
                        {bin.bin_code} (C{bin.column_position}-R{bin.row_position})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>To Bin *</Form.Label>
                  <Form.Select
                    name="toBinId"
                    value={transferForm.toBinId}
                    onChange={handleTransferFormChange}
                    required
                  >
                    <option value="">Select destination bin...</option>
                    {bins.filter(b => b.is_active && b.bin_id !== transferForm.fromBinId).map(bin => (
                      <option key={bin.bin_id} value={bin.bin_id}>
                        {bin.bin_code} (C{bin.column_position}-R{bin.row_position})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Source Bin Contents Preview */}
            {transferForm.fromBinId && (
              <Card className="mb-3 border-primary">
                <Card.Header className="bg-primary text-white py-2">
                  <small>
                    <i className="fas fa-box-open me-2"></i>
                    Source Bin Contents - Select item to transfer
                  </small>
                </Card.Header>
                <Card.Body className="p-0" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {loadingSourceBin ? (
                    <div className="text-center py-3">
                      <Spinner animation="border" size="sm" /> Loading...
                    </div>
                  ) : sourceBinContents ? (
                    <>
                      {/* Aggregate Items (Products & Spare Parts) */}
                      {sourceBinContents.aggregate_items?.length > 0 && (
                        <Table size="sm" hover className="mb-0">
                          <tbody>
                            {sourceBinContents.aggregate_items.map((item, idx) => (
                              <tr
                                key={item.assignment_id || idx}
                                onClick={() => handleSelectTransferItem(item)}
                                style={{ cursor: 'pointer' }}
                                className={
                                  (transferForm.productId === item.product_id && !item.spare_part_id) ||
                                    (transferForm.sparePartId === item.spare_part_id && item.spare_part_id)
                                    ? 'table-primary' : ''
                                }
                              >
                                <td>
                                  <strong>
                                    {item.spare_part_name || item.product_name || 'Unknown Item'}
                                  </strong>
                                  {item.part_code && (
                                    <small className="text-muted d-block">{item.part_code}</small>
                                  )}
                                  {item.serial_number && (
                                    <small className="text-primary d-block">S/N: {item.serial_number}</small>
                                  )}
                                </td>
                                <td className="text-center" style={{ width: '100px' }}>
                                  <Badge bg={item.spare_part_id ? 'warning' : 'primary'}>
                                    {item.spare_part_id ? 'Spare Part' : 'Product'}
                                  </Badge>
                                </td>
                                <td className="text-end" style={{ width: '60px' }}>
                                  <strong>{item.quantity}</strong> units
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}

                      {/* Serialized Devices (IMEI) */}
                      {sourceBinContents.serialized_items?.length > 0 && (
                        <Table size="sm" hover className="mb-0">
                          <tbody>
                            {sourceBinContents.serialized_items.map((item, idx) => (
                              <tr
                                key={item.tracking_id || idx}
                                onClick={() => handleSelectTransferItem(item)}
                                style={{ cursor: 'pointer' }}
                                className={transferForm.productId === item.product_id && transferForm.itemType === 'serialized' ? 'table-primary' : ''}
                              >
                                <td>
                                  <strong>{item.brand} {item.model || item.product_name}</strong>
                                  <small className="text-primary d-block">IMEI: {item.imei_1}</small>
                                </td>
                                <td className="text-center" style={{ width: '100px' }}>
                                  <Badge bg="info">Device</Badge>
                                </td>
                                <td className="text-end" style={{ width: '60px' }}>
                                  <Badge bg={item.condition_grade === 'A' ? 'success' : 'secondary'}>
                                    {item.condition_grade || 'N/A'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}

                      {!sourceBinContents.aggregate_items?.length && !sourceBinContents.serialized_items?.length && (
                        <div className="text-center py-3 text-muted">
                          <i className="fas fa-inbox me-2"></i>
                          Bin is empty
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-3 text-muted">
                      Unable to load bin contents
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Selected Item Summary */}
            {(transferForm.productId || transferForm.sparePartId) && (
              <Alert variant="info" className="py-2">
                <small>
                  <i className="fas fa-check-circle me-2"></i>
                  <strong>Selected:</strong>{' '}
                  {transferForm.itemType === 'spare_part' ? 'Spare Part' :
                    transferForm.itemType === 'serialized' ? 'Serialized Device' : 'Product'}
                </small>
              </Alert>
            )}

            {/* Product Type Conflict Warning */}
            {transferTypeConflict && (
              <Alert variant="danger" className="py-2">
                <small>
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {transferTypeConflict}
                </small>
              </Alert>
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Quantity *</Form.Label>
                  <Form.Control
                    type="number"
                    name="quantity"
                    value={transferForm.quantity}
                    onChange={handleTransferFormChange}
                    min="1"
                    required
                    disabled={transferForm.itemType === 'serialized'}
                  />
                  {transferForm.itemType === 'serialized' && (
                    <Form.Text className="text-muted">
                      Serialized devices are transferred individually
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Reason</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={1}
                    name="reason"
                    value={transferForm.reason}
                    onChange={handleTransferFormChange}
                    placeholder="Optional"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowTransferModal(false); setSourceBinContents(null); setDestBinContents(null); setTransferTypeConflict(null); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!transferForm.fromBinId || !transferForm.toBinId || !transferForm.quantity || (!transferForm.productId && !transferForm.sparePartId) || transferTypeConflict}
            >
              <i className="fas fa-exchange-alt me-2"></i>
              Transfer
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Bin Detail Modal */}
      <Modal
        show={showBinDetailModal}
        onHide={() => { setShowBinDetailModal(false); setSelectedBinDetail(null); }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-box-open me-2"></i>
            Bin Contents: {selectedBinDetail?.bin?.bin_code || selectedBinDetail?.bin?.hierarchical_code}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingBinDetail ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading bin contents...</p>
            </div>
          ) : selectedBinDetail ? (
            <>
              {/* Summary */}
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="text-center bg-light">
                    <Card.Body className="py-2">
                      <h4 className="mb-0">{selectedBinDetail.contents?.summary?.total_items || 0}</h4>
                      <small className="text-muted">Total Items</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center bg-light">
                    <Card.Body className="py-2">
                      <h4 className="mb-0">{selectedBinDetail.contents?.summary?.serialized_count || 0}</h4>
                      <small className="text-muted">Serialized</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center bg-light">
                    <Card.Body className="py-2">
                      <h4 className="mb-0">{selectedBinDetail.contents?.summary?.unique_products || 0}</h4>
                      <small className="text-muted">Products</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center bg-light">
                    <Card.Body className="py-2">
                      <h4 className="mb-0">{selectedBinDetail.contents?.summary?.unique_spare_parts || 0}</h4>
                      <small className="text-muted">Spare Parts</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Serialized Items (Devices with IMEI) */}
              {selectedBinDetail.contents?.serialized_items?.length > 0 && (
                <div className="mb-4">
                  <h6 className="mb-3">
                    <i className="fas fa-mobile-alt me-2 text-primary"></i>
                    Serialized Devices ({selectedBinDetail.contents.serialized_items.length})
                  </h6>
                  <Table striped bordered hover size="sm" responsive>
                    <thead className="table-dark">
                      <tr>
                        <th>Product</th>
                        <th>IMEI 1</th>
                        <th>IMEI 2</th>
                        <th>Status</th>
                        <th>Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBinDetail.contents.serialized_items.map((item, idx) => (
                        <tr key={item.tracking_id || idx}>
                          <td>
                            <strong>{item.brand || ''} {item.model || item.product_name || 'Unknown'}</strong>
                            {item.sku && <small className="d-block text-muted">SKU: {item.sku}</small>}
                          </td>
                          <td>
                            <code className="text-primary">{item.imei_1 || '-'}</code>
                          </td>
                          <td>
                            <code className="text-muted">{item.imei_2 || '-'}</code>
                          </td>
                          <td>
                            <Badge bg={
                              item.status === 'available' ? 'success' :
                                item.status === 'reserved' ? 'warning' : 'secondary'
                            }>
                              {item.status || 'Unknown'}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={
                              item.condition_grade === 'A' ? 'success' :
                                item.condition_grade === 'B' ? 'info' :
                                  item.condition_grade === 'C' ? 'warning' : 'secondary'
                            }>
                              {item.condition_grade || 'N/A'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}

              {/* Aggregate Items (Non-serialized inventory) */}
              {selectedBinDetail.contents?.aggregate_items?.length > 0 && (
                <div>
                  <h6 className="mb-3">
                    <i className="fas fa-boxes me-2 text-success"></i>
                    Aggregate Inventory ({selectedBinDetail.contents.aggregate_items.length} entries)
                  </h6>
                  <Table striped bordered hover size="sm" responsive>
                    <thead className="table-dark">
                      <tr>
                        <th>Item</th>
                        <th>Type</th>
                        <th>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBinDetail.contents.aggregate_items.map((item, idx) => (
                        <tr key={item.assignment_id || idx}>
                          <td>
                            <strong>
                              {item.product_name || item.spare_part_name || 'Unknown Item'}
                            </strong>
                            {item.sku && <small className="d-block text-muted">SKU: {item.sku}</small>}
                            {item.part_code && <small className="d-block text-muted">Code: {item.part_code}</small>}
                          </td>
                          <td>
                            <Badge bg={item.spare_part_id ? 'warning' : 'primary'}>
                              {item.spare_part_id ? 'Spare Part' : 'Product'}
                            </Badge>
                            {item.part_category && (
                              <small className="d-block text-muted">{item.part_category}</small>
                            )}
                          </td>
                          <td className="text-center">
                            <strong className="fs-5">{item.quantity}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}

              {/* Empty State */}
              {(!selectedBinDetail.contents?.serialized_items?.length &&
                !selectedBinDetail.contents?.aggregate_items?.length) && (
                  <div className="text-center py-4">
                    <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5>Bin is Empty</h5>
                    <p className="text-muted">No items are currently stored in this bin.</p>
                  </div>
                )}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowBinDetailModal(false); setSelectedBinDetail(null); }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default WarehouseDetail;
