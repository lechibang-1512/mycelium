import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, Table, Alert, Spinner } from 'react-bootstrap';
import { inventoryAPI } from '../../api/api';
import DeviceSparePartsManager from '../../components/spareparts/DeviceSparePartsManager';

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSparePartsManager, setShowSparePartsManager] = useState(false);

  const fetchProductDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [productResponse, logsResponse] = await Promise.all([
        inventoryAPI.getById(id),
        inventoryAPI.getProductLogs(id)
      ]);
      setProduct(productResponse.data);
      setLogs(logsResponse.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching product details:', err);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails]);

  const getStockStatus = (qty) => {
    // Convert to number to handle string values from API
    const quantity = Number(qty) || 0;
    // Out of Stock: quantity === 0
    if (quantity === 0) return { variant: 'danger', icon: 'fa-ban', label: 'Out of stock' };
    // Low Stock: quantity > 0 (explicitly greater than 0)
    return { variant: 'warning', icon: 'fa-exclamation-triangle', label: 'Low stock' };
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading product details...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={() => navigate('/inventory')}>
            Back to Inventory
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="mt-5">
        <Alert variant="warning">
          <Alert.Heading>Product Not Found</Alert.Heading>
          <p>The requested product could not be found.</p>
          <Button variant="outline-warning" onClick={() => navigate('/inventory')}>
            Back to Inventory
          </Button>
        </Alert>
      </Container>
    );
  }

  const stockStatus = getStockStatus(product.total_inventory || 0);
  const renderStockBadge = (showCount = true) => (
    <Badge
      bg={stockStatus.variant}
      className={`fs-6 ${stockStatus.variant === 'warning' ? 'text-dark' : ''}`}
    >
      <i className={`fas ${stockStatus.icon} me-1`}></i>
      {stockStatus.label}
      {showCount && product.total_inventory > 0 && ` (${product.total_inventory} left)`}
    </Badge>
  );

  const SpecRow = ({ label, value }) => {
    if (!value || value === 'null' || value === '') return null;
    return (
      <tr>
        <td className="text-muted" style={{ width: '40%' }}><strong>{label}</strong></td>
        <td>{value}</td>
      </tr>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-primary text-white py-4 mb-4">
        <Container>
          <Row className="align-items-center">
            <Col>
              <Button
                variant="light"
                size="sm"
                onClick={() => navigate('/inventory')}
                className="mb-2"
              >
                <i className="fas fa-arrow-left me-2"></i>
                Back to Inventory
              </Button>
              <h1 className="mb-2">
                <i className="fas fa-box me-3"></i>
                {product.device_name}
              </h1>
              <p className="lead mb-0">{product.device_maker}</p>
            </Col>
            <Col xs="auto">
              <div className="text-end">
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => setShowSparePartsManager(true)}
                  className="mb-2 me-2"
                >
                  <i className="fas fa-tools me-2"></i>
                  Spare Parts
                </Button>
                <h2 className="mb-2 d-inline-block align-middle">${Number(product.device_price || 0).toFixed(2)}</h2>
                <div className="mt-1">
                  {renderStockBadge()}
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <Container>
        <Row>
          {/* Main Info Card */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-info-circle me-2"></i>
                  General Information
                </h5>
              </Card.Header>
              <Card.Body>
                <Table hover responsive>
                  <tbody>
                    <SpecRow label="Product ID" value={product.product_id} />
                    <SpecRow label="Model" value={product.device_name} />
                    <SpecRow label="Manufacturer" value={product.device_maker} />
                    <SpecRow label="Color" value={product.color} />
                    <SpecRow label="Price" value={`$${Number(product.device_price || 0).toFixed(2)}`} />
                    <SpecRow label="Stock" value={renderStockBadge()} />
                    <SpecRow label="Product Type" value={product.product_type} />
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>

          {/* Specifications Card */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Header className="bg-info text-white">
                <h5 className="mb-0">
                  <i className="fas fa-microchip me-2"></i>
                  Processor & Memory
                </h5>
              </Card.Header>
              <Card.Body>
                <Table hover responsive className="mb-0">
                  <tbody>
                    <SpecRow label="Processor" value={product.processor} />
                    <SpecRow label="Process Node" value={product.process_node} />
                    <SpecRow label="CPU Cores" value={product.cpu_cores} />
                    <SpecRow label="CPU Frequency" value={product.cpu_frequency} />
                    <SpecRow label="GPU" value={product.gpu} />
                    <SpecRow label="RAM" value={product.ram} />
                    <SpecRow label="Storage" value={product.rom} />
                    <SpecRow label="Memory Type" value={product.memory_type} />
                    <SpecRow label="Expandable" value={product.expandable_memory} />
                    <SpecRow label="OS" value={product.operating_system} />
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>

          {/* Physical Dimensions */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Header style={{ backgroundColor: '#6c757d', color: 'white' }}>
                <h5 className="mb-0">
                  <i className="fas fa-ruler-combined me-2"></i>
                  Physical & Build
                </h5>
              </Card.Header>
              <Card.Body>
                <Table hover responsive className="mb-0">
                  <tbody>
                    <SpecRow label="Dimensions" value={
                      product.length_mm && product.width_mm && product.thickness_mm
                        ? `${product.length_mm} x ${product.width_mm} x ${product.thickness_mm} mm`
                        : null
                    } />
                    <SpecRow label="Weight" value={product.weight_g ? `${product.weight_g}g` : null} />
                    <SpecRow label="Build Material" value={product.build_material} />
                    <SpecRow label="Water/Dust Rating" value={product.water_and_dust_rating} />
                    {/* Separate dimensions if combo not available but individual are */}
                    {!product.length_mm && <SpecRow label="Length" value={product.length_mm ? `${product.length_mm} mm` : null} />}
                    {!product.width_mm && <SpecRow label="Width" value={product.width_mm ? `${product.width_mm} mm` : null} />}
                    {!product.thickness_mm && <SpecRow label="Thickness" value={product.thickness_mm ? `${product.thickness_mm} mm` : null} />}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>

          {/* Display Specifications */}
          {(product.display_size || product.resolution) && (
            <Col lg={6} className="mb-4">
              <Card>
                <Card.Header className="bg-warning text-dark">
                  <h5 className="mb-0">
                    <i className="fas fa-desktop me-2"></i>
                    Display
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table hover responsive>
                    <tbody>
                      <SpecRow label="Display Size" value={product.display_size ? `${product.display_size}"` : null} />
                      <SpecRow label="Display Type" value={product.display_type?.replace('_', ' ')} />
                      <SpecRow label="Resolution" value={product.resolution} />
                      <SpecRow label="Pixel Density" value={product.pixel_density} />
                      <SpecRow label="Refresh Rate" value={product.refresh_rate} />
                      <SpecRow label="HDR Support" value={product.hdr_support} />
                      <SpecRow label="Brightness" value={product.brightness} />
                      <SpecRow label="Features" value={product.display_features} />
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          )}

          {/* Camera System */}
          <Col lg={12} className="mb-4">
            <Card>
              <Card.Header className="bg-danger text-white">
                <h5 className="mb-0">
                  <i className="fas fa-camera me-2"></i>
                  Camera System
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h6 className="text-danger border-bottom pb-2 mb-3">Rear Camera</h6>
                    <Table hover responsive className="mb-0">
                      <tbody>
                        <SpecRow label="Main Sensor" value={product.rear_camera_main} />
                        <SpecRow label="Ultrawide" value={product.rear_camera_ultrawide} />
                        <SpecRow label="Telephoto" value={product.rear_camera_telephoto} />
                        <SpecRow label="Macro" value={product.rear_camera_macro} />
                        <SpecRow label="Optical Zoom" value={product.optical_zoom} />
                        <SpecRow label="Features" value={product.rear_camera_features} />
                        <SpecRow label="Video" value={product.rear_video_resolution} />
                      </tbody>
                    </Table>
                  </Col>
                  <Col md={6} className="mt-4 mt-md-0">
                    <h6 className="text-danger border-bottom pb-2 mb-3">Front Camera</h6>
                    <Table hover responsive className="mb-0">
                      <tbody>
                        <SpecRow label="Sensor" value={product.front_camera} />
                        <SpecRow label="Features" value={product.front_camera_features} />
                        <SpecRow label="Video" value={product.front_video_resolution} />
                      </tbody>
                    </Table>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Battery & Charging */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Header className="bg-success text-white">
                <h5 className="mb-0">
                  <i className="fas fa-battery-full me-2"></i>
                  Battery & Charging
                </h5>
              </Card.Header>
              <Card.Body>
                <Table hover responsive className="mb-0">
                  <tbody>
                    <SpecRow label="Capacity" value={product.battery_capacity} />
                    <SpecRow label="Fast Charging" value={product.fast_charging} />
                    <SpecRow label="Wireless Charging" value={product.wireless_charging} />
                    <SpecRow label="Reverse Charging" value={product.reverse_charging} />
                    <SpecRow label="Connector" value={product.connector} />
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>

          {/* Connectivity & Sensors */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Header className="bg-dark text-white">
                <h5 className="mb-0">
                  <i className="fas fa-wifi me-2"></i>
                  Connectivity & Other
                </h5>
              </Card.Header>
              <Card.Body>
                <Table hover responsive className="mb-0">
                  <tbody>
                    <SpecRow label="SIM Type" value={product.sim_card} />
                    <SpecRow label="Network" value={product.network_bands} />
                    <SpecRow label="Wireless" value={product.wireless_connectivity} />
                    <SpecRow label="NFC" value={product.nfc} />
                    <SpecRow label="Navigation" value={product.navigation} />
                    <SpecRow label="Sensors" value={product.sensors} />
                    <SpecRow label="Security" value={product.security_features} />
                    <SpecRow label="Audio" value={product.audio_jack || product.audio_playback} />
                    <SpecRow label="In Box" value={product.package_contents} />
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>

          {/* Inventory History */}
          <Col lg={12} className="mb-4">
            <Card>
              <Card.Header className="bg-secondary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-history me-2"></i>
                  Recent Inventory History
                </h5>
              </Card.Header>
              <Card.Body>
                {logs.length > 0 ? (
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, index) => (
                        <tr key={index}>
                          <td>{log.formatted_date || new Date(log.transaction_date).toLocaleString()}</td>
                          <td>
                            <Badge bg={log.transaction_type === 'incoming' ? 'success' : 'danger'}>
                              {log.transaction_type === 'incoming' ? 'Stock In' : 'Stock Out'}
                            </Badge>
                          </td>
                          <td>
                            <strong className={log.transaction_type === 'incoming' ? 'text-success' : 'text-danger'}>
                              {log.transaction_type === 'incoming' ? '+' : '-'}{Math.abs(log.quantity_changed)}
                            </strong>
                          </td>
                          <td>{log.notes || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <p className="text-muted text-center py-3">No inventory history available</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Spare Parts Manager Modal */}
      {
        product && (
          <DeviceSparePartsManager
            show={showSparePartsManager}
            onHide={() => setShowSparePartsManager(false)}
            productId={product.product_id}
            deviceName={`${product.device_maker} ${product.device_name}`}
          />
        )
      }
    </div >
  );
}

export default ProductDetails;
