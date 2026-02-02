import React, { useEffect, useState } from 'react';
import { Card, Table, Spinner, Badge, Alert } from 'react-bootstrap';
import { inventoryAPI } from '../../api/api/inventory';

const InventoryZoneStats = () => {
    const [data, setData] = useState({ phones: [], parts: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // We need to fetch directly as this is a new endpoint
                const response = await inventoryAPI.getZoneStatus();
                setData(response.data || { phones: [], parts: [] });
            } catch (err) {
                console.error('Error fetching zone status:', err);
                setError('Failed to load zone status');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className="text-center py-3"><Spinner animation="border" size="sm" /> Loading zone status...</div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    // Process data to group by Warehouse > Bin (Column-Row-Bin structure)
    const binMap = new Map();

    // Process Phones
    data.phones.forEach(item => {
        const key = `${item.warehouse_name || 'Unknown'} > ${item.bin_code || 'Unassigned'}`;
        if (!binMap.has(key)) binMap.set(key, { name: key, phones: { total: 0, available: 0 }, parts: { total: 0, new: 0 } });
        const entry = binMap.get(key);
        entry.phones.total += Number(item.count) || 0;
        if (item.status === 'available') entry.phones.available += Number(item.count) || 0;
    });

    // Process Parts
    data.parts.forEach(item => {
        const key = `${item.warehouse_name || 'Unknown'} > ${item.bin_code || 'Unassigned'}`;
        if (!binMap.has(key)) binMap.set(key, { name: key, phones: { total: 0, available: 0 }, parts: { total: 0, new: 0 } });
        const entry = binMap.get(key);
        entry.parts.total += Number(item.count) || 0;
        if (item.status === 'NEW') entry.parts.new += Number(item.count) || 0;
    });

    const zones = Array.from(binMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    if (zones.length === 0) return null;

    return (
        <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-white border-bottom-0 pt-3 px-3">
                <h5 className="mb-0"><i className="fas fa-box me-2"></i>In-Stock Status by Bin</h5>
            </Card.Header>
            <Card.Body className="p-0">
                <Table responsive hover className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr>
                            <th className="border-0 ps-3">Warehouse &gt; Bin</th>
                            <th className="border-0">Phones (Available / Total)</th>
                            <th className="border-0">Spare Parts (New / Total)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {zones.map((zone, idx) => (
                            <tr key={idx}>
                                <td className="ps-3 fw-medium">{zone.name}</td>
                                <td>
                                    <Badge bg={zone.phones.available > 0 ? "success" : "secondary"} className="me-2">
                                        {zone.phones.available} / {zone.phones.total}
                                    </Badge>
                                </td>
                                <td>
                                    <Badge bg={zone.parts.new > 0 ? "info" : "secondary"} className="me-2">
                                        {zone.parts.new} / {zone.parts.total}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
};

export default InventoryZoneStats;
