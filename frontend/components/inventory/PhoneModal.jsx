import React from 'react';
import { Modal, Form, Row, Col, Tab, Nav, Button } from 'react-bootstrap';

const PhoneModal = ({
  show,
  onHide,
  onSubmit,
  editingProduct,
  formData,
  onInputChange,
  activeTab,
  onTabSelect
}) => {
  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-mobile-alt me-2"></i>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={onSubmit}>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Tab.Container activeKey={activeTab} onSelect={onTabSelect}>
            <Nav variant="pills" className="mb-3 flex-wrap">
              <Nav.Item>
                <Nav.Link eventKey="basic">
                  <i className="fas fa-info-circle me-1"></i>Basic Info
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="specs">
                  <i className="fas fa-microchip me-1"></i>Specs
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="display">
                  <i className="fas fa-tv me-1"></i>Display
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="camera">
                  <i className="fas fa-camera me-1"></i>Camera
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="battery">
                  <i className="fas fa-battery-full me-1"></i>Battery
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="physical">
                  <i className="fas fa-ruler-combined me-1"></i>Physical
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="warranty">
                  <i className="fas fa-shield-alt me-1"></i>Warranty
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content>
              {/* Basic Information Tab */}
              <Tab.Pane eventKey="basic">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Device Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="device_name"
                        value={formData.device_name}
                        onChange={onInputChange}
                        required
                        placeholder="e.g., Galaxy S23 Ultra"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Manufacturer <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="device_maker"
                        value={formData.device_maker}
                        onChange={onInputChange}
                        required
                        placeholder="e.g., Samsung"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Price ($) <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="device_price"
                        value={formData.device_price}
                        onChange={onInputChange}
                        required
                        placeholder="1199.99"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Color</Form.Label>
                      <Form.Control
                        type="text"
                        name="color"
                        value={formData.color}
                        onChange={onInputChange}
                        placeholder="Phantom Black"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Water & Dust Rating</Form.Label>
                      <Form.Control
                        type="text"
                        name="water_and_dust_rating"
                        value={formData.water_and_dust_rating}
                        onChange={onInputChange}
                        placeholder="IP68"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Operating System</Form.Label>
                      <Form.Control
                        type="text"
                        name="operating_system"
                        value={formData.operating_system}
                        onChange={onInputChange}
                        placeholder="Android 13, One UI 5.1"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Specs Tab */}
              <Tab.Pane eventKey="specs">
                <h6 className="text-primary mb-3"><i className="fas fa-microchip me-2"></i>Processor & Performance</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Processor</Form.Label>
                      <Form.Control type="text" name="processor" value={formData.processor} onChange={onInputChange} placeholder="Snapdragon 8 Gen 2" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>GPU</Form.Label>
                      <Form.Control type="text" name="gpu" value={formData.gpu} onChange={onInputChange} placeholder="Adreno 740" />
                    </Form.Group>
                  </Col>
                </Row>
                <h6 className="text-primary mb-3 mt-3"><i className="fas fa-memory me-2"></i>Memory</h6>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>RAM</Form.Label>
                      <Form.Control type="text" name="ram" value={formData.ram} onChange={onInputChange} placeholder="12GB" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>ROM/Storage</Form.Label>
                      <Form.Control type="text" name="rom" value={formData.rom} onChange={onInputChange} placeholder="512GB" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Expandable Memory</Form.Label>
                      <Form.Control type="text" name="expandable_memory" value={formData.expandable_memory} onChange={onInputChange} placeholder="No" />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Display Tab */}
              <Tab.Pane eventKey="display">
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Display Size (inches)</Form.Label>
                      <Form.Control type="number" step="0.01" name="display_size" value={formData.display_size} onChange={onInputChange} placeholder="6.8" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Display Type</Form.Label>
                      <Form.Select name="display_type" value={formData.display_type || ''} onChange={onInputChange}>
                        <option value="">Select type...</option>
                        <option value="LCD">LCD</option>
                        <option value="IPS_LCD">IPS LCD</option>
                        <option value="OLED">OLED</option>
                        <option value="AMOLED">AMOLED</option>
                        <option value="SUPER_AMOLED">Super AMOLED</option>
                        <option value="LTPO_OLED">LTPO OLED</option>
                        <option value="RETINA">Retina</option>
                        <option value="OTHER">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Resolution</Form.Label>
                      <Form.Control type="text" name="resolution" value={formData.resolution} onChange={onInputChange} placeholder="3088x1440" />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Refresh Rate</Form.Label>
                      <Form.Control type="text" name="refresh_rate" value={formData.refresh_rate} onChange={onInputChange} placeholder="120Hz" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>HDR Support</Form.Label>
                      <Form.Control type="text" name="hdr_support" value={formData.hdr_support} onChange={onInputChange} placeholder="HDR10, HDR10+, Dolby Vision" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Display Features</Form.Label>
                      <Form.Control type="text" name="display_features" value={formData.display_features} onChange={onInputChange} placeholder="Dynamic AMOLED 2X" />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Camera Tab */}
              <Tab.Pane eventKey="camera">
                <h6 className="text-primary mb-3"><i className="fas fa-camera me-2"></i>Rear Camera</h6>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Main Camera</Form.Label>
                      <Form.Control type="text" name="rear_camera_main" value={formData.rear_camera_main} onChange={onInputChange} placeholder="200MP f/1.7 OIS" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ultrawide Camera</Form.Label>
                      <Form.Control type="text" name="rear_camera_ultrawide" value={formData.rear_camera_ultrawide} onChange={onInputChange} placeholder="12MP f/2.2" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Telephoto Camera</Form.Label>
                      <Form.Control type="text" name="rear_camera_telephoto" value={formData.rear_camera_telephoto} onChange={onInputChange} placeholder="10MP f/4.9" />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Optical Zoom</Form.Label>
                      <Form.Control type="text" name="optical_zoom" value={formData.optical_zoom} onChange={onInputChange} placeholder="3x, 10x" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Rear Camera Features</Form.Label>
                      <Form.Control type="text" name="rear_camera_features" value={formData.rear_camera_features} onChange={onInputChange} placeholder="8K video, Night mode" />
                    </Form.Group>
                  </Col>
                </Row>
                <h6 className="text-primary mb-3 mt-3"><i className="fas fa-camera-retro me-2"></i>Front Camera</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Front Camera</Form.Label>
                      <Form.Control type="text" name="front_camera" value={formData.front_camera} onChange={onInputChange} placeholder="12MP f/2.2" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Front Camera Features</Form.Label>
                      <Form.Control type="text" name="front_camera_features" value={formData.front_camera_features} onChange={onInputChange} placeholder="Dual Pixel AF" />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Battery Tab */}
              <Tab.Pane eventKey="battery">
                <h6 className="text-primary mb-3"><i className="fas fa-battery-full me-2"></i>Battery & Charging</h6>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Battery Capacity</Form.Label>
                      <Form.Control type="text" name="battery_capacity" value={formData.battery_capacity} onChange={onInputChange} placeholder="5000mAh" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Fast Charging</Form.Label>
                      <Form.Control type="text" name="fast_charging" value={formData.fast_charging} onChange={onInputChange} placeholder="45W wired" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Connector</Form.Label>
                      <Form.Control type="text" name="connector" value={formData.connector} onChange={onInputChange} placeholder="USB Type-C 3.2" />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Wireless Charging</Form.Label>
                      <Form.Control type="text" name="wireless_charging" value={formData.wireless_charging} onChange={onInputChange} placeholder="15W Qi, 50W" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Reverse Charging</Form.Label>
                      <Form.Control type="text" name="reverse_charging" value={formData.reverse_charging} onChange={onInputChange} placeholder="4.5W wireless power share" />
                    </Form.Group>
                  </Col>
                </Row>
                <h6 className="text-primary mb-3 mt-3"><i className="fas fa-wifi me-2"></i>Connectivity</h6>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>SIM Card</Form.Label>
                      <Form.Control type="text" name="sim_card" value={formData.sim_card} onChange={onInputChange} placeholder="Dual SIM + eSIM" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>NFC</Form.Label>
                      <Form.Control type="text" name="nfc" value={formData.nfc} onChange={onInputChange} placeholder="Yes" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Wireless Connectivity</Form.Label>
                      <Form.Control type="text" name="wireless_connectivity" value={formData.wireless_connectivity} onChange={onInputChange} placeholder="5G, Wi-Fi 6E" />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Physical Tab */}
              <Tab.Pane eventKey="physical">
                <h6 className="text-primary mb-3"><i className="fas fa-ruler-combined me-2"></i>Dimensions & Weight</h6>
                <Row>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Length (mm)</Form.Label>
                      <Form.Control type="number" step="0.1" name="length_mm" value={formData.length_mm} onChange={onInputChange} placeholder="163.4" />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Width (mm)</Form.Label>
                      <Form.Control type="number" step="0.1" name="width_mm" value={formData.width_mm} onChange={onInputChange} placeholder="78.1" />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Thickness (mm)</Form.Label>
                      <Form.Control type="number" step="0.1" name="thickness_mm" value={formData.thickness_mm} onChange={onInputChange} placeholder="8.9" />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Weight (g)</Form.Label>
                      <Form.Control type="number" step="0.1" name="weight_g" value={formData.weight_g} onChange={onInputChange} placeholder="234" />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Security Features</Form.Label>
                      <Form.Control type="text" name="security_features" value={formData.security_features} onChange={onInputChange} placeholder="In-display fingerprint, Face recognition" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sensors</Form.Label>
                      <Form.Control type="text" name="sensors" value={formData.sensors} onChange={onInputChange} placeholder="Accelerometer, Gyro, Proximity" />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Package Contents</Form.Label>
                  <Form.Control as="textarea" rows={2} name="package_contents" value={formData.package_contents} onChange={onInputChange} placeholder="Phone, USB-C cable, SIM tool, Documentation" />
                </Form.Group>
              </Tab.Pane>

              {/* Warranty & Status Tab */}
              <Tab.Pane eventKey="warranty">
                <h6 className="text-primary mb-3"><i className="fas fa-certificate me-2"></i>Warranty Information</h6>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Warranty Period (months)</Form.Label>
                      <Form.Control type="number" name="warranty_months" value={formData.warranty_months} onChange={onInputChange} placeholder="12" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Warranty Type</Form.Label>
                      <Form.Select name="warranty_type" value={formData.warranty_type || 'MANUFACTURER'} onChange={onInputChange}>
                        <option value="MANUFACTURER">Manufacturer</option>
                        <option value="DISTRIBUTOR">Distributor</option>
                        <option value="STORE">Store</option>
                        <option value="EXTENDED">Extended</option>
                        <option value="NONE">None</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Warranty Notes</Form.Label>
                      <Form.Control type="text" name="warranty_notes" value={formData.warranty_notes} onChange={onInputChange} placeholder="Additional terms..." />
                    </Form.Group>
                  </Col>
                </Row>
                <h6 className="text-primary mb-3 mt-3"><i className="fas fa-toggle-on me-2"></i>Product Status</h6>
                <Row>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="switch"
                        id="inv_is_active"
                        name="is_active"
                        label="Active"
                        checked={formData.is_active}
                        onChange={(e) => onInputChange({ target: { name: 'is_active', value: e.target.checked } })}
                      />
                      <Form.Text className="text-muted">Available for sale</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="switch"
                        id="inv_is_discontinued"
                        name="is_discontinued"
                        label="Discontinued"
                        checked={formData.is_discontinued}
                        onChange={(e) => onInputChange({ target: { name: 'is_discontinued', value: e.target.checked } })}
                      />
                      <Form.Text className="text-muted">By manufacturer</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Launch Date</Form.Label>
                      <Form.Control type="date" name="launch_date" value={formData.launch_date || ''} onChange={onInputChange} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>End of Life</Form.Label>
                      <Form.Control type="date" name="end_of_life_date" value={formData.end_of_life_date || ''} onChange={onInputChange} />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            <i className="fas fa-times me-2"></i>Cancel
          </Button>
          <Button variant="primary" type="submit">
            <i className={`fas fa-${editingProduct ? 'save' : 'plus'} me-2`}></i>
            {editingProduct ? 'Update' : 'Add'} Product
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default PhoneModal;
