import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryAPI } from '../../api/api/inventory';
import { phonesAPI } from '../../api/api/catalog';
import { sparePartsAPI } from '../../api/api/spare-parts'; // Import spare parts API
import { INITIAL_PHONE_FORM_STATE, mapPhoneToFormState, resetPhoneForm } from '../../../shared/constants/phoneForm';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';

// Components
import InventoryStats from '../../components/inventory/InventoryStats';
import InventoryZoneStats from '../../components/inventory/InventoryZoneStats';
import InventoryTable from '../../components/inventory/InventoryTable';
import PhoneModal from '../../components/inventory/PhoneModal';
import SparePartsList from '../../components/spareparts/SparePartsList';
import SparePartForm from '../../components/spareparts/SparePartForm';


const Inventory = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  // Permission checks
  const canWrite = hasPermission(PERMISSIONS.INVENTORY_WRITE) || hasPermission(PERMISSIONS.INVENTORY_MANAGE);
  const canDelete = hasPermission(PERMISSIONS.INVENTORY_DELETE) || hasPermission(PERMISSIONS.INVENTORY_MANAGE);

  // Spare Parts Permissions
  const canWriteParts = hasPermission(PERMISSIONS.SPARE_PARTS_WRITE) || hasPermission(PERMISSIONS.SPARE_PARTS_MANAGE);
  const canDeleteParts = hasPermission(PERMISSIONS.SPARE_PARTS_DELETE) || hasPermission(PERMISSIONS.SPARE_PARTS_MANAGE);

  // State
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tab State - Sync with URL param
  const initialTab = searchParams.get('tab') || 'phones';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (k) => {
    setActiveTab(k);
    setSearchParams({ tab: k });
    setSuccess('');
    setError('');
  };

  // Expanded filters (combining features from Phones.jsx)
  const [filters, setFilters] = useState({ manufacturer: '' });

  // --- Queries ---

  // 1. Fetch Phones (Inventory)
  const {
    data: inventoryData = [],
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    error: inventoryError
  } = useQuery({
    queryKey: ['inventory', { search, lowStock: showLowStock, includeInactive }],
    queryFn: async () => {
      const params = { search, lowStock: showLowStock, include_inactive: includeInactive };
      const response = await inventoryAPI.getAll(params);
      return Array.isArray(response.data) ? response.data : [];
    },
    keepPreviousData: true,
    enabled: activeTab === 'phones', // Only fetch if active (optional optimization)
  });

  // 2. Fetch Spare Parts
  const {
    data: sparePartsData = [],
    isLoading: isSparePartsLoading,
    isError: isSparePartsError,
    error: sparePartsError,
    refetch: refetchSpareParts
  } = useQuery({
    queryKey: ['spare-parts', { includeInactive }],
    queryFn: async () => {
      try {
        const response = await sparePartsAPI.getAll({ include_inactive: includeInactive });
        // Handle different response structures
        let data = response.data?.data || response.data || response || [];

        // Ensure we always return an array
        if (!Array.isArray(data)) {
          console.warn('Spare parts API returned non-array data:', data);
          return [];
        }

        return data;
      } catch (error) {
        console.error('Error fetching spare parts:', error);
        return [];
      }
    },
    enabled: activeTab === 'spare-parts', // Only fetch if active (optional optimization)
  });


  // --- Computed Data ---

  // Phones Logic
  const products = Array.isArray(inventoryData) ? inventoryData : [];
  const uniqueManufacturers = useMemo(() => {
    try {
      const makers = new Set(products.map(p => p?.device_maker).filter(Boolean));
      return Array.from(makers).sort();
    } catch (error) {
      console.error('Error calculating manufacturers:', error);
      return [];
    }
  }, [products]);

  const filteredProducts = useMemo(() => {
    try {
      return products.filter(product => {
        if (!product || typeof product !== 'object') return false;
        if (filters.manufacturer && product.device_maker !== filters.manufacturer) return false;
        return true;
      });
    } catch (error) {
      console.error('Error filtering products:', error);
      return [];
    }
  }, [products, filters]);

  // Stats Calculation
  const stats = useMemo(() => {
    try {
      if (activeTab === 'spare-parts') {
        const parts = Array.isArray(sparePartsData) ? sparePartsData : [];
        return {
          total: parts.length,
          lowStock: parts.filter(p => {
            if (!p || typeof p !== 'object') return false;
            const qty = p.available_quantity ?? p.total_quantity ?? 0;
            return qty > 0 && qty <= (p.reorder_point || 0);
          }).length,
          outOfStock: parts.filter(p => {
            if (!p || typeof p !== 'object') return false;
            return (p.available_quantity ?? p.total_quantity ?? 0) === 0;
          }).length,
          totalValue: parts.reduce((sum, p) => {
            if (!p || typeof p !== 'object') return sum;
            return sum + ((p.available_quantity ?? 0) * (p.unit_price ?? 0));
          }, 0)
        };
      } else {
        // Phones
        const items = Array.isArray(products) ? products : [];
        return {
          total: items.length,
          lowStock: items.filter(p => {
            if (!p || typeof p !== 'object') return false;
            const qty = Number(p.total_inventory || 0);
            const reorder = p.reorder_point || 5;
            return qty > 0 && qty <= reorder;
          }).length,
          outOfStock: items.filter(p => {
            if (!p || typeof p !== 'object') return false;
            return Number(p.total_inventory || 0) === 0;
          }).length,
          totalValue: items.reduce((sum, p) => {
            if (!p || typeof p !== 'object') return sum;
            return sum + (Number(p.total_inventory || 0) * Number(p.device_price || 0));
          }, 0)
        };
      }
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        total: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0
      };
    }
  }, [products, sparePartsData, activeTab]);


  // --- Modals & CRUD State ---

  // Phones
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [phoneFormData, setPhoneFormData] = useState(INITIAL_PHONE_FORM_STATE);
  const [modalActiveTab, setModalActiveTab] = useState('basic');

  // Spare Parts
  const [showPartForm, setShowPartForm] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  // --- Mutations ---

  // Phone Delete
  const deleteProductMutation = useMutation({
    mutationFn: (id) => phonesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      setSuccess(`Product deleted successfully`);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to delete product');
    },
  });

  // Phone Save
  const saveProductMutation = useMutation({
    mutationFn: async ({ isEdit, id, data }) => {
      return isEdit ? phonesAPI.update(id, data) : phonesAPI.create(data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['inventory']);
      setSuccess(variables.isEdit ? 'Product updated successfully' : 'Product added successfully');
      handleClosePhoneModal();
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to save product');
    }
  });

  // --- Handlers ---

  // Phone Handlers
  const handlePhoneInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Handle split for nested keys like "attributes.processor.name"
    if (name.includes('.')) {
      setPhoneFormData(prev => {
        const newState = { ...prev };
        const parts = name.split('.');
        let current = newState;
        for (let i = 0; i < parts.length - 1; i++) {
          // Create object if it doesn't exist
          if (!current[parts[i]]) current[parts[i]] = {};
          // If we are at the last level of object traversal but before assignment, we need to clone to avoid mutation
          if (i === 0 && parts.length > 2 && name.startsWith('attributes')) {
            current[parts[i]] = { ...current[parts[i]] };
          }
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = type === 'checkbox' ? checked : value;

        // Proper deep clone approach for React state safety (simplified above is risky for deeper nests)
        // Let's use a safer approach:
        const setNested = (obj, path, val) => {
          const [head, ...tail] = path;
          if (tail.length === 0) {
            return { ...obj, [head]: val };
          }
          return {
            ...obj,
            [head]: setNested(obj[head] || {}, tail, val)
          };
        };
        return setNested(prev, name.split('.'), type === 'checkbox' ? checked : value);
      });
    } else {
      setPhoneFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleEditPhone = (product) => {
    setEditingProduct(product);
    setPhoneFormData(mapPhoneToFormState(product));
    setModalActiveTab('basic');
    setShowPhoneModal(true);
  };

  const handleDeletePhone = (id, productName) => {
    if (window.confirm(`Delete "${productName}"? This cannot be undone.`)) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleClosePhoneModal = () => {
    setShowPhoneModal(false);
    setEditingProduct(null);
    setPhoneFormData(resetPhoneForm());
  };

  const handleAddPhone = () => {
    setEditingProduct(null);
    setPhoneFormData(resetPhoneForm());
    setShowPhoneModal(true);
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (!phoneFormData.device_name || !phoneFormData.device_maker || !phoneFormData.device_price) {
      setError('Please fill in all required fields (Name, Manufacturer, Price)');
      setModalActiveTab('basic');
      return;
    }
    saveProductMutation.mutate({
      isEdit: !!editingProduct,
      id: editingProduct?.product_id,
      data: phoneFormData
    });
  };

  // Spare Parts Handlers
  const handleAddPart = () => {
    setEditingPart(null);
    setShowPartForm(true);
  };

  const handleEditPart = (part) => {
    setEditingPart(part);
    setShowPartForm(true);
  };

  const handlePartSaved = () => {
    setShowPartForm(false);
    refetchSpareParts();
    setSuccess('Spare part saved successfully');
  };

  // Effect for errors
  useEffect(() => {
    if (isInventoryError) setError('Failed to load inventory');
    if (isSparePartsError) setError('Failed to load spare parts');
  }, [isInventoryError, isSparePartsError]);


  return (
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2>
            <i className="fas fa-boxes me-2"></i>
            Inventory Management
          </h2>
          <p className="text-muted">Manage products, spare parts, and stock levels</p>
        </Col>
        <Col md="auto" className="d-flex gap-2">
          {/* Action Buttons based on Tab */}
          {activeTab === 'phones' && canWrite && (
            <>
              <Button variant="success" onClick={handleAddPhone}>
                <i className="fas fa-plus me-2"></i>Add Phone
              </Button>
              <Button variant="outline-primary" as={Link} to="/inventory/receive">
                <i className="fas fa-arrow-down me-2"></i>Receive
              </Button>
              <Button variant="outline-danger" as={Link} to="/inventory/dispense-stock">
                <i className="fas fa-arrow-up me-2"></i>Dispense
              </Button>
            </>
          )}
          {activeTab === 'spare-parts' && canWriteParts && (
            <>
              <Button variant="success" onClick={handleAddPart}>
                <i className="fas fa-plus me-2"></i>Add Part
              </Button>
              <Button variant="outline-primary" as={Link} to="/spare-parts/receive">
                <i className="fas fa-arrow-down me-2"></i>Receive
              </Button>
              <Button variant="outline-danger" as={Link} to="/spare-parts/dispense">
                <i className="fas fa-arrow-up me-2"></i>Dispense
              </Button>
            </>
          )}
        </Col>
      </Row>

      {(error || inventoryError) && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error || (inventoryError?.message)}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          <i className="fas fa-check-circle me-2"></i>
          {success}
        </Alert>
      )}

      {/* Dynamic Stats */}
      <InventoryStats stats={stats} />
      <InventoryZoneStats />

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-bottom-0 pt-3 px-3">
          <Tabs
            activeKey={activeTab}
            onSelect={handleTabChange}
            className="mb-0"
            variant="tabs"
          >
            <Tab eventKey="phones" title={<><i className="fas fa-mobile-alt me-2"></i>Phones</>} />
            <Tab eventKey="spare-parts" title={<><i className="fas fa-tools me-2"></i>Spare Parts</>} />
          </Tabs>
        </Card.Header>
        <Card.Body className="pt-3">

          {activeTab === 'phones' && (
            <>
              {/* Phones Filters */}
              <Row className="mb-3 g-3">
                <Col md={5}>
                  <InputGroup>
                    <InputGroup.Text className="bg-white">
                      <i className="fas fa-search text-muted"></i>
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Search phones..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={filters.manufacturer}
                    onChange={(e) => setFilters({ ...filters, manufacturer: e.target.value })}
                  >
                    <option value="">All Manufacturers</option>
                    {uniqueManufacturers.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3} className="d-flex align-items-center gap-3">
                  <Form.Check
                    type="switch"
                    id="low-stock-switch"
                    label="Low Stock Only"
                    checked={showLowStock}
                    onChange={(e) => setShowLowStock(e.target.checked)}
                  />
                  <Form.Check
                    type="switch"
                    id="include-inactive-switch"
                    label="Include Inactive"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                  />
                </Col>
                <Col md={1} className="text-end">
                  <Button variant="outline-secondary" onClick={() => queryClient.invalidateQueries(['inventory'])} title="Refresh">
                    <i className="fas fa-sync-alt"></i>
                  </Button>
                </Col>
              </Row>

              {isInventoryLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Loading phones...</p>
                </div>
              ) : (
                <InventoryTable
                  products={filteredProducts}
                  onEdit={handleEditPhone}
                  onDelete={handleDeletePhone}
                  onViewDetails={(id) => navigate(`/inventory/product/${id}`)}
                  canWrite={canWrite}
                  canDelete={canDelete}
                  deletingId={deleteProductMutation.isPending ? deleteProductMutation.variables : null}
                />
              )}
            </>
          )}

          {activeTab === 'spare-parts' && (
            <>
              {/* Spare Parts Include Inactive Toggle */}
              <Row className="mb-3">
                <Col className="d-flex justify-content-end">
                  <Form.Check
                    type="switch"
                    id="spare-parts-inactive-switch"
                    label="Include Inactive"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                  />
                </Col>
              </Row>
              <SparePartsList
                parts={Array.isArray(sparePartsData) ? sparePartsData : []}
                loading={isSparePartsLoading}
                onEdit={handleEditPart}
                onRefresh={refetchSpareParts}
                canWrite={canWriteParts}
                canDelete={canDeleteParts}
              />
            </>
          )}

        </Card.Body>
      </Card>

      {/* Modals */}
      <PhoneModal
        show={showPhoneModal}
        onHide={handleClosePhoneModal}
        onSubmit={handlePhoneSubmit}
        editingProduct={editingProduct}
        formData={phoneFormData}
        onInputChange={handlePhoneInputChange}
        activeTab={modalActiveTab}
        onTabSelect={setModalActiveTab}
      />


      <SparePartForm
        show={showPartForm}
        onHide={() => setShowPartForm(false)}
        onSaved={handlePartSaved}
        part={editingPart}
      />

    </Container>
  );
};

export default Inventory;