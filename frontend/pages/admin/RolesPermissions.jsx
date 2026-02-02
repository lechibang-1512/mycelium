import React, { useState, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Badge, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllRoles, getAllPermissions, createRole, updateRole, deleteRole, assignPermissionToRole, removePermissionFromRole, getUsersByRole, bulkSetRolePermissions } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';

// Query keys for caching
const QUERY_KEYS = {
  roles: ['rbac', 'roles'],
  permissions: ['rbac', 'permissions'],
  roleUsers: (roleId) => ['rbac', 'roleUsers', roleId],
};

// Cache durations
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes

const RolesPermissions = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.SYSTEM_ADMIN);

  const queryClient = useQueryClient();

  // Local UI state
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  // Form states
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');

  // ==================== QUERIES ====================

  // Fetch roles with caching
  const {
    data: rolesData,
    isLoading: rolesLoading,
    error: rolesError
  } = useQuery({
    queryKey: QUERY_KEYS.roles,
    queryFn: getAllRoles,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
  });

  // Fetch permissions with longer cache (rarely changes)
  const {
    data: permissionsData,
    isLoading: permissionsLoading,
    error: permissionsError
  } = useQuery({
    queryKey: QUERY_KEYS.permissions,
    queryFn: getAllPermissions,
    staleTime: STALE_TIME * 2, // 10 minutes - permissions rarely change
    gcTime: CACHE_TIME * 2,
    refetchOnWindowFocus: false,
  });

  // Fetch users for a specific role (only when modal is open)
  const {
    data: roleUsersData,
    isLoading: usersLoading
  } = useQuery({
    queryKey: QUERY_KEYS.roleUsers(selectedRole?.id),
    queryFn: () => getUsersByRole(selectedRole.id),
    enabled: !!selectedRole && showUsersModal,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });

  const roles = rolesData?.roles || [];
  const permissions = permissionsData?.permissions || [];
  const roleUsers = roleUsersData?.users || [];

  // ==================== MUTATIONS ====================

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
      setSuccess('Role created successfully');
      setShowRoleModal(false);
      resetRoleForm();
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create role');
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, data }) => updateRole(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
      setSuccess('Role updated successfully');
      setShowRoleModal(false);
      resetRoleForm();
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to update role');
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
      setSuccess('Role deleted successfully');
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to delete role');
    },
  });

  // Toggle permission mutation with optimistic updates
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId, hasPermission }) => {
      if (hasPermission) {
        return removePermissionFromRole(roleId, permissionId);
      } else {
        return assignPermissionToRole(roleId, permissionId);
      }
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ roleId, permissionId, hasPermission }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.roles });

      // Snapshot previous value
      const previousRoles = queryClient.getQueryData(QUERY_KEYS.roles);

      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.roles, (old) => {
        if (!old?.roles) return old;

        return {
          ...old,
          roles: old.roles.map(role => {
            if (role.id !== roleId) return role;

            const currentPerms = role.permissions || [];
            let newPerms;

            if (hasPermission) {
              // Remove permission
              newPerms = currentPerms.filter(p => p.id !== permissionId);
            } else {
              // Add permission - find it from permissions list
              const permToAdd = permissions.find(p => p.id === permissionId);
              newPerms = permToAdd ? [...currentPerms, permToAdd] : currentPerms;
            }

            return { ...role, permissions: newPerms };
          })
        };
      });

      // Also update the selectedRole if it's the one being modified
      if (selectedRole?.id === roleId) {
        const currentPerms = selectedRole.permissions || [];
        let newPerms;

        if (hasPermission) {
          newPerms = currentPerms.filter(p => p.id !== permissionId);
        } else {
          const permToAdd = permissions.find(p => p.id === permissionId);
          newPerms = permToAdd ? [...currentPerms, permToAdd] : currentPerms;
        }

        setSelectedRole(prev => ({ ...prev, permissions: newPerms }));
      }

      return { previousRoles };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousRoles) {
        queryClient.setQueryData(QUERY_KEYS.roles, context.previousRoles);
      }
      setError(err.response?.data?.error || 'Failed to update permission');
    },
    onSuccess: (data, { hasPermission }) => {
      setSuccess(hasPermission ? 'Permission removed from role' : 'Permission assigned to role');
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
    },
  });

  // Bulk set permissions mutation
  const bulkPermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissions }) => bulkSetRolePermissions(roleId, permissions),
    onSuccess: (data, { allOn }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
      setSuccess(allOn ? 'All permissions enabled' : 'All permissions removed');
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to update permissions');
    },
  });

  // ==================== HANDLERS ====================

  const handleCreateRole = (e) => {
    e.preventDefault();
    setError(null);
    createRoleMutation.mutate({
      name: roleName,
      description: roleDescription
    });
  };

  const handleUpdateRole = (e) => {
    e.preventDefault();
    setError(null);
    updateRoleMutation.mutate({
      roleId: editingRole.id,
      data: {
        name: roleName,
        description: roleDescription
      }
    });
  };

  const handleDeleteRole = (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    setError(null);
    deleteRoleMutation.mutate(roleId);
  };

  const handleTogglePermission = useCallback((roleId, permissionId, hasPermission) => {
    setError(null);
    togglePermissionMutation.mutate({ roleId, permissionId, hasPermission });
  }, [togglePermissionMutation]);

  const handleEnableAllPermissions = useCallback(() => {
    if (!selectedRole) return;
    setError(null);
    const allPermNames = permissions.map(p => p.name);
    bulkPermissionsMutation.mutate({ roleId: selectedRole.id, permissions: allPermNames, allOn: true });
    // Update local state
    setSelectedRole(prev => ({ ...prev, permissions: permissions }));
  }, [selectedRole, permissions, bulkPermissionsMutation]);

  const handleDisableAllPermissions = useCallback(() => {
    if (!selectedRole) return;
    setError(null);
    bulkPermissionsMutation.mutate({ roleId: selectedRole.id, permissions: [], allOn: false });
    // Update local state
    setSelectedRole(prev => ({ ...prev, permissions: [] }));
  }, [selectedRole, bulkPermissionsMutation]);

  const handleViewUsers = (role) => {
    setSelectedRole(role);
    setShowUsersModal(true);
  };

  const openCreateRoleModal = () => {
    resetRoleForm();
    setEditingRole(null);
    setShowRoleModal(true);
  };

  const openEditRoleModal = (role) => {
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setEditingRole(role);
    setShowRoleModal(true);
  };

  const openPermissionsModal = (role) => {
    setSelectedRole(role);
    setShowPermissionsModal(true);
  };

  const resetRoleForm = () => {
    setRoleName('');
    setRoleDescription('');
    setEditingRole(null);
  };

  // ==================== MEMOIZED VALUES ====================

  const groupedPermissions = useMemo(() => {
    const grouped = {};
    permissions.forEach(perm => {
      const resource = perm.resource || 'other';
      if (!grouped[resource]) {
        grouped[resource] = [];
      }
      grouped[resource].push(perm);
    });
    return grouped;
  }, [permissions]);

  const roleHasPermission = useCallback((role, permissionId) => {
    return role?.permissions?.some(p => p.id === permissionId) || false;
  }, []);

  // ==================== RENDER ====================

  const loading = rolesLoading || permissionsLoading;
  const queryError = rolesError || permissionsError;

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2><i className="fas fa-user-shield me-2"></i>Roles & Permissions Management</h2>
          <p className="text-muted">Manage system roles and their associated permissions</p>
        </Col>
      </Row>

      {(error || queryError) && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error || queryError?.message || 'An error occurred'}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Tabs defaultActiveKey="roles" className="mb-3">
        <Tab eventKey="roles" title={<><i className="fas fa-users-cog me-2"></i>Roles</>}>
          <Row className="mb-3">
            <Col>
              {canManage && (
                <Button variant="primary" onClick={openCreateRoleModal}>
                  <i className="fas fa-plus me-2"></i>Create New Role
                </Button>
              )}
            </Col>
          </Row>

          <Row>
            {roles.map(role => (
              <Col md={6} lg={4} key={role.id} className="mb-3">
                <Card>
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <strong>{role.name}</strong>
                    <Badge bg="info">{role.permissions?.length || 0} permissions</Badge>
                  </Card.Header>
                  <Card.Body>
                    <p className="text-muted small">{role.description}</p>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline-primary" onClick={() => openPermissionsModal(role)}>
                        <i className="fas fa-key me-1"></i>Permissions
                      </Button>
                      <Button size="sm" variant="outline-info" onClick={() => handleViewUsers(role)}>
                        <i className="fas fa-users me-1"></i>Users
                      </Button>
                      {canManage && (
                        <>
                          <Button size="sm" variant="outline-secondary" onClick={() => openEditRoleModal(role)}>
                            <i className="fas fa-edit me-1"></i>Edit
                          </Button>
                          <Button size="sm" variant="outline-danger" onClick={() => handleDeleteRole(role.id)}>
                            <i className="fas fa-trash me-1"></i>Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        <Tab eventKey="permissions" title={<><i className="fas fa-key me-2"></i>All Permissions</>}>
          <Card>
            <Card.Body>
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <div key={resource} className="mb-4">
                  <h5 className="text-capitalize border-bottom pb-2">
                    <i className="fas fa-folder me-2"></i>{resource}
                  </h5>
                  <Row>
                    {perms.map(perm => (
                      <Col md={6} lg={4} key={perm.id} className="mb-2">
                        <Card className="h-100">
                          <Card.Body className="py-2">
                            <strong>{perm.name}</strong>
                            <br />
                            <small className="text-muted">{perm.description}</small>
                            <br />
                            <Badge bg="secondary" className="mt-1">{perm.action}</Badge>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Create/Edit Role Modal */}
      <Modal show={showRoleModal} onHide={() => setShowRoleModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingRole ? 'Edit Role' : 'Create New Role'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={editingRole ? handleUpdateRole : handleCreateRole}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Role Name *</Form.Label>
              <Form.Control
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
                placeholder="e.g., manager, staff, viewer"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Describe the purpose of this role"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRoleModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
            >
              {(createRoleMutation.isPending || updateRoleMutation.isPending) && (
                <Spinner animation="border" size="sm" className="me-2" />
              )}
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Manage Permissions Modal */}
      <Modal show={showPermissionsModal} onHide={() => setShowPermissionsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Manage Permissions for "{selectedRole?.name}"
            {togglePermissionMutation.isPending && (
              <Spinner animation="border" size="sm" className="ms-2" />
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {selectedRole && Object.entries(groupedPermissions).map(([resource, perms]) => (
            <div key={resource} className="mb-4">
              <h6 className="text-capitalize border-bottom pb-2">
                <i className="fas fa-folder me-2"></i>{resource}
              </h6>
              {perms.map(perm => {
                const hasPermission = roleHasPermission(selectedRole, perm.id);
                return (
                  <Form.Check
                    key={perm.id}
                    type="switch"
                    id={`perm-${perm.id}`}
                    label={
                      <span>
                        <strong>{perm.name}</strong>
                        <br />
                        <small className="text-muted">{perm.description}</small>
                      </span>
                    }
                    checked={hasPermission}
                    onChange={() => handleTogglePermission(selectedRole.id, perm.id, hasPermission)}
                    className="mb-2"
                    disabled={!canManage}
                  />
                );
              })}
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer>
          {canManage && (
            <div className="me-auto">
              <Button
                variant="success"
                size="sm"
                onClick={handleEnableAllPermissions}
                disabled={bulkPermissionsMutation.isPending}
                className="me-2"
              >
                {bulkPermissionsMutation.isPending ? (
                  <Spinner animation="border" size="sm" className="me-1" />
                ) : (
                  <i className="fas fa-check-double me-1"></i>
                )}
                Enable All
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleDisableAllPermissions}
                disabled={bulkPermissionsMutation.isPending}
              >
                {bulkPermissionsMutation.isPending ? (
                  <Spinner animation="border" size="sm" className="me-1" />
                ) : (
                  <i className="fas fa-times me-1"></i>
                )}
                Disable All
              </Button>
            </div>
          )}
          <Button variant="secondary" onClick={() => setShowPermissionsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Users with Role Modal */}
      <Modal show={showUsersModal} onHide={() => setShowUsersModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Users with "{selectedRole?.name}" Role</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {usersLoading ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" />
              <span className="ms-2">Loading users...</span>
            </div>
          ) : roleUsers.length === 0 ? (
            <p className="text-muted">No users have this role yet.</p>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Assigned At</th>
                </tr>
              </thead>
              <tbody>
                {roleUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{new Date(user.assigned_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUsersModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default RolesPermissions;

