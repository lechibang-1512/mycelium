import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Alert, Badge, Table, Spinner, ProgressBar, ButtonGroup, Tab, Tabs, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';
import { stocktakeAPI } from '../../api/api/stocktake';
import { warehouseAPI } from '../../api/api/warehouse';

/**
 * Inventory Counts - Physical inventory counting and cycle count management
 * Supports full stocktakes and cycle counting
 */
function Stocktake() {
  const { hasPermission } = useAuth();

  // Permission checks
  const canWrite = hasPermission(PERMISSIONS.STOCKTAKE_WRITE) || hasPermission(PERMISSIONS.STOCKTAKE_MANAGE);
  const canDelete = hasPermission(PERMISSIONS.STOCKTAKE_DELETE) || hasPermission(PERMISSIONS.STOCKTAKE_MANAGE);
  const canApprove = hasPermission(PERMISSIONS.STOCKTAKE_APPROVE) || hasPermission(PERMISSIONS.STOCKTAKE_MANAGE);
  const canManage = hasPermission(PERMISSIONS.STOCKTAKE_MANAGE);

  // Data states
  const [counts, setCounts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [dueItems, setDueItems] = useState([]);
  const [accuracy, setAccuracy] = useState([]);
  const [selectedCount, setSelectedCount] = useState(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showDueItemsModal, setShowDueItemsModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    warehouse_id: '',
    notes: '',
    count_type: 'cycle',
    limit: 50
  });

  const [editForm, setEditForm] = useState({
    stocktake_id: null,
    notes: '',
    warehouse_id: '',
    count_type: ''
  });

  const [countForm, setCountForm] = useState({
    item_id: null,
    counted_quantity: '',
    notes: ''
  });

  const [addItemForm, setAddItemForm] = useState({
    product_id: '',
    bin_location: '',
    system_quantity: 0,
    counted_quantity: '',
    notes: ''
  });
  const [availableProducts, setAvailableProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    warehouse_id: '',
    status: '',
    count_type: ''
  });

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Initial load
  useEffect(() => {
    fetchCounts();
    fetchWarehouses();
    fetchAccuracy();
    fetchDueItems();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Filtered counts with search
  const filteredCounts = useMemo(() => {
    if (!searchTerm) return counts;
    const term = searchTerm.toLowerCase();
    return counts.filter(c =>
      c.stocktake_number?.toLowerCase().includes(term) ||
      c.warehouse_name?.toLowerCase().includes(term)
    );
  }, [counts, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = counts.length;
    const active = counts.filter(c => ['PLANNED', 'IN_PROGRESS'].includes(c.status)).length;
    const completed = counts.filter(c => c.status === 'COMPLETED').length;
    const approved = counts.filter(c => c.status === 'APPROVED').length;
    const cycleCounts = counts.filter(c => c.count_type === 'cycle').length;
    return { total, active, completed, approved, cycleCounts };
  }, [counts]);

  // API calls
  const fetchCounts = async () => {
    try {
      setLoading(true);
      const params = { limit: 200 };
      if (filters.warehouse_id) params.warehouse_id = filters.warehouse_id;
      if (filters.status) params.status = filters.status;

      const response = await stocktakeAPI.getAll(params);
      let data = response.data.data || [];

      // Ensure data is an array before filtering
      if (!Array.isArray(data)) {
        console.warn('API returned non-array for counts:', data);
        data = [];
      }

      // Client-side filter for count_type
      if (filters.count_type) {
        data = data.filter(c =>
          filters.count_type === 'full'
            ? (!c.count_type || c.count_type === 'full')
            : c.count_type === 'cycle'
        );
      }

      setCounts(data);
      setError('');
    } catch (err) {
      console.error('Error fetching counts:', err);
      setError('Failed to load inventory counts');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseAPI.getAll();
      const data = response.data.warehouses || response.data.data || [];
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };


  const fetchAccuracy = async () => {
    try {
      const response = await stocktakeAPI.getAccuracy();
      const data = response.data.data || [];
      setAccuracy(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching accuracy:', err);
    }
  };

  const fetchDueItems = async () => {
    try {
      const response = await stocktakeAPI.getDueItems({ limit: 50 });
      const data = response.data.data || [];
      setDueItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching due items:', err);
    }
  };

  const fetchCountDetail = async (countId) => {
    try {
      const response = await stocktakeAPI.getById(countId);
      setSelectedCount(response.data.data);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error fetching count detail:', err);
      setError('Failed to load count details');
    }
  };

  const fetchAvailableProducts = async (warehouseId, search = '') => {
    try {
      const response = await stocktakeAPI.getProducts({ warehouse_id: warehouseId, search });
      setAvailableProducts(response.data.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  // Handlers
  const handleCreateCount = async (e) => {
    e.preventDefault();
    try {
      if (createForm.count_type === 'full') {
        await stocktakeAPI.create({
          warehouse_id: createForm.warehouse_id,
          notes: createForm.notes
        });
      } else {
        await stocktakeAPI.createCycleCount({
          warehouse_id: createForm.warehouse_id,
          limit: createForm.limit,
          notes: createForm.notes
        });
      }

      showSuccess(`${createForm.count_type === 'full' ? 'Full stocktake' : 'Cycle count'} created successfully`);
      setShowCreateModal(false);
      resetCreateForm();
      fetchCounts();
      fetchDueItems();
    } catch (err) {
      console.error('Error creating count:', err);
      setError(err.response?.data?.error || 'Failed to create count');
    }
  };

  const handleStartCount = async (countId) => {
    try {
      await stocktakeAPI.start(countId);
      showSuccess('Count started - ready for item counting');
      fetchCounts();
      if (selectedCount?.stocktake_id === countId) fetchCountDetail(countId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start count');
    }
  };

  const handleCompleteCount = async (countId) => {
    try {
      await stocktakeAPI.complete(countId);
      showSuccess('Count completed - ready for approval');
      fetchCounts();
      if (selectedCount?.stocktake_id === countId) fetchCountDetail(countId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete count');
    }
  };

  const handleApproveCount = async (countId) => {
    if (!window.confirm('Approve this count and apply inventory adjustments?\n\nThis action cannot be undone.')) return;
    try {
      await stocktakeAPI.approve(countId);
      showSuccess('Count approved - adjustments applied to inventory');
      fetchCounts();
      fetchAccuracy();
      fetchDueItems();
      if (selectedCount?.stocktake_id === countId) fetchCountDetail(countId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve count');
    }
  };

  const handleCancelCount = async (countId) => {
    const reason = window.prompt('Enter cancellation reason:');
    if (!reason) return;
    try {
      await stocktakeAPI.cancel(countId, reason);
      showSuccess('Count cancelled');
      fetchCounts();
      setShowDetailModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel count');
    }
  };

  const handleDeleteCount = async (countId) => {
    const stocktake = counts.find(c => c.stocktake_id === countId);
    const confirmMsg = stocktake?.status === 'IN_PROGRESS'
      ? 'This stocktake is IN PROGRESS. Are you sure you want to delete it? This action cannot be undone.'
      : 'Permanently delete this stocktake? This action cannot be undone.';

    if (!window.confirm(confirmMsg)) return;

    try {
      await stocktakeAPI.delete(countId);
      showSuccess('Stocktake deleted successfully');
      fetchCounts();
      fetchDueItems();
      setShowDetailModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete stocktake');
    }
  };

  const handleRecordCount = async (e) => {
    e.preventDefault();
    try {
      await stocktakeAPI.recordCount(countForm.item_id, {
        counted_quantity: parseFloat(countForm.counted_quantity),
        notes: countForm.notes
      });
      showSuccess('Count recorded');
      setShowCountModal(false);
      setCountForm({ item_id: null, counted_quantity: '', notes: '' });
      fetchCountDetail(selectedCount.stocktake_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record count');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await stocktakeAPI.addItem(selectedCount.stocktake_id, {
        product_id: addItemForm.product_id,
        bin_location: addItemForm.bin_location,
        system_quantity: addItemForm.system_quantity,
        counted_quantity: addItemForm.counted_quantity ? parseFloat(addItemForm.counted_quantity) : null,
        notes: addItemForm.notes
      });
      showSuccess('Item added to stocktake');
      setShowAddItemModal(false);
      setAddItemForm({
        product_id: '',
        bin_location: '',
        system_quantity: 0,
        counted_quantity: '',
        notes: ''
      });
      fetchCountDetail(selectedCount.stocktake_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Remove this item from the stocktake?')) return;
    try {
      await stocktakeAPI.deleteItem(itemId);
      showSuccess('Item removed');
      fetchCountDetail(selectedCount.stocktake_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete item');
    }
  };

  const handleEditClick = (stocktake) => {
    setEditForm({
      stocktake_id: stocktake.stocktake_id,
      notes: stocktake.notes || '',
      warehouse_id: stocktake.warehouse_id,
      count_type: stocktake.count_type || 'full'
    });
    setShowEditModal(true);
  };

  const handleUpdateStocktake = async (e) => {
    e.preventDefault();

    // Check for critical changes
    const original = counts.find(c => c.stocktake_id === editForm.stocktake_id);
    const isCriticalChange = original && (
      String(original.warehouse_id) !== String(editForm.warehouse_id) ||
      original.count_type !== editForm.count_type
    );

    if (isCriticalChange) {
      if (!window.confirm('Warning: Changing Warehouse or Count Type will RESET all counted items for this stocktake.\n\nAre you sure you want to proceed?')) {
        return;
      }
    }

    try {
      await stocktakeAPI.update(editForm.stocktake_id, {
        notes: editForm.notes,
        warehouse_id: editForm.warehouse_id,
        count_type: editForm.count_type
      });
      showSuccess('Stocktake updated successfully');
      setShowEditModal(false);
      fetchCounts();
      if (selectedCount?.stocktake_id === editForm.stocktake_id) {
        fetchCountDetail(editForm.stocktake_id);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update stocktake');
    }
  };

  // Effect for product search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (showAddItemModal && selectedCount) {
        fetchAvailableProducts(selectedCount.warehouse_id, productSearch);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [productSearch, showAddItemModal, selectedCount]);

  // Helpers
  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const resetCreateForm = () => {
    setCreateForm({
      warehouse_id: '',
      notes: '',
      count_type: 'cycle',
      limit: 50
    });
  };

  const openCountModal = (item) => {
    setCountForm({
      item_id: item.id,
      counted_quantity: item.counted_quantity ?? '',
      notes: item.notes || ''
    });
    setShowCountModal(true);
  };

  const getStatusBadge = (status) => {
    const config = {
      'PLANNED': { bg: 'secondary', icon: 'fa-clock' },
      'IN_PROGRESS': { bg: 'primary', icon: 'fa-spinner fa-spin' },
      'COMPLETED': { bg: 'info', icon: 'fa-check' },
      'APPROVED': { bg: 'success', icon: 'fa-check-double' },
      'CANCELLED': { bg: 'danger', icon: 'fa-times' }
    };
    const c = config[status] || { bg: 'secondary', icon: 'fa-question' };
    return <Badge bg={c.bg}><i className={`fas ${c.icon} me-1`}></i>{status}</Badge>;
  };

  const getTypeBadge = (countType) => {
    if (!countType || countType === 'full') {
      return <Badge bg="secondary"><i className="fas fa-boxes me-1"></i>STOCKTAKE</Badge>;
    }
    return (
      <Badge bg="info">
        <i className="fas fa-sync-alt me-1"></i>
        CYCLE
      </Badge>
    );
  };

  const calculateProgress = (count) => {
    if (!count.total_items || count.total_items === 0) return 0;
    return Math.round((count.counted_items / count.total_items) * 100);
  };

  const getVarianceBadge = (variance) => {
    if (variance === null || variance === undefined) return null;
    const v = parseFloat(variance);
    if (v === 0) return <Badge bg="success">Match</Badge>;
    if (v > 0) return <Badge bg="info">+{v}</Badge>;
    return <Badge bg="danger">{v}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  // Aggregate IRA
  const aggregateIRA = useMemo(() => {
    if (!Array.isArray(accuracy) || accuracy.length === 0) return null;
    const totalCounted = accuracy.reduce((sum, a) => sum + (Number(a.products_counted) || 0), 0);
    const totalMatched = accuracy.reduce((sum, a) => sum + (Number(a.products_matched) || 0), 0);
    if (totalCounted === 0) return null;
    return ((totalMatched / totalCounted) * 100).toFixed(1);
  }, [accuracy]);

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-1">
            <i className="fas fa-clipboard-list me-2 text-primary"></i>
            Inventory Counts
          </h2>
          <p className="text-muted mb-0">
            Physical inventory counting, cycle counts, and variance management
          </p>
        </Col>
        <Col md="auto" className="d-flex gap-2">
          {canWrite && (
            <Button variant="outline-info" onClick={() => setShowDueItemsModal(true)}>
              <i className="fas fa-exclamation-circle me-1"></i>
              Due Items ({dueItems.length})
            </Button>
          )}
          {canManage && (
            <Button variant="success" onClick={() => setShowCreateModal(true)}>
              <i className="fas fa-plus me-1"></i>
              New Count
            </Button>
          )}
        </Col>
      </Row>

      {/* Alerts */}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}><i className="fas fa-exclamation-triangle me-2"></i>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}><i className="fas fa-check-circle me-2"></i>{success}</Alert>}

      {/* Stats Cards */}
      <Row className="mb-4 g-3">
        <Col md={2}>
          <Card className="text-center h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <div className="display-6 fw-bold text-primary">{stats.active}</div>
              <small className="text-muted">Active Counts</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <div className="display-6 fw-bold text-info">{stats.completed}</div>
              <small className="text-muted">Pending Approval</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <div className="display-6 fw-bold text-success">{stats.approved}</div>
              <small className="text-muted">Approved</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <div className="display-6 fw-bold" style={{ color: '#6f42c1' }}>{stats.cycleCounts}</div>
              <small className="text-muted">Cycle Counts</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <div className="display-6 fw-bold text-warning">{dueItems.length}</div>
              <small className="text-muted">Items Due</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className={`text-center h-100 border-0 shadow-sm ${aggregateIRA && parseFloat(aggregateIRA) >= 98 ? 'bg-success bg-opacity-10' : ''}`}>
            <Card.Body className="py-3">
              <div className={`display-6 fw-bold ${aggregateIRA && parseFloat(aggregateIRA) >= 98 ? 'text-success' : 'text-warning'}`}>
                {aggregateIRA ? `${aggregateIRA}%` : '-'}
              </div>
              <small className="text-muted">Overall IRA</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* IRA by Warehouse */}
      {accuracy.length > 0 && (
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Header className="bg-white border-bottom">
            <i className="fas fa-chart-line me-2 text-success"></i>
            <strong>Inventory Record Accuracy by Warehouse</strong>
          </Card.Header>
          <Card.Body>
            <Row>
              {accuracy.map(a => (
                <Col md={3} key={a.warehouse_id} className="mb-3">
                  <div className="border rounded p-3 h-100">
                    <h6 className="text-truncate mb-2">{a.warehouse_name}</h6>
                    <div className={`h3 mb-1 ${parseFloat(a.ira_pct) >= 98 ? 'text-success' : parseFloat(a.ira_pct) >= 95 ? 'text-warning' : 'text-danger'}`}>
                      {a.ira_pct || '0.00'}%
                    </div>
                    <ProgressBar
                      now={parseFloat(a.ira_pct) || 0}
                      variant={parseFloat(a.ira_pct) >= 98 ? 'success' : parseFloat(a.ira_pct) >= 95 ? 'warning' : 'danger'}
                      className="mb-2"
                      style={{ height: '8px' }}
                    />
                    <small className="text-muted d-block">
                      <i className="fas fa-check-circle text-success me-1"></i>
                      {a.products_matched?.toString() || 0} matched
                    </small>
                    <small className="text-muted d-block">
                      <i className="fas fa-times-circle text-danger me-1"></i>
                      {a.products_with_variance?.toString() || 0} variance
                    </small>
                    <small className="text-muted d-block mt-1">
                      <i className="fas fa-calendar me-1"></i>
                      Last: {formatDate(a.last_count_date)}
                    </small>
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Filters & Search */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="py-3">
          <Row className="align-items-end g-3">
            <Col md={3}>
              <Form.Label className="small text-muted mb-1">Search</Form.Label>
              <InputGroup>
                <InputGroup.Text><i className="fas fa-search"></i></InputGroup.Text>
                <Form.Control
                  placeholder="Search counts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Label className="small text-muted mb-1">Warehouse</Form.Label>
              <Form.Select
                value={filters.warehouse_id}
                onChange={(e) => setFilters({ ...filters, warehouse_id: e.target.value })}
              >
                <option value="">All Warehouses</option>
                {warehouses.map(w => (
                  <option key={w.id || w.warehouse_id} value={w.id || w.warehouse_id}>
                    {w.warehouse_name || w.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="small text-muted mb-1">Status</Form.Label>
              <Form.Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="APPROVED">Approved</option>
                <option value="CANCELLED">Cancelled</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="small text-muted mb-1">Type</Form.Label>
              <Form.Select
                value={filters.count_type}
                onChange={(e) => setFilters({ ...filters, count_type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="full">Full Stocktake</option>
                <option value="cycle">Cycle Count</option>
              </Form.Select>
            </Col>
            <Col md="auto">
              <Button variant="outline-secondary" onClick={() => { setFilters({ warehouse_id: '', status: '', count_type: '' }); setSearchTerm(''); }}>
                <i className="fas fa-undo me-1"></i>Reset
              </Button>
            </Col>
            <Col md="auto">
              <Button variant="outline-primary" onClick={fetchCounts}>
                <i className="fas fa-sync-alt me-1"></i>Refresh
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Counts Table */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading inventory counts...</p>
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Count #</th>
                  <th>Type</th>
                  <th>Warehouse</th>

                  <th>Status</th>
                  <th>Progress</th>
                  <th>Variance</th>
                  <th>Created</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCounts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <i className="fas fa-clipboard-list fa-3x mb-3 d-block opacity-25"></i>
                      No inventory counts found
                    </td>
                  </tr>
                ) : (
                  filteredCounts.map(c => (
                    <tr key={c.stocktake_id} className={c.status === 'IN_PROGRESS' ? 'table-warning' : ''}>
                      <td>
                        <span
                          className="text-primary fw-bold"
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          onClick={() => fetchCountDetail(c.stocktake_id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fetchCountDetail(c.stocktake_id) }}
                        >
                          {c.stocktake_number}
                        </span>
                      </td>
                      <td>{getTypeBadge(c.count_type)}</td>
                      <td>{c.warehouse_name}</td>

                      <td>{getStatusBadge(c.status)}</td>
                      <td style={{ minWidth: '150px' }}>
                        <div className="d-flex align-items-center gap-2">
                          <ProgressBar
                            now={calculateProgress(c)}
                            variant={calculateProgress(c) === 100 ? 'success' : 'primary'}
                            style={{ flex: 1, height: '10px' }}
                          />
                          <small className="text-muted" style={{ minWidth: '55px' }}>
                            {c.counted_items || 0}/{c.total_items || 0}
                          </small>
                        </div>
                      </td>
                      <td>{getVarianceBadge(c.total_variance_qty)}</td>
                      <td><small>{formatDate(c.created_at)}</small></td>
                      <td className="text-end">
                        <ButtonGroup size="sm">
                          <OverlayTrigger placement="top" overlay={<Tooltip>View Details</Tooltip>}>
                            <Button variant="outline-primary" onClick={() => fetchCountDetail(c.stocktake_id)}>
                              <i className="fas fa-eye"></i>
                            </Button>
                          </OverlayTrigger>
                          {canWrite && ['PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(c.status) && (
                            <OverlayTrigger placement="top" overlay={<Tooltip>Edit Stocktake</Tooltip>}>
                              <Button variant="outline-info" onClick={() => handleEditClick(c)}>
                                <i className="fas fa-edit"></i>
                              </Button>
                            </OverlayTrigger>
                          )}
                          {canWrite && c.status === 'PLANNED' && (
                            <OverlayTrigger placement="top" overlay={<Tooltip>Start Counting</Tooltip>}>
                              <Button variant="outline-success" onClick={() => handleStartCount(c.stocktake_id)}>
                                <i className="fas fa-play"></i>
                              </Button>
                            </OverlayTrigger>
                          )}
                          {canDelete && (
                            <OverlayTrigger placement="top" overlay={<Tooltip>Delete Stocktake</Tooltip>}>
                              <Button variant="outline-danger" onClick={() => handleDeleteCount(c.stocktake_id)}>
                                <i className="fas fa-trash"></i>
                              </Button>
                            </OverlayTrigger>
                          )}
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Create Count Modal */}
      <Modal show={showCreateModal} onHide={() => { setShowCreateModal(false); resetCreateForm(); }} size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title><i className="fas fa-plus-circle me-2 text-success"></i>Create Inventory Count</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateCount}>
            {/* Count Type Cards */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">Count Type</Form.Label>
              <Row className="g-3">
                <Col md={6}>
                  <Card
                    className={`h-100 ${createForm.count_type === 'cycle' ? 'border-info bg-info bg-opacity-10' : 'border-light'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setCreateForm({ ...createForm, count_type: 'cycle' })}
                  >
                    <Card.Body className="text-center py-4">
                      <i className={`fas fa-sync-alt fa-3x mb-3 ${createForm.count_type === 'cycle' ? 'text-info' : 'text-muted'}`}></i>
                      <h5>Cycle Count</h5>
                      <p className="text-muted small mb-0">
                        Periodic counting of inventory subsets.<br />
                        <strong className="text-success">No operations shutdown required.</strong>
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card
                    className={`h-100 ${createForm.count_type === 'full' ? 'border-warning bg-warning bg-opacity-10' : 'border-light'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setCreateForm({ ...createForm, count_type: 'full' })}
                  >
                    <Card.Body className="text-center py-4">
                      <i className={`fas fa-boxes fa-3x mb-3 ${createForm.count_type === 'full' ? 'text-warning' : 'text-muted'}`}></i>
                      <h5>Full Stocktake</h5>
                      <p className="text-muted small mb-0">
                        Complete count of all inventory.<br />
                        <strong className="text-danger">Requires operations freeze.</strong>
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Form.Group>

            <hr />

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Warehouse <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    required
                    value={createForm.warehouse_id}
                    onChange={(e) => setCreateForm({ ...createForm, warehouse_id: e.target.value })}
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => (
                      <option key={w.id || w.warehouse_id} value={w.id || w.warehouse_id}>
                        {w.warehouse_name || w.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Cycle Count Options */}
            {createForm.count_type === 'cycle' && (
              <Card className="mb-3 bg-light border-0">
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Maximum Items</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          max="500"
                          value={createForm.limit}
                          onChange={(e) => setCreateForm({ ...createForm, limit: parseInt(e.target.value) || 50 })}
                        />
                        <Form.Text className="text-muted">Items prioritized by class and days since last count</Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  <hr className="my-3" />
                  <Form.Check
                    type="switch"
                    id="custom-frequency-toggle"
                    label={<><i className="fas fa-clock me-1"></i>Custom Count Frequencies</>}
                    checked={createForm.customFrequency || false}
                    onChange={(e) => setCreateForm({
                      ...createForm,
                      customFrequency: e.target.checked,
                      frequencies: e.target.checked ? (createForm.frequencies || { A: 30, B: 90, C: 180 }) : undefined
                    })}
                  />
                  {createForm.customFrequency && (
                    <Row className="mt-3 g-2">
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label><Badge bg="danger">A</Badge> High Value (days)</Form.Label>
                          <Form.Control
                            type="number"
                            min="1"
                            max="365"
                            value={createForm.frequencies?.A || 30}
                            onChange={(e) => setCreateForm({
                              ...createForm,
                              frequencies: { ...createForm.frequencies, A: parseInt(e.target.value) || 30 }
                            })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label><Badge bg="warning">B</Badge> Medium Value (days)</Form.Label>
                          <Form.Control
                            type="number"
                            min="1"
                            max="365"
                            value={createForm.frequencies?.B || 90}
                            onChange={(e) => setCreateForm({
                              ...createForm,
                              frequencies: { ...createForm.frequencies, B: parseInt(e.target.value) || 90 }
                            })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label><Badge bg="secondary">C</Badge> Low Value (days)</Form.Label>
                          <Form.Control
                            type="number"
                            min="1"
                            max="365"
                            value={createForm.frequencies?.C || 180}
                            onChange={(e) => setCreateForm({
                              ...createForm,
                              frequencies: { ...createForm.frequencies, C: parseInt(e.target.value) || 180 }
                            })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  )}
                </Card.Body>
              </Card>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Optional notes or instructions..."
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="outline-secondary" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={createForm.count_type === 'cycle' ? 'info' : 'warning'}
                disabled={!createForm.warehouse_id}
              >
                <i className={`fas ${createForm.count_type === 'cycle' ? 'fa-sync-alt' : 'fa-boxes'} me-2`}></i>
                Create {createForm.count_type === 'cycle' ? 'Cycle Count' : 'Full Stocktake'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Count Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="xl" scrollable>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            <i className="fas fa-clipboard-check me-2 text-primary"></i>
            {selectedCount?.stocktake_number}
            <span className="ms-3">{selectedCount && getStatusBadge(selectedCount.status)}</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCount && (
            <>
              {/* Count Info */}
              <Row className="mb-4">
                <Col md={6}>
                  <Card className="h-100 border-0 bg-light">
                    <Card.Body>
                      <h6 className="text-muted mb-3"><i className="fas fa-info-circle me-2"></i>Details</h6>
                      <table className="table table-sm table-borderless mb-0">
                        <tbody>
                          <tr><td className="text-muted" width="40%">Type:</td><td>{getTypeBadge(selectedCount.count_type)}</td></tr>
                          <tr><td className="text-muted">Warehouse:</td><td>{selectedCount.warehouse_name}</td></tr>
                          <tr><td className="text-muted">Zone:</td><td>{selectedCount.zone_name || 'All Zones'}</td></tr>
                          <tr><td className="text-muted">Notes:</td><td>{selectedCount.notes || '-'}</td></tr>
                          <tr><td className="text-muted">Created:</td><td>{formatDateTime(selectedCount.created_at)}</td></tr>
                          <tr><td className="text-muted">Started:</td><td>{formatDateTime(selectedCount.started_at)}</td></tr>
                          <tr><td className="text-muted">Completed:</td><td>{formatDateTime(selectedCount.completed_at)}</td></tr>
                        </tbody>
                      </table>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100 border-0 bg-light">
                    <Card.Body>
                      <h6 className="text-muted mb-3"><i className="fas fa-chart-bar me-2"></i>Progress</h6>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <span>Items Counted</span>
                          <strong>{selectedCount.counted_items || 0} / {selectedCount.total_items || 0}</strong>
                        </div>
                        <ProgressBar
                          now={calculateProgress(selectedCount)}
                          variant={calculateProgress(selectedCount) === 100 ? 'success' : 'primary'}
                          label={`${calculateProgress(selectedCount)}%`}
                        />
                      </div>
                      <Row className="text-center">
                        <Col>
                          <div className="h4 mb-0 text-success">{selectedCount.items?.filter(i => i.variance === 0).length || 0}</div>
                          <small className="text-muted">Matched</small>
                        </Col>
                        <Col>
                          <div className="h4 mb-0 text-danger">{selectedCount.items?.filter(i => i.variance && i.variance !== 0).length || 0}</div>
                          <small className="text-muted">Variance</small>
                        </Col>
                        <Col>
                          <div className="h4 mb-0 text-info">{Math.abs(parseFloat(selectedCount.total_variance_qty) || 0)}</div>
                          <small className="text-muted">Total Var.</small>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex gap-2 flex-wrap">
                  {/* Primary Actions */}
                  {canWrite && selectedCount.status === 'PLANNED' && (
                    <Button variant="success" onClick={() => handleStartCount(selectedCount.stocktake_id)}>
                      <i className="fas fa-play me-2"></i>Start Counting
                    </Button>
                  )}
                  {canWrite && selectedCount.status === 'IN_PROGRESS' && (
                    <Button variant="info" onClick={() => handleCompleteCount(selectedCount.stocktake_id)}>
                      <i className="fas fa-check me-2"></i>Complete Count
                    </Button>
                  )}
                  {canApprove && selectedCount.status === 'COMPLETED' && (
                    <Button variant="success" onClick={() => handleApproveCount(selectedCount.stocktake_id)}>
                      <i className="fas fa-check-double me-2"></i>Approve & Apply Adjustments
                    </Button>
                  )}

                  {/* Edit Action */}
                  {canWrite && ['PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(selectedCount.status) && (
                    <Button variant="outline-primary" onClick={() => { handleEditClick(selectedCount); setShowDetailModal(false); }}>
                      <i className="fas fa-edit me-2"></i>Edit
                    </Button>
                  )}

                  {/* Cancel Action */}
                  {canManage && ['PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(selectedCount.status) && (
                    <Button variant="outline-warning" onClick={() => handleCancelCount(selectedCount.stocktake_id)}>
                      <i className="fas fa-times me-2"></i>Cancel
                    </Button>
                  )}

                  {/* Delete Action - Available for all statuses */}
                  {canDelete && (
                    <Button variant="outline-danger" onClick={() => handleDeleteCount(selectedCount.stocktake_id)}>
                      <i className="fas fa-trash me-2"></i>Delete Entirely
                    </Button>
                  )}
                </div>

                {/* Add Item Button */}
                {canWrite && ['PLANNED', 'IN_PROGRESS'].includes(selectedCount.status) && (
                  <Button variant="outline-primary" onClick={() => setShowAddItemModal(true)}>
                    <i className="fas fa-plus me-2"></i>Add Item
                  </Button>
                )}
              </div>

              {/* Items Table */}
              <h6 className="mb-3"><i className="fas fa-list me-2"></i>Count Items</h6>
              <Table striped bordered hover responsive size="sm">
                <thead className="bg-light">
                  <tr>
                    <th>Product</th>
                    <th>Location</th>
                    <th className="text-center">System Qty</th>
                    <th className="text-center">Counted</th>
                    <th className="text-center">Variance</th>
                    <th className="text-center">Var %</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCount.items?.map(item => (
                    <tr key={item.id} className={item.variance && item.variance !== 0 ? 'table-warning' : ''}>
                      <td>
                        <div><strong>{item.device_name}</strong></div>
                        <small className="text-muted">{item.device_maker}</small>
                      </td>
                      <td><small>{item.bin_location}</small></td>
                      <td className="text-center">{item.system_quantity}</td>
                      <td className="text-center">
                        {item.counted_quantity !== null ? (
                          <Badge bg="success">{item.counted_quantity}</Badge>
                        ) : (
                          <Badge bg="secondary">Pending</Badge>
                        )}
                      </td>
                      <td className="text-center">{getVarianceBadge(item.variance)}</td>
                      <td className="text-center">
                        {item.variance_pct !== null && <small>{item.variance_pct}%</small>}
                      </td>
                      <td className="text-end">
                        {canWrite && ['PLANNED', 'IN_PROGRESS'].includes(selectedCount.status) && (
                          <div className="d-flex gap-1 justify-content-end">
                            <Button size="sm" variant={item.counted_quantity !== null ? 'outline-primary' : 'primary'} onClick={() => openCountModal(item)}>
                              {item.counted_quantity !== null ? 'Update' : 'Count'}
                            </Button>
                            <Button size="sm" variant="outline-danger" onClick={() => handleDeleteItem(item.id)}>
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Record Count Modal */}
      <Modal show={showCountModal} onHide={() => setShowCountModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><i className="fas fa-calculator me-2"></i>Record Count</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleRecordCount}>
            <Form.Group className="mb-3">
              <Form.Label>Counted Quantity <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="number"
                step="1"
                min="0"
                required
                size="lg"
                value={countForm.counted_quantity}
                onChange={(e) => setCountForm({ ...countForm, counted_quantity: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={countForm.notes}
                onChange={(e) => setCountForm({ ...countForm, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" onClick={() => setShowCountModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary"><i className="fas fa-save me-2"></i>Save Count</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Edit Stocktake Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title><i className="fas fa-edit me-2"></i>Edit Stocktake Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateStocktake}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Warehouse</Form.Label>
                  <Form.Select
                    value={editForm.warehouse_id}
                    onChange={(e) => setEditForm({ ...editForm, warehouse_id: e.target.value })}
                    disabled={counts.find(c => c.stocktake_id === editForm.stocktake_id)?.status !== 'PLANNED'}
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => (
                      <option key={w.id || w.warehouse_id} value={w.id || w.warehouse_id}>{w.warehouse_name || w.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Count Type</Form.Label>
              <div className="d-flex gap-3">
                <Form.Check
                  type="radio"
                  label="Full Stocktake"
                  name="editCountType"
                  checked={editForm.count_type === 'full'}
                  onChange={() => setEditForm({ ...editForm, count_type: 'full' })}
                  disabled={counts.find(c => c.stocktake_id === editForm.stocktake_id)?.status !== 'PLANNED'}
                />
                <Form.Check
                  type="radio"
                  label="Cycle Count"
                  name="editCountType"
                  checked={editForm.count_type === 'cycle'}
                  onChange={() => setEditForm({ ...editForm, count_type: 'cycle' })}
                  disabled={counts.find(c => c.stocktake_id === editForm.stocktake_id)?.status !== 'PLANNED'}
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Enter stocktake notes or instructions..."
              />
            </Form.Group>

            {counts.find(c => c.stocktake_id === editForm.stocktake_id)?.status === 'PLANNED' && (
              <Alert variant="warning" className="small py-2">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Changing Warehouse, Zone, or Type will reset all items.
              </Alert>
            )}

            {counts.find(c => c.stocktake_id === editForm.stocktake_id)?.status !== 'PLANNED' && (
              <Alert variant="info" className="small py-2">
                <i className="fas fa-info-circle me-2"></i>
                Only notes can be edited after counting has started.
              </Alert>
            )}

            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">
                <i className="fas fa-save me-2"></i>Save Changes
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Add Item Modal */}
      <Modal show={showAddItemModal} onHide={() => setShowAddItemModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title><i className="fas fa-plus me-2"></i>Add Item to Stocktake</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddItem}>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Search Product</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Search by name or code..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  {availableProducts.length > 0 && productSearch && (
                    <div className="border rounded mt-1 p-2 bg-white position-absolute shadow w-75" style={{ zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                      {availableProducts.map(p => (
                        <div
                          key={p.product_id}
                          className="p-2 border-bottom cursor-pointer hover-bg-light"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setAddItemForm({
                              ...addItemForm,
                              product_id: p.product_id,
                              system_quantity: p.system_quantity || 0,
                              bin_location: p.bin_locations || ''
                            });
                            setProductSearch(p.device_name);
                            setAvailableProducts([]);
                          }}
                        >
                          <strong>{p.device_name}</strong>
                          <div className="small text-muted">
                            Qty: {p.system_quantity} | Loc: {p.bin_locations || 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>System Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    value={addItemForm.system_quantity}
                    readOnly
                    className="bg-light"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bin Location</Form.Label>
                  <Form.Control
                    type="text"
                    value={addItemForm.bin_location}
                    onChange={(e) => setAddItemForm({ ...addItemForm, bin_location: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Counted Quantity <small className="text-muted">(Optional - can count later)</small></Form.Label>
              <Form.Control
                type="number"
                value={addItemForm.counted_quantity}
                onChange={(e) => setAddItemForm({ ...addItemForm, counted_quantity: e.target.value })}
                placeholder="Enter quantity if counted, or leave blank"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={addItemForm.notes}
                onChange={(e) => setAddItemForm({ ...addItemForm, notes: e.target.value })}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" onClick={() => setShowAddItemModal(false)}>Cancel</Button>
              <Button type="submit" variant="success" disabled={!addItemForm.product_id}>
                <i className="fas fa-plus me-2"></i>Add Item
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Due Items Modal */}
      <Modal show={showDueItemsModal} onHide={() => setShowDueItemsModal(false)} size="lg">
        <Modal.Header closeButton className="bg-warning bg-opacity-25">
          <Modal.Title><i className="fas fa-exclamation-circle me-2 text-warning"></i>Items Due for Counting</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {dueItems.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
              <p>All items are up to date! No items currently due for counting.</p>
            </div>
          ) : (
            <>
              <Alert variant="info" className="mb-3">
                <i className="fas fa-info-circle me-2"></i>
                These items have exceeded their count frequency and should be counted soon.
              </Alert>
              <Table striped hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Qty</th>
                    <th>Days Overdue</th>
                    <th>Last Counted</th>
                  </tr>
                </thead>
                <tbody>
                  {dueItems.slice(0, 25).map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div><strong>{item.device_name}</strong></div>
                        <small className="text-muted">{item.device_maker}</small>
                      </td>
                      <td><small>{item.warehouse_name}</small></td>
                      <td>{item.quantity}</td>
                      <td>
                        {item.last_counted_at ? (
                          <Badge bg={item.days_since_count > 180 ? 'danger' : item.days_since_count > 90 ? 'warning' : 'info'}>
                            {item.days_since_count - item.count_frequency_days}+ days
                          </Badge>
                        ) : (
                          <Badge bg="danger">Never</Badge>
                        )}
                      </td>
                      <td><small>{item.last_counted_at ? formatDate(item.last_counted_at) : '-'}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {dueItems.length > 25 && (
                <p className="text-muted text-center">...and {dueItems.length - 25} more items</p>
              )}
              <div className="text-center mt-3">
                <Button variant="info" onClick={() => { setShowDueItemsModal(false); setShowCreateModal(true); }}>
                  <i className="fas fa-plus me-2"></i>Create Cycle Count for Due Items
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default Stocktake;
