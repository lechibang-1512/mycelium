import React from 'react';
import { Alert, Button, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useStocktake } from '../../contexts/StocktakeContext';

/**
 * LockdownOverlay - Shows warning when operations are locked during Full Stocktake
 * 
 * Displays a semi-transparent overlay with information about the active stocktake.
 * Allows viewing inventory (read-only) but blocks movement operations.
 */
const LockdownOverlay = ({ showAsAlert = false }) => {
    const { isLocked, activeStocktake, loading } = useStocktake();

    if (loading || !isLocked) {
        return null;
    }

    // Alert style for inline display (read-only warning)
    if (showAsAlert) {
        return (
            <Alert variant="warning" className="mb-3 d-flex align-items-center justify-content-between">
                <div>
                    <i className="fas fa-lock me-2"></i>
                    <strong>Operations Locked:</strong> Full Stocktake in progress
                    {activeStocktake?.stocktake_number && (
                        <span className="ms-2">({activeStocktake.stocktake_number})</span>
                    )}
                </div>
                <Button as={Link} to="/stocktake" variant="warning" size="sm">
                    <i className="fas fa-clipboard-check me-1"></i>View Stocktake
                </Button>
            </Alert>
        );
    }

    // Full overlay for blocking operations
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <Container className="text-center" style={{ maxWidth: '500px' }}>
                <div className="bg-white rounded-4 p-5 shadow-lg">
                    <i className="fas fa-boxes-packing fa-4x text-warning mb-4"></i>
                    <h2 className="mb-3">Full Stocktake in Progress</h2>
                    <p className="text-muted mb-4">
                        Inventory movements are temporarily disabled while a full stocktake is being conducted.
                        This ensures accurate counting without discrepancies.
                    </p>

                    {activeStocktake && (
                        <Alert variant="info" className="text-start mb-4">
                            <div><strong>Stocktake:</strong> {activeStocktake.stocktake_number}</div>
                            <div><strong>Warehouse:</strong> {activeStocktake.warehouse_name || 'N/A'}</div>
                            <div><strong>Status:</strong> {activeStocktake.status}</div>
                        </Alert>
                    )}

                    <div className="d-flex gap-2 justify-content-center">
                        <Button as={Link} to="/stocktake" variant="warning" size="lg">
                            <i className="fas fa-clipboard-check me-2"></i>
                            Go to Stocktake
                        </Button>
                        <Button as={Link} to="/inventory" variant="outline-secondary" size="lg">
                            <i className="fas fa-eye me-2"></i>
                            View Inventory (Read-Only)
                        </Button>
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default LockdownOverlay;
