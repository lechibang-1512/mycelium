import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Table, Spinner, Badge, Modal, Form, Card, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { repairJobsAPI, rmaAPI } from '../../services/api/service-operations';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';
import RepairJobForm from '../../components/spareparts/RepairJobForm';
import RepairJobDetail from '../../components/spareparts/RepairJobDetail';

const RepairJobs = () => {
  const { hasPermission } = useAuth();

  // Permission checks
  const canWrite = hasPermission(PERMISSIONS.REPAIRS_WRITE) || hasPermission(PERMISSIONS.REPAIRS_MANAGE);
  const canDelete = hasPermission(PERMISSIONS.REPAIRS_DELETE) || hasPermission(PERMISSIONS.REPAIRS_MANAGE);
  const canManage = hasPermission(PERMISSIONS.REPAIRS_MANAGE);
  const canViewRMA = hasPermission(PERMISSIONS.RMA_READ) || hasPermission(PERMISSIONS.RMA_MANAGE);
  const canDoBulk = canWrite || canDelete || canManage;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showRMAModal, setShowRMAModal] = useState(false);
  const [selectedJobForRMA, setSelectedJobForRMA] = useState(null);
  const [linkedRMAs, setLinkedRMAs] = useState([]);  // Official links from rma_repair_job_links table
  const [relatedRMAs, setRelatedRMAs] = useState([]); // Found by device matching


  // Advanced Search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    minCost: '',
    maxCost: '',
    technician: ''
  });

  // Bulk Operations state
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadJobs = async (search = null) => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search || searchQuery.trim()) params.search = search || searchQuery.trim();

      const res = await repairJobsAPI.getAll(params);
      const jobsData = res.data.data || res.data || [];
      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setSelectedJobs([]);
      setSelectAll(false);
    } catch (e) {
      console.error('Failed to load repair jobs', e);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };



  const handleSearch = async () => {
    loadJobs(searchQuery.trim() || null);
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter]);



  const handleEdit = (job) => {
    setEditingJob(job);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    loadJobs();
  };

  const handleViewDetail = (jobId) => {
    setSelectedJobId(jobId);
    setShowDetail(true);
  };

  const handleFindRelatedRMA = async (job) => {
    setSelectedJobForRMA(job);
    setLinkedRMAs([]);
    setRelatedRMAs([]);
    setShowRMAModal(true);

    try {
      // First, get officially linked RMAs from the database
      const linkedRes = await repairJobsAPI.getLinkedRMAs(job.repair_job_id);
      const linked = linkedRes.data?.data || linkedRes.data || [];
      setLinkedRMAs(Array.isArray(linked) ? linked : []);

      // Then search for RMAs with matching device_imei, serial number, or device name
      const searchParams = {};
      if (job.device_imei) {
        searchParams.device_imei = job.device_imei;
      } else if (job.device_serial_number) {
        searchParams.serial_number = job.device_serial_number;
      } else if (job.device_name) {
        searchParams.device_name = job.device_name;
      }

      if (Object.keys(searchParams).length > 0) {
        const response = await rmaAPI.getAll(searchParams);
        const rmas = Array.isArray(response.data) ? response.data : [];
        // Filter out already linked RMAs
        const linkedRmaIds = new Set(linked.map(lr => lr.rma_id));
        setRelatedRMAs(rmas.filter(r => !linkedRmaIds.has(r.rma_id)));
      }
    } catch (error) {
      console.error('Failed to find related RMAs:', error);
    }
  };

  const handleDelete = async (job) => {
    if (window.confirm(`Are you sure you want to delete repair job ${job.job_number}? This action cannot be undone.`)) {
      try {
        await repairJobsAPI.delete(job.repair_job_id, true);
        loadJobs();
      } catch (error) {
        console.error('Failed to delete repair job:', error);
        alert('Failed to delete repair job');
      }
    }
  };

  // Bulk operations handlers
  const handleSelectJob = (jobId) => {
    setSelectedJobs(prev => {
      if (prev.includes(jobId)) {
        return prev.filter(id => id !== jobId);
      } else {
        return [...prev, jobId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(jobs.map(j => j.repair_job_id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedJobs.length === 0) return;

    setBulkLoading(true);
    try {
      let result;
      switch (bulkAction) {
        case 'status':
          result = await repairJobsAPI.bulkUpdateStatus({
            job_ids: selectedJobs,
            status: bulkValue
          });
          break;
        case 'priority':
          result = await repairJobsAPI.bulkUpdatePriority({
            job_ids: selectedJobs,
            priority: bulkValue
          });
          break;
        case 'technician':
          result = await repairJobsAPI.bulkAssign({
            job_ids: selectedJobs,
            technician: bulkValue
          });
          break;
        case 'cancel':
          result = await repairJobsAPI.bulkCancel({
            job_ids: selectedJobs,
            reason: bulkValue || 'Bulk cancellation'
          });
          break;
        default:
          break;
      }

      alert(`Bulk action completed! ${result?.data?.success?.length || selectedJobs.length} jobs updated.`);
      setShowBulkModal(false);
      setBulkAction('');
      setBulkValue('');
      loadJobs();
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('Bulk action failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setBulkLoading(false);
    }
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      dateFrom: '',
      dateTo: '',
      minCost: '',
      maxCost: '',
      technician: ''
    });
    loadJobs();
  };

  const getStatusBadge = (status) => {
    const map = {
      PENDING: 'secondary',
      PARTS_ORDERED: 'warning',
      IN_PROGRESS: 'primary',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return map[status] || 'secondary';
  };

  const getPriorityBadge = (priority) => {
    const map = {
      LOW: 'secondary',
      NORMAL: 'info',
      MEDIUM: 'info',
      HIGH: 'warning',
      URGENT: 'danger',
    };
    return map[priority] || 'secondary';
  };

  // Calculate stats
  const stats = {
    total: jobs.length,
    active: jobs.filter(j => ['IN_PROGRESS', 'PARTS_ORDERED'].includes(j.status)).length,
    completed: jobs.filter(j => j.status === 'COMPLETED').length,
    urgent: jobs.filter(j => j.priority === 'URGENT').length,
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-1 fw-bold text-dark">
            <i className="fas fa-wrench me-2 text-primary opacity-75"></i>
            Repair Jobs
          </h2>
          <p className="text-muted mb-0">
            Manage device repair orders and tracking
            <Badge bg="info" className="ms-2">
              <i className="fas fa-info-circle me-1"></i>
              Create repair jobs from RMA entries
            </Badge>
          </p>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Card className="mb-4 glass-card border-0 shadow-lg">
        <Card.Body className="p-4">
          <Row className="g-3">
            <Col md={4}>
              <InputGroup>
                <Form.Control
                  type="text"
                  className="border-0 shadow-sm"
                  placeholder="Search job #, customer, serial, IMEI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button variant="primary" onClick={handleSearch} className="shadow-sm icon-btn">
                  <i className="fas fa-search"></i>
                </Button>
                {searchQuery && (
                  <Button variant="secondary" onClick={() => { setSearchQuery(''); loadJobs(); }} className="shadow-sm">
                    <i className="fas fa-times"></i>
                  </Button>
                )}
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                className="border-0 shadow-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PARTS_ORDERED">Parts Ordered</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                className="border-0 shadow-sm"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button
                variant="light"
                className="w-100 border-2 shadow-sm icon-btn"
                onClick={() => { setSearchQuery(''); setStatusFilter(''); setPriorityFilter(''); clearAdvancedFilters(); }}
              >
                <i className="fas fa-redo me-1"></i>Reset
              </Button>
            </Col>
          </Row>

          {/* Advanced Search Toggle */}
          <Row className="mt-3">
            <Col>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              >
                <i className={`fas fa-${showAdvancedSearch ? 'chevron-up' : 'chevron-down'} me-2`}></i>
                Advanced Search
              </Button>
            </Col>
          </Row>

          {/* Advanced Search Panel */}
          {showAdvancedSearch && (
            <Row className="mt-3 g-3 p-3 bg-light rounded">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small">Date From</Form.Label>
                  <Form.Control
                    type="date"
                    size="sm"
                    value={advancedFilters.dateFrom}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small">Date To</Form.Label>
                  <Form.Control
                    type="date"
                    size="sm"
                    value={advancedFilters.dateTo}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="small">Min Cost ($)</Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    value={advancedFilters.minCost}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, minCost: e.target.value })}
                    placeholder="0"
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="small">Max Cost ($)</Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    value={advancedFilters.maxCost}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, maxCost: e.target.value })}
                    placeholder="9999"
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="small">Technician</Form.Label>
                  <Form.Control
                    type="text"
                    size="sm"
                    value={advancedFilters.technician}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, technician: e.target.value })}
                    placeholder="Name"
                  />
                </Form.Group>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>


      {/* Stats Cards */}
      <Row className="mb-4 g-3 fade-in-up">
        <Col md={3}>
          <Card className="metric-card stat-card-primary shadow-lg border-0 h-100">
            <Card.Body className="py-4 text-center text-white">
              <div className="mb-2">
                <i className="fas fa-tools fa-2x" style={{ opacity: 0.2 }}></i>
              </div>
              <h1 className="fw-bold mb-0">{stats.total}</h1>
              <p className="mb-0 small text-uppercase fw-semibold mt-2" style={{ letterSpacing: '1px' }}>Total Jobs</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="metric-card stat-card-info shadow-lg border-0 h-100">
            <Card.Body className="py-4 text-center text-white">
              <div className="mb-2">
                <i className="fas fa-spinner fa-2x" style={{ opacity: 0.2 }}></i>
              </div>
              <h1 className="fw-bold mb-0">{stats.active}</h1>
              <p className="mb-0 small text-uppercase fw-semibold mt-2" style={{ letterSpacing: '1px' }}>Active</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="metric-card stat-card-success shadow-lg border-0 h-100">
            <Card.Body className="py-4 text-center text-white">
              <div className="mb-2">
                <i className="fas fa-check-circle fa-2x" style={{ opacity: 0.2 }}></i>
              </div>
              <h1 className="fw-bold mb-0">{stats.completed}</h1>
              <p className="mb-0 small text-uppercase fw-semibold mt-2" style={{ letterSpacing: '1px' }}>Completed</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="metric-card stat-card-danger shadow-lg border-0 h-100">
            <Card.Body className="py-4 text-center text-white">
              <div className="mb-2">
                <i className="fas fa-exclamation-triangle fa-2x" style={{ opacity: 0.2 }}></i>
              </div>
              <h1 className="fw-bold mb-0">{stats.urgent}</h1>
              <p className="mb-0 small text-uppercase fw-semibold mt-2" style={{ letterSpacing: '1px' }}>Urgent</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          {loading ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : (
            <>
              {/* Bulk Operations Toolbar */}
              {canDoBulk && selectedJobs.length > 0 && (
                <div className="p-3 bg-primary bg-opacity-10 border-bottom d-flex align-items-center gap-2 flex-wrap">
                  <span className="fw-bold text-primary">
                    <i className="fas fa-check-square me-2"></i>
                    {selectedJobs.length} job(s) selected
                  </span>
                  {canWrite && (
                    <>
                      <Button size="sm" variant="outline-primary" onClick={() => { setBulkAction('status'); setShowBulkModal(true); }}>
                        <i className="fas fa-exchange-alt me-1"></i>Status
                      </Button>
                      <Button size="sm" variant="outline-warning" onClick={() => { setBulkAction('priority'); setShowBulkModal(true); }}>
                        <i className="fas fa-exclamation me-1"></i>Priority
                      </Button>
                    </>
                  )}
                  {canManage && (
                    <Button size="sm" variant="outline-info" onClick={() => { setBulkAction('technician'); setShowBulkModal(true); }}>
                      <i className="fas fa-user me-1"></i>Assign
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="sm" variant="outline-danger" onClick={() => { setBulkAction('cancel'); setShowBulkModal(true); }}>
                      <i className="fas fa-ban me-1"></i>Cancel
                    </Button>
                  )}
                  <Button size="sm" variant="link" className="text-muted" onClick={() => { setSelectedJobs([]); setSelectAll(false); }}>
                    Clear
                  </Button>
                </div>
              )}
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      {canDoBulk && <Form.Check type="checkbox" checked={selectAll} onChange={handleSelectAll} />}
                    </th>
                    <th>Job #</th>
                    <th>Device</th>
                    <th>IMEI/Serial</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Received</th>
                    <th>Est. Cost</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.repair_job_id}>
                      <td>
                        {canDoBulk && (
                          <Form.Check
                            type="checkbox"
                            checked={selectedJobs.includes(j.repair_job_id)}
                            onChange={() => handleSelectJob(j.repair_job_id)}
                          />
                        )}
                      </td>
                      <td><code>{j.job_number}</code></td>
                      <td>
                        <div className="d-flex flex-column">
                          <span>{j.device_name || 'Unknown Device'}</span>
                          {j.device_maker && (
                            <small className="text-muted">{j.device_maker}</small>
                          )}
                          {j.product_id && (
                            <small className="text-muted">
                              <i className="fas fa-link me-1"></i>Catalog device #{j.product_id}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        {j.device_imei && <div><small className="text-muted">IMEI:</small> {j.device_imei}</div>}
                        {j.device_serial_number && <div><small className="text-muted">S/N:</small> {j.device_serial_number}</div>}
                        {!j.device_imei && !j.device_serial_number && <span className="text-muted">-</span>}
                      </td>
                      <td>
                        <div>{j.customer_name}</div>
                        {j.customer_phone && <small className="text-muted">{j.customer_phone}</small>}
                        {j.customer_email && <small className="text-muted d-block">{j.customer_email}</small>}
                      </td>
                      <td>
                        <Badge bg={getStatusBadge(j.status)}>{j.status.replace('_', ' ')}</Badge>
                      </td>
                      <td>
                        <Badge bg={getPriorityBadge(j.priority)}>{j.priority}</Badge>
                      </td>
                      <td>{new Date(j.received_date).toLocaleDateString()}</td>
                      <td>
                        <strong>${parseFloat(j.estimated_cost || 0).toFixed(2)}</strong>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          {canViewRMA && (
                            <OverlayTrigger
                              overlay={<Tooltip>Find related RMAs by device matching</Tooltip>}
                            >
                              <Button
                                variant="light"
                                size="sm"
                                className="text-secondary shadow-sm border"
                                onClick={() => handleFindRelatedRMA(j)}
                              >
                                <i className="fas fa-search"></i>
                              </Button>
                            </OverlayTrigger>
                          )}
                          <Button
                            size="sm"
                            variant="light"
                            className="text-primary shadow-sm border"
                            onClick={() => handleViewDetail(j.repair_job_id)}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          {canWrite && (
                            <Button
                              size="sm"
                              variant="light"
                              className="text-dark shadow-sm border"
                              onClick={() => handleEdit(j)}
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="light"
                              className="text-danger shadow-sm border"
                              onClick={() => handleDelete(j)}
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr><td colSpan={10} className="text-center text-muted">No repair jobs found</td></tr>
                  )}
                </tbody>
              </Table>
            </>
          )}
        </Col>
      </Row>

      <RepairJobForm show={showForm} onHide={() => setShowForm(false)} onSaved={handleSaved} job={editingJob} />

      <Modal show={showDetail} onHide={() => setShowDetail(false)} size="xl" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Repair Job Details</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {selectedJobId && <RepairJobDetail repairJobId={selectedJobId} onSaved={() => { setShowDetail(false); loadJobs(); }} />}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetail(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* RMA Search Modal */}
      <Modal show={showRMAModal} onHide={() => setShowRMAModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-search me-2"></i>
            Related RMAs for {selectedJobForRMA?.job_number}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedJobForRMA && (
            <Card className="mb-3">
              <Card.Body>
                <h6>Repair Job Details:</h6>
                <Row>
                  <Col md={6}>
                    <strong>Device:</strong> {selectedJobForRMA.device_name || 'Unknown'}<br />
                    <strong>Customer:</strong> {selectedJobForRMA.customer_name}<br />
                    {selectedJobForRMA.device_imei && (
                      <><strong>IMEI:</strong> {selectedJobForRMA.device_imei}<br /></>
                    )}
                    {selectedJobForRMA.device_serial_number && (
                      <><strong>Serial:</strong> {selectedJobForRMA.device_serial_number}<br /></>
                    )}
                  </Col>
                  <Col md={6}>
                    <strong>Status:</strong> <Badge bg={getStatusBadge(selectedJobForRMA.status)}>
                      {selectedJobForRMA.status?.replace(/_/g, ' ')}
                    </Badge><br />
                    <strong>Priority:</strong> <Badge bg={getPriorityBadge(selectedJobForRMA.priority)}>
                      {selectedJobForRMA.priority}
                    </Badge><br />
                    <strong>Issue:</strong> {selectedJobForRMA.issue_description || 'N/A'}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Linked RMAs Section */}
          <Card className="mb-3">
            <Card.Header className="bg-success bg-opacity-10 py-2">
              <h6 className="mb-0 text-success">
                <i className="fas fa-check-circle me-2"></i>
                Linked RMAs ({linkedRMAs.length})
              </h6>
            </Card.Header>
            <Card.Body className="py-2">
              {linkedRMAs.length === 0 ? (
                <div className="text-center py-2 text-muted">
                  <small>No RMAs officially linked to this repair job.</small>
                </div>
              ) : (
                <Table responsive hover size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>RMA Number</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Link Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedRMAs.map((rma) => (
                      <tr key={rma.link_id}>
                        <td><code>{rma.rma_number}</code></td>
                        <td>{rma.customer_name}</td>
                        <td>
                          <Badge bg={rma.rma_status === 'completed' ? 'success' : rma.rma_status === 'pending' ? 'warning' : 'info'} className="text-uppercase">
                            {rma.rma_status?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td><Badge bg="secondary">{rma.link_reason?.replace(/_/g, ' ') || 'linked'}</Badge></td>
                        <td>
                          <Button variant="outline-primary" size="sm" onClick={() => window.open(`/rma/${rma.rma_id}`, '_blank')}>
                            <i className="fas fa-external-link-alt me-1"></i>View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {/* Related RMAs Section */}
          <Card>
            <Card.Header className="bg-info bg-opacity-10 py-2">
              <h6 className="mb-0 text-info">
                <i className="fas fa-search me-2"></i>
                Related by Device Match ({relatedRMAs.length})
              </h6>
            </Card.Header>
            <Card.Body className="py-2">
              {relatedRMAs.length === 0 ? (
                <div className="text-center py-2 text-muted">
                  <small>No additional RMAs found matching by {selectedJobForRMA?.device_imei ? 'IMEI' : selectedJobForRMA?.device_serial_number ? 'Serial Number' : 'Device Name'}.</small>
                </div>
              ) : (
                <Table responsive hover size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>RMA Number</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedRMAs.map((rma) => (
                      <tr key={rma.rma_id}>
                        <td><code>{rma.rma_number}</code></td>
                        <td>{rma.customer_name}</td>
                        <td>
                          <Badge bg={rma.status === 'completed' ? 'success' : rma.status === 'pending' ? 'warning' : 'info'} className="text-uppercase">
                            {rma.status?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td><small>{new Date(rma.created_at).toLocaleDateString()}</small></td>
                        <td>
                          <Button variant="outline-primary" size="sm" onClick={() => window.open(`/rma/${rma.rma_id}`, '_blank')}>
                            <i className="fas fa-external-link-alt me-1"></i>View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRMAModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Action Modal */}
      <Modal show={showBulkModal} onHide={() => setShowBulkModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-tasks me-2"></i>
            Bulk {bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1)} Update
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            <strong>{selectedJobs.length}</strong> job(s) will be updated.
          </p>

          {bulkAction === 'status' && (
            <Form.Group>
              <Form.Label>Select New Status</Form.Label>
              <Form.Select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
                <option value="">-- Select Status --</option>
                <option value="PENDING">Pending</option>
                <option value="DIAGNOSED">Diagnosed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PARTS_ORDERED">Parts Ordered</option>
                <option value="TESTING">Testing</option>
                <option value="COMPLETED">Completed</option>
                <option value="DELIVERED">Delivered</option>
              </Form.Select>
            </Form.Group>
          )}

          {bulkAction === 'priority' && (
            <Form.Group>
              <Form.Label>Select New Priority</Form.Label>
              <Form.Select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
                <option value="">-- Select Priority --</option>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Form.Select>
            </Form.Group>
          )}

          {bulkAction === 'technician' && (
            <Form.Group>
              <Form.Label>Assign Technician</Form.Label>
              <Form.Control
                type="text"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder="Enter technician name"
              />
            </Form.Group>
          )}

          {bulkAction === 'cancel' && (
            <Form.Group>
              <Form.Label>Cancellation Reason (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder="Enter reason for cancellation"
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkModal(false)} disabled={bulkLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleBulkAction} disabled={bulkLoading || (!bulkValue && bulkAction !== 'cancel')}>
            {bulkLoading ? (
              <><Spinner size="sm" animation="border" className="me-2" />Processing...</>
            ) : (
              <><i className="fas fa-check me-2"></i>Apply to {selectedJobs.length} Jobs</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default RepairJobs;
