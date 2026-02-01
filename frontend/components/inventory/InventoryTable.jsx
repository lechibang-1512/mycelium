import React from 'react';
import { Table, Button, Badge, Spinner } from 'react-bootstrap';

const InventoryTable = ({
  products = [],
  onEdit,
  onDelete,
  onViewDetails,
  canWrite,
  canDelete,
  deletingId
}) => {
  // Ensure products is always an array
  const productList = Array.isArray(products) ? products : [];

  const getStockBadge = (inventory) => {
    const qty = Number(inventory) || 0;
    if (qty === 0) {
      return (
        <Badge bg="danger">
          <i className="fas fa-ban me-1"></i>
          Out of Stock
        </Badge>
      );
    }
    return (
      <Badge bg="warning" text="dark">
        <i className="fas fa-exclamation-triangle me-1"></i>
        Low Stock
      </Badge>
    );
  };

  return (
    <Table striped hover responsive className="align-middle">
      <thead className="bg-light">
        <tr>
          <th>Device Details</th>
          <th>Specs</th>
          <th>Price</th>
          <th className="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        {productList.map((product) => (
          <tr key={product.product_id}>
            <td>
              <div className="d-flex align-items-center">
                <div className="me-3 d-none d-md-block">
                  <div className="rounded-circle bg-light d-flex align-items-center justify-content-center border" style={{ width: '40px', height: '40px' }}>
                    <i className="fas fa-mobile-alt text-secondary"></i>
                  </div>
                </div>
                <div>
                  <strong className="d-block">{product.device_name}</strong>
                  <small className="text-muted">{product.device_maker}</small>
                </div>
              </div>
            </td>
            <td>
              <div className="d-flex flex-column small">
                {product.color && (
                  <span className="mb-1">
                    <i className="fas fa-palette me-1 text-muted" style={{ width: '16px' }}></i>
                    {product.color}
                  </span>
                )}
                {(product.device_storage || product.ram || product.rom) && (
                  <span>
                    <i className="fas fa-memory me-1 text-muted" style={{ width: '16px' }}></i>
                    {[product.device_storage, product.ram, product.rom].filter(Boolean).join(' / ')}
                  </span>
                )}
              </div>
            </td>
            <td>
              <div className="fw-bold text-success">
                ${parseFloat(product.device_price || 0).toFixed(2)}
              </div>
            </td>
            <td className="text-end">
              <div className="btn-group" role="group">
                <Button
                  size="sm"
                  variant="outline-info"
                  onClick={() => onViewDetails(product.product_id)}
                  title="View details"
                >
                  <i className="fas fa-eye"></i>
                </Button>
                {canWrite && (
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => onEdit(product)}
                    disabled={deletingId === product.product_id}
                    title="Edit"
                  >
                    <i className="fas fa-edit"></i>
                  </Button>
                )}
                {canDelete && (
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => onDelete(product.product_id, product.device_name)}
                    disabled={deletingId === product.product_id}
                    title="Delete"
                  >
                    {deletingId === product.product_id ? (
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                    ) : (
                      <i className="fas fa-trash"></i>
                    )}
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
        {productList.length === 0 && (
          <tr>
            <td colSpan={6} className="text-center py-5">
              <div className="text-muted">
                <i className="fas fa-search fa-2x mb-3"></i>
                <h5>No products found</h5>
                <p>Try adjusting your search or filters</p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  );
};

export default InventoryTable;
