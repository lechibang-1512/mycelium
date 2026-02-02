import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Alert, Badge, Tabs, Tab, Spinner } from 'react-bootstrap';
import { suppliersAPI, invoicesAPI } from '../../api/api';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';

function Suppliers() {
  const { hasPermission } = useAuth();

  // Permission checks
  const canWrite = hasPermission(PERMISSIONS.SUPPLIERS_WRITE) || hasPermission(PERMISSIONS.SUPPLIERS_MANAGE);
  const canDelete = hasPermission(PERMISSIONS.SUPPLIERS_DELETE) || hasPermission(PERMISSIONS.SUPPLIERS_MANAGE);

  // State
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableBrands, setAvailableBrands] = useState({ phones: [], parts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedSupplierStats, setSelectedSupplierStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [supplierInvoices, setSupplierInvoices] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    contact_person: '',
    contact_position: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    province: '',
    ward: '',
    district: '',
    notes: '',
    is_active: 1,
    brands: { phones: [], parts: [] },
    tax_code: '',
    additional_contacts: []
  });

  // Fetch Functions
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await suppliersAPI.getAll(filters);
      setSuppliers(response.data.suppliers || []);
      setError('');
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await suppliersAPI.getCategories();
      setCategories(response.data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      const response = await suppliersAPI.getBrands();
      // Ensure we handle both structure from backend and potentially legacy array
      if (Array.isArray(response.data.brands)) {
        // Fallback if backend returns array (though we updated it to return object)
        setAvailableBrands({ phones: response.data.brands, parts: [] });
      } else {
        setAvailableBrands(response.data.brands || { phones: [], parts: [] });
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchCategories();
    fetchBrands();
  }, [fetchSuppliers, fetchCategories, fetchBrands]);

  // Handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdditionalContactChange = (index, field, value) => {
    const updatedContacts = [...formData.additional_contacts];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setFormData({ ...formData, additional_contacts: updatedContacts });
  };

  const addAdditionalContact = () => {
    setFormData({
      ...formData,
      additional_contacts: [...(formData.additional_contacts || []), { name: '', position: '', phone: '', email: '' }]
    });
  };

  const removeAdditionalContact = (index) => {
    const updatedContacts = [...(formData.additional_contacts || [])];
    updatedContacts.splice(index, 1);
    setFormData({ ...formData, additional_contacts: updatedContacts });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        // Ensure brands is stringified if backend expects JSON, or object if backend handles it.
        // Based on other code, backend seems to handle object or string, but let's send object.
        // Checking existing code usage, backend likely handles JSON in body.
      };

      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier.id, payload);
        setSuccess('Supplier updated successfully.');
      } else {
        await suppliersAPI.create(payload);
        setSuccess('Supplier created successfully.');
      }
      handleCloseModal();
      fetchSuppliers();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError('Failed to save supplier. Please check the inputs.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await suppliersAPI.delete(id);
      setSuccess('Supplier deleted successfully.');
      fetchSuppliers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier.');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await suppliersAPI.toggleStatus(id);
      fetchSuppliers();
    } catch (err) {
      console.error('Error toggling status:', err);
      setError('Failed to update status.');
    }
  };

  const fetchSupplierStats = async (id) => {
    setStatsLoading(true);
    setShowStatsModal(true);
    try {
      // Parallel requests
      const [statsRes, invoicesRes] = await Promise.allSettled([
        suppliersAPI.getStats(id),
        invoicesAPI.getInvoices({ supplier_id: id })
      ]);

      if (statsRes.status === 'fulfilled') {
        setSelectedSupplierStats(statsRes.value.data.stats);
      } else {
        setSelectedSupplierStats(null); // Or partial data
      }

      if (invoicesRes.status === 'fulfilled') {
        setSupplierInvoices(invoicesRes.value.data.data || []);
      } else {
        setSupplierInvoices([]);
      }

    } catch (err) {
      console.error('Error fetching supplier stats:', err);
      setError('Failed to load supplier details.');
    } finally {
      setStatsLoading(false);
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive ? <Badge bg="success">Active</Badge> : <Badge bg="danger">Inactive</Badge>;
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);

    // Parse brands safely
    let parsedBrands = { phones: [], parts: [] };
    if (supplier.brands) {
      if (typeof supplier.brands === 'string') {
        try {
          const parsed = JSON.parse(supplier.brands);
          if (Array.isArray(parsed)) {
            // Legacy: assume all are phones or map to Uncategorized? Let's default to phones for now
            parsedBrands = { phones: parsed, parts: [] };
          } else {
            parsedBrands = parsed;
          }
        } catch (e) {
          console.error("Failed to parse brands", e);
        }
      } else if (typeof supplier.brands === 'object') {
        parsedBrands = supplier.brands;
      }
    }

    // Parse additional contacts safely
    let parsedContacts = [];
    if (supplier.additional_contacts) {
      if (typeof supplier.additional_contacts === 'string') {
        try {
          parsedContacts = JSON.parse(supplier.additional_contacts);
        } catch (e) {
          console.error("Failed to parse additional contacts", e);
        }
      } else if (Array.isArray(supplier.additional_contacts)) {
        parsedContacts = supplier.additional_contacts;
      }
    }

    setFormData({
      name: supplier.name || '',
      category: supplier.category || '',
      contact_person: supplier.contact_person || '',
      contact_position: supplier.contact_position || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      website: supplier.website || '',
      address: supplier.address || '',
      city: supplier.city || '',
      province: supplier.province || '',
      ward: supplier.ward || '',
      district: supplier.district || '',
      notes: supplier.notes || '',
      is_active: supplier.is_active,
      brands: parsedBrands || { phones: [], parts: [] },
      tax_code: supplier.tax_code || '',
      additional_contacts: parsedContacts
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({
      name: '',
      category: '',
      contact_person: '',
      contact_position: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      province: '',
      ward: '',
      district: '',
      notes: '',
      is_active: 1,
      brands: { phones: [], parts: [] },
      tax_code: '',
      additional_contacts: []
    });
  };

  const handleAddNew = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      category: '',
      contact_person: '',
      contact_position: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      province: '',
      ward: '',
      district: '',
      notes: '',
      is_active: 1,
      brands: { phones: [], parts: [] },
      tax_code: '',
      additional_contacts: []
    });
    setShowModal(true);
  };

  const handleBrandAdd = (type, e) => {
    const brand = e.target.value;
    if (!brand) return;

    // Initialize if undefined
    const currentList = formData.brands[type] || [];

    if (!currentList.includes(brand)) {
      setFormData({
        ...formData,
        brands: {
          ...formData.brands,
          [type]: [...currentList, brand]
        }
      });
    }
    e.target.value = ''; // Reset select
  };

  const handleBrandRemove = (type, brandToRemove) => {
    const currentList = formData.brands[type] || [];
    setFormData({
      ...formData,
      brands: {
        ...formData.brands,
        [type]: currentList.filter(b => b !== brandToRemove)
      }
    });
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="fas fa-truck me-2"></i>
            Supplier Management
          </h2>
          <p className="text-muted">Manage suppliers and vendor relationships</p>
        </Col>
        {canWrite && (
          <Col md="auto">
            <Button variant="success" onClick={handleAddNew}>
              <i className="fas fa-plus me-2"></i>
              Add Supplier
            </Button>
          </Col>
        )}
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search by name, contact..."
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Category</Form.Label>
                <Form.Select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-truck fa-3x mb-3"></i>
              <p>No suppliers found</p>
              <Button variant="primary" onClick={handleAddNew}>
                Add Your First Supplier
              </Button>
            </div>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Category</th>
                  <th>Contact Person</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <strong>{supplier.name}</strong>
                      {supplier.website && (
                        <>
                          <br />
                          <small>
                            <a href={supplier.website} target="_blank" rel="noopener noreferrer">
                              <i className="fas fa-external-link-alt me-1"></i>
                              Website
                            </a>
                          </small>
                        </>
                      )}
                    </td>
                    <td>
                      {supplier.category ? (
                        <Badge bg="info">{supplier.category}</Badge>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td>
                      {supplier.contact_person || 'N/A'}
                      {supplier.contact_position && (
                        <>
                          <br />
                          <small className="text-muted">{supplier.contact_position}</small>
                        </>
                      )}
                    </td>
                    <td>
                      {supplier.email || 'N/A'}
                    </td>
                    <td>{supplier.phone || 'N/A'}</td>
                    <td>{getStatusBadge(supplier.is_active)}</td>
                    <td>
                      <div className="btn-group" role="group">
                        <Button
                          size="sm"
                          variant="outline-info"
                          onClick={() => fetchSupplierStats(supplier.id)}
                          title="View Statistics"
                        >
                          <i className="fas fa-chart-bar"></i>
                        </Button>
                        {canWrite && (
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleEdit(supplier)}
                            title="Edit Supplier"
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                        )}
                        {canWrite && (
                          <Button
                            size="sm"
                            variant={supplier.is_active ? 'outline-warning' : 'outline-success'}
                            onClick={() => handleToggleStatus(supplier.id)}
                            title={supplier.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <i className={`fas fa-${supplier.is_active ? 'ban' : 'check-circle'}`}></i>
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDelete(supplier.id)}
                            title="Delete Supplier"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>Company Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Tech Supplies Inc."
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Tax Code</Form.Label>
                  <Form.Control
                    type="text"
                    name="tax_code"
                    value={formData.tax_code}
                    onChange={handleInputChange}
                    placeholder="TAX-123456"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Control
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="e.g., Electronics"
                    list="categoryList"
                  />
                  <datalist id="categoryList">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Contact Person</Form.Label>
                  <Form.Control
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Contact Position</Form.Label>
                  <Form.Control
                    type="text"
                    name="contact_position"
                    value={formData.contact_position}
                    onChange={handleInputChange}
                    placeholder="Sales Manager"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="supplier@example.com"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Additional Contacts Section */}
            <h6 className="mt-2 mb-3 border-bottom pb-2">
              Additional Contacts
              <Button variant="link" size="sm" onClick={addAdditionalContact} className="float-end p-0 text-decoration-none">
                <i className="fas fa-plus-circle me-1"></i> Add Contact
              </Button>
            </h6>
            {(formData.additional_contacts || []).map((contact, index) => (
              <div key={index} className="mb-3 p-3 bg-light rounded position-relative">
                <Button
                  variant="link"
                  className="text-danger position-absolute top-0 end-0 p-2 text-decoration-none"
                  onClick={() => removeAdditionalContact(index)}
                >
                  <i className="fas fa-times"></i>
                </Button>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Control
                        size="sm"
                        placeholder="Name"
                        value={contact.name}
                        onChange={(e) => handleAdditionalContactChange(index, 'name', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Control
                        size="sm"
                        placeholder="Position"
                        value={contact.position}
                        onChange={(e) => handleAdditionalContactChange(index, 'position', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Control
                        size="sm"
                        placeholder="Email"
                        value={contact.email}
                        onChange={(e) => handleAdditionalContactChange(index, 'email', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Control
                        size="sm"
                        placeholder="Phone"
                        value={contact.phone}
                        onChange={(e) => handleAdditionalContactChange(index, 'phone', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            ))}

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Website</Form.Label>
                  <Form.Control
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://www.supplier.com"
                  />
                </Form.Group>
              </Col>
            </Row>


            <h6 className="mt-3 mb-3 border-bottom pb-2">Address Information</h6>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Street Address</Form.Label>
                  <Form.Control
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="House number, street name..."
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ward</Form.Label>
                  <Form.Control
                    type="text"
                    name="ward"
                    value={formData.ward}
                    onChange={handleInputChange}
                    placeholder="e.g. Ward 1"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>District</Form.Label>
                  <Form.Control
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    placeholder="e.g. District 1"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>City</Form.Label>
                  <Form.Control
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g. Ho Chi Minh City"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Province</Form.Label>
                  <Form.Control
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    placeholder="e.g. Ho Chi Minh"
                  />
                </Form.Group>
              </Col>
            </Row>



            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Smartphone Brands</Form.Label>
                  <div className="mb-2 p-2 border rounded bg-light" style={{ minHeight: '60px' }}>
                    {(formData.brands.phones || []).length === 0 ? (
                      <span className="text-muted small">No brands selected</span>
                    ) : (
                      (formData.brands.phones || []).map(brand => (
                        <Badge key={brand} bg="primary" className="me-2 mb-1 p-2">
                          {brand}
                          <i
                            className="fas fa-times ms-2"
                            onClick={() => handleBrandRemove('phones', brand)}
                            style={{ cursor: 'pointer' }}
                          ></i>
                        </Badge>
                      ))
                    )}
                  </div>
                  <Form.Select onChange={(e) => handleBrandAdd('phones', e)} value="">
                    <option value="">Add Phone Brand...</option>
                    {(availableBrands.phones || []).map(brand => (
                      <option key={brand} value={brand} disabled={(formData.brands.phones || []).includes(brand)}>
                        {brand}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Spare Part Brands</Form.Label>
                  <div className="mb-2 p-2 border rounded bg-light" style={{ minHeight: '60px' }}>
                    {(formData.brands.parts || []).length === 0 ? (
                      <span className="text-muted small">No brands selected</span>
                    ) : (
                      (formData.brands.parts || []).map(brand => (
                        <Badge key={brand} bg="info" className="me-2 mb-1 p-2">
                          {brand}
                          <i
                            className="fas fa-times ms-2"
                            onClick={() => handleBrandRemove('parts', brand)}
                            style={{ cursor: 'pointer' }}
                          ></i>
                        </Badge>
                      ))
                    )}
                  </div>
                  <Form.Select onChange={(e) => handleBrandAdd('parts', e)} value="">
                    <option value="">Add Part Brand...</option>
                    {(availableBrands.parts || []).map(brand => (
                      <option key={brand} value={brand} disabled={(formData.brands.parts || []).includes(brand)}>
                        {brand}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes about the supplier..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="is_active"
                label="Active Supplier"
                checked={formData.is_active === 1}
                onChange={handleInputChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingSupplier ? 'Update' : 'Add'} Supplier
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Statistics/Details Modal */}
      <Modal show={showStatsModal} onHide={() => {
        setShowStatsModal(false);
        setSelectedSupplierStats(null);
        setSupplierInvoices([]);
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Supplier Details: {selectedSupplierStats?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {statsLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading supplier details...</p>
            </div>
          ) : (
            <Tabs defaultActiveKey="stats" className="mb-0 custom-tabs">
              <Tab eventKey="stats" title="Overview" className="p-4">
                {selectedSupplierStats && (
                  <>
                    <Row className="mb-4">
                      <Col xs={6} md={3}>
                        <Card className="text-center border-0 bg-light shadow-sm">
                          <Card.Body className="py-3 px-1">
                            <h4 className="text-primary mb-0">{selectedSupplierStats.total_orders || selectedSupplierStats.total_receipts || 0}</h4>
                            <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>Total Documents</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col xs={6} md={3}>
                        <Card className="text-center border-0 bg-light shadow-sm">
                          <Card.Body className="py-3 px-1">
                            <h4 className="text-success mb-0">
                              {Number(selectedSupplierStats.total_value || 0).toLocaleString()}
                            </h4>
                            <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>Total Value (VND)</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col xs={6} md={3}>
                        <Card className="text-center border-0 bg-light shadow-sm">
                          <Card.Body className="py-3 px-1">
                            <h4 className="text-info mb-0">{selectedSupplierStats.unique_products || 0}</h4>
                            <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>Products Supplied</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col xs={6} md={3}>
                        <Card className="text-center border-0 bg-light shadow-sm">
                          <Card.Body className="py-3 px-1">
                            <h4 className="text-warning mb-0">{selectedSupplierStats.total_items_received || 0}</h4>
                            <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>Units Received</small>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <div className="bg-light p-3 rounded">
                      <h6 className="border-bottom pb-2 mb-3 fw-bold">Supplier Info</h6>
                      <Row className="small">
                        <Col md={6}>
                          <p className="mb-1 text-muted">Category:</p>
                          <p className="fw-bold">{selectedSupplierStats.category || filters.category || 'N/A'}</p>
                          <p className="mb-1 text-muted">Last Transaction:</p>
                          <p className="fw-bold">{selectedSupplierStats.last_transaction_date || selectedSupplierStats.last_order_date ? new Date(selectedSupplierStats.last_transaction_date || selectedSupplierStats.last_order_date).toLocaleDateString() : 'Never'}</p>
                        </Col>
                        <Col md={6}>
                          <p className="mb-1 text-muted">Recent Orders (90d):</p>
                          <p className="fw-bold">{selectedSupplierStats.recent_orders || 0}</p>
                          <p className="mb-1 text-muted">Avg. Order Value:</p>
                          <p className="fw-bold">{Number(selectedSupplierStats.avg_order_value || 0).toLocaleString()} VND</p>
                        </Col>
                      </Row>
                    </div>
                  </>
                )}
              </Tab>

              <Tab eventKey="invoices" title={`Invoices (${supplierInvoices.length})`} className="p-0">
                <Table responsive hover size="sm" className="mb-0 border-top">
                  <thead className="bg-light sticky-top">
                    <tr>
                      <th className="ps-3 py-2">Invoice #</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2 pe-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierInvoices.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-4 text-muted">No invoices found for this supplier</td></tr>
                    ) : (
                      supplierInvoices.map(inv => (
                        <tr key={inv.uuid}>
                          <td className="ps-3 py-2 fw-bold text-success">
                            <a href={`/invoices?uuid=${inv.uuid}`} target="_blank" rel="noopener noreferrer">
                              {inv.invoice_number}
                            </a>
                          </td>
                          <td className="py-2">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                          <td className="py-2">{Number(inv.total_amount).toLocaleString()}</td>
                          <td className="py-2 pe-3"><Badge bg={inv.status === 'paid' ? 'success' : 'warning'}>{inv.status}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light border-top-0">
          <Button variant="secondary" onClick={() => setShowStatsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container >
  );
}

export default Suppliers;