import React from 'react';
import { Card, Badge, ProgressBar, Button } from 'react-bootstrap';
import { FaBox, FaWarehouse } from 'react-icons/fa';

const BinCard = ({ bin, onClick, onEdit, onDelete }) => {
  const utilizationPercent = bin.capacity > 0
    ? Math.round((bin.current_quantity / bin.capacity) * 100)
    : 0;

  const getUtilizationColor = (percent) => {
    if (percent >= 90) return 'danger';
    if (percent >= 70) return 'warning';
    return 'success';
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      inactive: 'secondary',
      full: 'danger',
      maintenance: 'warning'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getProductTypeBadge = (productType) => {
    if (!productType) return null;
    const config = {
      smartphone: { bg: 'primary', icon: 'fa-mobile-alt', label: 'Smartphones' },
      spare_part: { bg: 'info', icon: 'fa-tools', label: 'Spare Parts' }
    };
    const { bg, icon, label } = config[productType] || {};
    return (
      <Badge bg={bg} className="ms-2">
        <i className={`fas ${icon} me-1`}></i>
        {label}
      </Badge>
    );
  };

  return (
    <Card
      className="h-100 bin-card"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h5 className="mb-1">
              <FaBox className="me-2" />
              {bin.bin_code}
              {getProductTypeBadge(bin.product_type)}
            </h5>
            <small className="text-muted">
              {/* Column-Row-Bin Position Display */}
              {bin.hierarchical_code ? (
                <div className="mb-1">
                  <Badge bg="info" className="me-1">{bin.hierarchical_code}</Badge>
                  <span className="text-muted">
                    {bin.column_position && `Column ${bin.column_position}`}
                    {bin.row_position && ` | Row ${bin.row_position}`}
                    {bin.bin_position && ` | Bin ${bin.bin_position}`}
                  </span>
                </div>
              ) : (
                <span className="text-muted">No location details</span>
              )}
            </small>
          </div>
          {getStatusBadge(bin.status)}
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between mb-1">
            <small>Utilization</small>
            <small><strong>{bin.current_quantity || 0} / {bin.capacity || 0}</strong></small>
          </div>
          <ProgressBar
            now={utilizationPercent}
            variant={getUtilizationColor(utilizationPercent)}
            style={{ height: '8px' }}
          />
        </div>

        {bin.product_count > 0 && (
          <div className="text-muted small mb-2">
            <FaWarehouse className="me-1" />
            {bin.product_count} product{bin.product_count !== 1 ? 's' : ''} stored
          </div>
        )}

        {bin.items && bin.items.length > 0 && (
          <div className="small">
            <div className="fw-bold mb-1">Items in Bin:</div>
            {bin.items.map((item, idx) => (
              <div key={idx} className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-truncate" style={{ maxWidth: '55%' }}>
                  {item.item_type === 'serialized' && (
                    <i className="fas fa-mobile-alt me-1 text-primary" title="Serialized Device"></i>
                  )}
                  {item.product_name || item.spare_part_name || 'Unknown'}
                  {item.imei_1 && (
                    <small className="d-block text-muted" style={{ fontSize: '0.7em' }}>
                      IMEI: {item.imei_1}
                    </small>
                  )}
                </span>
                <div>
                  <Badge
                    bg={item.item_condition === 'new' || item.item_condition === 'NEW' ? 'success' : item.item_condition === 'refurbished' || item.item_condition === 'REFURBISHED' ? 'warning' : 'secondary'}
                    className="me-1"
                  >
                    {item.item_condition || 'N/A'}
                  </Badge>
                  <span className="text-muted">×{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {bin.notes && (
          <div className="mt-2">
            <small className="text-muted">{bin.notes}</small>
          </div>
        )}

        {/* Action buttons: Edit / Delete */}
        <div className="d-flex justify-content-end mt-3">
          <div className="btn-group" role="group">
            <Button
              size="sm"
              variant="outline-primary"
              onClick={(e) => { e.stopPropagation(); onEdit && onEdit(bin); }}
              title="Edit bin"
            >
              <i className="fas fa-edit"></i>
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              onClick={(e) => { e.stopPropagation(); onDelete && onDelete(bin); }}
              title="Delete bin"
            >
              <i className="fas fa-trash"></i>
            </Button>
          </div>
        </div>

      </Card.Body>
    </Card>
  );
};

export default BinCard;
