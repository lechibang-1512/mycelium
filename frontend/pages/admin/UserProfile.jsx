import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Badge, Button, ListGroup, Accordion } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * Permission category configuration with icons and colors
 */
const CATEGORY_CONFIG = {
    inventory: { icon: 'fa-box', color: 'primary', label: 'Inventory' },
    warehouse: { icon: 'fa-warehouse', color: 'success', label: 'Warehouses' },
    users: { icon: 'fa-users', color: 'info', label: 'Users' },
    roles: { icon: 'fa-user-shield', color: 'warning', label: 'Roles' },
    permissions: { icon: 'fa-key', color: 'danger', label: 'Permissions' },
    suppliers: { icon: 'fa-truck', color: 'secondary', label: 'Suppliers' },
    receipts: { icon: 'fa-receipt', color: 'dark', label: 'Receipts' },
    repairs: { icon: 'fa-tools', color: 'primary', label: 'Repairs' },
    rma: { icon: 'fa-exchange-alt', color: 'warning', label: 'RMA' },
    phones: { icon: 'fa-mobile-alt', color: 'info', label: 'Phones' },
    spareparts: { icon: 'fa-cogs', color: 'secondary', label: 'Spare Parts' },
    stocktake: { icon: 'fa-clipboard-check', color: 'success', label: 'Stocktake' },
    reports: { icon: 'fa-chart-bar', color: 'primary', label: 'Reports' },
    zones: { icon: 'fa-layer-group', color: 'info', label: 'Zones' },
    bins: { icon: 'fa-cube', color: 'secondary', label: 'Bins' },
    system: { icon: 'fa-cog', color: 'dark', label: 'System' },
    default: { icon: 'fa-lock', color: 'secondary', label: 'Other' }
};

/**
 * Action type styling
 */
const ACTION_STYLES = {
    read: { bg: 'success', icon: 'fa-eye' },
    write: { bg: 'primary', icon: 'fa-edit' },
    delete: { bg: 'danger', icon: 'fa-trash' },
    manage: { bg: 'warning', icon: 'fa-cog' },
    admin: { bg: 'dark', icon: 'fa-shield-alt' },
    default: { bg: 'secondary', icon: 'fa-check' }
};

/**
 * User Profile Page
 * Displays current user's profile information and permissions
 */
