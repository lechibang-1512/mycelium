import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Tabs, Tab, Card } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import RepairJobs from './RepairJobs';
import RMA from './RMA';

const ServiceOperations = () => {
    const [activeTab, setActiveTab] = useState('repair-jobs');
    const location = useLocation();

    // Sync tab with URL query param or state
    useEffect(() => {
        // If navigated with state.tab, use it
        if (location.state && location.state.tab) {
            setActiveTab(location.state.tab);
        } else if (location.pathname.includes('/rma')) {
            // Fallback if we decided to keep routes pointing here
            setActiveTab('rma');
        }
    }, [location]);

    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <h2>
                        <i className="fas fa-tools me-2"></i>
                        Service Center
                    </h2>
                    <p className="text-muted">Unified management for Repairs and Returns (RMA)</p>
                </Col>
            </Row>

            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
            >
                <Tab
                    eventKey="repair-jobs"
                    title={
                        <span className="d-flex align-items-center gap-2">
                            <i className="fas fa-wrench"></i>
                            Repair Jobs
                        </span>
                    }
                >
                    <Card>
                        <Card.Body>
                            <RepairJobs />
                        </Card.Body>
                    </Card>
                </Tab>
                <Tab
                    eventKey="rma"
                    title={
                        <span className="d-flex align-items-center gap-2">
                            <i className="fas fa-undo-alt"></i>
                            RMA Management
                        </span>
                    }
                >
                    <Card>
                        <Card.Body>
                            <RMA />
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>
        </Container>
    );
};

export default ServiceOperations;
