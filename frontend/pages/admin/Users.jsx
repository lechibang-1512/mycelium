import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Badge, Alert, Spinner } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/api';
import { getAllRoles, assignRoleToUser, getUserPermissions, removeRoleFromUser } from '../../api/api';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';

const Users = () => {
    const { hasPermission } = useAuth();
    const queryClient = useQueryClient();

    // Permission checks
    const canWrite = hasPermission(PERMISSIONS.USERS_WRITE) || hasPermission(PERMISSIONS.USERS_MANAGE);
    const canDelete = hasPermission(PERMISSIONS.USERS_DELETE) || hasPermission(PERMISSIONS.USERS_MANAGE);

    // Queries
    const { 
        data: users = [], 
        isLoading: isUsersLoading, 
        isError: isUsersError, 
        error: usersError 
    } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.get('/users');
            return response.data.users || [];
        }
    });

    const { 
        data: roles = [] 
    } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const response = await getAllRoles();
            return response.roles || [];
        }
    });

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: '',
        role: 'user', // Legacy role field
        roleId: '', // RBAC role ID
        is_active: true
    });

    // Fetch permissions for editing user
    const { data: userPermissions } = useQuery({
        queryKey: ['user-permissions', editingUser?.id],
        queryFn: () => getUserPermissions(editingUser.id),
        enabled: !!editingUser,
    });

    // Sync fetched permissions to form when editingUser changes or permissions load
    useEffect(() => {
        if (editingUser && userPermissions) {
            let currentRoleId = '';
            if (userPermissions.roles && userPermissions.roles.length > 0) {
                currentRoleId = userPermissions.roles[0].id.toString();
            }
            
            // Only update if roleId is not set (initial load) or we want to force sync
            // Here we just set it initially when permissions arrive
             setFormData(prev => {
                 // Avoid loop if already set
                 if (prev.roleId === currentRoleId) return prev;
                 return {
                    ...prev,
                    roleId: currentRoleId,
                 };
             });
        }
    }, [userPermissions, editingUser]);

    // Mutations
    const deleteUserMutation = useMutation({
        mutationFn: (userId) => api.delete(`/users/${userId}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setSuccess('User deleted successfully');
            setTimeout(() => setSuccess(null), 3000);
        },
        onError: (err) => {
             setError(err.response?.data?.error || 'Failed to delete user');
        }
    });

    const saveUserMutation = useMutation({
        mutationFn: async ({ isEdit, userData, roleId, userId }) => {
            let finalUserId = userId;
            
            if (isEdit) {
                 await api.put(`/users/${userId}`, userData);
                 
                 // Handle RBAC role assignment logic
                 if (roleId) {
                     const currentPerms = await getUserPermissions(userId);
                     const currentRoles = currentPerms.roles || [];
                     const newRoleId = parseInt(roleId);

                     for (const role of currentRoles) {
                         if (role.id !== newRoleId) {
                             await removeRoleFromUser(userId, role.id);
                         }
                     }

                     const hasRole = currentRoles.some(r => r.id === newRoleId);
                     if (!hasRole) {
                         await assignRoleToUser(userId, newRoleId);
                     }
                 }
            } else {
                 const response = await api.post('/users', userData);
                 finalUserId = response.data.id;

                 if (roleId && finalUserId) {
                     await assignRoleToUser(finalUserId, parseInt(roleId));
                 }
            }
            return finalUserId;
        },
        onSuccess: (data, variables) => {
             queryClient.invalidateQueries(['users']);
             setSuccess(variables.isEdit ? 'User updated successfully' : 'User created successfully');
             handleCloseModal();
             setTimeout(() => setSuccess(null), 3000);
        },
        onError: (err) => {
             setError(err.response?.data?.error || 'Operation failed');
        }
    });


    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                email: user.email,
                password: '', 
                fullName: user.fullName || '',
                role: user.role,
                roleId: '', // Will be populated by useQuery effect
                is_active: user.is_active
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                email: '',
                password: '',
                fullName: '',
                role: 'user',
                roleId: '',
                is_active: true
            });
        }
        setError(null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setError(null);
        setFormData(prev => ({ ...prev, roleId: '' })); // Reset roleId
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'roleId' && value) {
            const selectedRole = roles.find(r => r.id.toString() === value);
            setFormData(prev => ({
                ...prev,
                roleId: value,
                role: selectedRole?.name || 'user'
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);

        const userData = {
            username: formData.username,
            email: formData.email,
            fullName: formData.fullName,
            role: formData.role,
            is_active: formData.is_active
        };

        if (formData.password) {
            userData.password = formData.password;
        }

        if (!editingUser && !formData.password) {
            setError('Password is required for new users');
            return;
        }

        saveUserMutation.mutate({
            isEdit: !!editingUser,
            userData,
            roleId: formData.roleId,
            userId: editingUser?.id
        });
    };

    const handleDelete = (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        deleteUserMutation.mutate(userId);
    };

    const getRoleBadgeVariant = (roleName) => {
        const variants = {
            'admin': 'danger',
            'manager': 'warning',
            'technician': 'info',
            'inventory_staff': 'success',
            'user': 'secondary'
        };
        return variants[roleName?.toLowerCase()] || 'secondary';
    };

    if (isUsersLoading) {
        return (
            <Container className="mt-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </Container>
        );
    }

    if (isUsersError) {
         return (
             <Container className="mt-4">
                 <Alert variant="danger">
                     Failed to load users: {usersError?.message}
                 </Alert>
             </Container>
         );
    }

    return (
        <Container fluid className="mt-4">
            <Row className="mb-4">
                <Col className="d-flex justify-content-between align-items-center">
                    <div>
                        <h2><i className="fas fa-users me-2"></i>User Management</h2>
                        <p className="text-muted">Create and manage system users with role-based access control</p>
                    </div>
                    {canWrite && (
                        <Button variant="primary" onClick={() => handleOpenModal()}>
                            <i className="fas fa-plus me-2"></i>Create User
                        </Button>
                    )}
                </Col>
            </Row>

            {error && !showModal && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            <Card>
                <Card.Body>
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.username}</td>
                                    <td>{user.fullName || '-'}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <Badge bg={getRoleBadgeVariant(user.role)} className="text-uppercase">
                                            {user.role}
                                        </Badge>
                                    </td>
                                    <td>
                                        <Badge bg={user.is_active ? 'success' : 'secondary'}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
                                    <td>
                                        {canWrite && (
                                            <Button
                                                size="sm"
                                                variant="outline-primary"
                                                className="me-2"
                                                onClick={() => handleOpenModal(user)}
                                            >
                                                <i className="fas fa-edit"></i>
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button
                                                size="sm"
                                                variant="outline-danger"
                                                onClick={() => handleDelete(user.id)}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="text-center text-muted py-4">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Create/Edit User Modal */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className={`fas fa-${editingUser ? 'user-edit' : 'user-plus'} me-2`}></i>
                        {editingUser ? 'Edit User' : 'Create User'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        {error && (
                            <Alert variant="danger" className="mb-3">
                                {error}
                            </Alert>
                        )}

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Username <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        disabled={!!editingUser}
                                        placeholder="Enter username"
                                    />
                                    {editingUser && (
                                        <Form.Text className="text-muted">
                                            Username cannot be changed
                                        </Form.Text>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Full Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder="Enter full name"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter email address"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        Password {editingUser && <small className="text-muted">(Leave blank to keep current)</small>}
                                        {!editingUser && <span className="text-danger">*</span>}
                                    </Form.Label>
                                    <Form.Control
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required={!editingUser}
                                        minLength={6}
                                        placeholder={editingUser ? "Enter new password (optional)" : "Enter password"}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <hr className="my-3" />
                        <h6 className="mb-3">
                            <i className="fas fa-user-shield me-2"></i>
                            Role & Access Control
                        </h6>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        System Role <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Form.Select
                                        name="roleId"
                                        value={formData.roleId}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select a role...</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>
                                                {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                                {role.description && ` - ${role.description}`}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    <Form.Text className="text-muted">
                                        Roles determine what the user can access in the system
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Account Status</Form.Label>
                                    <div className="mt-2">
                                        <Form.Check
                                            type="switch"
                                            id="is_active"
                                            label={formData.is_active ? 'Active - User can log in' : 'Inactive - User cannot log in'}
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>

                        {formData.roleId && (
                            <Alert variant="info" className="mb-0">
                                <i className="fas fa-info-circle me-2"></i>
                                <strong>Selected Role: </strong>
                                {roles.find(r => r.id.toString() === formData.roleId)?.name || 'Unknown'}
                                <br />
                                <small className="text-muted">
                                    {roles.find(r => r.id.toString() === formData.roleId)?.description || 'No description available'}
                                </small>
                            </Alert>
                        )}

                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal} disabled={saveUserMutation.isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={saveUserMutation.isPending}>
                            {saveUserMutation.isPending ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    {editingUser ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                <>
                                    <i className={`fas fa-${editingUser ? 'save' : 'plus'} me-2`}></i>
                                    {editingUser ? 'Update User' : 'Create User'}
                                </>
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default Users;
