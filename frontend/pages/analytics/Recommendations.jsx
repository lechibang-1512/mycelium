import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Spinner, Tab, Tabs, Table, ButtonGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import axios from 'axios';
import { formatDate } from '../../../shared/utils/formatters';
import {
  exportRecommendationsToCSV,
  sortRecommendations,
  filterBySearch,
  formatCurrency
} from '../../../shared/utils/recommendations';

function Recommendations() {
  // State management
  const [recommendations, setRecommendations] = useState([]);
  const [sparePartsRecs, setSparePartsRecs] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stats, setStats] = useState({});
  const [sparePartsStats, setSparePartsStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('reorder');
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  const [filters, setFilters] = useState({
    warehouse_id: '',
    urgency_level: '',
    status: '',
    search: '',
    sortBy: 'urgency',
    sortOrder: 'desc',
    showCriticalOnly: false
  });

  // Auto-refresh effect
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAllData();
      }, 5 * 60 * 1000); // 5 minutes
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    fetchAllData();
    fetchWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.warehouse_id, filters.urgency_level, filters.status]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
      if (filters.urgency_level) params.append('urgency_level', filters.urgency_level);
      if (filters.status) params.append('status', filters.status);

      const [reorderRes, summaryRes, sparePartsRecsRes, sparePartsSummaryRes] = await Promise.all([
        axios.get(`/api/recommendations/reorder?${params.toString()}`),
        axios.get(`/api/recommendations/summary?${params.toString()}`),
        axios.get(`/api/spare-parts/recommendations?${params.toString()}`),
        axios.get(`/api/spare-parts/recommendations/summary?${params.toString()}`)
      ]);

      setRecommendations(reorderRes.data.data || []);
      setStats(summaryRes.data.data || {});
      setSparePartsRecs(sparePartsRecsRes.data.data || []);
      setSparePartsStats(sparePartsSummaryRes.data.data || {});
      setError('');
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/warehouses');
      setWarehouses(response.data.warehouses || response.data.data || []);
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!window.confirm('Generate recommendations for all products and spare parts?')) {
      return;
    }
    try {
      setGenerating(true);
      const [productRes, sparePartsRes] = await Promise.all([
        axios.post('/api/recommendations/generate', {
          warehouse_id: filters.warehouse_id || undefined,
          recalculate_usage: true
        }),
        axios.post('/api/spare-parts/recommendations/generate', {
          warehouse_id: filters.warehouse_id || undefined,
          recalculate_usage: true
        })
      ]);
      const productCount = productRes.data.count || 0;
      const sparePartsCount = sparePartsRes.data.count || 0;
      showSuccess(`Generated ${productCount} product + ${sparePartsCount} spare parts recommendations`);
      fetchAllData();
    } catch (err) {
      console.error('Error generating recommendations:', err);
      setError(err.response?.data?.error || 'Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateProductStatus = async (recommendationId, status) => {
    try {
      await axios.put(`/api/recommendations/${recommendationId}/status`, { status });
      showSuccess(`Recommendation marked as ${status}`);
      fetchAllData();
    } catch (err) {
      console.error('Error updating recommendation:', err);
      setError(err.response?.data?.error || 'Failed to update recommendation');
    }
  };

  const handleUpdateSparePartStatus = async (recommendationId, status) => {
    try {
      await axios.put(`/api/spare-parts/recommendations/${recommendationId}/status`, { status });
      showSuccess(`Spare part recommendation marked as ${status}`);
      fetchAllData();
    } catch (err) {
      console.error('Error updating spare part recommendation:', err);
      setError(err.response?.data?.error || 'Failed to update recommendation');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.size === 0) {
      alert('Please select at least one recommendation');
      return;
    }

    if (!window.confirm(`${action} ${selectedItems.size} selected recommendations?`)) {
      return;
    }

    try {
      const promises = Array.from(selectedItems).map(id => {
        const isProduct = activeTab === 'reorder';
        return isProduct
          ? axios.put(`/api/recommendations/${id}/status`, { status: action })
          : axios.put(`/api/spare-parts/recommendations/${id}/status`, { status: action });
      });

      await Promise.all(promises);
      showSuccess(`Bulk ${action} completed for ${selectedItems.size} items`);
      setSelectedItems(new Set());
      fetchAllData();
    } catch (err) {
      console.error('Error in bulk action:', err);
      setError('Failed to complete bulk action');
    }
  };

  const handleExportCSV = () => {
    const currentRecs = activeTab === 'reorder' ? filteredRecommendations : filteredSparePartsRecs;
    const selectedRecs = Array.from(selectedItems).map(id =>
      currentRecs.find(rec => rec.recommendation_id === id)
    ).filter(Boolean);

    const recsToExport = selectedRecs.length > 0 ? selectedRecs : currentRecs;
    exportRecommendationsToCSV(recsToExport, activeTab === 'reorder' ? 'products' : 'spare-parts');
  };

  const toggleSelectAll = () => {
    const currentRecs = activeTab === 'reorder' ? filteredRecommendations : filteredSparePartsRecs;
    if (selectedItems.size === currentRecs.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentRecs.map(rec => rec.recommendation_id)));
    }
  };

  const toggleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 5000);
  };

  // Filtered and sorted recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = [...recommendations];

    // Apply search filter
    filtered = filterBySearch(filtered, filters.search);

    // Apply critical only filter
    if (filters.showCriticalOnly) {
      filtered = filtered.filter(rec => rec.urgency_level === 'CRITICAL');
    }

    // Apply sorting
    filtered = sortRecommendations(filtered, filters.sortBy, filters.sortOrder);

    return filtered;
  }, [recommendations, filters.search, filters.showCriticalOnly, filters.sortBy, filters.sortOrder]);

  const filteredSparePartsRecs = useMemo(() => {
    let filtered = [...sparePartsRecs];
    filtered = filterBySearch(filtered, filters.search);
    if (filters.showCriticalOnly) {
      filtered = filtered.filter(rec => rec.urgency_level === 'CRITICAL');
    }
    filtered = sortRecommendations(filtered, filters.sortBy, filters.sortOrder);
    return filtered;
  }, [sparePartsRecs, filters.search, filters.showCriticalOnly, filters.sortBy, filters.sortOrder]);

  const getUrgencyClass = (urgency) => {
    const classes = {
      'CRITICAL': 'critical',
      'HIGH': 'high',
      'MEDIUM': 'medium',
      'LOW': 'low'
    };
    return classes[urgency] || 'low';
  };

  const getUrgencyBadge = (urgency) => {
    const badges = {
      'CRITICAL': { bg: 'danger', text: '🚨 CRITICAL' },
      'HIGH': { bg: 'warning', text: '⚠️ HIGH' },
      'MEDIUM': { bg: 'info', text: 'MEDIUM' },
      'LOW': { bg: 'secondary', text: 'LOW' }
    };
    const badge = badges[urgency] || badges.LOW;
    return <Badge bg={badge.bg}>{badge.text}</Badge>;
  };

  // Empty state component
  const EmptyState = ({ icon, title, text }) => (
    <div className="rec-empty">
      <div className="rec-empty-icon">{icon}</div>
      <h5 className="rec-empty-title">{title}</h5>
      <p className="rec-empty-text">{text}</p>
    </div>
  );

  // Product Recommendation Card Component
  const ReorderCard = ({ rec, selectable }) => (
    <Card className={`rec-card rec-card-${getUrgencyClass(rec.urgency_level)}`}>
      <Card.Body>
        {selectable && (
          <Form.Check
            type="checkbox"
            className="position-absolute top-0 end-0 m-2"
            checked={selectedItems.has(rec.recommendation_id)}
            onChange={() => toggleSelectItem(rec.recommendation_id)}
          />
        )}
        <div className="rec-card-header">
          <div>
            <h6 className="rec-card-title">{rec.device_maker} {rec.device_name}</h6>
            <div className="rec-card-subtitle">
              {rec.warehouse_name}
            </div>
          </div>
          <div className="d-flex gap-1">
            {getUrgencyBadge(rec.urgency_level)}
          </div>
        </div>
        <div className="rec-card-stats">
          <div className="rec-card-stat">
            <span className="rec-card-stat-label">Current Stock</span>
            <span className={`rec-card-stat-value ${parseFloat(rec.current_stock) <= 0 ? 'danger' : ''}`}>
              {rec.current_stock}
            </span>
          </div>
          <div className="rec-card-stat">
            <span className="rec-card-stat-label">Reorder Point</span>
            <span className="rec-card-stat-value">{rec.reorder_point}</span>
          </div>
          <div className="rec-card-stat">
            <span className="rec-card-stat-label">Order Qty</span>
            <span className="rec-card-stat-value primary">{rec.recommended_quantity}</span>
          </div>
          {rec.estimated_stockout_date && (
            <div className="rec-card-stat">
              <span className="rec-card-stat-label">Est. Stockout</span>
              <span className="rec-card-stat-value danger">{formatDate(rec.estimated_stockout_date)}</span>
            </div>
          )}
        </div>
        {rec.recommendation_reason && (
          <small className="text-muted d-block mb-2">{rec.recommendation_reason}</small>
        )}
        <div className="rec-card-actions">
          <Button size="sm" variant="outline-success" onClick={() => handleUpdateProductStatus(rec.recommendation_id, 'ACKNOWLEDGED')}>
            ✓ Acknowledge
          </Button>
          <Button size="sm" variant="outline-primary" onClick={() => handleUpdateProductStatus(rec.recommendation_id, 'ORDERED')}>
            📦 Ordered
          </Button>
          <Button size="sm" variant="outline-secondary" onClick={() => handleUpdateProductStatus(rec.recommendation_id, 'DISMISSED')}>
            ✕ Dismiss
          </Button>
        </div>
      </Card.Body>
    </Card>
  );

  // Spare Parts Card Component
  const SparePartCard = ({ rec, selectable }) => (
    <Card className={`rec-card rec-card-${getUrgencyClass(rec.urgency_level)}`}>
      <Card.Body>
        {selectable && (
          <Form.Check
            type="checkbox"
            className="position-absolute top-0 end-0 m-2"
            checked={selectedItems.has(rec.recommendation_id)}
            onChange={() => toggleSelectItem(rec.recommendation_id)}
          />
        )}
        <div className="rec-card-header">
          <div>
            <h6 className="rec-card-title">{rec.part_name}</h6>
            <div className="rec-card-subtitle">
              <code>{rec.part_code}</code> • {rec.warehouse_name || 'N/A'}
            </div>
          </div>
          <div className="d-flex gap-1 align-items-start">
            <Badge bg="secondary">{rec.part_category}</Badge>
            {getUrgencyBadge(rec.urgency_level)}
          </div>
        </div>
        <div className="rec-card-stats">
          <div className="rec-card-stat">
            <span className="rec-card-stat-label">Stock</span>
            <span className={`rec-card-stat-value ${parseFloat(rec.current_stock) <= 0 ? 'danger' : ''}`}>
              {rec.current_stock}
            </span>
          </div>
          <div className="rec-card-stat">
            <span className="rec-card-stat-label">Reorder Pt</span>
            <span className="rec-card-stat-value">{rec.reorder_point}</span>
          </div>
          <div className="rec-card-stat">
            <span className="rec-card-stat-label">Order Qty</span>
            <span className="rec-card-stat-value primary">{rec.recommended_quantity}</span>
          </div>
          {rec.estimated_stockout_date && (
            <div className="rec-card-stat">
              <span className="rec-card-stat-label">Stockout</span>
              <span className="rec-card-stat-value danger">{formatDate(rec.estimated_stockout_date)}</span>
            </div>
          )}
        </div>
        {rec.supplier_name && (
          <small className="text-muted d-block mb-2">
            <i className="fas fa-truck me-1"></i>{rec.supplier_name}
          </small>
        )}
        <div className="rec-card-actions">
          <Button size="sm" variant="outline-success" onClick={() => handleUpdateSparePartStatus(rec.recommendation_id, 'ACKNOWLEDGED')}>
            ✓ Acknowledge
          </Button>
          <Button size="sm" variant="outline-primary" onClick={() => handleUpdateSparePartStatus(rec.recommendation_id, 'ORDERED')}>
            📦 Ordered
          </Button>
          <Button size="sm" variant="outline-secondary" onClick={() => handleUpdateSparePartStatus(rec.recommendation_id, 'CANCELLED')}>
            ✕ Cancel
          </Button>
        </div>
      </Card.Body>
    </Card>
  );

  // Table View Component
  const RecommendationsTable = ({ data, type }) => (
    <div className="table-responsive">
      <Table hover className="modern-table">
        <thead>
          <tr>
            <th>
              <Form.Check
                type="checkbox"
                checked={selectedItems.size === data.length && data.length > 0}
                onChange={toggleSelectAll}
              />
            </th>
            <th>{type === 'products' ? 'Product' : 'Part'}</th>
            <th>Warehouse</th>
            <th>Current Stock</th>
            <th>Reorder Point</th>
            <th>Recommended Qty</th>
            <th>Urgency</th>
            <th>Stockout Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(rec => (
            <tr key={rec.recommendation_id}>
              <td>
                <Form.Check
                  type="checkbox"
                  checked={selectedItems.has(rec.recommendation_id)}
                  onChange={() => toggleSelectItem(rec.recommendation_id)}
                />
              </td>
              <td>
                <strong>{type === 'products' ? `${rec.device_maker} ${rec.device_name}` : rec.part_name}</strong>
                {type === 'spare-parts' && <div><code className="small">{rec.part_code}</code></div>}
              </td>
              <td>{rec.warehouse_name}</td>
              <td className={parseFloat(rec.current_stock) <= 0 ? 'text-danger fw-bold' : ''}>{rec.current_stock}</td>
              <td>{rec.reorder_point}</td>
              <td className="text-primary fw-bold">{rec.recommended_quantity}</td>
              <td>{getUrgencyBadge(rec.urgency_level)}</td>
              <td>{rec.estimated_stockout_date ? formatDate(rec.estimated_stockout_date) : 'N/A'}</td>
              <td>
                <ButtonGroup size="sm">
                  <Button variant="outline-success" onClick={() => type === 'products' ? handleUpdateProductStatus(rec.recommendation_id, 'ACKNOWLEDGED') : handleUpdateSparePartStatus(rec.recommendation_id, 'ACKNOWLEDGED')}>
                    ✓
                  </Button>
                  <Button variant="outline-primary" onClick={() => type === 'products' ? handleUpdateProductStatus(rec.recommendation_id, 'ORDERED') : handleUpdateSparePartStatus(rec.recommendation_id, 'ORDERED')}>
                    📦
                  </Button>
                  <Button variant="outline-secondary" onClick={() => type === 'products' ? handleUpdateProductStatus(rec.recommendation_id, 'DISMISSED') : handleUpdateSparePartStatus(rec.recommendation_id, 'CANCELLED')}>
                    ✕
                  </Button>
                </ButtonGroup>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );

  // Combined stats
  const totalCritical = (stats.criticalCount || 0) + (sparePartsStats.criticalCount || 0);
  const totalHigh = (stats.highPriorityCount || 0) + (sparePartsStats.highCount || 0);
  const totalPending = (stats.reorderCount || 0) + (sparePartsStats.pendingCount || 0);

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-1">
            <i className="fas fa-lightbulb me-2 text-warning"></i>
            Recommendations
          </h2>
          <p className="text-muted mb-0">Reorder recommendations for products and spare parts</p>
        </Col>
        <Col md="auto" className="d-flex gap-2">
          <Form.Check
            type="switch"
            id="auto-refresh-switch"
            label="Auto-refresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <Button variant="success" onClick={handleGenerateRecommendations} disabled={generating}>
            {generating ? (
              <><Spinner animation="border" size="sm" className="me-2" />Generating...</>
            ) : (
              <><i className="fas fa-sync-alt me-2"></i>Generate Recommendations</>
            )}
          </Button>
        </Col>
      </Row>

      {/* Alerts */}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Combined Stats Row */}
      <div className="rec-stats-row">
        <div className="rec-stat-card critical">
          <div className="rec-stat-value text-danger">{totalCritical}</div>
          <div className="rec-stat-label">Critical</div>
        </div>
        <div className="rec-stat-card high">
          <div className="rec-stat-value text-warning">{totalHigh}</div>
          <div className="rec-stat-label">High Priority</div>
        </div>
        <div className="rec-stat-card primary">
          <div className="rec-stat-value text-primary">{totalPending}</div>
          <div className="rec-stat-label">Total Pending</div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="py-3">
          <Row className="align-items-end g-3">
            <Col md={3}>
              <Form.Label className="small text-muted mb-1">Search</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </Col>
            <Col md={2}>
              <Form.Label className="small text-muted mb-1">Warehouse</Form.Label>
              <Form.Select
                value={filters.warehouse_id}
                onChange={(e) => setFilters({ ...filters, warehouse_id: e.target.value })}
              >
                <option value="">All Warehouses</option>
                {Array.isArray(warehouses) && warehouses.map(w => (
                  <option key={w.id || w.warehouse_id} value={w.id || w.warehouse_id}>
                    {w.warehouse_name || w.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="small text-muted mb-1">Urgency Level</Form.Label>
              <Form.Select
                value={filters.urgency_level}
                onChange={(e) => setFilters({ ...filters, urgency_level: e.target.value })}
              >
                <option value="">All Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="small text-muted mb-1">Sort By</Form.Label>
              <Form.Select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              >
                <option value="urgency">Urgency</option>
                <option value="stockout_date">Stockout Date</option>
                <option value="quantity">Quantity</option>
                <option value="current_stock">Current Stock</option>
                <option value="name">Name</option>
              </Form.Select>
            </Col>
            <Col md="auto">
              <Form.Check
                type="switch"
                id="critical-only-switch"
                label="Critical Only"
                checked={filters.showCriticalOnly}
                onChange={(e) => setFilters({ ...filters, showCriticalOnly: e.target.checked })}
              />
            </Col>
            <Col md="auto">
              <ButtonGroup>
                <Button
                  variant={viewMode === 'card' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('card')}
                >
                  <i className="fas fa-th"></i>
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('table')}
                >
                  <i className="fas fa-list"></i>
                </Button>
              </ButtonGroup>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Bulk Action Toolbar */}
      {selectedItems.size > 0 && (
        <Card className="mb-3 border-primary">
          <Card.Body className="py-2">
            <Row className="align-items-center">
              <Col>
                <strong>{selectedItems.size}</strong> items selected
              </Col>
              <Col md="auto">
                <ButtonGroup size="sm">
                  <Button variant="success" onClick={() => handleBulkAction('ACKNOWLEDGED')}>
                    <i className="fas fa-check me-1"></i>Acknowledge All
                  </Button>
                  <Button variant="primary" onClick={() => handleBulkAction('ORDERED')}>
                    <i className="fas fa-box me-1"></i>Mark as Ordered
                  </Button>
                  <Button variant="secondary" onClick={() => handleBulkAction('DISMISSED')}>
                    <i className="fas fa-times me-1"></i>Dismiss All
                  </Button>
                  <Button variant="info" onClick={handleExportCSV}>
                    <i className="fas fa-download me-1"></i>Export CSV
                  </Button>
                  <Button variant="outline-secondary" onClick={() => setSelectedItems(new Set())}>
                    Clear Selection
                  </Button>
                </ButtonGroup>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Tabs with Card/Table Content */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading recommendations...</p>
        </div>
      ) : (
        <Tabs activeKey={activeTab} onSelect={(k) => { setActiveTab(k); setSelectedItems(new Set()); }} className="mb-3">
          {/* Products Tab */}
          <Tab eventKey="reorder" title={<>📦 Products <Badge bg="primary">{filteredRecommendations.length}</Badge></>}>
            {filteredRecommendations.length === 0 ? (
              <EmptyState
                icon="✅"
                title="No Pending Product Recommendations"
                text="All product stock levels are healthy!"
              />
            ) : viewMode === 'card' ? (
              <div className="rec-grid">
                {filteredRecommendations.map(rec => (
                  <ReorderCard key={rec.recommendation_id} rec={rec} selectable={true} />
                ))}
              </div>
            ) : (
              <RecommendationsTable data={filteredRecommendations} type="products" />
            )}
          </Tab>

          {/* Spare Parts Tab */}
          <Tab eventKey="spare-parts" title={<>🔧 Spare Parts <Badge bg="info">{filteredSparePartsRecs.length}</Badge></>}>
            {filteredSparePartsRecs.length === 0 ? (
              <EmptyState
                icon="✅"
                title="No Pending Spare Parts Recommendations"
                text="All spare parts stock levels are healthy!"
              />
            ) : viewMode === 'card' ? (
              <div className="rec-grid">
                {filteredSparePartsRecs.map(rec => (
                  <SparePartCard key={rec.recommendation_id} rec={rec} selectable={true} />
                ))}
              </div>
            ) : (
              <RecommendationsTable data={filteredSparePartsRecs} type="spare-parts" />
            )}
          </Tab>
        </Tabs>
      )}

      {/* Help Section */}
      <Card className="mt-4 bg-light border-0">
        <Card.Body>
          <h6><i className="fas fa-info-circle me-2"></i>How Recommendations Work</h6>
          <Row className="mt-3">
            <Col md={6}>
              <strong>Recommendation Types</strong>
              <ul className="small text-muted mb-0 mt-1">
                <li><Badge bg="danger" className="me-1">Consider restocking</Badge> Out-of-stock devices and parts</li>
                <li><Badge bg="warning" className="me-1">Consider ordering more</Badge> Low and medium stock levels</li>
              </ul>
            </Col>
            <Col md={6}>
              <strong>Urgency Levels</strong>
              <ul className="small text-muted mb-0 mt-1">
                <li><Badge bg="danger" className="me-1">CRITICAL</Badge> Out of stock or ≤3 days</li>
                <li><Badge bg="warning" className="me-1">HIGH</Badge> ≤7 days to stockout</li>
                <li><Badge bg="info" className="me-1">MEDIUM</Badge> Below reorder point</li>
                <li><Badge bg="secondary" className="me-1">LOW</Badge> Approaching reorder point</li>
              </ul>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Recommendations;
