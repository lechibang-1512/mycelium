import React from 'react';
import { Modal, Form, Row, Col, Tab, Nav, Button, InputGroup } from 'react-bootstrap';

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
  // Helper to safely access nested properties provided path like "attributes.processor.name"
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj) || '';
  };

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
                        placeholder="1199.99"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Color</Form.Label>
                      <Form.Control
                        type="text"
                        name="attributes.body.color"
                        value={getNestedValue(formData, 'attributes.body.color')}
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
                        name="attributes.body.water_resistance"
                        value={getNestedValue(formData, 'attributes.body.water_resistance')}
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
                        name="attributes.software.os"
                        value={getNestedValue(formData, 'attributes.software.os')}
                        onChange={onInputChange}
                        placeholder="Android 13, One UI 5.1"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Specs Tab - ATTRIBUTES MAPPED */}
              <Tab.Pane eventKey="specs">
                <h6 className="text-primary mb-3"><i className="fas fa-microchip me-2"></i>Processor & Performance</h6>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Manufacturer</Form.Label>
                      <Form.Control type="text" name="attributes.processor.manufacturer" value={getNestedValue(formData, 'attributes.processor.manufacturer')} onChange={onInputChange} placeholder="Qualcomm" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Processor / Chipset</Form.Label>
                      <Form.Control type="text" name="attributes.processor.name" value={getNestedValue(formData, 'attributes.processor.name')} onChange={onInputChange} placeholder="Snapdragon 8 Gen 2" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>GPU</Form.Label>
                      <Form.Control type="text" name="attributes.processor.gpu" value={getNestedValue(formData, 'attributes.processor.gpu')} onChange={onInputChange} placeholder="Adreno 740" />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Process Node (nm)</Form.Label>
                      <Form.Control type="number" name="attributes.processor.process_nm" value={getNestedValue(formData, 'attributes.processor.process_nm')} onChange={onInputChange} placeholder="4" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Core Structure
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 ms-2 text-decoration-none"
                          onClick={() => {
                            const current = getNestedValue(formData, 'attributes.processor.cores');
                            if (Array.isArray(current)) {
                              // Switch to text
                              const str = current.map(c => `${c.type || 'Core'}*${c.count || 1}`).join(' + ');
                              onInputChange({ target: { name: 'attributes.processor.cores', value: str } });
                            } else {
                              // Switch to array
                              const parts = (current || '').toString().split('+').map(p => p.trim()).filter(Boolean);
                              let newCores = [];
                              if (parts.length > 0) {
                                newCores = parts.map(p => {
                                  const [type, count] = p.split('*').map(s => s.trim());
                                  return { type: type || 'Core', count: count || 1, frequency: '' };
                                });
                              } else {
                                newCores = [{ type: '', count: '', frequency: '' }];
                              }
                              onInputChange({ target: { name: 'attributes.processor.cores', value: newCores } });
                            }
                          }}
                        >
                          {Array.isArray(getNestedValue(formData, 'attributes.processor.cores'))
                            ? <i className="fas fa-font text-muted" title="Switch to Text Mode"></i>
                            : <i className="fas fa-list text-primary" title="Switch to Builder Mode"></i>
                          }
                        </Button>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="attributes.processor.cores"
                        value={getNestedValue(formData, 'attributes.processor.cores')}
                        onChange={onInputChange}
                        placeholder="Cortex A55*6 + Cortex A75*2"
                        style={{ display: Array.isArray(getNestedValue(formData, 'attributes.processor.cores')) ? 'none' : 'block' }}
                      />
                      {/* Chiplet Builder UI */}
                      {Array.isArray(getNestedValue(formData, 'attributes.processor.cores')) && (
                        <div className="border p-2 rounded bg-light mt-1">
                          {getNestedValue(formData, 'attributes.processor.cores').map((chiplet, idx) => (
                            <div key={idx} className="mb-2 border-bottom pb-2">
                              <div className="d-flex gap-1 mb-1">
                                <Form.Control
                                  size="sm"
                                  placeholder="Type (e.g. A55)"
                                  value={chiplet.type || ''}
                                  onChange={(e) => {
                                    const cores = [...getNestedValue(formData, 'attributes.processor.cores')];
                                    cores[idx] = { ...chiplet, type: e.target.value };
                                    onInputChange({ target: { name: 'attributes.processor.cores', value: cores } });
                                  }}
                                />
                                <Form.Control
                                  type="number"
                                  size="sm"
                                  placeholder="#"
                                  style={{ width: '50px' }}
                                  value={chiplet.count || ''}
                                  onChange={(e) => {
                                    const cores = [...getNestedValue(formData, 'attributes.processor.cores')];
                                    cores[idx] = { ...chiplet, count: e.target.value };
                                    onInputChange({ target: { name: 'attributes.processor.cores', value: cores } });
                                  }}
                                />
                                <Button variant="outline-danger" size="sm" onClick={() => {
                                  const cores = getNestedValue(formData, 'attributes.processor.cores').filter((_, i) => i !== idx);
                                  onInputChange({ target: { name: 'attributes.processor.cores', value: cores } });
                                }}>&times;</Button>
                              </div>
                              <Form.Control
                                size="sm"
                                placeholder="Freq (e.g. 2.0GHz)"
                                value={chiplet.frequency || ''}
                                onChange={(e) => {
                                  const cores = [...getNestedValue(formData, 'attributes.processor.cores')];
                                  cores[idx] = { ...chiplet, frequency: e.target.value };
                                  onInputChange({ target: { name: 'attributes.processor.cores', value: cores } });
                                }}
                              />
                            </div>
                          ))}
                          <Button size="sm" variant="outline-primary" className="w-100" onClick={() => {
                            const current = getNestedValue(formData, 'attributes.processor.cores') || [];
                            onInputChange({ target: { name: 'attributes.processor.cores', value: [...current, { type: '', count: '', frequency: '' }] } });
                          }}>
                            <i className="fas fa-plus me-1"></i> Add Chiplet
                          </Button>
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Clock Speed</Form.Label>
                      <Form.Control type="text" name="attributes.processor.clock_speed" value={getNestedValue(formData, 'attributes.processor.clock_speed')} onChange={onInputChange} placeholder="3.2 GHz" />
                    </Form.Group>
                  </Col>
                </Row>
                <h6 className="text-primary mb-3 mt-3"><i className="fas fa-memory me-2"></i>Memory</h6>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>RAM</Form.Label>
                      <InputGroup>
                        <Form.Control type="text" name="attributes.memory.ram" value={getNestedValue(formData, 'attributes.memory.ram')} onChange={onInputChange} placeholder="12" />
                        <InputGroup.Text>GB</InputGroup.Text>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>ROM/Storage</Form.Label>
                      <InputGroup>
                        <Form.Control type="text" name="attributes.memory.rom" value={getNestedValue(formData, 'attributes.memory.rom')} onChange={onInputChange} placeholder="512" />
                        <InputGroup.Text>GB</InputGroup.Text>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Expandable Memory</Form.Label>
                      <Form.Control type="text" name="attributes.memory.expandable" value={getNestedValue(formData, 'attributes.memory.expandable')} onChange={onInputChange} placeholder="No" />
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
                      <Form.Control type="number" step="0.01" name="attributes.display.size" value={getNestedValue(formData, 'attributes.display.size')} onChange={onInputChange} placeholder="6.8" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Display Type</Form.Label>
                      <Form.Select name="attributes.display.type" value={getNestedValue(formData, 'attributes.display.type') || ''} onChange={onInputChange}>
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
                      <Form.Control type="text" name="attributes.display.resolution" value={getNestedValue(formData, 'attributes.display.resolution')} onChange={onInputChange} placeholder="3088x1440" />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Refresh Rate</Form.Label>
                      <Form.Control type="text" name="attributes.display.refresh_rate" value={getNestedValue(formData, 'attributes.display.refresh_rate')} onChange={onInputChange} placeholder="120Hz" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>HDR Support</Form.Label>
                      <Form.Control type="text" name="attributes.display.hdr" value={getNestedValue(formData, 'attributes.display.hdr')} onChange={onInputChange} placeholder="HDR10, HDR10+, Dolby Vision" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Display Features</Form.Label>
                      <Form.Control type="text" name="attributes.display.features" value={getNestedValue(formData, 'attributes.display.features')} onChange={onInputChange} placeholder="Dynamic AMOLED 2X" />
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
                      <Form.Control type="text" name="attributes.camera.rear.main" value={getNestedValue(formData, 'attributes.camera.rear.main')} onChange={onInputChange} placeholder="200MP f/1.7 OIS" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ultrawide Camera</Form.Label>
                      <Form.Control type="text" name="attributes.camera.rear.ultrawide" value={getNestedValue(formData, 'attributes.camera.rear.ultrawide')} onChange={onInputChange} placeholder="12MP f/2.2" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Telephoto Camera</Form.Label>
                      <Form.Control type="text" name="attributes.camera.rear.telephoto" value={getNestedValue(formData, 'attributes.camera.rear.telephoto')} onChange={onInputChange} placeholder="10MP f/4.9" />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Optical Zoom</Form.Label>
                      <Form.Control type="text" name="attributes.camera.rear.optical_zoom" value={getNestedValue(formData, 'attributes.camera.rear.optical_zoom')} onChange={onInputChange} placeholder="3x, 10x" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Rear Camera Features</Form.Label>
                      <Form.Control type="text" name="attributes.camera.rear.features" value={getNestedValue(formData, 'attributes.camera.rear.features')} onChange={onInputChange} placeholder="8K video, Night mode" />
                    </Form.Group>
                  </Col>
                </Row>
                <h6 className="text-primary mb-3 mt-3"><i className="fas fa-camera-retro me-2"></i>Front Camera</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Front Camera</Form.Label>
                      <Form.Control type="text" name="attributes.camera.front.main" value={getNestedValue(formData, 'attributes.camera.front.main')} onChange={onInputChange} placeholder="12MP f/2.2" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Front Camera Features</Form.Label>
                      <Form.Control type="text" name="attributes.camera.front.features" value={getNestedValue(formData, 'attributes.camera.front.features')} onChange={onInputChange} placeholder="Dual Pixel AF" />
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
                      <InputGroup>
                        <Form.Control type="number" name="attributes.battery.capacity" value={getNestedValue(formData, 'attributes.battery.capacity')} onChange={onInputChange} placeholder="5000" />
                        <InputGroup.Text>mAh</InputGroup.Text>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Fast Charging</Form.Label>
                      <InputGroup>
                        <Form.Control type="text" name="attributes.battery.fast_charging_support" value={getNestedValue(formData, 'attributes.battery.fast_charging_support')} onChange={onInputChange} placeholder="Super Fast Charging" />
                        <Form.Control type="number" name="attributes.battery.charging.wired_wattage" value={getNestedValue(formData, 'attributes.battery.charging.wired_wattage')} onChange={onInputChange} placeholder="45" style={{ maxWidth: '80px' }} />
                        <InputGroup.Text>W</InputGroup.Text>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Connector</Form.Label>
                      <Form.Control type="text" name="attributes.battery.charging.connector_type" value={getNestedValue(formData, 'attributes.battery.charging.connector_type')} onChange={onInputChange} placeholder="USB Type-C 3.2" />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Wireless Charging</Form.Label>
                      <InputGroup>
                        <Form.Control type="text" name="attributes.connectivity.wireless" value={getNestedValue(formData, 'attributes.connectivity.wireless')} onChange={onInputChange} placeholder="15W Qi" />
                        <Form.Control type="number" name="attributes.battery.charging.wireless_wattage" value={getNestedValue(formData, 'attributes.battery.charging.wireless_wattage')} onChange={onInputChange} placeholder="15" style={{ maxWidth: '80px' }} />
                        <InputGroup.Text>W</InputGroup.Text>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Reverse Charging</Form.Label>
                      <InputGroup>
                        <Form.Control type="text" disabled placeholder="Wireless PowerShare" />
                        <Form.Control type="number" name="attributes.battery.charging.reverse_wireless_wattage" value={getNestedValue(formData, 'attributes.battery.charging.reverse_wireless_wattage')} onChange={onInputChange} placeholder="4.5" style={{ maxWidth: '80px' }} />
                        <InputGroup.Text>W</InputGroup.Text>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>
                <h6 className="text-primary mb-3 mt-3"><i className="fas fa-wifi me-2"></i>Connectivity</h6>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>SIM Card</Form.Label>
                      <Form.Control type="text" name="attributes.connectivity.sim" value={getNestedValue(formData, 'attributes.connectivity.sim')} onChange={onInputChange} placeholder="Dual SIM + eSIM" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>NFC</Form.Label>
                      <Form.Control type="text" name="attributes.connectivity.nfc" value={getNestedValue(formData, 'attributes.connectivity.nfc')} onChange={onInputChange} placeholder="Yes" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Wireless Connectivity</Form.Label>
                      <Form.Control type="text" name="attributes.connectivity.wireless" value={getNestedValue(formData, 'attributes.connectivity.wireless')} onChange={onInputChange} placeholder="5G, Wi-Fi 6E" />
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
                      <Form.Control type="number" step="0.1" name="attributes.dimensions.length" value={getNestedValue(formData, 'attributes.dimensions.length')} onChange={onInputChange} placeholder="163.4" />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Width (mm)</Form.Label>
                      <Form.Control type="number" step="0.1" name="attributes.dimensions.width" value={getNestedValue(formData, 'attributes.dimensions.width')} onChange={onInputChange} placeholder="78.1" />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Thickness (mm)</Form.Label>
                      <Form.Control type="number" step="0.1" name="attributes.dimensions.thickness" value={getNestedValue(formData, 'attributes.dimensions.thickness')} onChange={onInputChange} placeholder="8.9" />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Weight (g)</Form.Label>
                      <Form.Control type="number" step="0.1" name="attributes.dimensions.weight" value={getNestedValue(formData, 'attributes.dimensions.weight')} onChange={onInputChange} placeholder="234" />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Security Features</Form.Label>
                      <Form.Control type="text" name="attributes.features.security" value={getNestedValue(formData, 'attributes.features.security')} onChange={onInputChange} placeholder="In-display fingerprint, Face recognition" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sensors</Form.Label>
                      <Form.Control type="text" name="attributes.features.sensors" value={getNestedValue(formData, 'attributes.features.sensors')} onChange={onInputChange} placeholder="Accelerometer, Gyro, Proximity" />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Package Contents</Form.Label>
                  <Form.Control as="textarea" rows={2} name="attributes.package_contents" value={getNestedValue(formData, 'attributes.package_contents')} onChange={onInputChange} placeholder="Phone, USB-C cable, SIM tool, Documentation" />
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
                        onChange={onInputChange}
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
                        onChange={onInputChange}
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