const UserProfile = () => {
    const { user, logout, roles, permissions } = useAuth();
    const navigate = useNavigate();

    /**
     * Group permissions by category (resource)
     */
    const groupedPermissions = useMemo(() => {
        if (!permissions || permissions.length === 0) return {};

        const groups = {};
        permissions.forEach(perm => {
            // Parse permission name (format: "resource.action" or just "permission_name")
            const parts = perm.split('.');
            const category = parts.length > 1 ? parts[0].toLowerCase() : 'system';
            const action = parts.length > 1 ? parts.slice(1).join('.') : perm;

            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push({ full: perm, action });
        });

        // Sort categories alphabetically
        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {});
    }, [permissions]);

    const handleLogout = async () => {
        await logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const getCategoryConfig = (category) => {
        return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.default;
    };

    const getActionStyle = (action) => {
        const lowerAction = action.toLowerCase();
        for (const [key, style] of Object.entries(ACTION_STYLES)) {
            if (lowerAction.includes(key)) return style;
        }
        return ACTION_STYLES.default;
    };

    if (!user) {
        return (
            <Container className="py-5">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin fa-2x text-muted"></i>
                    <p className="mt-3 text-muted">Loading profile...</p>
                </div>
            </Container>
        );
    }

    const permissionCount = permissions?.length || 0;
    const categoryCount = Object.keys(groupedPermissions).length;

    return (
        <Container className="py-4">
            {/* Page Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">
                        <i className="fas fa-user-circle me-2 text-primary"></i>
                        My Profile
                    </h2>
                    <p className="text-muted mb-0">View your account information and permissions</p>
                </div>
                <Button variant="outline-danger" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Logout
                </Button>
            </div>

            <Row>
                {/* Profile Information Card */}
                <Col lg={5} className="mb-4">
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-primary text-white">
                            <i className="fas fa-id-card me-2"></i>
                            Account Information
                        </Card.Header>
                        <Card.Body>
                            <div className="text-center mb-4">
                                <div
                                    className="rounded-circle bg-gradient d-inline-flex align-items-center justify-content-center mb-3"
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    }}
                                >
                                    <i className="fas fa-user fa-3x text-white"></i>
                                </div>
                                <h4 className="mb-1">{user.fullName || user.username}</h4>
                                <Badge bg="success" className="fs-6">
                                    <i className="fas fa-shield-alt me-1"></i>
                                    {user.role || 'User'}
                                </Badge>
                            </div>

                            <ListGroup variant="flush">
                                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted">
                                        <i className="fas fa-user me-2"></i>Username
                                    </span>
                                    <strong>{user.username}</strong>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted">
                                        <i className="fas fa-envelope me-2"></i>Email
                                    </span>
                                    <strong>{user.email || 'Not set'}</strong>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted">
                                        <i className="fas fa-id-badge me-2"></i>User ID
                                    </span>
                                    <code className="bg-light px-2 py-1 rounded">{user.id}</code>
                                </ListGroup.Item>
                            </ListGroup>
                        </Card.Body>

                        {/* Roles Section */}
                        <Card.Footer className="bg-light">
                            <h6 className="text-muted mb-2">
                                <i className="fas fa-users-cog me-2"></i>
                                Assigned Roles
                            </h6>
                            <div>
                                {roles && roles.length > 0 ? (
                                    roles.map((role, index) => (
                                        <Badge
                                            key={index}
                                            bg="primary"
                                            className="me-2 mb-1 px-3 py-2"
                                        >
                                            <i className="fas fa-user-tag me-1"></i>
                                            {role.name || role}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-muted fst-italic">No roles assigned</span>
                                )}
                            </div>
                        </Card.Footer>
                    </Card>
                </Col>

                {/* Permissions Card */}
                <Col lg={7} className="mb-4">
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
                            <span>
                                <i className="fas fa-key me-2"></i>
                                Permissions
                            </span>
                            <span>
                                <Badge bg="light" text="dark" className="me-2">
                                    {permissionCount} total
                                </Badge>
                                <Badge bg="light" text="dark">
                                    {categoryCount} {categoryCount === 1 ? 'category' : 'categories'}
                                </Badge>
                            </span>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {permissionCount > 0 ? (
                                <Accordion flush>
                                    {Object.entries(groupedPermissions).map(([category, perms], idx) => {
                                        const config = getCategoryConfig(category);
                                        return (
                                            <Accordion.Item eventKey={idx.toString()} key={category}>
                                                <Accordion.Header>
                                                    <span className={`text-${config.color} me-2`}>
                                                        <i className={`fas ${config.icon}`}></i>
                                                    </span>
                                                    <strong>{config.label}</strong>
                                                    <Badge bg={config.color} className="ms-2">
                                                        {perms.length}
                                                    </Badge>
                                                </Accordion.Header>
                                                <Accordion.Body className="bg-light">
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {perms.map((perm, permIdx) => {
                                                            const actionStyle = getActionStyle(perm.action);
                                                            return (
                                                                <Badge
                                                                    key={permIdx}
                                                                    bg={actionStyle.bg}
                                                                    className="px-2 py-1 fw-normal"
                                                                    title={perm.full}
                                                                >
                                                                    <i className={`fas ${actionStyle.icon} me-1`}></i>
                                                                    {perm.action}
                                                                </Badge>
                                                            );
                                                        })}
                                                    </div>
                                                </Accordion.Body>
                                            </Accordion.Item>
                                        );
                                    })}
                                </Accordion>
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <i className="fas fa-lock fa-3x mb-3"></i>
                                    <p className="mb-0">No specific permissions assigned</p>
                                </div>
                            )}
                        </Card.Body>
                        <Card.Footer className="text-muted small">
                            <i className="fas fa-info-circle me-1"></i>
                            Contact an administrator to request permission changes
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default UserProfile;

