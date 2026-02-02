---
name: React Page Development
description: How to create and modify React pages in Mycelium frontend
---

# React Page Development

## Overview

Frontend pages in Mycelium are React components using React Bootstrap and React Query. Located in `frontend/pages/`.

## Page Structure

```jsx
// frontend/pages/example/ExamplePage.jsx

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Spinner, Alert } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';

import ExampleService from '../../services/exampleService';
import { useAuth } from '../../contexts/AuthContext';

function ExamplePage() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Query - fetch data
  const { data: items, isLoading, error } = useQuery({
    queryKey: ['examples'],
    queryFn: ExampleService.getAll
  });

  // Mutation - create/update
  const saveMutation = useMutation({
    mutationFn: (data) => selectedItem 
      ? ExampleService.update(selectedItem._id, data)
      : ExampleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examples'] });
      toast.success(selectedItem ? 'Updated!' : 'Created!');
      handleCloseModal();
    },
    onError: (err) => toast.error(err.message)
  });

  // Mutation - delete
  const deleteMutation = useMutation({
    mutationFn: ExampleService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examples'] });
      toast.success('Deleted!');
    },
    onError: (err) => toast.error(err.message)
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">Error: {error.message}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Examples</h2>
        </Col>
        <Col xs="auto">
          {hasPermission('example', 'create') && (
            <Button variant="primary" onClick={() => setShowModal(true)}>
              <FaPlus className="me-2" /> Add New
            </Button>
          )}
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items?.map(item => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>{item.status}</td>
                  <td>
                    {hasPermission('example', 'update') && (
                      <Button variant="outline-primary" size="sm" onClick={() => handleEdit(item)}>
                        <FaEdit />
                      </Button>
                    )}
                    {hasPermission('example', 'delete') && (
                      <Button variant="outline-danger" size="sm" className="ms-2" onClick={() => handleDelete(item._id)}>
                        <FaTrash />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal component would go here */}
    </Container>
  );
}

export default ExamplePage;
```

## Steps to Create a New Page

1. **Create page directory** in `frontend/pages/`
2. **Create page component** (e.g., `ExamplePage.jsx`)
3. **Create API service** in `frontend/services/`
4. **Add route** in `frontend/App.jsx`
5. **Add navigation** in sidebar/navbar

## Creating API Service

```javascript
// frontend/services/exampleService.js

import axios from 'axios';

const API_URL = '/api/example';

const ExampleService = {
  async getAll() {
    const { data } = await axios.get(API_URL);
    return data.data;
  },

  async getById(id) {
    const { data } = await axios.get(`${API_URL}/${id}`);
    return data.data;
  },

  async create(payload) {
    const { data } = await axios.post(API_URL, payload);
    return data.data;
  },

  async update(id, payload) {
    const { data } = await axios.put(`${API_URL}/${id}`, payload);
    return data.data;
  },

  async delete(id) {
    const { data } = await axios.delete(`${API_URL}/${id}`);
    return data.data;
  }
};

export default ExampleService;
```

## Adding Route

Edit `frontend/App.jsx`:

```jsx
import ExamplePage from './pages/example/ExamplePage';

// In the Routes section:
<Route path="/example" element={<ExamplePage />} />
```

## Permission-Based Rendering

```jsx
import { useAuth } from '../../contexts/AuthContext';

function ExamplePage() {
  const { hasPermission } = useAuth();

  return (
    <>
      {hasPermission('example', 'create') && (
        <Button>Create</Button>
      )}

      {hasPermission('example', 'update') && (
        <Button>Edit</Button>
      )}

      {hasPermission('example', 'delete') && (
        <Button>Delete</Button>
      )}
    </>
  );
}
```

## Component Patterns

### Form Modal
```jsx
import { Modal, Form, Button } from 'react-bootstrap';

function ExampleModal({ show, onHide, item, onSave }) {
  const [formData, setFormData] = useState({ name: '', status: 'active' });

  useEffect(() => {
    if (item) setFormData(item);
    else setFormData({ name: '', status: 'active' });
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{item ? 'Edit' : 'Create'} Example</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit">Save</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
```

## UI Components

Common components in `frontend/components/`:

| Component | Location | Purpose |
|-----------|----------|---------|
| `Navbar` | `layout/Navbar.jsx` | Top navigation |
| `Sidebar` | `layout/Sidebar.jsx` | Side navigation |
| `ErrorBoundary` | `ErrorBoundary.jsx` | Error handling |
| `ConfirmModal` | `ui/ConfirmModal.jsx` | Confirmation dialogs |

## Styling

- Use React Bootstrap classes
- Custom styles in `frontend/index.css`
- Per-component styles in `frontend/styles/`
