import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';

const InventoryStats = ({ stats }) => {
  return (
    <Row className="mb-3">
      <Col md={3} sm={6} className="mb-3 mb-md-0">
        <Card className="bg-primary text-white h-100">
          <Card.Body>
            <h6 className="card-title">
              <i className="fas fa-cube me-2"></i>Total Products
            </h6>
            <h2 className="mb-0">{stats.total}</h2>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3} sm={6} className="mb-3 mb-md-0">
        <Card className="bg-success text-white h-100">
          <Card.Body>
            <h6 className="card-title">
              <i className="fas fa-dollar-sign me-2"></i>Total Value
            </h6>
            <h2 className="mb-0">
              ${stats.totalValue.toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </h2>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3} sm={6} className="mb-3 mb-md-0">
        <Card className="bg-warning text-white h-100">
          <Card.Body>
            <h6 className="card-title">
              <i className="fas fa-exclamation-triangle me-2"></i>Low Stock
            </h6>
            <h2 className="mb-0">{stats.lowStock}</h2>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3} sm={6} className="mb-3 mb-md-0">
        <Card className="bg-danger text-white h-100">
          <Card.Body>
            <h6 className="card-title">
              <i className="fas fa-times-circle me-2"></i>Out of Stock
            </h6>
            <h2 className="mb-0">{stats.outOfStock}</h2>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default InventoryStats;
