import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Badge, Alert, Spinner } from 'react-bootstrap';
import { getUserPermissions, assignRoleToUser, removeRoleFromUser, getAllRoles } from '../../api/api';
import api from '../../api/api';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';

const UserRoles = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.USERS_MANAGE) || hasPermission(PERMISSIONS.SYSTEM_ADMIN);

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({ roles: [], permissions: [] });
  const [assigningRole, setAssigningRole] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersResponse, rolesData] = await Promise.all([
        api.get('/users'),
        getAllRoles()
      ]);
      setUsers(usersResponse.data.users || []);
      setRoles(rolesData.roles || []);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUserPermissions = async (user) => {
    try {
      setError(null);
      const data = await getUserPermissions(user.id);
      setUserPermissions(data);
      setSelectedUser(user);
      setShowUserModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load user permissions');
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!assigningRole) return;

    try {
      setError(null);
      await assignRoleToUser(selectedUser.id, parseInt(assigningRole));
      setSuccess('Role assigned successfully');
      setAssigningRole('');
      // Reload user permissions
      const data = await getUserPermissions(selectedUser.id);
      setUserPermissions(data);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign role');
    }
  };

  const handleRemoveRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to remove this role from the user?')) return;

    try {
      setError(null);
      await removeRoleFromUser(selectedUser.id, roleId);
      setSuccess('Role removed successfully');
      // Reload user permissions
      const data = await getUserPermissions(selectedUser.id);
      setUserPermissions(data);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove role');
    }
  };

  const groupPermissionsByResource = (perms) => {
    const grouped = {};
    perms.forEach(perm => {
      const resource = perm.resource || 'other';
      if (!grouped[resource]) {
        grouped[resource] = [];
      }
      grouped[resource].push(perm);
    });
    return grouped;
  };

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
          <h2><i className="fas fa-users-cog me-2"></i>User Role Management</h2>
          <p className="text-muted">Assign and manage user roles</p>
        </Col>
      </Row>

      {error && (
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
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <Badge bg={user.is_active ? 'success' : 'secondary'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant={canManage ? "outline-primary" : "outline-secondary"}
                      onClick={() => handleViewUserPermissions(user)}
                    >
                      <i className={`fas ${canManage ? 'fa-user-shield' : 'fa-eye'} me-1`}></i>
                      {canManage ? 'Manage Roles' : 'View Roles'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* User Permissions Modal */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Manage Roles for {selectedUser?.username}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {/* Current Roles */}
          <div className="mb-4">
            <h5><i className="fas fa-user-tag me-2"></i>Current Roles</h5>
            {userPermissions.roles.length === 0 ? (
              <Alert variant="info">This user has no roles assigned yet.</Alert>
            ) : (
              <div className="d-flex flex-wrap gap-2 mb-3">
                {userPermissions.roles.map(role => (
                  <Badge
                    key={role.id}
                    bg="primary"
                    className="d-flex align-items-center gap-2 p-2"
                  >
                    {role.name}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="link"
                        className="text-white p-0 m-0"
                        onClick={() => handleRemoveRole(role.id)}
                        style={{ fontSize: '0.8rem' }}
                      >
                        <i className="fas fa-times"></i>
                      </Button>
                    )}
                  </Badge>
                ))}
              </div>
            )}

            {canManage && (
              <Form onSubmit={handleAssignRole}>
                <Form.Group className="mb-3">
                  <Form.Label>Assign New Role</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Select
                      value={assigningRole}
                      onChange={(e) => setAssigningRole(e.target.value)}
                    >
                      <option value="">Select a role...</option>
                      {roles
                        .filter(role => !userPermissions.roles.some(ur => ur.id === role.id))
                        .map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name} - {role.description}
                          </option>
                        ))}
                    </Form.Select>
                    <Button type="submit" variant="primary" disabled={!assigningRole}>
                      <i className="fas fa-plus me-1"></i>Assign
                    </Button>
                  </div>
                </Form.Group>
              </Form>
            )}
          </div>

          {/* Effective Permissions */}
          <div>
            <h5><i className="fas fa-key me-2"></i>Effective Permissions ({userPermissions.permissions.length})</h5>
            {userPermissions.permissions.length === 0 ? (
              <Alert variant="warning">This user has no permissions. Assign a role to grant permissions.</Alert>
            ) : (
              <div>
                {Object.entries(groupPermissionsByResource(userPermissions.permissions)).map(([resource, perms]) => (
                  <Card key={resource} className="mb-3">
                    <Card.Header className="bg-light">
                      <strong className="text-capitalize">{resource}</strong>
                    </Card.Header>
                    <Card.Body>
                      <div className="d-flex flex-wrap gap-2">
                        {perms.map(perm => (
                          <Badge key={perm.id} bg="info">
                            {perm.action}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2">
                        {perms.map(perm => (
                          <div key={perm.id} className="small text-muted">
                            • {perm.name}: {perm.description}
                          </div>
                        ))}
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUserModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container >
  );
};

export default UserRoles;
