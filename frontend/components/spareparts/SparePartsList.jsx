import React, { useState } from 'react';
import { Table, Button, Spinner, Badge, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { sparePartsAPI } from '../../api/api';

const SparePartsList = ({ parts = [], loading = false, onEdit, onRefresh, canWrite = false, canDelete = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [deleting, setDeleting] = useState(null);

  // Ensure parts is always an array with additional safety checks
  const partsArray = React.useMemo(() => {
    if (!parts) {
      console.warn('SparePartsList received null/undefined parts');
      return [];
    }
    if (!Array.isArray(parts)) {
      console.warn('SparePartsList received non-array parts:', parts);
      return [];
    }
    return parts;
  }, [parts]);

  const handleDelete = async (part) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY DELETE spare part "${part.part_name}"?\n\nThis cannot be undone. Use Deactivate instead for soft-delete.\n\nThis will fail if the part is used in active repair jobs or stocktake.`)) {
      try {
        setDeleting(part.spare_part_uuid || part.uuid);
        await sparePartsAPI.delete(part.spare_part_uuid || part.uuid);
        alert('Spare part permanently deleted');
        onRefresh();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete spare part');
      } finally {
        setDeleting(null);
      }
    }
  };

  const handleDeactivate = async (part) => {
    const action = part.is_active ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} spare part "${part.part_name}"?`)) {
      try {
        setDeleting(part.spare_part_uuid || part.uuid);
        await sparePartsAPI.update(part.spare_part_uuid || part.uuid, { is_active: !part.is_active });
        alert(`Spare part ${action}d successfully`);
        onRefresh();
      } catch (err) {
        alert(err.response?.data?.error || `Failed to ${action} spare part`);
      } finally {
        setDeleting(null);
      }
    }
  };

  const getStockStatus = (part) => {
    const qty = part.available_quantity ?? part.total_quantity ?? 0;
    const min = part.minimum_stock_level || 0;
    const reorder = part.reorder_point || 0;

    if (qty === 0) return { variant: 'danger', text: 'Out of Stock', icon: 'fa-ban' };
    if (qty < min) return { variant: 'danger', text: 'Critical', icon: 'fa-exclamation-circle' };
    if (qty <= reorder) return { variant: 'warning', text: 'Low Stock', icon: 'fa-exclamation-triangle' };
    return { variant: 'success', text: 'In Stock', icon: 'fa-check-circle' };
  };

  // Get unique categories with safety checks
  const categories = React.useMemo(() => {
    try {
      return [...new Set(partsArray.map(p => p?.part_category).filter(Boolean))];
    } catch (error) {
      console.error('Error calculating categories:', error);
      return [];
    }
  }, [partsArray]);

  // Filter parts with error handling
  const filteredParts = React.useMemo(() => {
    try {
      return partsArray.filter(part => {
        if (!part || typeof part !== 'object') {
          console.warn('Invalid part object:', part);
          return false;
        }

        const matchesSearch = !searchTerm ||
          part.part_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.part_code?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = !categoryFilter || part.part_category === categoryFilter;

        const status = getStockStatus(part);
        const matchesStock = !stockFilter ||
          (stockFilter === 'critical' && status.text === 'Critical') ||
          (stockFilter === 'low' && (status.text === 'Low Stock' || status.text === 'Critical')) ||
          (stockFilter === 'out' && status.text === 'Out of Stock');

        return matchesSearch && matchesCategory && matchesStock;
      });
    } catch (error) {
      console.error('Error filtering parts:', error);
      return [];
    }
  }, [partsArray, searchTerm, categoryFilter, stockFilter]);

  return (
    <div>
      {/* Filters */}
      <Row className="mb-3">
        <Col md={4}>
          <InputGroup size="sm">
            <InputGroup.Text>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select size="sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select size="sm" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="">All Stock Levels</option>
            <option value="out">Out of Stock</option>
            <option value="critical">Critical</option>
            <option value="low">Low Stock</option>
          </Form.Select>
        </Col>
        <Col md={2} className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={onRefresh}>
            <i className="fas fa-sync-alt"></i>
          </Button>
          <Link to="/spare-parts/low-stock" className="btn btn-outline-warning btn-sm">
            <i className="fas fa-exclamation-triangle"></i>
          </Link>
        </Col>
      </Row>

      {/* Results count */}
      <div className="mb-2 text-muted small">
        Showing {filteredParts.length} of {partsArray.length} parts
      </div>

      {loading ? (
        <div className="text-center py-4"><Spinner animation="border" /></div>
      ) : (
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Compatible Device</th>
              <th>Unit Cost</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th>New</th>
              <th>Used</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredParts.map((p) => {
              const partId = p.spare_part_uuid || p.uuid;
              if (!p || !partId) {
                console.warn('Invalid spare part in map:', p);
                return null;
              }

              try {
                const status = getStockStatus(p);
                const qty = p.available_quantity ?? p.total_quantity ?? 0;
                const hasDeviceLink = p.compatible_product_id || p.compatible_device_category;

                return (
                  <tr key={partId}>
                    <td><code>{p.part_code || 'N/A'}</code></td>
                    <td>
                      {p.part_name || 'Unnamed Part'}
                      {!p.is_active && (
                        <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.7rem' }}>
                          Inactive
                        </Badge>
                      )}
                      {p.quality_grade && (
                        <Badge bg="info" className="ms-2" style={{ fontSize: '0.7rem' }}>
                          {p.quality_grade}
                        </Badge>
                      )}
                    </td>
                    <td><Badge bg="secondary">{p.part_category || 'Uncategorized'}</Badge></td>
                    <td>
                      {hasDeviceLink ? (
                        <div className="d-flex flex-column gap-1">
                          {p.device_name && (
                            <small className="text-primary">
                              <i className="fas fa-mobile-alt me-1"></i>
                              {p.device_maker} {p.device_name}
                            </small>
                          )}
                          {(p.device_rom || p.device_ram || p.device_color) && (
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {[p.device_rom, p.device_ram, p.device_color].filter(Boolean).join(' • ')}
                            </small>
                          )}
                          {p.compatible_device_category && (
                            <small className="text-muted">
                              <i className="fas fa-tag me-1"></i>
                              {p.compatible_device_category}
                            </small>
                          )}
                        </div>
                      ) : (
                        <small className="text-muted">Universal</small>
                      )}
                    </td>
                    <td>${parseFloat(p.unit_cost || 0).toFixed(2)}</td>
                    <td>${parseFloat(p.unit_price || 0).toFixed(2)}</td>
                    <td className="text-center">
                      <strong className={qty === 0 ? 'text-danger' : ''}>{qty}</strong>
                    </td>
                    <td className="text-center">{p.new_quantity || 0}</td>
                    <td className="text-center">{p.used_quantity || 0}</td>
                    <td>
                      <Badge bg={status.variant} className={status.variant === 'warning' ? 'text-dark' : ''}>
                        <i className={`fas ${status.icon} me-1`}></i>
                        {status.text}
                      </Badge>
                    </td>
                    <td>
                      {canWrite && (
                        <>
                          <Button size="sm" variant="outline-primary" onClick={() => onEdit(p)} className="me-1" title="Edit">
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant={p.is_active ? 'outline-warning' : 'outline-success'}
                            onClick={() => handleDeactivate(p)}
                            disabled={deleting === partId}
                            className="me-1"
                            title={p.is_active ? 'Deactivate (soft-delete)' : 'Activate'}
                          >
                            {deleting === partId ? (
                              <span className="spinner-border spinner-border-sm"></span>
                            ) : (
                              <i className={`fas ${p.is_active ? 'fa-ban' : 'fa-check'}`}></i>
                            )}
                          </Button>
                        </>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDelete(p)}
                          disabled={deleting === partId}
                          title="Permanently delete"
                        >
                          {deleting === partId ? (
                            <span className="spinner-border spinner-border-sm"></span>
                          ) : (
                            <i className="fas fa-trash"></i>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              } catch (error) {
                console.error('Error rendering part row:', p, error);
                return null;
              }
            }).filter(Boolean)}
            {filteredParts.length === 0 && (
              <tr><td colSpan={11} className="text-center text-muted">No spare parts found</td></tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default SparePartsList;
